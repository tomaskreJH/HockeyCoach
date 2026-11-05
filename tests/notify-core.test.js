// Testy jádra notifikací (functions/core.js) s falešným úložištěm a odesíláním: pořadí pojistek, STOP, dedupe, limity a úklid tokenů.
// Struktura: Importy -> Falešné úložiště -> Změna události -> Uzávěrky -> Úklid.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {LIMITS} from "../functions/config.js";
import {handleChange, runCleanup, runDeadlines} from "../functions/core.js";

// ===== Falešné úložiště =====
const NOW = Date.UTC(2026, 11, 4, 16, 43);                               // 4. 12. 2026 17:43 Praha (mimo úklid)
const TOK = n => "t".repeat(25) + n;
const CAN = {by: "t@x.cz", at: "2026-12-05", reason: ""};
function make(o = {}) {
  const calls = {sent: [], dropped: [], reads: 0};
  const claims = new Set(), burst = {}, used = {day: o.used || 0};
  const store = {
    settings: async () => { calls.reads++; return {on: o.on !== false}; },
    claim: async k => { calls.reads++; if (claims.has(k)) return false; claims.add(k); return true; },
    attendance: async () => o.att || [{pid: "p1", st: "yes"}, {pid: "p2", st: "maybe"}, {pid: "p3", st: "no"}],
    devices: async () => o.devs || [{id: "d1", tok: TOK(1), pid: "p1", z: true, u: true, at: 1}, {id: "d2", tok: TOK(2), pid: "p2", z: true, u: true, at: 1},
      {id: "d3", tok: TOK(3), pid: "p3", z: true, u: true, at: 1}, {id: "d4", tok: TOK(4), pid: "p4", z: true, u: true, at: 1}],
    eventsDue: async (c) => (o.due || {})[c] || [],
    members: async () => o.ents || {p: {p1: {}, p2: {}, p3: {}, p4: {}}, t: {}},
    bumpBurst: async (h, ids) => { const out = {}; ids.forEach(id => { burst[id] = (burst[id] || 0) + (o.burstStart || 1); out[id] = burst[id]; }); return out; },
    reserve: async (d, want, cap) => { const ok = Math.max(0, Math.min(want, cap - used.day)); used.day += ok; return ok; },
    dropDevices: async ids => { calls.dropped.push(...ids); },
    cleanup: async before => { calls.cleanupBefore = before; return 7; }
  };
  const push = {send: async (devs, msg, opt) => { calls.sent.push({ids: devs.map(d => d.id), msg, opt}); return {sent: devs.length, bad: o.bad || []}; }};
  const ctx = {store, push, now: () => NOW, log: {info() {}, warn: () => { calls.warned = true; }}};
  return {ctx, calls, used};
}
const tr = (x = {}) => ({date: "2026-12-10", time: "18:00", end: "19:00", meet: 30, title: "Trénink", ...x});
const run = (m, before, after, o = {}) => handleChange(m.ctx, {coll: o.coll || "events", id: "e1", before, after, eventId: o.eid || "ev1"});

// ===== Změna události =====
test("beze změny: konec hned, bez jediného čtení (živý zápis zápasu)", async () => {
  const m = make();
  const r = await run(m, {date: "2026-12-10", time: "15:00"}, {date: "2026-12-10", time: "15:00", score: {h: 3}}, {coll: "matches"});
  assert.equal(r.r, "none");
  assert.equal(m.calls.reads, 0);
});

test("STOP: settings.on=false → nic se nečte dál ani neposílá", async () => {
  const m = make({on: false});
  assert.equal((await run(m, tr(), tr({cancelled: CAN}))).r, "off");
  assert.equal(m.calls.sent.length, 0);
  assert.equal(m.calls.reads, 1, "jen čtení vypínače");
});

test("mimo okno 30 dní: nic", async () => {
  const m = make();
  assert.equal((await run(m, tr({date: "2027-03-10"}), tr({date: "2027-03-10", time: "19:00"}))).r, "outside");
  assert.equal((await run(m, tr({date: "2026-11-01"}), tr({date: "2026-11-01", time: "19:00"}))).r, "outside");
});

test("zrušení: dostanou jen Jdu / Nejsem jistý, jedno odeslání", async () => {
  const m = make();
  const r = await run(m, tr(), tr({cancelled: CAN}));
  assert.equal(r.r, "sent");
  assert.equal(r.sent, 2);
  assert.deepEqual(m.calls.sent[0].ids, ["d1", "d2"]);
  assert.match(m.calls.sent[0].msg.title, /Zrušeno/);
  assert.equal(m.calls.sent[0].opt.ttl, LIMITS.TTL_CHANGE_S);
});

test("dedupe: stejná událost Firestore (opakované doručení) se pošle jen jednou", async () => {
  const m = make();
  assert.equal((await run(m, tr(), tr({time: "19:00"}), {eid: "X"})).r, "sent");
  assert.equal((await run(m, tr(), tr({time: "19:00"}), {eid: "X"})).r, "dup");
  assert.equal(m.calls.sent.length, 1);
});

