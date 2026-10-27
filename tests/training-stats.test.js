// Testy 📈 přehledu Tréninku (src/domain/training-stats.js): období, výsledky měření po cvičeních (nejlepší, zlepšení, pořadí),
// zátěž hráček podle plánu a docházky (minuty po cvičeních a dovednostech), hodnocení jedné hráčky, řádky CSV; groupDrills (skill-coverage.js).
import test from "node:test";
import assert from "node:assert/strict";
import {groupDrills, groupSkills} from "../src/domain/skill-coverage.js";
import {fmtVal} from "../src/domain/stopwatch.js";
import {GK} from "../src/domain/training-plan.js";
import {TS_DEF, drillList, improve, loadRows, loadSkills, measExercises, measRows, measTable, missSkill, playerEvals, playerLoad, playerMeas, statWindow} from "../src/domain/training-stats.js";

// ===== Pomocná data =====
const lane = (id, drill, grp) => ({id, drill, dn: drill + "-plán", di: [], co: [], grp});
const D = {sh: {name: "Střelba", sk: ["shot"]}, sk: {name: "Bruslení", sk: ["skate"]}, gk: {name: "Brankářky", sk: ["gk"]}};
const PLAN = {v: 1, blocks: [
  {id: "b1", mode: "all", dur: 10, rot: null, lanes: [lane("w", "sk", [])]},
  {id: "b2", mode: "st", dur: 20, rot: null, lanes: [lane("A", "sh", [1]), lane("B", "sk", [2]), lane("G", "gk", [GK])]}
]};
const EV = [
  {id: "t1", date: "2026-08-01", lines: {p1: 1, p2: 2}},
  {id: "t2", date: "2026-10-01", lines: {p1: 1, p2: 2}},
  {id: "t3", date: "2026-10-20", lines: {p1: 1, p2: 2}, cancelled: {by: "x"}},
  {id: "t4", date: "2026-10-25", lines: {p1: 1, p2: 2}},
  {id: "t5", date: "2026-11-02", lines: {}}
];
const MS = {
  t2: {r: {"b1_w": {d: "sp", dn: "Sprint", u: "s", low: true, ms: {p1: [5.4, 5.2], p2: [5.8]}}, "b4_x": {d: "sp", dn: "Sprint", u: "s", low: true, ms: {p1: [5.1]}}}},
  t4: {r: {"b1_w": {d: "sp", dn: "Sprint", u: "s", low: true, ms: {p1: [5.3], p2: [5.5], p3: [5.1]}}, "b2_A": {d: "", dn: "Střely", u: "ks", low: false, ms: {p1: [4, 6]}}}}
};

// ===== Období =====
test("statWindow: jen nezrušené tréninky v období do dneška, nejstarší první", () => {
  assert.equal(TS_DEF, 60);
  assert.deepEqual(statWindow(EV, "2026-10-27", 60).map(e => e.id), ["t2", "t4"]);
  assert.deepEqual(statWindow(EV, "2026-10-27", 90).map(e => e.id), ["t1", "t2", "t4"]);
  assert.deepEqual(statWindow([...EV, {id: "m", date: "2026-10-26", type: "match"}], "2026-10-27").map(e => e.id), ["t2", "t4"], "zápas se nepočítá");
});

// ===== Měření =====
test("measExercises: stejné cvičení na dvou linkách se sloučí (nejlepší), bez id podle názvu", () => {
  const X = measExercises(statWindow(EV, "2026-10-27"), MS);
  assert.deepEqual(X.map(x => x.dn), ["Sprint", "Střely"]);
  const sp = X[0];
  assert.deepEqual(sp.sess.map(s => s.eid), ["t2", "t4"]);
  assert.deepEqual(sp.sess[0].R, {p1: 5.1, p2: 5.8});
  assert.equal(X[1].id.startsWith("n:"), true);
});
test("measTable: nejlepší, poslední, zlepšení proti minule a pořadí (čas – nižší je lepší)", () => {
  const T = measTable(measExercises(EV, MS)[0]);
  assert.deepEqual(T.map(x => [x.pid, x.best, x.last, x.delta, x.rank, x.n]), [["p1", 5.1, 5.3, -0.2, 1, 2], ["p3", 5.1, 5.1, null, 1, 1], ["p2", 5.5, 5.5, 0.3, 3, 2]]);
  assert.equal(T[0].bestDate, "2026-10-01");
});
test("improve: kladné = lepší podle směru", () => {
  assert.equal(improve(5.5, 5.2, true), 0.3);
  assert.equal(improve(4, 6, false), 2);
  assert.equal(improve(null, 6, false), null);
});
test("playerMeas: výsledky hráčky ve všech cvičeních s řadou bodů", () => {
  const P = playerMeas(measExercises(EV, MS), "p1");
  assert.deepEqual(P.map(x => [x.dn, x.best, x.rank, x.of, x.pts.length]), [["Sprint", 5.1, 1, 3, 2], ["Střely", 6, 1, 1, 1]]);
  assert.deepEqual(playerMeas(measExercises(EV, MS), "p9"), []);
});

