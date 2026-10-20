# Exodus YAML editor

Small CodeMirror 6 build for the native Merlin Editor page. Browser only: no CDN, workers, router-side Node.js or Entware dependencies. The committed bundle is loaded only on Editor; the existing textarea remains the fallback.

Included: YAML colors using Exodus CSS variables, line numbers, two-space Tab/Shift+Tab indentation, Enter indentation, undo/redo, search/replace, line wrapping, and slow symmetric mouse selection scrolling. No `basicSetup`, autocompletion UI, formatting or semantic validation. File APIs, drafts and save/restart behavior stay in `www/app.js`. Switching files resets undo history so another file's contents cannot be restored accidentally; draft text survives switching and navigation. Search uses CodeMirror's built-in panel, not a second UI framework.

## Build

From the repository root (Node.js and npm required on the development machine only):

```sh
npm ci --prefix tools/editor --ignore-scripts --no-audit --no-fund
npm run --prefix tools/editor build
```

Commit the source, lockfile and both generated assets:

- `asuswrt/opt/share/exodus/www/editor.js`
- `asuswrt/opt/share/exodus/www/editor.LICENSE.txt`

The build includes the full licenses of all bundled packages. CI rebuilds and checks the output. Update dependency versions intentionally, regenerate the lockfile, rebuild and retest.

Current build: **354978 bytes JS (346.7 KiB)**, **17339 bytes licenses (16.9 KiB)**; JS gzip level 9: **116689 bytes (114.0 KiB)**. HTTP compression is not assumed. Seven pinned direct browser-library dependencies; 15 packages actually contribute code to the bundle. esbuild is build-only. The autocomplete package is installed transitively by language support but its UI is not enabled or included in the bundle.

## Verify

```sh
node --test .github/tests/*.test.mjs
python3 -m unittest discover -s .github/tests -q
```

Optional real-browser checks using an externally installed Playwright (no project Playwright dependency):

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node .github/tests/editor.browser.mjs
```

Checks: Merlin palette, YAML spans, indentation, undo/redo, search, Ctrl+S, wrapping, file/draft switching, CRLF, late bundle loading/navigation, textarea fallback, and scrolling in both directions. Actual router, mobile, Safari/Firefox and 8 MiB interactive performance still need hardware/browser testing.
