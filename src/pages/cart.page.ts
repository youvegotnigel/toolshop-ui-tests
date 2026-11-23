import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import { SignInStep } from './checkout/sign-in.step';

/** One line of the cart table. */
export type CartLine = { quantity: Locator; unitPrice: Locator; lineTotal: Locator };

/** Step 1 of the checkout wizard at /checkout: the cart. */
export class CartPage extends BasePage {
  readonly items: Locator;
  readonly total: Locator;
  readonly proceedButton: Locator;

  constructor(page: Page) {
    super(page);
    this.items = page.getByRole('row').filter({ has: page.getByTestId('product-title') });
    this.total = page.getByTestId('cart-total');
    this.proceedButton = page.getByTestId('proceed-1');
  }

  async waitForReady(): Promise<void> {
    await expect(this.proceedButton).toBeVisible();
  }

  open(): Promise<this> {
    return this.visit('/checkout');
  }

  line(productName: string): CartLine {
    const row = this.items.filter({ has: this.page.getByTestId('product-title').getByText(productName) });
    return {
      quantity: row.getByTestId('product-quantity'),
      unitPrice: row.getByTestId('product-price'),
      lineTotal: row.getByTestId('line-price'),
    };
  }

  /** Types a new quantity and leaves the field, which is when the Toolshop updates the cart. */
  async changeQuantity(productName: string, quantity: number): Promise<this> {
    const field = this.line(productName).quantity;
    await field.fill(String(quantity));
    await field.blur();
    return this;
  }

  async proceed(): Promise<SignInStep> {
    await this.proceedButton.click();
    const step = new SignInStep(this.page);
    await step.waitForReady();
    return step;
  }
}
