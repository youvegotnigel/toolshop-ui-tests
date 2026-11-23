/** Dependency-free SVG/HTML chart helpers for the automation dashboard. */
import type { Cell, RunSummary, Status } from './model.mts';
import { STATUSES } from './model.mts';

export const COLORS: Record<Status, string> = {
  passed: '#2f8f5b',
  failed: '#d64045',
  broken: '#c8901c',
  flaky: '#8e6bd8',
  skipped: '#9aa5b1',
};

export const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const y = (value: number, height: number, pad: number): number =>
  pad + (1 - value / 100) * (height - 2 * pad);

/** Small trend line like the reference card: dashed 100% guide, filled area, last point marked. */
export const sparkline = (values: number[], color: string, width = 230, height = 60): string => {
  const pad = 6;
  const series = values.length === 1 ? [values[0] ?? 0, values[0] ?? 0] : values;
  const step = (width - 2 * pad) / Math.max(series.length - 1, 1);
  const points = series.map((v, i) => `${(pad + i * step).toFixed(1)},${y(v, height, pad).toFixed(1)}`);
  const last = points.at(-1)?.split(',') ?? ['0', '0'];
  return `<svg viewBox="0 0 ${String(width)} ${String(height)}" class="spark" role="img" aria-label="pass rate trend">
<line x1="${String(pad)}" x2="${String(width - pad)}" y1="${String(pad)}" y2="${String(pad)}" class="guide"/>
<polygon points="${String(pad)},${String(height - pad)} ${points.join(' ')} ${String(width - pad)},${String(height - pad)}" fill="${color}" opacity="0.1"/>
<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>
<circle cx="${last[0] ?? '0'}" cy="${last[1] ?? '0'}" r="3.5" fill="${color}"/></svg>`;
};

/** One or more series per run on a 0 to 100% axis (pass rate, coverage, critical journeys). */
export const trendChart = (
  history: RunSummary[],
  series: { pick: (r: RunSummary) => number; cls: string }[],
  label: string,
  width = 640,
  height = 220,
): string => {
  const left = 40;
  const pad = 20;
  const step = (width - left - pad) / Math.max(history.length - 1, 1);
  const point = (r: RunSummary, i: number, pick: (r: RunSummary) => number): [string, string] => [
    (left + i * step).toFixed(1),
    y(pick(r), height - 20, pad).toFixed(1),
  ];
  // Dots as well as lines, so a single run (or a gap) is still visible
  const line = (pick: (r: RunSummary) => number, cls: string): string =>
    `<polyline class="${cls}" fill="none" points="${history.map((r, i) => point(r, i, pick).join(',')).join(' ')}"/>` +
    history
      .map((r, i) => {
        const [cx, cy] = point(r, i, pick);
        return `<circle class="${cls} dot-pt" cx="${cx}" cy="${cy}" r="3.5"/>`;
      })
      .join('');
  const grid = [0, 25, 50, 75, 100]
    .map((v) => {
      const gy = y(v, height - 20, pad).toFixed(1);
      return `<line x1="${String(left)}" x2="${String(width - pad)}" y1="${gy}" y2="${gy}" class="grid"/><text x="${String(left - 8)}" y="${gy}" class="axis" text-anchor="end" dominant-baseline="middle">${String(v)}%</text>`;
    })
    .join('');
  const labels = history
    .map(
      (r, i) =>
        `<text x="${(left + i * step).toFixed(1)}" y="${String(height - 4)}" class="axis" text-anchor="middle">#${escapeHtml(r.runNumber)}</text>`,
    )
    .join('');
  return `<svg viewBox="0 0 ${String(width)} ${String(height)}" class="chart" role="img" aria-label="${escapeHtml(label)}">${grid}${series.map((s) => line(s.pick, s.cls)).join('')}${labels}</svg>`;
};

/** Bars on their own scale (duration, flaky count, a11y findings): one bar per run. */
export const barChart = (
  history: RunSummary[],
  pick: (r: RunSummary) => number,
  format: (v: number) => string,
  label: string,
): string => {
  const width = 640;
  const height = 160;
  const max = Math.max(1, ...history.map(pick));
  const left = 10;
  const slot = (width - 2 * left) / Math.max(history.length, 1);
  const bars = history
    .map((r, i) => {
      const h = (pick(r) / max) * (height - 40);
      const x = left + i * slot + slot * 0.2;
      return `<rect x="${x.toFixed(1)}" y="${(height - 20 - h).toFixed(1)}" width="${(slot * 0.6).toFixed(1)}" height="${h.toFixed(1)}" class="bar"><title>#${escapeHtml(r.runNumber)}: ${escapeHtml(format(pick(r)))}</title></rect><text x="${(x + slot * 0.3).toFixed(1)}" y="${String(height - 4)}" class="axis" text-anchor="middle">#${escapeHtml(r.runNumber)}</text>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${String(width)} ${String(height)}" class="chart" role="img" aria-label="${escapeHtml(label)}">${bars}</svg>`;
};

/** Status split as a donut with the total in the middle. */
export const donut = (counts: Record<Status, number>, size = 170): string => {
  const total = STATUSES.reduce((sum, s) => sum + counts[s], 0);
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const arcs = STATUSES.filter((s) => counts[s] > 0)
    .map((s) => {
      const length = (counts[s] / Math.max(total, 1)) * circumference;
      const arc = `<circle r="${radius.toFixed(1)}" cx="${String(size / 2)}" cy="${String(size / 2)}" fill="none" stroke="${COLORS[s]}" stroke-width="22" stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${String(size / 2)} ${String(size / 2)})"/>`;
      offset += length;
      return arc;
    })
    .join('');
  return `<svg viewBox="0 0 ${String(size)} ${String(size)}" class="donut" role="img" aria-label="test status split">${arcs}<text x="50%" y="48%" text-anchor="middle" class="donut-n">${String(total)}</text><text x="50%" y="62%" text-anchor="middle" class="donut-l">tests</text></svg>`;
};

/** Stacked status bar used on the suite card. */
export const statusBar = (counts: Record<Status, number>): string => {
  const total = Math.max(
    STATUSES.reduce((sum, s) => sum + counts[s], 0),
    1,
  );
  return `<div class="stack">${STATUSES.filter((s) => counts[s] > 0)
    .map(
      (s) =>
        `<span style="width:${String((counts[s] / total) * 100)}%;background:${COLORS[s]}" title="${String(counts[s])} ${s}"></span>`,
    )
    .join('')}</div>`;
};

export const coverageColor = (value: number): string => {
  if (value >= 66) return COLORS.passed;
  if (value >= 33) return COLORS.broken;
  return COLORS.failed;
};

/** A heat-map / matrix cell: colour plus a visible word, so status never depends on colour alone. */
export const cell = (status: Cell, title = ''): string =>
  status === 'none'
    ? `<td class="cell none" title="${escapeHtml(title)}">not covered</td>`
    : `<td class="cell ${status}" title="${escapeHtml(title)}">${status}</td>`;
