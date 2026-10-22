// Doména: bankovní účty pro QR platby (v18.6.1) – převod českého čísla účtu na IBAN a kontrola obou kontrolních součtů.
// Čisté funkce bez DOM. Struktura: Konstanty -> Pomocné funkce -> Kontroly (mod 11, mod 97) -> Převody -> Zpracování vstupu -> Zabezpečení změn.
// Pravidla:
//  - české číslo účtu: [předčíslí-]číslo/kód banky; předčíslí max. 6 číslic, číslo 2–10 číslic, kód banky 4 číslice,
//  - předčíslí i číslo musí projít kontrolou modulo 11 (váhy ČNB) – zachytí překlep v jedné číslici a většinu přehozených číslic,
//  - IBAN (CZ, 24 znaků) = CZ + 2 kontrolní číslice + kód banky + předčíslí (6) + číslo (10); kontrolní číslice modulo 97 (ISO 13616),
//  - do QR se smí dostat jen účet, který projde oběma kontrolami (accCheck).

// ===== Konstanty =====
const W_PREFIX = [10, 5, 8, 4, 2, 1];                   // váhy pro předčíslí (6 číslic)
const W_NUMBER = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1];       // váhy pro číslo účtu (10 číslic)
const CZ_ACC = /^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/;  // [předčíslí-]číslo/banka
const CZ_IBAN = /^CZ\d{22}$/;
// Účet změněný před méně než tolika dny se hráčkám zobrazuje s varováním
export const RECENT_DAYS = 14;

// ===== Pomocné funkce =====
const pad = (s, n) => String(s).padStart(n, "0");
const clean = s => String(s || "").replace(/\s+/g, "").toUpperCase();

// ===== Kontroly =====
// Kontrola modulo 11 (předčíslí nebo číslo účtu doplněné nulami zleva)
function mod11(digits, w) { let s = 0; for (let i = 0; i < w.length; i++) s += (+digits[i]) * w[i]; return s % 11 === 0; }
// Zbytek po dělení 97 pro dlouhé číslo zapsané jako text (po částech, bez BigInt)
function mod97(str) { let r = 0; for (const ch of str) r = (r * 10 + (+ch)) % 97; return r; }
// Písmena IBAN na čísla (A = 10 … Z = 35)
const ibanDigits = s => s.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55));
// Obecná kontrola IBAN (libovolná země): přesun prvních 4 znaků na konec, zbytek mod 97 musí být 1
export function ibanValid(iban) {
  const s = clean(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  return mod97(ibanDigits(s.slice(4) + s.slice(0, 4))) === 1;
}

// ===== Převody =====
// České číslo účtu -> IBAN (bez kontrol; volá se až po nich)
function czParts(pre, num, bank) { return {pre: pad(pre || "0", 6), num: pad(num, 10), bank}; }
function partsToIban(p) {
  const bban = p.bank + p.pre + p.num;
  const ck = 98 - mod97(bban + ibanDigits("CZ") + "00");
  return "CZ" + pad(ck, 2) + bban;
}
// IBAN CZ -> české číslo účtu (předčíslí a číslo bez úvodních nul); pro jiný IBAN prázdný text
export function ibanToCz(iban) {
  const s = clean(iban);
  if (!CZ_IBAN.test(s)) return "";
  const bank = s.slice(4, 8), pre = s.slice(8, 14).replace(/^0+/, ""), num = s.slice(14).replace(/^0+/, "") || "0";
  return (pre ? pre + "-" : "") + num + "/" + bank;
}
// IBAN po čtveřicích pro čtení
export const ibanFmt = s => clean(s).replace(/(.{4})/g, "$1 ").trim();

// ===== Zpracování vstupu =====
// Vstup z nastavení (české číslo účtu, nebo IBAN) -> {iban, cz, err}; prázdný vstup = {iban: ""}
export function parseAcc(input) {
  const raw = String(input || "").replace(/\s+/g, "");
  if (!raw) return {iban: "", cz: "", err: ""};
  const m = raw.match(CZ_ACC);
  if (m) {
    const p = czParts(m[1], m[2], m[3]);
    if (!mod11(p.pre, W_PREFIX)) return {iban: "", cz: "", err: "Předčíslí účtu nemá platný kontrolní součet – zkontroluj číslice."};
    if (!mod11(p.num, W_NUMBER)) return {iban: "", cz: "", err: "Číslo účtu nemá platný kontrolní součet – zkontroluj číslice."};
    const iban = partsToIban(p);
    return {iban, cz: ibanToCz(iban), err: ""};
  }
  const s = clean(raw);
  if (/^[A-Z]{2}\d{2}/.test(s)) {
    if (!ibanValid(s)) return {iban: "", cz: "", err: "IBAN nemá platný kontrolní součet – zkontroluj znaky."};
    if (!CZ_IBAN.test(s)) return {iban: "", cz: "", err: "QR platba je jen pro český účet (IBAN CZ, 24 znaků)."};
    return accCheck(s) ? {iban: s, cz: ibanToCz(s), err: ""} : {iban: "", cz: "", err: "Číslo účtu v IBAN nemá platný kontrolní součet."};
  }
  return {iban: "", cz: "", err: "Zadej číslo účtu ve tvaru 123456789/0800 (případně 19-123456789/0800) nebo IBAN CZ…"};
}
// Úplná kontrola účtu pro QR: IBAN CZ s platným mod 97 i platným mod 11 předčíslí a čísla
export function accCheck(iban) {
  const s = clean(iban);
  if (!CZ_IBAN.test(s) || !ibanValid(s)) return false;
  return mod11(s.slice(8, 14), W_PREFIX) && mod11(s.slice(14), W_NUMBER);
}

// ===== Zabezpečení změn =====
// (seznam ověřených účtů je v localStorage zařízení – jediná část modulu mimo čisté funkce)
// Byl účet změněn nedávno? (ibanAt = ISO datum potvrzení změny)
export const recentChange = (at, now = Date.now()) => !!at && now - Date.parse(at) < RECENT_DAYS * 86400000;
// Seznam účtů, které hráčka v tomto zařízení už ověřila (localStorage); chyba úložiště = prázdný seznam
const SEEN_KEY = "hk-acc-seen";
export function seenAccs() { try { const a = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
export function markSeen(iban) { try { const a = seenAccs(); if (!a.includes(iban)) localStorage.setItem(SEEN_KEY, JSON.stringify([...a, iban].slice(-10))); } catch (e) {} }
