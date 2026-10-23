# UI Response and Complete CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement approved option A, complete automated CI coverage, and the settings-save race fix.

**Architecture:** Retain the existing RAM cache, serialized native Merlin transport and browser UI. Make cache publication selective, reuse unchanged log bodies, bound HTTP reads, and debounce editor serialization with explicit flush boundaries. CI runs the existing suites plus regressions.

**Tech Stack:** POSIX shell, jq, plain browser JavaScript, CodeMirror, Python unittest, Node test, Playwright/Chromium, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-23-ui-response-design.md`

## Global Constraints

- Preserve native firmware authorization, addon-setting snapshots, mutation serialization, cache recovery and freshness validation.
- No parallel native form submissions; no new upload protocol or packet-size changes.
- No new router runtime dependency; test-only packages must not enter the router payload.
- Preserve existing uncommitted work. Work inline in the current copy; no commits or deployment.
- Generated editor bundle must match a clean rebuild from the lockfile.

## Review Focus

- A stalled response body must release a queued mutation, not merely cancel a network signal (Task 1).
- A cache without log revisions must remain readable; first-load/recovery cannot reuse an unvalidated body (Task 2).
- Background service launch is not service completion; status must be published even after an operation fails (Task 3).
- Immediate save/navigation during the editor debounce must not lose the last character, CRLF, or edits made during saving (Task 4).
- A newly added browser suite must run automatically, and browser test failures must fail CI (Task 5).

## Task 1: Bound reads and preserve the submitted settings baseline

**Files:** `asuswrt/opt/share/exodus/www/merlin.js`, `asuswrt/opt/share/exodus/www/app.js`, `.github/tests/merlin.test.mjs`, `.github/tests/app.test.mjs`, `.github/tests/ui.browser.mjs`.

**Interfaces:** `get(url, timing)` returns decoded JSON or rejects; `createTransport(options)` gains an injectable HTTP timeout with a 10,000 ms default. `save(apply)` snapshots the draft before sending it and stores that exact snapshot only after success.

- [x] Add Node regressions for stalled fetch, stalled body, later queued command, disposal and session cancellation; use a short injected timeout, not real ten-second sleeps.
- [x] Add settings-save regression asserting that a second edit during an outstanding request stays dirty and a failed save does not advance the baseline.
- [x] Run `node --test .github/tests/*.test.mjs`; confirm new failures before implementation.
- [x] Add per-read controller, timer and promise rejection covering fetch plus body, with parent cancellation cleanup. Do not turn ambiguous HTTP timeouts into automatic mutation retries.
- [x] Snapshot submitted settings and retain later edits; add the real-browser version of the regression to `ui.browser.mjs`.
- [x] Re-run Node suites and the browser suite once Task 5 provides the pinned runner.

## Task 2: Selective cache publication and unchanged-log reuse

**Files:** `asuswrt/opt/share/exodus/lib/webui-api.sh`, `asuswrt/opt/share/exodus/www/merlin.js`, `.github/tests/test_webui_bridge.py`, `.github/tests/merlin.test.mjs`.

**Interfaces:** `webui_cache_views_refresh [key ...]` retains the full default but can refresh selected views. A mutation-refresh helper maps successful actions to affected views/logs. Heartbeat adds `logs: {"log-app": revision, ...}`; log envelopes carry the corresponding content revision. Missing metadata falls back to the existing full-log read.

- [x] Add Python regressions tracing API calls: log clear refreshes only its log; config save refreshes load; profile changes refresh load/files; failed operations do not refresh everything; full initialization still works.
- [x] Add Node regressions counting full log downloads for unchanged, changed and absent revisions, stale heartbeat, and update-log running/id changes.
- [x] Run Python and Node suites and confirm new regressions fail.
- [x] Generalize existing refresh functions without duplicating encoders; atomically publish content-hash revisions with cache files and collect revisions in heartbeat.
- [x] Keep at most one decoded body per supported log in the transport; validate heartbeat freshness before reusing it, fetch on changed/missing revision, and clear held data on transport/session teardown.
- [x] Run both suites and verify no added writes to JFFS during cache reads/refresh.

## Task 3: Publish completed service status and bounded fast polling

**Files:** `asuswrt/opt/share/exodus/lib/api.sh`, `asuswrt/opt/share/exodus/lib/webui-api.sh`, `asuswrt/opt/share/exodus/exodus`, `asuswrt/opt/share/exodus/www/app.js`, `.github/tests/test_api.py`, `.github/tests/test_webui_bridge.py`, `.github/tests/app.test.mjs`.

**Interfaces:** A `web service <operation>` CLI wrapper runs the allowed operation and publishes status afterwards, preserving its exit status. API service actions and config apply use this wrapper. UI requests status once per second for at most 30 seconds after a start/stop/restart, with at most one request in flight, then returns to the existing five-second interval.

- [x] Add shell regressions with an observable fake operation: status publication happens after operation completion, includes failure state, and does not rebuild unrelated views.
- [x] Add UI tests with controlled clocks/requests for temporary fast polling, overlapping requests, repeated actions, expiry and session teardown.
- [x] Run targeted suites and confirm failures before implementation.
- [x] Implement the validated background wrapper and a status-only refresh path that does not wait for full view rebuilding.
- [x] Replace scattered post-operation timers with one bounded fast-poll mechanism; clean it up with existing session/page lifecycle hooks.
- [x] Run Python/Node suites and shellcheck.

## Task 4: Debounce editor serialization with lossless flushes

**Files:** `tools/editor/editor.js`, `asuswrt/opt/share/exodus/www/app.js`, generated `asuswrt/opt/share/exodus/www/editor.js`, `.github/tests/editor.browser.mjs`.

**Interfaces:** Editor mount gains an immediate `onEdit` notification and `flush()`; full `onChange(content)` serialization happens after 250 ms idle or an explicit flush. `destroy()` flushes synchronously. Pending editor edits count as unsaved before the debounce fires.

- [x] Extend browser regressions to count hidden-textarea writes during a typing burst and verify immediate save, immediate file switch, navigation/unmount, reload confirmation, undo, CRLF and delayed editor loading.
- [x] Run editor browser tests and confirm the new performance assertion fails on current code.
- [x] Debounce document serialization, remove hidden-textarea mirroring while CodeMirror is active, and flush at save/download/file-switch/reload/teardown boundaries.
- [x] Keep fallback textarea behavior and draft persistence; cancel pending timers on destroy and refresh unsaved status after flush.
- [x] Rebuild with `npm run --prefix tools/editor build`, run all browser suites, and verify rebuild reproducibility.

## Task 5: Pinned browser runner and all-tests CI

**Files:** `.github/tests/package.json`, `.github/tests/package-lock.json`, `.github/tests/README.md`, `.github/workflows/check.yml`; browser-suite comments as needed.

**Interfaces:** A test-only locked Playwright dependency in `.github/tests`; `npm test --prefix .github/tests` runs all `*.browser.mjs` in a deterministic discovered order and exits nonzero on any failure. This runner lives outside the router payload.

- [x] Add a minimal Node runner check proving browser suite discovery includes every present `*.browser.mjs` and propagates failure; use no new test framework.
- [x] Install pinned Playwright, lock dependencies, and install Chromium plus required host libraries. Consult current Playwright docs before choosing CLI/API syntax.
- [x] Add the browser step with a job timeout and pinned Node setup to the existing workflow; retain every current shell/Python/Node/config/build check and do not add skip-on-missing-browser behavior.
- [x] Document local Python, Node, browser, shellcheck and reproducible-build commands. Browser tests remain separate from native Node unit-test discovery.
- [x] Run every suite and CI check locally; record exact counts, any environment limitation and generated-bundle reproducibility.

## Completion

- [x] Inspect the complete diff for scope creep, stale tests, timer/listener leaks, cache race cases, lost drafts and accidentally included packages.
- [x] Verify all original unrelated working-tree changes remain intact.
- [x] Report tested outcomes and limitations without claiming hardware latency measurements.

## Integrated verification — 2026-10-23

All five implementation tasks and their task reviews are complete. Final integrated
review remains a separate required gate. See
`.superpowers/sdd/2026-10-23-ui-response/progress.md` for commands and evidence.

- Python: 147/147; native Node: 44/44; all three discovered browser suites pass,
  including three consecutive repeat runs after deterministic fixture fixes.
- Clean test/editor npm installs pass. The rebuilt editor bundle and license are
  byte-identical to their pre-rebuild hashes. Test packages remain outside the
  router payload.
- Exact local shellcheck, mixin and version checks remain blocked by preserved
  baseline CRLF; the same commands pass on LF-only scratch copies. The HEAD
  bundle-diff check necessarily reports intentional uncommitted Task 4 output.
  CI checks are not weakened; these are not claimed as exact working-copy passes.
- Browser fixtures now gate native response publication on the first missing-index
  observation, explicitly release delayed editor loading after the action under
  test, and await draft serialization instead of sleeping. Behavioral assertions
  are unchanged. No router hardware latency measurements were performed.
