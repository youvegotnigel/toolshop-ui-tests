import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

const TEST_MODIFIERS = new Set(['only', 'skip', 'fixme', 'fail', 'slow']);

/**
 * True for `test(...)`, `test.only(...)`, `test.skip(...)` etc.
 * False for `test.step`, `test.describe`, hooks and anything else.
 */
export function isTestCall(node: TSESTree.CallExpression, testNames: readonly string[]): boolean {
  const { callee } = node;

  if (callee.type === AST_NODE_TYPES.Identifier) {
    return testNames.includes(callee.name);
  }

  return (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    callee.object.type === AST_NODE_TYPES.Identifier &&
    testNames.includes(callee.object.name) &&
    callee.property.type === AST_NODE_TYPES.Identifier &&
    TEST_MODIFIERS.has(callee.property.name)
  );
}

/** The test body: the last argument when it is a function. */
export function getTestCallback(
  node: TSESTree.CallExpression,
): TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression | undefined {
  const last = node.arguments.at(-1);

  return last?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    last?.type === AST_NODE_TYPES.FunctionExpression
    ? last
    : undefined;
}

const LOOP_TYPES = new Set<string>([
  AST_NODE_TYPES.ForOfStatement,
  AST_NODE_TYPES.ForInStatement,
  AST_NODE_TYPES.ForStatement,
  AST_NODE_TYPES.WhileStatement,
  AST_NODE_TYPES.DoWhileStatement,
]);

/** The nearest enclosing loop statement, if any. */
export function findEnclosingLoop(node: TSESTree.Node): TSESTree.Node | undefined {
  let current = node.parent;

  while (current) {
    if (LOOP_TYPES.has(current.type)) {
      return current;
    }
    current = current.parent;
  }

  return undefined;
}

/** The `.forEach(...)` / `.map(...)` call this test is registered inside, if any. */
export function findEnclosingArrayIteration(node: TSESTree.Node): TSESTree.CallExpression | undefined {
  let current = node.parent;

  while (current) {
    if (
      current.type === AST_NODE_TYPES.CallExpression &&
      current.callee.type === AST_NODE_TYPES.MemberExpression &&
      current.callee.property.type === AST_NODE_TYPES.Identifier &&
      ['forEach', 'map'].includes(current.callee.property.name)
    ) {
      return current;
    }
    current = current.parent;
  }

  return undefined;
}

/** Nodes whose value is data, not structure. */
const LITERAL_TYPES = new Set<string>([AST_NODE_TYPES.Literal, AST_NODE_TYPES.TemplateElement]);

const SKIPPED_KEYS = new Set(['parent', 'loc', 'range', 'raw', 'value', 'regex', 'bigint', 'cooked']);

/**
 * Structural fingerprint of a node: same shape and same identifiers,
 * but every literal value (string, number, template text) replaced by "?".
 * Two tests that differ only in data get the same fingerprint.
 */
export function fingerprint(node: unknown): string {
  if (Array.isArray(node)) {
    return `[${node.map(fingerprint).join(',')}]`;
  }

  if (node === null || typeof node !== 'object') {
    return String(node);
  }

  const record = node as Record<string, unknown>;

  if (typeof record.type === 'string' && LITERAL_TYPES.has(record.type)) {
    return `${record.type}(?)`;
  }

  const parts = Object.keys(record)
    .filter((key) => !SKIPPED_KEYS.has(key))
    .map((key) => `${key}:${fingerprint(record[key])}`);

  return `{${parts.join(',')}}`;
}

const BLOCK: string = AST_NODE_TYPES.BlockStatement;
const DECLARATION: string = AST_NODE_TYPES.VariableDeclaration;

const isCountedStatement = (type: string): boolean =>
  type !== BLOCK && (type.endsWith('Statement') || type === DECLARATION);

/** Number of real statements anywhere inside the node (used to ignore trivial one-line tests). */
export function countStatements(node: unknown): number {
  if (Array.isArray(node)) {
    return node.reduce<number>((sum, child) => sum + countStatements(child), 0);
  }

  if (node === null || typeof node !== 'object') {
    return 0;
  }

  const record = node as Record<string, unknown>;
  const self = typeof record.type === 'string' && isCountedStatement(record.type) ? 1 : 0;

  return Object.keys(record)
    .filter((key) => key !== 'parent')
    .reduce((sum, key) => sum + countStatements(record[key]), self);
}
