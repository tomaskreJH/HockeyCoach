// ⏲ Stopky a výsledky měření tréninku: karta „⏲ Výsledky měření“ v kartě plánu (pořadí po měřených cvičeních, vidí celý tým kromě hostující)
// a okno stopek #tsw přes celou obrazovku (z karty nebo z ⏱ živého tréninku u měřeného cvičení na mé lince).
// Čas: klepnutí na jméno = start / stop (více hráček souběžně, ▶ Start všech), každé zastavení = pokus; počet / body: číslo a ✓ Zapsat.
// 🏃 Štafeta (jen čas): 2–4 skupiny (střídavě nebo nasazením klepnutím), ▶ start všech naráz, klepnutí na skupinu = předávka;
// úsek = pokus hráčky, čas skupiny do seznamu běhů rl – zápis po doběhnutí všech skupin (domain/relay.js).
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
import {RL_GROUPS, RL_NAMES, relayDone, relayLine, relayLive, relayPatch, relayRank, relayResize, relaySplit, relayStart, relayTap, relayToggle, relayUndo} from "../domain/relay.js";
import {isFixedLane} from "../domain/training-plan.js";
import {groupPids} from "../domain/training-live.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
// M = poslech výsledků otevřeného tréninku: eid, un (konec poslechu), res (dokument | null | undefined = načítá se), err
let M = {eid: null, un: null, res: undefined, err: null};
// W = otevřené okno stopek: eid, m (měřená linka {key, d, dn, u, low}), pids (hráčky v okně), all (přihlášené pro „+ Přidat“),
// run ({pid: začátek ms}), val ({pid: rozepsané číslo}), loc ({pid: pokusy} – poslední zápis, než dorazí z databáze), el, timer,
// mode ("one" jednotlivě | "rl" štafeta), rl = {G (skupiny – pořadí hráček), sel (skupina pro nasazení klepnutím), st (běžící štafeta | null)}
let W = null;
const CSS = `<style>
#tsw{position:fixed;inset:0;z-index:45;background:var(--bg);color:var(--tx);overflow:auto;padding:12px 12px calc(12px + env(safe-area-inset-bottom,0px))}
#tsw .swh{display:flex;gap:8px;align-items:center;margin-bottom:6px}
#tsw .swh h2{flex:1;min-width:0;margin:0;font-size:17px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tsw .swr{display:flex;align-items:stretch;gap:4px;border:2px solid var(--bd);border-radius:10px;margin-bottom:3px;background:var(--cd,transparent)}
#tsw .swr.on{border-color:var(--no)}
#tsw .swn{display:flex;flex:1;min-width:0;align-items:center;gap:6px;min-height:46px;padding:2px 8px;font-size:16px;text-align:left;background:none;border:0;color:var(--tx)}
#tsw .swnm{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.15}
#tsw .swnm b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tsw .swnm small{font-size:12px;color:var(--mu);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tsw .swt{font-size:24px;font-weight:800;font-variant-numeric:tabular-nums;min-width:84px;text-align:right}
#tsw .swr.on .swt{color:var(--no)}
#tsw .swu{flex:none;min-width:40px;padding:0 6px;border:0;border-left:1px solid var(--bd);background:none;color:var(--tx);border-radius:0 8px 8px 0}
#tsw .swc{display:flex;gap:4px;align-items:center;padding:4px 6px 4px 0}
#tsw .swc input{width:62px;margin:0;text-align:center;font-size:18px}
#tsw .swc button{min-height:44px;min-width:40px;padding:0 8px}
#tsw .swmo{display:flex;gap:6px;margin-bottom:6px}
#tsw .swmo button{flex:1;min-height:40px}
#tsw .rlbox{border:2px solid var(--bd);border-radius:10px;padding:6px;margin-bottom:6px}
#tsw .rlbox.on{border-color:var(--ac)}
#tsw .rlbox>button.rlh{background:none;border:0;color:var(--tx);font-weight:800;padding:4px 0;min-height:36px;text-align:left;width:100%}
#tsw .rlg{display:flex;align-items:center;gap:8px;width:100%;min-height:88px;border:2px solid var(--no);border-radius:12px;background:var(--cd,transparent);color:var(--tx);padding:6px 10px;margin-bottom:4px;text-align:left}
#tsw .rlg.dn{border-color:var(--ok);min-height:56px}
#tsw .rlk{font-size:28px;font-weight:900;min-width:30px;color:var(--ac)}
#tsw .rlnm{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.15}
#tsw .rlnm b{font-size:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tsw .rlnm small{font-size:13px;color:var(--mu);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tsw .rlt{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;text-align:right}
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
    const rl = Array.isArray(e.rl) ? e.rl : [];
    return `<div class="row" style="align-items:center;flex-wrap:nowrap;margin-top:6px"><div style="flex:1"><b>${esc(m.dn)}</b><div class="mu" style="font-size:12px">${esc(UNITS[m.u] || "")} · ${m.low ? "nižší je lepší" : "vyšší je lepší"}</div></div>${can && m.bi != null ? `<button class="s" data-msgo="${i}" style="flex:none;min-height:44px">⏲ Měřit</button>` : ""}</div>${tableHtml(e, my)}${rl.length ? relayRunsHtml(rl) : ""}`; }).join("")}</div>`;
}

