// Testy ⚡ improvizace na ledě (src/domain/training-impro.js, v22.18): hledání v bance, nový blok, kam vložit,
// plán s vloženým blokem, začátek bloku v průběhu (vypuštěné bloky), nové cvičení do banky a počty na ledě.
import test from "node:test";
import assert from "node:assert/strict";
import {CAT_SK, GK_DN, iceCounts, quickBlock, quickDrill, quickHits, quickIdx, quickPlan, quickSec, qDur, started} from "../src/domain/training-impro.js";
import {drillError, drillDoc} from "../src/domain/drills.js";
import {liveAt} from "../src/domain/training-live.js";
import {GK, PLAN_MAX, planDoc} from "../src/domain/training-plan.js";

// ===== Pomocná data =====
const BANK = [{id: "a", name: "Střelba z kruhu", dur: 8}, {id: "b", name: "Přihrávky ve dvojici", dur: 10}, {id: "c", name: "Stará střelba", arch: true}, {id: "d", name: "Nájezdy a střelba", dur: 5}];
const blk = (id, dur) => ({id, mode: "all", dur, rot: null, lanes: [{id: "l" + id, drill: "", dn: id, di: [], co: [], grp: []}]});
const PLAN = {v: 1, goal: "", blocks: [blk("b1", 10), blk("b2", 10), blk("b3", 10)]};

// ===== Hledání a nové cvičení =====
test("quickHits: bez diakritiky, bez archivu, začátek názvu dřív, prázdný text = nic", () => {
  assert.deepEqual(quickHits(BANK, "strel").map(d => d.id), ["a", "d"]);
  assert.deepEqual(quickHits(BANK, "  "), []);
  assert.deepEqual(quickHits(BANK, "PRIHR").map(d => d.id), ["b"]);
});
test("quickDrill: nové cvičení projde kontrolou banky, dovednost podle kategorie", () => {
  const d = drillDoc(quickDrill("Hra 3 na 3", "ssg", 12));
  assert.equal(drillError(d), null);
  assert.deepEqual(d.sk, [CAT_SK.ssg]);
  assert.equal(d.dur, 12);
  assert.equal(drillDoc(quickDrill("X", "neznama", 99)).cat, "skill");
  assert.equal(qDur("abc"), 10);
  assert.equal(qDur(500), 90);
});

// ===== Nový blok =====
test("quickBlock: cvičení pro všechny, 🥅 zvlášť = druhá linka brankářek, ☕ pauza bez linek", () => {
  const a = quickBlock({drill: "a", dn: "Střelba", dur: 8}, [1, 2, GK]);
  assert.equal(a.mode, "all"); assert.equal(a.dur, 8); assert.equal(a.lanes.length, 1); assert.deepEqual(a.lanes[0].grp, []);
  const g = quickBlock({dn: "Nové", dur: 5, gk: true}, [1, 2, GK]);
  assert.equal(g.lanes.length, 2); assert.deepEqual(g.lanes[0].grp, [1, 2]); assert.deepEqual(g.lanes[1].grp, [GK]); assert.equal(g.lanes[1].dn, GK_DN);
  assert.equal(quickBlock({dn: "Nové", gk: true}, [1, 2]).lanes.length, 1, "bez brankářek se linka nepřidá");
  const p = quickBlock({brk: true, dn: "", dur: 3});
  assert.equal(p.brk, "Pití"); assert.deepEqual(p.lanes, []);
  // Blok projde normalizací plánu beze změny tvaru
  const n = planDoc({blocks: [g, p]}, {});
  assert.equal(n.blocks.length, 2); assert.deepEqual(n.blocks[0].lanes[1].grp, [GK]); assert.equal(n.blocks[0].lanes[0].dn, "Nové");
});

// ===== Kam vložit =====
test("quickIdx: běžící za současný blok, po konci plánu na konec, nespuštěný na začátek / za první", () => {
  const at = liveAt(PLAN.blocks, 12 * 60);
  assert.equal(at.bi, 1);
  assert.equal(quickIdx(3, at, "now", true), 2);
  assert.equal(quickIdx(3, at, "next", true), 2);
  assert.equal(quickIdx(3, at, "end", true), 3);
  assert.equal(quickIdx(3, liveAt(PLAN.blocks, 9999), "now", true), 3);
  assert.equal(quickIdx(3, null, "now", false), 0);
  assert.equal(quickIdx(3, null, "next", false), 1);
  assert.equal(quickIdx(0, null, "now", false), 0);
});
test("quickPlan + quickSec: vložení nepřepíše bloky, ▶ Hned skočí na začátek nového bloku i s vypuštěnými bloky", () => {
  const nb = blk("n", 5), p = quickPlan(PLAN, nb, 2);
  assert.deepEqual(p.blocks.map(b => b.id), ["b1", "b2", "n", "b3"]);
  assert.equal(PLAN.blocks.length, 3, "původní plán beze změny");
  assert.equal(quickSec(p.blocks, null, 2), 20 * 60);
  assert.equal(quickSec(p.blocks, {skip: ["b2"]}, 2), 10 * 60);
  assert.deepEqual(quickPlan(null, nb, 0).blocks.map(b => b.id), ["n"]);
  assert.equal(quickPlan({blocks: Array.from({length: PLAN_MAX.blocks}, (_, i) => blk("x" + i, 1))}, nb, 0), null);
  assert.equal(started(null), false); assert.equal(started({st: "end"}), true);
});

// ===== Kdo je na ledě =====
test("iceCounts: počty po dresech, bez dresu a brankářky", () => {
  const c = iceCounts({lines: {p1: 1, p2: 1, p3: 2}, skaters: [{id: "p1"}, {id: "p2"}, {id: "p3"}, {id: "p4"}], goalies: ["g1"]});
  assert.deepEqual(c, {1: 2, 2: 1, "-": 1, [GK]: 1});
  assert.deepEqual(iceCounts(null), {});
});
