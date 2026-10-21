// Doména: pokladna – model osob (skupina, koeficient fx), šablony událostí, výpočet předpisů, úhrady, zůstatek, přehled dluhů a migrace z payments (čisté funkce bez DOM).
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Pokladna (zůstatek, kategorie, úhrady) -> Nastavení a šablony -> Výpočet předpisů -> Předpisy (charges) -> Přehled dluhů -> Migrace.
// Pravidla:
//  - platí jen hráčky (brankářky a realizační tým neplatí); skupina hráčky = grp (monthly | single), fx 0..1 (0 osvobozená, 0.5 částečně, výchozí 1),
//  - cena hráčky = (součet nákladů ÷ počet VŠECH přihlášených hráček v poli) nebo pevná částka, × fx, zaokrouhleno nahoru na celé Kč,
//  - osvobozené (fx 0) se do dělitele počítají, jen samy neplatí,
//  - zůstatek pokladny = součet příjmů (cash.k "in") − součet výdajů (cash.k "out").

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
// Koeficient a skupina hráčky (před migrací se čte i starý údaj pay)
export const fxOf = p => { const v = p && p.fx != null ? +p.fx : (p && p.pay === "exempt" ? 0 : 1); return v >= 0 && v <= 1 ? v : 1; };
export const grpOf = p => (p && (p.grp ? p.grp === "single" : p.pay === "single") ? "single" : "monthly");
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
// Efektivní nastavení události: uložená pole (tpl, cost, who, due), jinak výchozí šablona podle typu
export function evCash(ev, cfg) {
  const r = ev.raw, tk = r.tpl || tplFor(ev.type, r.home), t = cfg.tpls[tk] || cfg.tpls[tplFor(ev.type, r.home)] || DEF_TPL.train;
  const who = cl(r.who || t.who);
  Object.keys(WHO).forEach(g => { if (!who[g]) who[g] = {pays: false, mode: "calc", flat: 0}; });
  return {tpl: tk, cost: cl(r.cost || t.cost), who, due: r.due || ""};
}
export const costTotal = r => sum(r.cost, x => x.amt);
// Pole pokladny v dokumentu události (zachovají se při úpravě tréninku)
export const cashKeep = r => { const o = {}; ["tpl", "cost", "who", "due", "settle"].forEach(k => { if (r[k] != null) o[k] = r[k]; }); return o; };

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
export function planCharges(eid, k, due, have) {
  const set = [], del = [], keep = new Set(k.payers.map(x => x.pid));
  k.payers.forEach(x => {
    const id = chargeId(eid, x.pid), o = have[x.pid];
    set.push({id, d: {eid, mid: x.pid, amt: x.amt, paid: o ? (+o.paid || 0) : 0, due, kind: "event", vs: vsOf(id)}});
  });
  Object.values(have).forEach(o => { if (!keep.has(o.mid) && !(+o.paid > 0)) del.push(chargeId(eid, o.mid)); });
  return {set, del};
}

// ===== Přehled dluhů =====
// ch = předpisy (S.ch), evOf = id události -> událost; předpisy smazaných událostí a hráček se přeskočí.
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

// ===== Migrace (v16.3 -> v17.0) =====
// data = zrcadlo kolekcí {players, matches, events, payments, charges, cash, settings}; vrací operace ["set", kolekce, id, data].
// Idempotentní: už převedené položky se přeskočí.
export function migratePlan(data, cfg, today) {
  const ops = [], evs = {};
  Object.entries(data.events || {}).forEach(([id, e]) => { evs[id] = {c: "events", d: e, type: "training"}; });
  Object.entries(data.matches || {}).forEach(([id, m]) => { evs[id] = {c: "matches", d: m, type: "match"}; });
  // 1) hráčky: pay -> grp + fx
  Object.entries(data.players || {}).forEach(([id, p]) => {
    if (p.grp != null && p.fx != null && p.pay == null) return;
    const o = {...p}, py = p.pay;
    delete o.pay;
    o.grp = p.grp || (py === "single" ? "single" : "monthly");
    o.fx = p.fx != null ? p.fx : (py === "exempt" ? 0 : 1);
    ops.push(["set", "players", id, o]);
  });
  // 2) události a zápasy: fee + pm -> cost + who
  Object.entries(evs).forEach(([id, e]) => {
    const d = e.d;
    if (d.cost || d.who || (d.fee == null && d.pm == null)) return;
    const mode = d.pm || (e.type === "match" && d.home === false ? "none" : "contrib"), o = {...d};
    delete o.fee; delete o.pm;
    o.tpl = "custom";
    o.cost = +d.fee > 0 ? [{cat: "Migrace (celková cena)", payee: "", amt: +d.fee}] : [];
    o.who = mode === "all" ? W(true, true, false) : mode === "none" ? W(false, false, false) : W(false, true, false);
    ops.push(["set", e.c, id, o]);
  });
  // 3) platby -> předpisy (+ příjem do pokladny u zaplacených)
  Object.entries(data.payments || {}).forEach(([id, x]) => {
    if ((data.charges || {})[id]) return;
    const amt = +x.amt || 0, e = evs[x.eid], due = e && e.d.date ? defDue(e.d.date, cfg.due.ev) : "";
    ops.push(["set", "charges", id, {eid: x.eid, mid: x.pid, amt, paid: x.paid ? amt : 0, due, kind: "event", vs: vsOf(id)}]);
    if (x.paid && amt > 0 && !(data.cash || {})["m_" + id]) {
      ops.push(["set", "cash", "m_" + id, {d: (x.paidAt || "").slice(0, 10) || today, k: "in", amt, cat: CAT_EVENT, mid: x.pid, cid: id, eid: x.eid, note: "Migrace z v16.3", by: x.by || ""}]);
    }
  });
  // 4) nastavení pokladny
  if (!(data.settings || {}).cash) ops.push(["set", "settings", "cash", cfg]);
  return ops;
}
