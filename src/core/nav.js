// Tlačítko Zpět (v18.0): systémové Zpět na telefonu (i v prohlížeči) funguje uvnitř aplikace.
// Princip: v historii prohlížeče je vždy jeden „strážní záznam“. Každé Zpět ho spotřebuje (událost popstate),
// aplikace zavře nejvyšší otevřenou vrstvu a strážní záznam vrátí. Okna se zavírají klepnutím na jejich
// vlastní tlačítko Zavřít / Zrušit, takže logika jednotlivých obrazovek se nemění.
// Pořadí zavírání (od nejvyšší vrstvy):
//   1) okna nad vším (nápověda, úhrada, QR, nastavení pokladny, ⚙️, výběr hráčky a další okna, důvod docházky, opravy, zápis utkání, formulář pokladny),
//   2) živý zápis (rychlý zápis → panel menu → menu ⋯ → dotaz na odchod; hodiny běží dál, nic se nezapisuje),
//   3) formulář události, detail události, detail soupeře, karta zápasu (krok zpět, z 1. kroku na seznam),
//   4) režim záložky Team (Platby / Pokladna / Měsíce → Team), jiná záložka → Události, Události → Nadcházející,
//   5) domovská stránka: dotaz „Ukončit aplikaci?“.
// Chrome přeskakuje záznamy historie vytvořené bez dotyku uživatele; příznak se ale zruší, jakmile uživatel
// na stránku klepne. Proto se strážní záznam vkládá hned a znovu se ověří při každém klepnutí.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Potvrzovací okno -> Zavření nejvyšší vrstvy -> Eventy -> Export.

// ===== Importy =====
import {S} from "./state.js";
import {render} from "../views/shell.js";

// ===== Konstanty a stav =====
// Okna, která mají vlastní tlačítko zavření (selektor kontejneru + tlačítka), v pořadí od nejvyšší vrstvy
const DOM_LAYERS = [
  "#hlp #hlx",                 // nápověda
  "#cpay #cpx",                // okno úhrady (pokladna u události)
  "#mkq #mkx",                 // QR platba (Moje platby, banner dluhu)
  "#cset #csx",                // nastavení pokladny
  "#cfg #cz",                  // ⚙️ účet a data
  '#mod [data-pp="x"]',        // výběr hráčky na místo v sestavě
  "#mod #cl",                  // okna zápasu, hráčky, člena týmu, gólu a trestu
  "#evsh #evrc",               // okno s důvodem odpovědi na událost
  "#ed #efc",                  // opravy zápisu: formulář události
  "#ed #sxcn",                 // opravy zápisu: formulář střídání
  "#ed #edx",                  // opravy zápisu
  "#rp #rpx",                  // zápis utkání
  "#app #cbc"                  // pokladna: rozpracovaný vklad / výdaj
];
const MARK = {hcNav: 1};       // značka strážního záznamu v historii
let ask = null;                // otevřený dotaz: {yes: funkce, guard: zda se po zavření vrací strážní záznam}

// ===== Pomocné funkce =====
const isGuard = st => !!(st && st.hcNav);
// Vložení strážního záznamu (jen pokud už není aktuální)
const arm = () => { if (!isGuard(history.state)) history.pushState(MARK, ""); };
// Prvek existuje a je vidět
const vis = el => !!el && el.isConnected && el.getClientRects().length > 0;
// Klepne na první viditelný prvek podle selektoru; vrací, zda se něco zavřelo
const tap = sel => { const el = document.querySelector(sel); if (!vis(el)) return false; el.click(); return true; };
const top0 = () => window.scrollTo(0, 0);

