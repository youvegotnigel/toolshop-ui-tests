---
applyTo: 'tests/**/*.ts'
---

Specs in this folder follow AGENTS.md "Rules for every test". In short:

- `import { test, expect } from '../../src/fixtures';` and nothing from `@playwright/test`.
- One `test.describe('<journey id>: <who does what>', { tag: [...] }, ...)` per file; `covers` annotations
  for every `page:<key>` the test touches.
- 2 to 6 flat `test.step` calls written for a manager reading the report.
- Page objects and data come from fixtures; choose the shopper with `test.use({ shopper })`.
- Web-first assertions; expected values from the test's own data; no sleeps.
- 3 or more cases with the same steps: one `test()` inside `for (const { ... } of cases)` over a typed table in
  `src/data/<thing>.cases.ts` (`as const satisfies readonly FormValidationCase<Form>[]`). One row breaks one
  thing; the title is a template literal using the row; no `if`, `switch` or ternary per row; never `forEach`,
  `map` or index loops; static values only. Assert the field or value, not only the outcome.
  Full pattern: `.claude/skills/data-driven-tests/SKILL.md`, `docs/testing-patterns/data-driven-tests.md`.

When reviewing a pull request, flag violations of these rules with the offending line and the corrected code.
