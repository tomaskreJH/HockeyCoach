// Testy čisté logiky notifikací (functions/logic.js): pražský čas, rozpoznání změny, texty, příjemci a limity.
// Struktura: Importy -> Pomocné funkce -> Čas -> Změna události -> Texty -> Příjemci -> Limity.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {answeredSet, burstAction, changeRecipients, changeText, dayAdd, dayKey, deadlineRecipients, deadlineText, deadlineTtl, detectChange, dlText, hourKey, inWindow,
  isCleanupTime, memberOf, pragueParts, summaryText, usableDevices, addMin} from "../functions/logic.js";

// ===== Pomocné funkce =====
const TOK = n => "t".repeat(25) + n;
const dev = (x = {}) => ({id: "d1", tok: TOK(1), email: "a@x.cz", pid: "p1", tid: "", ch: "", z: true, u: true, at: 1, ...x});

// ===== Čas =====
test("pragueParts: zima +1 h, léto +2 h", () => {
  assert.deepEqual(pragueParts(Date.UTC(2026, 10, 4, 16, 43)), {date: "2026-11-04", time: "17:43", dl: "2026-11-04T17:43"});
  assert.equal(pragueParts(Date.UTC(2026, 6, 1, 22, 30)).dl, "2026-07-02T00:30");
});

test("dayAdd, dlText, addMin", () => {
  assert.equal(dayAdd("2026-12-31", 1), "2027-01-01");
  assert.equal(dayAdd("2026-03-01", -1), "2026-02-28");
  assert.equal(dlText("2026-11-09T18:00"), "9. 11. 18:00");
  assert.equal(addMin("18:00", -30), "17:30");
  assert.equal(addMin("00:10", -30), "23:40");
  assert.equal(addMin("xx", -30), "");
});

test("inWindow: dnes až 30 dní dopředu", () => {
  assert.ok(inWindow("2026-11-04", "2026-11-04"));
  assert.ok(inWindow("2026-12-04", "2026-11-04"));
  assert.ok(!inWindow("2026-12-05", "2026-11-04"));
  assert.ok(!inWindow("2026-11-03", "2026-11-04"));
  assert.ok(!inWindow(undefined, "2026-11-04"));
});

// ===== Změna události =====
const tr = (x = {}) => ({date: "2026-11-10", time: "18:00", end: "19:00", meet: 30, title: "Trénink", ...x});
const CAN = {by: "t@x.cz", at: "2026-11-05", reason: ""};

test("detectChange: bez změny a nesledovaná pole = null", () => {
  assert.equal(detectChange(tr(), tr(), false), null);
  assert.equal(detectChange(tr(), tr({title: "Jiný", place: "Hala", note: "x", cash: {a: 1}}), false), null);
  assert.equal(detectChange(null, tr(), false), null);
  assert.equal(detectChange(tr(), null, false), null);
});

test("detectChange: zápas – živý zápis (skóre, střely, hodiny) nikdy nevyvolá změnu", () => {
  const m = {date: "2026-11-14", time: "15:00", opp: "Ostrava", meet: 60};
  assert.equal(detectChange(m, {...m, live: {clock: 123, shots: 5}, score: {h: 1, a: 0}, st: "live"}, true), null);
});

test("detectChange: zrušení, obnovení, změna času", () => {
  assert.equal(detectChange(tr(), tr({cancelled: CAN}), false).kind, "cancel");
  assert.equal(detectChange(tr({cancelled: CAN}), tr(), false).kind, "restore");
  assert.equal(detectChange(tr({cancelled: CAN}), tr({cancelled: CAN, time: "19:00"}), false), null, "zrušená se dál nehlídá");
  assert.deepEqual(detectChange(tr(), tr({time: "19:00"}), false), {kind: "time", diff: ["time"]});
  assert.deepEqual(detectChange(tr(), tr({date: "2026-11-11"}), false), {kind: "time", diff: ["date"]});
  assert.deepEqual(detectChange(tr(), tr({end: "20:00"}), false).diff, ["end"]);
  assert.deepEqual(detectChange(tr(), tr({meet: 45}), false).diff, ["meet"]);
});

test("detectChange: konec a sraz se dopsané formulářem (dřív nezapsané) nejsou změna", () => {
  assert.equal(detectChange(tr({end: undefined, meet: undefined}), tr({end: "19:00", meet: 30}), false), null);
  assert.equal(detectChange(tr({end: ""}), tr({end: "19:00"}), false), null);
  assert.equal(detectChange({date: "2026-11-14", time: "15:00"}, {date: "2026-11-14", time: "15:00", end: "16:00"}, true), null, "zápas konec nesleduje");
});

