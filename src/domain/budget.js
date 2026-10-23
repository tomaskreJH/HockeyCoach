// Doména: rozpočet sezóny (čisté funkce bez DOM) – parametry sezóny, položky událostí (opakování, počet, série), platy a ostatní
// příjmy / výdaje, plán po měsících a odhad potřebného příspěvku. Dokument budget/{sezóna} (např. "2026-27", období 1. 8. – 30. 6.)
// čte a zapisuje jen správce pokladny. Odhad je orientační: koeficienty hráček se nepočítají (platící hráčka = 100 %), příjem za událost
// se odvozuje ze šablony pokladny (kdo platí × paušál / podíl nákladů) podle složení hráček v parametrech, pokud není zadaný ručně.
// Pokladna, předpisy ani šablony se tu nemění – jen se čtou. Struktura: Importy -> Konstanty -> Pomocné funkce -> Sezóna -> Výchozí hodnoty
// a normalizace -> Položky -> Plán po měsících -> Odhad příspěvku -> Kontrola a dokument.

// ===== Importy =====
import {isG} from "../core/selectors.js";
import {seasonOf} from "./attendance.js";
import {DEF_TPL, costTotal, exOf, fxOf, grpOf, r2, ymOk} from "./cash.js";
import {WEEK_DAYS, datesOf} from "./recurrence.js";

// ===== Konstanty =====
export const BUDGET_COLL = "budget";                                   // kolekce rozpočtů (id = sezóna "RRRR-RR")
export const ITEM_MODE = {rule: "🔁 Opakování", count: "# Počet", ser: "📎 Série"};
export const PER = {season: "za sezónu", month: "za měsíc"};
export const OTHER_REP = {month: "měsíčně", once: "jednorázově"};
export const SAL_M = {month: "měsíčně", event: "za událost"};
export const BUDGET_GROUPS = ["monthly", "single", "exempt"];          // skupiny hráček v parametrech (jako šablony pokladny)
// Měsíce sezóny v pořadí (srpen … červen)
export const SEASON_MONTHS = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
const SEASON_RE = /^(\d{4})-(\d{2})$/;

// ===== Pomocné funkce =====
const p2 = n => String(n).padStart(2, "0");
const cl = o => JSON.parse(JSON.stringify(o));
const ceil = x => Math.ceil(x - 1e-9);
const sum = (a, f) => (a || []).reduce((s, x) => s + (+f(x) || 0), 0);
const num = (v, d = 0) => (v === "" || v == null || !isFinite(+v) ? d : +v);
const nn = v => Math.max(0, num(v));                                  // nezáporné číslo (prázdné = 0)
const int0 = v => Math.max(0, Math.round(num(v)));                    // nezáporné celé číslo
const isDay = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
// Ruční hodnota (prázdná = automaticky, null)
const optNum = v => (v === "" || v == null || !isFinite(+v) ? null : Math.max(0, +v));

// ===== Sezóna =====
// Klíč sezóny pro den ("RRRR-MM-DD", bez dne dnešek): 1. 8. 2026 – 30. 6. 2027 → "2026-27"
export function seasonKeyOf(day) {
  const y = +seasonOf(day).from.slice(0, 4);
  return y + "-" + p2((y + 1) % 100);
}
// Platný klíč sezóny (druhý rok = první + 1)
export const seasonOk = k => { const m = SEASON_RE.exec(String(k || "")); return !!m && +m[2] === (+m[1] + 1) % 100; };
export const seasonY = k => +String(k).slice(0, 4);
export const seasonFrom = k => seasonY(k) + "-08-01";
export const seasonTo = k => (seasonY(k) + 1) + "-06-30";
export const seasonLabel = k => seasonY(k) + "/" + p2((seasonY(k) + 1) % 100);
// Posun sezóny o n let
export const seasonAdd = (k, n) => { const y = seasonY(k) + n; return y + "-" + p2((y + 1) % 100); };
// Měsíce sezóny "RRRR-MM" (srpen až červen)
export const seasonYms = k => SEASON_MONTHS.map(m => (m >= 8 ? seasonY(k) : seasonY(k) + 1) + "-" + p2(m));

