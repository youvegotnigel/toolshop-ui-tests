import { test as base, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test';
import { AuthSession } from '../auth/auth-session';
import { UsersClient } from '../api/clients/users.client';
import { RegisteredUserSchema, type RegisteredUser } from '../api/schemas/user.schema';
import { StatusSchema } from '../api/schemas/auth.schema';
import { env, proxyFromEnv } from '../config/env';
import { buildCustomer } from '../data/customer.builder';
import { HTTP } from '../utils/http';
import { logger } from '../utils/logger';

/** A customer and the session that logs them in. */
export type Customer = { user: RegisteredUser; session: AuthSession; email: string; password: string };

type WorkerFixtures = {
  /** auto: fails the worker fast when the site or its API is down, before any test runs. */
  envGuard: undefined;
  adminSession: AuthSession;
  /** The worker's own throwaway customer (shared demo customers get locked by others: HTTP 423). */
  workerCustomer: Customer;
};

type Playwright = PlaywrightWorkerArgs['playwright'];

/** An untraced API context for worker-scoped work: logins never reach per-test traces. */
export const workerContext = (playwright: Playwright, authorization?: string): Promise<APIRequestContext> =>
  playwright.request.newContext({
    baseURL: env('API_BASE_URL'),
    proxy: proxyFromEnv(),
    extraHTTPHeaders: {
      Accept: 'application/json',
      ...(authorization === undefined ? {} : { Authorization: authorization }),
    },
  });

/** Registers a run-tagged customer through the API. The caller owns deleting it. */
export const registerCustomer = async (playwright: Playwright, ctx: APIRequestContext): Promise<Customer> => {
  const registration = buildCustomer();
  const res = await new UsersClient(ctx).register(registration);
  if (!res.ok()) throw new Error(`Registering a test customer failed with HTTP ${String(res.status())}`);
  const user = RegisteredUserSchema.parse(await res.json());
  const loginCtx = await workerContext(playwright);
  const credentials = { email: registration.email, password: registration.password };
  return { user, session: new AuthSession(loginCtx, 'customer', credentials), ...credentials };
};

/**
 * Deletes a customer as the admin. HTTP 409 means the customer placed an order: Toolshop keeps
 * invoices for good (no DELETE /invoices), so the customer stays until the hourly database reset.
 */
export const deleteCustomer = async (
  playwright: Playwright,
  admin: AuthSession,
  id: string,
): Promise<number> => {
  const ctx = await workerContext(playwright, await admin.bearer());
  const status = (await new UsersClient(ctx).remove(id)).status();
  await ctx.dispose();
  if (status === HTTP.CONFLICT)
    logger.info(`Customer ${id} kept: they have an order (HTTP 409, removed by the hourly reset)`);
  else if (status !== HTTP.NO_CONTENT && status !== HTTP.NOT_FOUND)
    logger.warn(`Could not delete customer ${id}: HTTP ${String(status)}`);
  return status;
};

export const test = base.extend<object, WorkerFixtures>({
  envGuard: [
    async ({ playwright }, use) => {
      const ctx = await workerContext(playwright);
      const status = await ctx.get('/status');
      if (!status.ok())
        throw new Error(`Toolshop API unhealthy: GET /status returned ${String(status.status())}`);
      const { version } = StatusSchema.parse(await status.json());
      const site = await ctx.get(env('BASE_URL'));
      await ctx.dispose();
      if (!site.ok())
        throw new Error(`Toolshop site unreachable: ${env('BASE_URL')} returned ${String(site.status())}`);
      logger.debug(`Toolshop ${version} is up`);
      await use(undefined);
    },
    { scope: 'worker', auto: true, title: 'Toolshop health check' },
  ],

  adminSession: [
    async ({ playwright }, use) => {
      const ctx = await workerContext(playwright);
      await use(
        new AuthSession(ctx, 'admin', { email: env('ADMIN_EMAIL'), password: env('ADMIN_PASSWORD') }),
      );
      await ctx.dispose();
    },
    { scope: 'worker', title: 'admin login (once per worker)' },
  ],

  workerCustomer: [
    async ({ playwright, adminSession }, use) => {
      const ctx = await workerContext(playwright);
      const customer = await registerCustomer(playwright, ctx);
      logger.info(`Registered worker customer ${customer.user.id}`);
      await use(customer);
      await deleteCustomer(playwright, adminSession, customer.user.id);
      await ctx.dispose();
    },
    { scope: 'worker', title: 'register a throwaway customer (once per worker)' },
  ],
});
