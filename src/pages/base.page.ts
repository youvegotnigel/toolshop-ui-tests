import type { Page } from '@playwright/test';
import { Header } from '../components/header.component';
import { routePrefix, tokenStorage } from '../config/env';

/**
 * Every page object: locators as readonly properties, user intentions as methods, no assertions.
 * The one exception is waitForReady(), which waits for the page's key element with a web-first
 * assertion, so a navigation method always returns a page that is actually ready.
 */
export abstract class BasePage {
  readonly header: Header;

  constructor(protected readonly page: Page) {
    this.header = new Header(page);
  }

  /** Waits until the page's key element is visible. */
  abstract waitForReady(): Promise<void>;

  /**
   * Opens an app route relative to baseURL (TEST_ENV switches the site, ROUTE_PREFIX its routing style)
   * and waits until the page is ready.
   */
  /** Whether the browser holds a session token. Never returns the token itself (it must not reach reports). */
  async hasStoredSession(): Promise<boolean> {
    return this.page.evaluate(
      (storage) => (storage === 'session' ? sessionStorage : localStorage).getItem('auth-token') !== null,
      tokenStorage(),
    );
  }

  protected async visit(path: string): Promise<this> {
    await this.page.goto(`${routePrefix()}${path}`);
    await this.waitForReady();
    return this;
  }
}
