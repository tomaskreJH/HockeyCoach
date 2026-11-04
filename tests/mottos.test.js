// Testy banky mott a pokřiků (domain/mottos.js) a jejích pravidel databáze. Čisté funkce bez DOM.
// Struktura: Importy -> Kontrola -> Výběr -> Pravidla.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MOTTO_MAX, MOTTO_PER, mineMottos, mottoBy, mottoCheck, mottoTag, orderMottos, isCaptain, mottoDoc, packStickers, pickMotto, shownMottos} from "../src/domain/mottos.js";

// ===== Kontrola =====
test("mottoCheck: prázdné ne, příliš dlouhé ne, víc než 5 ne, mezery se slijí", () => {
  assert.equal(mottoCheck("  ", 0).ok, false);
  assert.equal(mottoCheck("x".repeat(MOTTO_MAX + 1), 0).ok, false);
  assert.equal(mottoCheck("ahoj", MOTTO_PER).ok, false);
  assert.deepEqual(mottoCheck("  Holky   jedeeem ", 2), {ok: true, t: "Holky jedeeem"});
});
test("mottoDoc: jen pole t, mid, by, at; e-mail malými písmeny", () => {
  assert.deepEqual(mottoDoc("Střely, čo", "p1", "A@X.cz", "T"), {t: "Střely, čo", mid: "p1", by: "a@x.cz", at: "T"});
});

// ===== Výběr =====
const L = [{id: "1", t: "A", mid: "p1", at: "2"}, {id: "2", t: "B", mid: "p2", at: "1", off: true}, {id: "3", t: "C", mid: "p1", at: "1"}, {id: "4", t: " ", mid: "p3"}];
test("shownMottos: bez skrytých a prázdných; mineMottos: moje včetně skrytých, nejstarší první", () => {
  assert.deepEqual(shownMottos(L).map(m => m.id), ["1", "3"]);
  assert.deepEqual(mineMottos(L, "p1").map(m => m.id), ["3", "1"]);
  assert.deepEqual(mineMottos(L, ""), []);
});
test("pickMotto: podle náhodného čísla jen z viditelných; prázdná banka = null", () => {
  assert.equal(pickMotto(L, () => 0).id, "1");
  assert.equal(pickMotto(L, () => 0.99).id, "3");
  assert.equal(pickMotto([], () => 0.5), null);
  assert.equal(pickMotto(null), null);
});
test("mottoBy: jméno hráčky nebo člena týmu, jinak prázdné", () => {
  assert.equal(mottoBy({mid: "p1"}, [{id: "p1", name: "Majda"}], []), "Majda");
  assert.equal(mottoBy({mid: "t1"}, [], [{id: "t1", name: "Trenér"}]), "Trenér");
  assert.equal(mottoBy({mid: "x"}, [], []), "");
});

