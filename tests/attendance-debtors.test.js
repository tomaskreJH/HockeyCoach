// Testy docházky (src/domain/attendance.js) a souhrnu dlužníků bez částek (src/domain/debtors.js).
// Hlídají: sezónu 1. 8. – 1. 7., počítání jen uplynulých událostí, procento účasti, dokument dlužníka bez částek,
// plán zápisu po změně předpisů a výpočet ⛓ / 🔓 a dní po splatnosti.
import {test} from "node:test";
import assert from "node:assert/strict";
import {attEvents, attSummary, hasAnswer, pastEvents, seasonOf} from "../src/domain/attendance.js";
import {applyDebtors, debtorDoc, debtorPlanFor, debtorRebuild, debtorState} from "../src/domain/debtors.js";

// ===== Docházka =====
test("seasonOf: zimní sezóna od 1. 8. do 1. 7. dalšího roku", () => {
  assert.deepEqual(seasonOf("2026-10-22"), {from: "2026-08-01", to: "2027-07-01"});
  assert.deepEqual(seasonOf("2027-03-01"), {from: "2026-08-01", to: "2027-07-01"});
  assert.deepEqual(seasonOf("2026-08-01"), {from: "2026-08-01", to: "2027-07-01"});
});

test("attEvents + pastEvents: druh události a jen uplynulé události v období", () => {
  const evs = attEvents([{id: "t1", date: "2026-10-01", time: "18:00"}, {id: "t2", date: "2026-12-01"}], [{id: "m1", date: "2026-10-05", home: true}, {id: "m2", date: "2026-10-06"}]);
  assert.deepEqual(evs.map(e => [e.id, e.kind]), [["t1", "train"], ["t2", "train"], ["m1", "home"], ["m2", "away"]]);
  const now = new Date("2026-10-10T12:00:00").getTime();
  assert.deepEqual(pastEvents(evs, "2026-08-01", "2027-07-01", now).map(e => e.id), ["t1", "m1", "m2"]);
  assert.deepEqual(pastEvents(evs, "2026-10-02", "", now).map(e => e.id), ["m1", "m2"]);
});

test("attSummary: účast = Jdu, procento z počtu událostí daného typu", () => {
  const evs = [{id: "e1", kind: "train"}, {id: "e2", kind: "train"}, {id: "e3", kind: "home"}];
  const at = [{eid: "e1", pid: "a", st: "yes"}, {eid: "e2", pid: "a", st: "no"}, {eid: "e3", pid: "a", st: "maybe"}];
  const r = attSummary(evs, at, ["a", "b"]);
  assert.deepEqual({n: r.a.all.n, yes: r.a.all.yes, no: r.a.all.no, maybe: r.a.all.maybe, pct: r.a.all.pct}, {n: 3, yes: 1, no: 1, maybe: 1, pct: 33});
  assert.equal(r.a.train.pct, 50);
  assert.equal(r.a.away.pct, null, "žádný venkovní zápas v období");
  assert.equal(r.b.all.none, 3);
  assert.equal(hasAnswer(evs, at, "a"), true);
  assert.equal(hasAnswer(evs, at, "b"), false);
});

// ===== Dlužníci =====
const CH = [
  {id: "c1", mid: "a", amt: 100, paid: 0, due: "2026-10-01"},
  {id: "c2", mid: "a", amt: 50, paid: 50, due: "2026-09-01"},
  {id: "c3", mid: "a", amt: 80, paid: 0, due: "2026-11-01", exc: true},
  {id: "c4", mid: "b", amt: 80, paid: 0, due: "2026-12-01"}
];

test("debtorDoc: jen nezaplacené předpisy se splatností, bez částek, od nejstarší", () => {
  const d = debtorDoc(CH, "a");
  assert.deepEqual(d, {mid: "a", since: "2026-10-01", dues: [{d: "2026-10-01", x: false}, {d: "2026-11-01", x: true}]});
  assert.ok(!JSON.stringify(d).includes("amt"), "dokument nenese částky");
  assert.equal(debtorDoc([{mid: "a", amt: 10, paid: 10, due: "2026-10-01"}], "a"), null);
});

test("debtorState: ⛓ po splatnosti bez výjimky, 🔓 jen s výjimkou, dny po splatnosti", () => {
  const d = debtorDoc(CH, "a");
  assert.equal(debtorState(d, Date.parse("2026-09-15")), null, "před splatností nic");
  assert.deepEqual(debtorState(d, Date.parse("2026-10-11")), {days: 10, blocked: true});
  assert.deepEqual(debtorState({mid: "x", since: "2026-10-01", dues: [{d: "2026-10-01", x: true}]}, Date.parse("2026-10-03")), {days: 2, blocked: false});
});

test("debtorPlanFor: po úhradě se dokument dlužníka smaže, realizační tým se nezapisuje", () => {
  const plan = debtorPlanFor(CH, [{id: "c4", d: {...CH[3], paid: 80}}], [], () => false);
  assert.deepEqual(plan, {set: [], del: ["b"]});
  const staff = debtorRebuild(CH, ["z"], mid => mid === "a");
  assert.deepEqual(staff.set.map(x => x.id), ["b"]);
  assert.deepEqual(staff.del.sort(), ["a", "z"]);
});

test("applyDebtors: zápis plánu do dávky s cestou debtors/{mid}", () => {
  const ops = [];
  const b = {set: (p, d) => { ops.push(["set", p, d.mid]); return b; }, delete: p => { ops.push(["del", p]); return b; }};
  applyDebtors(b, {set: [{id: "a", d: {mid: "a"}}], del: ["b"]});
  assert.deepEqual(ops, [["set", "debtors/a", "a"], ["del", "debtors/b"]]);
});
