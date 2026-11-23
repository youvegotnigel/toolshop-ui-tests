/** Headline cards, KPIs and trend charts of the automation dashboard. */
import type { Dashboard, RunSummary } from './model.mts';
import { STATUSES } from './model.mts';
import {
  barChart,
  COLORS,
  coverageColor,
  donut,
  escapeHtml,
  sparkline,
  statusBar,
  trendChart,
} from './charts.mts';

export const duration = (ms: number): string => {
  if (ms < 1000) return `${String(Math.round(ms))}ms`;
  const seconds = Math.round(ms / 1000);
  return seconds >= 60
    ? `${String(Math.floor(seconds / 60))}m ${String(seconds % 60).padStart(2, '0')}s`
    : `${String(seconds)}s`;
};

export const link = (href: string | undefined, label: string): string =>
  href === undefined ? '' : `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;

const delta = (history: RunSummary[]): string => {
  const previous = history.at(-2);
  const current = history.at(-1);
  if (previous === undefined || current === undefined) return '± 0';
  const diff = Math.round((current.passRate - previous.passRate) * 10) / 10;
  if (diff === 0) return '± 0';
  return diff > 0 ? `▲ ${String(diff)}` : `▼ ${String(Math.abs(diff))}`;
};

export const suiteCard = (d: Dashboard): string => {
  const s = d.summary;
  const failing = s.counts.failed + s.counts.broken > 0;
  const rateColor = failing ? COLORS.failed : COLORS.passed;
  const legend = STATUSES.filter((st) => s.counts[st] > 0)
    .map((st) => `<span><i style="background:${COLORS[st]}"></i><b>${String(s.counts[st])}</b> ${st}</span>`)
    .join('');
  const target = d.plan.targetCoverage;
  return `<article class="card suite ${failing ? 'is-failing' : 'is-passing'}">
  <header><span class="badge">${escapeHtml(d.plan.suite.framework.toUpperCase())}</span><span class="group">${escapeHtml(d.plan.suite.group.toUpperCase())}</span>
  <span class="pills"><span class="pill ${failing ? 'red' : 'green'}">${failing ? 'Failing' : 'Passing'}</span><span class="pill purple stale" data-stale-after="${String(d.plan.staleAfterHours)}" data-time="${escapeHtml(s.date)}" hidden>Stale</span></span></header>
  <h2>${escapeHtml(d.plan.suite.name)}</h2>
  <div class="rate-row"><div><div class="rate" style="color:${rateColor}">${String(s.passRate)}<small>%</small></div>
  <div class="muted">pass rate <b class="delta">${delta(d.history)}</b></div></div>${sparkline(
    d.history.map((h) => h.passRate),
    rateColor,
  )}</div>
  ${statusBar(s.counts)}<div class="legend">${legend}</div>
  <div class="cov"><span class="label">JOURNEYS</span><span class="track"><span style="width:${String(s.journeyCoverage)}%;background:${coverageColor(s.journeyCoverage)}"></span><i style="left:${String(target)}%" title="target ${String(target)}%"></i></span><b style="color:${coverageColor(s.journeyCoverage)}">${String(s.journeyCoverage)}%</b></div>
  <footer><span>${String(s.total)} test runs</span><span>${duration(s.durationMs)}</span><span class="ago" data-time="${escapeHtml(s.date)}"></span>
  <span class="spacer"></span>${link(d.links.allure, 'Allure report')}${link(d.links.run, `#${s.runNumber}`)}</footer></article>`;
};

export const donutCard = (d: Dashboard): string =>
  `<div class="card donut-card"><h3>Latest run</h3>${donut(d.summary.counts)}</div>`;

const kpi = (label: string, value: string, note: string, color?: string): string =>
  `<div class="card kpi"><span class="label">${label}</span><b style="${color === undefined ? '' : `color:${color}`}">${value}</b><span class="muted">${note}</span></div>`;

export const kpis = (d: Dashboard): string => {
  const s = d.summary;
  const planned = d.journeys.filter((j) => j.planned);
  const critical = planned.filter((j) => j.priority === 'critical');
  const inScope = d.pages.filter((p) => p.excluded === undefined);
  const flakyColor = s.counts.flaky > 0 ? COLORS.flaky : undefined;
  return `<div class="kpis">
${kpi('Pass rate', `${String(s.passRate)}%`, `${String(s.counts.passed)} passed, ${String(s.counts.failed + s.counts.broken)} failed`, s.passRate < 100 ? COLORS.failed : COLORS.passed)}
${kpi('Flaky rate', `${String(s.flakyRate)}%`, `${String(s.counts.flaky)} passed only on retry`, flakyColor)}
${kpi('Journeys covered', `${String(planned.filter((j) => j.tests > 0).length)}/${String(planned.length)}`, `${String(s.journeyCoverage)}% of the plan, target ${String(d.plan.targetCoverage)}%`, coverageColor(s.journeyCoverage))}
${kpi('Critical journeys passing', `${String(critical.filter((j) => j.status === 'passed' || j.status === 'flaky').length)}/${String(critical.length)}`, `${String(s.criticalPassing)}% of critical journeys`, coverageColor(s.criticalPassing))}
${kpi('Pages covered', `${String(inScope.filter((p) => p.tests > 0).length)}/${String(inScope.length)}`, `${String(s.pageCoverage)}% of in-scope pages`, coverageColor(s.pageCoverage))}
${kpi('Run duration', duration(s.durationMs), `${String(s.total)} test runs on ${escapeHtml(s.env)}`)}
${kpi('Last run', `<span class="ago" data-time="${escapeHtml(s.date)}"></span>`, `stale after ${String(d.plan.staleAfterHours)} hours`)}
</div>`;
};

export const trends = (d: Dashboard): string => {
  const h = d.history;
  return `<section class="row two"><div class="card"><h3>Trend per run</h3><div class="key"><span class="k-pass">Pass rate</span><span class="k-cov">Journey coverage</span><span class="k-crit">Critical journeys passing</span></div>${trendChart(
    h,
    [
      { pick: (r) => r.passRate, cls: 'l-pass' },
      { pick: (r) => r.journeyCoverage, cls: 'l-cov' },
      { pick: (r) => r.criticalPassing, cls: 'l-crit' },
    ],
    'pass rate, journey coverage and critical journeys per run',
  )}</div>
<div class="card"><h3>Run duration</h3>${barChart(h, (r) => r.durationMs, duration, 'run duration per run')}
<h3>Flaky tests</h3>${barChart(
    h,
    (r) => r.counts.flaky,
    (v) => `${String(v)} flaky`,
    'flaky tests per run',
  )}</div></section>`;
};