// ===== Výchozí hodnoty a normalizace =====
// Počty hráček podle skupiny ze soupisky: aktivní a zraněné, bez brankářek a ukončených; osvobozené a koeficient 0 % = exempt
export function rosterCounts(pl) {
  const P = (pl || []).filter(p => (p.st || "act") !== "end" && !isG(p));
  const ex = P.filter(p => exOf(p) || fxOf(p) === 0).length, mon = P.filter(p => !exOf(p) && fxOf(p) > 0 && grpOf(p) === "monthly").length;
  return {monthly: mon, single: P.length - ex - mon, exempt: ex};
}
// Výchozí parametry: počty ze soupisky, příspěvek z nastavení pokladny, účast att (např. průměr minulých tréninků), příspěvek všech 11 měsíců
export function defaultPar(pl, cfg, att) {
  const n = rosterCounts(pl), all = n.monthly + n.single + n.exempt;
  return {n, att: int0(att != null ? att : all), contrib: nn((cfg || {}).contrib), cH: [], cm: [...SEASON_MONTHS], goal: 0};
}
// Platy realizačního týmu z nastavení platu (staff.pay = {m: "month" | "event", amt})
export const defaultSal = tr => (tr || []).filter(t => t.pay && (t.pay.m === "month" || t.pay.m === "event"))
  .sort((a, b) => (a.name || "").localeCompare(b.name || "", "cs"))
  .map(t => ({name: t.name || "?", m: t.pay.m, amt: nn(t.pay.amt)}));
// Nová položka událostí podle šablony pokladny: pravidelný trénink = opakování každou středu, ostatní = počet za sezónu
export function newItem(tpl, cfg, key, id) {
  const t = ((cfg || {}).tpls || {})[tpl] || DEF_TPL[tpl] || DEF_TPL.train;
  const base = {id, name: t.name || tpl, tpl, cost: r2(costTotal(t)), inc: null, att: null, from: seasonFrom(key), to: seasonTo(key), skip: [], ser: ""};
  if (tpl === "train") return {...base, mode: "rule", rule: {days: [3], every: 1}, n: 0, per: "season"};
  return {...base, mode: "count", rule: {days: [], every: 1}, n: tpl === "extra" ? 5 : 10, per: "season"};
}
// Nový rozpočet sezóny z dnešního stavu (parametry ze soupisky a nastavení, platy z realizačního týmu, bez položek)
export const newBudget = (key, pl, cfg, tr, att) => ({season: key, par: defaultPar(pl, cfg, att), items: [], sal: defaultSal(tr), other: []});
// Převzetí rozpočtu jiné sezóny: parametry, položky (data posunutá o roky, vynechané dny se zahodí), platy a ostatní (jednorázové bez měsíce)
export function copyBudget(src, key) {
  const b = normBudget(src, src.season), dy = seasonY(key) - seasonY(b.season);
  const sh = d => (isDay(d) ? (+d.slice(0, 4) + dy) + d.slice(4) : d);
  return normBudget({season: key, par: {...b.par, cH: b.par.cH.map(c => ({...c, ym: (+c.ym.slice(0, 4) + dy) + c.ym.slice(4)}))},
    items: b.items.map(it => ({...it, from: sh(it.from), to: sh(it.to), skip: [], ser: "", mode: it.mode === "ser" ? "count" : it.mode})),
    sal: b.sal, other: b.other.map(o => (o.rep === "once" ? {...o, ym: ymOk(o.ym) ? (+o.ym.slice(0, 4) + dy) + o.ym.slice(4) : ""} : o))}, key);
}
// Normalizovaný rozpočet (chybějící pole doplní, čísla převede, neplatná vyřadí); key = sezóna
export function normBudget(r, key) {
  r = r || {};
  const k = seasonOk(r.season) ? r.season : key, p = r.par || {}, n = p.n || {};
  const yms = new Set(seasonYms(k));
  const par = {
    n: {monthly: int0(n.monthly), single: int0(n.single), exempt: int0(n.exempt)},
    att: int0(p.att), contrib: nn(p.contrib), goal: num(p.goal),
    cH: (p.cH || []).filter(c => c && ymOk(c.ym)).map(c => ({ym: c.ym, amt: nn(c.amt)})).sort((a, b) => a.ym.localeCompare(b.ym)),
    cm: Array.isArray(p.cm) ? SEASON_MONTHS.filter(m => p.cm.map(Number).includes(m)) : [...SEASON_MONTHS]
  };
  const items = (r.items || []).filter(Boolean).map((it, i) => ({
    id: String(it.id || "i" + i), name: String(it.name || ""), tpl: String(it.tpl || "train"),
    mode: ITEM_MODE[it.mode] ? it.mode : "count",
    rule: {days: ((it.rule || {}).days || []).map(Number).filter(d => d >= 0 && d <= 6), every: +(it.rule || {}).every === 2 ? 2 : 1},
    n: int0(it.n), per: PER[it.per] ? it.per : "season",
    from: isDay(it.from) ? it.from : seasonFrom(k), to: isDay(it.to) ? it.to : seasonTo(k),
    skip: (it.skip || []).filter(isDay).sort(), ser: String(it.ser || ""),
    cost: r2(nn(it.cost)), inc: optNum(it.inc), att: optNum(it.att)
  }));
  const sal = (r.sal || []).filter(Boolean).map(s => ({name: String(s.name || ""), m: SAL_M[s.m] ? s.m : "month", amt: nn(s.amt)}));
  const other = (r.other || []).filter(Boolean).map(o => ({name: String(o.name || ""), k: o.k === "in" ? "in" : "out", amt: nn(o.amt),
    rep: OTHER_REP[o.rep] ? o.rep : "month", ym: yms.has(o.ym) ? o.ym : ""}));
  return {season: k, par, items, sal, other};
}

