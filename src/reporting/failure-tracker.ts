import fs from 'node:fs';
import path from 'node:path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

type Failure = {
  test: string;
  project: string;
  file: string;
  attempt: number;
  /** The test.step the failure happened in: what a manager reads. */
  step?: string;
  error: string;
  correlationId?: string;
  /** Evidence on disk for the triage skill and agents (trace, screenshot, video, axe, api-calls). */
  evidence: string[];
};

const ANSI = new RegExp(String.raw`\u001b\[[0-9;]*m`, 'g');
const SUMMARY_FILE = path.join('test-results', 'failure-summary.json');

const failedStep = (result: TestResult): string | undefined => {
  const walk = (steps: TestResult['steps']): string | undefined => {
    for (const step of steps) {
      if (step.error === undefined) continue;
      return step.category === 'test.step' ? (walk(step.steps) ?? step.title) : walk(step.steps);
    }
    return undefined;
  };
  return walk(result.steps);
};

/**
 * Custom reporter for humans and agents:
 * - writes test-results/failure-summary.json (read by the triage-ui-failures skill)
 * - adds a failures table to the GitHub Actions job summary when running there
 * Flaky attempts are recorded too, so retries never hide instability.
 */
export default class FailureTracker implements Reporter {
  private readonly failures: Failure[] = [];

  printsToStdio(): boolean {
    return false;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === test.expectedStatus) return;
    const message = result.error?.message ?? result.status;
    this.failures.push({
      test: test.titlePath().filter(Boolean).slice(2).join(' > '),
      project: test.parent.project()?.name ?? 'unknown',
      file: path.relative(process.cwd(), test.location.file),
      attempt: result.retry + 1,
      step: failedStep(result),
      error: message.replace(ANSI, '').split('\n')[0] ?? result.status,
      correlationId: result.annotations.find((a) => a.type === 'correlation-id')?.description,
      evidence: result.attachments
        .map((a) => a.path)
        .filter((p): p is string => p !== undefined)
        .map((p) => path.relative(process.cwd(), p)),
    });
  }

  onEnd(result: FullResult): void {
    fs.mkdirSync(path.dirname(SUMMARY_FILE), { recursive: true });
    fs.writeFileSync(
      SUMMARY_FILE,
      JSON.stringify({ status: result.status, runId: process.env.RUN_ID, failures: this.failures }, null, 2),
    );
    this.writeGitHubSummary(result);
  }

  private writeGitHubSummary(result: FullResult): void {
    const target = process.env.GITHUB_STEP_SUMMARY;
    if (target === undefined || target === '') return;
    const cell = (text: string): string => text.replaceAll('|', '\\|');
    const rows = this.failures
      .map(
        (f) =>
          `| ${f.project} | ${cell(f.test)} | ${cell(f.step ?? '')} | ${String(f.attempt)} | ${cell(f.error)} |`,
      )
      .join('\n');
    const body =
      this.failures.length === 0
        ? `### UI tests: ${result.status}, no failed attempts\n`
        : `### UI tests: ${result.status}\n\n| Browser | Test | Failed step | Attempt | Error |\n| --- | --- | --- | --- | --- |\n${rows}\n`;
    fs.appendFileSync(target, body);
  }
}
