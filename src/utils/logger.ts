type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SECRET_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key/i;
/** A JSON Web Token anywhere in a string (header.payload.signature, base64url). */
export const JWT = /eyJ[\w-]{6,}\.[\w-]{6,}\.[\w-]{6,}/g;

const isLevel = (value: string): value is Level => Object.hasOwn(ORDER, value);

const threshold = (): number => {
  const level = process.env.LOG_LEVEL ?? 'info';
  return isLevel(level) ? ORDER[level] : ORDER.info;
};

/** Masks every JWT inside a string, e.g. a `Bearer ...` header or a localStorage dump. */
export const redactText = (text: string): string => text.replace(JWT, '***jwt***');

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

const write = (level: Level, message: string, meta?: unknown): void => {
  if (ORDER[level] < threshold()) return;
  const worker = process.env.TEST_WORKER_INDEX ?? 'main';
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [w:${worker}] ${redactText(message)}`;
  const text = meta === undefined ? line : `${line} ${JSON.stringify(redact(meta))}`;
  if (level === 'error' || level === 'warn') console.error(text);
  else console.log(text);
};

export const logger = {
  debug: (message: string, meta?: unknown): void => {
    write('debug', message, meta);
  },
  info: (message: string, meta?: unknown): void => {
    write('info', message, meta);
  },
  warn: (message: string, meta?: unknown): void => {
    write('warn', message, meta);
  },
  error: (message: string, meta?: unknown): void => {
    write('error', message, meta);
  },
};
