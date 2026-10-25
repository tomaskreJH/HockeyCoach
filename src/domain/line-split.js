// Doména: automatické rozdělení přihlášených hráček (bez brankářek) do pětek tréninku a ⭐ výkonnost hráček 1–5 (plevel/team).
// Způsoby: ⚖ vyrovnaně (každá pětka podobně silná), 📶 podle výkonnosti (nejsilnější spolu v 1. pětce), 🔀 střídavě (pořadí soupisky),
// 📋 základní formace (zbytek se doplní vyrovnaně); volba ⚔ hlídá v každé pětce poměr útočnic a obránkyň. Hráčka bez hodnocení = ⭐3.
// Přiřazení realizačního týmu (klíče "t:" v lines) zůstává. Výkonnost čte a zapisuje jen realizační tým. Čisté funkce bez DOM.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Výkonnost -> Rozdělení -> Souhrn pětek.

// ===== Importy =====
import {LINE_NOS, baseLines, isTrKey} from "./event-helpers.js";
import {DF, FW, posGrp} from "./training-plan.js";

// ===== Konstanty =====
export const PLEVEL_COLL = "plevel";                     // kolekce výkonnosti (jediný dokument týmu)
export const PLEVEL_DOC = "team";                        // plevel/team = {v, lv: {pid: 1–5}, by, at}
export const LVL_MIN = 1, LVL_MAX = 5, LVL_DEF = 3;
export const LVL_LABELS = {1: "začínající", 2: "slabší", 3: "střední", 4: "silná", 5: "nejsilnější"};
export const SPLIT_MODES = {even: "⚖ Vyrovnaně", tier: "📶 Podle výkonnosti", alt: "🔀 Střídavě", base: "📋 Základní formace"};
export const SPLIT_DEF = {n: 3, mode: "even", pos: true};

// ===== Pomocné funkce =====
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
// Pořadí podle výkonnosti (od nejsilnější), při shodě pořadí soupisky
const byLevel = (list, lv) => list.map((p, i) => ({p, i, l: lvlOf(lv, p.id)})).sort((a, b) => b.l - a.l || a.i - b.i).map(x => x.p);
// Rozdělení seznamu na k po sobě jdoucích částí co nejstejnější velikosti (větší části první)
function chunks(list, k) {
  const out = [], base = Math.floor(list.length / k), extra = list.length % k;
  let at = 0;
  for (let i = 0; i < k; i++) { const n = base + (i < extra ? 1 : 0); out.push(list.slice(at, at + n)); at += n; }
  return out;
}
// Skupiny pro rozdělení: s ⚔ zvlášť útočnice a obránkyně, jinak všechny dohromady
const posSets = (players, pos) => (pos ? [players.filter(p => posGrp(p.pos) === FW), players.filter(p => posGrp(p.pos) === DF)] : [players]);

// ===== Výkonnost =====
// Výkonnost hráčky 1–5 (chybějící nebo neplatná = výchozí 3)
export function lvlOf(lv, id) {
  const n = Number((lv || {})[id]);
  return Number.isInteger(n) && n >= LVL_MIN && n <= LVL_MAX ? n : LVL_DEF;
}
// Má hráčka výkonnost zadanou?
export const hasLvl = (lv, id) => { const n = Number((lv || {})[id]); return Number.isInteger(n) && n >= LVL_MIN && n <= LVL_MAX; };
// Nová mapa výkonnosti po klepnutí: stejná hodnota znovu = zrušit hodnocení; jen platné hodnoty
export function lvlSet(lv, id, n) {
  const r = {};
  Object.entries(lv || {}).forEach(([k, v]) => { const x = Number(v); if (Number.isInteger(x) && x >= LVL_MIN && x <= LVL_MAX) r[k] = x; });
  const v = Number(n);
  if (r[id] === v || !(Number.isInteger(v) && v >= LVL_MIN && v <= LVL_MAX)) delete r[id]; else r[id] = v;
  return r;
}

