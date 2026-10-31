// Testy v22.29 (K2 bod 5 Zápas): sestava „Jako minule“ (lastLineupMatch, lineupLike, unitsLike) a souhrn uzavřeného zápasu ke sdílení (matchSummary).
import test from "node:test";
import assert from "node:assert/strict";
import {lastLineupMatch, lineupLike, matchSummary, periodScores, unitsLike} from "../src/domain/match-share.js";

// ===== Pomocná data =====
const M = (id, date, lineup, extra = {}) => ({id, date, opp: "Soupeř " + id, home: true, lineup, ...extra});
const names = {a: "Anna", b: "Bára", c: "Cecílie", d: "Dana", g: "Gábina"};
const name = id => names[id] || id;

// ===== Sestava „Jako minule“ =====
test("lastLineupMatch: poslední jiný zápas se sestavou proti komukoli, nejdřív do data tohoto zápasu", () => {
  const L = [M("m1", "2026-10-01", {"1C": "a"}), M("m2", "2026-10-10", {"1C": "b"}), M("m3", "2026-10-20", {}), M("m4", "2026-11-30", {"1C": "c"})];
  assert.equal(lastLineupMatch(L, M("x", "2026-10-25", {})).id, "m2", "m3 bez sestavy se přeskočí, m4 je až po zápase");
  assert.equal(lastLineupMatch(L, M("m2", "2026-10-10", {"1C": "b"})).id, "m1", "sám sebe nebere");
  assert.equal(lastLineupMatch([M("m4", "2026-11-30", {"1C": "c"})], M("x", "2026-10-25", {})).id, "m4", "jen pozdější = vezme ho");
  assert.equal(lastLineupMatch([], M("x", "2026-10-25", {})), null);
});
test("lineupLike: jen nominované hráčky, rotace se setřese; unitsLike vynechá nenominované i prázdné jednotky", () => {
  const prev = {"1C": "a", "1LW": "b", "1C+": "c", "1C++": "d", G1: "g"};
  const lu = lineupLike(prev, ["a", "d", "g"]);
  assert.deepEqual(lu, {"1C": "a", "1C+": "d", G1: "g"});
  assert.deepEqual(lineupLike(prev, ["a", "b"], id => id !== "b"), {"1C": "a"}, "ok() vyřadí ukončenou hráčku");
  assert.deepEqual(unitsLike({PP1: {C: "a", LW: "b"}, SH1: {C: "c"}}, ["a"]), {PP1: {C: "a"}});
});

// ===== Souhrn ke sdílení =====
test("matchSummary: výsledek s třetinami, góly se stavem a asistencemi, střely, tresty, nejvíc bodů", () => {
  const m = {id: "z", date: "2026-10-31", time: "17:00", place: "Zimní stadion", opp: "Lvice", home: true, events: [
    {k: "G", team: "us", per: 1, time: "05:10", scorer: "a", a1: "b"},
    {k: "S", team: "us", per: 1, shooter: "a"},
    {k: "G", team: "opp", per: 2, time: "12:00"},
    {k: "P", team: "opp", per: 2, min: 2},
    {k: "G", team: "us", per: 3, time: "18:30", scorer: "a"}
  ]};
  assert.deepEqual(periodScores(m), ["1:0", "0:1", "1:0"]);
  const t = matchSummary(m, {team: "Střely", name, fd: d => d});
  assert.match(t, /^🏒 Střely – Lvice 2:1 \(1:0, 0:1, 1:0\) – výhra/);
  assert.match(t, /📅 2026-10-31 17:00 · Zimní stadion · doma/);
  assert.match(t, /1:0 Anna \(Bára\) · 1\. tř\. 05:10/);
  assert.match(t, /1:1 soupeř · 2\. tř\. 12:00/);
  assert.match(t, /🏒 Střely 3:1 · 🚫 Tresty 0:2 min/);
  assert.match(t, /⭐ Nejvíc bodů: Anna \(2\)/);
});
test("matchSummary venku: domácí soupeř první, skóre i třetiny z jeho pohledu; bez střel a trestů bez řádku", () => {
  const m = {id: "v", date: "2026-11-01", opp: "Lvice", home: false, events: [{k: "G", team: "opp", per: 1, time: "01:00"}]};
  const t = matchSummary(m, {team: "Střely", name, fd: d => d});
  assert.match(t, /^🏒 Lvice – Střely 1:0 \(1:0, 0:0, 0:0\) – prohra/);
  assert.match(t, /1:0 soupeř · 1\. tř\. 01:00/);
  assert.doesNotMatch(t, /🏒 Střely \d|Tresty|Nejvíc/);
});
