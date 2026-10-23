// Náhled živého zápasu pro členy (👁, jen ke čtení): čisté výpočty bez DOM – čas a třetina z uloženého stavu live,
// střely obou týmů a průběh zápasu (góly, tresty, střely, konce třetin) od nejnovějšího.
// Živý zápis se tu nemění ani nevolá – čte se jen dokument zápasu. Sestavy, střídání, čas na ledě a zranění se nezobrazují.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Čas a třetina -> Průběh -> Exporty (u funkcí).

// ===== Importy =====
import {score, shots} from "../core/selectors.js";
import {timeline} from "./timeline.js";

// ===== Konstanty =====
// Druhy položek časové osy, které náhled ukazuje (G gól, P trest, S střela, per konec třetiny, end konec zápasu)
export const WATCH_KINDS = ["G", "P", "S", "per", "end"];
const OT_MS = 300000;                                            // délka prodloužení (stejně jako v živém zápisu)

// ===== Pomocné funkce =====
// Uplynulý herní čas v ms podle uloženého stavu (acc + běžící úsek od t0); stejný vzorec jako živý zápis
const elapsed = (L, now) => (+L.acc || 0) + (L.running && L.t0 ? Math.max(0, now - L.t0) : 0);

// ===== Čas a třetina =====
// Čas zápasu pro náhled: {per, perText, left (ms do konce třetiny, ≥ 0), running, ended}; null = zápas nemá živý zápis
export function watchClock(m, now) {
  const L = m && m.live;
  if (!L) return null;
  const per = +L.per || 1, ended = !!m.end, len = per >= 4 ? OT_MS : (+m.perLen || 20) * 60000;
  const inPer = Math.max(0, elapsed(L, now) - (+L.pst || 0));
  return {per, perText: ended ? "Konec zápasu" : per < 4 ? per + ". třetina" : "Prodloužení", left: ended ? 0 : Math.max(0, len - inPer), running: !!L.running && !ended, ended};
}

// ===== Průběh =====
// Skóre a střely (střely včetně gólů, jako v živém zápisu): {us, them, shUs, shThem}
export function watchScore(m) {
  const [us, them] = score(m || {}), s = shots(m || {});
  return {us, them, shUs: s.us, shThem: s.opp};
}
// Průběh pro náhled: časová osa bez střídání, jen góly, tresty, střely a konce třetin, od nejnovější položky
export function watchFeed(m, {shotsOn = true} = {}) {
  if (!m) return [];
  return timeline(m, {shots: shotsOn, subs: false}).filter(e => WATCH_KINDS.includes(e.kind)).reverse();
}
