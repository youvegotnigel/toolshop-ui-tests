import type { SavedAddress } from '../../data/checkout.data';
import { z } from 'zod';
import { IdSchema } from '../dialect';

/** Response of POST /users/register. */
export const RegisteredUserSchema = z.object({
  id: IdSchema,
  email: z.string().min(1),
  first_name: z.string(),
  last_name: z.string(),
});

/** GET /users/search is a Laravel paginator. */
export const UserPageSchema = z.object({ data: z.array(RegisteredUserSchema) });

export type RegisteredUser = z.infer<typeof RegisteredUserSchema>;

const optionalText = z
  .union([z.string(), z.number()])
  .nullable()
  .optional()
  .transform((value) => (value === null || value === undefined ? null : String(value)));

/**
 * GET /users/me: the stored account. v5 nests the address (with a house number); the legacy API
 * (with-bugs) has flat fields and `postcode`. Both are read as one shape.
 */
export const AccountSchema = z
  .object({
    id: IdSchema,
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    dob: optionalText,
    phone: optionalText,
    address: z
      .union([
        z.object({ house_number: optionalText, country: optionalText, postal_code: optionalText }),
        z.string(),
      ])
      .nullable()
      .optional(),
    country: optionalText,
    postcode: optionalText,
  })
  .transform(({ address, country, postcode, ...user }) => ({
    ...user,
    address:
      typeof address === 'object' && address !== null
        ? address
        : { house_number: null, country, postal_code: postcode },
  }));

export type Account = z.infer<typeof AccountSchema>;

export type UserRegistration = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  dob: string;
  phone?: string;
  address?: SavedAddress;
};
