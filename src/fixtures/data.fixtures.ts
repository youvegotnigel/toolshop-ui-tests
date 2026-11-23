import { expect, type APIResponse } from '@playwright/test';
import { test as apiTest } from './api.fixtures';
import { registerCustomer, type Customer } from './auth.fixtures';
import { AuthClient } from '../api/clients/auth.client';
import { OrdersClient } from '../api/clients/orders.client';
import { UsersClient } from '../api/clients/users.client';
import { TokenSchema, type Credentials } from '../api/schemas/auth.schema';
import {
  BrandSchema,
  CategorySchema,
  ImageListSchema,
  ProductPageSchema,
  ProductSchema,
  type Brand,
  type Category,
  type Product,
  type ProductInput,
} from '../api/schemas/catalog.schema';
import { InvoicePageSchema, type Invoice } from '../api/schemas/order.schema';
import { AccountSchema, UserPageSchema, type Account } from '../api/schemas/user.schema';
import { buildBrand, buildCategory, buildProduct, distinctPrices } from '../data/catalog.builder';
import { searchToken } from '../data/test-data';
import { HTTP } from '../utils/http';
import { createLogger } from '../utils/logger';

const logger = createLogger('DataFixtures');

export type Cleanup = { add: (label: string, task: () => Promise<APIResponse | null>) => void };

/** What a product was built from: tests compare the UI against it. */
export type NewProduct = {
  product: Product;
  input: ProductInput;
  brand: Brand;
  category: Category;
  /** The word in the product name that the storefront search finds (never the run tag). */
  searchWord: string;
};

/** Several products that share one search word, so a search shows exactly these. */
export type Catalogue = { searchWord: string; products: NewProduct[] };

type DataFixtures = {
  /** Deferred teardown registry: runs even when the test fails, newest first. */
  cleanup: Cleanup;
  /** Factory: a customer of the test's own, deleted by the admin afterwards (kept on 409, see AGENTS.md). */
  createCustomer: () => Promise<Customer>;
  /** Factory: a run-tagged brand, deleted afterwards. */
  createBrand: () => Promise<Brand>;
  /** Factory: a run-tagged top-level category, deleted afterwards. */
  createCategory: () => Promise<Category>;
  /** Any product photo: images are read-only reference data. */
  productImageId: string;
  /** Factory: an in-stock product with a brand and category of its own; brand and category can be shared. */
  createProduct: (options?: {
    brand?: Brand;
    category?: Category;
    overrides?: Partial<ProductInput> & { searchWord?: string };
  }) => Promise<NewProduct>;
  /** Waits until this many products are findable by the word (search index readiness). */
  searchable: (searchWord: string, count: number) => Promise<void>;
  /** Ready-made in-stock product, already findable by its search word. */
  createdProduct: NewProduct;
  /** Three products with distinct prices under one search word (data for sorting). */
  createdCatalogue: Catalogue;
  /** Reads a customer's own invoices through the API, to verify what the UI ordered. */
  invoicesOf: (customer: Customer | undefined) => Promise<Invoice[]>;
  /** Reads any order by its invoice number as the admin (guest orders have no customer to ask). */
  invoiceByNumber: (invoiceNumber: string) => Promise<Invoice>;
  /**
   * For an account the UI registered: signs in through the API with the credentials the visitor chose and
   * returns the stored account. The account is deleted afterwards (the teardown sweep catches it too).
   */
  registeredAccount: (credentials: Credentials) => Promise<Account>;
};

/** Toolshop answers 409 when a record is still referenced by an order, which can never be deleted. */
const RETAINED = HTTP.CONFLICT;

