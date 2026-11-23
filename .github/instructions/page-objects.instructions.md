---
applyTo: 'src/pages/**/*.ts,src/components/**/*.ts'
---

Page objects and components follow AGENTS.md "Rules for framework code". In short:

- Locators as `readonly` properties: `getByTestId` > `getByRole` with a name > `getByLabel` > `getByText`; no CSS or XPath.
- Methods are user intentions; navigation methods return the next page object after its `waitForReady()`.
- No assertions except in `waitForReady()`; constructors take `Page` only; never create data or call the API.
- Reveal collapsed UI on phones inside the page object (no-op on desktop).
