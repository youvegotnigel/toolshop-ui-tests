import path from 'node:path';
import type { FullConfig, TestCase, TestResult, TestStep } from '@playwright/test/reporter';
import type { Level } from '../utils/logger';
import { errorDetails, failureReason, reasonSuffix, seconds, testLocation } from './run-log-format';

/** Playwright pieces of a test, turned into the words the run log uses. */
export type Who = { project: string; title: string; name: string; location: string };

export const projectOf = (test: TestCase): string => test.parent.project()?.name ?? 'unknown';

export const describeTest = (test: TestCase): Who => {
  const project = projectOf(test);
  const title = test.titlePath().filter(Boolean).slice(2).join(' › ');
  return {
    project,
    title,
    name: `[${project}] ${title}`,
    location: testLocation(test.location.file, test.location.line, process.cwd()),
  };
};

/** `environment.setup › record which Toolshop build is under test` for setup and teardown tests. */
export const auxName = (test: TestCase): string =>
  `${path.basename(test.location.file).replace(/\.ts$/, '')} › ${test.title}`;

/** Projects other projects depend on, or that tear one down (setup, teardown): not counted as tests. */
export const auxiliaryProjects = (config: FullConfig): Set<string> =>
  new Set(
    config.projects.flatMap((p) => [...p.dependencies, ...(p.teardown === undefined ? [] : [p.teardown])]),
  );

export const attemptKey = (test: TestCase, result: TestResult): string =>
  `${test.id}#${String(result.retry)}`;

export const attempts = (test: TestCase, result: TestResult): string =>
  `${String(result.retry + 1)}/${String(test.retries + 1)}`;

export const willRetry = (test: TestCase, result: TestResult): boolean =>
  result.status !== test.expectedStatus &&
  result.status !== 'skipped' &&
  result.status !== 'interrupted' &&
  result.retry < test.retries;

/** Nesting level of a test.step: how many test.step ancestors it has. */
export const stepDepth = (step: TestStep): number => {
  let depth = 0;
  for (let parent = step.parent; parent !== undefined; parent = parent.parent) {
    if (parent.category === 'test.step') depth += 1;
  }
  return depth;
};

/** True when a descendant of these categories failed too: the reason then belongs to that descendant. */
export const failedBelow = (step: TestStep, categories: readonly string[]): boolean =>
  step.steps.some(
    (child) =>
      (child.error !== undefined && categories.includes(child.category)) || failedBelow(child, categories),
  );

export const isSkippedStep = (step: TestStep): boolean => step.annotations.some((a) => a.type === 'skip');

export const testReason = (result: TestResult): string => {
  const reason = failureReason(result.errors[0]?.message ?? result.error?.message);
  return reason === '' && result.status === 'passed' ? 'expected to fail, but passed' : reason;
};

const skipReason = (test: TestCase, result: TestResult): string => {
  const note = [...result.annotations, ...test.annotations].find(
    (a) => a.type === 'skip' || a.type === 'fixme',
  );
  return note?.description === undefined ? '' : ` -> ${note.description}`;
};

export type Verdict = { level: Level; text: string };

/** The line that closes a test attempt: PASSED, FLAKY, FAILED, TIMED OUT, INTERRUPTED or SKIPPED. */
export const verdict = (test: TestCase, result: TestResult, who: Who, reasonShown: boolean): Verdict => {
  const dur = seconds(result.duration);
  const at = `[${who.project}]`;
  if (result.status === 'skipped')
    return { level: 'info', text: `⏭ Test SKIPPED ${at}: ${who.title}${skipReason(test, result)}` };
  if (result.status === test.expectedStatus) {
    if (result.retry > 0)
      return {
        level: 'warn',
        text: `⚠ Test FLAKY ${at} – passed on attempt ${attempts(test, result)}: ${who.title} (${dur})`,
      };
    const asExpected = test.expectedStatus === 'failed' ? ' – failed as expected' : '';
    return { level: 'info', text: `✅ Test PASSED ${at}: ${who.title} (${dur})${asExpected}` };
  }
  if (result.status === 'interrupted')
    return { level: 'warn', text: `⏹ Test INTERRUPTED ${at}: ${who.title} (${dur})` };
  if (result.status === 'timedOut')
    return {
      level: 'error',
      text: `❌ Test TIMED OUT ${at}: ${who.title} (${dur})${reasonSuffix(testReason(result))}`,
    };
  return {
    level: 'error',
    text: `❌ Test FAILED ${at}: ${who.title} (${dur})${reasonShown ? '' : reasonSuffix(testReason(result))}`,
  };
};

/** File-only details of a failed attempt: every error in full, its code frame, filtered stack and evidence. */
export const failureDetails = (test: TestCase, result: TestResult, name: string): string => {
  const correlation = result.annotations.find((a) => a.type === 'correlation-id')?.description;
  const evidence = result.attachments
    .map((a) => a.path)
    .filter((p): p is string => p !== undefined)
    .map((p) => `  - ${path.relative(process.cwd(), p).split(path.sep).join('/')}`);
  const errors = result.errors.length > 0 ? result.errors : [{ message: testReason(result) }];
  return [
    `Error details for failed test '${name}' (attempt ${attempts(test, result)}${correlation === undefined ? '' : `, correlation id ${correlation}`})`,
    ...errorDetails(errors),
    ...(evidence.length === 0 ? [] : ['Evidence:', ...evidence]),
  ].join('\n');
};
