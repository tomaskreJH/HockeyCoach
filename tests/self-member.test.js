// Testy v21.9.1: za koho se přihlášený účet hlásí na události (hráčka má přednost před členem realizačního týmu)
// a propojení hráčky u rolí manager / trener / asistent (aplikace i pravidla plpay).

// ===== Importy =====
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {selfMember} from "../src/domain/event-helpers.js";

// ===== Konstanty =====
const PL = ["p1", "p2"], TR = ["t1"];
const src = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");

// ===== Doména: selfMember =====
test("selfMember: člen týmu propojený i s hráčkou se hlásí jako hráčka", () => {
  assert.equal(selfMember("p1", "t1", PL, TR, false), "p1");
});
test("selfMember: člen týmu bez hráčky se hlásí jako člen týmu", () => {
  assert.equal(selfMember(null, "t1", PL, TR, false), "t1");
  assert.equal(selfMember(undefined, "t1", PL, TR, false), "t1");
});
test("selfMember: hráčka mimo aktivní soupisku → člen týmu, jinak nic", () => {
  assert.equal(selfMember("pX", "t1", PL, TR, false), "t1");
  assert.equal(selfMember("pX", null, PL, TR, false), null);
});
test("selfMember: role Hráčka / Hostující nikdy za člena týmu", () => {
  assert.equal(selfMember("p2", "t1", PL, TR, true), "p2");
  assert.equal(selfMember(null, "t1", PL, TR, true), null);
});
test("selfMember: neexistující člen týmu a prázdné seznamy", () => {
  assert.equal(selfMember(null, "tX", PL, TR, false), null);
  assert.equal(selfMember("p1", "t1", null, null, false), null);
});

// ===== Zdrojové kontroly =====
test("events.js: rychlá tlačítka berou člena přes selfMember", () => {
  const s = src("src/views/events.js");
  assert.match(s, /S\.evp = selfMember\(HK\.pid\(\)/);
});
test("storage.js: manager / trenér / asistent smí mít volitelně propojenou hráčku (ne hostující)", () => {
  const s = src("src/data/storage.js");
  assert.match(s, /pp && STAFF\.includes\(rl\) && pidRoleErr\("hracka", pp\)/);
  assert.match(s, /if \(needsPid\(rl\) \|\| \(pp && STAFF\.includes\(rl\)\)\) d\.pid = pp;/);
});
test("pravidla: plpay čte i člen týmu, který je zároveň hráčkou – jen svůj dokument", () => {
  const s = src("firestore.rules");
  assert.match(s, /\(isStaff\(\) && get\(memberPath\(\)\)\.data\.get\('pid', ''\) == id\)/);
});
