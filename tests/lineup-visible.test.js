// Testy zveřejnění sestavy hráčkám (v22.54): domain/lineup.js – lineupVisible, views/lineup-card.js – lineupTag, lineupCardHtml.
// Hlídají: sestava se ukáže jen uzavřená, neprázdná a u nezrušeného zápasu; značka jen u neodehraného zápasu; karta obsahuje pětky, brankářky a náhradnice.
// Struktura: Importy -> Data -> Testy.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {S} from "../src/core/state.js";
import {lineupVisible} from "../src/domain/lineup.js";
import {lineupCardHtml, lineupTag} from "../src/views/lineup-card.js";

// ===== Data =====
const team = () => {
  S.pl = [{id: "g1", name: "Gita", pos: "Brankářka"}, {id: "a1", name: "Alena", pos: "Útočnice", num: "7"}, {id: "b1", name: "Bára", pos: "Obránkyně"}, {id: "n1", name: "Nela", pos: "Útočnice"}];
};
const match = (x = {}) => ({id: "m1", opp: "Soupeř", nom: ["g1", "a1", "b1", "n1"], lineup: {G1: "g1", "1C": "a1", "1LO": "b1"}, luOk: true, ...x});

// ===== Testy =====
test("lineupVisible: jen uzavřená neprázdná sestava nezrušeného zápasu", () => {
  assert.equal(lineupVisible(match()), true);
  assert.equal(lineupVisible(match({luOk: false})), false, "neuzavřená sestava je rozpracovaná");
  assert.equal(lineupVisible(match({luOk: undefined})), false);
  assert.equal(lineupVisible(match({lineup: {}})), false, "prázdná sestava");
  assert.equal(lineupVisible(match({cancelled: {by: "x@y.cz", at: "2026-11-06", reason: ""}})), false, "zrušený zápas");
  assert.equal(lineupVisible(null), false);
  assert.equal(lineupVisible(undefined), false);
});

test("lineupTag: značka jen u neodehraného zápasu s uzavřenou sestavou", () => {
  assert.match(lineupTag(match()), /Sestava k dispozici/);
  assert.equal(lineupTag(match({luOk: false})), "");
  assert.equal(lineupTag(match({closed: true})), "", "odehraný zápas značku nemá");
  assert.equal(lineupTag(null), "");
});

test("lineupCardHtml: pětky, brankářka a náhradnice; neuzavřená sestava nic neukáže", () => {
  team();
  const h = lineupCardHtml(match());
  assert.match(h, /Sestava zápasu/);
  assert.match(h, /#7 Alena/, "hráčka s číslem v 1. pětce");
  assert.match(h, /Bára/);
  assert.match(h, /<b>Brankářky:<\/b> Gita/);
  assert.match(h, /<b>Náhradnice:<\/b> Nela/, "nominovaná mimo sestavu je náhradnice");
  assert.equal(lineupCardHtml(match({luOk: false})), "");
  assert.equal(lineupCardHtml(match({lineup: {}})), "");
});

test("lineupCardHtml: střídající se hráčky na jednom místě oddělené ⇄ a jednotka přesilovky", () => {
  team();
  const h = lineupCardHtml(match({lineup: {G1: "g1", "1C": "a1", "1C+": "n1", "1LO": "b1"}, sp: {PP1: {C: "a1"}}}));
  assert.match(h, /#7 Alena ⇄ Nela/);
  assert.match(h, /Přesilovka 1: [^<]*C #7 Alena/);
});
