// Doména: plnění rozpočtu sezóny a cashflow (čisté funkce bez DOM). Skutečnost po měsících bere z hospodaření měsíce (monthEconomy),
// události se k položkám rozpočtu přiřadí podle šablony pokladny a u více položek se stejnou šablonou podle série / dne v týdnu.
// Cashflow = zůstatek pokladny dnes + očekávané příjmy (nevybraná část plánu + nezaplacené předpisy) − očekávané výdaje (plán).
// Varování pod nulou / pod rezervou (par.res) a odchylka nad 10 % s návrhem úpravy jsou jen návrhy – nic se nemění samo.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Přiřazení událostí -> Plnění -> Cashflow -> Návrhy.

// ===== Importy =====
import {itemDates, seasonYms} from "./budget.js";
import {CAT_CONTRIB, CAT_EVENT, CAT_SALARY, r2, restOf, sumCash, tplFor} from "./cash.js";
import {chargeYm, monthEconomy, monthEvents} from "./economy.js";

// ===== Konstanty =====
// Hranice upozornění na odchylku plánu a skutečnosti (otázka 50)
export const DEV_LIMIT = 0.1;
// Kategorie pokladny, které nejsou „ostatní“ příjmy a výdaje: příspěvky, platby za události, platy a náklady událostí
// (náklady událostí se berou z vyúčtování událostí, platba za led v pokladně by je započítala dvakrát)
export const TRACK_SKIP_CATS = [CAT_CONTRIB, CAT_EVENT, CAT_SALARY, "Pronájem ledu", "Rozhodčí", "Doprava"];

// ===== Pomocné funkce =====
const sum = (a, f) => (a || []).reduce((s, x) => s + (+f(x) || 0), 0);
const ceil = x => Math.ceil(x - 1e-9);
// Den v týdnu 0 (Ne) … 6 (So) – stejně jako pravidlo opakování (datesOf)
const dow = d => new Date(d + "T12:00:00Z").getUTCDay();
// Měsíc dne "RRRR-MM-DD"
const ymOfDay = d => String(d || "").slice(0, 7);
// Relativní odchylka skutečnosti od plánu (null = plán 0)
export const devOf = (act, plan) => (plan > 0 ? r2((act - plan) / plan * 100) / 100 : null);

// ===== Přiřazení událostí =====
// Šablona pokladny události z monthEvents (uložená v evcash, jinak výchozí podle typu)
export const tplOfEvent = ev => ((ev && ev.cx) || {}).tpl || tplFor(ev.type, ((ev && ev.raw) || {}).home);
// Položka rozpočtu pro událost (id, nebo "" = mimo rozpočet). Kandidáti = položky se stejnou šablonou a obdobím od–do, které datum obsahuje.
// Pořadí: 1) položka s touž sérií, 2) položka s opakováním v daný den v týdnu, 3) položka s počtem, 4) první kandidát (otázka 49 – návrh).
export function itemOfEvent(ev, items) {
  const tpl = tplOfEvent(ev), d = ev.date, ser = (((ev.raw || {}).ser) || {}).id;
  const c = (items || []).filter(it => it.tpl === tpl && (!it.from || d >= it.from) && (!it.to || d <= it.to));
  if (!c.length) return "";
  const bySer = ser && c.find(it => it.mode === "ser" && it.ser === ser);
  if (bySer) return bySer.id;
  const byDay = c.find(it => it.mode === "rule" && it.rule.days.includes(dow(d)) && !(it.skip || []).includes(d));
  if (byDay) return byDay.id;
  const byCnt = c.find(it => it.mode === "count");
  return (byCnt || c[0]).id;
}

