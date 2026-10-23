// Testy žádostí o přijetí do týmu (domain/join-requests.js) a pravidel kolekce joinreq (kontrola textu firestore.rules).

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {JOIN_COLL, RESEND_MS, approvePlan, canResend, defaultRole, freePlayers, freeStaff, joinCheck, joinDoc, numTaken, openJoins, rejectPlan} from "../src/domain/join-requests.js";

// ===== Data =====
const players = [
  {id: "p1", name: "Anna", num: "7", st: "act"},
  {id: "p2", name: "Bára", num: "12", st: "act"},
  {id: "p3", name: "Cecílie", num: "7", st: "end"},
  {id: "p4", name: "Dana", num: "", st: "inj"}
];
const staff = [{id: "t1", name: "Petr", kind: "Trenér"}, {id: "t2", name: "Eva", kind: "Kustod"}];
const members = [{email: "anna@x.cz", role: "hracka", pid: "p1"}, {email: "petr@x.cz", role: "trener", tid: "t1"}];
const ctx = {by: "trener@x.cz", at: "2026-10-23T10:00:00.000Z", ms: 1000, newId: "NEW", auditId: "A1"};
const open = {email: "kacka@x.cz", nick: "Kačka", num: "12", kind: "hracka", note: "", st: "open", at: "2026-10-23T09:00:00.000Z"};

// ===== Formulář žádosti =====
test("joinCheck: přezdívka povinná, číslo 1–99 nebo prázdné, druh, poznámka max 300", () => {
  assert.equal(joinCheck({nick: " ", kind: "hracka"}).ok, false);
  assert.equal(joinCheck({nick: "A", num: "0", kind: "hracka"}).ok, false);
  assert.equal(joinCheck({nick: "A", num: "100", kind: "hracka"}).ok, false);
  assert.equal(joinCheck({nick: "A", num: "07", kind: "hracka"}).ok, false);
  assert.equal(joinCheck({nick: "A", kind: "host"}).ok, false);
  assert.equal(joinCheck({nick: "A", kind: "staff", note: "x".repeat(301)}).ok, false);
  assert.equal(joinCheck({nick: "x".repeat(41), kind: "staff"}).ok, false);
  assert.deepEqual(joinCheck({nick: " Kačka ", num: " 9 ", kind: "hracka", note: " ahoj "}), {ok: true, d: {nick: "Kačka", num: "9", kind: "hracka", note: "ahoj"}});
  assert.deepEqual(joinCheck({nick: "Jan", kind: "staff"}).d, {nick: "Jan", num: "", kind: "staff", note: ""});
});
test("joinDoc: jen pole formuláře, e-mail malými písmeny, st open", () => {
  const d = joinDoc("Kacka@X.cz", {nick: "Kačka", num: "12", kind: "hracka", note: ""}, "T");
  assert.deepEqual(d, {email: "kacka@x.cz", nick: "Kačka", num: "12", kind: "hracka", note: "", st: "open", at: "T"});
  assert.equal(JOIN_COLL, "joinreq");
});
test("canResend: bez žádosti ano, otevřená ne, vyřízená až po 24 h", () => {
  assert.equal(canResend(null, 5).ok, true);
  assert.equal(canResend({st: "open"}, 5).ok, false);
  assert.deepEqual(canResend({st: "no", doneMs: 1000}, 1000 + RESEND_MS - 1), {ok: false, from: 1000 + RESEND_MS});
  assert.equal(canResend({st: "no", doneMs: 1000}, 1000 + RESEND_MS).ok, true);
  assert.equal(canResend({st: "ok", doneMs: 0}, RESEND_MS).ok, true, "odebraný přístup – po 24 h znovu");
});
test("openJoins: jen otevřené, od nejstarší", () => {
  const l = [{email: "b", st: "open", at: "2"}, {email: "a", st: "no", at: "0"}, {email: "c", st: "open", at: "1"}];
  assert.deepEqual(openJoins(l).map(r => r.email), ["c", "b"]);
  assert.deepEqual(openJoins(undefined), []);
});

