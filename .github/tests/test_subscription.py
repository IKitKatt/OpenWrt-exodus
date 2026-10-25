import json
import unittest

from shell_support import ShellCase


# curl answers by the user agent: the panel knows MODE, the others get a list of links
CURL = r'''
agent= headers= output=
while [ "$#" -gt 0 ]; do
	case "$1" in
		-A) agent="$2"; shift ;;
		-D) headers="$2"; shift ;;
		-o) output="$2"; shift ;;
	esac
	shift
done
printf '%s\n' "$agent" >> "$CALLS"
[ "$MODE" = offline ] && exit 7
printf 'HTTP/1.1 200 OK\r\n\r\n' > "$headers"
case "$agent" in
	"$KNOWN"*) printf 'proxies: []\n' > "$output" ;;
	*) printf 'dmxlc3M6Ly9leGFtcGxl\n' > "$output" ;;
esac
'''

# yq of the check: a profile has proxies
YQ = 'for file; do :; done; grep -q "^proxies:" "$file"'


class SubscriptionUserAgentTest(ShellCase):
    def setUp(self):
        super().setUp()
        self.mock('curl', CURL)
        yq = self.opt / 'libexec/exodus/yq'
        yq.parent.mkdir(parents=True, exist_ok=True)
        yq.write_text('#!/bin/sh\n' + YQ + '\n')
        yq.chmod(0o755)
        self.calls = self.root / 'curl.calls'
        self.env.update({'CALLS': str(self.calls), 'MODE': 'online'})
        self.version = (self.share / 'VERSION').read_text().strip()

    def update(self, user_agent, known):
        config = json.loads((self.home / 'config.json').read_text())
        config['subscriptions'][0].update({'url': 'https://example.com/sub', 'user_agent': user_agent, 'send_hwid': False})
        (self.home / 'config.json').write_text(json.dumps(config))
        self.env['KNOWN'] = known
        result = self.sh('update_subscription default', ('profile',), check=False)
        calls = self.calls.read_text().splitlines() if self.calls.exists() else []
        return result.returncode, calls

    def test_provider_without_rules_for_exodus_gets_the_previous_user_agent(self):
        status, calls = self.update('Exodus/{version} {platform}', 'Mihomo/Exodus')
        self.assertEqual(status, 0)
        self.assertEqual([agent.split('/')[0] for agent in calls], ['Exodus', 'Mihomo'])
        self.assertEqual(calls[1], f'Mihomo/Exodus v{self.version}')
        self.assertTrue((self.home / 'subscriptions/default.yaml').read_text().startswith('proxies'))

    def test_provider_with_rules_for_exodus_is_asked_once(self):
        status, calls = self.update('Exodus/{version} {platform}', 'Exodus/')
        self.assertEqual(status, 0)
        self.assertEqual(len(calls), 1)
        self.assertTrue(calls[0].startswith(f'Exodus/{self.version} '))

    def test_unreachable_provider_is_not_asked_again(self):
        self.env['MODE'] = 'offline'
        status, calls = self.update('Exodus/{version} {platform}', 'Mihomo/Exodus')
        self.assertNotEqual(status, 0)
        self.assertEqual(len(calls), 1)

    def test_user_agent_of_the_user_has_no_fallback(self):
        status, calls = self.update('clash.meta', 'Mihomo/Exodus')
        self.assertNotEqual(status, 0)
        self.assertEqual(calls, ['clash.meta'])


if __name__ == '__main__':
    unittest.main()
