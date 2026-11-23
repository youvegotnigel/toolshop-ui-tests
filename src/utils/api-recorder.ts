import { writeFile } from 'node:fs/promises';
import type { APIRequestContext, APIResponse, TestInfo } from '@playwright/test';
import { logger, redact, redactText } from './logger';

/** Responses carry secrets too (login returns access_token): redact JSON bodies before storing. */
const redactBody = (text: string): string => {
  try {
    return JSON.stringify(redact(JSON.parse(text)));
  } catch {
    return redactText(text);
  }
};

type Options = { data?: unknown; method?: string };
type Send = (url: string, options?: Options) => Promise<APIResponse>;
type Call = {
  method: string;
  url: string;
  status: number | 'ERROR';
  ms: number;
  request?: unknown;
  responseBody?: string;
  error?: string;
};

const VERBS: Readonly<Record<string, string>> = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
  head: 'HEAD',
  fetch: 'FETCH',
};
const MAX_BODY_CHARS = 4_000;

/**
 * Wraps an APIRequestContext so every call is timed and logged (secrets redacted).
 * Fixtures use it exactly like the real context; on failure the log of the test data setup is attached.
 */
export class ApiRecorder {
  private readonly calls: Call[] = [];

  wrap(ctx: APIRequestContext): APIRequestContext {
    return new Proxy(ctx, {
      get: (target, prop): unknown => {
        const value: unknown = Reflect.get(target, prop, target);
        if (typeof value !== 'function') return value;
        const original = (value as Send).bind(target);
        if (typeof prop !== 'string' || !Object.hasOwn(VERBS, prop)) return original;
        const verb = VERBS[prop] ?? prop.toUpperCase();
        return (url: string, options?: Options): Promise<APIResponse> =>
          this.send(original, verb, url, options);
      },
    });
  }

  /**
   * Attaches every call of the test, with response bodies, to the report: on failure only.
   * Written to disk as well, so agents can read test-results/artifacts/<test>/api-calls.json.
   */
  async attachOnFailure(testInfo: TestInfo): Promise<void> {
    if (testInfo.status === testInfo.expectedStatus || this.calls.length === 0) return;
    const file = testInfo.outputPath('api-calls.json');
    await writeFile(file, JSON.stringify(this.calls, null, 2));
    await testInfo.attach('api-calls.json', { path: file, contentType: 'application/json' });
    logger.error(
      `FAILED ${testInfo.titlePath.join(' > ')}: ${String(this.calls.length)} API call(s) attached`,
    );
  }

  private async send(original: Send, verb: string, url: string, options?: Options): Promise<APIResponse> {
    const started = performance.now();
    const method = options?.method ?? verb;
    const request = redact(options?.data);
    try {
      const response = await original(url, options);
      const ms = Math.round(performance.now() - started);
      // Read now: bodies are gone once the context is disposed in fixture teardown.
      const responseBody = redactBody(await response.text().catch(() => '<unreadable>')).slice(
        0,
        MAX_BODY_CHARS,
      );
      this.calls.push({ method, url: response.url(), status: response.status(), ms, request, responseBody });
      logger.debug(`${method} ${response.url()} -> ${String(response.status())} in ${String(ms)} ms`);
      return response;
    } catch (error) {
      const ms = Math.round(performance.now() - started);
      this.calls.push({ method, url, status: 'ERROR', ms, request, error: String(error) });
      throw error;
    }
  }
}
