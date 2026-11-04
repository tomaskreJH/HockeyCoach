// Doména: ⚡ improvizace na ledě (v22.18) – rychlé vložení cvičení nebo ☕ pauzy do plánu během živého tréninku,
// trénink bez připraveného plánu, nové cvičení založené přímo na ledě (název → i do 📚 banky) a přehled, kdo je na ledě.
// Plán trplan/{eid} se mění jen přidáním bloku (klíče hodnocení a měření jsou podle id bloku a linky – platí dál);
// „▶ Hned“ = blok se vloží za současný a hodiny trlive na něj skočí (zbytek současného bloku odpadne jako u ▶ Teď).
// ===== Importy =====
import {BLK_DUR_MAX, BLK_DUR_MIN, BRK_DEF, BRK_DUR, BRK_MAX, GK, laneBlank, newPid, PLAN_MAX, planBlank, planTimes} from "./training-plan.js";
import {liveBlocks, LIVE_ST} from "./training-live.js";
import {fold} from "./drills.js";
import {clamp} from "../core/utils.js";

// ===== Konstanty =====
export const QUICK_DUR = [3, 5, 8, 10, 15, 20];          // nabídka délky (min) jedním klepnutím
export const QUICK_DEF = 10;                             // výchozí délka nového cvičení bez banky
export const QUICK_HITS = 8;                             // nejvýš tolik cvičení z banky ve výsledku hledání
export const QUICK_CAT_HITS = 15;                        // nejvýš tolik cvičení při procházení jen podle části tréninku (bez textu)
export const WHEN = {now: "▶ Hned", next: "⏭ Po tomto bloku", end: "⤓ Na konec"};
export const GK_DN = "🥅 Brankářky – vlastní cvičení";    // název linky brankářek, když jim cvičení vybere jejich trenér
// Nové cvičení založené na ledě: dovednost podle zvolené kategorie (doplní se později v 📚 bance)
export const CAT_SK = {warm: "skate", skill: "puck", ssg: "game", sys: "game", end: "fun", off: "fit"};
export const IMPRO_NOTE = "⚡ Založeno na tréninku – doplň popis a dovednosti.";

// ===== Pomocné funkce =====
const num = v => (typeof v === "number" && isFinite(v) ? v : null);
const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
// Běží (nebo běžel) živý trénink? Dokument trlive s platným stavem
export const started = live => !!(live && LIVE_ST[live.st]);
// Délka v mezích bloku
export const qDur = v => clamp(Math.round(num(+v) || QUICK_DEF), BLK_DUR_MIN, BLK_DUR_MAX);

// ===== Hledání v bance =====
// Aktivní cvičení banky podle textu (bez diakritiky, začátek názvu dřív) a části tréninku cat, nejvýš QUICK_HITS;
// prázdný text i bez části tréninku = nic, jen část tréninku = celá část (nejvýš QUICK_CAT_HITS, abecedně)
export function quickHits(list, q, cat) {
  const t = fold(q).trim(), c = cat || "";
  if (!t && !c) return [];
  return (list || []).filter(d => d && !d.arch && (!c || d.cat === c) && (!t || fold(d.name).includes(t)))
    .sort((a, b) => (fold(a.name).startsWith(t) ? 0 : 1) - (fold(b.name).startsWith(t) ? 0 : 1) || String(a.name || "").localeCompare(String(b.name || ""), "cs"))
    .slice(0, t ? QUICK_HITS : QUICK_CAT_HITS);
}
// Nové cvičení do banky z názvu a kategorie (doplní se později); vrací pole pro drillDoc
export function quickDrill(name, cat, dur) {
  const c = CAT_SK[cat] ? cat : "skill";
  return {name: str(name, 80), cat: c, sk: [CAT_SK[c]], lvl: 1, dur: clamp(qDur(dur), 1, 60), grp: ["all"], eq: "", desc: IMPRO_NOTE, url: "", pdf: "", img: [], meas: null};
}

// ===== Nový blok =====
// q = {brk (☕ pauza), drill (id z banky), dn (název), dur, gk (🥅 brankářky zvlášť)}; groups = skupiny tréninku (pětky + "G")
// Cvičení pro všechny = blok 👥 Společně s jednou linkou; s 🥅 zvlášť druhá linka brankářek (cvičení jim vybere jejich trenér)
export function quickBlock(q, groups) {
  const Q = q || {}, dur = qDur(Q.dur);
  if (Q.brk) return {id: newPid("b"), mode: "all", dur: clamp(Math.round(num(+Q.dur) || BRK_DUR), BLK_DUR_MIN, BLK_DUR_MAX), rot: null, lanes: [], brk: str(Q.dn, BRK_MAX) || BRK_DEF};
  const lane = {...laneBlank(), drill: str(Q.drill, 40), dn: str(Q.dn, PLAN_MAX.dn)};
  const b = {id: newPid("b"), mode: "all", dur, rot: null, lanes: [lane]};
  const G = groups || [];
  if (Q.gk && G.includes(GK)) {
    lane.grp = G.filter(g => g !== GK);
    b.lanes.push({...laneBlank(), dn: GK_DN, grp: [GK]});
  }
  return b;
}

// ===== Vložení do plánu =====
// Kam vložit: nespuštěný trénink – ▶ Hned na začátek, ⏭ za první blok, ⤓ na konec; běžící – za současný blok, po konci plánu na konec.
// n = počet bloků, at = liveAt (null bez plánu), run = trénink už běží (started)
export function quickIdx(n, at, when, run) {
  const N = Math.max(0, num(n) || 0);
  if (when === "end" || !N) return N;
  if (!run) return when === "now" ? 0 : Math.min(1, N);
  if (!at || at.done) return N;
  return Math.min(N, at.bi + 1);
}
// Plán s vloženým blokem na index i (null = plán je plný); plan = uložený plán | null
export function quickPlan(plan, blk, i) {
  const p = plan && Array.isArray(plan.blocks) ? plan : planBlank(), B = [...p.blocks];
  if (B.length >= PLAN_MAX.blocks) return null;
  B.splice(clamp(num(i) || 0, 0, B.length), 0, blk);
  return {...p, blocks: B};
}
// Začátek bloku i (s od začátku plánu) v tomto průběhu (vypuštěné / zkrácené bloky z trlive platí dál)
export const quickSec = (blocks, live, i) => { const T = planTimes(liveBlocks(blocks, live)); return T[i] ? T[i].a : 0; };

// ===== Kdo je na ledě =====
// Přítomné hráčky po skupinách: roster = {lines, skaters [{id}], goalies [id]} → {skupina: počet} (pětky 1–4, "G"; bez dresu "-")
export function iceCounts(roster) {
  const R = roster || {}, L = R.lines || {}, out = {};
  (R.skaters || []).forEach(p => { const g = +L[p.id] >= 1 && +L[p.id] <= 4 ? +L[p.id] : "-"; out[g] = (out[g] || 0) + 1; });
  if ((R.goalies || []).length) out[GK] = R.goalies.length;
  return out;
}
