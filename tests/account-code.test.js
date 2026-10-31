// Testy kontrolního kódu účtu (v22.21, src/domain/bank-account.js): kód je deterministický, ukazuje na jeden účet,
// porovnání přepsaného kódu ignoruje mezery a pomlčky, ale prázdný nebo cizí kód nikdy nesouhlasí.
import {test} from "node:test";
import assert from "node:assert/strict";
import {accCode, codeMatch, pairCode, parseAcc} from "../src/domain/bank-account.js";

const A = parseAcc("19-2000145399/0800").iban;   // hlavní účet (platný)
const B = parseAcc("115-2000145399/0800").iban;        // provozní účet (platný)

test("accCode: tvar XXXX-XXXX (8 hex číslic), deterministický a nezávislý na mezerách a velikosti písmen", () => {
  const c = accCode(A);
  assert.match(c, /^[0-9A-F]{4}-[0-9A-F]{4}$/);
  assert.equal(accCode(A), c);
  assert.equal(accCode(A.toLowerCase().replace(/(.{4})/g, "$1 ")), c);
});

test("accCode: různé účty dávají různé kódy; prázdný účet prázdný kód", () => {
  assert.notEqual(accCode(A), accCode(B));
  assert.equal(accCode(""), "");
});

test("pairCode: hlavní a provozní kód oddělené mezerou; bez provozního jen hlavní", () => {
  assert.equal(pairCode(A, B), accCode(A) + " " + accCode(B));
  assert.equal(pairCode(A, ""), accCode(A));
});

test("codeMatch: shoda ignoruje mezery a pomlčky, přepis jiným kódem nebo prázdný text nesouhlasí", () => {
  const want = pairCode(A, B);
  assert.equal(codeMatch(want, want.toLowerCase()), true);
  assert.equal(codeMatch(want, want.replace("-", " ")), true);
  assert.equal(codeMatch(want, pairCode(B, A)), false);
  assert.equal(codeMatch(want, ""), false);
  assert.equal(codeMatch("", ""), false);
});
