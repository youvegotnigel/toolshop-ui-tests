import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base.page';
import { OrderConfirmationPage } from './order-confirmation.page';
import type { PaymentMethod } from '../../data/checkout.data';

/** Step 4: payment. "Confirm" is pressed twice: once to check the payment, once to place the order. */
export class PaymentStep extends BasePage {
  readonly method: Locator;
  readonly confirmButton: Locator;
  readonly paymentAccepted: Locator;

  constructor(page: Page) {
    super(page);
    this.method = page.getByTestId('payment-method');
    this.confirmButton = page.getByTestId('finish');
    this.paymentAccepted = page.getByTestId('payment-success-message');
  }

  async waitForReady(): Promise<void> {
    await expect(this.method).toBeVisible();
  }

  async payWith(method: PaymentMethod): Promise<OrderConfirmationPage> {
    await this.method.selectOption(method);
    await this.confirmButton.click();
    await this.paymentAccepted.waitFor();
    await this.confirmButton.click();
    const confirmation = new OrderConfirmationPage(this.page);
    await confirmation.waitForReady();
    return confirmation;
  }
}
