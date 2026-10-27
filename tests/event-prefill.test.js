// Testy v22.10: 🖐 předvyplnění nové události a poslední důvody omluv (domain/event-prefill.js).
// Struktura: Importy -> Data -> Testy.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {REASONS_MAX, lastOf, matchPrefill, pushReason, reasonChips, trainingPrefill} from "../src/domain/event-prefill.js";

// ===== Data =====
// 2026-10-26 = pondělí, 2026-10-28 = středa
const EV = [
  {id: "a", date: "2026-10-19", time: "17:00", end: "18:30", meet: 20, place: "Zimák Poruba", title: "Trénink"},
  {id: "b", date: "2026-10-21", time: "19:00", place: "Zimák Vítkovice", title: "Trénink"},
  {id: "c", date: "2026-10-26", time: "17:15", place: "Zimák Poruba", title: "Trénink", cancelled: {by: "x", at: "y", reason: ""}},
  {id: "d", date: "2026-10-27", time: "", place: "Bez času"}
];
const MA = [
  {id: "m1", date: "2026-10-04", time: "16:00", place: "Doma hala", home: true},
  {id: "m2", date: "2026-10-11", time: "11:00", place: "Venku hala", home: false},
  {id: "m3", date: "2026-10-18", time: "16:30", place: "Doma hala", home: true}
];

// ===== Testy =====
test("lastOf: přednostně stejný den v týdnu, zrušené a bez času vynechá", () => {
  assert.equal(lastOf(EV, "2026-11-02").id, "a");             // pondělí → poslední nezrušené pondělí
  assert.equal(lastOf(EV, "2026-11-04").id, "b");             // středa
  assert.equal(lastOf(EV, "2026-11-06").id, "b");             // pátek nemá shodu → nejnovější ze všech
  assert.equal(lastOf([], "2026-11-06"), null);
  assert.equal(lastOf(EV, "").id, "b");
});

test("trainingPrefill: čas, ruční konec, sraz a místo", () => {
  assert.deepEqual(trainingPrefill(EV, "2026-11-02"), {title: "Trénink", time: "17:00", end: "18:30", endAuto: false, place: "Zimák Poruba", meet: 20});
  const w = trainingPrefill(EV, "2026-11-04");
  assert.equal(w.endAuto, true);
  assert.equal(w.end, "");
  assert.equal("meet" in w, false);                           // sraz nezadán → výchozí z nastavení
  assert.equal(trainingPrefill([], "2026-11-04"), null);
});

test("matchPrefill: poslední zápas stejného druhu (doma / venku)", () => {
  assert.deepEqual(matchPrefill(MA, "2026-11-01", true), {time: "16:30", place: "Doma hala"});
  assert.deepEqual(matchPrefill(MA, "2026-11-01", false), {time: "11:00", place: "Venku hala"});
  assert.equal(matchPrefill([], "2026-11-01", true), null);
});

test("pushReason: dopředu, bez duplicit a základních, omezený počet", () => {
  const base = ["Nemoc", "Škola"];
  let l = pushReason([], "Soustředění", base);
  assert.deepEqual(l, ["Soustředění"]);
  l = pushReason(l, "nemoc", base);                             // základní důvod se neukládá
  assert.deepEqual(l, ["Soustředění"]);
  l = pushReason(l, "Turnaj U16", base);
  l = pushReason(l, "soustředění", base);                       // duplicita bez ohledu na velikost písmen jde dopředu
  assert.deepEqual(l, ["soustředění", "Turnaj U16"]);
  for (let i = 0; i < 10; i++) l = pushReason(l, "D" + i, base);
  assert.equal(l.length, REASONS_MAX);
  assert.equal(l[0], "D9");
  assert.deepEqual(pushReason(null, "x".repeat(200), base), []);  // dlouhý text se nenabízí
});

test("reasonChips: vlastní nahoře, základní bez duplicit", () => {
  assert.deepEqual(reasonChips(["Turnaj", "nemoc"], ["Nemoc", "Škola"]), ["Turnaj", "nemoc", "Škola"]);
  assert.deepEqual(reasonChips(null, ["Nemoc"]), ["Nemoc"]);
});
