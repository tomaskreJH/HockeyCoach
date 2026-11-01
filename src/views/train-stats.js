// Záložka Statistiky: přepínač 📊 Zápasy (stats.js beze změny) / 🏒 Trénink – 📈 přehled tréninků za 30 / 60 / 90 / 180 dní (výchozí 60).
// Výsledky měření vidí celý tým (motivace), karta hráčky (tréninky, minuty, výsledky s grafem), ⭐ hodnocení trenérů jen HK.perm("treval", "r") – hráčka nikdy.
// Tým × dovednosti a 🔍 kdo netrénoval jen s bankou cvičení (HK.perm("drills", "r")); hráčka vidí jen svou kartu. ⬇️ CSV pro Excel.
// Dokumenty trplan / tract / trms / treval se čtou jednorázově po jednom na trénink v období a drží se v S.tst nejvýš TST_TTL. Minuty podle
// ✏️ skutečného průběhu (actualPlan), bez něj podle plánu. Výpočty domain/training-stats.js.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Načtení -> Vykreslení -> Eventy -> Exporty.

// ===== Importy =====
import {SKILLS} from "../config/skills.js";
import {isG, nm, stOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {csv, downloadFile, esc, td} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {TRMS_COLL, fmtVal} from "../domain/stopwatch.js";
import {RATE, RATES, TREVAL_COLL} from "../domain/training-eval.js";
import {TRPLAN_COLL} from "../domain/training-plan.js";
import {TRACT_COLL, actualPlan} from "../domain/training-actual.js";
import {TS_DAYS, TS_DEF, drillList, loadRows, loadSkills, measExercises, measRows, measTable, missSkill, playerEvals, playerLoad, playerMeas, statWindow} from "../domain/training-stats.js";
import {render} from "./shell.js";
import {stats} from "./stats.js";

// ===== Konstanty a stav =====
// S.stv = "m" | "t" (podzáložka), S.tst = {days, st: "load" | "ok" | "err", at, T, plans, ms, ev, err}, S.tsx = id cvičení v tabulce měření,
// S.tsp = hráčka na kartě, S.tsk = dovednost v 🔍 Kdo netrénoval
const TST_TTL = 5 * 60 * 1000;   // jak dlouho platí načtené dokumenty tréninků (ms)
const CSS = `<style>
.tsh td.c,.tsh th.c{text-align:center}
.tsh td.h{font-weight:700;font-size:13px}
.tsb{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bd)}
.tsb .nm{flex:0 0 44%;font-size:14px}
.tsb .br{flex:1;height:10px;border-radius:5px;background:var(--bd);overflow:hidden}
.tsb .br i{display:block;height:100%;background:var(--ac)}
.tsb .v{flex:none;width:64px;text-align:right;font-size:13px;font-weight:700}
.tsr{padding:8px 0;border-bottom:1px solid var(--bd)}
.tsr svg{display:block;margin-top:4px}
.tsme td{font-weight:700;background:var(--bd)}
</style>`;

// ===== Pomocné funkce =====
const errTxt = e => (e && (e.code || e.message)) || "chyba";
// Datum česky (d. m.)
const dm = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "")); return m ? +m[3] + ". " + +m[2] + "." : String(s || ""); };
const staff = () => HK.can("sport");
const canEval = () => !HK.can("guest") && HK.perm("treval", "r");
const canDrills = () => HK.perm("drills", "r") && (S.dr || []).length > 0;
const drillMap = () => Object.fromEntries((S.dr || []).map(d => [d.id, d]));
// Hráčky týmu pro přehled: bez hostujících a ukončených, seřazené podle jména
const teamPids = () => S.pl.filter(p => p.guest !== true && stOf(p) !== "end").sort((a, b) => nm(a.id).localeCompare(nm(b.id), "cs")).map(p => p.id);
// Jednorázové čtení jednoho dokumentu (chyba = nic)
const one = (coll, id) => Promise.resolve().then(() => S.db.doc(coll + "/" + id).get()).catch(() => null);
// Zlepšení proti minule: ▲ lepší (zeleně), ▼ horší (červeně), = beze změny
function deltaHtml(d, u) {
  if (d == null) return '<span class="mu">–</span>';
  if (!d) return '<span class="mu">＝</span>';
  return `<span style="color:var(${d > 0 ? "--ok" : "--no"});font-weight:700">${d > 0 ? "▲" : "▼"} ${esc(fmtVal(Math.abs(d), u))}</span>`;
}
// Malý graf výsledků (nejstarší vlevo; nahoru = lepší i u času)
function spark(pts, low) {
  if (!pts || pts.length < 2) return "";
  const W = 220, H = 40, P = 4, v = pts.map(p => p.v), lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1;
  const xy = pts.map((p, i) => [P + i * (W - 2 * P) / (pts.length - 1), low ? P + (p.v - lo) / span * (H - 2 * P) : H - P - (p.v - lo) / span * (H - 2 * P)]);
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="vývoj výsledků"><polyline fill="none" stroke="var(--ac)" stroke-width="2" points="${xy.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ")}"/>${xy.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="var(--ac)"/>`).join("")}</svg>`;
}
// Sloupcový řádek (název, pruh, hodnota)
const bar = (name, val, max, txt) => `<div class="tsb"><div class="nm">${name}</div><div class="br"><i style="width:${max ? Math.round(val / max * 100) : 0}%"></i></div><div class="v">${txt}</div></div>`;

