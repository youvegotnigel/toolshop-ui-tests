import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import { NO_CACHE } from '../../utils/http';
import type { RegisteredUser, UserRegistration } from '../schemas/user.schema';

/** Register is public; search and delete need an admin. */
export class UsersClient extends BaseClient {
  register(user: UserRegistration): Promise<APIResponse<RegisteredUser>> {
    return this.request.post<RegisteredUser>('/users/register', { data: user });
  }

  search(query: string): Promise<APIResponse> {
    return this.request.get('/users/search', { params: { q: query }, headers: NO_CACHE });
  }

  /** 409 "used elsewhere" while the customer still has orders (invoices cannot be deleted). */
  remove(id: string): Promise<APIResponse> {
    return this.request.delete(`/users/${id}`);
  }
}
