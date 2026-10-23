// Doména: žádosti členů (kolekce requests, čisté funkce bez DOM) – zatím žádost hráčky o změnu způsobu placení (kind "pay").
// requests/{id} = {kind, mid, at, by, st: "open" | "ok" | "no", reply, doneBy, doneAt, …}; pro "pay": from, to, ym (od měsíce), note.
// Pravidla žádosti o placení: jen Příspěvek ↔ Za událost, od příštího měsíce (běžný měsíc mění jen pokladník ručně), jedna otevřená žádost
// na osobu, osvobozená hráčka nežádá. Schválení zapíše historii grpH do plpay/{pid} (domain/cash.js grpHWith); vystavené příspěvky
// a uzavřená vyúčtování se nepřepočítávají – impactOf je jen vyjmenuje. Kolekci použije i fáze W (kind "att").

// ===== Importy =====
import {contribYm, exOf, grpAt, grpHWith, isContrib, restOf, ymAdd, ymOk} from "./cash.js";

// ===== Konstanty =====
export const REQ_COLL = "requests";
export const REQ_ST = {open: "čeká na vyřízení", ok: "schváleno", no: "zamítnuto"};
// Kolik měsíců dopředu lze žádost podat (od příštího měsíce)
export const REQ_AHEAD = 6;
// Nejdelší poznámka a odpověď
const NOTE_MAX = 300;

// ===== Pomocné funkce =====
const txt = s => String(s || "").trim().slice(0, NOTE_MAX);
const grpTo = g => (g === "single" ? "single" : "monthly");

// Měsíce, od kterých lze žádat: příští až REQ_AHEAD měsíců dopředu (now = "RRRR-MM")
export const reqYms = now => Array.from({length: REQ_AHEAD}, (_, i) => ymAdd(now, i + 1));
// Žádosti osoby (mid) daného druhu od nejnovější
export const reqsOf = (rs, mid, kind) => (rs || []).filter(r => r.mid === mid && (!kind || r.kind === kind)).sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
// Otevřená žádost osoby, nebo null
export const openReq = (rs, mid, kind) => reqsOf(rs, mid, kind).find(r => r.st === "open") || null;
// Otevřené žádosti daného druhu (pro pruh správců) od nejstarší
export const openReqs = (rs, kind) => (rs || []).filter(r => r.st === "open" && (!kind || r.kind === kind)).sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));

// ===== Hlavní logika =====
// Kontrola žádosti o placení: p = hráčka (s plpay), to = nový způsob, ym = od měsíce, now = dnešní měsíc, rs = žádosti. Vrací text chyby, nebo null.
export function payReqError(p, to, ym, now, rs) {
  if (!p) return "Účet není propojen s hráčkou";
  if (exOf(p)) return "Osvobozená hráčka o změnu nežádá – domluv se s pokladníkem";
  if (!ymOk(ym) || ym <= now) return "Změna platí nejdřív od příštího měsíce";
  if (!reqYms(now).includes(ym)) return "Vyber měsíc nejvýše " + REQ_AHEAD + " měsíců dopředu";
  if (grpAt(p, ym) === grpTo(to)) return "Od tohoto měsíce už platíš zvoleným způsobem";
  if (openReq(rs, p.id, "pay")) return "Už máš jednu otevřenou žádost";
  return null;
}
// Dokument nové žádosti o placení (from = způsob platný ve zvoleném měsíci před změnou)
export function payReqDoc(p, to, ym, note, by, at) {
  return {kind: "pay", mid: p.id, at, by: String(by || "").toLowerCase(), st: "open", from: grpAt(p, ym), to: grpTo(to), ym, note: txt(note)};
}
// Vyřízení žádosti: ok = schválit / zamítnout. Vrací {req – pole k merge do žádosti, pay – pole k merge do plpay/{pid} (jen při schválení), note – text auditu}.
// Při schválení: historie grpH se změnou od r.ym, grp = způsob platný dnes (starší verze aplikace počítají jen s grp).
export function decidePlan(r, p, ok, reply, by, at, now) {
  const req = {st: ok ? "ok" : "no", reply: txt(reply), doneBy: String(by || "").toLowerCase(), doneAt: at};
  if (!ok) return {req, pay: null, note: "zamítnuta žádost o změnu placení od " + r.ym};
  const grpH = grpHWith(p, r.to, r.ym);
  return {req, pay: {grpH, grp: grpAt({grpH}, now)}, note: "schválena změna placení na „" + (r.to === "single" ? "Za událost" : "Příspěvek") + "“ od " + r.ym};
}
// Dopad schválení na už vystavené: příspěvky hráčky od měsíce r.ym (nepřepočítají se – nezaplacené lze smazat ručně) a uzavřená vyúčtování
// událostí od r.ym, na kterých byla přihlášená (vyúčtování lze ručně znovu otevřít). ch = všechny předpisy, ev = [{id, title, date, settled, went}].
export function impactOf(r, ch, ev) {
  const contribs = (ch || []).filter(x => x.mid === r.mid && isContrib(x) && contribYm(x.eid) >= r.ym)
    .map(x => ({id: x.id, ym: contribYm(x.eid), amt: +x.amt || 0, rest: restOf(x)})).sort((a, b) => a.ym.localeCompare(b.ym));
  const settled = (ev || []).filter(e => e.settled && e.went && String(e.date || "").slice(0, 7) >= r.ym).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return {contribs, settled};
}

// ===== Exporty =====
// (exportované funkce a konstanty jsou označené u definic výše)
