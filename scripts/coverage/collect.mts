/** Turns a Playwright JSON report and coverage-plan.json into journey, page and run metrics. */
import type {
  A11yCounts,
  Cell,
  Depth,
  JourneyCoverage,
  PageCoverage,
  Plan,
  PlanJourney,
  RunSummary,
  Status,
  TestRecord,
} from './model.mts';
import { STATUSES } from './model.mts';

type Annotation = { type: string; description?: string };
type JsonResult = {
  status: string;
  duration: number;
  error?: { message?: string };
  annotations?: Annotation[];
};
type JsonTest = { projectName: string; status: string; results: JsonResult[]; annotations?: Annotation[] };
type JsonSpec = { title: string; file: string; tags?: string[]; tests: JsonTest[] };
type JsonSuite = { title: string; specs?: JsonSpec[]; suites?: JsonSuite[] };
export type JsonReport = { suites: JsonSuite[]; stats: { startTime: string; duration: number } };

const JOURNEY = /^([a-z]+\.[a-z-]+)\b/;
const ANSI = new RegExp(String.raw`\u001b\[[0-9;]*m`, 'g');

const statusOf = (test: JsonTest): Status => {
  if (test.status === 'expected') return 'passed';
  if (test.status === 'flaky') return 'flaky';
  if (test.status === 'skipped') return 'skipped';
  const last = test.results.at(-1);
  if (last === undefined || last.status === 'timedOut' || last.status === 'interrupted') return 'broken';
  return (last.error?.message ?? '').includes('expect(') ? 'failed' : 'broken';
};

/** Runtime annotations live on the results; static ones on the test. */
const annotationsOf = (test: JsonTest): Annotation[] => [
  ...(test.annotations ?? []),
  ...test.results.flatMap((r) => r.annotations ?? []),
];

const valuesOf = (annotations: Annotation[], type: string): string[] => [
  ...new Set(annotations.filter((a) => a.type === type).map((a) => a.description ?? '')),
];

const a11yOf = (annotations: Annotation[]): A11yCounts[] =>
  valuesOf(annotations, 'a11y').map((json) => JSON.parse(json) as A11yCounts);

const recordOf = (spec: JsonSpec, path: string[], test: JsonTest): TestRecord => {
  const annotations = annotationsOf(test);
  const story = path.at(-1) ?? spec.title;
  const error = test.results.at(-1)?.error?.message;
  return {
    title: spec.title,
    journey: JOURNEY.exec(story)?.[1],
    story,
    file: spec.file,
    project: test.projectName,
    pages: valuesOf(annotations, 'covers').filter((p) => p.startsWith('page:')),
    // The JSON reporter drops the '@'; keep one spelling everywhere
    tags: (spec.tags ?? []).map((tag) => (tag.startsWith('@') ? tag : `@${tag}`)),
    status: statusOf(test),
    durationMs: test.results.reduce((sum, r) => sum + r.duration, 0),
    ...(error === undefined ? {} : { error: error.replace(ANSI, '').split('\n')[0] ?? '' }),
    a11y: a11yOf(annotations),
    knownA11y: valuesOf(annotations, 'known-a11y-violation'),
    retained: valuesOf(annotations, 'retained'),
    browserVersion: valuesOf(annotations, 'browser-version')[0],
  };
};

const walk = (suite: JsonSuite, titles: string[], projects: Set<string>, out: TestRecord[]): void => {
  const path = suite.title === '' || suite.title.endsWith('.ts') ? titles : [...titles, suite.title];
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests.filter((t) => projects.has(t.projectName))) {
      out.push(recordOf(spec, path, test));
    }
  }
  for (const child of suite.suites ?? []) walk(child, path, projects, out);
};

export const collectTests = (report: JsonReport, plan: Plan): TestRecord[] => {
  const out: TestRecord[] = [];
  for (const suite of report.suites) walk(suite, [], new Set(plan.projects), out);
  return out;
};

const RANK: Record<Cell, number> = { none: 0, skipped: 1, passed: 2, flaky: 3, broken: 4, failed: 5 };

/** The worst result wins: one red browser makes the journey red. */
export const worst = (cells: Cell[]): Cell =>
  cells.reduce<Cell>((acc, cell) => (RANK[cell] > RANK[acc] ? cell : acc), 'none');

const isFailing = (cell: Cell): boolean => cell === 'failed' || cell === 'broken';

const depthCells = (tests: TestRecord[]): Record<Depth, Cell> => ({
  // Every test of a journey walks its happy path; @negative marks tests that also prove refusals.
  happy: worst(tests.map((t) => t.status)),
  negative: worst(tests.filter((t) => t.tags.includes('@negative')).map((t) => t.status)),
  a11y: worst(tests.filter((t) => t.tags.includes('@a11y')).map((t) => t.status)),
  mobile: worst(
    tests.filter((t) => t.project.startsWith('mobile') || t.tags.includes('@mobile')).map((t) => t.status),
  ),
});

