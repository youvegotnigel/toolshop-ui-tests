## What and why

<!-- One or two sentences. Link the issue. -->

## Journeys and pages covered

| Journey (`area.name`) | Pages (`page:<key>`) | Scenario (test.step names) |
| --------------------- | -------------------- | -------------------------- |
|                       |                      |                            |

## Checklist

- [ ] `npm run verify` passes locally (typecheck, lint, format, agent parity, tests)
- [ ] Green on chromium, firefox and webkit, and with `npm run test:shuffle`
- [ ] Specs import `test`/`expect` from `src/fixtures`, get page objects and data from fixtures, never `page.goto` or the API
- [ ] 2 to 6 flat business-language `test.step`s; describe title starts with the journey id; area and depth tags set
- [ ] Pages declared with `covers` annotations; `coverage-plan.json` updated for new pages or journeys
- [ ] Locators: `getByTestId` first, no CSS or XPath; page objects hold no assertions except `waitForReady()`
- [ ] Repeated cases are a typed cases table (`for...of`, title from the row, one broken thing per row, no `if` per row)
- [ ] Every created record is cleaned up (factory fixtures / `cleanup.add`); 409s explained if any
- [ ] No sleeps, retries or weakened assertions; any known product defect has an issue and evidence
- [ ] No secrets, tokens or personal data in code, logs or attachments
- [ ] If written by an AI agent: reviewed with the `review-ui-tests` skill and by a human
