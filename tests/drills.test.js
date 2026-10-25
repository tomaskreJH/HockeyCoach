// Testy banky cvičení (src/domain/drills.js, src/config/skills.js), práv modulu drills (domain/permissions.js)
// a pravidel kolekce drills (kontrola textu firestore.rules). Čisté funkce – nic se nezapisuje.
// Struktura: Importy -> Konstanty -> Testy domény -> Testy práv -> Testy pravidel.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CATS, GROUPS, LEVELS, SKILLS, UNITS} from "../src/config/skills.js";
import {DRILL_COLL, DRILL_FIELDS, DRILL_MAX, drillBlank, drillCanDelete, drillCopy, drillCounts, drillDoc, drillError, drillFilter, fold} from "../src/domain/drills.js";
import {CAN_ACTS, DEFAULT_PERMS, ROLE_KEYS, actOf, isEditable, permOf} from "../src/domain/permissions.js";

// ===== Konstanty =====
const OK = {name: "Osmičky s pukem", cat: "skill", sk: ["puck", "skate"], lvl: 2, dur: 8, grp: ["st"], eq: "kužely", desc: "Kolem kuželů", url: "https://youtu.be/x", meas: {u: "s", low: true}};
const LIST = [
  {id: "a", name: "Střelba z otočky", cat: "skill", sk: ["shot"], lvl: 2, dur: 10, eq: "", desc: "rychlá střela"},
  {id: "b", name: "Bago 3 na 3", cat: "ssg", sk: ["game", "duel"], lvl: 1, dur: 12, eq: "malé branky", desc: ""},
  {id: "c", name: "Člunkový běh", cat: "warm", sk: ["skate", "fit"], lvl: 1, dur: 5, eq: "", desc: "", arch: true},
  {id: "d", name: "Agility", cat: "warm", sk: ["skate"], lvl: 3, dur: 6, eq: "Kužely", desc: "Změny směru"}
];

// ===== Testy domény =====
test("číselníky: klíče kategorií, dovedností, úrovní, skupin a jednotek", () => {
  assert.deepEqual(Object.keys(CATS), ["warm", "skill", "ssg", "sys", "end", "off"]);
  assert.equal(Object.keys(SKILLS).length, 11);
  assert.deepEqual(Object.keys(LEVELS), ["1", "2", "3"]);
  assert.deepEqual(Object.keys(GROUPS), ["all", "st", "gk"]);
  assert.deepEqual(Object.keys(UNITS), ["s", "ks", "b"]);
  assert.equal(DRILL_COLL, "drills");
});

test("drillError: povinný název, kategorie, dovednost, délka 1–60, odkaz http(s), jednotka měření", () => {
  assert.equal(drillError(OK), null);
  assert.equal(drillError({...OK, name: "  "}), "Zadej název cvičení");
  assert.match(drillError({...OK, name: "x".repeat(DRILL_MAX.name + 1)}), /Název je delší/);
  assert.equal(drillError({...OK, cat: "nic"}), "Vyber kategorii");
  assert.equal(drillError({...OK, sk: ["nic"]}), "Vyber aspoň jednu dovednost");
  assert.match(drillError({...OK, dur: 0}), /Délka/);
  assert.match(drillError({...OK, dur: 61}), /Délka/);
  assert.match(drillError({...OK, dur: 2.5}), /Délka/);
  assert.match(drillError({...OK, url: "javascript:alert(1)"}), /Odkaz/);
  assert.equal(drillError({...OK, url: ""}), null);
  assert.equal(drillError({...OK, meas: {u: "m"}}), "Vyber jednotku měření");
  assert.equal(drillError(null), "Zadej název cvičení");
});

test("drillDoc: jen pole formuláře, neplatné hodnoty na výchozí, dovednosti v pořadí číselníku bez opakování", () => {
  const d = drillDoc({...OK, name: "  Osmičky  ", sk: ["skate", "puck", "skate", "x"], grp: ["gk", "zz"], by: "a", arch: true, extra: 1});
  assert.deepEqual(Object.keys(d), DRILL_FIELDS);
  assert.equal(d.name, "Osmičky");
  assert.deepEqual(d.sk, ["skate", "puck"]);
  assert.deepEqual(d.grp, ["gk"]);
  assert.deepEqual(d.meas, {u: "s", low: true});
  const z = drillDoc({name: "x", cat: "?", lvl: 9, dur: "abc", url: "ftp://a", meas: {u: "?"}});
  assert.equal(z.cat, "warm"); assert.equal(z.lvl, 1); assert.equal(z.dur, 10); assert.equal(z.url, ""); assert.equal(z.meas, null);
  assert.deepEqual(z.sk, []); assert.deepEqual(z.grp, []);
  assert.equal(drillDoc({...OK, meas: {u: "ks"}}).meas.low, false);
  const b = drillBlank();
  assert.equal(drillError({...b, name: "A", sk: ["shot"]}), null, "prázdný formulář s názvem a dovedností jde uložit");
});

