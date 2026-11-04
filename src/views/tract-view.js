// ✏️ Skutečný průběh tréninku: řádek v kartě plánu proběhlého (nebo dnešního) tréninku – jen realizační tým (HK.can("sport")).
// Souhrn „skutečně 72 min z 80 · vypuštěno 1“, ✏️ Upravit = délky bloků −/+, ⏭ vypustit / ↩ vrátit, ↺ podle plánu, 💾 Uložit (trplan e).
// Data tract/{eid} se čtou jednorázově po otevření detailu (1 čtení), zápis při ⏹ Konec živého tréninku (trlive-view.js) a tady ručně.
// Výpočty domain/training-actual.js; statistiky počítají s actualPlan.
// ===== Importy =====
import {S} from "../core/state.js";
import {esc, MSG, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {TRACT_COLL, TRACT_SRC, tractDoc, tractEdit, tractRows, tractSum} from "../domain/training-actual.js";
import {isBreak, MODES} from "../domain/training-plan.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
// T = {eid: dokument | null (není) | undefined (načítá se)}; ed = rozpracovaná úprava {eid, rows} | null
const T = {};
let ed = null;
const CSS = `<style>
.tra{border-top:1px solid var(--bd);margin-top:8px;padding-top:8px}
.tra .trr{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 0;border-top:1px solid var(--bd)}
.tra .trr>div{flex:1 1 140px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tra .trr.sk>div{text-decoration:line-through;opacity:.55}
.tra .trr button{flex:none;min-height:44px;min-width:44px;padding:4px 8px}
</style>`;

// ===== Pomocné funkce =====
const canE = () => HK.perm("trplan", "e");
const stamp = () => { const u = HK.user(); return {by: ((u && u.email) || "").toLowerCase(), at: new Date().toISOString()}; };
// Krátký název bloku: ☕ pauza, cvičení první linky, jinak režim
function blockName(b, D) {
  if (isBreak(b)) return "☕ " + (b.brk || "Pauza");
  const l = (b.lanes || []).find(x => x.drill || x.dn), d = l && D[l.drill];
  return l ? (d ? d.name : l.dn) + ((b.lanes || []).length > 1 ? " +" + (b.lanes.length - 1) : "") : MODES[b.mode];
}
// Jednorázové načtení tract/{eid} (chyba = jako bez dokumentu; pravidla ještě nepublikovaná)
function ensure(eid) {
  if (eid in T) return;
  T[eid] = undefined;
  S.db.doc(TRACT_COLL + "/" + eid).get().then(d => { T[eid] = d; }).catch(() => { T[eid] = null; }).then(() => { if (S.evid === eid) render(); });
}

// ===== Vykreslení =====
function editHtml(eid, plan, D) {
  const R = ed.rows, s = tractSum(R);
  return `<div class="mu" style="font-size:13px;margin:4px 0">Délky a vypuštěné bloky, jak trénink opravdu proběhl. Plán zůstane beze změny; statistiky (📈 Trénink, 📊 pokrytí, Můj trénink) počítají se skutečností.</div>
${R.map(r => { const b = plan.blocks[r.bi];
    return `<div class="trr ${r.skip ? "sk" : ""}"><div><b>${r.bi + 1}.</b> ${esc(blockName(b, D))} · <b>${r.skip ? "vypuštěno" : r.dur + " min"}</b>${r.dur !== r.plan || r.skip ? ` <span class="mu">(plán ${r.plan})</span>` : ""}</div>
${r.skip ? `<button class="s" data-trx="${esc(r.id)}|skip">↩ Vrátit</button>` : `<button class="s" data-trx="${esc(r.id)}|−">−</button><button class="s" data-trx="${esc(r.id)}|+">+</button><button class="d" data-trx="${esc(r.id)}|skip" title="Vypustit">⏭</button>`}${r.dur !== r.plan || r.skip ? `<button class="s" data-trx="${esc(r.id)}|reset" title="Podle plánu">↺</button>` : ""}</div>`; }).join("")}
<div class="mu" style="margin:6px 0">Skutečně <b>${s.real} min</b> z plánovaných ${s.plan}${s.skip ? " · vypuštěno " + s.skip : ""}</div>
<div class="row"><button class="p" id="trok" style="min-height:48px">💾 Uložit průběh</button><button class="s" id="trno" style="min-height:48px">Zrušit</button></div>`;
}
function cardHtml(eid, plan, D, date) {
  ensure(eid);
  const doc = T[eid];
  if (doc === undefined) return "";
  const R = tractRows(plan, doc), s = tractSum(R), editing = ed && ed.eid === eid;
  const head = doc ? `skutečně <b>${s.real} min</b> z ${s.plan}${s.skip ? " · vypuštěno " + s.skip : ""}${s.chg ? " · změněno " + s.chg : ""} · <span class="mu">${esc(TRACT_SRC[doc.src] || "")}</span>`
    : date < td() ? '<span class="mu">bez záznamu – počítá se podle plánu</span>' : '<span class="mu">zapíše se při ⏹ Konec živého tréninku</span>';
  return CSS + `<div class="tra"><div class="row" style="align-items:center;flex-wrap:nowrap"><div style="flex:1"><b>✏️ Skutečný průběh</b> · ${head}</div>${canE() && !editing ? '<button class="s" id="tred" style="flex:none;min-height:44px">✏️ Upravit</button>' : ""}</div>
${editing ? editHtml(eid, plan, D) : ""}</div>`;
}

// ===== Eventy =====
function bind(a, eid, getPlan) {
  const b = a.querySelector("#tred");
  if (b) b.onclick = () => { ed = {eid, rows: tractRows(getPlan(), T[eid])}; render(); };
  if (!ed || ed.eid !== eid) return;
  a.querySelectorAll("[data-trx]").forEach(x => x.onclick = () => { const [id, op] = x.dataset.trx.split("|"); ed.rows = tractEdit(ed.rows, id, op); render(); });
  const no = a.querySelector("#trno");
  if (no) no.onclick = () => { ed = null; render(); };
  const ok = a.querySelector("#trok");
  if (ok) ok.onclick = () => {
    const d = {...tractDoc(getPlan(), ed.rows, "edit"), ...stamp()};
    S.db.doc(TRACT_COLL + "/" + eid).set(d);              // chybu zápisu (i 📶 offline) hlásí storage.js
    toast(MSG.saved);
    T[eid] = d; ed = null;
    if (S.tst) S.tst.at = 0;                             // 📈 přehled Tréninku se příště načte znovu
    render();
  };
}

// ===== Exporty =====
// Řádek ✏️ Skutečný průběh do karty plánu: jen realizační tým, jen proběhlý nebo dnešní trénink s plánem
export function tractCardHtml(eid, plan, D, date) {
  if (!HK.can("sport") || !plan || !(plan.blocks || []).length || !date || date > td()) return "";
  return cardHtml(eid, plan, D, date);
}
export function bindTractCard(a, eid, getPlan) { if (HK.can("sport") && a.querySelector(".tra")) bind(a, eid, getPlan); }
// Po ⏹ Konec živého tréninku: zapsaný průběh platí hned (bez dalšího čtení)
export function tractKnown(eid, d) { T[eid] = d; }
