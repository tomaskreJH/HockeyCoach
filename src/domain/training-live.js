// Doména: ⏱ živý trénink – společné hodiny trlive/{eid} a „kde jsme teď“ v plánu (blok, kolo točení, cvičení řady, zbývá).
// Dokument: {v, st run|pause|end, e0 (s od začátku plánu), wAt, sAt (čas serveru), ctl (řídící), adj {blok: min}, skip [blok], by, at}.
// Čas při běhu = e0 + (teď − sAt), posun hodin zařízení se dorovná odhadem skew. Úpravy adj / skip (i ▶ Teď = skok na blok) platí jen pro průběh;
// přehled zbytku s hodinami začátků (liveQueue, atClock) a ⚠ zdržení (delayDue – plán přetahuje přes konec tréninku).
// Zápis odeslaný se zpožděním (řídící byl na zimáku bez signálu) má sAt = čas doručení – pak se počítá od času zařízení wAt (LATE_MS).
// Změnu hodin od řídícího trenéra ostatním zařízením ohlásí remoteKind (⏸ / ▶ / ↪ / 📋) – vibrace a ⌚ oznámení.
// Upozornění vibrací, zvukem a systémovým oznámením (i na hodinky) s textem „co teď / co potom“ (liveNote).
// ===== Importy =====
import {BLK_DUR_MAX, GK, isPosBlock, laneSeq, planTimes, posGrp, rotation, seqStep} from "./training-plan.js";
import {clamp} from "../core/utils.js";

// ===== Konstanty =====
export const TRLIVE_COLL = "trlive";
export const LIVE_VER = 1;
export const LIVE_ST = {run: "▶ Běží", pause: "⏸ Pozastaveno", end: "⏹ Skončil"};
export const ALERT_AT = [60, 10];                       // upozornění tolik sekund před koncem kola / bloku
export const LIVE_MAX = 6 * 3600;                       // nejdelší možný čas od začátku (s) – pojistka proti chybným hodnotám
export const SKEW_MAX = 12 * 3600 * 1000;               // větší odchylka hodin se nebere vážně (ms)
export const ADJ_MAX = 30;                              // nejvýš tolik upravených / vypuštěných bloků (jako bloků plánu)
const NOW_MARK = "__now";                               // značka pro storage.js: čas serveru (serverTimestamp)
export const LATE_MS = 15000;                           // sAt o víc než 15 s po wAt = zápis čekal bez signálu → počítat od wAt
export const DELAY_AT = [2, 5, 10];                     // ⚠ zdržení: upozornit, když plán přetahuje o tolik minut (každá hranice jednou)

// ===== Pomocné funkce =====
const num = v => (typeof v === "number" && isFinite(v) ? v : null);
// Čas v ms z hodnoty dokumentu: číslo, Timestamp Firestore (toMillis) nebo jeho JSON {seconds, nanoseconds}; jinak null
export function tsMs(v) {
  if (num(v) != null) return v;
  if (v && typeof v.toMillis === "function") return v.toMillis();
  if (v && num(v.seconds) != null) return v.seconds * 1000 + Math.round((num(v.nanoseconds) || 0) / 1e6);
  return null;
}

