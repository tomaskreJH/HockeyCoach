// Testy ⭐ hodnocení cvičení tréninku (src/domain/training-eval.js), označení linek (laneTags), práv modulu treval pro čtení hodnocení
// (domain/permissions.js) a pravidel kolekce treval (kontrola textu firestore.rules). Čisté funkce – nic se nezapisuje.

// ===== Importy =====
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {CAN_ACTS, DEFAULT_PERMS, actOf, isEditable, permOf} from "../src/domain/permissions.js";
import {NOTE_MAX, RATES, TREVAL_COLL, entryOf, evalLanes, evalPatch, noteOf, playerPatch, playerRates, prevSpot, rateCounts, rateIcon, rateOk, unrated} from "../src/domain/training-eval.js";
import {liveAt} from "../src/domain/training-live.js";
import {laneTags} from "../src/domain/training-plan.js";

// ===== Data =====
const D = {d1: {id: "d1", name: "Sprint 30 m"}, d2: {id: "d2", name: "Střelba"}, d3: {id: "d3", name: "Rozbruslení"}};
// Blok 1 Společně 10 min, blok 2 Stanoviště 20 min (2 točící linky po 10 min + brankářky), linka bez cvičení se nehodnotí
const plan = {blocks: [
  {id: "b1", mode: "all", dur: 10, lanes: [{id: "l1", drill: "d3", grp: []}]},
  {id: "b2", mode: "st", dur: 20, lanes: [{id: "l2", drill: "d1", grp: [1]}, {id: "l3", drill: "d2", dn: "Střelba (kopie)", grp: [2]}, {id: "l4", drill: "", grp: ["G"]}]}
]};

// ===== Linky a označení =====
test("laneTags: stanoviště A, B, brankářky 🥅, u Společně prázdné", () => {
  assert.deepEqual(laneTags(plan.blocks[0]), [""]);
  assert.deepEqual(laneTags(plan.blocks[1]), ["A", "B", "🥅"]);
  assert.deepEqual(laneTags(null), []);
});
test("evalLanes: jen linky s cvičením, klíč blok_linka, název z banky (jinak kopie), popis místa", () => {
  const L = evalLanes(plan, D);
  assert.deepEqual(L.map(l => l.key), ["b1_l1", "b2_l2", "b2_l3"]);
  assert.equal(L[1].dn, "Sprint 30 m");
  assert.equal(L[1].where, "Blok 2 · Stanoviště A");
  assert.equal(L[0].where, "Blok 1 · 👥 Společně");
  assert.equal(evalLanes(plan, {})[2].dn, "Střelba (kopie)", "hráčka / smazané cvičení: kopie názvu z plánu");
  assert.deepEqual(evalLanes(null, D), []);
});
test("unrated a rateCounts: 0 = bez hodnocení, počítá jen platné stupně", () => {
  const L = evalLanes(plan, D), res = {r: {b1_l1: {r: 4}, b2_l2: {r: 0}, b2_l3: {r: 2}, xx: {r: 3}}};
  assert.deepEqual(unrated(L, res).map(l => l.key), ["b2_l2"]);
  assert.deepEqual(unrated(L, null).length, 3);
  assert.deepEqual(rateCounts(res, L), {4: 1, 3: 0, 2: 1, 1: 0});
  assert.deepEqual(rateCounts(res), {4: 1, 3: 1, 2: 1, 1: 0}, "bez seznamu linek celý dokument");
  assert.equal(entryOf(res, "nic"), null);
});

// ===== Hodnoty =====
test("rateOk, rateIcon a noteOf: stupnice 1–4 (T5), poznámka oříznutá", () => {
  assert.deepEqual(RATES, [4, 3, 2, 1]);
  assert.equal(rateOk(4), true); assert.equal(rateOk(0), false); assert.equal(rateOk("4"), false); assert.equal(rateOk(5), false);
  assert.equal(rateIcon(4), "😃"); assert.equal(rateIcon(1), "😴"); assert.equal(rateIcon(0), "–");
  assert.equal(noteOf("  ok  "), "ok");
  assert.equal(noteOf("x".repeat(500)).length, NOTE_MAX);
  assert.equal(noteOf(null), "");
});

