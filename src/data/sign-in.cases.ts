import type { SignInDetails } from '../pages/login.page';
import type { FormValidationCase } from './test-cases';

/**
 * Passes the sign-in form's own checks. It is never submitted to the API: every row below breaks one field,
 * and the form refuses to send it. The reserved example.com domain guarantees it is nobody's account.
 */
const validSignIn = {
  email: 'qa-validation@example.com',
  password: 'Valid-Passw0rd',
} as const satisfies SignInDetails;

/** One row = one broken field. Messages are the form's documented validation copy (AGENTS.md, Toolshop facts). */
export const invalidSignIns = [
  {
    reason: 'the email is missing',
    field: 'email',
    input: { ...validSignIn, email: '' },
    message: 'Email is required',
  },
  {
    reason: 'the email is not an email address',
    field: 'email',
    input: { ...validSignIn, email: 'not-an-email' },
    message: 'Email format is invalid',
  },
  {
    reason: 'the password is missing',
    field: 'password',
    input: { ...validSignIn, password: '' },
    message: 'Password is required',
  },
  {
    reason: 'the password is too short',
    field: 'password',
    input: { ...validSignIn, password: 'ab' },
    message: 'Password length is invalid',
  },
] as const satisfies readonly FormValidationCase<SignInDetails>[];
