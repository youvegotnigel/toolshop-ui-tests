import { z } from 'zod';

export const InvoiceLineSchema = z.object({
  product_id: z.string(),
  unit_price: z.number(),
  quantity: z.number().int().positive(),
});

export const InvoiceSchema = z.object({
  id: z.string().min(1),
  invoice_number: z.string().regex(/^INV-\d+$/),
  user_id: z.string(),
  total: z.number(),
  billing_country: z.string().nullable(),
  billing_postal_code: z.string().nullable(),
  billing_street: z.string().nullable(),
  invoicelines: z.array(InvoiceLineSchema).min(1),
  payment: z.object({ payment_method: z.string() }).nullable(),
});

/** GET /invoices: the signed-in customer's own invoices, paginated. */
export const InvoicePageSchema = z.object({ data: z.array(InvoiceSchema) });

export type Invoice = z.infer<typeof InvoiceSchema>;
