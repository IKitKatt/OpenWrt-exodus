# PR: fix(asuswrt): center popup notification contents

Repository: prettyleaf/OpenWrt-exodus
Base: asuswrt (16ffddd, 1.30.4)
Head: IKitKatt:fix/asuswrt-popup-layout (0a87cf1)
Status: local branch prepared; not pushed, PR not opened.

## Summary

- Vertically center toast icons, message text and close buttons.
- Remove the conflicting icon/close-button offsets while preserving wrapping and the full close-button hit area.
- Port the popup fix from our native branch (`ac36a25`) independently onto current upstream, without unrelated native changes.

## Regression coverage

The browser test uses the real toast renderer and request success/error handling. It checks save success, request errors, short/long messages and links, plus keyboard dismissal. Each scenario runs in English and Russian at 1280, 768 and 375px widths.

The new test fails against unchanged upstream with `en/1280/save: icon must be vertically centered` and passes with the fix.

## Validation

- `node --test .github/tests/*.test.mjs`: 45 passed.
- `npm test --prefix .github/tests`: all five discovered browser suites passed.
- `git diff --check origin/asuswrt...fix/asuswrt-popup-layout`: passed.
- Independent read-only review: no actionable findings.
- Not tested on router hardware.

## Publication commands (not executed)

```sh
git push asuswrt-native fix/asuswrt-popup-layout
```

Create a PR against `prettyleaf/OpenWrt-exodus:asuswrt`, not `main` or `asuswrt-native`.
