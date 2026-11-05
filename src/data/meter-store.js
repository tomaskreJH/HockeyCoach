// 📊 Měřič čtení (v22.52): ukládání počtu přečtených dokumentů do localStorage tohoto zařízení (domain/read-meter.js).
// Zápis do paměti je odložený (nejvýš jednou za SAVE_MS, a při skrytí stránky), aby měření samo nezpomalovalo aplikaci. Nikdy nevyhodí výjimku.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Rozhraní.

// ===== Importy =====
import {LS, td} from "../core/utils.js";
import {METER_KEY, addReads, addStart, dayTop, dayTotal, emptyMeter, parseMeter, pruneMeter, recentDays, snapReads} from "../domain/read-meter.js";

// ===== Konstanty a stav =====
const SAVE_MS = 3000;     // odklad zápisu do localStorage
let M = null;             // stav v paměti (načte se při prvním použití)
let timer = null;

// ===== Pomocné funkce =====
// Stav z localStorage (jednou); starší dny se při načtení zahodí
function state() {
  if (!M) M = pruneMeter(parseMeter(LS.get(METER_KEY)), td());
  return M;
}
// Uložení hned (zápis po odkladu i při skrytí stránky)
function flush() {
  clearTimeout(timer); timer = null;
  if (M) LS.set(METER_KEY, JSON.stringify(M));
}
function later() { if (!timer) timer = setTimeout(flush, SAVE_MS); }
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

// ===== Rozhraní =====
// Přičte n přečtených dokumentů kolekce c k dnešku
export function readNote(c, n) { try { addReads(state(), td(), c, n); later(); } catch (e) { /* měření nesmí rozbít aplikaci */ } }
// Přičte jedno spuštění aplikace k dnešku
export function startNote() { try { addStart(state(), td()); later(); } catch (e) { /* měření nesmí rozbít aplikaci */ } }
// Počítadlo jednoho poslechu: vrací funkci, kterou se volá s každým snímkem poslechu kolekce c
export function snapMeter(c) {
  let got = false;
  return snap => {
    try {
      const n = snapReads(snap, got);
      if (!(snap && snap.metadata && snap.metadata.fromCache)) got = true;
      if (n) readNote(c, n);
    } catch (e) { /* měření nesmí rozbít aplikaci */ }
  };
}
// Přehled pro ⚙️ → 💾 Data: dnešek (součet, spuštění, největší kolekce) a poslední dny
export function meterView() {
  try {
    const m = state(), today = td();
    return {today, total: dayTotal(m, today), starts: m.s[today] || 0, top: dayTop(m, today, 6), days: recentDays(m, 7)};
  } catch (e) { return {today: td(), total: 0, starts: 0, top: [], days: []}; }
}
// Vynulování měřiče (tlačítko v ⚙️)
export function meterReset() { M = emptyMeter(); flush(); }
