import fs from 'node:fs';
import path from 'node:path';

export const LOG_DIR = 'logs';
export const LOG_FILE = path.join(LOG_DIR, 'automation_framework.log');
/** Same as log4j2 SizeBasedTriggeringPolicy in CaseWORKS. */
const MAX_BYTES = 20 * 1024 * 1024;

const pad = (n: number): string => String(n).padStart(2, '0');
const day = (d: Date): string => `${String(d.getFullYear())}_${pad(d.getMonth() + 1)}_${pad(d.getDate())}`;

/** automation_framework_2026_11_16.log, or _2026_11_16_<n>.log when that name is taken. */
const rolledName = (file: string, modified: Date, numbered: boolean): string => {
  const base = path.join(path.dirname(file), `${path.basename(file, '.log')}_${day(modified)}`);
  if (!numbered && !fs.existsSync(`${base}.log`)) return `${base}.log`;
  let n = 1;
  while (fs.existsSync(`${base}_${String(n)}.log`)) n += 1;
  return `${base}_${String(n)}.log`;
};

/**
 * log4j2 TimeBasedTriggeringPolicy + SizeBasedTriggeringPolicy, checked once at the start of a run:
 * a file last written on an earlier day, or bigger than 20 MB, is renamed; the run then appends.
 * Returns the name it was rolled to, if any.
 */
export const rollLogFile = (file = LOG_FILE, now = new Date()): string | undefined => {
  if (!fs.existsSync(file)) return undefined;
  const { mtime, size } = fs.statSync(file);
  const olderDay = day(mtime) !== day(now);
  if (!olderDay && size <= MAX_BYTES) return undefined;
  const target = rolledName(file, mtime, !olderDay);
  fs.renameSync(file, target);
  return target;
};

/**
 * The only writer of the log file (the reporter, in the main process): workers never touch it.
 * Synchronous appends, so every line is on disk even when the run is interrupted with Ctrl+C.
 */
export class RunLogFile {
  private fd: number | undefined;

  constructor(private readonly file = LOG_FILE) {}

  open(): string | undefined {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const rolled = rollLogFile(this.file);
    this.fd = fs.openSync(this.file, 'a');
    return rolled;
  }

  write(text: string): void {
    if (this.fd !== undefined) fs.writeSync(this.fd, `${text}\n`);
  }

  close(): void {
    if (this.fd === undefined) return;
    fs.closeSync(this.fd);
    this.fd = undefined;
  }
}