// ===== Hodiny =====
// Sekundy od začátku plánu (null = hodiny nebyly spuštěny). now = čas zařízení (ms), skew = odhad (čas zařízení − čas serveru, ms).
// Bez potvrzeného času serveru (zápis právě odchází) se počítá od wAt – to je čas téhož zařízení, které zapsalo.
// Zápis doručený se zpožděním (sAt − wAt > LATE_MS, řídící byl offline): čas zařízení wAt převedený odhadem skew na toto zařízení
// (hodiny telefonů se řídí sítí, odchylka bývá do 1–2 s; zpožděný čas serveru by všem posunul hodiny o dobu bez signálu).
export function liveSec(live, now, skew = 0) {
  if (!live || !LIVE_ST[live.st]) return null;
  const e0 = clamp(num(live.e0) || 0, 0, LIVE_MAX);
  if (live.st !== "run") return e0;
  const s = tsMs(live.sAt), w = num(live.wAt), sk = num(skew) || 0;
  const ref = s == null ? w : w != null && s - w > LATE_MS ? w + sk : s + sk;
  if (ref == null) return e0;
  return clamp(e0 + (now - ref) / 1000, 0, LIVE_MAX);
}
// Pozorování odchylky hodin z čerstvě doručené změny: čas doručení − čas serveru zápisu (null bez času serveru nebo mimo mez)
export function skewObs(live, recvMs) {
  const s = tsMs(live && live.sAt);
  if (s == null || num(recvMs) == null) return null;
  const d = recvMs - s;
  return Math.abs(d) > SKEW_MAX ? null : d;
}
// Nový odhad odchylky: nejmenší pozorování (zpoždění sítě je vždy kladné, minimum se blíží skutečné odchylce)
export const skewNext = (prev, obs) => (obs == null ? prev : prev == null ? obs : Math.min(prev, obs));

// ===== Úpravy průběhu =====
// Bloky pro tento průběh: vypuštěný blok má délku 0 (poloha ho přeskočí), upravený blok délku z adj; plán sám se nemění.
// Indexy bloků zůstávají stejné (klíče hodnocení a měření platí dál).
export function liveBlocks(blocks, live) {
  const B = blocks || [], A = (live && live.adj && typeof live.adj === "object") ? live.adj : {}, K = new Set(Array.isArray(live && live.skip) ? live.skip : []);
  if (!K.size && !Object.keys(A).length) return B;
  return B.map(b => {
    if (K.has(b.id)) return {...b, dur: 0, rot: null, skip: true};
    const m = num(A[b.id]);
    return m != null && m >= 1 && m <= BLK_DUR_MAX ? {...b, dur: m, rot: b.rot && b.rot > m ? null : b.rot, adj: true} : b;
  });
}
// Lze blok bi upravit / vypustit? Jen bloky, které ještě nezačaly (změna minulých by posunula polohu v plánu)
export const canAdj = (at, bi) => !!at && !at.done && bi > at.bi;
// Nové úpravy po akci řídícího: op = "skip" (vypustit / vrátit), "+" / "−" (o 1 min), "reset" (zrušit úpravy bloku).
// plan = bloky plánu (původní délky), live = dokument; vrací {adj, skip} k zápisu nebo null (blok nejde upravit)
export function adjPatch(plan, live, bid, op, at) {
  const B = plan || [], bi = B.findIndex(b => b.id === bid);
  if (bi < 0 || !canAdj(at, bi)) return null;
  const adj = {...((live && live.adj) || {})}, skip = (Array.isArray(live && live.skip) ? live.skip : []).filter(x => B.some(b => b.id === x));
  Object.keys(adj).forEach(k => { if (!B.some(b => b.id === k)) delete adj[k]; });
  const has = skip.includes(bid), base = +B[bi].dur || 1, cur = num(adj[bid]) || base;
  if (op === "skip") return {adj, skip: has ? skip.filter(x => x !== bid) : [...skip, bid].slice(0, ADJ_MAX)};
  if (op === "reset") { delete adj[bid]; return {adj, skip: skip.filter(x => x !== bid)}; }
  const n = clamp(cur + (op === "+" ? 1 : -1), 1, BLK_DUR_MAX);
  if (n === base) delete adj[bid]; else adj[bid] = n;
  if (Object.keys(adj).length > ADJ_MAX) return null;
  return {adj, skip: skip.filter(x => x !== bid)};
}
// ▶ Teď – skok na zvolený další blok: současný blok končí hned, bloky mezi ním a zvoleným se pro tento průběh vypustí
// (zvolený se případně vrátí), hodiny skočí na začátek zvoleného. Vrací {adj, skip, sec} nebo null (blok není další / plán skončil).
export function jumpPatch(plan, live, bid, at) {
  const B = plan || [], ti = B.findIndex(b => b.id === bid);
  if (ti < 0 || !canAdj(at, ti)) return null;
  const adj = {...((live && live.adj) || {})};
  Object.keys(adj).forEach(k => { if (!B.some(b => b.id === k)) delete adj[k]; });
  const skip = new Set((Array.isArray(live && live.skip) ? live.skip : []).filter(x => B.some(b => b.id === x)));
  for (let i = at.bi + 1; i < ti; i++) skip.add(B[i].id);
  skip.delete(bid);
  if (skip.size > ADJ_MAX) return null;
  const K = [...skip], T = planTimes(liveBlocks(B, {adj, skip: K}));
  return {adj, skip: K, sec: T[ti].a};
}
// Zbytek plánu pro úpravy: bloky po současném [{bi, id, dur (plán), eff (tento průběh), skip, adj}]
export function liveRest(plan, live, at) {
  const B = plan || [], E = liveBlocks(B, live);
  return at && !at.done ? B.map((b, bi) => ({bi, id: b.id, dur: +b.dur || 0, eff: +E[bi].dur || 0, skip: !!E[bi].skip, adj: !!E[bi].adj})).filter(x => x.bi > at.bi) : [];
}
// Rozpočet času: planLeft = zbývá podle plánu (s), realLeft = zbývá do konce tréninku (s, null bez konce), over = o kolik plán
// přetahuje (s, záporné = rezerva). total / sec = délka a poloha plánu tohoto průběhu, endMs = konec tréninku (ms), nowMs = teď
export function liveBudget(total, sec, endMs, nowMs) {
  const planLeft = Math.max(0, (num(total) || 0) - (num(sec) || 0));
  if (num(endMs) == null || num(nowMs) == null) return {planLeft, realLeft: null, over: null};
  const realLeft = (endMs - nowMs) / 1000;
  return {planLeft, realLeft, over: planLeft - Math.max(0, realLeft)};
}
// Zkrácení současného kola o by sekund: posun hodin dopředu, nejdál na konec kola (pak začne další kolo / blok)
export function cutSec(blocks, sec, by) {
  const at = liveAt(blocks, sec);
  if (!at || at.done) return num(sec) || 0;
  return Math.min(at.b, at.sec + Math.max(0, num(by) || 0));
}

