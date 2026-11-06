// Testy 🔔 notifikací v aplikaci: doména (domain/notif.js), datová vrstva s falešným prohlížečem a Firebase (data/notif-api.js),
// push handler v sw.js a ochrana proti zbytečným nákladům (messaging se nenačítá při spuštění).
// Struktura: Importy -> Pomocné funkce -> Doména -> Datová vrstva -> Service worker -> Pojistky.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {deviceDoc, deviceDocId, deviceStatus, globalOf, localOf, needsSync, notifDocOf, pushErrorText, pushSupport, RENEW_DAYS, VAPID_RE} from "../src/domain/notif.js";
import {notifApi} from "../src/data/notif-api.js";

// ===== Pomocné funkce =====
const read = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const KEY = "B".repeat(87);                                              // tvarem platný klíč VAPID
const DAY = 86400000;

// ===== Doména =====
test("pushSupport: iPhone jen z plochy, bez podpory prohlížeče vysvětlení", () => {
  assert.equal(pushSupport({sw: true, push: true, notif: true}).ok, true);
  assert.equal(pushSupport({sw: true, push: true, notif: true, ios: true, standalone: false}).ok, false);
  assert.match(pushSupport({sw: true, push: true, notif: true, ios: true, standalone: false}).why, /plochu/);
  assert.equal(pushSupport({sw: true, push: true, notif: true, ios: true, standalone: true}).ok, true);
  assert.equal(pushSupport({sw: true, push: false, notif: true}).ok, false);
  assert.equal(pushSupport(null).ok, false);
});

test("globalOf: chybějící nebo poškozený dokument = VYPNUTO (fail-safe), on musí být přesně true", () => {
  assert.equal(globalOf(undefined).on, false);
  assert.equal(globalOf({}).on, false);
  assert.equal(globalOf({on: "true"}).on, false);
  assert.equal(globalOf({on: 1}).on, false);
  assert.equal(globalOf({on: true}).on, true);
  assert.equal(globalOf({on: true, vapid: "krátký"}).vapid, "");
  assert.equal(globalOf({on: true, vapid: KEY}).vapid, KEY);
});

test("notifDocOf: STOP nechá klíč být, neplatný klíč se odmítne, prázdný klíč smaže", () => {
  assert.deepEqual(notifDocOf(false, null, "A@X.cz", "2026-11-04"), {on: false, by: "a@x.cz", at: "2026-11-04"});
  assert.equal(notifDocOf(true, "špatný klíč", "a@x.cz", "d"), null);
  assert.equal(notifDocOf(true, " " + KEY + " ", "a@x.cz", "d").vapid, KEY);
  assert.equal(notifDocOf(true, "", "a@x.cz", "d").vapid, "");
  assert.ok(VAPID_RE.test(KEY));
});

test("deviceDocId a deviceDoc: tvar odpovídá pravidlům (kód do 30 znaků, pid a tid vždy řetězec)", () => {
  assert.equal(deviceDocId("A@X.cz", "ab-12 cd"), "a@x.cz__ab12cd");
  assert.ok(deviceDocId("a@x.cz", "x".repeat(80)).length <= "a@x.cz".length + 2 + 30);
  const d = deviceDoc({tok: "t", email: "A@X.cz", pid: null, tid: undefined, ch: "beta"});
  assert.deepEqual(d, {tok: "t", email: "a@x.cz", pid: "", tid: "", ch: "beta", z: true, u: true});
  assert.deepEqual(Object.keys(d).sort(), ["ch", "email", "pid", "tid", "tok", "u", "z"]);
  assert.equal(deviceDoc({ch: "x"}).ch, "stable");
});

test("localOf: poškozený zápis = vypnuto", () => {
  assert.equal(localOf("{rozbité").on, false);
  assert.equal(localOf("").on, false);
  assert.equal(localOf(JSON.stringify({on: true})).on, false, "bez kódu zařízení");
  const l = localOf(JSON.stringify({on: true, code: "abc", z: false, pid: "p1", at: 5}));
  assert.deepEqual([l.on, l.code, l.z, l.u, l.pid, l.at], [true, "abc", false, true, "p1", 5]);
});

