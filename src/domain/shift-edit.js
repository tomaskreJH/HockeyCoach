// Doména: editace střídání – čisté funkce nad KOPIÍ zápasu (bez DOM).
// Struktura: Importy -> Konstanty -> Pomocné funkce (čtení) -> Validace a zápis -> Hlavní operace -> Kontrola historie.
// Model dat: uzavřená střídání jsou v live.sh ({p, c, a, b, per}), probíhající střídání je hráčka v live.ice[c] se začátkem v live.since[p].

// ===== Importy =====
import {COLS} from "../config/constants.js";
import {isG, nomOf, ownCol, pl} from "../core/selectors.js";
import {mmss} from "../core/utils.js";
import {el_} from "./live-engine.js";
import {nameOf, perLabel, periodAt} from "./timeline.js";

// ===== Konstanty =====
export const MIN_SHIFT = 1000; // nejkratší povolené střídání (ms)

// ===== Pomocné funkce (čtení) =====
// Jednotný seznam střídání: ref "h<index>" = uzavřené (live.sh), ref "o<místo>" = právě probíhající (na ledě)
export function listShifts(m) {
  const L = m.live;
  if (!L) return [];
  const out = (L.sh || []).map((x, i) => ({ref: "h" + i, p: x.p, c: x.c, a: x.a, b: x.b, open: false}));
  const now = el_(L);
  COLS.forEach(c => { const p = L.ice[c]; if (p) out.push({ref: "o" + c, p, c, a: L.since[p] || 0, b: now, open: true}); });
  return out.sort((x, y) => x.a - y.a || x.b - y.b);
}
export const findShift = (m, ref) => listShifts(m).find(x => x.ref === ref) || null;

const real = x => x.b - x.a > 0;                       // střídání s nenulovou délkou
const overlap = (x, y) => x.a < y.b && y.a < x.b;      // překryv intervalů (dotyk není překryv)
const idxOf = ref => +ref.slice(1);                    // index uzavřeného střídání v live.sh
const unavailable = (L, id) => (L.pen || []).some(x => x.t === "us" && x.p === id) || (L.tmp || []).includes(id);
const okPlayer = (n, id) => !!(pl(id) && !isG(pl(id)) && nomOf(n).includes(id));
const at = (m, t) => { const p = periodAt(m, t); return perLabel(p.per) + " " + mmss(p.el); };

// Po úspěšné úpravě: seřadí historii podle konce a smaže zásobník „Zpět“ (jeho snímky by úpravu vrátily)
const finish = n => { n.live.sh.sort((x, y) => x.b - y.b); n.live.u = []; };

// ===== Validace a zápis =====
// Kontrola, že žádná dotčená hráčka není na ledě dvakrát současně (vrací text chyby, nebo null)
function conflictOf(list, refs) {
  for (const r of refs) {
    const s = list.find(x => x.ref === r);
    if (!s || !real(s)) continue;
    if (list.some(x => x.ref !== r && x.p === s.p && real(x) && overlap(x, s))) return nameOf(s.p) + " by byla na ledě dvakrát současně";
  }
  return null;
}
// Zapíše jednu změnu do kopie zápasu (a, b, p); u probíhajícího střídání jen začátek
function write(n, c) {
  const s = findShift(n, c.ref), L = n.live;
  if (!s) return;
  if (s.open) { if (c.a != null) L.since[s.p] = c.a; return; }
  const x = L.sh[idxOf(c.ref)];
  if (c.a != null) x.a = c.a;
  if (c.b != null) x.b = c.b;
  if (c.p) x.p = c.p;
  x.per = periodAt(n, x.b).per;
}
// Ověří celou dávku změn nad celou historií a teprve potom ji zapíše
function plan(n, changes) {
  const now = el_(n.live);
  const cur = listShifts(n).map(x => { const c = changes.find(y => y.ref === x.ref); return c ? {...x, ...c} : x; });
  for (const c of changes) {
    const s = cur.find(x => x.ref === c.ref);
    if (!s) return "Střídání nenalezeno";
    if (s.a < 0) return "Začátek je před začátkem zápasu";
    if (s.open) { if (s.a > now) return "Začátek je po aktuálním čase hodin"; }
    else {
      if (s.b > now) return "Konec je po aktuálním čase hodin";
      if (s.b - s.a < MIN_SHIFT) return "Střídání musí trvat aspoň 1 s (začátek musí být před koncem)";
    }
  }
  const bad = conflictOf(cur, changes.map(c => c.ref));
  if (bad) return bad;
  changes.forEach(c => write(n, c));
  finish(n);
  return true;
}

