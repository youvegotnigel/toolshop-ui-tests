import type { TestInfo } from '@playwright/test';

/** Area tags in the order they are matched: the first one becomes the Allure feature. */
export const AREAS = ['catalog', 'auth', 'cart', 'checkout', 'account', 'admin'] as const;
export type Area = (typeof AREAS)[number];

/** Journey ids look like `catalog.search` and lead every describe title: `catalog.search: A shopper ...`. */
export const JOURNEY = /^([a-z]+\.[a-z-]+)\b/;

export type ReportLabels = { area?: Area; journey?: string; story: string; critical: boolean };

/** Derives the report labels from tags and the describe title, so specs never repeat them. */
export const labelsOf = (testInfo: TestInfo): ReportLabels => {
  const tags = testInfo.tags.map((t) => t.replace(/^@/, ''));
  const describe = testInfo.titlePath.at(-2) ?? testInfo.title;
  return {
    area: AREAS.find((area) => tags.includes(area)),
    journey: JOURNEY.exec(describe)?.[1],
    story: describe,
    critical: tags.includes('smoke'),
  };
};