test("needsSync: jen zapnuté zařízení s povolením, zapnutým týmem a klíčem; po týdnu nebo po změně propojení", () => {
  const now = 100 * DAY, l = {on: true, code: "c", z: true, u: true, pid: "p1", tid: "", at: now - DAY}, g = {on: true, vapid: KEY};
  const o = {local: l, global: g, perm: "granted", pid: "p1", tid: "", now};
  assert.equal(needsSync(o), false, "čerstvé");
  assert.equal(needsSync({...o, now: now + RENEW_DAYS * DAY}), true, "po týdnu");
  assert.equal(needsSync({...o, pid: "p2"}), true, "změna propojení");
  assert.equal(needsSync({...o, global: {on: false, vapid: KEY}, now: now + 30 * DAY}), false, "STOP týmu – nic se nezapisuje");
  assert.equal(needsSync({...o, global: {on: true, vapid: ""}, now: now + 30 * DAY}), false, "bez klíče");
  assert.equal(needsSync({...o, perm: "default", now: now + 30 * DAY}), false, "bez povolení se nikdy neptá");
  assert.equal(needsSync({...o, local: {...l, on: false}, now: now + 30 * DAY}), false, "vypnuté zařízení");
});

test("deviceStatus: texty stavů", () => {
  const base = {support: {ok: true, why: ""}, perm: "default", local: {on: true}, global: {on: true}};
  assert.match(deviceStatus({...base, support: {ok: false, why: "nejde"}}).txt, /nejde/);
  assert.match(deviceStatus({...base, perm: "denied"}).txt, /zakázané/);
  assert.match(deviceStatus({...base, local: {on: false}}).txt, /vypnuto/);
  assert.match(deviceStatus({...base, global: {on: false}}).txt, /STOP/);
  assert.equal(deviceStatus(base).warn, false);
});

// ===== Datová vrstva =====
// Falešný kontext storage.js, úložiště prohlížeče a Firebase; zapisuje se jen do paměti (pole writes)
function make(o = {}) {
  const writes = [], dels = [];
  const C = {data: {settings: o.settings || {}}, user: () => ({email: "A@X.cz"}), pid: () => o.pid === undefined ? "p1" : o.pid, tid: () => o.tid || "", fs: () => ({}), pv: () => o.pv || null,
    blocked: () => !!o.blocked, isDev: () => !!o.dev, can: k => k === "admin" && !!o.mgr};
  const msg = {getMessaging: a => ({a}), getToken: async (m, opt) => { if (o.noTok) return ""; writes.push({tokenOpt: opt}); return "tok".repeat(10); }};
  const deps = {env: () => o.env || {sw: true, push: true, notif: true}, perm: () => o.perm || "granted", ask: async () => o.ask || "granted", reg: async () => (o.noReg ? null : {scope: "/"}),
    app: async () => ({getApp: () => ({})}), msg: async () => msg, now: () => o.now || 1000 * DAY};
  return {C, deps, writes, dels};
}
// Zápisy do Firestore ze zástupce SDK se nedají zachytit, proto se setDoc / deleteDoc zkouší jen v částech bez zápisu (rozhodování a chyby)

test("api: zapnutí odmítne bez klíče VAPID, bez podpory prohlížeče a při zamítnutém povolení – nic nezapíše", async () => {
  const noKey = make({settings: {notif: {on: true}}});
  assert.match((await notifApi(noKey.C, noKey.deps).enable(true, true)).why, /VAPID/);
  const unsupported = make({settings: {notif: {on: true, vapid: KEY}}, env: {sw: false}});
  assert.equal((await notifApi(unsupported.C, unsupported.deps).enable(true, true)).ok, false);
  const denied = make({settings: {notif: {on: true, vapid: KEY}}, perm: "default", ask: "denied"});
  assert.match((await notifApi(denied.C, denied.deps).enable(true, true)).why, /nejsou povolené/);
  const blocked = make({settings: {notif: {on: true, vapid: KEY}}, blocked: true});
  assert.equal((await notifApi(blocked.C, blocked.deps).enable(true, true)).ok, false);
  [noKey, unsupported, denied, blocked].forEach(m => assert.equal(m.writes.length, 0, "žádný token ani zápis"));
});

test("api: tichá obnova nic nedělá, když je tým vypnutý, zařízení vypnuté, v náhledu nebo bez povolení", async () => {
  const set = {notif: {on: true, vapid: KEY}};
  const stale = JSON.stringify({on: true, code: "c", z: true, u: true, pid: "p1", tid: "", at: 1});
  for (const o of [{settings: {notif: {on: false, vapid: KEY}}}, {settings: set, pv: {role: "x"}}, {settings: set, perm: "default"}, {settings: {}}]) {
    const m = make(o);
    localStorage.setItem("hk-notif", stale);
    assert.equal(await notifApi(m.C, m.deps).sync(), false);
    assert.equal(m.writes.length, 0, "nepožádala ani o token");
  }
  localStorage.setItem("hk-notif", "");
  const m = make({settings: set});
  assert.equal(await notifApi(m.C, m.deps).sync(), false, "zařízení není zapnuté");
  assert.equal(m.writes.length, 0);
});

