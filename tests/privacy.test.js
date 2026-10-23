// Testy soukromí v databázi: důvody omluv (attnote), platy realizačního týmu (staffpay), platební pole hráček (plpay).
// Ověřuje připojení nových kolekcí k záznamům v paměti s náhradou ze starých polí, nezměněné výpočty pokladny, plán převodu
// (jen chybějící hodnoty, lze spustit znovu), úklid starých polí (jen co je v novém místě), rozdělení staré zálohy,
// blokaci „Jdu“ přes souhrn debtors, zálohu a obnovu nových kolekcí a text pravidel (stará pole už nejde zapsat).
// Struktura: Importy -> Pomocné funkce a data -> Připojení k záznamům -> Výpočty pokladny beze změny -> Zápis -> Plán převodu
// -> Úklid starých polí -> Obnova staré zálohy -> Blokace „Jdu“ -> Záloha a obnova -> Pravidla databáze.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolveObjectURL} from "node:buffer";
import {exOf, fxOf, grpOf, salaryRows} from "../src/domain/cash.js";
import {memberBlocked} from "../src/domain/debtors.js";
import {NOTE_COLL, PPAY_COLL, SPAY_COLL, attDoc, cleanPlan, joinAttNotes, joinPlPay, joinStaffPay, legacyLeft, noteDoc, plPayDoc, privacyPlan, splitLegacy, staffPayDoc, withPlPay} from "../src/domain/private-data.js";
import {HK} from "../src/data/storage.js";

// ===== Pomocné funkce a data =====
const read = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
// Blok pravidel „match /kolekce/{id}“ až po jeho uzavírací závorku
function ruleBlock(rules, head) {
  const i = rules.indexOf(head);
  assert.ok(i >= 0, "chybí " + head);
  let depth = 0;
  for (let j = rules.indexOf("{", i + head.length); j < rules.length; j++) {
    if (rules[j] === "{") depth++;
    if (rules[j] === "}" && --depth === 0) return rules.slice(i, j + 1);
  }
  return "";
}
// Použití operací plánu na zdrojová data (simulace zápisu do databáze)
function apply(src, ops) {
  const o = JSON.parse(JSON.stringify(src));
  ops.forEach(([t, c, id, d]) => { o[c] = o[c] || {}; o[c][id] = t === "merge" ? {...(o[c][id] || {}), ...d} : {...d}; });
  return o;
}
const SRC = {
  players: {
    a: {name: "A", grp: "single", fx: 0.5, ex: false, note: "kompenzace"},
    b: {name: "B", grp: "monthly", fx: 1, ex: true},
    c: {name: "C"},                                           // bez platebních polí
    d: {name: "D", grp: "monthly", fx: 0.8}                   // grp už je v plpay jinak (nový zápis) – nepřepsat
  },
  plpay: {d: {grp: "single"}},
  staff: {t1: {name: "Trenér", pay: {m: "month", amt: 3000}}, t2: {name: "Asistent"}, t3: {name: "Kustod", pay: {m: "event", amt: 200}}},
  staffpay: {t3: {m: "event", amt: 250}},
  attendance: {
    e1_a: {eid: "e1", pid: "a", st: "no", reason: "Nemoc"},
    e1_b: {eid: "e1", pid: "b", st: "yes", reason: ""},
    e2_a: {eid: "e2", pid: "a", st: "maybe", reason: "Práce"},
    old1: {eid: "e3", pid: "c", st: "no", reason: "Škola"}       // jiný tvar id – pravidla by zápis odmítla
  },
  attnote: {e2_a: {eid: "e2", mid: "a", reason: "Rodina"}}
};

