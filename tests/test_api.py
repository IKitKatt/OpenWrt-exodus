import json
import hashlib
import subprocess
from shell_support import ShellCase


class ApiTests(ShellCase):
    def test_cgi_authentication_compatibility(self):
        cgi = self.share / 'www/api.cgi'
        auth = 'salt:' + hashlib.sha256(b'saltpassword').hexdigest()
        (self.home / 'web.auth').write_text(auth)
        def request(body, **extra):
            raw = json.dumps(body)
            result = subprocess.run(['sh', str(cgi)], input=raw, text=True,
                                    capture_output=True, check=True,
                                    env={**self.env, 'REQUEST_METHOD': 'POST',
                                         'CONTENT_LENGTH': str(len(raw)), **extra})
            return result.stdout
        self.assertIn('403', request({'action': 'load'}))
        self.assertIn('401', request({'action': 'load'}, HTTP_X_EXODUS='1'))
        login = request({'action': 'login', 'password': 'password'}, HTTP_X_EXODUS='1')
        self.assertIn('200', login)
        cookie = login.split('Set-Cookie: ')[1].split(';')[0]
        self.assertIn('subscription_states', request({'action': 'load'}, HTTP_X_EXODUS='1', HTTP_COOKIE=cookie))

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
