// Doména: platby za jednotlivé události – způsob placení hráček a výpočet vyúčtování (čisté funkce bez DOM).
// Struktura: Konstanty -> Pomocné funkce -> Výpočet vyúčtování.
// Pravidla:
//  - hráčka platí buď měsíční příspěvek (monthly), nebo za jednotlivou událost (single), nebo je osvobozená (exempt); chybějící hodnota = monthly,
//  - trenéři, kustodi a další členové realizačního týmu neplatí a do počtu účastnic se nezapočítávají,
//  - cena na osobu = cena události ÷ (přihlášené hráčky − osvobozené), zaokrouhleno nahoru na celé Kč,
//  - způsob úhrady události: contrib = hrazeno příspěvkem, platí jen hráčky „za událost“ (pravidelné tréninky, domácí zápasy),
//    all = platí všechny účastnice kromě osvobozených (mimořádné tréninky), none = bez vyúčtování (venkovní zápasy v režii soupeře).

import {pl} from "../core/selectors.js";

// ===== Konstanty =====
export const PAY = {monthly: "Příspěvek", single: "Za událost", exempt: "Osvobozená"};
export const MODES = {contrib: "Příspěvek + platící za událost", all: "Platí všechny účastnice", none: "Bez vyúčtování"};
export const HINTS = {
  contrib: "Pravidelné tréninky a domácí zápasy: hradí se příspěvkem, platí jen hráčky, které příspěvek neplatí (a nejsou osvobozené).",
  all: "Mimořádná událost: platí všechny účastnice kromě osvobozených.",
  none: "Bez vyúčtování, např. venkovní zápas je v režii soupeře."
};
const STEP = 1; // zaokrouhlení ceny na osobu nahoru na násobek (Kč)

// ===== Pomocné funkce =====
export const payOf = p => (p && PAY[p.pay] ? p.pay : "monthly");
// Výchozí způsob úhrady: venkovní zápas bez vyúčtování, ostatní příspěvkem
export const defMode = (type, home) => (type === "match" && home === false ? "none" : "contrib");
export const modeOf = ev => (MODES[ev.raw.pm] ? ev.raw.pm : defMode(ev.type, ev.raw.home));
export const feeOf = ev => Math.max(0, +ev.raw.fee || 0);
export const kc = n => (Math.round(n * 100) / 100).toLocaleString("cs-CZ") + " Kč";

// ===== Výpočet vyúčtování =====
// ev = {id, type, raw}; going = id přihlášených hráček (bez realizačního týmu)
export function calc(ev, going) {
  const mode = modeOf(ev), fee = feeOf(ev), P = going.map(id => pl(id)).filter(Boolean);
  const n = P.length, ex = P.filter(p => payOf(p) === "exempt").length, base = n - ex;
  const per = mode === "none" || !fee || base < 1 ? 0 : Math.ceil(fee / base / STEP) * STEP;
  const payers = per ? P.filter(p => (mode === "all" ? payOf(p) !== "exempt" : payOf(p) === "single")).map(p => ({pid: p.id, amt: per})) : [];
  return {
    mode, fee, n, ex, base, per, payers,
    monthly: P.filter(p => payOf(p) === "monthly").length,
    single: P.filter(p => payOf(p) === "single").length
  };
}
