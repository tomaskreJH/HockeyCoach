// ⚡ Improvizace na ledě (v22.18) – součást obrazovky ⏱ Živý trénink (trlive-view.js), jen kdo smí upravovat plán (trplan e).
// ➕ Cvičení: hledání v 📚 bance (text i část tréninku) nebo nové cvičení názvem mimo banku (volitelně 💾 i do banky), délka, 🥅 brankářky zvlášť,
// kdy: ▶ Hned (současné cvičení skončí, hodiny skočí na nové) / ⏭ po tomto bloku / ⤓ na konec. ☕ Pauza stejně.
// Bez plánu: první ➕ vytvoří plán a spustí hodiny. 👥 Na ledě: počty po dresech, 🚫 nedorazila (zmizí z linek) a ↩ vrácení.
// Zápis jednou dávkou: (nové cvičení drills) + plán trplan/{eid} + (hodiny trlive/{eid} u ▶ Hned / prvního spuštění).
// ===== Importy =====
import {CATS} from "../config/skills.js";
import {nm} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {startMs} from "../domain/attendance.js";
import {DRILL_COLL, drillDoc, drillError} from "../domain/drills.js";
import {iceCounts, QUICK_DUR, quickBlock, quickDrill, quickHits, quickIdx, quickPlan, quickSec, qDur, started, WHEN} from "../domain/training-impro.js";
import {LIVE_ST, liveAt, liveCtl, liveSec, TRLIVE_COLL} from "../domain/training-live.js";
import {BRK_DEF, BRK_DUR, GK, grpLabel, planDoc, TRPLAN_COLL} from "../domain/training-plan.js";
import {toggleNos} from "./event-core.js";
import {L, canE, liveB, me, paint, planB, skew} from "./trlive-view.js";

// ===== Konstanty a stav =====
// L.q = rozpracované vložení {brk, txt (hledání / název), drill (id z banky), dur, gk, when, bank (💾 do banky), cat, fc (filtr části tréninku)} | null;
// L.ice = 👥 otevřené
const BRK_DURS = [2, 3, 5];
const CSS = `<style>
#tlv .tlqb{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}
#tlv .tlqb button{min-height:52px;font-size:16px}
#tlq{position:fixed;inset:0;z-index:50;background:var(--bg);overflow:auto;padding:12px 12px calc(16px + env(safe-area-inset-bottom,0px))}
#tlq h2{margin:4px 0 10px;font-size:20px}
#tlq input,#tlq select{width:100%;min-height:48px;font-size:17px;margin-bottom:6px}
#tlq .tlqh{font-weight:700;margin:12px 0 6px}
#tlq .tlqc{display:flex;flex-wrap:wrap;gap:6px}
#tlq .tlqc button{min-height:46px;min-width:52px;padding:4px 12px;font-size:16px}
#tlq .tlqr button{display:block;width:100%;text-align:left;min-height:46px;margin-bottom:4px;font-size:16px}
#tlq .tlqf{display:flex;gap:6px;overflow-x:auto;padding:2px 0 6px;margin-bottom:4px}
#tlq .tlqf button{flex:none;min-height:40px;padding:4px 10px;font-size:14px;border-radius:99px}
#tlq .tlqok{min-height:60px;font-size:19px;font-weight:700;margin-top:14px}
#tlv .tlice{border:1px solid var(--bd);border-radius:12px;padding:8px 10px;margin:8px 0}
#tlv .tlice .tlir{display:flex;align-items:center;gap:8px;padding:4px 0;border-top:1px solid var(--bd)}
#tlv .tlice .tlir>span{flex:1}
#tlv .tlice button{min-height:44px;min-width:56px}
</style>`;

// ===== Pomocné funkce =====
const X0 = () => (L.getX ? L.getX() : null);
const drills = () => S.dr || [];
const drillById = id => drills().find(d => d.id === id) || null;
const canBank = () => HK.perm("drills", "e");
const stamp = () => ({by: me(), at: new Date().toISOString()});
// Štítek skupiny jako na obrazovce živého tréninku (třídy L1–L4, LG)
const chip = (g, n) => `<span class="evl L${g}">${esc(grpLabel(g))}${n != null ? " " + n : ""}</span>`;
// Kde je trénink teď (null bez plánu) a zda už běží
function where() {
  const X = X0(), B = liveB(X), v = L.live;
  return {X, B, v, run: started(v), at: B.length ? liveAt(B, liveSec(v, Date.now(), skew()) || 0) : null};
}
// Nové rozpracované vložení (☕ pauza nebo cvičení); bez plánu / nespuštěný trénink začíná ▶ Hned
function fresh(brk) {
  const {B} = where();
  return {brk: !!brk, txt: brk ? BRK_DEF : "", drill: "", dur: brk ? BRK_DUR : 10, gk: false, when: B.length && started(L.live) ? "now" : B.length ? "end" : "now", bank: false, cat: "skill", fc: ""};
}

