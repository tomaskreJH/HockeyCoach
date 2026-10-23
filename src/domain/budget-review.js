// Doména: schválení rozpočtu sezóny, úpravy po schválení a export pro valnou hromadu (čisté funkce bez DOM).
// Schválený rozpočet = neměnná kopie approved = {data, sum, by, at} v dokumentu budget/{sezóna}: data = pole plánu v okamžiku
// schválení, sum = zmrazená čísla plánu (po měsících a za sezónu), aby se závazný dokument nezměnil ani se změnou kalendáře.
// Každé uložení po schválení přidá záznam úpravy rev = [{at, by, note, n, inc, out, saldo}] (jen přidávat – vynucují pravidla).
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Schválení -> Úpravy -> Porovnání -> Export (CSV).

// ===== Importy =====
import {budgetDoc, seasonLabel} from "./budget.js";
import {csvNum, r2, ymLabel} from "./cash.js";

// ===== Konstanty =====
export const REV_NOTE_MAX = 300;                                       // nejdelší důvod úpravy (znaky)
// Řádky porovnání schváleného a aktuálního plánu: klíč v souhrnu a popis
export const CMP_ROWS = [["n", "Událostí"], ["inc", "Příjmy"], ["out", "Výdaje"], ["saldo", "Saldo sezóny"], ["contrib", "z toho příspěvky"]];

// ===== Pomocné funkce =====
const num = v => (Number.isFinite(+v) ? +v : 0);
const str = v => (typeof v === "string" ? v : "");
const dayOf = iso => str(iso).slice(0, 10);
// Datum ISO (RRRR-MM-DD…) jako d. m. rrrr pro CSV a tisk
export const dmy = iso => { const d = dayOf(iso); return d.length === 10 ? +d.slice(8) + ". " + +d.slice(5, 7) + ". " + d.slice(0, 4) : ""; };

// ===== Schválení =====
// Zmrazená čísla plánu (výstup budgetPlan): po měsících {ym, n, inc, out, saldo} a za sezónu {n, inc, out, saldo, contrib}
export function planSum(pl) {
  const t = pl.tot;
  return {months: pl.months.map(m => ({ym: m.ym, n: m.n, inc: m.inc, out: m.out, saldo: m.saldo})),
    tot: {n: t.n, inc: t.inc, out: t.out, saldo: t.saldo, contrib: t.contrib}};
}
// Pole pro zápis schválení (merge do budget/{sezóna}): kopie plánu b (normalizovaný), čísla plánu pl, kdo a kdy
export const approveDoc = (b, pl, by, at) => ({approved: {data: budgetDoc(b), sum: planSum(pl), by: str(by), at: str(at)}});
// Schválení uloženého dokumentu (sv = budget/{sezóna}), nebo null; starší schválení bez sum dostane prázdný souhrn
export function approvedOf(sv) {
  const a = sv && sv.approved;
  if (!a || typeof a !== "object" || !a.data) return null;
  const s = a.sum || {};
  return {data: a.data, by: str(a.by), at: str(a.at),
    sum: {months: Array.isArray(s.months) ? s.months : [], tot: {n: num((s.tot || {}).n), inc: num((s.tot || {}).inc), out: num((s.tot || {}).out), saldo: num((s.tot || {}).saldo), contrib: num((s.tot || {}).contrib)}}};
}
// Lze schválit? Uložený rozpočet bez neuložených změn, bez chyby a zatím neschválený. Vrací "" nebo důvod.
export function approveBlock(sv, dirty, err) {
  if (!sv) return "Rozpočet nejdřív ulož.";
  if (approvedOf(sv)) return "Rozpočet je už schválený – další změny jsou úpravy.";
  if (dirty) return "Nejdřív ulož změny.";
  return err || "";
}

// ===== Úpravy =====
// Záznamy úprav po schválení (nejstarší první), neplatné vyřazené
export const revList = sv => (Array.isArray(sv && sv.rev) ? sv.rev : []).filter(r => r && typeof r === "object")
  .map(r => ({at: str(r.at), by: str(r.by), note: str(r.note), n: num(r.n), inc: num(r.inc), out: num(r.out), saldo: num(r.saldo)}));
// Důvod úpravy po schválení: povinný, oříznutý a zkrácený na REV_NOTE_MAX ("" = chybí)
export const revNote = note => str(note).trim().slice(0, REV_NOTE_MAX);
// Seznam úprav pro zápis: dosavadní + nový záznam (n, příjmy, výdaje, saldo upraveného plánu pl). Bez schválení nebo bez důvodu null.
export function addRev(sv, pl, by, at, note) {
  const t = revNote(note);
  if (!approvedOf(sv) || !t) return null;
  return [...revList(sv), {at: str(at), by: str(by), note: t, n: pl.tot.n, inc: pl.tot.inc, out: pl.tot.out, saldo: pl.tot.saldo}];
}