// ===== Načtení =====
// Dokumenty tréninků v období (plán, měření, u realizačního týmu hodnocení); znovu po změně období nebo po TST_TTL
function ensure(days, force) {
  const t = S.tst;
  if (!force && t && t.days === days && (t.st === "load" || Date.now() - t.at < TST_TTL)) return;
  const T = statWindow(S.ev, td(), days), ev = canEval();
  const R = S.tst = {days, st: "load", at: Date.now(), T, plans: {}, ms: {}, ev: {}};
  // Plán upravený podle ✏️ skutečného průběhu (tract); bez něj (starší tréninky, nepublikovaná pravidla) plán jako dřív
  Promise.all(T.map(e => Promise.all([one(TRPLAN_COLL, e.id), one(TRACT_COLL, e.id), one(TRMS_COLL, e.id), ev ? one(TREVAL_COLL, e.id) : null]).then(([p, t, m, v]) => {
    R.plans[e.id] = actualPlan(p, t); R.ms[e.id] = m; if (v) R.ev[e.id] = v;
  }))).then(() => { if (S.tst !== R) return; R.st = "ok"; R.at = Date.now(); if (S.tab === "st") render(); })
    .catch(e => { if (S.tst !== R) return; R.st = "err"; R.err = errTxt(e); if (S.tab === "st") render(); });
}
// Odvozené údaje pro vykreslení (jednou za překreslení)
function derive(R) {
  const pids = teamPids(), goalies = new Set(S.pl.filter(isG).map(p => p.id)), pos = Object.fromEntries(S.pl.map(p => [p.id, p.pos]));
  const trainings = R.T.map(e => ({id: e.id, date: e.date, lines: e.lines || {}}));
  const D = canDrills() ? drillMap() : null;
  return {pids, trainings, D, ex: measExercises(trainings, R.ms), load: playerLoad({pids, trainings, plans: R.plans, att: S.at, goalies, pos, drills: D})};
}

