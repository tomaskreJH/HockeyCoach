// Testy úvodního přehledu 🏠 Domů (domain/home-summary.js): období příštích 7 dní, příští zápas, nadcházející události s odpovědí,
// stav mých plateb, souhrn pokladny týmu, varování cashflow a běžící zápas. Čisté funkce – nic se nezapisuje.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {flowWarn, homeItems, liveMatch, myAnswer, myPay, nextMatch, regClosed, teamPay, unanswered, upcomingEvents, daysRange} from "../src/domain/home-summary.js";

// ===== Konstanty =====
const TODAY = "2026-10-21";                                      // středa
const NOW = new Date("2026-10-21T12:00:00").getTime();
const EV = [
  {id: "t1", title: "Trénink", date: "2026-10-19", time: "18:00"},   // pondělí (uplynulý)
  {id: "t2", title: "Trénink", date: "2026-10-23", time: "18:00", dl: "2026-10-22T18:00"},
  {id: "t3", title: "Trénink", date: "2026-10-27", time: "18:00"}    // příští týden
];
const MA = [
  {id: "m0", opp: "Dnešní ráno", date: "2026-10-21", time: "09:00", home: true},
  {id: "m1", opp: "Lvice", date: "2026-10-25", time: "17:30", home: false, dl: "2026-10-24T18:00"},
  {id: "m2", opp: "Kočky", date: "2026-11-02", time: "10:00", home: true},
  {id: "m3", opp: "Staré", date: "2026-10-10", closed: true}
];
const AT = [{eid: "t2", pid: "p1", st: "yes"}, {eid: "t2", pid: "p2", st: "yes"}, {eid: "m1", pid: "p2", st: "no"}];

// ===== Události =====
test("daysRange: dnes a dalších 6 dní (i přes konec měsíce)", () => {
  assert.deepEqual(daysRange(TODAY), {from: "2026-10-21", to: "2026-10-27"});
  assert.deepEqual(daysRange("2026-10-28"), {from: "2026-10-28", to: "2026-11-03"});
  assert.deepEqual(daysRange("2026-12-30", 3), {from: "2026-12-30", to: "2027-01-01"});
});

test("nextMatch: nejbližší neuzavřený zápas, dnešní jen do svého začátku, běžící se přeskočí", () => {
  const items = homeItems(EV, MA);
  assert.equal(nextMatch(items, NOW, TODAY).id, "m1", "dnešní zápas v 9:00 už začal");
  assert.equal(nextMatch(items, new Date("2026-10-21T08:00:00").getTime(), TODAY).id, "m0");
  assert.equal(nextMatch(homeItems([], [{...MA[1], live: {per: 1}}, MA[2]]), NOW, TODAY).id, "m2", "zahájený zápas není „příští“");
  assert.equal(nextMatch(homeItems(EV, [MA[3]]), NOW, TODAY), null);
});

test("upcomingEvents: příštích 7 dní bez uplynulých, s mojí odpovědí, počtem Jdu a uzávěrkou; ❓ jen otevřené bez odpovědi", () => {
  const w = upcomingEvents(homeItems(EV, MA), AT, "p1", NOW, TODAY);
  assert.deepEqual(w.map(e => e.id), ["t2", "m1", "t3"], "t1 (pondělí) a m0 (dnes 9:00) už proběhly, m2 je za 12 dní");
  const t2 = w.find(e => e.id === "t2"), m1 = w.find(e => e.id === "m1");
  assert.equal(t2.ans, "yes"); assert.equal(t2.going, 2); assert.equal(t2.locked, false);
  assert.equal(m1.ans, null); assert.equal(m1.type, "match"); assert.equal(m1.home, false);
  assert.ok(w.every(e => !e.past));
  assert.equal(unanswered(w), 2, "m1 a t3 bez odpovědi, t2 má odpověď");
  const early = upcomingEvents(homeItems(EV, MA), AT, "p1", new Date("2026-10-21T08:00:00").getTime(), TODAY);
  assert.equal(early[0].id, "m0", "dnešní zápas do svého začátku zůstává");
  const nt = upcomingEvents(homeItems([{id: "x", date: TODAY}], []), AT, "p1", NOW, TODAY);
  assert.deepEqual(nt.map(e => e.id), ["x"], "dnešní událost bez času zůstává celý den");
  const wl = upcomingEvents(homeItems([], [{...MA[1], live: {per: 1}}, {...MA[1], id: "mc", closed: true}]), AT, "p1", NOW, TODAY);
  assert.deepEqual(wl, [], "běžící (karta 🔴) a uzavřený zápas se v seznamu nezobrazí");
  assert.equal(myAnswer(AT, "m1", "p2"), "no");
  assert.equal(myAnswer(AT, "m1", null), null, "trenér bez propojení nemá vlastní odpověď");
  assert.equal(regClosed({date: "2026-10-23", dl: "2026-10-21T10:00"}, NOW, TODAY), true, "po termínu přihlašování");
});

