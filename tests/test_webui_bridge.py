import base64
import json
import os
import time
from shell_support import ShellCase


class BridgeTests(ShellCase):
    def test_failed_encoding_does_not_publish_empty_response(self):
        self.mock('base64', 'exit 127')
        body = self.root/'body.json'; body.write_text('{"ok":true}')
        result = self.sh(f'webui_emit "'+('a'*32)+f'" 0 complete 200 "{body}"', ('webui-api',), False)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.ram/('run/webui/responses/'+('a'*32)+'.json')).exists())

    def test_failed_encoding_does_not_publish_cache_or_heartbeat(self):
        self.mock('base64', 'exit 127')
        result = self.sh('webui_cache_refresh', ('api', 'webui-api'), False)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.ram/'run/webui/cache/status.json').exists())
        self.assertFalse((self.ram/'run/webui/cache/heartbeat.json').exists())

    def test_empty_legacy_log_cache_is_rebuilt_without_log_changes(self):
        self.sh('webui_cache_refresh', ('api', 'webui-api'))
        path=self.ram/'run/webui/cache/log-app.json'
        envelope=json.loads(path.read_text()); envelope['body']=''
        path.write_text(json.dumps(envelope))
        self.sh('webui_cache_refresh', ('api', 'webui-api'))
        body=json.loads(path.read_text())['body']
        self.assertTrue(body)
        self.assertIsInstance(json.loads(base64.b64decode(body)),dict)

    def packets(self, request, ident='a' * 32, size=1800):
        data = base64.b64encode(json.dumps(request, ensure_ascii=False).encode()).decode()
        parts = [data[i:i+size] for i in range(0, len(data), size)]
        return [dict(v=1, id=ident, seq=i, count=len(parts), data=part) for i, part in enumerate(parts)]

    def accept(self, packet):
        path = self.root / 'packet.json'
        path.write_text(json.dumps(packet))
        result = self.sh(f'webui_accept "{path}"', ('api', 'webui-api'), False)
        response = self.ram / f'run/webui/responses/{packet["id"]}.json'
        self.assertTrue(response.exists(), result.stderr)
        return json.loads(response.read_text())

    def test_unicode_roundtrip_and_template_delimiters_encoded(self):
        content = 'Привет 😀 <% evil %>\n' * 200
        path = self.home / 'profiles/test.yaml'
        packets = self.packets(dict(action='file_write', path=str(path), content=content))
        for packet in packets:
            result = self.accept(packet)
        self.assertEqual(result['phase'], 'complete')
        self.assertEqual(path.read_text(), content)
        request = dict(action='file_read', path=str(path))
        result = self.accept(self.packets(request, 'b'*32)[0])
        self.assertNotIn('<%', json.dumps(result))
        self.assertEqual(json.loads(base64.b64decode(result['body']))['content'], content)

    def test_incomplete_never_dispatches(self):
        target = self.home / 'profiles/test.yaml'
        packet = self.packets(dict(action='file_write', path=str(target), content='x'*3000))[0]
        self.assertEqual(self.accept(packet)['phase'], 'accepted')
        self.assertFalse(target.exists())

    def test_out_of_order_rejected(self):
        packet = self.packets(dict(action='load', padding='x'*3000))[1]
        self.assertEqual(self.accept(packet)['status'], 409)

    def test_identical_chunk_reacknowledged_and_different_duplicate_rejected(self):
        packet = self.packets(dict(action='load', padding='x'*3000))[0]
        first = self.accept(packet)
        self.assertEqual(self.accept(packet), first)
        packet['data'] = 'A' + packet['data'][1:]
        self.assertEqual(self.accept(packet)['status'], 409)

    def test_two_ids_never_mix(self):
        first = self.packets(dict(action='load', padding='x'*3000))[0]
        self.accept(first)
        second = self.packets(dict(action='load'), 'b'*32)[0]
        self.assertEqual(self.accept(second)['status'], 503)

    def test_final_retry_does_not_repeat_action(self):
        target = self.home / 'profiles/test.yaml'
        packet = self.packets(dict(action='file_write', path=str(target), content='first'))[0]
        self.assertEqual(self.accept(packet)['phase'], 'complete')
        target.write_text('changed independently')
        self.assertEqual(self.accept(packet)['phase'], 'complete')
        self.assertEqual(target.read_text(), 'changed independently')

    def test_expiry_at_300_seconds(self):
        packet = self.packets(dict(action='load', padding='x'*3000))[0]
        self.accept(packet)
        state = self.ram / f'run/webui/requests/{packet["id"]}/touched'
        state.write_text(str(int(time.time()) - 300))
        self.sh('webui_gc', ('webui-api',))
        self.assertFalse(state.parent.exists())

    def test_limits_before_mutation(self):
        packet = self.packets(dict(action='load'))[0]
        packet['count'] = 999999
        self.assertEqual(self.accept(packet)['status'], 413)
        self.assertFalse((self.ram / 'run/webui/requests' / packet['id']).exists())

    def test_huge_count_is_rejected_before_mutation(self):
        packet = self.packets(dict(action='load'))[0]
        packet['count'] = 10 ** 30
        self.assertEqual(self.accept(packet)['status'], 413)
        self.assertFalse((self.ram / 'run/webui/requests' / packet['id']).exists())

    def test_invalid_sequence_state_is_rejected(self):
        packets = self.packets(dict(action='load', padding='x' * 3000))
        self.accept(packets[0])
        state = self.ram / 'run/webui/requests' / packets[0]['id'] / 'next'
        state.write_text('invalid')
        self.assertEqual(self.accept(packets[1])['status'], 409)
        self.assertEqual(state.read_text(), 'invalid')

    def test_rejected_first_chunk_does_not_block_next_request(self):
        packet=self.packets(dict(action='load'))[0]; packet['data']='===='
        self.assertEqual(self.accept(packet)['status'],400)
        self.sh('webui_gc',('webui-api',))
        self.assertEqual(self.accept(self.packets(dict(action='load'),'b'*32)[0])['phase'],'complete')

    def test_settings_snapshot_preserves_complete_values_without_writing_jffs(self):
        settings=self.jffs/'addons/custom_settings.txt'
        original='addon_title Cool Addon 1.0\nempty \nliteral "Привет 😀" <% test %>\nspaced   keep  \n'
        settings.write_text(original)
        self.sh('webui_settings_snapshot "'+('c'*32)+'"',('webui-api',))
        result=json.loads((self.ram/('run/webui/responses/'+('c'*32)+'.json')).read_text())
        self.assertEqual(json.loads(base64.b64decode(result['body'])),dict(addon_title='Cool Addon 1.0',empty='',literal='"Привет 😀" <% test %>',spaced='  keep  '))
        self.assertEqual(settings.read_text(),original)
        self.assertNotIn('<%',json.dumps(result))

    def test_settings_snapshot_handles_absent_shared_file(self):
        self.sh('webui_settings_snapshot "'+('c'*32)+'"',('webui-api',))
        result=json.loads((self.ram/('run/webui/responses/'+('c'*32)+'.json')).read_text())
        self.assertEqual(json.loads(base64.b64decode(result['body'])),{})
        self.assertFalse((self.jffs/'addons/custom_settings.txt').exists())

    def test_native_settings_event_handles_missing_file_and_uses_ram_only(self):
        ident='c'*32
        self.sh(f'webui_event restart exodus_ui_settings_{ident}',('webui-api',))
        response=self.ram/f'run/webui/responses/{ident}.json'
        deadline=time.time()+5
        while not response.exists() and time.time()<deadline: time.sleep(.1)
        self.assertTrue(response.exists())
        self.assertEqual(json.loads(base64.b64decode(json.loads(response.read_text())['body'])),{})
        self.assertFalse((self.jffs/'addons/custom_settings.txt').exists())
        # Snapshot records are complete and do not block a subsequent operation.
        self.assertEqual(self.accept(self.packets(dict(action='load'),'b'*32)[0])['phase'],'complete')

    def test_settings_worker_without_setsid_uses_absolute_shell(self):
        # Firmware may only provide start-stop-daemon, whose -x requires a path.
        ident='d'*32
        self.mock('start-stop-daemon', '''[ "$1" = -S ] && [ "$2" = -b ] && [ "$3" = -x ] || exit 1
case "$4" in /*) ;; *) echo 'absolute executable required' >&2; exit 1 ;; esac
exe="$4"; shift 5
"$exe" "$@" </dev/null >/dev/null 2>&1 &''')
        self.sh(f'''have() {{ [ "$1" != setsid ]; }}
webui_event restart exodus_ui_settings_{ident}''',('webui-api',))
        response=self.ram/f'run/webui/responses/{ident}.json'
        deadline=time.time()+5
        while not response.exists() and time.time()<deadline: time.sleep(.1)
        self.assertTrue(response.exists(), 'native snapshot never received a response')
        self.assertEqual(json.loads(base64.b64decode(json.loads(response.read_text())['body'])),{})

    def test_foreign_setting_preserved_and_unrelated_event_ignored(self):
        settings = self.jffs / 'addons/custom_settings.txt'
        settings.write_text('other_addon untouched\n')
        self.sh('webui_event start exodus_ui; webui_event restart other_service', ('webui-api',))
        self.assertEqual(settings.read_text(), 'other_addon untouched\n')

    def test_worker_survives_code_replacement(self):
        target = self.home / 'profiles/stable.yaml'
        packet = self.packets(dict(action='file_write', path=str(target), content='stable'))[0]
        settings = self.jffs / 'addons/custom_settings.txt'
        settings.write_text('foreign keep\nexodus_packet ' + json.dumps(packet) + '\n')
        api = self.share / 'lib/api.sh'
        api.write_text(api.read_text().replace('req="$1"', 'sleep 1\n\treq="$1"'))
        self.sh('webui_event restart exodus_ui', ('webui-api',))
        api.write_text('broken replacement\n')
        deadline = time.time() + 5
        while not target.exists() and time.time() < deadline:
            time.sleep(.1)
        self.assertTrue(target.exists())
        self.assertEqual(target.read_text(), 'stable')
        self.assertIn('foreign keep', settings.read_text())

    def test_cache_refresh_has_no_jffs_writes(self):
        settings = self.jffs / 'addons/custom_settings.txt'
        settings.write_text('other untouched\n')
        self.sh('webui_cache_refresh', ('api', 'webui-api'))
        log = self.ram / 'run/webui/cache/log-app.json'
        before = log.stat().st_mtime_ns
        self.sh('webui_cache_refresh', ('api', 'webui-api'))
        self.assertEqual(log.stat().st_mtime_ns, before)
        self.assertEqual(settings.read_text(), 'other untouched\n')
        self.assertEqual(json.loads((log.parent / 'status.json').read_text())['key'], 'status')
