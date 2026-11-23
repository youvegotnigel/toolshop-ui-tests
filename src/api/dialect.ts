import { z } from 'zod';

/**
 * The public Toolshop runs API v5; with-bugs runs an older API (numeric ids, flat address fields,
 * different invoice fields). Clients and schemas absorb the difference here, so page objects and specs
 * are identical on both sites. Set per environment in .env.<TEST_ENV> as API_DIALECT.
 */
export type ApiDialect = 'v5' | 'legacy';

export const apiDialect = (): ApiDialect => (process.env.API_DIALECT === 'legacy' ? 'legacy' : 'v5');

/** v5 ids are ULID strings, legacy ids are numbers: both are an opaque id to the tests. */
export const IdSchema = z.union([z.string().min(1), z.number().int()]).transform(String);
