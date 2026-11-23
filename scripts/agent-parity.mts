/**
 * Keeps Claude Code and GitHub Copilot customisations in step. Runs in CI and in `npm run verify`.
 * - every .claude/agents/<name>.md has .github/agents/<name>.agent.md (and back), same name, description and body
 * - every .claude/commands/<name>.md has .github/prompts/<name>.prompt.md (and back), same description and body
 *   (the argument placeholder `$ARGUMENTS` / `${input:...}` is the only allowed difference)
 * - every skill folder has a SKILL.md whose `name` matches the folder and has a description
 * - CLAUDE.md imports AGENTS.md and copilot-instructions.md points to it
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const problems: string[] = [];

const names = (dir: string, suffix: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => file.endsWith(suffix))
        .map((file) => file.slice(0, -suffix.length))
    : [];

type Doc = { meta: Record<string, string>; body: string };

const parse = (file: string): Doc => {
  const text = readFileSync(file, 'utf8');
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  const meta = Object.fromEntries(
    (match?.[1] ?? '').split('\n').map((line) => {
      const at = line.indexOf(':');
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }),
  );
  const body = (match?.[2] ?? text)
    .replace(/<!-- Mirror of [^>]*-->/g, '')
    .replace(/\$ARGUMENTS|\$\{input:[^}]*\}/g, '<ARG>')
    .replace(/\s+/g, ' ')
    .trim();
  return { meta, body };
};

const pair = (left: [string, string], right: [string, string], fields: string[]): void => {
  const [leftDir, leftSuffix] = left;
  const [rightDir, rightSuffix] = right;
  const l = names(leftDir, leftSuffix);
  const r = names(rightDir, rightSuffix);
  l.filter((n) => !r.includes(n)).forEach((n) => problems.push(`${rightDir}/${n}${rightSuffix} is missing`));
  r.filter((n) => !l.includes(n)).forEach((n) => problems.push(`${leftDir}/${n}${leftSuffix} is missing`));
  for (const name of l.filter((n) => r.includes(n))) {
    const a = parse(path.join(leftDir, `${name}${leftSuffix}`));
    const b = parse(path.join(rightDir, `${name}${rightSuffix}`));
    for (const field of fields.filter((f) => a.meta[f] !== b.meta[f])) {
      problems.push(`${name}: "${field}" differs between ${leftDir} and ${rightDir}`);
    }
    if (a.body !== b.body) problems.push(`${name}: instructions differ between ${leftDir} and ${rightDir}`);
  }
};

pair(['.claude/agents', '.md'], ['.github/agents', '.agent.md'], ['name', 'description']);
pair(['.claude/commands', '.md'], ['.github/prompts', '.prompt.md'], ['description', 'argument-hint']);

const skillsDir = '.claude/skills';
for (const skill of existsSync(skillsDir) ? readdirSync(skillsDir) : []) {
  const file = path.join(skillsDir, skill, 'SKILL.md');
  if (!existsSync(file)) {
    problems.push(`${file} is missing`);
    continue;
  }
  const { meta } = parse(file);
  if (meta.name !== skill) problems.push(`${file}: name must be "${skill}"`);
  if ((meta.description ?? '').length < 20)
    problems.push(`${file}: add a description of at least 20 characters`);
}

// Every skill an agent, command or AGENTS.md names must exist (catches renames and typos)
const skills = new Set(existsSync(skillsDir) ? readdirSync(skillsDir) : []);
const named = ['AGENTS.md', ...names('.claude/agents', '.md').map((n) => `.claude/agents/${n}.md`)]
  .concat(names('.claude/commands', '.md').map((n) => `.claude/commands/${n}.md`))
  .flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/\.claude\/skills\/([a-z-]+)\//g)].map((m) => ({
      file,
      skill: m[1] ?? '',
    })),
  );
for (const { file, skill } of named.filter(({ skill }) => !skills.has(skill))) {
  problems.push(`${file} names .claude/skills/${skill}/, which does not exist`);
}

if (!readFileSync('CLAUDE.md', 'utf8').includes('@AGENTS.md'))
  problems.push('CLAUDE.md must import @AGENTS.md');
if (!readFileSync('.github/copilot-instructions.md', 'utf8').includes('AGENTS.md')) {
  problems.push('.github/copilot-instructions.md must point to AGENTS.md');
}

if (problems.length > 0) {
  console.error(`Agent parity check failed:\n- ${problems.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Agent parity OK: Claude Code and Copilot customisations match');
}
