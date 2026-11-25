# AGENTS.md

Single source of truth for every contributor: humans, Claude Code and GitHub Copilot.
`CLAUDE.md` and `.github/copilot-instructions.md` only point here. Change rules here, nowhere else.

## Project

Playwright + TypeScript UI tests for the **Toolshop** web store by Practice Software Testing
(`https://practicesoftwaretesting.com`, Angular front end; API `https://api.practicesoftwaretesting.com`).
Started with 5 tests (search, sort, login, cart, checkout) that exercise every framework feature;
built to grow page by page. Sister project: `youvegotnigel/toolshop-api-tests` (same conventions).

## Commands

| Task                                | Command                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| Everything a PR needs               | `npm run verify`                                                                        |
| All browsers / one browser          | `npm test` / `npm run test:chromium` (`test:firefox`, `test:webkit`)                    |
| Smoke (also runs on mobile)         | `npm run test:smoke`                                                                    |
| Accessibility suite (`@a11y`)       | `npm run test:a11y` (`A11Y_STANDARD`, `A11Y_FAIL_ON`, `A11Y_PROJECTS=chromium,firefox`) |
| Prove tests are independent         | `npm run test:shuffle`                                                                  |
| Against the deliberately buggy site | `npm run test:with-bugs`                                                                |
| Headed / UI mode                    | `npm run test:headed` / `npm run test:ui`                                               |
| Typecheck / lint / format           | `npm run typecheck`, `npm run lint`, `npm run format`                                   |
| Agent files in sync                 | `npm run agent:parity`                                                                  |
| Test the custom ESLint rules        | `npm run test:lint-rules`                                                               |
| Test the run log formatting         | `npm run test:reporting`                                                                |
| Stock Playwright console (debug)    | `npx playwright test --reporter=list` (replaces every configured reporter)              |
| Dashboard + reports locally         | `ALLURE=1 npm test`, then `npm run report:site` (open `site/index.html`)                |
| Open a trace                        | `npx playwright show-trace test-results/artifacts/<test>/trace.zip`                     |

Behind a TLS-inspecting proxy whose CA Firefox does not trust, set `TRUST_INTERCEPTING_PROXY=1`
locally (never honoured in CI). `HTTPS_PROXY` is picked up by browsers and API contexts alike.

## Architecture

