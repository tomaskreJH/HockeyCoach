// Doména: ⏲ stopky a výsledky měření v tréninku – kolekce trms/{eid} (jeden dokument na trénink; výsledky vidí celý tým kromě hostující).
// Dokument: {v, r: {klíč linky "blok_linka": {d (id cvičení), dn (název), u ("s" | "ks" | "b"), low (nižší je lepší), ms: {pid: [pokusy]}}}, by, at}.
// Běžící stopky jsou jen v zařízení ({pid: začátek v ms}); po zastavení se čas přidá k pokusům hráčky. Počty a body se zadávají číslem.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Měřené linky plánu -> Stopky -> Pokusy a pořadí -> Dokument.

// ===== Importy =====
import {UNITS} from "../config/skills.js";

// ===== Konstanty =====
export const TRMS_COLL = "trms";
export const MS_VER = 1;                                 // trms.v: verze tvaru výsledků
export const MS_MAX = 20;                                // nejvýš pokusů jedné hráčky na jedné lince (starší se zahodí)
export const MS_LIM = {s: 3600, ks: 9999, b: 9999};      // horní mez hodnoty podle jednotky
const DEC = {s: 2, ks: 0, b: 1};                         // desetinná místa podle jednotky

// ===== Pomocné funkce =====
const num = v => (typeof v === "number" && isFinite(v) ? v : null);
const comma = s => String(s).replace(".", ",");
// Klíč linky ve výsledcích: id bloku + id linky (obojí z plánu, bez teček – bezpečné jako klíč mapy Firestore)
export const msKey = (bid, lid) => String(bid) + "_" + String(lid);
// Zaokrouhlená platná hodnota podle jednotky; null = neplatná (čas musí být kladný, počet celé číslo)
export function msVal(v, u) {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  if (!UNITS[u] || v === "" || v == null || !isFinite(n) || n < 0 || n > MS_LIM[u] || (u === "s" && n <= 0)) return null;
  const k = 10 ** DEC[u];
  return Math.round(n * k) / k;
}
// Výsledek pro zobrazení: čas „12,34 s“ / „1:05,30“, počet „7 ks“, body „7,5 b“
export function fmtVal(v, u) {
  if (num(v) == null) return "–";
  if (u === "s") {
    if (v < 60) return comma(v.toFixed(2)) + " s";
    const m = Math.floor(v / 60), s = v - m * 60;
    return m + ":" + comma(s.toFixed(2).padStart(5, "0"));
  }
  return comma(v) + (u === "ks" ? " ks" : " b");
}

// ===== Měřené linky plánu =====
// Linky plánu, jejichž cvičení má měření (banka cvičení), a linky s uloženými výsledky (hráčka banku nečte, cvičení se mohlo změnit).
// Uložená jednotka má přednost (pokusy se nesmí míchat). Vrací [{key, bi, li, bid, lid, d, dn, u, low}] v pořadí plánu, nakonec výsledky bez linky.
export function measLanes(plan, drills, res) {
  const D = drills || {}, R = (res && res.r) || {}, out = [], seen = new Set();
  ((plan && plan.blocks) || []).forEach((b, bi) => (b.lanes || []).forEach((l, li) => {
    const key = msKey(b.id, l.id), d = D[l.drill], m = d && d.meas && UNITS[d.meas.u] ? d.meas : null, r = R[key] && UNITS[R[key].u] ? R[key] : null;
    if (!m && !r) return;
    seen.add(key);
    out.push({key, bi, li, bid: b.id, lid: l.id, d: l.drill || (r && r.d) || "", dn: (r && r.dn) || (d && d.name) || l.dn || "?",
      u: r ? r.u : m.u, low: r ? r.low === true : m.low === true});
  }));
  Object.entries(R).forEach(([key, r]) => {
    if (!seen.has(key) && r && UNITS[r.u]) out.push({key, bi: null, li: null, bid: null, lid: null, d: r.d || "", dn: r.dn || "?", u: r.u, low: r.low === true});
  });
  return out;
}
// Měření linky (pro stopky v živém tréninku): {key, d, dn, u, low} nebo null, když cvičení měření nemá
export function laneMeas(block, lane, drills, res) {
  if (!block || !lane) return null;
  const key = msKey(block.id, lane.id), r = res && res.r && res.r[key], d = (drills || {})[lane.drill];
  if (r && UNITS[r.u]) return {key, d: r.d || lane.drill || "", dn: r.dn || (d && d.name) || lane.dn || "?", u: r.u, low: r.low === true};
  if (d && d.meas && UNITS[d.meas.u]) return {key, d: lane.drill, dn: d.name || lane.dn || "?", u: d.meas.u, low: d.meas.low === true};
  return null;
}

