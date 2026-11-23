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
