// Testy pokladny (src/domain/cash.js) a bankovních účtů (src/domain/bank-account.js).
// Hlídají pravidla, na která se nesmí sáhnout bez rozhodnutí: dělení ceny (osvobozené se počítají do dělitele),
// koeficient fx, úhrady, zpráva a text QR platby (alfanumerický režim pro všechny banky), kontrolní součty účtů.
import {test} from "node:test";
import assert from "node:assert/strict";
import {calcCash, debtOf, payAmount, planCharges, qrMsg, restOf, spdPay, sumCash} from "../src/domain/cash.js";
import {accCheck, ibanToCz, ibanValid, parseAcc, recentChange} from "../src/domain/bank-account.js";

// ===== Výpočet předpisů =====
const WHO = {monthly: {pays: false, mode: "calc"}, single: {pays: true, mode: "calc"}, exempt: {pays: true, mode: "calc"}};
const P = [{id: "a", grp: "monthly"}, {id: "b", grp: "single"}, {id: "c", grp: "single", ex: true}, {id: "d", grp: "single", fx: 0.5}];

test("calcCash: cena ÷ všechny přihlášené hráčky (i příspěvkové a osvobozené), fx snižuje podíl", () => {
  const k = calcCash({cost: [{amt: 1000}], who: WHO}, P);
  assert.equal(k.N, 4);
  assert.equal(k.total, 1000);
  assert.deepEqual(k.lines.map(l => [l.pid, l.g, l.amt]), [["a", "monthly", 0], ["b", "single", 250], ["c", "exempt", 250], ["d", "single", 125]]);
  assert.equal(k.collect, 625);
});

test("calcCash: pevná částka skupiny a nikdo přihlášený", () => {
  const who = {...WHO, single: {pays: true, mode: "flat", flat: 120}};
  assert.equal(calcCash({cost: [{amt: 1000}], who}, P).lines.find(l => l.pid === "b").amt, 120);
  assert.equal(calcCash({cost: [{amt: 1000}], who: WHO}, []).collect, 0);
});

test("planCharges: zaplacená část zůstane, nezaplacený předpis hráčky, která už neplatí, se smaže", () => {
  const k = calcCash({cost: [{amt: 900}], who: WHO}, P.slice(1));   // b, c, d
  const have = {b: {mid: "b", paid: 100, vs: "111", acc: "op"}, x: {mid: "x", paid: 0}};
  const plan = planCharges("e1", k, "2026-11-01", have, [], {acc: "op"});
  const b = plan.set.find(s => s.d.mid === "b");
  assert.equal(b.d.paid, 100);
  assert.equal(b.d.vs, "111");
  assert.ok(plan.del.some(id => id.includes("x")));
  assert.equal(new Set(plan.set.map(s => s.d.vs)).size, plan.set.length, "variabilní symboly jsou jedinečné");
});

// ===== Úhrady a dluh =====
test("payAmount a restOf: úhrada nejvýš do zbývající částky", () => {
  const x = {amt: 100, paid: 40};
  assert.equal(restOf(x), 60);
  assert.deepEqual(payAmount(x, "60"), {amt: 60});
  assert.ok(payAmount(x, "70").err);
  assert.ok(payAmount(x, "0").err);
  assert.ok(payAmount({amt: 50, paid: 50}, "1").err);
});

test("debtOf: blokace jen po splatnosti a bez výjimky", () => {
  const past = "2020-01-01", future = "2999-01-01";
  assert.equal(debtOf([{mid: "a", amt: 100, paid: 0, due: future}], ["a"]).blocked, false);
  assert.equal(debtOf([{mid: "a", amt: 100, paid: 0, due: past}], ["a"]).blocked, true);
  assert.equal(debtOf([{mid: "a", amt: 100, paid: 0, due: past, exc: true}], ["a"]).blocked, false);
  assert.equal(debtOf([{mid: "a", amt: 100, paid: 30, due: past}], ["a"]).debt, 70);
});

test("sumCash: příjmy, výdaje a zůstatek", () => {
  assert.deepEqual(sumCash([{k: "in", amt: 500}, {k: "out", amt: 120.5}, {k: "in", amt: "20"}]), {in: 520, out: 120.5, bal: 399.5});
});

// ===== QR platba =====
test("qrMsg: bez diakritiky, VELKÁ písmena, jen znaky alfanumerického režimu QR, max. 60 znaků", () => {
  assert.equal(qrMsg("Zápas 10.10. Sokol - Jana, ok!"), "ZAPAS 10.10. SOKOL - JANA OK");
  assert.match(qrMsg("Ž".repeat(80)), /^Z{60}$/);
  assert.match(qrMsg("Příspěvek 10/2026 – Šárka"), /^[A-Z0-9 $%*+\-./:]*$/);
});

test("spdPay: text QR ve formátu SPD včetně okamžité platby", () => {
  assert.equal(spdPay("CZ65 0800 0000 1920 0014 5399", 150, "12a3", "Trénink 14.10. - Jana", true),
    "SPD*1.0*ACC:CZ6508000000192000145399*AM:150.00*CC:CZK*X-VS:123*MSG:TRENINK 14.10. - JANA*PT:IP");
  assert.ok(!spdPay("CZ6508000000192000145399", 1, "1", "", false).includes("MSG:"));
});

// ===== Bankovní účty =====
test("parseAcc: české číslo účtu → IBAN s kontrolou mod 11 a mod 97", () => {
  assert.deepEqual(parseAcc("19-2000145399/0800"), {iban: "CZ6508000000192000145399", cz: "19-2000145399/0800", err: ""});
  assert.ok(parseAcc("19-2000145398/0800").err, "překlep v čísle účtu");
  assert.ok(parseAcc("CZ6508000000192000145390").err, "chybný IBAN");
  assert.deepEqual(parseAcc(""), {iban: "", cz: "", err: ""});
});

test("accCheck, ibanValid, ibanToCz", () => {
  assert.equal(ibanValid("CZ65 0800 0000 1920 0014 5399"), true);
  assert.equal(accCheck("CZ6508000000192000145399"), true);
  assert.equal(accCheck("CZ6508000000192000145390"), false);
  assert.equal(ibanToCz("CZ6508000000192000145399"), "19-2000145399/0800");
});

test("recentChange: změna účtu v posledních 14 dnech", () => {
  const now = Date.parse("2026-10-22T12:00:00Z");
  assert.equal(recentChange("2026-10-20T12:00:00Z", now), true);
  assert.equal(recentChange("2026-09-01T12:00:00Z", now), false);
  assert.equal(recentChange("", now), false);
});
