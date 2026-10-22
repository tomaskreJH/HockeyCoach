// Docházka – výpočet přehledu. Čisté funkce bez DOM a bez databáze (použitelné i pro budoucí modul Trénink).
// Struktura: Konstanty -> Pomocné funkce (datum, sezóna, typ události) -> Výpočet přehledu -> Export.
// Vstupy:
//  - tréninky (kolekce events): {id, date "RRRR-MM-DD", time?}
//  - zápasy (kolekce matches): {id, date, time?, home} – home pravdivé = domácí zápas, jinak venkovní (stejně jako v detailu události)
//  - odpovědi (kolekce attendance): {eid, pid, st: "yes" | "no" | "maybe"}
// Pravidla přehledu (rozhodnutí 7): počítají se jen UPLYNULÉ události ve zvoleném období (výchozí zimní sezóna 1. 8. – 1. 7. dalšího roku);
// účast = odpověď „Jdu“, procento = účasti / počet uplynulých událostí daného typu v období; „Nejsem jistý“ a bez odpovědi se do účasti nepočítají.

// ===== Konstanty =====
// Typy událostí v přehledu (klíč -> popis); "all" = součet všech typů
export const ATT_KINDS = [["all", "Vše"], ["train", "Tréninky"], ["home", "Domácí zápasy"], ["away", "Venkovní zápasy"]];
const TIME = /^(\d{1,2}):(\d{2})/;          // čas začátku "HH:MM" (pole time může obsahovat i volný text)
const DAY = /^\d{4}-\d{2}-\d{2}$/;           // datum "RRRR-MM-DD"

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
function startMs(date, time) {
  const m = TIME.exec(String(time || "").trim());
  const t = m ? new Date(date + "T" + p2(Math.min(23, +m[1])) + ":" + m[2] + ":00") : new Date(date + "T23:59:59");
  return t.getTime();
}

// ===== Výpočet přehledu =====
// Sjednocený seznam událostí pro docházku: {id, kind: "train" | "home" | "away", date, start (ms)}
export function attEvents(trainings, matches) {
  const t = (trainings || []).filter(e => isDayStr(e.date)).map(e => ({id: e.id, kind: "train", date: e.date, start: startMs(e.date, e.time)}));
  const m = (matches || []).filter(x => isDayStr(x.date)).map(x => ({id: x.id, kind: x.home ? "home" : "away", date: x.date, start: startMs(x.date, x.time)}));
  return [...t, ...m];
}
// Uplynulé události v období [from, to] (obě meze včetně; prázdná mez = bez omezení)
export function pastEvents(evs, from, to, now) {
  const n = now == null ? Date.now() : now;
  return (evs || []).filter(e => e.start <= n && (!from || e.date >= from) && (!to || e.date <= to));
}
// Prázdný řádek přehledu pro jeden typ
const blank = () => ({n: 0, yes: 0, no: 0, maybe: 0, none: 0, pct: null});
// Přehled docházky členů: výsledek {memberId: {all, train, home, away}}, každý typ {n, yes, no, maybe, none, pct}
//  - evs = uplynulé události (pastEvents), at = odpovědi, ids = členové (hráčky nebo realizační tým)
//  - pct = procento účasti zaokrouhlené na celé číslo, null když v období žádná událost daného typu nebyla
export function attSummary(evs, at, ids) {
  const A = {};
  (at || []).forEach(a => { (A[a.eid] = A[a.eid] || {})[a.pid] = a.st; });
  const out = {};
  (ids || []).forEach(id => {
    const r = {all: blank(), train: blank(), home: blank(), away: blank()};
    (evs || []).forEach(e => {
      const st = (A[e.id] || {})[id], key = st === "yes" || st === "no" || st === "maybe" ? st : "none";
      [r.all, r[e.kind]].forEach(x => { x.n++; x[key]++; });
    });
    Object.values(r).forEach(x => { x.pct = x.n ? Math.round(x.yes * 100 / x.n) : null; });
    out[id] = r;
  });
  return out;
}
// Má člen v událostech období aspoň jednu odpověď? (ukončené hráčky se v přehledu ukazují jen s odpovědí v období)
export function hasAnswer(evs, at, id) {
  const ids = new Set((evs || []).map(e => e.id));
  return (at || []).some(a => a.pid === id && ids.has(a.eid));
}
