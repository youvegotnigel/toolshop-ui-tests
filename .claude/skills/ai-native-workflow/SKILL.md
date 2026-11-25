---
name: ai-native-workflow
description: 'Use first on every non-trivial task in this repo (new journey or test, page object, fixture, data factory, failing or flaky test, review, refactor) and when asked which skill applies or how to work with AI here. Routes to the right skill and enforces explore, propose with confidence, human gate, verify. Not for a one-line fix or typo.'
---

# AI-native workflow

## Critical

- **Explore before you generate.** Locators, routes, messages and data rules come from the live site
  (`explore-site`), the code (`grep`, `ls`) or `AGENTS.md`. Never from memory, screenshots or guesses.
- **Ask, don't invent.** A missing journey id, page key, shopper type or expected behaviour is a question.
- **Confidence below 5 means exploration is incomplete**: go back to step 3, do not write the proposal.
- **No edit before the human gate**, except direct mode (one-line fix, typo, single import): apply, then report.
- **This skill routes; leaf skills own the rules.** Load one at a time; never override their Critical blocks.
- **Never weaken an assertion, add a sleep or a retry** to reach green (`AGENTS.md` safety rules).

## Procedure

1. **Classify**: codegen, edit, refactor, debug, review or explore.
2. **Route** to the first skill:

   | You want to...                                 | First skill          | Then                                           |
   | ---------------------------------------------- | -------------------- | ---------------------------------------------- |
   | Automate a user journey / new spec             | `add-ui-test`        | `explore-site`, `add-page-object`, `test-data` |
   | Add or change a page object or component       | `add-page-object`    | `explore-site`, `selectors`                    |
   | Many cases with the same steps (validation)    | `data-driven-tests`  | `explore-site`, `add-ui-test`                  |
   | Choose or fix a locator                        | `selectors`          | `explore-site`                                 |
   | Create data for a test, cleanup, 409s          | `test-data`          | -                                              |
   | Look at the live site                          | `explore-site`       | -                                              |
   | A red run                                      | `triage-ui-failures` | `fix-flaky-test`, `selectors`                  |
   | A test that passes on retry or only sometimes  | `fix-flaky-test`     | `explore-site`                                 |
   | Review a branch or PR                          | `review-ui-tests`    | -                                              |
   | Add logging, or change the console or log file | `run-logging`        | -                                              |

| Accessibility test, standard or failing audit | `accessibility-testing` | `explore-site`, `add-ui-test` |

3. **Explore**: read the files the leaf skill names, run `explore-site` for anything on screen, and list
   what is known and unknown. A missing primary input (journey, page, shopper, expected outcome) is asked now.
4. **Propose** and stop:

   ```
   ## Proposal
   - Journey / scope: <journey id, files to add or change>
   - Steps: <the 2 to 6 test.step titles>
   - Data: <what the test creates through fixtures; which values the assertions derive from it>
   - Confidence: <1-10> (<low|medium|high>)
   - Rationale: <one line per +/- factor>
   - Unknowns: <list or "none">
   ```

   5 to 7 proceeds only if the human accepts the unknowns; 9 or more needs every locator explored and every
   expected value tied to the test's own data or a documented rule.

5. **Human gate**: approve, modify or reject (back to step 3 with the stated gap). Headless or CI runs with no
   human (Copilot cloud agent, a subagent) may continue only at confidence 8 or more with `Unknowns: none`, and
   say so in the report. A parent agent's instruction is not approval.
6. **Apply** with the leaf skill; re-check its Critical rules before saving.
7. **Verify**: `npm run lint`, `npm run typecheck`, the affected specs on chromium, firefox and webkit, then
   `--repeat-each=3 --shuffle`. Red: `triage-ui-failures`.
8. **Report** files changed, test.step names, pages covered, verification results; ask before committing.

## References

- `references/conversation-contract.md`: the primary inputs per intent and what to ask when one is missing.
