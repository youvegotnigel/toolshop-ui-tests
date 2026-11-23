import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import { AccountPage } from './account.page';

export type SignInDetails = { email: string; password: string };

/** /auth/login: the only page where tests type credentials. */
export class LoginPage extends BasePage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submitButton: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    super(page);
    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.submitButton = page.getByTestId('login-submit');
    this.error = page.getByTestId('login-error');
  }

  async waitForReady(): Promise<void> {
    await expect(this.submitButton).toBeVisible();
  }

  open(): Promise<this> {
    return this.visit('/auth/login');
  }

  /** Submits the form and stays on the page (for credentials that must be rejected). */
  async attemptSignIn(details: SignInDetails): Promise<this> {
    await this.email.fill(details.email);
    await this.password.fill(details.password);
    await this.submitButton.click();
    return this;
  }

  async signIn(details: SignInDetails): Promise<AccountPage> {
    await this.attemptSignIn(details);
    const account = new AccountPage(this.page);
    await account.waitForReady();
    return account;
  }

  /** Whether the browser holds a session token. Never returns the token itself (it must not reach reports). */
  async hasStoredSession(): Promise<boolean> {
    return this.page.evaluate(() => localStorage.getItem('auth-token') !== null);
  }
}
