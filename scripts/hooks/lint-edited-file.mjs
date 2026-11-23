// Claude Code PostToolUse hook: lint and format every file an agent edits.
// Exit code 2 feeds the ESLint errors back to the agent so it fixes them immediately.
import { execFileSync } from 'node:child_process';

let input = '';
for await (const chunk of process.stdin) input += chunk;

const file = JSON.parse(input || '{}')?.tool_input?.file_path;
if (typeof file !== 'string' || !/\.(ts|mts|mjs)$/.test(file) || file.includes('node_modules'))
  process.exit(0);

try {
  execFileSync('npx', ['prettier', '--write', file], { stdio: 'ignore' });
  execFileSync('npx', ['eslint', '--fix', '--max-warnings=0', file], { stdio: 'pipe' });
} catch (error) {
  const output = error.stdout?.toString() || String(error);
  console.error(`ESLint found problems in ${file}. Fix them before continuing:\n${output}`);
  process.exit(2);
}
