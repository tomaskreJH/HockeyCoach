// Zúžení pravidel databáze (OM3): role v pravidlech odpovídají zkratkám aplikace HK.can (actOf), bez staré role kustod
// a bez výjimky „trener bez rv = manager“. Srovnávací test: zkratky nových rolí jsou stejné jako ve v20.5.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Testy.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CAN_ACTS, ROLE_KEYS, actOf} from "../src/domain/permissions.js";

// ===== Konstanty =====
const RULES = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
// Zkratky HK.can ve v20.5 (výchozí matice, bez vývojáře) – role a role s příznakem 💰 cash
const V205 = {
  "manager": "sport money members roster accounts admin",
  "manager+cash": "sport money members roster accounts admin",
  "trener": "sport roster",
  "trener+cash": "sport money members roster",
  "asistent": "sport",
  "asistent+cash": "sport money members",
  "hracka": "onlyOwn",
  "hracka+cash": "money members onlyOwn",
  "host": "onlyOwn guest",
  "host+cash": "onlyOwn guest"
};

// ===== Pomocné funkce =====
// Seznam rolí z funkce pravidel tvaru role() in ['a', 'b'] nebo role() == 'a'
function rolesOf(name) {
  const m = RULES.match(new RegExp("function " + name + "\\(\\) \\{ return isMember\\(\\) && role\\(\\) (?:in \\[([^\\]]*)\\]|== '([a-z]+)'); \\}"));
  assert.ok(m, "chybí funkce " + name);
  return (m[1] ? m[1].split(",").map(x => x.trim().replace(/'/g, "")) : [m[2]]).sort();
}
// Role, které mají v aplikaci danou zkratku (bez příznaku cash)
const appRoles = act => ROLE_KEYS.filter(r => actOf(r, false, act, false)).sort();
// Blok pravidla match /<cesta> { … }
const block = head => { const i = RULES.indexOf(head); assert.ok(i > 0, "chybí " + head); return RULES.slice(i, RULES.indexOf("\n    }", i)); };

// ===== Testy =====
test("srovnání: zkratky HK.can nových rolí jsou stejné jako ve v20.5", () => {
  for (const r of ROLE_KEYS) for (const c of [false, true]) {
    const got = CAN_ACTS.filter(a => a !== "wipe").filter(a => actOf(r, c, a, false)).join(" ");
    assert.equal(got, V205[r + (c ? "+cash" : "")], r + (c ? " + cash" : ""));
  }
});

test("pravidla: role odpovídají aplikaci – isMgr = admin, isRoster = roster, isStaff = sport", () => {
  assert.deepEqual(rolesOf("isMgr"), appRoles("admin"));
  assert.deepEqual(rolesOf("isRoster"), appRoles("roster"));
  assert.deepEqual(rolesOf("isStaff"), appRoles("sport"));
  assert.match(RULES, /function isCash\(\) \{ return isMember\(\) && \(role\(\) == 'manager' \|\| \(role\(\) != 'host' && get\(memberPath\(\)\)\.data\.get\('cash', false\) == true\)\); \}/);
  assert.match(RULES, /function myRole\(\) \{ return role\(\); \}/);
});

test("pravidla: bez staré role kustod, bez isCoach a bez výjimky pro trenéra před převodem", () => {
  assert.ok(!RULES.includes("'kustod'"), "text pravidel obsahuje 'kustod'");
  assert.ok(!/isCoach\(/.test(RULES), "zbyla funkce isCoach");
  assert.ok(!/roleFix\(/.test(RULES), "zbyla funkce roleFix");
  assert.ok(!/get\('rv'/.test(RULES), "pravidla nesmí číst rv");
});

test("pravidla: členové, žádosti o přijetí, brána verze, účty a mazání rozpočtu jen manager; soupiska a realizační tým manager a trenér", () => {
  const m = block("match /members/{email}");
  assert.match(m, /allow read: if signedIn\(\) && \(email == mail\(\) \|\| isMgr\(\) \|\| isCash\(\)\);/);
  assert.match(m, /allow create: if isMgr\(\) \|\| cashierMember/);
  assert.match(block("match /joinreq/{email}"), /allow update: if isMgr\(\) \|\|/);
  assert.match(RULES, /function appSettingsOk\(\) \{\s+return isMgr\(\)/);
  assert.match(RULES, /function pendByMe\(\) \{ return pendNew\(\) != null && isMgr\(\) && pendNew\(\)\.by == mail\(\); \}/);
  assert.match(block("match /budget/{id}"), /allow delete: if isMgr\(\) && !\('approved' in resource\.data\);/);
  const p = block("match /players/{id}"), t = block("match /staff/{id}");
  assert.match(p, /allow delete: if isRoster\(\);/);
  assert.match(p, /\|\| \(isStaff\(\) && request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['st'\]\)\)/);
  assert.match(t, /allow delete: if isRoster\(\);/);
});
