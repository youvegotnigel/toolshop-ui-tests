---
name: triage-ui-failures
description: 'Triage failed Toolshop UI test runs from failure-summary.json, traces, screenshots, videos, axe reports and api-calls.json; classify each failure as product bug, test bug, test data, flaky or environment and propose the fix. Use after a red local or CI run.'
---

# Triage UI failures

## 1. Collect evidence

1. `test-results/failure-summary.json`: test, browser, the **failed step**, attempt, first error line,
   correlation id and the evidence files. From CI, download the `failures-<browser>-<run id>` artifact or the
   `site-<run id>` artifact (merged report), e.g. `gh run download <run id>`.
2. Per failure, in `test-results/artifacts/<test>-<browser>/`:
   - `trace.zip`: `npx playwright show-trace <path>`: the action log, DOM snapshots, network and console.
   - `test-failed-1.png`, `video.webm`, `error-context.md` (page snapshot as an accessibility tree).
   - `api-calls.json`: the test data setup (redacted), with status and response bodies.
   - `axe-page-*.json` for a11y steps.
3. Did it fail on every attempt and browser, or only some (flaky)? Did other tests on the same page fail?

## 2. Reproduce

1. `npx playwright test <file> -g "<title>" --project=<browser> --repeat-each=3`
2. `npx playwright test <file> --headed --project=chromium` to watch it.
3. `TEST_ENV=with-bugs` red but `public` green: a seeded defect, not a regression.

## 3. Classify

| Class       | Typical evidence                                                                                                         | Action                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Product bug | The site contradicts the journey or a documented rule, reproducible on every browser; new serious axe finding            | Open a `bug` issue with trace, screenshot and steps; keep asserting the correct behaviour (a11y: baseline entry with element targets) |
| Test bug    | Strict-mode violation, wrong locator, wrong expected value, missing cleanup, a race with the app (profile patch, lookup) | Fix the test or page object; prove with `--repeat-each=3 --shuffle` on all browsers                                                   |
| Test data   | Setup step failed (`test data setup:` in the error), 404/409 on data the test did not create                             | Make the test create its own data through fixtures                                                                                    |
| Flaky       | Passes on retry, timing-dependent, one browser only                                                                      | Use the `fix-flaky-test` skill. Never add sleeps or retries                                                                           |
| Environment | 5xx, `unhealthy`, `net::ERR`, HTTP 423, `Page crashed`, a run crossing the hourly database reset                         | Re-run and report the outage; never weaken assertions                                                                                 |

## 4. Report

One section per failure: test and browser, failed step, class, evidence (status, error line, trace moment,
correlation id), root cause, proposed fix or bug report. Never change an expected value only to make a test green.
