// Testy v22.7: 🕘 historie přihlášek (src/domain/att-log.js) – stavba záznamu, osoba zapisujícího, časová osa události
// se staršími odpověďmi bez historie, termín a začátek, filtry, souhrn, poslední zapisující a pravidla attlog.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {byPerson, filterRows, lastWriter, LOG_ST, logEntry, logMs, logOps, logRows, logSummary, writerOf} from "../src/domain/att-log.js";

// ===== Data =====
const T = s => Date.parse("2026-10-" + s + ":00");                 // čas „DDTHH:MM“ v ms (místní čas)
const EV = {id: "e1", dl: "2026-10-20T18:00", start: T("21T17:00")};
const LOGS = [
  {eid: "e1", pid: "p1", st: "yes", by: "p1@x.cz", bp: "p1", at: {seconds: T("18T10:00") / 1000, nanoseconds: 0}},
  {eid: "e1", pid: "p1", st: "no", by: "tr@x.cz", bp: "t1", at: T("20T19:30")},                  // trenér za hráčku po termínu
  {eid: "e1", pid: "p2", st: "maybe", by: "p2@x.cz", bp: "p2", at: T("19T08:00"), src: "abs"},
  {eid: "e1", pid: "p2", st: "nos", by: "tr@x.cz", bp: "t1", at: T("21T18:00")},                 // 🚫 po začátku
  {eid: "e2", pid: "p1", st: "yes", by: "p1@x.cz", bp: "p1", at: T("18T09:00")},                 // jiná událost
  {eid: "e1", pid: "p3", st: "bad", by: "x", bp: "", at: T("18T09:00")}                          // neznámý stav – vynechá se
];
const ATT = [
  {eid: "e1", pid: "p1", st: "no", at: new Date(T("20T19:31")).toISOString(), by: "tr@x.cz"},
  {eid: "e1", pid: "p4", st: "yes", at: new Date(T("17T12:00")).toISOString(), by: "p4@x.cz"}     // odpověď z doby před historií
];

// ===== Záznam =====
test("logEntry: povinná pole, čas serveru, src jen povolený", () => {
  assert.deepEqual(logEntry("e1", "p1", "yes", "a@x.cz", "p1"), {eid: "e1", pid: "p1", st: "yes", by: "a@x.cz", bp: "p1", at: "__now"});
  assert.equal(logEntry("e1", "p1", "yes", "a@x.cz", "p1", "abs").src, "abs");
  assert.equal("src" in logEntry("e1", "p1", "yes", "a@x.cz", "p1", "hack"), false);
  assert.equal(logEntry("e1", "p1", "zzz", "a", "p1"), null);
  assert.equal(logEntry("", "p1", "yes", "a", "p1"), null);
  assert.deepEqual(LOG_ST, ["yes", "no", "maybe", "del", "nos", "nos0"]);
});
test("writerOf: sám za sebe = cílová osoba, jinak člen týmu, jinak hráčka, jinak prázdné", () => {
  assert.equal(writerOf("p1", {pid: "p1", tid: "t1"}), "p1");
  assert.equal(writerOf("t1", {pid: "p1", tid: "t1"}), "t1");
  assert.equal(writerOf("p2", {pid: "p1", tid: "t1"}), "t1");
  assert.equal(writerOf("p2", {pid: "p1"}), "p1");
  assert.equal(writerOf("p2", {}), "");
});
test("logOps: operace merge do attlog s novým id, neplatné položky vynechá", () => {
  let n = 0;
  const ops = logOps([{eid: "e1", pid: "p1", st: "del"}, {eid: "e1", pid: "p2", st: "?"}], "tr@x.cz", {tid: "t1"}, () => "id" + (++n));
  assert.deepEqual(ops, [["merge", "attlog", "id1", {eid: "e1", pid: "p1", st: "del", by: "tr@x.cz", bp: "t1", at: "__now"}]]);
});
test("logMs: číslo, Timestamp, JSON Timestamp, ISO text", () => {
  assert.equal(logMs(5), 5);
  assert.equal(logMs({toMillis: () => 7}), 7);
  assert.equal(logMs({seconds: 2, nanoseconds: 5e6}), 2005);
  assert.equal(logMs("2026-10-20T10:00:00.000Z"), Date.parse("2026-10-20T10:00:00.000Z"));
  assert.equal(logMs("x"), null);
  assert.equal(logMs(null), null);
});

