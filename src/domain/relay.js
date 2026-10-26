// Doména: 🏃 štafeta ve stopkách – 2–4 skupiny startují naráz, v každé skupině běží hráčky za sebou, klepnutí = předávka
// (úsek jedné končí, další startuje). Výsledek: čas úseku = pokus hráčky (trms…ms), čas skupiny v seznamu běhů štafety (trms…rl).
// Běžící štafeta je jen v zařízení (stav st); zapíše se až po doběhnutí všech skupin. Čisté funkce bez DOM.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Skupiny -> Běh -> Výsledek a dokument.

// ===== Importy =====
import {MS_MAX, MS_VER, addTry, fmtVal, msMeta, msVal} from "./stopwatch.js";

// ===== Konstanty =====
export const RL_GROUPS = [2, 3, 4];                       // povolené počty skupin
export const RL_MAX = 20;                                 // nejvýš uložených běhů štafety na lince (starší se zahodí)
export const RL_NAMES = ["A", "B", "C", "D"];             // označení skupin

// ===== Pomocné funkce =====
const num = v => (typeof v === "number" && isFinite(v) ? v : null);
const sec = ms => msVal(Math.max(0.01, ms / 1000), "s");

// ===== Skupiny =====
// Rozdělení hráček střídavě do n skupin (pořadí podle seznamu): [[pid…], …]
export function relaySplit(pids, n) {
  const k = RL_GROUPS.includes(+n) ? +n : 2, out = Array.from({length: k}, () => []);
  (pids || []).forEach((p, i) => out[i % k].push(p));
  return out;
}
// Nasazení klepnutím: hráčka se přidá na konec skupiny gi (z jiné skupiny se přesune); klepnutí na hráčku ve skupině ji vyřadí
export function relayToggle(groups, gi, pid) {
  const G = (groups || []).map(g => [...g]), inG = G[gi] && G[gi].includes(pid);
  G.forEach((g, i) => { G[i] = g.filter(x => x !== pid); });
  if (!inG && G[gi]) G[gi].push(pid);
  return G;
}
// Změna počtu skupin: hráčky z rušených skupin se přidají střídavě do zbylých, nové skupiny jsou prázdné
export function relayResize(groups, n) {
  const k = RL_GROUPS.includes(+n) ? +n : 2, G = Array.from({length: k}, (_, i) => [...((groups || [])[i] || [])]);
  (groups || []).slice(k).flat().forEach((p, i) => G[i % k].push(p));
  return G;
}

// ===== Běh =====
// Start všech neprázdných skupin naráz: st = {t0, g: [{p (pořadí), i (běží hráčka), a (začátek úseku ms), legs [s], end (s celkem | null)}]}
export function relayStart(groups, now) {
  return {t0: now, g: (groups || []).filter(g => (g || []).length).map(p => ({p: [...p], i: 0, a: now, legs: [], end: null}))};
}
// Předávka ve skupině gi: úsek běžící hráčky skončí, startuje další; po poslední hráčce skupina doběhla (end = celkový čas)
export function relayTap(st, gi, now) {
  if (!st || !st.g[gi] || st.g[gi].end != null) return st;
  const g = {...st.g[gi], legs: [...st.g[gi].legs, sec(now - st.g[gi].a)], i: st.g[gi].i + 1, a: now};
  if (g.i >= g.p.length) g.end = sec(now - st.t0);
  return {...st, g: st.g.map((x, i) => (i === gi ? g : x))};
}
// Oprava omylem klepnuté předávky: poslední úsek skupiny se vrátí (hráčka zase běží od začátku svého úseku)
export function relayUndo(st, gi) {
  const g0 = st && st.g[gi];
  if (!g0 || !g0.legs.length) return st;
  const legs = g0.legs.slice(0, -1), a = st.t0 + legs.reduce((s, x) => s + x * 1000, 0);
  return {...st, g: st.g.map((x, i) => (i === gi ? {...g0, legs, i: g0.i - 1, a, end: null} : x))};
}
// Doběhly všechny skupiny?
export const relayDone = st => !!st && st.g.length > 0 && st.g.every(g => g.end != null);
// Běžící údaje skupiny pro displej: {pid (běží), n (kolikátá), of, leg (s úseku), tot (s celkem)} nebo doběhnutá {end}
export function relayLive(st, gi, now) {
  const g = st && st.g[gi];
  if (!g) return null;
  if (g.end != null) return {end: g.end, of: g.p.length};
  return {pid: g.p[g.i], n: g.i + 1, of: g.p.length, leg: Math.max(0, (now - g.a) / 1000), tot: Math.max(0, (now - st.t0) / 1000)};
}

// ===== Výsledek a dokument =====
// Pořadí skupin podle celkového času: [{gi, p, t, legs, rank}]
export function relayRank(st) {
  const L = ((st && st.g) || []).map((g, gi) => ({gi, p: g.p, t: g.end, legs: g.legs})).filter(x => num(x.t) != null).sort((a, b) => a.t - b.t);
  L.forEach((x, i) => { x.rank = i && L[i - 1].t === x.t ? L[i - 1].rank : i + 1; });
  return L;
}
// Zápis po doběhnutí: úseky jako pokusy hráček (k dosavadním tries {pid: [s]}) a běh do seznamu rl ({at, g: [{p, t}]}, nejvýš RL_MAX);
// m = měřená linka, prevRl = dosavadní běhy; vrací část dokumentu pro dávku s hlubokým sloučením
export function relayPatch(m, st, tries, prevRl, at) {
  const ms = {};
  ((st && st.g) || []).forEach(g => g.legs.forEach((s, k) => {
    const pid = g.p[k], v = addTry(ms[pid] || (tries || {})[pid] || [], s, "s");
    if (v) ms[pid] = v.slice(-MS_MAX);
  }));
  const run = {at: String(at || ""), g: ((st && st.g) || []).filter(g => num(g.end) != null).map(g => ({p: [...g.p], t: g.end}))};
  return {v: MS_VER, r: {[m.key]: {...msMeta(m), ms, rl: [...(Array.isArray(prevRl) ? prevRl : []), run].slice(-RL_MAX)}}};
}
// Text běhu štafety pro kartu výsledků: „A 45,30 s · B 47,10 s“ (seřazeno podle času)
export function relayLine(run) {
  const G = ((run && run.g) || []).filter(g => num(g.t) != null).map((g, i) => ({...g, i})).sort((a, b) => a.t - b.t);
  return G.map(g => (RL_NAMES[g.i] || "?") + " " + fmtVal(g.t, "s")).join(" · ");
}
