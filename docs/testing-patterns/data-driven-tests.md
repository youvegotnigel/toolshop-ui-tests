# Data-driven tests

> **One test, many rows of data.** If several tests have the same steps and only the data changes, write the
> steps once and loop over a table of cases.

## The idea in 30 seconds

Think of a passport office clerk who checks application forms. To test the clerk, you hand over a pile of
forms, each with **one deliberate mistake**, and check two things for every form:

1. Did the clerk **reject** it?
2. Did the clerk point at the **right box**?

The checking steps never change. Only the form does. So you write the steps **once** and run them **for each
form in the pile**.

| Passport office      | Our code                                                          |
| -------------------- | ----------------------------------------------------------------- |
| The pile of forms    | The cases table (`invalidSignIns` in `src/data/sign-in.cases.ts`) |
| One form             | One row: `{ reason, field, input, message }`                      |
| The clerk            | The sign-in form                                                  |
| "Check this form"    | `for (const { reason, field, input, message } of invalidSignIns)` |
| REJECTED stamp       | No session is created                                             |
| "Problem: email box" | `email-error` shows "Email is required", and it is the only error |

## The template

The table lives in `src/data/<thing>.cases.ts` (data never lives in specs here):

```ts
import type { SignInDetails } from '../pages/login.page';
import type { FormValidationCase } from './test-cases';

const validSignIn = {
  email: 'qa-validation@example.com',
  password: 'Valid-Passw0rd',
} as const satisfies SignInDetails;

// 1. The table: one row = one broken field
export const invalidSignIns = [
  {
    reason: 'the email is missing',
    field: 'email',
    input: { ...validSignIn, email: '' },
    message: 'Email is required',
  },
  {
    reason: 'the password is too short',
    field: 'password',
    input: { ...validSignIn, password: 'ab' },
    message: 'Password length is invalid',
  },
] as const satisfies readonly FormValidationCase<SignInDetails>[];
```

The spec (`tests/auth/login-validation.spec.ts`):

```ts
import { test, expect } from '../../src/fixtures';
import { invalidSignIns } from '../../src/data/sign-in.cases';

test.describe(
  'auth.login-validation: The sign-in form rejects invalid details before sending them',
  { tag: ['@auth', '@negative'] },
  () => {
    // 2. The loop: for...of, unpack the row
    for (const { reason, field, input, message } of invalidSignIns) {
      // 3. The title: a template literal with the reason, so each test has its own name
      test(
        `a shopper cannot sign in when ${reason}`,
        { annotation: [{ type: 'covers', description: 'page:sign-in' }] },
        async ({ loginPage }) => {
          await test.step('A shopper opens the sign-in page', async () => {
            await loginPage.open();
          });
          await test.step(`They try to sign in when ${reason}`, async () => {
            await loginPage.attemptSignIn(input);
          });
          // 4. The checks: rejected AND rejected for the right field
          await test.step(`The form flags the ${field} with "${message}" and no session starts`, async () => {
            await expect(loginPage.fieldError(field)).toHaveText(message);
            await expect(loginPage.errors).toHaveCount(1);
            await expect.poll(() => loginPage.hasStoredSession()).toBe(false);
          });
        },
      );
    }
  },
);
```

The report shows one test per row:

```
✓ auth.login-validation: … › a shopper cannot sign in when the email is missing
✓ auth.login-validation: … › a shopper cannot sign in when the email is not an email address
✓ auth.login-validation: … › a shopper cannot sign in when the password is missing
✓ auth.login-validation: … › a shopper cannot sign in when the password is too short
```

## The 6 rules

1. **Same steps, different data → table.** Three or more tests with identical steps must become a table. The
   linter enforces this.
2. **One row = one broken thing.** Start from a valid object (`validSignIn`) and break exactly one field. If a row
   breaks two things, a failure cannot tell you which one the form caught.
3. **Use `for...of` with destructuring.** No `forEach`, `map`, `for (let i ...)` or `while`. The linter enforces this.
4. **The title must use the row data.** `` `cannot sign in when ${reason}` ``. A fixed title makes every generated
   test look the same in the report. The linter enforces this.
5. **No `if` per row.** If one row needs different steps, it is a different test or a different table. The linter
   enforces this both around and inside the test. Map a row to a locator in the page object instead
   (`loginPage.fieldError(field)`).
6. **Type the table.** `as const satisfies readonly FormValidationCase<SignInDetails>[]` means a typo like
   `field: 'emial'` is a compile error, not a passing test that checks nothing.

## When NOT to use it

- **The steps differ.** Add-then-remove is not the same test as add-then-change-quantity.
- **You have only one or two cases.** A loop over two rows is harder to read than two plain tests. The linter only
  kicks in at 3.
- **You would need flags on the row** like `expectSuccess: true` or `skipCleanup: true`. Flags mean the steps
  differ. Split it.
- **Each row needs fresh, unique data on every run or retry** (a product, a customer, the run tag). The table is
  built once, when Playwright **loads** the file, not when each test runs. Take that data from a fixture
  (`createdProduct`, `createCustomer`) inside the test and keep only static values in the table.
- **The cases share one session and build on each other.** `tests/catalog/sort.spec.ts` sorts the same search
  results twice: that is one test with a `for...of` over `test.step`s, not a table of tests.

## What the linter tells you, and how to fix it

### `qe/prefer-data-driven-tests`

> This test has the same steps as 2 other test(s) in this block; only the data differs.

You copy-pasted a test and changed the values. Move the values into a table, keep one copy of the steps, and
loop. The rule compares tests in the same `describe` block, ignoring strings and numbers; 3 or more identical
ones are flagged. Tests with only one statement are ignored, and tests that differ in identifiers
(`cartPage` vs `productPage`) are not grouped.

### `qe/valid-data-driven-test`

| Message                                                                     | Fix                                                                                    |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Register data-driven tests with `for (const { ... } of cases)`              | Replace `cases.forEach(...)` or `for (let i ...)` with `for (const { a, b } of cases)` |
| A test inside a loop needs a template literal title that uses the case data | `'rejected'` → `` `rejected when ${reason}` ``                                         |
| Do not branch per case around a generated test                              | Remove the `if`. Split the rows that need different steps into their own table or test |

The rules live in `eslint/rules/`, are registered as `qe/*` in `eslint.config.mjs` for `tests/**`, and are
tested with `npm run test:lint-rules` (part of `npm run verify`).

### Escape hatch

If you really believe the rule is wrong for your case, disable it **on that line with a reason**:

```ts
// eslint-disable-next-line qe/prefer-data-driven-tests -- each test signs in a different shopper type
```

A disable without a `-- reason` fails the lint. Reviewers will challenge the reason, so make it a good one.

## Reviewer checklist

The linter covers the mechanical parts. These need a human:

- [ ] Does each row break **exactly one** thing?
- [ ] Do the `reason` texts read well in a report? ("cannot sign in when **the password is too short**")
- [ ] Does the test check the **right field or value**, not just that something failed?
- [ ] Is anything in the table something that should be fresh per run? If so, move it into a fixture.
- [ ] Is a table being forced onto tests whose steps actually differ?
- [ ] Does any `eslint-disable` have a reason you agree with?

## Same idea, other tools

| Tool          | Name                                                              |
| ------------- | ----------------------------------------------------------------- |
| TestNG        | `@DataProvider`                                                   |
| JUnit 5       | `@ParameterizedTest` + `@MethodSource`                            |
| Cucumber      | `Scenario Outline` + `Examples:` table                            |
| Jest / Vitest | `test.each`                                                       |
| Playwright    | a `for...of` loop around `test()` (Playwright has no `test.each`) |
