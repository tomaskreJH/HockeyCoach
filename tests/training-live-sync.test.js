// Testy synchronizace živého tréninku (src/domain/training-live.js, v22.17): zápis doručený se zpožděním (řídící bez signálu)
// se počítá od času zařízení, změna hodin od řídícího trenéra se ostatním ohlásí (remoteKind) a má srozumitelný text (remoteNote).
import test from "node:test";
import assert from "node:assert/strict";
import {LATE_MS, liveCtl, liveSec, remoteKind, remoteNote} from "../src/domain/training-live.js";

// ===== Pomocná data =====
const T0 = Date.UTC(2026, 9, 28, 17, 0, 0);
const A = "hlavni@x.cz", B = "golman@x.cz";
const run = (e0, at, by = A, extra = {}) => ({v: 1, st: "run", e0, wAt: at, sAt: at + 300, ctl: by, by, ...extra});

// ===== Hodiny při zpožděném zápisu =====
test("liveSec: zápis doručený se zpožděním počítá od času zařízení wAt, běžný zápis od času serveru", () => {
  assert.equal(LATE_MS, 15000);
  const ok = {st: "run", e0: 0, wAt: T0, sAt: T0 + 400};
  assert.equal(liveSec(ok, T0 + 10_400), 10, "běžně od času serveru");
  // Řídící spustil bez signálu, server zápis dostal o 2 minuty později – hodiny nesmí být o 2 minuty pozadu
  const late = {st: "run", e0: 0, wAt: T0, sAt: T0 + 120_000};
  assert.equal(liveSec(late, T0 + 130_000), 130);
  assert.equal(liveSec(late, T0 + 131_000, 1000), 130, "odhad posunu hodin zařízení se odečte");
  assert.equal(liveSec({...late, st: "pause", e0: 42}, T0 + 999_999), 42, "pauza drží čas");
});

// ===== Změna od řídícího =====
test("remoteKind: vlastní zápis, první načtení a potvrzení serveru se neohlásí", () => {
  const o = run(0, T0);
  assert.equal(remoteKind(undefined, o, B), null);
  assert.equal(remoteKind(o, run(60, T0 + 60_000), A), null, "vlastní zápis");
  assert.equal(remoteKind(o, {...o}, B), null, "beze změny");
  assert.equal(remoteKind(o, null, B), null);
});
test("remoteKind: pauza, pokračování, start, konec, posun a úprava dalších bloků", () => {
  const o = run(100, T0);
  const now = T0 + 50_000, cur = liveSec(o, now);
  const P = {...liveCtl("pause", o, {now, me: A}), sAt: now + 200, by: A};
  assert.equal(remoteKind(o, P, B), "pause");
  assert.equal(remoteKind(P, {...liveCtl("resume", P, {now: now + 9000, me: A}), sAt: now + 9200, by: A}, B), "resume");
  assert.equal(remoteKind({...o, st: "end"}, {...liveCtl("start", null, {now, me: A, sec: 0}), sAt: now + 200, by: A}, B), "start");
  assert.equal(remoteKind(o, {...liveCtl("end", o, {now, me: A}), sAt: now + 200, by: A}, B), "end");
  // ⏭ Další = skok hodin
  assert.equal(remoteKind(o, {...liveCtl("jump", o, {now, me: A, sec: cur + 300}), sAt: now + 200, by: A}, B), "jump");
  // +1 min = posun e0
  assert.equal(remoteKind(o, {...liveCtl("extend", o, {now, me: A, sec: 60}), sAt: now + 200, by: A}, B), "jump");
  // 📋 Zbytek plánu: vypuštěný další blok bez posunu hodin
  assert.equal(remoteKind(o, {...liveCtl("keep", o, {now, me: A}), sAt: now + 200, by: A, skip: ["c"]}, B), "adj");
  // ▶ Teď: skok i úprava – ohlásí se jako změna polohy
  assert.equal(remoteKind(o, {...liveCtl("jump", o, {now, me: A, sec: cur + 900}), sAt: now + 200, by: A, skip: ["b"]}, B), "jump");
});
test("remoteNote: co je teď, kolik zbývá a co potom", () => {
  const cur = {where: "Stanoviště B", what: "Střelba", who: "🔵 Modrá"}, nxt = {where: "Blok 3", what: "Hra"};
  assert.deepEqual(remoteNote("pause", cur, nxt, 95, "18:40"), {title: "⏸ Trénink pozastaven", body: "Teď: Stanoviště B · Střelba · ještě 1:35"});
  const j = remoteNote("jump", cur, nxt, 300, "18:45");
  assert.equal(j.title, "↪ Změna: Stanoviště B · Střelba");
  assert.equal(j.body, "ještě 5:00 (do 18:45) · 🔵 Modrá · Potom: Blok 3 · Hra");
  assert.match(remoteNote("resume", cur, null, 60, "").body, /Potom: konec plánu/);
  assert.equal(remoteNote("adj", cur, nxt, 60, "").title, "📋 Plán upraven: Stanoviště B · Střelba");
  assert.equal(remoteNote("end", null, null, 0, "").title, "⏹ Trénink ukončen");
});
