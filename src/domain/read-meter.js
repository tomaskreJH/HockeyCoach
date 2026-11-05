// 📊 Měřič čtení databáze (v22.52): kolik dokumentů toto zařízení za den skutečně přečetlo (podle kolekcí) a kolikrát se aplikace spustila.
// Čisté funkce bez DOM a databáze (tests/read-meter.test.js); ukládání do localStorage řeší data/meter-store.js, zobrazení ⚙️ → 💾 Data.
// Je to ODHAD: počítá snímky poslechů a jednorázová čtení ve vlastním kódu aplikace. Nezahrnuje čtení pravidel databáze (members, settings/perm),
// Cloud Functions ani prohlížení konzole Firebase – ta se v konzoli Firebase přičtou navíc.
// Struktura: Konstanty -> Pomocné funkce -> Hlavní logika.

// ===== Konstanty =====
export const METER_KEY = "hk-reads-v1";   // klíč v localStorage (zařízení; beta a stabilní verze ho sdílejí)
export const KEEP_DAYS = 8;               // kolik posledních dní se pamatuje

// ===== Pomocné funkce =====
const DAY = 24 * 60 * 60 * 1000;
const num = v => Math.max(0, Math.round(+v || 0));
const obj = v => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
// Den posunutý o n dní ("RRRR-MM-DD", poledne kvůli změně času)
const shift = (day, n) => { const d = new Date(day + "T12:00:00"); return new Date(d.getTime() + n * DAY).toISOString().slice(0, 10); };

// ===== Hlavní logika =====
// Prázdný stav: d = {den: {kolekce: počet}}, s = {den: počet spuštění}
export const emptyMeter = () => ({d: {}, s: {}});
// Stav z uloženého textu; poškozený nebo cizí tvar = prázdný stav
export function parseMeter(txt) {
  try {
    const o = JSON.parse(txt || "null"), m = emptyMeter();
    Object.entries(obj(o && o.d)).forEach(([day, row]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
      m.d[day] = Object.fromEntries(Object.entries(obj(row)).map(([c, v]) => [c, num(v)]).filter(([, v]) => v > 0));
    });
    Object.entries(obj(o && o.s)).forEach(([day, v]) => { if (/^\d{4}-\d{2}-\d{2}$/.test(day) && num(v)) m.s[day] = num(v); });
    return m;
  } catch (e) { return emptyMeter(); }
}
// Přičtení n čtení kolekce c ke dni (mění a vrací stav m)
export function addReads(m, day, c, n) {
  const k = num(n);
  if (!k || !c) return m;
  const row = m.d[day] || (m.d[day] = {});
  row[c] = (row[c] || 0) + k;
  return m;
}
// Přičtení jednoho spuštění aplikace ke dni
export function addStart(m, day) { m.s[day] = (m.s[day] || 0) + 1; return m; }
// Zapomene dny starší než keep dní před dnešním dnem
export function pruneMeter(m, today, keep = KEEP_DAYS) {
  const from = shift(today, -keep);
  Object.keys(m.d).forEach(day => { if (day < from) delete m.d[day]; });
  Object.keys(m.s).forEach(day => { if (day < from) delete m.s[day]; });
  return m;
}
// Součet čtení za den
export const dayTotal = (m, day) => Object.values(m.d[day] || {}).reduce((s, v) => s + v, 0);
// Největší kolekce dne: [[kolekce, počet] …] nejvýš n
export const dayTop = (m, day, n = 5) => Object.entries(m.d[day] || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
// Poslední dny s údaji (nejnovější první): [{day, total, starts}]
export function recentDays(m, n = 7) {
  const days = [...new Set([...Object.keys(m.d), ...Object.keys(m.s)])].sort().reverse().slice(0, n);
  return days.map(day => ({day, total: dayTotal(m, day), starts: m.s[day] || 0}));
}
// Kolik dokumentů se přičte za jeden snímek poslechu. snap = snímek dotazu (docs, docChanges) nebo dokumentu (exists);
// got = tento poslech už ze serveru něco dostal. První snímek ze serveru = všechny dokumenty (horní mez: po pauze do 30 min se čtou jen změny),
// další jen změněné dokumenty; snímek z paměti zařízení a vlastní nepotvrzený zápis se neplatí.
export function snapReads(snap, got) {
  if (!snap) return 0;
  const md = snap.metadata || {};
  if (md.fromCache) return 0;
  const all = Array.isArray(snap.docs) ? snap.docs.length : typeof snap.exists === "function" ? (snap.exists() ? 1 : 0) : 0;
  if (!got) return all;
  if (md.hasPendingWrites) return 0;
  if (typeof snap.docChanges === "function") return snap.docChanges().length;
  return all;
}

// ===== Exporty =====
// (exportované funkce a konstanty jsou označené u definic výše)
