// ⏲ Stopky a výsledky měření tréninku: karta „⏲ Výsledky měření“ v kartě plánu (pořadí po měřených cvičeních, vidí celý tým kromě hostující)
// a okno stopek #tsw přes celou obrazovku (z karty nebo z ⏱ živého tréninku u měřeného cvičení na mé lince).
// Čas: klepnutí na jméno = start / stop (více hráček souběžně, ▶ Start všech), každé zastavení = pokus; počet / body: číslo a ✓ Zapsat.
// Data trms/{eid} (jeden dokument na trénink, poslech jen u otevřeného tréninku), zápis dávkou s hlubokým sloučením (jen pokusy dané hráčky);
// měřit smí HK.perm("treval", "e"), číst kdo čte plán (trplan r). Výpočty domain/stopwatch.js.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Poslech -> Vykreslení (karta, okno) -> Eventy -> Exporty.

// ===== Importy =====
import {UNITS} from "../config/skills.js";
import {armed, confirm2} from "../core/actions.js";
import {nm} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {MS_MAX, TRMS_COLL, addTry, bestOf, dropTry, fmtVal, measLanes, msPatch, msVal, ranking, swSec, swStart, swStop, swText} from "../domain/stopwatch.js";
import {isFixedLane} from "../domain/training-plan.js";
import {groupPids} from "../domain/training-live.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
// M = poslech výsledků otevřeného tréninku: eid, un (konec poslechu), res (dokument | null | undefined = načítá se), err
let M = {eid: null, un: null, res: undefined, err: null};
// W = otevřené okno stopek: eid, m (měřená linka {key, d, dn, u, low}), pids (hráčky v okně), all (přihlášené pro „+ Přidat“),
// run ({pid: začátek ms}), val ({pid: rozepsané číslo}), loc ({pid: pokusy} – poslední zápis, než dorazí z databáze), el, timer
let W = null;
const CSS = `<style>
#tsw{position:fixed;inset:0;z-index:45;background:var(--bg);color:var(--tx);overflow:auto;padding:12px 12px calc(12px + env(safe-area-inset-bottom,0px))}
#tsw .swh{display:flex;gap:8px;align-items:center;margin-bottom:6px}
#tsw .swh h2{flex:1;margin:0;font-size:18px}
#tsw .swr{border:2px solid var(--bd);border-radius:12px;padding:6px;margin-bottom:8px}
#tsw .swr.on{border-color:var(--no)}
#tsw .swn{display:flex;width:100%;align-items:center;gap:8px;min-height:62px;font-size:18px;text-align:left;background:var(--cd,transparent);border:0;color:var(--tx)}
#tsw .swn b{flex:1}
#tsw .swt{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;min-width:110px;text-align:right}
#tsw .swr.on .swt{color:var(--no)}
#tsw .swi{display:flex;gap:6px;align-items:center;font-size:13px;flex-wrap:wrap}
#tsw .swi span{flex:1}
#tsw .swc{display:flex;gap:6px;align-items:center;margin-top:4px}
#tsw .swc input{width:90px;margin:0;text-align:center;font-size:20px}
#tsw .swc button{min-height:48px;min-width:52px}
#evw .mst{width:100%;border-collapse:collapse;margin:4px 0 8px}
#evw .mst td,#evw .mst th{padding:4px 3px;border-bottom:1px solid var(--bd);font-size:13px;text-align:left}
#evw .mst tr.me td{font-weight:800;background:color-mix(in srgb,var(--ac) 14%,transparent)}
</style>`;

// ===== Pomocné funkce =====
const canMs = () => HK.perm("treval", "e");
const me = () => { const u = HK.user(); return ((u && u.email) || "").toLowerCase(); };
const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* bez vibrací */ } };
const entryOf = key => (M.res && M.res.r && M.res.r[key]) || null;
// Pokusy hráčky: poslední vlastní zápis (než ho potvrdí poslech), jinak z databáze
const triesOf = pid => (W && W.loc[pid]) || ((entryOf(W.m.key) || {}).ms || {})[pid] || [];
// Hráčky, které linka měří, z údajů tréninku (X z trplan-view): brankářská linka = brankářky, stanoviště = všechny hráčky v poli,
// společný blok = vybrané skupiny (bez výběru všechny hráčky v poli)
function lanePids(b, l, X) {
  const R = X.roster || {};
  if (isFixedLane(l)) return [...(R.goalies || [])];
  if (b.mode === "st" || !(l.grp || []).length) return (R.skaters || []).map(p => p.id);
  return groupPids(b, l.grp, R);
}
const allPids = X => [...((X.roster && X.roster.skaters) || []).map(p => p.id), ...((X.roster && X.roster.goalies) || [])];

