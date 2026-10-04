import json
from shell_support import ShellCase


class ApiTests(ShellCase):
    def test_native_dispatch_has_no_independent_login_or_password(self):
        for action in ('login','logout','passwd'):
            self.assertEqual(self.api(action)['status'],400)

    def test_load_preserves_config(self):
        original = json.loads((self.home / 'config.json').read_text())
        self.assertEqual(self.api('load')['data']['config'], original)

    def test_config_set_keeps_unknown_fields(self):
        config = json.loads((self.home / 'config.json').read_text())
        config['other_addon'] = {'opaque': 'keep me'}
        result = self.api('config_set', config=config)
        self.assertEqual(result['status'], 200)
        self.assertEqual(json.loads((self.home / 'config.json').read_text()), config)

    def test_service_rejects_unknown_op(self):
        self.assertEqual(self.api('service', op='shell')['status'], 400)

    def test_file_access_rejects_escape_and_symlink(self):
        outside = self.root / 'outside'
        outside.mkdir()
        secret = outside / 'secret.yaml'
        secret.write_text('private')
        profiles = self.home / 'profiles'
        (profiles / 'secret.yaml').symlink_to(secret)
        for path in (profiles / '../config.json', profiles / 'secret.yaml'):
            self.assertEqual(self.api('file_write', path=str(path), content='bad')['status'], 403)
        profiles.rename(self.home / 'old-profiles')
        profiles.symlink_to(outside, target_is_directory=True)
        self.assertEqual(self.api('file_write', path=str(profiles / 'new.yaml'), content='bad')['status'], 403)
        self.assertFalse((outside / 'new.yaml').exists())
        self.assertEqual(secret.read_text(), 'private')

    def test_file_write_round_trip(self):
        path = str(self.home / 'profiles/demo.yaml')
        content = 'name: "Привет 😀 <% test %>"\n'
        self.assertEqual(self.api('file_write', path=path, content=content)['status'], 200)
        self.assertEqual(self.api('file_read', path=path)['data']['content'], content)