// ===== Plnění =====
// Ostatní příjmy a výdaje měsíce z pokladny (kategorie mimo TRACK_SKIP_CATS, podle data pohybu)
export function otherCash(cs, ym) {
  const xs = (cs || []).filter(x => ymOfDay(x.d) === ym && !TRACK_SKIP_CATS.includes(x.cat));
  return {oin: r2(sum(xs.filter(x => x.k === "in"), x => x.amt)), oout: r2(sum(xs.filter(x => x.k === "out"), x => x.amt))};
}
// Plnění rozpočtu b (normalizovaný) s plánem plan (budgetPlan) a daty D (econData) ke dni today ("RRRR-MM-DD").
// Vrací {cur, months: [{ym, st: "past" | "cur" | "fut", plan, cal, done, cost, evInc, evPaid, contrib, cPaid, cEst, sal, oin, oout, inc, out, saldo,
//   cum, fc, fcCum, dev: {inc, out}, warn}], items: [{id, name, plan, planToDate, cal, done, cost1, cost1Act, dev, warn}], free: {n, cost},
//   tot: {plan, act, fc}} – act = jen uplynulé a běžící měsíce, fc = odhad sezóny (skutečnost uplynulých měsíců + plán běžícího a dalších).
export function budgetTrack(b, plan, D, today) {
  const cur = ymOfDay(today), yms = seasonYms(b.season), its = b.items;
  const per = {};                                  // plnění položek {id: {cal, done, cost}}
  its.forEach(it => { per[it.id] = {cal: 0, done: 0, cost: 0, costDone: 0}; });
  const free = {n: 0, cost: 0};
  let cum = 0, fcCum = 0;
  const months = yms.map((ym, i) => {
    const P = plan.months[i], st = ym < cur ? "past" : ym === cur ? "cur" : "fut";
    const me = monthEconomy(ym, D), costOf = new Map(me.events.map(e => [e.id, e.cost]));
    const evs = monthEvents(ym, D);
    let done = 0;
    evs.forEach(ev => {
      const id = itemOfEvent(ev, its), c = +costOf.get(ev.id) || 0, past = ev.date < today;
      if (past) done++;
      if (!id) { free.n++; free.cost = r2(free.cost + c); return; }
      per[id].cal++; per[id].cost = r2(per[id].cost + c);
      if (past) { per[id].done++; per[id].costDone = r2(per[id].costDone + c); }
    });
    const o = otherCash(D.cs, ym);
    // Nevystavené příspěvky = odhad ze soupisky, jen v měsících, kdy se podle rozpočtu příspěvek vybírá
    const cEst = me.contrib.est, contrib = cEst && !b.par.cm.includes(+ym.slice(5)) ? 0 : r2(me.contrib.amt);
    const evInc = r2(me.evc.amt + me.evc.est);
    const inc = r2(evInc + contrib + o.oin), out = r2(me.cost.total + me.salary + o.oout), saldo = r2(inc - out);
    // Odhad: uplynulý měsíc = skutečnost, běžící a budoucí = plán (ve skutečnosti běžícího měsíce chybí ještě nevyplacené platy a výdaje)
    const fc = st === "past" ? saldo : P.saldo;
    if (st !== "fut") cum = r2(cum + saldo);
    fcCum = r2(fcCum + fc);
    const dev = {inc: devOf(inc, P.inc), out: devOf(out, P.out)};
    const warn = st === "past" && ((dev.out != null && dev.out > DEV_LIMIT) || (dev.inc != null && dev.inc < -DEV_LIMIT));
    return {ym, st, plan: P, cal: evs.length, done, cost: me.cost.total, evInc, evPaid: me.evc.paid, contrib, cPaid: me.contrib.paid, cEst,
      sal: me.salary, oin: o.oin, oout: o.oout, inc, out, saldo, cum: st === "fut" ? null : cum, fc, fcCum, dev, warn};
  });
  // Položky: plán sezóny, plán do dneška (opakování a série přesně podle dat, počet podle uplynulých měsíců), skutečnost, náklady na událost
  const items = its.map(it => {
    const pi = plan.items.find(x => x.id === it.id) || {n: 0}, ds = itemDates(it, b.season, D.ev);
    const planToDate = ds ? ds.filter(d => d < today).length : sum(plan.months.filter(m => m.ym < cur), m => (m.items[it.id] || {}).n);
    const a = per[it.id], cost1Act = a.done ? r2(a.costDone / a.done) : null;
    const dev = cost1Act != null ? devOf(cost1Act, it.cost) : null;
    const warn = (dev != null && Math.abs(dev) > DEV_LIMIT) || (planToDate > 0 && Math.abs(a.done - planToDate) / planToDate > DEV_LIMIT);
    return {id: it.id, name: it.name, plan: pi.n, planToDate, cal: a.cal, done: a.done, cost1: it.cost, cost1Act, dev, warn};
  });
  const act = months.filter(m => m.st !== "fut");
  const tot = {
    plan: {inc: plan.tot.inc, out: plan.tot.out, saldo: plan.tot.saldo},
    act: {inc: r2(sum(act, m => m.inc)), out: r2(sum(act, m => m.out)), saldo: r2(sum(act, m => m.saldo)), planSaldo: r2(sum(act, m => m.plan.saldo))},
    fc: {saldo: r2(sum(months, m => m.fc))}
  };
  return {cur, months, items, free, tot};
}

