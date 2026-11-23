import { faker } from '@faker-js/faker';
import { searchToken, testDataTag } from './test-data';
import type { BrandInput, CategoryInput, ProductInput } from '../api/schemas/catalog.schema';

const slug = (): string => `${testDataTag()}-${faker.string.alphanumeric(8).toLowerCase()}`;

export const buildBrand = (overrides: Partial<BrandInput> = {}): BrandInput => ({
  name: `${testDataTag()} ${faker.company.name()}`.slice(0, 120),
  slug: slug(),
  ...overrides,
});

export const buildCategory = (overrides: Partial<CategoryInput> = {}): CategoryInput => ({
  name: `${testDataTag()} ${faker.commerce.department()}`.slice(0, 120),
  slug: slug(),
  parent_id: null,
  ...overrides,
});

type Links = Pick<ProductInput, 'brand_id' | 'category_id' | 'product_image_id'>;

/**
 * Name: run tag, the search word, then a readable product name. Prices stay between 1 and 99 because
 * the catalogue's default price filter (0 to 100) hides dearer products once a sort is applied.
 */
export const buildProduct = (
  links: Links,
  overrides: Partial<ProductInput> & { searchWord?: string } = {},
): ProductInput => {
  const { searchWord = searchToken(), ...rest } = overrides;
  return {
    name: `${testDataTag()} ${searchWord} ${faker.commerce.productName()}`.slice(0, 120),
    description:
      `Created by automated UI tests (${testDataTag()}). ${faker.commerce.productDescription()}`.slice(
        0,
        1250,
      ),
    price: Number(faker.commerce.price({ min: 1, max: 99, dec: 2 })),
    stock: 50,
    is_location_offer: false,
    is_rental: false,
    ...links,
    ...rest,
  };
};

/** Distinct prices, so every sort order is unambiguous. */
export const distinctPrices = (count: number): number[] =>
  faker.helpers
    .uniqueArray(() => Number(faker.commerce.price({ min: 1, max: 99, dec: 2 })), count)
    .slice(0, count);
