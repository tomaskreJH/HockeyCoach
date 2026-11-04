// 🎯 Trestné střílení: událost, skóre, statistiky hráček a brankářek, text průběhu, rychlý zápis bez ukončení trestu.
import test from "node:test";
import assert from "node:assert/strict";
import {PS_SIT, isPS, psEvent, psText} from "../src/domain/penalty-shot.js";
import {playerStats} from "../src/domain/player-stats.js";
import {REA, SIT, GSIT} from "../src/config/constants.js";

const base = {per: 2, time: "05:00"};

test("gól našeho trestného střílení: k G, ps, sit PS, bez asistencí a +/-", () => {
  const e = psEvent({id: "a", team: "us", ...base, shooter: "p1", goal: true});
  assert.deepEqual(e, {id: "a", k: "G", ps: true, team: "us", per: 2, time: "05:00", scorer: "p1", a1: null, a2: null, sit: PS_SIT, on: []});
  assert.equal(isPS(e), true);
});

test("neproměněné trestné střílení = střela s ps", () => {
  assert.deepEqual(psEvent({id: "b", team: "us", ...base, shooter: "p1", goal: false}), {id: "b", k: "S", ps: true, team: "us", per: 2, time: "05:00", shooter: "p1"});
  assert.deepEqual(psEvent({id: "c", team: "opp", ...base, gk: "g1", pf: "p2", goal: false}), {id: "c", k: "S", ps: true, team: "opp", per: 2, time: "05:00", gk: "g1", pf: "p2"});
});

test("statistiky: gól i střela střelkyni, +/- nikomu, brankářce zásah a gól", () => {
  const m = {home: true, lineup: {"1C": "p1", "1LK": "p2", G1: "g1"}, events: [
    psEvent({id: "1", team: "us", ...base, shooter: "p1", goal: true}),
    psEvent({id: "2", team: "us", ...base, shooter: "p2", goal: false}),
    psEvent({id: "3", team: "opp", ...base, gk: "g1", goal: true}),
    psEvent({id: "4", team: "opp", ...base, gk: "g1", goal: false})]};
  const {T, GK, TT} = playerStats([m]);
  assert.equal(T.p1.g, 1); assert.equal(T.p1.sh, 1); assert.equal(T.p1.pm, 0); assert.equal(T.p1.ppg, 0);
  assert.equal(T.p2.sh, 1); assert.equal(T.p2.pm, 0);
  assert.deepEqual(GK.g1, {sa: 2, ga: 1});
  assert.deepEqual(TT, {sf: 2, sa: 2, gf: 1, ga: 1});
});

test("text průběhu", () => {
  const who = id => ({p1: "#7 Ana", g1: "#1 Bára", p2: "#3 Cecílie"})[id];
  assert.equal(psText(psEvent({id: "x", team: "us", ...base, shooter: "p1", goal: true}), who), "🎯 Trestné střílení – gól: #7 Ana");
  assert.equal(psText(psEvent({id: "x", team: "opp", ...base, gk: "g1", pf: "p2", goal: false}), who), "🎯 Trestné střílení soupeře – chyceno (brankářka #1 Bára) · faul: #3 Cecílie");
});

test("krosček v důvodech trestu, PS mimo výběr situace běžného gólu", () => {
  assert.ok(REA.includes("Krosček"));
  assert.equal(REA[0], "Hákování");
  assert.equal(REA[REA.length - 1], "Jiné");
  assert.equal(SIT.PS, "Trestné střílení");
  assert.deepEqual(GSIT, ["E", "PP", "SH"]);
});
