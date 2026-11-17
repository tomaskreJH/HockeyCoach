// Testy 📚 Cvičení pro hráčky (v22.59, src/domain/drill-prep.js): výběr nejbližších tréninků, sloučení cvičení z plánů, hledání.
import test from "node:test";
import assert from "node:assert/strict";
import {prepDrills, prepEvents, prepFilter} from "../src/domain/drill-prep.js";

const T = "2026-11-17";
const ev = (id, date, extra) => ({id, date, type: "training", ...(extra || {})});
const lane = (drill, dn, extra) => ({id: "l" + drill, drill, dn, di: [], co: [], grp: [], ...(extra || {})});
const plan = (...lanes) => ({blocks: [{id: "b", mode: "all", dur: 10, lanes}]});

test("prepEvents: budoucí vzestupně, uplynulé od nejnovějšího, bez zápasů a zrušených, s limity", () => {
  const E = [
    ev("a", "2026-11-18"), ev("b", "2026-11-20"), ev("c", "2026-11-17"), ev("m", "2026-11-19", {type: "match"}),
    ev("x", "2026-11-21", {cancelled: {by: "t", at: "", reason: ""}}), ev("p1", "2026-11-10"), ev("p2", "2026-11-12"), ev("p3", "2026-11-01")
  ];
  assert.deepEqual(prepEvents(E, T, 2, 2).map(e => e.id), ["c", "a", "p2", "p1"]);
  assert.deepEqual(prepEvents(E, T).map(e => e.id), ["c", "a", "b", "p2", "p1", "p3"]);
  assert.deepEqual(prepEvents(null, T), []);
});

test("prepDrills: sloučení podle id, budoucí cvičení první, podrobnosti a obrázky z nejbližšího plánu", () => {
  const evs = [ev("f1", "2026-11-18"), ev("f2", "2026-11-25"), ev("p1", "2026-11-10")];
  const P = {
    f1: plan(lane("d1", "Bruslení", {di: ["i1"], dx: {eq: "kužely", desc: "Osmičky"}})),
    f2: plan(lane("d1", "Bruslení", {dx: {desc: "Starší"}}), lane("d2", "Střelba")),
    p1: plan(lane("d3", "Přihrávky", {dx: {desc: "Ve dvojicích"}}), lane("d2", "Střelba", {dx: {desc: "Z první"}}))
  };
  const R = prepDrills(evs, P, T);
  assert.deepEqual(R.map(r => r.id), ["d1", "d2", "d3"], "d1 příště 18. 11., d2 příště 25. 11., d3 jen uplynulé");
  assert.equal(R[0].next, "2026-11-18");
  assert.equal(R[0].n, 2);
  assert.deepEqual(R[0].img, ["i1"]);
  assert.equal(R[0].dx.desc, "Osmičky", "podrobnosti z nejbližšího tréninku");
  assert.equal(R[1].dx.desc, "Z první", "chybí v budoucím plánu → z uplynulého");
  assert.equal(R[1].last, "2026-11-10");
  assert.equal(R[2].next, null);
  assert.equal(R[2].last, "2026-11-10");
});

test("prepDrills: řada cvičení, volné cvičení bez id podle názvu, prázdné a chybějící plány se přeskočí", () => {
  const evs = [ev("a", "2026-11-17"), ev("b", "2026-11-20"), ev("c", "2026-11-21")];
  const P = {
    a: plan(lane("d1", "Rozcvička", {seq: [{id: "s1", drill: "d1", dn: "Rozcvička", di: [], dur: 5}, {id: "s2", drill: "d9", dn: "Hra", di: [], dur: 8, dx: {desc: "Na konci"}}]}), lane("", "Improvizace"), lane("", "")),
    b: null
  };
  const R = prepDrills(evs, P, T);
  assert.deepEqual(R.map(r => r.name).sort((x, y) => x.localeCompare(y, "cs")), ["Hra", "Improvizace", "Rozcvička"]);
  assert.equal(R.find(r => r.id === "d9").dx.desc, "Na konci");
  assert.equal(R.find(r => r.id === "d1").n, 1, "řada a linka ve stejném tréninku = jeden trénink");
  assert.deepEqual(prepDrills([], {}, T), []);
  assert.deepEqual(prepDrills(evs, undefined, T), []);
});

test("prepFilter: název, pomůcky i popis, bez diakritiky a velikosti písmen", () => {
  const L = [{name: "Bruslení", dx: {eq: "Kužely"}}, {name: "Střelba", dx: {desc: "Z první"}}, {name: "Hra"}];
  assert.deepEqual(prepFilter(L, "brusleni").map(r => r.name), ["Bruslení"]);
  assert.deepEqual(prepFilter(L, "KUZELY").map(r => r.name), ["Bruslení"]);
  assert.deepEqual(prepFilter(L, "z prvni").map(r => r.name), ["Střelba"]);
  assert.equal(prepFilter(L, "  ").length, 3);
  assert.deepEqual(prepFilter(null, "x"), []);
});