// ===== Vykreslení =====
// Filtr části tréninku (🔥 rozcvička, 🎯 dovednosti …) – jedním klepnutím, druhým zrušit; bez textu ukáže celou část
const filterHtml = q => `<div class="tlqf">${Object.entries(CATS).map(([k, v]) => `<button class="${q.fc === k ? "p" : "s"}" data-tqc="${k}">${esc(v)}</button>`).join("")}</div>`;
// Výsledky hledání v bance + nové cvičení názvem (překresluje se samostatně, aby psaní neztratilo kurzor)
function resHtml() {
  const q = L.q;
  if (!q || q.brk) return "";
  const sel = q.drill ? drillById(q.drill) : null;
  if (sel) return `<div class="msg">✅ <b>${esc(sel.name)}</b> · ${+sel.dur || "?"} min <button class="s" data-tqx="clr" style="min-height:40px;margin-left:6px">✕ jiné</button></div>`;
  const hits = quickHits(drills(), q.txt, q.fc), t = String(q.txt || "").trim();
  return `${filterHtml(q)}<div class="tlqr">${hits.map(d => `<button class="s" data-tqd="${esc(d.id)}">📚 ${esc(d.name)} <span class="mu">· ${+d.dur || "?"} min</span></button>`).join("")}</div>
${t ? `<div class="mu" style="margin:6px 0">${hits.length ? "Nebo nové cvičení:" : "V bance nic – nové cvičení:"} <b>„${esc(t)}“</b> (vloží se tímto názvem, jen do dnešního plánu)</div>` : q.fc && !hits.length ? '<div class="mu">V této části tréninku banka nic nemá – napiš název nového cvičení.</div>' : q.fc ? "" : '<div class="mu">Piš název nebo vyber část tréninku – najde se v bance, nebo vznikne nové cvičení.</div>'}
${t && canBank() ? `<div class="tlqc"><button class="${q.bank ? "p" : "s"}" data-tqx="bank">${q.bank ? "💾 Uložit i do banky ✓" : "💾 Uložit i do banky"}</button></div>
${q.bank ? `<select id="tlqcat">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${k === q.cat ? "selected" : ""}>${esc(v)}</option>`).join("")}</select><div class="mu" style="font-size:13px">Popis a dovednosti doplníš v 📚 bance po tréninku.</div>` : ""}` : ""}`;
}
// Okno vložení cvičení / ☕ pauzy
function formHtml() {
  const q = L.q, {X, B, run} = where();
  if (!q || !X) return "";
  const durs = q.brk ? BRK_DURS : QUICK_DUR, hasGk = (X.groups || []).includes(GK);
  // Kdy: bez plánu jen začít; nespuštěný trénink – začít tímto / po prvním bloku / na konec
  const W = !B.length ? {now: "▶ Začít tímto"} : run ? WHEN : {now: "▶ Začít tímto", next: "⏭ Po 1. bloku", end: "⤓ Na konec"};
  const hint = !B.length ? "Vytvoří plán a spustí hodiny všem trenérům." : q.when === "now" ? (run ? "Současné cvičení skončí hned, hodiny přeskočí na nové." : "Trénink začne tímto blokem, hodiny se spustí.") : "Hodiny běží dál, blok se jen přidá do plánu.";
  return `<div id="tlq"><div class="row" style="align-items:center;flex-wrap:nowrap"><h2 style="flex:1">${q.brk ? "☕ Pauza" : "➕ Cvičení na led"}</h2><button class="s" data-tqx="close" style="flex:none;min-height:48px">✕</button></div>
