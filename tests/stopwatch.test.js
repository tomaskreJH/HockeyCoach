// Testy ⏲ stopek a výsledků měření (src/domain/stopwatch.js), textu oznámení živého tréninku (liveNote, okno alertsDue),
// práv modulu treval (domain/permissions.js) a pravidel kolekce trms (kontrola textu firestore.rules). Čisté funkce – nic se nezapisuje.

// ===== Importy =====
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {CAN_ACTS, DEFAULT_PERMS, actOf, isEditable, permOf} from "../src/domain/permissions.js";
import {MS_MAX, TRMS_COLL, addTry, bestOf, dropTry, fmtVal, laneMeas, measLanes, msKey, msMeta, msPatch, msVal, myResults, ranking, swSec, swStart, swStop, swText} from "../src/domain/stopwatch.js";
import {alertsDue, liveNote} from "../src/domain/training-live.js";

// ===== Data =====
const D = {
  d1: {id: "d1", name: "Sprint 30 m", dur: 10, meas: {u: "s", low: true}},
  d2: {id: "d2", name: "Střelba 10 pokusů", dur: 12, meas: {u: "ks", low: false}},
  d3: {id: "d3", name: "Rozbruslení", dur: 8, meas: null}
};
const plan = {blocks: [
  {id: "b1", mode: "all", dur: 10, lanes: [{id: "l1", drill: "d3", grp: []}]},
  {id: "b2", mode: "st", dur: 20, lanes: [{id: "l2", drill: "d1", grp: [1]}, {id: "l3", drill: "d2", grp: [2]}, {id: "l4", drill: "d3", grp: ["G"]}]}
]};

// ===== Hodnoty a formát =====
test("msVal a fmtVal: zaokrouhlení podle jednotky, čárka, neplatné hodnoty", () => {
  assert.equal(msVal(12.345, "s"), 12.35);
  assert.equal(msVal("7,4", "ks"), 7);
  assert.equal(msVal("7,25", "b"), 7.3);
  assert.equal(msVal(0, "s"), null, "čas musí být kladný");
  assert.equal(msVal(0, "ks"), 0);
  assert.equal(msVal(-1, "b"), null);
  assert.equal(msVal("", "ks"), null);
  assert.equal(msVal(5, "x"), null);
  assert.equal(msVal(4000, "s"), null);
  assert.equal(fmtVal(12.3, "s"), "12,30 s");
  assert.equal(fmtVal(65.3, "s"), "1:05,30");
  assert.equal(fmtVal(7, "ks"), "7 ks");
  assert.equal(fmtVal(7.5, "b"), "7,5 b");
  assert.equal(fmtVal(null, "s"), "–");
});

// ===== Stopky =====
test("stopky: start více hráček, běžící se nemění, stop vrátí čas, nebežící null", () => {
  let run = swStart({}, ["p1", "p2"], 1000);
  run = swStart(run, ["p1", "p3"], 5000);
  assert.deepEqual(run, {p1: 1000, p2: 1000, p3: 5000});
  assert.equal(swSec(run, "p1", 3500), 2.5);
  assert.equal(swSec(run, "x", 3500), null);
  const r = swStop(run, "p1", 13340);
  assert.equal(r.sec, 12.34);
  assert.deepEqual(Object.keys(r.run).sort(), ["p2", "p3"]);
  assert.equal(swStop(r.run, "p1", 20000).sec, null);
  assert.equal(swStop({p: 100}, "p", 100).sec, 0.01, "nejmenší čas");
  assert.equal(swText(12.37), "12,3");
  assert.equal(swText(62.31), "1:02,3");
});

// ===== Pokusy a pořadí =====
test("pokusy: přidání (nejvýš MS_MAX), oprava posledního, nejlepší podle směru", () => {
  assert.deepEqual(addTry([5.1], 4.9, "s"), [5.1, 4.9]);
  assert.equal(addTry([5.1], "abc", "s"), null);
  const many = Array.from({length: MS_MAX}, (_, i) => i + 1);
  assert.equal(addTry(many, 99, "ks").length, MS_MAX);
  assert.equal(addTry(many, 99, "ks")[MS_MAX - 1], 99);
  assert.deepEqual(dropTry([1, 2, 3]), [1, 2]);
  assert.equal(bestOf([5.1, 4.9, 6], true), 4.9);
  assert.equal(bestOf([5, 9, 6], false), 9);
  assert.equal(bestOf([], true), null);
});
test("ranking: pořadí podle nejlepšího, shoda = stejné pořadí, bez pokusů se nevypisuje; myResults", () => {
  const e = {u: "s", low: true, ms: {a: [5.2, 4.8], b: [4.8], c: [6], d: []}};
  const R = ranking(e);
  assert.deepEqual(R.map(x => [x.pid, x.rank, x.best, x.n]), [["a", 1, 4.8, 2], ["b", 1, 4.8, 1], ["c", 3, 6, 1]]);
  const hi = ranking({low: false, ms: {a: [3], b: [7]}});
  assert.deepEqual(hi.map(x => x.pid), ["b", "a"]);
  const res = {r: {[msKey("b2", "l2")]: {dn: "Sprint", ...e}}};
  assert.deepEqual(myResults(res, "c").map(x => [x.dn, x.rank, x.of, x.best]), [["Sprint", 3, 3, 6]]);
  assert.deepEqual(myResults(res, "zz"), []);
  assert.deepEqual(myResults(res, null), []);
});

