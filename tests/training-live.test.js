// Testy živého tréninku (src/domain/training-live.js): společné hodiny s časem serveru a odchylkou zařízení, poloha v plánu
// (blok, kolo točení, zbývající čas), posuny, řízení, upozornění 60 s / 10 s a lidé na lince; pravidla trlive (kontrola textu).
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ALERT_AT, TRLIVE_COLL, alertsDue, coachLanes, groupPids, liveAt, liveCtl, liveSec, mmss, skewNext, skewObs, stepSec, stops, tsMs} from "../src/domain/training-live.js";
import {DF, FW, GK} from "../src/domain/training-plan.js";

// ===== Pomocná data =====
// Blok 1 Společně 10 min, blok 2 stanoviště 20 min (2 točící linky po 10 min + brankářky), blok 3 podle postů 6 min
const B = [
  {id: "a", mode: "all", dur: 10, lanes: [{id: "a1", grp: [], co: ["t1", "t2"]}]},
  {id: "b", mode: "st", dur: 20, rot: null, lanes: [{id: "x", grp: [1, 2], co: ["t1"]}, {id: "y", grp: [3], co: ["t2"]}, {id: "g", grp: [GK], co: ["t3"]}]},
  {id: "c", mode: "all", by: "pos", dur: 6, lanes: [{id: "f", grp: [FW]}, {id: "d", grp: [DF]}]}
];
const T0 = 1_700_000_000_000;

// ===== Hodiny =====
test("tsMs: číslo, Timestamp i jeho JSON", () => {
  assert.equal(TRLIVE_COLL, "trlive");
  assert.equal(tsMs(5), 5); assert.equal(tsMs({toMillis: () => 7}), 7); assert.equal(tsMs({seconds: 2, nanoseconds: 5e6}), 2005);
  assert.equal(tsMs(null), null); assert.equal(tsMs("__now"), null);
});
test("liveSec: běh od času serveru s odchylkou zařízení, pauza drží čas, bez času serveru od wAt", () => {
  assert.equal(liveSec(null, T0), null);
  const run = {st: "run", e0: 30, sAt: {seconds: T0 / 1000}, wAt: T0 - 999};
  assert.equal(liveSec(run, T0 + 10_000), 40);
  assert.equal(liveSec(run, T0 + 12_000, 2000), 40, "zařízení jde o 2 s napřed");
  assert.equal(liveSec({...run, st: "pause"}, T0 + 99_000), 30);
  assert.equal(liveSec({st: "run", e0: 0, sAt: null, wAt: T0}, T0 + 5000), 5);
  assert.equal(liveSec({st: "run", e0: 0, sAt: T0}, T0 - 5000), 0, "nikdy záporně");
});
test("odchylka hodin: pozorování z čerstvé změny, nejmenší vyhrává", () => {
  assert.equal(skewObs({sAt: T0}, T0 + 350), 350);
  assert.equal(skewObs({sAt: null}, T0), null);
  assert.equal(skewNext(null, 300), 300); assert.equal(skewNext(300, 120), 120); assert.equal(skewNext(120, 400), 120); assert.equal(skewNext(50, null), 50);
});

// ===== Poloha v plánu =====
test("liveAt: blok, kolo točení a zbývající čas", () => {
  let p = liveAt(B, 125);
  assert.equal(p.bi, 0); assert.equal(p.ri, 0); assert.equal(p.left, 475); assert.equal(p.bleft, 475); assert.equal(p.key, "0|0");
  p = liveAt(B, 600 + 610);
  assert.equal(p.bi, 1); assert.equal(p.ri, 1); assert.equal(p.nr, 2); assert.equal(p.left, 590); assert.deepEqual(p.round.lanes.y, [1, 2]);
  p = liveAt(B, 36 * 60);
  assert.equal(p.done, true); assert.equal(p.total, 2160);
  assert.equal(liveAt([], 5), null);
});
test("posuny: začátky kol, další / předchozí", () => {
  assert.deepEqual(stops(B), [0, 600, 1200, 1800, 2160]);
  assert.equal(stepSec(B, 125, 1), 600);
  assert.equal(stepSec(B, 125, -1), 0, "po víc než 5 s na začátek tohoto kola");
  assert.equal(stepSec(B, 602, -1), 0, "do 5 s od začátku na předchozí kolo");
  assert.equal(stepSec(B, 1250, -1), 1200);
  assert.equal(stepSec(B, 2100, 1), 2160);
});

