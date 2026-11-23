import { test, expect } from '../../src/fixtures';
import { GUEST_ADDRESS, PAYMENT } from '../../src/data/checkout.data';
import { buildGuest } from '../../src/data/customer.builder';

// A guest has no account: the order is looked up by its invoice number. The order makes the product,
// its brand and category undeletable (HTTP 409, recorded as retained).
test.describe(
  'checkout.guest: A guest places an order without an account',
  { tag: ['@checkout', '@smoke'] },
  () => {
    test(
      'a guest checks out paying cash on delivery and the order is recorded',
      {
        annotation: [
          { type: 'covers', description: 'page:product' },
          { type: 'covers', description: 'page:cart' },
          { type: 'covers', description: 'page:checkout-sign-in' },
          { type: 'covers', description: 'page:checkout-address' },
          { type: 'covers', description: 'page:checkout-payment' },
          { type: 'covers', description: 'page:order-confirmation' },
        ],
      },
      async ({ createdProduct, productPage, invoiceByNumber }) => {
        const { product } = createdProduct;
        const guest = buildGuest();

        const cart = await test.step('A guest puts a product in the cart', async () => {
          await productPage.open(product.id);
          await productPage.addToCart();
          await expect(productPage.header.cart.count).toHaveText('1');
          return productPage.openCart();
        });

        const address = await test.step('They continue as a guest with their name and email', async () => {
          const signIn = await cart.proceed();
          return signIn.continueAsGuest(guest);
        });

        const payment = await test.step('They enter their billing address', async () => {
          await address.enterAddress(GUEST_ADDRESS);
          await expect(address.country).toHaveValue(GUEST_ADDRESS.countryCode);
          await expect(address.postalCode).toHaveValue(GUEST_ADDRESS.postalCode);
          await expect(address.houseNumber).toHaveValue(GUEST_ADDRESS.houseNumber);
          return address.proceed();
        });

        const confirmation =
          await test.step('They pay cash on delivery and see the order confirmation', async () => {
            const page = await payment.payWith(PAYMENT.cashOnDelivery);
            await expect(page.invoiceNumber).toHaveText(/^INV-\d+$/);
            return page;
          });

        await test.step('The order is recorded as a guest order with the right product and total', async () => {
          const invoice = await invoiceByNumber(await confirmation.readInvoiceNumber());
          expect(invoice).toMatchObject({
            user_id: null,
            total: product.price,
            billing_country: GUEST_ADDRESS.countryCode,
            billing_postal_code: GUEST_ADDRESS.postalCode,
            invoicelines: [{ product_id: product.id, quantity: 1, unit_price: product.price }],
          });
        });
      },
    );
  },
);
