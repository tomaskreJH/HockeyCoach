// Testy v22.5: 🔁 převody mezi účty (sumCash, trCheck), účet s číslem (accLabel), měsíc výdaje (forYm)
// a 🧾 kontrola nákladů událostí (src/domain/cost-check.js).
import {test} from "node:test";
import assert from "node:assert/strict";
import {accLabel, cashCfg, forYm, sumCash, trCheck, trFrom, trTo} from "../src/domain/cash.js";
import {costMonth, costPeriod, payeeKey, ymRange} from "../src/domain/cost-check.js";

// ===== Data =====
const CFG = cashCfg({iban: "CZ6508000000192000145399", iban2: "CZ6907100000000000123457"});
const ICE = {cat: "Pronájem ledu", payee: "Zimní stadion", amt: 2000};
const REF = {cat: "Rozhodčí", payee: "", amt: 600};
const D = cs => ({
  ev: [{id: "t1", date: "2026-10-06", title: "Trénink"}, {id: "t2", date: "2026-10-13", title: "Trénink"}, {id: "t3", date: "2026-10-30", title: "Trénink"}],
  ma: [{id: "m1", date: "2026-10-18", opp: "Sokol", home: true}],
  ec: [{id: "t1", cost: [ICE]}, {id: "t2", cost: [ICE]}, {id: "t3", cost: [ICE]}, {id: "m1", cost: [ICE, REF], settle: {cost: [{...ICE, amt: 2500}, REF], total: 3100}}],
  cs: cs || [], cfg: CFG
});

// ===== Převody =====
test("sumCash: převod mění zůstatky účtů, ne příjmy a výdaje týmu", () => {
  const cs = [{k: "in", amt: 1000, acc: "main"}, {k: "tr", amt: 300, from: "main", to: "op"}, {k: "out", amt: 100, acc: "op"}];
  assert.deepEqual(sumCash(cs), {in: 1000, out: 100, bal: 900});
  assert.deepEqual(sumCash(cs, CFG, "main"), {in: 1000, out: 0, tr: {in: 0, out: 300}, bal: 700});
  assert.deepEqual(sumCash(cs, CFG, "op"), {in: 0, out: 100, tr: {in: 300, out: 0}, bal: 200});
});

test("trFrom / trTo a trCheck", () => {
  assert.equal(trFrom({from: "op"}), "op");
  assert.equal(trTo({from: "op"}), "main");
  assert.equal(trTo({}), "op");
  assert.ok(trCheck({from: "main", to: "op", amt: "100", d: "2026-10-01"}, false).err);
  assert.ok(trCheck({from: "main", to: "main", amt: "100", d: "2026-10-01"}, true).err);
  assert.ok(trCheck({from: "main", to: "op", amt: "0", d: "2026-10-01"}, true).err);
  assert.ok(trCheck({from: "main", to: "op", amt: "10", d: ""}, true).err);
  assert.deepEqual(trCheck({from: "main", to: "op", amt: "150,5", d: "2026-10-01"}, true), {amt: 150.5});
});

test("accLabel: název účtu s číslem účtu v českém tvaru", () => {
  assert.equal(accLabel(CFG, "main"), "Hlavní účet 19-2000145399/0800");
  assert.equal(accLabel(cashCfg({iban: "CZ6508000000192000145399"}), "op"), "Účet týmu 19-2000145399/0800");
});

test("forYm: měsíc výdaje podle pym, jinak podle data", () => {
  assert.equal(forYm({d: "2026-11-05", pym: "2026-10"}), "2026-10");
  assert.equal(forYm({d: "2026-11-05", pym: "x"}), "2026-11");
});

// ===== Kontrola nákladů =====
test("costMonth: očekávané náklady po kategorii a příjemci, uzavřená událost bere snapshot", () => {
  const m = costMonth("2026-10", D(), "2026-10-20");
  const ice = m.rows.find(r => r.cat === "Pronájem ledu"), ref = m.rows.find(r => r.cat === "Rozhodčí");
  assert.equal(ice.n, 4); assert.equal(ice.nFut, 1);
  assert.equal(ice.exp, 8500); assert.equal(ice.due, 6500);   // t3 (30. 10.) je ještě budoucí
  assert.equal(ice.st, "wait"); assert.equal(ice.rest, 6500);
  assert.equal(ref.exp, 600); assert.equal(m.rest, 7100);
});

test("costMonth: led zaplacený zpětně (pym) se spáruje podle příjemce, rozhodčí bez příjemce podle kategorie", () => {
  const cs = [{id: "a", k: "out", d: "2026-11-04", pym: "2026-10", cat: "Pronájem ledu", payee: "zimni  STADION", amt: 8500},
    {id: "b", k: "out", d: "2026-10-18", cat: "Rozhodčí", amt: 600}, {id: "c", k: "out", d: "2026-10-02", cat: "Vybavení", amt: 900},
    {id: "d", k: "in", d: "2026-10-02", cat: "Pronájem ledu", amt: 50}];
  const m = costMonth("2026-10", D(cs), "2026-11-10");
  assert.deepEqual(m.rows.map(r => [r.cat, r.paid, r.st]), [["Pronájem ledu", 8500, "ok"], ["Rozhodčí", 600, "ok"]]);
  assert.equal(m.rest, 0);
  // Listopad: výdaj za říjen se do listopadu nepočítá
  assert.equal(costMonth("2026-11", D(cs), "2026-11-10").rows.length, 0);
});

test("costMonth: přeplatek a výdaj bez události", () => {
  const cs = [{id: "a", k: "out", d: "2026-10-31", cat: "Rozhodčí", amt: 900}, {id: "b", k: "out", d: "2026-10-31", cat: "Časomíra", pym: "2026-10", amt: 300}];
  const m = costMonth("2026-10", D(cs), "2026-11-10");
  assert.equal(m.rows.find(r => r.cat === "Rozhodčí").st, "over");
  const x = m.rows.find(r => r.cat === "Časomíra");
  assert.equal(x.st, "extra"); assert.equal(x.paid, 300);
  assert.equal(m.over, 600);
});

test("costPeriod a ymRange", () => {
  assert.deepEqual(ymRange("2026-09", "2026-11"), ["2026-11", "2026-10", "2026-09"]);
  assert.deepEqual(ymRange("2026-12", "2026-11"), []);
  const p = costPeriod(ymRange("2026-09", "2026-11"), D(), "2026-11-10");
  assert.equal(p.months.length, 1);
  assert.equal(p.rest, 9100);
  assert.equal(payeeKey(" Zimní  Stadion "), "zimni stadion");
});
