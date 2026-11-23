/** Dashboard stylesheet (kept separate so render.mts stays readable). */
export const STYLES = `
:root{--bg:#eef1f5;--card:#fff;--ink:#14202b;--muted:#5d6b7a;--line:#e3e8ee;--green:#2f8f5b;--red:#d64045;--amber:#c8901c;--purple:#6b4fc9;--blue:#1f6fae}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 "IBM Plex Sans","Segoe UI",system-ui,sans-serif}
main{max-width:1180px;overflow-wrap:anywhere;margin:0 auto;padding:28px 20px 40px}a{color:var(--blue);font-weight:600;text-decoration:none}a:hover{text-decoration:underline}
h1{font-size:26px;margin:0}h2{font-size:22px;margin:10px 0 4px}h3{font-size:16px;margin:0 0 12px}.muted{color:var(--muted)}.small{font-size:13px}
.top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:20px}.top nav{display:flex;gap:16px}
.card{background:var(--card);border:1.5px solid var(--line);border-radius:14px;padding:20px 22px;margin-bottom:18px}
.row{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:18px}.row .card{margin-bottom:0}.row{margin-bottom:18px}
.row.two{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)}
.suite.is-failing{border-color:#e2a5a8}.suite.is-passing{border-color:#a9d3bb}
.suite header{display:flex;flex-wrap:wrap;align-items:center;gap:10px}.badge{border:1.5px solid #c9d1da;border-radius:6px;padding:1px 8px;font-weight:700;font-size:13px;letter-spacing:.06em;color:#3d4b5a}
.group{color:var(--muted);font-weight:600;letter-spacing:.08em;font-size:14px}.pills{margin-left:auto;display:flex;gap:8px}
.pill{border-radius:99px;padding:3px 14px;font-weight:600;font-size:14px}.pill.red{background:#fbe3e4;color:var(--red)}.pill.green{background:#ddf1e5;color:var(--green)}.pill.purple{background:#ebe5fb;color:var(--purple)}
.rate-row{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}.rate{font-size:64px;font-weight:700;line-height:1}.rate small{font-size:28px}
.delta{color:#7b8794;margin-left:6px}.spark{width:240px;height:62px}.spark .guide{stroke:#c9d1da;stroke-dasharray:4 4}
.stack{display:flex;height:14px;border-radius:99px;overflow:hidden;background:var(--line);margin:18px 0 10px}.stack span{height:100%}
.legend{display:flex;flex-wrap:wrap;gap:18px;color:var(--muted)}.legend i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}.legend b{color:var(--ink)}
.cov{display:flex;align-items:center;gap:16px;margin:18px 0 14px;padding-bottom:14px;border-bottom:1px solid var(--line)}.label{font-weight:700;letter-spacing:.08em;color:#4a5866;font-size:14px}
.track{position:relative;flex:1;height:10px;border-radius:99px;background:var(--line)}.track>span{position:absolute;left:0;top:0;bottom:0;border-radius:99px}.track i{position:absolute;top:-5px;width:3px;height:20px;background:#6b7785;border-radius:2px}
.cov b{font-size:20px}footer{display:flex;flex-wrap:wrap;gap:18px;align-items:center;color:var(--muted)}footer .spacer{flex:1}.ago.old{color:var(--purple);font-weight:600}
.donut-card{display:flex;flex-direction:column;align-items:center}.donut{width:190px;height:190px}.donut-n{font-size:34px;font-weight:700;fill:var(--ink)}.donut-l{fill:var(--muted);font-size:13px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:18px;margin-bottom:18px}.kpi{margin:0;display:flex;flex-direction:column;gap:4px}.kpi b{font-size:30px}
.chart{width:100%;height:auto}.grid{stroke:var(--line)}.axis{fill:var(--muted);font-size:11px}.l-pass{stroke:var(--green);stroke-width:2.5}.l-cov{stroke:var(--blue);stroke-width:2.5}.l-crit{stroke:var(--purple);stroke-width:2;stroke-dasharray:5 4}
.key{display:flex;gap:16px;font-size:13px;color:var(--muted);margin-bottom:6px}.key span::before{content:"";display:inline-block;width:14px;height:3px;margin-right:6px;vertical-align:middle}
.k-pass::before{background:var(--green)}.k-cov::before{background:var(--blue)}.k-crit::before{background:var(--purple)}
.mbar{display:grid;grid-template-columns:64px 1fr 52px;align-items:center;gap:10px;margin:10px 0}.mname{font-weight:700;font-size:13px}.mtrack{height:12px;border-radius:99px;background:var(--line);overflow:hidden}.mtrack span{display:block;height:100%}.mval{text-align:right;color:var(--muted)}
.scroll{overflow-x:auto}.ops td:first-child{white-space:nowrap}table{border-collapse:collapse;width:100%}th,td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--line);font-size:14px}th{color:var(--muted);font-weight:600}
.heat td{text-align:center}.hm{background:color-mix(in srgb,var(--green) calc(var(--r)*85%),#f3f5f8);font-weight:600}.hm.deep{box-shadow:inset 0 0 0 3px var(--ink)}.na{color:#c2cad3}.tot{font-weight:700}
.chip{display:inline-block;border-radius:6px;background:#eef2f6;padding:1px 8px;margin:1px 4px 1px 0;font-size:12px;color:#3d4b5a}.chip.gap{background:#fbe3e4;color:var(--red)}.chip.red{background:var(--red);color:#fff}.chip.green{background:#ddf1e5;color:var(--green)}
.verb{display:inline-block;min-width:58px;text-align:center;border-radius:5px;color:#fff;font-weight:700;font-size:12px;padding:1px 6px}.get{background:#2b86f0}.post{background:#1fa35a}.put{background:#ec8800}.patch{background:#0f9f9f}.delete{background:#e5383b}
details{border-bottom:1px solid var(--line);padding:8px 0}summary{cursor:pointer;display:flex;gap:12px;align-items:center}details table{margin-top:8px}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}td.status,table.ops th{white-space:nowrap}.sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.num{text-align:right;white-space:nowrap}.foot{margin-top:8px}
@media(max-width:860px){.row,.row.two{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.rate{font-size:52px}.spark{width:150px}}
.cell{text-align:center;font-weight:600;font-size:13px;border:2px solid #fff;border-radius:6px}.cell.passed{background:#ddf1e5;color:#1d6b41}.cell.failed{background:#fbe3e4;color:#a8262b}.cell.broken{background:#fcefd6;color:#8a5d0c}.cell.flaky{background:#ebe5fb;color:#5b3fb8}.cell.skipped{background:#eef2f6;color:#4a5866}.cell.none{background:#f6f7f9;color:#8a96a3;font-weight:400}
.bar{fill:var(--blue);opacity:.75}.l-flaky{stroke:var(--purple);stroke-width:2.5}.k-flaky::before{background:var(--purple)}
.prio{display:inline-block;border-radius:6px;padding:1px 8px;font-size:12px;font-weight:700}.prio.critical{background:#fbe3e4;color:#a8262b}.prio.high{background:#fcefd6;color:#8a5d0c}.prio.normal{background:#eef2f6;color:#4a5866}
.dot-pt.l-pass{fill:var(--green)}.dot-pt.l-cov{fill:var(--blue)}.dot-pt.l-crit{fill:var(--purple);stroke-dasharray:none}.impact{font-weight:700}.impact.hot{color:var(--red)}td.zero{color:#a3adb8}
`;
