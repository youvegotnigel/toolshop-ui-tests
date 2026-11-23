export type Level = 'debug' | 'info' | 'warn' | 'error';

export const LEVEL_ORDER: Readonly<Record<Level, number>> = { debug: 10, info: 20, warn: 30, error: 40 };
const SECRET_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key/i;
/** A JSON Web Token anywhere in a string (header.payload.signature, base64url). */
export const JWT = /eyJ[\w-]{6,}\.[\w-]{6,}\.[\w-]{6,}/g;
/** Secret env values shorter than this are not masked (too likely to match ordinary words). */
const MIN_SECRET_LENGTH = 6;

export const isLevel = (value: string): value is Level => Object.hasOwn(LEVEL_ORDER, value);

/** Reads a level from the environment (LOG_LEVEL, LOG_FILE_LEVEL); anything unknown means `info`. */
export const levelFromEnv = (name: string): Level => {
  const value = (process.env[name] ?? 'info').toLowerCase();
  return isLevel(value) ? value : 'info';
};

/** Values of secret-looking env vars (ADMIN_PASSWORD, GITHUB_TOKEN, ...): masked wherever they appear. */
const secretValues = (): string[] =>
  Object.entries(process.env)
    .filter(
      ([key, value]) => SECRET_KEY.test(key) && value !== undefined && value.length >= MIN_SECRET_LENGTH,
    )
    .map(([, value]) => String(value));

/** Masks every JWT and every secret env value inside a string, e.g. a `Bearer ...` header or an error. */
export const redactText = (text: string): string =>
  secretValues().reduce((masked, secret) => masked.split(secret).join('***'), text.replace(JWT, '***jwt***'));

/** Deep copy with every secret-looking key and every JWT value masked. Use before logging or attaching. */
export const redact = (value: unknown): unknown => {
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === 'object' && !Buffer.isBuffer(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, SECRET_KEY.test(key) ? '***' : redact(inner)]),
    );
  }
  return value;
};

/**
 * Worker -> run logger protocol. When the run logger reporter is active (it sets RUN_LOGGER_ACTIVE, which
 * every worker inherits), each log call prints ONE stdout line:
 *
 *   ␞runlog␞{"t":1763891702629,"l":"info","w":"0","s":"AuthSession","m":"Logged in as customer"}
 *
 * The `␞` (U+241E, "symbol for record separator") prefix never appears in normal test output, so the
 * reporter can tell logger lines from console.log noise. t = epoch ms, l = level, w = worker index,
 * s = source (the named logger), m = message, x = meta (optional, already redacted).
 * formatRecord and parseRecord live side by side so the two ends cannot drift apart.
 */
export const RECORD_PREFIX = '␞runlog␞';
export const RUN_LOGGER_FLAG = 'RUN_LOGGER_ACTIVE';

export type LogRecord = { t: number; l: Level; w: string; s: string; m: string; x?: unknown };

export const formatRecord = (record: LogRecord): string => `${RECORD_PREFIX}${JSON.stringify(record)}`;

const isRecord = (value: unknown): value is LogRecord => {
  if (value === null || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.t === 'number' &&
    typeof r.l === 'string' &&
    isLevel(r.l) &&
    typeof r.w === 'string' &&
    typeof r.s === 'string' &&
    typeof r.m === 'string'
  );
};

/** The record in one stdout line, or undefined when the line is ordinary output. */
export const parseRecord = (line: string): LogRecord | undefined => {
  if (!line.startsWith(RECORD_PREFIX)) return undefined;
  try {
    const value: unknown = JSON.parse(line.slice(RECORD_PREFIX.length));
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Readable fallback for scripts, `--reporter=list` and anything outside the run logger. */
const readable = (record: LogRecord): string => {
  const d = new Date(record.t);
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  const meta = record.x === undefined ? '' : ` ${JSON.stringify(record.x)}`;
  return `${time} ${record.l.toUpperCase().padEnd(5)} [${record.s}] ${record.m}${meta}`;
};

const structured = (): boolean =>
  process.env[RUN_LOGGER_FLAG] === '1' && process.env.TEST_WORKER_INDEX !== undefined;

/** The run logger filters per destination, so a worker lets through what either the console or the file wants. */
const threshold = (): number =>
  structured()
    ? Math.min(LEVEL_ORDER[levelFromEnv('LOG_LEVEL')], LEVEL_ORDER[levelFromEnv('LOG_FILE_LEVEL')])
    : LEVEL_ORDER[levelFromEnv('LOG_LEVEL')];

const write = (source: string, level: Level, message: string, meta?: unknown): void => {
  if (LEVEL_ORDER[level] < threshold()) return;
  const record: LogRecord = {
    t: Date.now(),
    l: level,
    w: process.env.TEST_WORKER_INDEX ?? 'main',
    s: source,
    m: redactText(message),
    ...(meta === undefined ? {} : { x: redact(meta) }),
  };
  if (structured()) {
    console.log(formatRecord(record));
    return;
  }
  if (level === 'error' || level === 'warn') console.error(readable(record));
  else console.log(readable(record));
};

export type Logger = Record<Level, (message: string, meta?: unknown) => void>;

/**
 * A logger named after its module, like a Java class logger: the name fills the source column of
 * logs/automation_framework.log. `createLogger('AuthSession').info('Logged in as admin')`.
 */
export const createLogger = (source: string): Logger => ({
  debug: (message, meta) => {
    write(source, 'debug', message, meta);
  },
  info: (message, meta) => {
    write(source, 'info', message, meta);
  },
  warn: (message, meta) => {
    write(source, 'warn', message, meta);
  },
  error: (message, meta) => {
    write(source, 'error', message, meta);
  },
});

/** Generic logger, kept for compatibility; prefer a named createLogger(...) in new code. */
export const logger = createLogger('Framework');
