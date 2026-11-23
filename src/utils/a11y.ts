import { AxeBuilder } from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { KNOWN_VIOLATIONS, type KnownViolation } from './a11y-known-violations';

/** WCAG 2.2 AA, including the 2.0 and 2.1 A/AA rules it builds on. */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BLOCKING = new Set(['serious', 'critical']);

export type ViolationSummary = {
  rule: string;
  impact: string;
  help: string;
  nodes: string[];
  helpUrl: string;
};

export type A11yAudit = {
  page: string;
  /** Serious or critical violations that are not in the known-violation baseline. */
  blocking: ViolationSummary[];
  /** Baseline entries that still reproduce. */
  known: KnownViolation[];
  /** Baseline entries for this page that no longer reproduce: remove them from the baseline. */
  fixed: KnownViolation[];
  counts: Record<'critical' | 'serious' | 'moderate' | 'minor', number>;
};

/**
 * Runs axe on the current page, attaches the full report, records per-impact counts as an `a11y`
 * annotation (read by the dashboard) and splits violations into blocking, known and fixed.
 */
export const auditPage = async (page: Page, testInfo: TestInfo, pageKey: string): Promise<A11yAudit> => {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  await testInfo.attach(`axe-${pageKey.replace(/\W+/g, '-')}.json`, {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  const serious = results.violations
    .filter((v) => BLOCKING.has(v.impact ?? ''))
    .map((v) => ({
      rule: v.id,
      impact: v.impact ?? 'unknown',
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.map((n) => n.target.join(' ')),
    }));
  const baseline = KNOWN_VIOLATIONS.filter((k) => k.page === pageKey);
  // Known only when every element is listed: the same rule on a NEW element still blocks.
  const isKnown = (v: ViolationSummary): boolean =>
    baseline.some((k) => k.rule === v.rule && v.nodes.every((node) => k.targets.includes(node)));
  const reproduces = (k: KnownViolation): boolean =>
    serious.some((v) => v.rule === k.rule && v.nodes.some((node) => k.targets.includes(node)));

  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of results.violations) {
    if (
      v.impact === 'critical' ||
      v.impact === 'serious' ||
      v.impact === 'moderate' ||
      v.impact === 'minor'
    ) {
      counts[v.impact] += 1;
    }
  }
  testInfo.annotations.push({ type: 'a11y', description: JSON.stringify({ page: pageKey, ...counts }) });

  // Fixed only where the element is rendered: a menu collapsed on a phone is not a fix.
  const rendered = async (k: KnownViolation): Promise<boolean> => {
    for (const target of k.targets) {
      // axe reports CSS paths; this is the one place a CSS selector is the right tool
      if (await page.locator(target).first().isVisible()) return true;
    }
    return false;
  };
  const fixed: KnownViolation[] = [];
  for (const k of baseline.filter((entry) => !reproduces(entry))) {
    if (await rendered(k)) fixed.push(k);
  }

  return {
    page: pageKey,
    blocking: serious.filter((v) => !isKnown(v)),
    known: baseline.filter(reproduces),
    fixed,
    counts,
  };
};

/** A failure message a manager can read: one line per violation with the elements involved. */
export const describeViolations = (audit: A11yAudit): string =>
  [
    `${String(audit.blocking.length)} serious/critical WCAG 2.2 AA violation(s) on ${audit.page}:`,
    ...audit.blocking.map(
      (v) => `- [${v.impact}] ${v.rule}: ${v.help} (${v.nodes.slice(0, 3).join(', ')}) ${v.helpUrl}`,
    ),
    ...audit.fixed.map(
      (k) =>
        `- FIXED: known violation ${k.rule} (${k.issue}) no longer reproduces: remove it from the baseline`,
    ),
  ].join('\n');
