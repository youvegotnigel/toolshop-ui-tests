import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ProductCard } from '../components/product-card.component';
import { ProductPage } from './product.page';

/** The catalogue: search, sort, filters and the product grid. */
export class HomePage extends BasePage {
  readonly searchBox: Locator;
  readonly searchButton: Locator;
  /** "Searched for: <term>" once a search has run. */
  readonly searchedTerm: Locator;
  readonly sort: Locator;
  readonly productNames: Locator;
  readonly productPrices: Locator;
  readonly cards: Locator;
  /** Phones only: search, sort and filters sit in a collapsed panel behind this button. */
  readonly filtersToggle: Locator;

  constructor(page: Page) {
    super(page);
    this.searchBox = page.getByTestId('search-query');
    this.searchButton = page.getByTestId('search-submit');
    this.searchedTerm = page.getByTestId('search-term');
    this.sort = page.getByTestId('sort');
    this.productNames = page.getByTestId('product-name');
    this.productPrices = page.getByTestId('product-price');
    this.cards = ProductCard.all(page);
    this.filtersToggle = page.getByRole('button').and(page.getByTestId('filters'));
  }

  async waitForReady(): Promise<void> {
    await expect(this.productNames.first()).toBeVisible();
  }

  open(): Promise<this> {
    return this.visit('/');
  }

  product(name: string): ProductCard {
    return new ProductCard(this.page, name);
  }

  /** Searches the catalogue by name and waits until the results are for this term. */
  async search(term: string): Promise<this> {
    await this.revealFilters();
    await this.searchBox.fill(term);
    await this.searchButton.click();
    await this.searchedTerm.filter({ hasText: term }).waitFor();
    return this;
  }

  /** Picks a sort option by the label a shopper sees, e.g. "Price (Low - High)". */
  async sortBy(label: string): Promise<this> {
    await this.revealFilters();
    await this.sort.selectOption({ label });
    return this;
  }

  /** Opens the collapsed filter panel on narrow screens. No-op on desktop, where the panel is always shown. */
  async revealFilters(): Promise<void> {
    if (
      (await this.filtersToggle.isVisible()) &&
      (await this.filtersToggle.getAttribute('aria-expanded')) !== 'true'
    ) {
      await this.filtersToggle.click();
    }
  }

  async openProduct(name: string): Promise<ProductPage> {
    await this.product(name).root.click();
    const productPage = new ProductPage(this.page);
    await productPage.waitForReady();
    return productPage;
  }
}
