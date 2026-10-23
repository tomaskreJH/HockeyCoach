// Testy plnění rozpočtu a cashflow (domain/budget-track.js): přiřazení událostí k položkám podle šablony, série a dne v týdnu,
// plnění po měsících (plán / v kalendáři / proběhlo), položky do dneška, odhad sezóny, cashflow (zůstatek, nevybraný plán,
// nezaplacené předpisy, dluhy zvlášť, rezerva) a návrh reakce.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {budgetPlan, normBudget} from "../src/domain/budget.js";
import {DEV_LIMIT, budgetTrack, cashflow, devOf, itemOfEvent, otherCash, tplOfEvent, trackAdvice} from "../src/domain/budget-track.js";
import {cashCfg} from "../src/domain/cash.js";
import {monthEvents} from "../src/domain/economy.js";

// ===== Konstanty: modelová sezóna 2026/27, dnes 15. 10. 2026 =====
const K = "2026-27", TODAY = "2026-10-15";
const W = (m, s, x) => ({monthly: {pays: m, mode: "calc", flat: 0}, single: {pays: s, mode: "calc", flat: 0}, exempt: {pays: x, mode: "calc", flat: 0}});
// Pravidelný trénink 1 000 Kč (Příspěvek neplatí, za událost platí), domácí zápas 2 000 Kč, venkovní bez nákladů
const CFG = cashCfg({contrib: 500, tpls: {
  train: {name: "Pravidelný trénink", cost: [{cat: "Led", payee: "Hala", amt: 1000}], who: W(false, true, false)},
  home: {name: "Domácí zápas", cost: [{cat: "Led", payee: "Hala", amt: 2000}], who: W(false, true, false)}
}});
const PL = [{id: "a", name: "Anna", grp: "monthly"}, {id: "b", name: "Bára", grp: "monthly"}, {id: "d", name: "Dana", grp: "single"}];
// Rozpočet: středa a pondělí (dvě položky se stejnou šablonou), série, 2 domácí zápasy za sezónu v září – říjnu, rezerva 1 000 Kč
const B = (par = {}) => normBudget({season: K,
  par: {n: {monthly: 2, single: 1, exempt: 0}, att: 3, contrib: 500, cm: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6], goal: 0, res: 1000, ...par},
  items: [
    {id: "st", name: "Středa", tpl: "train", mode: "rule", rule: {days: [3], every: 1}, from: "2026-09-01", to: "2026-10-31", cost: 1000, inc: 0},
    {id: "po", name: "Pondělí", tpl: "train", mode: "rule", rule: {days: [1], every: 1}, from: "2026-09-01", to: "2026-09-30", cost: 1000, inc: 0},
    {id: "se", name: "Série pátek", tpl: "train", mode: "ser", ser: "S1", cost: 1000, inc: 0},
    {id: "hm", name: "Domácí", tpl: "home", mode: "count", n: 2, per: "season", from: "2026-09-01", to: "2026-10-31", cost: 2000, inc: 0}
  ], sal: [], other: []}, K);
// Kalendář: 2 středy v září (1 se změněnou šablonou na nic), pondělí, pátek ze série, domácí a venkovní zápas, středa 14. 10. a 21. 10.
const EV = [
  {id: "e1", title: "Trénink", date: "2026-09-02"}, {id: "e2", title: "Trénink", date: "2026-09-09"},
  {id: "e3", title: "Trénink", date: "2026-09-07"}, {id: "e4", title: "Pátek", date: "2026-09-11", ser: {id: "S1", i: 0}},
  {id: "e5", title: "Trénink", date: "2026-10-14"}, {id: "e6", title: "Trénink", date: "2026-10-21"}
];
const MA = [{id: "m1", opp: "Sokol", date: "2026-09-20", home: true}, {id: "m2", opp: "Lvice", date: "2026-10-04", home: false}];
const D = (over = {}) => ({ev: EV, ma: MA, ec: [], ch: [], cs: [], pl: PL, cfg: CFG, players: () => [], ...over});

