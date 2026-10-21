// Doména: pokladna – model osob (skupina, koeficient fx), šablony událostí, výpočet předpisů, úhrady, zůstatek, přehled dluhů,
// měsíční příspěvky, platy realizačního týmu, hospodaření po měsících a CSV (čisté funkce bez DOM).
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Pokladna (zůstatek, kategorie, úhrady) -> Nastavení a šablony -> Vyúčtování událostí
//            -> Výpočet předpisů -> Předpisy (charges) -> Přehled dluhů -> Měsíční příspěvky (F4) -> Platy (F4) -> Hospodaření po měsících (F4) -> CSV (F4).
// Pravidla:
//  - platí jen hráčky (brankářky a realizační tým neplatí); skupina hráčky = grp (monthly | single), fx 0..1 (0 osvobozená, 0.5 částečně, výchozí 1),
//  - cena hráčky = (součet nákladů ÷ počet VŠECH přihlášených hráček v poli) nebo pevná částka, × fx, zaokrouhleno nahoru na celé Kč,
//  - osvobozené (fx 0) se do dělitele počítají, jen samy neplatí,
//  - měsíční příspěvek = částka z nastavení × fx, platí ho hráčky ve skupině monthly (ne ukončené, ne brankářky, ne fx 0),
//  - zůstatek pokladny = součet příjmů (cash.k "in") − součet výdajů (cash.k "out").
// Migrace z v16.3 a přesun dat do evcash (v17.0–v17.2) jsou hotové a z kódu odstraněné (v17.3).

// ===== Importy =====
import {isG, pl} from "../core/selectors.js";

// ===== Konstanty =====
export const GRP = {monthly: "Příspěvek", single: "Za událost"};
export const FXV = [[1, "1× (plná)"], [0.5, "0,5× (poloviční)"], [0, "0× (osvobozená)"]];
export const WHO = {monthly: "Hráčky s příspěvkem", single: "Hráčky platící za událost", exempt: "Osvobozené (fx 0)"};
export const STAFF_PAY = {none: "Bez platu", month: "Měsíčně", event: "Za událost"};
export const CATS = {
  in: ["Příspěvky", "Platby za události", "Vklady / dary", "Jiné příjmy"],
  out: ["Pronájem ledu", "Rozhodčí", "Doprava", "Vybavení", "Služby / doména", "Platy trenérů", "Jiné výdaje"]
};
export const CAT_EVENT = "Platby za události";
export const CAT_CONTRIB = "Příspěvky";
export const CAT_SALARY = "Platy trenérů";
// Předpona id „události“ měsíčního příspěvku: předpis má eid "c_RRRR-MM" a id "c_RRRR-MM_{pid}"
export const CPRE = "c_";
// Předpona id výdaje platu v pokladně: "sal_RRRR-MM_{tid}" (jeden plat za člena a měsíc)
export const SPRE = "sal_";
const MONTHS = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];

