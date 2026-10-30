// Testy 🏃 štafety ve stopkách (src/domain/relay.js): rozdělení a nasazení do skupin, start naráz, předávky, oprava předávky,
// doběhnutí, pořadí skupin a zápis (úseky = pokusy hráček, běh skupin do seznamu rl). Čisté funkce – nic se nezapisuje.
import test from "node:test";
import assert from "node:assert/strict";
import {RL_MAX, relayDone, relayLine, relayLive, relayPatch, relayRank, relayResize, relayRunLegs, relaySameSet, relaySplit, relayStart, relaySwapPatch, relayTap, relayToggle, relayUndo} from "../src/domain/relay.js";

const T0 = 1_700_000_000_000, M = {key: "b1_l1", d: "d1", dn: "Sprint", u: "s", low: true};

// ===== Skupiny =====
test("relaySplit / relayToggle / relayResize: střídavě, nasazení klepnutím, změna počtu skupin", () => {
  assert.deepEqual(relaySplit(["a", "b", "c", "d", "e"], 2), [["a", "c", "e"], ["b", "d"]]);
  assert.deepEqual(relaySplit(["a"], 7), [["a"], []], "neplatný počet = 2");
  let G = [[], []];
  G = relayToggle(G, 0, "a"); G = relayToggle(G, 0, "b"); G = relayToggle(G, 1, "c");
  assert.deepEqual(G, [["a", "b"], ["c"]]);
  assert.deepEqual(relayToggle(G, 1, "a"), [["b"], ["c", "a"]], "přesun do jiné skupiny na konec");
  assert.deepEqual(relayToggle(G, 0, "a"), [["b"], ["c"]], "klepnutí ve vlastní skupině vyřadí");
  assert.deepEqual(relayResize([["a"], ["b"], ["c", "d"]], 2), [["a", "c"], ["b", "d"]]);
  assert.deepEqual(relayResize([["a"], ["b"]], 3), [["a"], ["b"], []]);
});

// ===== Běh =====
test("štafeta: start naráz, předávky, doběhnutí a živé údaje", () => {
  let st = relayStart([["a", "b"], [], ["c"]], T0);
  assert.equal(st.g.length, 2, "prázdná skupina se neběží");
  assert.deepEqual(relayLive(st, 0, T0 + 5000), {pid: "a", n: 1, of: 2, leg: 5, tot: 5});
  st = relayTap(st, 0, T0 + 10_000);
  assert.deepEqual(relayLive(st, 0, T0 + 12_000), {pid: "b", n: 2, of: 2, leg: 2, tot: 12});
  st = relayTap(st, 1, T0 + 11_500);
  assert.equal(st.g[1].end, 11.5); assert.equal(relayDone(st), false);
  assert.equal(relayTap(st, 1, T0 + 99_000), st, "doběhnutá skupina se nemění");
  st = relayTap(st, 0, T0 + 21_250);
  assert.deepEqual(st.g[0].legs, [10, 11.25]); assert.equal(st.g[0].end, 21.25);
  assert.equal(relayDone(st), true);
  assert.deepEqual(relayLive(st, 0, T0), {end: 21.25, of: 2});
  assert.deepEqual(relayRank(st).map(x => [x.gi, x.t, x.rank]), [[1, 11.5, 1], [0, 21.25, 2]]);
});
test("relayUndo: omylem klepnutá předávka se vrátí, hráčka běží dál od začátku úseku", () => {
  let st = relayStart([["a", "b", "c"]], T0);
  st = relayTap(st, 0, T0 + 8000); st = relayTap(st, 0, T0 + 9000);
  st = relayUndo(st, 0);
  assert.deepEqual(st.g[0].legs, [8]); assert.equal(st.g[0].i, 1); assert.equal(st.g[0].a, T0 + 8000);
  assert.equal(relayUndo(relayStart([["a"]], T0), 0).g[0].i, 0, "bez předávky beze změny");
  const done = relayTap(relayStart([["a"]], T0), 0, T0 + 3000);
  assert.equal(relayUndo(done, 0).g[0].end, null, "vrácení posledního úseku zruší doběhnutí");
});

