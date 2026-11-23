import type { APIRequestContext, PlaywrightWorkerArgs } from '@playwright/test';
import { test as authTest } from './auth.fixtures';
import { CatalogClient } from '../api/clients/catalog.client';
import { OrdersClient } from '../api/clients/orders.client';
import { UsersClient } from '../api/clients/users.client';
import { env, proxyFromEnv } from '../config/env';
import { ApiRecorder } from '../utils/api-recorder';

type ApiFixtures = {
  /** One id per test, sent as X-Correlation-Id by every API context: search it in the API's logs. */
  correlationId: string;
  /** One call log per test; the test data setup is attached as api-calls.json when the test fails. */
  apiRecorder: ApiRecorder;
  /** Anonymous: creating catalogue data and carts is public. */
  api: APIRequestContext;
  /** Authenticated as the Toolshop admin (deletes, sweeps). */
  adminApi: APIRequestContext;
  /** Factory: a recorded context for any token (e.g. a customer reading their own invoices). */
  apiAs: (authorization: string) => Promise<APIRequestContext>;
  catalog: CatalogClient;
  adminCatalog: CatalogClient;
  adminUsers: UsersClient;
  orders: OrdersClient;
};

type Playwright = PlaywrightWorkerArgs['playwright'];

const recordedContext = async (
  playwright: Playwright,
  recorder: ApiRecorder,
  headers: Record<string, string>,
): Promise<{ ctx: APIRequestContext; recorded: APIRequestContext }> => {
  const ctx = await playwright.request.newContext({
    baseURL: env('API_BASE_URL'),
    proxy: proxyFromEnv(),
    extraHTTPHeaders: { Accept: 'application/json', ...headers },
  });
  return { ctx, recorded: recorder.wrap(ctx) };
};

// Lazy: a context (and its login) is only created when a test asks for it.
export const test = authTest.extend<ApiFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright fixtures must destructure their first argument
  correlationId: async ({}, use, testInfo) => {
    const id = crypto.randomUUID();
    testInfo.annotations.push({ type: 'correlation-id', description: id });
    await use(id);
  },

  // eslint-disable-next-line no-empty-pattern -- Playwright fixtures must destructure their first argument
  apiRecorder: async ({}, use, testInfo) => {
    const recorder = new ApiRecorder();
    await use(recorder);
    await recorder.attachOnFailure(testInfo);
  },

  api: async ({ playwright, apiRecorder, correlationId }, use) => {
    const { ctx, recorded } = await recordedContext(playwright, apiRecorder, {
      'X-Correlation-Id': correlationId,
    });
    await use(recorded);
    await ctx.dispose();
  },

  adminApi: async ({ playwright, apiRecorder, correlationId, adminSession }, use) => {
    const { ctx, recorded } = await recordedContext(playwright, apiRecorder, {
      'X-Correlation-Id': correlationId,
      Authorization: await adminSession.bearer(),
    });
    await use(recorded);
    await ctx.dispose();
  },

  apiAs: async ({ playwright, apiRecorder, correlationId }, use) => {
    const opened: APIRequestContext[] = [];
    await use(async (authorization) => {
      const { ctx, recorded } = await recordedContext(playwright, apiRecorder, {
        'X-Correlation-Id': correlationId,
        Authorization: authorization,
      });
      opened.push(ctx);
      return recorded;
    });
    for (const ctx of opened) await ctx.dispose();
  },

  catalog: async ({ api }, use) => {
    await use(new CatalogClient(api));
  },
  adminCatalog: async ({ adminApi }, use) => {
    await use(new CatalogClient(adminApi));
  },
  adminUsers: async ({ adminApi }, use) => {
    await use(new UsersClient(adminApi));
  },
  orders: async ({ api }, use) => {
    await use(new OrdersClient(api));
  },
});
