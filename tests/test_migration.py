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
        shutil.copy(ROOT/'uninstall.sh',source/'repo/uninstall.sh')
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
echo "$url" >> "$EXODUS_JFFS/curl.calls"
case "$url" in
 */archive/*.tar.gz) cp "$FIXTURE_ARCHIVE" "$out" ;;
 */VERSION) if [ -n "$out" ]; then printf '1.27.4\\n' > "$out"; else printf '1.27.4\\n'; fi ;;
 */version.txt) printf '%s\\n' "${FIXTURE_CORE_VERSION:-v1.19.15}" ;;
 */mihomo-*.gz) cp "$FIXTURE_CORE_GZ" "$out" ;;
 *) exit 1 ;;
esac''')

    def install(self):
        return subprocess.run(['sh',str(self.installer)],env=self.env,capture_output=True,text=True,timeout=30,start_new_session=True)

    def test_native_branch_is_default_download_source(self):
        self.bundle()
        result=self.install()
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        build=json.loads((self.share/'BUILD').read_text())
        self.assertEqual(build['ref'],'asuswrt-native')
        self.assertEqual(build['repository'],'IKitKatt/openwrt-exodus')
        calls=(self.jffs/'curl.calls').read_text()
        self.assertIn('/archive/asuswrt-native.tar.gz',calls)
        self.assertNotIn('/archive/asuswrt.tar.gz',calls)

    def test_fork_repository_is_used_and_saved(self):
        self.bundle()
        self.env['REPOSITORY']='router-owner/Exodus-fork'
        result=self.install()
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        build=json.loads((self.share/'BUILD').read_text())
        self.assertEqual(build.get('repository'),'router-owner/Exodus-fork')
        self.assertEqual(build['ref'],'asuswrt-native')
        self.assertIn('https://github.com/router-owner/Exodus-fork/archive/asuswrt-native.tar.gz',(self.jffs/'curl.calls').read_text())

    def test_ax86u_3004_388_12_2_installs_native_ui(self):
        self.bundle()
        self.nv.update(productid='RT-AX86U',firmver='3.0.0.4',buildno='388.12',extendno='2')
        self.write_nv()
        result=self.install()
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.web('webui_status')
        self.assertEqual(json.loads((self.share/'BUILD').read_text())['repository'],'IKitKatt/openwrt-exodus')

    def repack(self):
        with tarfile.open(self.env['FIXTURE_ARCHIVE'],'w:gz') as tar:
            tar.add(self.root/'source/repo',arcname='repo')

    def fail_payload(self, action):
        cli=self.root/'source/repo/asuswrt/opt/share/exodus/exodus'
        cli.write_text(cli.read_text().replace('#!/bin/sh\n',f'#!/bin/sh\n[ "$1" != "{action}" ] || exit 1\n',1))
        self.repack()

    def test_local_source_installs_current_assets_and_uninstaller(self):
        self.bundle()
        source=self.root/'source/repo'
        css=source/'asuswrt/opt/share/exodus/www/style.css'
        css.write_text(css.read_text()+'\n/* local source fixture */\n')
        self.env['SOURCE_DIR']=str(source)
        self.env['FIXTURE_ARCHIVE']=str(self.root/'no-download.tar.gz')
        result=self.install()
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertIn('local source fixture',(self.share/'www/style.css').read_text())
        self.assertTrue((self.share/'uninstall.sh').is_file())

    def test_incomplete_payload_is_rejected_before_stopping_old_ui(self):
        self.bundle(); self.sh(f'"{self.share}/exodus" web start')
        (self.root/'source/repo/asuswrt/opt/share/exodus/www/app.js').unlink()
        self.repack()
        result=self.install()
        self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
        self.sh('pid_alive "$WEBUI_DIR/cache.pid"')
        self.assertEqual(json.loads((self.share/'BUILD').read_text())['code'],'fixture')

    def test_init_failure_rolls_back_and_error_is_last_line(self):
        self.bundle(); self.fail_payload('init')
        self.web('webui_mount')
        before=(self.home/'config.json').read_bytes()
        result=self.install()
        self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual((self.home/'config.json').read_bytes(),before)
        self.assertEqual(json.loads((self.share/'BUILD').read_text())['code'],'fixture')
        self.assertTrue(result.stdout.strip().splitlines()[-1].startswith('error:'))
        self.web('webui_status')

    def test_web_url_failure_or_empty_output_rolls_back(self):
        self.bundle()
        cli=self.root/'source/repo/asuswrt/opt/share/exodus/exodus'
        original=cli.read_text()
        before=(self.home/'config.json').read_bytes()
        for status in (0,1):
            with self.subTest(url_exit_status=status):
                cli.write_text(original.replace('#!/bin/sh\n',f'#!/bin/sh\n[ "$1 $2" != "web url" ] || exit {status}\n',1))
                self.repack()
                result=self.install()
                self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
                self.assertEqual((self.home/'config.json').read_bytes(),before)
                self.assertEqual(json.loads((self.share/'BUILD').read_text())['code'],'fixture')
                self.assertEqual(result.stdout.strip().splitlines()[-1],'error: native WebUI URL unavailable')

    def test_term_during_initialization_rolls_back(self):
        self.bundle()
        cli=self.root/'source/repo/asuswrt/opt/share/exodus/exodus'
        cli.write_text(cli.read_text().replace('#!/bin/sh\n','#!/bin/sh\n[ "$1" != init ] || { kill -TERM "$PPID"; exit 1; }\n',1))
        self.repack()
        before=(self.home/'config.json').read_bytes()
        result=self.install()
        self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual((self.home/'config.json').read_bytes(),before)
        self.assertEqual(json.loads((self.share/'BUILD').read_text())['code'],'fixture')
        self.assertIn('interrupted by TERM',result.stdout.strip().splitlines()[-1])
        self.assertFalse((self.opt/'tmp/exodus-install.lock').exists())

    def test_unresolved_recovery_backup_is_not_overwritten(self):
        self.bundle()
        backup=self.opt/'tmp/exodus-install/backup'; backup.mkdir(parents=True)
        preserved=backup/'config.json'; preserved.write_text('recovery fixture')
        (backup.parent/'recovery-required').touch()
        result=self.install()
        self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual(preserved.read_text(),'recovery fixture')
        self.assertNotIn('install packages',result.stdout)

    def test_service_failure_retains_rollback_until_activation(self):
        config=json.loads((self.home/'config.json').read_text()); config['config']['enabled']=True
        (self.home/'config.json').write_text(json.dumps(config))
        self.bundle(); self.fail_payload('restart')
        before=(self.home/'config.json').read_bytes()
        result=self.install()
        self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual((self.home/'config.json').read_bytes(),before)
        self.assertEqual(json.loads((self.share/'BUILD').read_text())['code'],'fixture')
        self.assertTrue(result.stdout.strip().splitlines()[-1].startswith('error:'))

    def test_hook_write_failure_rolls_back(self):
        self.bundle()
        self.mock('mv','for arg in "$@"; do case "$arg" in */scripts/service-event) exit 1 ;; esac; done\nexec /bin/mv "$@"')
        result=self.install()
        self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual(json.loads((self.share/'BUILD').read_text())['code'],'fixture')

    def test_hook_read_failure_preserves_foreign_commands(self):
        self.bundle()
        (self.jffs/'scripts').mkdir()
        hook=self.jffs/'scripts/firewall-start'
        before='#!/bin/sh\necho foreign-addon\nexit 0\n'
        hook.write_text(before)
        for tool in ('tail','sed'):
            self.mock(tool,f'for arg in "$@"; do case "$arg" in */scripts/firewall-start) exit 1 ;; esac; done\nexec /bin/{tool} "$@"')
        result=self.install()
        self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual(hook.read_text(),before)
        self.assertEqual(json.loads((self.share/'BUILD').read_text())['code'],'fixture')

    def test_uninstall_holds_installation_lock_during_cleanup(self):
        import time
        self.bundle()
        signal=self.root/'paused'; resume=self.root/'resume'
        self.mock('touch',f'case "$1" in */run/stop.flag) touch_marker="{signal}"; /bin/touch "$touch_marker"; while [ ! -f "{resume}" ]; do sleep 0.05; done ;; esac\nexec /bin/touch "$@"')
        script=self.root/'uninstall.sh'; script.write_text((ROOT/'uninstall.sh').read_text())
        child=subprocess.Popen(['sh',str(script)],env=self.env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        def cleanup():
            resume.touch()
            if child.poll() is None: child.terminate()
            child.communicate(timeout=10)
        self.addCleanup(cleanup)
        deadline=time.monotonic()+5
        while not signal.exists() and time.monotonic()<deadline: time.sleep(0.05)
        self.assertTrue(signal.exists(),'uninstaller did not reach pause')
        result=self.install()
        resume.touch()
        output,error=child.communicate(timeout=20)
        self.assertEqual(child.returncode,0,output+error)
        self.assertNotEqual(result.returncode,0,'installation succeeded inside uninstall cleanup')

    def test_uninstall_stops_core_renamed_into_recovery_backup(self):
        import sys
        core=self.opt/'libexec/exodus/mihomo'
        shutil.copyfile(sys.executable,core); core.chmod(0o755)
        child=subprocess.Popen([str(core),'-c','import time; time.sleep(60)','-d',str(self.home/'run')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        def cleanup():
            if child.poll() is None: child.terminate()
            child.wait(timeout=5)
        self.addCleanup(cleanup)
        backup=self.opt/'tmp/exodus-install/backup'; backup.mkdir(parents=True)
        core.rename(backup/'mihomo')
        (self.ram/'run/core.pid').write_text(str(child.pid))
        (self.share/'exodus').write_text('#!/bin/sh\nexit 1\n')
        script=self.root/'uninstall.sh'; script.write_text((ROOT/'uninstall.sh').read_text())
        result=subprocess.run(['sh',str(script)],env=self.env,capture_output=True,text=True,timeout=20)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertIsNotNone(child.poll(),'renamed owned core remained alive')

    def test_uninstall_stops_core_with_symlinked_opt_mount(self):
        import sys
        core=self.opt/'libexec/exodus/mihomo'
        shutil.copyfile(sys.executable,core); core.chmod(0o755)
        alias=self.root/'opt-link'; alias.symlink_to(self.opt,target_is_directory=True)
        self.env['EXODUS_OPT']=str(alias)
        child=subprocess.Popen([str(alias/'libexec/exodus/mihomo'),'-c','import time; time.sleep(60)','-d',str(alias/'etc/exodus/run')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        def cleanup():
            if child.poll() is None: child.terminate()
            child.wait(timeout=5)
        self.addCleanup(cleanup)
        (self.ram/'run/core.pid').write_text(str(child.pid))
        (self.share/'exodus').write_text('#!/bin/sh\nexit 1\n')
        script=self.root/'uninstall.sh'; script.write_text((ROOT/'uninstall.sh').read_text())
        result=subprocess.run(['sh',str(script)],env=self.env,capture_output=True,text=True,timeout=20)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertIsNotNone(child.poll(),'owned core on symlinked Entware mount remained alive')

    def test_registration_failure_restores_replaced_core(self):
        import gzip
        self.bundle()
        core=self.opt/'libexec/exodus/mihomo'; before=core.read_bytes()
        fixture=self.root/'core.gz'
        fixture.write_bytes(gzip.compress(b'#!/bin/sh\necho "Mihomo Meta v1.99.0"\n'))
        self.env.update(FIXTURE_CORE_VERSION='v1.99.0',FIXTURE_CORE_GZ=str(fixture))
        for i in range(1,21): (self.www/f'user/user{i}.asp').write_text('foreign')
        result=self.install()
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(core.read_bytes(),before)
        self.assertTrue(result.stdout.strip().splitlines()[-1].startswith('error:'))

    def test_broken_cli_uninstall_stops_owned_watch(self):
        (self.share/'exodus').write_text('#!/bin/sh\nexit 1\n')
        child=subprocess.Popen(['sh','-c','trap "exit 0" TERM; while :; do sleep 1; done',str(self.share/'exodus'),'watch'],env=self.env)
        def cleanup():
            if child.poll() is None: child.terminate(); child.wait(timeout=5)
        self.addCleanup(cleanup)
        (self.ram/'run/watch.pid').write_text(str(child.pid))
        script=self.root/'uninstall.sh'; script.write_text((ROOT/'uninstall.sh').read_text())
        result=subprocess.run(['sh',str(script)],env=self.env,capture_output=True,text=True,timeout=20)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertIsNotNone(child.poll(),'owned watcher still running after uninstall')

    def test_uninstall_menu_failure_keeps_files_and_reports_error(self):
        self.web('webui_mount')
        (self.share/'exodus').write_text('#!/bin/sh\nexit 1\n')
        self.mock('mount','exit 1')
        self.mock('ip','echo "$*" >> "$EXODUS_JFFS/ip.calls"\nexit 1')
        script=self.root/'uninstall.sh'; script.write_text((ROOT/'uninstall.sh').read_text())
        result=subprocess.run(['sh',str(script)],env=self.env,capture_output=True,text=True,timeout=20)
        self.assertNotEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertTrue(self.share.exists())
        self.assertTrue(self.home.exists())
        self.assertTrue(result.stdout.strip().splitlines()[-1].startswith('error:'))
        self.assertIn('route flush table 7892',(self.jffs/'ip.calls').read_text())

    def test_live_installer_lock_blocks_install_and_uninstall(self):
        self.bundle()
        lock=self.opt/'tmp/exodus-install.lock'; lock.mkdir(parents=True)
        (lock/'pid').write_text(str(os.getpid()))
        result=self.install()
        self.assertNotEqual(result.returncode,0)
        self.assertEqual((self.jffs/'opkg.calls').read_text().strip(),'print-architecture')
        script=self.root/'uninstall.sh'; script.write_text((ROOT/'uninstall.sh').read_text())
        result=subprocess.run(['sh',str(script)],env=self.env,capture_output=True,text=True,timeout=20)
        self.assertNotEqual(result.returncode,0)
        self.assertTrue(self.share.exists())

    def test_generated_bundle_installs_with_local_entrypoint(self):
        import sys
        self.bundle()
        subprocess.run([sys.executable,str(ROOT/'scripts/package-asuswrt.py'),'--output',str(self.root/'dist')],check=True,capture_output=True)
        archive=next((self.root/'dist').glob('*.tar.gz'))
        with tarfile.open(archive) as bundle: bundle.extractall(self.root/'extracted',filter='data')
        entry=self.root/'extracted/exodus-native/install-local.sh'
        result=subprocess.run(['sh',str(entry)],env=self.env,capture_output=True,text=True,timeout=30,start_new_session=True)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        self.assertEqual((self.share/'www/app.js').read_bytes(),(ROOT/'asuswrt/opt/share/exodus/www/app.js').read_bytes().replace(b'\r\n',b'\n'))
        self.assertTrue((self.share/'uninstall.sh').is_file())

    def test_preflight_failure_keeps_old_install(self):
        self.nv['extendno']='0'; self.write_nv()
        before=(self.home/'config.json').read_bytes()
        result=self.install()
        self.assertNotEqual(result.returncode,0)
        self.assertEqual((self.home/'config.json').read_bytes(),before)
        self.assertFalse((self.jffs/'opkg.calls').exists())
        self.assertTrue((self.share/'exodus').is_file())
        self.assertIn('unsupported firmware',result.stdout)

    def test_installer_and_helper_version_bounds_agree(self):
        self.mock('curl','exit 1')
        for firm,build,ext,expected in test_webui.FIRMWARE_CASES:
            self.nv.update(firmver=firm,buildno=build,extendno=ext); self.write_nv()
            calls=self.jffs/'opkg.calls'; calls.unlink(missing_ok=True)
            valid=self.web('webui_preflight',False).returncode==0
            self.assertEqual(valid,expected,(firm,build,ext))
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
