// Unit tests for the run logger's pure formatting: npm run test:reporting
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { formatRecord, levelFromEnv, parseRecord, redactText, type LogRecord } from '../utils/logger.ts';
import {
  CONSOLE_PREFIX_WIDTH,
  actionLine,
  FILE_PREFIX_WIDTH,
  consoleLine,
  emptyCounts,
  errorDetails,
  failureReason,
  fileLine,
  filterStack,
  humanDuration,
  listBlock,
  parseOutputLine,
  progressLine,
  seconds,
  splitChunk,
  stepLine,
  summaryLine,
  testLocation,
  testName,
} from './run-log-format.ts';

const AT = new Date(2026, 10, 16, 15, 50, 2, 629);

// A real Playwright 1.65 expect failure, ANSI codes included (captured from a failing cart test).
const EXPECT_ERROR =
  'Error: \u001b[2mexpect(\u001b[22m\u001b[31mlocator\u001b[39m\u001b[2m).\u001b[22mtoHaveText\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m)\u001b[22m failed\n\n' +
  "Locator:  getByTestId('cart-quantity')\n" +
  'Expected: \u001b[32m"4"\u001b[39m\n' +
  'Received: \u001b[31m"3"\u001b[39m\n' +
  'Timeout:  10000ms';

void describe('line prefixes', () => {
  void it('console: HH:mm:ss LEVEL is 15 characters and continuation lines align under the message', () => {
    const [first, second] = consoleLine(AT, 'info', 'Failed tests:\n  - one').split('\n');
    assert.equal(first, '15:50:02 INFO  Failed tests:');
    assert.equal(first.indexOf('Failed'), CONSOLE_PREFIX_WIDTH);
    assert.equal(second, `${' '.repeat(CONSOLE_PREFIX_WIDTH)}  - one`);
    assert.equal(consoleLine(AT, 'error', 'x'), '15:50:02 ERROR x');
  });

  void it('file: timestamp with ms, level and a 22-wide source column make 59 characters', () => {
    const [first, second] = fileLine(AT, 'warn', 'StepListener', 'a\nb').split('\n');
    assert.equal(first, '2026-11-16 15:50:02.629 | WARN  | StepListener           | a');
    assert.equal(first.length, FILE_PREFIX_WIDTH + 1);
    assert.equal(second, `${' '.repeat(FILE_PREFIX_WIDTH)}b`);
  });

  void it('file: a long source is cut to the column width', () => {
    const line = fileLine(AT, 'info', 'AVeryLongSourceNameThatOverflows', 'm');
    assert.equal(line.indexOf('| m'), FILE_PREFIX_WIDTH - 2);
  });
});

void describe('durations', () => {
  void it('steps and tests use seconds with one decimal', () => {
    assert.equal(seconds(2_149), '2.1s');
    assert.equal(seconds(0), '0.0s');
  });

  void it('the run total reads like a clock', () => {
    assert.equal(humanDuration(38_200), '38.2s');
    assert.equal(humanDuration(98_000), '1m 38s');
    assert.equal(humanDuration(3_725_000), '1h 02m 05s');
  });
});

void describe('names and locations', () => {
  void it('drops the root, project and file parts of the title path', () => {
    const titlePath = ['', 'chromium', 'cart/cart.spec.ts', 'cart.add: A shopper', 'adds a product'];
    assert.equal(testName('chromium', titlePath), '[chromium] cart.add: A shopper › adds a product');
  });

  void it('gives the spec path relative to the repo root with forward slashes', () => {
    const cwd = path.resolve('repo');
    assert.equal(testLocation(path.join(cwd, 'tests', 'a.spec.ts'), 15, cwd), 'tests/a.spec.ts:15');
  });
});

void describe('failure reason', () => {
  void it('keeps the first line of a real expect error, without ANSI or "Error:", plus the locator', () => {
    assert.equal(
      failureReason(EXPECT_ERROR),
      "expect(locator).toHaveText(expected) failed | Locator: getByTestId('cart-quantity')",
    );
  });

  void it('skips leading blank lines, handles a missing message and caps the length', () => {
    assert.equal(failureReason('\n\nTest timeout of 60000ms exceeded.'), 'Test timeout of 60000ms exceeded.');
    assert.equal(failureReason(undefined), '');
    const long = failureReason('x'.repeat(1_000));
    assert.equal(long.length, 300);
    assert.ok(long.endsWith('…'));
  });
});

