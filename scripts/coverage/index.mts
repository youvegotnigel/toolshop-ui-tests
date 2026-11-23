/**
 * Builds the UI automation dashboard.
 *   node scripts/coverage/index.mts [--results test-results/results.json] [--history coverage-history/history.json] [--site site]
 * Writes <site>/index.html (dashboard), <site>/summary.json and <site>/history.json, updates the history file,
 * and copies allure-report/ and playwright-report/ into <site>/allure and <site>/playwright (each with a link
 * back to the dashboard). Works the same on GitHub Actions, Jenkins and locally.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  appendHistory,
  collectJourneys,
  collectPages,
  collectTests,
  summarise,
  type JsonReport,
  type RunMeta,
} from './collect.mts';
import type { Dashboard, Links, Plan, RunSummary, TestRecord } from './model.mts';
import { renderDashboard } from './render.mts';

const arg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
};

const readJson = <T,>(file: string, fallback: T): T =>
  existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : fallback;

const gitCommit = (): string => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};

const runMeta = (): RunMeta => ({
  runNumber: process.env.GITHUB_RUN_NUMBER ?? process.env.BUILD_NUMBER ?? `local-${Date.now().toString(36)}`,
  commit: process.env.GITHUB_SHA ?? process.env.GIT_COMMIT ?? gitCommit(),
  env: process.env.TEST_ENV ?? 'public',
});

const runUrl = (): string | undefined => {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, BUILD_URL } = process.env;
  if (GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID) {
    return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
  }
  return BUILD_URL;
};

const BACK_LINK =
  '<a href="../" style="position:fixed;right:14px;bottom:14px;z-index:99999;background:#14202b;color:#fff;' +
  'padding:8px 14px;border-radius:99px;font:600 13px system-ui,sans-serif;text-decoration:none">← Automation dashboard</a>';

/** Copies a generated report next to the dashboard and adds a link back to it on its entry pages. */
const copyReport = (from: string, to: string): string | undefined => {
  if (!existsSync(path.join(from, 'index.html'))) return undefined;
  cpSync(from, to, { recursive: true });
  for (const page of ['index.html', 'allure2/index.html', 'awesome/index.html']) {
    const file = path.join(to, page);
    if (!existsSync(file)) continue;
    const href = page.includes('/') ? '../../' : '../';
    writeFileSync(
      file,
      readFileSync(file, 'utf8').replace('</body>', `${BACK_LINK.replace('../', href)}</body>`),
    );
  }
  return `${path.basename(to)}/`;
};

/** Classic Allure test pages are addressed by uid: map "file › describe › title" + browser to its URL. */
const allureLinks = (report: string): Map<string, string> => {
  const dir = path.join(report, 'allure2', 'data', 'test-cases');
  const links = new Map<string, string>();
  if (!existsSync(dir)) return links;
  for (const file of readdirSync(dir)) {
    const tc = readJson<{ uid: string; fullName?: string; labels?: { name: string; value: string }[] }>(
      path.join(dir, file),
      { uid: '' },
    );
    const project = tc.labels?.find((l) => l.name === 'parentSuite')?.value ?? '';
    links.set(`${tc.fullName ?? ''}|${project}`, `allure/allure2/index.html#testresult/${tc.uid}`);
  }
  return links;
};

const annotation = (report: JsonReport, type: string): string | undefined =>
  new RegExp(`"type":"${type}","description":"([^"]+)"`).exec(JSON.stringify(report))?.[1];

const resultsFile = arg('results', 'test-results/results.json');
const historyFile = arg('history', 'coverage-history/history.json');
const site = arg('site', 'site');

if (!existsSync(resultsFile)) {
  console.error(`No results at ${resultsFile}. Run the tests first (the json reporter writes it).`);
  process.exit(1);
}

const plan = readJson<Plan | undefined>('coverage-plan.json', undefined);
if (plan === undefined) throw new Error('coverage-plan.json is missing');
const report = readJson<JsonReport>(resultsFile, {
  suites: [],
  stats: { startTime: new Date().toISOString(), duration: 0 },
});

mkdirSync(site, { recursive: true });
const links: Links = {
  allure: copyReport('allure-report', path.join(site, 'allure')),
  playwright: copyReport('playwright-report', path.join(site, 'playwright')),
  run: runUrl(),
};

const allure = allureLinks('allure-report');
const tests: TestRecord[] = collectTests(report, plan).map((t) => {
  const url = allure.get(`${t.file} › ${t.story} › ${t.title}|${t.project}`);
  return url === undefined ? t : { ...t, allureUrl: url };
});
const previous = readJson<RunSummary[]>(historyFile, []);
const journeys = collectJourneys(plan, tests, previous);
const pages = collectPages(plan, tests);
const summary = summarise(report, { tests, journeys, pages }, runMeta());
const history = appendHistory(previous, summary);

const dashboard: Dashboard = {
  plan,
  summary,
  journeys,
  pages,
  tests,
  history,
  links,
  toolshopVersion: annotation(report, 'toolshop-version'),
  browserVersions: [
    ...new Set(tests.map((t) => t.browserVersion).filter((v): v is string => v !== undefined)),
  ].sort(),
};

writeFileSync(path.join(site, 'index.html'), renderDashboard(dashboard));
writeFileSync(path.join(site, 'summary.json'), JSON.stringify({ summary, journeys, pages }, null, 2));
writeFileSync(path.join(site, 'history.json'), JSON.stringify(history, null, 2));
mkdirSync(path.dirname(historyFile), { recursive: true });
writeFileSync(historyFile, JSON.stringify(history, null, 2));

console.log(
  `Dashboard: ${path.join(site, 'index.html')} | pass rate ${String(summary.passRate)}% | journeys ${String(summary.journeyCoverage)}% ` +
    `| pages ${String(summary.pageCoverage)}% | critical passing ${String(summary.criticalPassing)}%`,
);
