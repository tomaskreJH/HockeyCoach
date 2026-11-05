// Čistá logika notifikací (bez Firebase a bez sítě, testuje ji tests/notify-logic.test.js): čas v Praze, rozpoznání změny události,
// texty oznámení, výběr příjemců a rozhodování o limitech. Jádro (core.js) ji volá, index.js ji nezná.
// Struktura: Importy -> Čas -> Změna události -> Texty -> Zařízení a příjemci -> Limity a klíče.

// ===== Importy =====
import {LIMITS, TZ} from "./config.js";

// ===== Čas =====
const FMT = new Intl.DateTimeFormat("en-GB", {timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"});
const DAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const pad = n => String(n).padStart(2, "0");
// Okamžik (ms) → pražské datum, čas a termín ve tvaru, v jakém je aplikace ukládá: {date: "RRRR-MM-DD", time: "HH:MM", dl: "RRRR-MM-DDTHH:MM"}
export function pragueParts(ms) {
  const p = {};
  FMT.formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
  const date = p.year + "-" + p.month + "-" + p.day, time = p.hour + ":" + p.minute;
  return {date, time, dl: date + "T" + time};
}
// Datum o n dní později / dříve („RRRR-MM-DD“)
export function dayAdd(date, n) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
}
// Zkrácený den bez roku jako v aplikaci: „Po 9. 11.“
export function dayLabel(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  if (!m) return "";
  return DAYS[new Date(date + "T12:00:00Z").getUTCDay()] + " " + +m[3] + ". " + +m[2] + ".";
}
// Termín přihlášení „RRRR-MM-DDTHH:MM“ → „9. 11. 18:00“
export function dlText(dl) {
  const m = /^\d{4}-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(String(dl || ""));
  return m ? +m[2] + ". " + +m[1] + ". " + m[3] : "";
}
// Minuty od půlnoci z „HH:MM“ (null při neplatném čase) a zpět; sraz = začátek mínus minuty
const okTime = t => typeof t === "string" && /^\d{1,2}:\d{2}$/.test(t) && +t.split(":")[0] < 24 && +t.split(":")[1] < 60;
export const addMin = (t, n) => { if (!okTime(t)) return ""; const m = (((+t.split(":")[0] * 60 + +t.split(":")[1] + n) % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); };
// Minuty mezi dvěma pražskými termíny „RRRR-MM-DDTHH:MM“ (od a do b); přechod na letní čas v rozmezí hodiny se zanedbává
const minsOf = dl => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(dl); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000 : NaN; };
export const minsBetween = (a, b) => minsOf(b) - minsOf(a);
// Je datum v nejbližších CHANGE_AHEAD_DAYS dnech (včetně dneška)?
export const inWindow = (date, today) => typeof date === "string" && date >= today && date <= dayAdd(today, LIMITS.CHANGE_AHEAD_DAYS);

// ===== Změna události =====
const norm = v => (v == null ? "" : String(v));
const isSet = v => v !== undefined && v !== null && v !== "";
export const isCancelled = e => !!(e && e.cancelled && typeof e.cancelled === "object");
// Co se u události změnilo (before → after), nebo null. Rozlišuje zrušení, obnovení a změnu času.
// Hlídá se jen datum, začátek, konec tréninku a sraz. Konec a sraz se porovnávají, jen když jsou zapsané v obou verzích:
// formulář je při uložení jiné změny dopíše z výchozích hodnot a to není změna pro členy. Živý zápis, sestavy a pokladna se nesledují.
export function detectChange(before, after, isMatch) {
  if (!before || !after) return null;
  const cb = isCancelled(before), ca = isCancelled(after);
  if (!cb && ca) return {kind: "cancel", diff: []};
  if (cb && !ca) return {kind: "restore", diff: []};
  if (ca) return null;
  const fields = isMatch ? ["date", "time", "meet"] : ["date", "time", "end", "meet"];
  const diff = fields.filter(f => (f === "date" || f === "time") ? norm(before[f]) !== norm(after[f]) : isSet(before[f]) && isSet(after[f]) && norm(before[f]) !== norm(after[f]));
  return diff.length ? {kind: "time", diff} : null;
}

// ===== Texty =====
// Název události pro oznámení: trénink podle názvu, zápas „Zápas – soupeř“
export const titleOf = (ev, isMatch) => isMatch ? "Zápas – " + (ev.opp || "?") : (ev.title || "Trénink");
const when = e => dayLabel(e.date) + (e.time ? " " + e.time : "");
const meetText = a => (typeof a.meet === "number" && a.meet > 0 && okTime(a.time)) ? "sraz " + addMin(a.time, -a.meet) : "bez srazu";
// Oznámení o změně: {title, body, tag}; tag nahradí starší oznámení o téže události (nehromadí se)
export function changeText(ch, before, after, isMatch, id) {
  const name = titleOf(after, isMatch), tag = "chg_" + id;
  if (ch.kind === "cancel") return {title: "❌ Zrušeno: " + name, body: when(after) + " – událost se nekoná.", tag};
  if (ch.kind === "restore") return {title: "↩️ Obnoveno: " + name, body: "Koná se: " + when(after) + ".", tag};
  const parts = [];
  if (ch.diff.includes("date")) parts.push("Nově " + when(after) + " (dříve " + when(before) + ")");
  else if (ch.diff.includes("time")) parts.push("Nový začátek " + (after.time || "–") + " (dříve " + (before.time || "bez času") + ")");
  if (ch.diff.includes("end") && after.end) parts.push("konec " + after.end);
  if (ch.diff.includes("meet")) parts.push(meetText(after));
  return {title: "🕒 Změna: " + name, body: parts.join(" · ") + ".", tag};
}
// Souhrn místo dalších oznámení, když se za hodinu změnilo víc událostí
export const summaryText = () => ({title: "🔔 Změnilo se víc událostí", body: "Otevři HockeyCoach a zkontroluj události.", tag: "chg_summary"});
// Připomínka před uzávěrkou přihlášení
export function deadlineText(ev, isMatch, id) {
  return {title: "⏳ Hodina do uzávěrky: " + titleOf(ev, isMatch), body: when(ev) + " · přihlašování končí " + dlText(ev.dl) + ". Ještě chybí tvoje odpověď.", tag: "dl_" + id};
}

// ===== Zařízení a příjemci =====
// Použitelná zařízení: jen se zapsaným tokenem; stejný token u dvou účtů (sdílený telefon) platí pro toho, kdo ho zapsal naposledy
export function usableDevices(devs) {
  const best = new Map();
  (devs || []).forEach(d => {
    if (!d || typeof d.tok !== "string" || d.tok.length < 20) return;
    const o = best.get(d.tok);
    if (!o || (+d.at || 0) >= (+o.at || 0)) best.set(d.tok, d);
  });
  return [...best.values()];
}
// Příjemci oznámení o změně: zařízení, kde je zapnuté „zrušení a změna času“ a jejichž hráčka nebo člen týmu je na události přihlášen (Jdu / Nejsem jistý)
export function changeRecipients(devs, att) {
  const ids = new Set((att || []).filter(a => a.st === "yes" || a.st === "maybe").map(a => a.pid));
  return (devs || []).filter(d => d.z !== false && ((d.pid && ids.has(d.pid)) || (d.tid && ids.has(d.tid))));
}
// Za koho zařízení odpovídá na události: hráčka (pokud je aktivní), jinak člen realizačního týmu – stejné pravidlo jako rychlá tlačítka v aplikaci;
// ents = {p: {id: {ended}}, t: {id: {}}} jen z existujících dokumentů. Bez hráčky i člena týmu (čistý manager) null.
export function memberOf(dev, ents) {
  const p = dev.pid && ents.p[dev.pid], t = dev.tid && ents.t[dev.tid];
  if (p && !p.ended) return dev.pid;
  if (t) return dev.tid;
  return null;
}
// Příjemci připomínky: zařízení se zapnutou „uzávěrkou“, jejichž člen na událost ještě neodpověděl (answered = množina id členů s odpovědí)
export function deadlineRecipients(devs, answered, ents) {
  return (devs || []).filter(d => { if (d.u === false) return false; const m = memberOf(d, ents); return !!m && !answered.has(m); });
}
// Kdo už odpověděl: kdokoli se záznamem Jdu / Nejdu / Nejsem jistý
export const answeredSet = att => new Set((att || []).filter(a => ["yes", "no", "maybe"].includes(a.st)).map(a => a.pid));

// ===== Limity a klíče =====
// Co s oznámením o změně podle toho, kolikáté to je v hodině pro dané zařízení: "send" (do BURST_MAX), "summary" (hned další, jednou), jinak "drop"
export const burstAction = n => n <= LIMITS.BURST_MAX ? "send" : n === LIMITS.BURST_MAX + 1 ? "summary" : "drop";
// Klíče pro počítadla: hodina a den v Praze
export const hourKey = ms => { const p = pragueParts(ms); return p.date.replace(/-/g, "") + p.time.slice(0, 2); };
export const dayKey = ms => pragueParts(ms).date.replace(/-/g, "");
// Platnost připomínky ve vteřinách: do uzávěrky (nejvýš hodina, nejméně 2 minuty)
export const deadlineTtl = (nowDl, dl) => { const m = minsBetween(nowDl, dl); return 60 * Math.max(2, Math.min(LIMITS.DEADLINE_MIN, Number.isFinite(m) ? Math.ceil(m) : LIMITS.DEADLINE_MIN)); };
// Je právě noční úklid? (03:00 – 03:14 pražského času, běží jednou za den)
export const isCleanupTime = ms => pragueParts(ms).time < "03:15" && pragueParts(ms).time >= "03:00";