void describe('stack and error details', () => {
  const stack = [
    'Error: boom',
    '    at /repo/tests/cart/cart.spec.ts:30:7',
    '    at /repo/node_modules/playwright/lib/worker/workerMain.js:1:1',
    '    at /repo/node_modules/@playwright/test/index.js:1:1',
    '    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)',
  ].join('\n');

  void it('keeps only frames of this repo', () => {
    assert.deepEqual(filterStack(stack), ['at /repo/tests/cart/cart.spec.ts:30:7']);
  });

  void it('lists every error with its message, snippet and frames', () => {
    const lines = errorDetails([
      { message: EXPECT_ERROR, snippet: '> 30 | expect(x)', stack },
      { message: 'two' },
    ]);
    assert.ok(lines[0]?.startsWith('Error 1/2: Error: expect(locator).toHaveText(expected) failed'));
    assert.ok(lines.includes('> 30 | expect(x)'));
    assert.ok(lines.includes('  at /repo/tests/cart/cart.spec.ts:30:7'));
    assert.equal(lines.at(-1), 'Error 2/2: two');
    assert.ok(lines.every((line) => !line.includes('\u001b')));
  });
});

void describe('step lines', () => {
  void it('indents 3 spaces, 3 more per level of nesting', () => {
    assert.equal(stepLine('passed', 'They pay', 2_100, 0), '   ✅ They pay (2.1s)');
    assert.equal(stepLine('passed', 'Inner', 500, 1), '      ✅ Inner (0.5s)');
  });

  void it('shows the reason on a failed step only when one is given', () => {
    assert.equal(stepLine('failed', 'They pay', 10_200, 0, 'boom'), '   ❌ They pay (10.2s) -> boom');
    assert.equal(stepLine('failed', 'Outer', 10_300, 0), '   ❌ Outer (10.3s)');
    assert.equal(stepLine('skipped', 'Later', 0, 0), '   ⏭ Later (skipped)');
  });
});

void describe('progress and summary', () => {
  void it('counts final outcomes only and always adds up to the total', () => {
    const counts = { ...emptyCounts(), passed: 2, flaky: 1, failed: 1, skipped: 1 };
    assert.equal(
      progressLine(counts, 10, true),
      '---------- Test Suite Execution Status: 5/10 (50%) Completed | ✅ 2 passed | ⚠ 1 flaky | ❌ 1 failed | ⏭ 1 skipped ----------',
    );
  });

  void it('hides flaky when retries are off', () => {
    assert.equal(
      progressLine({ ...emptyCounts(), passed: 3, failed: 1 }, 4, false),
      '---------- Test Suite Execution Status: 4/4 (100%) Completed | ✅ 3 passed | ❌ 1 failed ----------',
    );
  });

  void it('summarises with only the non-empty optional buckets', () => {
    assert.equal(
      summaryLine({ ...emptyCounts(), passed: 15, flaky: 1, failed: 1, skipped: 1 }, 98_000),
      '===== Results: 15 passed, 1 flaky, 1 failed, 1 skipped (1m 38s) =====',
    );
    assert.equal(
      summaryLine({ ...emptyCounts(), notRun: 18 }, 3_200),
      '===== Results: 0 passed, 0 failed, 18 not run (3.2s) =====',
    );
  });

  void it('lists items as continuation lines', () => {
    assert.equal(listBlock('Failed tests:', ['a', 'b']), 'Failed tests:\n  - a\n  - b');
  });
});

void describe('worker output', () => {
  const record: LogRecord = {
    t: AT.getTime(),
    l: 'warn',
    w: '1',
    s: 'DataFixtures',
    m: 'cleanup',
    x: { status: 500 },
  };

  void it('round-trips a logger record', () => {
    assert.deepEqual(parseRecord(formatRecord(record)), record);
    assert.deepEqual(parseOutputLine(formatRecord(record), 'stdout', new Date()), {
      time: AT,
      level: 'warn',
      source: 'DataFixtures',
      message: 'cleanup {"status":500}',
    });
  });

  void it('treats anything else as plain output: stdout INFO, stderr WARN', () => {
    assert.equal(parseRecord('{"t":1}'), undefined);
    assert.equal(parseOutputLine('hello', 'stdout', AT).level, 'info');
    assert.equal(parseOutputLine('oops', 'stderr', AT).level, 'warn');
  });

  void it('keeps a partial line until the rest arrives', () => {
    const first = splitChunk('', 'one\ntw');
    assert.deepEqual(first, { lines: ['one'], rest: 'tw' });
    assert.deepEqual(splitChunk(first.rest, 'o\n'), { lines: ['two'], rest: '' });
  });
});