// ===== Připojení k záznamům =====
test("plpay: nové místo má přednost po polích, chybějící pole zůstanou ze starého místa", () => {
  const pl = [{id: "a", name: "A", grp: "single", fx: 0.5, ex: false, note: "x"}, {id: "c", name: "C"}];
  const out = joinPlPay(pl, {a: {fx: 0.25, ex: true}, c: {grp: "single"}});
  assert.deepEqual(out[0], {id: "a", name: "A", grp: "single", fx: 0.25, ex: true, note: "x"});
  assert.deepEqual(out[1], {id: "c", name: "C", grp: "single"});
  assert.equal(withPlPay(pl[0], null), pl[0], "bez dokumentu plpay beze změny");
  assert.deepEqual(joinPlPay(pl, null), pl);
  assert.deepEqual(joinPlPay(null, {}), []);
});

test("staffpay: plat z nové kolekce, jinak starý staff.pay", () => {
  const tr = [{id: "t1", name: "T", pay: {m: "month", amt: 3000}}, {id: "t2", name: "U", pay: {m: "event", amt: 100}}];
  const out = joinStaffPay(tr, {t1: {m: "event", amt: "150"}});
  assert.deepEqual(out[0].pay, {m: "event", amt: 150});
  assert.deepEqual(out[1].pay, {m: "event", amt: 100});
  assert.deepEqual(staffPayDoc(undefined), {m: "none", amt: 0});
});

test("attnote: dokument důvodu má přednost (i prázdný), jinak starý attendance.reason", () => {
  const at = [{id: "e1_a", eid: "e1", pid: "a", st: "no", reason: "Nemoc"}, {id: "e1_b", eid: "e1", pid: "b", st: "no", reason: "Staré"}, {id: "e2_a", eid: "e2", pid: "a", st: "no"}];
  const out = joinAttNotes(at, {e1_a: {eid: "e1", mid: "a", reason: "Zranění"}, e1_b: {eid: "e1", mid: "b", reason: ""}});
  assert.deepEqual(out.map(x => x.reason), ["Zranění", "", undefined]);
  assert.equal(out[2], at[2], "bez dokumentu důvodu beze změny");
});

// ===== Výpočty pokladny beze změny (domain/cash.js se nemění) =====
test("pokladna: po převodu dávají připojená data stejné exOf / fxOf / grpOf jako stará pole", () => {
  const plan = privacyPlan(SRC), after = apply(SRC, plan.ops);
  const before = Object.entries(SRC.players).map(([id, p]) => ({id, ...p}));
  // Hráčky po převodu: v players už platební pole nejsou (stav po úklidu), vše je v plpay
  const stripped = before.map(p => ({id: p.id, name: p.name}));
  const joined = joinPlPay(stripped, after.plpay);
  before.filter(p => p.id !== "d").forEach((p, i) => {
    const j = joined.find(x => x.id === p.id);
    assert.deepEqual([exOf(j), fxOf(j), grpOf(j)], [exOf(p), fxOf(p), grpOf(p)], "hráčka " + p.id + " (" + i + ")");
  });
  // Hráčka d: novější hodnota v plpay (single) zůstala, chybějící koeficient se doplnil
  const d = joined.find(x => x.id === "d");
  assert.deepEqual([grpOf(d), fxOf(d)], ["single", 0.8]);
});

test("pokladna: návrh platů ze staffpay je stejný jako ze staff.pay", () => {
  const staffOld = [{id: "t1", name: "T", pay: {m: "month", amt: 3000}}, {id: "t2", name: "U", pay: {m: "event", amt: 200}}];
  const evs = [{id: "e1", date: "2026-10-05"}, {id: "e2", date: "2026-10-12"}];
  const at = [{eid: "e1", pid: "t2", st: "yes"}, {eid: "e2", pid: "t2", st: "yes"}];
  const viaNew = joinStaffPay(staffOld.map(t => ({id: t.id, name: t.name})), {t1: staffPayDoc(staffOld[0].pay), t2: staffPayDoc(staffOld[1].pay)});
  assert.deepEqual(salaryRows(viaNew, "2026-10", evs, at, [], "2026-10-20"), salaryRows(staffOld, "2026-10", evs, at, [], "2026-10-20"));
});

