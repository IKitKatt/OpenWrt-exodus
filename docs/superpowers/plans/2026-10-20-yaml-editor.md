# Minimal YAML Editor

Approved: CodeMirror 6; match existing Merlin/Exodus colors (chat). No IDE, formatter, autocompletion, CDN or router-side build/runtime dependencies.

Architecture: one locally bundled editor.js, loaded on Editor only; thin textarea bridge preserves existing file/draft/save handlers. Mount takes current textarea state after asynchronous loading. Destroy on page navigation; failed bundle load leaves textarea usable. Scope CSS to Exodus and reuse its palette variables. Keep slow symmetric selection scrolling.

Tasks:
- [x] Add failing browser checks for real YAML editing, keyboard indentation/undo, search, draft/file switching, saving, wrap, late load and fallback.
- [x] Pin build-only dependencies under tools/editor, generate committed bundle and dependency licenses.
- [x] Implement minimal editor and lazy integration; publish assets with native web UI.
- [x] Verify browser tests, Node tests, shell lifecycle tests, syntax and reproducible build. Record exact final size and hardware limits.

Results: Chromium tests passed for YAML palette/highlighting, Tab, undo/redo, search, Ctrl+S, wrapping, drafts, CRLF, lazy mount/fallback and navigation cleanup. CodeMirror selection scrolling measured 91 px/s in both directions with and without wrapping. Existing browser smoke passed too. Python: 134 tests passed (261.4 s); Node: 23 tests passed; JS syntax passed. Fresh npm ci/build reproduced both assets byte-for-byte; npm audit --omit=dev: zero vulnerabilities. Final bundle 354978 bytes plus 17339 bytes full dependency licenses. Actual ASUS hardware, mobile, Safari/Firefox and interactive 8 MiB performance were not tested.

Review focus: no stale async load overwrites drafts; disabled while file loading; no undo leaking content from another file; no save shortcut intercepted; preserve CRLF; accessible search; CSS must not inherit firmware text wrapping; selection speed stays symmetric; leaving Editor frees CodeMirror DOM observers/listeners.
