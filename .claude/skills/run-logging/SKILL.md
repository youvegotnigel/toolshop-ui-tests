---
name: run-logging
description: 'Keep the CaseWORKS-style run log working as the framework grows: named loggers (createLogger), what to log and at which level, business-language test.step titles that read well as log lines, redaction, and changes to the run logger reporter (console + logs/automation_framework.log). Use when adding logging to fixtures, auth, API helpers or setup; when adding a spec or step; when changing src/reporting/run-log*.ts or src/utils/logger.ts; or when the console or log file looks wrong.'
---

# Run logging

The run logger (`src/reporting/run-logger.ts`) prints a short console (one block per test, a ✅/❌ line per
`test.step`, a one-line failure reason, a progress line after every final outcome, a summary with flaky and
failed lists) and writes `logs/automation_framework.log` with the same lines plus millisecond timestamps, the
source of each line and the full failure details. Jenkins archives the file; GitHub uploads it per shard.

## Critical

- **Log through a named logger, never `console.*`.** `const logger = createLogger('<ModuleName>')` at module
  level, after the imports; the name is the class or module (`AuthSession`, `DataFixtures`), at most 22
  characters (the file's source column). `console.log` in tests or framework code is a lint error and lands
  in the log as anonymous `stdout`.
- **Never log a secret.** No passwords, tokens, cookies, `Authorization` headers or whole request/response
  bodies. Log ids, statuses, counts and durations. The logger and the reporter redact JWTs and secret env
  values, and debug action lines mask what is typed into password, token, CVV and card-number fields
  (`SENSITIVE_FIELD` in `run-log-format.ts`): a new sensitive field whose name does not match gets added there.
  These are a safety net, not a licence.
- **Levels mean something.** `info`: a fact a reader of the run needs (customer registered, record kept after
  a 409, Toolshop version). `warn`: something went wrong but the test goes on (cleanup refused). `error`:
  only next to a failure. `debug`: high-volume detail (every API call), seen only with `LOG_FILE_LEVEL=debug`.
- **Steps are the log.** Every `test.step` title becomes a console line: business language, past or present
  tense, no ids or per-run values (`They pay by card and see the order confirmation`, not
  `click finish 0193...`). Keep steps flat (`playwright/no-nested-step`); nesting is indented if it happens.
- **Failures explain themselves in one line.** Prefer `expect(value, 'what it means').toBe(...)` messages and
  web-first assertions: their first line plus the `Locator:` line is the console reason.
- **Do not print from the reporter outside `RunLogSink`.** It is the only writer of the console and the file,
  so it alone redacts, strips ANSI codes, filters per level and keeps parallel blocks apart.
- **Do not break the protocol.** Workers print `␞runlog␞{json}` records; `formatRecord` and `parseRecord` in
  `src/utils/logger.ts` change together, and `npm run test:reporting` must stay green.
- **Never relax ESLint to fit.** `complexity` 10 and `max-lines` 300 apply: split helpers into
  `run-log-format.ts` (pure, unit tested) or `run-log-events.ts` instead.

## Procedure

1. **New module that logs** (fixture, client helper, setup/teardown): add
   `const logger = createLogger('<Name>')`, log outcomes not progress, run the affected spec and read both the
   console block and `logs/automation_framework.log`.
2. **New spec or step**: write 2 to 6 flat business steps (`add-ui-test`); run it once with
   `--project=chromium --workers=1` (live mode) and check every step line reads as a sentence.
3. **Changing the format or the reporter**:
   1. Read `references/format.md` (the contract: widths, lines, counts, buffering).
   2. Put pure logic in `src/reporting/run-log-format.ts` with a test in `run-log-format.test.mts` first.
   3. `npm run typecheck && npm run lint && npm run test:reporting`.
   4. Prove it on real runs: one worker (live), default workers (buffered blocks do not interleave),
      a temporary failing assertion inside a step and outside one, `--retries=1` with a step that fails only on
      attempt 1, and `CI=true ... | cat` (no ANSI codes). Revert every temporary change and show `git diff --stat`.
4. **Something looks wrong in the log**: `LOG_FILE_LEVEL=debug` adds every API call and every `expect` /
   `pw:api` step to the file; `LOG_STREAM=1` streams lines live; `--reporter=list` gives Playwright's stock
   console for comparison. The full error, code frame, stack, correlation id and evidence paths of each
   failed attempt are in the file under `Error details for failed test`.

## References

- `references/format.md`: console and file layouts, line catalogue, counting rules, env vars, files.
