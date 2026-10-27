// Testy 🚫 nedorazila bez omluvy (domain/attendance.js): značka jen u „Jdu“ po začátku, přehled Docházky, zápis přes merge a pravidla.
// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {NOS_KEY, attEvents, attSummary, canNos, isNos, nosCount, nosPatch, pastEvents, startMs} from "../src/domain/attendance.js";

// ===== Testy =====
test("isNos: značka platí jen u odpovědi Jdu", () => {
  assert.equal(isNos({st: "yes", nos: true}), true);
  assert.equal(isNos({st: "no", nos: true}), false);        // po změně odpovědi trenérem značka nic neznamená
  assert.equal(isNos({st: "yes"}), false);
  assert.equal(isNos(null), false);
  assert.equal(NOS_KEY, "nos");
});

test("canNos: jen Jdu a jen po začátku události", () => {
  const start = startMs("2026-10-20", "18:00");
  assert.equal(canNos({st: "yes"}, start, start + 1), true);
  assert.equal(canNos({st: "yes"}, start, start - 1), false); // před začátkem
  assert.equal(canNos({st: "maybe"}, start, start + 1), false);
  assert.equal(canNos(undefined, start, start + 1), false);  // bez odpovědi nejde (rozhodnutí: jen u ✅ Jdu)
  // Událost bez času se počítá až po svém dni
  assert.equal(canNos({st: "yes"}, startMs("2026-10-20", ""), new Date("2026-10-20T20:00:00").getTime()), false);
});

test("nosPatch a nosCount: merge jen pole nos, počet v detailu", () => {
  assert.deepEqual(nosPatch(true), {nos: true});
  assert.deepEqual(nosPatch(false), {nos: "__del"});
  const A = {a: {st: "yes", nos: true}, b: {st: "yes"}, c: {st: "no", nos: true}};
  assert.equal(nosCount(A, ["a", "b", "c", "d"]), 1);
  assert.equal(nosCount(undefined, ["a"]), 0);
});

test("attSummary: 🚫 se nepočítá do účasti ani procenta, má vlastní počet", () => {
  const evs = pastEvents(attEvents([{id: "t1", date: "2026-09-01", time: "18:00"}, {id: "t2", date: "2026-09-08", time: "18:00"}],
    [{id: "m1", date: "2026-09-10", time: "17:00", home: true}]), "2026-08-01", "2027-07-01", Date.parse("2026-10-01T00:00:00"));
  const at = [
    {eid: "t1", pid: "a", st: "yes", nos: true}, {eid: "t2", pid: "a", st: "yes"}, {eid: "m1", pid: "a", st: "yes", nos: true},
    {eid: "t1", pid: "b", st: "no", nos: true}
  ];
  const r = attSummary(evs, at, ["a", "b"]);
  assert.deepEqual(r.a.all, {n: 3, yes: 1, no: 0, maybe: 0, none: 0, nos: 2, late: 0, pct: 33});
  assert.deepEqual(r.a.train, {n: 2, yes: 1, no: 0, maybe: 0, none: 0, nos: 1, late: 0, pct: 50});
  assert.equal(r.a.home.nos, 1);
  assert.equal(r.b.all.no, 1);                              // značka u Nejdu se ignoruje
  assert.equal(r.b.all.nos, 0);
});

test("pravidla: 🚫 zapisuje jen trenér / kustod, hráčka ji nezaloží, nezmění ani nesmaže", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const blk = rules.slice(rules.indexOf("match /attendance/{id}"), rules.indexOf("}", rules.indexOf("allow delete", rules.indexOf("match /attendance/{id}"))));
  assert.match(rules, /function nosKeep\(\) \{ return request\.resource\.data\.get\('nos', null\) == resource\.data\.get\('nos', null\); \}/);
  assert.match(blk, /allow create: if noKeys\(\['reason'\]\) && \(isStaff\(\) \|\| \(isPlayer\(\) && noKeys\(\['nos'\]\)/);
  assert.match(blk, /allow update: if keepOut\(\['reason'\]\) && \(isStaff\(\) \|\| \(isPlayer\(\) && nosKeep\(\)/);
  assert.match(blk, /allow delete: if isStaff\(\) \|\| \(isPlayer\(\) && resource\.data\.pid == myPid\(\) && !\('nos' in resource\.data\)\)/);
});

// ===== Docházka po měsících (📊 Moje docházka v Moje platby, v22.1.3) =====
test("attByMonth: účast podle měsíce události, 🚫 se nepočítá do účasti", async () => {
  const {attByMonth} = await import("../src/domain/attendance.js");
  const evs = [{id: "e1", kind: "train", date: "2026-11-04"}, {id: "e2", kind: "home", date: "2026-11-20"}, {id: "e3", kind: "train", date: "2026-12-02"}];
  const at = [{eid: "e1", pid: "p", st: "yes"}, {eid: "e2", pid: "p", st: "yes", nos: true}, {eid: "e3", pid: "p", st: "no"}];
  const r = attByMonth(evs, at, "p");
  assert.equal(r["2026-11"].n, 2); assert.equal(r["2026-11"].yes, 1); assert.equal(r["2026-11"].nos, 1);
  assert.equal(r["2026-12"].yes, 0); assert.equal(r["2026-12"].no, 1);
});

// ===== ⏰ Pozdní odpověď (v22.16) =====
test("isLate: zápis odpovědi po termínu přihlášení; bez termínu nebo času nikdy", async () => {
  const {isLate} = await import("../src/domain/attendance.js");
  const e = {id: "t1", dl: "2026-10-20T18:00"};
  assert.equal(isLate({at: "2026-10-20T19:00:00.000"}, e), true);
  assert.equal(isLate({at: "2026-10-20T17:00:00.000"}, e), false);
  assert.equal(isLate({at: "2026-10-20T19:00:00.000"}, {id: "t1"}), false, "bez termínu");
  assert.equal(isLate({}, e), false, "bez času zápisu");
  assert.equal(isLate(null, e), false);
});
