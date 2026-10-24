// Testy opakovaných událostí (domain/recurrence.js): termíny série, konec sezóny, relativní termín přihlašování,
// plán úprav a mazání „tato a další“, zápisy pro založení série a pravidla kolekce series.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BATCH_MAX, SERIES_COLL, addDays, chunks, datesOf, deletePlan, editPlan, manualChange, relDl, relOf, seasonEnd, seriesOps, seriesTail} from "../src/domain/recurrence.js";

// ===== Pomocné funkce =====
// Událost série pro testy plánů
const ev = (id, date, i, x) => ({id, date, time: "18:00", place: "Hala", dl: addDays(date, -1) + "T18:00", ser: {id: "s1", i, ...(x ? {x: 1} : {})}});

// ===== Termíny =====
test("datesOf: každá středa od–do včetně", () => {
  // 1. 10. 2026 je čtvrtek, 7. 10. středa
  assert.deepEqual(datesOf({days: [3], every: 1}, "2026-10-01", "2026-10-28"), ["2026-10-07", "2026-10-14", "2026-10-21", "2026-10-28"]);
});
test("datesOf: více dnů, každý 2. týden počítaný od týdne data „od“, vynechané dny", () => {
  // týden 5.–11. 10. je první (od pondělí 5. 10.), 12.–18. 10. se vynechá, 19.–25. 10. platí
  assert.deepEqual(datesOf({days: [1, 4], every: 2}, "2026-10-05", "2026-10-25"), ["2026-10-05", "2026-10-08", "2026-10-19", "2026-10-22"]);
  // od ve středě: první týden je týden 5.–11. 10. (pondělí před „od“ se nepočítá jako termín)
  assert.deepEqual(datesOf({days: [1, 4], every: 2}, "2026-10-07", "2026-10-25"), ["2026-10-08", "2026-10-19", "2026-10-22"]);
  assert.deepEqual(datesOf({days: [3]}, "2026-10-01", "2026-10-28", ["2026-10-14", "2026-10-28"]), ["2026-10-07", "2026-10-21"]);
});
test("datesOf: nejdéle do konce sezóny, neplatné vstupy prázdně", () => {
  const d = datesOf({days: [2]}, "2027-06-20", "2027-07-31");
  assert.deepEqual(d, ["2027-06-22", "2027-06-29"]);
  assert.deepEqual(datesOf({days: []}, "2026-10-01", "2026-10-31"), []);
  assert.deepEqual(datesOf({days: [3]}, "2026-10-31", "2026-10-01"), []);
  assert.deepEqual(datesOf({days: [3]}, "", "2026-10-01"), []);
  assert.deepEqual(datesOf(null, "2026-10-01", "2026-10-31"), []);
});
test("datesOf: přechod letního času nemění den v týdnu", () => {
  // 25. 10. 2026 končí letní čas, 28. 3. 2027 začíná
  assert.deepEqual(datesOf({days: [0]}, "2026-10-18", "2026-11-01"), ["2026-10-18", "2026-10-25", "2026-11-01"]);
  assert.deepEqual(datesOf({days: [1]}, "2027-03-22", "2027-04-05"), ["2027-03-22", "2027-03-29", "2027-04-05"]);
});
test("seasonEnd: od července příští rok, jinak tento rok", () => {
  assert.equal(seasonEnd("2026-10-23"), "2027-06-30");
  assert.equal(seasonEnd("2027-03-01"), "2027-06-30");
  assert.equal(seasonEnd("2027-07-01"), "2028-06-30");
  assert.equal(seasonEnd("x"), "");
});
test("relDl a relOf: termín přihlašování relativně k datu (i přes měsíc a rok)", () => {
  assert.equal(relDl("2026-11-01", {d: 1, t: "18:00"}), "2026-10-31T18:00");
  assert.equal(relDl("2027-01-01", {d: 2, t: "20:30"}), "2026-12-30T20:30");
  assert.equal(relDl("2026-11-04", {d: 0, t: "12:00"}), "2026-11-04T12:00");
  assert.equal(relDl("2026-11-04", {d: 1, t: ""}), "");
  assert.deepEqual(relOf("2026-11-04", "2026-11-02T19:15"), {d: 2, t: "19:15"});
  assert.equal(relOf("2026-11-04", "2026-11-05T10:00"), null);
  assert.equal(relOf("2026-11-04", ""), null);
});
test("chunks: dávky po nejvýš 400 zápisech", () => {
  const c = chunks(Array.from({length: 1001}, (_, i) => i));
  assert.deepEqual(c.map(x => x.length), [400, 400, 201]);
  assert.equal(BATCH_MAX, 400);
});

