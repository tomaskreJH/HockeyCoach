// Testy domain/permissions.js: účinná role ze starých hodnot, výchozí matice = chování před OM (srovnání s tabulkou CAN),
// permOf / permError, plán převodu rolí (OM-10: trenér, který zůstane trenérem, dostane příznak pokladník) a ochrana posledního managera.
// Struktura: Importy -> Data -> Testy.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ACTIONS, CAN_ACTS, DEFAULT_PERMS, MATRIX_ROLES, MODULES, ROLE_KEYS, ROLE_VER, actOf, cashOf, isLegacy, keepsManager, managerCount, permError, permOf, roleLabel, roleOf, rolePlan} from "../src/domain/permissions.js";

// ===== Data =====
const T = true, F = false;
// Tabulka CAN před OM (v20.3) pro staré role; klíč = [role, cash]
const OLD = {
  "trener,false": [T, T, T, T, T, T, F, F],
  "kustod,false": [T, F, F, F, F, F, F, F],
  "kustod,true": [T, T, T, F, F, F, F, F],
  "hracka,false": [F, F, F, F, F, F, T, F],
  "hracka,true": [F, T, T, F, F, F, T, F],
  "host,false": [F, F, F, F, F, F, T, T]
};
const ACTS8 = CAN_ACTS.filter(a => a !== "wipe");
const rows = [
  {email: "boss@x.cz", role: "trener"},
  {email: "coach@x.cz", role: "trener", cash: false},
  {email: "kasa@x.cz", role: "trener", cash: true},
  {email: "kust@x.cz", role: "kustod", cash: true},
  {email: "anna@x.cz", role: "hracka", pid: "p1"},
  {email: "host@x.cz", role: "host", pid: "p2"}
];

