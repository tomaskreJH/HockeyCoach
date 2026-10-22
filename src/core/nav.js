// Tlačítko Zpět (v18.0, oprava v18.1): systémové Zpět na telefonu (i v prohlížeči) funguje uvnitř aplikace.
// Princip: v historii prohlížeče jsou nad základním záznamem až 3 „strážní záznamy“. Každé Zpět jeden spotřebuje
// (událost popstate) a aplikace zavře nejvyšší otevřenou vrstvu. Okna se zavírají klepnutím na jejich vlastní
// tlačítko Zavřít / Zrušit, takže logika jednotlivých obrazovek se nemění.
// Oprava v18.1: Chrome přeskakuje záznamy historie vložené bez aktivace uživatelem. Dotyk prstem (pointerdown) aktivací
// není – aktivací je až puštění prstu / klepnutí (pointerup, touchend, click) nebo klávesa. Strážní záznamy se proto
// doplňují jen při takové aktivaci a do zásoby (3), aby i několik Zpět po sobě bez klepnutí došlo až k dotazu na ukončení.
// Pořadí zavírání (od nejvyšší vrstvy):
//   1) okna nad vším (nápověda, úhrada, QR, nastavení pokladny, ⚙️, výběr hráčky a další okna, důvod docházky, opravy, zápis utkání, formulář pokladny),
//   2) živý zápis (rychlý zápis → panel menu → menu ⋯ → dotaz na odchod; při odchodu se zastaví čas – v18.1),
//   3) formulář události, detail události, detail soupeře, karta zápasu (krok zpět, z 1. kroku na seznam),
//   4) režim záložky Team (Platby / Pokladna / Měsíce → Team), jiná záložka → Události, Události → Nadcházející,
//   5) domovská stránka: dotaz „Ukončit aplikaci?“.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Potvrzovací okno -> Ukončení aplikace -> Zavření nejvyšší vrstvy -> Eventy -> Export.

// ===== Importy =====
import {S} from "./state.js";
import {toast} from "./utils.js";
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
const DEPTH = 3;               // zásoba strážních záznamů nad základním záznamem
let ask = null;                // otevřený dotaz: {yes: funkce}
let hooks = {};                // obsluha z obrazovek (leaveLive = odchod ze živého zápisu se zastavením času)

// ===== Pomocné funkce =====
// Pořadí strážního záznamu (1..DEPTH), 0 = základní záznam (nebo cizí stránka)
const lvl = st => (st && st.hcNav) || 0;
// Doplnění zásoby strážních záznamů – volat jen při aktivaci uživatelem
const refill = () => { for (let n = lvl(history.state); n < DEPTH; n++) history.pushState({hcNav: n + 1}, ""); };
// Prvek existuje a je vidět
const vis = el => !!el && el.isConnected && el.getClientRects().length > 0;
// Klepne na první viditelný prvek podle selektoru; vrací, zda se něco zavřelo
const tap = sel => { const el = document.querySelector(sel); if (!vis(el)) return false; el.click(); return true; };
const top0 = () => window.scrollTo(0, 0);

// ===== Potvrzovací okno =====
// Vlastní okno nad všemi vrstvami včetně nápovědy (z-index 90, hláška toast má 80)
function closeAsk() { const el = document.getElementById("navq"); if (el) el.remove(); ask = null; }
function openAsk(title, text, yesLabel, noLabel, yes) {
  closeAsk();
  ask = {yes};
  const el = document.createElement("div");
  el.id = "navq";
  el.className = "md";
  el.style.zIndex = "90";
  el.innerHTML = `<div class="mb"><h2>${title}</h2><div class="mu" style="margin-bottom:12px">${text}</div><div class="row"><button class="p" data-nq="yes" style="min-height:52px">${yesLabel}</button><button class="s" data-nq="no" style="min-height:52px">${noLabel}</button></div></div>`;
  document.body.appendChild(el);
  el.querySelector('[data-nq="no"]').onclick = closeAsk;
  el.onclick = e => { if (e.target === el) closeAsk(); };
  el.querySelector('[data-nq="yes"]').onclick = () => { const f = ask && ask.yes; closeAsk(); if (f) f(); };
}

// ===== Ukončení aplikace =====
// Odejde ze všech strážních záznamů a o jeden dál (opustí aplikaci). Aplikaci spuštěnou z plochy je její záznam první
// v historii – skript ji pak zavřít nesmí, proto zůstane jen na základním záznamu a další systémové Zpět ji zavře.
function exitApp() {
  const n = lvl(history.state), before = location.href;
  try { window.close(); } catch (e) { /* okno nelze zavřít skriptem */ }
  history.go(-(n + 1));
  setTimeout(() => {
    if (location.href === before && document.visibilityState === "visible") {
      if (lvl(history.state) > 0) history.go(-lvl(history.state));   // odejít aspoň na základní záznam
      toast("Aplikaci zavřeš ještě jedním stisknutím Zpět.");
    }
  }, 500);
}

// ===== Zavření nejvyšší vrstvy =====
// Vrací true, pokud se něco zavřelo; false = jsme na domovské stránce
function closeTop() {
  // 0) vlastní dotaz (Zpět = Ne)
  if (ask) { closeAsk(); return true; }
  // 1) okna s tlačítkem zavření
  if (DOM_LAYERS.some(tap)) return true;
  // 2) živý zápis: při odchodu se zastaví čas (v18.1), nic jiného se nezapisuje
  if (S.lv && vis(document.getElementById("lv"))) {
    if (S.qa) { if (!tap('#lv [data-qb="x"]')) { S.qa = null; render(); } return true; }
    if (S.lmenu && S.lsub) { if (!tap('#lv [data-m="back"]')) { S.lsub = null; S.injp = null; render(); } return true; }
    if (S.lmenu) { if (!tap('#lv [data-m="cl"]')) { S.lmenu = false; S.injp = null; render(); } return true; }
    openAsk("Odejít ze živého zápisu?", "Čas zápasu se zastaví. Do živého zápisu se vrátíš z karty zápasu (▶ Pokračovat) a hru znovu spustíš tlačítkem ▶ Start.", "Odejít", "Zůstat", () => { if (hooks.leaveLive) hooks.leaveLive(); else { S.lv = false; render(); } });
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
// Každé Zpět: zavřít vrstvu, nebo se na domovské stránce zeptat na ukončení
function onPop() { if (!closeTop()) openAsk("Ukončit aplikaci?", "Aplikace se zavře. Data jsou uložená.", "Ukončit", "Ne", exitApp); }
// Aktivace uživatelem: doplnit zásobu strážních záznamů (ne během dotazu – tlačítka dotazu se postarají sama)
function onUse() { if (!ask) refill(); }

// ===== Export =====
// h.leaveLive = odchod ze živého zápisu (zastaví čas a zavře obrazovku); předává main.js z views/live.js
export function initNav(h) {
  if (!window.history || !history.pushState) return;
  hooks = h || {};
  window.addEventListener("popstate", onPop);
  ["pointerup", "touchend", "click", "keydown"].forEach(t => document.addEventListener(t, onUse, {capture: true, passive: true}));
}
