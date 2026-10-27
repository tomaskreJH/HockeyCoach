// Testy 🏠 Domů – ❔ Chybí odpověď a 📲 připomenutí (domain/home-remind.js): nejbližší otevřená událost, hráčky bez odpovědi, text zprávy.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {dayShort, missingAnswers, nearestOpen, reminderText} from "../src/domain/home-remind.js";

// ===== Data =====
const players = [
  {id: "p1", name: "Cecílie"}, {id: "p2", name: "Anna", st: "inj"}, {id: "p3", name: "Bára"}, {id: "p4", name: "Dana", st: "end"}
];
const at = [{eid: "e1", pid: "p1", st: "yes"}, {eid: "e2", pid: "p3", st: "no"}, {eid: "e1", pid: "t1", st: "yes"}];

// ===== Nejbližší událost =====
test("nearestOpen: první událost s otevřeným přihlašováním (zamčené, zrušené a uplynulé přeskočí)", () => {
  const list = [{id: "a", locked: true}, {id: "b", cancelled: true}, {id: "c", past: true}, {id: "d"}, {id: "e"}];
  assert.equal(nearestOpen(list).id, "d");
  assert.equal(nearestOpen([{id: "a", locked: true}]), null);
  assert.equal(nearestOpen(null), null);
});

// ===== Bez odpovědi =====
test("missingAnswers: aktivní hráčky bez odpovědi podle jména, ukončená se nepočítá, odpověď jiné události nevadí", () => {
  assert.deepEqual(missingAnswers(players, at, "e1").map(m => m.name), ["Anna", "Bára"]);
  assert.deepEqual(missingAnswers(players, at, "e2").map(m => m.id), ["p2", "p1"]);
  assert.deepEqual(missingAnswers(players, [], "e9").length, 3);
  assert.deepEqual(missingAnswers(null, at, "e1"), []);
});

// ===== Text připomínky =====
test("reminderText: událost, termín, kdo chybí a odkaz", () => {
  const t = reminderText({type: "training", title: "Trénink", date: "2026-10-28", place: "Zimní stadion"}, ["Anna", "Bára"], {when: "17:00–18:30 · ⏰ sraz 16:40", dl: "27. 10. 18:00", url: "https://x.test/HockeyCoach/"});
  assert.equal(t, "🏒 Trénink · St 28. 10. · 17:00–18:30 · ⏰ sraz 16:40 · Zimní stadion\nPřihlášení do 27. 10. 18:00\nChybí odpověď: Anna, Bára\nProsím odpovězte v aplikaci ✅ / ❌ / ❓: https://x.test/HockeyCoach/");
  const m = reminderText({type: "match", title: "Zápas – Sokol", date: "2026-10-27"}, []);
  assert.equal(m, "🆚 Zápas – Sokol · Út 27. 10.\nProsím odpovězte v aplikaci ✅ / ❌ / ❓.");
});

test("dayShort: krátké datum bez roku", () => {
  assert.equal(dayShort("2026-11-01"), "Ne 1. 11.");
  assert.equal(dayShort("bad"), "bad");
});
