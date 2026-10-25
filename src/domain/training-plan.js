// Doména: plán tréninku trplan/{eid} – bloky Společně / Stanoviště, časy od začátku tréninku, rozpis točení skupin,
// skupiny z rozdělení do pětek (1–4) + 🥅 brankářky "G", kontrola plánu (přetečení, kolize trenérů, skupiny bez stanoviště).
// Dokument: {v, goal, blocks: [{id, mode "all"|"st", dur (min), rot (min | null), lanes: [{id, drill, dn, di, co [tid], grp [1..4|"G"]}]}], by, at}.
// Linka s brankářkami ("G") se netočí (souběžná linka); ostatní linky stanoviště se točí po kolech. Čisté funkce bez DOM.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Skupiny -> Úprava plánu -> Časy a točení -> Kontrola -> Hráčka -> Exporty (u funkcí).

// ===== Importy =====
import {LINE_NOS} from "./event-helpers.js";

// ===== Konstanty =====
export const TRPLAN_COLL = "trplan";
export const PLAN_VER = 1;                                   // trplan.v: verze tvaru plánu
export const GK = "G";                                       // skupina brankářek
export const MODES = {all: "👥 Společně", st: "🔄 Stanoviště"};
export const PLAN_MAX = {blocks: 30, lanes: 4, goal: 200, dn: 80, di: 3};
export const BLK_DUR_MIN = 1, BLK_DUR_MAX = 90, BLK_DUR_DEF = 10;

// ===== Pomocné funkce =====
const int = (v, d) => { const n = Number(v); return Number.isInteger(n) ? n : d; };
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
const uniq = a => [...new Set(a)];
// Klíč skupiny: čísla pětek 1–4 nebo "G" (jiné hodnoty se zahodí)
const grpKey = g => (g === GK ? GK : LINE_NOS.includes(+g) ? +g : null);
// Pořadí skupin: pětky vzestupně, brankářky na konci
const grpSort = (a, b) => (a === GK) - (b === GK) || a - b;
// Linka s brankářkami se netočí
export const isFixedLane = l => (l.grp || []).includes(GK);
// Nové krátké id bloku / linky (unikátní v rámci plánu)
export const newPid = (p = "b") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// Text skupiny pro zobrazení
export const grpLabel = g => (g === GK ? "🥅 Brankářky" : g + ". pětka");

// ===== Skupiny =====
// Skupiny tréninku: pětky, ve kterých je aspoň jedna přihlášená hráčka (lines z rozdělení do pětek), + "G" při přihlášené brankářce.
// skaters = id přihlášených hráček bez brankářek, goalies = id přihlášených brankářek.
export function planGroups(lines, skaters, goalies) {
  const L = lines || {}, out = new Set();
  (skaters || []).forEach(id => { const n = +L[id]; if (LINE_NOS.includes(n)) out.add(n); });
  const g = [...out].sort((a, b) => a - b);
  if ((goalies || []).length) g.push(GK);
  return g;
}
// Vyrovnané rozdělení přihlášených hráček do n pětek (going v pořadí soupisky, střídavě 1, 2, …, n); členy realizačního týmu z prev zachová
export function evenLines(going, n, prev, isTr) {
  const k = clamp(int(n, 2), 1, LINE_NOS.length), r = {};
  (going || []).forEach((id, i) => { r[id] = (i % k) + 1; });
  Object.entries(prev || {}).forEach(([key, v]) => { if (isTr && isTr(key)) r[key] = v; });
  return r;
}

