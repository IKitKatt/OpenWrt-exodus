# Update feedback and Editor fixes

**Goal:** Make update activity observable, avoid blocking WebUI commands on GitHub checks, and enlarge and slow Editor selection scrolling. YAML highlighting is research only.

**Approved scope:** Chat approval: fixes without new project dependencies; compare YAML editors separately. Work directly in the existing workspace; preserve pre-existing changes.

**Architecture:** Keep the native Merlin transport and RAM caches. Forced version checks run in the existing background worker. Update logs carry process liveness; the Updates page resumes polling on entry and distinguishes success, failure and interruption. Keep the textarea and control mouse-selection scrolling locally.

**Constraints:** POSIX shell/BusyBox; Entware jq has no regex; no runtime dependencies or CDN; preserve installer locking and rollback, drafts, wrap and save behavior.

## Tasks
- [x] Add failing shell tests for forced checks returning without network waits, update process liveness, and launch failure reporting.
- [x] Fix backend/background check integration and cached update liveness. Keep install serialization.
- [x] Add failing JS/browser checks for update terminal states, polling and symmetric selection scrolling.
- [x] Fix Updates feedback and Editor height/scrolling; add Russian translations.
- [x] Measure locally bundled YAML editor options in /tmp, recording versions and raw/gzip sizes.
- [x] Run all shell and Node tests, syntax checks and shellcheck; review diff and report hardware/browser limits.

## Verification

- Python: 132 tests passed (253.5 seconds; initial 180-second command timeout was insufficient).
- Node: 23 tests passed; syntax checks passed.
- Chromium browser smoke: selection scrolling with/without wrap, mouseup and keyboard input; update launch, stale previous log, page re-entry, failure, success, interruption and background checking passed.
- Shellcheck: 10 scripts passed using LF-normalized stdin. Direct workspace check is blocked by pre-existing CRLF files; these unrelated files were not changed.
- Dependency measurements and recommendation: `docs/editor-yaml-options.md`.
- Not verified on physical ASUS hardware, Safari/Firefox or mobile browsers.

## Review focus
- Old success logs must not finish a newly requested update.
- Leaving/returning to Updates must resume observing a running installer.
- Failed or crashed installers must not show success or spin forever.
- Forced GitHub checks must not hold the browser mutation queue.
- Selection scrolling must stop on mouse release, blur and page removal, and remain symmetric with wrap enabled.
