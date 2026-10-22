// Srovnávací test úklidu D1 (v18.9): výstupy zachycené na původním kódu v18.8.1 (tests/fixtures/d1-baseline.json)
// musí po úklidu zůstat přesně stejné – statistiky zápasu a souhrnu, CSV exporty (byte po bytu), potvrzení druhým klepnutím,
// zápasy proti soupeři a variabilní symboly. Test se během úklidu NEMĚNÍ; přejmenované funkce hledá pod novým i starým názvem
// (matchesVs / vsOf, vsHash / vsOf). Nové zachycení (jen na původním kódu): D1_CAPTURE=1 npm test.
// Struktura: Importy -> Testovací data -> Pomocné funkce -> Zachycení výstupů -> Testy.

// ===== Importy =====
import {test, before, mock} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, writeFileSync, mkdirSync} from "node:fs";
import {fakeDb} from "./support/fake-db.mjs";
import {S} from "../src/core/state.js";
import * as E from "../src/domain/live-engine.js";
import * as Sel from "../src/core/selectors.js";
import * as C from "../src/domain/cash.js";
import {HK} from "../src/data/storage.js";
import {csvShifts, csvTimeline, matchStatsHtml} from "../src/views/report.js";
import {stats} from "../src/views/stats.js";
import {bindMoney} from "../src/views/money.js";

const FIX = new URL("./fixtures/d1-baseline.json", import.meta.url);
const CAPTURE = !!process.env.D1_CAPTURE;

// ===== Testovací data =====
const COLS = ["LK", "C", "PK", "LO", "PO"];
const posOf = c => (/O$/.test(c) ? "Obránkyně" : "Útočnice");
// Soupiska: brankářka, dvě pětky, rotující partnerka; jména s diakritikou, uvozovkami a středníkem (zkouška CSV)
function roster() {
  const pl = [{id: "g1", name: "Gábi \"Zeď\"", num: "1", pos: "Brankářka", grp: "monthly", fx: 1}, {id: "r1C", name: "Rotace; Eva", num: "", pos: "Útočnice", st: "inj"}];
  COLS.forEach((c, i) => [1, 2].forEach(n => pl.push({id: "p" + n + c, name: "Hráčka " + n + c + (i === 2 ? " Šťastná" : ""), num: String(n * 10 + i), pos: posOf(c), grp: n === 2 ? "single" : "monthly", fx: n === 2 && i === 0 ? 0.5 : 1, note: i === 1 ? "pozn.\nřádek" : ""})));
  return pl;
}
// Odehraný zápas přes jádro živého zápisu: střídání, střely, tresty, góly, konec
function playMatch(id, date, opp, variant) {
  const lu = {G1: "g1", "1C+": "r1C"};
  [1, 2].forEach(n => COLS.forEach(c => { lu[n + c] = "p" + n + c; }));
  const m = {id, date, opp, lineup: lu, home: variant === 0};
  m.live = E.initLive(m);
  S.ma.push(m); S.mid = id;
  const at = ms => { S.ma.find(x => x.id === id).live.acc = ms; };
  at(30000); E.doShot("p1LK");
  at(45000); E.doSub("p2C", "C");
  at(50000); E.doSub("p2LK", "LK");
  at(70000); E.doOShot();
  at(90000); E.doSub("r1C", "C");
  at(95000); E.act("Trest", (L, n, ids, now) => E.addPen(L, {t: "us", p: "p1PK", min: 2}, now, n));
  at(120000); E.doShot("p2LK");
  at(150000); E.doSub("p2LO", "LO");
  at(200000); E.doSub("p1C", "C");
  at(260000); E.doShot("p1LO");
  const cur = S.ma.find(x => x.id === id);
  cur.events = cur.events || [];
  cur.events.push({id: id + "g1", k: "G", team: "us", per: 1, time: "02:10", sit: "E", scorer: "p2LK", a1: "p1C", a2: variant ? null : "p2LO", on: ["p2LK", "p1C", "p2LO", "p1LO", "p1PO", "g1"]});
  cur.events.push({id: id + "g2", k: "G", team: "opp", per: 1, time: "03:30", sit: "E", on: ["p1LK", "p2C", "p1LO", "p1PO", "p1PK", "g1"], gk: "g1"});
  if (variant) cur.events.push({id: id + "g3", k: "G", team: "us", per: 1, time: "04:05", sit: "PP", scorer: "p1LO", a1: null, a2: null, on: ["p1LO", "p1C", "g1"]});
  cur.events.push({id: id + "p2", k: "P", team: "us", per: 1, time: "04:20", pid: "p2C", min: 2, reason: "Hákování"});
  at(300000);
  cur.closed = true;
  if (cur.live) { cur.live.running = false; cur.live.t0 = 0; }
  return cur;
}
// Pokladna: předpisy, pohyby, nastavení, realizační tým, tréninky
function cashData() {
  S.tr = [{id: "t1", name: "Trenér \"Pepa\"", kind: "Trenér", pay: "none"}];
  S.ev = [{id: "e1", type: "train", title: "Trénink", date: "2026-09-10"}, {id: "e2", type: "train", title: "", date: "2026-09-17"}];
  S.cc = {iban: "CZ6508000000192000145399", iban2: "CZ6907100000000000123457", acc: {contrib: "main"}};
  S.ch = [
    {id: "c_2026-09_p1LK", eid: "c_2026-09", mid: "p1LK", amt: 500, paid: 0, kind: "contrib", due: "2026-09-15T23:59", vs: "1234567"},
    {id: "e1_p2C", eid: "e1", mid: "p2C", amt: 66.67, paid: 30, kind: "event", due: "2026-09-12T18:00", vs: "7654321", msg: "TRENINK 10.9.;\"X\"", exc: true},
    {id: "m1_t1", eid: "m1", mid: "t1", amt: 100, paid: 100, kind: "event", due: "2026-09-21T18:00"},
    {id: "e2_zz", eid: "e2", mid: "zz", amt: 10, paid: 0, kind: "event"}
  ];
  S.cs = [
    {id: "k1", k: "in", d: "2026-09-02", amt: 500, cat: "Příspěvky", mid: "p1LK", eid: "c_2026-09", cid: "c_2026-09_p1LK", note: "hotově", by: "a@b.cz"},
    {id: "k2", k: "out", d: "2026-09-05", amt: 1200.5, cat: "Led", note: "led; září", by: "a@b.cz", acc: "op"},
    {id: "k3", k: "in", d: "2026-08-30", amt: 30, cat: "Platby za události", mid: "p2C", eid: "e1", cid: "e1_p2C"},
    {id: "k4", k: "in", d: "2025-12-31", amt: 2000, cat: "Ostatní", note: "dar \"sponzor\""}
  ];
}

