---
name: selectors
description: 'Choose, write or review a locator for the Toolshop: data-test first (the site exposes about 260), then role with name, label, text; never CSS or XPath; scoping, multiple matches and elements without a data-test. Use when writing or fixing locators in page objects or components.'
---

# Selectors

## Critical

- **Priority**: `getByTestId` (the site's `data-test`, configured as `testIdAttribute`) > `getByRole` with a
  name > `getByLabel` > `getByText`. The Toolshop's `data-test` attributes are a deliberate test contract, so
  they come first here (unlike apps without test ids, where role comes first).
- **Never** CSS or XPath (`page.locator('.btn')`, `xpath=`). The only exception is axe's own targets inside
  `src/utils/a11y.ts`. ESLint (`playwright/no-raw-locators`) enforces it.
- **No translated text** as a locator when a stable alternative exists; patterns (`/^INV-\d+$/`) are fine.
- **`nth()`, `first()`, `last()`** only with a comment saying why the order is stable.
- **Explore first** (`explore-site`): every locator is backed by what the live site renders.
- Locators live in page objects and components, never in specs.

## Procedure

1. List the element's `data-test`, role, accessible name and label from the exploration brief.
2. Pick by priority; if two elements share a `data-test` (e.g. `filters` is a button and a panel), combine:
   `page.getByRole('button').and(page.getByTestId('filters'))`.
3. Scope repeated rows or cards to their container, then filter:
   `rows.filter({ has: page.getByTestId('product-title').getByText(name) }).getByTestId('line-price')`.
4. No `data-test`? Use role and name, then `aria-label` through text plus an attribute assertion if
   `getByLabel` is unsafe (see the Firefox note in `AGENTS.md`), and write a comment on the line.
5. Verify the locator resolves to exactly one element on desktop and phone (strict mode), then run the spec.

## References

- `references/locator-choice.md`: worked Toolshop examples for each tier and the known exceptions.
