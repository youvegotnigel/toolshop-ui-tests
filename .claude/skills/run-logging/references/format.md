# Run log format (the contract)

Modelled on the CaseWORKS QA automation framework (Selenide + Cucumber + log4j2): a `test()` per project is
a scenario, a `test.step` is a Gherkin step, the run logger reporter plays the TestNG listener and the
Cucumber hooks.

## Files

| File                                    | Role                                                                 |
| --------------------------------------- | -------------------------------------------------------------------- |
| `src/utils/logger.ts`                   | `createLogger`, levels, redaction, the worker record protocol        |
| `src/reporting/run-logger.ts`           | the reporter: Playwright events to lines                             |
| `src/reporting/run-log-events.ts`       | Playwright-aware helpers: names, verdicts, failure details           |
| `src/reporting/run-log-format.ts`       | pure formatting (prefixes, reasons, durations, counts), unit tested  |
| `src/reporting/run-log-sink.ts`         | the only writer: console + file, levels, buffering, redaction        |
| `src/reporting/run-log-file.ts`         | `logs/automation_framework.log`: daily / 20 MB rolling, sync appends |
| `src/reporting/run-log-format.test.mts` | `npm run test:reporting` (part of `npm run verify`)                  |

## Layouts

- Console: `HH:mm:ss LEVEL message`; the prefix is 15 characters, continuation lines are indented 15 spaces.
- File: `yyyy-MM-dd HH:mm:ss.SSS | LEVEL | <source, 22 wide> | message`; 59 characters, continuation lines
  indented 59 spaces. Local time, like CaseWORKS.
- No ANSI codes anywhere; no stack traces on the console (except `onError`: at most 3 frames).

## Lines

| Event                    | Line                                                                                                                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run start                | `===== Test run started: 18 tests (+2 setup/teardown) \| projects \| workers \| retries \| TEST_ENV \| RUN_ID [\| BUILD_NUMBER] =====`                                                                                                 |
| Setup / teardown         | `⚙ Setup: <file> › <title>` ... `⚙ Setup passed: ... (1.8s)` or `❌ Setup FAILED: ... -> reason`                                                                                                                                       |
| Setup failed             | `❌ Run aborted before any test started: <reason>`, later one `⏭ N tests not run because setup failed`                                                                                                                                 |
| Test start / retry       | `▶ Test n/total [project]: <describe › title>` / `🔁 Test n/total [project] – attempt k/m: ...`                                                                                                                                        |
| `test.step`              | `   ✅ <title> (2.1s)`, `   ❌ <title> (10.2s) -> <reason>` (reason on the innermost failed step only), `   ⏭ <title> (skipped)`; 3 more spaces per nesting level                                                                      |
| `hook` / `fixture` step  | only when it fails: `   ❌ Hook failed: <title> -> <reason>`                                                                                                                                                                           |
| `expect` / `pw:api` step | DEBUG: the action, its element and values (`Fill getByTestId('email') value="..."`, `Click ...`, `Select option ... options=[...]`, `Expect "toHaveText" ... expected=...`); password, token, CVV and card-number values show as `***` |
| Worker logger line       | at its own level and source, inside the block of its test, no extra indent                                                                                                                                                             |
| Plain `console.log`      | INFO (`stdout`), stderr as WARN                                                                                                                                                                                                        |
| Test end                 | `✅ Test PASSED`, `⚠ Test FLAKY – passed on attempt 2/2`, `❌ Test FAILED` (reason here when no step showed it), `❌ Test TIMED OUT -> reason`, `⏹ Test INTERRUPTED`, `⏭ Test SKIPPED -> reason`                                       |
| Will retry               | `   ↻ Will retry (attempt 2/2)`                                                                                                                                                                                                        |
| Failed attempt (file)    | `Error details for failed test '<name>' (attempt n/m, correlation id <id>)`, every error in full, snippet, filtered stack, `Evidence:` paths                                                                                           |
| After a final outcome    | `---------- Test Suite Execution Status: 3/18 (16%) Completed \| ✅ 3 passed \| ⚠ 0 flaky \| ❌ 0 failed ----------`                                                                                                                   |
| Run end                  | `===== Results: 15 passed, 1 flaky, 1 failed, 1 skipped (1m 38s) =====`, `Flaky tests:` / `Failed tests:` lists with `(file:line)`, `Run status: <status>` when not passed, the pointer line                                           |

The reason is the first non-empty line of the error without ANSI codes or `Error: `, plus ` | Locator: ...`
when Playwright reports one, cut at 300 characters.

## Counting

- A test is one `test()` per project; setup and teardown projects are counted apart.
- Final outcome per test, whatever the attempts: `passed + flaky + failed + skipped + interrupted + not run =
tests in the run`. `test.fail()` that fails counts as passed. A failed attempt that will be retried is not
  completed. `⚠ flaky` shows only when retries are on.

## Buffering

Lines of an attempt are buffered and printed as one block when it ends, with the real time of each event, so
parallel workers never interleave. One worker (`--workers=1`, `--headed`) streams live. `LOG_STREAM=1` forces
live, `LOG_STREAM=0` forces buffering. Run-level lines are never buffered; blocks still open at the end
(Ctrl+C, global timeout, crashed worker) are flushed with `(incomplete: the attempt never finished)`.

## Environment

| Variable         | Default | Effect                                                                                            |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL`      | `info`  | console level; `debug` also shows every action line on the console                                |
| `LOG_FILE_LEVEL` | `info`  | file level; `debug` adds every API call and every action and assertion with its element and value |
| `LOG_STREAM`     | auto    | `1` live, `0` buffered; auto = live only with one worker                                          |

`RUN_LOGGER_ACTIVE=1` is set by the reporter for its workers; outside it (scripts, `--reporter=list`) the
logger prints readable `HH:mm:ss LEVEL [source] message` lines instead of records.
