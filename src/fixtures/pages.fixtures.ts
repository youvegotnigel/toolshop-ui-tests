import { expect, type Page } from '@playwright/test';
import { test as dataTest } from './data.fixtures';
import type { Customer } from './auth.fixtures';
import type { OrdersClient } from '../api/clients/orders.client';
import { AccountPage } from '../pages/account.page';
import { CartPage } from '../pages/cart.page';
import { HomePage } from '../pages/home.page';
import { LoginPage } from '../pages/login.page';
import { ProductPage } from '../pages/product.page';
import { auditPage, describeViolations } from '../utils/a11y';
import { logger } from '../utils/logger';
import { labelsOf } from '../utils/report-labels';
import { tokenStorage } from '../config/env';

/**
 * Who is browsing: `guest` (default), the worker's `customer`, or a `new-customer` of the test's
 * own (use it when the test places an order, because a customer with an order cannot be deleted).
 * Set it per file: test.use({ shopper: 'customer' }).
 */
export type Shopper = 'guest' | 'customer' | 'new-customer';

type PageFixtures = {
  shopper: Shopper;
  /** The signed-in customer, or undefined for a guest. */
  shopperAccount: Customer | undefined;
  /** The browser page, signed in as `shopper` says: a fresh token is injected before the first navigation. */
  signedInPage: Page;
  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  loginPage: LoginPage;
  accountPage: AccountPage;
  /** Audits the current page against WCAG 2.2 AA; fails on serious or critical violations. */
  a11y: { expectNoSeriousViolations: (pageKey: string) => Promise<void> };
  /** auto: records the journey id (Allure labels are derived from tags by scripts/ci/allure-environment.mts). */
  reportLabels: undefined;
};

/** Seeds the token once per tab, so the app's own sign-out is not undone by the next navigation. */
const seedToken = ({ token, storage }: { token: string; storage: 'local' | 'session' }): void => {
  if (sessionStorage.getItem('qa-session-seeded') !== null) return;
  (storage === 'session' ? sessionStorage : localStorage).setItem('auth-token', token);
  sessionStorage.setItem('qa-session-seeded', '1');
};

export const test = dataTest.extend<PageFixtures>({
  shopper: ['guest', { option: true }],

  shopperAccount: async ({ shopper, workerCustomer, createCustomer }, use) => {
    const accounts: Record<Shopper, () => Promise<Customer | undefined>> = {
      guest: () => Promise.resolve(undefined),
      customer: () => Promise.resolve(workerCustomer),
      'new-customer': createCustomer,
    };
    await use(await accounts[shopper]());
  },

  signedInPage: async ({ page, shopperAccount, orders, browserName }, use, testInfo) => {
    if (shopperAccount !== undefined) {
      // Logged in through the API: only the login test types a password into the form.
      await page.context().addInitScript(seedToken, {
        token: await shopperAccount.session.token(),
        storage: tokenStorage(),
      });
    }
    await use(page);
    // Read by the dashboard and the Allure environment (browser versions under test)
    const version = page.context().browser()?.version() ?? 'unknown';
    testInfo.annotations.push({ type: 'browser-version', description: `${browserName} ${version}` });
    // The cart lives in the browser session; remove it so no cart outlives the test.
    const cartId = await page.evaluate(() => sessionStorage.getItem('cart_id')).catch(() => null);
    if (cartId !== null) await cleanCart(orders, cartId);
  },

  homePage: async ({ signedInPage }, use) => {
    await use(new HomePage(signedInPage));
  },
  productPage: async ({ signedInPage }, use) => {
    await use(new ProductPage(signedInPage));
  },
  cartPage: async ({ signedInPage }, use) => {
    await use(new CartPage(signedInPage));
  },
  loginPage: async ({ signedInPage }, use) => {
    await use(new LoginPage(signedInPage));
  },
  accountPage: async ({ signedInPage }, use) => {
    await use(new AccountPage(signedInPage));
  },

  a11y: async ({ signedInPage }, use, testInfo) => {
    await use({
      expectNoSeriousViolations: async (pageKey) => {
        const audit = await auditPage(signedInPage, testInfo, pageKey);
        for (const known of audit.known) {
          testInfo.annotations.push({
            type: 'known-a11y-violation',
            description: `${known.rule} on ${known.page}: ${known.issue}`,
          });
        }
        expect(audit.blocking.length + audit.fixed.length, describeViolations(audit)).toBe(0);
      },
    });
  },

  reportLabels: [
    // eslint-disable-next-line no-empty-pattern -- Playwright fixtures must destructure their first argument
    async ({}, use, testInfo) => {
      const labels = labelsOf(testInfo);
      if (labels.journey !== undefined)
        testInfo.annotations.push({ type: 'journey', description: labels.journey });
      await use(undefined);
    },
    { auto: true, box: true },
  ],
});

const cleanCart = async (orders: OrdersClient, cartId: string): Promise<void> => {
  const res = await orders.removeCart(cartId);
  if (!res.ok() && res.status() !== 404)
    logger.warn(`Could not delete cart ${cartId}: HTTP ${String(res.status())}`);
};
