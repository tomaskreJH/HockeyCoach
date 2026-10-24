// Testy žádostí o změnu účasti (domain/att-requests.js) a 🏖 nepřítomnosti (domain/absence.js): kdy lze žádat, vyřízení,
// náhled uložení nepřítomnosti, automatická omluva pro později založené události, vrácení omluv a pravidla databáze.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ABS_KINDS, absAuto, absDoc, absError, absPlan, absReason, absRevert, activeAbs} from "../src/domain/absence.js";
import {attDecidePlan, attReqDoc, attReqError, openAttReq, openAttReqs} from "../src/domain/att-requests.js";
import {teamPay} from "../src/domain/home-summary.js";

// ===== Konstanty =====
const TODAY = "2026-10-24", NOW = new Date("2026-10-24T12:00:00").getTime();
// e1 = otevřená (uzávěrka zítra), e2 = po uzávěrce, ale ještě nezačala, e3 = už začala, e4 = zrušená
const EV = [
  {id: "e1", date: "2026-10-27", time: "18:00", dl: "2026-10-26T18:00"},
  {id: "e2", date: "2026-10-25", time: "18:00", dl: "2026-10-24T10:00"},
  {id: "e3", date: "2026-10-24", time: "10:00", dl: "2026-10-23T18:00"},
  {id: "e4", date: "2026-10-28", time: "18:00", dl: "2026-10-27T18:00", cancelled: {at: "x", reason: ""}}
];

// ===== Testy: žádosti =====
test("attReqError: jen po uzávěrce, do začátku, o jinou odpověď a jedna otevřená", () => {
  assert.match(attReqError(EV[0], "p1", "no", "yes", [], NOW, TODAY), /otevřené/);
  assert.equal(attReqError(EV[1], "p1", "no", "yes", [], NOW, TODAY), null);
  assert.match(attReqError(EV[2], "p1", "no", "yes", [], NOW, TODAY), /začala/);
  assert.match(attReqError(EV[3], "p1", "no", "yes", [], NOW, TODAY), /zrušená/);
  assert.match(attReqError(EV[1], "p1", "yes", "yes", [], NOW, TODAY), /už máš/);
  const rs = [{kind: "att", eid: "e2", mid: "p1", st: "open", at: "1"}];
  assert.match(attReqError(EV[1], "p1", "no", "yes", rs, NOW, TODAY), /otevřenou/);
  assert.equal(openAttReq(rs, "e2", "p1").at, "1");
});

test("attReqDoc / attDecidePlan: dokument žádosti a vyřízení", () => {
  const d = attReqDoc("e2", "p1", "no", " nemoc ", "A@B.cz", "T", "ab1");
  assert.deepEqual(d, {kind: "att", mid: "p1", by: "a@b.cz", at: "T", st: "open", eid: "e2", want: "no", reason: "nemoc", abs: "ab1"});
  const ok = attDecidePlan(d, true, "ok", "T@X.cz", "T2");
  assert.deepEqual(ok.req, {st: "ok", reply: "ok", doneBy: "t@x.cz", doneAt: "T2"});
  assert.deepEqual(ok.att, {st: "no", reason: "nemoc", abs: "ab1"});
  assert.equal(attDecidePlan(d, false, "", "t@x.cz", "T2").att, null);
  assert.equal(attDecidePlan({...d, want: "yes"}, true, "", "t", "T").att.reason, "", "Jdu bez důvodu");
});

test("openAttReqs a souhrn pokladny: žádosti o účast se nepočítají mezi žádosti o placení", () => {
  const rq = [{kind: "att", st: "open", at: "2"}, {kind: "pay", st: "open", at: "1"}, {kind: "att", st: "ok", at: "3"}];
  assert.deepEqual(openAttReqs(rq).map(r => r.at), ["2"]);
  assert.equal(teamPay([], rq, NOW).reqs, 1);
});

