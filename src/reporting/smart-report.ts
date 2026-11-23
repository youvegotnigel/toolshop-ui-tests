import type { ReporterDescription } from '@playwright/test';
import type SmartReporter from 'playwright-smart-reporter';

type SmartReporterOptions = NonNullable<ConstructorParameters<typeof SmartReporter>[0]>;

/** Same pattern as scripts/ci/redact-traces.mts: tests sign in through the API, so JWTs reach error text. */
const JWT = /eyJ[\w-]{6,}\.[\w-]{6,}\.[\w-]{6,}/;

const options: SmartReporterOptions = {
  // index.html in its own folder: build-site.sh publishes it at /smart/ next to Allure and Playwright
  outputFile: 'smart-report/index.html',
  // Restored from gh-pages (scripts/ci/restore-history.sh) so trends, flakiness and grades span runs
  historyFile: 'smart-history/test-history.json',
  maxHistoryRuns: 30,
  // Paths from the repo root, not rootDir (./tests): the same place for test runs and merge-reports
  relativeToCwd: true,
  // One run file per CI run: a re-run replaces its earlier attempt instead of adding a run
  runId: process.env.GITHUB_RUN_ID ?? process.env.BUILD_NUMBER,
  // Report text (errors, steps, URLs, history) is redacted; traces are masked by redact-traces.mts
  redact: { patterns: [JWT] },
  // Off by default; stated so nobody enables it by setting an API key. Prompts would carry page data.
  enableAIRecommendations: false,
};

/**
 * playwright-smart-reporter: failure clusters, stability grades, flakiness and trends.
 * GitHub Actions runs it once in merge.config.ts over every browser shard; Jenkins and local runs
 * (no BLOB_NAME) run it in playwright.config.ts.
 */
export const smartReporter: ReporterDescription = ['playwright-smart-reporter', options];
