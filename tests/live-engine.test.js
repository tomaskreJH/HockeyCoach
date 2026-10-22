// Testy jádra živého zápisu (src/domain/live-engine.js) a časové osy (src/domain/timeline.js).
// Scénáře: počáteční stav, střídání, rotace dvou hráček na jednom místě, střela a Zpět, trest (oslabení, formace o 4 hráčkách),
// konec trestu, gól v přesilovce soupeře (ukončí náš trest), časová osa.
// Čas zápasu se v testech posouvá přímo polem live.acc (hodiny neběží), zápisy zachytává zástupná databáze.
import {test, beforeEach} from "node:test";
import assert from "node:assert/strict";
import {fakeDb} from "./support/fake-db.mjs";
import {S} from "../src/core/state.js";
import * as E from "../src/domain/live-engine.js";
import {timeline} from "../src/domain/timeline.js";

// ===== Příprava: soupiska a sestava =====
// Dvě pětky (1LK…1PO, 2LK…2PO), brankářka g1 a rotující partnerka r1C na místě 1C („1C+“)
const COLS = ["LK", "C", "PK", "LO", "PO"];
const posOf = c => (/O$/.test(c) ? "Obránkyně" : "Útočnice");
function setup() {
  S.pl = [{id: "g1", name: "G", pos: "Brankářka"}, {id: "r1C", name: "r1C", pos: "Útočnice"}];
  const lu = {G1: "g1", "1C+": "r1C"};
  [1, 2].forEach(n => COLS.forEach(c => { const id = "p" + n + c; S.pl.push({id, name: id, pos: posOf(c)}); lu[n + c] = id; }));
  const m = {id: "m1", date: "2026-10-20", opp: "Soupeř", lineup: lu};
  m.live = E.initLive(m);
  S.ma = [m]; S.mid = "m1"; S.db = fakeDb();
}
const L = () => S.ma[0].live;
const at = ms => { S.ma[0].live.acc = ms; };   // posun času zápasu (hodiny neběží)

beforeEach(setup);

// ===== Počáteční stav =====
test("initLive: první pětka na ledě, druhá ve frontách, brankářka G1", () => {
  assert.deepEqual(L().ice, {LK: "p1LK", C: "p1C", PK: "p1PK", LO: "p1LO", PO: "p1PO"});
  COLS.forEach(c => assert.deepEqual(L().q[c], ["p2" + c]));
  assert.equal(L().G, "g1");
  assert.equal(L().per, 1);
});

// ===== Střídání a rotace =====
test("doSub: střídání zapíše střídání odcházející hráčky a pošle na řadu její partnerku z rotace", () => {
  at(45000);
  E.doSub("p2C", "C");
  assert.equal(L().ice.C, "p2C");
  assert.deepEqual(L().sh, [{p: "p1C", c: "C", a: 0, b: 45000, per: 1}]);
  assert.deepEqual(L().q.C, ["r1C"], "místo 1C rotuje: do fronty jde partnerka r1C, ne p1C");
  assert.ok(S.db.writes.some(w => w.path === "matches/m1"), "zápas se uložil");
});

test("rotace: partnerka po příchodu na led posune index rotace místa 1C", () => {
  at(45000); E.doSub("p2C", "C");
  at(90000); E.doSub("r1C", "C");
  assert.equal(L().ice.C, "r1C");
  assert.deepEqual(L().q.C, ["p2C"]);
  assert.equal(L().ri["1C"], 1);
});

test("act: hráčka je nejvýš na jednom místě (na ledě, nebo v jedné frontě)", () => {
  at(30000); E.doSub("p2LK", "LK");
  at(60000); E.doSub("p2C", "C");
  const ice = COLS.map(c => L().ice[c]).filter(Boolean), q = COLS.flatMap(c => L().q[c]);
  const all = [...ice, ...q];
  assert.equal(new Set(all).size, all.length);
});

