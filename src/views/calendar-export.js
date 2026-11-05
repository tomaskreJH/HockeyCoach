// 📅 Export do kalendáře: tlačítko „Do kalendáře“ v detailu události a „Moje události do kalendáře“ pod seznamem Nadcházejících.
// Stáhne soubor .ics (generátor a pravidla soukromí: domain/ical.js); nic se nezapisuje do databáze ani neposílá na server.
// Opětovné otevření souboru událost v kalendáři aktualizuje (stálé UID), zrušená se označí jako zrušená.

// ===== Importy =====
import {S} from "../core/state.js";
import {downloadFile, td, toast} from "../core/utils.js";
import {ICS_ALARMS, icsCalendar, mineForCalendar} from "../domain/ical.js";
import {defs} from "./event-core.js";

// ===== Konstanty =====
const MIME = "text/calendar;charset=utf-8";
// Připomínky kalendáře slovy: „24 h a 2 h“
const alarmText = () => ICS_ALARMS.map(m => (m % 60 ? m + " min" : m / 60 + " h")).join(" a ");

// ===== Pomocné funkce =====
// Stažení souboru .ics z událostí (název bez přípony) a hláška, co dál
function save(evs, name) {
  downloadFile(name + ".ics", icsCalendar(evs, {defs: defs(), now: Date.now()}), MIME);
  toast("📅 Soubor " + name + ".ics je stažený – otevři ho v kalendáři");
}

// ===== Jedna událost =====
export const icsOneBtn = '<button class="s" id="evics" style="margin-top:8px">📅 Do kalendáře</button>';
// ev = položka seznamu událostí (allEvents)
export function bindIcsOne(a, ev) {
  const b = a.querySelector("#evics");
  if (b) b.onclick = () => save([ev], "hockeycoach-" + (ev.type === "match" ? "zapas" : "trenink") + "-" + ev.date);
}

// ===== Moje události =====
// Blok pod seznamem; prázdný řetězec, když účet nemá propojeného člena (S.evp) nebo nic nenajde (Jdu / Nejsem jistý od dneška)
export function icsMineHtml(evs, AT) {
  const n = mineForCalendar(evs, AT, S.evp, td()).length;
  if (!n) return "";
  return `<div class="cd"><button class="s w" id="evicm">📅 Moje události do kalendáře (${n})</button>
<div class="mu" style="margin-top:6px">Události, na které jsi přihlášená (Jdu nebo Nejsem jistý) od dneška. V kalendáři soukromé, jen název a čas, připomínky ${alarmText()} předem. Po změně času nebo zrušení soubor stáhni znovu – událost se přepíše.</div></div>`;
}
export function bindIcsMine(a, evs, AT) {
  const b = a.querySelector("#evicm");
  if (b) b.onclick = () => save(mineForCalendar(evs, AT, S.evp, td()), "hockeycoach-moje-udalosti-" + td());
}
