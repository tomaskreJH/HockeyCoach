// Testy 🕘 zpětné změny způsobu placení (src/domain/cash.js grpHRange, grpSpans) a dopadu v rozsahu měsíců (requests.js impactOf until).
import test from "node:test";
import assert from "node:assert/strict";
import {grpAt, grpHRange, grpSpans} from "../src/domain/cash.js";
import {impactOf} from "../src/domain/requests.js";

// ===== Pomocná data =====
const P0 = {id: "p1", grp: "monthly"};                                          // bez historie, příspěvek
const PH = {id: "p2", grp: "monthly", grpH: [{ym: "", grp: "single"}, {ym: "2026-09", grp: "monthly"}, {ym: "2026-12", grp: "single"}]};

// ===== Rozsah měsíců =====
test("grpHRange: jeden měsíc zpětně Za událost, pak zpět Příspěvek", () => {
  const h = grpHRange(P0, "single", "2026-09", "2026-09");
  assert.deepEqual(h, [{ym: "", grp: "monthly"}, {ym: "2026-09", grp: "single"}, {ym: "2026-10", grp: "monthly"}]);
  assert.equal(grpAt({grpH: h}, "2026-08-15"), "monthly");
  assert.equal(grpAt({grpH: h}, "2026-09-20"), "single");
  assert.equal(grpAt({grpH: h}, "2026-10-01"), "monthly");
});
test("grpHRange: rozsah uvnitř historie zachová pozdější změny, po rozsahu vrátí tehdejší způsob", () => {
  const h = grpHRange(PH, "single", "2026-09", "2026-10");
  assert.deepEqual(h, [{ym: "", grp: "single"}, {ym: "2026-11", grp: "monthly"}, {ym: "2026-12", grp: "single"}], "září–říjen splyne se začátkem");
  assert.equal(grpAt({grpH: h}, "2026-11"), "monthly");
});
test("grpHRange: trvale zruší pozdější změny; chybné měsíce = null", () => {
  assert.deepEqual(grpHRange(PH, "monthly", "2026-10", ""), [{ym: "", grp: "single"}, {ym: "2026-09", grp: "monthly"}]);
  assert.equal(grpHRange(P0, "single", "2026-10", "2026-09"), null);
  assert.equal(grpHRange(P0, "single", "x", ""), null);
});
test("grpSpans: úseky pro zobrazení", () => {
  assert.deepEqual(grpSpans(P0), [{from: "", to: "", grp: "monthly"}]);
  assert.deepEqual(grpSpans(PH), [{from: "", to: "2026-08", grp: "single"}, {from: "2026-09", to: "2026-11", grp: "monthly"}, {from: "2026-12", to: "", grp: "single"}]);
});
test("impactOf: s until jen příspěvky a vyúčtování v rozsahu měsíců", () => {
  const ch = [{id: "a", mid: "p1", kind: "contrib", eid: "c_2026-09", amt: 400, paid: 0}, {id: "b", mid: "p1", kind: "contrib", eid: "c_2026-10", amt: 400, paid: 400}];
  const ev = [{id: "e1", title: "T", date: "2026-09-10", settled: true, went: true}, {id: "e2", title: "T", date: "2026-10-10", settled: true, went: true}];
  const im = impactOf({mid: "p1", ym: "2026-09", until: "2026-09"}, ch, ev);
  assert.deepEqual(im.contribs.map(x => x.id), ["a"]);
  assert.deepEqual(im.settled.map(e => e.id), ["e1"]);
  assert.equal(impactOf({mid: "p1", ym: "2026-09"}, ch, ev).contribs.length, 2, "bez until od měsíce dál");
});
