---
name: explore-site
description: 'Explore the live Toolshop with playwright-cli before writing any page object, locator or test: open a route, snapshot the accessibility tree, read data-test attributes, check a phone viewport and watch for races. Exploration only: it never writes assertions or tests. Use whenever UI code needs evidence from the real site.'
allowed-tools: Bash(npx playwright-cli:*)
---

# Explore the site

## Critical

- **Exploration informs locators and waits, never expected values.** Expected values come from the test's own
  data or a documented rule.
- **Explore in the state the test will run in**: guest, or signed in. Never sign in as a shared demo customer
  (they lock for everyone, HTTP 423). Never submit forgot-password or change-password, never open `/refresh`.
- **Data you create while exploring** carries `qa-explore` in names and emails, so the team can find and remove it.
- Base URLs come from `.env.<TEST_ENV>` (`BASE_URL`), never from memory. `with-bugs` uses hash routes (`/#/...`).
- Close the session when done (`npx playwright-cli close`). Snapshots land in `.playwright-cli/` (git-ignored).

## Procedure

1. `grep '^BASE_URL' .env.${TEST_ENV:-public}`.
2. `npx playwright-cli open <BASE_URL><route>`, then `npx playwright-cli snapshot`: roles, names, refs.
3. Read the `data-test` attributes (the snapshot does not show them):
   `npx playwright-cli eval "() => [...document.querySelectorAll('[data-test]')].map(e => e.tagName + ':' + e.dataset.test)"`
4. Walk the journey as a user (`click <ref>`, `fill <ref> <text>`, `select <ref> <value>`), snapshot after each
   step, and note what proves each step worked (toast, badge, URL, text).
5. Phones: `npx playwright-cli resize 412 915` and snapshot again: what is collapsed (menu, filters)?
6. Races: watch network (`npx playwright-cli network`) for requests that land after the page looks ready
   (profile `GET /users/me`, `/postcode-lookup`). Note them for the page object.
7. Record the brief: route, ready signal, element table (data-test, role and name), feedback elements, races,
   phone differences. Hand it to `add-page-object` or `add-ui-test`.

## References

- `references/commands.md`: the playwright-cli commands this repo uses, with Toolshop examples.
