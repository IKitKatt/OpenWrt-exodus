import json
import subprocess
import shutil
import tarfile
import os
from shell_support import ROOT
import test_webui


class MigrationTests(test_webui.WebuiTests):
    def setUp(self):
        super().setUp()
        self.nv.update(productid='MOCK', **{'jffs2_scripts':'1'})
        self.write_nv()
        self.env.update(CORE='meta', GH_PROXY='', PATH=str(self.opt/'bin')+':'+os.environ['PATH'])
        self.addCleanup(self.stop_cache)
        self.mock('opkg', 'echo "$*" >> "$EXODUS_JFFS/opkg.calls"\n[ "$1" != print-architecture ] || echo "arch aarch64 10"')
        for name in ('iptables','iptables-save','iptables-restore','ipset','pidof','ip'):
            self.mock(name, 'exit 1')
        libexec=self.opt/'libexec'
        (libexec/'exodus').mkdir(parents=True)
        for path,text in [(libexec/'exodus/yq','echo "yq mikefarah v4"'),(libexec/'exodus/mihomo','echo "Mihomo Meta v1.19.15"')]:
            path.write_text('#!/bin/sh\n'+text+'\n'); path.chmod(0o755)
        config=json.loads((self.home/'config.json').read_text())
        config['web']={'port':12345}
        config['mixin']['api_secret']='keep-api-secret'
        config['mixin']['password']='keep-proxy-secret'
        config['config']['hwid']='keep-device'
        config['update']['core']='meta'
        (self.home/'config.json').write_text(json.dumps(config))
        (self.home/'web.auth').write_text('legacy:hash')
        (self.share/'BUILD').write_text('{"code":"fixture"}')
        self.installer=self.root/'install.sh'
        self.installer.write_text((ROOT/'install.sh').read_text())

    def stop_cache(self):
        if (self.share/'exodus').is_file():
            self.sh(f'"{self.share}/exodus" web stop',check=False)

    def bundle(self):
        source=self.root/'source'
        shutil.copytree(ROOT/'asuswrt', source/'repo/asuswrt')
        shutil.copy(ROOT/'install.sh',source/'repo/install.sh')
        for p in source.rglob('*'):
            if p.is_file() and (p.suffix=='.sh' or p.name in ('exodus','S99exodus')):
                p.write_bytes(p.read_bytes().replace(b'\r\n',b'\n'))
        archive=self.root/'source.tar.gz'
        with tarfile.open(archive,'w:gz') as tar: tar.add(source/'repo',arcname='repo')
        self.env['FIXTURE_ARCHIVE']=str(archive)
        self.mock('curl', '''out=; url=
while [ "$#" -gt 0 ]; do
 case "$1" in -o) out="$2"; shift ;; http*) url="$1" ;; esac
 shift
done
case "$url" in
 */archive/*.tar.gz) cp "$FIXTURE_ARCHIVE" "$out" ;;
 */VERSION) if [ -n "$out" ]; then printf '1.27.4\\n' > "$out"; else printf '1.27.4\\n'; fi ;;
 */version.txt) printf 'v1.19.15\\n' ;;
 *) exit 1 ;;
esac''')

    def install(self):
        return subprocess.run(['sh',str(self.installer)],env=self.env,capture_output=True,text=True,timeout=30,start_new_session=True)

    def test_preflight_failure_keeps_old_install(self):
        self.nv['extendno']='0'; self.write_nv()
        before=(self.home/'config.json').read_bytes()
        result=self.install()
        self.assertNotEqual(result.returncode,0)
        self.assertEqual((self.home/'config.json').read_bytes(),before)
        self.assertFalse((self.jffs/'opkg.calls').exists())
        self.assertTrue((self.share/'exodus').is_file())

    def test_installer_and_helper_version_bounds_agree(self):
        for firm,build,ext in [('3.0.0.6','102','1'),('3.0.0.6','102','2'),('3.0.0.6','102','0'),('3.0.0.4','388','9'),('unknown','102','1')]:
            self.nv.update(firmver=firm,buildno=build,extendno=ext); self.write_nv()
            calls=self.jffs/'opkg.calls'; calls.unlink(missing_ok=True)
            valid=self.web('webui_preflight',False).returncode==0
            self.install()
            self.assertEqual(calls.exists(),valid,(firm,build,ext))

    def test_migration_preserves_data_and_hooks_are_idempotent(self):
        self.bundle()
        (self.jffs/'scripts').mkdir()
        foreign=self.jffs/'scripts/service-event'
        foreign.write_text('#!/bin/sh\necho foreign # other addon\n')
        for _ in range(2):
            result=self.install()
            self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        config=json.loads((self.home/'config.json').read_text())
        self.assertEqual(config['web']['port'],12345)
        self.assertEqual(config['mixin']['api_secret'],'keep-api-secret')
        self.assertEqual(config['mixin']['password'],'keep-proxy-secret')
        self.assertEqual((self.home/'web.auth').read_text(),'legacy:hash')
        self.assertEqual(foreign.read_text().count('# exodus'),1)
        self.assertIn('other addon',foreign.read_text())
        self.assertNotIn('lighttpd',(self.jffs/'opkg.calls').read_text())
        self.assertIn('user1.asp',result.stdout)
        self.sh(f'"{self.share}/exodus" web stop')

    def test_only_old_exodus_web_stopped(self):
        self.env['EXODUS_PROC']=str(self.root/'proc')
        proc=self.root/'proc/99999'; proc.mkdir(parents=True)
        (proc/'cmdline').write_bytes(b'foreign-server\0')
        (self.ram/'run/web.pid').write_text('99999')
        signal=self.root/'signal'
        self.web(f'kill() {{ echo "$*" >> "{signal}"; }}; webui_stop_legacy')
        self.assertFalse(signal.exists())

    def test_verified_legacy_pid_is_stopped(self):
        self.env['EXODUS_PROC']=str(self.root/'proc')
        proc=self.root/'proc/99999'; proc.mkdir(parents=True)
        executable=self.opt/'sbin/lighttpd'; executable.parent.mkdir(exist_ok=True)
        executable.write_text('fixture')
        (proc/'exe').symlink_to(executable)
        (proc/'status').write_text('Uid:\t0\t0\t0\t0\n')
        (proc/'cmdline').write_bytes((str(executable)+'\0-f\0'+str(self.ram/'run/lighttpd.conf')+'\0').encode())
        (self.ram/'run/web.pid').write_text('99999')
        signal=self.root/'signal'
        self.web(f'kill() {{ echo "$*" >> "{signal}"; }}; webui_stop_legacy')
        self.assertEqual(signal.read_text().strip(),'99999')
        self.assertFalse((self.ram/'run/web.pid').exists())

    def test_update_preserves_ram_response_and_proxy_stop_keeps_ui(self):
        self.bundle()
        self.web('webui_mount')
        response=self.ram/'run/webui/responses'/('a'*32+'.json')
        response.write_text('{"fixture":"pending update response"}')
        result=self.install()
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual(response.read_text(),'{"fixture":"pending update response"}')
        self.sh(f'"{self.share}/exodus" stop',check=False)
        self.web('webui_status')
        self.assertTrue((self.ram/'run/webui/cache.pid').exists())

    def test_late_usb_boot_stub_restores_ui(self):
        self.web('webui_mount; webui_unmount')
        delayed=self.share.with_name('exodus.delayed')
        self.share.rename(delayed)
        # The first retry simulates Entware becoming available.
        self.mock('sleep', f'if [ -d "{delayed}" ]; then mv "{delayed}" "{self.share}"; else /bin/sleep "$@"; fi')
        boot=self.jffs/'addons/exodus/boot.sh'
        result=subprocess.run(['sh',str(boot)],env=self.env,capture_output=True,text=True,timeout=20)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.web('webui_status')

    def test_cache_restart_keeps_current_worker_pid(self):
        result=self.sh(f'"{self.share}/exodus" web start && "{self.share}/exodus" web restart && sleep 6; pid_alive "$WEBUI_DIR/cache.pid"',check=False)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)

    def test_uninstall_broken_cli_removes_only_owned_registration(self):
        self.web('webui_mount')
        target=self.www/'require/modules/menuTree.js'
        visible=target.read_text()+'\n// latest foreign menu entry\n'
        target.unlink(); target.write_text(visible)
        (self.share/'exodus').write_text('#!/bin/sh\nexit 1\n')
        script=self.root/'uninstall.sh'; script.write_text((ROOT/'uninstall.sh').read_text())
        result=subprocess.run(['sh',str(script)],env=self.env,capture_output=True,text=True,timeout=20)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertFalse(self.home.exists())
        self.assertFalse((self.www/'user/user1.asp').exists())
        self.assertIn('Other addon',(self.root/'tmp/menuTree.js').read_text())
        self.assertIn('latest foreign menu entry',target.read_text())
        self.assertEqual((self.www/'user/user20.asp').read_text(),'foreign page')

    def test_registration_failure_has_no_success(self):
        self.bundle()
        for i in range(1,21): (self.www/f'user/user{i}.asp').write_text('foreign')
        before=(self.home/'config.json').read_bytes()
        result=self.install()
        self.assertNotEqual(result.returncode,0)
        self.assertNotIn('\nsuccess\n',result.stdout)
        self.assertEqual((self.home/'config.json').read_bytes(),before)
        self.assertTrue((self.share/'BUILD').read_text().startswith('{"code":"fixture"}'))

    def test_staging_failure_keeps_previous_webui_running(self):
        self.bundle(); self.sh(f'"{self.share}/exodus" web start')
        before=(self.home/'config.json').read_bytes()
        self.mock('cp','case "$1" in -R) exit 1 ;; esac\nexec /bin/cp "$@"')
        result=self.install()
        self.assertNotEqual(result.returncode,0)
        self.assertEqual((self.home/'config.json').read_bytes(),before)
        self.sh('pid_alive "$WEBUI_DIR/cache.pid"')
        self.web('webui_status')

    def test_broken_cli_uninstall_stops_live_owned_cache(self):
        self.sh(f'"{self.share}/exodus" web start')
        pid=int((self.ram/'run/webui/cache.pid').read_text())
        def cleanup():
            from pathlib import Path
            cmd=Path('/proc')/str(pid)/'cmdline'
            if cmd.exists() and str(self.share/'exodus').encode() in cmd.read_bytes().split(b'\0'):
                try: os.kill(pid,9)
                except ProcessLookupError: pass
        self.addCleanup(cleanup)
        (self.share/'exodus').write_text('#!/bin/sh\nexit 1\n')
        script=self.root/'uninstall.sh'; script.write_text((ROOT/'uninstall.sh').read_text())
        result=subprocess.run(['sh',str(script)],env=self.env,capture_output=True,text=True,timeout=20)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        import time
        time.sleep(6)
        self.assertFalse(self.ram.exists())
        # Zombies are stopped processes, not executing cache daemons.
        state=(__import__('pathlib').Path('/proc')/str(pid)/'status')
        self.assertTrue(not state.exists() or 'State:\tZ' in state.read_text())

    def test_passwd_does_not_read_or_replace_legacy_auth(self):
        auth=(self.home/'web.auth').read_bytes()
        result=self.sh(f'"{self.share}/exodus" passwd',check=False)
        self.assertIn('Merlin',result.stdout)
        self.assertEqual((self.home/'web.auth').read_bytes(),auth)

    def test_uninstall_keeps_foreign_addons_and_keep_config(self):
        self.web('webui_mount')
        settings=self.jffs/'addons/custom_settings.txt'
        settings.write_text('other keep\nexodus_packet {}\n')
        script=self.root/'uninstall.sh'; script.write_text((ROOT/'uninstall.sh').read_text())
        self.env['KEEP_CONFIG']='1'
        result=subprocess.run(['sh',str(script)],env=self.env,capture_output=True,text=True,timeout=20)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertTrue((self.home/'config.json').exists())
        self.assertEqual((self.www/'user/user20.asp').read_text(),'foreign page')
        self.assertEqual(settings.read_text(),'other keep\n')
