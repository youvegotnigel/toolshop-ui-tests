import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base.page';
import { AddressStep } from './address.step';

/** Step 2: sign in, or continue when already signed in. */
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
