/**
 * Known accessibility defects in the Toolshop itself (product bugs, not test bugs).
 * They are reported on every run (annotation + dashboard) but do not fail the test, so a NEW
 * violation still fails it. When one disappears the audit fails with "FIXED: remove it", so the
 * baseline can never hide a regression. Every entry needs a GitHub issue. Never add an entry to
 * make a red test green without proving the defect is in the site (axe JSON attached to the test).
 */
export type KnownViolation = {
  /** axe rule id */
  rule: string;
  /** coverage-plan page key, e.g. page:product */
  page: string;
  /** The axe node targets (CSS paths axe reports) known to fail the rule on that page. */
  targets: readonly string[];
  issue: string;
  summary: string;
};

const LABEL_IN_NAME = 'https://github.com/youvegotnigel/toolshop-ui-tests/issues/1';

export const KNOWN_VIOLATIONS: readonly KnownViolation[] = [
  {
    rule: 'label-content-name-mismatch',
    page: 'page:product',
    targets: ['#language'],
    issue: LABEL_IN_NAME,
    summary: 'Language selector: visible text is not part of its accessible name (WCAG 2.5.3)',
  },
  {
    rule: 'label-content-name-mismatch',
    page: 'page:order-confirmation',
    targets: ['#language', 'a[data-test="nav-cart"]'],
    issue: LABEL_IN_NAME,
    summary: 'Language selector and cart link: visible text is not part of the accessible name (WCAG 2.5.3)',
  },
];