// ===== Úprava plánu =====
// Prázdná linka a blok; blok Společně má jednu linku pro všechny, Stanoviště dvě
export const laneBlank = () => ({id: newPid("l"), drill: "", dn: "", di: [], co: [], grp: []});
export function blockBlank(mode, groups) {
  const m = mode === "st" ? "st" : "all", b = {id: newPid("b"), mode: m, dur: BLK_DUR_DEF, rot: null, lanes: [laneBlank()]};
  if (m === "st") {
    b.lanes.push(laneBlank());
    // Výchozí rozdělení: skupiny pětek střídavě na linky, brankářky (pokud jsou) na vlastní linku
    const field = (groups || []).filter(g => g !== GK);
    field.forEach((g, i) => b.lanes[i % 2].grp.push(g));
    if ((groups || []).includes(GK)) b.lanes.push({...laneBlank(), grp: [GK]});
    b.dur = 20;
  }
  return b;
}
export const planBlank = () => ({v: PLAN_VER, goal: "", blocks: []});
// Normalizovaný plán k uložení (jen známá pole, meze délek a počtů); drills = mapa id → cvičení z banky (kopie názvu a obrázků pro hráčky)
export function planDoc(p, drills) {
  const D = drills || {}, src = p || {};
  const lane = (l, mode) => {
    const d = D[l.drill], grp = uniq((l.grp || []).map(grpKey).filter(g => g != null)).sort(grpSort);
    return {id: str(l.id, 24) || newPid("l"), drill: str(l.drill, 40),
      dn: str(d ? d.name : l.dn, PLAN_MAX.dn), di: (d ? d.img || [] : l.di || []).filter(x => typeof x === "string").slice(0, PLAN_MAX.di),
      co: uniq((l.co || []).filter(x => typeof x === "string" && x)).slice(0, 6), grp: mode === "all" && !grp.includes(GK) ? grp.filter(g => g !== GK) : grp};
  };
  const blocks = (Array.isArray(src.blocks) ? src.blocks : []).slice(0, PLAN_MAX.blocks).map(b => {
    const mode = b.mode === "st" ? "st" : "all", dur = clamp(int(b.dur, BLK_DUR_DEF), BLK_DUR_MIN, BLK_DUR_MAX), rot = int(b.rot, null);
    return {id: str(b.id, 24) || newPid("b"), mode, dur, rot: mode === "st" && rot && rot >= 1 && rot <= dur ? rot : null,
      lanes: (Array.isArray(b.lanes) ? b.lanes : []).slice(0, PLAN_MAX.lanes).map(l => lane(l, mode))};
  });
  return {v: PLAN_VER, goal: str(src.goal, PLAN_MAX.goal), blocks};
}
// Přesun bloku o krok nahoru (-1) / dolů (+1); vrací nový seznam
export function moveBlock(blocks, id, dir) {
  const a = [...(blocks || [])], i = a.findIndex(b => b.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= a.length) return a;
  [a[i], a[j]] = [a[j], a[i]];
  return a;
}
// Použití cvičení v plánech: mapa id cvičení → počet plánů (pro drillCanDelete)
export function drillUsage(plans) {
  const m = {};
  (plans || []).forEach(p => uniq((p.blocks || []).flatMap(b => (b.lanes || []).map(l => l.drill)).filter(Boolean)).forEach(id => { m[id] = (m[id] || 0) + 1; }));
  return m;
}

// ===== Časy a točení =====
// "HH:MM" → minuty od půlnoci (null při chybě) a zpět (sekundy se ukážou jen, když nejsou nulové)
export const hm2min = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "")); return m ? +m[1] * 60 + +m[2] : null; };
export function clock(startMin, sec) {
  const t = Math.round(startMin * 60 + sec), h = Math.floor(t / 3600) % 24, m = Math.floor(t / 60) % 60, s = t % 60;
  return h + ":" + String(m).padStart(2, "0") + (s ? ":" + String(s).padStart(2, "0") : "");
}
// Časy bloků: bloky jdou za sebou od začátku tréninku; a, b = sekundy od začátku
export function planTimes(blocks) {
  let t = 0;
  return (blocks || []).map(b => { const a = t; t += (+b.dur || 0) * 60; return {id: b.id, a, b: t}; });
}
export const planMinutes = blocks => (blocks || []).reduce((s, b) => s + (+b.dur || 0), 0);
// Rozpis točení bloku: kola [{a, b (sekundy od začátku bloku), lanes: {idLinky: [skupiny]}}].
// Společně = jedno kolo bez točení. Stanoviště: počet kol = počet točících se linek (bez rot), nebo celé dur / rot (poslední kolo do konce bloku);
// v kole r se skupiny z linky i posunou na linku (i + r) mod počet linek. Linka s brankářkami má stále své skupiny.
export function rotation(block) {
  const lanes = (block && block.lanes) || [], dur = ((block && +block.dur) || 0) * 60;
  const fixed = lanes.filter(isFixedLane), rot = block && block.mode === "st" ? lanes.filter(l => !isFixedLane(l)) : [];
  if (!rot.length) return [{a: 0, b: dur, lanes: Object.fromEntries(lanes.map(l => [l.id, [...(l.grp || [])]]))}];
  const n = block.rot ? Math.max(1, Math.floor(dur / (block.rot * 60))) : rot.length, len = block.rot ? block.rot * 60 : dur / n;
  const out = [];
  for (let r = 0; r < n; r++) {
    const L = {};
    fixed.forEach(l => { L[l.id] = [...(l.grp || [])]; });
    rot.forEach((l, i) => { L[rot[(i + r) % rot.length].id] = [...(l.grp || [])]; });
    out.push({a: Math.round(r * len), b: r === n - 1 ? dur : Math.round((r + 1) * len), lanes: L});
  }
  return out;
}

