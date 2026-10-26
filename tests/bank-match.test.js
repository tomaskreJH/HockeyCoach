// Testy 🏦 párování výpisu z banky (src/domain/bank-match.js): čtení CSV různých bank (záhlaví, oddělovač, částky, data, VS),
// párování podle VS předpisu, osobního VS (souhrnná platba) a čísla ve zprávě, částečná úhrada, přeplatek, už zapsané pohyby.
import test from "node:test";
import assert from "node:assert/strict";
import {colKey, mapDoc, matchStatement, parseAmount, parseCsv, parseDate, readStatement, vsNorm} from "../src/domain/bank-match.js";

// ===== Pomocná data =====
// Fio: údaje o účtu nad záhlavím, oddělovač ;, uvozovky
const FIO = `"accountId";"2800000000"
"bankId";"2010"
"dateStart";"01.10.2026"

"ID pohybu";"Datum";"Objem";"Měna";"Protiúčet";"Název protiúčtu";"Kód banky";"KS";"VS";"SS";"Poznámka";"Zpráva pro příjemce"
"26001";"05.10.2026";"500,00";"CZK";"123456789";"Nováková Jana";"0800";"";"111";"";"";"TRENINK 14.10. - JANA"
"26002";"06.10.2026";"1 200,00";"CZK";"987654321";"Svobodová Eva";"0100";"";"0000999";"";"";"SOUHRN"
"26003";"07.10.2026";"-3 000,00";"CZK";"555";"Zimní stadion";"0300";"";"";"";"led";""
"26004";"08.10.2026";"300,00";"CZK";"777";"Malá Petra";"0600";"";"";"";"";"platba 22222 za zapas"
"26005";"09.10.2026";"250,00";"CZK";"888";"Někdo";"0600";"";"424242";"";"";""`;
// ČSOB: oddělovač ;, bez uvozovek, jiné názvy sloupců, datum s mezerami
const CSOB = `datum zaúčtování;částka;měna;zůstatek;konstantní symbol;variabilní symbol;specifický symbol;označení operace;název protiúčtu;protiúčet;poznámka
05. 10. 2026;500,00;CZK;10500,00;;111;;Příchozí úhrada;Nováková Jana;123456789/0800;TRENINK`;
// Předpisy: c1 Jana 500 (VS 111), c2 Petra 300 (VS 22222), Eva dva předpisy 700 + 400 (osobní VS 999)
const CH = [
  {id: "c1", mid: "jana", vs: "111", amt: 500, paid: 0, due: "2026-10-20"},
  {id: "c2", mid: "petra", vs: "22222", amt: 300, paid: 0, due: "2026-10-20"},
  {id: "c3", mid: "eva", vs: "333", amt: 700, paid: 0, due: "2026-09-30"},
  {id: "c4", mid: "eva", vs: "444", amt: 400, paid: 0, due: "2026-10-31"},
  {id: "c5", mid: "jana", vs: "555", amt: 200, paid: 200, due: "2026-09-01"}
];
const PVS = {jana: "901", petra: "902", eva: "999"};
const pvs = mid => PVS[mid];

// ===== Čtení výpisu =====
test("parseAmount / parseDate / vsNorm: české i anglické zápisy", () => {
  assert.equal(parseAmount("1 234,50"), 1234.5);
  assert.equal(parseAmount("-1234.50"), -1234.5);
  assert.equal(parseAmount("1.234,50 CZK"), 1234.5);
  assert.equal(parseAmount("1,234.50"), 1234.5);
  assert.equal(parseAmount("+500"), 500);
  assert.equal(parseAmount(""), null);
  assert.equal(parseDate("05.10.2026"), "2026-10-05");
  assert.equal(parseDate("5. 10. 2026 14:30"), "2026-10-05");
  assert.equal(parseDate("2026-10-05T10:00"), "2026-10-05");
  assert.equal(parseDate("nic"), "");
  assert.equal(vsNorm("0000999"), "999");
  assert.equal(vsNorm(" 12 34 "), "1234");
});
test("parseCsv: uvozovky, zdvojené uvozovky, oddělovač ; i ,", () => {
  assert.deepEqual(parseCsv('a;"b;c";"d ""x"""\n1;2;3'), [["a", "b;c", 'd "x"'], ["1", "2", "3"]]);
  assert.deepEqual(parseCsv("a,b\r\n1,2\r\n"), [["a", "b"], ["1", "2"]]);
});
test("readStatement: Fio – záhlaví pod údaji o účtu, všechny pohyby, VS bez nul, zpráva", () => {
  const r = readStatement(FIO);
  assert.equal(r.err, "");
  assert.equal(r.txs.length, 5);
  assert.deepEqual(r.txs[0], {ref: "26001", date: "2026-10-05", amt: 500, vs: "111", name: "Nováková Jana", acc: "123456789", msg: "TRENINK 14.10. - JANA", cur: "CZK"});
  assert.equal(r.txs[1].vs, "999");
  assert.equal(r.txs[2].amt, -3000);
});
test("readStatement: ČSOB – jiné názvy sloupců, bez id pohybu (značka z údajů)", () => {
  const r = readStatement(CSOB);
  assert.equal(r.txs.length, 1);
  const t = r.txs[0];
  assert.equal(t.amt, 500); assert.equal(t.vs, "111"); assert.equal(t.date, "2026-10-05"); assert.equal(t.name, "Nováková Jana");
  assert.ok(t.ref.includes("2026-10-05") && t.ref.includes("111"), "značka z data, částky a VS");
});
test("readStatement: soubor bez záhlaví s částkou = chyba, BOM na začátku nevadí", () => {
  assert.ok(readStatement("x;y\n1;2").err);
  assert.equal(readStatement(String.fromCharCode(0xFEFF) + CSOB).txs.length, 1);
});

