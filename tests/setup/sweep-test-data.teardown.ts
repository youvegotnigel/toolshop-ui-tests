import { test, expect } from '../../src/fixtures';
import {
  BrandListSchema,
  CategoryListSchema,
  ProductPageSchema,
  type Category,
} from '../../src/api/schemas/catalog.schema';
import { UserPageSchema } from '../../src/api/schemas/user.schema';
import { testDataTag } from '../../src/data/test-data';
import { HTTP } from '../../src/utils/http';
import { createLogger } from '../../src/utils/logger';

const logger = createLogger('TestDataSweep');

const GONE: readonly number[] = [HTTP.NO_CONTENT, HTTP.NOT_FOUND];

type Tally = { removed: number; retained: number };

/** 204/404 = gone; 409 = referenced by an order, kept until the hourly reset; anything else fails. */
const settle = (status: number, tally: Tally): void => {
  expect([...GONE, HTTP.CONFLICT], `unexpected HTTP ${String(status)} while sweeping`).toContain(status);
  tally[status === HTTP.CONFLICT ? 'retained' : 'removed'] += 1;
};

const report = (what: string, tally: Tally): void => {
  const kept = tally.retained === 0 ? '' : `, kept ${String(tally.retained)} referenced by orders (HTTP 409)`;
  logger.info(`Sweep removed ${String(tally.removed)} leftover ${what}${kept}`);
  test.info().annotations.push({ type: `sweep-${what}`, description: JSON.stringify(tally) });
};

// Safety net after every project: delete anything this run created that a fixture missed.
// Lists everything and filters by prefix: name search is full-text and cannot match the run tag.
test('remove test data left behind by this run', async ({ adminCatalog, adminUsers }) => {
  const tagged = await test.step('Find categories tagged with this run id', async () => {
    const res = await adminCatalog.listCategories();
    await expect(res).toBeOK();
    return CategoryListSchema.parse(await res.json()).filter((c) => c.name.startsWith(testDataTag()));
  });

  await test.step('Delete products left in those categories', async () => {
    const tally: Tally = { removed: 0, retained: 0 };
    const productsOf = async (category: Category): Promise<string[]> => {
      const res = await adminCatalog.productsInCategory(category.slug);
      await expect(res).toBeOK();
      return ProductPageSchema.parse(await res.json()).data.map((p) => p.id);
    };
    for (const category of tagged) {
      for (const id of await productsOf(category))
        settle((await adminCatalog.removeProduct(id)).status(), tally);
    }
    report('products', tally);
  });

  await test.step('Delete categories and brands tagged with this run id', async () => {
    const categories: Tally = { removed: 0, retained: 0 };
    for (const c of tagged) settle((await adminCatalog.removeCategory(c.id)).status(), categories);
    report('categories', categories);
    const res = await adminCatalog.listBrands();
    await expect(res).toBeOK();
    const brands: Tally = { removed: 0, retained: 0 };
    for (const b of BrandListSchema.parse(await res.json()).filter((x) => x.name.startsWith(testDataTag()))) {
      settle((await adminCatalog.removeBrand(b.id)).status(), brands);
    }
    report('brands', brands);
  });

  await test.step('Delete test customers registered by this run', async () => {
    const res = await adminUsers.search(testDataTag());
    await expect(res).toBeOK();
    const tally: Tally = { removed: 0, retained: 0 };
    const leftovers = UserPageSchema.parse(await res.json()).data.filter((u) =>
      u.email.startsWith(testDataTag()),
    );
    for (const user of leftovers) settle((await adminUsers.remove(user.id)).status(), tally);
    report('customers', tally);
  });
});
