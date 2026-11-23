# Page object templates

## A page

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

## A wizard step (fluent navigation)

```ts
export class SignInStep extends BasePage {
  readonly continueButton: Locator;

  constructor(page: Page) {
    super(page);
    this.continueButton = page.getByTestId('proceed-2');
  }

  async waitForReady(): Promise<void> {
    await expect(this.continueButton).toBeVisible();
  }

  async proceed(): Promise<AddressStep> {
    await this.continueButton.click();
    const step = new AddressStep(this.page);
    await step.waitForReady();
    return step;
  }
}
```

## A component (composed, never inherited)

```ts
export class CartBadge {
  readonly link: Locator;
  readonly count: Locator;

  constructor(page: Page) {
    this.link = page.getByTestId('nav-cart');
    this.count = page.getByTestId('cart-quantity');
  }
}
```

## Reveal logic for phones (no-op on desktop)

```ts
async expand(): Promise<this> {
  if ((await this.menuToggle.isVisible()) && (await this.menuToggle.getAttribute('aria-expanded')) !== 'true') {
    await this.menuToggle.click();
  }
  return this;
}
```
