import type { Locator, Page } from '@playwright/test';

/** Product cards are links whose data-test is `product-<ULID>`. */
const CARD = /^product-[0-9a-z]{26}$/i;

/** One product tile in the catalogue grid. */
export class ProductCard {
  readonly root: Locator;
  readonly name: Locator;
  readonly price: Locator;

  constructor(page: Page, productName: string) {
    this.root = page
      .getByTestId(CARD)
      .filter({ has: page.getByTestId('product-name').getByText(productName, { exact: true }) });
    this.name = this.root.getByTestId('product-name');
    this.price = this.root.getByTestId('product-price');
  }

  /** Every card in the grid, for counting results. */
  static all(page: Page): Locator {
    return page.getByTestId(CARD);
  }
}
