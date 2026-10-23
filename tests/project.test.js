// Testy řádu projektu: verze na všech místech, brána verze a pravidla databáze (bez emulátoru – kontrola textu firestore.rules).
// Struktura: Pomocné funkce -> Verze (core/app-version.js, package.json, sw.js, CHANGELOG) -> Brána verze -> Pravidla databáze.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {APP_VERSION, canRaise, cmpVer, isOutdated} from "../src/core/app-version.js";

// ===== Pomocné funkce =====
const read = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
// Blok pravidel „match /kolekce/{id}“ až po jeho uzavírací závorku (tělo začíná první „{“ za koncem hlavičky)
function ruleBlock(rules, head) {
  const i = rules.indexOf(head);
  assert.ok(i >= 0, "pravidlo " + head + " existuje");
  let depth = 0;
  for (let j = rules.indexOf("{", i + head.length); j < rules.length; j++) {
    if (rules[j] === "{") depth++;
    if (rules[j] === "}" && --depth === 0) return rules.slice(i, j + 1);
  }
  return "";
}

// ===== Verze =====
test("verze: core/app-version.js = package.json = nejnovější záznam v CHANGELOG", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.version, APP_VERSION);
  const first = read("CHANGELOG.md").match(/^## v([\d.]+)/m);
  assert.ok(first, "CHANGELOG má záznam verze");
  assert.equal(first[1], APP_VERSION);
});

test("verze: README uvádí aktuální verzi a sw.js má název cache hokej-vNN", () => {
  assert.ok(read("README.md").includes("v" + APP_VERSION), "README uvádí aktuální verzi");
  assert.match(read("sw.js"), /const C = "hokej-v\d+"/);
});

test("verze: číslo verze není v kódu aplikace natvrdo jinde než v core/app-version.js", () => {
  assert.ok(!read("src/data/storage.js").includes('"v' + APP_VERSION), "storage.js bere verzi z core/app-version.js");
});

// ===== Brána verze =====
test("cmpVer: porovnání po číslech (18.10 je novější než 18.9)", () => {
  assert.equal(cmpVer("18.10", "18.9"), 1);
  assert.equal(cmpVer("18.8", "18.8.0"), 0);
  assert.equal(cmpVer("v18.7.1", "18.8"), -1);
  assert.equal(cmpVer("19", "18.9.9"), 1);
});

test("isOutdated: starší verze nezapisuje, chybějící nebo neplatné minimum bránu nezavře", () => {
  assert.equal(isOutdated("18.8", "18.8"), false);
  assert.equal(isOutdated("18.8", "18.8.1"), true);
  assert.equal(isOutdated("18.8", "18.7.1"), false);
  assert.equal(isOutdated("18.8", ""), false);
  assert.equal(isOutdated("18.8", undefined), false);
  assert.equal(isOutdated("18.8", "abc"), false);
});

test("canRaise: minimum jde jen zvýšit", () => {
  assert.equal(canRaise("18.8", ""), true);
  assert.equal(canRaise("18.8", "18.7.1"), true);
  assert.equal(canRaise("18.8", "18.8"), false);
  assert.equal(canRaise("18.8", "18.9"), false);
});

// ===== Pravidla databáze =====
test("pravidla: pokladník spravuje jen členy s rolí hracka a ne vlastní dokument", () => {
  const rules = read("firestore.rules"), m = ruleBlock(rules, "match /members/{email}");
  assert.match(rules, /function cashierMember\(email, d\) \{ return isCash\(\) && email != mail\(\) && d\.role == 'hracka'; \}/);
  assert.match(m, /allow create: if isCoach\(\) \|\| cashierMember\(email, request\.resource\.data\);/);
  assert.match(m, /allow update: if isCoach\(\) \|\| \(cashierMember\(email, request\.resource\.data\) && cashierMember\(email, resource\.data\)\);/);
  assert.match(m, /allow delete: if isCoach\(\) \|\| cashierMember\(email, resource\.data\);/);
  assert.ok(!m.includes("!= 'trener'"), "stará podmínka „jen ne trenér“ zmizela");
});

test("pravidla: settings/app (brána verze) zapisuje jen trenér a nejde smazat", () => {
  const rules = read("firestore.rules"), s = ruleBlock(rules, "match /settings/{id}");
  assert.match(rules, /function appSettingsOk\(\) \{\s+return isCoach\(\)/);
  assert.match(s, /id == 'app' \? appSettingsOk\(\)/);
  assert.match(s, /allow delete: if id != 'cash' && id != 'app' && isStaff\(\);/);
});

test("pravidla: kolekce, které aplikace čte, mají pravidlo", () => {
  const rules = read("firestore.rules");
  ["members", "players", "staff", "matches", "opponents", "settings", "events", "evcash", "evprice", "attendance", "charges", "debtors", "cash", "audit"]
    .forEach(c => assert.ok(rules.includes("match /" + c + "/"), "pravidlo pro " + c));
});
