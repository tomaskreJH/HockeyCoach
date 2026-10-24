// Funkce člena realizačního týmu (staff.kind): názvy jako role, stará „Kustod“ se zobrazuje jako Asistent.
// Struktura: Importy -> Testy.

// ===== Importy =====
import test from "node:test";
import assert from "node:assert/strict";
import {KIND, KIND_OLD} from "../src/config/constants.js";
import {kindOf} from "../src/core/selectors.js";

// ===== Testy =====
test("funkce realizačního týmu mají názvy rolí a bez Kustoda", () => {
  assert.deepEqual(KIND, ["Manager", "Trenér", "Asistent", "Jiný"]);
  Object.values(KIND_OLD).forEach(k => assert.ok(KIND.includes(k)));
});

test("kindOf: stará funkce Kustod = Asistent, ostatní beze změny", () => {
  assert.equal(kindOf({kind: "Kustod"}), "Asistent");
  assert.equal(kindOf({kind: "Trenér"}), "Trenér");
  assert.equal(kindOf({kind: "Masér"}), "Masér");
  assert.equal(kindOf({}), "");
  assert.equal(kindOf(null), "");
});
