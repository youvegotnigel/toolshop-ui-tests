import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base.page';
import { OrderConfirmationPage } from './order-confirmation.page';
import type { CardDetails, PaymentMethod } from '../../data/checkout.data';

/** Step 4: payment. "Confirm" is pressed twice: once to check the payment, once to place the order. */
export class PaymentStep extends BasePage {
  readonly method: Locator;
  readonly confirmButton: Locator;
  readonly paymentAccepted: Locator;
  readonly cardNumber: Locator;
  readonly cardExpiry: Locator;
  readonly cardCvv: Locator;
  readonly cardHolder: Locator;

  constructor(page: Page) {
    super(page);
    this.method = page.getByTestId('payment-method');
    this.confirmButton = page.getByTestId('finish');
    this.paymentAccepted = page.getByTestId('payment-success-message');
    this.cardNumber = page.getByTestId('credit_card_number');
    this.cardExpiry = page.getByTestId('expiration_date');
    this.cardCvv = page.getByTestId('cvv');
    this.cardHolder = page.getByTestId('card_holder_name');
  }

  async waitForReady(): Promise<void> {
    await expect(this.method).toBeVisible();
  }

  async payByCard(card: CardDetails): Promise<OrderConfirmationPage> {
    await this.method.selectOption('credit-card');
    await this.cardNumber.fill(card.number);
    await this.cardExpiry.fill(card.expiry);
    await this.cardCvv.fill(card.cvv);
    await this.cardHolder.fill(card.holder);
    return this.confirm();
  }

  /** For methods that need no extra details (cash on delivery, bank transfer needs its own form). */
  async payWith(method: PaymentMethod): Promise<OrderConfirmationPage> {
    await this.method.selectOption(method);
    return this.confirm();
  }

  private async confirm(): Promise<OrderConfirmationPage> {
    await this.confirmButton.click();
    await this.paymentAccepted.waitFor();
    await this.confirmButton.click();
    const confirmation = new OrderConfirmationPage(this.page);
    await confirmation.waitForReady();
    return confirmation;
  }
}
