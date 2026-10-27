// 📉 Okno poslechu (D2): události a docházka se živě poslouchají jen od data from (dnes − dny okna), u hráčky jen do winTo
// (dnes + 15 dní; vzdálenější budoucnost až tlačítkem Načíst další); starší („archiv“)
// se berou z paměti zařízení (zdarma) a ze serveru jen jednou na zařízení a pak občas pás posledních BAND dní před oknem.
// Čisté funkce bez databáze (tests/data-window.test.js); poslech a čtení v data/storage.js (listenWin), přehled v ⚙️ → 💾 Data.

// ===== Konstanty =====
const DAY = 24 * 60 * 60 * 1000;
// Kolekce s oknem: pole s datem (RRRR-MM-DD), jak často obnovit pás archivu ze serveru, šířka pásu (dny)
export const WIN = {
  events: {f: "date", ttl: DAY, band: 60},
  attendance: {f: "d", ttl: 7 * DAY, band: 60}
};
// Dny okna podle role: realizační tým vidí živě delší minulost (docházka, vyúčtování), hráčka jen posledních 8 dní
export const WIN_DAYS = {staff: 45, other: 8};
// 📉 Dny dopředu, které hráčka (a hostující) poslouchá živě; další budoucnost až tlačítkem (poslech od winTo). Realizační tým bez omezení.
export const AHEAD_DAYS = 15;
// Od této verze zapisují všechny aplikace do docházky datum události d – okno docházky platí až po 🔒 Vyžadovat verzi ≥ ATT_D_VER
export const ATT_D_VER = "22.9";

// ===== Pomocné funkce =====
// Den posunutý o n dní ("RRRR-MM-DD")
export function dayAdd(day, n) {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// ===== Hlavní logika =====
// Začátek okna pro roli (staff = manager / trenér / asistent)
export const winFrom = (today, staff) => dayAdd(today, -(staff ? WIN_DAYS.staff : WIN_DAYS.other));
// Konec okna (bez tohoto dne, "" = bez konce): hráčka dnes + AHEAD_DAYS včetně, realizační tým celá budoucnost
export const winTo = (today, staff) => (staff ? "" : dayAdd(today, AHEAD_DAYS + 1));
// Co načíst ze serveru do archivu: "all" (zařízení archiv ještě nemá nebo ruční obnova), "band" (pás před oknem po ttl), "" = nic
// stamp = {at, all} z localStorage, cached = počet dokumentů archivu v paměti zařízení
export function archNeed(stamp, now, ttl, cached, force) {
  if (force || !stamp || !stamp.all || !cached) return "all";
  return now - (+stamp.at || 0) > ttl ? "band" : "";
}
// Sloučení pásu ze serveru do archivu: dokumenty s datem v pásu [od, do) nahradí výsledek serveru (smazané zmizí)
export function mergeBand(arch, band, f, lo, hi) {
  const out = {};
  Object.entries(arch || {}).forEach(([id, d]) => { const v = String((d || {})[f] || ""); if (!(v >= lo && v < hi)) out[id] = d; });
  return Object.assign(out, band || {});
}
// Datum docházky d: datum události nebo zápasu (neznámá událost = "", patří do archivu)
export const attDate = (eid, events, matches) => String(((events || {})[eid] || (matches || {})[eid] || {}).date || "");
// Opravy docházky: dokumenty bez d nebo s jiným datem, než má jejich událost → [[id, d]] (známé události, archiv neznámých zůstane)
export function attDateFix(att, events, matches) {
  const out = [];
  Object.entries(att || {}).forEach(([id, a]) => {
    if (!a || !a.eid) return;
    const known = (events || {})[a.eid] || (matches || {})[a.eid], d = attDate(a.eid, events, matches);
    if (!("d" in a) || (known && a.d !== d)) out.push([id, d]);
  });
  return out;
}
// Počet dokumentů kolekce od data from do to (bez to; "" = bez konce) – odhad čtení pro jinou roli z dat v zařízení
export const countFrom = (docs, f, from, to) => Object.values(docs || {}).filter(d => { const v = String((d || {})[f] || ""); return v >= from && (!to || v < to); }).length;

// ===== Exporty =====
// (exportované funkce a konstanty jsou označené u definic výše)