// ===== Zápis =====
test("evalPatch a playerPatch: jen daná linka / hráčka, neplatný stupeň = 0, kopie názvu", () => {
  const l = evalLanes(plan, D)[1];
  assert.deepEqual(evalPatch(l, {r: 3}), {v: 1, r: {b2_l2: {d: "d1", dn: "Sprint 30 m", r: 3}}});
  assert.deepEqual(evalPatch(l, {r: 9}).r.b2_l2.r, 0);
  assert.deepEqual(evalPatch(l, {n: " Rychlé "}).r.b2_l2, {d: "d1", dn: "Sprint 30 m", n: "Rychlé"});
  assert.equal("r" in evalPatch(l, {n: "x"}).r.b2_l2, false, "poznámka nemění hodnocení");
  assert.deepEqual(playerPatch(l, "p7", {r: 1}).r.b2_l2, {d: "d1", dn: "Sprint 30 m", pl: {p7: {r: 1}}});
  assert.deepEqual(playerPatch(l, "p7", {n: "pozor na hokejku"}).r.b2_l2.pl, {p7: {n: "pozor na hokejku"}});
});
test("playerRates: jen hodnocené nebo s poznámkou, nejlepší nahoře", () => {
  const e = {pl: {a: {r: 2}, b: {r: 4, n: "super"}, c: {r: 0}, d: {r: 0, n: "nemocná"}}};
  assert.deepEqual(playerRates(e), [{pid: "b", r: 4, n: "super"}, {pid: "a", r: 2, n: ""}, {pid: "d", r: 0, n: "nemocná"}]);
  assert.deepEqual(playerRates(null), []);
});

// ===== Živý trénink =====
test("prevSpot: kolo, které právě skončilo; na začátku nic; po konci plánu poslední kolo", () => {
  const B = plan.blocks;
  assert.equal(prevSpot(B, liveAt(B, 5)), null, "první kolo – nic k hodnocení");
  const p1 = prevSpot(B, liveAt(B, 600 + 30));
  assert.equal(p1.bi, 0, "po bloku 1 hodnotí blok 1");
  const p2 = prevSpot(B, liveAt(B, 600 + 600 + 10));
  assert.equal(p2.bi, 1); assert.equal(p2.ri, 0, "po 1. kole stanovišť hodnotí 1. kolo");
  const pe = prevSpot(B, liveAt(B, 99999));
  assert.equal(pe.bi, 1); assert.equal(pe.ri, 1, "po konci plánu poslední kolo");
  assert.equal(prevSpot(B, null), null);
});

// ===== Práva a pravidla =====
test("práva treval: hodnocení čte jen realizační tým (pevně), hodnotit jde vypnout; hráčka a hostující nic; HK.can beze změny", () => {
  for (const r of ["trener", "asistent"]) {
    assert.deepEqual(DEFAULT_PERMS[r].treval, {r: true, e: true, c: false, d: false});
    assert.equal(isEditable(r, "treval", "r"), false);
    assert.equal(isEditable(r, "treval", "e"), true);
  }
  assert.equal(permOf("hracka", "treval", "r", {}), false);
  assert.equal(isEditable("hracka", "treval", "r"), false, "hráčka hodnocení trenérů nikdy nečte (T2)");
  assert.equal(permOf("host", "treval", "r", {}), false);
  const F = {trener: {treval: {e: false}}, asistent: {treval: {e: false}}};
  for (const r of ["manager", "trener", "asistent", "hracka", "host"]) for (const a of CAN_ACTS) for (const cash of [false, true]) {
    assert.equal(actOf(r, cash, a, false, F), actOf(r, cash, a, false, {}), r + " " + a);
  }
});
test("pravidla: treval čte treval r, zapisuje a maže treval e, dokument jen se známými poli a zapisující = přihlášený", () => {
  const R = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const m = R.match(new RegExp("match /" + TREVAL_COLL + "/\\{id\\} \\{([\\s\\S]*?)\\n    \\}"));
  assert.ok(m, "chybí treval");
  assert.match(m[1], /allow read: if can\('treval', 'r'\);/);
  assert.match(m[1], /allow create, update: if can\('treval', 'e'\) && trevalOk\(request\.resource\.data\);/);
  assert.match(m[1], /allow delete: if can\('treval', 'e'\);/);
  assert.match(R, /function trevalOk\(d\) \{\s+return d\.keys\(\)\.hasOnly\(\['v', 'r', 'by', 'at'\]\) && d\.r is map && d\.r\.size\(\) <= 120 && d\.get\('by', mail\(\)\) == mail\(\);/);
});
