// Testy ✏️ skutečného průběhu tréninku (src/domain/training-actual.js, v22.35): průběh z živého tréninku při ⏹ Konec, plán podle skutečnosti
// pro statistiky, úpravy a souhrn; pravidla tract a zpřísnění budgetKeep (kontrola textu firestore.rules). Čisté funkce – nic se nezapisuje.
// ===== Importy =====
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TRACT_COLL, actualPlan, tractDoc, tractEdit, tractFromLive, tractRows, tractSum} from "../src/domain/training-actual.js";
import {playerLoad} from "../src/domain/training-stats.js";

// ===== Pomocná data =====
// Blok a 10 min, b 5 min, c ☕ 3 min, d 12 min (stanoviště, točení po 6) → celkem 30 min
const P = {v: 1, goal: "", blocks: [
  {id: "a", mode: "all", dur: 10, rot: null, lanes: [{id: "a1", drill: "x", grp: []}]},
  {id: "b", mode: "all", dur: 5, rot: null, lanes: [{id: "b1", drill: "y", grp: []}]},
  {id: "c", mode: "all", dur: 3, rot: null, lanes: [], brk: "Pití"},
  {id: "d", mode: "st", dur: 12, rot: 6, lanes: [{id: "d1", drill: "z", grp: [1]}, {id: "d2", drill: "w", grp: [2]}]}
]};

// ===== Průběh z živého tréninku =====
test("tractFromLive: úpravy průběhu, rozběhnutý blok do konce, nezačaté bloky vypuštěné", () => {
  const live = {adj: {b: 7}, skip: ["c"]};
  // a 10 + b 7 + c 0 = 17 min, konec ve 20. min → d běžel 3 min
  assert.deepEqual(tractFromLive(P, live, 20 * 60).blocks, [{id: "a", dur: 10}, {id: "b", dur: 7}, {id: "c", dur: 3, skip: true}, {id: "d", dur: 3}]);
  // konec v 8. minutě → b a d nezačaly
  assert.deepEqual(tractFromLive(P, null, 8 * 60).blocks.map(x => [x.id, x.dur, !!x.skip]), [["a", 8, false], ["b", 5, true], ["c", 3, true], ["d", 12, true]]);
  const t = tractFromLive(P, null, 999 * 60);
  assert.equal(t.src, "live"); assert.equal(t.v, 1);
  assert.deepEqual(t.blocks.map(x => x.dur), [10, 5, 3, 12]);
});

// ===== Plán podle skutečnosti =====
test("actualPlan: vypuštěné bloky zmizí, délky ze skutečnosti, točení delší než blok se zruší, bez tract plán beze změny", () => {
  assert.equal(actualPlan(P, null), P);
  assert.equal(actualPlan(null, {blocks: []}), null);
  const A = actualPlan(P, {blocks: [{id: "a", dur: 10}, {id: "b", dur: 8}, {id: "c", dur: 3, skip: true}, {id: "d", dur: 4}]});
  assert.deepEqual(A.blocks.map(b => [b.id, b.dur, b.rot]), [["a", 10, null], ["b", 8, null], ["d", 4, null]]);
  assert.equal(A.blocks[0], P.blocks[0], "nezměněný blok je tentýž objekt");
  assert.equal(P.blocks[1].dur, 5, "plán se nemění");
});
test("actualPlan ve statistikách: minuty hráčky podle skutečnosti", () => {
  const D = {x: {id: "x", sk: ["skate"]}, y: {id: "y", sk: ["shot"]}};
  const plan = {blocks: [P.blocks[0], P.blocks[1]]}, tract = {blocks: [{id: "a", dur: 4}, {id: "b", dur: 5, skip: true}]};
  const args = {pids: ["p1"], trainings: [{id: "e1", date: "2026-10-01", lines: {p1: 1}}], att: [{eid: "e1", pid: "p1", st: "yes"}], goalies: new Set(), pos: {p1: "U"}, drills: D};
  const before = playerLoad({...args, plans: {e1: plan}}).p1, after = playerLoad({...args, plans: {e1: actualPlan(plan, tract)}}).p1;
  assert.ok(JSON.stringify(before) !== JSON.stringify(after), "skutečnost změní minuty");
  assert.match(JSON.stringify(after), /4/);
});

// ===== Úprava =====
test("tractRows, tractEdit, tractSum a tractDoc: úprava délek, vypuštění, podle plánu a čistý dokument", () => {
  let R = tractRows(P, null);
  assert.deepEqual(R.map(r => [r.id, r.plan, r.dur, r.skip]), [["a", 10, 10, false], ["b", 5, 5, false], ["c", 3, 3, false], ["d", 12, 12, false]]);
  R = tractEdit(tractEdit(tractEdit(R, "a", "−"), "c", "skip"), "d", "+");
  assert.deepEqual(tractSum(R), {real: 9 + 5 + 13, plan: 30, skip: 1, chg: 2});
  R = tractEdit(R, "a", "reset");
  assert.equal(R[0].dur, 10);
  const d = tractDoc(P, [...R, {id: "cizí", dur: 5}], "edit");
  assert.deepEqual(d, {v: 1, src: "edit", blocks: [{id: "a", dur: 10}, {id: "b", dur: 5}, {id: "c", dur: 3, skip: true}, {id: "d", dur: 13}]});
  assert.deepEqual(tractEdit([{id: "a", plan: 1, dur: 1, skip: false}], "a", "−")[0].dur, 1, "nejméně 1 min");
  assert.deepEqual(tractRows(P, {blocks: [{id: "b", dur: 2, skip: true}]})[1], {bi: 1, id: "b", plan: 5, dur: 2, skip: true});
});

// ===== Pravidla =====
test("pravidla: tract čte trplan r, zapisuje trplan e se známými poli; budgetKeep drží starší úpravy rozpočtu", () => {
  const R = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const m = R.match(new RegExp("match /" + TRACT_COLL + "/\\{id\\} \\{([\\s\\S]*?)\\n    \\}"));
  assert.ok(m, "chybí tract");
  assert.match(m[1], /allow read: if can\('trplan', 'r'\);/);
  assert.match(m[1], /allow create, update: if can\('trplan', 'e'\) && tractOk\(request\.resource\.data\);/);
  assert.match(R, /function tractOk\(d\) \{\s+return d\.keys\(\)\.hasOnly\(\['v', 'blocks', 'src', 'by', 'at'\]\)/);
  assert.match(R, /d\.rev\[0:o\.rev\.size\(\)\] == o\.rev/);
});