```
playwright.config.ts      env loading, RUN_ID, testIdAttribute 'data-test', a11yConfig, reporters, projects
merge.config.ts           reporters for merging CI shards (one HTML report, smart report, JSON, JUnit, failures)
src/config/env.ts         .env.local + .env.<TEST_ENV>, env() fail-fast reader, runId(), proxy
src/config/a11y.config.ts accessibility standards (axe tags), failOn impact, A11Y_STANDARD / A11Y_FAIL_ON overrides
src/api/                  minimal API clients + zod schemas: test data, auth and verification only
src/auth/auth-session.ts  worker-scoped API login per role, renews the ~5 min JWT
src/pages/                page objects: one class per page, extends BasePage; checkout/ holds the wizard steps
src/components/           parts several pages share: Header, CartBadge, ProductCard
src/fixtures/             auth -> api -> data -> pages, re-exported by src/fixtures/index.ts
src/data/                 faker builders (run tag qa-<RUN_ID> + a search word), checkout data, sort options
src/utils/                logger (createLogger, redacts secrets and JWTs), api-recorder, a11y + known violations, report labels
src/reporting/            run logger (console + logs/automation_framework.log), failure tracker (failure-summary.json +
                          job summary), smart report options
logs/                     automation_framework.log (git-ignored; archived by Jenkins, uploaded per shard by GitHub)
scripts/coverage/         dashboard: KPIs, trends, heat map, browser matrix, critical journeys, a11y, backlog
scripts/ci/               redact-traces, allure-environment, build-site, restore-history, publish-pages
coverage-plan.json        pages (from the Angular routes) and journeys, with priority and target release
tests/<area>/             specs, one behaviour per file
tests/a11y/               accessibility specs, one page (and its interactive states) per file; on the
                          projects in A11Y_PROJECTS (playwright.config.ts, default chromium)
eslint/                   local ESLint plugin `qe/*` (data-driven test rules) and its RuleTester suite
docs/testing-patterns/    guides for humans (data-driven tests)
tests/setup/              environment check (setup) and run-tag sweep (teardown)
```

Fixture graph: worker `envGuard` (auto), `adminSession`, `workerCustomer` -> test `correlationId`,
`apiRecorder` -> `api`, `adminApi`, `apiAs`, clients (`adminOrders` among them) -> `cleanup` (boxed) ->
`createBrand`, `createCategory`, `productImageId`, `createProduct`, `createdProduct`, `createdCatalogue`,
`createCustomer`, `invoicesOf`, `invoiceByNumber`, `registeredAccount` -> option `shopper` -> `shopperAccount` ->
`signedInPage` -> `homePage`, `productPage`, `cartPage`, `loginPage`, `registerPage`, `accountPage`; option
`a11yConfig` -> `a11y`;
`reportLabels` (auto).

## Rules for every test (ESLint enforces most of them)

1. Import `test` and `expect` from `src/fixtures` only, never from `@playwright/test`.
2. Tell the story with 2 to 6 flat `test.step`s in business language ("They pay by card and see the
   order confirmation", not "click finish"). Managers read them in the HTML and Allure reports.
3. One `test.describe` per file. Its title starts with the journey id from `coverage-plan.json`
   (`'checkout.card: A signed-in customer places an order'`). Tag the area (`@catalog`, `@auth`, `@cart`,
   `@checkout`, ...) and the depth (`@smoke`, `@negative`, `@a11y`, `@mobile`). `@smoke` also runs on
   mobile-chrome. Declare every page the test touches: `{ annotation: { type: 'covers', description: 'page:cart' } }`.
4. Web-first assertions only (`toBeVisible`, `toHaveText`, `toHaveValue`, `toHaveCount`, `toHaveURL`, `expect.poll`).
   No `waitForTimeout`, `networkidle`, `force: true`, `page.pause`, element handles or `expect(await locator.isVisible())`.
5. Specs never call `page.goto`, never call the API, never `new` a page object: fixtures provide pages
   (`homePage.open()`), data (`createdProduct`) and verification (`invoicesOf`).
6. Every created record is removed: factory fixtures register their cleanup, newest first, even when the
   test fails. Choose the shopper with `test.use({ shopper: 'guest' | 'customer' | 'new-customer' })`;
   use `new-customer` whenever the test places an order.
7. Tests pass alone, in parallel, shuffled and on every browser project. No shared module state.
8. Accessibility: `await a11y.expectNoViolations('page:<key>')` audits the page against `use.a11yConfig` in
   `playwright.config.ts` (default WCAG 2.2 AA, failing on serious or critical) and fails on any violation at or
   above `failOn` that is not a known product defect. Change the level there or with `A11Y_STANDARD` /
   `A11Y_FAIL_ON`, never in a spec; assert the state before auditing it (`accessibility-testing` skill).
9. Data-driven: when 3 or more tests share their steps and only the data changes, write one `test()` inside
   `for (const { ... } of cases)` over a typed table in `src/data/<thing>.cases.ts`
   (`as const satisfies readonly FormValidationCase<Form>[]`, types in `src/data/test-cases.ts`). One row breaks
   one thing; the title is a template literal built from the row; no `if` per row; static values only (per-run data
   comes from fixtures). ESLint enforces the shape (`qe/*`). Guide: `docs/testing-patterns/data-driven-tests.md`.
10. Never weaken an assertion to make a test green. Prove the behaviour first (trace, screenshot,
    `api-calls.json`, axe JSON) and explain it in the PR.

## Rules for framework code

- **Page objects** expose locators as `readonly` properties and user intentions as methods (`search(term)`,
  `addToCart()`, `proceed()`). Navigation methods return the next page object, already ready
  (`await cartPage.proceed()` returns `SignInStep`). Constructors take `Page` only. No assertions, except
  `waitForReady()`, which waits for the page's key element with a web-first `expect`. Page objects never
  create data or call the API (type imports are fine).
- **Locators**: `getByTestId` (the site's `data-test`) > `getByRole` with a name > `getByLabel` > `getByText`.
  No CSS, no XPath, no `nth()` without a comment, no text that changes with translations. Exceptions are
  commented in place (e.g. the navbar toggle has only an aria-label).
- **Components** (`src/components/`) are composed into pages, never inherited.
- **Responsive**: phones collapse the menu and the filters panel. Page objects reveal them
  (`header.expand()`, `homePage.revealFilters()`); both are no-ops on desktop, so specs stay branch-free.
- Use `type`, not `interface`. No `any`, no non-null `!`, no `console` outside the logger, no `eslint-disable`
  without `-- reason`. Never relax a lint rule to make code pass.
- New page: page object in `src/pages`, a fixture in `src/fixtures/pages.fixtures.ts`, its key in
  `coverage-plan.json`. New data: a builder in `src/data` and a factory fixture in `data.fixtures.ts`.

## Logging

Modelled on the CaseWORKS QA automation framework (log4j2): a `test()` per project is a scenario, a `test.step`
is a step, the run logger reporter (`src/reporting/run-logger.ts`) is the listener. Details: `run-logging` skill.

- **Console** (local and CI, same format): `HH:mm:ss LEVEL message`, one block per test (`▶ Test n/total
[project]: ...`, a `✅`/`❌` line per `test.step` with its duration, the worker log lines of that test, the
  result), a one-line reason on the innermost failed step (or on the test line), a progress line after every final
  outcome, then `===== Results: ... =====` with the flaky and failed lists. No stack traces, no ANSI codes. Hooks
  and fixtures appear only when they fail. Setup failure prints one `Run aborted` line, not a skip per test.
- **File** `logs/automation_framework.log`: the same lines as
  `yyyy-MM-dd HH:mm:ss.SSS | LEVEL | <source, 22 wide> | message`, plus, per failed attempt, every error in full,
  its code frame, a filtered stack, the correlation id and the evidence paths. Rolled daily and at 20 MB.
- **Parallel**: each attempt is buffered and printed as one block when it ends; one worker streams live.
- **Env**: `LOG_LEVEL` (console, default `info`), `LOG_FILE_LEVEL` (file, default `info`; `debug` adds every API
  call and every action with its element and value, e.g. `Fill getByTestId('email') value="..."`; password, token,
  CVV and card-number values are masked), `LOG_STREAM` (`1` live, `0` buffered).
- **Code**: log with `const logger = createLogger('<ModuleName>')` (`src/utils/logger.ts`), never `console.*`; never
  log secrets; `info` for facts a reader needs, `warn` when something failed but the test goes on, `debug` for
  volume. Only `RunLogSink` writes the console and the file; pure formatting lives in `run-log-format.ts` with
  unit tests (`npm run test:reporting`). `--reporter=list` gives the stock Playwright console.

## Toolshop facts that shape the tests

- Every interactive element has a `data-test` attribute; `testIdAttribute` is set to `data-test`.
- The UI keeps the JWT in `localStorage['auth-token']` and the cart id in `sessionStorage['cart_id']`.
  JWTs live about 5 minutes, so a `storageState` saved in setup would expire mid-run: `signedInPage`
  logs in through the API per test and injects a fresh token with `addInitScript` before the first
  navigation. Only the login test types a password.
- Failed logins **lock non-admin accounts** (HTTP 423). Never use the shared demo customers: each worker
  registers its own run-tagged customer, and the login test makes exactly one wrong attempt on a customer of
  its own. Admin credentials come from `.env.local` or the `TOOLSHOP_ADMIN_PASSWORD` secret.
- The database is public, shared and reset hourly by others: never rely on seeded products, ids or counts.
  Tests create brands, categories and products through the API (image from `GET /images`) and clean them up.
- New products need `stock`, otherwise the UI shows "Out of stock" and cannot add them to the cart.
- Name search is MySQL BOOLEAN MODE full-text, cached for an hour per query: search for the builder's
  unique `searchWord`, never the run tag (its `-` means "exclude").
- Sorting re-queries with the default price filter (0 to 100): builders keep prices between 1 and 99.
- From GitHub-hosted runners the search index can trail a new product by a few seconds (not reproducible
  from other networks). `createdProduct` and `createdCatalogue` wait with `expect.poll` until their products are
  searchable (`searchable` fixture) before the test starts: data readiness, never a sleep in the test.
- Cloudflare protects the site. From GitHub-hosted runners it answers the pages that follow an authentication
  change with a "Verify you are human" challenge: the post-login `/account` load (`auth.login`), the redirect
  to `/auth/login` after registering (`auth.register`) and the page after Sign out (`auth.logout`). The
  failure shows as the sign-in form or menu "not found" on every browser; the screenshot or `error-context` of
  the failed attempt is the challenge page. Never try to bypass it. Tests on such flows are tagged `@cloudflare-guarded`
  and start with `test.skip(skipCloudflareGuarded(), '<reason>')`: skipped on GitHub-hosted runners only
  (`RUNNER_ENVIRONMENT=github-hosted`, with the reason in every report); they run locally, on Jenkins and on
  self-hosted runners. `RUN_CLOUDFLARE_GUARDED_TESTS=1` (repository variable) forces them to run on GitHub-hosted
  runners too. This is the only allowed skip, decided by the owner.
- Checkout: the cart is step 1 of `/checkout`; the address step is patched from `GET /users/me` when the
  page loads, which can land after typing and wipe it. Test customers register with a saved address, and
  specs wait for the pre-filled values. The postcode lookup overwrites street, city and state. Payment needs
  two clicks on `finish` (check, then confirm). Card: `0000-0000-0000-0000`, future `MM/YYYY`, 3 to 4 digit CVV.
- **Orders block deletes**: invoices cannot be deleted (no `DELETE /invoices`), and a customer, product,
  category or brand an invoice references answers **409** "used elsewhere". Cleanup and the teardown sweep
  record these as `retained` (annotation and log) without failing; the hourly reset removes them.
- Known accessibility defects in the site are listed in `src/utils/a11y-known-violations.ts`, matched by rule,
  page **and** element, each with a GitHub issue. A new element with the same defect still fails; a fixed one
  fails with "FIXED: remove it from the baseline".
- The sign-in form validates before it sends anything (no `/users/login` request, so no lockout risk) and shows one
  message per field: `email-error` "Email is required" or "Email format is invalid", `password-error`
  "Password is required" or "Password length is invalid" (2 characters is too short).
- Registration (`/auth/register`): the phone field takes digits only ("Only numbers are allowed"; the API takes
  `+49 30 ...`). The postcode lookup runs once country, postcode and house number are all set and fills street,
  city and state. A registration lands on the sign-in page, not signed in. **Known defect**: the form never sends
  `address.house_number` (stored as `null`); `register.spec.ts` keeps a `test.fail` with a `known-defect`
  annotation for it, which reports "passed unexpectedly" once the Toolshop fixes it. Verify a UI-registered
  account with `registeredAccount(credentials)` (API sign-in + `GET /users/me`; it also deletes the account).
- Guest checkout: step 2 has a "Continue as Guest" tab (role `tab`, no `data-test`); the guest's email and name
  stay in the browser (`sessionStorage['guestCheckout']`) until `POST /invoices/guest` places the order with
  `user_id: null`. No customer can read it back: verify with `invoiceByNumber` (admin `GET /invoices/search`).
- Sign-out (`nav-sign-out` in the account menu) is client-side only: no server call, the token is removed from
  storage and the shopper stays on the current page (pages that need a session, like `/account`, then redirect
  to sign-in). `signedInPage` seeds the token once per tab, so reopening a page after sign-out stays signed out.
- Firefox: `getByLabel()` followed by an axe scan crashes the page (content process signal 11). Locate the
  product badges by text and assert their `aria-label` instead.
- `TEST_ENV=with-bugs` runs the same suite against `with-bugs.practicesoftwaretesting.com` (deliberate
  defects); its failures prove the suite catches real bugs.

## Safety rules for AI agents

- Never call `/refresh` (resets the shared database), `/users/forgot-password` or `/users/change-password`,
  and never submit those forms in the UI.
- Never delete or modify data that does not carry this run's tag (`qa-<RUN_ID>`).
- Never commit `.env.local`, tokens or passwords. Never log, attach or screenshot a token: the logger and the
  recorder redact them, and `scripts/ci/redact-traces.mts` masks JWTs in traces before upload.
- Never fix a flaky test with sleeps, retries or a longer timeout; find the race (see `fix-flaky-test`).
- Explore the site with `npx playwright-cli` (`explore-site` skill), never to write assertions blindly:
  every expected value comes from the test's own data or a documented rule.
- No code before the human gate on non-trivial work (`ai-native-workflow`); run `node scripts/scan-constitution.mts`
  before asking for review.
- Definition of done: `npm run verify` is green, the PR template checklist is filled in, and the
  `review-ui-tests` checklist has no blocking findings.

## Agent toolkit (Claude Code and GitHub Copilot)

Every non-trivial task starts with the `ai-native-workflow` skill: classify, route to a leaf skill, explore,
propose with a confidence score, wait for the human gate, apply, verify, report. Adapted from
[idavidov13/agentic-playwright](https://github.com/idavidov13/agentic-playwright).

Skills live in `.claude/skills/` and are read by both tools (Claude Code natively; GitHub Copilot agent mode and
the Copilot cloud agent read `.claude/skills/` as agent skills). Each is a short `SKILL.md` (Critical rules,
Procedure) with details in `references/`, loaded only when needed:

| Skill                   | Use it for                                                                     |
| ----------------------- | ------------------------------------------------------------------------------ |
| `ai-native-workflow`    | the entry point: routing, the proposal and confidence gate, the human gate     |
| `explore-site`          | looking at the live site with `npx playwright-cli` before any UI code          |
| `selectors`             | choosing and fixing locators (data-test first, no CSS or XPath)                |
| `test-data`             | factories, run tags, cleanup and HTTP 409 retention                            |
| `add-ui-test`           | a user journey to page objects, fixtures and a spec                            |
| `add-page-object`       | a page object, wizard step or component                                        |
| `data-driven-tests`     | one test per row of a typed cases table (validation, boundaries, options)      |
| `review-ui-tests`       | reviewing a branch (`node scripts/scan-constitution.mts` + checklist)          |
| `triage-ui-failures`    | classifying a red run from failure-summary.json, traces and api-calls.json     |
| `fix-flaky-test`        | root-causing a flake without sleeps or retries                                 |
| `run-logging`           | named loggers, log levels, step titles as log lines, the run logger reporter   |
| `accessibility-testing` | axe audits, the a11yConfig standard and failOn level, a11y specs, the baseline |

Agents: `.claude/agents/*.md` (Claude Code) mirrored by `.github/agents/*.agent.md` (Copilot):
`journey-analyst` (read-only), `ui-test-writer`, `ui-test-reviewer` (read-only), `failure-triager`.
Commands: `.claude/commands/*.md` mirrored by `.github/prompts/*.prompt.md`: `/verify`, `/new-ui-test <journey>`,
`/review`, `/triage`. When you change one side of a pair, change the other: `npm run agent:parity` (CI) checks that
the instructions match word for word and that every skill they name exists.
