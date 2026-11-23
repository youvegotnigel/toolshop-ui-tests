import { test, expect } from '../../src/fixtures';

test.use({ shopper: 'customer' });

test.describe(
  'cart.update: A signed-in customer changes the quantity in the cart',
  { tag: ['@cart'] },
  () => {
    test(
      'the line total and the cart badge follow the quantity',
      {
        annotation: [
          { type: 'covers', description: 'page:product' },
          { type: 'covers', description: 'page:cart' },
        ],
      },
      async ({ createdProduct, productPage }) => {
        const { product } = createdProduct;
        const price = (quantity: number): string => `$${(product.price * quantity).toFixed(2)}`;

        await test.step('A signed-in customer adds a product to the cart', async () => {
          await productPage.open(product.id);
          await productPage.header.expand();
          await expect(productPage.header.accountMenu).toBeVisible();
          await productPage.addToCart();
          await expect(productPage.header.cart.count).toHaveText('1');
        });

        const cart = await test.step('They open the cart and see one item at the unit price', async () => {
          const cartPage = await productPage.openCart();
          await expect(cartPage.line(product.name).quantity).toHaveValue('1');
          await expect(cartPage.line(product.name).lineTotal).toHaveText(price(1));
          return cartPage;
        });

        await test.step('They change the quantity to 3', async () => {
          await cart.changeQuantity(product.name, 3);
        });

        await test.step('The line total, the cart total and the badge all show 3 items', async () => {
          await expect(cart.line(product.name).lineTotal).toHaveText(price(3));
          await expect(cart.total).toHaveText(price(3));
          await expect(cart.header.cart.count).toHaveText('3');
        });
      },
    );
  },
);