// ===== Pomocné funkce =====
const cl = o => JSON.parse(JSON.stringify(o));
const sum = (a, f) => (a || []).reduce((s, x) => s + (+f(x) || 0), 0);
const p2 = n => String(n).padStart(2, "0");
const ceil = x => Math.ceil(x - 1e-9);
// Zaokrouhlení na haléře (částky úhrad)
export const r2 = n => Math.round((+n || 0) * 100) / 100;
export const kc = n => (Math.round(n * 100) / 100).toLocaleString("cs-CZ") + " Kč";
// Platné datum ve tvaru RRRR-MM-DD
export const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && !isNaN(new Date(s + "T12:00:00"));
// Koeficient a skupina hráčky
export const fxOf = p => { const v = p && p.fx != null ? +p.fx : 1; return v >= 0 && v <= 1 ? v : 1; };
export const grpOf = p => (p && p.grp === "single" ? "single" : "monthly");
// Skupina pro výpočet události: fx 0 = osvobozená
export const grpKey = p => (fxOf(p) === 0 ? "exempt" : grpOf(p));
// Splatnost: datum události + N dní, 23:59 (formát datetime-local)
export function defDue(date, days) {
  const d = new Date(date + "T12:00:00");
  if (isNaN(d)) return "";
  d.setDate(d.getDate() + (+days || 0));
  return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()) + "T23:59";
}
export const fmtDue = s => { const d = new Date(s); return isNaN(d) ? "" : d.getDate() + ". " + (d.getMonth() + 1) + ". " + p2(d.getHours()) + ":" + p2(d.getMinutes()); };
// Variabilní symbol = číselný hash id předpisu (nejvýše 10 číslic)
export const vsOf = id => { let h = 5381; for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0; return String(h >>> 0); };
export const chargeId = (eid, mid) => eid + "_" + mid;
export const restOf = x => Math.max(0, r2((+x.amt || 0) - (+x.paid || 0)));
export const overdue = x => restOf(x) > 0 && !!x.due && new Date(x.due).getTime() < Date.now();
// Měsíc: "RRRR-MM", popisek "listopad 2026" a krátký "11/2026", posun o n měsíců
export const ymOk = s => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s || ""));
export const ymNow = () => { const d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1); };
export const ymLabel = ym => (ymOk(ym) ? MONTHS[+ym.slice(5) - 1] + " " + ym.slice(0, 4) : String(ym || ""));
export const ymShort = ym => (ymOk(ym) ? +ym.slice(5) + "/" + ym.slice(0, 4) : String(ym || ""));
export function ymAdd(ym, n) { const d = new Date(+ym.slice(0, 4), +ym.slice(5) - 1 + n, 1); return d.getFullYear() + "-" + p2(d.getMonth() + 1); }
// Poslední den měsíce ve tvaru RRRR-MM-DD
export const ymLast = ym => ym + "-" + p2(new Date(+ym.slice(0, 4), +ym.slice(5), 0).getDate());

// ===== Pokladna: zůstatek, kategorie, úhrady =====
// Součty příjmů a výdajů a zůstatek z pohybů (cash)
export function sumCash(cs) {
  let i = 0, o = 0;
  (cs || []).forEach(x => { const a = +x.amt || 0; if (x.k === "in") i += a; else if (x.k === "out") o += a; });
  return {in: r2(i), out: r2(o), bal: r2(i - o)};
}
// Součty podle kategorií zvlášť pro příjmy a výdaje
export function catSums(cs) {
  const r = {in: {}, out: {}};
  (cs || []).forEach(x => {
    if (x.k !== "in" && x.k !== "out") return;
    const c = x.cat || "Bez kategorie";
    r[x.k][c] = r2((r[x.k][c] || 0) + (+x.amt || 0));
  });
  return r;
}
// Kontrola částky úhrady předpisu: kladná a nejvýše zbývající dluh (vrací {amt} nebo {err})
export function payAmount(x, v) {
  const a = r2(+String(v).replace(",", "."));
  if (!(a > 0)) return {err: "Zadej kladnou částku"};
  const rest = restOf(x);
  if (rest <= 0) return {err: "Předpis je už zaplacený"};
  if (a > rest + 1e-9) return {err: "Částka je vyšší než zbývá (" + kc(rest) + ")"};
  return {amt: Math.min(a, rest)};
}

// ===== Nastavení a šablony =====
const W = (m, s, x) => ({monthly: {pays: m, mode: "calc", flat: 0}, single: {pays: s, mode: "calc", flat: 0}, exempt: {pays: x, mode: "calc", flat: 0}});
export const DEF_TPL = {
  train: {name: "Pravidelný trénink", cost: [], who: W(false, true, false), dueDays: null},
  extra: {name: "Mimořádný trénink", cost: [], who: W(true, true, false), dueDays: null},
  home: {name: "Domácí zápas", cost: [], who: W(false, true, false), dueDays: null},
  away: {name: "Venkovní zápas", cost: [], who: W(false, false, false), dueDays: null}   // bez vyúčtování hráčkám, náklady nese soupeř
};
// Normalizované nastavení pokladny z dokumentu settings/cash (výchozí šablony se vždy doplní)
export function cashCfg(r) {
  r = r || {};
  const tpls = {};
  Object.entries(DEF_TPL).forEach(([k, v]) => { tpls[k] = cl(v); });
  Object.entries(r.tpls || {}).forEach(([k, v]) => { tpls[k] = {name: v.name || k, cost: cl(v.cost || []), who: {...W(false, false, false), ...cl(v.who || {})}, dueDays: v.dueDays != null ? +v.dueDays : null}; });
  const c = r.cats || {};
  return {
    iban: r.iban || "", contrib: +r.contrib || 0,
    due: {ev: r.due && r.due.ev != null ? +r.due.ev : 3, cm: r.due && r.due.cm != null ? +r.due.cm : 1},
    cats: {in: c.in && c.in.length ? cl(c.in) : cl(CATS.in), out: c.out && c.out.length ? cl(c.out) : cl(CATS.out)},
    tpls
  };
}
export const tplFor = (type, home) => (type === "match" ? (home === false ? "away" : "home") : "train");