// ===== Rozdělení =====
// Vyrovnané přiřazení do pětek nos s počátečním stavem load {pětka: {c, s, f, d}} (počet, součet výkonnosti, útočnice, obránkyně).
// Každá skupina postů zvlášť od nejsilnější: do pětky s nejméně hráčkami tohoto postu, pak s nejméně hráčkami celkem, pak nejslabší.
function greedy(players, nos, lv, pos, load, out) {
  posSets(players, pos).forEach(set => byLevel(set, lv).forEach(p => {
    const k = pos ? (posGrp(p.pos) === DF ? "d" : "f") : "c";
    const best = [...nos].sort((a, b) => load[a][k] - load[b][k] || load[a].c - load[b].c || load[a].s - load[b].s || a - b)[0];
    out[p.id] = best;
    addLoad(load[best], p, lv);
  }));
  return out;
}
function addLoad(x, p, lv) { x.c++; x.s += lvlOf(lv, p.id); if (posGrp(p.pos) === DF) x.d++; else x.f++; }
const emptyLoad = nos => Object.fromEntries(nos.map(n => [n, {c: 0, s: 0, f: 0, d: 0}]));
// Rozdělení přihlášených hráček players [{id, pos}] (pořadí soupisky, bez brankářek) do n pětek.
// opt = {n (2–4), mode (SPLIT_MODES), pos (⚔ poměr postů), lv (výkonnost), lu (základní formace), prev (dosavadní lines)}.
// Vrací nové lines: hráčky podle způsobu, členové realizačního týmu z prev beze změny.
export function splitLines(players, opt = {}) {
  const P = (players || []).filter(p => p && p.id), n = clamp(Number(opt.n) || SPLIT_DEF.n, 1, LINE_NOS.length), nos = LINE_NOS.slice(0, n);
  const mode = SPLIT_MODES[opt.mode] ? opt.mode : SPLIT_DEF.mode, pos = opt.pos !== false, lv = opt.lv || {};
  let out = {};
  if (mode === "alt") {
    // Střídavě v pořadí soupisky; s ⚔ nejdřív útočnice, pak obránkyně (počítání pokračuje)
    posSets(P, pos).flat().forEach((p, i) => { out[p.id] = nos[i % n]; });
  } else if (mode === "tier") {
    // Podle výkonnosti: seřadit a rozdělit na n částí, 1. pětka nejsilnější; s ⚔ útočnice i obránkyně zvlášť
    posSets(P, pos).forEach(set => chunks(byLevel(set, lv), n).forEach((part, i) => part.forEach(p => { out[p.id] = nos[i]; })));
  } else if (mode === "base") {
    // Základní formace (jen hráčky v ní), ostatní přihlášené se doplní vyrovnaně do pětek 1–n podle toho, kolik už v nich je
    out = Object.fromEntries(Object.entries(baseLines(opt.lu, P.map(p => p.id), {})).filter(([k]) => !isTrKey(k)));
    const load = emptyLoad(nos);
    P.forEach(p => { if (out[p.id] && load[out[p.id]]) addLoad(load[out[p.id]], p, lv); });
    greedy(P.filter(p => !out[p.id]), nos, lv, pos, load, out);
  } else {
    greedy(P, nos, lv, pos, emptyLoad(nos), out);
  }
  Object.entries(opt.prev || {}).forEach(([k, v]) => { if (isTrKey(k)) out[k] = v; });
  return out;
}

// ===== Souhrn pětek =====
// Souhrn rozdělení pro zobrazení: {pětka: {c (hráček), f (útočnic), d (obránkyň), avg (průměr výkonnosti, 1 desetinné místo) | null}}
export function lineSummary(lines, players, lv) {
  const L = lines || {}, out = Object.fromEntries(LINE_NOS.map(n => [n, {c: 0, f: 0, d: 0, s: 0}]));
  (players || []).forEach(p => { const n = +L[p.id]; if (out[n]) addLoad(out[n], p, lv); });
  Object.values(out).forEach(x => { x.avg = x.c ? Math.round(x.s / x.c * 10) / 10 : null; delete x.s; });
  return out;
}
