import { test, expect } from '../../src/fixtures';
import { GERMAN_ADDRESS, PAYMENT } from '../../src/data/checkout.data';

// The order makes this customer undeletable (HTTP 409), so the test uses a customer of its own.
test.use({ shopper: 'new-customer' });

test.describe(
  'checkout.card: A signed-in customer places an order',
  { tag: ['@checkout', '@smoke', '@a11y'] },
  () => {
    test(
      'a customer checks out end to end and the order is recorded',
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
      async ({ createdProduct, productPage, shopperAccount, invoicesOf, a11y }) => {
        const { product } = createdProduct;

        const cart = await test.step('A signed-in customer puts a product in the cart', async () => {
          await productPage.open(product.id);
          await productPage.addToCart();
          await expect(productPage.header.cart.count).toHaveText('1');
          return productPage.openCart();
        });

        const address =
          await test.step('They confirm the cart and continue as the signed-in customer', async () => {
            const signIn = await cart.proceed();
            return signIn.proceed();
          });

        const payment =
          await test.step('They enter a billing address the shop completes from the postcode', async () => {
            await address.enterAddress(GERMAN_ADDRESS);
            return address.proceed();
          });

        const confirmation =
          await test.step('They pay cash on delivery and see the order confirmation', async () => {
            const page = await payment.payWith(PAYMENT.cashOnDelivery);
            await expect(page.invoiceNumber).toHaveText(/^INV-\d+$/);
            await a11y.expectNoSeriousViolations('page:order-confirmation');
            return page;
          });

        await test.step('The order is recorded for the customer with the right product and total', async () => {
          const invoiceNumber = await confirmation.readInvoiceNumber();
          const invoices = await invoicesOf(shopperAccount);
          expect(invoices.map((i) => i.invoice_number)).toContain(invoiceNumber);
          expect(invoices.find((i) => i.invoice_number === invoiceNumber)).toMatchObject({
            total: product.price,
            billing_country: GERMAN_ADDRESS.countryCode,
            billing_postal_code: GERMAN_ADDRESS.postalCode,
            payment: { payment_method: PAYMENT.cashOnDelivery },
            invoicelines: [{ product_id: product.id, quantity: 1, unit_price: product.price }],
          });
        });
      },
    );
  },
);
