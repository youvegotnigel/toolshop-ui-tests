import { randomBytes } from 'node:crypto';
import { faker } from '@faker-js/faker';
import { testDataTag } from './test-data';
import type { UserRegistration } from '../api/schemas/user.schema';
import { SAVED_ADDRESS, type SavedAddress } from './checkout.data';

/** Emails start with the run tag, so the teardown sweep can find leftovers. */
export const testEmail = (): string =>
  `${testDataTag()}.${faker.string.alphanumeric(8).toLowerCase()}@toolshop-tests.example`;

/**
 * A throwaway customer for this run. Toolshop requires a strong password that is not in a known
 * data breach, so it is random every time and never leaves this process.
 */
export const buildCustomer = (overrides: Partial<UserRegistration> = {}): UserRegistration => ({
  first_name: faker.person.firstName().slice(0, 40),
  // Letters only: the legacy API (with-bugs) rejects spaces in last names
  last_name: 'Automation',
  email: testEmail(),
  password: `Qa!9${randomBytes(12).toString('base64url')}`,
  dob: '1990-01-01',
  phone: '+49 30 1234567',
  address: SAVED_ADDRESS,
  ...overrides,
});

/** What a visitor types into the registration form: every field, the address included. */
export type Registration = UserRegistration & { phone: string; address: SavedAddress };

/**
 * A run-tagged visitor for the registration form. The form accepts digits only in the phone field
 * ("Only numbers are allowed"), unlike the API, so the phone is digits.
 */
export const buildRegistration = (): Registration => ({
  ...buildCustomer(),
  phone: '49301234567',
  address: SAVED_ADDRESS,
});

/** The details a guest gives on the checkout's "Continue as Guest" tab. */
export type GuestDetails = { email: string; firstName: string; lastName: string };

/** A run-tagged guest shopper (the email starts with the run tag, like a customer's). */
export const buildGuest = (): GuestDetails => ({
  email: testEmail(),
  firstName: faker.person.firstName().slice(0, 40),
  lastName: 'Automation',
});

/** A password guaranteed to differ from the customer's real one (for the single wrong attempt). */
export const wrongPassword = (): string => `Wrong!1${randomBytes(9).toString('base64url')}`;
