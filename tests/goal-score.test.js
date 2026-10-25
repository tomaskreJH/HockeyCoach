// Testy stavu skóre po každém gólu (goalScores v src/domain/timeline.js) – průběh v detailu zápasu.
// Čisté funkce – nic se nezapisuje.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {goalScores} from "../src/domain/timeline.js";

// ===== Testy =====
test("goalScores: stav po každém gólu v časovém pořadí (naše:soupeř)", () => {
  const g1 = {k: "G", team: "us", per: 1, time: "05:00", at: 300000, sit: "E"};
  const g2 = {k: "G", team: "opp", per: 2, time: "04:00", at: 1440000, sit: "PP"};
  const g3 = {k: "G", team: "us", per: 1, time: "10:00", at: 600000, sit: "SH"};
  const sh = {k: "S", team: "us", per: 1, time: "02:00", at: 120000};
  const gs = goalScores({events: [g1, g2, sh, g3]});   // zapsané mimo pořadí – rozhoduje čas
  assert.equal(gs.get(g1), "1:0");
  assert.equal(gs.get(g3), "2:0");
  assert.equal(gs.get(g2), "2:1");
  assert.equal(gs.has(sh), false);
  assert.equal(gs.size, 3);
});

test("goalScores: bez časového razítka at se čas odhadne z třetiny a času", () => {
  const a = {k: "G", team: "opp", per: 2, time: "01:00"}, b = {k: "G", team: "us", per: 1, time: "19:00"};
  const gs = goalScores({perLen: 20, events: [a, b]});
  assert.equal(gs.get(b), "1:0");
  assert.equal(gs.get(a), "1:1");
});

test("goalScores: zápas bez událostí", () => {
  assert.equal(goalScores({}).size, 0);
});
