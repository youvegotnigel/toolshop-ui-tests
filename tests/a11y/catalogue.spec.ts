import { test, expect } from '../../src/fixtures';

test.describe(
  'a11y.catalogue: A shopper can browse and search the catalogue with assistive technology',
  { tag: ['@a11y', '@catalog'] },
  () => {
    test(
      'the home page and the search results meet the configured accessibility standard',
      {
        annotation: [
          { type: 'covers', description: 'page:home' },
          { type: 'covers', description: 'page:search' },
        ],
      },
      async ({ createdProduct, homePage, a11y }) => {
        const { product, searchWord } = createdProduct;

        await test.step('A shopper opens the Toolshop', async () => {
          await homePage.open();
        });

        await test.step('The catalogue has no accessibility violations', async () => {
          await a11y.expectNoViolations('page:home');
        });

        await test.step('They search for a product and see it in the results', async () => {
          await homePage.search(searchWord);
          await expect(homePage.product(product.name).root).toBeVisible();
        });

        await test.step('The search results have no accessibility violations', async () => {
          await a11y.expectNoViolations('page:search');
        });
      },
    );
  },
);