// ===== Vykreslení: části =====
// Období a souhrn
function headHtml(R) {
  const T = R.T || [], np = T.filter(e => R.plans[e.id] && (R.plans[e.id].blocks || []).length).length, nm2 = T.filter(e => R.ms[e.id] && Object.keys(R.ms[e.id].r || {}).length).length;
  return `<div class="cd"><h2>🏒 Trénink</h2><div class="chips">${TS_DAYS.map(d => `<button class="chip ${R.days === d ? "on" : ""}" data-tsd="${d}">${d} dní</button>`).join("")}</div>
<div class="mu">${R.st === "load" ? "Načítám tréninky…" : R.st === "err" ? "⚠️ Načtení selhalo: " + esc(R.err) : `Tréninků v období: <b>${T.length}</b> · s plánem ${np} · s měřením ${nm2}`}</div></div>`;
}
// ⏲ Tabulka výsledků měření jednoho cvičení (celý tým; vlastní řádek zvýrazněný)
function measHtml(X) {
  if (!X.ex.length) return '<div class="cd"><h2>⏲ Výsledky měření</h2><div class="msg">V období zatím nikdo neměřil.</div></div>';
  const ex = X.ex.find(x => x.id === S.tsx) || X.ex[0], me = HK.pid(), T = measTable(ex);
  return `<div class="cd"><h2>⏲ Výsledky měření</h2><select id="tsx" style="width:100%;margin-bottom:8px">${X.ex.map(x => `<option value="${esc(x.id)}" ${x.id === ex.id ? "selected" : ""}>${esc(x.dn)} · ${x.sess.length}× měřeno</option>`).join("")}</select>
<div class="mu" style="margin-bottom:6px">${ex.low ? "Nižší je lepší." : "Vyšší je lepší."} Zlepšení = poslední trénink proti předchozímu.</div>
<div class="tw"><table class="sortable"><tr><th>#</th><th>Hráčka</th><th>Nejlepší</th><th>Poslední</th><th>Zlepšení</th><th>Tréninků</th></tr>
${T.map(x => `<tr${x.pid === me ? ' class="tsme"' : ""}><td>${x.rank}.</td><td>${esc(nm(x.pid))}</td><td><b>${esc(fmtVal(x.best, ex.u))}</b> <span class="mu">${esc(dm(x.bestDate))}</span></td><td>${esc(fmtVal(x.last, ex.u))}</td><td>${deltaHtml(x.delta, ex.u)}</td><td>${x.n}</td></tr>`).join("")}</table></div>
<button class="s" id="tsxc" style="margin-top:8px">⬇️ CSV všech měření</button></div>`;
}
// 👤 Karta hráčky: tréninky, minuty po dovednostech (nebo po cvičeních), výsledky s grafem, ⭐ hodnocení (jen realizační tým)
function playerHtml(X, R) {
  const me = HK.pid(), all = staff(), pid = all ? (X.pids.includes(S.tsp) ? S.tsp : X.pids[0]) : me;
  if (!pid) return "";
  const o = X.load[pid] || {nt: 0, n: 0, min: 0, sk: {}, dr: {}}, sel = all ? `<select id="tsp" style="width:100%;margin-bottom:8px">${X.pids.map(id => `<option value="${esc(id)}" ${id === pid ? "selected" : ""}>${esc(nm(id))}</option>`).join("")}</select>` : "";
  const sk = Object.entries(o.sk).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]), dr = drillList(o).slice(0, 12);
  const mins = sk.length ? sk.map(([k, v]) => bar(esc(SKILLS[k] || k), v, sk[0][1], Math.round(v) + " min")).join("")
    : dr.length ? dr.map(x => bar(esc(x.dn), x.min, dr[0].min, x.min + " min")).join("") : '<div class="mu">Na tréninku s plánem zatím nebyla.</div>';
  const res = playerMeas(X.ex, pid);
  const resH = res.length ? res.map(r => `<div class="tsr"><div><b>${esc(r.dn)}</b> · nejlepší <b>${esc(fmtVal(r.best, r.u))}</b> · ${r.rank}. z ${r.of} · ${deltaHtml(r.delta, r.u)}</div>
<div class="mu" style="font-size:13px">${r.pts.map(p => esc(dm(p.date)) + " " + esc(fmtVal(p.v, r.u))).join(" · ")}</div>${spark(r.pts, r.low)}</div>`).join("") : '<div class="mu">Zatím bez měření.</div>';
  let evH = "";
  if (canEval()) {
    const E = playerEvals(R.T, R.ev, pid);
    evH = `<h3 style="margin:12px 0 4px">⭐ Hodnocení trenérů <span class="mu" style="font-weight:400">(hráčka nevidí)</span></h3>
${E.items.length ? `<div style="margin-bottom:6px">${RATES.map(r => `${RATE[r].i} ${E.cnt[r]}`).join(" · ")}${E.avg != null ? " · průměr " + String(E.avg).replace(".", ",") : ""}</div>
${E.items.slice(0, 15).map(x => `<div class="mu" style="font-size:13px;padding:3px 0">${esc(dm(x.date))} · ${esc(x.dn)} ${x.r ? RATE[x.r].i : ""}${x.n ? " · " + esc(x.n) : ""}</div>`).join("")}` : '<div class="mu">V období bez hodnocení.</div>'}`;
  }
  return `<div class="cd"><h2>👤 ${all ? "Karta hráčky" : "Můj trénink"}</h2>${sel}
<div style="margin-bottom:8px">Tréninků: <b>${o.nt}</b> · s plánem ${o.n} · na ledě podle plánu <b>${Math.round(o.min)} min</b></div>
<h3 style="margin:8px 0 4px">${sk.length ? "Minuty po dovednostech" : "Minuty po cvičeních"}</h3>${mins}
<h3 style="margin:12px 0 4px">⏲ Výsledky</h3>${resH}${evH}</div>`;
}
// 🌡 Tým × dovednosti (minuty v období) a 🔍 kdo dovednost netrénoval – jen realizační tým s bankou cvičení
function heatHtml(X) {
  if (!staff() || !X.D) return "";
  const K = loadSkills(X.load);
  if (!K.length) return '<div class="cd"><h2>🌡 Tým × dovednosti</h2><div class="msg">V období žádný trénink s plánem a účastí.</div></div>';
  const max = Math.max(1, ...X.pids.flatMap(p => K.map(k => X.load[p].sk[k] || 0)));
  const cell = v => { const m = Math.round(v || 0); return `<td class="c" style="background:color-mix(in srgb, var(--ok) ${m ? Math.round(15 + 70 * (v / max)) : 0}%, transparent)">${m || "·"}</td>`; };
  const most = [...K].sort((x, y) => missSkill(X.load, y).length - missSkill(X.load, x).length)[0];   // výchozí = dovednost s nejvíc chybějícími
  const k = K.includes(S.tsk) ? S.tsk : most, miss = missSkill(X.load, k).filter(p => X.pids.includes(p));
  const none = X.pids.filter(p => !X.load[p].nt);
  return `<div class="cd"><h2>🌡 Tým × dovednosti</h2><div class="mu" style="margin-bottom:6px">Minuty podle plánu tréninků, na kterých hráčka byla. Tmavší = víc.</div>
<div class="tw"><table class="sortable tsh"><tr><th>Hráčka</th><th class="c">Tr.</th>${K.map(x => `<th class="c" title="${esc(SKILLS[x])}">${esc(String(SKILLS[x]).split(" ")[0])}</th>`).join("")}</tr>
${X.pids.map(p => `<tr><td>${esc(nm(p))}</td><td class="c h">${X.load[p].nt}</td>${K.map(x => cell(X.load[p].sk[x])).join("")}</tr>`).join("")}</table></div>
<div class="mu" style="font-size:12px;margin-top:4px">${K.map(x => esc(SKILLS[x])).join(" · ")}</div>
<h3 style="margin:12px 0 4px">🔍 Kdo netrénoval</h3><select id="tsk" style="width:100%;margin-bottom:6px">${K.map(x => `<option value="${x}" ${x === k ? "selected" : ""}>${esc(SKILLS[x])}</option>`).join("")}</select>
<div>${miss.length ? miss.map(p => esc(nm(p))).join(", ") : '<span style="color:var(--ok)">Všechny hráčky z tréninků s plánem ji trénovaly.</span>'}</div>
${none.length ? `<div class="mu" style="margin-top:6px">Bez tréninku v období: ${none.map(p => esc(nm(p))).join(", ")}</div>` : ""}
<button class="s" id="tskc" style="margin-top:8px">⬇️ CSV tým × dovednosti</button></div>`;
}

