// Testy náhledu živého zápasu pro členy (domain/watch-feed.js): čas a třetina z uloženého stavu, skóre se střelami
// a průběh jen z gólů, trestů, střel a konců třetin (bez střídání, sestav a zranění). Čisté funkce – nic se nezapisuje.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {watchClock, watchFeed, watchScore, WATCH_KINDS} from "../src/domain/watch-feed.js";

// ===== Konstanty =====
const NOW = 1_000_000_000;
// Zápas ve 2. třetině: 1. třetina skončila ve 20:00 herního času, hra běží 90 s od posledního uložení
const M = {
  id: "m1", opp: "Lvice", home: true, perLen: 20,
  live: {running: true, t0: NOW - 90000, acc: 1500000, per: 2, pst: 1200000, ps: [1200000], ice: {C: "p1"}, since: {p1: 1500000}, sh: [{p: "p2", c: "C", a: 0, b: 60000, per: 1}], q: {}, pen: []},
  events: [
    {id: "e1", k: "S", team: "us", per: 1, time: "02:00", shooter: "p1", at: 120000},
    {id: "e2", k: "G", team: "us", per: 1, time: "05:00", scorer: "p1", at: 300000, sit: "E"},
    {id: "e3", k: "P", team: "opp", per: 1, time: "08:00", min: 2, at: 480000},
    {id: "e4", k: "S", team: "opp", per: 2, time: "03:00", at: 1380000},
    {id: "e5", k: "G", team: "opp", per: 2, time: "04:00", at: 1440000, sit: "E"}
  ],
  log: [{id: "l1", ty: "per", per: 1, at: 1200000}, {id: "l2", ty: "unit", label: "PP1", at: 480000}],
  injLog: [{id: "i1", ty: "tmp", id2: "x", at: 500000}]
};

// ===== Čas a třetina =====
test("watchClock: zbývající čas třetiny z uloženého stavu a běžícího úseku", () => {
  const c = watchClock(M, NOW);
  // herní čas 1 500 000 + 90 000 = 1 590 000, ve 2. třetině 390 000 → zbývá 1 200 000 − 390 000
  assert.equal(c.per, 2);
  assert.equal(c.perText, "2. třetina");
  assert.equal(c.left, 810000);
  assert.equal(c.running, true);
  assert.equal(c.ended, false);
});
test("watchClock: přerušená hra, prodloužení, konec zápasu a zápas bez živého zápisu", () => {
  const stop = watchClock({...M, live: {...M.live, running: false, t0: 0}}, NOW);
  assert.equal(stop.left, 900000);
  assert.equal(stop.running, false);
  const ot = watchClock({...M, live: {...M.live, running: false, t0: 0, per: 4, pst: 3600000, acc: 3660000}}, NOW);
  assert.equal(ot.perText, "Prodloužení");
  assert.equal(ot.left, 240000);
  const end = watchClock({...M, end: {per: 3, at: 3600000}}, NOW);
  assert.equal(end.ended, true);
  assert.equal(end.running, false);
  assert.equal(end.left, 0);
  assert.equal(end.perText, "Konec zápasu");
  assert.equal(watchClock({id: "x"}, NOW), null);
  // přetažený čas (zapisovatel nezastavil) se ukáže jako 0, ne záporně
  assert.equal(watchClock({...M, live: {...M.live, t0: NOW - 3000000}}, NOW).left, 0);
});

// ===== Průběh =====
test("watchScore: skóre a střely včetně gólů", () => {
  assert.deepEqual(watchScore(M), {us: 1, them: 1, shUs: 2, shThem: 2});
  assert.deepEqual(watchScore(null), {us: 0, them: 0, shUs: 0, shThem: 0});
});
test("watchFeed: jen góly, tresty, střely a konce třetin, od nejnovější položky", () => {
  const f = watchFeed(M);
  assert.ok(f.every(e => WATCH_KINDS.includes(e.kind)));
  assert.deepEqual(f.map(e => e.kind), ["G", "S", "per", "P", "G", "S"]);
  assert.ok(!f.some(e => e.kind === "sub" || e.kind === "start" || e.kind === "unit" || e.kind === "inj"));
  assert.match(f[0].text, /\(1:1\)$/);                         // průběžné skóre u gólu
  const ns = watchFeed(M, {shotsOn: false});
  assert.deepEqual(ns.map(e => e.kind), ["G", "per", "P", "G"]);
  assert.deepEqual(watchFeed(null), []);
});
