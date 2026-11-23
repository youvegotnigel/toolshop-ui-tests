import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import { NO_CACHE } from '../../utils/http';

/** Carts belong to the browser session; invoices to the signed-in customer. Invoices cannot be deleted. */
export class OrdersClient extends BaseClient {
  removeCart(id: string): Promise<APIResponse> {
    return this.request.delete(`/carts/${id}`);
  }

  myInvoices(): Promise<APIResponse> {
    return this.request.get('/invoices', { headers: NO_CACHE });
  }

  /** Admin only: every invoice matching the query (e.g. an invoice number), guest orders included. */
  searchInvoices(query: string): Promise<APIResponse> {
    return this.request.get('/invoices/search', { params: { q: query }, headers: NO_CACHE });
  }
}
