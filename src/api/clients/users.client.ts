import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import { NO_CACHE } from '../../utils/http';
import { apiDialect } from '../dialect';
import type { RegisteredUser, UserRegistration } from '../schemas/user.schema';

/** The legacy API (with-bugs) takes the address as flat fields with `address` as the street line. */
const registrationBody = (user: UserRegistration): Record<string, unknown> => {
  const { address, ...rest } = user;
  if (address === undefined || apiDialect() === 'v5') return { ...user };
  return {
    ...rest,
    address: `${address.street} ${address.house_number}`,
    city: address.city,
    state: address.state,
    country: address.country,
    postcode: address.postal_code,
  };
};

/** Register is public; search and delete need an admin. */
export class UsersClient extends BaseClient {
  register(user: UserRegistration): Promise<APIResponse<RegisteredUser>> {
    return this.request.post<RegisteredUser>('/users/register', { data: registrationBody(user) });
  }

  search(query: string): Promise<APIResponse> {
    return this.request.get('/users/search', { params: { q: query }, headers: NO_CACHE });
  }

  /** 409 "used elsewhere" while the customer still has orders (invoices cannot be deleted). */
  remove(id: string): Promise<APIResponse> {
    return this.request.delete(`/users/${id}`);
  }
}