// ===== Potvrzovací okno =====
// Vlastní okno nad všemi vrstvami včetně nápovědy (z-index 90, hláška toast má 80)
function closeAsk() { const el = document.getElementById("navq"); if (el) el.remove(); ask = null; }
function openAsk(title, text, yesLabel, noLabel, yes, guard) {
  closeAsk();
  ask = {yes, guard};
  const el = document.createElement("div");
  el.id = "navq";
  el.className = "md";
  el.style.zIndex = "90";
  el.innerHTML = `<div class="mb"><h2>${title}</h2><div class="mu" style="margin-bottom:12px">${text}</div><div class="row"><button class="p" data-nq="yes" style="min-height:52px">${yesLabel}</button><button class="s" data-nq="no" style="min-height:52px">${noLabel}</button></div></div>`;
  document.body.appendChild(el);
  // Ne / klepnutí mimo okno: zavřít; u dotazu na ukončení se strážní záznam vrátí
  const no = () => { const g = ask && ask.guard; closeAsk(); if (g) arm(); };
  el.querySelector('[data-nq="no"]').onclick = no;
  el.onclick = e => { if (e.target === el) no(); };
  el.querySelector('[data-nq="yes"]').onclick = () => { const f = ask && ask.yes; closeAsk(); if (f) f(); };
}
// Ukončení aplikace: strážní záznam už je spotřebovaný, Zpět opustí stránku.
// Pokud je aplikace na začátku historie (spuštěná z plochy), prohlížeč ji skriptem zavřít nedovolí – pak stačí ještě jednou Zpět.
function exitApp() {
  const before = location.href;
  try { window.close(); } catch (e) { /* okno nelze zavřít skriptem */ }
  history.back();
  setTimeout(() => {
    if (location.href === before && document.visibilityState === "visible") {
      openAsk("Ukončení aplikace", "Aplikaci zavřeš dalším stisknutím tlačítka Zpět na telefonu.", "Rozumím", "Zůstat", null, true);
    }
  }, 400);
}

// ===== Zavření nejvyšší vrstvy =====
// Vrací true, pokud se něco zavřelo (strážní záznam se má vrátit); false = jsme na domovské stránce
function closeTop() {
  // 0) vlastní dotaz (Zpět = Ne)
  if (ask) { closeAsk(); return true; }
  // 1) okna s tlačítkem zavření
  if (DOM_LAYERS.some(tap)) return true;
  // 2) živý zápis: nic se nezapisuje, hodiny běží dál
  if (S.lv && vis(document.getElementById("lv"))) {
    if (S.qa) { if (!tap('#lv [data-qb="x"]')) { S.qa = null; render(); } return true; }
    if (S.lmenu && S.lsub) { if (!tap('#lv [data-m="back"]')) { S.lsub = null; S.injp = null; render(); } return true; }
    if (S.lmenu) { if (!tap('#lv [data-m="cl"]')) { S.lmenu = false; S.injp = null; render(); } return true; }
    openAsk("Odejít ze živého zápisu?", "Hodiny běží dál a nic se nezapíše. Do živého zápisu se vrátíš z karty zápasu.", "Odejít", "Zůstat", () => { S.lv = false; S.qa = null; S.lmenu = false; S.lsub = null; S.injp = null; render(); }, false);
    return true;
  }
  // 3) formuláře a detaily
  if (S.evf) { if (!tap("#evfx")) { S.evf = null; render(); } top0(); return true; }
  if (S.tab === "ev" && S.evid) { if (!tap("#evb")) { S.evid = null; render(); } top0(); return true; }
  if (S.tab === "op" && S.oid) { S.oid = null; render(); top0(); return true; }
  if (S.mid) { if ((S.step || 1) > 1) S.step = (S.step || 1) - 1; else S.mid = null; render(); top0(); return true; }
  // 4) režimy a záložky
  if (S.tab === "fo" && S.tm && S.tm !== "team") { S.tm = "team"; render(); top0(); return true; }
  if (S.tab !== "ev") { S.tab = "ev"; S.oid = null; S.evid = null; S.evf = null; S.evr = null; S.evBack = null; render(); top0(); return true; }
  if (S.evm && S.evm !== "up") { S.evm = "up"; S.evd = null; render(); top0(); return true; }
  // 5) domovská stránka
  return false;
}

// ===== Eventy =====
function onPop() {
  if (isGuard(history.state)) return;            // návrat na strážní záznam (např. po Ne) – nic nedělat
  if (closeTop()) { arm(); return; }
  // Domovská stránka: strážní záznam se nevrací – dalším Zpět aplikace skončí i bez potvrzení
  openAsk("Ukončit aplikaci?", "Aplikace se zavře. Data jsou uložená.", "Ukončit", "Ne", exitApp, true);
}

// ===== Export =====
export function initNav() {
  if (!window.history || !history.pushState) return;
  arm();
  window.addEventListener("popstate", onPop);
  // Klepnutí uživatele: obnoví strážní záznam, pokud chybí (a zruší příznak „bez dotyku“ v Chrome)
  document.addEventListener("pointerdown", () => { if (!ask) arm(); }, {capture: true, passive: true});
}
