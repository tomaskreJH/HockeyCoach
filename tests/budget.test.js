// Testy rozpočtu sezóny (domain/budget.js): klíč a měsíce sezóny, výchozí parametry ze soupisky, počty událostí položek
// (opakování, počet za sezónu / měsíc, série), příjem za událost ze šablony, změna příspěvku od měsíce, plán po měsících,
// doporučený příspěvek a varianty, převzetí z minulé sezóny, kontrola před uložením.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {cashCfg} from "../src/domain/cash.js";
import {budgetDoc, budgetError, budgetPlan, contribAt, contribVariants, copyBudget, defaultPar, defaultSal, incomeOf, itemCounts, itemDates,
  newBudget, newItem, normBudget, rosterCounts, sameBudget, seasonAdd, seasonKeyOf, seasonLabel, seasonOk, seasonYms, seriesIn, suggestContrib} from "../src/domain/budget.js";

// ===== Konstanty: modelová sezóna 2026/27 =====
const K = "2026-27";
const W = (m, s, x) => ({monthly: {pays: m, mode: "calc", flat: 0}, single: {pays: s, mode: "calc", flat: 0}, exempt: {pays: x, mode: "calc", flat: 0}});
// Pravidelný trénink 3 000 Kč (Příspěvek neplatí), mimořádný 1 000 Kč (platí všichni), domácí zápas 2 000 Kč – za událost paušál 200 Kč
const CFG = cashCfg({contrib: 500, tpls: {
  train: {name: "Pravidelný trénink", cost: [{cat: "Led", payee: "Hala", amt: 3000}], who: W(false, true, false)},
  extra: {name: "Mimořádný trénink", cost: [{cat: "Led", payee: "Hala", amt: 1000}], who: W(true, true, false)},
  home: {name: "Domácí zápas", cost: [{cat: "Led", payee: "Hala", amt: 2000}], who: {...W(false, true, false), single: {pays: true, mode: "flat", flat: 200}}}
}});
const PL = [
  {id: "a", name: "Anna", grp: "monthly"}, {id: "b", name: "Bára", grp: "monthly"}, {id: "c", name: "Cilka", grp: "monthly"},
  {id: "d", name: "Dana", grp: "single"}, {id: "e", name: "Eva", grp: "monthly", fx: 0}, {id: "x", name: "Xenie", grp: "single", ex: true},
  {id: "g", name: "Gábi", grp: "monthly", pos: "Brankář"}, {id: "z", name: "Zora", grp: "monthly", st: "end"}
];
const TR = [{id: "t1", name: "Petr", pay: {m: "month", amt: 2000}}, {id: "t2", name: "Ola", pay: {m: "event", amt: 100}}, {id: "t3", name: "Bez", pay: {m: "none"}}];
// Rozpočet: 3 s příspěvkem, 1 za událost, 0 osvobozených; účast 4; příspěvek 500 Kč (od ledna 600 Kč), jen září–červen
const B = () => normBudget({season: K, par: {n: {monthly: 3, single: 1, exempt: 0}, att: 4, contrib: 500, cH: [{ym: "2027-01", amt: 600}], cm: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6], goal: 0},
  items: [
    {id: "tr", name: "Středa", tpl: "train", mode: "rule", rule: {days: [3], every: 1}, from: "2026-09-01", to: "2026-10-31", cost: 3000},
    {id: "hm", name: "Domácí", tpl: "home", mode: "count", n: 4, per: "season", from: "2026-09-01", to: "2026-12-31", cost: 2000}
  ],
  sal: [{name: "Petr", m: "month", amt: 2000}, {name: "Ola", m: "event", amt: 100}],
  other: [{name: "Sponzor", k: "in", amt: 5000, rep: "once", ym: "2026-09"}, {name: "Dresy", k: "out", amt: 300, rep: "month"}]}, K);