// ===== Pomocné funkce =====
// Zachycení stahovaných souborů (downloadFile → Blob → URL.createObjectURL); text včetně BOM
const files = [];
globalThis.URL.createObjectURL = b => { files.push(b); return "blob:test"; };
globalThis.URL.revokeObjectURL = () => {};
const blobText = async b => new TextDecoder("utf-8", {ignoreBOM: true}).decode(await b.arrayBuffer());
// Zástupce kořene obrazovky: querySelectorAll vrací jen připravená tlačítka podle selektoru
const fakeRoot = btns => ({innerHTML: "", querySelector: () => null, querySelectorAll: sel => btns[sel] || [], addEventListener() {}});
// Zástupná dávka zápisů (zaznamenává operace)
function recDb() {
  const db = fakeDb(), ops = [];
  db.ops = ops;
  db.batch = () => { const b = {set(p, d) { ops.push(["set", p, d]); return b; }, merge(p, d) { ops.push(["merge", p, d]); return b; }, delete(p) { ops.push(["del", p]); return b; }, commit: async () => { ops.push(["commit"]); }}; return b; };
  return db;
}
const fn = (...xs) => xs.find(x => typeof x === "function");
// Odstraní proměnlivé části (časové razítko a náhodné id záznamu auditu)
const noTs = ops => JSON.parse(JSON.stringify(ops, (k, v) => (k === "ts" ? "<ts>" : typeof v === "string" && v.startsWith("audit/") ? "audit/<id>" : v)));