// ===== Zápis =====
test("relayPatch: úseky jako pokusy hráček, běh skupin do rl (nejvýš RL_MAX), relayLine", () => {
  let st = relayStart([["a", "b"], ["c"]], T0);
  st = relayTap(st, 0, T0 + 10_000); st = relayTap(st, 1, T0 + 12_000); st = relayTap(st, 0, T0 + 19_000);
  const old = Array.from({length: RL_MAX}, (_, i) => ({at: "x" + i, g: []}));
  const p = relayPatch(M, st, {a: [9.5]}, old, "2026-10-26T10:00:00Z"), e = p.r.b1_l1;
  assert.deepEqual(e.ms, {a: [9.5, 10], b: [9], c: [12]});
  assert.equal(e.rl.length, RL_MAX); assert.equal(e.rl[0].at, "x1", "nejstarší běh zahozen");
  assert.deepEqual(e.rl[RL_MAX - 1], {at: "2026-10-26T10:00:00Z", g: [{p: ["a", "b"], t: 19, l: [10, 9]}, {p: ["c"], t: 12, l: [12]}]});
  assert.equal(e.u, "s"); assert.equal(e.low, true); assert.equal(e.dn, "Sprint");
  assert.equal(relayLine(e.rl[RL_MAX - 1]), "B 12,00 s · A 19,00 s");
});

// ===== Oprava uloženého běhu (v22.19) =====
test("relayPatch ukládá úseky skupiny (g.l)", () => {
  let st = relayStart([["a", "b"]], T0);
  st = relayTap(st, 0, T0 + 10_000); st = relayTap(st, 0, T0 + 19_000);
  assert.deepEqual(relayPatch(M, st, {}, [], "x").r.b1_l1.rl[0].g[0], {p: ["a", "b"], t: 19, l: [10, 9]});
});
test("relayRunLegs: starší běh bez úseků se dohledá z pokusů odzadu, nesedí-li součet = neznámé", () => {
  const rl = [{at: "1", g: [{p: ["a", "b"], t: 21}, {p: ["c"], t: 12}]}, {at: "2", g: [{p: ["b", "a"], t: 20}]}];
  const ms = {a: [5, 10, 11], b: [11, 9], c: [12]};
  const R = relayRunLegs(rl, ms);
  assert.deepEqual(R[1].g[0], {l: [9, 11], ix: [1, 2], ok: true});
  assert.deepEqual(R[0].g[0], {l: [10, 11], ix: [1, 0], ok: true});
  assert.deepEqual(R[0].g[1].l, [12]);
  const bad = relayRunLegs([{g: [{p: ["a", "b"], t: 30}]}], {a: [10], b: [9]});
  assert.equal(bad[0].g[0].ok, false); assert.deepEqual(bad[0].g[0].l, [null, null]);
});
test("relaySwapPatch: prohození jmen – časy zůstanou na místě, pokusy se přesunou k hráčkám", () => {
  const entry = {...M, ms: {a: [5, 10], b: [9], c: [12]}, rl: [{at: "1", g: [{p: ["a", "b"], t: 19}, {p: ["c"], t: 12}]}]};
  assert.equal(relaySameSet(entry.rl[0], [["a", "a"], ["c"]]), false, "dvakrát táž hráčka");
  assert.equal(relaySwapPatch(M, entry, 0, [["a", "b", "c"], []]).patch, null, "jiné počty ve skupinách");
  const r = relaySwapPatch(M, entry, 0, [["b", "c"], ["a"]]), e = r.patch.r.b1_l1;
  assert.equal(r.moved, 3); assert.equal(r.lost, 0);
  assert.deepEqual(e.ms, {a: [5, 12], b: [10], c: [9]});
  assert.deepEqual(e.rl[0].g, [{p: ["b", "c"], t: 19, l: [10, 9]}, {p: ["a"], t: 12, l: [12]}]);
  assert.equal(e.dn, "Sprint");
  // Druhá oprava nad opraveným během (úseky už uložené) vrátí původní stav
  const back = relaySwapPatch(M, {...entry, ms: {...entry.ms, ...e.ms}, rl: e.rl}, 0, [["a", "b"], ["c"]]).patch.r.b1_l1;
  assert.deepEqual(back.ms, {a: [5, 10], b: [9], c: [12]});
});
test("relaySwapPatch: neznámé úseky = změní se jen jméno v běhu", () => {
  const entry = {...M, ms: {a: [1], b: [1]}, rl: [{at: "1", g: [{p: ["a", "b"], t: 30}]}]};
  const r = relaySwapPatch(M, entry, 0, [["b", "a"]]);
  assert.equal(r.lost, 2); assert.deepEqual(r.patch.r.b1_l1.ms, {});
  assert.deepEqual(r.patch.r.b1_l1.rl[0].g[0], {p: ["b", "a"], t: 30});
});
