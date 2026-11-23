/** Renders the automation dashboard as one self-contained HTML page. */
import type { Dashboard, Depth, JourneyCoverage, Priority, TestRecord } from './model.mts';
import { PRIORITIES } from './model.mts';
import { barChart, cell, COLORS, escapeHtml } from './charts.mts';
import { pageA11y } from './collect.mts';
import { donutCard, duration, kpis, link, suiteCard, trends } from './sections.mts';
import { STYLES } from './styles.mts';

const DEPTH_LABEL: Record<Depth, string> = {
  happy: 'Happy path',
  negative: 'Negative',
  a11y: 'Accessibility',
  mobile: 'Mobile',
};

const prio = (p: Priority): string => `<span class="prio ${p}">${p}</span>`;

const journeyName = (j: JourneyCoverage): string =>
  `<code>${escapeHtml(j.id)}</code><br><span class="muted small">${escapeHtml(j.title)}${j.planned ? '' : ' (unplanned)'}</span>`;

const byPriority = (a: JourneyCoverage, b: JourneyCoverage): number =>
  PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) || a.id.localeCompare(b.id);

const covered = (d: Dashboard): JourneyCoverage[] => d.journeys.filter((j) => j.tests > 0).sort(byPriority);

const heatmap = (d: Dashboard): string => {
  const head = `<tr><th>Journey</th>${d.plan.depths.map((dep) => `<th>${DEPTH_LABEL[dep]}</th>`).join('')}</tr>`;
  const rows = covered(d)
    .map(
      (j) =>
        `<tr><th>${journeyName(j)}</th>${d.plan.depths.map((dep) => cell(j.depth[dep], `${j.id} ${dep}`)).join('')}</tr>`,
    )
    .join('');
  return `<section class="card"><h3>Coverage heat map</h3><p class="muted small">Covered journeys by depth. Depth comes from tags: <code>@negative</code>, <code>@a11y</code>, and the mobile-chrome project or <code>@mobile</code>.</p><div class="scroll"><table class="heat">${head}${rows}</table></div></section>`;
};

const browserMatrix = (d: Dashboard): string => {
  const head = `<tr><th>Journey</th>${d.plan.projects.map((p) => `<th>${escapeHtml(p)}</th>`).join('')}</tr>`;
  const rows = covered(d)
    .map(
      (j) =>
        `<tr><th>${journeyName(j)}</th>${d.plan.projects.map((p) => cell(j.browsers[p] ?? 'none', `${j.id} on ${p}`)).join('')}</tr>`,
    )
    .join('');
  return `<section class="card"><h3>Browser matrix</h3><p class="muted small">Mobile runs <code>@smoke</code> journeys only. ${escapeHtml(d.browserVersions.join(' · '))}</p><div class="scroll"><table class="heat">${head}${rows}</table></div></section>`;
};

const criticalJourneys = (d: Dashboard): string => {
  const rows = d.journeys
    .filter((j) => j.priority === 'critical' && j.planned)
    .map(
      (j) =>
        `<tr><td>${journeyName(j)}</td>${cell(j.status)}<td>${escapeHtml(j.lastFailure ?? 'none in history')}</td><td>${j.tests === 0 ? '<span class="chip gap">backlog</span>' : link(j.allureUrl, 'Allure test')}</td></tr>`,
    )
    .join('');
  return `<section class="card"><h3>Critical journeys</h3><div class="scroll"><table class="ops"><tr><th>Journey</th><th>Status</th><th>Last failure</th><th>Evidence</th></tr>${rows}</table></div></section>`;
};

const a11ySummary = (d: Dashboard): string => {
  const num = (n: number, hot: boolean): string =>
    `<td class="num ${n === 0 ? 'zero' : hot ? 'impact hot' : 'impact'}">${String(n)}</td>`;
  const rows = pageA11y(d.tests)
    .map(
      (p) =>
        `<tr><td><code>${escapeHtml(p.page)}</code></td>${num(p.critical, true)}${num(p.serious, true)}${num(p.moderate, false)}${num(p.minor, false)}</tr>`,
    )
    .join('');
  const known = [...new Set(d.tests.flatMap((t) => t.knownA11y))]
    .map((k) => `<li>${escapeHtml(k)}</li>`)
    .join('');
  return `<section class="row two"><div class="card"><h3>Accessibility (WCAG 2.2 AA)</h3><p class="muted small">Violations by impact per audited page, worst browser. Serious and critical fail the test unless they are known product defects.</p><div class="scroll"><table class="ops"><tr><th>Page</th><th>Critical</th><th>Serious</th><th>Moderate</th><th>Minor</th></tr>${rows}</table></div>
${known === '' ? '' : `<h3>Known product defects</h3><ul class="small">${known}</ul>`}</div>
<div class="card"><h3>Serious + critical findings per run</h3>${barChart(
    d.history,
    (r) => r.a11ySerious,
    (v) => `${String(v)} findings`,
    'serious and critical accessibility findings per run',
  )}</div></section>`;
};

