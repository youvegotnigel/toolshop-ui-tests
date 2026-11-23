import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base.page';

/** The thank-you message after the order is placed. It has no data-test attribute. */
export class OrderConfirmationPage extends BasePage {
  /** The invoice number (INV-...), a pattern that does not change with the language. */
  readonly invoiceNumber: Locator;

  constructor(page: Page) {
    super(page);
    this.invoiceNumber = page.getByText(/^INV-\d+$/);
  }

  async waitForReady(): Promise<void> {
    await expect(this.invoiceNumber).toBeVisible();
  }

  /** Reads the invoice number shown, to look the order up through the API. */
  async readInvoiceNumber(): Promise<string> {
    return (await this.invoiceNumber.innerText()).trim();
  }
}
