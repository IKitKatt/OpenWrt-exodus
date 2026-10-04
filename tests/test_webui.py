import json
import shutil
from shell_support import ShellCase, ROOT


class WebuiTests(ShellCase):
    def test_native_banner_form_target_exists(self):
        asp=(self.share/'www/Exodus.asp').read_text()
        self.assertIn('name="hidden_frame"',asp)

    def setUp(self):
        super().setUp()
        self.nv = {'firmver': '3.0.0.6', 'buildno': '102', 'extendno': '1',
                   'rc_support': 'am_addons', '3rd-party': 'merlin', 'jffs2_scripts': '1',
                   'http_enable': '0', 'http_lanport': '80', 'https_lanport': '8443', 'lan_ipaddr': '192.168.50.1'}
        self.write_nv()
        self.mock('nvram', 'sed -n "s/^$2=//p" "$EXODUS_JFFS/nvram"')
        self.mock('mount', 'echo "$*" >> "$EXODUS_JFFS/mount.calls"')
        self.mock('umount', 'exit 0')
        (self.root / 'helper.sh').write_text('am_get_webui_page() { am_webui_page=user1.asp; }\n')
        (self.www / 'require/modules').mkdir(parents=True)
        shutil.copy(ROOT / 'tests/fixtures/menuTree.js', self.www / 'require/modules/menuTree.js')
        (self.www / 'user/user20.asp').write_text('foreign page')
        self.env['EXODUS_MENU'] = str(self.root / 'tmp/menuTree.js')

    def write_nv(self):
        (self.jffs / 'nvram').write_text(''.join(f'{k}={v}\n' for k, v in self.nv.items()))

    def web(self, command, check=True):
        return self.sh(command, ('webui',), check)

    def test_minimum_version(self):
        for firm, build, ext, valid in [('3.0.0.6','102','1', True), ('3.0.0.6','102','2',True),
                                        ('3.0.0.6','102','0',False), ('3.0.0.4','388','9',False),
                                        ('unknown','102','1',False)]:
            self.nv.update(firmver=firm, buildno=build, extendno=ext)
            self.write_nv()
            self.assertEqual(self.web('webui_preflight', False).returncode == 0, valid)
        self.nv.update(firmver='3.0.0.6', extendno='1', **{'3rd-party':'stock'})
        self.write_nv()
        self.assertNotEqual(self.web('webui_preflight', False).returncode, 0)

    def test_slot_reused_after_content_update(self):
        self.web('webui_mount')
        asp = self.share / 'www/Exodus.asp'
        asp.write_text(asp.read_text() + '\n<!-- update -->')
        self.web('webui_mount')
        self.assertEqual(len([p for p in (self.www / 'user').glob('user*.asp') if 'page:exodus' in p.read_text()]), 1)
        self.assertEqual((self.root / 'tmp/menuTree.js').read_text().count('tabName: "Exodus"'), 1)

    def test_foreign_pages_and_menu_survive(self):
        self.web('webui_mount')
        menu = self.root / 'tmp/menuTree.js'
        menu.write_text(menu.read_text() + '\n// foreign later change\n')
        self.web('webui_mount; webui_unmount')
        self.assertEqual((self.www / 'user/user20.asp').read_text(), 'foreign page')
        self.assertIn('foreign later change', menu.read_text())
        self.assertIn('Other addon', menu.read_text())
        self.assertNotIn('tabName: "Exodus"', menu.read_text())

    def test_all_slots_busy(self):
        for i in range(1, 21):
            (self.www / f'user/user{i}.asp').write_text('foreign')
        self.assertNotEqual(self.web('webui_mount', False).returncode, 0)
        self.assertTrue(all(p.read_text() == 'foreign' for p in (self.www / 'user').glob('*.asp')))

    def test_late_entware_mount(self):
        self.web('webui_mount')
        self.web('webui_mount')
        self.assertEqual((self.root / 'tmp/menuTree.js').read_text().count('tabName: "Exodus"'), 1)
        self.assertTrue((self.jffs / 'addons/exodus/boot.sh').is_file())

    def test_unsupported_preflight_is_read_only(self):
        self.nv['extendno'] = '0'
        self.write_nv()
        before = sorted(str(p) for p in self.root.rglob('*'))
        self.assertNotEqual(self.web('webui_preflight', False).returncode, 0)
        self.assertEqual(before, sorted(str(p) for p in self.root.rglob('*')))

    def test_url_modes_and_ports(self):
        self.web('webui_mount')
        for mode, port, expected in [('0','8080','http://192.168.50.1:8080/'),
                                     ('1','9443','https://192.168.50.1:9443/'),
                                     ('2','443','https://192.168.50.1/')]:
            self.nv.update(http_enable=mode, http_lanport=port, https_lanport=port)
            self.write_nv()
            self.assertEqual(self.web('webui_url').stdout.strip(), expected + 'user1.asp')
