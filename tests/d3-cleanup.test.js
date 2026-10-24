// Testy úklidu D3 (mazání a částečné zápisy): starý tvar osvobozené se nečte, pravidla bez coach a poznámek o payments,
// potvrzení druhým klepnutím jen přes confirm2, nápověda bez čísel verzí a částečný zápis dokumentu (merge) v datové vrstvě.
// Struktura: Importy -> Pomocné funkce -> Mazání -> Potvrzení a nápověda -> Částečný zápis (merge).

// ===== Importy =====
import {test, before} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, statSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {HK} from "../src/data/storage.js";

// ===== Pomocné funkce =====
const ROOT = fileURLToPath(new URL("../", import.meta.url)), SRC = join(ROOT, "src");
const read = p => readFileSync(join(ROOT, p), "utf8");
// Všechny zdroje aplikace kromě cizí knihovny (src/lib)
const files = (d = SRC) => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? (f === "lib" ? [] : files(p)) : p.endsWith(".js") ? [p] : []; });
const grep = re => files().filter(p => re.test(readFileSync(p, "utf8"))).map(p => p.slice(SRC.length + 1).replace(/\\/g, "/")).sort();
let db = null;
before(async () => {
  globalThis.__fb = {user: {email: "coach@test.cz", uid: "u1"}, members: {"coach@test.cz": {role: "trener"}}, data: {}, writes: []};
  db = await HK.ready();
});
const last = () => globalThis.__fb.writes[globalThis.__fb.writes.length - 1];

// ===== Mazání =====
test("D3: starý tvar osvobozené (legacyEx) je pryč, převod zůstává jen v ⚙️ → Kontrola dat", () => {
  assert.deepEqual(grep(/legacyEx/), []);
  assert.deepEqual(grep(/exFixPlan\b/), ["data/storage.js", "domain/cash.js"]);
});
test("D3: pravidla bez kolekce coach a bez poznámek o payments", () => {
  const rules = read("firestore.rules");
  assert.ok(!/match \/coach\//.test(rules), "pravidlo coach smazáno");
  assert.ok(!/payments/.test(rules), "poznámka o payments smazána");
  assert.deepEqual(grep(/kolekce payments|Kolekce payments/i), []);
  assert.ok(!/v1\d\.\d/.test(rules), "komentáře pravidel bez historie verzí");
});

// ===== Potvrzení a nápověda =====
test("D3: potvrzení druhým klepnutím bez vlastních příznaků (jen confirm2)", () => {
  // (core/nav.js má vlastní příznak „armed“ pro tlačítko Zpět – nejde o potvrzení)
  assert.deepEqual(grep(/dataset\.armed|let arm\b/), []);
  // Okno ⚙️ je v views/settings-view.js (potvrzení přes arm2 → confirm2)
  assert.ok(!/let armed\b/.test(read("src/views/settings-view.js")), "⚙️ bez vlastního příznaku");
  assert.ok(/arm2\(q\("#cr"\)/.test(read("src/views/settings-view.js")), "Nahradit vším přes confirm2");
  assert.ok(/arm2\(q\("#cmv"\)/.test(read("src/views/settings-view.js")), "Vyžadovat verzi přes confirm2");
  assert.ok(/confirm2\(key, fn, draw\)/.test(read("src/views/settings-view.js")), "arm2 volá společné confirm2");
  assert.ok(/confirm2\(TD_KEY/.test(read("src/views/cash-settings.js")), "smazání šablony přes confirm2");
});
test("D3: nápověda bez čísel verzí", () => {
  assert.ok(!/\bv1\d(\.\d+)+/.test(read("src/views/help.js")));
});

// ===== Částečný zápis (merge) =====
test("D3: doc.merge zapíše jen uvedená pole (mergeFields), undefined a __del pole smažou", async () => {
  await db.doc("players/a").merge({st: "inj", alt: undefined, note: "__del"});
  assert.deepEqual(last(), {path: "players/a", d: {st: "inj", alt: "__del", note: "__del"}, opt: {mergeFields: ["st", "alt", "note"]}});
});
test("D3: dávkový merge se nemění (undefined se vynechá, __del smaže pole)", async () => {
  await db.batch().merge("events/e1", {ss: "__del", x: undefined, y: 1}).commit();
  assert.deepEqual(last(), {path: "events/e1", d: {ss: "__del", y: 1}, opt: {merge: true}});
});
test("D3: okna a pohledy zapisují nová pole přes merge (ne set celého dokumentu)", () => {
  const modal = read("src/views/modal.js"), ev = read("src/views/events.js"), cs = read("src/views/cash-settings.js"), lp = read("src/views/live-panels.js");
  assert.ok(!/doc\("players\/"\+M\.id\)\.set\(/.test(modal) && !/doc\("staff\/"\+M\.id\)\.set\(/.test(modal), "hráčka a člen týmu");
  assert.ok(/doc\("events\/" \+ ev\.id\)\.merge\(\{lines\}\)/.test(ev), "pětky tréninku");
  assert.ok(/doc\("events\/" \+ f\.id\)\.merge\(d\)/.test(ev), "úprava tréninku");
  assert.ok(/doc\("settings\/cash"\)\.merge\(D\)/.test(cs), "nastavení pokladny");
  assert.ok(/doc\("players\/"\+id\)\.merge\(\{st:"inj"\}\)/.test(lp), "trvalé zranění");
});