// ===== Kontrola =====
// Problémy plánu: [{lvl: "err" | "warn", blk (index bloku | null), t}]. ctx = {total (min tréninku), groups (planGroups), coaches (id přihlášených
// členů týmu), drills (mapa id → cvičení)}. err = chyba (plán nejde spustit správně), warn = upozornění; uložit jde vždy.
export function planIssues(p, ctx = {}) {
  const out = [], B = (p && p.blocks) || [], add = (lvl, blk, t) => out.push({lvl, blk, t}), D = ctx.drills || null;
  const used = planMinutes(B), total = +ctx.total || 0, G = ctx.groups || [], field = G.filter(g => g !== GK), coaches = ctx.coaches ? new Set(ctx.coaches) : null;
  if (total && used > total) add("err", null, "Plán přesahuje konec tréninku o " + (used - total) + " min.");
  else if (total && used < total && B.length) add("warn", null, "Nenaplánováno zbývá " + (total - used) + " min.");
  B.forEach((b, bi) => {
    const L = b.lanes || [], nm = "Blok " + (bi + 1) + ": ";
    if (!L.length) add("warn", bi, nm + "bez linky.");
    L.forEach((l, li) => {
      const ln = L.length > 1 ? "linka " + (li + 1) + " " : "";
      if (!l.drill) add("warn", bi, nm + ln + "bez cvičení.");
      else if (D && (!D[l.drill] || D[l.drill].arch)) add("warn", bi, nm + ln + "– cvičení „" + (l.dn || "?") + "“ už v bance není (vyřazené nebo smazané).");
      if (coaches) (l.co || []).filter(c => !coaches.has(c)).forEach(() => add("warn", bi, nm + ln + "– trenér není přihlášený na trénink."));
    });
    // Kolize trenérů: tentýž člen týmu na dvou linkách téhož bloku
    const seen = {};
    L.forEach(l => (l.co || []).forEach(c => { seen[c] = (seen[c] || 0) + 1; }));
    if (Object.values(seen).some(n => n > 1)) add("err", bi, nm + "stejný trenér na dvou linkách najednou.");
    // Skupiny: každá na nejvýš jedné lince; u stanovišť všechny pětky tréninku na některé lince
    const cnt = {};
    L.forEach(l => (l.grp || []).forEach(g => { cnt[g] = (cnt[g] || 0) + 1; }));
    Object.entries(cnt).filter(([, n]) => n > 1).forEach(([g]) => add("err", bi, nm + grpLabel(g === GK ? GK : +g) + " je na dvou linkách."));
    if (b.mode === "st") {
      const rl = L.filter(l => !isFixedLane(l));
      if (rl.length < 2) add("warn", bi, nm + "stanoviště potřebují aspoň 2 linky, které se točí.");
      field.filter(g => !cnt[g]).forEach(g => add("warn", bi, nm + grpLabel(g) + " není na žádném stanovišti."));
      if (rl.some(l => !(l.grp || []).length)) add("warn", bi, nm + "stanoviště bez skupiny (v prvním kole prázdné).");
      if (b.rot && rl.length > 1 && Math.floor(b.dur / b.rot) < rl.length) add("warn", bi, nm + "skupiny za " + b.dur + " min neprojdou všechna stanoviště (" + rl.length + " × " + b.rot + " min).");
    }
    if (cnt[GK] && !G.includes(GK)) add("warn", bi, nm + "linka brankářek, ale žádná brankářka není přihlášená.");
  });
  return out;
}

// ===== Hráčka =====
// Skupina hráčky: brankářka "G", jinak číslo pětky z rozdělení (null = bez pětky)
export const myGroup = (lines, pid, goalie) => (goalie ? GK : LINE_NOS.includes(+((lines || {})[pid])) ? +lines[pid] : null);
// Linka skupiny v kole bloku: blok Společně bez skupin = všichni; jinak linka, kde je skupina (id linky nebo null)
export function laneOf(block, round, g) {
  const L = (block && block.lanes) || [];
  if (g == null) return null;
  const hit = Object.entries((round && round.lanes) || {}).find(([, grp]) => grp.includes(g));
  if (hit) return hit[0];
  if (block.mode === "all") { const open = L.find(l => !(l.grp || []).length); return open ? open.id : null; }
  return null;
}
