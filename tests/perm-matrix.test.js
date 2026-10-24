// Testy matice práv settings/perm (OM2): upravitelné buňky, čištění uložené matice, změny a přehled „kdo co smí“,
// srovnání – bez settings/perm a s libovolnou maticí upravitelných buněk dávají zkratky HK.can stejný výsledek jako v20.4,
// skutečné HK.can / HK.perm / zápis matice přes zástupce Firebase (samostatný proces na roli) a text pravidel (výchozí matice = DEFAULT_PERMS).
// Struktura: Importy -> Pomocné funkce -> Testy domény -> Testy aplikace -> Testy pravidel.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {CAN_ACTS, DEFAULT_PERMS, EDITABLE, MATRIX_ROLES, MODULES, PERM_VER, ROLE_KEYS, actOf, isEditable, permClean, permDiff, permDiffText, permDoc, permGrid, permOf, permOverview} from "../src/domain/permissions.js";

// ===== Pomocné funkce =====
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const probe = (role, cash, rv, roles) => JSON.parse(execFileSync(process.execPath, ["--import", "./tests/support/setup.mjs", "tests/support/perm-probe.mjs", role, cash ? "1" : "0", rv ? String(rv) : "", roles ? JSON.stringify(roles) : ""], {cwd: ROOT, encoding: "utf8"}));
// Matice, kde je každá upravitelná buňka opačně než výchozí
function flipped() {
  const out = {};
  MATRIX_ROLES.forEach(r => EDITABLE[r].forEach(k => { const [m, a] = k.split("."); out[r] = out[r] || {}; out[r][m] = out[r][m] || {}; out[r][m][a] = !DEFAULT_PERMS[r][m][a]; }));
  return out;
}
const allCells = () => Object.keys(MODULES).flatMap(m => MODULES[m].acts.map(a => [m, a]));

// ===== Testy domény =====
test("EDITABLE: jen role matice a existující moduly a akce; pevné zůstává sport, soupiska, členové, rozpočet, nastavení", () => {
  assert.deepEqual(Object.keys(EDITABLE).sort(), [...MATRIX_ROLES].sort());
  MATRIX_ROLES.forEach(r => EDITABLE[r].forEach(k => { const [m, a] = k.split("."); assert.ok(MODULES[m] && MODULES[m].acts.includes(a), k); }));
  ["trener", "asistent", "hracka"].forEach(r => ["matches.e", "roster.e", "roster.d", "members.e", "budget.e", "app.e", "att.e", "lines.e", "opp.e"].forEach(k => assert.equal(isEditable(r, ...k.split(".")), false, r + " " + k)));
  assert.equal(isEditable("hracka", "events", "e"), false, "hráčka nezapisuje za ostatní");
  assert.equal(isEditable("manager", "events", "e"), false, "manager nejde omezit");
  assert.equal(isEditable("host", "stats", "r"), false, "hostující je mimo matici");
  assert.equal(PERM_VER, 1);
});

test("permClean: jen upravitelné boolean buňky odlišné od výchozích, nesmysly se ignorují", () => {
  assert.deepEqual(permClean(undefined), {});
  assert.deepEqual(permClean("x"), {});
  assert.deepEqual(permClean({trener: {events: {e: false, r: false}, matches: {e: false, d: false}, members: {e: true}}, asistent: {opp: {d: "ano"}}, hracka: {stats: {r: true, x: false}}, host: {stats: {r: true}}}),
    {trener: {events: {e: false}, matches: {d: false}}});
});

test("permGrid, permDiff a text změny; permDoc zapisuje jen rozdíly", () => {
  const g = permGrid({});
  MATRIX_ROLES.forEach(r => EDITABLE[r].forEach(k => { const [m, a] = k.split("."); assert.equal(g[r][m][a], DEFAULT_PERMS[r][m][a]); }));
  g.trener.events.d = false; g.hracka.stats.r = false;
  const d = permDiff({}, g);
  assert.deepEqual(d.map(x => [x.role, x.mod, x.act, x.from, x.to]), [["trener", "events", "d", true, false], ["hracka", "stats", "r", true, false]]);
  assert.equal(permDiffText(d[0]), "Trenér · Události a tréninky · mazat: ⛔ nesmí");
  assert.deepEqual(permDiff(permClean(g), g), [], "uložená matice = rozpracovaná, žádná změna");
  assert.deepEqual(permDoc(g, "Boss@X.cz", "t"), {v: 1, roles: {trener: {events: {d: false}}, hracka: {stats: {r: false}}}, by: "boss@x.cz", at: "t"});
  assert.deepEqual(permDoc(permGrid({}), "a", "b").roles, {}, "výchozí hodnoty = prázdná matice");
});

test("permOverview: manager vše, hostující nic, ostatní podle matice; upravitelné akce u řádku", () => {
  const o = permOverview({trener: {opp: {d: false}}});
  const opp = o.find(x => x.mod === "opp"), ev = o.find(x => x.mod === "events");
  assert.deepEqual(ev.roles.manager, ["r", "e", "c", "d"]);
  assert.deepEqual(opp.roles.trener, ["r", "e"]);
  assert.deepEqual(opp.roles.hracka, ["r"]);
  assert.deepEqual(opp.edit.trener, ["r", "d"]);
  assert.equal(o.length, Object.keys(MODULES).length);
});

test("srovnání: bez settings/perm i s libovolnou maticí upravitelných buněk jsou zkratky HK.can stejné jako ve v20.4", () => {
  const F = flipped();
  ROLE_KEYS.forEach(r => [false, true].forEach(c => [false, true].forEach(dev => CAN_ACTS.forEach(a => {
    const base = actOf(r, c, a, dev);
    assert.equal(actOf(r, c, a, dev, {}), base, `${r} ${c} ${a} prázdná matice`);
    assert.equal(actOf(r, c, a, dev, permClean(F)), base, `${r} ${c} ${a} převrácená matice`);
  }))));
});

