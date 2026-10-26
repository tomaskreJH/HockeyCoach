// Testy ⏱ živého tréninku podle skutečnosti (src/domain/training-live.js): úpravy průběhu adj / skip (vypustit, zkrátit, prodloužit blok
// jen pro tento průběh), zbytek plánu, rozpočet času do konce tréninku, zkrácení kola; ☕ pauza v plánu (training-plan.js) a v hodnocení
// (training-eval.js prevSpot); pravidla trlive s poli adj / skip (kontrola textu).
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {adjPatch, canAdj, cutSec, liveAt, liveBlocks, liveBudget, liveCtl, liveRest, stepSec} from "../src/domain/training-live.js";
import {BRK_DEF, BRK_DUR, blockExtras, breakBlank, isBreak, planDoc, planIssues, planMinutes} from "../src/domain/training-plan.js";
import {prevSpot} from "../src/domain/training-eval.js";

// ===== Pomocná data =====
// Blok a 10 min, b 5 min, c ☕ pauza 3 min, d 12 min (stanoviště 2 × 6 min) → celkem 30 min
const B = [
  {id: "a", mode: "all", dur: 10, lanes: [{id: "a1", drill: "x", grp: []}]},
  {id: "b", mode: "all", dur: 5, lanes: [{id: "b1", drill: "y", grp: []}]},
  {id: "c", mode: "all", dur: 3, rot: null, lanes: [], brk: "Pití"},
  {id: "d", mode: "st", dur: 12, rot: null, lanes: [{id: "d1", drill: "z", grp: [1]}, {id: "d2", drill: "w", grp: [2]}]}
];
const T0 = 1_700_000_000_000;

// ===== Úpravy průběhu =====
test("liveBlocks: bez úprav stejné bloky, vypuštěný blok délka 0, upravený jiná délka; plán se nemění", () => {
  assert.equal(liveBlocks(B, null), B);
  assert.equal(liveBlocks(B, {adj: {}, skip: []}), B);
  const E = liveBlocks(B, {adj: {d: 8}, skip: ["b"]});
  assert.deepEqual(E.map(b => b.dur), [10, 0, 3, 8]);
  assert.equal(B[1].dur, 5, "původní plán beze změny");
  assert.equal(E[1].skip, true); assert.equal(E[3].adj, true);
  assert.deepEqual(liveBlocks(B, {adj: {d: 0, a: 999, x: 5}}).map(b => b.dur), [10, 5, 3, 12], "mimo meze se ignoruje");
});
test("poloha: vypuštěný blok se přeskočí, indexy bloků zůstanou, ⏭ a ⏮ ho přeskočí", () => {
  const E = liveBlocks(B, {skip: ["b"]});
  assert.equal(liveAt(E, 599).bi, 0);
  assert.equal(liveAt(E, 600).bi, 2, "po bloku a hned pauza c");
  assert.equal(liveAt(E, 0).total, 25 * 60);
  assert.equal(stepSec(E, 100, 1), 600);
  assert.equal(stepSec(E, 600, -1), 0);
});
test("canAdj / adjPatch: jen bloky, které ještě nezačaly; vypustit a vrátit, ±1 min, zrušení úpravy", () => {
  const at = liveAt(B, 120);                                          // blok a
  assert.equal(canAdj(at, 0), false); assert.equal(canAdj(at, 1), true); assert.equal(canAdj(null, 1), false);
  assert.equal(adjPatch(B, null, "a", "skip", at), null, "běžící blok nejde vypustit");
  assert.equal(adjPatch(B, null, "zz", "skip", at), null);
  let L = {...adjPatch(B, null, "b", "skip", at)};
  assert.deepEqual(L, {adj: {}, skip: ["b"]});
  assert.deepEqual(adjPatch(B, L, "b", "skip", at), {adj: {}, skip: []}, "druhé klepnutí vrátí");
  L = adjPatch(B, L, "d", "−", at);
  assert.deepEqual(L, {adj: {d: 11}, skip: ["b"]});
  assert.deepEqual(adjPatch(B, L, "d", "+", at), {adj: {}, skip: ["b"]}, "zpět na délku plánu = bez úpravy");
  assert.deepEqual(adjPatch(B, {adj: {d: 4}, skip: ["d"]}, "d", "reset", at), {adj: {}, skip: []});
  assert.deepEqual(adjPatch(B, {adj: {b: 1}}, "b", "−", at), {adj: {b: 1}, skip: []}, "nejméně 1 min");
  assert.deepEqual(adjPatch(B, {adj: {old: 5}, skip: ["old"]}, "b", "+", at), {adj: {b: 6}, skip: []}, "úpravy neexistujících bloků se uklidí");
  assert.deepEqual(adjPatch(B, {skip: ["b"]}, "b", "+", at), {adj: {b: 6}, skip: []}, "změna délky vypuštěný blok vrátí");
});
test("liveRest: zbytek plánu po současném bloku s délkou plánu a tohoto průběhu", () => {
  const at = liveAt(liveBlocks(B, {skip: ["b"], adj: {d: 8}}), 700);
  assert.equal(at.bi, 2);
  assert.deepEqual(liveRest(B, {skip: ["b"], adj: {d: 8}}, at), [{bi: 3, id: "d", dur: 12, eff: 8, skip: false, adj: true}]);
  assert.deepEqual(liveRest(B, null, liveAt(B, 0)).map(x => x.id), ["b", "c", "d"]);
  assert.deepEqual(liveRest(B, null, {done: true}), []);
});
test("liveBudget: zbývá podle plánu, do konce tréninku a o kolik plán přetahuje", () => {
  const end = T0 + 20 * 60_000;
  assert.deepEqual(liveBudget(1800, 600, end, T0), {planLeft: 1200, realLeft: 1200, over: 0});
  assert.equal(liveBudget(1800, 300, end, T0).over, 300, "o 5 min přetahuje");
  assert.equal(liveBudget(1800, 900, end, T0).over, -300, "rezerva 5 min");
  assert.equal(liveBudget(1800, 0, end, end + 60_000).over, 1800, "po konci tréninku přetahuje o celý zbytek");
  assert.deepEqual(liveBudget(1800, 600, null, T0), {planLeft: 1200, realLeft: null, over: null});
});
test("cutSec: zkrácení kola posune hodiny nejdál na konec kola", () => {
  assert.equal(cutSec(B, 100, 60), 160);
  assert.equal(cutSec(B, 580, 60), 600, "jen do konce bloku a");
  assert.equal(cutSec(B, 1500, 60), 1560);
  assert.equal(cutSec(B, 1420, 60), 1440, "stanoviště: do konce kola (2 × 6 min od 18:00)");
  assert.equal(cutSec(B, 99999, 60), 99999);
});
test("liveCtl keep: úpravy průběhu nemění stav hodin; start je vynuluje", () => {
  const me = "t@x.cz", run = {...liveCtl("start", null, {now: T0, me}), sAt: T0};
  assert.deepEqual([run.adj, run.skip], [{}, []]);
  const k = liveCtl("keep", run, {now: T0 + 30_000, me});
  assert.equal(k.st, "run"); assert.equal(k.e0, 30); assert.equal("adj" in k, false);
  assert.equal(liveCtl("keep", {...run, st: "pause", e0: 50}, {now: T0, me}).st, "pause");
  assert.equal(liveCtl("keep", null, {now: T0, me}), null);
});

