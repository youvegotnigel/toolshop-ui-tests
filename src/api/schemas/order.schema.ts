import { z } from 'zod';
import { IdSchema } from '../dialect';

const LineSchema = z.object({
  product_id: IdSchema,
  unit_price: z.number(),
  quantity: z.number().int().positive(),
});

/** "Credit Card" (legacy label) and "credit-card" (v5 value) are the same method. */
const methodKey = (method: string): string => method.trim().toLowerCase().replace(/\s+/g, '-');

/**
 * One invoice shape for both API dialects: v5 has billing_postal_code and payment.payment_method,
 * legacy has billing_postcode and a payment_method label.
 */
export const InvoiceSchema = z
  .object({
    id: IdSchema,
    invoice_number: z.string().regex(/^INV-\d+$/),
    /** null for a guest order. */
    user_id: IdSchema.nullable(),
    total: z.number(),
    billing_country: z.string().nullable(),
    billing_postal_code: z.string().nullable().optional(),
    billing_postcode: z.string().nullable().optional(),
    payment: z.object({ payment_method: z.string() }).nullable().optional(),
    payment_method: z.string().nullable().optional(),
    invoicelines: z.array(LineSchema).min(1),
  })
  .transform((raw) => ({
    id: raw.id,
    invoice_number: raw.invoice_number,
    user_id: raw.user_id,
    total: raw.total,
    billing_country: raw.billing_country,
    billing_postal_code: raw.billing_postal_code ?? raw.billing_postcode ?? null,
    payment_method: methodKey(raw.payment?.payment_method ?? raw.payment_method ?? ''),
    invoicelines: raw.invoicelines,
  }));

/** GET /invoices (the signed-in customer's own) and GET /invoices/search (admin), paginated. */
export const InvoicePageSchema = z.object({ data: z.array(InvoiceSchema) });

export type Invoice = z.infer<typeof InvoiceSchema>;
