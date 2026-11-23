# Copilot instructions

Read and follow **[AGENTS.md](../AGENTS.md)** for every task in this repository. It is the single source of truth
for commands, architecture, test rules, Toolshop facts and safety rules, shared with Claude Code.

The essentials, in case you only read this file:

- Specs import `test`/`expect` from `src/fixtures` and get page objects, data and verification from fixtures.
  No `page.goto`, no API calls and no `new` page objects in specs.
- Every test tells its story in 2 to 6 flat business-language `test.step`s, its describe title starts with the
  journey id from `coverage-plan.json`, and it is tagged (area plus `@smoke`, `@negative`, `@a11y`).
- Page objects: locators as readonly properties, intentions as methods, no assertions except `waitForReady()`.
  `getByTestId` (the site's `data-test`) first; no CSS or XPath.
- Web-first assertions only; every created record is cleaned up; never weaken an assertion.
- Done means `npm run verify` is green.

Reusable workflows: skills in `.claude/skills/`, custom agents in `.github/agents/`, prompts in `.github/prompts/`.
For Copilot cloud agent, allow `practicesoftwaretesting.com` and `api.practicesoftwaretesting.com` in the
repository's Copilot firewall settings (see `.github/workflows/copilot-setup-steps.yml`).
