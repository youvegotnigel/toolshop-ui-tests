import { test, expect } from '../../src/fixtures';
import { PRICE_SORTS } from '../../src/data/sort-options';

const asPrice = (price: number): string => `$${price.toFixed(2)}`;

test.describe('catalog.sort: A shopper orders the catalogue by price', { tag: ['@catalog'] }, () => {
  test(
    'a shopper sorts the results by price, low to high and then high to low',
    { annotation: [{ type: 'covers', description: 'page:search' }] },
    async ({ createdCatalogue, homePage }) => {
      const prices = createdCatalogue.products.map(({ product }) => product.price);
      const ascending = [...prices].sort((a, b) => a - b).map(asPrice);
      const expected = { ascending, descending: [...ascending].reverse() };

      await test.step('A shopper searches for a range of three products', async () => {
        await homePage.open();
        await homePage.search(createdCatalogue.searchWord);
        await expect(homePage.cards).toHaveCount(prices.length);
      });

      // Data-driven: one business step per sort option in src/data/sort-options.ts
      for (const option of PRICE_SORTS) {
        await test.step(`They sort by "${option.label}" and the prices are ${option.order}`, async () => {
          await homePage.sortBy(option.label);
          await expect(homePage.productPrices).toHaveText(expected[option.order]);
        });
      }
    },
  );
});
