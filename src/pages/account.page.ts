import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/** /account: the signed-in customer's overview. */
export class AccountPage extends BasePage {
  readonly title: Locator;
  readonly favorites: Locator;
  readonly invoices: Locator;
  readonly profile: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.getByTestId('page-title');
    this.favorites = page.getByTestId('nav-favorites');
    this.invoices = page.getByTestId('nav-invoices');
    this.profile = page.getByTestId('nav-profile');
  }

  async waitForReady(): Promise<void> {
    await expect(this.profile).toBeVisible();
  }

  open(): Promise<this> {
    return this.visit('/account');
  }
}
