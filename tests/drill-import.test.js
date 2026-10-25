// Testy hromadného přidání cvičení (src/domain/drill-import.js) a základní sady (src/config/drill-starter.js): platnost sady,
// duplicity podle názvu, čtení CSV (oddělovače, uvozovky, BOM, víc řádků v buňce), převod popisků na klíče číselníků, chyby řádků, vzor.
import test from "node:test";
import assert from "node:assert/strict";
import {CATS, GROUPS, SKILLS} from "../src/config/skills.js";
import {DRILL_STARTER} from "../src/config/drill-starter.js";
import {DRILL_MAX, drillError} from "../src/domain/drills.js";
import {CSV_HEAD, IMPORT_MAX, csvDrills, csvHeader, csvRows, csvSample, dictKey, importPick, nameKey, rowDrill, starterItems, whoOf} from "../src/domain/drill-import.js";
import {csv} from "../src/core/utils.js";

// ===== Základní sada =====
test("základní sada: všechna cvičení projdou kontrolou formuláře, názvy jsou jedinečné a v mezích", () => {
  assert.ok(DRILL_STARTER.length >= 35);
  DRILL_STARTER.forEach(d => {
    assert.equal(drillError(d), null, d.name);
    assert.ok(d.name.length <= DRILL_MAX.name && (d.desc || "").length <= DRILL_MAX.desc, d.name);
    assert.ok(CATS[d.cat] && d.sk.every(k => SKILLS[k]) && d.grp.every(k => GROUPS[k]), d.name);
  });
  assert.equal(new Set(DRILL_STARTER.map(d => nameKey(d.name))).size, DRILL_STARTER.length, "bez duplicit");
});
test("základní sada: hráčky i brankářky, všechny kategorie a dovednosti zastoupené", () => {
  const it = starterItems([]);
  assert.ok(it.filter(x => x.who === "gk").length >= 8);
  assert.ok(it.filter(x => x.who === "pl").length >= 25);
  Object.keys(CATS).forEach(c => assert.ok(it.some(x => x.d.cat === c), c));
  Object.keys(SKILLS).forEach(k => assert.ok(it.some(x => x.d.sk.includes(k)), k));
  assert.ok(it.every(x => x.err === null && x.dup === false));
});
test("starterItems: cvičení se stejným názvem v bance (i jinak psaným) je dup", () => {
  const it = starterItems([{name: "  NÁJEZDY "}, {name: "Osmicky s pukem kolem kruhu", arch: true}]);
  assert.equal(it.filter(x => x.dup).length, 2);
  assert.ok(it.find(x => x.d.name === "Nájezdy").dup);
});
test("whoOf: brankářky jen se skupinou i dovedností brankářek", () => {
  assert.equal(whoOf({grp: ["gk"], sk: ["gk"]}), "gk");
  assert.equal(whoOf({grp: ["gk", "st"], sk: ["gk", "pass"]}), "gk");
  assert.equal(whoOf({grp: ["all"], sk: ["gk"]}), "pl");
  assert.equal(whoOf({grp: ["gk"], sk: ["shot"]}), "pl");
});