// ===== Řízení =====
test("liveCtl: start, pauza, pokračování, posun, prodloužení a konec", () => {
  const me = "Trener@x.cz", s = liveCtl("start", null, {now: T0, me});
  assert.deepEqual({...s}, {v: 1, wAt: T0, sAt: "__now", ctl: "trener@x.cz", st: "run", e0: 0});
  const run = {...s, sAt: T0};
  assert.equal(liveCtl("pause", run, {now: T0 + 65_000, me}).e0, 65);
  const ps = {...liveCtl("pause", run, {now: T0 + 65_000, me}), sAt: T0 + 65_000};
  const rs = liveCtl("resume", ps, {now: T0 + 200_000, me});
  assert.equal(rs.st, "run"); assert.equal(rs.e0, 65);
  assert.equal(liveCtl("jump", ps, {now: T0, me, sec: 600}).st, "pause", "posun v pauze zůstane v pauze");
  assert.equal(liveCtl("extend", run, {now: T0 + 100_000, me, sec: 60}).e0, 40);
  assert.equal(liveCtl("end", run, {now: T0 + 1000, me}).st, "end");
  assert.equal(liveCtl("pause", null, {now: T0, me}), null);
});

// ===== Upozornění =====
test("alertsDue: jen čerstvě překročené hranice 60 s a 10 s", () => {
  assert.deepEqual(ALERT_AT, [60, 10]);
  assert.deepEqual(alertsDue(61, 59.5), [60]);
  assert.deepEqual(alertsDue(10.2, 9.9), [10]);
  assert.deepEqual(alertsDue(300, 5), [], "skok hodin neupozorňuje");
  assert.deepEqual(alertsDue(5, 30), []);
  assert.equal(mmss(125.2), "2:06"); assert.equal(mmss(-3), "0:00");
});

// ===== Lidé na lince =====
test("groupPids a coachLanes: hráčky skupin podle pětek, postů a brankářky", () => {
  const R = {lines: {a: 1, b: 2, c: 3}, skaters: [{id: "a", pos: "Útočnice"}, {id: "b", pos: "Obránkyně"}, {id: "c", pos: "Útočnice"}], goalies: ["g1"]};
  assert.deepEqual(groupPids(B[1], [1, 2], R), ["a", "b"]);
  assert.deepEqual(groupPids(B[1], [GK], R), ["g1"]);
  assert.deepEqual(groupPids(B[2], [FW], R), ["a", "c"]);
  assert.deepEqual(coachLanes(B[1], "t2"), ["y"]); assert.deepEqual(coachLanes(B[1], null), []);
});
test("pravidla: trlive čte, kdo smí číst plán, řídí, kdo smí plán upravovat, čas serveru a řídící = zapisující", () => {
  const R = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const m = /match \/trlive\/\{id\} \{([\s\S]*?)\n    \}/.exec(R);
  assert.ok(m, "match /trlive");
  assert.match(m[1], /allow read: if can\('trplan', 'r'\);/);
  assert.match(m[1], /allow create, update: if can\('trplan', 'e'\) && trliveOk\(request\.resource\.data\);/);
  assert.match(m[1], /allow delete: if can\('trplan', 'e'\);/);
  assert.match(R, /function trliveOk\(d\) \{[\s\S]*?d\.sAt == request\.time[\s\S]*?d\.ctl == mail\(\)/);
});
