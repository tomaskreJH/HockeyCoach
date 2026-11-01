// Testy variabilního živého tréninku (v22.33): 📋 Co následuje s hodinami začátků (liveQueue, atClock), ⚠ zdržení (delayDue, delayLevel,
// delayNote), nepovinné hodnocení – blok s 🚫⭐ Nehodnotit (noEvalBlock, evalLanes) a rychlá volba jen pro hráčky bez hodnocení (unratedPids),
// ⚡ hledání v bance podle části tréninku (quickHits s cat). Čisté funkce – nic se nezapisuje.

// ===== Importy =====
import test from "node:test";
import assert from "node:assert/strict";
import {DELAY_AT, atClock, delayDue, delayLevel, delayNote, liveAt, liveBlocks, liveQueue} from "../src/domain/training-live.js";
import {evalLanes, unratedPids} from "../src/domain/training-eval.js";
import {noEvalBlock, planDoc} from "../src/domain/training-plan.js";
import {QUICK_CAT_HITS, QUICK_HITS, quickHits} from "../src/domain/training-impro.js";

// ===== Pomocná data =====
// Blok a 10 min, b 5 min, c ☕ pauza 3 min, d 12 min → celkem 30 min
const B = [
  {id: "a", mode: "all", dur: 10, lanes: [{id: "a1", drill: "x", grp: []}]},
  {id: "b", mode: "all", dur: 5, lanes: [{id: "b1", drill: "y", grp: []}]},
  {id: "c", mode: "all", dur: 3, rot: null, lanes: [], brk: "Pití"},
  {id: "d", mode: "all", dur: 12, lanes: [{id: "d1", drill: "z", grp: []}]}
];

// ===== 📋 Co následuje =====
test("liveQueue: současný a další bloky se začátky po úpravách průběhu, vypuštěný blok zůstane s délkou 0", () => {
  const at = liveAt(B, 12 * 60);                          // blok b (od 10. min)
  const Q = liveQueue(B, null, at);
  assert.deepEqual(Q.map(x => x.id), ["b", "c", "d"]);
  assert.equal(Q[0].cur, true);
  assert.deepEqual(Q.map(x => x.a / 60), [10, 15, 18]);
  const live = {adj: {d: 8}, skip: ["c"]}, at2 = liveAt(liveBlocks(B, live), 12 * 60), Q2 = liveQueue(B, live, at2);
  assert.deepEqual(Q2.map(x => [x.id, x.eff, x.skip, x.adj]), [["b", 5, false, false], ["c", 0, true, false], ["d", 8, false, true]]);
  assert.equal(Q2[2].a / 60, 15, "po vypuštěné pauze začne d hned po b");
  assert.deepEqual(liveQueue(B, null, liveAt(B, 31 * 60)), [], "po konci plánu nic");
  assert.deepEqual(liveQueue(B, null, null), []);
});
test("atClock: hodiny začátku podle skutečného průběhu (teď + zbývá do začátku)", () => {
  const now = new Date(2026, 10, 1, 17, 30, 0).getTime();
  assert.equal(atClock(now, 600, 600), "17:30");
  assert.equal(atClock(now, 600, 1500), "17:45");
  assert.equal(atClock(now, 0, 9 * 60), "17:39");
});

// ===== ⚠ Zdržení =====
test("delayDue: každá hranice jednou, při skoku jen ta nejvyšší, bez konce tréninku nic", () => {
  assert.deepEqual(DELAY_AT, [2, 5, 10]);
  assert.equal(delayDue(null, 60), null);
  assert.equal(delayDue(-300, 120), 2);
  assert.equal(delayDue(120, 200), null, "2 min už ohlášeno");
  assert.equal(delayDue(120, 300), 5);
  assert.equal(delayDue(0, 700), 10, "skok přes víc hranic = nejvyšší");
  assert.equal(delayDue(600, 900), null);
  assert.equal(delayDue(0, null), null);
});
test("delayLevel a delayNote: úroveň pruhu a krátký text oznámení", () => {
  assert.equal(delayLevel(null), 0);
  assert.equal(delayLevel(60), 0);
  assert.equal(delayLevel(150), 2);
  assert.equal(delayLevel(400), 5);
  assert.equal(delayLevel(3600), 10);
  const t = delayNote(5, {where: "Stanoviště B", what: "Střelba", who: ""}, 95);
  assert.equal(t.title, "⚠ Zdržení 5 min");
  assert.match(t.body, /Zkrať \/ vypusť cvičení · plán ještě 1:35 · pak Střelba · St\. B/);
  assert.equal(delayNote(2, null, 0).body, "Zkrať / vypusť cvičení · plán ještě 0:00");
});

