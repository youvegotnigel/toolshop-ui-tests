import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base.page';
import { PaymentStep } from './payment.step';
import type { AddressEntry } from '../../data/checkout.data';

/**
 * Step 3: billing address. The Toolshop looks the postcode up (GET /postcode-lookup) and fills
 * street, city and state itself, overwriting anything typed there. The country is chosen last so
 * exactly one lookup runs; "Proceed" stays disabled until the form is valid, so its click waits for it.
 */
export class AddressStep extends BasePage {
  readonly country: Locator;
  readonly postalCode: Locator;
  readonly houseNumber: Locator;
  readonly street: Locator;
  readonly city: Locator;
  readonly state: Locator;
  readonly proceedButton: Locator;

  constructor(page: Page) {
    super(page);
    this.country = page.getByTestId('country');
    this.postalCode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.street = page.getByTestId('street');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.proceedButton = page.getByTestId('proceed-3');
  }

  async waitForReady(): Promise<void> {
    await expect(this.country).toBeVisible();
  }

  async enterAddress(address: AddressEntry): Promise<this> {
    await this.houseNumber.fill(address.houseNumber);
    await this.postalCode.fill(address.postalCode);
    await this.country.selectOption(address.countryCode);
    return this;
  }

  async proceed(): Promise<PaymentStep> {
    await this.proceedButton.click();
    const step = new PaymentStep(this.page);
    await step.waitForReady();
    return step;
  }
}
