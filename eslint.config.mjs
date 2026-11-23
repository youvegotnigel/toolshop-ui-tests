// @ts-check
// Review-friendly, type-aware lint rules. CI and the pre-commit hook run with --max-warnings=0.
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Every test body must describe its flow with test.step (readable reports for managers). */
const TEST_WITHOUT_STEP =
  "CallExpression[callee.name='test'] > :matches(ArrowFunctionExpression, FunctionExpression)" +
  ":not(:has(CallExpression[callee.object.name='test'][callee.property.name='step']))";

/** Locator hygiene that applies wherever a Page is touched: specs, page objects and components. */
const PLAYWRIGHT_HYGIENE = {
  'playwright/no-wait-for-timeout': 'error',
  'playwright/no-wait-for-selector': 'error',
  'playwright/no-force-option': 'error',
  'playwright/no-networkidle': 'error',
  'playwright/no-element-handle': 'error',
  'playwright/no-page-pause': 'error',
  'playwright/no-eval': 'error',
  'playwright/prefer-locator': 'error',
  'playwright/no-raw-locators': 'error',
  'playwright/missing-playwright-await': 'error',
};

export default defineConfig(
  globalIgnores([
    'node_modules/',
    'playwright-report/',
    'blob-report/',
    'all-blob-reports/',
    'test-results/',
    'allure-results/',
    'allure-report/',
    'allure-history/',
    'coverage-history/',
    'site/',
  ]),

  // Plain JavaScript: hooks, this file
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // TypeScript everywhere: strict, type-aware
  {
    files: ['**/*.{ts,mts}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      comments.recommended,
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // `type` everywhere: Playwright's test.extend<T> needs index-compatible object types
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@eslint-community/eslint-comments/require-description': ['error', { ignore: [] }],
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-param-reassign': 'error',
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 5],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },

  // Framework code: explicit contracts at every module boundary
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
    },
  },

  // Page objects and components: locators and intentions only
  {
    files: ['src/pages/**/*.ts', 'src/components/**/*.ts'],
    plugins: { playwright },
    rules: {
      ...PLAYWRIGHT_HYGIENE,
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/api/**', '**/fixtures/**', '**/data/**'],
              allowTypeImports: true,
              message: 'Page objects never call the API or create data (type imports are fine).',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MethodDefinition[key.name!='waitForReady'] CallExpression[callee.name='expect']",
          message: 'No assertions in page objects: only waitForReady() may wait with a web-first expect.',
        },
        {
          selector: "PropertyDefinition CallExpression[callee.name='expect']",
          message: 'No assertions in page objects: only waitForReady() may wait with a web-first expect.',
        },
        {
          selector: "CallExpression[callee.property.name='goto'] > Literal[value=/^https?:/]",
          message: 'Navigate with paths relative to baseURL, so TEST_ENV can switch sites.',
        },
      ],
    },
  },
  {
    files: ['src/pages/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MethodDefinition[key.name!='waitForReady'] CallExpression[callee.name='expect']",
          message: 'No assertions in page objects: only waitForReady() may wait with a web-first expect.',
        },
        {
          selector: "PropertyDefinition CallExpression[callee.name='expect']",
          message: 'No assertions in page objects: only waitForReady() may wait with a web-first expect.',
        },
        {
          selector: "CallExpression[callee.property.name='goto'] > Literal[value=/^https?:/]",
          message: 'Navigate with paths relative to baseURL, so TEST_ENV can switch sites.',
        },
        {
          selector: "MethodDefinition[kind='constructor'] > FunctionExpression[params.length>1]",
          message: 'Page object constructors take Page only (components may take a scope too).',
        },
      ],
    },
  },

  // Specs: Playwright best practices and framework guardrails
  {
    files: ['tests/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      ...PLAYWRIGHT_HYGIENE,
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': ['error', { allowConditional: true }],
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-conditional-expect': 'error',
      'playwright/no-nested-step': 'error',
      'playwright/max-nested-describe': ['error', { max: 1 }],
      'playwright/require-top-level-describe': 'error',
      'playwright/require-tags': 'error',
      'playwright/prefer-web-first-assertions': 'error',
      'playwright/no-useless-not': 'error',
      'playwright/valid-title': 'error',
      'playwright/no-identical-title': 'error',
      'playwright/expect-expect': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              message: "Import { test, expect } from 'src/fixtures' so fixtures are always available.",
            },
          ],
          patterns: [
            { group: ['**/api/clients/**'], message: 'Specs get API helpers from fixtures, never clients.' },
            {
              group: ['**/pages/**', '**/components/**'],
              importNamePattern: '^(?!.*Type$)',
              message: 'Page objects come from fixtures; import types only.',
              allowTypeImports: true,
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: TEST_WITHOUT_STEP,
          message: 'Describe the flow with test.step(...) so reports read as business steps.',
        },
        {
          selector:
            'ArrowFunctionExpression > ObjectPattern > Property[key.name=/^(request|playwright|api|adminApi|customerApi|context|browser)$/]',
          message: 'Specs never call the API or build contexts: use data fixtures and page fixtures.',
        },
        {
          selector: "CallExpression[callee.property.name='goto']",
          message: 'Specs never navigate by URL: use a page object method (homePage.open()).',
        },
        {
          selector: 'NewExpression[callee.name=/(Page|Step|Component)$/]',
          message: 'Specs never create page objects: request them as fixtures.',
        },
        {
          selector: "NewExpression[callee.name='Promise'] CallExpression[callee.name='setTimeout']",
          message: 'No sleeps: rely on auto-waiting and web-first assertions.',
        },
      ],
    },
  },

  // Setup and teardown projects are single, untagged tests that only use the API by design
  {
    files: ['tests/setup/**/*.ts'],
    rules: { 'playwright/require-top-level-describe': 'off', 'playwright/require-tags': 'off' },
  },

  // Places allowed to write to the console
  {
    files: ['src/utils/logger.ts', 'scripts/**'],
    rules: { 'no-console': 'off' },
  },

  prettier,
);
