// Testy banky mott a pokřiků (domain/mottos.js) a jejích pravidel databáze. Čisté funkce bez DOM.
// Struktura: Importy -> Kontrola -> Výběr -> Pravidla.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MOTTO_MAX, MOTTO_PER, mineMottos, mottoBy, mottoCheck, mottoTag, orderMottos, isCaptain, mottoDoc, pickMotto, shownMottos} from "../src/domain/mottos.js";

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
test("orderMottos: nejnovější motto kapitánky první, ostatní podle stálého pořadí; skrytá se nepočítají", () => {
  const pl = [{id: "p1", cap: true}, {id: "p2"}, {id: "p3"}];
  const l = [{id: "a", t: "A", mid: "p1", at: "1"}, {id: "b", t: "B", mid: "p1", at: "3"}, {id: "c", t: "C", mid: "p2", at: "2"}, {id: "d", t: "D", mid: "p3", at: "2", off: true}, {id: "e", t: "E", mid: "p3", at: "0"}];
  const rank = id => ({a: 0.9, c: 0.8, e: 0.1}[id]);
  const o = orderMottos(l, pl, rank);
  assert.deepEqual(o.map(x => x.m.id), ["b", "e", "c", "a"]);
  assert.deepEqual(o.map(x => x.cap), [true, false, false, true]);
  assert.deepEqual(orderMottos([], pl), []);
  assert.equal(isCaptain({cap: true}), true);
  assert.equal(isCaptain({}), false);
});
