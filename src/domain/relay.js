// Doména: 🏃 štafeta ve stopkách – 2–4 skupiny startují naráz, v každé skupině běží hráčky za sebou, klepnutí = předávka
// (úsek jedné končí, další startuje). Výsledek: čas úseku = pokus hráčky (trms…ms), čas skupiny v seznamu běhů štafety (trms…rl).
// Běžící štafeta je jen v zařízení (stav st); zapíše se až po doběhnutí všech skupin. Čisté funkce bez DOM.
// v22.19: běh ukládá i úseky skupiny (g.l, časy v pořadí předávek); uložený běh jde zpětně opravit – prohodit jména, časy zůstanou na místě.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Skupiny -> Běh -> Výsledek a dokument -> Oprava uloženého běhu.

// ===== Importy =====
import {MS_MAX, MS_VER, addTry, fmtVal, msMeta, msVal} from "./stopwatch.js";

// ===== Konstanty =====
export const RL_GROUPS = [2, 3, 4];                       // povolené počty skupin
export const RL_MAX = 20;                                 // nejvýš uložených běhů štafety na lince (starší se zahodí)
export const RL_NAMES = ["A", "B", "C", "D"];             // označení skupin

// ===== Pomocné funkce =====
const num = v => (typeof v === "number" && isFinite(v) ? v : null);
const sec = ms => msVal(Math.max(0.01, ms / 1000), "s");
const LEG_TOL = 0.006;                                    // zaokrouhlení jednoho úseku (s) při kontrole součtu úseků proti času skupiny

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
// Zápis po doběhnutí: úseky jako pokusy hráček (k dosavadním tries {pid: [s]}) a běh do seznamu rl ({at, g: [{p, t, l}]}, nejvýš RL_MAX);
// m = měřená linka, prevRl = dosavadní běhy; vrací část dokumentu pro dávku s hlubokým sloučením
export function relayPatch(m, st, tries, prevRl, at) {
  const ms = {};
  ((st && st.g) || []).forEach(g => g.legs.forEach((s, k) => {
    const pid = g.p[k], v = addTry(ms[pid] || (tries || {})[pid] || [], s, "s");
    if (v) ms[pid] = v.slice(-MS_MAX);
  }));
  const run = {at: String(at || ""), g: ((st && st.g) || []).filter(g => num(g.end) != null).map(g => ({p: [...g.p], t: g.end, l: [...g.legs]}))};
  return {v: MS_VER, r: {[m.key]: {...msMeta(m), ms, rl: [...(Array.isArray(prevRl) ? prevRl : []), run].slice(-RL_MAX)}}};
}
// Text běhu štafety pro kartu výsledků: „A 45,30 s · B 47,10 s“ (seřazeno podle času)
export function relayLine(run) {
  const G = ((run && run.g) || []).filter(g => num(g.t) != null).map((g, i) => ({...g, i})).sort((a, b) => a.t - b.t);
  return G.map(g => (RL_NAMES[g.i] || "?") + " " + fmtVal(g.t, "s")).join(" · ");
}