// ===== Zachycení výstupů =====
const out = {};
before(async () => {
  // Přihlášení trenéra přes zástupce Firebase (role trener = sportovní i pokladní práva)
  S.pl = roster();
  globalThis.__fb = {user: {email: "coach@test.cz", uid: "u1"}, members: {"coach@test.cz": {role: "trener"}}, data: {players: Object.fromEntries(S.pl.map(p => { const {id, ...d} = p; return [id, d]; }))}};
  const db = await HK.ready();
  db.collection("players").onSnapshot(() => {});

  // Zápasy (statistiky jednoho zápasu, souhrn, CSV vývoje a střídání)
  S.db = fakeDb(); S.ma = []; S.at = [];
  const m1 = playMatch("m1", "2026-09-20", "HC Soupeř", 0);
  const m2 = playMatch("m2", "2026-10-04", "hc soupeř ", 1);
  playMatch("m3", "2026-10-11", "Jiný tým", 0);
  S.ma.push({id: "m4", date: "2026-10-18", opp: "HC Soupeř", lineup: {}});   // neuzavřený zápas se nepočítá
  out.matchStats = [matchStatsHtml(m1), matchStatsHtml(m2)];
  const el = {innerHTML: "", querySelector: () => null, querySelectorAll: () => [], style: {}};
  stats(el);
  out.stats = el.innerHTML;
  out.csvTimeline = [csvTimeline(m1), csvTimeline(m2)];
  out.csvShifts = [csvShifts(m1), csvShifts(m2)];

  // Zápasy proti soupeři (selectors) a variabilní symbol (cash)
  const vs = fn(Sel.matchesVs, Sel.vsOf), vh = fn(C.vsHash, C.vsOf);
  out.matchesVs = [vs("HC Soupeř").map(x => x.id), vs("HC SOUPEŘ", "m1").map(x => x.id), vs("Jiný tým").map(x => x.id), vs("nikdo").map(x => x.id)];
  out.vsHash = ["e1_p2C", "c_2026-09_p1LK", "", "žluťoučký kůň", "m1_t1"].map(vh);
  out.personVs = ["p1LK", "t1", ""].map(C.personVs);
  out.uniqVs = [C.uniqVs("e1_p2C", new Set()), C.uniqVs("e1_p2C", new Set([vh("e1_p2C")]))];

  // CSV soupisky (⚙️ → Soupiska CSV)
  files.length = 0;
  HK.exportCSV();
  out.csvRoster = await blobText(files[0]);

  // CSV pokladny: pohyby, předpisy, přehled po měsících (Měsíce → Export)
  cashData();
  S.db = recDb();
  const csvBtn = k => ({dataset: {mcsv: k}, onclick: null});
  const bc = {cash: csvBtn("cash"), ch: csvBtn("ch"), mon: csvBtn("mon")};
  bindMoney(fakeRoot({"[data-mcsv]": Object.values(bc)}));
  out.csvMoney = {};
  for (const k of Object.keys(bc)) { files.length = 0; bc[k].onclick(); out.csvMoney[k] = await blobText(files[0]); }
});

// ===== Testy =====
function check(key) {
  if (CAPTURE) {
    let all = {};
    try { all = JSON.parse(readFileSync(FIX, "utf8")); } catch (e) { /* první zápis */ }
    all[key] = out[key];
    mkdirSync(new URL("./fixtures/", import.meta.url), {recursive: true});
    writeFileSync(FIX, JSON.stringify(all, null, 1));
    return;
  }
  const exp = JSON.parse(readFileSync(FIX, "utf8"));
  assert.ok(key in exp, "chybí očekávaná hodnota " + key);
  assert.deepEqual(out[key], exp[key]);
}

test("statistiky jednoho zápasu (report.js matchStatsHtml) beze změny", () => check("matchStats"));
test("souhrnné statistiky (stats.js) beze změny", () => check("stats"));
test("CSV vývoje zápasu a střídání beze změny (byte po bytu)", () => { check("csvTimeline"); check("csvShifts"); });
test("CSV soupisky beze změny (byte po bytu)", () => check("csvRoster"));
test("CSV pokladny – pohyby, předpisy, měsíce – beze změny (byte po bytu)", () => check("csvMoney"));
test("zápasy proti soupeři (vsOf → matchesVs) beze změny", () => check("matchesVs"));
test("variabilní symbol (vsOf → vsHash, personVs, uniqVs) beze změny", () => { check("vsHash"); check("personVs"); check("uniqVs"); });

// Potvrzení druhým klepnutím (Měsíce → smazání příspěvku): 1. klepnutí jen označí, 2. provede, po 4 s se označení zruší
test("potvrzení druhým klepnutím: označí, po 4 s vrátí, druhé klepnutí provede", () => {
  mock.timers.enable({apis: ["setTimeout"]});
  try {
    cashData();
    S.cf = null;
    const db = recDb(); S.db = db;
    const x = S.ch[0], b = {dataset: {mcd: x.id}, onclick: null};
    bindMoney(fakeRoot({"[data-mcd]": [b]}));
    b.onclick();
    assert.equal(S.cf, "mcd" + x.id, "první klepnutí jen označí");
    assert.equal(db.ops.length, 0, "první klepnutí nic nezapíše");
    mock.timers.tick(3999);
    assert.equal(S.cf, "mcd" + x.id, "označení trvá 4 s");
    mock.timers.tick(1);
    assert.equal(S.cf, null, "po 4 s se označení zruší");
    b.onclick();
    b.onclick();
    assert.equal(S.cf, null, "po provedení není nic označeno");
    const res = noTs(db.ops);
    out.confirm = res;
    check("confirm");
    mock.timers.tick(5000);
    assert.equal(db.ops.length, res.length, "po provedení už časovač nic nedělá");
  } finally { mock.timers.reset(); }
});
