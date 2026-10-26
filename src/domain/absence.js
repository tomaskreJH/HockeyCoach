// Doména: 🏖 nepřítomnost od – do (čisté funkce bez DOM): absence/{id} = {mid, kind vac|sick|other, from, to, note, by, at}.
// Uložení: v otevřených událostech „❌ Nejdu“ s důvodem (abs = id), po uzávěrce žádost o změnu účasti (att-requests.js);
// později založené události dostanou omluvu automaticky jen bez odpovědi (absAuto); zrušení vrátí omluvy jen u otevřených (absRevert).
// ===== Importy =====
import {openAttReq} from "./att-requests.js";
import {isCancelled} from "./event-cancel.js";
import {regClosed} from "./home-summary.js";

// ===== Konstanty =====
export const ABS_COLL = "absence";
export const ABS_KINDS = {vac: "🏖 Dovolená", sick: "🤒 Nemoc", other: "📌 Jiné"};
export const ABS_MAX_DAYS = 183;                      // nejdelší nepřítomnost (dní)
const NOTE_MAX = 300;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// ===== Pomocné funkce =====
const txt = s => String(s || "").trim().slice(0, NOTE_MAX);
const startOf = e => new Date(e.date + "T" + (/^\d{1,2}:\d{2}$/.test(e.time || "") ? e.time.padStart(5, "0") : "00:00")).getTime();
const days = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
// „1. 11.“ / „1. 11. 2026“
const dm = d => +d.slice(8) + ". " + +d.slice(5, 7) + ".";
// Text období: „1. 11. – 5. 11. 2026“ (jeden den: „1. 11. 2026“)
export const absRange = a => a.from === a.to ? dm(a.from) + " " + a.from.slice(0, 4) : dm(a.from) + " – " + dm(a.to) + " " + a.to.slice(0, 4);
// Spadá událost do období nepřítomnosti?
export const inAbs = (e, a) => !!(e && a && e.date >= a.from && e.date <= a.to);
// Odpověď člena k události z docházky [{eid, pid, st, abs}]
const answerOf = (at, eid, mid) => (at || []).find(x => x.eid === eid && x.pid === mid) || null;

// ===== Hlavní logika =====
// Kontrola formuláře: vrací text chyby, nebo null
export function absError(d, today) {
  if (!d || !d.mid) return "Vyber člena";
  if (!ABS_KINDS[d.kind]) return "Vyber druh nepřítomnosti";
  if (!DAY.test(d.from || "") || !DAY.test(d.to || "")) return "Zadej období od – do";
  if (d.to < d.from) return "Konec je před začátkem";
  if (d.to < today) return "Nepřítomnost v minulosti nemá vliv na docházku";
  if (days(d.from, d.to) > ABS_MAX_DAYS) return "Nejdelší období je " + ABS_MAX_DAYS + " dní";
  return null;
}
// Dokument nepřítomnosti
export const absDoc = (mid, kind, from, to, note, by, at) => ({mid, kind, from, to, note: txt(note), by: String(by || "").toLowerCase(), at});
// Důvod omluvy zapsaný do attnote: „Nepřítomnost: 🏖 Dovolená 1. 11. – 5. 11. 2026 (poznámka)“
export const absReason = a => ("Nepřítomnost: " + (ABS_KINDS[a.kind] || "") + " " + absRange(a) + (a.note ? " (" + a.note + ")" : "")).slice(0, NOTE_MAX);
// Platné nepřítomnosti (neskončily) od nejbližší
export const activeAbs = (list, today) => (list || []).filter(a => a.to >= today).sort((x, y) => x.from.localeCompare(y.from));

// Co uložení nepřítomnosti změní. evs = [{id, title, date, time, dl, cancelled}], at = docházka, rs = žádosti.
// Vrací {write: [{eid, prev}] – otevřené události (zapíše se Nejdu), req: [{eid, prev}] – po uzávěrce do začátku (žádost),
// keep: [eid] – už „Nejdu“ nebo čekající žádost, past: počet uplynulých / začatých událostí v období (beze změny)}.
export function absPlan(a, evs, at, rs, now, today) {
  const out = {write: [], req: [], keep: [], past: 0};
  (evs || []).filter(e => inAbs(e, a) && !isCancelled(e)).sort((x, y) => (x.date + (x.time || "")).localeCompare(y.date + (y.time || ""))).forEach(e => {
    if (startOf(e) <= now) { out.past++; return; }
    const cur = answerOf(at, e.id, a.mid), prev = cur ? cur.st : null;
    if (prev === "no") { out.keep.push(e.id); return; }
    if (!regClosed(e, now, today)) out.write.push({eid: e.id, prev});
    else if (openAttReq(rs, e.id, a.mid)) out.keep.push(e.id);
    else out.req.push({eid: e.id, prev});
  });
  return out;
}
// Automatická omluva pro události založené později: otevřené budoucí nezrušené události v období platných nepřítomností,
// kde člen ještě neodpověděl. Vrací [{eid, mid, abs, reason}] (jedna položka na událost a člena).
export function absAuto(list, evs, at, now, today) {
  const out = [], seen = new Set();
  (list || []).filter(a => a.to >= today).forEach(a => (evs || []).forEach(e => {
    const k = e.id + "_" + a.mid;
    if (seen.has(k) || !inAbs(e, a) || isCancelled(e) || startOf(e) <= now || regClosed(e, now, today) || answerOf(at, e.id, a.mid)) return;
    seen.add(k);
    out.push({eid: e.id, mid: a.mid, abs: a.id, reason: absReason(a)});
  }));
  return out;
}
// Zrušení nepřítomnosti: id odpovědí v docházce, které zapsala (abs = id) u otevřených budoucích událostí (smažou se i s důvodem)
export function absRevert(a, evs, at, now, today) {
  const open = new Set((evs || []).filter(e => startOf(e) > now && !regClosed(e, now, today)).map(e => e.id));
  return (at || []).filter(x => x.abs === a.id && x.pid === a.mid && open.has(x.eid)).map(x => x.id);
}

// ===== Exporty =====
// (exportované funkce a konstanty jsou označené u definic výše)
