// Testy oznámení o žádostech (functions/logic.js, functions/core.js): kdo žádost oznámí, komu, co se do oznámení nedostane a pojistky.
// Struktura: Importy -> Falešné úložiště -> Rozpoznání nové žádosti -> Texty -> Příjemci -> Žádost o přijetí -> Žádost o změnu účasti.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {LIMITS, REQUEST_ROLES} from "../functions/config.js";
import {handleAttRequest, handleJoinRequest} from "../functions/core.js";
import {attIsNew, attReqText, joinIsNew, joinText, requestRecipients} from "../functions/logic.js";

// ===== Falešné úložiště =====
const NOW = Date.UTC(2026, 10, 12, 15, 30);
const TOK = n => "t".repeat(25) + n;
const DEVS = [
  {id: "d1", tok: TOK(1), email: "manager@x.cz", pid: "", tid: "t0", at: 1},
  {id: "d2", tok: TOK(2), email: "trener@x.cz", pid: "", tid: "t1", at: 1},
  {id: "d3", tok: TOK(3), email: "hracka@x.cz", pid: "p1", tid: "", at: 1},
  {id: "d4", tok: TOK(4), email: "trener@x.cz", pid: "", tid: "t1", at: 1}
];
const ROLE = {"manager@x.cz": "manager", "trener@x.cz": "trener", "asistent@x.cz": "asistent", "hracka@x.cz": "hracka"};
function make(o = {}) {
  const calls = {sent: [], dropped: [], reads: [], roles: null};
  const claims = new Set(), used = {day: o.used || 0};
  const rd = n => calls.reads.push(n);
  const store = {
    settings: async () => { rd("settings"); return {on: o.on !== false}; },
    claim: async k => { rd("claim"); if (claims.has(k)) return false; claims.add(k); return true; },
    staffEmails: async roles => { rd("staffEmails"); calls.roles = roles; return Object.keys(ROLE).filter(e => roles.includes(ROLE[e])); },
    devicesOf: async emails => { rd("devicesOf"); return (o.devs || DEVS).filter(d => emails.includes(d.email)); },
    memberName: async mid => { rd("memberName"); return mid === "p1" ? "Anna" : ""; },
    eventOf: async eid => { rd("eventOf"); return eid === "e1" ? {coll: "events", data: {title: "Trénink", date: "2026-11-16", time: "17:00"}} : eid === "m1" ? {coll: "matches", data: {opp: "Lvice", date: "2026-11-21", time: "10:00"}} : null; },
    reserve: async (d, want, cap) => { rd("reserve"); const ok = Math.max(0, Math.min(want, cap - used.day)); used.day += ok; return ok; },
    dropDevices: async ids => { calls.dropped.push(...ids); }
  };
  const push = {send: async (devs, msg, opt) => { calls.sent.push({ids: devs.map(d => d.id), msg, opt}); return {sent: devs.length, bad: o.bad || []}; }};
  return {ctx: {store, push, now: () => NOW, log: {info() {}, warn: () => { calls.warned = true; }}}, calls, used};
}
const JOIN = {email: "nova@x.cz", nick: "Kačka", num: "9", kind: "hracka", note: "tajná poznámka", st: "open", at: "2026-11-12T15:00:00Z"};
const ATT = {kind: "att", mid: "p1", by: "hracka@x.cz", at: "2026-11-12T15:00:00Z", st: "open", eid: "e1", want: "no", reason: "mám angínu"};

// ===== Rozpoznání nové žádosti =====
test("joinIsNew: vznik a nové podání po vyřízení ano; vyřízení, smazání a otevřená beze změny ne", () => {
  assert.equal(joinIsNew(null, JOIN), true);
  assert.equal(joinIsNew({...JOIN, st: "no"}, JOIN), true, "nová žádost po zamítnutí");
  assert.equal(joinIsNew(JOIN, {...JOIN, st: "ok"}), false, "přijetí managerem");
  assert.equal(joinIsNew(JOIN, {...JOIN, st: "no", reply: "x"}), false, "zamítnutí managerem");
  assert.equal(joinIsNew(JOIN, null), false, "smazání");
  assert.equal(joinIsNew(JOIN, {...JOIN, note: "jiná"}), false, "úprava otevřené žádosti");
});

