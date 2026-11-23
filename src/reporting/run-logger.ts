import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import { RUN_LOGGER_FLAG, type Level } from '../utils/logger';
import { RunLogFile, LOG_FILE } from './run-log-file';
import {
  attemptKey,
  attempts,
  auxName,
  auxiliaryProjects,
  describeTest,
  failedBelow,
  failureDetails,
  isSkippedStep,
  projectOf,
  stepDepth,
  testReason,
  verdict,
  willRetry,
} from './run-log-events';
import {
  CONSOLE_STACK_LINES,
  actionLine,
  STEP_INDENT,
  completed,
  emptyCounts,
  failureReason,
  filterStack,
  listBlock,
  parseOutputLine,
  progressLine,
  reasonSuffix,
  seconds,
  splitChunk,
  stepLine,
  stripAnsi,
  summaryLine,
  type Counts,
} from './run-log-format';
import { RunLogSink, type Line } from './run-log-sink';

const RUN = 'RunLogger';
const HOOKS = 'TestHooks';
const STEPS = 'StepListener';
const LOGGED_STEP = ['test.step'];
const HOOK_STEP = ['hook', 'fixture'];
const DEBUG_STEP = ['expect', 'pw:api'];
type Stream = 'stdout' | 'stderr';

/** `1 test`, `18 tests`. */
const plural = (n: number, word: string): string => `${String(n)} ${word}${n === 1 ? '' : 's'}`;

/** Live when nothing can interleave (one worker) or when LOG_STREAM=1 asks for it; LOG_STREAM=0 buffers. */
const liveMode = (workers: number): boolean =>
  process.env.LOG_STREAM === undefined || process.env.LOG_STREAM === ''
    ? workers === 1
    : process.env.LOG_STREAM === '1';

/**
 * CaseWORKS-style run log: a short console (one block per test, a ✅/❌ line per test.step, a one-line
 * reason, progress after every final outcome, a summary) and logs/automation_framework.log with the same
 * lines plus timestamps, sources and the full failure details. See the run-logging skill.
 */
export default class RunLogger implements Reporter {
  private readonly file = new RunLogFile();
  private sink = new RunLogSink(this.file, false);
  private aux = new Set<string>();
  private total = 0;
  private retries = 0;
  private started = Date.now();
  private readonly counts: Counts = emptyCounts();
  private readonly numbers = new Map<string, number>();
  private readonly reasonShown = new Set<string>();
  private readonly partial = new Map<string, string>();
  private readonly flaky: string[] = [];
  private readonly failed: string[] = [];
  private setupFailed = false;

  constructor() {
    // Inherited by every worker: the logger switches to records this reporter parses (src/utils/logger.ts)
    process.env[RUN_LOGGER_FLAG] = '1';
  }

  printsToStdio(): boolean {
    return true;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.started = Date.now();
    this.aux = auxiliaryProjects(config);
    const tests = suite.allTests().filter((t) => !this.isAux(t));
    this.total = tests.length;
    this.retries = Math.max(0, ...tests.map((t) => t.retries));
    this.sink = new RunLogSink(this.file, liveMode(config.workers));
    const rolled = this.file.open();
    const projects = [...new Set(tests.map(projectOf))].join(', ') || '-';
    const extra = [
      `TEST_ENV=${process.env.TEST_ENV ?? 'public'}`,
      `RUN_ID=${process.env.RUN_ID ?? '-'}`,
      ...(process.env.BUILD_NUMBER === undefined ? [] : [`BUILD_NUMBER=${process.env.BUILD_NUMBER}`]),
    ];
    const auxCount = suite.allTests().length - tests.length;
    this.run(
      'info',
      `===== Test run started: ${plural(this.total, 'test')} (+${String(auxCount)} setup/teardown) | projects: ${projects} | ` +
        `workers: ${String(config.workers)} | retries: ${String(this.retries)} | ${extra.join(' | ')} =====`,
    );
    if (rolled !== undefined) this.run('info', `Previous log rolled to ${rolled}`, true);
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    const key = attemptKey(test, result);
    if (this.isAux(test)) {
      this.add(key, 'info', HOOKS, `⚙ ${this.auxKind(test)}: ${auxName(test)}`);
      return;
    }
    const who = describeTest(test);
    const n = this.numbers.get(test.id) ?? this.numbers.size + 1;
    this.numbers.set(test.id, n);
    const of = `${String(n)}/${String(this.total)}`;
    const text =
      result.retry === 0
        ? `▶ Test ${of} [${who.project}]: ${who.title}`
        : `🔁 Test ${of} [${who.project}] – attempt ${attempts(test, result)}: ${who.title}`;
    this.add(key, 'info', HOOKS, text);
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
    const key = attemptKey(test, result);
    if (LOGGED_STEP.includes(step.category)) this.logStep(key, step);
    else if (HOOK_STEP.includes(step.category)) this.logHook(key, step);
    else if (DEBUG_STEP.includes(step.category) && this.sink.wants('debug')) this.logDebugStep(key, step);
  }

