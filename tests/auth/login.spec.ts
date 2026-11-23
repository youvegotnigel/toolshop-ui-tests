import { test, expect } from '../../src/fixtures';
import { wrongPassword } from '../../src/data/customer.builder';
import { skipCloudflareGuarded } from '../../src/config/env';

test.describe(
  'auth.login: A customer signs in with the login form',
  // @cloudflare-guarded: skipped on GitHub-hosted runners, where Cloudflare challenges the post-login /account load
  { tag: ['@auth', '@smoke', '@negative', '@cloudflare-guarded'] },
  () => {
    test.skip(
      skipCloudflareGuarded(),
      'Skipped on GitHub-hosted runners: Cloudflare answers the post-login /account page load from their ' +
        'datacenter IPs with a "Verify you are human" challenge, so the account page never renders. ' +
        'Not a product or test defect: the test runs locally, on Jenkins and on self-hosted runners. ' +
        'Set RUN_CLOUDFLARE_GUARDED_TESTS=1 to force it to run here.',
    );

    test(
      'a wrong password is refused without a session, then the right one opens the account',
      {
        annotation: [
          { type: 'covers', description: 'page:sign-in' },
          { type: 'covers', description: 'page:account' },
        ],
      },
      async ({ createCustomer, loginPage }) => {
        // The test's own customer: one wrong attempt can never lock anybody else (HTTP 423).
        const customer = await createCustomer();

        await test.step('A customer opens the sign-in page', async () => {
          await loginPage.open();
        });

        await test.step('A wrong password shows an error and no session is created', async () => {
          await loginPage.attemptSignIn({ email: customer.email, password: wrongPassword() });
          await expect(loginPage.error).toBeVisible();
          await loginPage.header.expand();
          await expect(loginPage.header.signIn).toBeVisible();
          await expect.poll(() => loginPage.hasStoredSession()).toBe(false);
        });

        const account = await test.step('They sign in with the right password', async () => {
          return loginPage.signIn({ email: customer.email, password: customer.password });
        });

        await test.step('They land on their account, signed in under their own name', async () => {
          await expect(account.title).toBeVisible();
          await expect(account.header.accountMenu).toContainText(customer.user.first_name);
          await expect.poll(() => loginPage.hasStoredSession()).toBe(true);
        });
      },
    );
  },
);