test("attIsNew: jen otevřená žádost o změnu účasti s obyčejnými id; žádost o placení ne", () => {
  assert.equal(attIsNew(ATT), true);
  assert.equal(attIsNew({...ATT, kind: "pay"}), false);
  assert.equal(attIsNew({...ATT, st: "ok"}), false);
  assert.equal(attIsNew({...ATT, eid: "a/b"}), false, "id s lomítkem by byla cesta jinam");
  assert.equal(attIsNew({...ATT, mid: ""}), false);
  assert.equal(attIsNew(null), false);
});

// ===== Texty =====
test("joinText: kdo žádá a kde se vyřídí; poznámka žadatele v oznámení není", () => {
  const t = joinText(JOIN, "nova@x.cz");
  assert.match(t.title, /žádost o přijetí/i);
  assert.match(t.body, /Kačka \(hráčka\)/);
  assert.match(t.body, /Tým a členové/);
  assert.ok(!t.body.includes("tajná"));
  assert.match(joinText({...JOIN, kind: "staff"}, "x").body, /realizační tým/);
  assert.equal(joinText({...JOIN}, "abc").tag, "join_abc");
});

test("attReqText: kdo, na co, která událost; důvod (zdravotní údaj) v oznámení není", () => {
  const t = attReqText(ATT, "Anna", {title: "Trénink", date: "2026-11-16", time: "17:00"}, false, "r1");
  assert.match(t.title, /změnu účasti/);
  assert.match(t.body, /Anna/);
  assert.match(t.body, /❌ Nejdu/);
  assert.match(t.body, /Trénink Po 16\. 11\. 17:00/);
  assert.match(t.body, /dosavadní odpověď/);
  assert.ok(!t.body.includes("angínu"));
  assert.equal(t.tag, "req_r1");
  assert.match(attReqText({...ATT, want: "yes"}, "Anna", {opp: "Lvice", date: "2026-11-21", time: "10:00"}, true, "r2").body, /✅ Jdu · Zápas – Lvice/);
  assert.match(attReqText(ATT, "", null, false, "r3").body, /^Člen týmu žádá.*událost\./, "bez jména a události se text nerozpadne");
});

// ===== Příjemci =====
test("requestRecipients: zařízení účtů s rolí, bez zařízení žadatele; velikost písmen e-mailu nevadí", () => {
  assert.deepEqual(requestRecipients(DEVS, ["manager@x.cz", "trener@x.cz"], "").map(d => d.id), ["d1", "d2", "d4"]);
  assert.deepEqual(requestRecipients(DEVS, ["Manager@x.cz", "trener@x.cz"], "TRENER@x.cz").map(d => d.id), ["d1"], "žadatel sám oznámení nedostane");
  assert.deepEqual(requestRecipients(DEVS, [], ""), []);
});

test("role: přijetí jen manager, změna účasti manager + trenér (ne asistent, ne hráčka)", () => {
  assert.deepEqual(REQUEST_ROLES.join, ["manager"]);
  assert.deepEqual(REQUEST_ROLES.att, ["manager", "trener"]);
});

// ===== Žádost o přijetí =====
test("přijetí do týmu: oznámení dostane jen manager, jedno odeslání s platností 24 h", async () => {
  const m = make();
  const r = await handleJoinRequest(m.ctx, {id: "nova@x.cz", before: null, after: JOIN, eventId: "w1"});
  assert.equal(r.r, "sent");
  assert.deepEqual(m.calls.roles, ["manager"]);
  assert.deepEqual(m.calls.sent[0].ids, ["d1"]);
  assert.equal(m.calls.sent[0].opt.ttl, LIMITS.TTL_REQUEST_S);
});

test("vyřízení žádosti managerem oznámení nespustí a nic se nečte", async () => {
  const m = make();
  const r = await handleJoinRequest(m.ctx, {id: "nova@x.cz", before: JOIN, after: {...JOIN, st: "ok"}, eventId: "w2"});
  assert.equal(r.r, "none");
  assert.deepEqual(m.calls.reads, []);
});

test("STOP: při vypnutých notifikacích se čte jen vypínač a nic neodejde", async () => {
  const m = make({on: false});
  assert.equal((await handleJoinRequest(m.ctx, {id: "n", before: null, after: JOIN, eventId: "w3"})).r, "off");
  assert.deepEqual(m.calls.reads, ["settings"]);
  assert.equal(m.calls.sent.length, 0);
});

