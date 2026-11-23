import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { BasePage } from './base.page';
import { LoginPage } from './login.page';
import type { Registration } from '../data/customer.builder';

const isPostcodeLookup = (response: Response): boolean =>
  new URL(response.url()).pathname.endsWith('/postcode-lookup');

/**
 * /auth/register: the registration form. Once country, postcode and house number are all set, the
 * Toolshop looks the address up and fills street, city and state itself (one GET /postcode-lookup).
 * A successful registration lands on the sign-in page; the visitor is not signed in.
 */
export class RegisterPage extends BasePage {
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly dateOfBirth: Locator;
  readonly country: Locator;
  readonly postalCode: Locator;
  readonly houseNumber: Locator;
  readonly street: Locator;
  readonly city: Locator;
  readonly state: Locator;
  readonly phone: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.firstName = page.getByTestId('first-name');
    this.lastName = page.getByTestId('last-name');
    this.dateOfBirth = page.getByTestId('dob');
    this.country = page.getByTestId('country');
    this.postalCode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.street = page.getByTestId('street');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.phone = page.getByTestId('phone');
    this.email = page.getByTestId('email');
    this.password = page.getByTestId('password');
    this.submitButton = page.getByTestId('register-submit');
  }

  async waitForReady(): Promise<void> {
    await expect(this.submitButton).toBeVisible();
  }

  open(): Promise<this> {
    return this.visit('/auth/register');
  }

  /**
   * Fills the form and submits it. The address lookup is awaited before typing on: it rewrites
   * street, city and state, so nothing typed into the form may race it.
   */
  async register(details: Registration): Promise<LoginPage> {
    await this.firstName.fill(details.first_name);
    await this.lastName.fill(details.last_name);
    await this.dateOfBirth.fill(details.dob);
    await this.country.selectOption(details.address.country);
    await this.postalCode.fill(details.address.postal_code);
    const lookedUp = this.page.waitForResponse(isPostcodeLookup);
    await this.houseNumber.fill(details.address.house_number);
    await lookedUp;
    await this.phone.fill(details.phone);
    await this.email.fill(details.email);
    await this.password.fill(details.password);
    await this.submitButton.click();
    const login = new LoginPage(this.page);
    await login.waitForReady();
    return login;
  }
}