${q.brk ? `<input id="tlqb" maxlength="40" value="${esc(q.txt)}" placeholder="${esc(BRK_DEF)}">` : `<input id="tlqs" maxlength="80" autocomplete="off" value="${esc(q.txt)}" placeholder="🔍 Hledej v bance nebo napiš nové"><div id="tlqr">${resHtml()}</div>`}
<div class="tlqh">Délka: ${qDur(q.dur)} min</div><div class="tlqc">${durs.map(m => `<button class="${qDur(q.dur) === m ? "p" : "s"}" data-tqm="${m}">${m}</button>`).join("")}<button class="s" data-tqm="-1">−</button><button class="s" data-tqm="+1">+</button></div>
${!q.brk && hasGk ? `<div class="tlqh">Kdo</div><div class="tlqc"><button class="${q.gk ? "s" : "p"}" data-tqx="gk0">👥 Všichni spolu</button><button class="${q.gk ? "p" : "s"}" data-tqx="gk1">🥅 Brankářky zvlášť</button></div>` : ""}
<div class="tlqh">Kdy</div><div class="tlqc">${Object.entries(W).map(([k, v]) => `<button class="${q.when === k ? "p" : "s"}" data-tqw="${k}">${v}</button>`).join("")}</div>
<div class="mu" style="font-size:13px;margin-top:4px">${hint}</div>
<button class="p w tlqok" data-tqx="ok">✅ Vložit${q.when === "now" ? " a začít" : ""}</button></div>`;
}
// 👥 Na ledě: počty po dresech, přítomné s 🚫 a chybějící s ↩ (🚫 jde až po začátku tréninku)
function iceHtml(X) {
  if (!L.ice || !X) return "";
  const R = X.roster || {}, C = iceCounts(R), ev = X.ev || {}, can = startMs(ev.date, ev.time) <= Date.now();
  const here = [...(R.skaters || []).map(p => p.id), ...(R.goalies || [])], gone = X.absent || [];
  const row = (id, out) => `<div class="tlir"><span>${out ? "<s>" + esc(nm(id)) + "</s>" : esc(nm(id))}</span>${can ? `<button class="${out ? "s" : "d"}" data-tqn="${esc(id)}">${out ? "↩ Je tu" : "🚫"}</button>` : ""}</div>`;
  return `<div class="tlice"><div style="margin-bottom:6px">${Object.entries(C).map(([g, n]) => (g === "-" ? `<span class="mu">bez dresu ${n}</span>` : chip(g, n))).join(" ") || '<span class="mu">Nikdo přihlášený.</span>'}</div>