// ===== Položky =====
// Série tréninků v sezóně podle událostí v kalendáři (pole ser.id): [{id, title, n, first, last}] seřazené podle prvního data
export function seriesIn(evs, key) {
  const from = seasonFrom(key), to = seasonTo(key), m = new Map();
  (evs || []).filter(e => e && e.ser && e.ser.id && isDay(e.date) && e.date >= from && e.date <= to).forEach(e => {
    const s = m.get(e.ser.id) || {id: e.ser.id, title: e.title || "Trénink", n: 0, first: e.date, last: e.date};
    s.n++; if (e.date < s.first) s.first = e.date; if (e.date > s.last) s.last = e.date;
    m.set(e.ser.id, s);
  });
  return [...m.values()].sort((a, b) => a.first.localeCompare(b.first));
}
// Termíny položky: opakování = datesOf (od–do, oříznuté na sezónu, bez vynechaných dnů), série = data událostí série v sezóně, počet = null
export function itemDates(it, key, evs) {
  const from = it.from > seasonFrom(key) ? it.from : seasonFrom(key), to = it.to < seasonTo(key) ? it.to : seasonTo(key);
  if (it.mode === "rule") return from > to ? [] : datesOf(it.rule, from, to, it.skip);
  if (it.mode === "ser") return (evs || []).filter(e => e && e.ser && e.ser.id === it.ser && isDay(e.date) && e.date >= seasonFrom(key) && e.date <= seasonTo(key)).map(e => e.date).sort();
  return null;
}
// Počet událostí položky po měsících sezóny {ym: n}. Počet „za sezónu“ se rozloží rovnoměrně do měsíců od–do
// (kumulativní zaokrouhlení – součet sedí přesně), „za měsíc“ = n v každém měsíci od–do.
export function itemCounts(it, key, evs) {
  const out = {}, yms = seasonYms(key);
  yms.forEach(ym => { out[ym] = 0; });
  const ds = itemDates(it, key, evs);
  if (ds) { ds.forEach(d => { const ym = d.slice(0, 7); if (ym in out) out[ym]++; }); return out; }
  const a = String(it.from || "").slice(0, 7), b = String(it.to || "").slice(0, 7), act = yms.filter(ym => ym >= a && ym <= b);
  if (!act.length) return out;
  if (it.per === "month") { act.forEach(ym => { out[ym] = it.n; }); return out; }
  act.forEach((ym, i) => { out[ym] = Math.round((i + 1) * it.n / act.length) - Math.round(i * it.n / act.length); });
  return out;
}
// Předpokládaná účast na jedné události položky (vlastní, jinak z parametrů)
export const attOf = (it, par) => (it.att != null ? it.att : par.att);
// Příjem z jedné události: ručně zadaný (inc), jinak ze šablony – pro každou platící skupinu počet jejích hráček na události
// (účast × podíl skupiny v parametrech) × (paušál, nebo náklady ÷ účast). Koeficienty hráček se nepočítají.
export function incomeOf(it, par, cfg) {
  if (it.inc != null) return r2(it.inc);
  const t = ((cfg || {}).tpls || {})[it.tpl] || DEF_TPL[it.tpl] || DEF_TPL.train, who = t.who || {};
  const att = attOf(it, par), tot = sum(BUDGET_GROUPS, g => par.n[g]);
  if (!(att > 0) || !(tot > 0)) return 0;
  const head = (+it.cost || 0) / att;
  return r2(sum(BUDGET_GROUPS, g => { const w = who[g] || {}; return w.pays ? att * par.n[g] / tot * (w.mode === "flat" ? +w.flat || 0 : head) : 0; }));
}
// Výše příspěvku v měsíci: poslední změna cH s měsícem ≤ ym, jinak základní částka
export function contribAt(par, ym) {
  let v = par.contrib;
  (par.cH || []).forEach(c => { if (c.ym <= ym) v = c.amt; });
  return v;
}

