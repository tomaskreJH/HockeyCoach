// Testy rozdělení do pětek tréninku a výkonnosti hráček (src/domain/line-split.js) a skupin podle postů v plánu
// (src/domain/training-plan.js – blok by: "pos", plan-reuse.js, skill-coverage.js). Čisté funkce – nic se nezapisuje.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {LVL_DEF, PLEVEL_COLL, PLEVEL_DOC, SPLIT_MODES, hasLvl, lineSummary, lvlOf, lvlSet, splitLines} from "../src/domain/line-split.js";
import {planCopy} from "../src/domain/plan-reuse.js";
import {groupSkills, skillCoverage} from "../src/domain/skill-coverage.js";
import {DF, FW, GK, blockBlank, groupIn, grpLabel, isPosBlock, planDoc, planIssues, posGroups, posGrp, rotation} from "../src/domain/training-plan.js";

// ===== Pomocná data =====
const U = "Útočnice", O = "Obránkyně";
// 8 útočnic a 4 obránkyně v pořadí soupisky; výkonnost klesá s číslem
const PL = [...Array.from({length: 8}, (_, i) => ({id: "f" + (i + 1), pos: U})), ...Array.from({length: 4}, (_, i) => ({id: "d" + (i + 1), pos: O}))];
const LV = {f1: 5, f2: 5, f3: 4, f4: 4, f5: 3, f6: 2, f7: 2, f8: 1, d1: 5, d2: 4, d3: 2, d4: 1};
const byLine = (lines, n) => Object.entries(lines).filter(([k, v]) => v === n && !k.startsWith("t:")).map(([k]) => k).sort();

// ===== Výkonnost =====
test("výkonnost: 1–5, chybějící = 3, klepnutí na stejnou hodnotu zruší", () => {
  assert.equal(PLEVEL_COLL, "plevel"); assert.equal(PLEVEL_DOC, "team");
  assert.equal(lvlOf({a: 5}, "a"), 5); assert.equal(lvlOf({a: 9}, "a"), LVL_DEF); assert.equal(lvlOf({}, "x"), 3);
  assert.equal(hasLvl({a: 2}, "a"), true); assert.equal(hasLvl({a: 0}, "a"), false); assert.equal(hasLvl({}, "a"), false);
  assert.deepEqual(lvlSet({a: 2, b: 7}, "a", 4), {a: 4});
  assert.deepEqual(lvlSet({a: 4}, "a", 4), {});
  assert.deepEqual(lvlSet({}, "c", 6), {}, "neplatná hodnota se nezapíše");
});

// ===== Rozdělení =====
test("⚖ vyrovnaně s ⚔: každá pětka 2 útočnice + 1 obránkyně a podobná síla, realizační tým zůstane", () => {
  const L = splitLines(PL, {n: 4, mode: "even", pos: true, lv: LV, prev: {"t:x": 2, f1: 4}});
  assert.equal(L["t:x"], 2);
  const S = lineSummary(L, PL, LV);
  [1, 2, 3, 4].forEach(n => { assert.equal(S[n].f, 2); assert.equal(S[n].d, 1); assert.equal(S[n].c, 3); });
  const avg = [1, 2, 3, 4].map(n => S[n].avg), spread = Math.max(...avg) - Math.min(...avg);
  assert.ok(spread <= 1, "rozdíl průměrů pětek nejvýš 1 (" + avg.join(", ") + ")");
});
test("⚖ vyrovnaně bez ⚔: stejné počty v pětkách (±1)", () => {
  const L = splitLines(PL, {n: 3, mode: "even", pos: false, lv: LV}), S = lineSummary(L, PL, LV);
  assert.deepEqual([S[1].c, S[2].c, S[3].c], [4, 4, 4]);
  assert.equal(S[4].c, 0);
});
test("📶 podle výkonnosti: nejsilnější v 1. pětce, s ⚔ útočnice i obránkyně zvlášť", () => {
  const L = splitLines(PL, {n: 2, mode: "tier", pos: true, lv: LV});
  assert.deepEqual(byLine(L, 1), ["d1", "d2", "f1", "f2", "f3", "f4"]);
  assert.deepEqual(byLine(L, 2), ["d3", "d4", "f5", "f6", "f7", "f8"]);
  const M = splitLines(PL, {n: 3, mode: "tier", pos: false, lv: LV});
  assert.deepEqual(byLine(M, 1), ["d1", "f1", "f2", "f3"]);
});
test("🔀 střídavě: pořadí soupisky, s ⚔ nejdřív útočnice", () => {
  const L = splitLines(PL, {n: 4, mode: "alt", pos: true, lv: LV});
  assert.equal(L.f1, 1); assert.equal(L.f5, 1); assert.equal(L.d1, 1); assert.equal(L.d4, 4);
});
test("📋 základní formace: hráčky z formace na svých místech, ostatní doplněné do nejméně obsazených pětek", () => {
  const lu = {"1LW": "f1", "1D1": "d1", "2LW": "f2"};
  const L = splitLines(PL.slice(0, 4).concat([PL[8]]), {n: 2, mode: "base", pos: false, lv: LV, lu});
  assert.equal(L.f1, 1); assert.equal(L.d1, 1); assert.equal(L.f2, 2);
  assert.deepEqual([L.f3, L.f4].sort(), [2, 2], "doplnění do 2. pětky (měla nejméně)");
});
test("neznámý způsob = vyrovnaně, prázdný seznam = jen realizační tým", () => {
  assert.equal(SPLIT_MODES.even, "⚖ Vyrovnaně");
  assert.deepEqual(splitLines([], {mode: "x", prev: {"t:a": 1, p: 2}}), {"t:a": 1});
});

