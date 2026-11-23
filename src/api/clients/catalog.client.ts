import type { APIResponse } from '@playwright/test';
import { BaseClient } from './base.client';
import { NO_CACHE } from '../../utils/http';
import type { BrandInput, CategoryInput, ProductInput } from '../schemas/catalog.schema';

/** Creating brands, categories and products is public; deleting needs an admin. */
export class CatalogClient extends BaseClient {
  createBrand(brand: BrandInput): Promise<APIResponse> {
    return this.request.post('/brands', { data: brand });
  }

  listBrands(): Promise<APIResponse> {
    return this.request.get('/brands', { headers: NO_CACHE });
  }

  removeBrand(id: string): Promise<APIResponse> {
    return this.request.delete(`/brands/${id}`);
  }

  createCategory(category: CategoryInput): Promise<APIResponse> {
    return this.request.post('/categories', { data: category });
  }

  listCategories(): Promise<APIResponse> {
    return this.request.get('/categories', { headers: NO_CACHE });
  }

  removeCategory(id: string): Promise<APIResponse> {
    return this.request.delete(`/categories/${id}`);
  }

  images(): Promise<APIResponse> {
    return this.request.get('/images');
  }

  createProduct(product: ProductInput): Promise<APIResponse> {
    return this.request.post('/products', { data: product });
  }

  /** Name search, as the storefront uses it (full-text). No-cache, so readiness checks see fresh results. */
  searchProducts(word: string): Promise<APIResponse> {
    return this.request.get('/products/search', { params: { q: word }, headers: NO_CACHE });
  }

  productsInCategory(slug: string, page = 1): Promise<APIResponse> {
    return this.request.get('/products', { params: { by_category_slug: slug, page }, headers: NO_CACHE });
  }

  /** 409 while an order line still references the product. */
  removeProduct(id: string): Promise<APIResponse> {
    return this.request.delete(`/products/${id}`);
  }
}
