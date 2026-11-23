import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { findEnclosingArrayIteration, findEnclosingLoop, isTestCall } from './utils.mts';

type Options = [{ testNames?: string[] }];
type MessageIds = 'useForOf' | 'dynamicTitle' | 'noBranchPerCase';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/youvegotnigel/toolshop-ui-tests/blob/main/docs/testing-patterns/data-driven-tests.md#${name}`,
);

const BRANCH_TYPES = new Set<string>([
  AST_NODE_TYPES.IfStatement,
  AST_NODE_TYPES.SwitchStatement,
  AST_NODE_TYPES.ConditionalExpression,
]);

/** A template literal with at least one expression, so each generated test gets its own name. */
const isDynamicTitle = (title: TSESTree.CallExpressionArgument | undefined): boolean =>
  title?.type === AST_NODE_TYPES.TemplateLiteral && title.expressions.length > 0;

/**
 * Enforces the shape of a data-driven test once you have one:
 *  - registered with for...of (not forEach/map/for(;;)/while)
 *  - a template literal title that includes case data, so every generated test has a unique, readable name
 *  - no if/switch per case around the test (split the table instead)
 */
export default createRule<Options, MessageIds>({
  name: 'valid-data-driven-test',
  meta: {
    defaultOptions: [{ testNames: ['test'] }],
    type: 'problem',
    docs: { description: 'Enforce the house shape for tests generated from a cases table' },
    messages: {
      useForOf:
        'Register data-driven tests with `for (const { ... } of cases)`. forEach/map/index loops are harder to read and debug.',
      dynamicTitle:
        'A test inside a loop needs a template literal title that uses the case data, e.g. `rejected when ${reason}`. ' +
        'Otherwise every generated test gets the same name.',
      noBranchPerCase:
        'Do not branch per case around a generated test. If some cases need different steps, they belong in a separate table or test.',
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: { testNames: { type: 'array', items: { type: 'string' } } },
      },
    ],
  },

  create(context, [options]) {
    const testNames = options.testNames ?? ['test'];

    const hasBranchBetween = (from: TSESTree.Node, to: TSESTree.Node): boolean => {
      let current = from.parent;
      while (current && current !== to) {
        if (BRANCH_TYPES.has(current.type)) {
          return true;
        }
        current = current.parent;
      }
      return false;
    };

    return {
      CallExpression(node): void {
        if (!isTestCall(node, testNames)) {
          return;
        }

        const iteration = findEnclosingArrayIteration(node);
        const loop = findEnclosingLoop(node);

        if (iteration || (loop && loop.type !== AST_NODE_TYPES.ForOfStatement)) {
          context.report({ node: node.callee, messageId: 'useForOf' });
          return;
        }

        if (!loop) {
          return;
        }

        const [title] = node.arguments;

        if (!isDynamicTitle(title)) {
          context.report({ node: title ?? node.callee, messageId: 'dynamicTitle' });
        }

        if (hasBranchBetween(node, loop)) {
          context.report({ node: node.callee, messageId: 'noBranchPerCase' });
        }
      },
    };
  },
});
