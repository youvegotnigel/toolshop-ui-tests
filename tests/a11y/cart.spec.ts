import { test, expect } from '../../src/fixtures';

test.describe(
  'a11y.cart: A shopper can review their cart with assistive technology',
  { tag: ['@a11y', '@cart'] },
  () => {
    test(
      'the cart with a product in it meets the configured accessibility standard',
      {
        annotation: [
          { type: 'covers', description: 'page:product' },
          { type: 'covers', description: 'page:cart' },
        ],
      },
      async ({ createdProduct, productPage, a11y }) => {
        const { product } = createdProduct;

        await test.step('A shopper adds a product to the cart', async () => {
          await productPage.open(product.id);
          await productPage.addToCart();
          await expect(productPage.header.cart.count).toHaveText('1');
        });

        await test.step('They open the cart and see the product', async () => {
          const cart = await productPage.openCart();
          await expect(cart.line(product.name).quantity).toHaveValue('1');
        });

        await test.step('The cart has no accessibility violations', async () => {
          await a11y.expectNoViolations('page:cart');
        });
      },
    );
  },
);
