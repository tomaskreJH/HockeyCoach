// Doména: plán tréninku trplan/{eid} – bloky Společně / Stanoviště, časy od začátku tréninku, rozpis točení, kontrola plánu.
// Dokument: {v, goal, blocks: [{id, mode "all"|"st", by?, brk?, dur, rot, lanes: [{id, drill, dn, di, co [tid], grp, seq?}]}], by, at}.
// Skupiny: pětky 1–4 nebo posty (by: "pos" – "F" / "D") + 🥅 "G" (netočí se). ☕ Pauza = blok s brk bez linek (mimo cvičení a přehledy).
// Řada cvičení seq = [{id, drill, dn, di, dur}] jen u linky, která se netočí; drill / dn / di linky = první cvičení řady.
// v22.20: dx = kopie podrobností cvičení z banky pro hráčky (kategorie, úroveň, délka, pomůcky, popis, video, PDF) – jen u prvního
// výskytu cvičení v plánu (velikost dokumentu); čte se přes planDetails. Hráčka banku nečte, přípravu na trénink vidí z plánu.
// Cvičení řady pro hodnocení, měření a pokrytí rozkládá expandLanes (klíč blok_linka-cvičení).
// ===== Importy =====
import {dressName, LINE_NOS} from "./event-helpers.js";
import {clamp} from "../core/utils.js";

// ===== Konstanty =====
export const TRPLAN_COLL = "trplan";
export const PLAN_VER = 1;                                   // trplan.v: verze tvaru plánu
export const GK = "G";                                       // skupina brankářek
export const FW = "F", DF = "D";                              // skupiny podle postu: útočnice, obránkyně (blok by: "pos")
export const POS_GRPS = [FW, DF];
export const BY = {ln: "🎽 Dresy", pos: "⚔ Útok / obrana"};      // čím se v bloku dělí skupiny
export const MODES = {all: "👥 Společně", st: "🔄 Stanoviště"};
export const PLAN_MAX = {blocks: 30, lanes: 4, goal: 200, dn: 80, di: 3, seq: 8};   // seq = nejvýš cvičení v řadě jedné linky
export const BLK_DUR_MIN = 1, BLK_DUR_MAX = 90, BLK_DUR_DEF = 10;
export const BRK_DEF = "Pití", BRK_DUR = 3, BRK_MAX = 40;    // ☕ pauza: výchozí popisek a délka (min), nejdelší popisek

