// Testy v22.52: 📊 měřič čtení databáze (domain/read-meter.js) a cache-first čtení neměnného dokumentu (getCached v data/storage.js).
// Struktura: Importy -> Testy měřiče -> Test napojení.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {addReads, addStart, dayTop, dayTotal, emptyMeter, parseMeter, pruneMeter, recentDays, snapReads} from "../src/domain/read-meter.js";

// ===== Testy měřiče =====
test("měřič: přičítání po kolekcích, součet dne a největší kolekce", () => {
  const m = emptyMeter();
  addReads(m, "2026-11-05", "events", 40); addReads(m, "2026-11-05", "charges", 900); addReads(m, "2026-11-05", "events", 10);
  addReads(m, "2026-11-05", "nic", 0); addReads(m, "2026-11-05", "", 5); addReads(m, "2026-11-05", "záporné", -3);
  assert.equal(dayTotal(m, "2026-11-05"), 950);
  assert.deepEqual(dayTop(m, "2026-11-05", 5), [["charges", 900], ["events", 50]]);
  assert.equal(dayTotal(m, "2026-11-04"), 0);
});

test("měřič: spuštění, poslední dny (nejnovější první) a zapomínání starých dnů", () => {
  const m = emptyMeter();
  addReads(m, "2026-10-20", "events", 5); addReads(m, "2026-11-04", "events", 7); addStart(m, "2026-11-05"); addStart(m, "2026-11-05");
  assert.deepEqual(recentDays(m, 7), [{day: "2026-11-05", total: 0, starts: 2}, {day: "2026-11-04", total: 7, starts: 0}, {day: "2026-10-20", total: 5, starts: 0}]);
  pruneMeter(m, "2026-11-05", 8);
  assert.deepEqual(recentDays(m, 7).map(d => d.day), ["2026-11-05", "2026-11-04"], "20. 10. je starší než 8 dní");
});

test("měřič: uložený text – poškozený nebo cizí tvar dá prázdný stav, neplatné dny a hodnoty se zahodí", () => {
  assert.deepEqual(parseMeter("{rozbito"), emptyMeter());
  assert.deepEqual(parseMeter(null), emptyMeter());
  const m = parseMeter(JSON.stringify({d: {"2026-11-05": {events: 3.4, zlé: -1, x: "a"}, "včera": {events: 9}}, s: {"2026-11-05": 2, "špatně": 4}}));
  assert.deepEqual(m, {d: {"2026-11-05": {events: 3}}, s: {"2026-11-05": 2}});
});

test("snapReads: první snímek ze serveru = všechny dokumenty, další jen změněné, paměť zařízení a vlastní zápis se neplatí", () => {
  const q = (n, ch, md) => ({docs: new Array(n).fill(0), docChanges: () => new Array(ch).fill(0), metadata: md || {}});
  assert.equal(snapReads(q(120, 120, {fromCache: true}), false), 0, "snímek z paměti je zdarma");
  assert.equal(snapReads(q(120, 120), false), 120, "první snímek ze serveru");
  assert.equal(snapReads(q(120, 2), true), 2, "další snímek = jen změny");
  assert.equal(snapReads(q(120, 1, {hasPendingWrites: true}), true), 0, "vlastní nepotvrzený zápis");
  const d = (ex, md) => ({exists: () => ex, metadata: md || {}});
  assert.equal(snapReads(d(true), false), 1);
  assert.equal(snapReads(d(false), false), 0);
  assert.equal(snapReads(d(true), true), 1, "změna jednoho dokumentu");
  assert.equal(snapReads({docs: [1, 2]}, true), 2, "bez docChanges (zástupce) se počítá celé");
  assert.equal(snapReads(null, false), 0);
});

// ===== Test napojení =====
test("napojení: obrázky cvičení se čtou nejdřív z paměti zařízení (getCached), měřič je ve všech poslechech a jednorázových čteních", () => {
  const media = readFileSync(new URL("../src/views/drill-media.js", import.meta.url), "utf8");
  const st = readFileSync(new URL("../src/data/storage.js", import.meta.url), "utf8");
  assert.match(media, /\.doc\(DRILLIMG_COLL \+ "\/" \+ id\)\.getCached\(\)/);
  assert.match(st, /getCached: async \(\) => \{[\s\S]*getDocFromCache[\s\S]*getDoc\(fsDoc\(fs, c, id\)\)/);
  assert.equal((st.match(/snapMeter\(c\)/g) || []).length, 6, "listen, listenWin, farListen, listenWhere, listenOne, listenPart");
  ["getAll", "getWhere", "get:", "listMembers"].forEach(k => assert.ok(st.split("\n").some(l => l.includes(k) && l.includes("readNote")), k + " se počítá"));
  assert.match(st, /readNote\(c \+ " \(archiv\)"/);
});
