// Testy hospodaření události a měsíce (domain/economy.js): kryté události, podíl příspěvků podle nákladů, uložený podíl po uzavření,
// výsledek události a měsíce, odhad nevystavených příspěvků, návrh poplatku výpočtem / paušálem. Výpočty pokladny (calcCash) se nemění.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {calcCash, cashCfg, contribEid} from "../src/domain/cash.js";
import {contribOf, coveredBy, eventResult, monthEconomy, monthEvents, suggestFlat} from "../src/domain/economy.js";

// ===== Konstanty: modelový měsíc listopad 2026 =====
const YM = "2026-11";
const W = (m, s, x) => ({monthly: {pays: m, mode: "calc", flat: 0}, single: {pays: s, mode: "calc", flat: 0}, exempt: {pays: x, mode: "calc", flat: 0}});
// Šablony: pravidelný trénink 3 000 Kč (Příspěvek neplatí), mimořádný 1 000 Kč (platí všichni), domácí zápas bez nákladů v šabloně
const CFG = cashCfg({contrib: 500, tpls: {
  train: {name: "Pravidelný trénink", cost: [{cat: "Led", payee: "Hala", amt: 3000}], who: W(false, true, false), acc: "op"},
  extra: {name: "Mimořádný trénink", cost: [{cat: "Led", payee: "Hala", amt: 1000}], who: W(true, true, false), acc: "op"}
}});
const PL = [
  {id: "a", name: "Anna", grp: "monthly"}, {id: "b", name: "Bára", grp: "monthly"}, {id: "c", name: "Cilka", grp: "monthly"},
  {id: "d", name: "Dana", grp: "single"}, {id: "e", name: "Eva", grp: "single", fx: 0.5}, {id: "x", name: "Xenie", grp: "single", ex: true}
];
const pick = ids => ids.map(id => PL.find(p => p.id === id));
const GOING = {t1: ["a", "b", "d"], t2: ["a", "d", "e"], t3: ["a", "d"], m1: ["a", "b", "c", "d"], m2: ["a"]};
const EV = [
  {id: "t1", title: "Trénink", date: "2026-11-04", time: "18:00"},
  {id: "t2", title: "Trénink", date: "2026-11-11", time: "18:00"},
  {id: "t3", title: "Sobota navíc", date: "2026-11-14", time: "09:00"},
  {id: "t9", title: "Trénink", date: "2026-12-02", time: "18:00"}
];
const MA = [{id: "m1", opp: "Lvice", date: "2026-11-08", home: true}, {id: "m2", opp: "Rysi", date: "2026-11-15", home: false}];
// Uložená nastavení evcash: t2 levnější led, t3 mimořádný, m1 domácí zápas s náklady
const EC = [
  {id: "t2", tpl: "train", cost: [{cat: "Led", amt: 1000}], who: W(false, true, false)},
  {id: "t3", tpl: "extra"},
  {id: "m1", tpl: "home", cost: [{cat: "Led", amt: 1500}, {cat: "Rozhodčí", amt: 500}], who: W(false, true, false)}
];
// Příspěvky listopadu: tři hráčky po 500 Kč, Anna zaplatila
const CH = ["a", "b", "c"].map(id => ({id: "c_" + YM + "_" + id, eid: contribEid(YM), mid: id, amt: 500, paid: id === "a" ? 500 : 0, kind: "contrib"}));
const D = (over = {}) => ({ev: EV, ma: MA, ec: EC, ch: CH, cs: [], pl: PL, cfg: CFG, players: eid => pick(GOING[eid] || []), ...over});

// ===== Kryté události a příspěvky =====
test("coveredBy: kryje jen událost, kde skupina Příspěvek neplatí", () => {
  assert.equal(coveredBy(W(false, true, false)), true);
  assert.equal(coveredBy(W(true, true, false)), false);
  assert.equal(coveredBy(null), false);
});
test("monthEvents: tréninky a zápasy měsíce seřazené podle data", () => {
  assert.deepEqual(monthEvents(YM, D()).map(e => e.id), ["t1", "m1", "t2", "t3", "m2"]);
});
test("contribOf: vystavené předpisy, jinak odhad ze soupisky bez osvobozených", () => {
  assert.deepEqual(contribOf(YM, D()), {amt: 1500, paid: 500, n: 3, est: false});
  assert.deepEqual(contribOf("2026-12", D()), {amt: 1500, paid: 0, n: 3, est: true});
});

