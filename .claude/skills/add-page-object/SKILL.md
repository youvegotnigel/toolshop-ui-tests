---
name: add-page-object
description: 'Create or extend a Toolshop page object or component: data-test locator strategy, readiness via waitForReady, intention methods that return the next page, responsive reveal logic and the page fixture. Use before writing a spec that visits a page without a page object.'
---

# Add a page object

## 1. Explore the page (read-only)

- Open it with Playwright MCP (if configured) or `npx playwright codegen https://practicesoftwaretesting.com/<route>`.
- List its `data-test` attributes, roles and accessible names, and what makes it "ready" (the one element
  that only appears once data has loaded). Check a phone viewport (Pixel 7): what collapses?
- Note asynchronous behaviour that can race the user (profile patches, lookups, debounced inputs).

## 2. Write the class

```ts
export class InvoicesPage extends BasePage {
  readonly rows: Locator;

  constructor(page: Page) {
    super(page);
    this.rows = page.getByRole('row').filter({ has: page.getByTestId('invoice-number') });
  }

  async waitForReady(): Promise<void> {
    await expect(this.page.getByTestId('page-title')).toBeVisible();
  }

  open(): Promise<this> {
    return this.visit('/account/invoices');
  }

  async openInvoice(number: string): Promise<InvoicePage> {
    await this.rows.filter({ hasText: number }).getByRole('link').click();
    const invoice = new InvoicePage(this.page);
    await invoice.waitForReady();
    return invoice;
  }
}
```

- `src/pages/<name>.page.ts`, steps of a wizard in a folder (`src/pages/checkout/*.step.ts`).
- Locators: `getByTestId` > `getByRole` with name > `getByLabel` > `getByText`. No CSS, XPath or index
  without a comment. Avoid translated text; prefer patterns (`/^INV-\d+$/`).
- Methods are user intentions and return `this` or the next page object (after its `waitForReady()`).
- No assertions except in `waitForReady()`; `locator.waitFor()` is fine to wait for a state.
- Shared parts go in `src/components/` and are composed (`readonly header: Header`).
- Collapsed UI on phones: add a reveal method that is a no-op on desktop (see `Header.expand()`).

## 3. Wire it up

1. Add a fixture in `src/fixtures/pages.fixtures.ts` built on `signedInPage`.
2. Add the page key to `coverage-plan.json` if it is new.
3. `npm run typecheck && npm run lint`.