// ===== Čtení CSV =====
test("csvRows: středník, uvozovky, zdvojené uvozovky, nový řádek v buňce, BOM a CRLF", () => {
  const t = String.fromCharCode(0xfeff) + 'A;B\r\n"x;y";"řekl ""ahoj""\ndruhý"\r\n\r\nz;\n';
  assert.deepEqual(csvRows(t), [["A", "B"], ["x;y", 'řekl "ahoj"\ndruhý'], ["z", ""]]);
});
test("csvRows: oddělovač čárka nebo tabulátor podle hlavičky", () => {
  assert.deepEqual(csvRows("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(csvRows("a\tb\n1\t2"), [["a", "b"], ["1", "2"]]);
  assert.deepEqual(csvRows(""), []);
});
test("csvHeader: názvy sloupců bez diakritiky a s jednotkou, neznámé se přeskočí", () => {
  assert.deepEqual(csvHeader(["Název", "Délka (min)", "Kategorie", "Poznámka", "Dovednosti", "Měření"]), {name: 0, dur: 1, cat: 2, sk: 4, meas: 5});
  assert.deepEqual(csvHeader(CSV_HEAD), {name: 0, cat: 1, sk: 2, lvl: 3, dur: 4, grp: 5, eq: 6, desc: 7, url: 8, pdf: 9, meas: 10});
});
test("dictKey: klíč, popisek bez ikony, začátek popisku, jinak null", () => {
  assert.equal(dictKey("shot", SKILLS), "shot");
  assert.equal(dictKey("Střelba", SKILLS), "shot");
  assert.equal(dictKey("strelba", SKILLS), "shot");
  assert.equal(dictKey("Přesilovka / oslabení", SKILLS), "ppsh");
  assert.equal(dictKey("brus", SKILLS), "skate");
  assert.equal(dictKey("st", SKILLS), null, "krátký začátek se nehádá");
  assert.equal(dictKey("Hra v malém prostoru", CATS), "ssg");
  assert.equal(dictKey("", CATS), null);
});

// ===== Převod řádku =====
test("rowDrill: popisky → klíče, výchozí hodnoty, měření", () => {
  const cols = csvHeader(CSV_HEAD);
  const {d, err} = rowDrill(["Střelba z kruhu", "", "Střelba, Ovládání puku", "Náročné", "12", "Stanoviště + Brankářky", "puky", "Popis", "https://x.cz/v", "", "čas"], cols);
  assert.equal(err, null);
  assert.deepEqual([d.cat, d.sk, d.lvl, d.dur, d.grp, d.eq, d.url, d.meas], ["skill", ["puck", "shot"], 3, 12, ["st", "gk"], "puky", "https://x.cz/v", {u: "s", low: true}]);
  const b = rowDrill(["Jen název", "", "bruslení", "", "", "", "", "", "", "", ""], cols);
  assert.equal(b.err, null);
  assert.deepEqual([b.d.lvl, b.d.dur, b.d.grp, b.d.meas], [1, 10, ["all"], null]);
  assert.deepEqual(rowDrill(["X", "", "střelba", "2", "8", "", "", "", "", "", "počet"], cols).d.meas, {u: "ks", low: false});
});
test("rowDrill: chyby řádku s přesnou hláškou", () => {
  const cols = csvHeader(CSV_HEAD), row = over => { const r = ["Cvičení", "Dovednosti", "Střelba", "1", "10", "", "", "", "", "", ""]; Object.entries(over).forEach(([i, v]) => { r[i] = v; }); return rowDrill(r, cols).err; };
  assert.match(row({1: "Blbost"}), /Neznámá kategorie/);
  assert.match(row({2: "Střelba, létání"}), /Neznámá dovednost „létání“/);
  assert.match(row({5: "Rodiče"}), /Neznámá skupina/);
  assert.match(row({3: "9"}), /Neznámá úroveň/);
  assert.match(row({10: "rychlost"}), /Neznámé měření/);
  assert.match(row({4: "90"}), /Délka musí být/);
  assert.match(row({2: ""}), /aspoň jednu dovednost/);
  assert.match(row({0: ""}), /Zadej název/);
  assert.match(row({8: "www.x.cz"}), /Odkaz na video/);
});
test("csvDrills: chyby souboru, duplicity s bankou i v souboru, číslo řádku", () => {
  assert.match(csvDrills("Název;Dovednosti", []).err, /hlavičku/);
  assert.match(csvDrills("Popis;Dovednosti\nx;střelba", []).err, /Název/);
  const big = "Název;Dovednosti\n" + Array.from({length: IMPORT_MAX + 1}, (_, i) => "C" + i + ";střelba").join("\n");
  assert.match(csvDrills(big, []).err, /nejvýš/);
  const r = csvDrills("Název;Dovednosti\nNájezdy;střelba\nNové;bruslení\nnové;bruslení\nBez;\n", [{name: "nájezdy"}]);
  assert.equal(r.err, null);
  assert.deepEqual(r.items.map(x => [x.d.name, x.dup, !!x.err, x.line]), [["Nájezdy", true, false, 2], ["Nové", false, false, 3], ["nové", true, false, 4], ["Bez", false, true, 5]]);
});
test("importPick: jen vybrané a bez chyby", () => {
  assert.deepEqual(importPick([{on: true, err: null, n: 1}, {on: false, err: null, n: 2}, {on: true, err: "x", n: 3}]).map(x => x.n), [1]);
  assert.deepEqual(importPick(null), []);
});
test("vzor CSV: projde vlastním importem bez chyby (i přes csv() s BOM)", () => {
  const r = csvDrills(csv(csvSample()), []);
  assert.equal(r.err, null);
  assert.equal(r.items.length, 2);
  assert.ok(r.items.every(x => x.err === null));
  assert.equal(r.items[1].who, "gk");
  assert.deepEqual(r.items[0].d.meas, {u: "ks", low: false});
});
