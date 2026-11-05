// Testy v22.53: člen realizačního týmu, který je zároveň hráčkou (staff.pid) – skrytí řádku, převzetí odpovědi hráčky,
// plat za událost podle odpovědi hráčky a zdrojové kontroly napojení v zobrazení.

// ===== Importy =====
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dualPid, isDual, mirrorStaffAt, visibleStaff} from "../src/domain/dual-member.js";
import {salaryRows} from "../src/domain/cash.js";

// ===== Konstanty =====
const PL = [{id: "p1", st: "act"}, {id: "p2"}, {id: "p3", st: "inj"}, {id: "p4", st: "end"}];
const ST = [{id: "t1", name: "Jana", pid: "p1"}, {id: "t2", name: "Petr"}, {id: "t3", name: "Eva", pid: "p4"}, {id: "t4", name: "Ema", pid: "pX"}, {id: "t5", name: "Zita", pid: "p3"}];
const src = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");

// ===== Doména: propojení =====
test("dualPid: aktivní (i zraněná) hráčka = propojení platí", () => {
  assert.equal(dualPid(ST[0], PL), "p1");
  assert.equal(dualPid(ST[4], PL), "p3");
});
test("dualPid: bez pole, ukončená hráčka a neznámá hráčka = bez propojení", () => {
  assert.equal(dualPid(ST[1], PL), "");
  assert.equal(dualPid(ST[2], PL), "");
  assert.equal(dualPid(ST[3], PL), "");
  assert.equal(dualPid(null, PL), "");
  assert.equal(dualPid({id: "t9", pid: 5}, PL), "");
  assert.equal(dualPid(ST[0], null), "");
});
test("isDual a visibleStaff: skryje jen členy týmu s aktivní hráčkou", () => {
  assert.equal(isDual(ST[0], PL), true);
  assert.equal(isDual(ST[1], PL), false);
  assert.deepEqual(visibleStaff(ST, PL).map(t => t.id), ["t2", "t3", "t4"]);
  assert.deepEqual(visibleStaff(null, PL), []);
});

// ===== Doména: převzetí odpovědi =====
test("mirrorStaffAt: člen týmu dostane odpověď své hráčky, vlastní záznam se zahodí", () => {
  const at = [
    {id: "e1_p1", eid: "e1", pid: "p1", st: "yes"},
    {id: "e1_t1", eid: "e1", pid: "t1", st: "no"},
    {id: "e1_t2", eid: "e1", pid: "t2", st: "yes"},
    {id: "e2_p1", eid: "e2", pid: "p1", st: "maybe", nos: true}
  ];
  const r = mirrorStaffAt(at, ST, PL);
  const of = (eid, pid) => r.find(a => a.eid === eid && a.pid === pid);
  assert.equal(of("e1", "t1").st, "yes");
  assert.equal(of("e1", "t1").id, "e1_t1");
  assert.equal(of("e1", "p1").st, "yes");
  assert.equal(of("e1", "t2").st, "yes");                      // člen bez propojení beze změny
  assert.equal(of("e2", "t1").st, "maybe");
  assert.equal(r.filter(a => a.pid === "t1").length, 2);       // jedna odpověď na událost, ne dvě
});
test("mirrorStaffAt: hráčka bez odpovědi = člen týmu bez odpovědi (starý záznam člena se nepoužije)", () => {
  const r = mirrorStaffAt([{id: "e1_t1", eid: "e1", pid: "t1", st: "yes"}], ST, PL);
  assert.equal(r.length, 0);
});
test("mirrorStaffAt: bez propojení vrací stejné pole, vstup se nemění", () => {
  const at = [{id: "e1_t2", eid: "e1", pid: "t2", st: "yes"}];
  assert.equal(mirrorStaffAt(at, [ST[1]], PL), at);
  const before = JSON.stringify(at);
  mirrorStaffAt(at, ST, PL);
  assert.equal(JSON.stringify(at), before);
  assert.deepEqual(mirrorStaffAt(null, ST, PL), []);
});
test("mirrorStaffAt: ukončená hráčka se nepřevádí (člen týmu odpovídá sám)", () => {
  const at = [{id: "e1_t3", eid: "e1", pid: "t3", st: "yes"}, {id: "e1_p4", eid: "e1", pid: "p4", st: "no"}];
  const r = mirrorStaffAt(at, ST, PL);
  assert.equal(r.find(a => a.pid === "t3").st, "yes");
});

// ===== Plat za událost podle odpovědi hráčky =====
test("salaryRows: plat za událost propojené členky se počítá z odpovědi hráčky; 🚫 nedorazila se nepočítá", () => {
  const staff = [{id: "t1", name: "Jana", pid: "p1", pay: {m: "event", amt: 100}}];
  const evs = [{id: "e1", date: "2026-11-01"}, {id: "e2", date: "2026-11-02"}, {id: "e3", date: "2026-11-03"}];
  const at = [
    {id: "e1_p1", eid: "e1", pid: "p1", st: "yes"},
    {id: "e2_p1", eid: "e2", pid: "p1", st: "yes", nos: true},
    {id: "e3_p1", eid: "e3", pid: "p1", st: "no"},
    {id: "e3_t1", eid: "e3", pid: "t1", st: "yes"}
  ];
  const r = salaryRows(staff, "2026-11", evs, mirrorStaffAt(at, staff, PL), [], "2026-11-30");
  assert.equal(r[0].n, 1);
  assert.equal(r[0].amt, 100);
});

// ===== Zdrojové kontroly =====
test("event-core.js: docházka se čte přes mirrorStaffAt a počty trenérů přeskočí zastoupené členy", () => {
  const s = src("src/views/event-core.js");
  assert.match(s, /mirrorStaffAt\(S\.at, S\.tr, S\.pl\)/);
  assert.match(s, /isDual\(/);
});
test("event-detail.js: řádky realizačního týmu a dresy jen z viditelných členů, plán dostává všechny", () => {
  const s = src("src/views/event-detail.js");
  assert.match(s, /visibleStaff\(T, S\.pl\)/);
  assert.match(s, /tpCtx = \{ev, P, A, T,/);
});
test("attendance.js: tabulka Docházky bez členů týmu zastoupených hráčkou", () => {
  assert.match(src("src/views/attendance.js"), /visibleStaff\(/);
});
test("money.js: plat za událost se počítá z docházky s převzatými odpověďmi", () => {
  const s = src("src/views/money.js");
  assert.equal((s.match(/mirrorStaffAt\(S\.at, S\.tr, S\.pl\)/g) || []).length, 2);
});
test("modal.js: propojení hráčky se ukládá merge do staff (pole pid), jen s právem na soupisku", () => {
  const s = src("src/views/modal.js");
  assert.match(s, /merge\("staff\/"\+M\.id,\{name:n,kind:M\.kind\|\|KIND\[0\],pid:M\.pid\|\|""\}\)/);
});
