// Testy žádosti o změnu placení: historie způsobu placení grpH (domain/cash.js grpAt, asOf, grpHWith, contribRows podle měsíce),
// porovnání po měsících s historií (domain/economy.js) a žádosti (domain/requests.js). Hráčky bez grpH se počítají jako dřív.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {asOf, calcCash, cashCfg, contribEid, contribRows, grpAt, grpHWith, grpKey, grpOf, ymNow} from "../src/domain/cash.js";
import {compareMonths} from "../src/domain/economy.js";
import {decidePlan, impactOf, openReq, openReqs, payReqDoc, payReqError, reqYms} from "../src/domain/requests.js";

// ===== Konstanty =====
const W = (m, s, x) => ({monthly: {pays: m, mode: "calc", flat: 0}, single: {pays: s, mode: "calc", flat: 0}, exempt: {pays: x, mode: "calc", flat: 0}});
// Jana: do října příspěvek, od listopadu 2026 za událost
const JANA = {id: "j", name: "Jana", grp: "monthly", fx: 1, ex: false, grpH: [{ym: "", grp: "monthly"}, {ym: "2026-11", grp: "single"}]};

// ===== Historie způsobu placení =====
test("grpAt / grpOf: skupina podle měsíce; bez historie pole grp (beze změny proti dřívějšku)", () => {
  assert.equal(grpAt(JANA, "2026-10-31"), "monthly");
  assert.equal(grpAt(JANA, "2026-11-01"), "single");
  assert.equal(grpAt(JANA, "2027-03"), "single");
  assert.equal(grpAt({grp: "single"}, "2020-01-01"), "single");
  assert.equal(grpAt({}, "2026-11"), "monthly");
  assert.equal(grpOf({grp: "single"}), "single");
  assert.equal(grpOf({grp: "monthly", grpH: [{ym: "", grp: "single"}]}), "single", "s historií rozhoduje historie");
  assert.equal(grpKey({...JANA, ex: true}), "exempt", "osvobozená zůstává osvobozená");
});

test("asOf + calcCash: vyúčtování podle data události; calcCash a hráčky bez historie beze změny", () => {
  const P = [JANA, {id: "e", grp: "monthly", fx: 1, ex: false}, {id: "s", grp: "single", fx: 0.5, ex: false}];
  const c = {cost: [{amt: 900}], who: W(false, true, false)};
  const oct = calcCash(c, asOf(P, "2026-10-20")), nov = calcCash(c, asOf(P, "2026-11-04"));
  assert.deepEqual(oct.payers.map(l => [l.pid, l.amt]), [["s", 150]], "v říjnu Jana s příspěvkem neplatí");
  assert.deepEqual(nov.payers.map(l => [l.pid, l.amt]), [["j", 300], ["s", 150]], "v listopadu platí za událost");
  assert.equal(nov.N, 3, "dělitel se změnou skupiny nemění");
  const plain = P.slice(1);
  assert.equal(asOf(plain, "2026-11-04")[0], plain[0], "hráčka bez historie je tentýž objekt");
  assert.ok(!("grpH" in asOf(P, "2026-11-04")[0]), "kopie bez historie");
  assert.equal(JANA.grp, "monthly", "vstup se nemění");
});

test("contribRows podle měsíce příspěvku", () => {
  const cfg = cashCfg({contrib: 500});
  assert.deepEqual(contribRows([JANA], cfg, {}, "2026-10").map(r => r.pid), ["j"]);
  assert.deepEqual(contribRows([JANA], cfg, {}, "2026-11").map(r => r.pid), []);
  assert.deepEqual(contribRows([{id: "a", name: "A", grp: "monthly"}], cfg, {}).map(r => r.amt), [500], "bez měsíce jako dřív");
});

