// Testy v22.30 (K2 bod 6 Jednotné hlášky): společné texty (MSG, failMsg), jedna délka zobrazení, potvrzení druhým klepnutím všude stejně
// (žádné okno prohlížeče confirm(), každé „Opravdu …“ končí výzvou „Klepni znovu“).
import test from "node:test";
import assert from "node:assert/strict";
import {readdirSync, readFileSync, statSync} from "node:fs";
import {join} from "node:path";
import {MSG, TOAST_MS, failMsg} from "../src/core/utils.js";
import {CONFIRM_MS} from "../src/core/actions.js";

// ===== Pomocné funkce =====
const ROOT = new URL("../src/", import.meta.url).pathname;
// Všechny zdrojové soubory aplikace (bez cizí knihovny QR)
function files(dir = ROOT) {
  return readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : p.endsWith(".js") && !p.includes("/lib/") ? [p] : []; });
}

// ===== Texty =====
test("failMsg: jednotný tvar „⚠️ … se nepovedlo: důvod“, bez důvodu jen věta; MSG uloženo a offline", () => {
  assert.equal(failMsg("Uložení"), "⚠️ Uložení se nepovedlo");
  assert.equal(failMsg("Smazání", {code: "permission-denied"}), "⚠️ Smazání se nepovedlo: permission-denied");
  assert.equal(failMsg("Odeslání", "offline"), "⚠️ Odeslání se nepovedlo: offline");
  assert.equal(failMsg(), "⚠️ Uložení se nepovedlo");
  assert.match(MSG.saved, /^✅ Uloženo$/);
  assert.match(MSG.offline, /^📶 .*odešle se po připojení$/);
  assert.equal(TOAST_MS, 3500);
  assert.equal(CONFIRM_MS, 4000);
});

// ===== Kontrola zdrojů =====
test("zdroje: žádné okno prohlížeče confirm(), žádná vlastní hláška „… se nepovedlo“ mimo failMsg, každé „Opravdu …“ s „Klepni znovu“", () => {
  const bad = [], notArm = [], oldFail = [];
  files().forEach(p => {
    const s = readFileSync(p, "utf8");
    if (/(^|[^\w.2])confirm\(/m.test(s.replace(/confirm2\(/g, ""))) bad.push(p);
    (s.match(/"Opravdu[^"]*"/g) || []).filter(t => !/klepni znovu/i.test(t)).forEach(t => notArm.push(p.replace(ROOT, "") + " " + t));
    (s.match(/toast\("(Uložení|Smazání|Zrušení|Odeslání|Doplnění) se nepoved/g) || []).forEach(t => oldFail.push(p.replace(ROOT, "") + " " + t));
  });
  assert.deepEqual(bad, [], "okno confirm() místo potvrzení druhým klepnutím");
  assert.deepEqual(notArm, [], "potvrzovací text bez „Klepni znovu“");
  assert.deepEqual(oldFail, [], "vlastní text chyby místo failMsg");
});
