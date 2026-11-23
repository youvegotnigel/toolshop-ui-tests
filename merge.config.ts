import { defineConfig } from '@playwright/test';

/**
 * Used by the CI merge-reports job: one HTML report, JSON (dashboard input), JUnit and the failure
 * summary across every browser shard.
 *   npx playwright merge-reports --config merge.config.ts ./all-blob-reports
 */
export default defineConfig({
  testDir: './tests',
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['./src/reporting/failure-tracker.ts'],
  ],
});
