import { test, expect } from '../../src/fixtures';
import { buildRegistration } from '../../src/data/customer.builder';

test.describe('auth.register: A visitor registers a new account', { tag: ['@auth', '@smoke'] }, () => {
  test(
    'the account is stored with their details and signs in with the password they chose',
    {
      annotation: [
        { type: 'covers', description: 'page:register' },
        { type: 'covers', description: 'page:sign-in' },
      ],
    },
    async ({ registerPage, registeredAccount }) => {
      const registration = buildRegistration();

      await test.step('A visitor opens the registration form', async () => {
        await registerPage.open();
      });

      await test.step('They register with their details and land on the sign-in page', async () => {
        const loginPage = await registerPage.register(registration);
        await loginPage.header.expand();
        await expect(loginPage.header.signIn).toBeVisible();
      });

      const account = await test.step('They can sign in with the password they chose', async () => {
        return registeredAccount(registration);
      });

      await test.step('Their account holds the details they entered', () => {
        expect(account).toMatchObject({
          first_name: registration.first_name,
          last_name: registration.last_name,
          email: registration.email,
          dob: registration.dob,
          phone: registration.phone,
          address: {
            country: registration.address.country,
            postal_code: registration.address.postal_code,
          },
        });
      });
    },
  );

  // Known Toolshop defect: POST /users/register is sent without address.house_number, so the stored
  // account has none. Expected to fail; when the Toolshop fixes it this reports "passed unexpectedly":
  // then turn it into a plain test (or fold the check into the test above).
  test.fail(
    'the house number they enter is stored with their address',
    {
      annotation: [
        { type: 'covers', description: 'page:register' },
        {
          type: 'known-defect',
          description:
            'The registration form does not send the house number (house_number is stored as null)',
        },
      ],
    },
    async ({ registerPage, registeredAccount }) => {
      const registration = buildRegistration();

      await test.step('A visitor registers with a house number in their address', async () => {
        await registerPage.open();
        await registerPage.register(registration);
      });

      await test.step('The house number is stored with their address', async () => {
        const account = await registeredAccount(registration);
        expect(account.address.house_number).toBe(registration.address.house_number);
      });
    },
  );
});
