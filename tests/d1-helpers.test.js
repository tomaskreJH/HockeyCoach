// Testy společných pomůcek z úklidu D1: confirm2 / armed (core/actions.js), csv (core/utils.js),
// pn / nm (core/selectors.js) a přetahování makeDrag (core/drag.js).
// Struktura: Importy -> Pomocné funkce -> Testy.

// ===== Importy =====
import {test, mock} from "node:test";
import assert from "node:assert/strict";
import {S} from "../src/core/state.js";
import {CONFIRM_MS, armed, confirm2} from "../src/core/actions.js";
import {csv} from "../src/core/utils.js";
import {nm, pn} from "../src/core/selectors.js";
import {makeDrag} from "../src/core/drag.js";

// ===== Pomocné funkce =====
// Zástupce prvku DOM se seznamem posluchačů, třídami a vyhledáním předka podle selektoru
function node(dataset, matches = []) {
  const cls = new Set(), ls = {};
  return {dataset, ls, style: {}, onclick: null, textContent: "",
    classList: {add: (...c) => c.forEach(x => cls.add(x)), remove: (...c) => c.forEach(x => cls.delete(x)), contains: c => cls.has(c)},
    addEventListener: (t, f) => { ls[t] = f; }, closest(sel) { return matches.includes(sel) ? this : null; }, remove() {}};
}

// ===== confirm2 =====
test("confirm2: první klepnutí označí a překreslí, druhé provede; vlastní překreslení", () => {
  mock.timers.enable({apis: ["setTimeout"]});
  try {
    S.cf = null;
    let done = 0, draws = 0;
    const redraw = () => { draws++; };
    confirm2("k1", () => { done++; }, redraw);
    assert.equal(armed("k1"), true);
    assert.equal(done, 0);
    assert.equal(draws, 1);
    confirm2("k1", () => { done++; }, redraw);
    assert.equal(done, 1);
    assert.equal(armed("k1"), false);
    mock.timers.tick(CONFIRM_MS);
    assert.equal(draws, 1, "po provedení časovač nepřekresluje");
    // jiný klíč přebije označení; po 4 s se označení zruší a překreslí
    confirm2("a", () => {}, redraw);
    confirm2("b", () => {}, redraw);
    assert.equal(armed("a"), false);
    assert.equal(armed("b"), true);
    mock.timers.tick(CONFIRM_MS);
    assert.equal(S.cf, null);
    assert.equal(CONFIRM_MS, 4000);
  } finally { mock.timers.reset(); S.cf = null; }
});

// ===== csv =====
test("csv: středník, uvozovky, BOM, CRLF, prázdné hodnoty", () => {
  const t = csv([["a", "b;c"], ["x\"y", null], [undefined, 0, 1.5, "ř\nn"]]);
  assert.equal(t, "﻿\"a\";\"b;c\"\r\n\"x\"\"y\";\"\"\r\n\"\";\"0\";\"1.5\";\"ř\nn\"");
  assert.equal(csv([]), "﻿");
});

// ===== pn / nm =====
test("pn a nm: hráčka s číslem, značka zranění jen v HTML, člen týmu a náhradní text", () => {
  S.pl = [{id: "p1", name: "Ája <b>", num: "7", st: "inj"}, {id: "p2", name: "Bára", st: "end"}];
  S.tr = [{id: "t1", name: "Pepa & syn"}];
  assert.equal(pn("p1"), "#7 Ája &lt;b&gt; 🤕");
  assert.equal(pn("p2"), "Bára ⛔");
  assert.equal(pn("x"), "?");
  assert.equal(pn("t1"), "?", "bez volby staff se člen týmu nehledá");
  assert.equal(pn("t1", {staff: true, fb: ""}), "🎓 Pepa &amp; syn");
  assert.equal(pn("", {staff: true, fb: ""}), "");
  assert.equal(nm("p1"), "#7 Ája <b>");
  assert.equal(nm("x"), "?");
  assert.equal(nm("t1", {staff: true, fb: "t1"}), "Pepa & syn");
  assert.equal(nm("zz", {staff: true, fb: "zz"}), "zz");
  assert.deepEqual(["p1", "p2"].map(nm), ["#7 Ája <b>", "Bára"], "funguje i v .map (index jako druhý argument)");
});

// ===== makeDrag =====
test("makeDrag: tažení myší → drop na cíl, klepnutí hned po puštění se ignoruje, start null tažení nezačne", () => {
  mock.timers.enable({apis: ["setTimeout"]});
  const doc = globalThis.document, saved = {add: doc.addEventListener, rem: doc.removeEventListener, efp: doc.elementFromPoint};
  const dl = {};
  doc.addEventListener = (t, f) => { dl[t] = f; };
  doc.removeEventListener = t => { delete dl[t]; };
  try {
    const src = node({q: "p1"}), empty = node({q: ""}), tgt = node({ice: "C"}, ["[data-ice]"]);
    doc.elementFromPoint = () => tgt;
    const root = {querySelectorAll: () => []};
    const drops = [], taps = [];
    makeDrag(root, [src, empty], {target: "[data-ice]",
      start: b => (b.dataset.q ? {data: b.dataset.q, text: "P"} : null),
      drop: (d, b) => drops.push([d, b.dataset.ice]),
      click: b => (b.dataset.q ? () => taps.push(b.dataset.q) : null)});
    assert.equal(empty.onclick, null, "prvek bez obsluhy klepnutí si nechá původní onclick");
    // tažení myší o víc než 6 px a puštění nad cílem
    src.ls.mousedown({button: 0, clientX: 0, clientY: 0});
    dl.mousemove({clientX: 20, clientY: 0});
    assert.ok(src.classList.contains("dg"));
    assert.ok(tgt.classList.contains("ov"));
    dl.mouseup({clientX: 20, clientY: 0});
    assert.deepEqual(drops, [["p1", "C"]]);
    src.onclick();
    assert.deepEqual(taps, [], "klepnutí do 450 ms po puštění se ignoruje");
    mock.timers.tick(450);
    src.onclick();
    assert.deepEqual(taps, ["p1"]);
    // z prázdného prvku tažení nezačne
    empty.ls.mousedown({button: 0, clientX: 0, clientY: 0});
    dl.mousemove({clientX: 30, clientY: 0});
    dl.mouseup({clientX: 30, clientY: 0});
    assert.equal(drops.length, 1);
    // pravé tlačítko myši se ignoruje
    src.ls.mousedown({button: 2, clientX: 0, clientY: 0});
    assert.equal(dl.mousemove, undefined);
  } finally {
    doc.addEventListener = saved.add; doc.removeEventListener = saved.rem; doc.elementFromPoint = saved.efp;
    mock.timers.reset();
  }
});