// ===== Poslech výsledků =====
// Jeden poslech trms/{eid} pro otevřený trénink (karta i okno stopek); předchozí trénink se odhlásí
function ensureMs(eid) {
  if (M.eid === eid) return;
  if (M.un) try { M.un(); } catch (e) { /* poslech už skončil */ }
  M = {eid, un: null, res: undefined, err: null};
  M.un = S.db.collection(TRMS_COLL).part(eid).onSnapshot(v => {
    const d = v.docs.find(x => x.id === eid);
    M.res = d ? d.data() : null; M.err = null;
    if (W && W.el && W.eid === eid) { W.loc = {}; paint(); }
    else if (S.evid === eid && !S.tpe) render();
  }, e => { M.err = (e && (e.code || e.message)) || "chyba"; M.res = null; if (S.evid === eid) render(); });
}

// ===== Vykreslení: karta výsledků =====
function tableHtml(e, myPid) {
  const R = ranking(e);
  if (!R.length) return '<div class="mu" style="margin:2px 0 8px">Zatím bez výsledků.</div>';
  return `<table class="mst"><tr><th>#</th><th>Hráčka</th><th>Nejlepší</th><th>Pokusy</th></tr>${R.map(x => `<tr class="${x.pid === myPid ? "me" : ""}"><td>${x.rank}.</td><td>${esc(nm(x.pid))}</td><td><b>${esc(fmtVal(x.best, e.u))}</b></td><td class="mu">${x.n}× · ${x.vals.slice(-4).map(v => esc(fmtVal(v, e.u).replace(/ (s|ks|b)$/, ""))).join(" · ")}</td></tr>`).join("")}</table>`;
}
function cardHtml(eid, plan, D) {
  ensureMs(eid);
  if (M.res === undefined) return "";
  const L = measLanes(plan, D, M.res), can = canMs(), my = HK.pid();
  if (M.err && !L.length) return "";
  const show = L.filter(m => can || entryOf(m.key));
  if (!show.length) return "";
  return `<div style="border-top:1px solid var(--bd);margin-top:8px;padding-top:8px"><h3 style="margin:0 0 4px">⏲ Výsledky měření</h3>
${M.err ? `<div class="msg">Výsledky se nepodařilo načíst (${esc(M.err)}). Manager musí publikovat pravidla databáze ve verzi v21.4.</div>` : ""}
${show.map((m, i) => { const e = entryOf(m.key) || {u: m.u, low: m.low, ms: {}};
    return `<div class="row" style="align-items:center;flex-wrap:nowrap;margin-top:6px"><div style="flex:1"><b>${esc(m.dn)}</b><div class="mu" style="font-size:12px">${esc(UNITS[m.u] || "")} · ${m.low ? "nižší je lepší" : "vyšší je lepší"}</div></div>${can && m.bi != null ? `<button class="s" data-msgo="${i}" style="flex:none;min-height:44px">⏲ Měřit</button>` : ""}</div>${tableHtml(e, my)}`; }).join("")}</div>`;
}