// ===== Porovnání =====
// Schválený (zmrazený souhrn a.sum) vs. aktuální plán pl: řádky souhrnu a saldo po měsících. Vrací {rows: [{k, label, a, c, d}], months: [{ym, a, c, d}]}.
export function compareApproved(a, pl) {
  const A = a.sum.tot, C = pl.tot;
  const rows = CMP_ROWS.map(([k, label]) => ({k, label, a: num(A[k]), c: num(C[k]), d: r2(num(C[k]) - num(A[k]))}));
  const am = new Map(a.sum.months.map(m => [m.ym, m]));
  const months = pl.months.map(m => { const x = am.get(m.ym); const av = x ? num(x.saldo) : 0; return {ym: m.ym, a: av, c: m.saldo, d: r2(m.saldo - av)}; });
  return {rows, months};
}

// ===== Export (CSV) =====
// Řádky CSV pro valnou hromadu (jeden soubor, části oddělené prázdným řádkem). o = {team, key, at, by, sv, pl, track, flow, note}:
// sv = uložený dokument, pl = plán uloženého rozpočtu, track = budgetTrack, flow = cashflow (null = sezóna skončila), note = komentář.
export function budgetCsvRows(o) {
  const a = approvedOf(o.sv), revs = revList(o.sv), pl = o.pl, rows = [];
  rows.push(["Rozpočet sezóny " + seasonLabel(o.key), o.team || ""]);
  rows.push(["Export", dmy(o.at), o.by || ""]);
  rows.push(["Stav", a ? "Schváleno " + dmy(a.at) + " (" + a.by + ")" + (revs.length ? ", úprav: " + revs.length : "") : "Neschválený návrh"]);
  rows.push([]);
  // Souhrn: schválený a aktuální plán
  rows.push(["Souhrn", "Schválený rozpočet", "Aktuální plán", "Rozdíl"]);
  CMP_ROWS.forEach(([k, label]) => { const c = num(pl.tot[k]), av = a ? num(a.sum.tot[k]) : null;
    rows.push([label, av == null ? "" : k === "n" ? av : csvNum(av), k === "n" ? c : csvNum(c), av == null ? "" : k === "n" ? c - av : csvNum(c - av)]); });
  rows.push([]);
  // Plán po měsících (aktuální) se schváleným saldem
  rows.push(["Plán po měsících", "Událostí", "Náklady událostí", "Za události", "Příspěvky", "Platy", "Ostatní ±", "Příjmy", "Výdaje", "Saldo", "Kumulativně", "Saldo schválené"]);
  const am = new Map(a ? a.sum.months.map(m => [m.ym, m]) : []);
  pl.months.forEach(m => rows.push([ymLabel(m.ym), m.n, csvNum(m.evCost), csvNum(m.evInc), csvNum(m.contrib), csvNum(m.sal), csvNum(m.oin - m.oout),
    csvNum(m.inc), csvNum(m.out), csvNum(m.saldo), csvNum(m.cum), a ? csvNum(num((am.get(m.ym) || {}).saldo)) : ""]));
  rows.push([]);
  // Plnění po měsících (uplynulé a běžící měsíce: skutečnost, budoucí: jen plán)
  if (o.track) {
    rows.push(["Plnění po měsících", "Události plán", "Proběhlo", "V kalendáři", "Výdaje plán", "Výdaje skutečnost", "Příjmy plán", "Příjmy skutečnost", "Saldo plán", "Saldo skutečnost", "Kumulativně", "Odhad kumulativně", "Odchylka nad 10 %"]);
    o.track.months.forEach(m => { const fut = m.st === "fut";
      rows.push([ymLabel(m.ym) + (m.st === "cur" ? " (běží)" : ""), m.plan.n, fut ? "" : m.done, m.cal, csvNum(m.plan.out), fut ? "" : csvNum(m.out), csvNum(m.plan.inc), fut ? "" : csvNum(m.inc),
        csvNum(m.plan.saldo), fut ? "" : csvNum(m.saldo), m.cum == null ? "" : csvNum(m.cum), csvNum(m.fcCum), m.warn ? "ano" : ""]); });
    rows.push([]);
  }
  // Cashflow: odhad zůstatku pokladny
  if (o.flow) {
    rows.push(["Cashflow", "Očekávané příjmy", "Očekávané výdaje", "Zůstatek na konci", "Stav"]);
    rows.push(["Zůstatek dnes", "", "", csvNum(o.flow.today.bal), ""]);
    o.flow.months.forEach(m => rows.push([ymLabel(m.ym), csvNum(m.in), csvNum(m.out), csvNum(m.bal), m.low === "neg" ? "pod nulou" : m.low === "res" ? "pod rezervou" : "v pořádku"]));
    rows.push(["Rezerva", "", "", csvNum(o.flow.res), ""]);
    rows.push([]);
  }
  // Úpravy po schválení
  if (revs.length) {
    rows.push(["Úpravy po schválení", "Kdo", "Důvod", "Událostí", "Příjmy", "Výdaje", "Saldo sezóny"]);
    revs.forEach(r => rows.push([dmy(r.at), r.by, r.note, r.n, csvNum(r.inc), csvNum(r.out), csvNum(r.saldo)]));
    rows.push([]);
  }
  if (str(o.note).trim()) rows.push(["Komentář", str(o.note).trim()]);
  return rows;
}

// ===== Exporty =====
// Vše exportováno u definic (export function / export const).
