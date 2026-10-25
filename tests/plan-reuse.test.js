// Testy opakovaného použití plánu (src/domain/plan-reuse.js – kopie, šablony, výběr tréninků), 📊 pokrytí dovedností
// (src/domain/skill-coverage.js), kontroly použití cvičení před smazáním a pravidel kolekce trtpl (kontrola textu firestore.rules).
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {drillCanDelete} from "../src/domain/drills.js";
import {COPY_MAX, TPL_MAX, TRTPL_COLL, copySources, planCopy, planSummary, tplDoc, tplError, tplSort} from "../src/domain/plan-reuse.js";
import {addDays, coverWindow, groupSkills, skillCoverage} from "../src/domain/skill-coverage.js";
import {GK, drillUsage, rotation} from "../src/domain/training-plan.js";

// ===== Pomocná data =====
const lane = (id, drill, grp, co = []) => ({id, drill, dn: drill, di: [], co, grp});
const D = {sh: {name: "Střelba", sk: ["shot"]}, sk: {name: "Bruslení", sk: ["skate", "puck"]}, gk: {name: "Brankářky", sk: ["gk"]}, ps: {name: "Přihrávky", sk: ["pass"]}};
const PLAN = {v: 1, goal: "Střelba", blocks: [
  {id: "b1", mode: "all", dur: 10, rot: null, lanes: [lane("w", "sk", [], ["t1"])]},
  {id: "b2", mode: "st", dur: 20, rot: null, lanes: [lane("A", "sh", [1, 3], ["t1"]), lane("B", "ps", [2], ["t2"]), lane("G", "gk", [GK], ["t3"])]}
]};

// ===== Kopie plánu =====
test("planCopy: nová id, cvičení a délky zůstanou, skupiny stanovišť podle nového rozdělení, 🥅 linka zůstane", () => {
  const c = planCopy(PLAN, [1, 2, 3, 4, GK], ["t1", "t3"], D);
  assert.equal(c.goal, "Střelba");
  assert.deepEqual(c.blocks.map(b => [b.mode, b.dur]), [["all", 10], ["st", 20]]);
  assert.ok(c.blocks.every(b => b.id !== "b1" && b.id !== "b2" && b.lanes.every(l => !["w", "A", "B", "G"].includes(l.id))));
  const st = c.blocks[1];
  assert.deepEqual(st.lanes.map(l => l.drill), ["sh", "ps", "gk"]);
  assert.deepEqual(st.lanes.map(l => l.grp), [[1, 3], [2, 4], [GK]], "pětky střídavě na linky, které se točí");
  assert.deepEqual(st.lanes.map(l => l.co), [["t1"], [], ["t3"]], "jen přihlášení trenéři");
  assert.equal(st.lanes[0].dn, "Střelba", "název z banky");
  assert.deepEqual(rotation(st).length, 2);
});
test("planCopy: méně pětek, bez seznamu trenérů, bez zdroje", () => {
  const c = planCopy(PLAN, [1], null, D);
  assert.deepEqual(c.blocks[1].lanes.map(l => l.grp), [[1], [], [GK]]);
  assert.deepEqual(c.blocks[1].lanes.map(l => l.co), [["t1"], ["t2"], ["t3"]], "null = trenéři zůstanou");
  assert.deepEqual(planCopy({blocks: [{mode: "all", dur: 5, lanes: [lane("x", "sh", [2, 4])]}]}, [2]).blocks[0].lanes[0].grp, [2], "Společně – jen pětky tréninku");
  assert.deepEqual(planCopy(null, []).blocks, []);
  assert.equal(PLAN.blocks[1].lanes[0].id, "A", "zdroj se nemění");
});

// ===== Šablony =====
test("tplDoc: bez trenérů a skupin stanovišť, 🥅 a skupiny Společně zůstanou, název oříznutý", () => {
  const t = tplDoc("  Stanoviště střelba  ", PLAN, D);
  assert.equal(t.name, "Stanoviště střelba");
  assert.deepEqual(Object.keys(t).sort(), ["blocks", "goal", "name", "v"]);
  assert.ok(t.blocks.every(b => b.lanes.every(l => l.co.length === 0)));
  assert.deepEqual(t.blocks[1].lanes.map(l => l.grp), [[], [], [GK]]);
  assert.equal(tplDoc("x".repeat(99), PLAN).name.length, TPL_MAX.name);
});
test("tplError, tplSort, planSummary", () => {
  assert.match(tplError("  "), /název/);
  assert.match(tplError("x".repeat(TPL_MAX.name + 1)), /delší/);
  assert.match(tplError("A", Array(TPL_MAX.list).fill({})), /smaž/);
  assert.equal(tplError("Šablona", []), null);
  assert.deepEqual(tplSort([{name: "Č"}, {name: "B"}, {name: "Ž"}, {name: "A"}]).map(t => t.name), ["A", "B", "Č", "Ž"]);
  assert.equal(planSummary(PLAN), "2 bloky · 30 min");
  assert.equal(planSummary({blocks: [{dur: 5}]}), "1 blok · 5 min");
  assert.equal(TRTPL_COLL, "trtpl");
});
test("copySources: jen dřívější nezrušené tréninky, nejbližší první, nejvýš COPY_MAX", () => {
  const ev = [{id: "now", date: "2026-10-25", time: "17:00"}, {id: "a", date: "2026-10-20", time: "17:00"}, {id: "b", date: "2026-10-25", time: "08:00"},
    {id: "c", date: "2026-10-22", time: "17:00", cancelled: {by: "x"}}, {id: "d", date: "2026-11-01", time: "17:00"}];
  assert.deepEqual(copySources(ev, "now").map(e => e.id), ["b", "a"]);
  const many = [{id: "x", date: "2027-01-01"}, ...Array.from({length: 20}, (_, i) => ({id: "e" + i, date: "2026-10-" + String(i + 1).padStart(2, "0")}))];
  assert.equal(copySources(many, "x").length, COPY_MAX);
});

