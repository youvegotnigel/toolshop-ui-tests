import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import type { Credentials, Token } from '../schemas/auth.schema';

export class AuthClient extends BaseClient {
  login(credentials: Credentials): Promise<APIResponse<Token>> {
    return this.request.post<Token>('/users/login', { data: credentials });
  }
}