test("drillFilter: jen aktivní (nebo jen vyřazená), kategorie, dovednost, úroveň, hledání bez diakritiky, ⭐ nahoře", () => {
  const ids = (f, fav) => drillFilter(LIST, f, new Set(fav || [])).map(d => d.id);
  assert.deepEqual(ids({}), ["d", "b", "a"], "podle názvu česky, bez vyřazených");
  assert.deepEqual(ids({arch: true}), ["c"]);
  assert.deepEqual(ids({cat: "warm"}), ["d"]);
  assert.deepEqual(ids({sk: "skate"}), ["d"]);
  assert.deepEqual(ids({lvl: 1}), ["b"]);
  assert.deepEqual(ids({lvl: "2"}), ["a"]);
  assert.deepEqual(ids({q: "strelba"}), ["a"], "hledání bez diakritiky");
  assert.deepEqual(ids({q: "KUZELY"}), ["d"], "hledá i v pomůckách");
  assert.deepEqual(ids({q: "smeru"}), ["d"], "hledá i v popisu");
  assert.deepEqual(ids({}, ["a"]), ["a", "d", "b"], "oblíbené nahoře");
  assert.deepEqual(ids({fav: true}, ["b"]), ["b"]);
  assert.deepEqual(drillFilter(undefined), []);
  assert.equal(fold("Člunkový BĚH"), "clunkovy beh");
});

test("drillCounts: počty aktivních cvičení po kategoriích a dovednostech", () => {
  assert.deepEqual(drillCounts(LIST), {cat: {skill: 1, ssg: 1, warm: 1}, sk: {shot: 1, game: 1, duel: 1, skate: 1}});
});

test("drillCopy a drillCanDelete: kopie bez autora, název s příponou v mezích; smazat jen vyřazené a nepoužité", () => {
  const c = drillCopy({...OK, by: "x", at: "t", arch: true});
  assert.equal(c.name, "Osmičky s pukem (kopie)");
  assert.ok(!("by" in c) && !("arch" in c));
  assert.equal(drillCopy({...OK, name: "y".repeat(DRILL_MAX.name)}).name.length, DRILL_MAX.name);
  assert.equal(drillCanDelete({arch: true}), true);
  assert.equal(drillCanDelete({arch: false}), false);
  assert.equal(drillCanDelete({arch: true}, 2), false, "použité v plánech");
  assert.equal(drillCanDelete(null), false);
});

// ===== Testy práv =====
test("práva drills: výchozí trenér vše, asistent číst a upravovat, hráčka a hostující nic, manager vše", () => {
  assert.deepEqual(DEFAULT_PERMS.trener.drills, {r: true, e: true, c: false, d: true});
  assert.deepEqual(DEFAULT_PERMS.asistent.drills, {r: true, e: true, c: false, d: false});
  assert.deepEqual(DEFAULT_PERMS.hracka.drills, {r: false, e: false, c: false, d: false});
  ["r", "e", "d"].forEach(a => assert.equal(permOf("manager", "drills", a, {}), true));
  ["r", "e", "d"].forEach(a => assert.equal(permOf("host", "drills", a, {}), false));
  assert.equal(permOf("trener", "drills", "c", {}), false, "rušit modul nemá");
});

test("práva drills: upravovat a mazat jde v matici měnit u trenéra a asistenta, číst pevně; hráčka bez buněk", () => {
  ["trener", "asistent"].forEach(r => {
    assert.equal(isEditable(r, "drills", "e"), true);
    assert.equal(isEditable(r, "drills", "d"), true);
    assert.equal(isEditable(r, "drills", "r"), false);
  });
  ["r", "e", "d"].forEach(a => assert.equal(isEditable("hracka", "drills", a), false));
  assert.equal(permOf("asistent", "drills", "d", {asistent: {drills: {d: true}}}), true);
  assert.equal(permOf("trener", "drills", "e", {trener: {drills: {e: false}}}), false);
});

test("srovnání: modul drills nemění zkratky HK.can (sport, money, roster …)", () => {
  const F = {trener: {drills: {e: false, d: false}}, asistent: {drills: {e: false, d: true}}};
  ROLE_KEYS.forEach(r => [false, true].forEach(c => CAN_ACTS.forEach(a => assert.equal(actOf(r, c, a, false, F), actOf(r, c, a, false), r + " " + a))));
});

// ===== Testy pravidel =====
test("pravidla: kolekce drills podle matice (číst r, zakládat a upravovat e se známými poli, mazat d)", () => {
  const R = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const i = R.indexOf("match /drills/{id}");
  assert.ok(i > 0, "chybí match /drills/{id}");
  const b = R.slice(i, R.indexOf("\n    }", i));
  assert.match(b, /allow read: if can\('drills', 'r'\);/);
  assert.match(b, /allow create, update: if can\('drills', 'e'\) && drillOk\(request\.resource\.data\);/);
  assert.match(b, /allow delete: if can\('drills', 'd'\);/);
  const ok = R.match(/function drillOk\(d\) \{([\s\S]*?)\n    \}/);
  assert.ok(ok, "chybí drillOk");
  [...DRILL_FIELDS, "by", "at", "arch"].forEach(f => assert.ok(ok[1].includes("'" + f + "'"), "drillOk nezná pole " + f));
  assert.match(ok[1], /d\.name\.size\(\) <= 80/);
});
