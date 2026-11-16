# PR: feat(asuswrt): offer MIBoard as a dashboard option

Repository: prettyleaf/OpenWrt-exodus
Base: asuswrt (16ffddd, 1.30.4)
Head: IKitKatt:feat/asuswrt-miboard (a019384)
Status: local branch prepared; not pushed, PR not opened.

## Summary

- Add MIBoard to the existing Dashboard panel selector using `https://github.com/blagodaren/miboard/releases/latest/download/dist.zip`.
- Reuse existing configuration persistence, Mihomo external-ui download/update and Dashboard-opening flows.
- Keep Zashboard as the default; preserve other panels, custom URLs and the From profile choice.

This intentionally ports only the new panel option. It does not change defaults, migrate user settings, embed the Dashboard in a tab, add hideMode handling or introduce version/changelog UI.

## Upstream references

The new panel appeared in the upstream Keenetic and Mikrotik ports in `c5ab180` and `d5c6bf4` (1.30.1). This PR uses the current latest-release archive URL from `37b49b3` and `9863f57` (1.30.3), not the earlier pinned alpha release.

Other upstream changes investigated but deliberately not included: panel versions on Updates (`bfb8253` / `d9e20f2`), hideMode and pinned-URL migration (`37b49b3` / `9863f57`), version lookup through gh-proxy (`8cfaa64` / `33c6338`).

## Regression coverage

- Real Settings selector offers MIBoard and marks its selection dirty.
- Save submits and retains the exact new archive URL without changing other config fields.
- Existing/default/custom/profile selections are retained without migration.
- HTTP and HTTPS Dashboard links retain the API host, port, encoded secret, setup query and noopener.

The new test fails on unchanged upstream because MIBoard is absent, and passes after the one-line addition.

## Validation

- `node --check asuswrt/opt/share/exodus/www/app.js`: passed.
- `node --test .github/tests/*.test.mjs`: 45 passed.
- `npm test --prefix .github/tests`: all five discovered browser suites passed.
- `python3 -m unittest discover -s .github/tests -v`: 160 passed on an immutable commit snapshot.
- Shell syntax, shellcheck, jq mixin and diff whitespace checks: passed.
- Latest-release URL follows to `v0.1.10/dist.zip`, HTTP 200 (checked 2026-11-16).
- Independent read-only review: no actionable findings.
- Not tested on router hardware or against a running Mihomo API; browser coverage verifies link construction, not an actual MIBoard connection.

## Publication commands (not executed)

```sh
git push asuswrt-native feat/asuswrt-miboard
```

Create a PR against `prettyleaf/OpenWrt-exodus:asuswrt`, not `main` or `asuswrt-native`.