// ===== Vykreslení: podzáložka Trénink =====
function trainHtml() {
  const R = S.tst;
  if (!R || R.st !== "ok") return CSS + headHtml(R || {days: TS_DEF, st: "load", T: [], plans: {}, ms: {}});
  const X = derive(R);
  // Realizační tým: nejdřív tabulka měření týmu; hráčka nejdřív svou kartu
  return CSS + headHtml(R) + (staff() ? measHtml(X) + playerHtml(X, R) : playerHtml(X, R) + measHtml(X)) + heatHtml(X);
}

// ===== Eventy =====
function bind(a) {
  const q = s => a.querySelector(s);
  a.querySelectorAll("[data-stv]").forEach(b => b.onclick = () => { S.stv = b.dataset.stv; render(); });
  a.querySelectorAll("[data-tsd]").forEach(b => b.onclick = () => { ensure(+b.dataset.tsd); render(); });
  const x = q("#tsx"), p = q("#tsp"), k = q("#tsk"), xc = q("#tsxc"), kc = q("#tskc");
  if (x) x.onchange = () => { S.tsx = x.value; render(); };
  if (p) p.onchange = () => { S.tsp = p.value; render(); };
  if (k) k.onchange = () => { S.tsk = k.value; render(); };
  if (xc) xc.onclick = () => { const X = derive(S.tst); downloadFile("trenink-mereni-" + td() + ".csv", csv(measRows(X.ex, id => nm(id), fmtVal)), "text/csv"); };
  if (kc) kc.onclick = () => { const X = derive(S.tst); downloadFile("trenink-dovednosti-" + td() + ".csv", csv(loadRows(X.load, X.pids, id => nm(id))), "text/csv"); };
}

// ===== Exporty =====
// Záložka Statistiky: přepínač Zápasy / Trénink (Trénink jen s právem číst plán tréninku); zápasové statistiky vykreslí stats.js beze změny
export function statsView(a) {
  if (!HK.perm("trplan", "r") || HK.can("guest")) { stats(a); return; }
  const v = S.stv === "t" ? "t" : "m";
  a.innerHTML = `<div class="chips"><button class="chip ${v === "m" ? "on" : ""}" data-stv="m">📊 Zápasy</button><button class="chip ${v === "t" ? "on" : ""}" data-stv="t">🏒 Trénink</button></div><div id="stb"></div>`;
  const box = a.querySelector("#stb");
  if (v === "m") stats(box);
  else { ensure((S.tst && S.tst.days) || TS_DEF); box.innerHTML = trainHtml(); }
  bind(a);
}
