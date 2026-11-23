import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import { CartPage } from './cart.page';

/** Product detail: name, price, brand and category badges, quantity and add to cart. */
export class ProductPage extends BasePage {
  readonly name: Locator;
  readonly unitPrice: Locator;
  readonly quantity: Locator;
  readonly addToCartButton: Locator;
  /** The toast shown after adding to the cart. */
  readonly notification: Locator;

  constructor(page: Page) {
    super(page);
    this.name = page.getByTestId('product-name');
    this.unitPrice = page.getByTestId('unit-price');
    this.quantity = page.getByTestId('quantity');
    this.addToCartButton = page.getByTestId('add-to-cart');
    this.notification = page.getByRole('alert');
  }

  /**
   * A brand or category badge by its text. The badges have no data-test; their aria-label says which
   * one it is ("brand" or "category"). Not getByLabel(): on Firefox, getByLabel followed by an axe
   * scan crashes the page (content process signal 11), so specs check the aria-label instead.
   */
  badge(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  async waitForReady(): Promise<void> {
    await expect(this.addToCartButton).toBeVisible();
  }

  open(productId: string): Promise<this> {
    return this.visit(`/product/${productId}`);
  }

  async addToCart(): Promise<this> {
    await this.addToCartButton.click();
    return this;
  }

  async openCart(): Promise<CartPage> {
    await this.header.openCart();
    const cart = new CartPage(this.page);
    await cart.waitForReady();
    return cart;
  }
}