// ===== Pravidla =====
test("pravidla mottos: čtou členové týmu, zakládá vlastník nebo manager, trenér jen skrývá, nejvýš 80 znaků", () => {
  const r = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const blk = r.slice(r.indexOf("match /mottos/{id}"), r.indexOf("// ===== Pokladna: předpisy"));
  assert.match(blk, /allow read: if isTeam\(\);/);
  assert.match(blk, /allow create: if isTeam\(\) && mottoOk\(request\.resource\.data\) && \(isMgr\(\) \|\| ownsMid\(request\.resource\.data\.mid\)\)/);
  assert.match(blk, /isStaff\(\) && chKeys\(\)\.hasOnly\(\['off'\]\)/);
  assert.match(r, /function mottoOk[\s\S]*hasOnly\(\['t', 'mid', 'by', 'at'\]\)[\s\S]*d\.t\.size\(\) <= 80/);
});
test("mottoTag: #číslo hráčky, bez čísla jméno, neznámý autor prázdné", () => {
  assert.equal(mottoTag({mid: "p1"}, [{id: "p1", name: "Majda", num: "9"}], []), "#9");
  assert.equal(mottoTag({mid: "p1"}, [{id: "p1", name: "Majda", num: ""}], []), "Majda");
  assert.equal(mottoTag({mid: "t1"}, [], [{id: "t1", name: "Trenér"}]), "Trenér");
  assert.equal(mottoTag({mid: "x"}, [], []), "");
});
test("orderMottos: nejnovější motto kapitánky první, ostatní po kolech podle autorek; skrytá se nepočítají", () => {
  const pl = [{id: "p1", cap: true}, {id: "p2"}, {id: "p3"}];
  const l = [{id: "a", t: "A", mid: "p1", at: "1"}, {id: "b", t: "B", mid: "p1", at: "3"}, {id: "c", t: "C", mid: "p2", at: "2"}, {id: "d", t: "D", mid: "p3", at: "2", off: true}, {id: "e", t: "E", mid: "p3", at: "0"}];
  const rank = key => ({"r0:p3": 0.1, "r0:p2": 0.5, "r0:p1": 0.9}[key]);
  const o = orderMottos(l, pl, rank);
  assert.deepEqual(o.map(x => x.m.id), ["b", "e", "c", "a"]);
  assert.deepEqual(o.map(x => x.cap), [true, false, false, true]);
  assert.deepEqual(orderMottos([], pl), []);
  assert.equal(isCaptain({cap: true}), true);
  assert.equal(isCaptain({}), false);
});
test("orderMottos: spravedlivě – v každém kole nejvýš jedno motto od autorky, kdo má víc mott, nemá větší šanci", () => {
  const pl = [{id: "p1"}, {id: "p2"}, {id: "p3"}];
  const l = [1, 2, 3, 4, 5].map(i => ({id: "m" + i, t: "M" + i, mid: "p1", at: String(i)})).concat([{id: "x", t: "X", mid: "p2", at: "1"}, {id: "y", t: "Y", mid: "p3", at: "1"}]);
  const first = {p1: 0, p2: 0, p3: 0};
  for (let n = 0; n < 300; n++) {
    const cache = {}, rank = k => (cache[k] == null ? (cache[k] = Math.random()) : cache[k]);
    const o = orderMottos(l, pl, rank);
    assert.equal(o.length, 7);
    assert.equal(new Set(o.slice(0, 3).map(x => x.m.mid)).size, 3, "první kolo = každá autorka jednou");
    first[o[0].m.mid]++;
  }
  // Na prvním místě bývá každá autorka zhruba stejně často (u pětinásobku mott by bylo p1 ≈ 5/7 ≈ 214×)
  Object.values(first).forEach(c => assert.ok(c > 50 && c < 150, "první místo je rozdělené spravedlivě: " + JSON.stringify(first)));
});
test("orderMottos: kapitánka je jediná zvýhodněná, další její motta jdou jako ostatní", () => {
  const pl = [{id: "p1", cap: true}, {id: "p2"}];
  const l = [{id: "a", mid: "p1", t: "A", at: "1"}, {id: "b", mid: "p1", t: "B", at: "2"}, {id: "c", mid: "p1", t: "C", at: "3"}, {id: "x", mid: "p2", t: "X", at: "1"}];
  const o = orderMottos(l, pl, k => ({"r0:p1": 0.9, "r0:p2": 0.1}[k]));
  assert.equal(o[0].m.id, "c", "nejnovější motto kapitánky první");
  assert.equal(o[1].m.mid, "p2", "pak je na řadě druhá autorka dřív než další motta kapitánky");
});

// ===== Rozmístění nálepek =====
test("packStickers: vejde se, co se vejde do dvou řádků, pořadí se drží a nejdřív se omezí počet", () => {
  assert.deepEqual(packStickers([100, 100, 100], 220), ["1", "1", "1"]);
  assert.deepEqual(packStickers([200, 200, 200, 200], 220), ["1", "1", "", ""]);
  assert.deepEqual(packStickers([150, 150, 40], 220), ["1", "1", "1"]);
  assert.deepEqual(packStickers([], 220), []);
});
test("packStickers: příliš dlouhá nálepka jen jako první a přes oba řádky, jinak výběr končí (text se nezkracuje)", () => {
  assert.deepEqual(packStickers([300, 50], 220), ["L", ""]);
  assert.deepEqual(packStickers([50, 300, 50], 220), ["1", "", ""]);
});
test("packStickers: bez rozměrů ukáže všechny a ořízne je CSS", () => {
  assert.deepEqual(packStickers([100, 400], 0), ["1", "1"]);
});
