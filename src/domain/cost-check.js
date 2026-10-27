// Doména: 🧾 kontrola nákladů událostí (čisté funkce bez DOM) – očekávané náklady (led, rozhodčí, časomíra …) proti zaplaceným výdajům.
// Očekávané = nákladové položky událostí {cat, payee, amt}: uzavřená událost = uložený snapshot (settle.cost), jinak nastavení / šablona (evCash).
// Zaplacené = výdaje pokladny (k "out") stejné kategorie za stejný měsíc (pym „Za měsíc“, jinak měsíc data) – nezávisle na účtu.
// Párování v měsíci a kategorii: nejdřív podle příjemce (bez velikosti písmen a diakritiky), zbytek výdajů kategorie postupně do řádků se zbytkem.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Očekávané náklady -> Párování měsíce -> Souhrn období.

// ===== Importy =====
import {CAT_SALARY, evCash, forYm, r2, ymAdd, ymOk} from "./cash.js";
import {monthEvents} from "./economy.js";

// ===== Konstanty =====
// Stav řádku: čeká na zaplacení, zaplaceno přesně, zaplaceno víc (nebo předem), výdaj bez události
export const COST_ST = {wait: "⏳ čeká na platbu", ok: "✅ zaplaceno", over: "➕ zaplaceno víc", extra: "❔ výdaj bez události", plan: "🗓 jen plán"};
const NO_CAT = "Bez kategorie";

// ===== Pomocné funkce =====
const sum = (a, f) => (a || []).reduce((s, x) => s + (+f(x) || 0), 0);
// Klíč příjemce: bez diakritiky, malá písmena, jednoduché mezery
export const payeeKey = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const rowKey = (cat, payee) => cat + "|" + payeeKey(payee);

// ===== Očekávané náklady =====
// Nákladové položky jedné události ({id, type, title, date, cx} z monthEvents); položky s nulovou částkou se vynechají
export function costLines(ev, cfg) {
  const st = (ev.cx || {}).settle, cost = st ? st.cost || [] : evCash(ev, cfg).cost;
  return (cost || []).filter(x => +x.amt > 0).map(x => ({eid: ev.id, type: ev.type, title: ev.title, date: ev.date, cat: x.cat || NO_CAT, payee: String(x.payee || "").trim(), amt: r2(+x.amt), settled: !!st}));
}
// Kategorie, ve kterých se náklady událostí hlídají: kategorie z položek šablon a z položek předaných událostí (bez platů)
export function costCats(cfg, lines) {
  const s = new Set();
  Object.values((cfg && cfg.tpls) || {}).forEach(t => (t.cost || []).forEach(x => { if (x.cat) s.add(x.cat); }));
  (lines || []).forEach(l => s.add(l.cat));
  s.delete(CAT_SALARY);
  return s;
}