// ===== Přiřazení událostí =====
test("plnění: šablona události a přiřazení k položce (série, den v týdnu, počet, mimo rozpočet)", () => {
  const b = B(), evs = [...monthEvents("2026-09", D()), ...monthEvents("2026-10", D())], by = Object.fromEntries(evs.map(e => [e.id, itemOfEvent(e, b.items)]));
  assert.equal(tplOfEvent(evs.find(e => e.id === "m2")), "away");
  assert.deepEqual(by, {e1: "st", e2: "st", e3: "po", e4: "se", m1: "hm", e5: "st", m2: "", e6: "st"});
  // Šablona uložená v evcash má přednost; vynechaný den položky se nepočítá do „dne v týdnu“
  const ex = {...evs.find(e => e.id === "e2"), cx: {tpl: "home"}};
  assert.equal(itemOfEvent(ex, b.items), "hm");
  const sk = normBudget({...b, items: [{...b.items[0], skip: ["2026-09-02"]}, b.items[3]]}, K);
  assert.equal(itemOfEvent(evs.find(e => e.id === "e1"), sk.items), "st");    // jediný kandidát se šablonou – zůstane
  assert.equal(devOf(110, 100), 0.1);
  assert.equal(devOf(5, 0), null);
});

// ===== Plnění po měsících =====
test("plnění: měsíce (uplynulý / běžící / budoucí), události v kalendáři a proběhlé, položky do dneška, mimo rozpočet", () => {
  const b = B(), plan = budgetPlan(b, CFG, EV), t = budgetTrack(b, plan, D(), TODAY);
  const sep = t.months.find(m => m.ym === "2026-09"), oct = t.months.find(m => m.ym === "2026-10"), nov = t.months.find(m => m.ym === "2026-11");
  assert.equal(t.cur, "2026-10");
  assert.deepEqual([sep.st, oct.st, nov.st], ["past", "cur", "fut"]);
  assert.deepEqual([sep.cal, sep.done, oct.cal, oct.done], [5, 5, 3, 2]);
  // Náklady září podle šablon pokladny: 4 tréninky × 1 000 + domácí 2 000
  assert.equal(sep.cost, 6000);
  assert.equal(sep.out, 6000);
  assert.equal(nov.cum, null);
  // Nevystavené příspěvky: odhad ze soupisky jen v měsících s příspěvkem (srpen ne, září 2 × 500 Kč)
  assert.deepEqual([t.months[0].contrib, sep.contrib, sep.cEst], [0, 1000, true]);
  // Plán září: 5 střed + 4 pondělí + pátek ze série + domácí zápas (2 za září – říjen → 1)
  assert.equal(sep.plan.n, 11);
  assert.equal(sep.warn, false);                                 // výdaje pod plánem → bez varování (varuje jen překročení)
  const it = Object.fromEntries(t.items.map(x => [x.id, x]));
  assert.deepEqual([it.st.planToDate, it.st.done, it.st.cal], [7, 3, 4]);
  assert.deepEqual([it.po.planToDate, it.po.done, it.po.cost1Act], [4, 1, 1000]);
  assert.equal(it.st.warn, true);                                // 3 proběhlé ze 7 plánovaných
  assert.equal(it.hm.planToDate, 1);
  assert.deepEqual(t.free, {n: 1, cost: 0});                     // venkovní zápas mimo rozpočet
  // Odhad sezóny: září skutečnost, od října plán
  assert.equal(t.tot.fc.saldo, Math.round((sep.saldo + t.months.filter(m => m.st !== "past").reduce((s, m) => s + m.plan.saldo, 0)) * 100) / 100);
});

test("plnění: ostatní příjmy a výdaje z pokladny bez kategorií událostí, odchylka nad 10 %", () => {
  const cs = [
    {k: "in", amt: 3000, cat: "Vklady / dary", d: "2026-09-05"}, {k: "out", amt: 400, cat: "Vybavení", d: "2026-09-06"},
    {k: "out", amt: 1000, cat: "Pronájem ledu", d: "2026-09-06"}, {k: "in", amt: 500, cat: "Příspěvky", d: "2026-09-06"}
  ];
  assert.deepEqual(otherCash(cs, "2026-09"), {oin: 3000, oout: 400});
  // Plán s náklady 100 Kč na událost → skutečné výdaje září nad plánem o víc než 10 %
  const b = B(), lo = normBudget({...b, items: b.items.map(i => ({...i, cost: 100}))}, K);
  const t = budgetTrack(lo, budgetPlan(lo, CFG, EV), D({cs}), TODAY), sep = t.months[1];
  assert.equal(sep.oout, 400);
  assert.ok(sep.dev.out > DEV_LIMIT);
  assert.equal(sep.warn, true);
});

