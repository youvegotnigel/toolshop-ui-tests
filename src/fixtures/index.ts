/**
 * The ONE import every spec uses:
 *   import { test, expect } from '../../src/fixtures';
 * ESLint blocks importing '@playwright/test' directly inside tests/.
 * Chain: auth (worker sessions) -> api (contexts, clients) -> data (factories, cleanup) -> pages.
 */
export { test } from './pages.fixtures';
export { expect } from '@playwright/test';
export type { Shopper } from './pages.fixtures';
export type { Catalogue, Cleanup, NewProduct } from './data.fixtures';
export type { Customer } from './auth.fixtures';
