// Doména: žádosti o změnu účasti po uzávěrce přihlašování (requests, kind "att"; čisté funkce bez DOM).
// requests/{id} = {kind: "att", mid, by, at, st: "open" | "ok" | "no", eid, want: "yes" | "no" | "maybe", reason, abs?, reply, doneBy, doneAt}.
// Žádost podá člen (hráčka, hostující, člen realizačního týmu) za sebe po uzávěrce a nejpozději do začátku události; jedna otevřená
// žádost na událost. Vyřizuje manager / trenér / asistent: schválení zapíše odpověď v docházce (jako ruční změna) a důvod do attnote.
// abs = id nepřítomnosti (🏖), ze které žádost vznikla (domain/absence.js).

// ===== Importy =====
import {isCancelled} from "./event-cancel.js";
import {regClosed} from "./home-summary.js";

// ===== Konstanty =====
export const ATT_KIND = "att";
export const WANT = {yes: "✅ Jdu", no: "❌ Nejdu", maybe: "❓ Nejsem jistý"};
const REASON_MAX = 300;

// ===== Pomocné funkce =====
const txt = s => String(s || "").trim().slice(0, REASON_MAX);
// Začátek události v ms (bez času = začátek dne)
const startOf = e => new Date(e.date + "T" + (/^\d{1,2}:\d{2}$/.test(e.time || "") ? e.time.padStart(5, "0") : "00:00")).getTime();

// ===== Výběry =====
// Žádosti o změnu účasti (kind "att"); volitelně jen otevřené
export const attReqs = (rs, open) => (rs || []).filter(r => r.kind === ATT_KIND && (!open || r.st === "open"));
// Otevřené žádosti pro pruh managera / trenéra / asistenta, od nejstarší
export const openAttReqs = rs => attReqs(rs, true).sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
// Žádosti člena mid k události eid, od nejnovější
export const myAttReqs = (rs, eid, mid) => attReqs(rs).filter(r => r.eid === eid && r.mid === mid).sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
// Otevřená žádost člena k události, nebo null
export const openAttReq = (rs, eid, mid) => myAttReqs(rs, eid, mid).find(r => r.st === "open") || null;

// ===== Hlavní logika =====
// Smí člen žádat? e = událost {date, time, dl, cancelled}, cur = jeho současná odpověď ("yes" | "no" | "maybe" | null).
// Vrací text chyby, nebo null. Žádá se jen po uzávěrce a do začátku události, u nezrušené události a o jinou odpověď.
export function attReqError(e, mid, want, cur, rs, now, today) {
  if (!e) return "Událost neexistuje";
  if (!mid) return "Účet není propojen s členem týmu";
  if (isCancelled(e)) return "Událost je zrušená";
  if (!WANT[want]) return "Vyber novou odpověď";
  if (!regClosed(e, now, today)) return "Přihlašování je otevřené – odpověz přímo";
  if (startOf(e) <= now) return "Událost už začala – změnu zapíše jen trenér";
  if (cur === want) return "Tuto odpověď už máš";
  if (openAttReq(rs, e.id, mid)) return "K této události už máš otevřenou žádost";
  return null;
}
// Dokument nové žádosti (abs = id nepřítomnosti, nepovinné)
export function attReqDoc(eid, mid, want, reason, by, at, abs) {
  const d = {kind: ATT_KIND, mid, by: String(by || "").toLowerCase(), at, st: "open", eid, want, reason: txt(reason)};
  if (abs) d.abs = String(abs);
  return d;
}
// Vyřízení: req = pole k merge do žádosti; att = {st, reason, abs} k zápisu do docházky (jen při schválení); note = text auditu
export function attDecidePlan(r, ok, reply, by, at) {
  const req = {st: ok ? "ok" : "no", reply: txt(reply), doneBy: String(by || "").toLowerCase(), doneAt: at};
  if (!ok) return {req, att: null, note: "zamítnuta žádost o změnu účasti na " + (WANT[r.want] || r.want)};
  return {req, att: {st: r.want, reason: r.want === "yes" ? "" : txt(r.reason), abs: r.abs || ""}, note: "schválena změna účasti na " + (WANT[r.want] || r.want)};
}

// ===== Exporty =====
// (exportované funkce a konstanty jsou označené u definic výše)
