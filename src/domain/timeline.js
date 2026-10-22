// Doména: úplná časová osa zápasu a statistika střídání (bez DOM).
// v18.4.2: ikona gólu 🥅 (hokejová branka) místo ⚽; položka gólu nese kind "G" a team (podsvícení v živém průběhu).
// Struktura: Importy -> Pomocné funkce -> Třetiny a čas -> Střídání (shiftsOf, shiftList, shiftStats) -> Časová osa (timeline) -> Exporty.
// Společné pravidlo střídání (v18.1) – shiftList(m) používají všechny přehledy (statistiky zápasu, Čas na ledě v živém zápisu,
// Střídání hráček v rozboru, celkové statistiky, vývoj zápasu):
//   1) záznamy s délkou ≤ 0 se vynechají,
//   2) navazující záznamy téže hráčky (konec = začátek dalšího) se sloučí do jednoho střídání – hráčka plynule pokračuje
//      (návrat do řad po PP/OS, „Sestava znovu“, změna jednotky nebo pozice).
// Uložená data (live.sh) ani editace střídání (shift-edit.js) se nemění – pravidlo platí jen pro výpočty a zobrazení.
import {COLS, SIT} from "../config/constants.js";
import {pl} from "../core/selectors.js";
import {mmss} from "../core/utils.js";
import {el_} from "./live-engine.js";

const nameOf = id => { const p = pl(id); return p ? (p.num ? "#" + p.num + " " : "") + p.name : "?"; };
const perLabel = n => (n < 4 ? n + ". tř." : "prodl.");

// Začátek třetiny v ms herního času (u starších zápasů se odhadne z délky třetiny)
export function periodStart(m, n) {
  if (n <= 1) return 0;
  const ps = (m.live && m.live.ps) || [];
  return ps[n - 2] != null ? ps[n - 2] : (n - 1) * (m.perLen || 20) * 60000;
}
export function periodAt(m, t) {
  let per = 1;
  for (let n = 2; n <= 4; n++) if (t > periodStart(m, n)) per = n; // přesně na hranici patří událost ještě do předchozí třetiny
  return {per, el: Math.max(0, t - periodStart(m, per))};
}
const estimate = (m, e) => {
  if (e.at != null) return e.at;
  const [a, b] = String(e.time || "0:0").split(":");
  return periodStart(m, e.per || 1) + ((+a || 0) * 60 + (+b || 0)) * 1000;
};

// Všechna střídání hráček (včetně právě probíhajících, ta končí koncem zápisu)
export function shiftsOf(m) {
  const L = m.live;
  if (!L) return [];
  const now = el_(L), out = (L.sh || []).map(x => ({...x}));
  COLS.forEach(c => { const p = L.ice[c]; if (p) out.push({p, c, a: L.since[p] || 0, b: now, open: true}); });
  return out;
}

// Společné pravidlo střídání (v18.1): bez nulových záznamů, navazující záznamy téže hráčky sloučené.
// Výsledek: {p, c (sloupec na začátku), c2 (sloupec na konci), a, b, open}, seřazeno podle začátku.
export function shiftList(m) {
  const by = {};
  shiftsOf(m).filter(x => x.b - x.a > 0).forEach(x => (by[x.p] = by[x.p] || []).push(x));
  const out = [];
  Object.values(by).forEach(list => {
    list.sort((x, y) => x.a - y.a);
    let cur = null;
    list.forEach(x => {
      if (cur && x.a === cur.b) { cur.b = x.b; cur.c2 = x.c; cur.open = !!x.open; }   // plynulé pokračování téže hráčky
      else { cur = {p: x.p, c: x.c, c2: x.c, a: x.a, b: x.b, open: !!x.open}; out.push(cur); }
    });
  });
  return out.sort((x, y) => x.a - y.a || x.b - y.b);
}

// Statistika střídání po hráčkách: počet, součet, průměr, nejdelší, počet dlouhých (společné pravidlo shiftList)
export function shiftStats(m, limit) {
  const R = {};
  shiftList(m).forEach(x => {
    const d = x.b - x.a;
    if (d <= 0) return;
    const r = R[x.p] = R[x.p] || {p: x.p, n: 0, total: 0, max: 0, maxAt: 0, long: 0};
    r.n++; r.total += d; if (d >= limit) r.long++;
    if (d > r.max) { r.max = d; r.maxAt = x.b; }
  });
  return Object.values(R).map(r => ({...r, avg: r.total / r.n, maxPos: periodAt(m, r.maxAt)}))
    .sort((a, b) => b.total - a.total);
}