  onStdOut(chunk: string | Buffer, test: TestCase | undefined, result: TestResult | undefined): void {
    this.output('stdout', chunk, test, result);
  }

  onStdErr(chunk: string | Buffer, test: TestCase | undefined, result: TestResult | undefined): void {
    this.output('stderr', chunk, test, result);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const key = attemptKey(test, result);
    this.flushPartial(key);
    if (this.isAux(test)) {
      this.endAux(key, test, result);
      return;
    }
    if (this.setupFailed && result.status === 'skipped') {
      this.sink.discard(key);
      return;
    }
    this.endTest(key, test, result);
  }

  onError(error: TestError): void {
    const message = stripAnsi(error.message ?? error.value ?? 'unknown error').trimEnd();
    const frames = filterStack(error.stack);
    const text = [`❌ ${message}`, ...frames.slice(0, CONSOLE_STACK_LINES)].join('\n');
    this.sink.now({ ...this.line('error', RUN, text), fileText: [`❌ ${message}`, ...frames].join('\n') });
  }

  onEnd(result: FullResult): void {
    for (const key of [...this.partial.keys()].map((k) => k.split('|')[0] ?? k)) this.flushPartial(key);
    for (const key of this.sink.pending()) {
      this.sink.add(key, this.line('warn', HOOKS, '(incomplete: the attempt never finished)'));
      this.sink.flush(key);
    }
    this.counts.notRun = this.total - completed(this.counts);
    if (this.setupFailed)
      this.run('warn', `⏭ ${plural(this.counts.notRun, 'test')} not run because setup failed`);
    else if (this.counts.notRun > 0)
      this.run('warn', `⏭ ${plural(this.counts.notRun, 'test')} not run (run ${result.status})`);
    this.run('info', summaryLine(this.counts, Date.now() - this.started));
    if (this.flaky.length > 0) this.run('warn', listBlock('Flaky tests:', this.flaky));
    if (this.failed.length > 0) this.run('error', listBlock('Failed tests:', this.failed));
    if (result.status !== 'passed') this.run('error', `Run status: ${result.status}`);
    this.run('info', `Full details: ${LOG_FILE} | HTML report: npx playwright show-report`);
    this.file.close();
  }

  async onExit(): Promise<void> {
    this.file.close();
    await Promise.resolve();
  }

  private endTest(key: string, test: TestCase, result: TestResult): void {
    const who = describeTest(test);
    const { level, text } = verdict(test, result, who, this.reasonShown.has(key));
    this.add(key, level, HOOKS, text);
    const retry = willRetry(test, result);
    if (retry)
      this.add(
        key,
        'warn',
        HOOKS,
        `${STEP_INDENT}↻ Will retry (attempt ${String(result.retry + 2)}/${String(test.retries + 1)})`,
      );
    if (result.status !== test.expectedStatus && result.status !== 'skipped') {
      this.add(key, 'error', HOOKS, failureDetails(test, result, who.name), true);
    }
    this.sink.flush(key);
    if (retry) return;
    this.tally(test, result, `${who.name} (${who.location})`);
    this.run('info', progressLine(this.counts, this.total, this.retries > 0));
  }

  private tally(test: TestCase, result: TestResult, item: string): void {
    const outcome = test.outcome();
    if (outcome === 'flaky') {
      this.counts.flaky += 1;
      this.flaky.push(item);
    } else if (outcome === 'unexpected') {
      this.counts.failed += 1;
      this.failed.push(item);
    } else if (result.status === 'interrupted') this.counts.interrupted += 1;
    else if (outcome === 'skipped' || result.status === 'skipped') this.counts.skipped += 1;
    else this.counts.passed += 1;
  }