// ===== ⭐ Nepovinné hodnocení =====
test("noEvalBlock a evalLanes: blok s 🚫⭐ Nehodnotit se vynechá (i rozcvička bez přepínače se hodnotí), planDoc pole ne zachová", () => {
  assert.equal(noEvalBlock({ne: true}), true);
  assert.equal(noEvalBlock({ne: "1"}), false);
  assert.equal(noEvalBlock(null), false);
  const D = {w: {id: "w", name: "Rozbruslení", cat: "warm"}, s: {id: "s", name: "Střelba", cat: "skill"}};
  const plan = {blocks: [{id: "b0", mode: "all", dur: 5, ne: true, lanes: [{id: "l0", drill: "w", grp: []}]}, {id: "b1", mode: "all", dur: 8, lanes: [{id: "l1", drill: "w", grp: []}]},
    {id: "b2", mode: "all", dur: 10, lanes: [{id: "l2", drill: "s", grp: []}, {id: "l3", drill: "q", dn: "Mimo banku", grp: []}]}]};
  assert.deepEqual(evalLanes(plan, D).map(l => l.lid), ["l1", "l2", "l3"]);
  const p = planDoc(plan, D);
  assert.equal(p.blocks[0].ne, true);
  assert.equal("ne" in p.blocks[1], false, "bez přepínače pole chybí");
});
test("unratedPids: jen hráčky bez platného hodnocení (zrušené 0 = bez hodnocení)", () => {
  const e = {pl: {p1: {r: 4}, p2: {r: 0}, p3: {n: "pozdě"}}};
  assert.deepEqual(unratedPids(e, ["p1", "p2", "p3", "p4"]), ["p2", "p3", "p4"]);
  assert.deepEqual(unratedPids(null, ["p1"]), ["p1"]);
  assert.deepEqual(unratedPids(e, null), []);
});

// ===== ⚡ Hledání podle části tréninku =====
test("quickHits: text i část tréninku, jen část = celá část abecedně, vyřazená cvičení nikdy", () => {
  const L = [{id: "1", name: "Střelba z kruhu", cat: "skill"}, {id: "2", name: "Ab rozbruslení", cat: "warm"}, {id: "3", name: "Zahřátí", cat: "warm"},
    {id: "4", name: "Stará rozcvička", cat: "warm", arch: true}, {id: "5", name: "Střelba 2 na 1", cat: "sys"}];
  assert.deepEqual(quickHits(L, "", ""), []);
  assert.deepEqual(quickHits(L, "", "warm").map(d => d.id), ["2", "3"]);
  assert.deepEqual(quickHits(L, "strel", "").map(d => d.id), ["5", "1"], "abecedně – číslice před písmeny");
  assert.deepEqual(quickHits(L, "strel", "sys").map(d => d.id), ["5"]);
  const many = Array.from({length: 30}, (_, i) => ({id: "m" + i, name: "Cvičení " + String(i).padStart(2, "0"), cat: "skill"}));
  assert.equal(quickHits(many, "", "skill").length, QUICK_CAT_HITS);
  assert.equal(quickHits(many, "cvic", "").length, QUICK_HITS);
});

// ===== 💰 Plat za událost (v22.34) =====
test("salaryRows: plat za událost jen za „Jdu“ bez 🚫 nedorazil(a), měsíční plat beze změny", async () => {
  const {salaryRows} = await import("../src/domain/cash.js");
  const staff = [{id: "t1", name: "T", pay: {m: "event", amt: 200}}, {id: "t2", name: "U", pay: {m: "month", amt: 3000}}];
  const evs = [{id: "e1", date: "2026-10-05"}, {id: "e2", date: "2026-10-12"}, {id: "e3", date: "2026-10-19"}];
  const at = [{eid: "e1", pid: "t1", st: "yes"}, {eid: "e2", pid: "t1", st: "yes", nos: true}, {eid: "e3", pid: "t1", st: "no"}, {eid: "e1", pid: "t2", st: "yes", nos: true}];
  const R = salaryRows(staff, "2026-10", evs, at, [], "2026-10-20");
  assert.deepEqual(R.map(r => [r.tid, r.n, r.amt]), [["t1", 1, 200], ["t2", 0, 3000]]);
});
