/**
 * Masks every JWT in test artifacts before they are uploaded or published.
 *   node scripts/ci/redact-traces.mts [dir ...]   (default: test-results playwright-report blob-report)
 *
 * Why: tests sign in through the API and the browser then sends `Authorization: Bearer <jwt>` to the
 * Toolshop API. Playwright traces record request headers, so the token would sit in trace.zip
 * (and in blob reports, which embed the traces). Logs and attachments are redacted when written;
 * this pass covers what Playwright writes itself:
 *   - every .zip (traces, blob reports), rewritten entry by entry, nested zips included
 *   - text files (.json, .jsonl, .md, .txt, .html, .network, .trace)
 *   - the HTML report's index.html, whose data is an embedded base64 zip
 * Dependency-free: a minimal zip reader/writer (no zip64, which Playwright never needs here).
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

const JWT = /eyJ[\w-]{6,}\.[\w-]{6,}\.[\w-]{6,}/g;
const MASK = '***jwt***';
const TEXT = /\.(json|jsonl|md|txt|html|network|trace|log|xml)$/i;

const mask = (text: string): string => text.replace(JWT, MASK);
const hasJwt = (buf: Buffer): boolean => /eyJ[\w-]{6,}\.[\w-]{6,}\.[\w-]{6,}/.test(buf.toString('latin1'));

type Entry = { name: string; method: number; data: Buffer; time: number; date: number };

const readZip = (zip: Buffer): Entry[] => {
  let eocd = zip.length - 22;
  while (eocd >= 0 && zip.readUInt32LE(eocd) !== 0x06054b50) eocd -= 1;
  if (eocd < 0) throw new Error('not a zip file');
  const count = zip.readUInt16LE(eocd + 10);
  let at = zip.readUInt32LE(eocd + 16);
  const entries: Entry[] = [];
  for (let i = 0; i < count; i += 1) {
    const method = zip.readUInt16LE(at + 10);
    const size = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const skip = nameLength + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength);
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const raw = zip.subarray(start, start + size);
    entries.push({
      name,
      method,
      data: method === 8 ? inflateRawSync(raw) : Buffer.from(raw),
      time: zip.readUInt16LE(at + 12),
      date: zip.readUInt16LE(at + 14),
    });
    at += 46 + skip;
  }
  return entries;
};

const writeZip = (entries: Entry[]): Buffer => {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8');
    const body = e.method === 8 ? deflateRawSync(e.data) : e.data;
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(0x0800, 6); // UTF-8 names, sizes in the header (no data descriptor)
    head.writeUInt16LE(e.method, 8);
    head.writeUInt16LE(e.time, 10);
    head.writeUInt16LE(e.date, 12);
    head.writeUInt32LE(crc32(e.data), 14);
    head.writeUInt32LE(body.length, 18);
    head.writeUInt32LE(e.data.length, 22);
    head.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    head.copy(central, 6, 4, 30); // version needed .. name length are identical
    central.writeUInt32LE(offset, 42);
    locals.push(head, name, body);
    centrals.push(central, name);
    offset += head.length + name.length + body.length;
  }
  const dir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
};

/** Returns the redacted zip, or undefined when it held no token. */
const redactZip = (zip: Buffer): Buffer | undefined => {
  const original = readZip(zip);
  const entries = original.map((e): Entry => {
    if (e.name.endsWith('.zip')) {
      const inner = redactZip(e.data);
      return inner === undefined ? e : { ...e, data: inner };
    }
    return hasJwt(e.data) ? { ...e, data: Buffer.from(mask(e.data.toString('utf8')), 'utf8') } : e;
  });
  return entries.some((e, i) => e !== original[i]) ? writeZip(entries) : undefined;
};

/** The HTML report keeps its data as `data:application/zip;base64,...` inside index.html. */
const redactHtmlReport = (html: string): string =>
  mask(
    html.replace(
      /(data:application\/zip;base64,)([A-Za-z0-9+/=]+)/g,
      (whole, prefix: string, b64: string) => {
        const redacted = redactZip(Buffer.from(b64, 'base64'));
        return redacted === undefined ? whole : `${prefix}${redacted.toString('base64')}`;
      },
    ),
  );

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });

/** Redacts one artifact in place; returns whether it held a token. */
const redactFile = (file: string): boolean => {
  if (file.endsWith('.zip')) {
    const out = redactZip(readFileSync(file));
    if (out !== undefined) writeFileSync(file, out);
    return out !== undefined;
  }
  if (!TEXT.test(file)) return false;
  const text = readFileSync(file, 'utf8');
  const out = file.endsWith('index.html') ? redactHtmlReport(text) : mask(text);
  if (out !== text) writeFileSync(file, out);
  return out !== text;
};

const roots = process.argv.slice(2);
const targets = (roots.length > 0 ? roots : ['test-results', 'playwright-report', 'blob-report']).filter(
  existsSync,
);
const redacted = targets.flatMap(files).filter(redactFile).length;
console.log(`redact-traces: masked JWTs in ${String(redacted)} file(s)`);
