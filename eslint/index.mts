import type { TSESLint } from '@typescript-eslint/utils';
import preferDataDrivenTests from './rules/prefer-data-driven-tests.mts';
import validDataDrivenTest from './rules/valid-data-driven-test.mts';

/** Local ESLint plugin with the team's test-authoring rules. Registered as `qe/*` in eslint.config.ts. */
const plugin = {
  meta: { name: 'eslint-plugin-qe', version: '1.0.0' },
  rules: {
    'prefer-data-driven-tests': preferDataDrivenTests,
    'valid-data-driven-test': validDataDrivenTest,
  },
} satisfies TSESLint.FlatConfig.Plugin;

export default plugin;