// ===== Sezóna =====
test("rozpočet: klíč, popis a měsíce sezóny", () => {
  assert.equal(seasonKeyOf("2026-10-23"), "2026-27");
  assert.equal(seasonKeyOf("2027-07-15"), "2026-27");
  assert.equal(seasonKeyOf("2027-08-01"), "2027-28");
  assert.ok(seasonOk("2026-27") && seasonOk("2099-00") && !seasonOk("2026-28") && !seasonOk("2026"));
  assert.equal(seasonLabel(K), "2026/27");
  assert.equal(seasonAdd(K, -1), "2025-26");
  const y = seasonYms(K);
  assert.equal(y.length, 11);
  assert.deepEqual([y[0], y[4], y[5], y[10]], ["2026-08", "2026-12", "2027-01", "2027-06"]);
});

// ===== Výchozí hodnoty =====
test("rozpočet: výchozí parametry ze soupisky, platy z realizačního týmu", () => {
  // Bez brankářky a ukončené; koeficient 0 % a osvobozená = exempt
  assert.deepEqual(rosterCounts(PL), {monthly: 3, single: 1, exempt: 2});
  const p = defaultPar(PL, CFG, 5);
  assert.deepEqual(p.n, {monthly: 3, single: 1, exempt: 2});
  assert.equal(p.att, 5);
  assert.equal(p.contrib, 500);
  assert.equal(p.cm.length, 11);
  assert.equal(defaultPar(PL, CFG).att, 6);
  assert.deepEqual(defaultSal(TR), [{name: "Ola", m: "event", amt: 100}, {name: "Petr", m: "month", amt: 2000}]);
  const nb = newBudget(K, PL, CFG, TR, 4);
  assert.equal(nb.season, K);
  assert.deepEqual(nb.items, []);
  assert.equal(nb.sal.length, 2);
  // Nová položka: trénink = každá středa, ostatní = počet za sezónu, náklady ze šablony
  const t = newItem("train", CFG, K, "i1"), h = newItem("home", CFG, K, "i2");
  assert.equal(t.mode, "rule");
  assert.deepEqual(t.rule.days, [3]);
  assert.equal(t.cost, 3000);
  assert.equal(h.mode, "count");
  assert.equal(h.n, 10);
  assert.equal(h.from, "2026-08-01");
  assert.equal(h.to, "2027-06-30");
});

// ===== Položky =====
test("rozpočet: počty událostí po měsících – opakování, počet za sezónu / měsíc, série", () => {
  const b = B();
  // Středy září a říjen 2026: 2., 9., 16., 23., 30. 9. a 7., 14., 21., 28. 10.
  const c = itemCounts(b.items[0], K, []);
  assert.equal(c["2026-09"], 5);
  assert.equal(c["2026-10"], 4);
  assert.equal(c["2026-11"], 0);
  // Vynechaný den a každý 2. týden
  const sk = {...b.items[0], skip: ["2026-09-09"]};
  assert.equal(itemDates(sk, K, []).length, 8);
  assert.equal(itemCounts({...b.items[0], rule: {days: [3], every: 2}}, K, [])["2026-09"], 3);
  // Počet za sezónu 4 do 4 měsíců → 1 každý měsíc; 5 do 4 měsíců → součet sedí
  const h = itemCounts(b.items[1], K, []);
  assert.deepEqual([h["2026-09"], h["2026-10"], h["2026-11"], h["2026-12"], h["2027-01"]], [1, 1, 1, 1, 0]);
  const h5 = itemCounts({...b.items[1], n: 5}, K, []);
  assert.equal(Object.values(h5).reduce((s, x) => s + x, 0), 5);
  // Za měsíc: 2 v každém měsíci od–do
  const pm = itemCounts({...b.items[1], n: 2, per: "month"}, K, []);
  assert.equal(pm["2026-11"], 2);
  assert.equal(pm["2027-01"], 0);
  // Opakování mimo sezónu se ořízne
  assert.equal(itemDates({...b.items[0], from: "2026-06-01", to: "2026-08-13"}, K, []).length, 2);
  // Série z kalendáře
  const EV = [{id: "e1", title: "Sobota", date: "2026-11-07", ser: {id: "s1", i: 0}}, {id: "e2", title: "Sobota", date: "2026-11-14", ser: {id: "s1", i: 1}},
    {id: "e3", title: "Sobota", date: "2027-12-04", ser: {id: "s1", i: 2}}, {id: "e4", title: "Trénink", date: "2026-11-04"}];
  assert.deepEqual(seriesIn(EV, K), [{id: "s1", title: "Sobota", n: 2, first: "2026-11-07", last: "2026-11-14"}]);
  assert.equal(itemCounts({...b.items[0], mode: "ser", ser: "s1"}, K, EV)["2026-11"], 2);
});