// ===== Časová osa =====
test("logRows: jen událost, nejnovější nahoře, sám / za někoho, po termínu a po začátku, starší odpověď bez historie", () => {
  const r = logRows(LOGS, ATT, EV);
  assert.deepEqual(r.map(x => x.pid + ":" + x.st), ["p2:nos", "p1:no", "p2:maybe", "p1:yes", "p4:yes"]);
  const [nos, no, mb, yes, old] = r;
  assert.equal(nos.after, true); assert.equal(nos.self, false);
  assert.equal(no.late, true); assert.equal(no.after, false); assert.equal(no.self, false); assert.equal(no.bp, "t1");
  assert.equal(mb.src, "abs"); assert.equal(mb.self, true); assert.equal(mb.late, false);
  assert.equal(yes.self, true); assert.equal(yes.ms, T("18T10:00"));
  assert.equal(old.old, true); assert.equal(old.by, "p4@x.cz"); assert.equal(old.self, false);
});
test("logRows: záznam bez času (čeká na server) je nahoře; bez termínu nic není po termínu", () => {
  const r = logRows([{eid: "e1", pid: "p1", st: "yes", bp: "p1", at: null}, {eid: "e1", pid: "p2", st: "no", bp: "p2", at: T("25T10:00")}], [], {id: "e1"});
  assert.equal(r[0].ms, null);
  assert.equal(r.some(x => x.late || x.after), false);
  // Starší odpověď bez času je až dole (pod záznamy s časem)
  const o = logRows([{eid: "e1", pid: "p1", st: "yes", bp: "p1", at: T("25T10:00")}], [{eid: "e1", pid: "p2", st: "no"}], {id: "e1"});
  assert.deepEqual(o.map(x => x.pid), ["p1", "p2"]);
});
test("byPerson, filterRows, logSummary", () => {
  const r = logRows(LOGS, ATT, EV);
  assert.deepEqual(byPerson(r).map(g => g.pid + "=" + g.rows.length), ["p2=2", "p1=2", "p4=1"]);
  assert.deepEqual(filterRows(r, "other").map(x => x.st), ["nos", "no"]);
  assert.deepEqual(filterRows(r, "late").map(x => x.st), ["nos", "no"]);
  assert.equal(filterRows(r, "all").length, 5);
  assert.deepEqual(logSummary(r), {n: 4, other: 2, late: 2, after: 1, people: 2});
});
test("lastWriter: shoda stavu a času s docházkou, jinak null", () => {
  const r = logRows(LOGS, ATT, EV);
  assert.equal(lastWriter(r, "p1", ATT[0]).bp, "t1");
  assert.equal(lastWriter(r, "p1", {st: "yes", at: ATT[0].at}), null);                       // stav nesouhlasí
  assert.equal(lastWriter(r, "p1", {st: "no", at: new Date(T("20T21:00")).toISOString()}), null); // víc než 5 min
  assert.equal(lastWriter(r, "p4", ATT[1]), null);                                             // jen starší odpověď
  assert.equal(lastWriter(r, "p1", null), null);
});

// ===== Pravidla =====
test("firestore.rules: attlog jen přidávání, čas serveru, zapisující = účet, hráčka jen za sebe, čte jen realizační tým", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const s0 = rules.indexOf("match /attlog/{id}"), blk = rules.slice(s0, rules.indexOf("\n    }", s0));
  assert.match(blk, /allow read: if isStaff\(\);/);
  assert.match(blk, /allow create: if logOk\(request\.resource\.data\) && \(isStaff\(\) \|\| \(isPlayer\(\) && request\.resource\.data\.pid == myPid\(\)\)\);/);
  assert.match(blk, /allow delete: if isMgr\(\);/);
  assert.doesNotMatch(blk, /allow (update|write)/);
  assert.match(rules, /d\.by == mail\(\) && d\.at == request\.time && logBp\(d\)/);
  assert.match(rules, /d\.st in \['yes', 'no', 'maybe', 'del', 'nos', 'nos0'\]/);
});
