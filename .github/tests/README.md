# Full local checks

Run from the repository root with Python 3, Node **22.23.4**, npm, jq and
shellcheck available. Python uses only the standard library. Browser dependencies
are test-only and stay outside `asuswrt/` (the router payload).

## Install and run tests

```sh
npm ci --prefix .github/tests --ignore-scripts --no-audit --no-fund
.github/tests/node_modules/.bin/playwright install chromium
python3 -m unittest discover -s .github/tests -v
node --test .github/tests/*.test.mjs
npm test --prefix .github/tests
```

On a machine missing Chromium's system libraries, an administrator can provision
those prerequisites using the pinned local CLI:

```sh
.github/tests/node_modules/.bin/playwright install --with-deps chromium
```

This command may request elevated privileges; do not run it on a restricted host
without approval. CI runs it on its disposable Ubuntu runner. See the official
[Playwright browser installation](https://playwright.dev/docs/browsers) and
[CI guidance](https://playwright.dev/docs/ci).

`npm test --prefix .github/tests` discovers all `*.browser.mjs` files in this
directory, sorts their names, and runs each in a separate Node process. It runs
remaining suites after a failure and exits nonzero if any suite fails (or none
exist). Missing Playwright, Chromium or libraries are failures, never skips.
Browser suites are deliberately separate from native Node `*.test.mjs` discovery.
The native tests include a dependency-free runner regression with temporary
success/failure fixtures. To run one browser suite directly:
`node .github/tests/editor.browser.mjs`.

## Other CI checks

```sh
shellcheck --version
shellcheck -s sh -e SC3043,SC2154,SC1091,SC2016,SC3045,SC2034,SC2119,SC2120,SC2153 \
  install.sh uninstall.sh \
  asuswrt/opt/share/exodus/exodus \
  asuswrt/opt/share/exodus/lib/*.sh \
  asuswrt/opt/etc/init.d/S99exodus

npm ci --prefix tools/editor --ignore-scripts --no-audit --no-fund
npm run --prefix tools/editor build
git diff --exit-code -- asuswrt/opt/share/exodus/www/editor.js asuswrt/opt/share/exodus/www/editor.LICENSE.txt

node --check asuswrt/opt/share/exodus/www/app.js
node --check asuswrt/opt/share/exodus/www/i18n.js
node --check asuswrt/opt/share/exodus/www/merlin.js
node --check asuswrt/opt/share/exodus/www/editor.js

# Entware jq has no oniguruma regex support.
! grep -n -E '\b(test|match|capture|scan|splits|sub|gsub)\("|split\("[^"]*";' \
  install.sh asuswrt/opt/share/exodus/exodus asuswrt/opt/share/exodus/lib/*
jq -e 'type == "object"' asuswrt/opt/etc/exodus/config.json
jq -e -f asuswrt/opt/share/exodus/lib/mixin.jq asuswrt/opt/etc/exodus/config.json > /dev/null
grep -q -E '^[0-9]+\.[0-9]+\.[0-9]+$' asuswrt/opt/share/exodus/VERSION
```

The bundle diff check assumes the generated editor files are committed and clean;
with intentional uncommitted bundle changes, compare hashes before and after a
lockfile-based rebuild instead. The workflow `.github/workflows/check.yml` is the
source of truth for CI commands. Automated checks do not measure router hardware
latency.