test("srovnání: bez matice permOf = výchozí; převrácená matice mění jen upravitelné buňky", () => {
  const F = permClean(flipped());
  MATRIX_ROLES.forEach(r => allCells().forEach(([m, a]) => {
    assert.equal(permOf(r, m, a, {}), DEFAULT_PERMS[r][m][a]);
    assert.equal(permOf(r, m, a, F), isEditable(r, m, a) ? !DEFAULT_PERMS[r][m][a] : DEFAULT_PERMS[r][m][a], r + " " + m + " " + a);
  }));
});

// ===== Testy aplikace (skutečné HK.can / HK.perm přes zástupce Firebase) =====
test("aplikace: bez settings/perm stejné HK.can jako v20.4, HK.perm výchozí", () => {
  const t = probe("trener", false, 2);
  assert.deepEqual(t.can, {sport: true, money: false, members: false, roster: true, accounts: false, admin: false, onlyOwn: false, guest: false, wipe: false});
  assert.equal(t.perm["events.d"], true);
  assert.equal(t.perm["members.e"], false);
  assert.equal(t.state.set, false);
  assert.equal(t.saved, false, "trenér matici neuloží");
  assert.deepEqual(t.writes, []);
  const h = probe("hracka", false, 0);
  assert.equal(h.perm["stats.r"], true);
  assert.equal(h.perm["events.e"], false);
});

test("aplikace: matice se projeví v HK.perm, zkratky HK.can se nemění, pevné buňky se ignorují", () => {
  const roles = {trener: {events: {e: false, c: false}, opp: {r: false}, matches: {e: false}, members: {e: true}}, asistent: {matches: {d: false}}, hracka: {stats: {r: false}, attview: {r: false}}};
  const t = probe("trener", false, 2, roles);
  assert.deepEqual(t.can, {sport: true, money: false, members: false, roster: true, accounts: false, admin: false, onlyOwn: false, guest: false, wipe: false});
  assert.equal(t.perm["events.e"], false); assert.equal(t.perm["events.c"], false); assert.equal(t.perm["opp.r"], false);
  assert.equal(t.perm["matches.e"], true, "pevná buňka zůstává");
  assert.equal(t.perm["members.e"], false, "pevná buňka zůstává");
  assert.equal(t.state.set, true); assert.equal(t.state.by, "boss@test.cz");
  const k = probe("kustod", false, 0, roles);
  assert.equal(k.perm["matches.d"], false, "stará role kustod = asistent");
  assert.equal(k.can.sport, true);
  const h = probe("hracka", false, 0, roles);
  assert.equal(h.perm["stats.r"], false); assert.equal(h.perm["attview.r"], false); assert.equal(h.perm["opp.r"], true);
  const s = probe("host", false, 0, roles);
  assert.ok(Object.values(s.perm).every(v => v === false), "hostující nemá nic z matice");
});

test("aplikace: manager (i starý trenér bez rv) smí vše a matici uloží jen s upravitelnými rozdíly", () => {
  ["manager|2", "trener|"].forEach(x => {
    const [role, rv] = x.split("|"), m = probe(role, false, rv, {trener: {events: {e: false}}});
    assert.ok(Object.values(m.perm).every(v => v === true), role + " smí vše");
    assert.equal(m.saved, true);
    assert.equal(m.writes.length, 1);
    assert.deepEqual(m.writes[0].d.roles, {trener: {events: {d: false}}});
    assert.equal(m.writes[0].d.by, "x@test.cz");
    assert.equal(m.writes[0].d.v, 1);
  });
});

// ===== Testy pravidel (kontrola textu firestore.rules) =====
test("pravidla: výchozí matice permDef = DEFAULT_PERMS, účinná role a can() podle modulu", () => {
  const r = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const lit = r.match(/function permDef\(\) \{ return \{([\s\S]*?)\n    \}; \}/);
  assert.ok(lit, "chybí permDef");
  const parsed = JSON.parse("{" + lit[1].replace(/'/g, '"') + "}");
  assert.deepEqual(parsed, JSON.parse(JSON.stringify(DEFAULT_PERMS)));
  assert.match(r, /function myRole\(\) \{ return role\(\); \}/);
  assert.match(r, /function canAs\(r, mod, act\) \{ return r == 'manager' \|\| \(r in \['trener', 'asistent', 'hracka'\] && permVal/);
  assert.match(r, /function can\(mod, act\) \{ return isMember\(\) && canAs\(myRole\(\), mod, act\); \}/);
  assert.match(r, /function permSettingsOk\(\) \{\s+return isMgr\(\)/);
  const block = name => r.match(new RegExp("match \\/" + name + "\\/\\{id\\} \\{([\\s\\S]*?)\\n    \\}"))[1];
  assert.match(block("matches"), /allow create: if can\('matches', 'e'\);/);
  assert.match(block("matches"), /allow delete: if can\('matches', 'd'\);/);
  assert.match(block("matches"), /allow update: if evUpdate\('matches'\) \|\| \(isCash\(\) && cashFieldsOnly\(\)\);/);
  assert.match(block("events"), /allow update: if evUpdate\('events'\) \|\| \(isCash\(\) && cashFieldsOnly\(\)\);/);
  assert.match(block("opponents"), /allow delete: if can\('opp', 'd'\);/);
  assert.match(r, /\(can\(mod, 'c'\) && chKeys\(\)\.hasOnly\(\['cancelled'\]\)\)/);
});
