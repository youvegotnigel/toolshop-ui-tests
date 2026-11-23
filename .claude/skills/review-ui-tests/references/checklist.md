# Review checklist

## Blocking

- [ ] Spec imports from `@playwright/test`, calls `page.goto`, the API, `new` on a page object, or reads raw locators.
- [ ] Missing or nested `test.step`s, fewer than 2 or more than 6, or steps named after clicks instead of outcomes.
- [ ] Describe title does not start with a journey id from `coverage-plan.json`; missing area tag; pages
      touched but not declared with `covers`.
- [ ] Non-web-first waits or checks: `waitForTimeout`, `networkidle`, `force: true`, `expect(await x.isVisible())`,
      element handles, fixed sleeps, longer timeouts or retries to hide a race.
- [ ] An expected value read from the page instead of the test's own data or a documented rule.
- [ ] A weakened assertion (looser matcher, removed check, new known-violation entry) without evidence and an issue.
- [ ] Data created without cleanup, shared demo accounts, seeded ids, or a test that depends on another test.
- [ ] A test that places an order without `shopper: 'new-customer'`.
- [ ] Page object with an assertion outside `waitForReady()`, a constructor taking more than `Page`,
      a navigation method that does not return a ready page, or API/data imports.
- [ ] CSS/XPath selectors, `nth()` without a comment, or locators on translated text.
- [ ] Data-driven tests (`data-driven-tests` skill): 3+ copy-pasted tests that should be a table; a table forced
      onto tests whose steps differ or rows with behaviour flags; a row that breaks two things; per-run data in the
      table; assertions on the outcome only, not the field or value; a disable of `qe/*` without a convincing reason.
- [ ] Secrets or tokens in code, logs, attachments or screenshots; forbidden endpoints (`/refresh`,
      forgot-password, change-password).
- [ ] `console.*` or an unnamed `logger` in new code instead of `createLogger('<Module>')`; a log line carrying a
      password, token, cookie or whole body (`run-logging` skill).

## Non-blocking

- [ ] Step wording a manager would not understand; duplicated locators that belong in a component.
- [ ] Log levels that do not match the `run-logging` skill (an `info` per API call, an `error` without a failure).
- [ ] Missing depth tags (`@negative`, `@a11y`) or `coverage-plan.json` not updated for a new journey.
- [ ] `reason` texts in a cases table that read badly in the report ("cannot sign in when **...**").
- [ ] Unused page object members, missing doc comments on non-obvious waits.
