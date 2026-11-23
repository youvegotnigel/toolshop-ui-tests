---
name: add-page-object
description: 'Create or extend a Toolshop page object or component: data-test locator strategy, readiness via waitForReady, intention methods that return the next page, responsive reveal logic and the page fixture. Use before writing a spec that visits a page without a page object.'
---

# Add a page object

## Critical

- No locator without exploration evidence (`explore-site`); locator rules live in `selectors`.
- Locators are `readonly` properties, methods are user intentions, navigation returns the next ready page.
- No assertions except `waitForReady()`; constructors take `Page` only; no API calls or data creation.

## 1. Explore the page (read-only)

- Run the `explore-site` skill (playwright-cli) on the route, desktop and phone.
- List its `data-test` attributes, roles and accessible names, and what makes it "ready" (the one element
  that only appears once data has loaded). Check a phone viewport (Pixel 7): what collapses?
- Note asynchronous behaviour that can race the user (profile patches, lookups, debounced inputs).

## 2. Write the class

Start from `references/page-object-template.md`.

- `src/pages/<name>.page.ts`, steps of a wizard in a folder (`src/pages/checkout/*.step.ts`).
- Locators: `getByTestId` > `getByRole` with name > `getByLabel` > `getByText`. No CSS, XPath or index
  without a comment. Avoid translated text; prefer patterns (`/^INV-\d+$/`).
- Methods are user intentions and return `this` or the next page object (after its `waitForReady()`).
- No assertions except in `waitForReady()`; `locator.waitFor()` is fine to wait for a state.
- Shared parts go in `src/components/` and are composed (`readonly header: Header`).
- Collapsed UI on phones: add a reveal method that is a no-op on desktop (see `Header.expand()`).

## 3. Wire it up

1. Add a fixture in `src/fixtures/pages.fixtures.ts` built on `signedInPage`.
2. Add the page key to `coverage-plan.json` if it is new.
3. `npm run typecheck && npm run lint`.

## References

- `references/page-object-template.md`: a page object, a wizard step and a component, with readiness and reveal logic.
- `selectors` skill for locator choice; `explore-site` skill for the exploration brief.