// ===== Měřené linky =====
test("measLanes: jen linky s měřením nebo s uloženými výsledky, uložená jednotka má přednost", () => {
  const L = measLanes(plan, D, null);
  assert.deepEqual(L.map(x => [x.key, x.u, x.low, x.dn]), [["b2_l2", "s", true, "Sprint 30 m"], ["b2_l3", "ks", false, "Střelba 10 pokusů"]]);
  const res = {r: {b2_l2: {d: "d1", dn: "Sprint (staré)", u: "b", low: false, ms: {}}, old_x: {d: "d9", dn: "Smazaná linka", u: "s", low: true, ms: {p: [3]}}}};
  const L2 = measLanes(plan, D, res);
  assert.deepEqual(L2.map(x => [x.key, x.u, x.dn, x.bi]), [["b2_l2", "b", "Sprint (staré)", 1], ["b2_l3", "ks", "Střelba 10 pokusů", 1], ["old_x", "s", "Smazaná linka", null]]);
  assert.deepEqual(measLanes(plan, {}, null), [], "hráčka bez banky a bez výsledků nic nevidí");
  assert.equal(laneMeas(plan.blocks[1], plan.blocks[1].lanes[0], D, null).u, "s");
  assert.equal(laneMeas(plan.blocks[1], plan.blocks[1].lanes[2], D, null), null);
});
test("msPatch: částečný zápis jedné linky, kopie názvu a jednotky, nejvýš MS_MAX pokusů", () => {
  const m = {key: "b2_l2", d: "d1", dn: "Sprint 30 m", u: "s", low: true};
  assert.deepEqual(msPatch(m, {p1: [4.9, 5.1], p2: [6, "x"]}), {v: 1, r: {b2_l2: {d: "d1", dn: "Sprint 30 m", u: "s", low: true, ms: {p1: [4.9, 5.1], p2: [6]}}}});
  assert.equal(msPatch(m, {p: Array.from({length: 30}, (_, i) => i + 1)}).r.b2_l2.ms.p.length, MS_MAX);
  assert.deepEqual(msMeta({dn: "x".repeat(100), u: "zz"}), {d: "", dn: "x".repeat(80), u: "s", low: false});
  assert.equal(TRMS_COLL, "trms");
});

// ===== Oznámení živého tréninku =====
test("liveNote (v22.28 krátce pro hodinky): titulek = co se děje, tělo = co bude; alertsDue s větším oknem pro skrytou aplikaci", () => {
  const cur = {where: "Stanoviště B", what: "Střelba", who: "2. pětka"}, nxt = {where: "Stanoviště C", what: "Přihrávky", who: "2. pětka"};
  const a = liveNote(60, cur, nxt, 60, "18:42");
  assert.equal(a.title, "⏱ 1:00 · Střelba");
  assert.equal(a.body, "Pak: Přihrávky · St. C · 2. pětka");
  assert.equal(liveNote(10, cur, nxt, 10).title, "⏱ 0:10 → Přihrávky · St. C");
  assert.equal(liveNote(10, cur, nxt, 10).body, "2. pětka");
  assert.equal(liveNote(10, cur, null, 10).title, "⏱ 0:10 → konec");
  const s = liveNote("switch", cur, nxt, 300, "18:42");
  assert.equal(s.title, "▶ Střelba · St. B");
  assert.equal(s.body, "2. pětka · do 18:42 · Pak: Přihrávky · St. C · 2. pětka");
  assert.equal(liveNote("end", null, null, 0).title, "✅ Konec plánu");
  assert.match(liveNote("end", null, null, 0).body, /ukončí trenér/);
  assert.deepEqual(alertsDue(70, 5), [], "viditelná aplikace: skok neupozorní");
  assert.deepEqual(alertsDue(70, 5, undefined, 70), [10], "skrytá aplikace: jen poslední překročená hranice");
  assert.deepEqual(alertsDue(75, 40, undefined, 70), [60]);
});

// ===== Práva a pravidla =====
test("práva treval: trenér a asistent číst + měřit (měřit jde měnit), hráčka a hostující nic; zkratky HK.can beze změny", () => {
  for (const r of ["trener", "asistent"]) {
    assert.deepEqual(DEFAULT_PERMS[r].treval, {r: true, e: true, c: false, d: false});
    assert.equal(isEditable(r, "treval", "e"), true);
    assert.equal(isEditable(r, "treval", "r"), false);
  }
  assert.deepEqual(DEFAULT_PERMS.hracka.treval, {r: false, e: false, c: false, d: false});
  assert.equal(isEditable("hracka", "treval", "r"), false);
  assert.equal(permOf("host", "treval", "r", {}), false);
  assert.equal(permOf("manager", "treval", "e", {}), true);
  assert.equal(permOf("asistent", "treval", "e", {asistent: {treval: {e: false}}}), false);
  const F = {trener: {treval: {e: false}}, asistent: {treval: {e: false}}};
  for (const r of ["manager", "trener", "asistent", "hracka", "host"]) for (const a of CAN_ACTS) for (const cash of [false, true]) {
    assert.equal(actOf(r, cash, a, false, F), actOf(r, cash, a, false, {}), r + " " + a);
  }
});
test("pravidla: trms čte, kdo čte plán, zapisuje a maže modul treval e, dokument jen se známými poli", () => {
  const R = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const m = R.match(/match \/trms\/\{id\} \{([\s\S]*?)\n    \}/);
  assert.ok(m, "chybí trms");
  assert.match(m[1], /allow read: if can\('trplan', 'r'\);/);
  assert.match(m[1], /allow create, update: if can\('treval', 'e'\) && trmsOk\(request\.resource\.data\);/);
  assert.match(m[1], /allow delete: if can\('treval', 'e'\);/);
  assert.match(R, /function trmsOk\(d\) \{\s+return d\.keys\(\)\.hasOnly\(\['v', 'r', 'by', 'at'\]\) && d\.r is map/);
});
