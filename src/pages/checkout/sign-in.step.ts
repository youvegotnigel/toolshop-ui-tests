import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base.page';
import { AddressStep } from './address.step';
import type { GuestDetails } from '../../data/customer.builder';

/**
 * Step 2: sign in, or continue. A signed-in customer just continues (`proceed-2`); a guest sees a sign-in
 * form and a "Continue as Guest" tab, whose details stay in the browser until the order is placed.
 */
export class SignInStep extends BasePage {
  readonly continueButton: Locator;
  /** The tab has no data-test; its role and name are the only handle. */
  readonly guestTab: Locator;
  readonly guestEmail: Locator;
  readonly guestFirstName: Locator;
  readonly guestLastName: Locator;
  readonly guestSubmit: Locator;
  readonly guestContinueButton: Locator;

  constructor(page: Page) {
    super(page);
    this.continueButton = page.getByTestId('proceed-2');
    this.guestTab = page.getByRole('tab', { name: 'Continue as Guest' });
    this.guestEmail = page.getByTestId('guest-email');
    this.guestFirstName = page.getByTestId('guest-first-name');
    this.guestLastName = page.getByTestId('guest-last-name');
    this.guestSubmit = page.getByTestId('guest-submit');
    this.guestContinueButton = page.getByTestId('proceed-2-guest');
  }

  /** Signed in: the continue button. Guest: the guest tab. */
  async waitForReady(): Promise<void> {
    await expect(this.continueButton.or(this.guestTab)).toBeVisible();
  }

  async proceed(): Promise<AddressStep> {
    await this.continueButton.click();
    return this.addressStep();
  }

  /** Guests only: gives their email and name on the guest tab and continues to the address. */
  async continueAsGuest(guest: GuestDetails): Promise<AddressStep> {
    await this.guestTab.click();
    await this.guestEmail.fill(guest.email);
    await this.guestFirstName.fill(guest.firstName);
    await this.guestLastName.fill(guest.lastName);
    await this.guestSubmit.click();
    await this.guestContinueButton.click();
    return this.addressStep();
  }

  private async addressStep(): Promise<AddressStep> {
    const step = new AddressStep(this.page);
    await step.waitForReady();
    return step;
  }
}
