import { test, expect } from '../../src/fixtures';
import { skipCloudflareGuarded } from '../../src/config/env';

test.use({ shopper: 'customer' });

test.describe(
  'auth.logout: A signed-in customer signs out',
  // @cloudflare-guarded: skipped on GitHub-hosted runners, where Cloudflare challenges the page after sign-out
  { tag: ['@auth', '@smoke', '@cloudflare-guarded'] },
  () => {
    test.skip(
      skipCloudflareGuarded(),
      'Skipped on GitHub-hosted runners: after Sign out Cloudflare answers the next page load from their ' +
        'datacenter IPs with a "Verify you are human" challenge, so the shop never shows the signed-out menu. ' +
        'Not a product or test defect: the test runs locally, on Jenkins and on self-hosted runners. ' +
        'Set RUN_CLOUDFLARE_GUARDED_TESTS=1 to force it to run here.',
    );

    test(
      'the session ends and stays ended when they come back to the shop',
      { annotation: [{ type: 'covers', description: 'page:home' }] },
      async ({ homePage, workerCustomer }) => {
        await test.step('A signed-in customer sees their name in the account menu', async () => {
          await homePage.open();
          await homePage.header.expand();
          await expect(homePage.header.accountMenu).toContainText(workerCustomer.user.first_name);
        });

        await test.step('They sign out from the account menu', async () => {
          await homePage.signOut();
        });

        await test.step('The menu offers to sign in again and no session is left', async () => {
          await homePage.header.expand();
          await expect(homePage.header.signIn).toBeVisible();
          await expect(homePage.header.accountMenu).toBeHidden();
          await expect.poll(() => homePage.hasStoredSession()).toBe(false);
        });

        await test.step('Coming back to the shop, they are still signed out', async () => {
          await homePage.open();
          await homePage.header.expand();
          await expect(homePage.header.signIn).toBeVisible();
          await expect(homePage.header.accountMenu).toBeHidden();
        });
      },
    );
  },
);
