// Testy Moje platby (domain/economy.js): předpisy po měsících sezóny, cena na hlavu z uzavřeného vyúčtování (evprice),
// doplnění cen (idempotentní), porovnání způsobu placení „Kdybych platila jinak“. Výpočty pokladny (calcCash) se nemění.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {calcCash, contribEid} from "../src/domain/cash.js";
import {chargeYm, compareMonths, headOf, myMonths, priceDoc, pricePlan} from "../src/domain/economy.js";

// ===== Konstanty: modelová sezóna 2026/27 =====
const W = (m, s, x) => ({monthly: {pays: m, mode: "calc", flat: 0}, single: {pays: s, mode: "calc", flat: 0}, exempt: {pays: x, mode: "calc", flat: 0}});
// Události: dva tréninky v listopadu, mimořádný trénink v prosinci, zápas v červenci (patří do předchozí sezóny)
const D = {
  ev: [{id: "t1", title: "Trénink", date: "2026-11-04"}, {id: "t2", title: "Trénink", date: "2026-11-11"}, {id: "x1", title: "Mimořádný", date: "2026-12-05"}],
  ma: [{id: "m7", opp: "Sokol", date: "2026-07-10"}]
};
// Snapshot uzavření: trénink 3 000 Kč, 10 hráček, platí jen Za událost (výpočet); mimořádný 1 000 Kč, 8 hráček, platí všichni, Za událost paušál 200
const ST_T = {tpl: "train", who: W(false, true, false), n: 10, total: 3000};
const ST_X = {tpl: "extra", who: {...W(true, true, false), single: {pays: true, mode: "flat", flat: 200}}, n: 8, total: 1000};

// ===== Po měsících =====
test("myMonths: měsíc podle data události a měsíce příspěvku, částečná úhrada, jiná sezóna mimo", () => {
  const ch = [
    {id: "a", eid: contribEid("2026-11"), kind: "contrib", amt: 500, paid: 500, due: "2026-11-01T23:59"},
    {id: "b", eid: "x1", kind: "event", amt: 125, paid: 50, due: "2026-12-08T23:59"},
    {id: "c", eid: "t1", kind: "event", amt: 300, paid: 400, due: "2026-12-30T23:59"},   // splatnost v jiném měsíci – rozhoduje datum události
    {id: "d", eid: "m7", kind: "event", amt: 100, paid: 0},                              // červenec 2026 = předchozí sezóna
    {id: "e", eid: "smazana", kind: "event", amt: 80, paid: 0, due: "2027-01-10T23:59"}  // smazaná událost – měsíc podle splatnosti
  ];
  const r = myMonths(ch, D, "2026-11-20");
  assert.deepEqual(r.season, {from: "2026-08-01", to: "2027-07-01"});
  assert.deepEqual(r.months.map(m => m.ym), ["2027-01", "2026-12", "2026-11"], "od nejnovějšího, bez července 2026");
  const nov = r.months.find(m => m.ym === "2026-11");
  assert.deepEqual(nov.contrib, {amt: 500, paid: 500});
  assert.deepEqual(nov.ev, {amt: 300, paid: 300}, "přeplatek se počítá nejvýše do výše předpisu");
  assert.equal(nov.rest, 0);
  const dec = r.months.find(m => m.ym === "2026-12");
  assert.deepEqual([dec.amt, dec.paid, dec.rest], [125, 50, 75]);
  assert.deepEqual(r.total, {amt: 1005, paid: 850, rest: 155});
  assert.equal(chargeYm(ch[3], D), "2026-07");
  assert.equal(myMonths(ch, D, "2026-07-20").months.length, 1, "červenec patří do sezóny 2025/26");
});

// ===== Cena na hlavu =====
test("headOf / priceDoc: cena před koeficientem odpovídá calcCash (dělitel = všechny přihlášené)", () => {
  assert.deepEqual(headOf(ST_T), {monthly: 0, single: 300, exempt: 0});
  assert.deepEqual(headOf(ST_X), {monthly: 125, single: 200, exempt: 0});
  assert.deepEqual(headOf({who: W(true, true, true), n: 3, total: 1000}), {monthly: 333.3333, single: 333.3333, exempt: 333.3333});
  // Shoda s výpočtem předpisu: hráčka 75 % ve skupině Za událost
  const P = Array.from({length: 10}, (_, i) => ({id: "p" + i, grp: i ? "monthly" : "single", fx: i ? 1 : 0.75, ex: false}));
  const k = calcCash({cost: [{amt: 3000}], who: ST_T.who}, P);
  assert.equal(k.lines[0].amt, Math.ceil(headOf(ST_T).single * 0.75));
  assert.deepEqual(priceDoc(ST_T, "2026-11-04"), {ym: "2026-11", date: "2026-11-04", tpl: "train", head: {monthly: 0, single: 300, exempt: 0}});
  assert.equal(priceDoc(ST_T, ""), null, "bez data události nic");
  assert.equal(priceDoc(null, "2026-11-04"), null);
});