// ===== Zápis =====
test("zápis: odpověď bez důvodu, důvod jen neprázdný, platební pole jen povolená", () => {
  assert.deepEqual(attDoc("e1", "a", "no", "t", "x@y.cz"), {eid: "e1", pid: "a", st: "no", at: "t", by: "x@y.cz"});
  assert.deepEqual(noteDoc("e1", "a", "  Nemoc "), {eid: "e1", mid: "a", reason: "Nemoc"});
  assert.equal(noteDoc("e1", "a", "  "), null);
  assert.deepEqual(plPayDoc({grp: "single", fx: 0.5, ex: false, note: "", name: "X", st: "act"}), {grp: "single", fx: 0.5, ex: false, note: ""});
});

// ===== Plán převodu =====
test("převod: zkopíruje jen chybějící hodnoty, novější nepřepíše, jiný tvar id přeskočí", () => {
  const plan = privacyPlan(SRC);
  assert.deepEqual(plan.pp, [{id: "a", d: {grp: "single", fx: 0.5, ex: false, note: "kompenzace"}}, {id: "b", d: {grp: "monthly", fx: 1, ex: true}}, {id: "d", d: {fx: 0.8}}]);
  assert.deepEqual(plan.sp, [{id: "t1", d: {m: "month", amt: 3000}}], "t3 už má staffpay (250) – nepřepsat");
  assert.deepEqual(plan.an, [{id: "e1_a", d: {eid: "e1", mid: "a", reason: "Nemoc"}}], "prázdný důvod a už převedený se přeskočí");
  assert.deepEqual(plan.skip, ["old1"]);
  assert.deepEqual(plan.ops.map(x => x.slice(0, 3)), [["merge", PPAY_COLL, "a"], ["merge", PPAY_COLL, "b"], ["merge", PPAY_COLL, "d"], ["set", SPAY_COLL, "t1"], ["set", NOTE_COLL, "e1_a"]]);
});

test("převod: je idempotentní (druhé spuštění nic nenajde), prázdná data", () => {
  const after = apply(SRC, privacyPlan(SRC).ops);
  const again = privacyPlan(after);
  assert.deepEqual([again.pp, again.sp, again.an, again.ops], [[], [], [], []]);
  assert.deepEqual(again.skip, ["old1"], "nepřevoditelné id se jen hlásí");
  assert.deepEqual(privacyPlan(null).ops, []);
  assert.deepEqual(legacyLeft(SRC), {pp: 3, sp: 2, an: 3}, "stará pole zůstávají až do úklidu");
});

// ===== Úklid starých polí =====
// Použití úklidu na data: "__del" smaže pole
function applyClean(src, ops) {
  const o = JSON.parse(JSON.stringify(src));
  ops.forEach(([, c, id, d]) => Object.entries(d).forEach(([k, v]) => { if (v === "__del") delete o[c][id][k]; }));
  return o;
}

test("úklid: po převodu smaže jen pole, která jsou v novém místě (prázdná také); bez protějšku nechá", () => {
  const after = apply(SRC, privacyPlan(SRC).ops), c = cleanPlan(after);
  assert.deepEqual(c.ops, [
    ["merge", "players", "a", {grp: "__del", fx: "__del", ex: "__del", note: "__del"}],
    ["merge", "players", "b", {grp: "__del", fx: "__del", ex: "__del"}],
    ["merge", "players", "d", {grp: "__del", fx: "__del"}],
    ["merge", "staff", "t1", {pay: "__del"}],
    ["merge", "staff", "t3", {pay: "__del"}],
    ["merge", "attendance", "e1_a", {reason: "__del"}],
    ["merge", "attendance", "e1_b", {reason: "__del"}],
    ["merge", "attendance", "e2_a", {reason: "__del"}]
  ]);
  assert.deepEqual([c.pp, c.sp, c.an, c.keep], [3, 2, 3, {pp: 0, sp: 0, an: 1}], "důvod s jiným tvarem id (old1) zůstane");
  // Po úklidu: stará pole pryč (kromě nepřevoditelného), výpočty pokladny z připojených dat stejné jako před převodem
  const clean = applyClean(after, c.ops);
  assert.deepEqual(legacyLeft(clean), {pp: 0, sp: 0, an: 1});
  const joined = joinPlPay(Object.entries(clean.players).map(([id, p]) => ({id, ...p})), clean.plpay);
  ["a", "b", "c"].forEach(id => { const o = {id, ...SRC.players[id]}, j = joined.find(x => x.id === id); assert.deepEqual([exOf(j), fxOf(j), grpOf(j)], [exOf(o), fxOf(o), grpOf(o)], id); });
  assert.deepEqual(cleanPlan(clean).ops, [], "druhé spuštění nic nenajde");
});

