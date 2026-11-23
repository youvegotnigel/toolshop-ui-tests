import type { SavedAddress } from '../../data/checkout.data';
import { z } from 'zod';

/** Response of POST /users/register. */
export const RegisteredUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  first_name: z.string(),
  last_name: z.string(),
});

/** GET /users/search is a Laravel paginator. */
export const UserPageSchema = z.object({ data: z.array(RegisteredUserSchema) });

export type RegisteredUser = z.infer<typeof RegisteredUserSchema>;

export type UserRegistration = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  dob: string;
  phone?: string;
  address?: SavedAddress;
};
