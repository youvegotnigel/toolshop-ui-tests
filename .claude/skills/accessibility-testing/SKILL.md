---
name: accessibility-testing
description: 'Write, configure or triage Toolshop accessibility (a11y) tests with axe: the a11yConfig option (standard, failOn, best practices, disabled rules) in playwright.config.ts, a11y.expectNoViolations(pageKey) in specs under tests/a11y, auditing interactive states, and the known-violation baseline. Use when adding an a11y test, changing the WCAG level or standard, or when an axe audit fails.'
---

# Accessibility testing

Code: `src/config/a11y.config.ts` (standards, impacts, env overrides), `src/utils/a11y.ts` (the audit),
`src/utils/a11y-known-violations.ts` (baseline), the `a11y` and `a11yConfig` fixtures in
`src/fixtures/pages.fixtures.ts`. Specs: `tests/a11y/`. `AGENTS.md` and `add-ui-test` still apply.

## Critical

- **Audit through the fixture only**: `await a11y.expectNoViolations('page:<key>')`. Never `new AxeBuilder` in a
  spec and never hand-pick axe tags there: the standard comes from `a11yConfig`.
- **The level lives in one place**: `use.a11yConfig` in `playwright.config.ts`. Change it there, per run with
  `A11Y_STANDARD` / `A11Y_FAIL_ON`, or for one file with `test.use({ a11yConfig: { ...defaultA11yConfig, ... } })`.
  A per-file override is an exception and its comment says why.
- **Wait for the state, then audit.** The page object's `open()` waits for readiness; after an interaction assert
  the new state with a web-first `expect` (error text, open menu, cart line) before the audit, never a sleep.
- **Audit states, not just loads**: forms with their errors showing, opened menus, filled carts. Each is a step.
- **Never baseline to get green.** A new violation is a product bug: open a GitHub issue with the axe JSON, then
  add a baseline entry (rule, page **and** element targets, issue URL). Never widen `failOn`, drop the standard or
  add `disabledRules` to hide a defect. "FIXED: remove it from the baseline" means remove the entry.
- **Firefox**: never `getByLabel()` before an audit (content process crash); locate by test id or text.
- `page:<key>` must exist in `coverage-plan.json`; tag the spec `@a11y` plus its area.

## Procedure

1. Pick the page and state; check the page object and fixture exist (`add-page-object` if not).
2. Copy the shape of `tests/a11y/sign-in.spec.ts`: open, audit, interact + assert the state, audit again.
   Add an `a11y.<page>` journey to `coverage-plan.json`.
3. Run `npx playwright test tests/a11y --project=chromium`. Which browser projects run the suite is set by
   `A11Y_PROJECTS` in `playwright.config.ts` (default `['chromium']`, `[]` disables it; env `A11Y_PROJECTS=chromium,firefox`
   or `none` for one run). `@a11y` steps in other specs run wherever their spec runs.
4. Red: read `axe-page-<key>.json` (attached) and the failure message (rule, impact, elements, help URL).
   Product defect -> issue + baseline entry, with the human's approval. Test defect (wrong state, page not ready)
   -> fix the test.
5. To change the standard for everyone, edit `use.a11yConfig`; run the whole `@a11y` suite (`npm run test:a11y`)
   and expect new findings at stricter levels.

## References

- `references/configuration.md`: every option, the standards and their axe tags, examples.
