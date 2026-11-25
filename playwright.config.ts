import { defineConfig, devices, type Project, type ReporterDescription } from '@playwright/test';
import { env, loadEnvironment, proxyFromEnv, trustInterceptingProxy } from './src/config/env';
import { smartReporter } from './src/reporting/smart-report';
import { a11yProjects, withEnvOverrides, type A11yConfig, type A11yOptions } from './src/config/a11y.config';

const testEnv = loadEnvironment();
// Set once, inherited by every worker: the run tag qa-<RUN_ID> on every record this run creates
process.env.RUN_ID ??= `r${Date.now().toString(36)}`;
const isCI = process.env.CI !== undefined;

const optionalReporters: ReporterDescription[] = process.env.ALLURE
  ? [['allure-playwright', { resultsDir: 'allure-results', environmentInfo: { TEST_ENV: testEnv } }]]
  : [];

const SPECS = /.*\.spec\.ts/;

/**
 * Accessibility audits (a11y fixture), for every project. Change the standard or the failing impact here, per run
 * with A11Y_STANDARD / A11Y_FAIL_ON, or per file with test.use({ a11yConfig }). Values: src/config/a11y.config.ts
 */
const a11yConfig: A11yConfig = {
  standard: 'wcag22aa', // wcag2a | wcag2aa | wcag2aaa | wcag21a | wcag21aa | wcag22aa | section508 | en-301-549
  failOn: 'serious', // critical | serious | moderate | minor: this impact and everything more severe fails
  bestPractices: false, // also run axe's best-practice rules
  disabledRules: [], // axe rule ids, each with a comment saying why; never to hide a product defect
};

/** The browser projects of this suite; the accessibility suite can be switched on per project. */
const BROWSER_PROJECTS = ['chromium', 'firefox', 'webkit', 'mobile-chrome'] as const;
type BrowserProject = (typeof BROWSER_PROJECTS)[number];

/**
 * Accessibility suite (tests/a11y): the browser projects that run it. Add a project to enable it there, use [] to
 * disable the suite. A11Y_PROJECTS=chromium,firefox (or A11Y_PROJECTS=none) overrides it for one run.
 * @a11y audit steps inside other specs are not affected: they run wherever their spec runs.
 */
const A11Y_PROJECTS: readonly BrowserProject[] = a11yProjects(['chromium'], BROWSER_PROJECTS);

const A11Y_SUITE = /a11y\/.*\.spec\.ts/;

/** A browser project; it skips the accessibility suite unless A11Y_PROJECTS lists it. */
const browserProject = (name: BrowserProject, project: Omit<Project, 'name'>): Project => ({
  name,
  testMatch: SPECS,
  ...(A11Y_PROJECTS.includes(name) ? {} : { testIgnore: A11Y_SUITE }),
  dependencies: ['setup'],
  ...project,
});

export default defineConfig<A11yOptions>({
  testDir: './tests',
  outputDir: './test-results/artifacts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : 3, // a shared public demo: be a polite client
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    // CaseWORKS-style console + logs/automation_framework.log, locally and on CI (run-logging skill).
    // `npx playwright test --reporter=list` still gives the stock console: the CLI flag replaces this list.
    ['./src/reporting/run-logger.ts'],
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
    a11yConfig: withEnvOverrides(a11yConfig),
  },

  projects: [
    { name: 'setup', testMatch: /setup\/.*\.setup\.ts/, teardown: 'teardown' },
    { name: 'teardown', testMatch: /setup\/.*\.teardown\.ts/ },
    browserProject('chromium', { use: { ...devices['Desktop Chrome'] } }),
    browserProject('firefox', { use: { ...devices['Desktop Firefox'] } }),
    browserProject('webkit', { use: { ...devices['Desktop Safari'] } }),
    browserProject('mobile-chrome', { grep: /@smoke/, use: { ...devices['Pixel 7'] } }),
  ],
});
