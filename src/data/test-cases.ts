/**
 * Types for data-driven test tables: one `test()` registered per row with `for (const { ... } of cases)`.
 * Guide: docs/testing-patterns/data-driven-tests.md
 */

/** One row in a cases table. */
export type TestCase = {
  /** Finishes the sentence "... when <reason>". Unique in its table: it becomes the test title. */
  readonly reason: string;
};

/**
 * A form that must reject `input` and flag `field` with `message` before anything is sent.
 * `field` is checked against the form's keys, so a typo is a compile error.
 *
 * @example
 * const invalidSignIns = [
 *   { reason: 'the email is missing', field: 'email', input: { ...validSignIn, email: '' }, message: '...' },
 * ] as const satisfies readonly FormValidationCase<SignInDetails>[];
 */
export type FormValidationCase<TForm extends object> = TestCase & {
  readonly field: Extract<keyof TForm, string>;
  readonly input: TForm;
  readonly message: string;
};
