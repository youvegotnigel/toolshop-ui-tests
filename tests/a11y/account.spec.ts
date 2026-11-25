import { test, expect } from '../../src/fixtures';

test.use({ shopper: 'customer' });

test.describe(
  'a11y.account: A signed-in customer can use their account with assistive technology',
  { tag: ['@a11y', '@account'] },
  () => {
    test(
      'the account page and its open account menu meet the configured accessibility standard',
      { annotation: [{ type: 'covers', description: 'page:account' }] },
      async ({ accountPage, a11y }) => {
        await test.step('A signed-in customer opens their account', async () => {
          await accountPage.open();
        });

        await test.step('The account page has no accessibility violations', async () => {
          await a11y.expectNoViolations('page:account');
        });

        await test.step('They open the account menu and see the sign-out option', async () => {
          await accountPage.header.openAccountMenu();
          await expect(accountPage.header.signOut).toBeVisible();
        });

        await test.step('The page with the menu open has no accessibility violations', async () => {
          await a11y.expectNoViolations('page:account');
        });
      },
    );
  },
);
