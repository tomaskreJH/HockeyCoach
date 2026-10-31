// Testy 📉 pokladny na vyžádání (domain/money-load.js): výchozí volba podle role, ruční volba zařízení, stav načtení.
import {test} from "node:test";
import assert from "node:assert/strict";
import {LAZY_COLLS, lazyMoney, moneyLeft, moneyReady} from "../src/domain/money-load.js";

test("bez práv pokladny se nic neodkládá", () => {
  assert.equal(lazyMoney("1", true, false), false);
  assert.equal(lazyMoney(null, true, false), false);
});
test("výchozí: manager-trenér odkládá, samotný pokladník ne", () => {
  assert.equal(lazyMoney(null, true, true), true);
  assert.equal(lazyMoney(null, false, true), false);
});
test("ruční volba zařízení má přednost", () => {
  assert.equal(lazyMoney("0", true, true), false);
  assert.equal(lazyMoney("1", false, true), true);
});
test("stav načtení", () => {
  assert.equal(moneyReady(""), true);
  assert.equal(moneyReady("ok"), true);
  assert.equal(moneyReady("wait"), false);
  assert.equal(moneyReady("load"), false);
});
test("zbývající kolekce", () => {
  assert.deepEqual(moneyLeft([]), LAZY_COLLS);
  assert.deepEqual(moneyLeft(["charges"]), ["cash"]);
  assert.deepEqual(moneyLeft(["cash", "charges"]), []);
});

// 📉 Odlehčený přehled pokladny v Domů (domain/home-summary.js teamPayLite)
import {teamPayLite} from "../src/domain/home-summary.js";
test("přehled bez předpisů: dlužníci z debtors a otevřené žádosti", () => {
  const now = new Date("2026-10-31T12:00:00").getTime();
  const dt = [
    {id: "a", dues: [{d: "2026-10-01"}]},
    {id: "b", dues: [{d: "2026-10-05", x: 1}]},
    {id: "c", dues: [{d: "2026-12-01"}]}
  ];
  const rq = [{id: "r1", kind: "pay", st: "open"}, {id: "r2", kind: "att", st: "open"}, {id: "r3", kind: "pay", st: "ok"}];
  assert.deepEqual(teamPayLite(dt, rq, now), {debtors: 2, blocked: 1, reqs: 1});
});
