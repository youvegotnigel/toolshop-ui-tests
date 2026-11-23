import { z } from 'zod';

export const TokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  expires_in: z.number().positive(),
});

export const StatusSchema = z.object({ version: z.string(), environment: z.string(), app_name: z.string() });

export type Token = z.infer<typeof TokenSchema>;
export type Credentials = { email: string; password: string };
export type Role = 'admin' | 'customer';