// ===== Vykreslení: okno stopek =====
function rowHtml(pid, now) {
  const m = W.m, vals = triesOf(pid), best = bestOf(vals, m.low), run = W.run[pid] != null, last = vals[vals.length - 1];
  const undo = vals.length ? `<button class="s" data-swu="${esc(pid)}" style="flex:none;padding:4px 10px;min-height:40px;${armed("swu" + pid) ? "background:var(--wa);color:#fff" : ""}">${armed("swu" + pid) ? "Smazat poslední?" : "↩"}</button>` : "";
  const info = `<div class="swi"><span class="mu">${vals.length ? vals.length + "× · " + vals.slice(-5).map(v => esc(fmtVal(v, m.u).replace(/ (s|ks|b)$/, ""))).join(" · ") : "bez pokusu"}${best != null ? ` · ⭐ <b>${esc(fmtVal(best, m.u))}</b>` : ""}</span>${undo}</div>`;
  if (m.u === "s") {
    const t = run ? swText(swSec(W.run, pid, now)) : last != null ? fmtVal(last, "s").replace(" s", "") : "–";
    return `<div class="swr ${run ? "on" : ""}"><button class="swn" data-sw="${esc(pid)}"><b>${run ? "⏹ " : "▶ "}${esc(nm(pid))}</b><span class="swt" data-swt="${esc(pid)}">${esc(t)}</span></button>${info}</div>`;
  }
  const v = W.val[pid] != null ? W.val[pid] : "";
  return `<div class="swr"><div style="font-size:18px;font-weight:700">${esc(nm(pid))}</div><div class="swc"><button class="s" data-swm="${esc(pid)}|-1">−</button><input type="text" inputmode="decimal" data-swv="${esc(pid)}" value="${esc(v)}" placeholder="0"><button class="s" data-swm="${esc(pid)}|1">+</button><button class="p" data-swok="${esc(pid)}" style="flex:1">✓ Zapsat</button></div>${info}</div>`;
}
function screenHtml() {
  const m = W.m, now = Date.now(), nRun = Object.keys(W.run).length, rest = W.all.filter(p => !W.pids.includes(p));
  const kx = "swx" + W.eid;
  return CSS + `<div class="swh"><button class="s" id="tswx" style="flex:none;min-height:48px;${armed(kx) ? "background:var(--wa);color:#fff" : ""}">${armed(kx) ? "Běží stopky – zavřít?" : "✕ Hotovo"}</button><h2>⏲ ${esc(m.dn)}</h2></div>
<div class="mu" style="margin-bottom:8px">${esc(UNITS[m.u] || "")} · ${m.low ? "nižší je lepší" : "vyšší je lepší"} · ${m.u === "s" ? "klepnutí na jméno = start / stop, každé zastavení je pokus" : "zadej číslo a ✓ Zapsat"} · nejvýš ${MS_MAX} pokusů</div>
${M.err ? `<div class="msg">Výsledky se nepodařilo načíst (${esc(M.err)}) – uložení nejspíš neprojde.</div>` : ""}
${m.u === "s" && W.pids.length ? `<div class="row" style="margin-bottom:8px"><button class="p" id="tswa" style="min-height:52px">▶ Start všech (${W.pids.length - nRun})</button><button class="d" id="tswz" style="min-height:52px" ${nRun ? "" : "disabled"}>⏹ Stop všech (${nRun})</button></div>` : ""}
${W.pids.map(p => rowHtml(p, now)).join("") || '<div class="mu">Na lince teď nikdo není – přidej hráčku.</div>'}
${rest.length ? `<label>+ Přidat hráčku</label><select id="tswp"><option value="">— vyber —</option>${rest.map(p => `<option value="${esc(p)}">${esc(nm(p))}</option>`).join("")}</select>` : ""}`;
}
function paint() {
  if (!W || !W.el) return;
  W.el.innerHTML = screenHtml();
  bindScreen();
}
// Tik: jen běžící časy (bez překreslení)
function tick() {
  if (!W || !W.el) return;
  const now = Date.now();
  Object.keys(W.run).forEach(pid => { const e = W.el.querySelector(`[data-swt="${CSS_ESC(pid)}"]`); if (e) e.textContent = swText(swSec(W.run, pid, now)); });
}
const CSS_ESC = s => (window.CSS && window.CSS.escape ? window.CSS.escape(s) : String(s).replace(/["\\]/g, "\\$&"));

// ===== Eventy =====
// Zápis pokusů hráček (byPid = {pid: pokusy}) jednou dávkou s hlubokým sloučením; jiné linky a hráčky zůstanou
function put(byPid) {
  if (!canMs()) { toast("Měřit smí jen realizační tým"); return; }
  Object.assign(W.loc, byPid);
  S.db.batch().merge(TRMS_COLL + "/" + W.eid, {...msPatch(W.m, byPid), by: me(), at: new Date().toISOString()}).commit();
}
function stopOne(pid, now) {
  const r = swStop(W.run, pid, now);
  W.run = r.run;
  if (r.sec == null) return null;
  const v = addTry(triesOf(pid), r.sec, "s");
  return v;
}
function bindScreen() {
  const el = W.el, on = (sel, fn) => el.querySelectorAll(sel).forEach(b => { b.onclick = () => fn(b); });
  el.querySelector("#tswx").onclick = () => { if (Object.keys(W.run).length) confirm2("swx" + W.eid, close, paint); else close(); };
  on("[data-sw]", b => {
    const pid = b.dataset.sw, now = Date.now();
    if (W.run[pid] != null) { const v = stopOne(pid, now); if (v) { put({[pid]: v}); buzz(60); } }
    else { W.run = swStart(W.run, [pid], now); buzz(30); }
    paint();
  });
  const all = el.querySelector("#tswa");
  if (all) all.onclick = () => { W.run = swStart(W.run, W.pids, Date.now()); buzz([30, 40, 30]); paint(); };
  const stop = el.querySelector("#tswz");
  if (stop) stop.onclick = () => {
    const now = Date.now(), out = {};
    Object.keys(W.run).forEach(pid => { const v = stopOne(pid, now); if (v) out[pid] = v; });
    if (Object.keys(out).length) { put(out); buzz(80); }
    paint();
  };
  on("[data-swu]", b => { const pid = b.dataset.swu; confirm2("swu" + pid, () => { put({[pid]: dropTry(triesOf(pid))}); toast("Poslední pokus smazán"); }, paint); });
  // Počet / body: −/+ po jedné (body po 0,5), ✓ zapíše pokus
  el.querySelectorAll("[data-swv]").forEach(i => { i.oninput = () => { W.val[i.dataset.swv] = i.value; }; });
  on("[data-swm]", b => {
    const [pid, d] = b.dataset.swm.split("|"), step = W.m.u === "b" ? 0.5 : 1, cur = msVal(W.val[pid], W.m.u) || 0;
    W.val[pid] = String(Math.max(0, cur + step * +d)).replace(".", ",");
    paint();
  });
  on("[data-swok]", b => {
    const pid = b.dataset.swok, v = addTry(triesOf(pid), W.val[pid], W.m.u);
    if (!v) { toast("Zadej platné číslo"); return; }
    put({[pid]: v}); W.val[pid] = ""; buzz(60); paint();
  });
  const add = el.querySelector("#tswp");
  if (add) add.onchange = () => { if (add.value && !W.pids.includes(add.value)) W.pids = [...W.pids, add.value]; paint(); };
}
function close() {
  if (!W) return;
  if (W.timer) clearInterval(W.timer);
  if (W.el) W.el.remove();
  W = null;
  render();
}

// ===== Exporty =====
// Okno stopek: eid, m = měřená linka {key, d, dn, u, low}, pids = hráčky na lince, all = přihlášené hráčky (pro + Přidat)
export function openStopwatch(eid, m, pids, all) {
  if (!m) return;
  if (!canMs()) { toast("Měřit smí jen realizační tým"); return; }
  if (W) close();
  ensureMs(eid);
  const el = document.createElement("div");
  el.id = "tsw";
  document.body.appendChild(el);
  W = {eid, m, pids: [...new Set(pids || [])], all: [...new Set([...(pids || []), ...(all || [])])], run: {}, val: {}, loc: {}, el, timer: setInterval(tick, 100)};
  paint();
}
// Výsledky měření (pro ⏱ živý trénink – měřená linka): dokument trms/{eid} | null | undefined
export function msData(eid) { ensureMs(eid); return M.res; }
// Smí přihlášený měřit (stopky v ⏱ živém tréninku)
export const mayMeasure = () => canMs();
// Karta „⏲ Výsledky měření“ do karty plánu (prázdný text, když plán nic neměří a výsledky nejsou); D = banka cvičení {id: cvičení}
export function msCardHtml(eid, plan, D) { return HK.perm("trplan", "r") ? cardHtml(eid, plan, D) : ""; }
// getX = údaje tréninku (plan, D, X z trplan-view) – ⏲ Měřit otevře stopky pro hráčky linky
export function bindMsCard(a, eid, getX) {
  a.querySelectorAll("[data-msgo]").forEach(b => b.onclick = () => {
    const X = getX(), L = measLanes(X.plan, X.D, M.res), m = L[+b.dataset.msgo];
    const blk = m && X.plan.blocks[m.bi], lane = blk && blk.lanes[m.li];
    if (!lane) return;
    const pids = lanePids(blk, lane, X);
    openStopwatch(eid, m, pids, allPids(X));
  });
}
