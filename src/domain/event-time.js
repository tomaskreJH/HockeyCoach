// Doména: čas události – konec tréninku (pole end) a sraz (pole meet = minuty před začátkem) pro tréninky i zápasy (čisté funkce bez DOM).
// Výchozí hodnoty jsou v settings/events = {meetT, meetM, len, dlT, dlM, dlH} (sraz tréninku a zápasu v minutách, délka tréninku, termín přihlášení
// = dlT / dlM dní před tréninkem / zápasem v čase dlH); bez dokumentu platí EV_DEF.
// Událost bez pole meet / end používá výchozí hodnoty (starší data fungují beze změny). meet = 0 znamená „bez srazu“.
// Zápas konec nemá (otázka 65); začátek události zůstává v poli time (docházka, uzávěrka a přehledy beze změny).

// ===== Konstanty =====
export const EVSET_DOC = "settings/events";                  // dokument výchozích hodnot událostí
export const EV_DEF = {meetT: 30, meetM: 60, len: 60};        // výchozí sraz tréninku, sraz zápasu, délka tréninku (minuty)
export const DL_DEF = {dlT: 1, dlM: 1, dlH: "18:00"};          // výchozí termín přihlášení: dní před tréninkem / zápasem a čas
export const DL_MAX = 14;                                     // nejvíc dní termínu před událostí
export const MEET_MAX = 240;                                  // nejvíc minut srazu před začátkem
export const LEN_MAX = 300;                                   // nejdelší trénink (minuty)
const DAY_MIN = 24 * 60;

// ===== Pomocné funkce =====
const pad = n => String(n).padStart(2, "0");
// Platný čas "H:MM" / "HH:MM" (0:00 – 23:59)
export const okTime = t => typeof t === "string" && /^\d{1,2}:\d{2}$/.test(t) && +t.split(":")[0] < 24 && +t.split(":")[1] < 60;
// Čas na minuty od půlnoci a zpět (přes půlnoc se přetočí do téhož dne)
export const toMin = t => okTime(t) ? +t.split(":")[0] * 60 + +t.split(":")[1] : null;
export const fromMin = n => { const m = ((Math.round(n) % DAY_MIN) + DAY_MIN) % DAY_MIN; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); };
// Čas posunutý o n minut ("" při neplatném čase)
export const addMin = (t, n) => okTime(t) ? fromMin(toMin(t) + (+n || 0)) : "";
// Celé číslo minut v rozsahu 0..max; prázdné nebo neplatné → def
export function clampMin(v, max, def) {
  if (v === "" || v == null) return def;
  const n = Math.round(+v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : def;
}

// ===== Výchozí hodnoty =====
// Výchozí hodnoty z dokumentu settings/events (chybějící nebo neplatná pole doplní EV_DEF); délka tréninku aspoň 1 minuta
export function evDefaults(st) {
  const s = st || {}, len = clampMin(s.len, LEN_MAX, EV_DEF.len);
  return {meetT: clampMin(s.meetT, MEET_MAX, EV_DEF.meetT), meetM: clampMin(s.meetM, MEET_MAX, EV_DEF.meetM), len: len > 0 ? len : EV_DEF.len,
    dlT: clampMin(s.dlT, DL_MAX, DL_DEF.dlT), dlM: clampMin(s.dlM, DL_MAX, DL_DEF.dlM), dlH: okTime(s.dlH) ? s.dlH.padStart(5, "0") : DL_DEF.dlH};
}
// Výchozí termín přihlášení události ("RRRR-MM-DDTHH:MM"): dlT / dlM dní před datem v čase dlH; bez data ""
export function dlFor(date, type, defs) {
  if (!date) return "";
  const d = new Date(date + "T12:00:00"), n = type === "match" ? defs.dlM : defs.dlT, p = x => String(x).padStart(2, "0");
  d.setDate(d.getDate() - n);
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + defs.dlH;
}
// Výchozí sraz podle typu události ("training" | "match")
export const meetDefault = (type, defs) => type === "match" ? defs.meetM : defs.meetT;

// ===== Sraz a konec události =====
// Minuty srazu před začátkem: uložená hodnota události, jinak výchozí podle typu
export function meetOf(e, defs) {
  const v = e && e.meet;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(Math.round(v), MEET_MAX) : meetDefault(e && e.type, defs);
}
// Čas srazu "HH:MM"; "" když událost nemá čas začátku nebo je sraz 0
export function meetAt(e, defs) {
  const m = meetOf(e, defs);
  return m > 0 && okTime(e && e.time) ? addMin(e.time, -m) : "";
}
// Konec tréninku "HH:MM": uložený (platný a po začátku), jinak začátek + výchozí délka; zápas a událost bez začátku ""
export function endOf(e, defs) {
  if (!e || e.type === "match" || !okTime(e.time)) return "";
  return endOk(e.time, e.end) && okTime(e.end) ? e.end : addMin(e.time, defs.len);
}
// Konec je po začátku (prázdný konec nebo začátek = v pořádku; přes půlnoc ne)
export const endOk = (time, end) => !end || !okTime(time) || (okTime(end) && toMin(end) > toMin(time));
// Výchozí konec pro formulář: začátek + délka (bez začátku "")
export const defEnd = (time, defs) => okTime(time) ? addMin(time, defs.len) : "";
// Texty pro zobrazení: range = "18:00 – 19:00" (zápas jen začátek), meet = "17:30" ("" bez srazu)
export function timeParts(e, defs) {
  if (!e || !e.time) return {range: "", meet: ""};
  const end = endOf(e, defs);
  return {range: end ? e.time + " – " + end : e.time, meet: meetAt(e, defs)};
}
// Pole formuláře na uložená data: {end} jen u tréninku, {meet} vždy (minuty 0..MEET_MAX)
export function timeFields(type, f, defs) {
  const d = {meet: clampMin(f.meet, MEET_MAX, meetDefault(type, defs))};
  if (type !== "match") d.end = okTime(f.end) ? f.end : "";
  return d;
}
