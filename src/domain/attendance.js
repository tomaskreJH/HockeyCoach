// Docházka – výpočet přehledu (čisté funkce bez DOM): tréninky (events), zápasy (matches, home = domácí), odpovědi attendance
// {eid, pid, st: yes | no | maybe, nos} – nos = 🚫 nedorazila bez omluvy (jen u „Jdu“).
// Počítají se jen UPLYNULÉ nezrušené události v období (výchozí sezóna 1. 8. – 1. 7.); účast = „Jdu“ bez 🚫, procento z událostí typu.
// ===== Konstanty =====
// Typy událostí v přehledu (klíč -> popis); "all" = součet všech typů
export const ATT_KINDS = [["all", "Vše"], ["train", "Tréninky"], ["home", "Domácí zápasy"], ["away", "Venkovní zápasy"]];
const TIME = /^(\d{1,2}):(\d{2})/;          // čas začátku "HH:MM" (pole time může obsahovat i volný text)
const DAY = /^\d{4}-\d{2}-\d{2}$/;           // datum "RRRR-MM-DD"
export const NOS_KEY = "nos";                 // pole v attendance: 🚫 nedorazila bez omluvy (true), jinak pole chybí

// ===== Pomocné funkce =====
const p2 = n => String(n).padStart(2, "0");
// Datum ve tvaru RRRR-MM-DD podle místního času
const dayStr = d => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
export const isDayStr = s => DAY.test(String(s || ""));
// Zimní sezóna, do které patří den: od 1. 8. do 1. 7. následujícího roku
export function seasonOf(day) {
  const s = isDayStr(day) ? day : dayStr(new Date());
  const y = +s.slice(0, 4), m = +s.slice(5, 7), from = m >= 8 ? y : y - 1;
  return {from: from + "-08-01", to: (from + 1) + "-07-01"};
}
// Okamžik začátku události (ms): s časem HH:MM přesně, bez času konec dne (událost bez času se počítá až po svém dni)
export function startMs(date, time) {
  const m = TIME.exec(String(time || "").trim());
  const t = m ? new Date(date + "T" + p2(Math.min(23, +m[1])) + ":" + m[2] + ":00") : new Date(date + "T23:59:59");
  return t.getTime();
}

// ===== 🚫 Nedorazila bez omluvy =====
// Má odpověď značku 🚫? Platí jen u odpovědi „Jdu“ (po změně odpovědi trenérem značka nic neznamená)
export const isNos = a => !!(a && a.st === "yes" && a[NOS_KEY] === true);
// Lze značku 🚫 nastavit / zrušit? Jen u odpovědi „Jdu“ a jen po začátku události (start = startMs)
export const canNos = (a, start, now) => !!(a && a.st === "yes") && start <= (now == null ? Date.now() : now);
// Pole pro zápis přes merge: zapnout = true, vypnout = smazat pole ("__del" datové vrstvy)
export const nosPatch = on => ({[NOS_KEY]: on ? true : "__del"});
// Počet odpovědí se značkou 🚫 mezi členy ids (detail události)
export const nosCount = (A, ids) => (ids || []).filter(id => isNos((A || {})[id])).length;

// ===== Výpočet přehledu =====
// Sjednocený seznam událostí pro docházku: {id, kind: "train" | "home" | "away", date, start (ms)}; zrušené události se vynechají
const counted = e => isDayStr(e.date) && !(e.cancelled && typeof e.cancelled === "object");
export function attEvents(trainings, matches) {
  const t = (trainings || []).filter(counted).map(e => ({id: e.id, kind: "train", date: e.date, start: startMs(e.date, e.time)}));
  const m = (matches || []).filter(counted).map(x => ({id: x.id, kind: x.home ? "home" : "away", date: x.date, start: startMs(x.date, x.time)}));
  return [...t, ...m];
}
// Uplynulé události v období [from, to] (obě meze včetně; prázdná mez = bez omezení)
export function pastEvents(evs, from, to, now) {
  const n = now == null ? Date.now() : now;
  return (evs || []).filter(e => e.start <= n && (!from || e.date >= from) && (!to || e.date <= to));
}
// Prázdný řádek přehledu pro jeden typ
const blank = () => ({n: 0, yes: 0, no: 0, maybe: 0, none: 0, nos: 0, pct: null});
// Kategorie odpovědi v přehledu: „Jdu“ se značkou 🚫 = nos (nepočítá se do účasti), jinak st, chybějící = none
const keyOf = a => isNos(a) ? "nos" : a && (a.st === "yes" || a.st === "no" || a.st === "maybe") ? a.st : "none";
// Přehled docházky členů: výsledek {memberId: {all, train, home, away}}, každý typ {n, yes, no, maybe, none, nos, pct}
//  - evs = uplynulé události (pastEvents), at = odpovědi, ids = členové (hráčky nebo realizační tým)
//  - yes = účast bez 🚫, nos = 🚫 nedorazila bez omluvy; pct = procento účasti zaokrouhlené na celé číslo, null bez události
export function attSummary(evs, at, ids) {
  const A = {};
  (at || []).forEach(a => { (A[a.eid] = A[a.eid] || {})[a.pid] = a; });
  const out = {};
  (ids || []).forEach(id => {
    const r = {all: blank(), train: blank(), home: blank(), away: blank()};
    (evs || []).forEach(e => {
      const key = keyOf((A[e.id] || {})[id]);
      [r.all, r[e.kind]].forEach(x => { x.n++; x[key]++; });
    });
    Object.values(r).forEach(x => { x.pct = x.n ? Math.round(x.yes * 100 / x.n) : null; });
    out[id] = r;
  });
  return out;
}
// Docházka jednoho člena po měsících: {„RRRR-MM“: {n, yes, no, maybe, none, nos, pct}} (typ „all“ z attSummary)
//  - evs = uplynulé události (pastEvents), at = odpovědi, id = člen; měsíc podle data události
export function attByMonth(evs, at, id) {
  const by = {}, out = {};
  (evs || []).forEach(e => { const ym = String(e.date || "").slice(0, 7); (by[ym] = by[ym] || []).push(e); });
  Object.keys(by).forEach(ym => { out[ym] = attSummary(by[ym], at, [id])[id].all; });
  return out;
}
// Má člen v událostech období aspoň jednu odpověď? (ukončené hráčky se v přehledu ukazují jen s odpovědí v období)
export function hasAnswer(evs, at, id) {
  const ids = new Set((evs || []).map(e => e.id));
  return (at || []).some(a => a.pid === id && ids.has(a.eid));
}