test("nikdo přihlášený / žádné zařízení", async () => {
  assert.equal((await run(make({att: [{pid: "p3", st: "no"}]}), tr(), tr({time: "19:00"}))).r, "nobody");
  assert.equal((await run(make({devs: []}), tr(), tr({time: "19:00"}))).r, "nodevices");
});

test("hodinový limit: 4. změna v hodině = souhrn, 5. už nic", async () => {
  const m = make({att: [{pid: "p1", st: "yes"}], devs: [{id: "d1", tok: TOK(1), pid: "p1", z: true, at: 1}]});
  const out = [];
  for (let i = 1; i <= 5; i++) out.push((await run(m, tr(), tr({time: "19:00"}), {eid: "E" + i})).r);
  assert.deepEqual(out, ["sent", "sent", "sent", "sent", "burst"]);
  assert.equal(m.calls.sent[3].msg.tag, "chg_summary");
});

test("denní strop: nad strop se neposílá a zaloguje se varování", async () => {
  const m = make({used: LIMITS.DAY_CAP});
  const r = await run(m, tr(), tr({time: "19:00"}));
  assert.equal(r.r, "capped");
  assert.equal(m.calls.sent.length, 0);
  assert.ok(m.calls.warned);
  const m2 = make({used: LIMITS.DAY_CAP - 1});
  const r2 = await run(m2, tr(), tr({time: "19:00"}));
  assert.equal(r2.sent, 1, "pošle se jen tolik, kolik strop dovolí");
  assert.equal(r2.capped, 1);
});

test("neplatný token se po odeslání smaže", async () => {
  const m = make({bad: ["d2"]});
  const r = await run(m, tr(), tr({time: "19:00"}));
  assert.deepEqual(m.calls.dropped, ["d2"]);
  assert.equal(r.dropped, 1);
});

// ===== Uzávěrky =====
const dueEv = (x = {}) => ({id: "e1", date: "2026-12-04", time: "19:00", title: "Trénink", dl: "2026-12-04T18:30", ...x});

test("uzávěrka: připomínka jen těm bez odpovědi, jen jednou na událost a termín", async () => {
  const m = make({due: {events: [dueEv()]}});
  const r = await runDeadlines(m.ctx);
  assert.equal(r.r, "done");
  assert.deepEqual(m.calls.sent[0].ids, ["d4"], "p1 yes, p2 maybe, p3 no odpověděli");
  assert.equal(m.calls.sent[0].opt.ttl, 47 * 60, "platnost do uzávěrky (17:43 → 18:30)");
  assert.equal((await runDeadlines(m.ctx)).events, 0, "druhý běh ji už nepošle");
  assert.equal(m.calls.sent.length, 1);
});

test("uzávěrka: STOP, zrušená událost, bez termínu a prázdno", async () => {
  assert.equal((await runDeadlines(make({on: false, due: {events: [dueEv()]}}).ctx)).r, "off");
  const m = make({due: {events: [dueEv({cancelled: CAN}), dueEv({id: "e2", dl: undefined}), dueEv({id: "e3", date: "2026-12-03"})]}});
  assert.equal((await runDeadlines(m.ctx)).r, "idle");
  assert.equal(m.calls.sent.length, 0);
  assert.equal((await runDeadlines(make().ctx)).r, "idle");
});

test("uzávěrka: zápasy, nejvýš MAX_EVENTS_RUN událostí za běh", async () => {
  const many = Array.from({length: 30}, (_, i) => dueEv({id: "x" + i}));
  const m = make({due: {events: many}});
  assert.equal((await runDeadlines(m.ctx)).events, LIMITS.MAX_EVENTS_RUN);
  const mm = make({due: {matches: [{id: "m1", date: "2026-12-04", time: "20:00", opp: "Ostrava", dl: "2026-12-04T18:40"}]}});
  await runDeadlines(mm.ctx);
  assert.match(mm.calls.sent[0].msg.title, /Zápas – Ostrava/);
});

test("uzávěrka: denní strop a smazání neplatných tokenů", async () => {
  const m = make({due: {events: [dueEv()]}, used: LIMITS.DAY_CAP});
  const r = await runDeadlines(m.ctx);
  assert.equal(r.sent, 0);
  assert.equal(r.capped, 1);
  const m2 = make({due: {events: [dueEv()]}, bad: ["d4"]});
  await runDeadlines(m2.ctx);
  assert.deepEqual(m2.calls.dropped, ["d4"]);
});

// ===== Úklid =====
test("úklid: maže záznamy starší než LOG_KEEP_DAYS", async () => {
  const m = make();
  const r = await runCleanup(m.ctx);
  assert.equal(r.deleted, 7);
  assert.equal(m.calls.cleanupBefore, Date.parse("2026-10-20T00:00:00Z"));
});