// ===== Testy: nepřítomnost =====
test("absError / absDoc / absReason / activeAbs", () => {
  const a = {mid: "p1", kind: "vac", from: "2026-10-25", to: "2026-10-28", note: "hory"};
  assert.equal(absError(a, TODAY), null);
  assert.match(absError({...a, to: "2026-10-20"}, TODAY), /před začátkem|minulosti/);
  assert.match(absError({...a, kind: "x"}, TODAY), /druh/);
  assert.match(absError({...a, to: "2027-10-28"}, TODAY), /Nejdelší/);
  assert.deepEqual(absDoc("p1", "sick", "2026-10-25", "2026-10-26", " x ", "A@B.cz", "T"), {mid: "p1", kind: "sick", from: "2026-10-25", to: "2026-10-26", note: "x", by: "a@b.cz", at: "T"});
  assert.equal(absReason(a), "Nepřítomnost: " + ABS_KINDS.vac + " 25. 10. – 28. 10. 2026 (hory)");
  assert.deepEqual(activeAbs([{...a, id: "1"}, {...a, id: "2", to: "2026-10-01"}], TODAY).map(x => x.id), ["1"]);
});

test("absPlan: otevřené → Nejdu, po uzávěrce → žádost, už Nejdu / čekající žádost beze změny, uplynulé a zrušené se nemění", () => {
  const a = {id: "ab1", mid: "p1", kind: "vac", from: "2026-10-24", to: "2026-10-28"};
  const at = [{eid: "e1", pid: "p1", st: "yes"}];
  const p = absPlan(a, EV, at, [], NOW, TODAY);
  assert.deepEqual(p.write, [{eid: "e1", prev: "yes"}]);
  assert.deepEqual(p.req, [{eid: "e2", prev: null}]);
  assert.equal(p.past, 1);
  const p2 = absPlan(a, EV, [{eid: "e1", pid: "p1", st: "no"}], [{kind: "att", eid: "e2", mid: "p1", st: "open"}], NOW, TODAY);
  assert.deepEqual(p2.keep, ["e2", "e1"]);
  assert.equal(p2.write.length + p2.req.length, 0);
});

test("absAuto / absRevert: omluva jen bez odpovědi v otevřené události; zrušení vrátí jen vlastní omluvy otevřených událostí", () => {
  const A = [{id: "ab1", mid: "p1", kind: "vac", from: "2026-10-24", to: "2026-10-28"}];
  assert.deepEqual(absAuto(A, EV, [], NOW, TODAY).map(x => x.eid), ["e1"]);
  assert.deepEqual(absAuto(A, EV, [{eid: "e1", pid: "p1", st: "yes"}], NOW, TODAY), [], "odpověď člena se nepřepíše");
  const at = [{id: "e1_p1", eid: "e1", pid: "p1", st: "no", abs: "ab1"}, {id: "e2_p1", eid: "e2", pid: "p1", st: "no", abs: "ab1"}, {id: "e1_p2", eid: "e1", pid: "p2", st: "no", abs: "ab1"}];
  assert.deepEqual(absRevert(A[0], EV, at, NOW, TODAY), ["e1_p1"]);
});

test("pravidla: žádosti o účast vyřizuje trenér / kustod, nepřítomnost čte vlastník a trenér / kustod", () => {
  const r = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const i = r.indexOf("match /absence/{id}"), b = r.slice(i, r.indexOf("\n    }", i));
  assert.ok(i > 0, "pravidlo pro absence");
  assert.match(b, /allow read: if isStaff\(\) \|\| ownsMid\(resource\.data\.mid\);/);
  assert.match(b, /allow delete: if isStaff\(\) \|\| ownsMid\(resource\.data\.mid\);/);
  assert.match(r, /d\.kind in \['vac', 'sick', 'other'\]/);
  assert.match(r, /d\.want in \['yes', 'no', 'maybe'\]/);
});
