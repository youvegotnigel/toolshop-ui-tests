import { test, expect } from '../../src/fixtures';

test.describe(
  'catalog.search: A shopper finds a product by name',
  { tag: ['@catalog', '@smoke', '@a11y'] },
  () => {
    test(
      'a shopper searches for a product, opens it and sees its name, price and brand',
      {
        annotation: [
          { type: 'covers', description: 'page:home' },
          { type: 'covers', description: 'page:search' },
          { type: 'covers', description: 'page:product' },
        ],
      },
      async ({ createdProduct, homePage, a11y }) => {
        const { product, brand, searchWord } = createdProduct;

        await test.step('A shopper opens the Toolshop', async () => {
          await homePage.open();
        });

        await test.step('They search for the product by a word in its name', async () => {
          await homePage.search(searchWord);
          await expect(homePage.cards).toHaveCount(1);
          await expect(homePage.product(product.name).price).toHaveText(`$${product.price.toFixed(2)}`);
        });

        const productPage = await test.step('They open the product from the results', async () => {
          return homePage.openProduct(product.name);
        });

        await test.step('The product page shows the right name, price and brand', async () => {
          await expect(productPage.name).toHaveText(product.name);
          await expect(productPage.unitPrice).toHaveText(product.price.toFixed(2));
          await expect(productPage.badge(brand.name)).toHaveAttribute('aria-label', 'brand');
        });

        await test.step('The product page has no serious accessibility problems', async () => {
          await a11y.expectNoSeriousViolations('page:product');
        });
      },
    );
  },
);
