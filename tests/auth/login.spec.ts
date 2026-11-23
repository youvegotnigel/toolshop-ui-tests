import { test, expect } from '../../src/fixtures';
import { wrongPassword } from '../../src/data/customer.builder';
import { skipCloudflareGuarded } from '../../src/config/env';

test.describe(
  'auth.login: A customer signs in with the login form',
  // @cloudflare-guarded: skipped in CI, where Cloudflare challenges the post-login /account load
  { tag: ['@auth', '@smoke', '@negative', '@cloudflare-guarded'] },
  () => {
    test.skip(
      skipCloudflareGuarded(),
      'Skipped in CI: Cloudflare answers the post-login /account page load from datacenter runners ' +
        '(GitHub-hosted) with a "Verify you are human" challenge, so the account page never renders. ' +
        'Not a product or test defect: the test passes locally. It still runs in CI when ' +
        'RUN_CLOUDFLARE_GUARDED_TESTS=1 is set on a runner Cloudflare does not challenge.',
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
