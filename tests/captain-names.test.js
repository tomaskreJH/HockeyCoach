// Testy značky kapitánky „(C)“ ve jménech (core/selectors.js, domain/home-remind.js) a tvaru zvolené odpovědi na událost (jen styly).
// Struktura: Importy -> Jména -> Styly odpovědí.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {S} from "../src/core/state.js";
import {capName, capTag, nm, pn} from "../src/core/selectors.js";
import {missingAnswers} from "../src/domain/home-remind.js";

// ===== Jména =====
test("capTag / capName: jen hráčka s cap === true má „(C)“ za jménem", () => {
  assert.equal(capTag({cap: true}), " (C)");
  assert.equal(capTag({cap: false}), "");
  assert.equal(capTag({}), "");
  assert.equal(capTag(null), "");
  assert.equal(capName({name: "Hanča", cap: true}), "Hanča (C)");
  assert.equal(capName({name: "Bětka"}), "Bětka");
  assert.equal(capName(undefined), "");
});
test("pn / nm: kapitánka s „(C)“ za jménem, ostatní beze změny; nm s cap: false bez značky (texty do databáze a CSV pokladny)", () => {
  S.pl = [{id: "k", name: "Hanča", num: "9", cap: true}, {id: "o", name: "Bětka", num: "7", guest: true}];
  S.tr = [];
  assert.equal(pn("k"), "#9 Hanča (C)");
  assert.equal(nm("k"), "#9 Hanča (C)");
  assert.equal(nm("k", {cap: false}), "#9 Hanča");
  assert.equal(pn("o"), "#7 Bětka 🎟");
  assert.equal(nm("o"), "#7 Bětka");
});
test("missingAnswers: kapitánka v seznamu bez odpovědi se značkou „(C)“", () => {
  const pl = [{id: "k", name: "Hanča", cap: true}, {id: "o", name: "Bětka"}];
  assert.deepEqual(missingAnswers(pl, [], "e1").map(x => x.name), ["Bětka", "Hanča (C)"]);
});

// ===== Styly odpovědí =====
const read = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
test("zvolená odpověď na událost má tvar nálepky (spodní levý roh skoro pravoúhlý) ve všech vzhledech", () => {
  const rule = "border-radius:12px 12px 12px 3px";
  assert.ok(read("src/views/event-core.js").includes('#evw .evq button[class^="on-"],#evw .evq button.evns.on{' + rule + '}'));
  assert.ok(read("styles/clean.css").includes(':root[data-clean] #evw .evq button[class^="on-"], :root[data-clean] #evw .evq button.evns.on { border-radius: 12px 12px 12px 3px; }'));
});