const evText = (e) => {
  if (e.k === "G") {
    const sit = SIT[e.sit] || SIT.E;
    return e.team === "us"
      ? `🥅 Gól: ${nameOf(e.scorer)} (asistence: ${[e.a1, e.a2].filter(Boolean).map(nameOf).join(", ") || "bez asistence"}) – ${sit}`
      : `🥅 Gól soupeře – ${sit}`;
  }
  if (e.k === "P") return `🚫 Vyloučení: ${e.team === "us" ? nameOf(e.pid) : "soupeř"} – ${e.min} min${e.reason ? ", " + e.reason : ""}`;
  return e.team === "us" ? `🏒 Střela: ${nameOf(e.shooter)}` : `🏒 Střela soupeře${e.gk ? " (brankářka " + nameOf(e.gk) + ")" : ""}`;
};

// Časová osa: góly, tresty, střely, střídání, zranění, jednotky, konce třetin, návraty z trestů
export function timeline(m, {shots = true, subs = true, limit = 120000} = {}) {
  const E = [], push = (t, ord, o) => E.push({t, ord, ...o});
  (m.events || []).forEach((e, i) => {
    if (e.k === "S" && !shots) return;
    push(estimate(m, e), e.k === "S" ? 3 : 1, {kind: e.k, per: e.per, el: e.time || "", team: e.team, text: evText(e), idx: i});
  });
  (m.injLog || []).forEach(x => {
    const t = x.at != null ? x.at : estimate(m, x);
    const txt = {tmp: "🩹 Dočasně vyřazena (ošetřování)", perm: "🤕 Trvalé zranění", back: "↩ Vrácena do sestavy"}[x.ty];
    push(t, 2, {kind: "inj", per: x.per, el: x.time || "", text: `${txt}: ${nameOf(x.id)}`});
  });
  (m.log || []).forEach(x => {
    const t = x.at != null ? x.at : 0, pa = periodAt(m, t);
    const text = x.ty === "per" ? `⏱ Konec ${x.per < 4 ? x.per + ". třetiny" : "prodloužení"}`
      : x.ty === "unit" ? `⚡ ${x.label}`
      : x.ty === "gk" ? `🧤 Brankářka v bráně: ${nameOf(x.p)}`
      : `↩ Návrat z trestu: ${nameOf(x.p)} (${x.cause})`;
    push(t, x.ty === "per" ? 9 : 2, {kind: x.ty, per: x.per || pa.per, el: mmss(x.ty === "per" ? t - periodStart(m, x.per) : pa.el), text});
  });
  if (m.end) push(m.end.at, 10, {kind: "end", per: m.end.per, el: mmss(m.end.at - periodStart(m, m.end.per)), text: "🏁 Konec zápasu"});
  if (subs && m.live) {
    // střídání podle společného pravidla: plynulé pokračování hráčky se jako střídání nezobrazí
    const sh = shiftList(m), start = sh.filter(x => x.a === 0);
    if (start.length) push(0, 0, {kind: "start", per: 1, el: "00:00", text: "▶ Začátek zápasu – na ledě: " + COLS.map(c => { const x = start.find(y => y.c === c); return x ? c + " " + nameOf(x.p) : null; }).filter(Boolean).join(", ")});
    const times = new Set();
    sh.forEach(x => { if (!x.open) times.add(x.b); if (x.a > 0) times.add(x.a); });
    [...times].forEach(T => {
      const out = sh.filter(x => !x.open && x.b === T), inn = sh.filter(x => x.a === T && x.a > 0);
      const used = new Set(), parts = []; let long = false;
      out.forEach(o => {
        const d = o.b - o.a, isLong = d >= limit; if (isLong) long = true;
        const oc = o.c2 || o.c, i = inn.find(y => y.c === oc && !used.has(y)); if (i) used.add(i);
        parts.push(`${oc}: ↘ ${nameOf(o.p)} (${mmss(d)}${isLong ? " ⚠️ dlouhé" : ""})${i ? " ↗ " + nameOf(i.p) : " – místo prázdné"}`);
      });
      inn.filter(y => !used.has(y)).forEach(y => parts.push(`${y.c}: ↗ ${nameOf(y.p)} nastupuje`));
      const pa = periodAt(m, T);
      push(T, 4, {kind: "sub", per: pa.per, el: mmss(pa.el), long, text: "🔄 Střídání – " + parts.join(" · ")});
    });
  }
  E.sort((a, b) => a.t - b.t || a.ord - b.ord || (a.idx || 0) - (b.idx || 0));
  let us = 0, opp = 0;
  E.forEach(e => { if (e.kind === "G") { if (e.team === "us") us++; else opp++; e.text += ` (${us}:${opp})`; } });
  return E;
}

export {nameOf, perLabel, evText as eventText};