// ===== Zátěž hráček =====
test("groupDrills: minuty po cvičeních bez banky; groupSkills z nich beze změny", () => {
  const g1 = groupDrills(PLAN, 1, null);
  assert.deepEqual(Object.values(g1).map(x => [x.d, x.dn, x.min]), [["sk", "sk-plán", 20], ["sh", "sh-plán", 10]]);
  assert.deepEqual(groupSkills(PLAN, 1, D), {skate: 20, shot: 10}, "1. pětka: společný blok + obě stanoviště po 10 min");
  assert.deepEqual(groupSkills(PLAN, GK, D), {skate: 10, gk: 20});
});
test("playerLoad: jen tréninky s účastí, minuty po cvičeních i dovednostech; bez banky jen cvičení", () => {
  const T = statWindow(EV, "2026-10-27"), att = [{eid: "t2", pid: "p1", st: "yes"}, {eid: "t4", pid: "p1", st: "yes"}, {eid: "t4", pid: "p2", st: "yes", nos: true}, {eid: "t2", pid: "g", st: "yes"}];
  const plans = {t2: PLAN, t4: null};
  const L = playerLoad({pids: ["p1", "p2", "g"], trainings: T, plans, att, goalies: new Set(["g"]), pos: {p1: "Útočnice"}, drills: D});
  assert.deepEqual([L.p1.nt, L.p1.n, L.p1.min], [2, 1, 30]);
  assert.deepEqual(L.p1.sk, {skate: 20, shot: 10});
  assert.deepEqual([L.p2.nt, L.p2.n], [0, 0], "🚫 nedorazila se nepočítá");
  assert.deepEqual(L.g.sk, {skate: 10, gk: 20});
  assert.deepEqual(drillList(L.p1).map(x => [x.dn, x.min]), [["Bruslení", 20], ["Střelba", 10]]);
  assert.deepEqual(loadSkills(L), ["skate", "shot", "gk"]);
  assert.deepEqual(missSkill(L, "shot"), ["g"]);
  const H = playerLoad({pids: ["p1"], trainings: T, plans, att, goalies: new Set(), pos: {}});
  assert.deepEqual(H.p1.sk, {}, "bez banky žádné dovednosti");
  assert.deepEqual(drillList(H.p1).map(x => x.dn), ["sk-plán", "sh-plán"]);
});

// ===== Hodnocení =====
test("playerEvals: hodnocení jedné hráčky, počty a průměr, nejnovější první", () => {
  const ev = {t2: {r: {a: {dn: "Sprint", pl: {p1: {r: 4, n: ""}, p2: {r: 2, n: ""}}}}}, t4: {r: {b: {dn: "Střely", pl: {p1: {r: 2, n: "  pozdě "}}}, c: {dn: "Hra", pl: {p1: {r: 0, n: ""}}}}}};
  const E = playerEvals(statWindow(EV, "2026-10-27"), ev, "p1");
  assert.deepEqual(E.cnt, {4: 1, 3: 0, 2: 1, 1: 0});
  assert.equal(E.avg, 3);
  assert.deepEqual(E.items.map(x => [x.eid, x.dn, x.r, x.n]), [["t4", "Střely", 2, "pozdě"], ["t2", "Sprint", 4, ""]]);
  assert.equal(playerEvals([], ev, "p1").avg, null);
});

// ===== CSV =====
test("loadRows a measRows: hlavička a řádky pro Excel", () => {
  const L = {p1: {nt: 2, n: 1, min: 20.4, sk: {skate: 10.2, shot: 10.2}}};
  const R = loadRows(L, ["p1"], id => "Anna", ["skate", "shot"]);
  assert.equal(R[0][0], "Hráčka");
  assert.deepEqual(R[1], ["Anna", 2, 1, 20, 10, 10]);
  const M = measRows(measExercises(EV, MS), id => id, fmtVal);
  assert.equal(M.length, 1 + 3 + 1);
  assert.deepEqual(M[1].slice(0, 5), ["Sprint", "s", "p1", 1, "5,10 s"]);
  assert.equal(M[1][7], "−0,20 s");
  assert.equal(M[3][7], "+0,30 s");
});