// ===== Pomocné funkce =====
const int = (v, d) => { const n = Number(v); return Number.isInteger(n) ? n : d; };
const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
const uniq = a => [...new Set(a)];
// Klíč skupiny bloku: u pětek čísla 1–4, u postů "F" / "D"; "G" vždy (jiné hodnoty se zahodí)
const grpKey = (g, pos) => (g === GK ? GK : pos ? (POS_GRPS.includes(g) ? g : null) : LINE_NOS.includes(+g) ? +g : null);
// Pořadí skupin: pětky vzestupně, útočnice, obránkyně, brankářky na konci
const grpRank = g => (g === GK ? 9 : g === FW ? 7 : g === DF ? 8 : +g);
const grpSort = (a, b) => grpRank(a) - grpRank(b);
// Je blok ☕ pauza (bez cvičení)?
export const isBreak = b => !!b && b.brk != null && b.brk !== false;
// Dělí blok skupiny podle postů?
export const isPosBlock = b => !!b && b.by === "pos";
// Skupina hráčky podle postu (Obránkyně = "D", jinak útočnice "F")
export const posGrp = pos => (pos === "Obránkyně" ? DF : FW);
// Linka s brankářkami se netočí
export const isFixedLane = l => (l.grp || []).includes(GK);
// Používá blok „Další volby“ úpravy plánu? (podle postů, vlastní točení, trenéři u linek, souběžná linka u Společně) – pak je sekce otevřená
export const blockExtras = b => !!b && !isBreak(b) && (isPosBlock(b) || !!b.rot || (b.lanes || []).some(l => (l.co || []).length > 0) || (b.mode !== "st" && (b.lanes || []).length > 1));
// Nové krátké id bloku / linky (unikátní v rámci plánu)
export const newPid = (p = "b") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// Označení linek bloku: stanoviště A–D (jen linky, které se točí), linka brankářek 🥅, u bloku Společně prázdný text
export function laneTags(b) {
  let k = 0;
  return ((b && b.lanes) || []).map(l => (b.mode !== "st" ? "" : isFixedLane(l) ? "🥅" : "ABCD"[k++] || "?"));
}
// Text skupiny pro zobrazení
export const grpLabel = g => (g === GK ? "🥅 Brankářky" : g === FW ? "⚔ Útočnice" : g === DF ? "🛡 Obránkyně" : dressName(g));

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
// Skupiny podle postu: "F" / "D", ve kterých je aspoň jedna přihlášená hráčka (skaters = [{id, pos}]), + "G" při přihlášené brankářce
export function posGroups(skaters, goalies) {
  const has = new Set((skaters || []).map(p => posGrp(p && p.pos)));
  const g = POS_GRPS.filter(x => has.has(x));
  if ((goalies || []).length) g.push(GK);
  return g;
}
// Skupiny, které platí pro blok (pětky nebo posty)
export const groupsFor = (b, groups, pgroups) => (isPosBlock(b) ? pgroups || [] : groups || []);
// Skupina hráčky v bloku: g = pětka / "G" (myGroup), pg = post "F" / "D" / "G"; null = bez skupiny
export const groupIn = (b, g, pg) => (isPosBlock(b) ? pg : g);
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
// by = "pos" → skupiny podle postů (groups pak jsou posGroups)
export function blockBlank(mode, groups, by) {
  const m = mode === "st" ? "st" : "all", b = {id: newPid("b"), mode: m, dur: BLK_DUR_DEF, rot: null, lanes: [laneBlank()]};
  if (by === "pos") b.by = "pos";
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
// Nový blok ☕ pauza (pití, odpočinek) – Společně, bez linek
export const breakBlank = () => ({id: newPid("b"), mode: "all", dur: BRK_DUR, rot: null, lanes: [], brk: BRK_DEF});
export const planBlank = () => ({v: PLAN_VER, goal: "", blocks: []});
// Kopie podrobností cvičení pro hráčky (dx): jen neprázdná pole, délky jako v bance; null = nic ke kopírování
const DX_MAX = {eq: 200, desc: 2000, url: 300};
export function drillDx(d) {
  if (!d) return null;
  const o = {};
  if (typeof d.cat === "string" && d.cat) o.cat = str(d.cat, 20);
  if (typeof d.lvl === "string" && d.lvl) o.lvl = str(d.lvl, 20);
  if (Number.isFinite(+d.dur) && +d.dur > 0) o.dur = clamp(Math.round(+d.dur), 1, 60);
  ["eq", "desc", "url", "pdf"].forEach(k => { const v = str(d[k], k === "pdf" ? DX_MAX.url : DX_MAX[k]); if (v) o[k] = v; });
  return Object.keys(o).length ? o : null;
}
// Normalizovaný plán k uložení (jen známá pole, meze délek a počtů); drills = mapa id → cvičení z banky (kopie názvu, obrázků a podrobností pro hráčky)
export function planDoc(p, drills) {
  const D = drills || {}, src = p || {}, seen = new Set();
  // Kopie názvu a obrázků cvičení z banky (hráčka banku nečte); podrobnosti dx jen u prvního výskytu cvičení (z banky, jinak dosavadní kopie)
  const addDx = (o, x) => { const id = o.drill, d = D[id]; if (id && !seen.has(id)) { const dx = d ? drillDx(d) : drillDx(x && x.dx); if (dx) { o.dx = dx; seen.add(id); } } return o; };
  const drillOf = (x, noDx) => {
    const d = D[x.drill], o = {drill: str(x.drill, 40), dn: str(d ? d.name : x.dn, PLAN_MAX.dn), di: (d ? d.img || [] : x.di || []).filter(y => typeof y === "string").slice(0, PLAN_MAX.di)};
    return noDx ? o : addDx(o, x);
  };
  const lane = (l, mode, pos) => {
    const grp = uniq((l.grp || []).map(g => grpKey(g, pos)).filter(g => g != null)).sort(grpSort);
    // Linka s řadou: podrobnosti nesou položky řady (cvičení linky = první cvičení řady), jinak linka sama
    const hasSeq = Array.isArray(l.seq) && l.seq.length > 0;
    const o = {id: str(l.id, 24) || newPid("l"), ...drillOf(l, hasSeq),
      co: uniq((l.co || []).filter(x => typeof x === "string" && x)).slice(0, 6), grp: mode === "all" && !grp.includes(GK) ? grp.filter(g => g !== GK) : grp};
    // Řada cvičení jen u linky, která se netočí; první cvičení řady je zároveň cvičením linky
    if (Array.isArray(l.seq) && l.seq.length && seqOk({mode, brk: null}, o)) {
      o.seq = l.seq.slice(0, PLAN_MAX.seq).map(x => ({id: str(x && x.id, 24) || newPid("s"), ...drillOf(x || {}), dur: clamp(int(x && x.dur, BLK_DUR_DEF), BLK_DUR_MIN, BLK_DUR_MAX)}));
      Object.assign(o, {drill: o.seq[0].drill, dn: o.seq[0].dn, di: o.seq[0].di});
    } else if (hasSeq) addDx(o, l);                         // řada se nepoužila (linka se točí) – podrobnosti k lince
    return o;
  };
  const blocks = (Array.isArray(src.blocks) ? src.blocks : []).slice(0, PLAN_MAX.blocks).map(b => {
    if (isBreak(b)) return {id: str(b.id, 24) || newPid("b"), mode: "all", dur: clamp(int(b.dur, BRK_DUR), BLK_DUR_MIN, BLK_DUR_MAX), rot: null, lanes: [], brk: str(b.brk === true ? "" : b.brk, BRK_MAX) || BRK_DEF};
    const mode = b.mode === "st" ? "st" : "all", dur = clamp(int(b.dur, BLK_DUR_DEF), BLK_DUR_MIN, BLK_DUR_MAX), rot = int(b.rot, null), pos = isPosBlock(b);
    const o = {id: str(b.id, 24) || newPid("b"), mode, dur, rot: mode === "st" && rot && rot >= 1 && rot <= dur ? rot : null,
      lanes: (Array.isArray(b.lanes) ? b.lanes : []).slice(0, PLAN_MAX.lanes).map(l => lane(l, mode, pos))};
    if (pos) o.by = "pos";
    return o;
  });
  return {v: PLAN_VER, goal: str(src.goal, PLAN_MAX.goal), blocks};
}
// Podrobnosti cvičení z kopie v plánu: {id cvičení: dx} (pro hráčku, která banku nečte)
export function planDetails(plan) {
  const m = {};
  const take = x => { if (x && x.drill && x.dx && typeof x.dx === "object" && !m[x.drill]) m[x.drill] = x.dx; };
  ((plan && plan.blocks) || []).forEach(b => (b.lanes || []).forEach(l => { take(l); (Array.isArray(l.seq) ? l.seq : []).forEach(take); }));
  return m;
}
// Liší se kopie podrobností v plánu od banky? (plán uložený před v22.20 nebo cvičení se v bance změnilo – hráčky vidí starší / žádný popis)
export function planDxStale(plan, drills) {
  const D = drills || {}, have = planDetails(plan), ids = new Set();
  ((plan && plan.blocks) || []).forEach(b => (b.lanes || []).forEach(l => [l, ...(Array.isArray(l.seq) ? l.seq : [])].forEach(x => { if (x && x.drill) ids.add(x.drill); })));
  const key = o => (o ? JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]])) : "");   // nezávisle na pořadí klíčů (Firestore je řadí)
  return [...ids].some(id => D[id] && key(drillDx(D[id])) !== key(have[id]));
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
  (plans || []).forEach(p => uniq((p.blocks || []).flatMap(b => (b.lanes || []).flatMap(l => [l.drill, ...(Array.isArray(l.seq) ? l.seq.map(x => x && x.drill) : [])])).filter(Boolean)).forEach(id => { m[id] = (m[id] || 0) + 1; }));
  return m;
}

