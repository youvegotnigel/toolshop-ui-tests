// Pure formatting for the run logger (src/reporting/run-logger.ts): no I/O, unit tested by
// src/reporting/run-log-format.test.mts. Imports carry the .ts extension so plain `node --test` can load them.
import path from 'node:path';
import { type Level, parseRecord } from '../utils/logger.ts';

/*
 * Column alignment, the same rules as CaseWORKS' log4j2.xml:
 *
 *   Console: "HH:mm:ss LEVEL message"
 *            HH:mm:ss (8) + space (1) + LEVEL padded to 5 + space (1)                    = 15 characters
 *   File:    "yyyy-MM-dd HH:mm:ss.SSS | LEVEL | <source, 22 wide> | message"
 *            timestamp (23) + " | " (3) + LEVEL (5) + " | " (3) + source (22) + " | " (3) = 59 characters
 *
 * Continuation lines of a multi-line message are indented by the prefix width, so the time and level
 * columns stay clear for the eye and for grep.
 */
export const CONSOLE_PREFIX_WIDTH = 15;
export const SOURCE_WIDTH = 22;
export const FILE_PREFIX_WIDTH = 59;
/** One level of step nesting. */
export const STEP_INDENT = '   ';
/** A failure reason longer than this is cut: the full error is in the log file. */
export const MAX_REASON_CHARS = 300;
/** Stack lines on the console for unexpected errors (log4j2 `%ex{3}`); the file keeps all of them. */
export const CONSOLE_STACK_LINES = 3;

const ANSI = new RegExp(String.raw`\u001b\[[0-9;?]*[A-Za-z]`, 'g');
/** Frames that only show Playwright and Node internals (log4j2 `traceFilters`). */
const INTERNAL_FRAME = /node_modules[\\/](playwright|@playwright)|node:internal/;

export const stripAnsi = (text: string): string => text.replace(ANSI, '');

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

const indentContinuation = (message: string, width: number): string =>
  message
    .split('\n')
    .map((line, i) => (i === 0 || line.trim() === '' ? line.trimEnd() : `${' '.repeat(width)}${line}`))
    .join('\n');

export const levelLabel = (level: Level): string => level.toUpperCase().padEnd(5);

export const consoleLine = (time: Date, level: Level, message: string): string =>
  `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())} ${levelLabel(level)} ` +
  indentContinuation(message, CONSOLE_PREFIX_WIDTH);

export const fileTimestamp = (time: Date): string =>
  `${String(time.getFullYear())}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ` +
  `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}.${pad(time.getMilliseconds(), 3)}`;

export const sourceColumn = (source: string): string => source.slice(0, SOURCE_WIDTH).padEnd(SOURCE_WIDTH);

export const fileLine = (time: Date, level: Level, source: string, message: string): string =>
  `${fileTimestamp(time)} | ${levelLabel(level)} | ${sourceColumn(source)} | ` +
  indentContinuation(message, FILE_PREFIX_WIDTH);

/** A step or test duration: one decimal, in seconds (`2.1s`). */
export const seconds = (ms: number): string => `${(Math.max(0, ms) / 1_000).toFixed(1)}s`;

/** A run duration a human reads at a glance: `38.2s`, `1m 38s`, `1h 02m 05s`. */
export const humanDuration = (ms: number): string => {
  const total = Math.round(Math.max(0, ms) / 1_000);
  const [h, m, s] = [Math.floor(total / 3_600), Math.floor((total % 3_600) / 60), total % 60];
  if (h > 0) return `${String(h)}h ${pad(m)}m ${pad(s)}s`;
  if (m > 0) return `${String(m)}m ${pad(s)}s`;
  return seconds(ms);
};

/** `[chromium] describe › test`: titlePath() without the root, project and file parts. */
export const testName = (project: string, titlePath: readonly string[]): string =>
  `[${project}] ${titlePath.filter(Boolean).slice(2).join(' › ')}`;

/** `tests/cart/cart.spec.ts:15`, relative to the repo root. */
export const testLocation = (file: string, line: number, cwd: string): string =>
  `${path.relative(cwd, file).split(path.sep).join('/')}:${String(line)}`;