void describe('interrupted runs', () => {
  void it('counts interrupted tests apart from skipped ones', () => {
    const counts = { ...emptyCounts(), passed: 5, interrupted: 3, notRun: 1 };
    assert.equal(
      summaryLine(counts, 15_400),
      '===== Results: 5 passed, 0 failed, 3 interrupted, 1 not run (15.4s) =====',
    );
    assert.ok(
      progressLine(counts, 9, false).includes(
        '8/9 (88%) Completed | ✅ 5 passed | ❌ 0 failed | ⏹ 3 interrupted',
      ),
    );
  });
});

void describe('redaction', () => {
  void it('masks JWTs and the values of secret-looking env vars', () => {
    process.env.RUN_LOG_TEST_PASSWORD = 'not-a-real-secret-42';
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJlLXZhbHVl';
    assert.equal(redactText(`Bearer ${jwt} with not-a-real-secret-42`), 'Bearer ***jwt*** with ***');
    delete process.env.RUN_LOG_TEST_PASSWORD;
  });
});

// Step shapes as Playwright 1.65 reports them (title, subtitle, params), captured from real runs.
void describe('debug action lines', () => {
  void it('names the action, its element and the value it typed', () => {
    const fill = {
      title: 'Fill "qa-r1.abc@toolshop-tests.example"',
      subtitle: "getByTestId('email')",
      params: { locator: "getByTestId('email')", value: 'qa-r1.abc@toolshop-tests.example' },
    };
    assert.equal(actionLine(fill), `Fill getByTestId('email') value="qa-r1.abc@toolshop-tests.example"`);
  });

  void it('shows clicks, selected options, navigation and expected values', () => {
    const click = {
      title: 'Click',
      subtitle: "getByTestId('login-submit')",
      params: { locator: "getByTestId('login-submit')" },
    };
    assert.equal(actionLine(click), "Click getByTestId('login-submit')");
    const select = {
      title: 'Select option',
      subtitle: "getByTestId('sort')",
      params: { locator: "getByTestId('sort')", options: [{ label: 'Price (Low - High)' }] },
    };
    assert.equal(
      actionLine(select),
      `Select option getByTestId('sort') options=[{"label":"Price (Low - High)"}]`,
    );
    assert.equal(
      actionLine({ title: 'Navigate', subtitle: '/auth/login', params: { url: '/auth/login' } }),
      'Navigate /auth/login',
    );
    const expectText = {
      title: 'Expect "toHaveText"',
      subtitle: "getByTestId('product-price')",
      params: { locator: "getByTestId('product-price')", expected: ['$2.69', '$14.89'] },
    };
    assert.equal(
      actionLine(expectText),
      `Expect "toHaveText" getByTestId('product-price') expected=["$2.69","$14.89"]`,
    );
  });

  void it('never shows what is typed into or expected from a password field', () => {
    const password = {
      title: 'Fill "Qa!95_cJpHchePa-3GFI"',
      subtitle: "getByTestId('password')",
      params: { locator: "getByTestId('password')", value: 'Qa!95_cJpHchePa-3GFI' },
    };
    assert.equal(actionLine(password), "Fill getByTestId('password') value=***");
    assert.equal(
      actionLine({ title: 'Fill "secret-1"', subtitle: "getByLabel('Password')" }),
      "Fill getByLabel('Password')",
    );
    assert.ok(!actionLine(password).includes('Qa!95'));
    const card = {
      title: 'Fill "4111"',
      subtitle: "getByTestId('credit_card_number')",
      params: { value: '4111' },
    };
    assert.equal(actionLine(card), "Fill getByTestId('credit_card_number') value=***");
  });
});

void describe('log levels', () => {
  void it('default to info until a level is set, and ignore empty or unknown values', () => {
    const name = 'RUN_LOG_TEST_LEVEL';
    delete process.env.RUN_LOG_TEST_LEVEL;
    assert.equal(levelFromEnv(name), 'info');
    for (const [value, expected] of [
      ['', 'info'],
      ['dbug', 'info'],
      ['DEBUG', 'debug'],
      ['warn', 'warn'],
    ] as const) {
      process.env[name] = value;
      assert.equal(levelFromEnv(name), expected);
    }
    delete process.env.RUN_LOG_TEST_LEVEL;
  });
});