test("grpHWith: výchozí záznam, náhrada stejného měsíce, řazení", () => {
  assert.deepEqual(grpHWith({grp: "monthly"}, "single", "2026-12"), [{ym: "", grp: "monthly"}, {ym: "2026-12", grp: "single"}]);
  assert.deepEqual(grpHWith(JANA, "monthly", "2026-11"), [{ym: "", grp: "monthly"}, {ym: "2026-11", grp: "monthly"}]);
  assert.deepEqual(grpHWith(JANA, "monthly", "2027-02").map(e => e.ym), ["", "2026-11", "2027-02"]);
});

test("compareMonths s historií: každý měsíc proti druhému způsobu toho měsíce", () => {
  const mm = {season: {from: "2026-08-01", to: "2027-07-01"}, months: [{ym: "2026-11", amt: 300}, {ym: "2026-10", amt: 500}]};
  const pr = [{id: "t1", ym: "2026-10", head: {monthly: 0, single: 300}}, {id: "t2", ym: "2026-11", head: {monthly: 0, single: 300}}];
  const me = {...JANA, grpH: [{ym: "", grp: "monthly"}, {ym: "2026-11", grp: "single"}]};
  const r = compareMonths(me, mm, pr, () => true, 500, "2026-11");
  assert.deepEqual(r.rows.map(x => [x.ym, x.grp, x.act, x.alt]), [["2026-11", "single", 300, 500], ["2026-10", "monthly", 500, 300]]);
  assert.equal(r.mixed, true);
});

// ===== Žádosti =====
const NOW = "2026-10";
test("payReqError: jen od příštího měsíce, jiný způsob, jedna otevřená žádost, ne osvobozená", () => {
  const p = {id: "a", grp: "monthly", fx: 1, ex: false};
  assert.equal(payReqError(p, "single", "2026-11", NOW, []), null);
  assert.match(payReqError(p, "single", "2026-10", NOW, []), /příštího/);
  assert.match(payReqError(p, "single", "2027-06", NOW, []), /nejvýše 6/);
  assert.match(payReqError(p, "monthly", "2026-11", NOW, []), /už platíš/);
  assert.match(payReqError(p, "single", "2026-11", NOW, [{mid: "a", kind: "pay", st: "open", at: "x"}]), /otevřenou/);
  assert.equal(payReqError(p, "single", "2026-11", NOW, [{mid: "a", kind: "pay", st: "no", at: "x"}]), null, "vyřízená nevadí");
  assert.match(payReqError({...p, ex: true}, "single", "2026-11", NOW, []), /Osvobozená/);
  assert.match(payReqError(null, "single", "2026-11", NOW, []), /propojen/);
  assert.deepEqual(reqYms("2026-11").slice(0, 3), ["2026-12", "2027-01", "2027-02"]);
});

test("payReqDoc, openReq / openReqs", () => {
  const d = payReqDoc({id: "a", grp: "monthly"}, "single", "2026-11", "  Chodím jen občas  ", "Jana@X.cz", "2026-10-23T10:00:00Z");
  assert.deepEqual(d, {kind: "pay", mid: "a", at: "2026-10-23T10:00:00Z", by: "jana@x.cz", st: "open", from: "monthly", to: "single", ym: "2026-11", note: "Chodím jen občas"});
  const rs = [{id: "1", mid: "a", kind: "pay", st: "ok", at: "2026-09"}, {id: "2", mid: "a", kind: "pay", st: "open", at: "2026-10"}, {id: "3", mid: "b", kind: "att", st: "open", at: "2026-08"}];
  assert.equal(openReq(rs, "a", "pay").id, "2");
  assert.equal(openReq(rs, "b", "pay"), null);
  assert.deepEqual(openReqs(rs, "pay").map(r => r.id), ["2"]);
  assert.deepEqual(openReqs(rs).map(r => r.id), ["3", "2"]);
});

