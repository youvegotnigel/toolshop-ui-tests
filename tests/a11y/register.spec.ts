import { test } from '../../src/fixtures';

test.describe(
  'a11y.register: A visitor can register with assistive technology',
  { tag: ['@a11y', '@auth'] },
  () => {
    test(
      'the registration form meets the configured accessibility standard',
      { annotation: [{ type: 'covers', description: 'page:register' }] },
      async ({ registerPage, a11y }) => {
        await test.step('A visitor opens the registration page', async () => {
          await registerPage.open();
        });

        await test.step('The registration form has no accessibility violations', async () => {
          await a11y.expectNoViolations('page:register');
        });
      },
    );
  },
);
