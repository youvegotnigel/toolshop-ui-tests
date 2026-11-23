import { test, expect } from '../../src/fixtures';

test.use({ shopper: 'customer' });

test.describe('auth.logout: A signed-in customer signs out', { tag: ['@auth', '@smoke'] }, () => {
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
});