const backlog = (d: Dashboard): string => {
  const journeys = d.journeys
    .filter((j) => j.planned && j.tests === 0)
    .sort(byPriority)
    .map(
      (j) =>
        `<tr><td>${journeyName(j)}</td><td>${prio(j.priority)}</td><td>${escapeHtml(j.area)}</td><td>${escapeHtml(j.target)}</td></tr>`,
    )
    .join('');
  const pages = d.pages
    .filter((p) => p.tests === 0)
    .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority))
    .map(
      (p) =>
        `<span class="chip${p.excluded === undefined ? ' gap' : ''}" title="${escapeHtml(p.excluded ?? p.route)}">${escapeHtml(p.key)}${p.excluded === undefined ? '' : ' (excluded)'}</span>`,
    )
    .join('');
  return `<section class="card"><h3>Not yet covered: the next sprint's backlog</h3><div class="scroll"><table class="ops"><tr><th>Journey</th><th>Priority</th><th>Area</th><th>Target release</th></tr>${journeys}</table></div><h3>Pages without a test</h3><p>${pages}</p></section>`;
};

const statusCell = (status: TestRecord['status']): string =>
  `<td class="status"><span class="dot" style="background:${COLORS[status]}" aria-hidden="true"></span>${status}</td>`;

const testRows = (d: Dashboard): string =>
  d.tests
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.story)}<br><span class="muted small">${escapeHtml(t.title)}</span></td><td>${escapeHtml(t.project)}</td><td>${t.tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join('')}</td>${statusCell(t.status)}<td class="num">${duration(t.durationMs)}</td></tr>`,
    )
    .join('');

const CLIENT_SCRIPT = `<script>
for (const el of document.querySelectorAll('[data-time]')) {
  const hours = (Date.now() - Date.parse(el.dataset.time)) / 36e5;
  if (el.classList.contains('ago')) {
    el.textContent = hours < 1 ? 'just now' : hours < 48 ? Math.round(hours) + ' hours ago' : Math.round(hours / 24) + ' days ago';
    if (hours > 48) el.classList.add('old');
  }
  if (el.dataset.staleAfter && hours > Number(el.dataset.staleAfter)) el.hidden = false;
}
</script>`;

export const renderDashboard = (d: Dashboard): string => {
  const s = d.summary;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(d.plan.suite.name)}: automation dashboard</title><style>${STYLES}</style></head><body><main>
<header class="top"><div><h1>Test automation dashboard</h1><p class="muted">${escapeHtml(d.plan.suite.name)} · run #${escapeHtml(s.runNumber)} · ${escapeHtml(s.commit.slice(0, 7))} · ${escapeHtml(s.env)}${d.toolshopVersion === undefined ? '' : ` · Toolshop ${escapeHtml(d.toolshopVersion)}`} · release plan ${escapeHtml(d.plan.release)} · <span class="ago" data-time="${escapeHtml(s.date)}"></span></p></div>
<nav>${link(d.links.allure, 'Allure report')}${link(d.links.playwright, 'Playwright report')}${link(d.links.run, 'CI run')}</nav></header>
<section class="row">${suiteCard(d)}${donutCard(d)}</section>
${kpis(d)}
${trends(d)}
${heatmap(d)}
${browserMatrix(d)}
${criticalJourneys(d)}
${a11ySummary(d)}
${backlog(d)}
<section class="card"><h3>Tests in this run</h3><div class="scroll"><table class="ops"><tr><th>Journey and test</th><th>Browser</th><th>Tags</th><th>Status</th><th>Time</th></tr>${testRows(d)}</table></div></section>
<p class="muted small foot">Coverage is measured against <code>coverage-plan.json</code>: a spec covers a journey through its describe title (<code>catalog.search: ...</code>) and pages through <code>covers</code> annotations. Numbers update after every CI run on main.</p>
</main>${CLIENT_SCRIPT}</body></html>`;
};
