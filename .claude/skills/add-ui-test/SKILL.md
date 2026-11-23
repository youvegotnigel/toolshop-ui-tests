---
name: add-ui-test
description: 'Turn a user journey into a Playwright UI test for the Toolshop: journey id in coverage-plan.json, page objects and fixtures, then a spec with business-language steps, tags, covers annotations and cleanup. Use when adding or extending UI test coverage.'
---

# Add a UI test

Read `AGENTS.md` first: its rules and Toolshop facts are binding. Run through `ai-native-workflow`
(explore, propose with confidence, human gate) before writing code.

## Critical

- Every locator comes from exploration (`explore-site`); every expected value from the test's own data (`test-data`).
- Specs never call `page.goto`, the API or `new` a page object; ESLint fails the build if they do.
- 2 to 6 flat business steps; describe title starts with the journey id; area and depth tags; `covers` annotations.
- Never weaken an assertion, add a sleep or a retry to get green.

## 1. Pin down the journey

1. Find (or add) the journey in `coverage-plan.json` (`id`, `title`, `area`, `priority`, `target`) and the
   `page:<key>` entries it touches. New page keys come from the Angular routes.
2. Write the scenario as 2 to 6 business sentences: they become the `test.step` titles.
   Name the shopper: `guest`, `customer` (worker's own), or `new-customer` (anything that places an order).
3. Explore the journey on the live site (`explore-site`) in the shopper's state, desktop and phone.
4. Decide the data (`test-data`): what the test creates through the API (`createdProduct`, `createdCatalogue`,
   `createCustomer`, a new factory) and every value it will assert. Expected values come from that data or a
   documented rule, never from what the page happens to show.

## 2. Make sure the page objects exist

For every page or step the journey visits, use the existing page object or follow the
`add-page-object` skill. Navigation methods return the next page object; intentions, not clicks.

## 3. Write the spec

`tests/<area>/<journey>.spec.ts`:

Start from `references/spec-template.md`.

- Describe title = `<journey id>: <who does what>`. Tags: area plus depth (`@smoke`, `@negative`, `@a11y`).
- Assertions in the spec, web-first, on page object locators. `expect.poll` for non-DOM state.
- Accessibility depth: `await a11y.expectNoSeriousViolations('page:<key>')` at the end of a step.
- Verify side effects through fixtures (`invoicesOf(shopperAccount)`), never `api` directly.
- Data-driven: 3 or more cases with the same steps follow `data-driven-tests` (a typed table in
  `src/data/<thing>.cases.ts`, one `test()` per row, see `auth/login-validation.spec.ts`). Cases that build on one
  session stay one test with a `test.step` per case (see `catalog/sort.spec.ts`).

## 4. Prove it

1. `npx playwright test tests/<area>/<file> --project=chromium --project=firefox --project=webkit`
2. `npx playwright test tests/<area>/<file> --repeat-each=3 --shuffle`
3. `@smoke` tests: also `--project=mobile-chrome`.
4. `npm run verify`, then run the `review-ui-tests` checklist on your diff and fix every blocking finding.
5. The teardown log must show `Sweep removed 0` (or only `kept ... (HTTP 409)` after orders).

## References

- `references/spec-template.md`: the spec skeleton with tags, annotations, steps and the shopper option.
- `.claude/skills/review-ui-tests/references/checklist.md`: what the reviewer will check.
