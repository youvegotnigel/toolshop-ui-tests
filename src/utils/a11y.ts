import { AxeBuilder } from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import { KNOWN_VIOLATIONS, type KnownViolation } from './a11y-known-violations';
import { blockingImpacts, describeConfig, tagsOf, type A11yConfig } from '../config/a11y.config';

export type ViolationSummary = {
  rule: string;
  impact: string;
  help: string;
  nodes: string[];
  helpUrl: string;
};

export type A11yAudit = {
  page: string;
  /** What was audited, e.g. "WCAG 2.2 AA, serious or worse". */
  standard: string;
  /** Violations at or above `failOn` that are not in the known-violation baseline. */
  blocking: ViolationSummary[];
  /** Baseline entries that still reproduce. */
  known: KnownViolation[];
  /** Baseline entries for this page that no longer reproduce: remove them from the baseline. */
  fixed: KnownViolation[];
  counts: Record<'critical' | 'serious' | 'moderate' | 'minor', number>;
};

/**
 * Runs axe on the current page against the configured standard, attaches the full report, records per-impact
 * counts as an `a11y` annotation (read by the dashboard) and splits violations into blocking, known and fixed.
 */
export const auditPage = async (
  page: Page,
  testInfo: TestInfo,
  pageKey: string,
  config: A11yConfig,
): Promise<A11yAudit> => {
  const builder = new AxeBuilder({ page }).withTags(tagsOf(config));
  if (config.disabledRules.length > 0) builder.disableRules([...config.disabledRules]);
  const results = await builder.analyze();
  const blocking = blockingImpacts(config);
  await testInfo.attach(`axe-${pageKey.replace(/\W+/g, '-')}.json`, {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  const failing = results.violations
    .filter((v) => blocking.has(v.impact ?? ''))
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
    failing.some((v) => v.rule === k.rule && v.nodes.some((node) => k.targets.includes(node)));

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
    standard: describeConfig(config),
    blocking: failing.filter((v) => !isKnown(v)),
    known: baseline.filter(reproduces),
    fixed,
    counts,
  };
};

/** A failure message a manager can read: one line per violation with the elements involved. */
export const describeViolations = (audit: A11yAudit): string =>
  [
    `${String(audit.blocking.length)} accessibility violation(s) (${audit.standard}) on ${audit.page}:`,
    ...audit.blocking.map(
      (v) => `- [${v.impact}] ${v.rule}: ${v.help} (${v.nodes.slice(0, 3).join(', ')}) ${v.helpUrl}`,
    ),
    ...audit.fixed.map(
      (k) =>
        `- FIXED: known violation ${k.rule} (${k.issue}) no longer reproduces: remove it from the baseline`,
    ),
  ].join('\n');