// ===== Střela a Zpět =====
test("doShot + doUndo: střela se zapíše a Zpět ji odebere", () => {
  at(20000);
  E.doShot("p1LK");
  assert.equal(S.ma[0].events.length, 1);
  assert.equal(S.ma[0].events[0].k, "S");
  assert.equal(S.ma[0].events[0].team, "us");
  E.doUndo();
  assert.equal((S.ma[0].events || []).length, 0);
});

test("doUndo: vrátí i střídání (stav ledu a front)", () => {
  at(45000); E.doSub("p2C", "C");
  E.doUndo();
  assert.equal(L().ice.C, "p1C");
  assert.deepEqual(L().q.C, ["p2C"]);
  assert.equal(L().sh.length, 0);
});

// ===== Tresty =====
test("addPen: náš menší trest – hráčka z ledu, 4 bruslařky, formace C, LK, LO, PO", () => {
  at(90000);
  E.act("Trest", (L2, n, ids, now) => E.addPen(L2, {t: "us", p: "p1LK", min: 2}, now, n));
  assert.equal(E.sk(L(), "us", 90000), 4);
  assert.equal(L().pen.length, 1);
  assert.equal(L().pen[0].end, 90000 + 120000);
  assert.ok(!COLS.some(c => L().ice[c] === "p1LK"), "vyloučená hráčka není na ledě");
  assert.equal(L().ice.PK, null, "pozice PK se v oslabení nehraje");
  assert.equal(E.skCount(L()), 4);
});

test("procExp: po uplynutí trestu se hráčka vrací a hraje se opět 5 na 5", () => {
  at(90000);
  E.act("Trest", (L2, n, ids, now) => E.addPen(L2, {t: "us", p: "p1LK", min: 2}, now, n));
  const back = E.procExp(L(), 210000);
  assert.deepEqual(back, ["p1LK"]);
  assert.equal(L().pen.length, 0);
  assert.equal(E.sk(L(), "us", 210000), 5);
});

test("goalPen: gól soupeře v přesilovce ukončí náš menší trest", () => {
  at(90000);
  E.act("Trest", (L2, n, ids, now) => E.addPen(L2, {t: "us", p: "p1LK", min: 2}, now, n));
  const p = E.goalPen(L(), "opp", 100000);
  assert.equal(p, "p1LK");
  assert.equal(L().pen.length, 0);
});

test("schedule: najednou se odpykávají nejvýš 2 tresty týmu (min. 3 bruslařky)", () => {
  at(10000);
  E.act("Tresty", (L2, n, ids, now) => {
    E.addPen(L2, {t: "us", p: "p1LK", min: 2}, now, n);
    E.addPen(L2, {t: "us", p: "p1C", min: 2}, now, n);
    E.addPen(L2, {t: "us", p: "p1PK", min: 2}, now, n);
  });
  assert.equal(E.sk(L(), "us", 10000), 3);
  assert.equal(L().pen.filter(x => x.end != null).length, 2);
  assert.equal(L().pen.filter(x => x.end == null).length, 1, "třetí trest čeká");
});

// ===== Konec třetiny =====
test("periodEndPlan: po 1. třetině další třetina, po 3. při nerozhodném stavu prodloužení", () => {
  const m = S.ma[0];
  assert.equal(E.periodEndPlan(m), "next");
  m.live.per = 3;
  assert.equal(E.periodEndPlan(m), "ot");
  m.events = [{k: "G", team: "us"}];
  assert.equal(E.periodEndPlan(m), "end");
});

// ===== Časová osa =====
test("timeline: obsahuje začátek zápasu a střídání se správným časem", () => {
  at(45000); E.doSub("p2C", "C");
  const tl = timeline(S.ma[0]);
  assert.equal(tl[0].kind, "start");
  const sub = tl.find(x => x.kind === "sub");
  assert.ok(sub, "střídání je v průběhu");
  assert.equal(sub.el, "00:45");
});
