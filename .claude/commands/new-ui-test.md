---
description: 'Add UI test coverage for a user journey, from exploration to a reviewed change'
argument-hint: 'journey id from coverage-plan.json, e.g. checkout.guest'
---

Add UI test coverage for the journey: $ARGUMENTS

1. Follow `.claude/skills/ai-native-workflow/SKILL.md`: explore the journey with `explore-site` and present the
   proposal (steps, pages, data, confidence, unknowns). Wait for approval unless confidence is 8 or more with no unknowns.
2. Implement it by following `.claude/skills/add-ui-test/SKILL.md` (and `add-page-object` for new pages).
3. Review the diff with `.claude/skills/review-ui-tests/SKILL.md` and fix every blocking finding.
4. Summarise the journey, its test.step names, the pages covered and the verification results.
