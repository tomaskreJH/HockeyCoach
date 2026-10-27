// Testy v22.9: 📉 okno poslechu událostí a docházky (domain/data-window.js).
// Struktura: Importy -> Testy.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {AHEAD_DAYS, WIN, WIN_DAYS, archNeed, attDate, attDateFix, countFrom, dayAdd, mergeBand, winFrom, winTo} from "../src/domain/data-window.js";

// ===== Testy =====
test("dayAdd a winFrom: realizační tým 45 dní, ostatní 8 dní (přes hranici měsíce i roku)", () => {
  assert.equal(dayAdd("2026-03-01", -1), "2026-02-28");
  assert.equal(dayAdd("2026-01-05", -14), "2025-12-22");
  assert.equal(winFrom("2026-10-27", true), dayAdd("2026-10-27", -WIN_DAYS.staff));
  assert.equal(winFrom("2026-10-27", false), "2026-10-19");
});

test("winTo (v22.13): hráčka 15 dní dopředu včetně (konec bez dne), realizační tým bez konce", () => {
  assert.equal(AHEAD_DAYS, 15);
  assert.equal(winTo("2026-10-27", false), "2026-11-12", "poslední živý den 11. 11. = dnes + 15");
  assert.equal(winTo("2026-12-25", false), "2027-01-10", "přes konec roku");
  assert.equal(winTo("2026-10-27", true), "");
});

test("countFrom (v22.13): od from včetně, do to bez něj; bez to bez konce", () => {
  const docs = {a: {date: "2026-10-18"}, b: {date: "2026-10-19"}, c: {date: "2026-11-11"}, d: {date: "2026-11-12"}, e: {}};
  assert.equal(countFrom(docs, "date", "2026-10-19", "2026-11-12"), 2);
  assert.equal(countFrom(docs, "date", "2026-10-19"), 3);
  assert.equal(countFrom(docs, "date", "2026-10-19", ""), 3);
});

test("archNeed: poprvé, bez paměti nebo ručně celý archiv; po ttl jen pás; jinak nic", () => {
  const ttl = WIN.events.ttl, now = 10 * ttl;
  assert.equal(archNeed(null, now, ttl, 50, false), "all", "zařízení archiv ještě nenačetlo");
  assert.equal(archNeed({at: now, all: true}, now, ttl, 0, false), "all", "paměť zařízení je prázdná");
  assert.equal(archNeed({at: now, all: true}, now, ttl, 50, true), "all", "ruční obnova");
  assert.equal(archNeed({at: now - ttl - 1, all: true}, now, ttl, 50, false), "band");
  assert.equal(archNeed({at: now - 1000, all: true}, now, ttl, 50, false), "");
});

test("mergeBand: pás nahradí archiv v rozsahu [od, do), mimo pás zůstane, smazané v pásu zmizí", () => {
  const arch = {a: {date: "2026-05-01"}, b: {date: "2026-08-10"}, c: {date: "2026-08-20", x: 1}};
  const out = mergeBand(arch, {c: {date: "2026-08-20", x: 2}}, "date", "2026-08-01", "2026-09-01");
  assert.deepEqual(out, {a: {date: "2026-05-01"}, c: {date: "2026-08-20", x: 2}});
});

test("attDate a attDateFix: datum z události nebo zápasu, opravy chybějícího a posunutého data", () => {
  const ev = {e1: {date: "2026-10-01"}}, ma = {m1: {date: "2026-10-05"}};
  assert.equal(attDate("e1", ev, ma), "2026-10-01");
  assert.equal(attDate("m1", ev, ma), "2026-10-05");
  assert.equal(attDate("zz", ev, ma), "");
  const att = {a: {eid: "e1", pid: "p"}, b: {eid: "m1", pid: "p", d: "2026-10-05"}, c: {eid: "e1", pid: "q", d: "2026-09-30"}, z: {eid: "zz", pid: "p"}, y: {eid: "zz", pid: "q", d: "2026-01-01"}};
  assert.deepEqual(attDateFix(att, ev, ma), [["a", "2026-10-01"], ["c", "2026-10-01"], ["z", ""]], "neznámá událost: jen chybějící d, existující nechat");
});

test("countFrom: počet dokumentů od data (odhad pro hráčku)", () => {
  assert.equal(countFrom({a: {d: "2026-10-20"}, b: {d: "2026-09-01"}, c: {}}, "d", "2026-10-13"), 1);
});