// ===== Párování =====
test("matchStatement: VS předpisu, osobní VS (nejstarší první), číslo ve zprávě, nespárované, výdaje", () => {
  const m = matchStatement(readStatement(FIO).txs, CH, pvs, new Set());
  assert.equal(m.out, 1, "výdaj za led se nepáruje");
  assert.equal(m.pairs.length, 3);
  const [a, b, c] = m.pairs;
  assert.deepEqual([a.how, a.exact, a.items], ["vs", true, [{cid: "c1", mid: "jana", amt: 500}]]);
  assert.deepEqual([b.how, b.exact, b.items.map(x => [x.cid, x.amt])], ["osoba", false, [["c3", 700], ["c4", 400]]]);
  assert.equal(b.over, 100, "souhrn 1 200 Kč na dluh 1 100 Kč = přeplatek 100 Kč");
  assert.deepEqual([c.how, c.exact, c.items[0].cid], ["zpráva", false, "c2"], "VS chybí – číslo 22222 ve zprávě, ke kontrole");
  assert.deepEqual(m.loose.map(t => t.vs), ["424242"]);
});
test("matchStatement: částečná úhrada, dvě platby na jeden předpis nepřeplatí, už zapsaný pohyb a zaplacený předpis", () => {
  const tx = (ref, amt, vs) => ({ref, date: "2026-10-05", amt, vs, name: "", acc: "", msg: ""});
  const m = matchStatement([tx("t1", 300, "111"), tx("t2", 300, "111"), tx("t3", 200, "555"), tx("t4", 500, "111")], CH, pvs, new Set(["t4"]));
  assert.equal(m.pairs[0].exact, false, "300 z 500 = částečná úhrada");
  assert.deepEqual([m.pairs[1].items[0].amt, m.pairs[1].over], [200, 100], "druhá platba doplatí jen zbytek 200 Kč");
  assert.equal(m.pairs.length, 2);
  assert.deepEqual(m.loose.map(t => t.ref), ["t3"], "zaplacený předpis c5 už nic nečeká");
  assert.deepEqual(m.seen.map(t => t.ref), ["t4"], "už zapsaný pohyb se nenabízí");
});
test("matchStatement: osobní VS pokryje přesně všechny dluhy osoby = přesná shoda", () => {
  const m = matchStatement([{ref: "x", date: "", amt: 1100, vs: "999", name: "", acc: "", msg: ""}], CH, pvs, null);
  assert.equal(m.pairs[0].exact, true);
  assert.equal(m.pairs[0].sum, 1100);
});

// ===== Ruční přiřazení sloupců (nepoznaný formát, změna banky) =====
// Neznámá banka: anglické / vlastní názvy sloupců, oddělovač , – automatika částku nepozná
const ODD = `Account statement,Team
Booked,Value,Ref,Payer,Note,Sym
2026-10-05,"500.00",A1,Jana N,trenink,111
2026-10-06,"-50.00",A2,Bank,fee,`;
test("readStatement: nepoznané záhlaví → nabídne řádek s nejvíce sloupci, ruční přiřazení přečte pohyby", () => {
  const r = readStatement(ODD);
  assert.equal(r.txs.length, 0);
  assert.ok(r.err.includes("záhlaví"));
  assert.equal(r.hi, 1, "nabídnutý řádek záhlaví");
  assert.deepEqual(r.sample[0].slice(0, 2), ["2026-10-05", "500.00"]);
  assert.equal(r.cand.length, 4);
  const map = {amt: colKey("Value"), vs: "sym", date: "booked", name: "payer", msg: "note", ref: "ref"};
  const m = readStatement(ODD, {map});
  assert.equal(m.manual, true);
  assert.equal(m.err, "");
  assert.deepEqual(m.txs[0], {ref: "A1", date: "2026-10-05", amt: 500, vs: "111", name: "Jana N", acc: "", msg: "trenink", cur: ""});
  assert.equal(m.txs.length, 2);
  assert.deepEqual(mapDoc(m.map), {amt: "value", vs: "sym", date: "booked", name: "payer", msg: "note", ref: "ref"});
});
test("readStatement: ručně zvolený řádek záhlaví a uložené přiřazení; mapDoc bez částky = null", () => {
  const r = readStatement(ODD, {hi: 1, map: {amt: "value", vs: "sym", msg: "*"}});
  assert.equal(r.hi, 1);
  assert.equal(r.txs[0].vs, "111");
  assert.equal(r.txs[0].msg, "trenink", "msg * = textové sloupce (Note)");
  assert.equal(readStatement(ODD, {map: {amt: "neni"}}).txs.length, 0, "uložené přiřazení nesedí → automatika (nepozná)");
  assert.equal(mapDoc({vs: "x"}), null);
  assert.equal(readStatement(FIO, {map: {amt: "objem", vs: "vs", msg: ""}}).txs[0].msg, "", "msg prázdné = bez zprávy");
});