// ===== Přehled zbytku a zdržení =====
// Současný a další bloky tohoto průběhu: [{bi, id, a, b (s od začátku plánu po úpravách), eff (min tohoto průběhu), dur (min plánu),
// skip, adj, cur (právě běží)}]; prázdné před plánem / po jeho konci. Vypuštěné bloky zůstanou v seznamu (eff 0) – jdou vrátit.
export function liveQueue(plan, live, at) {
  const B = plan || [], E = liveBlocks(B, live), T = planTimes(E);
  if (!at || at.done || !T.length) return [];
  return B.map((b, bi) => ({bi, id: b.id, a: T[bi].a, b: T[bi].b, eff: +E[bi].dur || 0, dur: +b.dur || 0, skip: !!E[bi].skip, adj: !!E[bi].adj, cur: bi === at.bi}))
    .filter(x => x.bi >= at.bi);
}
// Hodiny začátku úseku podle skutečného průběhu (ne podle plánu): teď + (a − sec) → „17:42“; nowMs = čas zařízení, sec = poloha teď
export function atClock(nowMs, sec, a) {
  const t = new Date((num(nowMs) || 0) + ((num(a) || 0) - (num(sec) || 0)) * 1000);
  return t.getHours() + ":" + String(t.getMinutes()).padStart(2, "0");
}
// ⚠ Zdržení: nejvyšší nová hranice z marks (min), kterou přetahování plánu over (s) dosáhlo nad dosud ohlášené prev (s); null = nic nového.
// Přetahování roste při pauze a při prodloužení (+1 / +5 min) – za běhu podle plánu se nemění, takže upozornění nepřichází opakovaně.
export function delayDue(prev, over, marks = DELAY_AT) {
  if (num(over) == null) return null;
  const p = num(prev) == null ? -Infinity : prev, hit = marks.filter(m => m * 60 > p && over >= m * 60);
  return hit.length ? hit[hit.length - 1] : null;
}
// Úroveň zdržení pro zobrazení: nejvyšší dosažená hranice z marks (min), 0 = plán se do konce tréninku vejde (nebo konec neznámý)
export const delayLevel = (over, marks = DELAY_AT) => (num(over) == null ? 0 : marks.filter(m => over >= m * 60).pop() || 0);

