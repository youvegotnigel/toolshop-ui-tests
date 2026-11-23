---
description: 'Review the current branch's UI test changes against AGENTS.md'
agent: ui-test-reviewer
---

<!-- Mirror of .claude/commands/review.md. Keep both in sync. -->

Review `git diff origin/main...HEAD` with `.claude/skills/review-ui-tests/SKILL.md`.
List blocking findings first, then non-blocking, each with file:line, the rule and the fix.
Finish with the verification results (`npm run verify`, changed specs repeated and shuffled).
