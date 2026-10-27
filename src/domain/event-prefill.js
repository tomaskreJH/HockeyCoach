// 🖐 Předvyplnění formulářů událostí a poslední důvody omluv (K2, skupina 1) – čisté funkce bez DOM.
// Nový trénink převezme název, čas od – do, ⏰ sraz a místo z posledního tréninku (přednostně stejného dne v týdnu),
// nový zápas čas a místo z posledního zápasu stejného druhu (doma / venku). Důvody omluv: seznam naposledy použitých.

// ===== Importy =====
import {isCancelled} from "./event-cancel.js";

// ===== Konstanty =====
export const REASONS_MAX = 4;             // kolik vlastních naposledy použitých důvodů nabízet
export const REASON_LEN = 60;             // delší text se jako rychlý důvod nenabízí

// ===== Pomocné funkce =====
const wd = s => new Date(s + "T00:00:00").getDay();
const okDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
// Nejnovější položka podle data (při shodě pozdější v seznamu); prázdný seznam = null
const latest = arr => arr.reduce((b, x) => (!b || x.date >= b.date ? x : b), null);
const norm = s => String(s || "").trim().toLowerCase();

// ===== Hlavní logika: poslední událost stejného druhu =====
/** Poslední nezrušená událost s vyplněným časem; přednostně stejného dne v týdnu jako `date`. */
export function lastOf(list, date, pred = () => true) {
  const c = (list || []).filter(e => e && okDate(e.date) && e.time && !isCancelled(e) && pred(e));
  if (!c.length) return null;
  const same = okDate(date) ? c.filter(e => wd(e.date) === wd(date)) : [];
  return latest(same.length ? same : c);
}

/** Předvyplnění nového tréninku z posledního tréninku (events): {title, time, end, endAuto, meet, place} nebo null. */
export function trainingPrefill(evs, date) {
  const e = lastOf(evs, date);
  if (!e) return null;
  const end = e.end && String(e.end) > String(e.time) ? String(e.end) : "";   // ručně zadaný konec; jinak automatika
  const r = {title: e.title || "Trénink", time: String(e.time), end, endAuto: !end, place: String(e.place || "")};
  if (e.meet != null && e.meet !== "") r.meet = e.meet;
  return r;
}

/** Předvyplnění nového zápasu z posledního zápasu stejného druhu (doma / venku): {time, place} nebo null. */
export function matchPrefill(mas, date, home) {
  const m = lastOf(mas, date, x => !!x.home === !!home);
  return m ? {time: String(m.time), place: String(m.place || "")} : null;
}

// ===== Hlavní logika: poslední důvody omluv =====
/** Nový seznam naposledy použitých důvodů: `reason` dopředu, bez duplicit (velikost písmen), bez základních, nejvýš REASONS_MAX. */
export function pushReason(list, reason, base = []) {
  const t = String(reason || "").trim();
  const old = Array.isArray(list) ? list.filter(x => typeof x === "string" && x.trim()) : [];
  if (!t || t.length > REASON_LEN || base.some(b => norm(b) === norm(t))) return old.slice(0, REASONS_MAX);
  return [t, ...old.filter(x => norm(x) !== norm(t))].slice(0, REASONS_MAX);
}

/** Rychlé důvody v okně: naposledy použité vlastní důvody, pak základní (bez duplicit). */
export function reasonChips(recent, base) {
  const out = [], seen = new Set();
  [...(Array.isArray(recent) ? recent : []), ...base].forEach(x => {
    const k = norm(x);
    if (k && !seen.has(k)) { seen.add(k); out.push(String(x).trim()); }
  });
  return out;
}
