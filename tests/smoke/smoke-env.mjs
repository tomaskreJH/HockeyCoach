// Kouřový test: prostředí prohlížeče v Node (jsdom podle index.html) a přesměrování Firebase SDK na smoke-fb.mjs.
// Načítá se přes --import před aplikací. Čas je zmrazený (NOW), aby vykreslené HTML šlo porovnat mezi dvěma běhy.

// ===== Importy =====
import {readFileSync} from "node:fs";
import {register} from "node:module";
import {JSDOM} from "jsdom";

// ===== Konstanty =====
export const NOW = Date.parse("2026-10-26T17:10:00+01:00");          // pondělí 26. 10. 2026, 17:10 (trénink e1 běží od 17:00)
const ROOT = new URL("../../", import.meta.url);

// ===== Zmrazený čas =====
const RealDate = Date;
class FrozenDate extends RealDate {
  constructor(...a) { if (a.length) super(...a); else super(NOW); }
  static now() { return NOW; }
}

// ===== Opakovatelná náhoda =====
// Nová id (Math.random) vyjdou v každém běhu stejně – HTML dvou verzí jde porovnat
let seed = 42;
Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

// ===== Prohlížeč =====
const html = readFileSync(new URL("index.html", ROOT), "utf8").replace(/<script[^>]*src="src\/main\.js"[^>]*><\/script>/, "");
// Adresa stránky: stabilní kořen, s --beta (SMOKE_URL ze smoke-run.mjs) složka 🧪 bety
const dom = new JSDOM(html, {url: process.env.SMOKE_URL || "https://hockeycoach.test/", pretendToBeVisual: true});
const w = dom.window;
w.Date = FrozenDate;
globalThis.Date = FrozenDate;
// Vlastnosti okna, které aplikace používá jako globální
const pass = ["window", "document", "navigator", "location", "history", "localStorage", "sessionStorage", "HTMLElement", "Element", "Node",
  "Event", "CustomEvent", "KeyboardEvent", "MouseEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "DOMParser",
  "Blob", "FileReader", "Image", "HTMLCanvasElement", "matchMedia", "scrollTo", "innerWidth", "innerHeight", "screen", "alert", "confirm", "prompt"];
w.matchMedia = w.matchMedia || (q => ({matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}}));
w.scrollTo = () => {};
w.alert = () => {};
w.confirm = () => true;
w.prompt = () => null;
w.HTMLElement.prototype.scrollIntoView = function () {};
pass.forEach(k => { if (w[k] !== undefined) Object.defineProperty(globalThis, k, {value: k === "window" ? w : w[k], configurable: true, writable: true}); });
// Ostatní rozhraní okna (MutationObserver, HTMLInputElement …), která Node nemá
Object.getOwnPropertyNames(w).forEach(k => { if (!(k in globalThis)) try { globalThis[k] = w[k]; } catch (e) { /* jen ke čtení */ } });
globalThis.self = w;
// Chyby stránky se počítají jako selhání kouřového testu
globalThis.__smokeErr = [];
w.addEventListener("error", e => globalThis.__smokeErr.push("window error: " + (e.error && e.error.stack || e.message)));
process.on("unhandledRejection", e => globalThis.__smokeErr.push("unhandledRejection: " + (e && e.stack || e)));
for (const k of ["error"]) { const o = console[k]; console[k] = (...a) => { globalThis.__smokeErr.push("console." + k + ": " + a.map(String).join(" ")); o.apply(console, a); }; }

// ===== Přesměrování Firebase SDK =====
register(new URL("./smoke-hooks.mjs", import.meta.url));
