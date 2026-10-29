// Test v22.18.2 (nález A kontroly kódu): souběžná úhrada téhož předpisu ze dvou zařízení se zastaralou kopií dat.
// Úhrady (payCharge, payMany) se zapisují transakcí nad aktuálním stavem předpisu na serveru – druhé zařízení
// předpis najde zaplacený a do pokladny nic nezapíše. Doménová část: payPlan (src/domain/cash.js).
import test from "node:test";
import assert from "node:assert/strict";
import {S} from "../src/core/state.js";
import {payPlan} from "../src/domain/cash.js";
import {payCharge, payMany} from "../src/views/payments.js";

// ===== Pomocné funkce =====
const copy = o => JSON.parse(JSON.stringify(o));
// Server: dokumenty podle cesty "kolekce/id"; tx čte AKTUÁLNÍ stav a zápisy provede až po úspěšném fn (jako Firestore)
function server(init) {
  const docs = copy(init);
  return {
    docs,
    tx: async (paths, fn) => {
      const cur = {}, ops = [];
      paths.forEach(p => { cur[p] = docs[p] === undefined ? null : copy(docs[p]); });
      const w = {set: (p, d) => { ops.push(() => { docs[p] = copy(d); }); return w; }, delete: p => { ops.push(() => { delete docs[p]; }); return w; }};
      const r = await fn(cur, w);
      ops.forEach(o => o());
      return r;
    },
    batch: () => { throw new Error("Úhrada nesmí jít mimo transakci"); }
  };
}
const CH = {mid: "p1", eid: "e1", kind: "event", amt: 150, paid: 0, vs: "123", acc: "op"};
// Zastaralá kopie zařízení: předpis ještě nezaplacený (snapshot před úhradou z druhého zařízení)
const stale = () => [{id: "c1", ...CH}];
const cashSum = docs => Object.entries(docs).filter(([p]) => p.startsWith("cash/")).reduce((s, [, d]) => s + d.amt, 0);
// Hlášky bez DOM (toast je ve testech zástupce) – výsledek se ověřuje ze stavu serveru
function setup(srv) { S.db = srv; S.ch = stale(); S.cc = {}; S.tr = []; S.pl = [{id: "p1", name: "Anna"}]; S.ev = [{id: "e1", date: "2026-10-10", type: "training"}]; S.ma = []; }

// ===== Doména: payPlan =====
test("payPlan: zaplacený předpis vypadne, částka se omezí zbytkem, smazaný = skip", () => {
  const ch = {a: {id: "a", amt: 150, paid: 150}, b: {id: "b", amt: 200, paid: 50}};
  const r = payPlan([{cid: "a", amt: null}, {cid: "b", amt: 500}, {cid: "x", amt: null}], id => ch[id] || null);
  assert.equal(r.skip, 2);
  assert.equal(r.lines.length, 1);
  assert.equal(r.lines[0].a, 150);
  assert.equal(r.lines[0].part, false);
  assert.equal(r.paid.get("b"), 150);
});
test("payPlan: dvě položky téhož předpisu nepřeplatí zbytek", () => {
  const r = payPlan([{cid: "b", amt: 100}, {cid: "b", amt: 100}], () => ({id: "b", amt: 150, paid: 0}));
  assert.deepEqual(r.lines.map(l => l.a), [100, 50]);
  assert.equal(r.lines[0].part, true);
  assert.equal(r.paid.get("b"), 150);
});

// ===== Závod dvou zařízení =====
test("payCharge: druhé zařízení se zastaralou kopií předpis nezaplatí podruhé", async () => {
  const srv = server({"charges/c1": CH});
  setup(srv);
  assert.equal(await payCharge("c1", 150, "", "2026-10-20"), true, "první zařízení zapíše");
  S.ch = stale();                                   // druhé zařízení: stejná zastaralá kopie, vlastní zámek busy
  await new Promise(r => setTimeout(r, 2100));     // zámek proti dvojímu klepnutí na „jednom“ zařízení vyprší
  assert.equal(await payCharge("c1", 150, "", "2026-10-20"), false, "druhé zařízení nezapíše");
  assert.equal(cashSum(srv.docs), 150, "v pokladně jen jedna úhrada");
  assert.equal(srv.docs["charges/c1"].paid, 150);
});
test("payMany: druhé zařízení nezapíše nic, co už je zaplacené (výpis / Zaplatila vše)", async () => {
  const srv = server({"charges/c1": CH});
  setup(srv);
  await new Promise(r => setTimeout(r, 2100));     // zámek z předchozího testu vyprší
  const r1 = await payMany([{cid: "c1", amt: null, note: "", d: "2026-10-20"}]);
  assert.deepEqual([r1.n, r1.skip, r1.err], [1, 0, ""]);
  S.ch = stale();
  await new Promise(r => setTimeout(r, 2100));
  const r2 = await payMany([{cid: "c1", amt: null, note: "", d: "2026-10-20", bt: "x1"}]);
  assert.deepEqual([r2.n, r2.skip, r2.err], [0, 1, ""]);
  assert.equal(cashSum(srv.docs), 150);
  assert.equal(srv.docs["charges/c1"].paid, 150);
  assert.ok(srv.docs["debtors/p1"] === undefined || Array.isArray(srv.docs["debtors/p1"].dues), "souhrn dlužníků ve stejné transakci");
});
test("payCharge: chyba transakce (bez připojení) nic nezapíše a vrátí false", async () => {
  setup({tx: async () => { throw Object.assign(new Error("Failed to get document because the client is offline."), {code: "unavailable"}); }, batch: () => { throw new Error("mimo transakci"); }});
  await new Promise(r => setTimeout(r, 2100));
  assert.equal(await payCharge("c1", 150, "", "2026-10-20"), false);
});