export const test = apiTest.extend<DataFixtures>({
  cleanup: [
    // Depending on the contexts makes them outlive `cleanup`, so they are still open when the tasks run.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructuring is how Playwright declares fixture dependencies
    async ({ api, adminApi }, use, testInfo) => {
      const tasks: { label: string; task: () => Promise<APIResponse | null> }[] = [];
      await use({ add: (label, task) => tasks.push({ label, task }) });
      for (const { label, task } of tasks.reverse()) {
        const res = await task().catch((error: unknown) => {
          logger.warn(`cleanup failed: ${label}`, { error: String(error) });
          return null;
        });
        if (res === null || res.ok() || res.status() === HTTP.NOT_FOUND) continue;
        if (res.status() === RETAINED) {
          // Documented, not a failure: an order references it. The hourly database reset removes it.
          testInfo.annotations.push({
            type: 'retained',
            description: `${label}: referenced by an order (409)`,
          });
          logger.info(`cleanup kept ${label}: referenced by an order (HTTP 409)`);
          continue;
        }
        logger.warn(`cleanup refused: ${label}`, { status: res.status(), body: await res.text() });
      }
    },
    { box: true },
  ],

  createCustomer: [
    async ({ playwright, api, adminUsers, cleanup }, use) => {
      await use(async () => {
        const customer = await registerCustomer(playwright, api);
        cleanup.add(`delete customer ${customer.user.id}`, () => adminUsers.remove(customer.user.id));
        return customer;
      });
    },
    { box: true },
  ],

  createBrand: [
    async ({ catalog, adminCatalog, cleanup }, use) => {
      await use(async () => {
        const res = await catalog.createBrand(buildBrand());
        await expect(res, 'test data setup: create brand').toBeOK();
        const brand = BrandSchema.parse(await res.json());
        cleanup.add(`delete brand ${brand.id}`, () => adminCatalog.removeBrand(brand.id));
        return brand;
      });
    },
    { box: true },
  ],

  createCategory: [
    async ({ catalog, adminCatalog, cleanup }, use) => {
      await use(async () => {
        const res = await catalog.createCategory(buildCategory());
        await expect(res, 'test data setup: create category').toBeOK();
        const category = CategorySchema.parse(await res.json());
        cleanup.add(`delete category ${category.id}`, () => adminCatalog.removeCategory(category.id));
        return category;
      });
    },
    { box: true },
  ],

  productImageId: [
    async ({ catalog }, use) => {
      const res = await catalog.images();
      await expect(res, 'test data setup: list product images').toBeOK();
      const [image] = ImageListSchema.parse(await res.json());
      if (image === undefined) throw new Error('GET /images returned no images; products cannot be created');
      await use(image.id);
    },
    { box: true },
  ],

  createProduct: [
    async ({ catalog, adminCatalog, createBrand, createCategory, productImageId, cleanup }, use) => {
      await use(async ({ brand, category, overrides = {} } = {}) => {
        const productBrand = brand ?? (await createBrand());
        const productCategory = category ?? (await createCategory());
        const searchWord = overrides.searchWord ?? searchToken();
        const input = buildProduct(
          { brand_id: productBrand.id, category_id: productCategory.id, product_image_id: productImageId },
          { ...overrides, searchWord },
        );
        const res = await catalog.createProduct(input);
        await expect(res, 'test data setup: create product').toBeOK();
        const product = ProductSchema.parse(await res.json());
        // Registered after brand and category, so it is deleted before them (newest first).
        cleanup.add(`delete product ${product.id}`, () => adminCatalog.removeProduct(product.id));
        return { product, input, brand: productBrand, category: productCategory, searchWord };
      });
    },
    { box: true },
  ],

  searchable: [
    async ({ catalog }, use) => {
      await use(async (searchWord, count) => {
        // Data readiness, not a sleep: in CI the search index can trail a fresh product by a few seconds,
        // and a test must not search before its own data is findable.
        await expect
          .poll(
            async () => {
              const res = await catalog.searchProducts(searchWord);
              return res.ok() ? ProductPageSchema.parse(await res.json()).data.length : -1;
            },
            {
              message: `test data setup: ${String(count)} product(s) searchable by "${searchWord}"`,
              timeout: 30_000,
            },
          )
          .toBe(count);
      });
    },
    { box: true },
  ],

  createdProduct: async ({ createProduct, searchable }, use) => {
    const created = await createProduct();
    await searchable(created.searchWord, 1);
    await use(created);
  },

  createdCatalogue: async ({ createProduct, searchable }, use) => {
    const searchWord = searchToken();
    const [firstPrice, ...otherPrices] = distinctPrices(3);
    const first = await createProduct({
      overrides: { searchWord, ...(firstPrice === undefined ? {} : { price: firstPrice }) },
    });
    const products = [first];
    for (const price of otherPrices) {
      products.push(
        await createProduct({
          brand: first.brand,
          category: first.category,
          overrides: { searchWord, price },
        }),
      );
    }
    await searchable(searchWord, products.length);
    await use({ searchWord, products });
  },

  invoicesOf: async ({ apiAs }, use) => {
    await use(async (customer) => {
      if (customer === undefined)
        throw new Error('invoicesOf needs a signed-in customer (test.use({ shopper }))');
      const orders = new OrdersClient(await apiAs(await customer.session.bearer()));
      const res = await orders.myInvoices();
      await expect(res, 'verification: list the customer invoices').toBeOK();
      return InvoicePageSchema.parse(await res.json()).data;
    });
  },

  invoiceByNumber: async ({ adminOrders }, use) => {
    await use(async (invoiceNumber) => {
      const res = await adminOrders.searchInvoices(invoiceNumber);
      await expect(res, `verification: find invoice ${invoiceNumber}`).toBeOK();
      const invoice = InvoicePageSchema.parse(await res.json()).data.find(
        (i) => i.invoice_number === invoiceNumber,
      );
      if (invoice === undefined) throw new Error(`verification: no invoice ${invoiceNumber} was recorded`);
      return invoice;
    });
  },

  registeredAccount: async ({ api, apiAs, adminUsers, cleanup }, use) => {
    await use(async (credentials) => {
      // Cleanup first, so the account is removed even when signing in fails.
      const search = await adminUsers.search(credentials.email);
      await expect(search, 'verification: look up the registered account').toBeOK();
      const found = UserPageSchema.parse(await search.json()).data.find((u) => u.email === credentials.email);
      if (found === undefined)
        throw new Error(`verification: no account was registered as ${credentials.email}`);
      cleanup.add(`delete customer ${found.id}`, () => adminUsers.remove(found.id));

      const login = await new AuthClient(api).login(credentials);
      await expect(login, 'verification: sign in with the password they chose').toBeOK();
      const { access_token } = TokenSchema.parse(await login.json());
      const users = new UsersClient(await apiAs(`Bearer ${access_token}`));
      const me = await users.me();
      await expect(me, 'verification: read the stored account').toBeOK();
      return AccountSchema.parse(await me.json());
    });
  },
});
