// Testy vzhledu „Čistý“ (v22.40): rozklad emoji na černobílé ikony, stav karty události, zapojení stylů (jen zobrazení).
// Struktura: Pomocné funkce -> Emoji -> Stav karty -> Zapojení vzhledu.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {hasEmoji, splitEmoji} from "../src/core/emoji-clean.js";
import {SKINS} from "../src/core/skin.js";
import {cardState} from "../src/domain/event-helpers.js";

// ===== Pomocné funkce =====
const read = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const text = parts => parts.map(p => p.t !== undefined ? p.t : p.e).join("");

// ===== Emoji =====
test("splitEmoji: ✅ ❌ ❓ se změní na prosté znaky, ostatní emoji se označí", () => {
  assert.deepEqual(splitEmoji("✅ Jdu"), [{t: "✓"}, {t: " Jdu"}]);
  assert.deepEqual(splitEmoji("❌"), [{t: "✕"}]);
  assert.deepEqual(splitEmoji("❓ Nejsem jistý"), [{t: "?"}, {t: " Nejsem jistý"}]);
  assert.deepEqual(splitEmoji("🚫 Trest"), [{e: "🚫"}, {t: " Trest"}]);
  assert.deepEqual(splitEmoji("⚙️"), [{e: "⚙️"}]);
});
test("splitEmoji: běžný text, číslice, © a šipky zůstanou beze změny", () => {
  const s = "Přihlášení do 4. 11. 2026 · 12:30 → © Střely";
  assert.deepEqual(splitEmoji(s), [{t: s}]);
  assert.equal(hasEmoji(s), false);
  assert.equal(hasEmoji(""), false);
  assert.equal(hasEmoji(null), false);
});
test("splitEmoji: text po složení je stejný jako původní (až na ✅ ❌ ❓)", () => {
  const s = "🏠 Domů · 🔒 Uzavřeno · ⏱ 12:30 · 💰 Zaplaceno · ✏️ Upravit";
  assert.equal(text(splitEmoji(s)), s);
  assert.equal(hasEmoji(s), true);
});

// ===== Stav karty =====
test("cardState: odpověď, bez odpovědi, uzavřeno a zrušeno", () => {
  assert.deepEqual(cardState({st: "yes"}, false, false, true), {k: "yes", t: "Jdu"});
  assert.deepEqual(cardState({st: "no"}, false, false, true), {k: "no", t: "Nejdu"});
  assert.deepEqual(cardState({st: "maybe"}, false, false, true), {k: "maybe", t: "Nejsem jistý"});
  assert.deepEqual(cardState(null, false, false, true), {k: "none", t: "Bez odpovědi"});
  assert.deepEqual(cardState(null, false, true, true), {k: "off", t: "Uzavřeno"});
  assert.deepEqual(cardState({st: "yes"}, true, true, true), {k: "off", t: "Zrušeno"});
});
test("cardState: bez propojeného člena se stav neukazuje, zrušení ano", () => {
  assert.deepEqual(cardState(null, false, false, false), {k: "", t: ""});
  assert.deepEqual(cardState(null, true, false, false), {k: "off", t: "Zrušeno"});
});

// ===== Zapojení vzhledu =====
test("vzhled Čistý: je v nabídce, v index.html, v offline cache a má styly", () => {
  assert.ok(SKINS.some(([k, n]) => k === "clean" && n === "Čistý"));
  const html = read("index.html"), sw = read("sw.js"), css = read("styles/clean.css");
  assert.match(html, /styles\/clean\.css/);
  assert.match(html, /k==="clean"\)d\.dataset\.clean="1"/);
  assert.match(html, /<b>STŘELY<\/b>/);
  assert.match(html, /<img src="logo-strely\.png"/, "oficiální logo v záhlaví");
  assert.ok(sw.includes('"logo-strely.png"'), "logo v offline cache");
  assert.ok(sw.includes('"styles/clean.css"'));
  assert.match(html, /<div id="tabbar"/);
  assert.match(css, /:root\[data-clean\] #tabbar \{/);
  assert.match(read("src/views/shell.js"), /const ICONS = \{/);
  assert.match(css, /\.evi\[data-ety="match"\] > \.evh \{ background: var\(--ac\)/);
  assert.ok(!css.includes("::before"), "pruh stavu bez textu");
  assert.ok(!read("src/views/event-core.js").includes("data-evt"), "karta nenese text stavu");
  // Bez stínů; přechod barev je povolený jen u podbarvení stavu karty události (.evi a její záhlaví .evh), jinde nikde
  const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/box-shadow: 0/.test(code), "čistý styl bez stínů");
  const grad = code.split("\n").filter(l => l.includes("gradient"));
  assert.equal(grad.length, 2, "přechod jen u karty události a jejího záhlaví");
  assert.ok(grad.every(l => l.includes(".evi") && l.includes("--evc")), "přechod nese barvu stavu karty");
});
