import { LEVEL_ORDER, levelFromEnv, redactText, type Level } from '../utils/logger';
import { consoleLine, fileLine } from './run-log-format';
import type { RunLogFile } from './run-log-file';

/** One log event. `fileText` replaces `text` in the file (e.g. a full stack); `fileOnly` keeps it off the console. */
export type Line = {
  time: Date;
  level: Level;
  source: string;
  text: string;
  fileText?: string;
  fileOnly?: boolean;
};

/**
 * Where every line goes: the console (LOG_LEVEL) and logs/automation_framework.log (LOG_FILE_LEVEL).
 * Lines of a test attempt are buffered and printed as one block when it ends, so parallel workers never
 * interleave; in live mode (one worker, or LOG_STREAM=1) they are printed as they happen.
 * Everything is redacted here, on its way out, whatever produced it.
 */
export class RunLogSink {
  private readonly buffers = new Map<string, Line[]>();
  private readonly consoleLevel = LEVEL_ORDER[levelFromEnv('LOG_LEVEL')];
  private readonly fileLevel = LEVEL_ORDER[levelFromEnv('LOG_FILE_LEVEL')];

  constructor(
    private readonly file: RunLogFile,
    readonly live: boolean,
  ) {}

  /** True when the console or the file keeps this level: lets the reporter skip lines nobody reads. */
  wants(level: Level): boolean {
    return LEVEL_ORDER[level] >= Math.min(this.consoleLevel, this.fileLevel);
  }

  /** A run-level line: never buffered. */
  now(line: Line): void {
    this.write(line);
  }

  /** A line of one test attempt: buffered until flush(key), or written now in live mode. */
  add(key: string, line: Line): void {
    if (this.live) {
      this.write(line);
      return;
    }
    const lines = this.buffers.get(key) ?? [];
    lines.push(line);
    this.buffers.set(key, lines);
  }

  flush(key: string): void {
    for (const line of this.buffers.get(key) ?? []) this.write(line);
    this.buffers.delete(key);
  }

  discard(key: string): void {
    this.buffers.delete(key);
  }

  pending(): string[] {
    return [...this.buffers.keys()];
  }

  private write(line: Line): void {
    const order = LEVEL_ORDER[line.level];
    if (line.fileOnly !== true && order >= this.consoleLevel) {
      process.stdout.write(`${redactText(consoleLine(line.time, line.level, line.text))}\n`);
    }
    if (order >= this.fileLevel) {
      this.file.write(redactText(fileLine(line.time, line.level, line.source, line.fileText ?? line.text)));
    }
  }
}
