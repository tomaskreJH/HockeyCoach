// Testy v22.8: 📉 odhad čtení databáze na jedno spuštění (domain/read-cost.js).
// Struktura: Importy -> Testy.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {READ_LIMIT, collLabel, readCost} from "../src/domain/read-cost.js";

// ===== Testy =====
test("readCost: součet, největší kolekce, odhad hráčky a počet spuštění do limitu", () => {
  const r = readCost({attendance: 900, events: 60, players: 25, audit: 300, charges: 400, settings: 5, prázdná: 0}, 3);
  assert.equal(r.total, 1690);
  assert.deepEqual(r.top, [["attendance", 900], ["charges", 400], ["audit", 300]]);
  assert.equal(r.player, 900 + 60 + 25 + 10, "hráčka čte docházku, události a hráčky celé, pokladnu a audit ne");
  assert.equal(r.starts, Math.floor(READ_LIMIT / 1690));
});

test("readCost: prázdný vstup a neplatná čísla", () => {
  assert.deepEqual(readCost(null), {total: 0, top: [], player: 10, starts: 0});
  assert.deepEqual(readCost({a: "x", b: -3, c: 2.6}).top, [["c", 3]]);
});

test("readCost: odhad hráčky z počtů v jejím okně (v22.9)", () => {
  const r = readCost({attendance: 900, events: 60}, 5, {attendance: 120, events: 9});
  assert.equal(r.total, 960);
  assert.equal(r.player, 120 + 9 + 10);
});

test("collLabel: český název, neznámá kolekce beze změny", () => {
  assert.equal(collLabel("attendance"), "docházka");
  assert.equal(collLabel("neznama"), "neznama");
});
