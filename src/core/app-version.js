// Verze aplikace (jediné místo s číslem verze v kódu; shodu s package.json hlídá tests/project.test.js, cache sw.js hokej-vNN zvlášť).
// Brána verze: manager v ⚙️ nastaví minimální verzi (settings/app.minVer). Klient se starší verzí nic nezapisuje
// (strážce blocked() v data/storage.js) a nahoře ukáže pruh s tlačítkem Načíst novou verzi – starší klient tak nesmaže nová pole.

// ===== Konstanty =====
export const APP_VERSION = "22.16";                           // číslo verze bez „v“ (hlavní.fáze[.oprava])
export const APP_DATE = "27. 10. 2026";          // datum vydání verze (zobrazení v záhlaví a v ⚙️)
export const APP_LABEL = "v" + APP_VERSION + " · " + APP_DATE;
// Platný zápis verze: 1 až 3 čísla oddělená tečkou (např. 18, 18.8, 18.8.1)
export const VER_RE = /^\d+(\.\d+){0,2}$/;

// ===== Pomocné funkce =====
// Rozklad verze na čísla; „v“ na začátku se ignoruje, chybějící části = 0 (18.8 = 18.8.0)
const parts = v => String(v == null ? "" : v).trim().replace(/^v/i, "").split(".").map(x => parseInt(x, 10) || 0);
// Porovnání verzí po číslech (ne jako text: 18.10 > 18.9): -1 = a je starší, 0 = stejné, 1 = a je novější
export function cmpVer(a, b) {
  const x = parts(a), y = parts(b), n = Math.max(x.length, y.length, 3);
  for (let i = 0; i < n; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; }
  return 0;
}

// ===== Brána verze =====
// Je verze cur starší než požadované minimum? Chybějící nebo neplatné minimum bránu nezavírá (zapisuje se dál).
export function isOutdated(cur, min) {
  const m = String(min == null ? "" : min).trim().replace(/^v/i, "");
  if (!VER_RE.test(m)) return false;
  return cmpVer(cur, m) < 0;
}
// Smí trenér nastavit minimum na verzi cur? Jen zvýšit (nikdy nesnížit pod už požadovanou verzi).
export const canRaise = (cur, min) => isOutdated(min || "0", cur) || !VER_RE.test(String(min || "").replace(/^v/i, ""));
