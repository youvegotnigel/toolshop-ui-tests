---
description: 'Add UI test coverage for a user journey, from exploration to a reviewed change'
agent: ui-test-writer
argument-hint: 'journey id from coverage-plan.json, e.g. checkout.guest'
---

<!-- Mirror of .claude/commands/new-ui-test.md. Keep both in sync. -->

Add UI test coverage for the journey: ${input:journey:journey id from coverage-plan.json, e.g. checkout.guest}

1. Analyse the journey as the journey-analyst agent would and write the brief (steps, pages, data, locators, races).
2. Implement it by following `.claude/skills/add-ui-test/SKILL.md` (and `add-page-object` for new pages).
3. Review the diff with `.claude/skills/review-ui-tests/SKILL.md` and fix every blocking finding.
4. Summarise the journey, its test.step names, the pages covered and the verification results.