// ===== Vyřízení =====
test("volné hráčky a členové týmu: bez účtu, bez ukončených, shoda čísla první", () => {
  assert.deepEqual(freePlayers(players, members, "").map(p => p.id), ["p2", "p4"]);
  assert.deepEqual(freePlayers(players, members, "12").map(p => p.id), ["p2", "p4"]);
  assert.deepEqual(freePlayers([...players, {id: "p5", name: "Alena", num: "4"}], members, "4").map(p => p.id), ["p5", "p2", "p4"]);
  assert.deepEqual(freeStaff(staff, members).map(t => t.id), ["t2"]);
  assert.deepEqual(numTaken(players, "7").map(p => p.id), ["p1"], "ukončená hráčka číslo neblokuje");
  assert.deepEqual(numTaken(players, ""), []);
  assert.equal(defaultRole("staff"), "kustod");
  assert.equal(defaultRole("hracka"), "hracka");
});
test("approvePlan: nová hráčka = soupiska + members + žádost + audit v jedné dávce", () => {
  const p = approvePlan(open, {role: "hracka", target: "new"}, ctx);
  assert.equal(p.ok, true);
  assert.deepEqual(p.ops.map(o => o[0] + " " + o[1]), ["set players/NEW", "set members/kacka@x.cz", "merge joinreq/kacka@x.cz", "set audit/A1"]);
  assert.deepEqual(p.ops[0][2], {name: "Kačka", num: "12", pos: "", alt: "", st: "act"});
  assert.deepEqual(p.member, {role: "hracka", addedBy: "trener@x.cz", pid: "NEW"});
  assert.deepEqual(p.ops[2][2], {st: "ok", reply: "", doneBy: "trener@x.cz", doneMs: 1000, pid: "NEW"});
  assert.equal(p.ops[3][2].act, "join");
  assert.ok(!p.ops.some(o => /plpay|charges|cash/.test(o[1])), "nesahá na platby");
});
test("approvePlan: existující hráčka, realizační tým s / bez propojení, chyby", () => {
  const a = approvePlan(open, {role: "hracka", target: "p2"}, ctx);
  assert.deepEqual(a.ops.map(o => o[1]), ["members/kacka@x.cz", "joinreq/kacka@x.cz", "audit/A1"]);
  assert.equal(a.member.pid, "p2");
  assert.match(approvePlan(open, {role: "hracka", target: "p2"}, {...ctx, label: "Bára"}).ops[2][2].note, /hráčka Bára$/);
  const s = {...open, kind: "staff"};
  const b = approvePlan(s, {role: "kustod", target: "new"}, ctx);
  assert.deepEqual(b.ops[0], ["set", "staff/NEW", {name: "Kačka", kind: "Kustod"}]);
  assert.deepEqual(b.member, {role: "kustod", addedBy: "trener@x.cz", tid: "NEW"});
  const c = approvePlan(s, {role: "trener", target: "none"}, ctx);
  assert.deepEqual(c.member, {role: "trener", addedBy: "trener@x.cz"});
  assert.deepEqual(c.ops[1][2], {st: "ok", reply: "", doneBy: "trener@x.cz", doneMs: 1000});
  assert.equal(approvePlan(open, {role: "hracka", target: "none"}, ctx).ok, false);
  assert.equal(approvePlan(open, {role: "boss", target: "new"}, ctx).ok, false);
  assert.equal(approvePlan({...open, st: "no"}, {role: "hracka", target: "new"}, ctx).ok, false);
});
test("rejectPlan: důvod povinný, žádost + audit", () => {
  assert.equal(rejectPlan(open, " ", ctx).ok, false);
  const p = rejectPlan(open, "Nejsi z oddílu", ctx);
  assert.deepEqual(p.ops[0], ["merge", "joinreq/kacka@x.cz", {st: "no", reply: "Nejsi z oddílu", doneBy: "trener@x.cz", doneMs: 1000}]);
  assert.equal(p.ops[1][1], "audit/A1");
  assert.equal(rejectPlan({...open, st: "ok"}, "x", ctx).ok, false);
});

// ===== Pravidla databáze =====
test("pravidla joinreq: založení jen vlastní e-mail bez členství, čte vlastník a trenér, 24 h ochrana", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const i = rules.indexOf("match /joinreq/{email}"), blk = rules.slice(i, rules.indexOf("\n    }", i) + 6);
  assert.ok(i > 0, "pravidlo pro joinreq");
  assert.match(rules, /function joinOwner\(email\) \{ return signedIn\(\) && email == mail\(\) && !isMember\(\); \}/);
  assert.match(rules, /d\.keys\(\)\.hasOnly\(\['email', 'nick', 'num', 'kind', 'note', 'st', 'at'\]\)\s+&& d\.email == email && d\.st == 'open'/);
  assert.match(blk, /allow read: if signedIn\(\) && \(email == mail\(\) \|\| isCoach\(\)\);/);
  assert.match(blk, /allow create: if joinOwner\(email\) && joinForm\(email, request\.resource\.data\);/);
  assert.match(blk, /86400000/);
  assert.match(blk, /allow delete: if isCoach\(\) \|\| \(signedIn\(\) && email == mail\(\) && resource\.data\.st == 'open'\);/);
});