// ===== Vyúčtování událostí =====
// Efektivní nastavení události: uložená pole v evcash (tpl, cost, who, due), jinak výchozí šablona podle typu
export function evCash(ev, cfg) {
  const r = ev.cx || {}, home = (ev.raw || {}).home, tk = r.tpl || tplFor(ev.type, home), t = cfg.tpls[tk] || cfg.tpls[tplFor(ev.type, home)] || DEF_TPL.train;
  const who = cl(r.who || t.who);
  Object.keys(WHO).forEach(g => { if (!who[g]) who[g] = {pays: false, mode: "calc", flat: 0}; });
  return {tpl: tk, cost: cl(r.cost || t.cost), who, due: r.due || ""};
}
export const costTotal = r => sum((r || {}).cost, x => x.amt);
// Vyúčtování události z kolekce evcash/{eid} (čtou jen správci pokladny); bez dokumentu prázdný objekt
export function cxOf(id, ec) {
  const c = (ec || []).find(x => x.id === id);
  if (!c) return {};
  const o = {...c};
  delete o.id;
  return o;
}
// Dluh osoby (ids = její pid / tid): předpisy, dluh, část po splatnosti a blokace přihlášení „Jdu“ (po splatnosti a bez výjimky exc)
export function debtOf(ch, ids) {
  const items = (ch || []).filter(x => ids.includes(x.mid));
  let debt = 0, over = 0, blocked = false;
  items.forEach(x => {
    const r = restOf(x);
    if (r > 0) { debt += r; if (overdue(x)) { over += r; if (!x.exc) blocked = true; } }
  });
  return {items, debt: r2(debt), over: r2(over), blocked};
}
// Variabilní symbol unikátní mezi předpisy: při shodě hashe se zvyšuje o 1 (nejvýše 10 číslic)
export function uniqVs(id, taken) {
  let n = +vsOf(id);
  while (taken.has(String(n))) n = (n + 1) % 4294967296;
  return String(n);
}
// QR platba v českém formátu SPD (zpráva jen ASCII bez znaku *)
export const asciiMsg = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .,\-]/g, "").slice(0, 60).trim();
export const spdPay = (iban, amt, vs, msg) => "SPD*1.0*ACC:" + String(iban).replace(/\s+/g, "").toUpperCase() + "*AM:" + (+amt).toFixed(2) + "*CC:CZK*X-VS:" + vs + (asciiMsg(msg) ? "*MSG:" + asciiMsg(msg) : "");

// ===== Výpočet předpisů =====
// c = {cost, who}; P = přihlášené hráčky (objekty, bez brankářek). Vrací řádky po hráčkách a součty.
export function calcCash(c, P) {
  const N = P.length, total = sum(c.cost, x => x.amt);
  const lines = P.map(p => {
    const g = grpKey(p), w = (c.who || {})[g] || {}, fx = fxOf(p);
    let amt = 0;
    if (N > 0 && w.pays) amt = ceil((w.mode === "flat" ? (+w.flat || 0) : total / N) * fx);
    return {pid: p.id, g, fx, amt: Math.max(0, amt)};
  });
  const payers = lines.filter(l => l.amt > 0);
  return {N, total, lines, payers, collect: sum(payers, l => l.amt)};
}