// ===== Texty =====
test("changeText: zrušení, obnovení, posun data, začátku, konce a srazu", () => {
  const b = tr(), c = (a, m = false) => changeText(detectChange(b, a, m), b, a, m, "e1");
  assert.match(c(tr({cancelled: CAN})).title, /^❌ Zrušeno: Trénink/);
  assert.match(changeText({kind: "restore", diff: []}, b, b, false, "e1").title, /^↩️ Obnoveno/);
  assert.match(c(tr({time: "19:00"})).body, /Nový začátek 19:00 \(dříve 18:00\)/);
  assert.match(c(tr({date: "2026-11-11"})).body, /Nově St 11\. 11\. 18:00 \(dříve Út 10\. 11\. 18:00\)/);
  assert.match(c(tr({end: "20:00"})).body, /konec 20:00/);
  assert.match(c(tr({meet: 45})).body, /sraz 17:15/);
  assert.equal(c(tr({time: "19:00"})).tag, "chg_e1");
});

test("texty: zápas má název se soupeřem, souhrn a uzávěrka", () => {
  const m = {date: "2026-11-14", time: "15:00", opp: "Ostrava", dl: "2026-11-13T18:00"};
  assert.equal(deadlineText(m, true, "m1").title, "⏳ Hodina do uzávěrky: Zápas – Ostrava");
  assert.match(deadlineText(m, true, "m1").body, /přihlašování končí 13\. 11\. 18:00/);
  assert.equal(deadlineText(m, true, "m1").tag, "dl_m1");
  assert.equal(summaryText().tag, "chg_summary");
});

// ===== Příjemci =====
test("usableDevices: bez tokenu pryč, stejný token = vyhrává novější zápis", () => {
  const r = usableDevices([dev({id: "a", at: 1}), dev({id: "b", at: 5}), dev({id: "c", tok: ""}), dev({id: "d", tok: "krátký"}), dev({id: "e", tok: TOK(2)})]);
  assert.deepEqual(r.map(d => d.id).sort(), ["b", "e"]);
});

test("changeRecipients: jen Jdu / Nejsem jistý, jen s povolenou změnou, hráčka i člen týmu", () => {
  const att = [{pid: "p1", st: "yes"}, {pid: "p2", st: "no"}, {pid: "p3", st: "maybe"}, {pid: "t1", st: "yes"}];
  const devs = [dev({id: "a", pid: "p1"}), dev({id: "b", pid: "p2"}), dev({id: "c", pid: "p3", z: false}), dev({id: "d", pid: "", tid: "t1"}), dev({id: "e", pid: "", tid: ""})];
  assert.deepEqual(changeRecipients(devs, att).map(d => d.id), ["a", "d"]);
});

test("memberOf: aktivní hráčka, jinak člen týmu, ukončená hráčka → člen týmu, manager bez nich null", () => {
  const ents = {p: {p1: {ended: false}, p2: {ended: true}}, t: {t1: {}}};
  assert.equal(memberOf(dev({pid: "p1", tid: "t1"}), ents), "p1");
  assert.equal(memberOf(dev({pid: "p2", tid: "t1"}), ents), "t1");
  assert.equal(memberOf(dev({pid: "p2", tid: ""}), ents), null);
  assert.equal(memberOf(dev({pid: "px", tid: ""}), ents), null, "smazaná hráčka");
  assert.equal(memberOf(dev({pid: "", tid: ""}), ents), null);
});

test("deadlineRecipients: jen kdo neodpověděl a má uzávěrku zapnutou", () => {
  const ents = {p: {p1: {}, p2: {}, p3: {}}, t: {}};
  const answered = answeredSet([{pid: "p1", st: "yes"}, {pid: "p2", st: "no"}, {pid: "p9", st: "x"}]);
  const devs = [dev({id: "a", pid: "p1"}), dev({id: "b", pid: "p2"}), dev({id: "c", pid: "p3"}), dev({id: "d", pid: "p3", u: false})];
  assert.deepEqual(deadlineRecipients(devs, answered, ents).map(d => d.id), ["c"]);
});

// ===== Limity =====
test("burstAction: 3 plná, 4. souhrn, dál zahodit", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 9].map(burstAction), ["send", "send", "send", "summary", "drop", "drop"]);
});

test("klíče hodiny a dne a platnost připomínky", () => {
  const ms = Date.UTC(2026, 10, 4, 16, 43);
  assert.equal(hourKey(ms), "2026110417");
  assert.equal(dayKey(ms), "20261104");
  assert.equal(deadlineTtl("2026-11-09T17:00", "2026-11-09T18:00"), 3600);
  assert.equal(deadlineTtl("2026-11-09T17:30", "2026-11-09T18:00"), 1800);
  assert.equal(deadlineTtl("2026-11-09T17:59", "2026-11-09T18:00"), 120, "nejméně 2 minuty");
});

test("isCleanupTime: jen 03:00–03:14 pražského času", () => {
  assert.ok(isCleanupTime(Date.UTC(2026, 10, 4, 2, 5)));
  assert.ok(!isCleanupTime(Date.UTC(2026, 10, 4, 2, 15)));
  assert.ok(!isCleanupTime(Date.UTC(2026, 10, 4, 12, 0)));
});
