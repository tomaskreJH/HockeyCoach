// Testy přípravy zápasu: přihlášky (src/domain/lineup.js – signupState) a termín přihlašování (src/core/utils.js).
// Hlídají postup: zápas = zveřejněná událost s termínem přihlašování → přihlášky (min. 1 brankářka + 5 bruslařek) → nominace.
import {test} from "node:test";
import assert from "node:assert/strict";
import {S} from "../src/core/state.js";
import {dlBeforeStart, dlDefault, dlText} from "../src/core/utils.js";
import {readiness, signupState} from "../src/domain/lineup.js";

// ===== Příprava: soupiska =====
const team = () => {
  S.pl = [{id: "g1", name: "G", pos: "Brankářka"}, ...[1, 2, 3, 4, 5, 6].map(i => ({id: "u" + i, name: "U" + i, pos: i > 4 ? "Obránkyně" : "Útočnice"}))];
};

// ===== Přihlášky =====
test("signupState: na nominaci je potřeba aspoň 1 brankářka a 5 bruslařek z přihlášených", () => {
  team();
  assert.deepEqual((({gk, sk, ok}) => ({gk, sk, ok}))(signupState([])), {gk: 0, sk: 0, ok: false});
  assert.equal(signupState(["u1", "u2", "u3", "u4", "u5"]).ok, false, "chybí brankářka");
  assert.equal(signupState(["g1", "u1", "u2", "u3", "u4"]).ok, false, "jen 4 bruslařky");
  const s = signupState(["g1", "u1", "u2", "u3", "u4", "u5", "x"]);
  assert.deepEqual({gk: s.gk, sk: s.sk, ok: s.ok}, {gk: 1, sk: 5, ok: true}, "neznámé id se nepočítá");
});

test("readiness: nový zápas bez nominace není připraven", () => {
  team();
  const r = readiness({lineup: {}, nom: []});
  assert.equal(r.nom.ok, false);
  assert.equal(r.lu.ok, false);
});

// ===== Termín přihlašování =====
test("dlDefault: den před zápasem v 18:00 (i přes konec měsíce)", () => {
  assert.equal(dlDefault("2026-10-25"), "2026-10-24T18:00");
  assert.equal(dlDefault("2026-11-01"), "2026-10-31T18:00");
  assert.equal(dlDefault(""), "");
});

test("dlBeforeStart: termín musí být nejpozději v čas začátku (bez času = konec dne)", () => {
  assert.equal(dlBeforeStart("2026-10-24T18:00", "2026-10-25", "17:00"), true);
  assert.equal(dlBeforeStart("2026-10-25T18:00", "2026-10-25", "17:00"), false);
  assert.equal(dlBeforeStart("2026-10-25T18:00", "2026-10-25", ""), true);
  assert.equal(dlBeforeStart("", "2026-10-25", "17:00"), true);
});

test("dlText: text termínu pro kartu zápasu", () => {
  assert.equal(dlText("2026-10-24T18:05"), "24. 10. 18:05");
  assert.equal(dlText(""), "");
});
