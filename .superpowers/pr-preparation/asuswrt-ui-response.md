## Summary

Improve native Asuswrt-Merlin WebUI responsiveness without adding a router-side server or changing the frontend framework.

- Refresh only cache views affected by a command instead of rebuilding every view before returning its result.
- Publish fresh service status after service completion and use bounded one-second polling for 30 seconds after successful dispatch, then return to five-second polling.
- Reuse unchanged log content using small revision metadata; retain update-process liveness checks.
- Debounce full-document editor serialization by 250 ms and flush pending edits before save, download, navigation, reload, or file switching.
- Bound HTTP reads, including response-body reads, to 10 seconds and preserve queue, cancellation, logout, and uncertain-command-result handling without automatic mutation retries.
- Keep the submitted settings snapshot as the saved baseline so edits made while saving remain dirty.
- Run every Python, native Node, and discovered browser suite in CI. Pin test-only Playwright and Node, retain existing checks, and fail on missing dependencies or failed browser suites rather than skipping them.

## Scope

- Target: `prettyleaf/OpenWrt-exodus:asuswrt`, based on `020df5d9e37d6cfa3a8fb3b489ddb0837c825420`.
- Port only the UI/CI changes from `d7159bd4bd44bf040bc1a8852ebb3078a5cbdcc2`; preserve upstream test names and additional cases.
- Do not include the cache startup/shutdown fix already proposed in #5. Its patch applies cleanly on top of this branch; a combined runtime test was not performed.
- No installer changes, version downgrade, agent planning documents, test dependencies in the router payload, or unrelated line-ending changes.

## Verification

- [x] Python: `python3 -m unittest discover -s .github/tests -v` — 148 passed.
- [x] Node: `node --test .github/tests/*.test.mjs` — 45 passed; zero skipped.
- [x] Browser: `npm test --prefix .github/tests` — all four discovered suites passed: `editor-fallback`, `editor`, `native`, and `updates`.
- [x] Clean lockfile-based npm installs for the editor and browser tests.
- [x] Reproducible editor build: generated JavaScript and license file unchanged after rebuilding.
- [x] Shellcheck and JavaScript syntax.
- [x] Entware-compatible jq check, config/mixin validation, and version format.
- [x] Patch whitespace checks and preservation of upstream test files/Python cases.

Local browser verification used temporarily extracted Chromium libraries without changing host packages. CI installs Chromium with its system dependencies on the disposable Ubuntu runner. No physical router testing or measured hardware latency claims.
