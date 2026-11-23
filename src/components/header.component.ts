import type { Locator, Page } from '@playwright/test';
import { CartBadge } from './cart-badge.component';

/** The navigation bar every page shares. */
export class Header {
  readonly home: Locator;
  readonly signIn: Locator;
  /** The signed-in customer's menu; its label is the customer's full name. */
  readonly accountMenu: Locator;
  readonly cart: CartBadge;
  /** Phones only: the collapsed menu. Its aria-label is the only handle (no data-test). */
  readonly menuToggle: Locator;

  constructor(page: Page) {
    this.home = page.getByTestId('nav-home');
    this.signIn = page.getByTestId('nav-sign-in');
    // nav-menu on the public v5 site, nav-user-menu on the older with-bugs build
    this.accountMenu = page.getByTestId('nav-menu').or(page.getByTestId('nav-user-menu'));
    this.cart = new CartBadge(page);
    this.menuToggle = page.getByRole('button', { name: 'Toggle navigation' });
  }

  /** Opens the collapsed menu on narrow screens, so its links can be seen and clicked. No-op on desktop. */
  async expand(): Promise<this> {
    if (
      (await this.menuToggle.isVisible()) &&
      (await this.menuToggle.getAttribute('aria-expanded')) !== 'true'
    ) {
      await this.menuToggle.click();
    }
    return this;
  }

  async openCart(): Promise<void> {
    await this.expand();
    await this.cart.link.click();
  }
}
