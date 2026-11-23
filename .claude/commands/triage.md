---
description: 'Triage the latest failed UI test run'
argument-hint: 'optional: a CI run id or a test title'
---

Triage the failed run: $ARGUMENTS

Follow `.claude/skills/triage-ui-failures/SKILL.md`: read `test-results/failure-summary.json` (or the CI
artifacts of the run), open the traces, reproduce, classify each failure and propose the fix.
Report one section per failure. Never weaken an assertion to make a test green.
