---
description: 'Run the full quality gate and summarise the result'
agent: agent
---

<!-- Mirror of .claude/commands/verify.md. Keep both in sync. -->

Run `npm run verify` (typecheck, lint, format, agent parity, every browser project).
Report: each gate (pass or fail), failing tests with their browser, failed step and first error line, the
teardown sweep line, and the next action. If tests failed, offer to run the triage-ui-failures skill.
