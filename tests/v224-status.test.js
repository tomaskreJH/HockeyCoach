// Testy v22.4: ⚖️ detail tarifu hráčky (domain/tariff-detail.js), 🔓 hromadné výjimky z blokace (domain/block-exc.js)
// a stav události na kartě – 💰 vyúčtování a 🏒 trénink (domain/event-status.js). Výpočty pokladny se nemění, jen čtou.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {contribEid} from "../src/domain/cash.js";
import {excRows, excTargets} from "../src/domain/block-exc.js";
import {cashState, trainState} from "../src/domain/event-status.js";
import {reliefHint, tariffDetail} from "../src/domain/tariff-detail.js";

// ===== Konstanty: modelová sezóna 2026/27 =====
const D = {ev: [{id: "t1", title: "Trénink", date: "2026-11-04"}, {id: "t2", title: "Trénink", date: "2026-11-11"}], ma: []};
const W = m => ({monthly: {pays: m}, single: {pays: true, mode: "calc"}, exempt: {pays: false}});
const EC = [{id: "t1", settle: {n: 10, total: 3000, who: W(false)}}, {id: "t2", settle: {n: 12, total: 3600, who: W(false)}}];
const PR = [{id: "t1", ym: "2026-11", date: "2026-11-04", head: {monthly: 0, single: 300, exempt: 0}},
  {id: "t2", ym: "2026-11", date: "2026-11-11", head: {monthly: 0, single: 300, exempt: 0}}];
const C11 = contribEid("2026-11");
const DAY = 86400000, NOW = new Date("2026-11-20T12:00:00").getTime();

// ===== ⚖️ Detail tarifu =====
test("tariffDetail: měsíce, navštívené události, využití a dopad na ostatní", () => {
  const ch = [
    {id: "a1", mid: "a", eid: C11, kind: "contrib", amt: 1000, paid: 1000},
    {id: "b1", mid: "b", eid: C11, kind: "contrib", amt: 1000, paid: 0},
    {id: "c1", mid: "c", eid: C11, kind: "contrib", amt: 1000, paid: 1000}
  ];
  const went = eid => eid === "t1";   // byla jen na prvním tréninku
  const d = tariffDetail({id: "a", grp: "monthly"}, D, ch, PR, EC, went, 1000, "2026-11", "2026-11-20");
  assert.equal(d.grp, "monthly"); assert.equal(d.alt, "single");
  assert.equal(d.months.length, 1);
  assert.equal(d.months[0].items.length, 1); assert.equal(d.months[0].items[0].contrib, true);
  assert.equal(d.months[0].went.length, 1);
  const e = d.months[0].went[0];
  assert.equal(e.value, 300); assert.equal(e.mine, 0); assert.equal(e.altAmt, 300); assert.equal(e.covered, true);
  assert.deepEqual(d.use, {n: 1, value: 300, act: 1000, pct: 30});
  assert.equal(reliefHint(d), true);                     // využití 30 % < 50 %
  assert.equal(d.team.lost, 1000); assert.equal(d.team.c.amt, 1000); assert.equal(d.team.c.inc, 500);   // 2 další s příspěvkem
  assert.equal(d.better, "single");
});
test("tariffDetail: osvobozená – bez porovnání, události a dopad zůstávají; poplatek události rozpočítán na spoluplatící", () => {
  const ch = [
    {id: "x1", mid: "x", eid: "t1", kind: "event", amt: 300, paid: 300},
    {id: "y1", mid: "y", eid: "t1", kind: "event", amt: 300, paid: 300},
    {id: "z1", mid: "z", eid: "t1", kind: "event", amt: 300, paid: 0}
  ];
  const d = tariffDetail({id: "x", grp: "single", ex: true}, D, ch, PR, EC, eid => eid === "t1", 1000, "2026-11", "2026-11-20");
  assert.equal(d.skip, "exempt");
  assert.equal(d.months[0].went[0].mine, 300);
  assert.equal(d.team.ev.amt, 300); assert.equal(d.team.ev.inc, 150); assert.equal(d.team.ev.n, 1);
  assert.equal(reliefHint(d), false);
  assert.equal(tariffDetail(null, D, ch, PR, EC, () => true, 0, "2026-11", "2026-11-20"), null);
});

// ===== 🔓 Hromadné výjimky =====
test("excRows / excTargets: jen po splatnosti, blokované vs. s výjimkou, volitelně i před splatností", () => {
  const past = new Date(NOW - 5 * DAY).toISOString(), fut = new Date(NOW + 5 * DAY).toISOString();
  const ch = [
    {id: "1", mid: "a", amt: 100, paid: 0, due: past},
    {id: "2", mid: "a", amt: 200, paid: 0, due: fut},
    {id: "3", mid: "b", amt: 100, paid: 0, due: past, exc: true},
    {id: "4", mid: "c", amt: 100, paid: 100, due: past},        // zaplaceno
    {id: "5", mid: "d", amt: 100, paid: 0, due: fut},           // ještě není po splatnosti
    {id: "6", mid: "t", amt: 100, paid: 0, due: past}           // realizační tým – vynechán
  ];
  const R = excRows(ch, mid => mid !== "t", NOW);
  assert.deepEqual(R.map(r => r.mid), ["a", "b"]);
  const a = R.find(r => r.mid === "a");
  assert.equal(a.blocked, true); assert.equal(a.over, 100); assert.equal(a.debt, 300); assert.equal(a.days, 5);
  assert.equal(R.find(r => r.mid === "b").blocked, false);
  assert.deepEqual(excTargets(ch, R, ["a", "b"], true, false), ["1"]);
  assert.deepEqual(excTargets(ch, R, ["a"], true, true), ["1", "2"]);
  assert.deepEqual(excTargets(ch, R, ["a", "b"], false, false), ["3"]);
});

// ===== Stav události na kartě =====
test("cashState: uzavřeno s placením, po splatnosti, neuzavřené uplynulé, budoucí nic", () => {
  const past = new Date(NOW - DAY).toISOString();
  const e = {id: "t1", date: "2026-11-04", raw: {ss: true}, cx: {settle: {total: 3000}}};
  const c = cashState(e, [{amt: 300, paid: 300}, {amt: 300, paid: 100, due: past}, {amt: 300, paid: 0}], "2026-11-20", NOW);
  assert.equal(c.st, "set"); assert.equal(c.n, 3); assert.equal(c.paid, 1); assert.equal(c.got, 400); assert.equal(c.amt, 900);
  assert.equal(c.over, 1); assert.equal(c.all, false); assert.equal(c.cost, 3000);
  const open = cashState({id: "t2", date: "2026-11-11", raw: {}, cx: {cost: [{amt: 2000}]}}, [], "2026-11-20", NOW);
  assert.equal(open && open.st, "open");
  assert.equal(cashState({id: "t3", date: "2026-12-01", raw: {}, cx: {cost: [{amt: 2000}]}}, [], "2026-11-20", NOW), null);
  assert.equal(cashState({id: "t4", date: "2026-11-01", raw: {}, cx: {}}, [], "2026-11-20", NOW), null);
});
test("trainState: plán, průběh a počet ohodnocených hráček", () => {
  assert.deepEqual(trainState(null, null, null), {plan: 0, live: "", rated: 0});
  const s = trainState({blocks: [{}, {}]}, {st: "end"}, {r: {k1: {pl: {a: {r: 2}, b: {r: 0}}}, k2: {pl: {a: {r: 1}, c: {r: 3}}}}});
  assert.deepEqual(s, {plan: 2, live: "end", rated: 2});
  assert.equal(trainState(null, {st: "xyz"}, null).live, "");
});
