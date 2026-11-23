---
name: data-driven-tests
description: 'Write or review data-driven Toolshop UI tests: a typed cases table in src/data and one test() per row with for...of, a title built from the row, no branching per row. Use when 3 or more tests share their steps and only the data changes (form validation, boundaries, option lists), when converting copy-pasted tests, or when ESLint reports qe/prefer-data-driven-tests or qe/valid-data-driven-test.'
---

# Data-driven tests

Human guide: `docs/testing-patterns/data-driven-tests.md`. Reference: `tests/auth/login-validation.spec.ts` with
`src/data/sign-in.cases.ts`. `AGENTS.md` and the `add-ui-test` rules still apply to every generated test.

## Critical

- **Same steps, different data, 3 or more cases: one table.** ESLint (`qe/prefer-data-driven-tests`) fails 3+
  sibling tests that differ only in literals. Keep 1 or 2 cases as plain tests.
- **One row breaks exactly one thing.** Spread a valid base object and override one field.
- **`for (const { ... } of cases)` only**, never `forEach`, `map`, index loops or `while` (`qe/valid-data-driven-test`).
- **The title is a template literal built from the row** (`` `a shopper cannot sign in when ${reason}` ``): every
  generated test needs its own name in the HTML and Allure reports.
- **No `if`, `switch` or ternary per row**, around or inside the test. A row that needs other steps is another test.
- **The table is built once, when Playwright loads the file.** Static values only. Anything unique per run or
  retry (products, customers, run tags) comes from fixtures inside the test.
- **Assert the reason, not only the outcome**: the field's message, the order, the value, never just "an error".
- Never `eslint-disable` these rules to get green; a justified disable carries `-- <reason>` and goes in the PR.

## Table or not?

| Situation                                                                     | Pattern                                                         |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Independent cases, same steps (validation messages, boundaries, roles)        | **Cases table**, one `test()` per row                           |
| Cases that build on each other's state in one session (sort the same results) | One test, `for...of` over `test.step`s (`catalog/sort.spec.ts`) |
| Steps differ, rows need flags (`expectSuccess`, `skipCleanup`), 1 or 2 cases  | Separate plain tests                                            |

## Procedure

1. Look for an existing table in `src/data/*.cases.ts` for the same page and extend it instead of adding one.
2. Explore every row on the live site (`explore-site`): confirm each one fails only the field it names and, for
   forms, that nothing is sent to the API (the safety rules on locked accounts still apply).
3. Write the table in `src/data/<thing>.cases.ts`, typed with
   `as const satisfies readonly FormValidationCase<Form>[]` (or a type extending `TestCase`) from
   `src/data/test-cases.ts`. `reason` finishes "... when <reason>", lowercase and unique. Expected messages are
   documented in `AGENTS.md` (Toolshop facts), never copied from a page without that note.
4. Write the spec: one `test.describe` (journey id), the `for...of` directly inside it, then 2 to 6 business
   steps whose titles also use the row (`` `They try to sign in when ${reason}` ``). Page objects map a row's
   `field` to a locator (`loginPage.fieldError(field)`), so the spec stays branch-free.
5. Prove it: `npx playwright test <spec> --list` shows one test per row with distinct titles; then the
   `add-ui-test` verification (three browsers, `--repeat-each=3 --shuffle`).

## Review

Blocking: copy-pasted tests that should be a table; a table forced onto tests whose steps differ; rows with
behaviour flags; a row that breaks two things; per-run data in the table; an assertion on the outcome only;
`forEach`/`map` registration, a fixed title or a branch per row; a disable without a convincing reason.
Non-blocking: `reason` text that reads badly in the report ("rejected when **the slug contains spaces**").
Quote the line, say what is wrong in one sentence and show the fixed code.
