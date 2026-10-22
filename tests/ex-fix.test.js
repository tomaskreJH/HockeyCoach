// Test převodu pole ex u hráček (⚙️ → Kontrola dat): exFixPlan v domain/cash.js.
// Doplní ex jen hráčkám bez pole; starý tvar osvobozené (fx 0 bez ex) převede na ex true a fx 1 (tak se četl do v18.9.2).
// Od v18.9.3 exOf a fxOf starý tvar nečtou – osvobozená je jen hráčka s ex: true.
// Struktura: Importy -> Testovací data -> Testy.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {exFixPlan, exOf, fxOf} from "../src/domain/cash.js";

// ===== Testovací data =====
const P = {
  old: {name: "Stará osvobozená", fx: 0},             // starý tvar osvobozené (fx 0, bez ex)
  half: {name: "Poloviční", fx: 0.5},                 // bez ex, koeficient 50 %
  none: {name: "Bez koeficientu"},                    // bez ex i fx
  ok: {name: "Hotová", fx: 0, ex: false},             // má ex – nemění se
  okEx: {name: "Osvobozená", fx: 1, ex: true}
};
// Jak se starý tvar četl do v18.9.2 (význam, který převod musí zachovat)
const oldEx = p => p.ex === true || (p.ex == null && p.fx != null && +p.fx === 0);
const oldFx = p => (p.ex == null && p.fx != null && +p.fx === 0) ? 1 : fxOf(p);

// ===== Testy =====
test("exFixPlan: jen hráčky bez pole ex; starý tvar osvobozené dostane ex true a fx 1", () => {
  const plan = exFixPlan(P);
  assert.deepEqual(plan.map(x => [x.id, x.ex]), [["old", true], ["half", false], ["none", false]]);
  assert.deepEqual(plan[0].doc, {name: "Stará osvobozená", fx: 1, ex: true});
  assert.deepEqual(plan[1].doc, {name: "Poloviční", fx: 0.5, ex: false});
  assert.deepEqual(plan[2].doc, {name: "Bez koeficientu", ex: false});
});

test("exFixPlan: převedená data mají pro platby stejný význam, jaký měl starý tvar", () => {
  exFixPlan(P).forEach(x => {
    assert.equal(exOf(x.doc), oldEx(P[x.id]), x.id + " osvobozená");
    assert.equal(fxOf(x.doc), oldFx(P[x.id]), x.id + " koeficient");
  });
});

test("exOf / fxOf: starý tvar (fx 0 bez ex) se už nečte jako osvobozená", () => {
  assert.equal(exOf(P.old), false);
  assert.equal(fxOf(P.old), 0);
  assert.equal(exOf(P.okEx), true);
  assert.equal(exOf(P.ok), false);
  assert.equal(fxOf(P.none), 1);
});

test("exFixPlan: po převodu není co doplnit (lze spustit znovu), prázdná soupiska", () => {
  const after = Object.fromEntries(Object.entries(P).map(([id, p]) => [id, (exFixPlan({[id]: p})[0] || {doc: p}).doc]));
  assert.deepEqual(exFixPlan(after), []);
  assert.deepEqual(exFixPlan(null), []);
});
