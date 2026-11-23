/** Shared types for the UI automation dashboard. */
export type Status = 'passed' | 'failed' | 'broken' | 'flaky' | 'skipped';

export const STATUSES: readonly Status[] = ['passed', 'failed', 'broken', 'flaky', 'skipped'];

export type Priority = 'critical' | 'high' | 'normal';
export const PRIORITIES: readonly Priority[] = ['critical', 'high', 'normal'];

export type Depth = 'happy' | 'negative' | 'a11y' | 'mobile';

export type PlanPage = { key: string; route: string; area: string; priority: Priority; excluded?: string };
export type PlanJourney = { id: string; title: string; area: string; priority: Priority; target: string };

/** coverage-plan.json: the only file people maintain by hand (with tags and describe titles). */
export type Plan = {
  suite: { name: string; framework: string; group: string };
  release: string;
  targetCoverage: number;
  staleAfterHours: number;
  projects: string[];
  depths: Depth[];
  pages: PlanPage[];
  journeys: PlanJourney[];
};

export type A11yCounts = { page: string; critical: number; serious: number; moderate: number; minor: number };

/** One test on one browser project. */
export type TestRecord = {
  title: string;
  /** From the describe title `area.journey: ...`. */
  journey?: string;
  story: string;
  file: string;
  project: string;
  pages: string[];
  tags: string[];
  status: Status;
  durationMs: number;
  error?: string;
  a11y: A11yCounts[];
  knownA11y: string[];
  retained: string[];
  browserVersion?: string;
  allureUrl?: string;
};

export type Cell = Status | 'none';

export type JourneyCoverage = {
  id: string;
  title: string;
  area: string;
  priority: Priority;
  target: string;
  planned: boolean;
  tests: number;
  status: Cell;
  depth: Record<Depth, Cell>;
  browsers: Record<string, Cell>;
  lastFailure?: string;
  allureUrl?: string;
};

export type PageCoverage = PlanPage & { tests: number; status: Cell };

export type RunSummary = {
  runNumber: string;
  date: string;
  commit: string;
  env: string;
  durationMs: number;
  total: number;
  counts: Record<Status, number>;
  passRate: number;
  flakyRate: number;
  journeyCoverage: number;
  pageCoverage: number;
  criticalPassing: number;
  /** Serious + critical axe findings on the worst page (known defects included). */
  a11ySerious: number;
  failingJourneys: string[];
};

export type Links = { allure?: string; playwright?: string; smart?: string; run?: string };

export type Dashboard = {
  plan: Plan;
  summary: RunSummary;
  journeys: JourneyCoverage[];
  pages: PageCoverage[];
  tests: TestRecord[];
  history: RunSummary[];
  links: Links;
  toolshopVersion?: string;
  browserVersions: string[];
};
