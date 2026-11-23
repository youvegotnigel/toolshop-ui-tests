# Conversation contract

What the agent must have before Phase 4, per intent. Missing: ask, in one message, as a list.

| Intent             | Primary inputs                                                                                 | Ask like this                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| New journey / spec | Journey id (or a new one for `coverage-plan.json`), the shopper, the expected outcome per step | "Which journey id should this cover, and is the shopper a guest or signed in?"       |
| Page object        | Route, the page's ready signal, the user intentions it needs                                   | "Which actions does the test need on /account/invoices: open one, filter, download?" |
| Data               | What the test must own, which values the assertions derive from                                | "Should the product be in stock and below 100 so sorting shows it?"                  |
| Failing test       | Run (local or CI run id), browser, whether it reproduces                                       | "Which run failed? I will read its failure-summary.json and traces."                 |
| Flaky test         | How often, which browsers, a failing trace                                                     | "Do you have a failing trace, or should I reproduce with --repeat-each=10?"          |
| Review             | Branch or PR                                                                                   | "Review `origin/main...HEAD` of the current branch?"                                 |

## Human gate outcomes

- **Approve**: apply exactly the proposal. Scope growth needs a new proposal.
- **Modify**: restate the changed proposal with a new confidence, then wait again.
- **Reject**: return to exploration with the stated gap; never resubmit the same plan reworded.

## Report format

```
## Done
- Files: <path (+added/-removed lines)>
- Journey: <id> · Steps: <titles>
- Pages covered: <page keys>
- Verify: lint ✔ typecheck ✔ chromium/firefox/webkit ✔ repeat-each=3 shuffle ✔
- Sweep: removed N, kept M (HTTP 409, orders)
- Next: <commit? follow-ups?>
```
