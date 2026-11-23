import { after, describe, it } from 'node:test';
import { RuleTester } from '@typescript-eslint/rule-tester';
import preferDataDrivenTests from './prefer-data-driven-tests.mts';
import validDataDrivenTest from './valid-data-driven-test.mts';

// node:test returns promises the RuleTester hooks do not await; the runner tracks them itself.
RuleTester.afterAll = after;
RuleTester.describe = (name, fn) => {
  void describe(name, fn);
};
RuleTester.it = (name, fn) => {
  void it(name, fn);
};
RuleTester.itOnly = (name, fn) => {
  void it.only(name, fn);
};

const ruleTester = new RuleTester();

const copyPasted = (title: string, value: string): string => `
  test('${title}', async ({ client }) => {
    const res = await client.create({ slug: '${value}' });
    expect(res.status()).toBe(422);
  });`;

ruleTester.run('prefer-data-driven-tests', preferDataDrivenTests, {
  valid: [
    // Only two copies: below the default threshold of 3.
    copyPasted('a', '1') + copyPasted('b', '2'),
    // Same data shape but different steps.
    `${copyPasted('a', '1')}${copyPasted('b', '2')}
     test('c', async ({ client }) => {
       const res = await client.delete({ slug: '3' });
       expect(res.status()).toBe(422);
     });`,
    // Copies split across different describe blocks are not grouped.
    `test.describe('x', () => { ${copyPasted('a', '1')} ${copyPasted('b', '2')} });
     test.describe('y', () => { ${copyPasted('c', '3')} });`,
    // Trivial one-liners are ignored (minStatements).
    `test('a', () => { expect(1).toBe(1); });
     test('b', () => { expect(2).toBe(2); });
     test('c', () => { expect(3).toBe(3); });`,
    // Already data-driven.
    `for (const { reason } of cases) { ${copyPasted('x', 'y').replace("'x'", '`x ${reason}`')} }`,
  ],
  invalid: [
    {
      code: copyPasted('a', '1') + copyPasted('b', '2') + copyPasted('c', '3'),
      errors: [{ messageId: 'preferDataDriven' }, { messageId: 'preferDataDriven' }],
    },
    {
      code: copyPasted('a', '1') + copyPasted('b', '2'),
      options: [{ threshold: 2 }],
      errors: [{ messageId: 'preferDataDriven' }],
    },
  ],
});

ruleTester.run('valid-data-driven-test', validDataDrivenTest, {
  valid: [
    'for (const { reason } of cases) { test(`rejected when ${reason}`, async () => {}); }',
    "test('a normal test', async () => {});",
    // test.step inside a loop inside a test is fine: it is not a test registration.
    "test('x', async () => { for (const c of cases) { await test.step(c.name, async () => {}); } });",
  ],
  invalid: [
    {
      code: 'cases.forEach(({ reason }) => { test(`x ${reason}`, async () => {}); });',
      errors: [{ messageId: 'useForOf' }],
    },
    {
      code: 'for (let i = 0; i < cases.length; i++) { test(`x ${i}`, async () => {}); }',
      errors: [{ messageId: 'useForOf' }],
    },
    {
      code: "for (const c of cases) { test('same title every time', async () => {}); }",
      errors: [{ messageId: 'dynamicTitle' }],
    },
    {
      code: 'for (const c of cases) { test(`no expressions`, async () => {}); }',
      errors: [{ messageId: 'dynamicTitle' }],
    },
    {
      code: "for (const c of cases) { if (c.reason === 'x') { test(`x ${c.reason}`, async () => {}); } }",
      errors: [{ messageId: 'noBranchPerCase' }],
    },
  ],
});
