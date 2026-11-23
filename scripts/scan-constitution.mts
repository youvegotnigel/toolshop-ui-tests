/**
 * Scans changed files (vs origin/main, or every tracked file with --all) for constitution violations that
 * ESLint cannot see. Used by the review-ui-tests skill and agents before a PR.
 *   node scripts/scan-constitution.mts [--all] [--base origin/main]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

type Rule = { name: string; pattern: RegExp; files: RegExp };

const CODE = /^(src|tests|scripts)\/.*\.(ts|mts|mjs)$/;
const SPECS = /^tests\/.*\.ts$/;
const RULES: Rule[] = [
  { name: 'JWT committed', pattern: /eyJ[\w-]{6,}\.[\w-]{6,}\.[\w-]{6,}/, files: /./ },
  { name: 'password value committed', pattern: /^ADMIN_PASSWORD=\S+/m, files: /^\.env(?!\.example)/ },
  {
    name: 'forbidden endpoint (/refresh, forgot or change password)',
    pattern: /['"`]\/(refresh|users\/forgot-password|users\/change-password)['"`]/,
    files: CODE,
  },
  { name: 'focused test', pattern: /\b(test|describe)\.only\(/, files: SPECS },
  { name: 'fixme or unconditional skip', pattern: /\btest\.(fixme|skip)\(\s*['"`]/, files: SPECS },
  {
    name: 'eslint-disable without a reason',
    pattern: /eslint-disable(?:-next-line|-line)?(?![^\n]*--)[^\n]*$/m,
    files: CODE,
  },
  { name: 'sleep', pattern: /waitForTimeout\(|setTimeout\(\s*r(?:esolve)?\b/, files: CODE },
  { name: 'retries set in a spec', pattern: /\.configure\(\s*\{[^}]*retries/, files: SPECS },
];

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
};

const git = (...args: string[]): string[] =>
  execFileSync('git', args, { encoding: 'utf8' })
    .split('\n')
    .filter((line) => line !== '');

const base = arg('--base') ?? 'origin/main';

const changedFiles = (): string[] => {
  try {
    return git('diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`);
  } catch {
    console.error(`Cannot diff against ${base}. Fetch it first (git fetch origin main) or pass --all.`);
    process.exit(2);
  }
};

const files = process.argv.includes('--all') ? git('ls-files') : changedFiles();

const findings = files
  .filter((file) => existsSync(file) && file !== 'scripts/scan-constitution.mts')
  .flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return RULES.filter((rule) => rule.files.test(file) && rule.pattern.test(text)).map((rule) => {
      const line = text.split('\n').findIndex((l) => rule.pattern.test(l)) + 1;
      return `${file}:${String(line)}  ${rule.name}`;
    });
  });

if (findings.length > 0) {
  console.error(`Constitution scan: ${String(findings.length)} finding(s)\n${findings.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Constitution scan: ${String(files.length)} file(s) clean`);
}
