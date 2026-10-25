// Testy v21.5 K1: „Další volby“ bloku (blockExtras), ✨ Připravit trénink (latestTpl) a pravidla CSS pro šířku telefonu.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {latestTpl} from "../src/domain/plan-reuse.js";
import {GK, blockExtras} from "../src/domain/training-plan.js";

// ===== Pomocné funkce =====
const lane = (grp = [], co = []) => ({id: "l" + Math.random(), drill: "d", dn: "d", di: [], co, grp});

// ===== blockExtras =====
test("blockExtras: základní blok Společně i Stanoviště bez voleb = sbaleno", () => {
  assert.equal(blockExtras({mode: "all", dur: 10, lanes: [lane()]}), false);
  assert.equal(blockExtras({mode: "st", dur: 24, lanes: [lane([1]), lane([2]), lane([GK])]}), false);
  assert.equal(blockExtras(null), false);
});
test("blockExtras: posty, vlastní točení, trenér nebo souběžná linka = otevřeno", () => {
  assert.equal(blockExtras({mode: "st", by: "pos", lanes: [lane(), lane()]}), true);
  assert.equal(blockExtras({mode: "st", rot: 6, lanes: [lane(), lane()]}), true);
  assert.equal(blockExtras({mode: "all", lanes: [lane([], ["s1"])]}), true);
  assert.equal(blockExtras({mode: "all", lanes: [lane(), lane([GK])]}), true);
});

// ===== latestTpl =====
test("latestTpl: naposledy uložená šablona s bloky", () => {
  const b = [{id: "b"}];
  assert.equal(latestTpl([]), null);
  assert.equal(latestTpl([{name: "Prázdná", blocks: [], at: "2026-12-01"}]), null);
  assert.equal(latestTpl([{name: "A", blocks: b, at: "2026-01-01"}, {name: "B", blocks: b, at: "2026-10-20"}, {name: "C", blocks: b}]).name, "B");
});

// ===== CSS: nic nesmí být širší než telefon =====
test("CSS: široké tabulky jen v .tw, pole a položky řádku se smí zúžit", () => {
  const css = readFileSync(new URL("../styles/main.css", import.meta.url), "utf8");
  assert.match(css, /\.tw table \{ min-width: 520px; \}/);
  assert.doesNotMatch(css, /^table \{[^}]*min-width/m);
  assert.match(css, /\.row > \* \{ flex: 1; min-width: 0; \}/);
  assert.match(css, /input, select, textarea \{ max-width: 100%; min-width: 0; \}/);
});