test("api: info – kdo smí spravovat (manager nebo vývojář), stav týmu a zařízení", () => {
  localStorage.setItem("hk-notif", "");
  assert.equal(notifApi(make({mgr: true}).C, make().deps).info().edit, true);
  assert.equal(notifApi(make({dev: true}).C, make().deps).info().edit, true);
  assert.equal(notifApi(make().C, make().deps).info().edit, false);
  const i = notifApi(make({settings: {notif: {on: true, vapid: KEY}}}).C, make().deps).info();
  assert.equal(i.global.on, true);
  assert.equal(i.local.on, false);
  assert.equal(notifApi(make().C, make().deps).info().global.on, false, "bez dokumentu = vypnuto");
});

test("api: neplatný klíč VAPID se nezapíše", async () => {
  const m = make({mgr: true});
  assert.equal(await notifApi(m.C, m.deps).setVapid("neplatný"), false);
});

// ===== Service worker =====
// sw.js se spustí v izolovaném kontextu s falešným self; zkouší se push handler
function loadSw() {
  const handlers = {}, shown = [];
  const self = {location: new URL("https://x.cz/sw.js"), addEventListener: (t, f) => { handlers[t] = f; }, registration: {showNotification: (t, o) => { shown.push({t, o}); return Promise.resolve(); }}, clients: {}};
  vm.runInNewContext(read("sw.js"), {self, caches: {}, URL, Request: class {}, fetch() {}, location: self.location, console});
  return {handlers, shown};
}
const push = (sw, data) => { let p; sw.handlers.push({data: data === undefined ? null : {json: () => { if (data instanceof Error) throw data; return data; }}, waitUntil: x => { p = x; }}); return p; };

test("sw: push ukáže oznámení z obálky FCM {data}, z holého objektu i při nečitelné zprávě (vždy něco zobrazí)", async () => {
  const sw = loadSw();
  await push(sw, {data: {title: "❌ Zrušeno: Trénink", body: "Po 9. 11. 18:00 – událost se nekoná.", tag: "chg_e1"}, from: "123"});
  await push(sw, {title: "Holé", body: "b"});
  await push(sw, new Error("není JSON"));
  await push(sw, undefined);
  assert.equal(sw.shown.length, 4);
  assert.equal(sw.shown[0].t, "❌ Zrušeno: Trénink");
  assert.equal(sw.shown[0].o.tag, "chg_e1");
  assert.equal(sw.shown[0].o.renotify, true);
  assert.equal(sw.shown[1].t, "Holé");
  assert.equal(sw.shown[2].t, "HockeyCoach");
  assert.equal(sw.shown[3].o.tag, "hk-push");
});

// ===== Pojistky =====
test("náklady: messaging SDK se při spuštění nenačítá (jen dynamicky při zapnutí), tichá obnova je plánovaná jednou", () => {
  const api = read("src/data/notif-api.js"), storage = read("src/data/storage.js"), main = read("src/main.js");
  assert.ok(!/^import .*firebase-messaging/m.test(api), "žádný statický import messaging");
  assert.match(api, /import\(SDK \+ "firebase-messaging\.js"\)/);
  assert.ok(!/firebase-messaging/.test(storage));
  assert.equal((main.match(/HK\.notif\.sync\(\)/g) || []).length, 1);
});

test("verze: sw.js cache a verze aplikace se shodují s číslem 22.56", () => {
  assert.match(read("sw.js"), /const VER = "161"/);
  assert.match(read("src/core/app-version.js"), /22\.56/);
});

// ===== Chyby zapnutí (v22.56) =====
test("pushErrorText: „Registration failed - permission denied“ dá návod pro Android, síť a neznámá chyba své texty", () => {
  assert.match(pushErrorText(new Error("Registration failed - permission denied")), /Informace o aplikaci/);
  assert.match(pushErrorText({code: "messaging/permission-blocked"}), /zablokovaná/);
  assert.match(pushErrorText({code: "messaging/token-subscribe-failed"}), /spojit/);
  assert.match(pushErrorText(new Error("Service worker není aktivní – načti aplikaci znovu")), /service worker/);
  assert.match(pushErrorText({code: "x/jina"}), /x\/jina/);
  assert.match(pushErrorText(null), /neznámá chyba/);
  assert.match(deviceStatus({support: {ok: true, why: ""}, perm: "denied", local: {on: false}, global: {on: true}}).txt, /Informace o aplikaci/);
});

test("api: chyba při získání tokenu (permission denied) vrátí srozumitelný důvod místo výjimky", async () => {
  const m = make({settings: {notif: {on: true, vapid: KEY}}});
  const deps = {...m.deps, msg: async () => ({getMessaging: a => ({a}), getToken: async () => { throw new Error("Registration failed - permission denied"); }})};
  const r = await notifApi(m.C, deps).enable(true, true);
  assert.equal(r.ok, false);
  assert.match(r.why, /Informace o aplikaci/);
});