test("decidePlan: schválení zapíše historii a dnešní skupinu, zamítnutí jen žádost", () => {
  const r = {mid: "a", from: "monthly", to: "single", ym: "2026-11"};
  const ok = decidePlan(r, {id: "a", grp: "monthly"}, true, "OK", "Pokl@x.cz", "T", "2026-10");
  assert.deepEqual(ok.req, {st: "ok", reply: "OK", doneBy: "pokl@x.cz", doneAt: "T"});
  assert.deepEqual(ok.pay, {grpH: [{ym: "", grp: "monthly"}, {ym: "2026-11", grp: "single"}], grp: "monthly"}, "do konce října dál příspěvek");
  assert.equal(decidePlan(r, {id: "a", grp: "monthly"}, true, "", "x", "T", "2026-11").pay.grp, "single");
  const no = decidePlan(r, {id: "a"}, false, "Až od ledna", "x", "T", "2026-10");
  assert.equal(no.req.st, "no");
  assert.equal(no.pay, null);
});

test("impactOf: vystavené příspěvky a uzavřená vyúčtování od měsíce změny", () => {
  const ch = [
    {id: "c1", mid: "a", kind: "contrib", eid: contribEid("2026-10"), amt: 500, paid: 500},
    {id: "c2", mid: "a", kind: "contrib", eid: contribEid("2026-11"), amt: 500, paid: 0},
    {id: "c3", mid: "b", kind: "contrib", eid: contribEid("2026-11"), amt: 500, paid: 0}
  ];
  const ev = [{id: "t1", date: "2026-10-30", settled: true, went: true}, {id: "t2", date: "2026-11-04", settled: true, went: true},
    {id: "t3", date: "2026-11-11", settled: false, went: true}, {id: "t4", date: "2026-11-18", settled: true, went: false}];
  const r = impactOf({mid: "a", ym: "2026-11"}, ch, ev);
  assert.deepEqual(r.contribs, [{id: "c2", ym: "2026-11", amt: 500, rest: 500}]);
  assert.deepEqual(r.settled.map(e => e.id), ["t2"]);
  assert.match(ymNow(), /^\d{4}-\d{2}$/);
});

// ===== Pravidla databáze (kontrola textu) =====
test("pravidla: requests – hráčka jen vlastní otevřenou žádost o placení, vyřizuje správce pokladny (ne vlastní); účast trenér / kustod; plpay dovolí grpH", async () => {
  const {readFileSync} = await import("node:fs");
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const i = rules.indexOf("match /requests/{id}"), b = rules.slice(i, rules.indexOf("\n    }", i));
  assert.ok(i > 0, "pravidlo pro requests");
  assert.match(b, /allow read: if isCash\(\) \|\| ownsMid\(resource\.data\.mid\) \|\| \(isStaff\(\) && resource\.data\.kind == 'att'\);/);
  assert.match(b, /allow create: if \(isPlayer\(\) && reqPayOk\(request\.resource\.data\)\) \|\| reqAttOk\(request\.resource\.data\);/);
  assert.match(b, /\(isCash\(\) && resource\.data\.kind == 'pay' && !ownsMid\(resource\.data\.mid\) && reqDone\(\)\)/);
  assert.match(b, /\(isStaff\(\) && resource\.data\.kind == 'att' && reqDone\(\)\)/);
  assert.match(b, /allow delete: if isCash\(\) \|\| \(isStaff\(\) && resource\.data\.kind == 'att'\) \|\| \(ownsMid\(resource\.data\.mid\) && resource\.data\.st == 'open'\);/);
  assert.match(rules, /d\.kind == 'att' && d\.st == 'open' && ownsMid\(d\.mid\) && d\.by == mail\(\)/);
  assert.match(rules, /d\.kind == 'pay' && d\.st == 'open' && d\.mid == myPid\(\) && d\.by == mail\(\)/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\['st', 'reply', 'doneBy', 'doneAt'\]\)/);
  assert.match(rules, /hasOnly\(\['grp', 'fx', 'ex', 'note', 'grpH'\]\)/);
});
