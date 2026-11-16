# Upstream PR Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update our branch and prepare two independent, minimal upstream PR branches.

**Architecture:** Both PR branches start at `origin/asuswrt` (`16ffddd`), never at `asuswrt-native`. Use existing toast CSS and Dashboard selector/core mechanisms, without changing unrelated behavior.

**Tech Stack:** CSS, vanilla JavaScript, Node test runner, Playwright, Python unittest, POSIX shell.

**Spec:** `docs/superpowers/specs/2026-11-16-upstream-prs-design.md`

## Global Constraints

- Preserve unpublished native changes and the existing Zashboard default.
- No embedded Dashboard tab, default migration, changelog UI or new dependencies.
- MIBoard URL: `https://github.com/blagodaren/miboard/releases/latest/download/dist.zip`.
- Sign task commits as `IKitKatt <20ni0ki0ta02@gmail.com>` using command-local configuration.

## Review Focus

- Long toast messages must wrap without pushing the icon or close button outside the viewport.
- Keyboard dismissal and en/ru accessibility labels must still work.
- Selecting MIBoard must persist its exact URL through the existing settings draft.
- Existing/default/custom Dashboard choices must remain unchanged.
- Opening MIBoard must preserve the current API host, port, secret and HTTPS behavior.

## Task 1: Upstream merge

- [x] Fetch remotes and inspect the incoming diff and local popup history.
- [x] Merge `origin/asuswrt` into `asuswrt-native`; create both PR branches at `16ffddd`.
- [x] Verify shell/JavaScript syntax, Node tests and available Python/browser suites; record limits.

## Task 2: Popup PR

**Files:** `asuswrt/opt/share/exodus/www/style.css`, `.github/tests/toasts.browser.mjs`.

- [x] Switch to `fix/asuswrt-popup-layout` and port the regression test from `ac36a25` first.
- [x] Run `node .github/tests/toasts.browser.mjs`; confirm it fails against upstream CSS for centering.
- [x] Apply only the CSS change from `ac36a25`, adapting to current upstream if necessary.
- [x] Rerun the browser test and Node suites; inspect `git diff origin/asuswrt` for unrelated changes.
- [x] Commit the focused fix and prepare an English PR body.

## Task 3: MIBoard PR and native integration

**Files:** `asuswrt/opt/share/exodus/www/app.js`, `.github/tests/dashboard.browser.mjs`.

**Interfaces:** existing `DASHBOARDS`, `pageSettings()`, `ref('mixin.ui_url')`, `openDashboard()` and config-save API remain unchanged.

- [x] Switch to `feat/asuswrt-miboard`; add a browser regression for selecting MIBoard, saving its URL, preserving existing/custom/default choices and opening the configured API URL.
- [x] Run `node .github/tests/dashboard.browser.mjs`; confirm it fails because MIBoard is absent.
- [x] Add the exact MIBoard URL/name pair to `DASHBOARDS` without changing config defaults or routing.
- [x] Rerun the focused/browser/Node suites and inspect `git diff origin/asuswrt`.
- [x] Commit the focused feature and prepare an English PR body referencing the upstream source commits.
- [x] Merge the feature branch into `asuswrt-native`, retain planning documents only on our native branch, and run final checks.
- [x] Record merge/PR branch commit IDs, verification evidence, publication status and hardware limits below.

## Results

- Upstream merge: `cdb059e` (1.30.4, `16ffddd`); native feature integration: `27f073e`.
- Popup PR: `0a87cf1`; Dashboard PR: `a019384`. Each has exactly one commit with parent `16ffddd`.
- Test-first failures reproduced: popup icon not vertically centered; Dashboard selector missing MIBoard.
- Both independent branches: 45 Node tests and all five browser suites passed.
- Full Python suite passed on the Dashboard commit snapshot: 160 tests.
- Integrated native branch: 55 Node tests, all eight browser suites and 160 Python tests passed.
- Shell syntax, shellcheck, JavaScript syntax, jq mixin and diff whitespace checks passed.
- Python checks ran from byte-equivalent `git archive` snapshots under `/tmp` to avoid slow NTFS copies.
- Chromium dependencies were unpacked into `/tmp/exodus-browser-libs` and supplied with `LD_LIBRARY_PATH`; no sudo or system package installation.
- Independent read-only review of immutable commit snapshots found no actionable issues in either branch.
- Latest-release URL followed to MIBoard `v0.1.10/dist.zip`, HTTP 200.
- PR bodies: `.superpowers/pr-preparation/asuswrt-popup-layout.md` and `.superpowers/pr-preparation/asuswrt-miboard.md` (local ignored artifacts).
- Branches and commits remain local; nothing pushed and no PR opened. Existing worktrees untouched.
- Not tested: real router installation or an actual MIBoard connection to a running Mihomo core. No editor bundle rebuild: generated bundle and dependencies are unchanged.