// ===== Cashflow =====
// Odhad zůstatku pokladny po měsících od běžícího měsíce do konce sezóny (u budoucí sezóny od jejího začátku).
// Zůstatek dnes = sumCash (celkem, hlavní a provozní účet). Pro měsíc ym ≥ běžící:
//  - příjmy = nevybraná část plánu (plán − už předepsané za měsíc, nejméně 0) + nezaplacené předpisy měsíce (podle měsíce události / příspěvku),
//  - výdaje = plán (u běžícího měsíce plán − už vydané v měsíci, nejméně 0; když jsou v kalendáři dražší události, jejich náklady),
//  - dluhy z dřívějších měsíců (nezaplacené předpisy) se ukážou zvlášť a do odhadu se nepočítají (nemusí přijít).
// Vrací {today: {bal, main, op}, debt, res, months: [{ym, in, out, bal, low: "" | "res" | "neg"}], first} (first = první měsíc s varováním).
export function cashflow(b, plan, D, today, cfg) {
  const cur = ymOfDay(today), res = +b.par.res || 0;
  const all = sumCash(D.cs), now = {bal: all.bal, main: sumCash(D.cs, cfg, "main").bal, op: sumCash(D.cs, cfg, "op").bal};
  const chs = (D.ch || []).map(x => ({x, ym: chargeYm(x, D)}));
  const debt = r2(sum(chs.filter(c => c.ym && c.ym < cur), c => restOf(c.x)));
  let bal = now.bal, first = null;
  const months = plan.months.filter(m => m.ym >= cur).map(P => {
    const mine = chs.filter(c => c.ym === P.ym);
    const issued = r2(sum(mine, c => c.x.amt)), unpaid = r2(sum(mine, c => restOf(c.x)));
    const inn = r2(Math.max(0, P.inc - issued) + unpaid);
    const me = monthEconomy(P.ym, D);
    let out = r2(Math.max(P.out, r2(me.cost.total + P.sal + P.oout)));
    if (P.ym === cur) out = r2(Math.max(0, out - sumCash((D.cs || []).filter(x => ymOfDay(x.d) === cur)).out));
    bal = r2(bal + inn - out);
    const low = bal < 0 ? "neg" : bal < res ? "res" : "";
    if (low && !first) first = {ym: P.ym, bal, gap: r2((low === "neg" ? 0 : res) - bal)};
    return {ym: P.ym, in: inn, out, bal, low};
  });
  return {today: now, debt, res, months, first};
}

// ===== Návrhy =====
// Návrh reakce na odhad sezóny pod cílem (par.goal) nebo na varování cashflow: chybí gap Kč.
// Vrací null (není co řešit), nebo {gap, contrib: {per, months, payers} | null, fee: {per, n} | null, fewer: {n} | null} pro období od příštího měsíce:
//  - zvýšit příspěvek o per Kč (gap ÷ hráčky s příspěvkem ÷ zbývající měsíce s příspěvkem),
//  - zvýšit platbu za událost o per Kč na událost (gap ÷ zbývající plánované události),
//  - nebo vynechat n událostí (gap ÷ průměrná ztráta jedné zbývající události; jen když to na pokrytí stačí).
export function trackAdvice(b, plan, track, flow) {
  const par = b.par;
  const gapGoal = r2((+par.goal || 0) - track.tot.fc.saldo), gapFlow = flow && flow.first ? flow.first.gap : 0;
  const gap = r2(Math.max(gapGoal, gapFlow));
  if (!(gap >= 1)) return null;
  const rest = plan.months.filter(m => m.ym > track.cur);         // měsíce po běžícím
  const cm = rest.filter(m => par.cm.includes(+m.ym.slice(5))).length, payers = par.n.monthly;
  const n = sum(rest, m => m.n), net = r2(sum(rest, m => m.evCost - m.evInc));
  return {
    gap,
    contrib: payers > 0 && cm > 0 ? {per: ceil(gap / (payers * cm)), months: cm, payers} : null,
    fee: n > 0 ? {per: ceil(gap / n), n} : null,
    fewer: n > 0 && net > 0 && ceil(gap / (net / n)) <= n ? {n: ceil(gap / (net / n))} : null
  };
}