// ===== Předpisy (charges) =====
// have = stávající předpisy události podle mid. Zaplacená částka se zachová; nezaplacené předpisy hráček, které už neplatí, se smažou.
export function planCharges(eid, k, due, have, all) {
  const set = [], del = [], keep = new Set(k.payers.map(x => x.pid));
  const taken = new Set((all || []).map(c => c.vs).filter(Boolean));   // už použité variabilní symboly
  k.payers.forEach(x => {
    const id = chargeId(eid, x.pid), o = have[x.pid];
    let vs = o && o.vs;
    if (!vs) { vs = uniqVs(id, taken); taken.add(vs); }
    set.push({id, d: {eid, mid: x.pid, amt: x.amt, paid: o ? (+o.paid || 0) : 0, due, kind: "event", vs, ...(o && o.exc ? {exc: true} : {})}});
  });
  Object.values(have).forEach(o => { if (!keep.has(o.mid) && !(+o.paid > 0)) del.push(chargeId(eid, o.mid)); });
  return {set, del};
}

// ===== Přehled dluhů =====
// ch = předpisy (S.ch), evOf = id události -> událost (u příspěvků pseudo-událost měsíce); předpisy smazaných událostí a hráček se přeskočí.
export function ledger(ch, evOf) {
  const by = {};
  let owed = 0, got = 0;
  ch.forEach(x => {
    if (!pl(x.mid) || !evOf(x.eid)) return;
    const r = by[x.mid] = by[x.mid] || {pid: x.mid, items: [], debt: 0, paid: 0, open: 0};
    r.items.push(x);
    const rest = restOf(x), pd = Math.min(+x.paid || 0, +x.amt || 0);
    r.paid += pd; got += pd;
    if (rest > 0) { r.debt += rest; r.open++; owed += rest; }
  });
  const rows = Object.values(by);
  return {rows, owed: r2(owed), got: r2(got), debtors: rows.filter(r => r.debt > 0).length};
}

// ===== Měsíční příspěvky (F4) =====
export const isContrib = x => !!x && x.kind === "contrib";
export const contribEid = ym => CPRE + ym;
// Měsíc z eid příspěvku ("c_RRRR-MM" -> "RRRR-MM"), jinak prázdný řetězec
export const contribYm = eid => { const s = String(eid || ""); return s.startsWith(CPRE) && ymOk(s.slice(CPRE.length)) ? s.slice(CPRE.length) : ""; };
// Pseudo-událost pro výpisy (přehled dluhů, Moje platby): název a datum = 1. den měsíce
export const contribEvent = ym => ({id: contribEid(ym), type: "contrib", title: "Příspěvek " + ymLabel(ym), date: ym + "-01", time: "", raw: {}, cx: {}});
// Splatnost příspěvku: den v měsíci z nastavení (1–28, předem), 23:59
export const contribDue = (ym, day) => ym + "-" + p2(Math.min(28, Math.max(1, Math.round(+day) || 1))) + "T23:59";
// Kdo příspěvek platí: hráčky ve skupině monthly, ne ukončené, ne brankářky, fx > 0. Výchozí částka = příspěvek × fx (nahoru na Kč).
// players = soupiska, cfg = nastavení pokladny, have = existující předpisy příspěvku za měsíc podle mid.
// Vrací řádky {pid, fx, amt, has} seřazené podle jména (has = už vystavený předpis).
export function contribRows(players, cfg, have) {
  const base = +cfg.contrib || 0;
  const pays = (players || []).filter(p => (p.st || "act") !== "end" && !isG(p) && grpOf(p) === "monthly" && fxOf(p) > 0);
  const ids = new Set(pays.map(p => p.id));
  // Hráčky, které už předpis mají (i když mezitím změnily skupinu), se v seznamu ukážou také
  Object.keys(have || {}).forEach(id => { const p = (players || []).find(x => x.id === id); if (p && !ids.has(id)) { pays.push(p); ids.add(id); } });
  return pays.sort((a, b) => (a.name || "").localeCompare(b.name || "", "cs"))
    .map(p => ({pid: p.id, fx: fxOf(p), amt: ceil(base * fxOf(p)), has: (have || {})[p.id] || null}));
}
// Vystavení příspěvků: rows = vybrané řádky {pid, amt}; existující předpisy se nepřepisují (idempotentní). all = všechny předpisy (VS).
export function contribPlan(ym, rows, cfg, all) {
  const eid = contribEid(ym), due = contribDue(ym, cfg.due.cm), set = [];
  const have = new Set((all || []).map(c => c.id));
  const taken = new Set((all || []).map(c => c.vs).filter(Boolean));
  rows.forEach(r => {
    const id = chargeId(eid, r.pid), amt = ceil(+r.amt || 0);
    if (have.has(id) || !(amt > 0)) return;
    const vs = uniqVs(id, taken);
    taken.add(vs);
    set.push({id, d: {eid, mid: r.pid, amt, paid: 0, due, kind: "contrib", vs}});
  });
  return set;
}

