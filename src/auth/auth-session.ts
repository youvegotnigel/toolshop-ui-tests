import type { APIRequestContext } from '@playwright/test';
import { AuthClient } from '../api/clients/auth.client';
import { TokenSchema, type Credentials, type Role } from '../api/schemas/auth.schema';
import { HTTP } from '../utils/http';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthSession');

/** Renew this long before expiry, so a token never dies mid-test. */
const REFRESH_MARGIN_MS = 60_000;

/**
 * One logged-in identity per worker. Toolshop JWTs live about 5 minutes, so a storageState saved once
 * would expire mid-run: the token is renewed through the API before it expires instead.
 * The login context is worker-scoped and not traced, so passwords never reach per-test traces.
 */
export class AuthSession {
  private current: string | undefined;
  private expiresAt = 0;

  constructor(
    private readonly request: APIRequestContext,
    readonly role: Role,
    private readonly credentials: Credentials,
  ) {}

  /** A token valid for at least another minute (logs in again when needed). */
  async token(): Promise<string> {
    if (this.current === undefined || Date.now() > this.expiresAt - REFRESH_MARGIN_MS) {
      await this.login();
    }
    return String(this.current);
  }

  async bearer(): Promise<string> {
    return `Bearer ${await this.token()}`;
  }

  private async login(): Promise<void> {
    const res = await new AuthClient(this.request).login(this.credentials);
    if (res.status() === HTTP.LOCKED) {
      throw new Error(
        `Login as ${this.role} failed with HTTP 423: the account is locked after too many failed logins. ` +
          'This is an environment problem, not a test failure.',
      );
    }
    if (!res.ok()) {
      // Never retry: Toolshop locks non-admin accounts after repeated failed logins.
      throw new Error(`Login as ${this.role} failed with HTTP ${String(res.status())}. Check credentials.`);
    }
    const token = TokenSchema.parse(await res.json());
    this.current = token.access_token;
    this.expiresAt = Date.now() + token.expires_in * 1_000;
    logger.info(`Logged in as ${this.role} (token valid ${String(token.expires_in)}s)`);
  }
}