// ===== Stopky =====
// Spuštění stopek hráček pids (běžící se nemění): run = {pid: začátek ms} → nový objekt
export function swStart(run, pids, now) {
  const o = {...(run || {})};
  (pids || []).forEach(p => { if (o[p] == null) o[p] = now; });
  return o;
}
// Zastavení stopek hráčky: {run (bez hráčky), sec (naměřený čas v s, nejméně 0,01) | null, když neběžely}
export function swStop(run, pid, now) {
  const o = {...(run || {})}, t = o[pid];
  delete o[pid];
  return {run: o, sec: num(t) == null ? null : msVal(Math.max(0.01, (now - t) / 1000), "s")};
}
// Běžící čas hráčky v s (null = neběží)
export const swSec = (run, pid, now) => (run && num(run[pid]) != null ? Math.max(0, (now - run[pid]) / 1000) : null);
// Displej běžících stopek s desetinami: „12,3“ / „1:02,3“
export function swText(sec) {
  if (num(sec) == null) return "";
  const t = Math.floor(Math.max(0, sec) * 10) / 10, m = Math.floor(t / 60), s = t - m * 60;
  return m ? m + ":" + comma(s.toFixed(1).padStart(4, "0")) : comma(t.toFixed(1));
}

// ===== Pokusy a pořadí =====
// Nejlepší hodnota pokusů (nižší / vyšší je lepší); null bez pokusů
export function bestOf(vals, low) {
  const v = (vals || []).filter(x => num(x) != null);
  return v.length ? (low ? Math.min(...v) : Math.max(...v)) : null;
}
// Pokusy po přidání hodnoty (nejvýš MS_MAX posledních); null = neplatná hodnota
export function addTry(vals, v, u) {
  const x = msVal(v, u);
  return x == null ? null : [...(vals || []).filter(y => num(y) != null), x].slice(-MS_MAX);
}
// Pokusy bez posledního (oprava překlepu)
export const dropTry = vals => (vals || []).slice(0, -1);
// Pořadí hráček na lince podle nejlepšího výsledku: [{pid, best, n, vals, rank}] – stejný výsledek = stejné pořadí, bez pokusů se nevypisuje
export function ranking(entry) {
  const low = !!(entry && entry.low), ms = (entry && entry.ms) || {};
  const L = Object.entries(ms).map(([pid, vals]) => ({pid, vals: (vals || []).filter(x => num(x) != null)})).filter(x => x.vals.length)
    .map(x => ({...x, best: bestOf(x.vals, low), n: x.vals.length}))
    .sort((a, b) => (low ? a.best - b.best : b.best - a.best) || a.pid.localeCompare(b.pid));
  L.forEach((x, i) => { x.rank = i && L[i - 1].best === x.best ? L[i - 1].rank : i + 1; });
  return L;
}
// Výsledky jedné hráčky v tréninku: [{key, dn, u, low, vals, best, rank, of}] (of = kolik hráček má výsledek)
export function myResults(res, pid) {
  if (!pid) return [];
  return Object.entries((res && res.r) || {}).map(([key, e]) => {
    const R = ranking(e), me = R.find(x => x.pid === pid);
    return me ? {key, dn: e.dn || "?", u: e.u, low: e.low === true, vals: me.vals, best: me.best, rank: me.rank, of: R.length} : null;
  }).filter(Boolean);
}

// ===== Dokument =====
// Údaje linky ukládané k výsledkům (kopie názvu a jednotky – hráčka banku cvičení nečte)
export const msMeta = m => ({d: String((m && m.d) || ""), dn: String((m && m.dn) || "").slice(0, 80), u: m && UNITS[m.u] ? m.u : "s", low: !!(m && m.low)});
// Částečný zápis pokusů hráček jedné linky (dávka s hlubokým sloučením – ostatní linky a hráčky zůstanou): byPid = {pid: [pokusy]}
export function msPatch(m, byPid) {
  const ms = {};
  Object.entries(byPid || {}).forEach(([pid, vals]) => { ms[pid] = (vals || []).filter(x => num(x) != null).slice(-MS_MAX); });
  return {v: MS_VER, r: {[m.key]: {...msMeta(m), ms}}};
}