test("pricePlan: doplní chybějící a změněné ceny, smaže ceny bez uzavření; podruhé nic (idempotentní)", () => {
  const ec = [{id: "t1", settle: ST_T}, {id: "t2"}, {id: "x1", settle: ST_X}, {id: "zz", settle: ST_T}];   // t2 otevřené, zz smazaná událost
  const have = {t2: {ym: "2026-11"}, x1: {ym: "2026-12", date: "2026-12-05", tpl: "extra", head: {monthly: 1, single: 1, exempt: 0}}};
  const p = pricePlan(ec, D, have);
  assert.deepEqual(p.set.map(x => x.id), ["t1", "x1"]);
  assert.deepEqual(p.del, ["t2"]);
  const after = {t1: p.set[0].d, x1: p.set[1].d};
  assert.deepEqual(pricePlan(ec, D, after), {set: [], del: []});
});

// ===== Kdybych platila jinak =====
// Hráčka byla na t1, t2 (listopad) a x1 (prosinec); ceny jen pro uzavřené t1 a x1
const PRICES = [{id: "t1", ...priceDoc(ST_T, "2026-11-04")}, {id: "x1", ...priceDoc(ST_X, "2026-12-05")}];
const went = id => ["t1", "t2", "x1"].includes(id);

test("compareMonths: hráčka s příspěvkem – kolik by platila za události", () => {
  const ch = [
    {eid: contribEid("2026-11"), kind: "contrib", amt: 400, paid: 400},
    {eid: contribEid("2026-12"), kind: "contrib", amt: 400, paid: 0},
    {eid: "x1", kind: "event", amt: 100, paid: 100}   // mimořádný: příspěvek platí 125 × 0,8
  ];
  const me = {id: "p", grp: "monthly", fx: 0.8, ex: false};
  const r = compareMonths(me, myMonths(ch, D, "2026-12-10"), PRICES, went, 500, "2026-12");
  assert.equal(r.grp, "monthly");
  assert.equal(r.alt, "single");
  assert.deepEqual(r.rows, [{ym: "2026-12", act: 500, alt: 160, n: 1}, {ym: "2026-11", act: 400, alt: 240, n: 1}]);
  assert.deepEqual(r.total, {act: 900, alt: 400});
  assert.equal(r.better, "single");
});

test("compareMonths: hráčka za událost – příspěvek × koeficient; budoucí měsíce a jiné sezóny se nepočítají", () => {
  const ch = [{eid: "t1", kind: "event", amt: 300, paid: 300}, {eid: "x1", kind: "event", amt: 200, paid: 0}];
  const me = {id: "p", grp: "single", fx: 1, ex: false};
  const r = compareMonths(me, myMonths(ch, D, "2026-11-20"), [...PRICES, {id: "m7", ym: "2026-07", head: {monthly: 50, single: 50}}], id => went(id) || id === "m7", 500, "2026-11");
  assert.deepEqual(r.rows, [{ym: "2026-11", act: 300, alt: 500, n: 1}], "prosinec je budoucí, červenec jiná sezóna");
  assert.equal(r.better, "single");
  const same = compareMonths(me, myMonths([{eid: "t1", kind: "event", amt: 500, paid: 0}], D, "2026-11-20"), [], () => false, 500, "2026-11");
  assert.equal(same.better, null, "stejná částka = bez doporučení");
});

test("compareMonths: osvobozená, koeficient 0 a chybějící hráčka", () => {
  assert.deepEqual(compareMonths({grp: "monthly", ex: true}, null, [], went, 500, "2026-11"), {skip: "exempt"});
  assert.deepEqual(compareMonths({grp: "single", fx: 0, ex: false}, null, [], went, 500, "2026-11"), {skip: "fx0"});
  assert.equal(compareMonths(null, null, [], went, 500, "2026-11"), null);
});
