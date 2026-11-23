import { faker } from '@faker-js/faker';
import { runId } from '../config/env';

/** Every record this framework creates carries the run id, so the teardown sweep can find leftovers. */
export const testDataTag = (): string => `qa-${runId()}`;

/**
 * A word the storefront search can find. Toolshop searches names with MySQL BOOLEAN MODE full-text,
 * where `-` means "exclude", so searching for the run tag itself silently matches nothing.
 * The server also caches each query's result for an hour: a fresh word is always a cache miss.
 */
export const searchToken = (): string => `qa${faker.string.alpha({ length: 10, casing: 'lower' })}`;
