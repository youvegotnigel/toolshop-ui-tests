---
name: fix-flaky-test
description: 'Root-cause and fix a flaky Toolshop UI test: reproduce it under repetition, find the race in the trace, and fix it with web-first waits, readiness, data isolation or page-object changes. Never with sleeps, retries or longer timeouts. Use when a test passes on retry or fails intermittently.'
---

# Fix a flaky test

## 1. Reproduce it on demand

`npx playwright test <file> --project=<browser> --repeat-each=10 --workers=3`. Add `--shuffle` and run
the whole suite if it only fails alongside others. No reproduction, no fix: collect more evidence first.

## 2. Find the race in the trace

Compare a failing and a passing trace (`npx playwright show-trace`): which action ran before the app was
ready, which request finished later than usual, which value changed under the test? Usual suspects here:

| Symptom                                      | Root cause                                                        | Fix                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Form wiped or button stays disabled          | A late patch (`GET /users/me`) or a lookup overwrote typed input  | Wait for the patched state (web-first `toHaveValue`), or order inputs so one lookup runs |
| Element "not visible" on one viewport        | Collapsed menu or filters on phones                               | A reveal method in the page object (no-op on desktop)                                    |
| Wrong count or order of results              | Shared data, server-side caching, default filters                 | Own data with a unique search word; respect the price filter (1 to 99)                   |
| Strict-mode violation sometimes              | Locator matches a toast, a duplicate `data-test` or a hidden copy | Scope the locator to its container or combine with `and()`                               |
| Passes alone, fails in parallel              | Shared account or module state; one test's cleanup hits another   | Data per test, `new-customer` for orders, no module variables                            |
| Assertion right after an action fails rarely | Non-retrying check (`isVisible()`, `textContent()` then expect)   | Web-first assertion on the locator, or `expect.poll`                                     |
| `Page crashed` on one browser                | Browser bug triggered by a specific API combination               | Isolate the call (see AGENTS.md Firefox note), report upstream                           |

## 3. Fix the cause, not the symptom

Forbidden: `waitForTimeout`, `networkidle`, bigger timeouts, `retries` in a spec, `test.fixme` to hide it,
weaker assertions. Fixes belong where the knowledge lives: readiness in `waitForReady()`, waits for app state in
the page object, data isolation in fixtures.

## 4. Prove it

Re-run step 1 (10 repeats, all browsers that flaked) and the full suite shuffled. Explain the race and the
evidence in the PR.
