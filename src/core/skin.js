// 🎨 Vzhled aplikace: Klasický / Aréna (arena.css) / Ledová aréna (arena.css + led.css) / Čistý (clean.css) a režim Podle telefonu / Světlý / Tmavý – jen v tomto zařízení (localStorage).
// Vzhled mění jen barvy, písmo a povrch (atributy data-skin, data-led, data-clean a data-theme na <html>), funkce ani rozložení obrazovek se nemění.
// První nastavení dělá už krátký skript v index.html (bez probliknutí klasického vzhledu); tento modul ho při změně v ⚙️ přepíše.

// ===== Importy =====
import {IS_BETA} from "./channel.js";
import {startEmojiClean, stopEmojiClean} from "./emoji-clean.js";
import {LS} from "./utils.js";

// ===== Konstanty =====
export const SKIN_KEY = "hk-skin";                     // "clean" (výchozí) | "arena" | "led" | "classic" (stejný klíč čte index.html)
export const MODE_KEY = "hk-mode";                     // "auto" | "light" | "dark"
export const SKINS = [["clean", "Čistý"], ["arena", "🏟 Aréna"], ["led", "❄️ Ledová aréna"], ["classic", "Klasický"]];   // výchozí je první (Čistý), Klasický poslední
export const MODES = [["auto", "Podle telefonu"], ["light", "☀ Světlý"], ["dark", "🌙 Tmavý"]];
// Barva lišty prohlížeče podle vzhledu (beta má vlastní barvu z views/beta-view.js a nemění se)
const BAR = {classic: "#0b5cad", arena: "#0d2238", led: "#0b1622", clean: "#1b3a66"};

// ===== Pomocné funkce =====
const pick = (list, v, def) => list.some(([k]) => k === v) ? v : def;
// Uložený vzhled a režim (neznámá hodnota = výchozí)
export const skinOf = () => pick(SKINS, LS.get(SKIN_KEY), "clean");
export const modeOf = () => pick(MODES, LS.get(MODE_KEY), "auto");

// ===== Hlavní logika =====
// Promítne vzhled a režim do <html>; „Podle telefonu“ = bez data-theme (styly se řídí nastavením systému)
export function applySkin(skin = skinOf(), mode = modeOf()) {
  if (typeof document === "undefined") return;
  const d = document.documentElement;
  // Ledová aréna = Aréna (písmo, rozměry) + vlastní barvy z led.css (atribut data-led)
  if (skin === "arena" || skin === "led") d.dataset.skin = "arena"; else delete d.dataset.skin;
  if (skin === "led") d.dataset.led = "1"; else delete d.dataset.led;
  // Čistý = vlastní plochý styl nad Klasickým (data-clean) a černobílé ikony; ostatní vzhledy ikony nemění
  if (skin === "clean") { d.dataset.clean = "1"; startEmojiClean(); } else { delete d.dataset.clean; stopEmojiClean(); }
  if (mode === "light" || mode === "dark") d.dataset.theme = mode; else delete d.dataset.theme;
  if (!IS_BETA) { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", BAR[skin] || BAR.clean); }
}
// Uloží volbu z ⚙️ a hned ji použije
export function setSkin(skin, mode) {
  LS.set(SKIN_KEY, pick(SKINS, skin, "clean"));
  LS.set(MODE_KEY, pick(MODES, mode, "auto"));
  applySkin();
  // Záložky (views/shell.js) se podle vzhledu přesouvají nahoru / dolů – dát jim vědět
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof Event === "function") window.dispatchEvent(new Event("hk-skin"));
}