test("dedupe: stejný zápis (opakované doručení) se oznámí jen jednou", async () => {
  const m = make();
  assert.equal((await handleJoinRequest(m.ctx, {id: "n", before: null, after: JOIN, eventId: "w4"})).r, "sent");
  assert.equal((await handleJoinRequest(m.ctx, {id: "n", before: null, after: JOIN, eventId: "w4"})).r, "dup");
  assert.equal(m.calls.sent.length, 1);
});

test("nový podání po zamítnutí je nová žádost a oznámí se znovu", async () => {
  const m = make();
  assert.equal((await handleJoinRequest(m.ctx, {id: "n", before: null, after: JOIN, eventId: "w5"})).r, "sent");
  assert.equal((await handleJoinRequest(m.ctx, {id: "n", before: {...JOIN, st: "no"}, after: JOIN, eventId: "w6"})).r, "sent");
  assert.equal(m.calls.sent.length, 2);
});

test("manager bez zařízení s notifikacemi: nic neodejde, bez chyby", async () => {
  const m = make({devs: [DEVS[1]]});
  assert.equal((await handleJoinRequest(m.ctx, {id: "n", before: null, after: JOIN, eventId: "w7"})).r, "nodevices");
  assert.equal(m.calls.sent.length, 0);
});

// ===== Žádost o změnu účasti =====
test("změna účasti: dostane manager a oba telefony trenéra, žadatelka ne; text se jménem a událostí", async () => {
  const m = make();
  const r = await handleAttRequest(m.ctx, {id: "r1", doc: ATT});
  assert.equal(r.r, "sent");
  assert.deepEqual(m.calls.roles, ["manager", "trener"]);
  assert.deepEqual(m.calls.sent[0].ids, ["d1", "d2", "d4"]);
  assert.match(m.calls.sent[0].msg.body, /Anna žádá po uzávěrce o změnu na ❌ Nejdu · Trénink Po 16\. 11\. 17:00/);
});

test("změna účasti u zápasu: v textu je zápas se soupeřem", async () => {
  const m = make();
  await handleAttRequest(m.ctx, {id: "r2", doc: {...ATT, eid: "m1", want: "maybe"}});
  assert.match(m.calls.sent[0].msg.body, /❓ Nejsem jistý · Zápas – Lvice/);
});

test("žádost, kterou podal sám trenér: jeho zařízení oznámení nedostanou", async () => {
  const m = make();
  const r = await handleAttRequest(m.ctx, {id: "r3", doc: {...ATT, mid: "t1", by: "trener@x.cz"}});
  assert.equal(r.r, "sent");
  assert.deepEqual(m.calls.sent[0].ids, ["d1"]);
});

test("žádost o placení a vyřízená žádost: konec hned, bez čtení", async () => {
  const m = make();
  assert.equal((await handleAttRequest(m.ctx, {id: "r4", doc: {...ATT, kind: "pay"}})).r, "none");
  assert.equal((await handleAttRequest(m.ctx, {id: "r5", doc: {...ATT, st: "ok"}})).r, "none");
  assert.deepEqual(m.calls.reads, []);
});

test("denní strop: po vyčerpání se oznámení o žádosti neposílá a zaloguje se varování", async () => {
  const m = make({used: LIMITS.DAY_CAP});
  const r = await handleAttRequest(m.ctx, {id: "r6", doc: ATT});
  assert.equal(r.r, "capped");
  assert.equal(m.calls.sent.length, 0);
  assert.equal(m.calls.warned, true);
});

test("zrušený token: zařízení se smaže, oznámení odešlo", async () => {
  const m = make({bad: ["d2"]});
  const r = await handleAttRequest(m.ctx, {id: "r7", doc: ATT});
  assert.equal(r.dropped, 1);
  assert.deepEqual(m.calls.dropped, ["d2"]);
});

test("jméno a text se čtou až po nalezení příjemců (bez zařízení žádné čtení navíc)", async () => {
  const m = make({devs: []});
  assert.equal((await handleAttRequest(m.ctx, {id: "r8", doc: ATT})).r, "nodevices");
  assert.ok(!m.calls.reads.includes("memberName") && !m.calls.reads.includes("eventOf"));
});
