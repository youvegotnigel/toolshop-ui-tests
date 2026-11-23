import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';

export type TestEnv = 'public' | 'with-bugs';

const ENVIRONMENTS: readonly TestEnv[] = ['public', 'with-bugs'];

const isTestEnv = (value: string): value is TestEnv => (ENVIRONMENTS as readonly string[]).includes(value);

/**
 * Loads `.env.local` (personal secrets, git-ignored), then `.env.<TEST_ENV>` (committed, no secrets).
 * Real values already in `process.env` (CI secrets) win, but an EMPTY value counts as missing:
 * CI systems export unset secrets as '' and must not block the defaults.
 */
export const loadEnvironment = (): TestEnv => {
  const name = process.env.TEST_ENV ?? 'public';
  if (!isTestEnv(name)) {
    throw new Error(`Unknown TEST_ENV "${name}". Use one of: ${ENVIRONMENTS.join(', ')}.`);
  }
  for (const file of ['.env.local', `.env.${name}`]) {
    if (!existsSync(file)) continue;
    for (const [key, value] of Object.entries(dotenv.parse(readFileSync(file)))) {
      const current = process.env[key];
      if (current === undefined || current === '') process.env[key] = value;
    }
  }
  process.env.TEST_ENV = name;
  return name;
};

/** Reads a required variable, failing fast with an actionable message. */
export const env = (key: string): string => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing env var ${key}. Add it to .env.local or your CI secrets (see .env.example).`);
  }
  return value;
};

/** Unique id for this run: set once in playwright.config.ts and inherited by every worker. */
export const runId = (): string => env('RUN_ID');

export const testEnv = (): TestEnv => {
  const name = process.env.TEST_ENV ?? 'public';
  return isTestEnv(name) ? name : 'public';
};

/**
 * Outbound proxy from the standard HTTPS_PROXY variable (corporate networks, sandboxes).
 * Browsers pick it up through `use.proxy`; API contexts need it passed explicitly.
 */
export const proxyFromEnv = (): { server: string } | undefined => {
  const server = process.env.HTTPS_PROXY ?? process.env.https_proxy;
  return server === undefined || server === '' ? undefined : { server };
};

/**
 * Opt-in for networks that re-sign TLS with their own CA (a TLS-inspecting proxy) when a browser,
 * typically Firefox, does not trust that CA. Never honoured in CI.
 */
export const trustInterceptingProxy = (): boolean =>
  process.env.TRUST_INTERCEPTING_PROXY === '1' && process.env.CI === undefined;

/** Where the front end keeps its JWT ('auth-token'): localStorage (public) or sessionStorage (with-bugs). */
export const tokenStorage = (): 'local' | 'session' =>
  process.env.TOKEN_STORAGE === 'session' ? 'session' : 'local';

/** Prefix for in-app routes: '' for path routing (public), '/#' for hash routing (with-bugs). */
export const routePrefix = (): string => process.env.ROUTE_PREFIX ?? '';