test("úklid: bez převodu nic nesmaže (hodnota by se ztratila)", () => {
  const c = cleanPlan({players: {a: {name: "A", grp: "single", note: ""}}, staff: {t: {pay: {m: "month", amt: 1}}, u: {pay: null}}, attendance: {e_a: {eid: "e", pid: "a", reason: "Nemoc"}}});
  assert.deepEqual(c.ops, [["merge", "players", "a", {note: "__del"}], ["merge", "staff", "u", {pay: "__del"}]], "jen prázdné hodnoty");
  assert.deepEqual(c.keep, {pp: 1, sp: 1, an: 1});
  assert.deepEqual(cleanPlan(null).ops, []);
});

// ===== Obnova staré zálohy =====
test("stará záloha: citlivá pole se rozdělí do nových kolekcí, nové místo v záloze má přednost", () => {
  const src = {players: {a: {name: "A", grp: "single", fx: 0.5, ex: false}, b: {name: "B", grp: "monthly"}, c: {name: "C"}}, plpay: {b: {grp: "single"}},
    staff: {t1: {name: "T", pay: {m: "month", amt: 3000}}, t2: {name: "U"}},
    attendance: {e1_a: {eid: "e1", pid: "a", st: "no", reason: "Nemoc"}, e1_b: {eid: "e1", pid: "b", st: "yes", reason: ""}, old1: {eid: "e3", pid: "c", st: "no", reason: "Škola"}},
    events: {e1: {name: "Trénink"}}};
  const copy = JSON.parse(JSON.stringify(src)), r = splitLegacy(src);
  assert.deepEqual(src, copy, "vstup se nemění");
  assert.deepEqual(r.data.players, {a: {name: "A"}, b: {name: "B"}, c: {name: "C"}});
  assert.deepEqual(r.data.plpay, {a: {grp: "single", fx: 0.5, ex: false}, b: {grp: "single"}});
  assert.deepEqual(r.data.staff, {t1: {name: "T"}, t2: {name: "U"}});
  assert.deepEqual(r.data.staffpay, {t1: {m: "month", amt: 3000}});
  assert.deepEqual(r.data.attendance, {e1_a: {eid: "e1", pid: "a", st: "no"}, e1_b: {eid: "e1", pid: "b", st: "yes"}, old1: {eid: "e3", pid: "c", st: "no"}});
  assert.deepEqual(r.data.attnote, {e1_a: {eid: "e1", mid: "a", reason: "Nemoc"}});
  assert.deepEqual([r.moved, r.dropped], [{pp: 2, sp: 1, an: 1}, 1]);
  assert.equal(r.data.events, src.events, "ostatní kolekce beze změny");
});

test("stará záloha: nová kolekce vznikne jen z nalezených hodnot (Nahradit vším nesmaže cizí plpay)", () => {
  const r = splitLegacy({players: {a: {name: "A"}}, staff: {t: {name: "T"}}, attendance: {e_a: {eid: "e", pid: "a", st: "yes"}}});
  assert.ok(!("plpay" in r.data) && !("staffpay" in r.data) && !("attnote" in r.data));
  assert.deepEqual(splitLegacy({events: {}}).data, {events: {}});
  assert.deepEqual(splitLegacy(null).data, {});
});

