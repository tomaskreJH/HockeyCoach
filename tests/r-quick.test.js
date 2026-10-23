// Testy fáze R (rychlé úpravy): řazení seznamu událostí, rozdělení do pětek včetně realizačního týmu a Zápis utkání v detailu události.
// Struktura: Importy -> Pomocné funkce -> Řazení -> Pětky -> Zápis utkání v Událostech.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {baseLines, isTrKey, lineCounts, setLine, sortEvents, trKey} from "../src/domain/event-helpers.js";

// ===== Pomocné funkce =====
const read = p => readFileSync(fileURLToPath(new URL("../" + p, import.meta.url)), "utf8");
const E = [
  {id: "a", date: "2026-10-14", time: "18:00"},
  {id: "b", date: "2026-10-21", time: ""},
  {id: "c", date: "2026-10-14", time: "08:00"},
  {id: "d", date: "2026-11-02", time: "19:30"}
];
const ids = l => l.map(e => e.id).join(",");

// ===== Řazení =====
test("R: Nadcházející vzestupně, Minulé a Kalendář sestupně (nejnovější nahoře)", () => {
  assert.equal(ids(sortEvents(E, "up")), "c,a,b,d");
  assert.equal(ids(sortEvents(E, "past")), "d,b,a,c");
  assert.equal(ids(sortEvents(E, "cal")), "d,b,a,c");
  assert.equal(ids(E), "a,b,c,d", "vstup se nemění");
});
test("R: seznam událostí řadí jen přes sortEvents (žádné vlastní řazení v events.js)", () => {
  const s = read("src/views/events.js");
  assert.ok(/sortEvents\(evs\.filter\(e => S\.evd \? e\.date === S\.evd : e\.date\.startsWith\(pre\)\), "cal"\)/.test(s), "Kalendář sestupně");
  assert.ok(!/\.sort\(asc\)/.test(s), "staré vzestupné řazení odstraněno");
});

// ===== Pětky =====
test("R: klíč člena realizačního týmu má předponu t:", () => {
  assert.equal(trKey("x1"), "t:x1");
  assert.ok(isTrKey("t:x1"));
  assert.ok(!isTrKey("x1"));
});
test("R: přiřazení a odebrání pětky (hráčka i člen týmu), vstup se nemění", () => {
  const L = {p1: 1};
  const a = setLine(L, "t:x1", "2");
  assert.deepEqual(a, {p1: 1, "t:x1": 2});
  assert.deepEqual(setLine(a, "p1", "0"), {"t:x1": 2});
  assert.deepEqual(setLine(a, "p2", 5), {p1: 1, "t:x1": 2}, "neplatné číslo pětky = odebrání");
  assert.deepEqual(L, {p1: 1});
});
test("R: Podle základní formace přepíše hráčky a zachová realizační tým", () => {
  const lu = {"1C": "p1", "1C+": "p2", "2LW": "p3", "G": "g1", "3D": "p9"};
  const r = baseLines(lu, ["p1", "p2", "p3"], {p3: 4, p8: 2, "t:x1": 3});
  assert.deepEqual(r, {p1: 1, p2: 1, p3: 2, "t:x1": 3});
  assert.deepEqual(baseLines(lu, ["p1"], null), {p1: 1});
});
test("R: počty v pětkách – hráčky, členové týmu, hráčky bez pětky", () => {
  const c = lineCounts({p1: 1, p2: 1, p3: 4, "t:x1": 1, "t:x2": 3, "t:x9": 2}, ["p1", "p2", "p3", "p4"], ["x1", "x2"]);
  assert.deepEqual(c.pl, {1: 2, 2: 0, 3: 0, 4: 1});
  assert.deepEqual(c.tr, {1: 1, 2: 0, 3: 1, 4: 0}, "nepřihlášený člen týmu (x9) se nepočítá");
  assert.equal(c.free, 1);
});

// ===== Zápis utkání v Událostech =====
test("R: detail uzavřeného zápasu otevře Zápis utkání (S.rp = id) pro všechny role před návratem hráčky", () => {
  const s = read("src/views/events.js");
  const iBtn = s.indexOf('if (rp) rp.onclick = () => { S.rp = ev.id; renderReport(); };'), iOwn = s.indexOf("if (ownP) return;");
  assert.ok(iBtn > 0 && iOwn > iBtn, "obsluha tlačítka je před omezením pro hráčku");
  assert.ok(/id="evrp"[^`]*📋 Zápis utkání/.test(s));
});
test("R: okno Zápisu utkání nenabízí úpravy (jen tisk, HTML, CSV, zavřít)", () => {
  const s = read("src/views/report.js"), m = s.match(/export function renderReport\(\)[\s\S]*?\n/);
  assert.ok(m, "renderReport nalezen");
  assert.ok(!/Opravit|✏️|data-ed|openLive/.test(m[0]));
});
