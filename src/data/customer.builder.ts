import { randomBytes } from 'node:crypto';
import { faker } from '@faker-js/faker';
import { testDataTag } from './test-data';
import type { UserRegistration } from '../api/schemas/user.schema';
import { SAVED_ADDRESS } from './checkout.data';

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

/** A password guaranteed to differ from the customer's real one (for the single wrong attempt). */
export const wrongPassword = (): string => `Wrong!1${randomBytes(9).toString('base64url')}`;
