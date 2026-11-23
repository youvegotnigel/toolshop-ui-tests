import { test, expect } from '../../src/fixtures';
import { invalidSignIns } from '../../src/data/sign-in.cases';

// Data-driven: one test per row of src/data/sign-in.cases.ts (docs/testing-patterns/data-driven-tests.md).
// The form rejects every row before it sends anything, so no account can be locked (HTTP 423).
test.describe(
  'auth.login-validation: The sign-in form rejects invalid details before sending them',
  { tag: ['@auth', '@negative'] },
  () => {
    for (const { reason, field, input, message } of invalidSignIns) {
      test(
        `a shopper cannot sign in when ${reason}`,
        { annotation: [{ type: 'covers', description: 'page:sign-in' }] },
        async ({ loginPage }) => {
          await test.step('A shopper opens the sign-in page', async () => {
            await loginPage.open();
          });

          await test.step(`They try to sign in when ${reason}`, async () => {
            await loginPage.attemptSignIn(input);
          });

          await test.step(`The form flags the ${field} with "${message}" and no session starts`, async () => {
            await expect(loginPage.fieldError(field)).toHaveText(message);
            await expect(loginPage.errors).toHaveCount(1);
            await expect.poll(() => loginPage.hasStoredSession()).toBe(false);
          });
        },
      );
    }
  },
);