// ===== Poloha v plánu =====
// Kde je trénink v čase sec: {done, total, sec, bi (blok), ri (kolo), nr (kol v bloku), a, b (kolo od – do, s od začátku plánu),
// ba, bb (blok od – do), left (do konce kola), bleft (do konce bloku), round (kolo z rotation), key ("bi|ri")}; null = prázdný plán
export function liveAt(blocks, sec) {
  const B = blocks || [], T = planTimes(B);
  if (!T.length) return null;
  const total = T[T.length - 1].b, s = Math.max(0, num(sec) || 0);
  if (s >= total) return {done: true, total, sec: s, bi: B.length - 1, ri: null, key: "end"};
  const bi = T.findIndex(t => s < t.b), t = T[bi], R = rotation(B[bi]), rel = s - t.a;
  let ri = R.findIndex(r => rel < r.b);
  if (ri < 0) ri = R.length - 1;
  const r = R[ri];
  return {done: false, total, sec: s, bi, ri, nr: R.length, a: t.a + r.a, b: t.a + r.b, ba: t.a, bb: t.b,
    left: t.a + r.b - s, bleft: t.b - s, round: r, key: bi + "|" + ri};
}
// Začátky všech kol všech bloků (s od začátku plánu) vzestupně, na konci celková délka
export function stops(blocks) {
  const B = blocks || [], T = planTimes(B), out = [];
  B.forEach((b, i) => rotation(b).forEach(r => out.push(T[i].a + r.a)));
  if (T.length) out.push(T[T.length - 1].b);
  return [...new Set(out)].sort((x, y) => x - y);
}
// Cíl posunu: dir +1 = začátek dalšího kola / bloku, −1 = začátek tohoto kola (po víc než 5 s), jinak předchozího
export function stepSec(blocks, sec, dir) {
  const S = stops(blocks), s = Math.max(0, num(sec) || 0);
  if (!S.length) return 0;
  if (dir > 0) { const n = S.find(x => x > s + 0.5); return n == null ? S[S.length - 1] : n; }
  const prev = S.filter(x => x <= s + 0.5), cur = prev.length ? prev[prev.length - 1] : 0;
  if (s - cur > 5) return cur;
  return prev.length > 1 ? prev[prev.length - 2] : 0;
}

// ===== Řízení =====
// Nový stav hodin po akci řídícího: start | pause | resume | jump (sec) | extend (sec = o kolik prodloužit) | keep (beze změny
// stavu – zápis úprav průběhu) | end. Start začíná bez úprav průběhu (adj / skip prázdné).
// live = současný dokument, now / skew = hodiny tohoto zařízení, me = e-mail. Vrací pole k zápisu (sAt = čas serveru).
export function liveCtl(kind, live, {now, skew = 0, me, sec} = {}) {
  const cur = liveSec(live, now, skew), base = {v: LIVE_VER, wAt: now, sAt: NOW_MARK, ctl: String(me || "").toLowerCase()};
  const st = live && LIVE_ST[live.st] ? live.st : null, keep = st === "pause" ? "pause" : "run";
  const at = v => clamp(Math.round((num(v) || 0) * 10) / 10, 0, LIVE_MAX);
  if (kind === "start") return {...base, st: "run", e0: at(sec), adj: {}, skip: []};
  if (cur == null) return null;
  if (kind === "pause") return {...base, st: "pause", e0: at(cur)};
  if (kind === "resume") return {...base, st: "run", e0: at(cur)};
  if (kind === "jump") return {...base, st: keep === "pause" ? "pause" : "run", e0: at(sec)};
  if (kind === "extend") return {...base, st: st === "end" ? "run" : keep, e0: at(cur - (num(sec) || 60))};
  if (kind === "keep") return {...base, st: st || "run", e0: at(cur)};
  if (kind === "end") return {...base, st: "end", e0: at(cur)};
  return null;
}

