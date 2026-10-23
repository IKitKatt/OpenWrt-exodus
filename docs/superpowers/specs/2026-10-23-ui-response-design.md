# Faster UI actions and complete CI coverage

## Intent and scope

Implement option A selected after the audit: reduce UI response delays without replacing the native Merlin transport. Run every existing automated test in CI, including the three browser suites. Preserve the current working tree and unrelated local changes. The user approved this design and the related settings-save snapshot fix on 2026-10-23.

## Approaches

- **A — selected by the user:** targeted cache refresh, prompt service status, unchanged-log reuse, cheaper editor updates, bounded HTTP requests. Small changes within the existing architecture.
- **B — not selected:** compress and optimize multi-packet uploads. This addresses large files, not ordinary action latency.
- **C — not selected:** introduce a separate large-file transport. Larger integration and security surface; unnecessary for the selected scope.

## Proposed behavior

1. **Targeted cache refresh.** After a successful mutation, refresh only affected views/logs; retain full initialization and periodic refresh for CLI/external changes. Failed mutations do not trigger a full rebuild. Clearing a log must not run host discovery or version collection.
2. **Prompt status.** Publish status at actual service-operation completion, not merely after launching a background process. During a user-triggered start/stop/restart, temporarily poll status more frequently, with a bounded lifetime, no overlapping requests, and normal five-second polling afterwards. Preserve service-operation semantics and session handling.
3. **Unchanged logs.** Publish a small log-revision index with the cache heartbeat. The transport checks a revision before downloading an already-held log and reuses its decoded body when unchanged. Preserve freshness checks, first load, rotation/truncation, clear, update-log running/id transitions, and compatibility with caches without revision metadata. No new HTTP server or persistent browser storage.
4. **Editor.** Avoid serializing the whole CodeMirror document and assigning the hidden textarea on every keystroke. Keep an editor document snapshot cheaply and serialize at explicit boundaries: save, download, file switch, editor teardown/navigation, and delayed draft synchronization. Preserve CRLF, undo isolation, fallback textarea, late editor loading, and unsaved-change warnings.
5. **HTTP deadlines.** Bound both fetch and response-body consumption using cancellation and a timer; cancellation must free the queue even if a promise never settles. Keep dispose/session-expiration behavior and do not silently repeat a mutation after an ambiguous failure. Deadline values are implementation choices and must be explicit and tested.
6. **CI.** Keep all existing shell, syntax, jq, version, reproducible-bundle, Python and Node checks. Install a pinned Playwright development dependency and Chromium in CI; discover and execute every `*.browser.mjs` suite rather than listing three paths. Browser failures must fail CI, not skip silently. Test-only packages must not enter the router payload. Document the local full-test command.

## Related audit issue — approved addition

The user approved fixing audit point 2 alongside point 11. Snapshot the submitted settings before calling the API, retain that snapshot as the saved baseline after success, and leave later edits dirty. Add a real browser regression for editing settings while the save response is pending.

## Constraints and non-goals

- Existing POSIX shell/jq and plain JavaScript/CodeMirror architecture; no new router runtime dependency.
- Preserve native firmware authorization, addon-setting snapshots, mutation serialization, cache recovery and freshness validation.
- No parallel native form submissions; no new upload protocol or packet-size changes.
- No unrelated audit fixes, frontend redesign, commits, deployment, or changes to unrelated working-tree edits.
- Generated editor bundle must match a clean rebuild from the lockfile.

## Acceptance checks

- Tests prove which cache actions a mutation refreshes and that unrelated expensive actions do not run.
- Tests prove actual service completion publishes status and temporary fast polling stops or times out cleanly.
- Repeated reads of unchanged logs do not download their full bodies; changed, cleared and rotated logs still update.
- Browser tests cover editor input, immediate save/file switch/navigation, draft retention, fallback and delayed loading.
- A stalled fetch or body read rejects within its deadline; a later queued command still works; dispose and expired sessions abort pending work.
- Every existing Python, Node and browser suite runs successfully, plus shellcheck, syntax/config checks and reproducible editor build.
- Hardware latency gains remain unclaimed until measured on a router; automated tests verify avoided work and polling behavior.