// ===== Plán po měsících =====
// Plán rozpočtu b (normalizovaný) po měsících sezóny. cfg = nastavení pokladny (šablony), evs = události v kalendáři (série).
// Vrací {months: [{ym, n, items: {id: {n, cost, inc}}, evCost, evInc, contrib, cAmt, sal, oin, oout, inc, out, saldo, cum}], items: [{id, n, cost, inc, per1}], tot}.
// Příspěvky = výše v měsíci × počet hráček s příspěvkem (jen měsíce s příspěvkem); plat „za událost“ = částka × všechny plánované události měsíce.
export function budgetPlan(b, cfg, evs) {
  const par = b.par, cm = new Set(par.cm);
  const its = b.items.map(it => ({it, cnt: itemCounts(it, b.season, evs), per1: incomeOf(it, par, cfg)}));
  let cum = 0;
  const months = seasonYms(b.season).map(ym => {
    const items = {};
    its.forEach(x => { const n = x.cnt[ym] || 0; items[x.it.id] = {n, cost: r2(n * x.it.cost), inc: r2(n * x.per1)}; });
    const vs = Object.values(items), n = sum(vs, v => v.n), evCost = r2(sum(vs, v => v.cost)), evInc = r2(sum(vs, v => v.inc));
    const cAmt = cm.has(+ym.slice(5)) ? contribAt(par, ym) : 0, contrib = r2(cAmt * par.n.monthly);
    const sal = r2(sum(b.sal, s => (s.m === "event" ? s.amt * n : s.amt)));
    const hit = o => o.rep === "month" || o.ym === ym;
    const oin = r2(sum(b.other.filter(o => o.k === "in" && hit(o)), o => o.amt)), oout = r2(sum(b.other.filter(o => o.k === "out" && hit(o)), o => o.amt));
    const inc = r2(evInc + contrib + oin), out = r2(evCost + sal + oout), saldo = r2(inc - out);
    cum = r2(cum + saldo);
    return {ym, n, items, evCost, evInc, cAmt, contrib, sal, oin, oout, inc, out, saldo, cum};
  });
  const tk = ["n", "evCost", "evInc", "contrib", "sal", "oin", "oout", "inc", "out", "saldo"], tot = {};
  tk.forEach(k => { tot[k] = r2(sum(months, m => m[k])); });
  const items = its.map(x => ({id: x.it.id, n: sum(months, m => m.items[x.it.id].n), cost: r2(sum(months, m => m.items[x.it.id].cost)), inc: r2(sum(months, m => m.items[x.it.id].inc)), per1: x.per1}));
  return {months, items, tot};
}

