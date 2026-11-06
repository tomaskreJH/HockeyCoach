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

test("lineupCardHtml: hlavička, pětky, brankářka a náhradnice; neuzavřená sestava nic neukáže", () => {
  team();
  const h = lineupCardHtml(match({home: true, date: "2026-11-08", time: "18:00"}));
  assert.match(h, /SESTAVA/);
  assert.match(h, /HC Střely – Soupeř/, "doma: náš tým první");
  assert.match(h, /1\. pětka/);
  assert.match(h, /<b class="lun">7<\/b>[^]*?Alena/, "hráčka s číslem v 1. pětce");
  assert.match(h, /Bára/);
  assert.match(h, /Brankářky[^]*Gita/);
  assert.match(h, /Náhradnice[^]*Nela/, "nominovaná mimo sestavu je náhradnice");
  assert.match(lineupCardHtml(match({home: false})), /Soupeř – HC Střely/, "venku: soupeř první");
  assert.equal(lineupCardHtml(match({luOk: false})), "");
  assert.equal(lineupCardHtml(match({lineup: {}})), "");
});

test("lineupCardHtml: přihlášená hráčka je označená TY a nahoře je, kde hraje", () => {
  team();
  const h = lineupCardHtml(match(), "a1");
  assert.equal((h.match(/class="luc me"/g) || []).length, 1, "zvýrazněná jen jedna dlaždice");
  assert.match(h, /lut2">TY</);
  assert.match(h, /Hraješ: 1\. pětka · C/);
  assert.match(lineupCardHtml(match(), "g1"), /Jsi v brance/);
  assert.match(lineupCardHtml(match(), "n1"), /Jsi mezi náhradnicemi/);
  assert.doesNotMatch(lineupCardHtml(match(), "x9"), /class="luc me"|class="lume"/, "nenominovaná hráčka nic zvýrazněné nemá");
  assert.doesNotMatch(lineupCardHtml(match()), /class="luc me"/, "bez přihlášené hráčky se nic nezvýrazní");
});

test("lineupCardHtml: střídající se hráčky na jednom místě pod sebou a jednotka přesilovky", () => {
  team();
  const h = lineupCardHtml(match({lineup: {G1: "g1", "1C": "a1", "1C+": "n1", "1LO": "b1"}, sp: {PP1: {C: "a1"}}}), "n1");
  assert.match(h, /Alena[^]*Nela/, "obě hráčky v jednom místě");
  assert.equal((h.match(/class="luc me"/g) || []).length, 1);
  assert.match(h, /Přesilovka 1: [^<]*C Alena/);
});
