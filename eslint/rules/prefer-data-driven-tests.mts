import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import {
  countStatements,
  findEnclosingArrayIteration,
  findEnclosingLoop,
  fingerprint,
  getTestCallback,
  isTestCall,
} from './utils.mts';

type Options = [{ threshold?: number; minStatements?: number; testNames?: string[] }];
type MessageIds = 'preferDataDriven';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/youvegotnigel/toolshop-ui-tests/blob/main/docs/testing-patterns/data-driven-tests.md#${name}`,
);

/**
 * Flags copy-pasted tests: sibling tests whose bodies are identical
 * except for literal values. Those should be one test looped over a cases table.
 */
export default createRule<Options, MessageIds>({
  name: 'prefer-data-driven-tests',
  meta: {
    defaultOptions: [{ threshold: 3, minStatements: 2, testNames: ['test'] }],
    type: 'suggestion',
    docs: {
      description:
        'Require a cases table + for...of loop instead of copy-pasted tests that differ only in data',
    },
    messages: {
      preferDataDriven:
        'This test has the same steps as {{count}} other test(s) in this block (first one on line {{firstLine}}); only the data differs. ' +
        'Move the data into a cases table and register the test once with for...of.',
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          threshold: { type: 'integer', minimum: 2 },
          minStatements: { type: 'integer', minimum: 1 },
          testNames: { type: 'array', items: { type: 'string' } },
        },
      },
    ],
  },

  create(context, [options]) {
    const threshold = options.threshold ?? 3;
    const minStatements = options.minStatements ?? 2;
    const testNames = options.testNames ?? ['test'];

    /** block -> fingerprint -> test calls with that fingerprint */
    const groups = new Map<TSESTree.Node, Map<string, TSESTree.CallExpression[]>>();

    return {
      CallExpression(node): void {
        if (!isTestCall(node, testNames) || findEnclosingLoop(node) || findEnclosingArrayIteration(node)) {
          return;
        }

        const callback = getTestCallback(node);
        const statement = node.parent;

        if (!callback || statement.type !== AST_NODE_TYPES.ExpressionStatement) {
          return;
        }

        if (countStatements(callback.body) < minStatements) {
          return;
        }

        const key = fingerprint({ params: callback.params, body: callback.body });
        const byFingerprint = groups.get(statement.parent) ?? new Map<string, TSESTree.CallExpression[]>();
        byFingerprint.set(key, [...(byFingerprint.get(key) ?? []), node]);
        groups.set(statement.parent, byFingerprint);
      },

      'Program:exit'(): void {
        for (const byFingerprint of groups.values()) {
          for (const tests of byFingerprint.values()) {
            if (tests.length < threshold) {
              continue;
            }

            const [first, ...duplicates] = tests;
            if (!first) {
              continue;
            }

            for (const duplicate of duplicates) {
              context.report({
                node: duplicate.callee,
                messageId: 'preferDataDriven',
                data: { count: tests.length - 1, firstLine: first.loc.start.line },
              });
            }
          }
        }
      },
    };
  },
});