// ===== Platy realizačního týmu (F4) =====
// Návrh platů za měsíc: staff.pay = {m: "month" | "event", amt}. U platu za událost se počítají události měsíce do dneška,
// na které je člen přihlášen „Jdu“ (evs = [{id, date}], at = docházka). paid = už zapsaný výdaj platu v pokladně (cash id sal_RRRR-MM_{tid}).
export function salaryRows(staff, ym, evs, at, cs, today) {
  const inMonth = (evs || []).filter(e => String(e.date || "").startsWith(ym) && e.date <= today).map(e => e.id);
  const going = new Set((at || []).filter(a => a.st === "yes").map(a => a.eid + "|" + a.pid));
  return (staff || []).filter(t => t.pay && (t.pay.m === "month" || t.pay.m === "event"))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "cs"))
    .map(t => {
      const rate = +t.pay.amt || 0, n = t.pay.m === "event" ? inMonth.filter(eid => going.has(eid + "|" + t.id)).length : 0;
      const amt = r2(t.pay.m === "month" ? rate : rate * n), id = salaryId(ym, t.id);
      return {tid: t.id, name: t.name || "?", m: t.pay.m, rate, n, amt, id, paid: (cs || []).find(x => x.id === id) || null};
    });
}
export const salaryId = (ym, tid) => SPRE + ym + "_" + tid;
// Datum výdaje platu: u běžícího měsíce dnešek, jinak poslední den měsíce
export const salaryDay = (ym, today) => (today.startsWith(ym) ? today : ymLast(ym));

// ===== Hospodaření po měsících (F4) =====
// Pohyby pokladny po měsících (podle data pohybu) a zůstatek na konci měsíce. Vrací seřazené řádky {ym, in, out, net, bal}.
export function monthRows(cs) {
  const by = {};
  (cs || []).forEach(x => {
    if (x.k !== "in" && x.k !== "out") return;
    const ym = String(x.d || "").slice(0, 7);
    if (!ymOk(ym)) return;
    const r = by[ym] = by[ym] || {ym, in: 0, out: 0};
    r[x.k] += +x.amt || 0;
  });
  let bal = 0;
  return Object.values(by).sort((a, b) => a.ym.localeCompare(b.ym)).map(r => {
    bal += r.in - r.out;
    return {ym: r.ym, in: r2(r.in), out: r2(r.out), net: r2(r.in - r.out), bal: r2(bal)};
  });
}
// Pohyby jednoho měsíce
export const cashOfMonth = (cs, ym) => (cs || []).filter(x => String(x.d || "").startsWith(ym));
// Předpisy se splatností v měsíci: předepsáno, zaplaceno, zbývá (zvlášť události a příspěvky)
export function chargesOfMonth(ch, ym) {
  const r = {ev: {amt: 0, paid: 0, n: 0}, contrib: {amt: 0, paid: 0, n: 0}};
  (ch || []).forEach(x => {
    if (!String(x.due || "").startsWith(ym)) return;
    const g = isContrib(x) ? r.contrib : r.ev;
    g.amt += +x.amt || 0; g.paid += Math.min(+x.paid || 0, +x.amt || 0); g.n++;
  });
  [r.ev, r.contrib].forEach(g => { g.amt = r2(g.amt); g.paid = r2(g.paid); g.rest = r2(g.amt - g.paid); });
  return r;
}

// ===== CSV (F4) =====
// Text CSV pro Excel: oddělovač středník, uvozovky, BOM a konce řádků CRLF
export function csvText(rows) {
  const q = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  return "﻿" + rows.map(r => r.map(q).join(";")).join("\r\n");
}
// Částka pro CSV s desetinnou čárkou (Excel v češtině)
export const csvNum = n => String(r2(n)).replace(".", ",");
