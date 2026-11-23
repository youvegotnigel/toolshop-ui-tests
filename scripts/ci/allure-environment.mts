/**
 * Prepares allure-results/ before `allure generate`:
 * - environment.properties and executor.json: base URL, Toolshop version (from the setup project),
 *   browser versions, commit, run and CI link
 * - report labels on every result, derived from tags and the describe title (no runtime calls in tests):
 *   area tag -> feature, describe title -> story, @smoke -> severity critical (else normal)
 *   node scripts/ci/allure-environment.mts [--results test-results/results.json]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const resultsFile = process.argv.includes('--results')
  ? (process.argv[process.argv.indexOf('--results') + 1] ?? 'test-results/results.json')
  : 'test-results/results.json';
const report = existsSync(resultsFile) ? readFileSync(resultsFile, 'utf8') : '{}';

const annotations = (type: string): string[] => [
  ...new Set(
    [...report.matchAll(new RegExp(`"type":\\s*"${type}",\\s*"description":\\s*"([^"]+)"`, 'g'))].map(
      (m) => m[1] ?? '',
    ),
  ),
];

const commit = (): string => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};

const testEnv = process.env.TEST_ENV ?? 'public';
const dotenv = existsSync(`.env.${testEnv}`) ? readFileSync(`.env.${testEnv}`, 'utf8') : '';
const baseUrl = process.env.BASE_URL ?? /^BASE_URL=(.+)$/m.exec(dotenv)?.[1] ?? 'unknown';
const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_RUN_NUMBER, BUILD_URL, BUILD_NUMBER } =
  process.env;
const ciUrl =
  GITHUB_RUN_ID === undefined
    ? BUILD_URL
    : `${GITHUB_SERVER_URL ?? ''}/${GITHUB_REPOSITORY ?? ''}/actions/runs/${GITHUB_RUN_ID}`;
const runNumber = GITHUB_RUN_NUMBER ?? BUILD_NUMBER ?? 'local';

const properties: Record<string, string> = {
  'Base.URL': baseUrl,
  'Test.environment': testEnv,
  'Toolshop.version': annotations('toolshop-version')[0] ?? 'unknown',
  Browsers: annotations('browser-version').sort().join(', ') || 'unknown',
  Commit: process.env.GITHUB_SHA?.slice(0, 7) ?? process.env.GIT_COMMIT?.slice(0, 7) ?? commit(),
  'Run.number': runNumber,
};

mkdirSync('allure-results', { recursive: true });
writeFileSync(
  'allure-results/environment.properties',
  Object.entries(properties)
    .map(([key, value]) => `${key}=${value.replaceAll('\n', ' ')}`)
    .join('\n') + '\n',
);
writeFileSync(
  'allure-results/executor.json',
  JSON.stringify(
    {
      name:
        GITHUB_RUN_ID !== undefined ? 'GitHub Actions' : BUILD_URL !== undefined ? 'Jenkins' : 'Local run',
      type: GITHUB_RUN_ID !== undefined ? 'github' : BUILD_URL !== undefined ? 'jenkins' : 'local',
      buildName: `Run #${runNumber}`,
      buildOrder: Number.parseInt(runNumber, 10) || undefined,
      ...(ciUrl === undefined ? {} : { url: ciUrl, buildUrl: ciUrl }),
      reportUrl: '../',
    },
    null,
    2,
  ),
);
console.log(
  `allure-environment: ${Object.entries(properties)
    .map(([k, v]) => `${k}=${v}`)
    .join(' | ')}`,
);

const AREAS = ['catalog', 'auth', 'cart', 'checkout', 'account', 'admin'];
type Label = { name: string; value: string };
let labelled = 0;
for (const file of readdirSync('allure-results').filter((f) => f.endsWith('-result.json'))) {
  const path = `allure-results/${file}`;
  const result = JSON.parse(readFileSync(path, 'utf8')) as { labels: Label[] };
  const value = (name: string): string | undefined => result.labels.find((l) => l.name === name)?.value;
  const tags = result.labels.filter((l) => l.name === 'tag').map((l) => l.value);
  const add = (name: string, label: string | undefined): void => {
    if (label !== undefined && value(name) === undefined) result.labels.push({ name, value: label });
  };
  add(
    'feature',
    AREAS.find((area) => tags.includes(area)),
  );
  add('story', value('subSuite'));
  add('severity', tags.includes('smoke') ? 'critical' : 'normal');
  writeFileSync(path, JSON.stringify(result));
  labelled += 1;
}
console.log(`allure-environment: labelled ${String(labelled)} result(s)`);