// ===== Upozornění =====
// Hranice upozornění, které se překročily mezi dvěma odečty zbývajícího času téhož kola (prevLeft → left); jen čerstvé (do win s,
// výchozí 3 s), aby skok hodin (posun, otevření obrazovky) nespustil staré upozornění. Skrytá aplikace (zhasnutý telefon) tiká
// řidčeji – volá se s větším oknem, aby oznámení na hodinky přišlo aspoň se zpožděním.
export function alertsDue(prevLeft, left, marks = ALERT_AT, win = 3) {
  if (num(prevLeft) == null || num(left) == null || left >= prevLeft) return [];
  const due = marks.filter(m => prevLeft > m && left <= m && left > m - win);
  return due.length > 1 ? [due[due.length - 1]] : due;
}
// Text systémového oznámení (i na hodinkách – krátký titulek = co se děje, tělo = co bude). kind = 60 | 10 | "switch" | "end";
// cur / nxt = {where ("Stanoviště B", "Blok 2"), what (cvičení), who (skupiny)} | null; left = zbývající s v kole; till = konec kola „18:42“
export function liveNote(kind, cur, nxt, left, till) {
  const pak = nxt ? "Pak: " + spotTxt(nxt, true) : "Pak: konec plánu";
  if (kind === "end") return {title: "✅ Konec plánu", body: "Trénink ukončí trenér ⏹"};
  if (kind === "switch") return {title: "▶ " + (cur ? spotTxt(cur) : "další kolo"), body: [cur && cur.who, till ? "do " + till : "", pak].filter(Boolean).join(" · ")};
  const t = mmss(left);
  if (kind === 10) return {title: "⏱ " + t + " → " + (nxt ? spotTxt(nxt) : "konec"), body: nxt && nxt.who ? nxt.who : ""};
  return {title: "⏱ " + t + (cur && cur.what ? " · " + cur.what : ""), body: pak};
}
// Krátký popis místa pro oznámení: cvičení napřed, pak místo („St. B“); who = i se skupinami
function spotTxt(x, who) {
  if (!x) return "";
  const w = String(x.where || "").replace(/^Stanoviště /, "St. ");
  return [x.what, w].filter(Boolean).join(" · ") + (who && x.who ? " · " + x.who : "");
}
// Změna hodin od jiného zařízení (řídící trenér) pro upozornění ostatních: "start" | "pause" | "resume" | "end" | "jump" (posun,
// ⏭ / ⏮ / ±min / ▶ Teď) | "adj" (úprava dalších bloků) | null (beze změny, vlastní zápis, první načtení, potvrzení serveru téhož zápisu)
export function remoteKind(old, nw, me) {
  if (!old || !nw || !LIVE_ST[nw.st]) return null;
  if (String(nw.by || nw.ctl || "").toLowerCase() === String(me || "").toLowerCase()) return null;
  if (old.wAt === nw.wAt && old.st === nw.st && old.e0 === nw.e0) return null;
  const st0 = LIVE_ST[old.st] ? old.st : null;
  if (nw.st !== st0) return nw.st === "pause" ? "pause" : nw.st === "end" ? "end" : st0 === "pause" ? "resume" : "start";
  if (nw.st === "end") return null;
  const same = JSON.stringify([old.adj || {}, old.skip || []]) === JSON.stringify([nw.adj || {}, nw.skip || []]);
  // Úprava dalších bloků (keep) zapisuje hodiny beze skoku – e0 sedí s během starého stavu (tolerance 3 s na posun hodin)
  if (!same && Math.abs((num(nw.e0) || 0) - (liveSec(old, num(nw.wAt) || 0) || 0)) < 3) return "adj";
  if (nw.st === "pause" && old.e0 === nw.e0) return same ? null : "adj";
  return "jump";
}
// Text oznámení o změně od řídícího (kind z remoteKind); cur / nxt / left / till jako liveNote – titulek co se stalo a co běží, tělo kolik zbývá a co bude
export function remoteNote(kind, cur, nxt, left, till) {
  const pak = nxt ? "pak " + spotTxt(nxt) : "pak konec plánu";
  if (kind === "pause") return {title: "⏸ Pauza" + (cur && cur.what ? " – " + cur.what : ""), body: cur ? "zbývá " + mmss(left) : ""};
  if (kind === "end") return {title: "⏹ Trénink skončil", body: ""};
  const head = kind === "start" ? "▶ Začátek" : kind === "resume" ? "▶ Pokračujeme" : kind === "adj" ? "📋 Plán upraven" : "↪ Teď";
  return {title: head + (cur ? ": " + spotTxt(cur) : ""), body: [mmss(left) + (till ? " (do " + till + ")" : ""), cur && cur.who ? cur.who : "", pak].filter(Boolean).join(" · ")};
}
// Text ⌚ oznámení o zdržení: m = minuty přetahování, nxt = co následuje {where, what, who} | null, left = zbývá plánu (s)
export function delayNote(m, nxt, left) {
  return {title: "⚠ Zdržení " + m + " min", body: ["Zkrať / vypusť cvičení", "plán ještě " + mmss(left), nxt ? "pak " + spotTxt(nxt) : ""].filter(Boolean).join(" · ")};
}
// Mm:ss pro odpočet (záporné = 0:00)
export function mmss(sec) {
  const t = Math.max(0, Math.ceil(num(sec) || 0)), m = Math.floor(t / 60), s = t % 60;
  return m + ":" + String(s).padStart(2, "0");
}

