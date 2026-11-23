---
name: review-ui-tests
description: 'Review a diff of Toolshop UI tests, page objects or fixtures against AGENTS.md: blocking findings (flakiness, weak assertions, leaked data or secrets, broken architecture) and non-blocking ones. Use before opening or approving a PR, including AI-written changes.'
---

# Review UI tests

Review `git diff origin/main...HEAD`. Report findings as **Blocking** or **Non-blocking**, each with
file:line, the rule from `AGENTS.md`, and the fix. Do not edit files while reviewing.

## Critical

- Read-only: report, never edit. Every finding cites file:line, the `AGENTS.md` rule and the fix.
- A blocking finding blocks approval, whoever wrote the change (human or agent).

## Procedure

1. `node scripts/scan-constitution.mts` (changed files vs `origin/main`): mechanical violations ESLint cannot see
   (tokens, forbidden endpoints, focused or skipped tests, disables without a reason).
2. Walk `references/checklist.md` over the diff; check each spec's steps read as a business story.
3. Check every new locator against `selectors` and every expected value against `test-data`.

## Verify

Run `npm run verify` and the changed specs with `--repeat-each=3 --shuffle` on chromium, firefox and webkit.
Report results with the findings.

## References

- `references/checklist.md`: blocking and non-blocking findings.
