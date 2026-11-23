import { z } from 'zod';
import { IdSchema } from '../dialect';

export const BrandSchema = z.object({ id: IdSchema, name: z.string().min(1), slug: z.string() });
export const BrandListSchema = z.array(BrandSchema);

export const CategorySchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  slug: z.string(),
  parent_id: IdSchema.nullable(),
});
export const CategoryListSchema = z.array(CategorySchema);

export const ImageListSchema = z.array(z.object({ id: IdSchema }));

export const ProductSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  price: z.number().nonnegative(),
  /** Embedded by v5 only; tests compare against the brand and category they created. */
  brand: z.object({ id: IdSchema, name: z.string() }).optional(),
  category: z.object({ id: IdSchema, name: z.string() }).optional(),
});

/** GET /products is paginated, 9 per page. */
export const ProductPageSchema = z.object({ data: z.array(ProductSchema), last_page: z.number().int() });

export type Brand = z.infer<typeof BrandSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Product = z.infer<typeof ProductSchema>;

export type BrandInput = { name: string; slug: string };
export type CategoryInput = { name: string; slug: string; parent_id: string | null };
export type ProductInput = {
  name: string;
  description: string;
  price: number;
  /** Without stock a new product shows "Out of stock" and cannot be added to the cart. */
  stock: number;
  brand_id: string;
  category_id: string;
  product_image_id: string;
  is_location_offer: boolean;
  is_rental: boolean;
};
