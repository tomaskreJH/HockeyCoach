// Testy v22.37: ⚪ buly a ⏸ přerušení hry – zápis v živém zápisu (domain/live-engine.js: doFaceoff, doStop),
// souhrn zápasu a sezóny (domain/game-flow.js), časová osa (domain/timeline.js), 📤 souhrn ke sdílení (domain/match-share.js).
// Struktura: Importy -> Příprava -> Testy.

// ===== Importy =====
import {test, beforeEach} from "node:test";
import assert from "node:assert/strict";
import {fakeDb} from "./support/fake-db.mjs";
import {S} from "../src/core/state.js";
import * as E from "../src/domain/live-engine.js";
import {flowStats, flowTotals} from "../src/domain/game-flow.js";
import {matchSummary} from "../src/domain/match-share.js";
import {timeline} from "../src/domain/timeline.js";

// ===== Příprava: jedna pětka a brankářka, čas zápasu se posouvá polem live.acc =====
const COLS = ["LK", "C", "PK", "LO", "PO"];
function setup() {
  S.pl = [{id: "g1", name: "G", pos: "Brankářka"}];
  const lu = {G1: "g1"};
  COLS.forEach(c => { const id = "p1" + c; S.pl.push({id, name: id, pos: /O$/.test(c) ? "Obránkyně" : "Útočnice"}); lu["1" + c] = id; });
  const m = {id: "m1", date: "2026-10-20", opp: "Soupeř", home: true, lineup: lu};
  m.live = E.initLive(m);
  S.ma = [m]; S.mid = "m1"; S.db = fakeDb();
}
const M = () => S.ma[0];
// Zastavení běžícího času na zadaném čase zápasu (ms) – přes ⏸ Přerušit
const stopAt = ms => { M().live.t0 = Date.now() - (ms - M().live.acc); E.doStop(); };

beforeEach(setup);

// ===== Testy =====
test("▶ Buly spustí čas a zapíše vítěze, ⏸ Přerušit zastaví čas a zapíše přerušení", () => {
  E.doFaceoff("us");
  assert.equal(M().live.running, true);
  assert.deepEqual(M().log.map(x => [x.ty, x.team, x.per, x.at]), [["fo", "us", 1, 0]]);
  stopAt(30000);
  assert.equal(M().live.running, false);
  assert.ok(Math.abs(M().live.acc - 30000) < 50);
  assert.equal(M().log[1].ty, "stop");
  E.doFaceoff("opp");
  assert.deepEqual(flowStats(M()), {us: 1, opp: 1, n: 2, pct: 50, stops: 1, per: {1: {us: 1, opp: 1, stops: 1}}, any: true});
});

test("Buly při běžícím čase ani přerušení při stojícím nic nezapíší", () => {
  E.doStop();
  assert.equal((M().log || []).length, 0);
  E.doFaceoff("us");
  E.doFaceoff("opp");
  assert.equal(M().log.length, 1);
});

test("↩ Zpět po buly smaže jen záznam buly, čas běží dál", () => {
  E.doFaceoff("opp");
  assert.equal(M().live.u.slice(-1)[0].t, "Buly: soupeř");
  E.doUndo();
  assert.equal(M().live.running, true);
  assert.equal((M().log || []).filter(x => x.ty === "fo").length, 0);
});

test("Časová osa: přerušení před gólem v přerušení, buly až po něm; flow:false je vynechá", () => {
  E.doFaceoff("us");
  stopAt(60000);
  const m = M();
  m.events = [{id: "g", k: "G", team: "us", per: 1, time: "01:00", at: m.live.acc, scorer: "p1C"}];
  E.doFaceoff("us");
  const k = timeline(M(), {subs: false}).map(x => x.kind);   // M() = nová kopie zápasu po zápisu (upd)
  assert.deepEqual(k, ["fo", "stop", "G", "fo"]);
  assert.deepEqual(timeline(M(), {subs: false, flow: false}).map(x => x.kind), ["G"]);
});

test("Buly na začátku další třetiny je až za koncem předchozí a nese svou třetinu", () => {
  const m = {date: "2026-10-20", perLen: 20, live: {ps: [1200000]}, log: [{ty: "per", per: 1, at: 1200000}, {ty: "fo", team: "opp", per: 2, at: 1200000}]};
  const tl = timeline(m, {subs: false});
  assert.deepEqual(tl.map(x => [x.kind, x.per, x.el]), [["per", 1, "20:00"], ["fo", 2, "00:00"]]);
});

test("flowTotals: jen zápasy se zapsanými buly, procenta a průměr přerušení", () => {
  const fo = (team, per) => ({ty: "fo", team, per, at: 0}), st = {ty: "stop", per: 1, at: 0};
  const a = {log: [fo("us", 1), fo("us", 2), fo("opp", 2), st, st]}, b = {log: [fo("opp", 1), st, st, st, st]}, c = {log: [{ty: "per", per: 1}]};
  assert.deepEqual(flowTotals([a, b, c]), {us: 2, opp: 2, n: 4, stops: 6, games: 2, pct: 50, avgStops: 3});
  assert.deepEqual(flowTotals([c]), {us: 0, opp: 0, n: 0, stops: 0, games: 0, pct: null, avgStops: null});
});

test("📤 souhrn: buly jen při zapsaných buly, venku v pořadí domácí:hosté", () => {
  const m = {date: "2026-10-20", opp: "Soupeř", home: false, events: [], log: [{ty: "fo", team: "us", per: 1}, {ty: "fo", team: "us", per: 1}, {ty: "fo", team: "opp", per: 1}]};
  assert.ok(matchSummary(m, {team: "Tým"}).includes("⚪ Buly 1:2"));
  assert.ok(!matchSummary({...m, log: []}, {team: "Tým"}).includes("Buly"));
});
