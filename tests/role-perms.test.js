// Testy domain/permissions.js: účinná role (jen nové role), výchozí matice = chování před OM (srovnání s tabulkou CAN),
// permOf / permError a ochrana posledního managera.
// Struktura: Importy -> Data -> Testy.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ACTIONS, CAN_ACTS, DEFAULT_PERMS, MATRIX_ROLES, MODULES, ROLE_KEYS, ROLE_VER, actOf, cashOf, keepsManager, managerCount, permError, permOf, roleLabel, roleOf} from "../src/domain/permissions.js";

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

// ===== Testy =====
test("roleOf: platí jen nové role, stará kustod a neznámá hodnota = bez přístupu", () => {
  ROLE_KEYS.forEach(r => assert.equal(roleOf(r), r));
  assert.equal(roleOf("kustod"), null);
  assert.equal(roleOf("boss"), null);
  assert.equal(roleOf(undefined), null);
  assert.equal(roleLabel("trener"), "Trenér");
  assert.equal(roleLabel("asistent"), "Asistent");
  assert.match(roleLabel("kustod"), /neplatná role – bez přístupu/);
  assert.equal(roleLabel(""), "?");
});
test("srovnání: výchozí práva dávají tabulku CAN před OM (dřívější trenér = manager, kustod = asistent, hracka, host, pokladník)", () => {
  const NEW = {trener: "manager", kustod: "asistent"};
  for (const [k, exp] of Object.entries(OLD)) {
    const [raw, c] = k.split(","), cash = c === "true", role = roleOf(NEW[raw] || raw);
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
test("keepsManager: posledního managera nejde odebrat ani snížit", () => {
  const one = [{email: "m@x.cz", role: "manager", rv: 2}, {email: "t@x.cz", role: "trener", rv: 2}];
  assert.equal(keepsManager(one, "m@x.cz", null), false);
  assert.equal(keepsManager(one, "m@x.cz", "trener"), false);
  assert.equal(keepsManager(one, "m@x.cz", "manager"), true);
  assert.equal(keepsManager(one, "t@x.cz", null), true);
  assert.equal(keepsManager([...one, {email: "old@x.cz", role: "trener"}], "m@x.cz", null), false, "trenér bez rv není manager");
  assert.equal(managerCount([...one, {email: "m2@x.cz", role: "manager"}]), 2);
  assert.equal(keepsManager(one, "novy@x.cz", "hracka"), true);
});
test("pravidla databáze přijímají jen nové role (zúženo ve v20.6)", () => {
  const r = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(r, /function isMgr\(\) \{ return isMember\(\) && role\(\) == 'manager'; \}/);
  assert.match(r, /function isRoster\(\) \{ return isMember\(\) && role\(\) in \['manager', 'trener'\]; \}/);
  assert.match(r, /function isStaff\(\) \{ return isMember\(\) && role\(\) in \['manager', 'trener', 'asistent'\]; \}/);
  assert.match(r, /function isCash\(\) \{ return isMember\(\) && \(role\(\) == 'manager'/);
});