// ===== Platby =====
test("myPay: žádný předpis / vše zaplaceno / k úhradě / po splatnosti (výjimka neblokuje)", () => {
  const now = Date.now(), fut = new Date(now + 5 * 864e5).toISOString(), past = new Date(now - 5 * 864e5).toISOString();
  assert.equal(myPay([], ["p1"], now).state, "none");
  assert.equal(myPay([{mid: "p1", amt: 200, paid: 200, due: past}], ["p1"], now).state, "ok");
  const due = myPay([{mid: "p1", amt: 200, paid: 50, due: fut}, {mid: "p2", amt: 999, paid: 0, due: past}], ["p1"], now);
  assert.deepEqual([due.state, due.debt, due.over, due.blocked, due.next], ["due", 150, 0, false, fut]);
  const over = myPay([{mid: "p1", amt: 300, paid: 0, due: past}, {mid: "p1", amt: 100, paid: 0, due: fut}], ["p1"], now);
  assert.deepEqual([over.state, over.debt, over.over, over.blocked, over.next, over.n], ["over", 400, 300, true, fut, 2]);
  assert.equal(myPay([{mid: "p1", amt: 300, paid: 0, due: past, exc: true}], ["p1"], now).blocked, false, "výjimka od pokladníka");
});

test("teamPay: nezaplaceno, po splatnosti (částka a počet dlužníků), otevřené žádosti", () => {
  const ch = [{mid: "a", amt: 200, paid: 0, due: "2026-10-01T23:59"}, {mid: "a", amt: 100, paid: 0, due: "2026-10-05T23:59"},
    {mid: "b", amt: 150, paid: 50, due: "2026-11-30T23:59"}, {mid: "c", amt: 80, paid: 80, due: "2026-10-01T23:59"}];
  const rq = [{st: "open", at: "1"}, {st: "ok", at: "2"}, {st: "open", at: "3"}];
  assert.deepEqual(teamPay(ch, rq, NOW), {unpaid: 400, over: 300, debtors: 1, reqs: 2});
  assert.deepEqual(teamPay([], [], NOW), {unpaid: 0, over: 0, debtors: 0, reqs: 0});
});

test("flowWarn: první měsíc pod rezervou / pod nulou z cashflow, jinak null", () => {
  assert.equal(flowWarn(null), null);
  assert.equal(flowWarn({first: null, res: 5000}), null);
  assert.deepEqual(flowWarn({first: {ym: "2027-01", bal: 3000}, res: 5000}), {ym: "2027-01", bal: 3000, neg: false, res: 5000});
  assert.equal(flowWarn({first: {ym: "2027-02", bal: -200}, res: 0}).neg, true);
});

// ===== Živý zápis =====
test("liveMatch: zahájený neuzavřený zápas se skóre a třetinou; uzavřený a nezahájený ne", () => {
  const ev = [{k: "G", team: "us"}, {k: "G", team: "us"}, {k: "G", team: "opp"}, {k: "S", team: "us"}];
  assert.equal(liveMatch([{id: "x", live: {per: 2}, closed: true}, {id: "y"}]), null);
  assert.deepEqual(liveMatch([{id: "x", opp: "Lvice", home: true, events: ev, live: {per: 2, running: true}}]),
    {id: "x", opp: "Lvice", home: true, us: 2, them: 1, per: 2, perText: "2. třetina", running: true, ended: false});
  assert.equal(liveMatch([{id: "x", events: [], live: {per: 4}}]).perText, "Prodloužení");
  assert.equal(liveMatch([{id: "x", events: [], live: {per: 3}, end: {per: 3}}]).perText, "Konec zápasu");
});
