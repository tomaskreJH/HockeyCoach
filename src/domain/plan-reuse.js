// Doména: opakované použití plánu tréninku – ⧉ kopie plánu z jiného tréninku a 📑 šablony plánu (kolekce trtpl, sdílené pro tým).
// Kopie i šablona přebírají bloky, délky, točení a cvičení; skupiny stanovišť se rozdělí podle pětek nového tréninku, trenéři jen přihlášení.
// Šablona trtpl/{id} = {v, name, goal, blocks, by, at} – bez trenérů a bez skupin stanovišť (ty patří konkrétnímu tréninku). Čisté funkce bez DOM.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Kopie plánu -> Šablony -> Výběr tréninků.

// ===== Importy =====
import {GK, POS_GRPS, groupsFor, isFixedLane, newPid, planDoc} from "./training-plan.js";

// ===== Konstanty =====
export const TRTPL_COLL = "trtpl";
export const TPL_MAX = {name: 60, list: 50};             // délka názvu šablony, nejvíc šablon v týmu
export const COPY_MAX = 12;                              // kolik předchozích tréninků nabídnout ke kopii

// ===== Pomocné funkce =====
const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
const clone = o => JSON.parse(JSON.stringify(o));
// Datum a čas události pro řazení ("YYYY-MM-DD HH:MM")
const when = e => String((e && e.date) || "") + " " + String((e && e.time) || "");

// ===== Kopie plánu =====
// Nový plán z cizího plánu (jiný trénink nebo šablona): nová id bloků a linek, trenéři jen z coaches (přihlášení; null = ponechat),
// skupiny: Společně – jen skupiny nového tréninku (🥅 zůstává), Stanoviště – skupiny nového tréninku střídavě na linky, které se točí (🥅 linka zůstává);
// blok podle postů (by: "pos") bere skupiny z pgroups (posGroups nového tréninku, výchozí útočnice + obránkyně).
export function planCopy(src, groups, coaches, drills, pgroups) {
  const P = planDoc(clone(src || {}), drills), co = coaches ? new Set(coaches) : null;
  P.blocks.forEach(b => {
    const field = groupsFor(b, groups, pgroups || POS_GRPS).filter(g => g !== GK);
    b.id = newPid("b");
    b.lanes.forEach(l => {
      l.id = newPid("l");
      if (co) l.co = (l.co || []).filter(c => co.has(c));
      l.grp = isFixedLane(l) ? [GK] : (l.grp || []).filter(g => field.includes(g));
    });
    if (b.mode === "st") {
      const rot = b.lanes.filter(l => !isFixedLane(l));
      rot.forEach(l => { l.grp = []; });
      if (rot.length) field.forEach((g, i) => rot[i % rot.length].grp.push(g));
    }
  });
  return P;
}

// ===== Šablony =====
// Chyba názvu šablony (text pro hlášku) nebo null
export function tplError(name, list) {
  const n = str(name, 999);
  if (!n) return "Zadej název šablony";
  if (n.length > TPL_MAX.name) return "Název je delší než " + TPL_MAX.name + " znaků";
  if ((list || []).length >= TPL_MAX.list) return "Šablon je už " + TPL_MAX.list + " – nejdřív nějakou smaž";
  return null;
}
// Dokument šablony z plánu: bez trenérů, u stanovišť bez skupin (rozdělí se až při použití), 🥅 linky zůstanou
export function tplDoc(name, plan, drills) {
  const P = planDoc(clone(plan || {}), drills);
  P.blocks.forEach(b => b.lanes.forEach(l => {
    l.co = [];
    if (b.mode === "st" && !isFixedLane(l)) l.grp = [];
  }));
  return {...P, name: str(name, TPL_MAX.name)};
}
// Šablony seřazené podle názvu (česky)
export const tplSort = list => [...(list || [])].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "cs"));
// ✨ Připravit trénink: naposledy uložená šablona s bloky (podle času uložení at; bez času nejníž), null = žádná
export function latestTpl(list) {
  const L = (list || []).filter(t => t && (t.blocks || []).length);
  return L.reduce((m, t) => (!m || String(t.at || "") > String(m.at || "") ? t : m), null);
}
// Krátký popis šablony / plánu: počet bloků a minut
export function planSummary(p) {
  const B = (p && p.blocks) || [], min = B.reduce((s, b) => s + (+b.dur || 0), 0);
  return B.length + " " + (B.length === 1 ? "blok" : B.length < 5 ? "bloky" : "bloků") + " · " + min + " min";
}

// ===== Výběr tréninků =====
// Tréninky, ze kterých jde plán zkopírovat: jiné než eid, nezrušené, dřívější než tento trénink (nejbližší první), nejvýš max
export function copySources(events, eid, max = COPY_MAX) {
  const cur = (events || []).find(e => e.id === eid), t0 = cur ? when(cur) : "9999";
  return (events || []).filter(e => e.id !== eid && !e.cancelled && when(e) < t0).sort((a, b) => when(b).localeCompare(when(a))).slice(0, max);
}
