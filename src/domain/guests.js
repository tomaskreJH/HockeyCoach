// Doména: hostující hráčky (čisté funkce bez DOM). Hostující = hráčka v soupisce s příznakem players.guest = true; počítá se
// všude jako každá hráčka (docházka, statistiky, platby), jen nese značku 🎟. S účtem (role host v members) vidí jen sebe:
// úzké veřejné dokumenty evpub/{id} (hlavička události bez odpovědí a bez statistik) a lineuppub/{id} (pětky tréninku / formace zápasu
// jako jména), které zapisuje aplikace trenéra / kustoda (pubPlan → views/guest-sync.js). Formaci smí host číst jen u události,
// kde má odpověď „Jdu“ (vynucují pravidla databáze).

// ===== Importy =====
import {LN, SL} from "../config/constants.js";

// ===== Konstanty =====
export const GUEST_KEY = "guest";                    // příznak v players: hostující hráčka
export const GUEST_TAG = "🎟";                       // značka u jména
export const EVPUB_COLL = "evpub";                   // veřejná hlavička události pro hostující
export const LUPUB_COLL = "lineuppub";               // formace / pětky události pro hostující (jen jména)
export const PUB_PAST_DAYS = 14;                     // jak dlouho po události zůstávají veřejné dokumenty
const LINE_NOS = [1, 2, 3, 4];

// ===== Pomocné funkce =====
const str = v => (v == null ? "" : String(v));
// Stabilní text objektu (seřazené klíče) – porovnání požadovaného a uloženého dokumentu
export function stable(v) {
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
  return JSON.stringify(v === undefined ? null : v);
}
// Den posunutý o n dní ("RRRR-MM-DD")
function dayAdd(day, n) {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
// Jméno pro veřejnou formaci: „#12 Eva“ (hráčka), „🎓 Jana“ (realizační tým)
const plName = p => (p.num ? "#" + p.num + " " : "") + str(p.name);

// ===== HG1: hostující hráčka bez účtu =====
// Je hráčka hostující?
export const isGuest = p => !!(p && p[GUEST_KEY] === true);
// Pole pro merge do players: zapnutí příznaku, vypnutí smaže pole
export const guestPatch = on => ({[GUEST_KEY]: on ? true : "__del"});
// Jsou v soupisce aktivní (neukončené) hostující hráčky? (bez nich se veřejné dokumenty nepíšou)
export const hasGuests = players => (players || []).some(p => isGuest(p) && (p.st || "act") !== "end");

// ===== HG2: veřejná hlavička události =====
// Dokument evpub z tréninku (k = "t") nebo zápasu (k = "m"); bez odpovědí, nákladů, sestav a statistik
export function evPubDoc(e, k) {
  const d = {k, date: str(e.date), time: str(e.time), place: str(e.place), dl: str(e.dl)};
  if (e.meet != null && e.meet !== "") d.meet = +e.meet || 0;
  if (k === "t") { d.title = str(e.title || "Trénink"); d.end = str(e.end); d.note = str(e.note); }
  else { d.opp = str(e.opp); d.home = !!e.home; }
  if (e.cancelled) d.cancelled = {at: str(e.cancelled.at), reason: str(e.cancelled.reason)};
  return d;
}
// Pětky tréninku jako řádky jmen: lines = {pid | "t:" + tid: číslo pětky}
function trainRows(lines, P, T) {
  const L = lines || {};
  return LINE_NOS.map(n => {
    const pls = Object.keys(L).filter(k => +L[k] === n && !k.startsWith("t:")).map(id => P[id]).filter(Boolean).map(plName).sort((a, b) => a.localeCompare(b, "cs"));
    const trs = Object.keys(L).filter(k => +L[k] === n && k.startsWith("t:")).map(k => T[k.slice(2)]).filter(Boolean).map(t => "🎓 " + str(t.name)).sort((a, b) => a.localeCompare(b, "cs"));
    return {t: n + ". pětka", n: [...pls, ...trs]};
  }).filter(r => r.n.length);
}
// Formace zápasu jako řádky jmen: řady 1–4 (pozice LK, C, PK, LO, PO včetně střídajících), brankářky G1 / G2
function matchRows(lu, P) {
  const L = lu || {}, name = id => (P[id] ? plName(P[id]) : null), rows = [];
  LN.forEach(n => {
    const ids = [];
    SL.forEach(s => { for (let k = n + s; L[k]; k += "+") ids.push(L[k]); });
    const names = ids.map(name).filter(Boolean);
    if (names.length) rows.push({t: n + ". formace", n: names});
  });
  const g = ["G1", "G2"].map(k => name(L[k])).filter(Boolean);
  if (g.length) rows.push({t: "Brankářky", n: g});
  return rows;
}
// Dokument lineuppub: {k, date, rows: [{t, n: [jména]}]}; null = událost formaci nemá (dokument se nezakládá / smaže)
export function lineupPubDoc(e, k, players, staff) {
  const P = Object.fromEntries((players || []).map(p => [p.id, p])), T = Object.fromEntries((staff || []).map(t => [t.id, t]));
  const rows = k === "t" ? trainRows(e.lines, P, T) : matchRows(e.lineup, P);
  return rows.length ? {k, date: str(e.date), rows} : null;
}

// ===== HG2: plán zápisu veřejných dokumentů =====
// Co zapsat a smazat, aby evpub / lineuppub odpovídaly událostem. Zahrnuje události od (today − PUB_PAST_DAYS) dál;
// bez aktivních hostujících se všechny veřejné dokumenty smažou. cur = {evpub: {id: d}, lineuppub: {id: d}}.
// Vrací {set: [{c, id, d}], del: [{c, id}]} – zapisuje se jen to, co se liší (porovnání stable()).
export function pubPlan(trainings, matches, players, staff, cur, today) {
  const want = {[EVPUB_COLL]: {}, [LUPUB_COLL]: {}}, from = dayAdd(today, -PUB_PAST_DAYS);
  if (hasGuests(players)) {
    const add = (e, k) => {
      if (!e || !e.id || !/^\d{4}-\d{2}-\d{2}$/.test(str(e.date)) || e.date < from) return;
      want[EVPUB_COLL][e.id] = evPubDoc(e, k);
      const lu = e.cancelled ? null : lineupPubDoc(e, k, players, staff);
      if (lu) want[LUPUB_COLL][e.id] = lu;
    };
    (trainings || []).forEach(e => add(e, "t"));
    (matches || []).forEach(m => add(m, "m"));
  }
  const set = [], del = [];
  [EVPUB_COLL, LUPUB_COLL].forEach(c => {
    const have = (cur || {})[c] || {};
    Object.entries(want[c]).forEach(([id, d]) => { if (!have[id] || stable(have[id]) !== stable(d)) set.push({c, id, d}); });
    Object.keys(have).forEach(id => { if (!want[c][id]) del.push({c, id}); });
  });
  return {set, del};
}
// Hostující účet: tréninky a zápasy pro zobrazení z veřejných hlaviček evpub [{id, ...d}] (tvar jako events / matches)
export function fromPub(list) {
  const ev = [], ma = [];
  (list || []).forEach(x => {
    const base = {id: x.id, date: str(x.date), time: str(x.time), place: str(x.place), dl: str(x.dl), meet: x.meet, cancelled: x.cancelled || null};
    if (x.k === "m") ma.push({...base, opp: str(x.opp), home: !!x.home});
    else ev.push({...base, title: str(x.title || "Trénink"), end: str(x.end), note: str(x.note)});
  });
  return {ev, ma};
}

// ===== Exporty =====
// (exportované funkce a konstanty jsou označené u definic výše)