// ===== Blokace „Jdu“ =====
test("blokace Jdu: za jiného člena podle souhrnu debtors (kustod nevidí cizí předpisy)", () => {
  const now = new Date("2026-10-20T12:00:00").getTime();
  const dt = [{id: "a", dues: [{d: "2026-10-01", x: false}]}, {id: "b", dues: [{d: "2026-10-01", x: true}]}, {id: "c", dues: [{d: "2026-11-01", x: false}]}];
  assert.equal(memberBlocked([], dt, "a", now), true, "po splatnosti bez výjimky");
  assert.equal(memberBlocked([], dt, "b", now), false, "výjimka 🔓");
  assert.equal(memberBlocked([], dt, "c", now), false, "ještě před splatností");
  assert.equal(memberBlocked([], dt, "x", now), false, "bez dokumentu");
  assert.equal(memberBlocked([{mid: "x", amt: 100, paid: 0, due: "2026-10-01"}], [], "x", now), true, "vlastní předpis v zařízení");
  assert.equal(memberBlocked(null, null, "x", now), false);
});

// ===== Záloha a obnova =====
test("záloha a obnova obsahují nové kolekce attnote, staffpay, plpay", async () => {
  globalThis.__fb = {user: {email: "coach@test.cz", uid: "u1"}, members: {"coach@test.cz": {role: "trener"}}, writes: [],
    data: {players: {a: {name: "A"}}, plpay: {a: {grp: "single", fx: 1, ex: false}}, staffpay: {t1: {m: "month", amt: 100}}, attnote: {e1_a: {eid: "e1", mid: "a", reason: "Nemoc"}}}};
  const db = await HK.ready();
  ["players", NOTE_COLL, SPAY_COLL, PPAY_COLL].forEach(c => db.collection(c).onSnapshot(() => {}));
  // Zachycení staženého souboru (odkaz <a> s Blob URL)
  const orig = document.createElement;
  let a = null;
  document.createElement = () => (a = {style: {}, click() {}, remove() {}});
  try { HK.exportJSON(); } finally { document.createElement = orig; }
  const out = JSON.parse(await resolveObjectURL(a.href).text());
  assert.deepEqual(out.data.plpay, {a: {grp: "single", fx: 1, ex: false}});
  assert.deepEqual(out.data.staffpay, {t1: {m: "month", amt: 100}});
  assert.deepEqual(out.data.attnote, {e1_a: {eid: "e1", mid: "a", reason: "Nemoc"}});
  // Obnova ze zálohy zapíše i nové kolekce
  await HK.importData({app: "hokej-zapasy", data: {plpay: {b: {grp: "monthly"}}, staffpay: {t2: {m: "event", amt: 50}}, attnote: {e2_b: {eid: "e2", mid: "b", reason: "Práce"}}}}, false);
  const paths = globalThis.__fb.writes.map(w => w.path);
  ["plpay/b", "staffpay/t2", "attnote/e2_b"].forEach(p => assert.ok(paths.includes(p), "obnova zapsala " + p));
  // Stará záloha: soupiska, tým a docházka se zapíšou bez citlivých polí, hodnoty jdou do nových kolekcí
  globalThis.__fb.writes.length = 0;
  const k = await HK.importData({app: "hokej-zapasy", data: {players: {c: {name: "C", grp: "single", fx: 0.5}}, staff: {t9: {name: "T", pay: {m: "month", amt: 900}}},
    attendance: {e5_c: {eid: "e5", pid: "c", st: "no", reason: "Nemoc"}, x1: {eid: "e6", pid: "c", st: "no", reason: "Škola"}}}}, false);
  const w = Object.fromEntries(globalThis.__fb.writes.map(x => [x.path, x.d]));
  assert.deepEqual(w["players/c"], {name: "C"});
  assert.deepEqual(w["plpay/c"], {grp: "single", fx: 0.5});
  assert.deepEqual(w["staff/t9"], {name: "T"});
  assert.deepEqual(w["staffpay/t9"], {m: "month", amt: 900});
  assert.deepEqual(w["attendance/e5_c"], {eid: "e5", pid: "c", st: "no"});
  assert.deepEqual(w["attnote/e5_c"], {eid: "e5", mid: "c", reason: "Nemoc"});
  assert.equal(k, 1, "důvod s jiným tvarem id se nepřevedl");
});