// ===== Odhad příspěvku =====
// Doporučený příspěvek na hráčku a měsíc, aby sezóna skončila s cílovým přebytkem (par.goal, výchozí 0):
// (výdaje − příjmy za události − ostatní příjmy + cíl) ÷ (hráčky s příspěvkem + d) ÷ měsíce s příspěvkem, nahoru na celé Kč (nejméně 0).
// d = změna počtu hráček s příspěvkem (dopad odchodu / příchodu). Vrací {need, payers, months, per, avg} (per null = nelze spočítat;
// avg = průměrný plánovaný příspěvek v měsících s příspěvkem).
export function suggestContrib(plan, par, d = 0) {
  const t = plan.tot, payers = par.n.monthly + d, M = plan.months.filter(m => par.cm.includes(+m.ym.slice(5))).length;
  const need = r2(t.out - t.evInc - t.oin + (+par.goal || 0));
  const per = payers > 0 && M > 0 ? Math.max(0, ceil(need / (payers * M))) : null;
  const cm = plan.months.filter(m => par.cm.includes(+m.ym.slice(5)));
  const avg = cm.length ? r2(sum(cm, m => m.cAmt) / cm.length) : 0;
  return {need, payers, months: M, per, avg};
}
// Varianty doporučeného příspěvku pro změnu počtu hráček s příspěvkem (výchozí −2 … +2; záporný počet se vynechá)
export const contribVariants = (plan, par, ds = [-2, -1, 0, 1, 2]) => ds.filter(d => par.n.monthly + d > 0).map(d => ({d, ...suggestContrib(plan, par, d)}));

// ===== Kontrola a dokument =====
// Chyba rozpočtu pro uložení ("" = v pořádku): pojmenované položky, opakování s dnem, série s výběrem, od ≤ do
export function budgetError(b) {
  for (const it of b.items) {
    const nm = it.name ? "„" + it.name + "“" : "bez názvu";
    if (!it.name.trim()) return "Položka bez názvu";
    if (it.from > it.to) return "Položka " + nm + ": datum od je po datu do";
    if (it.mode === "rule" && !it.rule.days.length) return "Položka " + nm + ": vyber den v týdnu";
    if (it.mode === "ser" && !it.ser) return "Položka " + nm + ": vyber sérii";
  }
  if (b.sal.some(s => !s.name.trim())) return "Plat bez jména";
  if (b.other.some(o => !o.name.trim())) return "Ostatní příjem / výdaj bez názvu";
  if (b.other.some(o => o.rep === "once" && !o.ym)) return "Jednorázový příjem / výdaj bez měsíce";
  return "";
}
// Pole dokumentu budget/{sezóna} pro zápis (merge; by a at doplní pohled)
export const budgetDoc = b => cl({season: b.season, par: b.par, items: b.items, sal: b.sal, other: b.other});
// Stejný obsah rozpočtu (rozpracovaná úprava vs. uložený)? Porovnává jen pole plánu.
export const sameBudget = (a, b) => JSON.stringify(budgetDoc(a)) === JSON.stringify(budgetDoc(b));
// Dny v týdnu ve formuláři (Po … Ne) – stejné pořadí jako u sérií
export const BUDGET_DAYS = WEEK_DAYS;

// ===== Exporty =====
// Vše exportováno u definic (export function / export const).