// ===== Hlavní operace (vrací true, nebo text chyby) =====
// Úprava času začátku/konce; chain = posune i navazující střídání na stejném místě (předání beze změny celkového času)
export function editShift(n, ref, {a, b}, chain = true) {
  const s = findShift(n, ref);
  if (!s) return "Střídání nenalezeno";
  const na = a != null ? a : s.a, nb = s.open ? s.b : (b != null ? b : s.b);
  const ch = [s.open ? {ref, a: na} : {ref, a: na, b: nb}];
  if (chain) {
    const same = listShifts(n).filter(x => x.ref !== ref && x.c === s.c && real(x));
    if (na !== s.a) { const pv = same.find(x => !x.open && x.b === s.a); if (pv) ch.push({ref: pv.ref, b: na}); }
    if (!s.open && nb !== s.b) { const nx = same.find(x => x.a === s.b); if (nx) ch.push({ref: nx.ref, a: nb}); }
  }
  return plan(n, ch);
}
// Doplnění zapomenutého střídání do historie
export function addShift(n, {p, c, a, b}) {
  if (!n.live) return "Zápas nemá živý zápis";
  if (!okPlayer(n, p)) return "Vyber nominovanou bruslařku";
  if (!COLS.includes(c)) return "Vyber místo (LK, C, PK, LO, PO)";
  n.live.sh.push({p, c, a, b, per: periodAt(n, b).per});
  const r = plan(n, [{ref: "h" + (n.live.sh.length - 1)}]);
  if (r !== true) n.live.sh.pop();
  return r;
}
// Smazání uzavřeného střídání (probíhající se ukončuje v živém zápisu)
export function deleteShift(n, ref) {
  const s = findShift(n, ref);
  if (!s) return "Střídání nenalezeno";
  if (s.open) return "Probíhající střídání ukonči v živém zápisu (menu ⋯ → Sundat z ledu)";
  n.live.sh.splice(idxOf(ref), 1);
  finish(n);
  return true;
}
// Oprava hráčky v CELÉM střídání (omylem zvolená hráčka); na ledě se při výměně dvou hráček na ledě jen prohodí místa
export function replacePlayer(n, ref, np) {
  const s = findShift(n, ref);
  if (!s) return "Střídání nenalezeno";
  if (!okPlayer(n, np)) return "Vyber nominovanou bruslařku";
  if (s.p === np) return "Vyber jinou hráčku";
  return s.open ? replaceOnIce(n, s.c, np) : plan(n, [{ref, p: np}]);
}
function replaceOnIce(n, c, np) {
  const L = n.live, now = el_(L), old = L.ice[c];
  if (!old) return "Místo na ledě je prázdné";
  const oc = COLS.find(k => L.ice[k] === np);
  if (oc) { L.ice[c] = np; L.ice[oc] = old; finish(n); return true; } // obě už na ledě jsou: prohodí se místa, časy zůstanou
  if (unavailable(L, np)) return "Hráčka je vyloučená nebo v ošetřování";
  const from = L.since[old] || 0, probe = {a: from, b: now};
  if (real(probe) && listShifts(n).some(x => x.p === np && real(x) && overlap(x, probe))) return nameOf(np) + " by byla na ledě dvakrát současně";
  L.since[np] = from; delete L.since[old]; L.ice[c] = np;      // nová hráčka přebírá začátek střídání
  COLS.forEach(k => { L.q[k] = L.q[k].filter(x => x !== np); }); // a mizí z front
  L.q[ownCol(n, old) || c].unshift(old);                       // původní hráčka se vrací na začátek fronty
  finish(n);
  return true;
}
// Předání v zadaném čase t: původní hráčka končí v t, nová pokračuje do konce střídání
export function handoverAt(n, ref, t, np) {
  const s = findShift(n, ref), L = n.live;
  if (!s) return "Střídání nenalezeno";
  if (!okPlayer(n, np)) return "Vyber nominovanou bruslařku";
  if (s.p === np) return "Vyber jinou hráčku";
  if (t - s.a < MIN_SHIFT || s.b - t < MIN_SHIFT) return "Čas předání musí ležet uvnitř střídání (aspoň 1 s od okrajů)";
  if (listShifts(n).some(x => x.p === np && real(x) && x.a < s.b && t < x.b)) return nameOf(np) + " by byla na ledě dvakrát současně";
  if (s.open) {
    if (unavailable(L, np)) return "Hráčka je vyloučená nebo v ošetřování";
    if (COLS.some(k => L.ice[k] === np)) return "Hráčka už je na ledě – použij výměnu celého střídání";
    L.sh.push({p: s.p, c: s.c, a: s.a, b: t, per: periodAt(n, t).per});
    delete L.since[s.p]; L.ice[s.c] = np; L.since[np] = t;
    COLS.forEach(k => { L.q[k] = L.q[k].filter(x => x !== np); });
    L.q[ownCol(n, s.p) || s.c].unshift(s.p);
  } else {
    const x = L.sh[idxOf(ref)];
    x.b = t; x.per = periodAt(n, t).per;
    L.sh.push({p: np, c: s.c, a: t, b: s.b, per: periodAt(n, s.b).per});
  }
  finish(n);
  return true;
}
// Vyčištění historie: smaže střídání nulové délky a sloučí navazující střídání téže hráčky na stejném místě
export function cleanShifts(n) {
  const L = n.live;
  if (!L) return {removed: 0, merged: 0};
  const before = L.sh.length;
  L.sh = L.sh.filter(x => x.b - x.a > 0);
  const removed = before - L.sh.length, last = {}, del = new Set();
  let merged = 0;
  [...L.sh].sort((x, y) => x.a - y.a).forEach(x => {
    const pv = last[x.p];
    if (pv && pv.b === x.a && pv.c === x.c) { pv.b = x.b; pv.per = periodAt(n, pv.b).per; del.add(x); merged++; }
    else last[x.p] = x;
  });
  L.sh = L.sh.filter(x => !del.has(x));
  if (removed || merged) finish(n);
  return {removed, merged};
}

// ===== Kontrola historie =====
// Vrací seznam textů s nalezenými nesrovnalostmi (prázdná, překrývající se a budoucí střídání)
export function checkShifts(m) {
  const L = m.live;
  if (!L) return [];
  const now = el_(L), list = listShifts(m), out = [];
  const z = list.filter(x => !x.open && !real(x)).length;
  if (z) out.push("Prázdná střídání (nulová délka): " + z + " – odstraní je „Vyčistit“.");
  list.filter(x => !x.open && x.b > now).forEach(x => out.push(nameOf(x.p) + ": střídání končí po aktuálním čase (" + at(m, x.b) + ")"));
  const by = {};
  list.filter(real).forEach(x => (by[x.p] = by[x.p] || []).push(x));
  Object.values(by).forEach(a => {
    a.sort((x, y) => x.a - y.a);
    for (let i = 1; i < a.length; i++) if (a[i].a < a[i - 1].b) out.push(nameOf(a[i].p) + ": překrývající se střídání kolem " + at(m, a[i].a));
  });
  return out;
}