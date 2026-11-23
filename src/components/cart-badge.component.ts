import type { Locator, Page } from '@playwright/test';

/** The cart icon in the header with its item count. Only rendered once the cart holds something. */
export class CartBadge {
  readonly link: Locator;
  readonly count: Locator;

  constructor(page: Page) {
    this.link = page.getByTestId('nav-cart');
    this.count = page.getByTestId('cart-quantity');
  }
}
