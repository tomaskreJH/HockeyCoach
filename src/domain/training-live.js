// Doména: ⏱ živý trénink – společné hodiny trlive/{eid} a výpočet „kde jsme teď“ v plánu (blok, kolo točení, zbývající čas).
// Dokument: {v, st ("run" | "pause" | "end"), e0 (s od začátku plánu v okamžiku zápisu), wAt (čas zařízení zapisujícího, ms),
// sAt (čas serveru zápisu – serverTimestamp), ctl (e-mail řídícího), by, at}. Čas běží jen při st "run": e0 + (teď − sAt).
// Posun hodin zařízení se dorovná odhadem skew (teď zařízení − čas serveru) z čerstvých změn dokumentu. Čisté funkce bez DOM.
// Upozornění: vibrace a zvuk v aplikaci a volitelně systémové oznámení (zrcadlí se i na hodinky) s textem „co teď / co potom“ – liveNote.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Hodiny -> Poloha v plánu -> Řízení -> Upozornění -> Lidé na lince.

// ===== Importy =====
import {GK, groupIn, isPosBlock, planTimes, posGrp, rotation} from "./training-plan.js";

// ===== Konstanty =====
export const TRLIVE_COLL = "trlive";
export const LIVE_VER = 1;
export const LIVE_ST = {run: "▶ Běží", pause: "⏸ Pozastaveno", end: "⏹ Skončil"};
export const ALERT_AT = [60, 10];                       // upozornění tolik sekund před koncem kola / bloku
export const LIVE_MAX = 6 * 3600;                       // nejdelší možný čas od začátku (s) – pojistka proti chybným hodnotám
export const SKEW_MAX = 12 * 3600 * 1000;               // větší odchylka hodin se nebere vážně (ms)
const NOW_MARK = "__now";                               // značka pro storage.js: čas serveru (serverTimestamp)

// ===== Pomocné funkce =====
const num = v => (typeof v === "number" && isFinite(v) ? v : null);
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
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
export function liveSec(live, now, skew = 0) {
  if (!live || !LIVE_ST[live.st]) return null;
  const e0 = clamp(num(live.e0) || 0, 0, LIVE_MAX);
  if (live.st !== "run") return e0;
  const s = tsMs(live.sAt), ref = s != null ? s + (num(skew) || 0) : num(live.wAt);
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
// Začátek bloku bi (s od začátku plánu)
export const blockStart = (blocks, bi) => { const T = planTimes(blocks || []); return T[bi] ? T[bi].a : 0; };

// ===== Řízení =====
// Nový stav hodin po akci řídícího: start | pause | resume | jump (sec) | extend (sec = o kolik prodloužit) | end.
// live = současný dokument, now / skew = hodiny tohoto zařízení, me = e-mail. Vrací pole k zápisu (sAt = čas serveru).
export function liveCtl(kind, live, {now, skew = 0, me, sec} = {}) {
  const cur = liveSec(live, now, skew), base = {v: LIVE_VER, wAt: now, sAt: NOW_MARK, ctl: String(me || "").toLowerCase()};
  const st = live && LIVE_ST[live.st] ? live.st : null, keep = st === "pause" ? "pause" : "run";
  const at = v => clamp(Math.round((num(v) || 0) * 10) / 10, 0, LIVE_MAX);
  if (kind === "start") return {...base, st: "run", e0: at(sec)};
  if (cur == null) return null;
  if (kind === "pause") return {...base, st: "pause", e0: at(cur)};
  if (kind === "resume") return {...base, st: "run", e0: at(cur)};
  if (kind === "jump") return {...base, st: keep === "pause" ? "pause" : "run", e0: at(sec)};
  if (kind === "extend") return {...base, st: st === "end" ? "run" : keep, e0: at(cur - (num(sec) || 60))};
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
// Text systémového oznámení (i na hodinkách – krátký titulek, podrobnosti v těle). kind = 60 | 10 | "switch" | "end";
// cur / nxt = {where ("Stanoviště B", "Blok 2"), what (cvičení), who (skupiny)} | null; left = zbývající s v kole; till = konec kola „18:42“
export function liveNote(kind, cur, nxt, left, till) {
  const line = x => (x ? [x.where, x.what].filter(Boolean).join(" · ") + (x.who ? " (" + x.who + ")" : "") : "");
  const next = nxt ? "Potom: " + line(nxt) : "Potom: konec plánu";
  if (kind === "end") return {title: "✅ Plán tréninku skončil", body: cur ? "Poslední: " + line(cur) : ""};
  if (kind === "switch") return {title: "▶ Teď: " + (cur ? [cur.where, cur.what].filter(Boolean).join(" · ") : "další kolo"),
    body: [cur && cur.who ? cur.who : "", till ? "do " + till : "", next].filter(Boolean).join(" · ")};
  const t = mmss(left);
  if (kind === 10) return {title: "⏱ " + t + " → " + (nxt ? [nxt.where, nxt.what].filter(Boolean).join(" · ") : "konec"), body: (cur ? "Teď: " + line(cur) + " · " : "") + next};
  return {title: "⏱ Ještě " + t + (cur && cur.what ? " · " + cur.what : ""), body: (cur ? "Teď: " + line(cur) + " · " : "") + next};
}
// Mm:ss pro odpočet (záporné = 0:00)
export function mmss(sec) {
  const t = Math.max(0, Math.ceil(num(sec) || 0)), m = Math.floor(t / 60), s = t % 60;
  return m + ":" + String(s).padStart(2, "0");
}

// ===== Lidé na lince =====
// Skupina hráčky v bloku: brankářka "G", jinak pětka z lines nebo post (u bloku podle postů)
export function playerGroup(block, lines, p, goalie) {
  if (!p) return null;
  if (goalie) return GK;
  const n = +((lines || {})[p.id]);
  return groupIn(block, n >= 1 && n <= 4 ? n : null, posGrp(p.pos));
}
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
// Linky bloku, které vede člen týmu tid (id linek)
export const coachLanes = (block, tid) => (tid ? ((block && block.lanes) || []).filter(l => (l.co || []).includes(tid)).map(l => l.id) : []);
