import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { env, loadEnvironment, proxyFromEnv, trustInterceptingProxy } from './src/config/env';
import { smartReporter } from './src/reporting/smart-report';

const testEnv = loadEnvironment();
// Set once, inherited by every worker: the run tag qa-<RUN_ID> on every record this run creates
process.env.RUN_ID ??= `r${Date.now().toString(36)}`;
const isCI = process.env.CI !== undefined;

const optionalReporters: ReporterDescription[] = process.env.ALLURE
  ? [['allure-playwright', { resultsDir: 'allure-results', environmentInfo: { TEST_ENV: testEnv } }]]
  : [];

const SPECS = /.*\.spec\.ts/;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results/artifacts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : 3, // a shared public demo: be a polite client
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    [isCI ? 'line' : 'list'],
    // One blob per CI job (BLOB_NAME = browser project), merged into one HTML report by merge.config.ts
    ...(isCI || process.env.BLOB_NAME !== undefined
      ? ([
          ['blob', { outputDir: 'blob-report', fileName: `report-${process.env.BLOB_NAME ?? 'ci'}.zip` }],
        ] as ReporterDescription[])
      : []),
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }], // dashboard input
    ['./src/reporting/failure-tracker.ts'],
    // GitHub shards (BLOB_NAME set) leave it to merge.config.ts: one smart report across browsers
    ...(process.env.BLOB_NAME === undefined ? [smartReporter] : []),
    ...optionalReporters,
  ],

  use: {
    baseURL: env('BASE_URL'),
    testIdAttribute: 'data-test', // the Toolshop marks every interactive element with data-test
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-GB',
    timezoneId: 'Europe/Amsterdam',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    proxy: proxyFromEnv(),
    ignoreHTTPSErrors: trustInterceptingProxy(),
  },

  projects: [
    { name: 'setup', testMatch: /setup\/.*\.setup\.ts/, teardown: 'teardown' },
    { name: 'teardown', testMatch: /setup\/.*\.teardown\.ts/ },
    { name: 'chromium', testMatch: SPECS, dependencies: ['setup'], use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testMatch: SPECS, dependencies: ['setup'], use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testMatch: SPECS, dependencies: ['setup'], use: { ...devices['Desktop Safari'] } },
    {
      name: 'mobile-chrome',
      testMatch: SPECS,
      dependencies: ['setup'],
      grep: /@smoke/,
      use: { ...devices['Pixel 7'] },
    },
  ],
});