// ===== Pokrytí dovedností =====
test("addDays a coverWindow: období před tréninkem bez zrušených", () => {
  assert.equal(addDays("2026-03-30", -30), "2026-02-28");
  assert.equal(addDays("x", 1), "");
  const ev = [{id: "now", date: "2026-10-25"}, {id: "a", date: "2026-10-24"}, {id: "b", date: "2026-09-25"}, {id: "c", date: "2026-09-24"}, {id: "d", date: "2026-10-20", cancelled: {}}, {id: "e", date: "2026-10-26"}];
  assert.deepEqual(coverWindow(ev, "now", 30).map(e => e.id), ["a", "b"]);
  assert.deepEqual(coverWindow(ev, "zzz", 30), []);
});
test("groupSkills: minuty podle linky skupiny v kolech, Společně pro všechny i bez pětky", () => {
  assert.deepEqual(groupSkills(PLAN, 1, D), {skate: 10, puck: 10, shot: 10, pass: 10});
  assert.deepEqual(groupSkills(PLAN, GK, D), {skate: 10, puck: 10, gk: 20});
  assert.deepEqual(groupSkills(PLAN, 4, D), {skate: 10, puck: 10}, "pětka mimo stanoviště");
  assert.deepEqual(groupSkills(PLAN, null, D), {skate: 10, puck: 10});
  assert.deepEqual(groupSkills(PLAN, 1, {}), {}, "bez banky nic");
});
test("skillCoverage: docházka × plány × dovednosti, 🚫 se nepočítá, brankářky zvlášť, řazení od nejmenšího", () => {
  const T = [{id: "t1", lines: {a: 1, b: 2, c: 1}}, {id: "t2", lines: {a: 1}}, {id: "t3", lines: {}}];
  const att = [{eid: "t1", pid: "a", st: "yes"}, {eid: "t1", pid: "b", st: "yes"}, {eid: "t1", pid: "c", st: "yes", nos: true}, {eid: "t1", pid: "g", st: "yes"},
    {eid: "t2", pid: "a", st: "yes"}, {eid: "t3", pid: "c", st: "yes"}];
  const P2 = {blocks: [{id: "x", mode: "all", dur: 15, lanes: [lane("y", "sh", [])]}]};
  const r = skillCoverage({pids: ["a", "b", "c", "g"], goalies: new Set(["g"]), trainings: T, plans: {t1: PLAN, t2: P2, t3: null}, att, drills: D});
  assert.equal(r.n, 2, "trénink bez plánu se nepočítá");
  assert.deepEqual(r.none, ["c"]);
  const by = Object.fromEntries(r.rows.map(x => [x.k, x]));
  assert.deepEqual([by.shot.have, by.shot.pop, by.shot.pct, by.shot.miss], [2, 3, 67, ["c"]], "pětky 1 i 2 projdou stanovištěm se střelbou");
  assert.equal(by.shot.min, 12, "průměr (10 + 15 + 10) / 3");
  assert.deepEqual([by.pass.have, by.pass.miss], [2, ["c"]]);
  assert.deepEqual([by.def.have, by.def.pct, by.def.miss], [0, 0, ["a", "b", "c"]]);
  assert.deepEqual([by.skate.have, by.skate.pct], [2, 67]);
  assert.deepEqual([by.gk.have, by.gk.pop, by.gk.pct], [1, 1, 100]);
  assert.ok(r.rows.every((x, i) => !i || r.rows[i - 1].pct <= x.pct), "od nejmenšího podílu");
  assert.ok(!skillCoverage({pids: ["a"], goalies: new Set(), trainings: [], plans: {}, att: [], drills: D}).rows.some(x => x.k === "gk"), "🧤 bez brankářek není");
});

// ===== Kontrola použití cvičení =====
test("drillUsage nad plány i šablonami a drillCanDelete", () => {
  const u = drillUsage([PLAN, PLAN, tplDoc("t", PLAN, D), {blocks: [{lanes: [lane("q", "", [])]}]}]);
  assert.deepEqual(u, {sk: 3, sh: 3, ps: 3, gk: 3});
  assert.equal(drillCanDelete({arch: true}, u.sh), false);
  assert.equal(drillCanDelete({arch: true}, u.zzz), true);
});

// ===== Pravidla =====
test("pravidla: trtpl čte a zapisuje jen s trplan e, dokument jen se známými poli", () => {
  const R = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const m = /match \/trtpl\/\{id\} \{([\s\S]*?)\n    \}/.exec(R);
  assert.ok(m, "match /trtpl");
  assert.match(m[1], /allow read: if can\('trplan', 'e'\);/);
  assert.match(m[1], /allow create, update: if can\('trplan', 'e'\) && trtplOk\(request\.resource\.data\);/);
  assert.match(m[1], /allow delete: if can\('trplan', 'e'\);/);
  assert.match(R, /function trtplOk\(d\) \{\s*return d\.keys\(\)\.hasOnly\(\['v', 'name', 'goal', 'blocks', 'by', 'at'\]\)/);
});