// ===== Lidé na lince =====
// Hráčky skupin grp v bloku: roster = {lines, skaters [{id, pos}], goalies [id]}; vrací id v pořadí soupisky
export function groupPids(block, grp, roster) {
  const R = roster || {}, G = new Set(grp || []), out = [];
  if (G.has(GK)) out.push(...(R.goalies || []));
  (R.skaters || []).forEach(p => {
    const g = isPosBlock(block) ? posGrp(p.pos) : +((R.lines || {})[p.id]);
    if (G.has(g)) out.push(p.id);
  });
  return out;
}
// Řada cvičení na mé lince: první z linek ids (moje linky) s řadou cvičení → {lid, i, n, it, a, b, left, nx} (seqStep), jinak null.
// at = liveAt (rel = čas od začátku bloku). Odpočet, upozornění a oznámení se pak řídí cvičením řady (konec cvičení dřív než konec kola).
export function laneSub(block, ids, at) {
  if (!block || !at || at.done || !(ids || []).length) return null;
  const l = (block.lanes || []).find(x => ids.includes(x.id) && laneSeq(block, x));
  if (!l) return null;
  const st = seqStep(block, l, at.sec - at.ba);
  return st ? {lid: l.id, ...st, left: Math.min(st.left, at.left)} : null;
}
// Linky bloku, které vede člen týmu tid (id linek)
export const coachLanes = (block, tid) => (tid ? ((block && block.lanes) || []).filter(l => (l.co || []).includes(tid)).map(l => l.id) : []);