// ===== Cashflow =====
test("cashflow: zůstatek dnes, nevybraný plán a nezaplacené předpisy, dluhy zvlášť, varování pod rezervou a pod nulou", () => {
  const b = B({contrib: 0, cm: []}), plan = budgetPlan(b, CFG, EV);
  const cs = [{k: "in", amt: 5000, cat: "Vklady / dary", d: "2026-08-10"}, {k: "out", amt: 1000, cat: "Pronájem ledu", d: "2026-10-02"}];
  const ch = [
    {id: "c_2026-09_a", eid: "c_2026-09", kind: "contrib", mid: "a", amt: 500, paid: 0, due: "2026-09-10T23:59"},
    {id: "e5_d", eid: "e5", kind: "event", mid: "d", amt: 300, paid: 100, due: "2026-10-20T23:59"}
  ];
  const f = cashflow(b, plan, D({cs, ch}), TODAY, CFG), oct = f.months[0], nov = f.months[1];
  assert.deepEqual(f.today, {bal: 4000, main: 4000, op: 0});
  assert.equal(f.debt, 500);                                     // zářijový příspěvek nezaplacený – jen zvlášť
  assert.equal(oct.ym, "2026-10");
  // Říjen: příjem = plán 0 − předepsáno 300 (nejméně 0) + nezaplaceno 200; výdaje = kalendář (3 tréninky + 0) vs. plán, minus vydané 1 000
  assert.equal(oct.in, 200);
  assert.equal(oct.out, Math.max(plan.months[2].out, 3000) - 1000);
  assert.equal(oct.bal, 4000 + 200 - oct.out);
  assert.equal(nov.out, plan.months[3].out);
  assert.equal(f.res, 1000);
  assert.ok(f.months.every(m => m.low === (m.bal < 0 ? "neg" : m.bal < 1000 ? "res" : "")));
  assert.equal(f.first.ym, f.months.find(m => m.low).ym);
});

// ===== Návrhy =====
test("návrh: chybějící částka → příspěvek, platba za událost, méně událostí; bez schodku null", () => {
  const b = B({goal: 0, res: 0}), plan = budgetPlan(b, CFG, EV), t = budgetTrack(b, plan, D(), TODAY);
  const a = trackAdvice(b, plan, t, null);
  assert.ok(a && a.gap === -t.tot.fc.saldo);
  // Po říjnu: měsíce s příspěvkem listopad – červen (8), plánované události jen středy do 31. 10. → žádné zbývající události
  assert.deepEqual(a.contrib, {per: Math.ceil(a.gap / (2 * 8) - 1e-9), months: 8, payers: 2});
  assert.equal(a.fee, null);
  assert.equal(a.fewer, null);
  // Vysoký příspěvek → odhad nad cílem, návrh není potřeba
  const rich = B({contrib: 5000, res: 0}), pr = budgetPlan(rich, CFG, EV);
  assert.equal(trackAdvice(rich, pr, budgetTrack(rich, pr, D(), TODAY), null), null);
  // Varování cashflow: chybějící částka do rezervy
  assert.equal(trackAdvice(rich, pr, budgetTrack(rich, pr, D(), TODAY), {first: {gap: 700}}).gap, 700);
  // Se zbývajícími středami do června: platba za událost a vynechání jedné události (ztráta 1 000 Kč na událost) stačí
  const long = normBudget({...rich, items: [{...rich.items[0], to: "2027-06-30"}]}, K), pg = budgetPlan(long, CFG, EV);
  const al = trackAdvice(long, pg, budgetTrack(long, pg, D(), TODAY), {first: {gap: 700}}), n = pg.months.filter(m => m.ym > "2026-10").reduce((x, m) => x + m.n, 0);
  assert.deepEqual([al.fee, al.fewer], [{per: Math.ceil(700 / n), n}, {n: 1}]);
});