test("rozpočet: příjem za událost ze šablony, ručně a výše příspěvku podle měsíce", () => {
  const b = B();
  // Trénink: platí jen Za událost (1 ze 4 hráček) → 4 × 1/4 × 3 000 / 4 = 750 Kč
  assert.equal(incomeOf(b.items[0], b.par, CFG), 750);
  // Domácí zápas: paušál 200 Kč × 1 hráčka
  assert.equal(incomeOf(b.items[1], b.par, CFG), 200);
  // Vlastní účast a ruční příjem
  assert.equal(incomeOf({...b.items[1], att: 8}, b.par, CFG), 400);
  assert.equal(incomeOf({...b.items[0], inc: 1234}, b.par, CFG), 1234);
  // Mimořádný trénink: platí všichni → celé náklady
  assert.equal(incomeOf({...b.items[0], tpl: "extra", cost: 1000}, b.par, CFG), 1000);
  // Bez účasti nebo hráček nula
  assert.equal(incomeOf(b.items[0], {...b.par, att: 0}, CFG), 0);
  assert.equal(contribAt(b.par, "2026-12"), 500);
  assert.equal(contribAt(b.par, "2027-01"), 600);
  assert.equal(contribAt(b.par, "2027-06"), 600);
});

// ===== Plán po měsících =====
test("rozpočet: plán po měsících, součty a kumulativní saldo", () => {
  const b = B(), pl = budgetPlan(b, CFG, []);
  const m = ym => pl.months.find(x => x.ym === ym);
  // Srpen: bez příspěvku, bez událostí, plat 2 000 + dresy 300
  assert.deepEqual([m("2026-08").contrib, m("2026-08").n, m("2026-08").out, m("2026-08").saldo], [0, 0, 2300, -2300]);
  // Září: 5 tréninků + 1 zápas; náklady 15 000 + 2 000, za události 5 × 750 + 200, příspěvky 3 × 500, sponzor 5 000,
  // platy 2 000 + 6 × 100, dresy 300
  const s = m("2026-09");
  assert.equal(s.n, 6);
  assert.equal(s.evCost, 17000);
  assert.equal(s.evInc, 3950);
  assert.equal(s.contrib, 1500);
  assert.equal(s.oin, 5000);
  assert.equal(s.sal, 2600);
  assert.equal(s.out, 19900);
  assert.equal(s.saldo, r(3950 + 1500 + 5000 - 19900));
  // Leden: příspěvek 600 Kč
  assert.equal(m("2027-01").contrib, 1800);
  // Součty a kumulace
  const tot = pl.months.reduce((a, x) => a + x.saldo, 0);
  assert.equal(pl.tot.saldo, r(tot));
  assert.equal(pl.months[10].cum, pl.tot.saldo);
  const it = pl.items.find(x => x.id === "tr");
  assert.deepEqual([it.n, it.cost, it.inc, it.per1], [9, 27000, 6750, 750]);
});
const r = n => Math.round(n * 100) / 100;

