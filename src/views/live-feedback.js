// Odezva živého zápisu (v18.2): krátká vibrace haptic(kind) a záblesk tlačítka flash(selektor).
// Vibrace jde vypnout v živém zápisu: ⋯ → ⚙️ Nastavení (pamatuje se v zařízení, LS „hapticOff“).
// Záblesk je vždy – potvrzuje zápis i tam, kde vibrace nejde (iPhone / Safari navigator.vibrate nepodporuje).
// Obrazovka se po každém zápisu znovu vykreslí (nové prvky), proto si záblesk pamatuje selektor a liveRender
// ho po vykreslení dokreslí na nový prvek se stejným časem animace (applyFlash).
// Struktura: Importy -> Konstanty a stav -> Nastavení -> Vibrace -> Záblesk -> Společná odezva.

// ===== Importy =====
import {LS} from "../core/utils.js";

// ===== Konstanty a stav =====
// Vzory vibrací v ms: tap = střídání a střela, ok = gól, trest, pětka, jednotka, undo = vrácení akce, err = akce se neprovedla
const PATTERNS = {tap: 15, ok: 30, undo: [15, 60, 15], err: [60, 40, 60]};
const FLASH_MS = 450;          // délka záblesku (stejná jako animace .hc-flash v main.css)
const LS_KEY = "hapticOff";    // "1" = vibrace vypnutá
let pend = null;               // čekající záblesk: {sel, t}

// ===== Nastavení =====
export const hapticOn = () => LS.get(LS_KEY) !== "1";
export function setHaptic(on) { LS.set(LS_KEY, on ? "0" : "1"); }

// ===== Vibrace =====
// Krátká vibrace podle druhu akce; bez podpory v prohlížeči nebo při vypnutí nic nedělá
export function haptic(kind) {
  if (!hapticOn()) return;
  const p = PATTERNS[kind];
  if (p == null || !navigator.vibrate) return;
  try { navigator.vibrate(p); } catch (e) { /* vibrace nedostupná */ }
}

// ===== Záblesk =====
// Zapamatuje si selektor a hned zablýskne aktuální prvek
export function flash(sel) { pend = {sel, t: Date.now()}; applyFlash(document); }
// Dokreslí probíhající záblesk po novém vykreslení (volá liveRender); animace pokračuje od uplynulého času
export function applyFlash(root) {
  if (!pend) return;
  const age = Date.now() - pend.t;
  if (age >= FLASH_MS) { pend = null; return; }
  const el = (root || document).querySelector(pend.sel);
  if (!el) return;
  el.classList.remove("hc-flash");
  el.style.animationDelay = -age + "ms";
  void el.offsetWidth;                                  // restart animace
  el.classList.add("hc-flash");
  el.addEventListener("animationend", () => { el.classList.remove("hc-flash"); el.style.animationDelay = ""; }, {once: true});
}

// ===== Společná odezva =====
// Vibrace a (volitelně) záblesk prvku podle selektoru
export function feedback(kind, sel) { haptic(kind); if (sel) flash(sel); }
