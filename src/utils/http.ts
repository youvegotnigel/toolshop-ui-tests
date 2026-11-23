/**
 * Toolshop GET responses carry `Cache-Control: public, max-age=120`.
 * Send this on API reads that verify what the UI wrote, so a cache never answers with the old value.
 */
export const NO_CACHE: Readonly<Record<string, string>> = Object.freeze({ 'Cache-Control': 'no-cache' });

export const HTTP = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  LOCKED: 423,
  SERVER_ERROR: 500,
} as const;