// ===== Odhad příspěvku =====
test("rozpočet: doporučený příspěvek, varianty a cílový přebytek", () => {
  const b = B(), pl = budgetPlan(b, CFG, []), s = suggestContrib(pl, b.par);
  const need = r(pl.tot.out - pl.tot.evInc - pl.tot.oin);
  assert.equal(s.need, need);
  assert.equal(s.months, 10);
  assert.equal(s.payers, 3);
  assert.equal(s.per, Math.ceil(need / 30));
  // Průměr plánovaného příspěvku: 4 měsíce po 500, 6 po 600
  assert.equal(s.avg, 560);
  // S plánovaným příspěvkem rovným doporučenému vyjde saldo ≥ 0
  const b2 = normBudget({...b, par: {...b.par, contrib: s.per, cH: []}}, K);
  assert.ok(budgetPlan(b2, CFG, []).tot.saldo >= 0);
  assert.ok(budgetPlan(b2, CFG, []).tot.saldo < 30);
  // Cílový přebytek zvýší potřebu
  const g = suggestContrib(pl, {...b.par, goal: 3000});
  assert.equal(g.need, r(need + 3000));
  // Varianty: méně hráček = vyšší příspěvek, bez nekladného počtu
  const v = contribVariants(pl, b.par);
  assert.deepEqual(v.map(x => x.d), [-2, -1, 0, 1, 2]);
  assert.ok(v[0].per > v[4].per);
  assert.deepEqual(contribVariants(pl, {...b.par, n: {...b.par.n, monthly: 1}}).map(x => x.d), [0, 1, 2]);
  // Bez měsíců s příspěvkem nelze spočítat
  assert.equal(suggestContrib(pl, {...b.par, cm: []}).per, null);
});

// ===== Převzetí a kontrola =====
test("rozpočet: převzetí z minulé sezóny, normalizace, kontrola a dokument", () => {
  const prev = normBudget({...budgetDoc(B()), season: "2025-26", items: [{...B().items[0], from: "2025-09-01", to: "2025-10-31", skip: ["2025-09-10"]}, {id: "sr", name: "Série", mode: "ser", ser: "s1"}],
    par: {...B().par, cH: [{ym: "2026-01", amt: 600}]}, other: [{name: "Sponzor", k: "in", amt: 5000, rep: "once", ym: "2025-09"}]}, "2025-26");
  const c = copyBudget(prev, K);
  assert.equal(c.season, K);
  assert.deepEqual([c.items[0].from, c.items[0].to, c.items[0].skip], ["2026-09-01", "2026-10-31", []]);
  assert.equal(c.items[1].mode, "count");
  assert.equal(c.par.cH[0].ym, "2027-01");
  assert.equal(c.other[0].ym, "2026-09");
  // Normalizace: neplatné hodnoty
  const n = normBudget({items: [{name: "X", mode: "??", n: "-3", cost: "abc", inc: "", rule: {days: [9, 2], every: 5}}], other: [{name: "Y", rep: "once", ym: "2030-01"}]}, K);
  assert.deepEqual([n.items[0].mode, n.items[0].n, n.items[0].cost, n.items[0].inc, n.items[0].rule.days, n.items[0].rule.every], ["count", 0, 0, null, [2], 1]);
  assert.equal(n.other[0].ym, "");
  assert.equal(n.season, K);
  // Kontrola
  assert.equal(budgetError(B()), "");
  assert.match(budgetError(normBudget({items: [{name: "", mode: "count"}]}, K)), /bez názvu/);
  assert.match(budgetError(normBudget({items: [{name: "A", mode: "rule", rule: {days: []}}]}, K)), /den v týdnu/);
  assert.match(budgetError(normBudget({items: [{name: "A", mode: "ser"}]}, K)), /sérii/);
  assert.match(budgetError(normBudget({items: [{name: "A", from: "2027-01-01", to: "2026-12-01"}]}, K)), /od je po/);
  assert.match(budgetError(n), /bez měsíce/);
  // Dokument jen s poli plánu a porovnání
  assert.deepEqual(Object.keys(budgetDoc(B())).sort(), ["items", "other", "par", "sal", "season"]);
  assert.ok(sameBudget(B(), normBudget(budgetDoc(B()), K)));
  assert.ok(!sameBudget(B(), normBudget({...budgetDoc(B()), par: {...B().par, att: 9}}, K)));
});
