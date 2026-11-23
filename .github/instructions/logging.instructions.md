---
applyTo: 'src/**/*.ts,tests/**/*.ts'
---

Logging follows AGENTS.md "Logging" and the `run-logging` skill (`.claude/skills/run-logging/SKILL.md`). In short:

- Log through a named logger: `const logger = createLogger('<ModuleName>')` from `src/utils/logger`, never `console.*`.
- Never log secrets (passwords, tokens, cookies, Authorization headers, whole bodies); log ids, statuses, counts.
- `info` for facts a reader of the run needs, `warn` when something went wrong but the test goes on, `error`
  only next to a failure, `debug` for high-volume detail (seen with `LOG_FILE_LEVEL=debug`).
- `test.step` titles are the console lines: flat, business language, no ids or per-run values.
- Reporter changes: pure logic in `src/reporting/run-log-format.ts` with unit tests (`npm run test:reporting`);
  only `RunLogSink` writes to the console and `logs/automation_framework.log`.