// ===== Skupiny podle postů v plánu =====
test("blok podle postů: skupiny F / D / G, popisky, normalizace a výchozí linky", () => {
  assert.equal(posGrp(O), DF); assert.equal(posGrp(U), FW); assert.equal(posGrp(undefined), FW);
  assert.deepEqual(posGroups([{pos: O}, {pos: U}], ["g"]), [FW, DF, GK]);
  assert.deepEqual(posGroups([{pos: O}], []), [DF]);
  assert.equal(grpLabel(FW), "⚔ Útočnice"); assert.equal(grpLabel(DF), "🛡 Obránkyně");
  const b = blockBlank("st", [FW, DF, GK], "pos");
  assert.equal(b.by, "pos"); assert.deepEqual(b.lanes.map(l => l.grp), [[FW], [DF], [GK]]);
  const P = planDoc({blocks: [{...b, lanes: [{id: "a", grp: [DF, 1, FW]}, {id: "b", grp: [GK]}]}, {mode: "all", by: "x", lanes: [{id: "c", grp: [1, FW]}]}]});
  assert.equal(isPosBlock(P.blocks[0]), true); assert.deepEqual(P.blocks[0].lanes[0].grp, [FW, DF], "pětky se v bloku podle postů zahodí");
  assert.equal(P.blocks[1].by, undefined); assert.deepEqual(P.blocks[1].lanes[0].grp, [1], "posty se v bloku pětek zahodí");
  assert.equal(groupIn(P.blocks[0], 2, DF), DF); assert.equal(groupIn(P.blocks[1], 2, DF), 2);
});
test("točení a kontrola bloku podle postů; kopie plánu rozdělí posty nového tréninku", () => {
  const b = {id: "b", mode: "st", by: "pos", dur: 20, rot: null, lanes: [{id: "x", grp: [FW]}, {id: "y", grp: [DF]}, {id: "z", grp: [GK]}]};
  const R = rotation(b);
  assert.equal(R.length, 2); assert.deepEqual(R[1].lanes, {z: [GK], y: [FW], x: [DF]});
  assert.deepEqual(planIssues({blocks: [b]}, {groups: [1, 2, GK], pgroups: [FW, DF, GK]}).filter(i => i.blk === 0 && !/bez cvičení/.test(i.t)), []);
  const miss = planIssues({blocks: [{...b, lanes: [{id: "x", grp: [FW]}, {id: "y", grp: []}]}]}, {groups: [1], pgroups: [FW, DF]});
  assert.ok(miss.some(i => /Obránkyně není na žádném stanovišti/.test(i.t)));
  const C = planCopy({blocks: [b]}, [1, 2], null, {}, [FW, DF]);
  assert.deepEqual(C.blocks[0].lanes.map(l => l.grp), [[FW], [DF], [GK]]);
  assert.equal(C.blocks[0].by, "pos");
});
test("pokrytí dovedností: blok podle postů počítá linku postu hráčky", () => {
  const D = {s: {id: "s", sk: ["shot"]}, d: {id: "d", sk: ["def"]}};
  const plan = {blocks: [{id: "b", mode: "all", by: "pos", dur: 10, lanes: [{id: "x", drill: "s", grp: [FW]}, {id: "y", drill: "d", grp: [DF]}]}]};
  assert.deepEqual(groupSkills(plan, 1, D, FW), {shot: 10});
  assert.deepEqual(groupSkills(plan, 1, D, DF), {def: 10});
  const r = skillCoverage({pids: ["a", "b"], goalies: new Set(), trainings: [{id: "e", lines: {a: 1, b: 1}}], plans: {e: plan},
    att: [{eid: "e", pid: "a", st: "yes"}, {eid: "e", pid: "b", st: "yes"}], drills: D, pos: {a: U, b: O}});
  assert.equal(r.rows.find(x => x.k === "shot").have, 1);
});
test("pravidla: plevel jen realizační tým, dokument jen se známými poli", () => {
  const R = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const m = /match \/plevel\/\{id\} \{([\s\S]*?)\n    \}/.exec(R);
  assert.ok(m, "match /plevel");
  assert.match(m[1], /allow read: if isStaff\(\);/);
  assert.match(m[1], /allow create, update: if isStaff\(\) && plevelOk\(request\.resource\.data\);/);
  assert.match(R, /function plevelOk\(d\) \{\s*return d\.keys\(\)\.hasOnly\(\['v', 'lv', 'by', 'at'\]\)/);
});
