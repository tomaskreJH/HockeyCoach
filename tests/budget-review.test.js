// Testy schválení rozpočtu, úprav po schválení a exportu (domain/budget-review.js): zmrazená kopie plánu, podmínky schválení,
// povinný důvod úpravy a přidávání záznamů, porovnání schváleného a aktuálního plánu, řádky CSV pro valnou hromadu.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {cashCfg} from "../src/domain/cash.js";
import {budgetDoc, budgetPlan, normBudget} from "../src/domain/budget.js";
import {REV_NOTE_MAX, addRev, approveBlock, approveDoc, approvedOf, budgetCsvRows, compareApproved, dmy, planSum, revList, revNote} from "../src/domain/budget-review.js";

// ===== Konstanty: modelová sezóna 2026/27 =====
const K = "2026-27";
const W = (m, s, x) => ({monthly: {pays: m, mode: "calc", flat: 0}, single: {pays: s, mode: "calc", flat: 0}, exempt: {pays: x, mode: "calc", flat: 0}});
const CFG = cashCfg({contrib: 500, tpls: {train: {name: "Pravidelný trénink", cost: [{cat: "Led", payee: "Hala", amt: 3000}], who: W(false, true, false)}}});
const B = (cost = 3000) => normBudget({season: K, par: {n: {monthly: 3, single: 1, exempt: 0}, att: 4, contrib: 500, cm: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6], goal: 0},
  items: [{id: "tr", name: "Středa", tpl: "train", mode: "rule", rule: {days: [3], every: 1}, from: "2026-09-01", to: "2026-10-31", cost}],
  sal: [{name: "Petr", m: "month", amt: 2000}], other: []}, K);
const AT = "2026-09-01T10:00:00.000Z";
// Uložený dokument se schválením rozpočtu B()
const SV = () => { const b = B(), pl = budgetPlan(b, CFG, []); return {...budgetDoc(b), by: "t@x", at: AT, ...approveDoc(b, pl, "t@x", AT)}; };

// ===== Schválení =====
test("schválení: zmrazená kopie plánu a čísel, kdo a kdy", () => {
  const b = B(), pl = budgetPlan(b, CFG, []), d = approveDoc(b, pl, "t@x", AT).approved;
  assert.deepEqual(d.data, budgetDoc(b));
  assert.equal(d.by, "t@x");
  assert.equal(d.at, AT);
  assert.equal(d.sum.months.length, 11);
  assert.deepEqual(d.sum.tot, {n: pl.tot.n, inc: pl.tot.inc, out: pl.tot.out, saldo: pl.tot.saldo, contrib: pl.tot.contrib});
  assert.deepEqual(Object.keys(d.sum.months[0]), ["ym", "n", "inc", "out", "saldo"]);
  assert.deepEqual(planSum(pl), d.sum);
  // approvedOf: dokument bez schválení / se schválením / starší bez souhrnu
  assert.equal(approvedOf(null), null);
  assert.equal(approvedOf({...budgetDoc(b)}), null);
  assert.equal(approvedOf(SV()).sum.tot.saldo, pl.tot.saldo);
  assert.deepEqual(approvedOf({approved: {data: {}, by: "a", at: AT}}).sum, {months: [], tot: {n: 0, inc: 0, out: 0, saldo: 0, contrib: 0}});
});

test("schválení: jen uložený, bez změn a chyb, jen jednou", () => {
  const sv = {...budgetDoc(B())};
  assert.match(approveBlock(null, false, ""), /ulož/);
  assert.match(approveBlock(sv, true, ""), /ulož změny/);
  assert.equal(approveBlock(sv, false, "Položka bez názvu"), "Položka bez názvu");
  assert.equal(approveBlock(sv, false, ""), "");
  assert.match(approveBlock(SV(), false, ""), /už schválený/);
});