// ===== Oprava uloženého běhu (zpětně) =====
// Úseky všech uložených běhů: [{g: [{l: [s | null], ix: [index pokusu v ms[pid] | null], ok}]}] (stejné pořadí jako rl).
// Běh s uloženými úseky (g.l, od v22.19) = časy přímo z běhu. Starší běh bez g.l: úseky se dohledají z pokusů hráček odzadu
// (každý běh přidal hráčce jeden pokus na konec); dohledané úseky platí, jen když jejich součet sedí na čas skupiny, jinak null.
export function relayRunLegs(rl, ms) {
  const runs = Array.isArray(rl) ? rl : [], M = ms || {}, ptr = {}, out = new Array(runs.length);
  const top = pid => (ptr[pid] != null ? ptr[pid] : (M[pid] || []).length);   // hledá se pod tímto indexem (novější pokusy už patří novějším běhům)
  for (let r = runs.length - 1; r >= 0; r--) {
    out[r] = {g: (((runs[r] || {}).g) || []).map(g => {
      const P = g.p || [], L = Array.isArray(g.l) && g.l.length === P.length ? g.l : null, l = [], ix = [];
      P.forEach((pid, k) => {
        const vals = M[pid] || [];
        let j = top(pid) - 1;
        if (L) while (j >= 0 && vals[j] !== L[k]) j--;               // uložený úsek: najít jeho pokus (mohl být mezitím smazán)
        l.push(L ? num(L[k]) : j >= 0 ? num(vals[j]) : null);
        ix.push(j >= 0 ? j : null);
        if (j >= 0) ptr[pid] = j;
      });
      // Dohledané úseky starého běhu: kontrola součtu proti času skupiny (jinak by se přesouvaly cizí pokusy)
      if (!L) {
        const sum = l.reduce((s, x) => s + (x == null ? NaN : x), 0);
        if (!(num(g.t) != null && Math.abs(sum - g.t) <= LEG_TOL * P.length + 0.011)) return {l: P.map(() => null), ix: P.map(() => null), ok: false};
      }
      return {l, ix, ok: l.length > 0 && l.every(x => x != null)};
    })};
  }
  return out;
}
// Je nové rozložení G jen přeskládáním jmen běhu run (stejné počty v každé skupině, stejné hráčky, žádná dvakrát)?
export function relaySameSet(run, G) {
  const old = ((run && run.g) || []).map(g => g.p || []);
  if (!Array.isArray(G) || G.length !== old.length || G.some((g, i) => !Array.isArray(g) || g.length !== old[i].length)) return false;
  const a = old.flat().sort(), b = G.flat().slice().sort();
  return new Set(b).size === b.length && a.every((x, i) => x === b[i]);
}
// Oprava pořadí jmen v uloženém běhu ri: G = nová jména po skupinách ([[pid…], …]); časy úseků zůstávají na místě (pořadí předávek).
// Úsek, na kterém se změnilo jméno, se přesune do pokusů nové hráčky (u původní se smaže). Všechny běhy dostanou úseky g.l
// (u starších dohledané), aby další oprava i dohledání zůstaly přesné. Vrací {patch (dávka s hlubokým sloučením) | null, moved, lost}
// (lost = počet změněných míst, kde čas úseku nebyl známý – změní se jen jméno v běhu). m = linka {key, d, dn, u, low}.
export function relaySwapPatch(m, entry, ri, G) {
  const rl = Array.isArray(entry && entry.rl) ? entry.rl : [], run = rl[ri];
  if (!m || !run || !relaySameSet(run, G)) return {patch: null, moved: 0, lost: 0};
  const ms0 = (entry && entry.ms) || {}, R = relayRunLegs(rl, ms0), del = {}, add = {};
  let moved = 0, lost = 0;
  // Změněná místa běhu ri: smazat úsek u původní hráčky, přidat novou
  run.g.forEach((g, gi) => (g.p || []).forEach((old, k) => {
    const nw = G[gi][k], x = R[ri].g[gi];
    if (nw === old) return;
    if (x.l[k] == null) { lost++; return; }
    if (x.ix[k] != null) (del[old] = del[old] || []).push(x.ix[k]);
    (add[nw] = add[nw] || []).push(x.l[k]);
    moved++;
  }));
  // Nové pokusy dotčených hráček (mazání odzadu, ať indexy sedí; nejvýš MS_MAX posledních)
  const ms = {};
  new Set([...Object.keys(del), ...Object.keys(add)]).forEach(pid => {
    const v = [...(ms0[pid] || [])];
    (del[pid] || []).sort((a, b) => b - a).forEach(j => v.splice(j, 1));
    ms[pid] = [...v, ...(add[pid] || [])].filter(x => num(x) != null).slice(-MS_MAX);
  });
  // Běhy: známé úseky se uloží ke všem během; v běhu ri nová jména (časy na místě)
  const rl2 = rl.map((r0, r) => ({...r0, g: ((r0 && r0.g) || []).map((g, gi) => {
    const x = R[r].g[gi], o = {...g, p: r === ri ? [...G[gi]] : [...(g.p || [])]};
    if (x && x.ok) o.l = [...x.l]; else delete o.l;
    return o;
  })}));
  return {patch: {v: MS_VER, r: {[m.key]: {...msMeta(m), ms, rl: rl2}}}, moved, lost};
}
