// Testy zrušení a úplného smazání události (domain/event-cancel.js) a dopadu zrušení na Docházku a 🏠 Domů.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {attEvents} from "../src/domain/attendance.js";
import {cancelBlock, cancelPatch, cancelText, isCancelled, isEmptyEvent, uncancelPatch, wipePlan, wipeText} from "../src/domain/event-cancel.js";
import {homeItems, nextMatch, regClosed, unanswered, upcomingEvents} from "../src/domain/home-summary.js";

// ===== Konstanty =====
const C = {by: "t@x.cz", at: "2026-10-24T10:00:00.000Z", reason: "led nedostupný"};
const TODAY = "2026-10-24", NOW = new Date("2026-10-24T08:00:00").getTime();

// ===== Testy =====
test("isCancelled / cancelPatch / uncancelPatch / cancelText", () => {
  assert.equal(isCancelled({cancelled: C}), true);
  assert.equal(isCancelled({raw: {cancelled: C}}), true, "položka seznamu s raw");
  assert.equal(isCancelled({cancelled: null}), false);
  assert.deepEqual(cancelPatch("T@X.cz", C.at, "  led nedostupný "), {cancelled: C});
  assert.deepEqual(uncancelPatch(), {cancelled: "__del"});
  assert.equal(cancelText({cancelled: C}), "❌ Zrušeno 24. 10. 2026 · led nedostupný");
  assert.equal(cancelText({}), "");
});

test("cancelBlock: běžící a uzavřený zápas nejde zrušit", () => {
  assert.equal(cancelBlock({}, false), null);
  assert.match(cancelBlock({live: {}}, true), /začal/);
  assert.match(cancelBlock({closed: true}, true), /Uzavřený/);
  assert.match(cancelBlock({cancelled: C}, false), /už je zrušená/);
});

test("isEmptyEvent: smazat jde jen událost bez odpovědí, předpisů, vyúčtování a zápisu", () => {
  assert.equal(isEmptyEvent("e1", {}, {}), true);
  assert.equal(isEmptyEvent("e1", {}, {attendance: {a: {eid: "e1", pid: "p"}}}), false);
  assert.equal(isEmptyEvent("e1", {ss: true}, {}), false);
  assert.equal(isEmptyEvent("e1", {}, {charges: {c: {eid: "e1"}}}), false);
  assert.equal(isEmptyEvent("m1", {events: [{k: "S"}]}, {}), false);
  assert.equal(isEmptyEvent("m1", {live: {}}, {}), false);
});

test("wipePlan: smaže vše související a událost až nakonec; audit zůstává", () => {
  const src = {
    attendance: {e1_p1: {eid: "e1", pid: "p1"}, e2_p1: {eid: "e2", pid: "p1"}},
    attnote: {e1_p1: {eid: "e1", mid: "p1", reason: "x"}, e1_p2: {eid: "e1", mid: "p2", reason: "y"}},
    charges: {c1: {eid: "e1", mid: "p1", amt: 100, paid: 100}, c2: {eid: "e2", mid: "p1"}},
    cash: {k1: {cid: "c1", eid: "e1"}, k2: {cid: "c1"}, k3: {eid: "e2"}},
    evcash: {e1: {settle: {}}}, evprice: {e1: {}}, requests: {r1: {kind: "att", eid: "e1"}, r2: {kind: "pay"}},
    evpub: {e1: {}}, lineuppub: {}
  };
  const p = wipePlan("events", "e1", src);
  assert.deepEqual(p.ops[p.ops.length - 1], ["del", "events", "e1"]);
  assert.deepEqual(p.n, {attendance: 1, attnote: 2, charges: 1, cash: 2, evcash: 1, evprice: 1, evpub: 1, requests: 1, events: 1});
  assert.deepEqual(p.mids, ["p1"]);
  assert.ok(!p.ops.some(o => o[1] === "audit"));
  assert.match(wipeText(p), /odpovědi 1, důvody omluv 2, předpisy 1, zápisy v pokladně 2/);
});

test("zrušená událost se nepočítá do Docházky, v Domů nemá odpověď ani příští zápas", () => {
  const ev = [{id: "t1", date: "2026-10-20", time: "18:00"}, {id: "t2", date: "2026-10-21", time: "18:00", cancelled: C}];
  assert.deepEqual(attEvents(ev, [{id: "m1", date: "2026-10-22", cancelled: C}]).map(e => e.id), ["t1"]);
  const items = homeItems([{id: "t3", date: "2026-10-25", time: "18:00", cancelled: C}], [{id: "m2", opp: "A", date: "2026-10-26", time: "17:00", cancelled: C}, {id: "m3", opp: "B", date: "2026-10-27", time: "17:00"}]);
  assert.equal(nextMatch(items, NOW, TODAY).id, "m3", "zrušený zápas se přeskočí");
  const up = upcomingEvents(items, [], "p1", NOW, TODAY);
  assert.equal(up.find(e => e.id === "t3").cancelled, true);
  assert.equal(up.find(e => e.id === "t3").locked, true);
  assert.equal(unanswered(up), 1, "zrušená událost se do ❔ nepočítá");
  assert.equal(regClosed({date: "2026-10-30", cancelled: true}, NOW, TODAY), true);
});