// ===== Hospodaření měsíce =====
test("monthEconomy: příspěvky se dělí mezi kryté události podle nákladů, výsledek události a měsíce", () => {
  const me = monthEconomy(YM, D()), E = id => me.events.find(e => e.id === id);
  // kryté: t1 3000, t2 1000, m1 2000 → 1500 Kč příspěvků v poměru 3 : 1 : 2
  assert.deepEqual(["t1", "t2", "m1"].map(id => E(id).share), [750, 250, 500]);
  assert.equal(E("t3").covered, false);   // mimořádný trénink platí všichni
  assert.equal(E("m2").covered, false);   // venkovní zápas bez nákladů
  // t1: 3 hráčky v poli, platí jen Dana 1000 Kč → 1000 + 750 − 3000
  assert.equal(E("t1").collect, 1000);
  assert.equal(E("t1").res, -1250);
  // zaplacená část podílu = podíl × (zaplaceno ÷ předepsáno příspěvků)
  assert.equal(E("t1").sharePaid, 250);
  // t3: 1000 ÷ 2, platí obě → bez podílu, výsledek 0
  assert.equal(E("t3").collect, 1000);
  assert.equal(E("t3").res, 0);
  assert.equal(me.cov.n, 3);
  assert.equal(me.cov.cost, 6000);
  assert.equal(me.cov.res, 1500 + me.cov.collect - 6000);
  assert.equal(me.cost.total, 7000);
  assert.equal(me.result, r(1500 + me.evc.est - 7000));
  assert.equal(me.left, 0);
});
test("monthEconomy: uložený podíl uzavřené události se nemění, zbytek dostanou ostatní kryté události", () => {
  const ec = EC.map(x => ({...x}));
  ec.push({id: "t1", tpl: "train", cost: [{amt: 3000}], who: W(false, true, false), settle: {total: 3000, collect: 1000, cost: [{amt: 3000}], who: W(false, true, false), share: 900, ym: YM}});
  const ch = [...CH, {id: "t1_d", eid: "t1", mid: "d", amt: 1000, paid: 400, kind: "event"}];
  const me = monthEconomy(YM, D({ec, ch})), E = id => me.events.find(e => e.id === id);
  assert.equal(E("t1").share, 900);
  assert.equal(E("t1").fixed, true);
  assert.equal(E("t1").paid, 400);
  assert.deepEqual([E("t2").share, E("m1").share], [200, 400]);
  assert.equal(me.evc.amt, 1000);
  assert.equal(me.cost.settled, 3000);
});
test("monthEconomy: rozpracovaná úprava (over) mění náklady i dělení podílu, platy z pokladny", () => {
  const c = {cost: [{amt: 1000}], who: W(false, true, false)};
  const cs = [{id: "sal_" + YM + "_t", k: "out", cat: "Platy trenérů", amt: 800, ym: YM}, {k: "out", cat: "Platy trenérů", amt: 999, ym: "2026-10"}];
  const me = monthEconomy(YM, D({cs}), {id: "t1", c, collect: 333});
  assert.deepEqual(["t1", "t2", "m1"].map(id => me.events.find(e => e.id === id).share), [375, 375, 750]);
  assert.equal(me.events.find(e => e.id === "t1").collect, 333);
  assert.equal(me.salary, 800);
});
test("eventResult: událost a řádek měsíce (počet krytých, příspěvky, průměr na událost)", () => {
  const r0 = eventResult({id: "t2", raw: {date: "2026-11-11"}}, D());
  assert.equal(r0.share, 250);
  assert.deepEqual(r0.month, {ym: YM, n: 3, contrib: {amt: 1500, paid: 500, n: 3, est: false}, per: 500});
  assert.equal(eventResult({id: "zz", date: "2026-11-01"}, D()), null);
  assert.equal(eventResult({id: "t1"}, D()), null);
});

// ===== Návrh poplatku =====
test("suggestFlat: paušál vyrovná výsledek na nulu, výpočet ponechá dělení; vstup se nemění", () => {
  const c = {cost: [{amt: 3000}], who: W(false, true, false)}, before = JSON.stringify(c);
  const s = suggestFlat(c, pick(["a", "b", "d", "e"]), 750);
  // platí Dana (1) a Eva (0,5) → (3000 − 750 − 0) ÷ 1,5 = 1500
  assert.deepEqual(s.groups, ["single"]);
  assert.equal(s.fxs, 1.5);
  assert.equal(s.flat, 1500);
  assert.equal(s.flatOpt.collect, 2250);
  assert.equal(s.flatOpt.res, 0);
  assert.equal(s.calc.collect, 750 + 375);   // 3000 ÷ 4 = 750 × (1 + 0,5)
  assert.equal(s.calc.res, 1125 + 750 - 3000);
  assert.equal(JSON.stringify(c), before);
});
test("suggestFlat: osvobozené jen když platí, platby ostatních skupin se odečtou, nikdy záporně", () => {
  const c = {cost: [{amt: 1000}], who: W(true, true, true)};
  const s = suggestFlat(c, pick(["a", "d", "x"]), 0);
  // Anna (Příspěvek) platí 1000 ÷ 3 = 334 → zbývá 666 na Danu a Xenii
  assert.deepEqual(s.groups, ["single", "exempt"]);
  assert.equal(s.flat, 333);
  assert.ok(s.flatOpt.res >= 0);
  assert.equal(suggestFlat({cost: [{amt: 100}], who: W(false, true, false)}, pick(["d"]), 500).flat, 0);
  assert.equal(suggestFlat({cost: [{amt: 100}], who: W(true, false, false)}, pick(["a"]), 0), null);
  assert.equal(suggestFlat(c, [], 0).flat, 0);
});
test("calcCash beze změny: stejný výsledek jako před EK", () => {
  const k = calcCash({cost: [{amt: 1000}], who: W(false, true, true)}, pick(["a", "d", "e", "x"]));
  assert.deepEqual(k.lines.map(l => l.amt), [0, 250, 125, 250]);
  assert.equal(k.collect, 625);
});

// ===== Pomocné funkce =====
function r(n) { return Math.round(n * 100) / 100; }
