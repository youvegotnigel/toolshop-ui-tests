import { defineConfig } from '@playwright/test';
import { smartReporter } from './src/reporting/smart-report';

/**
 * Used by the CI merge-reports job: one HTML report, JSON (dashboard input), JUnit, the failure
 * summary and the smart report across every browser shard.
 *   npx playwright merge-reports --config merge.config.ts ./all-blob-reports
 */
export default defineConfig({
  testDir: './tests',
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['./src/reporting/failure-tracker.ts'],
    smartReporter,
  ],
});
