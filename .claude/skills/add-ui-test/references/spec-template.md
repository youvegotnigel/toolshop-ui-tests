# Spec template

`tests/<area>/<journey>.spec.ts`. One describe per file, one journey per describe.

```ts
// Data-driven variant (3+ cases, same steps): a typed table in src/data/<thing>.cases.ts and
// `for (const { reason, ... } of cases) test(`... when ${reason}`, ...)` inside the describe
// (see tests/auth/login-validation.spec.ts and the data-driven-tests skill).
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

Checklist before running it:

- Title: `<journey id>: <who does what>`; the id exists in `coverage-plan.json`.
- Tags: one area (`@catalog`, `@auth`, `@cart`, `@checkout`, `@account`, `@admin`) plus depth (`@smoke`, `@negative`, `@a11y`).
- `covers` annotation for every `page:<key>` the test visits.
- Expected values derive from fixtures (`product.price.toFixed(2)`), never copied from the page.
- `a11y.expectNoViolations('page:<key>')` for `@a11y` (standard and level from `use.a11yConfig`).
