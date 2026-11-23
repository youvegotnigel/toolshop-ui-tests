import type { APIRequestContext } from '@playwright/test';

/**
 * Minimal Toolshop API clients: test data, authentication and verifying what the UI did.
 * They describe endpoints only and never assert; fixtures own every check.
 * Never add /refresh, /users/forgot-password or /users/change-password (AGENTS.md safety rules).
 */
export abstract class BaseClient {
  constructor(protected readonly request: APIRequestContext) {}
}
