// Doména: 📅 export událostí do kalendáře ve formátu .ics (RFC 5545) – čisté funkce bez DOM, nic se nezapisuje do databáze.
// Soukromí: do kalendáře jde jen název a čas (u tréninku konec, u zápasu pevná délka) a řádek „Sraz HH:MM“; bez místa, poznámek, jmen a odpovědí.
// Čas: místní čas Europe/Prague se přepočte na UTC (zápis s „Z“) – kalendáře (Outlook M365, Google, Apple) tak čas čtou stejně a není třeba VTIMEZONE.
// Aktualizace: UID události je stálé (id@hockeycoach), SEQUENCE = minuty od roku 1970 v okamžiku exportu (vždy roste) → opětovný import událost
// v kalendáři přepíše (změna času) nebo označí jako zrušenou (STATUS:CANCELLED, název s „ZRUŠENO“).

// ===== Importy =====
import {isCancelled} from "./event-cancel.js";
import {endOf, meetAt, okTime, toMin} from "./event-time.js";

// ===== Konstanty =====
export const ICS_TZ = "Europe/Prague";                  // časové pásmo, ve kterém se čas v aplikaci zadává
export const ICS_UID_HOST = "hockeycoach";              // za @ v UID události
export const ICS_ALARMS = [1440, 120];                  // připomínky kalendáře: minuty před začátkem (24 h a 2 h)
export const ICS_MATCH_MIN = 90;                        // zápas nemá zadaný konec → délka v kalendáři (minuty)
const CRLF = "\r\n";
const MIN_MS = 60000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ===== Pomocné funkce =====
const pad = n => String(n).padStart(2, "0");
// Text hodnoty: zpětné lomítko, středník, čárka a zalomení řádku se zapisují se zpětným lomítkem; řídicí znaky pryč
export const icsEsc = s => String(s == null ? "" : s).replace(/[\u0000-\u0009\u000b-\u001f]/g, "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Řádek nejvýš 75 bajtů (UTF-8, bez CRLF), delší se zalomí na další řádek s mezerou na začátku; znak se nikdy nerozdělí
export function icsFold(line) {
  const enc = new TextEncoder(), out = [];
  let cur = "", bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length, max = out.length ? 74 : 75;       // navazující řádek má navíc úvodní mezeru
    if (bytes + n > max) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += n;
  }
  out.push(cur);
  return out.map((s, i) => (i ? " " : "") + s).join(CRLF);
}
// Posun pražského času proti UTC v minutách v daném okamžiku (zimní +60, letní +120)
function pragueOffset(utcMs) {
  const f = new Intl.DateTimeFormat("en-US", {timeZone: ICS_TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"});
  const p = {};
  f.formatToParts(new Date(utcMs)).forEach(x => { p[x.type] = +x.value; });
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(utcMs / 1000) * 1000) / MIN_MS);
}
// Pražský místní den „RRRR-MM-DD“ a čas „HH:MM“ → UTC v ms (po přechodu na letní / zimní čas se posun ověří podruhé)
export function pragueToUtc(date, time) {
  const [y, m, d] = date.split("-").map(Number), t = toMin(time), guess = Date.UTC(y, m - 1, d, 0, t);
  const o1 = pragueOffset(guess);
  let utc = guess - o1 * MIN_MS;
  const o2 = pragueOffset(utc);
  if (o2 !== o1) utc = guess - o2 * MIN_MS;
  return utc;
}
// UTC v ms → „RRRRMMDDTHHMMSSZ“
export const icsStamp = ms => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
// „RRRR-MM-DD“ → „RRRRMMDD“ (celodenní událost) a následující den (konec celodenní události je den po ní)
const icsDay = d => d.replace(/-/g, "");
const nextDay = d => { const [y, m, dd] = d.split("-").map(Number); return new Date(Date.UTC(y, m - 1, dd + 1)).toISOString().slice(0, 10); };
// Doba před začátkem pro TRIGGER: celé hodiny jako -PT2H, jinak v minutách
const trig = m => "-PT" + (m % 60 === 0 ? m / 60 + "H" : m + "M");
// Stálé UID z id události (jen písmena, číslice, _ a -)
const uidOf = id => String(id).replace(/[^\w-]/g, "_") + "@" + ICS_UID_HOST;

// ===== Událost =====
// Řádky jedné události (pole bez CRLF) nebo [] bez platného data. e = položka seznamu událostí
// {id, type, title, date, time, end, meet, raw}, o = {defs (evDefaults), now (ms)}.
export function icsEvent(e, o) {
  if (!e || !e.id || !DATE_RE.test(e.date || "")) return [];
  const defs = o.defs, now = o.now, cn = isCancelled(e), timed = okTime(e.time);
  const sum = (cn ? "ZRUŠENO – " : "") + (e.title || (e.type === "match" ? "Zápas" : "Trénink"));
  const L = ["BEGIN:VEVENT", "UID:" + uidOf(e.id), "DTSTAMP:" + icsStamp(now), "SEQUENCE:" + Math.floor(now / MIN_MS)];
  if (timed) {
    const start = pragueToUtc(e.date, e.time);
    let end = e.type === "match" ? start + ICS_MATCH_MIN * MIN_MS : pragueToUtc(e.date, endOf(e, defs));
    if (end <= start) end = start + defs.len * MIN_MS;                 // konec přes půlnoc (23:30 + 60 min): výchozí délka tréninku
    L.push("DTSTART:" + icsStamp(start), "DTEND:" + icsStamp(end));
  } else L.push("DTSTART;VALUE=DATE:" + icsDay(e.date), "DTEND;VALUE=DATE:" + icsDay(nextDay(e.date)));   // bez času = celodenní
  L.push("SUMMARY:" + icsEsc(sum));
  const meet = meetAt(e, defs);
  if (meet) L.push("DESCRIPTION:" + icsEsc("Sraz " + meet));
  L.push("CLASS:PRIVATE", "STATUS:" + (cn ? "CANCELLED" : "CONFIRMED"), "TRANSP:" + (cn ? "TRANSPARENT" : "OPAQUE"));
  // Připomínky kalendáře jen u časované a nezrušené události
  if (timed && !cn) ICS_ALARMS.forEach(m => L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc(sum), "TRIGGER:" + trig(m), "END:VALARM"));
  L.push("END:VEVENT");
  return L;
}

// ===== Kalendář =====
// Celý soubor .ics (řádky zalomené na 75 bajtů, konce řádků CRLF) ze seznamu událostí; události bez platného data se vynechají
export function icsCalendar(events, o) {
  const body = (events || []).flatMap(e => icsEvent(e, o));
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HockeyCoach//Kalendar//CS", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:HockeyCoach", ...body, "END:VCALENDAR"];
  return L.map(icsFold).join(CRLF) + CRLF;
}

// ===== Moje události =====
// Události od dneška, na které je člen mid přihlášený „Jdu“ nebo „Nejsem jistý“ (zrušené také – kalendář je přepíše jako zrušené);
// A = odpovědi AT[eventId][memberId] = {st}; seřazeno podle data a času
export function mineForCalendar(events, A, mid, today) {
  if (!mid) return [];
  const going = e => { const a = ((A || {})[e.id] || {})[mid]; return !!a && (a.st === "yes" || a.st === "maybe"); };
  return (events || []).filter(e => e.date >= today && going(e))
    .sort((x, y) => (x.date + (x.time || "")).localeCompare(y.date + (y.time || "")));
}