// ===== ☕ Pauza =====
test("pauza: nový blok, normalizace (bez linek, popisek), délka v plánu, bez upozornění na linky", () => {
  const b = breakBlank();
  assert.equal(isBreak(b), true); assert.equal(b.brk, BRK_DEF); assert.equal(b.dur, BRK_DUR); assert.deepEqual(b.lanes, []);
  assert.equal(isBreak(B[0]), false); assert.equal(blockExtras(b), false);
  const P = planDoc({blocks: [{...b, mode: "st", rot: 2, by: "pos", lanes: [{id: "q", drill: "x"}], brk: "  Odpočinek a pití na střídačce – dlouhý popisek přes čtyřicet znaků  "}, {id: "e", dur: 2, brk: ""}]});
  assert.equal(P.blocks[0].mode, "all"); assert.equal(P.blocks[0].rot, null); assert.deepEqual(P.blocks[0].lanes, []);
  assert.equal("by" in P.blocks[0], false); assert.equal(P.blocks[0].brk.length, 40);
  assert.equal(P.blocks[1].brk, BRK_DEF, "prázdný popisek = výchozí");
  assert.equal(planMinutes(P.blocks), BRK_DUR + 2);
  assert.deepEqual(planIssues({blocks: [b]}, {}), []);
  assert.equal(planDoc({blocks: [{id: "x", mode: "all", dur: 5, lanes: []}]}).blocks[0].brk, undefined, "obyčejný blok pauzou není");
});
test("pauza v živém tréninku: hodnotí se cvičení před pauzou", () => {
  const at = liveAt(B, 15 * 60 + 30);                                  // ve ☕ pauze
  assert.equal(at.bi, 2);
  assert.equal(prevSpot(B, at).bi, 1);
  assert.equal(prevSpot(B, liveAt(B, 18 * 60 + 10)).bi, 1, "po pauze se hodnotí blok před ní");
  assert.equal(prevSpot([B[2], B[0]], liveAt([B[2], B[0]], 200)), null, "pauza na začátku = nic k hodnocení");
});

// ===== Pravidla =====
test("pravidla: trlive dovolí úpravy průběhu adj (mapa) a skip (seznam) s mezemi", () => {
  const R = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const m = /function trliveOk\(d\) \{([\s\S]*?)\n    \}/.exec(R);
  assert.ok(m, "trliveOk");
  assert.match(m[1], /hasOnly\(\['v', 'st', 'e0', 'wAt', 'sAt', 'ctl', 'adj', 'skip', 'by', 'at'\]\)/);
  assert.match(m[1], /d\.adj is map && d\.adj\.size\(\) <= 30/);
  assert.match(m[1], /d\.skip is list && d\.skip\.size\(\) <= 30/);
});
