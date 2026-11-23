# Locator choice: Toolshop examples

| Element                      | Locator                                                                                                                                   | Why                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Search box                   | `page.getByTestId('search-query')`                                                                                                        | data-test exists                         |
| Product card for one product | `page.getByTestId(/^product-(?:[0-9a-z]{26}\|\d+)$/i).filter({ has: page.getByTestId('product-name').getByText(name, { exact: true }) })` | cards share a prefix; filter by the name |
| Cart line total              | `cart.items.filter({ has: ... }).getByTestId('line-price')`                                                                               | scope repeated rows                      |
| Filters toggle (phones)      | `page.getByRole('button').and(page.getByTestId('filters'))`                                                                               | the panel shares the data-test           |
| Navbar toggle (phones)       | `page.getByRole('button', { name: 'Toggle navigation' })`                                                                                 | no data-test; commented exception        |
| Account menu                 | `page.getByTestId('nav-menu').or(page.getByTestId('nav-user-menu'))`                                                                      | v5 and the older with-bugs build         |
| Brand badge                  | `page.getByText(brand, { exact: true })` + spec checks `toHaveAttribute('aria-label', 'brand')`                                           | Firefox crash with getByLabel + axe      |
| Invoice number               | `page.getByText(/^INV-\d+$/)`                                                                                                             | no data-test; language-independent       |
| Toast after add to cart      | `page.getByRole('alert')`                                                                                                                 | role, no data-test                       |

Symptoms:

- **Strict mode violation**: the locator matches a hidden copy (phone menu), a toast or a duplicate data-test:
  scope it or combine with `and()`.
- **Works on desktop, "not visible" on phones**: the element is collapsed; add a reveal method to the page
  object (`Header.expand()`), never `force: true`.
