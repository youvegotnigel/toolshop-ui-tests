---
name: add-ui-test
description: 'Turn a user journey into a Playwright UI test for the Toolshop: journey id in coverage-plan.json, page objects and fixtures, then a spec with business-language steps, tags, covers annotations and cleanup. Use when adding or extending UI test coverage.'
---

# Add a UI test

Read `AGENTS.md` first: its rules and Toolshop facts are binding.

## 1. Pin down the journey

1. Find (or add) the journey in `coverage-plan.json` (`id`, `title`, `area`, `priority`, `target`) and the
   `page:<key>` entries it touches. New page keys come from the Angular routes.
2. Write the scenario as 2 to 6 business sentences: they become the `test.step` titles.
   Name the shopper: `guest`, `customer` (worker's own), or `new-customer` (anything that places an order).
3. Decide the data: what the test creates through the API (`createdProduct`, `createdCatalogue`,
   `createCustomer`, a new factory) and every value it will assert. Expected values come from that data or a
   documented rule, never from what the page happens to show.

## 2. Make sure the page objects exist

For every page or step the journey visits, use the existing page object or follow the
`add-page-object` skill. Navigation methods return the next page object; intentions, not clicks.

## 3. Write the spec

`tests/<area>/<journey>.spec.ts`:

```ts
import { test, expect } from '../../src/fixtures';

test.use({ shopper: 'customer' }); // only when not a guest

test.describe('cart.remove: A signed-in customer removes an item', { tag: ['@cart', '@negative'] }, () => {
  test(
    'the removed item disappears and the total drops',
    { annotation: [{ type: 'covers', description: 'page:cart' }] },
    async ({ createdProduct, productPage }) => {
      await test.step('A signed-in customer has a product in the cart', async () => {
        /* ... */
      });
      await test.step('They remove it', async () => {
        /* ... */
      });
      await test.step('The cart is empty and the badge disappears', async () => {
        /* web-first expects */
      });
    },
  );
});
```

- Describe title = `<journey id>: <who does what>`. Tags: area plus depth (`@smoke`, `@negative`, `@a11y`).
- Assertions in the spec, web-first, on page object locators. `expect.poll` for non-DOM state.
- Accessibility depth: `await a11y.expectNoSeriousViolations('page:<key>')` at the end of a step.
- Verify side effects through fixtures (`invoicesOf(shopperAccount)`), never `api` directly.
- Data-driven: data in `src/data/*.ts`, one `test.step` per case inside the test (see `catalog/sort.spec.ts`).

## 4. Prove it

1. `npx playwright test tests/<area>/<file> --project=chromium --project=firefox --project=webkit`
2. `npx playwright test tests/<area>/<file> --repeat-each=3 --shuffle`
3. `@smoke` tests: also `--project=mobile-chrome`.
4. `npm run verify`, then run the `review-ui-tests` checklist on your diff and fix every blocking finding.
5. The teardown log must show `Sweep removed 0` (or only `kept ... (HTTP 409)` after orders).
