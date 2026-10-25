// Doména: zrušení a úplné smazání události (čisté funkce bez DOM).
// Zrušení: pole cancelled = {by, at, reason} v dokumentu tréninku (events) nebo zápasu (matches) – událost zůstává v historii,
// přihlašování je zamčené, do Docházky se nepočítá a zápas nejde zahájit; zrušení lze vrátit (pole se smaže).
// Prázdnou událost (bez odpovědí, bez vyúčtování, u zápasu bez zápisu) smaže manager / trenér / asistent; událost s daty smaže úplně
// jen vývojář – i s docházkou, důvody, předpisy, úhradami v pokladně, vyúčtováním, cenou a žádostmi (wipePlan). Audit se nemaže.

// ===== Konstanty =====
export const CANCEL_KEY = "cancelled";                // pole v events / matches
export const CANCEL_REASON_MAX = 200;                 // nejdelší důvod zrušení

// ===== Pomocné funkce =====
const txt = s => String(s || "").trim().slice(0, CANCEL_REASON_MAX);
const list = m => Object.entries(m || {}).map(([id, d]) => ({id, ...d}));

// ===== Zrušení =====
// Je událost zrušená? (dokument události nebo položka seznamu s raw)
export const isCancelled = e => !!(e && ((e[CANCEL_KEY] && typeof e[CANCEL_KEY] === "object") || (e.raw && e.raw[CANCEL_KEY] && typeof e.raw[CANCEL_KEY] === "object")));
// Pole pro merge při zrušení
export const cancelPatch = (by, at, reason) => ({[CANCEL_KEY]: {by: String(by || "").toLowerCase(), at: String(at || ""), reason: txt(reason)}});
// Pole pro merge při vrácení zrušení (smaže pole)
export const uncancelPatch = () => ({[CANCEL_KEY]: "__del"});
// Proč událost nejde zrušit (text), nebo null: už zrušená, zápas běží nebo je uzavřený
export function cancelBlock(raw, isMatch) {
  if (isCancelled(raw)) return "Událost už je zrušená";
  if (isMatch && raw && raw.closed) return "Uzavřený zápas nejde zrušit";
  if (isMatch && raw && raw.live) return "Zápas už začal – nejde zrušit";
  return null;
}
// Text zrušení pro zobrazení: „❌ Zrušeno 24. 10. 2026 · důvod“
export function cancelText(raw) {
  const c = raw && raw[CANCEL_KEY];
  if (!c || typeof c !== "object") return "";
  const d = String(c.at || "").slice(0, 10), day = /^\d{4}-\d{2}-\d{2}$/.test(d) ? +d.slice(8) + ". " + +d.slice(5, 7) + ". " + d.slice(0, 4) : "";
  return "❌ Zrušeno" + (day ? " " + day : "") + (c.reason ? " · " + c.reason : "");
}

// ===== Prázdná událost (smazání managerem / trenérem / asistentem) =====
// Událost bez dat: žádná odpověď v docházce, žádné vyúčtování ani předpis a u zápasu bez zápisu (události, živý zápis, uzavření)
export function isEmptyEvent(id, raw, src) {
  const s = src || {}, r = raw || {};
  if (list(s.attendance).some(a => a.eid === id)) return false;
  if (r.ss || (s.evcash && s.evcash[id])) return false;
  if (list(s.charges).some(x => x.eid === id)) return false;
  if (r.live || r.closed || (Array.isArray(r.events) && r.events.length)) return false;
  return true;
}

// ===== Úplné smazání (vývojář) =====
// Plán smazání události se vším souvisejícím. c = "events" | "matches", id = id události, src = zrcadlo kolekcí
// {attendance, attnote, charges, cash, evcash, evprice, requests, evpub, lineuppub} (id → dokument).
// Vrací {ops: [["del", kolekce, id]], n: počty po kolekcích, mids: vlastníci smazaných předpisů (přepočet dlužníků)}.
export function wipePlan(c, id, src) {
  const s = src || {}, ops = [], n = {};
  const del = (coll, did) => { ops.push(["del", coll, did]); n[coll] = (n[coll] || 0) + 1; };
  const att = list(s.attendance).filter(a => a.eid === id);
  att.forEach(a => del("attendance", a.id));
  // Důvody omluv mají stejné id jako docházka (eid_mid); smažou se i důvody bez dokumentu docházky
  list(s.attnote).filter(x => x.eid === id).forEach(x => del("attnote", x.id));
  const ch = list(s.charges).filter(x => x.eid === id), cids = new Set(ch.map(x => x.id));
  ch.forEach(x => del("charges", x.id));
  // Úhrady v pokladně: příjem k předpisu (cid) nebo přímo k události (eid)
  list(s.cash).filter(x => x.eid === id || (x.cid && cids.has(x.cid))).forEach(x => del("cash", x.id));
  ["evcash", "evprice", "evpub", "lineuppub"].forEach(k => { if (s[k] && s[k][id]) del(k, id); });
  list(s.requests).filter(x => x.eid === id).forEach(x => del("requests", x.id));
  del(c, id);
  const mids = [...new Set(ch.map(x => x.mid).filter(Boolean))];
  return {ops, n, mids, cids: [...cids]};
}
// Popis plánu smazání pro potvrzení: „docházka 12, předpisy 3, pokladna 2 …“
export function wipeText(plan) {
  const names = {attendance: "odpovědi", attnote: "důvody omluv", charges: "předpisy", cash: "zápisy v pokladně", evcash: "vyúčtování", evprice: "cena pro hráčky", requests: "žádosti", evpub: "veřejná hlavička", lineuppub: "veřejná formace"};
  return Object.entries(plan.n || {}).filter(([k]) => names[k]).map(([k, v]) => names[k] + " " + v).join(", ") || "jen událost";
}

// ===== Exporty =====
// (exportované funkce a konstanty jsou označené u definic výše)