// ===== Úpravy a mazání série =====
test("seriesTail a editPlan: tato a další, ručně upravené se vynechají, termín přihlašování relativně", () => {
  const evs = [ev("a", "2026-11-04", 1), ev("b", "2026-11-11", 2), ev("c", "2026-11-18", 3, true), ev("d", "2026-11-25", 4), {id: "z", date: "2026-11-12"}];
  assert.deepEqual(seriesTail(evs, evs[1]).map(e => e.id), ["b", "c", "d"]);
  assert.deepEqual(seriesTail(evs, evs[4]), []);
  const p = editPlan(evs, evs[1], {time: "19:00", place: "Nová hala", dl: "2026-11-09T20:00"});
  assert.deepEqual(p.apply, [
    {id: "b", d: {time: "19:00", place: "Nová hala", dl: "2026-11-09T20:00"}},
    {id: "d", d: {time: "19:00", place: "Nová hala", dl: "2026-11-23T20:00"}}
  ]);
  assert.deepEqual(p.skip.map(e => e.id), ["c"]);
  // aktuální událost se upraví, i když je ručně upravená
  assert.deepEqual(editPlan(evs, evs[2], {time: "17:00", place: "", dl: "2026-11-17T18:00"}).apply.map(x => x.id), ["c", "d"]);
});
test("deletePlan: jen budoucí, bez odpovědí a bez vyúčtování", () => {
  const evs = [ev("a", "2026-10-21", 1), ev("b", "2026-10-28", 2), {...ev("c", "2026-11-04", 3), ss: true}, ev("d", "2026-11-11", 4), ev("e", "2026-11-18", 5)];
  const p = deletePlan(evs, evs[0], new Set(["d"]), "2026-10-23");
  assert.deepEqual(p.del, ["b", "e"]);
  assert.deepEqual(p.keep, [{id: "c", date: "2026-11-04", why: "ss"}, {id: "d", date: "2026-11-11", why: "att"}]);
});
test("manualChange: datum, čas, místo, termín", () => {
  const a = ev("a", "2026-11-04", 1);
  assert.equal(manualChange(a, {...a, title: "Jiný název", note: "x"}), false);
  assert.equal(manualChange(a, {...a, time: "19:00"}), true);
  assert.equal(manualChange(a, {...a, dl: ""}), true);
});

// ===== Zápisy =====
test("seriesOps: události s ser = {id, i}, relativní termín, šablona pokladny jen mimo výchozí", () => {
  const o = {sid: "S", ids: ["e1", "e2"], dates: ["2026-11-04", "2026-11-11"], rule: {days: [3], every: 1, from: "2026-11-04", to: "2026-11-11", skip: []},
    d: {title: "Led", time: "18:00", place: "Hala", note: ""}, rel: {d: 1, t: "18:00"}, tpl: "extra", by: "t@x.cz", at: "T"};
  const r = seriesOps(o);
  assert.deepEqual(r.ops[0], ["set", "events", "e1", {type: "training", title: "Led", date: "2026-11-04", time: "18:00", place: "Hala", dl: "2026-11-03T18:00", note: "", lines: {}, ser: {id: "S", i: 1}}]);
  assert.deepEqual(r.ops[1], ["set", "evcash", "e1", {tpl: "extra"}]);
  assert.equal(r.ops.length, 4);
  assert.deepEqual(r.series, {rule: {days: [3], every: 1, from: "2026-11-04", to: "2026-11-11", skip: []}, d: {title: "Led", time: "18:00", place: "Hala", note: "", dl: {d: 1, t: "18:00"}, tpl: "extra"}, n: 2, by: "t@x.cz", at: "T"});
  assert.equal(seriesOps({...o, tpl: "train"}).ops.length, 2);
});
test("pravidla: kolekce series čtou členové týmu (ne hostující), zapisuje kdo smí upravovat události (matice)", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const m = rules.match(/match \/series\/\{id\} \{([\s\S]*?)\n    \}/);
  assert.ok(m, "chybí pravidlo pro series");
  assert.match(m[1], /allow read: if isTeam\(\);/);
  assert.match(m[1], /allow create, update: if can\('events', 'e'\);/);
  assert.match(m[1], /allow delete: if can\('events', 'd'\);/);
  assert.equal(SERIES_COLL, "series");
});