// ===== Testy =====
test("roleOf: kustod = asistent, trener bez rv = manager, nové role beze změny", () => {
  assert.equal(roleOf("kustod"), "asistent");
  assert.equal(roleOf("trener"), "manager");
  assert.equal(roleOf("trener", ROLE_VER), "trener");
  ROLE_KEYS.filter(r => r !== "trener").forEach(r => assert.equal(roleOf(r), r));
  assert.equal(roleOf("boss"), null);
  assert.equal(roleOf(undefined), null);
  assert.ok(isLegacy("kustod") && isLegacy("trener") && !isLegacy("trener", 2) && !isLegacy("manager"));
  assert.match(roleLabel("trener"), /Manager, čeká na převod/);
  assert.equal(roleLabel("trener", 2), "Trenér");
  assert.equal(roleLabel("asistent", 2), "Asistent");
});
test("srovnání: výchozí práva dávají tabulku CAN před OM (trener→manager, kustod→asistent, hracka, host, pokladník)", () => {
  for (const [k, exp] of Object.entries(OLD)) {
    const [raw, c] = k.split(","), cash = c === "true", role = roleOf(raw);
    assert.deepEqual(ACTS8.map(a => actOf(role, cash, a)), exp, k);
  }
  // Nové role se zapsaným rv: manager = dřívější trenér, asistent = dřívější kustod
  assert.deepEqual(ACTS8.map(a => actOf(roleOf("manager", 2), false, a)), OLD["trener,false"]);
  assert.deepEqual(ACTS8.map(a => actOf(roleOf("asistent", 2), true, a)), OLD["kustod,true"]);
});
test("nový trenér: sport a soupiska, bez členů, účtů a správy; pokladna jen s příznakem", () => {
  assert.deepEqual(ACTS8.map(a => actOf("trener", false, a)), [T, F, F, T, F, F, F, F]);
  assert.deepEqual(ACTS8.map(a => actOf("trener", true, a)), [T, T, T, T, F, F, F, F]);
});
test("wipe jen manager s příznakem vývojáře; cashOf bez hostujícího", () => {
  assert.equal(actOf("manager", false, "wipe", true), true);
  assert.equal(actOf("manager", false, "wipe", false), false);
  assert.equal(actOf("trener", true, "wipe", true), false);
  assert.equal(cashOf("host", true), false);
  assert.equal(cashOf("manager", false), true);
  assert.equal(cashOf("boss", true), false);
  assert.throws(() => actOf("manager", false, "neco"), /Neznámá akce oprávnění/);
});
test("permOf / permError: manager vše, host nic, matice s náhradou výchozích hodnot", () => {
  Object.entries(MODULES).forEach(([m, d]) => d.acts.forEach(a => assert.equal(permOf("manager", m, a), true)));
  assert.equal(permOf("host", "events", "r"), false);
  assert.equal(permOf("manager", "stats", "e"), false, "akce, která u modulu nedává smysl, neplatí ani pro managera");
  assert.equal(permOf("trener", "members", "e"), false);
  assert.equal(permOf("asistent", "roster", "e"), false);
  assert.equal(permOf("hracka", "stats", "r"), true);
  assert.equal(permOf("hracka", "stats", "r", {hracka: {stats: {r: false}}}), false, "uložená matice má přednost");
  assert.equal(permOf("hracka", "opp", "r", {hracka: {stats: {r: false}}}), true, "chybějící hodnota = výchozí");
  assert.throws(() => permOf("trener", "nic", "r"), /Neznámý modul/);
  assert.throws(() => permOf("trener", "events", "x"), /Neznámá akce/);
  assert.equal(permError("trener", "events", "e"), null);
  assert.match(permError("trener", "members", "e"), /Role Trenér nemá právo upravovat: Členové týmu/);
});
test("výchozí matice: všechny role matice mají všechny moduly a akce jako boolean", () => {
  MATRIX_ROLES.forEach(r => Object.keys(MODULES).forEach(m => Object.keys(ACTIONS).forEach(a => assert.equal(typeof DEFAULT_PERMS[r][m][a], "boolean", r + "." + m + "." + a))));
  assert.ok(Object.isFrozen(DEFAULT_PERMS.trener.events));
});
test("rolePlan: vybraní trenéři → manager, ostatní trenér + pokladník (OM-10), kustod → asistent; idempotentní", () => {
  const p = rolePlan(rows, ["BOSS@x.cz"]);
  assert.equal(p.ok, true);
  assert.deepEqual(p.ops, [
    ["merge", "members", "boss@x.cz", {role: "manager", rv: 2}],
    ["merge", "members", "coach@x.cz", {role: "trener", rv: 2, cash: true}],
    ["merge", "members", "kasa@x.cz", {role: "trener", rv: 2}],
    ["merge", "members", "kust@x.cz", {role: "asistent", rv: 2}]
  ]);
  assert.equal(p.managers, 1);
  assert.deepEqual(p.list.map(l => l.to), ["manager", "trener", "trener", "asistent"]);
  // Po převodu není co převádět
  const after = rows.map(r => { const o = p.ops.find(x => x[2] === r.email); return o ? {...r, ...o[3]} : r; });
  assert.deepEqual(rolePlan(after, []).ops, []);
  assert.equal(managerCount(after), 1);
});
test("rolePlan: bez managera se nepřevádí; existující manager stačí", () => {
  const p = rolePlan(rows, []);
  assert.equal(p.ok, false);
  assert.match(p.err, /Manager/);
  const withMgr = [...rows, {email: "m@x.cz", role: "manager", rv: 2}];
  assert.equal(rolePlan(withMgr, []).ok, true);
  assert.equal(rolePlan([{email: "a@x.cz", role: "hracka"}], []).ok, true, "není co převést = bez chyby");
});
test("keepsManager: posledního managera nejde odebrat ani snížit", () => {
  const one = [{email: "m@x.cz", role: "manager", rv: 2}, {email: "t@x.cz", role: "trener", rv: 2}];
  assert.equal(keepsManager(one, "m@x.cz", null), false);
  assert.equal(keepsManager(one, "m@x.cz", "trener"), false);
  assert.equal(keepsManager(one, "m@x.cz", "manager"), true);
  assert.equal(keepsManager(one, "t@x.cz", null), true);
  assert.equal(keepsManager([...one, {email: "old@x.cz", role: "trener"}], "m@x.cz", null), true, "trenér před převodem se počítá jako manager");
  assert.equal(keepsManager(one, "novy@x.cz", "hracka"), true);
});
test("pravidla databáze přijímají jen nové role (zúženo ve v20.6)", () => {
  const r = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(r, /function isMgr\(\) \{ return isMember\(\) && role\(\) == 'manager'; \}/);
  assert.match(r, /function isRoster\(\) \{ return isMember\(\) && role\(\) in \['manager', 'trener'\]; \}/);
  assert.match(r, /function isStaff\(\) \{ return isMember\(\) && role\(\) in \['manager', 'trener', 'asistent'\]; \}/);
  assert.match(r, /function isCash\(\) \{ return isMember\(\) && \(role\(\) == 'manager'/);
});