type History = { lastFailure: (journey: string) => string | undefined };

const journeyOf = (
  plan: Plan,
  journey: PlanJourney,
  tests: TestRecord[],
  history: History,
): JourneyCoverage => {
  const mine = tests.filter((t) => t.journey === journey.id);
  return {
    ...journey,
    planned: true,
    tests: new Set(mine.map((t) => `${t.file}:${t.title}`)).size,
    status: worst(mine.map((t) => t.status)),
    depth: depthCells(mine),
    browsers: Object.fromEntries(
      plan.projects.map((p) => [p, worst(mine.filter((t) => t.project === p).map((t) => t.status))]),
    ),
    lastFailure: mine.some((t) => isFailing(t.status)) ? 'this run' : history.lastFailure(journey.id),
    allureUrl: mine.find((t) => t.allureUrl !== undefined)?.allureUrl,
  };
};

export const collectJourneys = (
  plan: Plan,
  tests: TestRecord[],
  previous: RunSummary[],
): JourneyCoverage[] => {
  const history: History = {
    lastFailure: (id) => previous.findLast((run) => run.failingJourneys.includes(id))?.date,
  };
  // Journeys a spec names but the plan does not list still show up, flagged as unplanned.
  const unplanned = [...new Set(tests.map((t) => t.journey))]
    .filter((id): id is string => id !== undefined && !plan.journeys.some((j) => j.id === id))
    .map((id): PlanJourney => ({
      id,
      title: 'Not in coverage-plan.json',
      area: id.split('.')[0] ?? '',
      priority: 'normal',
      target: '-',
    }));
  return [
    ...plan.journeys.map((j) => journeyOf(plan, j, tests, history)),
    ...unplanned.map((j) => ({ ...journeyOf(plan, j, tests, history), planned: false })),
  ];
};

export const collectPages = (plan: Plan, tests: TestRecord[]): PageCoverage[] =>
  plan.pages.map((page) => {
    const mine = tests.filter((t) => t.pages.includes(page.key));
    return {
      ...page,
      tests: new Set(mine.map((t) => `${t.file}:${t.title}`)).size,
      status: worst(mine.map((t) => t.status)),
    };
  });

const percent = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

export type RunMeta = { runNumber: string; commit: string; env: string };

export const summarise = (
  report: JsonReport,
  data: { tests: TestRecord[]; journeys: JourneyCoverage[]; pages: PageCoverage[] },
  meta: RunMeta,
): RunSummary => {
  const { tests, journeys, pages } = data;
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  for (const test of tests) counts[test.status] += 1;
  const executed = tests.length - counts.skipped;
  const planned = journeys.filter((j) => j.planned);
  const critical = planned.filter((j) => j.priority === 'critical');
  const inScope = pages.filter((p) => p.excluded === undefined);
  return {
    ...meta,
    date: report.stats.startTime,
    durationMs: Math.round(report.stats.duration),
    total: tests.length,
    counts,
    passRate: percent(counts.passed + counts.flaky, executed),
    flakyRate: percent(counts.flaky, executed),
    journeyCoverage: percent(planned.filter((j) => j.tests > 0).length, planned.length),
    pageCoverage: percent(inScope.filter((p) => p.tests > 0).length, inScope.length),
    criticalPassing: percent(
      critical.filter((j) => j.status === 'passed' || j.status === 'flaky').length,
      critical.length,
    ),
    a11ySerious: Math.max(0, ...pageA11y(tests).map((p) => p.critical + p.serious)),
    failingJourneys: journeys.filter((j) => isFailing(j.status)).map((j) => j.id),
  };
};

/** Worst counts seen per page across browsers. */
export const pageA11y = (tests: TestRecord[]): A11yCounts[] => {
  const byPage = new Map<string, A11yCounts>();
  for (const counts of tests.flatMap((t) => t.a11y)) {
    const seen = byPage.get(counts.page) ?? {
      page: counts.page,
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
    };
    byPage.set(counts.page, {
      page: counts.page,
      critical: Math.max(seen.critical, counts.critical),
      serious: Math.max(seen.serious, counts.serious),
      moderate: Math.max(seen.moderate, counts.moderate),
      minor: Math.max(seen.minor, counts.minor),
    });
  }
  return [...byPage.values()].sort((a, b) => a.page.localeCompare(b.page));
};

/** Keeps the latest 30 runs; re-running the same run number replaces its entry. */
export const appendHistory = (history: RunSummary[], run: RunSummary): RunSummary[] =>
  [...history.filter((h) => h.runNumber !== run.runNumber), run].slice(-30);