// ===== Úpravy =====
test("úpravy: povinný důvod, přidávají se na konec a nesou čísla upraveného plánu", () => {
  const sv = SV(), pl2 = budgetPlan(B(3500), CFG, []);
  assert.equal(addRev({...budgetDoc(B())}, pl2, "p@x", AT, "důvod"), null);       // neschválený → bez úprav
  assert.equal(addRev(sv, pl2, "p@x", AT, "   "), null);                        // prázdný důvod
  const r1 = addRev(sv, pl2, "p@x", "2026-11-02T08:00:00.000Z", "  Dražší led  ");
  assert.equal(r1.length, 1);
  assert.deepEqual(r1[0], {at: "2026-11-02T08:00:00.000Z", by: "p@x", note: "Dražší led", n: pl2.tot.n, inc: pl2.tot.inc, out: pl2.tot.out, saldo: pl2.tot.saldo});
  const r2 = addRev({...sv, rev: r1}, pl2, "t@x", AT, "Další");
  assert.deepEqual(r2.map(r => r.note), ["Dražší led", "Další"]);
  assert.equal(revList({rev: [null, 5, {note: "x"}]}).length, 1);
  assert.equal(revNote("x".repeat(REV_NOTE_MAX + 50)).length, REV_NOTE_MAX);
});

// ===== Porovnání =====
test("porovnání: schválený (zmrazený) vs. aktuální plán – souhrn a měsíce se změnou", () => {
  const sv = SV(), a = approvedOf(sv), pl = budgetPlan(B(), CFG, []), pl2 = budgetPlan(B(3500), CFG, []);
  const same = compareApproved(a, pl);
  assert.ok(same.rows.every(r => r.d === 0));
  assert.ok(same.months.every(m => m.d === 0));
  const c = compareApproved(a, pl2), out = c.rows.find(r => r.k === "out"), n = pl.tot.n;
  assert.equal(out.d, 500 * n);                                                   // každý trénink o 500 Kč dražší
  assert.equal(c.rows.find(r => r.k === "saldo").d, pl2.tot.saldo - pl.tot.saldo);   // dražší led zčásti zaplatí hráčky za událost
  assert.ok(c.rows.find(r => r.k === "saldo").d < 0);
  assert.equal(c.rows.find(r => r.k === "n").d, 0);
  const sep = c.months.find(m => m.ym === "2026-09");
  assert.equal(sep.d, pl2.months.find(m => m.ym === "2026-09").saldo - pl.months.find(m => m.ym === "2026-09").saldo);
  assert.ok(sep.d < 0);
  assert.equal(c.months.find(m => m.ym === "2026-12").d, 0);                     // prosinec bez tréninků
});

// ===== Export (CSV) =====
test("export CSV: stav, souhrn, plán po měsících, úpravy a komentář", () => {
  const pl2 = budgetPlan(B(3500), CFG, []), sv = {...SV(), rev: addRev(SV(), pl2, "p@x", "2026-11-02T08:00:00.000Z", "Dražší led")};
  const rows = budgetCsvRows({team: "HC", key: K, at: "2026-11-05T12:00:00.000Z", by: "t@x", sv, pl: pl2, track: null, flow: null, note: " Schváleno VH "});
  assert.deepEqual(rows[0], ["Rozpočet sezóny 2026/27", "HC"]);
  assert.deepEqual(rows[1], ["Export", "5. 11. 2026", "t@x"]);
  assert.equal(rows[2][1], "Schváleno 1. 9. 2026 (t@x), úprav: 1");
  const sal = rows.find(r => r[0] === "Saldo sezóny"), a = approvedOf(sv).sum.tot.saldo;
  assert.equal(sal[1], String(a).replace(".", ","));
  assert.equal(sal[3], String(pl2.tot.saldo - a).replace(".", ","));
  const head = rows.findIndex(r => r[0] === "Plán po měsících");
  assert.equal(rows[head].length, 12);
  assert.equal(rows.slice(head + 1, head + 12).length, 11);
  assert.ok(rows.some(r => r[0] === "Úpravy po schválení"));
  assert.ok(rows.some(r => r[0] === "2. 11. 2026" && r[2] === "Dražší led"));
  assert.deepEqual(rows[rows.length - 1], ["Komentář", "Schváleno VH"]);
  assert.ok(!rows.some(r => r[0] === "Plnění po měsících" || r[0] === "Cashflow"));
  // Neschválený návrh: bez schválených čísel a bez úprav
  const nr = budgetCsvRows({team: "HC", key: K, at: AT, by: "", sv: {...budgetDoc(B())}, pl: budgetPlan(B(), CFG, []), track: null, flow: null, note: ""});
  assert.equal(nr[2][1], "Neschválený návrh");
  assert.equal(nr.find(r => r[0] === "Saldo sezóny")[1], "");
  assert.ok(!nr.some(r => r[0] === "Komentář" || r[0] === "Úpravy po schválení"));
  assert.equal(dmy("2027-01-09T00:00:00Z"), "9. 1. 2027");
});
