import { test, expect } from '../../src/fixtures';

// The empty form is rejected before anything is sent (no /users/login request), so no account can lock.
test.describe(
  'a11y.sign-in: A shopper can sign in with assistive technology, including when the form shows errors',
  { tag: ['@a11y', '@auth'] },
  () => {
    test(
      'the sign-in form meets the configured accessibility standard, empty and with its errors showing',
      { annotation: [{ type: 'covers', description: 'page:sign-in' }] },
      async ({ loginPage, a11y }) => {
        await test.step('A shopper opens the sign-in page', async () => {
          await loginPage.open();
        });

        await test.step('The sign-in form has no accessibility violations', async () => {
          await a11y.expectNoViolations('page:sign-in');
        });

        await test.step('They submit the form empty and both fields are flagged', async () => {
          await loginPage.attemptSignIn({ email: '', password: '' });
          await expect(loginPage.fieldError('email')).toHaveText('Email is required');
          await expect(loginPage.fieldError('password')).toHaveText('Password is required');
        });

        await test.step('The form with its error messages has no accessibility violations', async () => {
          await a11y.expectNoViolations('page:sign-in');
        });
      },
    );
  },
);