const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

/**
 * One line a human reads in the console: the first line of the error, without ANSI codes or a leading
 * `Error: `, plus the locator when Playwright reports one. Empty when there is no message.
 */
export const failureReason = (message: string | undefined): string => {
  const lines = stripAnsi(message ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  const first = (lines[0] ?? '').replace(/^Error:\s*/, '');
  const locator = lines.find((line) => line.startsWith('Locator:'))?.replace(/^Locator:\s*/, '');
  const reason = locator === undefined ? first : `${first} | Locator: ${locator}`;
  return truncate(reason, MAX_REASON_CHARS);
};

/** ` -> reason`, or nothing when there is no reason to show. */
export const reasonSuffix = (reason: string): string => (reason === '' ? '' : ` -> ${reason}`);

/** The `at ...` frames of a stack, without Playwright and Node internals. */
export const filterStack = (stack: string | undefined): string[] =>
  stripAnsi(stack ?? '')
    .split('\n')
    .filter((line) => /^\s+at\s/.test(line) && !INTERNAL_FRAME.test(line))
    .map((line) => line.trim());

export type ErrorLike = { message?: string; snippet?: string; stack?: string };

/** Every error with its full message, code frame and filtered stack: the file-only failure details. */
export const errorDetails = (errors: readonly ErrorLike[]): string[] =>
  errors.flatMap((error, i) => [
    `Error ${String(i + 1)}/${String(errors.length)}: ${stripAnsi(error.message ?? 'unknown error').trimEnd()}`,
    ...(error.snippet === undefined ? [] : [stripAnsi(error.snippet).trimEnd()]),
    ...filterStack(error.stack).map((frame) => `  ${frame}`),
  ]);

export type StepStatus = 'passed' | 'failed' | 'skipped';

/** `   ✅ title (2.1s)`, nested steps 3 more spaces per level; the reason only where it is given. */
export const stepLine = (
  status: StepStatus,
  title: string,
  durationMs: number,
  depth: number,
  reason = '',
): string => {
  const indent = STEP_INDENT.repeat(depth + 1);
  if (status === 'skipped') return `${indent}⏭ ${title} (skipped)`;
  const icon = status === 'passed' ? '✅' : '❌';
  return `${indent}${icon} ${title} (${seconds(durationMs)})${status === 'failed' ? reasonSuffix(reason) : ''}`;
};

/**
 * Final outcomes, one per test whatever the number of attempts: passed + flaky + failed + skipped +
 * interrupted + notRun = the tests in the run. `notRun` = never started (setup failed, run stopped early).
 */
export type Counts = {
  passed: number;
  flaky: number;
  failed: number;
  skipped: number;
  interrupted: number;
  notRun: number;
};

export const emptyCounts = (): Counts => ({
  passed: 0,
  flaky: 0,
  failed: 0,
  skipped: 0,
  interrupted: 0,
  notRun: 0,
});

export const completed = (c: Counts): number => c.passed + c.flaky + c.failed + c.skipped + c.interrupted;

/** After every final outcome; a failed attempt that will be retried is not "completed". */
export const progressLine = (c: Counts, total: number, showFlaky: boolean): string => {
  const done = completed(c);
  const percent = total === 0 ? 100 : Math.floor((done * 100) / total);
  const parts = [
    `✅ ${String(c.passed)} passed`,
    ...(showFlaky ? [`⚠ ${String(c.flaky)} flaky`] : []),
    `❌ ${String(c.failed)} failed`,
    ...(c.skipped > 0 ? [`⏭ ${String(c.skipped)} skipped`] : []),
    ...(c.interrupted > 0 ? [`⏹ ${String(c.interrupted)} interrupted`] : []),
  ];
  return `---------- Test Suite Execution Status: ${String(done)}/${String(total)} (${String(percent)}%) Completed | ${parts.join(' | ')} ----------`;
};

/** `===== Results: 15 passed, 1 flaky, 1 failed, 1 skipped (1m 38s) =====`; zero buckets after `failed` are left out. */
export const summaryLine = (c: Counts, durationMs: number): string => {
  const optional = (pairs: [number, string][]): string[] =>
    pairs.filter(([n]) => n > 0).map(([n, label]) => `${String(n)} ${label}`);
  const parts = [
    `${String(c.passed)} passed`,
    ...optional([[c.flaky, 'flaky']]),
    `${String(c.failed)} failed`,
    ...optional([
      [c.skipped, 'skipped'],
      [c.interrupted, 'interrupted'],
      [c.notRun, 'not run'],
    ]),
  ];
  return `===== Results: ${parts.join(', ')} (${humanDuration(durationMs)}) =====`;
};

/** `Failed tests:` with one `  - item` continuation line per test, like `Failed scenarios:` in CaseWORKS. */
export const listBlock = (heading: string, items: readonly string[]): string =>
  [heading, ...items.map((item) => `  - ${item}`)].join('\n');

export type OutputLine = { time: Date; level: Level; source: string; message: string };

/**
 * One line a worker printed: a logger record keeps its own time, level and source; anything else
 * (plain console.log) becomes INFO, or WARN when it came through stderr.
 */
export const parseOutputLine = (line: string, stream: 'stdout' | 'stderr', now: Date): OutputLine => {
  const record = parseRecord(line);
  if (record === undefined) {
    return {
      time: now,
      level: stream === 'stderr' ? 'warn' : 'info',
      source: stream,
      message: stripAnsi(line),
    };
  }
  const meta = record.x === undefined ? '' : ` ${JSON.stringify(record.x)}`;
  return { time: new Date(record.t), level: record.l, source: record.s, message: `${record.m}${meta}` };
};

/** Splits a stdout chunk into complete lines and the partial line to keep for the next chunk. */
export const splitChunk = (pending: string, chunk: string): { lines: string[]; rest: string } => {
  const parts = `${pending}${chunk}`.split(/\r?\n/);
  const rest = parts.pop() ?? '';
  return { lines: parts.filter((line) => line.trim() !== ''), rest };
};

/** Fields whose values never reach the log: Playwright puts typed text in the step title and params. */
export const SENSITIVE_FIELD = /pass(word)?|secret|token|cvv|cvc|card[-_]?number/i;
/** The value Playwright appends to some titles (`Fill "text"`): dropped, the params carry it. */
const QUOTED_VALUE = /\s+"[\s\S]*"$/;
/** Action and assertion params worth a line in the log, in this order. */
const ACTION_PARAMS = ['value', 'text', 'key', 'options', 'expected'] as const;
const MAX_VALUE_CHARS = 200;

export type ActionStep = { title: string; subtitle?: string; params?: Readonly<Record<string, unknown>> };

const showValue = (value: unknown): string => truncate(JSON.stringify(value), MAX_VALUE_CHARS);

/**
 * A `pw:api` or `expect` step as one line for LOG_LEVEL / LOG_FILE_LEVEL=debug: the action, its target and the
 * values it used, e.g. `Fill getByTestId('email') value="qa-...@example"`, `Select option getByTestId('sort')
 * options=[{"label":"Price (Low - High)"}]`, `Expect "toHaveText" getByTestId('cart-quantity') expected="3"`.
 * Values typed into or expected from a sensitive field (password, token, CVV) are masked.
 */
export const actionLine = (step: ActionStep): string => {
  const params = step.params ?? {};
  const locator = typeof params.locator === 'string' ? params.locator : '';
  const target = step.subtitle ?? locator;
  const masked = SENSITIVE_FIELD.test(target) || SENSITIVE_FIELD.test(locator);
  const verb = params.value === undefined ? step.title : step.title.replace(QUOTED_VALUE, '');
  const values = ACTION_PARAMS.filter((key) => params[key] !== undefined).map(
    (key) => `${key}=${masked ? '***' : showValue(params[key])}`,
  );
  return [masked ? verb.replace(QUOTED_VALUE, '') : verb, target, ...values]
    .filter((part) => part !== '')
    .join(' ');
};
