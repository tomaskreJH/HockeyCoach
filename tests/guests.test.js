// Testy hostujících hráček (domain/guests.js): příznak guest, veřejné hlavičky evpub, formace lineuppub, plán zápisu jen rozdílů
// a převod hlaviček pro hostující účet; pravidla databáze (isTeam / isHost, evpub, lineuppub) kontrolou textu.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {EVPUB_COLL, LUPUB_COLL, evPubDoc, fromPub, guestPatch, hasGuests, isGuest, lineupPubDoc, pubPlan, stable} from "../src/domain/guests.js";

// ===== Konstanty =====
const TODAY = "2026-10-24";
const PL = [{id: "p1", name: "Eva", num: "12", st: "act"}, {id: "p2", name: "Host", num: "7", st: "act", guest: true}, {id: "g1", name: "Jana", num: "1", pos: "Brankářka", st: "act"}];
const TR = [{id: "t1", name: "Trenér Petr"}];
const EV = [{id: "e1", title: "Trénink", date: "2026-10-25", time: "18:00", end: "19:00", meet: 30, place: "Hala", dl: "2026-10-24T18:00", note: "", lines: {p1: 1, p2: 1, "t:t1": 2}},
  {id: "e0", title: "Starý", date: "2026-09-01", time: "18:00", lines: {}}];
const MA = [{id: "m1", opp: "Lvice", home: true, date: "2026-10-26", time: "17:00", place: "Hala", dl: "", lineup: {"1C": "p1", "1LK": "p2", "1LK+": "p1", G1: "g1"}, events: [{k: "G"}], closed: false}];

// ===== Testy =====
test("isGuest / guestPatch / hasGuests: příznak hostující hráčky", () => {
  assert.equal(isGuest(PL[1]), true);
  assert.equal(isGuest(PL[0]), false);
  assert.deepEqual(guestPatch(true), {guest: true});
  assert.deepEqual(guestPatch(false), {guest: "__del"});
  assert.equal(hasGuests(PL), true);
  assert.equal(hasGuests([{id: "x", guest: true, st: "end"}]), false, "ukončená hostující se nepočítá");
});

test("evPubDoc: hlavička bez odpovědí, sestav a statistik", () => {
  const t = evPubDoc(EV[0], "t"), m = evPubDoc(MA[0], "m");
  assert.deepEqual(t, {k: "t", date: "2026-10-25", time: "18:00", place: "Hala", dl: "2026-10-24T18:00", meet: 30, title: "Trénink", end: "19:00", note: ""});
  assert.deepEqual(m, {k: "m", date: "2026-10-26", time: "17:00", place: "Hala", dl: "", opp: "Lvice", home: true});
  assert.ok(!("lines" in t) && !("lineup" in m) && !("events" in m));
  assert.deepEqual(evPubDoc({...MA[0], cancelled: {by: "a@b.cz", at: "2026-10-24T10:00", reason: "led"}}, "m").cancelled, {at: "2026-10-24T10:00", reason: "led"}, "bez e-mailu");
});

test("lineupPubDoc: pětky tréninku a formace zápasu jako jména", () => {
  assert.deepEqual(lineupPubDoc(EV[0], "t", PL, TR), {k: "t", date: "2026-10-25", rows: [{t: "1. pětka", n: ["#12 Eva", "#7 Host"]}, {t: "2. pětka", n: ["🎓 Trenér Petr"]}]});
  assert.deepEqual(lineupPubDoc(MA[0], "m", PL, TR).rows, [{t: "1. formace", n: ["#7 Host", "#12 Eva", "#12 Eva"]}, {t: "Brankářky", n: ["#1 Jana"]}]);
  assert.equal(lineupPubDoc(EV[1], "t", PL, TR), null, "bez pětek se dokument nezakládá");
});

test("pubPlan: bez hostujících vše smazat, jinak zapsat jen rozdíly a staré události vynechat", () => {
  const p = pubPlan(EV, MA, PL, TR, {}, TODAY);
  assert.deepEqual(p.set.map(x => x.c + "/" + x.id).sort(), [EVPUB_COLL + "/e1", EVPUB_COLL + "/m1", LUPUB_COLL + "/e1", LUPUB_COLL + "/m1"]);
  const cur = {[EVPUB_COLL]: Object.fromEntries(p.set.filter(x => x.c === EVPUB_COLL).map(x => [x.id, x.d])), [LUPUB_COLL]: Object.fromEntries(p.set.filter(x => x.c === LUPUB_COLL).map(x => [x.id, x.d]))};
  assert.deepEqual(pubPlan(EV, MA, PL, TR, cur, TODAY), {set: [], del: []}, "nic se nezměnilo");
  const none = pubPlan(EV, MA, [PL[0]], TR, cur, TODAY);
  assert.equal(none.set.length, 0);
  assert.equal(none.del.length, 4, "bez hostujících se veřejné dokumenty smažou");
  const canc = pubPlan([{...EV[0], cancelled: {at: "x", reason: ""}}], MA, PL, TR, cur, TODAY);
  assert.ok(canc.del.some(x => x.c === LUPUB_COLL && x.id === "e1"), "zrušená událost formaci nemá");
  assert.equal(stable({b: 1, a: [1, {d: 2, c: 3}]}), stable({a: [1, {c: 3, d: 2}], b: 1}));
});

test("fromPub: hostující dostane tréninky a zápasy ve tvaru events / matches", () => {
  const x = fromPub([{id: "e1", ...evPubDoc(EV[0], "t")}, {id: "m1", ...evPubDoc(MA[0], "m")}]);
  assert.equal(x.ev.length, 1);
  assert.equal(x.ma[0].opp, "Lvice");
  assert.equal(x.ma[0].home, true);
  assert.equal(x.ev[0].end, "19:00");
});

test("pravidla: hostující čte jen sebe, evpub a lineuppub zapisuje trenér / kustod", () => {
  const r = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(r, /function isTeam\(\) \{ return isMember\(\) && role\(\) != 'host'; \}/);
  assert.match(r, /function isPlayer\(\) \{ return isMember\(\) && role\(\) in \['hracka', 'host'\]/);
  assert.match(r, /match \/players\/\{id\} \{\n      allow read: if isTeam\(\) \|\| \(isHost\(\) && id == myPid\(\)\);/);
  assert.match(r, /match \/attendance\/\{id\} \{\n      allow read: if isTeam\(\) \|\| \(isHost\(\) && resource\.data\.pid == myPid\(\)\);/);
  ["staff", "matches", "events", "series"].forEach(c => assert.match(r, new RegExp("match /" + c + "/\\{id\\} \\{\\n      allow read: if isTeam\\(\\);"), c));
  assert.match(r, /match \/debtors\/\{id\} \{\n      allow read: if isTeam\(\);/);
  assert.match(r, /match \/evpub\/\{id\} \{\n      allow read: if isMember\(\);\n      allow create, update: if isStaff\(\) && pubOk/);
  assert.match(r, /match \/lineuppub\/\{id\} \{\n      allow read: if isTeam\(\) \|\| hostGoing\(id\);/);
  assert.match(r, /get\(attPath\(eid\)\)\.data\.st == 'yes'/);
  assert.match(r, /role\(\) != 'host' && get\(memberPath\(\)\)\.data\.get\('cash', false\) == true/, "hostující není pokladník");
});
