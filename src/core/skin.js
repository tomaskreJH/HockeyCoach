// 🎨 Vzhled aplikace: Klasický / Aréna (styles/arena.css) a režim Podle telefonu / Světlý / Tmavý – jen v tomto zařízení (localStorage).
// Vzhled mění jen barvy a písmo (atributy data-skin a data-theme na <html>), funkce ani rozložení obrazovek se nemění.
// První nastavení dělá už krátký skript v index.html (bez probliknutí klasického vzhledu); tento modul ho při změně v ⚙️ přepíše.

// ===== Importy =====
import {IS_BETA} from "./channel.js";
import {LS} from "./utils.js";

// ===== Konstanty =====
export const SKIN_KEY = "hk-skin";                     // "classic" | "arena" (stejný klíč čte index.html)
export const MODE_KEY = "hk-mode";                     // "auto" | "light" | "dark"
export const SKINS = [["classic", "Klasický"], ["arena", "🏟 Aréna"]];
export const MODES = [["auto", "Podle telefonu"], ["light", "☀ Světlý"], ["dark", "🌙 Tmavý"]];
// Barva lišty prohlížeče podle vzhledu (beta má vlastní barvu z views/beta-view.js a nemění se)
const BAR = {classic: "#0b5cad", arena: "#0d2238"};

// ===== Pomocné funkce =====
const pick = (list, v, def) => list.some(([k]) => k === v) ? v : def;
// Uložený vzhled a režim (neznámá hodnota = výchozí)
export const skinOf = () => pick(SKINS, LS.get(SKIN_KEY), "classic");
export const modeOf = () => pick(MODES, LS.get(MODE_KEY), "auto");

// ===== Hlavní logika =====
// Promítne vzhled a režim do <html>; „Podle telefonu“ = bez data-theme (styly se řídí nastavením systému)
export function applySkin(skin = skinOf(), mode = modeOf()) {
  if (typeof document === "undefined") return;
  const d = document.documentElement;
  if (skin === "arena") d.dataset.skin = "arena"; else delete d.dataset.skin;
  if (mode === "light" || mode === "dark") d.dataset.theme = mode; else delete d.dataset.theme;
  if (!IS_BETA) { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", BAR[skin] || BAR.classic); }
}
// Uloží volbu z ⚙️ a hned ji použije
export function setSkin(skin, mode) {
  LS.set(SKIN_KEY, pick(SKINS, skin, "classic"));
  LS.set(MODE_KEY, pick(MODES, mode, "auto"));
  applySkin();
}