  private endAux(key: string, test: TestCase, result: TestResult): void {
    const kind = this.auxKind(test);
    const name = auxName(test);
    const ok = result.status === test.expectedStatus;
    const text = ok
      ? `⚙ ${kind} passed: ${name} (${seconds(result.duration)})`
      : `❌ ${kind} ${result.status.toUpperCase()}: ${name} (${seconds(result.duration)})${reasonSuffix(testReason(result))}`;
    this.add(key, ok ? 'info' : 'error', HOOKS, text);
    if (!ok && result.status !== 'skipped')
      this.add(key, 'error', HOOKS, failureDetails(test, result, name), true);
    this.sink.flush(key);
    if (!ok && kind === 'Setup' && !willRetry(test, result)) {
      this.setupFailed = true;
      this.run('error', `❌ Run aborted before any test started: ${testReason(result)}`);
    }
  }

  private logStep(key: string, step: TestStep): void {
    const failed = step.error !== undefined;
    const status = failed ? 'failed' : isSkippedStep(step) ? 'skipped' : 'passed';
    const innermost = failed && !failedBelow(step, LOGGED_STEP);
    const reason = innermost ? failureReason(step.error?.message) : '';
    if (innermost) this.reasonShown.add(key);
    this.addStep(
      key,
      step,
      failed ? 'error' : 'info',
      stepLine(status, step.title, step.duration, stepDepth(step), reason),
    );
  }

  private logHook(key: string, step: TestStep): void {
    if (step.error === undefined || failedBelow(step, [...HOOK_STEP, ...LOGGED_STEP])) return;
    this.reasonShown.add(key);
    this.addStep(
      key,
      step,
      'error',
      `${STEP_INDENT}❌ Hook failed: ${step.title}${reasonSuffix(failureReason(step.error.message))}`,
    );
  }

  private logDebugStep(key: string, step: TestStep): void {
    const mark = step.error === undefined ? '·' : '✗';
    const indent = STEP_INDENT.repeat(stepDepth(step) + 2);
    // Not file-only: LOG_LEVEL=debug shows the actions on the console too
    this.addStep(key, step, 'debug', `${indent}${mark} ${actionLine(step)} (${seconds(step.duration)})`);
  }

  private output(
    stream: Stream,
    chunk: string | Buffer,
    test: TestCase | undefined,
    result: TestResult | undefined,
  ): void {
    const key = test === undefined || result === undefined ? 'run' : attemptKey(test, result);
    const id = `${key}|${stream}`;
    const { lines, rest } = splitChunk(
      this.partial.get(id) ?? '',
      typeof chunk === 'string' ? chunk : chunk.toString('utf8'),
    );
    if (rest === '') this.partial.delete(id);
    else this.partial.set(id, rest);
    for (const text of lines) this.emitOutput(key, stream, text);
  }

  private emitOutput(key: string, stream: Stream, text: string): void {
    const parsed = parseOutputLine(text, stream, new Date());
    const line: Line = {
      time: parsed.time,
      level: parsed.level,
      source: parsed.source,
      text: parsed.message,
    };
    if (key === 'run') this.sink.now(line);
    else this.sink.add(key, line);
  }

  private flushPartial(key: string): void {
    for (const stream of ['stdout', 'stderr'] as const) {
      const rest = this.partial.get(`${key}|${stream}`);
      this.partial.delete(`${key}|${stream}`);
      if (rest !== undefined && rest.trim() !== '') this.emitOutput(key, stream, rest);
    }
  }

  private isAux(test: TestCase): boolean {
    return this.aux.has(projectOf(test));
  }

  private auxKind(test: TestCase): 'Setup' | 'Teardown' {
    return projectOf(test).toLowerCase().includes('teardown') ? 'Teardown' : 'Setup';
  }

  private line(level: Level, source: string, text: string, fileOnly = false): Line {
    return { time: new Date(), level, source, text, fileOnly };
  }

  /** A step line keeps the time the step ended, so the file stays in order with the worker log lines. */
  private addStep(key: string, step: TestStep, level: Level, text: string, fileOnly = false): void {
    const time = new Date(step.startTime.getTime() + step.duration);
    this.sink.add(key, { ...this.line(level, STEPS, text, fileOnly), time });
  }

  private add(key: string, level: Level, source: string, text: string, fileOnly = false): void {
    this.sink.add(key, this.line(level, source, text, fileOnly));
  }

  private run(level: Level, text: string, fileOnly = false): void {
    this.sink.now(this.line(level, RUN, text, fileOnly));
  }
}