// ===== Řada cvičení v lince =====
// Smí linka mít řadu cvičení? Jen linka, která se netočí: blok Společně (i souběžná linka) nebo 🥅 linka stanovišť; ne ☕ pauza
export const seqOk = (b, l) => !!b && !!l && !isBreak(b) && (b.mode !== "st" || isFixedLane(l));
// Řada cvičení linky (null = linka má jedno cvičení na celý blok)
export const laneSeq = (b, l) => (seqOk(b, l) && Array.isArray(l.seq) && l.seq.length ? l.seq : null);
// Součet minut řady
export const seqMinutes = seq => (seq || []).reduce((s, x) => s + (+x.dur || 0), 0);
// Nové cvičení řady (výchozí čas: zbytek bloku, nejvýš 5 min, aspoň 1)
export const seqBlank = (left) => ({id: newPid("s"), drill: "", dn: "", di: [], dur: clamp(int(left, 5) > 0 ? Math.min(5, int(left, 5)) : 5, BLK_DUR_MIN, BLK_DUR_MAX)});
// Převod linky na řadu: dosavadní cvičení linky je první (na celý blok), za ním prázdné další
export function seqStart(b, l) {
  const first = {id: newPid("s"), drill: l.drill || "", dn: l.dn || "", di: [...(l.di || [])], dur: Math.max(1, (+b.dur || BLK_DUR_DEF) - 5)};
  return [first, seqBlank(Math.max(1, (+b.dur || BLK_DUR_DEF) - first.dur))];
}
// Časy cvičení řady od začátku bloku (s): [{...cvičení, i, a, b}]; cvičení přesahující blok se zkrátí na konec bloku (a ≥ konec = vynecháno)
export function seqTimes(b, seq) {
  const dur = (+b.dur || 0) * 60, out = [];
  let t = 0;
  (seq || []).forEach((x, i) => { const a = t; t += (+x.dur || 0) * 60; if (a < dur) out.push({...x, i, a, b: Math.min(t, dur)}); });
  return out;
}
// Kde je řada v čase rel (s od začátku bloku): {i, n, it (cvičení | null = volno po řadě), a, b, left (do konce cvičení / volna), nx (další | null)}
export function seqStep(b, l, rel) {
  const seq = laneSeq(b, l);
  if (!seq) return null;
  const T = seqTimes(b, seq), dur = (+b.dur || 0) * 60, r = Math.max(0, +rel || 0), n = seq.length;
  const i = T.findIndex(x => r < x.b);
  if (i < 0) { const a = T.length ? T[T.length - 1].b : 0; return {i: n, n, it: null, a, b: dur, left: Math.max(0, dur - r), nx: null}; }
  return {i, n, it: T[i], a: T[i].a, b: T[i].b, left: T[i].b - r, nx: T[i + 1] || null};
}
// Sloučení uložení se změnou, kterou mezitím uložil jiný trenér (fresh.at ≠ base = čas uložení při otevření úpravy).
// mine = můj rozpracovaný plán, struct = měnil jsem i něco mimo řady cvičení, sqd = id linek, jejichž řadu jsem měnil.
// Jen řady → jeho plán + moje řady (jeho bloky zůstanou); jinak můj plán + jeho řady u linek, jejichž řadu jsem neměnil.
// Vrací {p, merged (došlo ke sloučení), lost (jeho změny mimo řady přepsal můj plán)}
export function mergePlan(mine, fresh, base, struct, sqd) {
  const cp = o => JSON.parse(JSON.stringify(o));
  if (!fresh || !base || fresh.at === base) return {p: mine, merged: false, lost: false};
  const my = new Set(sqd || []), byId = P => Object.fromEntries(((P && P.blocks) || []).flatMap(b => (b.lanes || []).map(l => [l.id, l])));
  if (!struct) {
    const out = cp(fresh), M = byId(mine);
    (out.blocks || []).forEach(b => (b.lanes || []).forEach(l => {
      const m = my.has(l.id) && M[l.id];
      if (!m) return;
      // Cvičení linky = první cvičení řady (jinak cvičení linky)
      const f0 = m.seq && m.seq.length ? m.seq[0] : m;
      if (m.seq) l.seq = cp(m.seq); else delete l.seq;
      Object.assign(l, {drill: f0.drill || "", dn: f0.dn || "", di: [...(f0.di || [])]});
    }));
    return {p: out, merged: true, lost: false};
  }
  const out = cp(mine), F = byId(fresh);
  (out.blocks || []).forEach(b => (b.lanes || []).forEach(l => { const f = F[l.id]; if (!my.has(l.id) && f && f.seq && f.seq.length) { l.seq = cp(f.seq); Object.assign(l, {drill: f.seq[0].drill || "", dn: f.seq[0].dn || "", di: [...(f.seq[0].di || [])]}); } }));
  return {p: out, merged: true, lost: true};
}
// Id virtuální linky cvičení řady (klíč hodnocení a měření blok_linka-cvičení)
export const seqLid = (lid, sid) => String(lid) + "-" + String(sid);
// Linky bloku pro hodnocení, měření a pokrytí: linka s řadou se rozloží na virtuální linky po cvičeních
// ({...linka, id: seqLid, pid: id linky, sid, si (pořadí), sn (počet), drill, dn, di, min (minut v bloku)}); ostatní linky beze změny (min = celý blok)
export function expandLanes(b) {
  return ((b && b.lanes) || []).flatMap(l => {
    const seq = laneSeq(b, l);
    if (!seq) return [{...l, min: +b.dur || 0}];
    return seqTimes(b, seq).map(x => ({...l, seq: undefined, id: seqLid(l.id, x.id), pid: l.id, sid: x.id, si: x.i, sn: seq.length, drill: x.drill, dn: x.dn, di: x.di || [], min: (x.b - x.a) / 60}));
  });
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
// Problémy plánu: [{lvl: "err" | "warn", blk (index bloku | null), t}]. ctx = {total (min tréninku), groups (planGroups), pgroups (posGroups), coaches (id přihlášených
// členů týmu), drills (mapa id → cvičení)}. err = chyba (plán nejde spustit správně), warn = upozornění; uložit jde vždy.
export function planIssues(p, ctx = {}) {
  const out = [], B = (p && p.blocks) || [], add = (lvl, blk, t) => out.push({lvl, blk, t}), D = ctx.drills || null;
  const used = planMinutes(B), total = +ctx.total || 0, G0 = ctx.groups || [], coaches = ctx.coaches ? new Set(ctx.coaches) : null;
  if (total && used > total) add("err", null, "Plán přesahuje konec tréninku o " + (used - total) + " min.");
  else if (total && used < total && B.length) add("warn", null, "Nenaplánováno zbývá " + (total - used) + " min.");
  B.forEach((b, bi) => {
    if (isBreak(b)) return;                                     // ☕ pauza nemá linky ani skupiny
    const L = b.lanes || [], nm = "Blok " + (bi + 1) + ": ", G = groupsFor(b, G0, ctx.pgroups || POS_GRPS), field = G.filter(g => g !== GK);
    if (!L.length) add("warn", bi, nm + "bez linky.");
    L.forEach((l, li) => {
      const ln = L.length > 1 ? "linka " + (li + 1) + " " : "";
      if (!l.drill) add("warn", bi, nm + ln + "bez cvičení.");
      else if (D && (!D[l.drill] || D[l.drill].arch)) add("warn", bi, nm + ln + "– cvičení „" + (l.dn || "?") + "“ už v bance není (vyřazené nebo smazané).");
      if (coaches) (l.co || []).filter(c => !coaches.has(c)).forEach(() => add("warn", bi, nm + ln + "– trenér není přihlášený na trénink."));
      // Řada cvičení: musí se vejít do času bloku (blok určuje hlavní trenér, cvičení si linka plánuje sama)
      const seq = laneSeq(b, l), sm = seqMinutes(seq);
      if (seq && sm > b.dur) add("err", bi, nm + ln + "– cvičení řady mají " + sm + " min, blok jen " + b.dur + " min.");
      else if (seq && sm < b.dur) add("warn", bi, nm + ln + "– v řadě zbývá " + (b.dur - sm) + " min volna.");
      if (seq) seq.slice(1).forEach((x, si) => { if (!x.drill) add("warn", bi, nm + ln + "– " + (si + 2) + ". cvičení řady bez cvičení."); });
    });
    // Kolize trenérů: tentýž člen týmu na dvou linkách téhož bloku
    const seen = {};
    L.forEach(l => (l.co || []).forEach(c => { seen[c] = (seen[c] || 0) + 1; }));
    if (Object.values(seen).some(n => n > 1)) add("err", bi, nm + "stejný trenér na dvou linkách najednou.");
    // Skupiny: každá na nejvýš jedné lince; u stanovišť všechny pětky tréninku na některé lince
    const cnt = {};
    L.forEach(l => (l.grp || []).forEach(g => { cnt[g] = (cnt[g] || 0) + 1; }));
    Object.entries(cnt).filter(([, n]) => n > 1).forEach(([g]) => add("err", bi, nm + grpLabel(g === GK || g === FW || g === DF ? g : +g) + " je na dvou linkách."));
    if (b.mode === "st") {
      const rl = L.filter(l => !isFixedLane(l));
      if (rl.length < 2) add("warn", bi, nm + "stanoviště potřebují aspoň 2 linky, které se točí.");
      field.filter(g => !cnt[g]).forEach(g => add("warn", bi, nm + grpLabel(g) + " není na žádném stanovišti."));
      if (rl.some(l => !(l.grp || []).length)) add("warn", bi, nm + "stanoviště bez skupiny (v prvním kole prázdné).");
      if (b.rot && rl.length > 1 && Math.floor(b.dur / b.rot) < rl.length) add("warn", bi, nm + "skupiny za " + b.dur + " min neprojdou všechna stanoviště (" + rl.length + " × " + b.rot + " min).");
    }
    if (cnt[GK] && !G0.includes(GK)) add("warn", bi, nm + "linka brankářek, ale žádná brankářka není přihlášená.");
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
