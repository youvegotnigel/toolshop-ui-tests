# Accessibility configuration

`use.a11yConfig` in `playwright.config.ts`, typed by `A11yConfig` in `src/config/a11y.config.ts`:

| Option          | Values                                           | Default    | Meaning                                                       |
| --------------- | ------------------------------------------------ | ---------- | ------------------------------------------------------------- |
| `standard`      | see the table below                              | `wcag22aa` | Which axe rule tags run                                       |
| `failOn`        | `critical` \| `serious` \| `moderate` \| `minor` | `serious`  | The least severe impact that fails; more severe ones fail too |
| `bestPractices` | `true` \| `false`                                | `false`    | Also run axe `best-practice` rules (not part of a standard)   |
| `disabledRules` | axe rule ids                                     | `[]`       | Rules never run; each with a comment why, never for a defect  |

## Standards

WCAG levels are cumulative: AA includes A, 2.2 includes 2.1 and 2.0.

| `standard`   | Label        | axe tags                                               |
| ------------ | ------------ | ------------------------------------------------------ |
| `wcag2a`     | WCAG 2.0 A   | `wcag2a`                                               |
| `wcag2aa`    | WCAG 2.0 AA  | `wcag2a`, `wcag2aa`                                    |
| `wcag2aaa`   | WCAG 2.0 AAA | `wcag2a`, `wcag2aa`, `wcag2aaa`                        |
| `wcag21a`    | WCAG 2.1 A   | `wcag2a`, `wcag21a`                                    |
| `wcag21aa`   | WCAG 2.1 AA  | `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`             |
| `wcag22aa`   | WCAG 2.2 AA  | `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` |
| `section508` | Section 508  | `section508`                                           |
| `en-301-549` | EN 301 549   | `EN-301-549`                                           |

To add one, add a key to `A11Y_STANDARDS` with tags that exist in the installed axe-core
(`node -e "console.log(require('axe-core').getRules().flatMap(r => r.tags))"`).

## Three ways to change it

```ts
// 1. Everyone, every run: playwright.config.ts
const a11yConfig: A11yConfig = {
  standard: 'wcag21aa',
  failOn: 'moderate',
  bestPractices: false,
  disabledRules: [],
};
```

```bash
# 2. One run, no code change (unknown values fail fast)
A11Y_STANDARD=wcag2aaa A11Y_FAIL_ON=moderate npm run test:a11y
```

```ts
// 3. One file (an exception: say why)
import { defaultA11yConfig } from '../../src/config/a11y.config';
test.use({ a11yConfig: { ...defaultA11yConfig, bestPractices: true } });
```

## What each audit records

- attachment `axe-page-<key>.json`: the full axe result (violations of every impact, passes, incomplete)
- annotation `a11y`: per-impact counts for the dashboard; `a11y-standard`: e.g. `WCAG 2.2 AA, serious or worse`
- annotation `known-a11y-violation` per baseline entry that still reproduces
- failure message: one line per blocking violation with impact, rule, help, up to 3 elements and the help URL,
  plus `FIXED:` lines for baseline entries that no longer reproduce
