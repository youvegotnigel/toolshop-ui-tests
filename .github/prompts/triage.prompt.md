---
description: 'Triage the latest failed UI test run'
agent: failure-triager
argument-hint: 'optional: a CI run id or a test title'
---

<!-- Mirror of .claude/commands/triage.md. Keep both in sync. -->

Triage the failed run: ${input:run:optional: a CI run id or a test title}

Follow `.claude/skills/triage-ui-failures/SKILL.md`: read `test-results/failure-summary.json` (or the CI
artifacts of the run), open the traces, reproduce, classify each failure and propose the fix.
Report one section per failure. Never weaken an assertion to make a test green.
