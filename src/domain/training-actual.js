// Doména: ✏️ skutečný průběh tréninku tract/{eid} – jak trénink opravdu proběhl (délky bloků, vypuštěné bloky) proti plánu trplan/{eid}.
// Vzniká automaticky při ⏹ Konec živého tréninku (tractFromLive: úpravy průběhu adj / skip z trlive a konec hodin), trenér ho opraví ručně.
// Statistiky (📈 Trénink, 📊 Pokrytí, Můj trénink) počítají s actualPlan(plan, tract); bez tract (starší tréninky) s plánem jako dřív.
// Dokument: {v, blocks: [{id, dur (1–90 min), skip?: true}], src: "live" | "edit", by, at}.
// ===== Importy =====
import {BLK_DUR_MAX, BLK_DUR_MIN} from "./training-plan.js";
import {liveBlocks} from "./training-live.js";
import {clamp} from "../core/utils.js";

// ===== Konstanty =====
export const TRACT_COLL = "tract";
export const TRACT_VER = 1;
export const TRACT_MAX = 30;                              // nejvýš tolik bloků (jako plán)
export const TRACT_SRC = {live: "⏹ z živého tréninku", edit: "✏️ upraveno ručně"};

// ===== Pomocné funkce =====
const num = v => (typeof v === "number" && isFinite(v) ? v : null);
const durOk = v => clamp(Math.round(num(+v) || BLK_DUR_MIN), BLK_DUR_MIN, BLK_DUR_MAX);
// Bloky plánu (bez plánu prázdné pole)
const blocksOf = plan => (plan && Array.isArray(plan.blocks) ? plan.blocks : []);

// ===== Dokument =====
// Čistý dokument k zápisu: jen bloky plánu (pořadí plánu), délka v mezích, skip jen když true; src live | edit
export function tractDoc(plan, rows, src) {
  const R = Object.fromEntries((rows || []).filter(x => x && x.id).map(x => [String(x.id), x]));
  const blocks = blocksOf(plan).slice(0, TRACT_MAX).map(b => {
    const r = R[b.id] || {}, o = {id: String(b.id).slice(0, 24), dur: durOk(r.dur != null ? r.dur : b.dur)};
    if (r.skip === true) o.skip = true;
    return o;
  });
  return {v: TRACT_VER, blocks, src: src === "edit" ? "edit" : "live"};
}
// Skutečný průběh z živého tréninku při ⏹ Konec: délky a vypuštění z úprav průběhu (adj / skip), endSec = poloha hodin při konci (s).
// Blok, který při konci ještě nezačal, se bere jako vypuštěný; rozběhnutý blok má délku do konce (zaokrouhleno na minuty, nejméně 1).
// Prodloužení +1 / +5 min se v hodinách nepozná jako delší blok – trenér ho případně opraví ✏️ ručně.
export function tractFromLive(plan, live, endSec) {
  const B = blocksOf(plan), E = liveBlocks(B, live), end = Math.max(0, num(endSec) || 0);
  let a = 0;
  const rows = B.map((b, i) => {
    const e = E[i], d = (+e.dur || 0) * 60, r = {id: b.id, dur: +b.dur || BLK_DUR_MIN};
    if (e.skip) r.skip = true;
    else if (a >= end) r.skip = true;
    else r.dur = a + d <= end ? +e.dur : Math.max(1, Math.round((end - a) / 60));
    a += d;
    return r;
  });
  return tractDoc(plan, rows, "live");
}

// ===== Plán podle skutečnosti =====
// Plán s délkami ze skutečného průběhu: vypuštěné bloky zmizí, ostatní mají skutečnou délku (točení delší než blok se zruší).
// Bez tract nebo bez bloků vrací plán beze změny; bloky přidané do plánu až po zápisu tract zůstanou podle plánu.
export function actualPlan(plan, tract) {
  if (!plan || !tract || !Array.isArray(tract.blocks) || !tract.blocks.length) return plan;
  const T = Object.fromEntries(tract.blocks.filter(x => x && x.id).map(x => [x.id, x]));
  const blocks = blocksOf(plan).filter(b => !(T[b.id] && T[b.id].skip === true)).map(b => {
    const t = T[b.id];
    if (!t) return b;
    const dur = durOk(t.dur);
    return dur === +b.dur ? b : {...b, dur, rot: b.rot && b.rot > dur ? null : b.rot};
  });
  return {...plan, blocks};
}
// Řádky pro úpravu: [{bi, id, plan (min plánu), dur (skutečnost), skip}] z tract, jinak podle plánu
export function tractRows(plan, tract) {
  const T = Object.fromEntries(((tract && tract.blocks) || []).filter(x => x && x.id).map(x => [x.id, x]));
  return blocksOf(plan).map((b, bi) => { const t = T[b.id]; return {bi, id: b.id, plan: +b.dur || 0, dur: t ? durOk(t.dur) : +b.dur || 0, skip: !!(t && t.skip === true)}; });
}
// Úprava řádku: op = "+" / "−" (o 1 min), "skip" (vypustit / vrátit), "reset" (podle plánu); vrací nové řádky
export function tractEdit(rows, id, op) {
  return (rows || []).map(r => {
    if (r.id !== id) return r;
    if (op === "skip") return {...r, skip: !r.skip};
    if (op === "reset") return {...r, dur: r.plan, skip: false};
    return {...r, skip: false, dur: durOk(r.dur + (op === "+" ? 1 : -1))};
  });
}
// Souhrn: skutečné minuty (bez vypuštěných), minuty plánu, počet vypuštěných a změněných bloků
export function tractSum(rows) {
  const R = rows || [];
  return {real: R.reduce((s, r) => s + (r.skip ? 0 : r.dur), 0), plan: R.reduce((s, r) => s + r.plan, 0),
    skip: R.filter(r => r.skip).length, chg: R.filter(r => !r.skip && r.dur !== r.plan).length};
}
