// Testy 🏃 štafety ve stopkách (src/domain/relay.js): rozdělení a nasazení do skupin, start naráz, předávky, oprava předávky,
// doběhnutí, pořadí skupin a zápis (úseky = pokusy hráček, běh skupin do seznamu rl). Čisté funkce – nic se nezapisuje.
import test from "node:test";
import assert from "node:assert/strict";
import {RL_MAX, relayDone, relayLine, relayLive, relayPatch, relayRank, relayResize, relaySplit, relayStart, relayTap, relayToggle, relayUndo} from "../src/domain/relay.js";

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
  assert.deepEqual(e.rl[RL_MAX - 1], {at: "2026-10-26T10:00:00Z", g: [{p: ["a", "b"], t: 19}, {p: ["c"], t: 12}]});
  assert.equal(e.u, "s"); assert.equal(e.low, true); assert.equal(e.dn, "Sprint");
  assert.equal(relayLine(e.rl[RL_MAX - 1]), "B 12,00 s · A 19,00 s");
});