// 🏃 Běhy štafety v kartě výsledků: poslední 3 běhy (skupiny podle času, hráčky ve skupině)
function relayRunsHtml(rl) {
  const last = rl.slice(-3).reverse();
  return `<div class="mu" style="font-size:13px;margin:-4px 0 8px">🏃 Štafeta ${rl.length}×${last.map(run => `<div>• ${esc(relayLine(run))}<br><small>${(run.g || []).map((g, i) => (RL_NAMES[i] || "?") + ": " + (g.p || []).map(p => esc(nm(p))).join(", ")).join(" | ")}</small></div>`).join("")}</div>`;
}

// ===== Vykreslení: okno stopek =====
// Jeden kompaktní řádek na hráčku (víc hráček na obrazovce bez posouvání): jméno + pokusy drobně, čas vpravo, ↩ smazat poslední
function rowHtml(pid, now) {
  const m = W.m, vals = triesOf(pid), best = bestOf(vals, m.low), run = W.run[pid] != null, last = vals[vals.length - 1];
  const ku = "swu" + pid, undo = vals.length ? `<button class="swu" data-swu="${esc(pid)}" style="${armed(ku) ? "background:var(--wa);color:#fff" : ""}" title="Smazat poslední pokus">${armed(ku) ? "Smazat?" : "↩"}</button>` : "";
  const info = vals.length ? vals.length + "× · " + vals.slice(-4).map(v => fmtVal(v, m.u).replace(/ (s|ks|b)$/, "")).join(" · ") + (best != null ? " · ⭐ " + fmtVal(best, m.u) : "") : "bez pokusu";
  const name = `<span class="swnm"><b>${esc(nm(pid))}</b><small>${esc(info)}</small></span>`;
  if (m.u === "s") {
    const t = run ? swText(swSec(W.run, pid, now)) : last != null ? fmtVal(last, "s").replace(" s", "") : "–";
    return `<div class="swr ${run ? "on" : ""}"><button class="swn" data-sw="${esc(pid)}">${run ? "⏹" : "▶"} ${name}<span class="swt" data-swt="${esc(pid)}">${esc(t)}</span></button>${undo}</div>`;
  }
  const v = W.val[pid] != null ? W.val[pid] : "";
  return `<div class="swr"><div class="swn" style="cursor:default">${name}</div><div class="swc"><button class="s" data-swm="${esc(pid)}|-1">−</button><input type="text" inputmode="decimal" data-swv="${esc(pid)}" value="${esc(v)}" placeholder="0"><button class="s" data-swm="${esc(pid)}|1">+</button><button class="p" data-swok="${esc(pid)}">✓</button></div>${undo}</div>`;
}
// 🏃 Štafeta: příprava skupin (nasazení klepnutím), běh (velké tlačítko skupiny = předávka) a výsledek
function relayHtml(now) {
  const R = W.rl, st = R.st;
  if (!st) {
    const free = W.pids.filter(p => !R.G.some(g => g.includes(p)));
    return `<div class="chips" style="margin-bottom:6px"><span class="mu" style="font-size:13px">Skupin</span>${RL_GROUPS.map(n => `<button class="chip ${R.G.length === n ? "on" : ""}" data-rln="${n}">${n}</button>`).join("")}<button class="chip" id="rlsp">🔀 Střídavě</button></div>
${R.G.map((g, gi) => `<div class="rlbox ${R.sel === gi ? "on" : ""}"><button class="rlh" data-rls="${gi}">${RL_NAMES[gi]} · ${g.length} ${R.sel === gi ? '<span class="mu" style="font-weight:400">← klepnutí na jméno přidá sem</span>' : ""}</button><div class="chips">${g.map((p, k) => `<button class="chip on" data-rlp="${gi}|${esc(p)}">${k + 1}. ${esc(nm(p))}</button>`).join("") || '<span class="mu">prázdná</span>'}</div></div>`).join("")}
${free.length ? `<div class="mu" style="font-size:13px">Nezařazené – klepnutím do skupiny ${RL_NAMES[R.sel]}</div><div class="chips" style="margin-bottom:6px">${free.map(p => `<button class="chip" data-rlp="${R.sel}|${esc(p)}">${esc(nm(p))}</button>`).join("")}</div>` : ""}
<button class="p w" id="rlgo" style="min-height:56px;font-size:18px" ${R.G.some(g => g.length) ? "" : "disabled"}>▶ Start štafety – všechny skupiny naráz</button>`;
  }
  if (relayDone(st)) {
    return `<h3 style="margin:6px 0">✅ Doběhly všechny skupiny – uloženo</h3>${relayRank(st).map(x => `<div class="swr" style="padding:6px 8px;display:block"><b>${x.rank}. ${RL_NAMES[x.gi] || "?"} · ${esc(fmtVal(x.t, "s"))}</b><div class="mu" style="font-size:13px">${x.p.map((p, k) => esc(nm(p)) + " " + esc(fmtVal(x.legs[k], "s").replace(" s", ""))).join(" · ")}</div></div>`).join("")}
<div class="row" style="margin-top:6px"><button class="p" id="rlre" style="min-height:48px">↺ Znovu (stejné skupiny)</button><button class="s" id="rled" style="min-height:48px">✎ Upravit skupiny</button></div>`;
  }
  const kc = "rlx" + W.eid;
  return st.g.map((g, gi) => {
    const v = relayLive(st, gi, now), nx = v.end == null && g.p[g.i + 1] ? "další " + nm(g.p[g.i + 1]) : v.end == null ? "poslední úsek" : "";
    return v.end != null ? `<div class="rlg dn"><span class="rlk">${RL_NAMES[gi]}</span><span class="rlnm"><b>✅ doběhla</b><small>${g.p.length} úseků</small></span><span class="rlt">${esc(fmtVal(v.end, "s").replace(" s", ""))}</span></div>`
      : `<div style="display:flex;gap:4px"><button class="rlg" data-rlt="${gi}"><span class="rlk">${RL_NAMES[gi]}</span><span class="rlnm"><b>${esc(nm(v.pid))}</b><small>${v.n}/${v.of} · ${esc(nx)} · celkem <span data-rlc="${gi}">${esc(swText(v.tot))}</span></small></span><span class="rlt" data-rlx="${gi}">${esc(swText(v.leg))}</span></button>${g.legs.length ? `<button class="s" data-rlu="${gi}" style="flex:none;min-width:44px" title="Vrátit poslední předávku">↩</button>` : ""}</div>`;
  }).join("") + `<div class="mu" style="font-size:13px;margin:4px 0">Klepnutí na skupinu = předávka (běžící hráčka končí, startuje další). Uloží se po doběhnutí všech.</div>
<button class="d w" id="rlst" style="min-height:44px;${armed(kc) ? "background:var(--no);color:#fff" : ""}">${armed(kc) ? "Zrušit štafetu bez uložení? Klepni znovu" : "✕ Zrušit štafetu"}</button>`;
}
function screenHtml() {
  const m = W.m, now = Date.now(), nRun = Object.keys(W.run).length, rest = W.all.filter(p => !W.pids.includes(p));
  const kx = "swx" + W.eid, rl = W.mode === "rl", busy = nRun || (W.rl.st && !relayDone(W.rl.st));
  const modes = m.u === "s" ? `<div class="swmo"><button class="${rl ? "s" : "p"}" data-swmo="one" ${busy ? "disabled" : ""}>⏱ Jednotlivě</button><button class="${rl ? "p" : "s"}" data-swmo="rl" ${busy ? "disabled" : ""}>🏃 Štafeta</button></div>` : "";
  const add = rest.length && !(rl && W.rl.st) ? `<label>+ Přidat hráčku</label><select id="tswp"><option value="">— vyber —</option>${rest.map(p => `<option value="${esc(p)}">${esc(nm(p))}</option>`).join("")}</select>` : "";
  const head = `<div class="swh"><button class="s" id="tswx" style="flex:none;min-height:48px;${armed(kx) ? "background:var(--wa);color:#fff" : ""}">${armed(kx) ? "Běží stopky – zavřít?" : "✕ Hotovo"}</button><h2>⏲ ${esc(m.dn)}</h2></div>${modes}`;
  if (rl) return CSS + head + (M.err ? `<div class="msg">Výsledky se nepodařilo načíst (${esc(M.err)}) – uložení nejspíš neprojde.</div>` : "") + relayHtml(now) + add;
  return CSS + head + `
<div class="mu" style="margin-bottom:6px;font-size:13px">${esc(UNITS[m.u] || "")} · ${m.low ? "nižší je lepší" : "vyšší je lepší"} · ${m.u === "s" ? "klepnutí na jméno = start / stop, každé zastavení je pokus" : "zadej číslo a ✓"} · nejvýš ${MS_MAX} pokusů</div>
${M.err ? `<div class="msg">Výsledky se nepodařilo načíst (${esc(M.err)}) – uložení nejspíš neprojde.</div>` : ""}
${m.u === "s" && W.pids.length ? `<div class="row" style="margin-bottom:6px"><button class="p" id="tswa" style="min-height:48px">▶ Start všech (${W.pids.length - nRun})</button><button class="d" id="tswz" style="min-height:48px" ${nRun ? "" : "disabled"}>⏹ Stop všech (${nRun})</button></div>` : ""}
${W.pids.map(p => rowHtml(p, now)).join("") || '<div class="mu">Na lince teď nikdo není – přidej hráčku.</div>'}
${add}`;
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
  // 🏃 Štafeta: čas úseku a celkový čas běžících skupin
  if (W.mode === "rl" && W.rl.st) W.rl.st.g.forEach((g, gi) => {
    const v = relayLive(W.rl.st, gi, now), x = W.el.querySelector(`[data-rlx="${gi}"]`), c = W.el.querySelector(`[data-rlc="${gi}"]`);
    if (v && v.end == null) { if (x) x.textContent = swText(v.leg); if (c) c.textContent = swText(v.tot); }
  });
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
// 🏃 Zápis štafety po doběhnutí: úseky k pokusům hráček, běh skupin do seznamu rl (dávka s hlubokým sloučením)
function putRelay(st) {
  if (!canMs()) { toast("Měřit smí jen realizační tým"); return; }
  const tries = Object.fromEntries(st.g.flatMap(g => g.p).map(p => [p, triesOf(p)])), prev = (entryOf(W.m.key) || {}).rl;
  const p = relayPatch(W.m, st, tries, prev, new Date().toISOString());
  Object.assign(W.loc, p.r[W.m.key].ms);
  S.db.batch().merge(TRMS_COLL + "/" + W.eid, {...p, by: me(), at: new Date().toISOString()}).commit();
}
function bindRelay(el, on) {
  const R = W.rl;
  on("[data-rln]", b => { R.G = relayResize(R.G, +b.dataset.rln); R.sel = Math.min(R.sel, R.G.length - 1); paint(); });
  const sp = el.querySelector("#rlsp");
  if (sp) sp.onclick = () => { R.G = relaySplit(W.pids, R.G.length); paint(); };
  on("[data-rls]", b => { R.sel = +b.dataset.rls; paint(); });
  on("[data-rlp]", b => { const [gi, pid] = b.dataset.rlp.split("|"); R.G = relayToggle(R.G, +gi, pid); paint(); });
  const go = el.querySelector("#rlgo");
  // Prázdné skupiny se před startem vynechají (označení A–D pak odpovídá běžícím skupinám)
  if (go) go.onclick = () => { R.G = R.G.filter(g => g.length); R.sel = 0; R.st = relayStart(R.G, Date.now()); buzz([30, 40, 30]); paint(); };
  on("[data-rlt]", b => {
    R.st = relayTap(R.st, +b.dataset.rlt, Date.now()); buzz(50);
    if (relayDone(R.st)) { putRelay(R.st); buzz([80, 60, 80]); }
    paint();
  });
  on("[data-rlu]", b => { R.st = relayUndo(R.st, +b.dataset.rlu); paint(); });
  const stp = el.querySelector("#rlst");
  if (stp) stp.onclick = () => confirm2("rlx" + W.eid, () => { R.st = null; paint(); }, paint);
  const re = el.querySelector("#rlre");
  if (re) re.onclick = () => { R.st = relayStart(R.G, Date.now()); buzz([30, 40, 30]); paint(); };
  const ed = el.querySelector("#rled");
  if (ed) ed.onclick = () => { R.st = null; paint(); };
}
function bindScreen() {
  const el = W.el, on = (sel, fn) => el.querySelectorAll(sel).forEach(b => { b.onclick = () => fn(b); });
  const busy = () => Object.keys(W.run).length || (W.rl.st && !relayDone(W.rl.st));
  el.querySelector("#tswx").onclick = () => { if (busy()) confirm2("swx" + W.eid, close, paint); else close(); };
  on("[data-swmo]", b => { W.mode = b.dataset.swmo; paint(); });
  if (W.mode === "rl") bindRelay(el, on);
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
  const P = [...new Set(pids || [])];
  W = {eid, m, pids: P, all: [...new Set([...(pids || []), ...(all || [])])], run: {}, val: {}, loc: {}, el, timer: setInterval(tick, 100),
    mode: "one", rl: {G: relaySplit(P, 2), sel: 0, st: null}};
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
