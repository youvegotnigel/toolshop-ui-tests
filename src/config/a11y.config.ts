/**
 * Accessibility settings: which standard axe audits against and which impact fails a test.
 * Set once in playwright.config.ts (`use.a11yConfig`), overridden per run with A11Y_STANDARD / A11Y_FAIL_ON,
 * or per file with `test.use({ a11yConfig: { ...defaultA11yConfig, standard: 'wcag2aaa' } })`.
 */

/** The axe tags each standard runs. WCAG levels are cumulative: AA includes A, 2.2 includes 2.1 and 2.0. */
export const A11Y_STANDARDS = {
  wcag2a: { label: 'WCAG 2.0 A', tags: ['wcag2a'] },
  wcag2aa: { label: 'WCAG 2.0 AA', tags: ['wcag2a', 'wcag2aa'] },
  wcag2aaa: { label: 'WCAG 2.0 AAA', tags: ['wcag2a', 'wcag2aa', 'wcag2aaa'] },
  wcag21a: { label: 'WCAG 2.1 A', tags: ['wcag2a', 'wcag21a'] },
  wcag21aa: { label: 'WCAG 2.1 AA', tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  wcag22aa: { label: 'WCAG 2.2 AA', tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  section508: { label: 'Section 508', tags: ['section508'] },
  'en-301-549': { label: 'EN 301 549', tags: ['EN-301-549'] },
} as const satisfies Record<string, { label: string; tags: readonly string[] }>;

export type A11yStandard = keyof typeof A11Y_STANDARDS;

/** axe impacts, most severe first. */
export const A11Y_IMPACTS = ['critical', 'serious', 'moderate', 'minor'] as const;
export type A11yImpact = (typeof A11Y_IMPACTS)[number];

export type A11yConfig = {
  /** The standard and level to audit against. */
  standard: A11yStandard;
  /** The least severe impact that fails a test: 'serious' fails on serious and critical. */
  failOn: A11yImpact;
  /** Also run axe's best-practice rules (not part of any standard). */
  bestPractices: boolean;
  /** axe rule ids never to run. Each needs a comment saying why; never use it to hide a product defect. */
  disabledRules: readonly string[];
};

/** Options that playwright.config.ts can set under `use`. */
export type A11yOptions = { a11yConfig: A11yConfig };

export const defaultA11yConfig: A11yConfig = {
  standard: 'wcag22aa',
  failOn: 'serious',
  bestPractices: false,
  disabledRules: [],
};

const isStandard = (value: string): value is A11yStandard => Object.hasOwn(A11Y_STANDARDS, value);
const isImpact = (value: string): value is A11yImpact => (A11Y_IMPACTS as readonly string[]).includes(value);

/** Applies A11Y_STANDARD and A11Y_FAIL_ON on top of the configured values; an unknown value fails fast. */
export const withEnvOverrides = (config: A11yConfig): A11yConfig => {
  const standard = process.env.A11Y_STANDARD ?? '';
  const failOn = process.env.A11Y_FAIL_ON ?? '';
  if (standard !== '' && !isStandard(standard)) {
    throw new Error(
      `Unknown A11Y_STANDARD "${standard}". Use one of: ${Object.keys(A11Y_STANDARDS).join(', ')}.`,
    );
  }
  if (failOn !== '' && !isImpact(failOn)) {
    throw new Error(`Unknown A11Y_FAIL_ON "${failOn}". Use one of: ${A11Y_IMPACTS.join(', ')}.`);
  }
  return {
    ...config,
    ...(standard === '' ? {} : { standard }),
    ...(failOn === '' ? {} : { failOn }),
  };
};

/** The axe tags to run for a config. */
export const tagsOf = (config: A11yConfig): string[] => [
  ...A11Y_STANDARDS[config.standard].tags,
  ...(config.bestPractices ? ['best-practice'] : []),
];

/** The impacts that fail a test under a config: failOn and everything more severe. */
export const blockingImpacts = (config: A11yConfig): ReadonlySet<string> =>
  new Set(A11Y_IMPACTS.slice(0, A11Y_IMPACTS.indexOf(config.failOn) + 1));

/** "WCAG 2.2 AA, serious or worse": for failure messages and annotations. */
export const describeConfig = (config: A11yConfig): string =>
  `${A11Y_STANDARDS[config.standard].label}${config.bestPractices ? ' + best practices' : ''}, ${config.failOn}${
    config.failOn === 'critical' ? '' : ' or worse'
  }`;

/**
 * The browser projects that run the accessibility suite: the configured list, or A11Y_PROJECTS for one run
 * (comma-separated project names, or "none" to disable the suite). An unknown project name fails fast.
 */
export const a11yProjects = <P extends string>(configured: readonly P[], known: readonly P[]): P[] => {
  const value = process.env.A11Y_PROJECTS ?? '';
  if (value === '') return [...configured];
  if (value === 'none') return [];
  const isKnown = (name: string): name is P => (known as readonly string[]).includes(name);
  const names = value.split(',').map((name) => name.trim());
  const unknown = names.filter((name) => !isKnown(name));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown A11Y_PROJECTS "${unknown.join(', ')}". Use one of: ${known.join(', ')}, or none.`,
    );
  }
  return names.filter(isKnown);
};