// ===== Pravidla databáze =====
test("pravidla: attnote čte vlastník a trenér / kustod, hráčka zapisuje jen svůj důvod", () => {
  const rules = read("firestore.rules"), b = ruleBlock(rules, "match /attnote/{id}");
  assert.match(rules, /function noteOk\(id, d\) \{ return d\.keys\(\)\.hasOnly\(\['eid', 'mid', 'reason'\]\) && d\.reason is string && id == d\.eid \+ '_' \+ d\.mid; \}/);
  assert.match(b, /allow read: if isStaff\(\) \|\| ownsMid\(resource\.data\.mid\);/);
  assert.match(b, /allow create, update: if noteOk\(id, request\.resource\.data\) && \(isStaff\(\) \|\| \(isPlayer\(\) && request\.resource\.data\.mid == myPid\(\)\)\);/);
  assert.match(b, /allow delete: if isStaff\(\) \|\| \(isPlayer\(\) && resource\.data\.mid == myPid\(\)\);/);
  assert.ok(!b.includes("isMember()"), "důvody nečte každý člen");
});

test("pravidla: staffpay a plpay jen správci pokladny (číst smí i vlastník), jen povolená pole", () => {
  const rules = read("firestore.rules"), s = ruleBlock(rules, "match /staffpay/{id}"), p = ruleBlock(rules, "match /plpay/{id}");
  assert.match(s, /allow read: if isCash\(\) \|\| ownsMid\(id\);/);
  assert.match(s, /allow create, update: if isCash\(\) && request\.resource\.data\.keys\(\)\.hasOnly\(\['m', 'amt'\]\);/);
  assert.match(s, /allow delete: if isCash\(\);/);
  assert.match(p, /allow read: if isCash\(\) \|\| \(isPlayer\(\) && id == myPid\(\)\);/);
  assert.match(p, /allow create, update: if isCash\(\) && request\.resource\.data\.keys\(\)\.hasOnly\(\['grp', 'fx', 'ex', 'note'\]\);/);
  assert.match(p, /allow delete: if isCash\(\);/);
  [s, p].forEach(x => assert.ok(!x.includes("isMember()"), "nečte každý člen"));
});

test("pravidla: stará citlivá pole nejde zapsat (jen smazat), pokladník soupisku ani tým nemění", () => {
  const rules = read("firestore.rules");
  assert.match(rules, /function noKeys\(ks\) \{ return !request\.resource\.data\.keys\(\)\.hasAny\(ks\); \}/);
  assert.match(rules, /function keepOut\(ks\) \{ return !request\.resource\.data\.diff\(resource\.data\)\.addedKeys\(\)\.hasAny\(ks\) && !request\.resource\.data\.diff\(resource\.data\)\.changedKeys\(\)\.hasAny\(ks\); \}/);
  const p = ruleBlock(rules, "match /players/{id}"), t = ruleBlock(rules, "match /staff/{id}"), a = ruleBlock(rules, "match /attendance/{id}");
  assert.match(p, /allow create: if isCoach\(\) && noKeys\(\['grp', 'fx', 'ex', 'note'\]\);/);
  assert.match(p, /allow update: if keepOut\(\['grp', 'fx', 'ex', 'note'\]\) && \(isCoach\(\)/);
  assert.match(t, /allow create: if isCoach\(\) && noKeys\(\['pay'\]\);/);
  assert.match(t, /allow update: if isCoach\(\) && keepOut\(\['pay'\]\);/);
  assert.match(a, /allow create: if noKeys\(\['reason'\]\) && \(isStaff\(\)/);
  assert.match(a, /allow update: if keepOut\(\['reason'\]\) && \(isStaff\(\)/);
  [p, t].forEach(x => assert.ok(!x.includes("isCash()"), "pokladník platby zapisuje jen do plpay / staffpay"));
});
