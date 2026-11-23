# playwright-cli in this repo

`@playwright/cli` is pinned in `package.json`; run it with `npx playwright-cli`. It drives a real browser and
prints an accessibility snapshot with element refs (`e15`) that the next command can target.

| Goal                          | Command                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| Open a page                   | `npx playwright-cli open https://practicesoftwaretesting.com/auth/login`                                 |
| Navigate                      | `npx playwright-cli goto https://practicesoftwaretesting.com/checkout`                                   |
| Snapshot (roles, names, refs) | `npx playwright-cli snapshot`                                                                            |
| Find text in the snapshot     | `npx playwright-cli find "Proceed"`                                                                      |
| List data-test attributes     | `npx playwright-cli eval "() => [...document.querySelectorAll('[data-test]')].map(e => e.dataset.test)"` |
| Act                           | `npx playwright-cli click e72`, `fill e65 "qa-explore@toolshop-tests.example"`, `select e80 DE`          |
| Phone viewport                | `npx playwright-cli resize 412 915`                                                                      |
| Network and console           | `npx playwright-cli network`, `npx playwright-cli console`                                               |
| Storage (session state)       | `npx playwright-cli eval "() => ({ ls: Object.keys(localStorage), ss: Object.keys(sessionStorage) })"`   |
| Several sessions              | `npx playwright-cli -s=guest open ...`, `npx playwright-cli -s=customer open ...`                        |
| Close                         | `npx playwright-cli close`                                                                               |

What exploration found so far (keep `AGENTS.md` "Toolshop facts" in sync when you learn more):

- Every interactive element has `data-test`; product cards are `product-<ULID>` (numbers on with-bugs).
- Product badges (brand, category) have only an `aria-label`.
- Checkout is one route (`/checkout`) with four steps; the address step races `GET /users/me`.
- Phones collapse the navbar (button "Toggle navigation") and the filters panel (`data-test="filters"`).
