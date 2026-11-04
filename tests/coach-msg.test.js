// Testy zprávy od trenéra (domain/coach-msg.js) a jejích pravidel databáze. Čisté funkce bez DOM.
// Struktura: Importy -> Kontrola a dokument -> Zobrazení -> Pravidla a zapojení.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CMSG_MAX, START_WINDOW_MS, cmsgCheck, cmsgDay, cmsgDoc, cmsgPopupDue, cmsgShown, cmsgUnseen} from "../src/domain/coach-msg.js";

// ===== Kontrola a dokument =====
test("cmsgCheck: prázdná ne, příliš dlouhá ne, zalomení řádků zůstanou, okraje se ořežou", () => {
  assert.equal(cmsgCheck("  \n ").ok, false);
  assert.equal(cmsgCheck("x".repeat(CMSG_MAX + 1)).ok, false);
  assert.deepEqual(cmsgCheck("  Ve čtvrtek trénink.\r\nSraz v 18:00.  "), {ok: true, t: "Ve čtvrtek trénink.\nSraz v 18:00."});
  assert.equal(cmsgCheck("x".repeat(CMSG_MAX)).ok, true);
});
test("cmsgDoc: jen pole id, t, bn, by, at; e-mail malými písmeny, prázdný podpis = Trenér, dlouhý podpis se ořízne", () => {
  assert.deepEqual(cmsgDoc("Text", "Honza", "A@X.cz", "2026-11-04T10:00:00.000Z", "m1"), {id: "m1", t: "Text", bn: "Honza", by: "a@x.cz", at: "2026-11-04T10:00:00.000Z"});
  assert.equal(cmsgDoc("T", "", "a@x.cz", "x", "m1").bn, "Trenér");
  assert.equal(cmsgDoc("T", "x".repeat(100), "a@x.cz", "x", "m1").bn.length, 60);
});

// ===== Zobrazení =====
const M = {id: "m1", t: "Ahoj", bn: "Honza", by: "a@x.cz", at: "2026-11-04T10:00:00.000Z"};
test("cmsgShown / cmsgUnseen: zpráva bez textu nebo označení se nezobrazí, viděná zpráva není nová", () => {
  assert.equal(cmsgShown(M), true);
  assert.equal(cmsgShown(null), false);
  assert.equal(cmsgShown({id: "m1", t: " "}), false);
  assert.equal(cmsgShown({t: "Ahoj"}), false);
  assert.equal(cmsgUnseen(M, ""), true);
  assert.equal(cmsgUnseen(M, "m1"), false);
  assert.equal(cmsgUnseen(M, "m0"), true);
  assert.equal(cmsgUnseen(null, ""), false);
});
test("cmsgPopupDue: okno jen u nové zprávy a jen krátce po spuštění aplikace", () => {
  assert.equal(cmsgPopupDue(M, "", 1000, 1000 + START_WINDOW_MS), true);
  assert.equal(cmsgPopupDue(M, "", 1000, 1001 + START_WINDOW_MS), false, "zpráva zadaná za běhu nepřeruší");
  assert.equal(cmsgPopupDue(M, "m1", 1000, 2000), false, "už viděná");
  assert.equal(cmsgPopupDue(null, "", 1000, 2000), false);
});
test("cmsgDay: den a měsíc, neplatný čas prázdný", () => {
  assert.equal(cmsgDay("2026-11-04T12:00:00.000Z"), "4. 11.");
  assert.equal(cmsgDay("blbost"), "");
});

// ===== Pravidla a zapojení =====
test("pravidla coachmsg: čtou členové týmu, zapisuje manager / trenér / asistent jen dokument current, tvar a délky hlídá cmsgOk", () => {
  const r = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const blk = r.slice(r.indexOf("match /coachmsg/{id}"), r.indexOf("// ===== Pokladna: předpisy"));
  assert.match(blk, /allow read: if isTeam\(\);/);
  assert.match(blk, /allow create, update: if isStaff\(\) && id == 'current' && cmsgOk\(request\.resource\.data\);/);
  assert.match(blk, /allow delete: if isStaff\(\);/);
  assert.match(r, /function cmsgOk[\s\S]*hasOnly\(\['id', 't', 'bn', 'by', 'at'\]\)[\s\S]*d\.t\.size\(\) <= 600[\s\S]*d\.by == mail\(\)/);
});
test("zapojení: kolekce je mimo zálohu (EXTRA), poslech v main.js, karta v Domů úplně dole za pokladnou", () => {
  const rd = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
  assert.match(rd("src/data/storage.js"), /const EXTRA = \[[^\]]*CMSG_COLL\]/);
  assert.match(rd("src/main.js"), /db\.doc\(CMSG_COLL \+ "\/" \+ CMSG_ID\)\.onSnapshot/);
  assert.match(rd("src/views/home-view.js"), /\$\{team\}\$\{cmsgCard\(\)\}<\/div>/);
});
