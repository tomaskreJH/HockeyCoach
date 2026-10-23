// Tlačítko Zpět: systémové Zpět na telefonu (i v prohlížeči) funguje uvnitř aplikace.
// Princip: v historii prohlížeče jsou nad základním záznamem až DEPTH „strážních záznamů“. Každé Zpět jeden spotřebuje
// (událost popstate) a aplikace zavře nejvyšší otevřenou vrstvu. Okna se zavírají klepnutím na jejich vlastní
// tlačítko Zavřít / Zrušit, takže logika jednotlivých obrazovek se nemění.
// Pravidlo prohlížeče (Chrome): záznam historie vložený bez aktivace uživatelem se při systémovém Zpět přeskočí.
// Aktivací je jen skutečné klepnutí (pointerup / touchend / click od uživatele) nebo klávesa; dotyk prstem (pointerdown)
// ani programové el.click() aktivací nejsou.
// Doplňování zásoby:
//   - strážní záznam se doplní jen při skutečné aktivaci (e.isTrusted) – programové el.click() při zavírání oken
//     nevkládá záznamy, které by Chrome přeskočil (aplikace by se zavřela bez dotazu),
//   - za jedno klepnutí se doplní jen JEDEN záznam (Chrome aktivaci spotřebuje prvním vložením; další záznamy ze stejného
//     klepnutí by byly přeskočitelné a jedno Zpět by jich přeskočilo několik najednou),
//   - záznam se doplní i při klepnutí do dotazu (Ne / Zůstat / mimo okno),
//   - když systémové Zpět spotřebuje poslední strážní záznam, aplikace se vždy zeptá „Ukončit aplikaci?“ (další Zpět
//     už aplikaci opustí, proto nesmí jen potichu zavřít okno),
//   - zásoba je 5 záznamů (víc Zpět po sobě bez klepnutí).
// Pořadí zavírání (od nejvyšší vrstvy):
//   1) okna nad vším (nápověda, úhrada, QR, nastavení pokladny, ⚙️, výběr hráčky a další okna, důvod docházky, opravy, zápis utkání, formulář pokladny),
//   2) živý zápis (rychlý zápis → panel menu → menu ⋯ → dotaz na odchod; při odchodu se zastaví čas),
//   3) formulář události, detail události, detail soupeře, karta zápasu (krok zpět, z 1. kroku na seznam),
//   4) režim záložky Team (Platby / Pokladna / Měsíce → Team), Události (Minulé / Kalendář / Docházka) → Nadcházející,
//      jiná záložka → 🏠 Domů, 👁 náhled živého zápasu → přehled 🏠 Domů,
//   5) domovská stránka (🏠 Domů): dotaz „Ukončit aplikaci?“.
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
  "#evset #esx",               // nastavení událostí (sraz, délka tréninku)
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
const DEPTH = 5;               // zásoba strážních záznamů nad základním záznamem
const ARM = ["pointerdown", "touchstart", "mousedown", "pointercancel"]; // začátek dotyku připraví jedno doplnění, posun ho zruší
const USE = ["pointerup", "touchend", "click", "keydown"];        // aktivace uživatelem = doplní jeden záznam
const EXIT_TITLE = "Ukončit aplikaci?";
let ask = null;                // otevřený dotaz: {yes: funkce, exit: dotaz na ukončení}
let hooks = {};                // obsluha z obrazovek (leaveLive = odchod ze živého zápisu se zastavením času)
let armed = false;             // čeká se na aktivaci z právě začatého dotyku (jedno doplnění za klepnutí)

// ===== Pomocné funkce =====
// Pořadí strážního záznamu (1..DEPTH), 0 = základní záznam (nebo cizí stránka)
const lvl = st => (st && st.hcNav) || 0;
// Doplnění JEDNOHO strážního záznamu – volat jen při skutečné aktivaci uživatelem (více záznamů z jednoho
// klepnutí by Chrome označil k přeskočení)
const refillOne = () => { const n = lvl(history.state); if (n < DEPTH) history.pushState({hcNav: n + 1}, ""); };
// Prvek existuje a je vidět
const vis = el => !!el && el.isConnected && el.getClientRects().length > 0;
// Klepne na první viditelný prvek podle selektoru; vrací, zda se něco zavřelo (programové klepnutí – onUse ho ignoruje)
const tap = sel => { const el = document.querySelector(sel); if (!vis(el)) return false; el.click(); return true; };
const top0 = () => window.scrollTo(0, 0);

// ===== Potvrzovací okno =====
// Vlastní okno nad všemi vrstvami včetně nápovědy (z-index 90, hláška toast má 80)
function closeAsk() { const el = document.getElementById("navq"); if (el) el.remove(); ask = null; }
function openAsk(title, text, yesLabel, noLabel, yes) {
  closeAsk();
  ask = {yes, exit: title === EXIT_TITLE};
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
// Dotaz na ukončení aplikace; last = zásoba strážních záznamů došla (další Zpět aplikaci opustí)
function askExit(last) {
  const text = last ? "Další Zpět aplikaci zavře. Klepni na Ne, chceš-li pokračovat. Data jsou uložená." : "Aplikace se zavře. Data jsou uložená.";
  openAsk(EXIT_TITLE, text, "Ukončit", "Ne", exitApp);
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
  // 2) živý zápis: při odchodu se zastaví čas, nic jiného se nezapisuje
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
  if (S.tab === "ev" && S.evm && S.evm !== "up") { S.evm = "up"; S.evd = null; render(); top0(); return true; }
  if (S.tab === "home" && S.hw) { S.hw = null; render(); top0(); return true; }   // 👁 náhled živého zápasu → přehled
  if (S.tab !== "home") { S.tab = "home"; S.oid = null; S.evid = null; S.evf = null; S.evr = null; S.evBack = null; render(); top0(); return true; }
  // 5) domovská stránka
  return false;
}

// ===== Eventy =====
// Každé Zpět: zavřít vrstvu, nebo se na domovské stránce zeptat na ukončení.
// Došla-li zásoba (základní záznam), další Zpět by aplikaci opustilo – proto vždy dotaz na ukončení
// (otevřený dotaz na ukončení zůstane, jiná vrstva se tímto Zpět nezavírá).
function onPop() {
  if (lvl(history.state) === 0) { if (!(ask && ask.exit)) askExit(true); return; }
  if (!closeTop()) askExit(false);
}
// Začátek skutečného dotyku: připraví jedno doplnění pro aktivaci, která následuje.
// Posun stránky prstem (pointercancel) aktivací není – doplnění se zruší.
function onArm(e) { if (e.isTrusted) armed = e.type !== "pointercancel"; }
// Skutečná aktivace uživatelem: doplní jeden strážní záznam (programová klepnutí e.isTrusted = false se ignorují).
// Jeden dotyk vyvolá pointerup + touchend + click – doplní se jen jednou; klávesa doplní vždy (sama je aktivací).
function onUse(e) {
  if (!e.isTrusted) return;
  if (e.type !== "keydown" && !armed) return;
  armed = false;
  refillOne();
}

// ===== Export =====
// h.leaveLive = odchod ze živého zápisu (zastaví čas a zavře obrazovku); předává main.js z views/live.js
export function initNav(h) {
  if (!window.history || !history.pushState) return;
  hooks = h || {};
  window.addEventListener("popstate", onPop);
  ARM.forEach(t => document.addEventListener(t, onArm, {capture: true, passive: true}));
  USE.forEach(t => document.addEventListener(t, onUse, {capture: true, passive: true}));
}