// ===== Párování měsíce =====
// Kontrola měsíce ym. D = {ev, ma, ec, cs, cfg} (econData), today = „RRRR-MM-DD“, cats = hlídané kategorie (jinak z šablon a měsíce).
// Vrací {ym, rows, exp, due, paid, rest, over}; řádek = {cat, payee, n, nFut, exp (celý měsíc), due (do dneška; po konci měsíce celý měsíc),
// paid, rest (due − paid, kladné = čeká), st (klíč COST_ST), evs: [řádky událostí], pays: [výdaje]}.
export function costMonth(ym, D, today, cats) {
  const lines = [];
  monthEvents(ym, D).forEach(ev => lines.push(...costLines(ev, D.cfg)));
  const C = cats || costCats(D.cfg, lines), done = String(today || "").slice(0, 7) > ym, rows = new Map();
  // Očekávané náklady po kategorii a příjemci
  lines.forEach(l => {
    const k = rowKey(l.cat, l.payee);
    if (!rows.has(k)) rows.set(k, {cat: l.cat, payee: l.payee, n: 0, nFut: 0, exp: 0, due: 0, paid: 0, evs: [], pays: []});
    const r = rows.get(k), fut = String(l.date) > String(today || "");
    r.n++; r.exp = r2(r.exp + l.amt);
    if (fut) r.nFut++;
    if (!fut || done) r.due = r2(r.due + l.amt);
    r.evs.push({eid: l.eid, type: l.type, title: l.title, date: l.date, amt: l.amt, fut, settled: l.settled});
  });
  // Výdaje měsíce v hlídaných kategoriích (nebo s výslovně zvoleným měsícem pym)
  const pays = (D.cs || []).filter(x => x.k === "out" && forYm(x) === ym && x.cat !== CAT_SALARY && (C.has(x.cat || NO_CAT) || ymOk(x.pym)))
    .sort((a, b) => String(a.d || "").localeCompare(String(b.d || "")) || String(a.id || "").localeCompare(String(b.id || "")));
  const left = [];
  // 1) shoda kategorie i příjemce
  pays.forEach(x => {
    const r = x.payee ? rows.get(rowKey(x.cat || NO_CAT, x.payee)) : null;
    if (r) { r.paid = r2(r.paid + (+x.amt || 0)); r.pays.push(x); } else left.push(x);
  });
  // 2) zbytek po kategorii do řádků, kterým ještě něco chybí (pořadí: největší očekávaný náklad první), přebytek do posledního řádku kategorie
  left.forEach(x => {
    const cat = x.cat || NO_CAT, list = [...rows.values()].filter(r => r.cat === cat && r.exp > 0).sort((a, b) => b.exp - a.exp);
    if (!list.length) {
      const k = rowKey(cat, x.payee || "") + "|x";
      if (!rows.has(k)) rows.set(k, {cat, payee: String(x.payee || "").trim(), n: 0, nFut: 0, exp: 0, due: 0, paid: 0, evs: [], pays: [], extra: true});
      const r = rows.get(k);
      r.paid = r2(r.paid + (+x.amt || 0)); r.pays.push(x);
      return;
    }
    let a = r2(+x.amt || 0);
    list.forEach((r, i) => {
      if (a <= 0) return;
      const take = i === list.length - 1 ? a : r2(Math.min(a, Math.max(0, r.exp - r.paid)));
      if (take <= 0) return;
      r.paid = r2(r.paid + take); a = r2(a - take);
      if (!r.pays.includes(x)) r.pays.push(x);
    });
  });
  // Stav řádků
  const out = [...rows.values()].map(r => {
    const rest = r2(r.due - r.paid);
    const st = r.extra ? "extra" : rest > 0.009 ? "wait" : rest < -0.009 ? (r.paid > r.exp + 0.009 ? "over" : "ok") : r.due > 0 ? "ok" : "plan";
    return {...r, rest, st};
  }).sort((a, b) => a.cat.localeCompare(b.cat, "cs") || b.exp - a.exp || a.payee.localeCompare(b.payee, "cs"));
  return {ym, rows: out, exp: r2(sum(out, r => r.exp)), due: r2(sum(out, r => r.due)), paid: r2(sum(out, r => r.paid)),
    rest: r2(sum(out, r => Math.max(0, r.rest))), over: r2(sum(out, r => Math.max(0, -r.rest)))};
}

// ===== Souhrn období =====
// Měsíce od from do to včetně („RRRR-MM“), nejnovější první
export function ymRange(from, to) {
  if (!ymOk(from) || !ymOk(to) || from > to) return [];
  const out = [];
  for (let ym = from; ym <= to && out.length < 36; ym = ymAdd(ym, 1)) out.push(ym);
  return out.reverse();
}
// Kontrola více měsíců: kategorie se hlídají společně za celé období. Vrací {months (jen s náklady nebo výdaji), exp, due, paid, rest, over}.
export function costPeriod(yms, D, today) {
  const all = [];
  (yms || []).forEach(ym => monthEvents(ym, D).forEach(ev => all.push(...costLines(ev, D.cfg))));
  const C = costCats(D.cfg, all), months = (yms || []).map(ym => costMonth(ym, D, today, C)).filter(m => m.rows.length);
  return {months, exp: r2(sum(months, m => m.exp)), due: r2(sum(months, m => m.due)), paid: r2(sum(months, m => m.paid)), rest: r2(sum(months, m => m.rest)), over: r2(sum(months, m => m.over))};
}
