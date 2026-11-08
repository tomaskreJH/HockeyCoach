// Testy v22.57: střídání se nepočítá přes hranici třetiny (pauza = vynulování), src/domain/timeline.js shiftList / shiftStats.
import {test} from "node:test";
import assert from "node:assert/strict";
import {shiftList, shiftStats} from "../src/domain/timeline.js";

// ===== Data =====
// Zápas s hranicemi třetin (konce 1. a 2. třetiny v ms herního času); probíhající střídání žádné
const match = sh => ({live: {acc: 0, running: false, t0: 0, per: 3, ps: [900000, 1800000],
  ice: {LK: null, C: null, PK: null, LO: null, PO: null}, since: {}, sh}});

test("střídání přes hranici třetiny se rozdělí na dva úseky a nesloučí se", () => {
  // Ráďa na ledě 10:00–16:40 herního času, hranice 1. třetiny je 15:00 → dva úseky 5:00 a 1:40
  const list = shiftList(match([{p: "R", c: "LK", a: 600000, b: 1000000}]));
  assert.equal(list.length, 2);
  assert.deepEqual(list.map(x => [x.a, x.b]), [[600000, 900000], [900000, 1000000]]);
});

test("statistika počítá každou třetinu zvlášť (pauza vynuluje počítání)", () => {
  const st = shiftStats(match([{p: "R", c: "LK", a: 600000, b: 1000000}]), 120000);
  const r = st.find(x => x.p === "R");
  assert.equal(r.n, 2);
  assert.equal(r.total, 300000 + 100000);  // 5:00 + 1:40
  assert.equal(r.long, 1);                  // jen úsek 5:00 přesahuje limit 2:00
});

test("navazující záznamy téže hráčky se sloučí uvnitř jedné třetiny", () => {
  const list = shiftList(match([
    {p: "C", c: "C", a: 100000, b: 300000},
    {p: "C", c: "C", a: 300000, b: 500000}
  ]));
  assert.equal(list.length, 1);
  assert.deepEqual([list[0].a, list[0].b], [100000, 500000]);
});

test("záznam začínající přesně na hranici třetiny se nesloučí s koncem předchozí třetiny", () => {
  const list = shiftList(match([
    {p: "P", c: "PO", a: 800000, b: 900000},
    {p: "P", c: "PO", a: 900000, b: 1000000}
  ]));
  assert.equal(list.length, 2);
});