<div class="mu" style="font-size:13px">${can ? "🚫 = nedorazila bez omluvy (zmizí z linek a hodnocení, v pokladně platí jako dosud). Omluvenou změň v docházce." : "🚫 nedorazila jde označit až po začátku tréninku."}</div>
${here.map(id => row(id, false)).join("")}${gone.length ? `<div class="tlqh">Chybí (${gone.length})</div>${gone.map(id => row(id, true)).join("")}` : ""}</div>`;
}

// ===== Hlavní logika =====
// Vložení bloku: plán (+ nové cvičení do banky) a u ▶ Hned / prvního spuštění i hodiny – jedna dávka (offline se odešle později)
function apply(guarded) {
  const q = L.q, {X, B, v, run, at} = where();
  if (!q || !X || !L.eid) return;
  const sel = q.drill ? drillById(q.drill) : null, name = String(q.txt || "").trim();
  if (!q.brk && !sel && !name) return toast("Vyber cvičení z banky nebo napiš název");
  // Nové cvičení do banky (jen s právem a zapnutým 💾)
  let did = sel ? sel.id : "", ddoc = null;
  if (!q.brk && !sel && q.bank && canBank()) {
    const d = drillDoc(quickDrill(name, q.cat, q.dur)), err = drillError(d);
    if (err) return toast(err);
    did = S.db.collection(DRILL_COLL).newId();
    ddoc = {...d, ...stamp(), arch: false};
  }
  const blk = quickBlock({brk: q.brk, drill: did, dn: q.brk ? name || BRK_DEF : sel ? sel.name : name, dur: q.dur, gk: q.gk}, X.groups);
  const i = quickIdx(B.length, at, q.when, run), plan = quickPlan(X.plan || null, blk, i);
  if (!plan) return toast("Plán je plný (nejvýš 30 bloků) – vypusť blok v ✏️ úpravě plánu");
  const D = Object.fromEntries(drills().map(d => [d.id, d])), pdoc = {...planDoc(plan, D), ...stamp()};
  // Hodiny: bez plánu nebo nespuštěný trénink s ▶ Hned = spustit od bloku i; běžící s ▶ Hned = skok na blok i (vždy běží)
  const now = Date.now(), o = {now, skew: skew(), me: me()};
  let ld = null;
  if (q.when === "now" && !run) ld = liveCtl("start", null, {...o, sec: quickSec(pdoc.blocks, null, i)});
  else if (q.when === "now") { const d = liveCtl("jump", v, {...o, sec: quickSec(pdoc.blocks, v, i)}); ld = d ? {...d, st: "run"} : null; }
  const write = () => {
    const b = S.db.batch();
    if (ddoc) b.set(DRILL_COLL + "/" + did, ddoc);
    b.set(TRPLAN_COLL + "/" + L.eid, pdoc);
    if (ld) b.merge(TRLIVE_COLL + "/" + L.eid, {...ld, by: me(), at: new Date().toISOString()});
    b.commit();
    S.tp = S.tp || {};
    S.tp[L.eid] = pdoc;
    L.q = null; L.prev = null;
    toast(ld ? "▶ Teď: " + (q.brk ? "☕ pauza" : blk.lanes[0].dn || "cvičení") + " – hodiny běží všem" : "Blok přidán do plánu" + (ddoc ? " · 💾 cvičení v bance" : ""));
    paint();
  };
  // Hodiny řídí jiný trenér → převzetí řízení druhým klepnutím (jako ostatní ovládání)
  if (ld && v && LIVE_ST[v.st] && v.st !== "end" && v.ctl && v.ctl !== me()) guarded(write); else write();
}

// ===== Eventy =====
// Výsledky hledání: výběr cvičení z banky (délka podle banky)
function bindRes(el) {
  el.querySelectorAll("[data-tqd]").forEach(b => b.onclick = () => { const d = drillById(b.dataset.tqd); if (!d) return; Object.assign(L.q, {drill: d.id, txt: d.name, dur: qDur(d.dur), bank: false}); paint(); });
  // Filtr části tréninku: nové cvičení do banky pak dostane stejnou kategorii
  el.querySelectorAll("[data-tqc]").forEach(b => b.onclick = () => { const k = b.dataset.tqc; L.q.fc = L.q.fc === k ? "" : k; if (L.q.fc) L.q.cat = L.q.fc; const r = el.id === "tlqr" ? el : el.querySelector("#tlqr"); if (r) { r.innerHTML = resHtml(); bindRes(r); bindQuickX(r, L.qg); } });
  const c = el.querySelector("#tlqcat");
  if (c) c.onchange = () => { L.q.cat = c.value; };
}
export function bindQuick(el, guarded) {
  L.qg = guarded;                                        // převzetí řízení pro tlačítka po překreslení výsledků (filtr části tréninku)
  el.querySelectorAll("[data-tq]").forEach(b => b.onclick = () => {
    const k = b.dataset.tq;
    if (k === "ice") L.ice = !L.ice; else L.q = fresh(k === "brk");
    paint();
  });
  el.querySelectorAll("[data-tqn]").forEach(b => b.onclick = () => { const X = X0(); if (X && X.ev) toggleNos(X.ev, b.dataset.tqn); });
  if (!L.q) return;
  const s = el.querySelector("#tlqs");
  if (s) s.oninput = () => { Object.assign(L.q, {txt: s.value, drill: ""}); const r = el.querySelector("#tlqr"); if (r) { r.innerHTML = resHtml(); bindRes(r); bindQuickX(r, guarded); } };
  const bk = el.querySelector("#tlqb");
  if (bk) bk.oninput = () => { L.q.txt = bk.value; };
  bindRes(el);
  bindQuickX(el, guarded);
  el.querySelectorAll("[data-tqm]").forEach(b => b.onclick = () => { const m = b.dataset.tqm; L.q.dur = qDur(m === "-1" || m === "+1" ? qDur(L.q.dur) + +m : +m); paint(); });
  el.querySelectorAll("[data-tqw]").forEach(b => b.onclick = () => { L.q.when = b.dataset.tqw; paint(); });
}
// Tlačítka okna (zavřít, 🥅, 💾, ✕ jiné, ✅ Vložit) – i po překreslení výsledků hledání
function bindQuickX(el, guarded) {
  el.querySelectorAll("[data-tqx]").forEach(b => b.onclick = () => {
    const k = b.dataset.tqx;
    if (k === "close") L.q = null;
    else if (k === "gk0" || k === "gk1") L.q.gk = k === "gk1";
    else if (k === "bank") L.q.bank = !L.q.bank;
    else if (k === "clr") Object.assign(L.q, {drill: "", txt: ""});
    else if (k === "ok") return apply(guarded);
    paint();
  });
}

// ===== Exporty =====
// Lišta ⚡ improvizace pod ovládáním (➕ Cvičení, ☕ Pauza, 👥 Na ledě), panel 👥 a okno vložení; jen kdo smí upravovat plán
export function quickHtml(X) {
  if (!canE() || !X) return "";
  const R = X.roster || {}, n = (R.skaters || []).length + (R.goalies || []).length;
  return CSS + `<div class="tlqb"><button class="s" data-tq="add">➕ Cvičení</button><button class="s" data-tq="brk">☕ Pauza</button><button class="${L.ice ? "p" : "s"}" data-tq="ice">👥 Na ledě ${n}</button></div>${iceHtml(X)}${formHtml()}`;
}
// Bez plánu: rovnou okno vložení prvního cvičení (zavřením zůstane jen lišta)
export function quickEmptyHtml(X) {
  if (!canE() || !X) return "";
  if (L.q === undefined) L.q = fresh(false);
  return `<div class="msg" style="margin:10px 0">⚡ <b>Trénink bez plánu.</b> Vkládej cvičení postupně – první spustí hodiny. Plán se ukládá průběžně (po tréninku ho uvidíš v detailu, hodnocení i 📊 přehledech).</div>` + quickHtml(X);
}
