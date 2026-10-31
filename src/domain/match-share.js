// 🏒 Zápas – pohodlí přípravy a po zápase (K2 bod 5): ⧉ sestava „Jako minule“ (poslední sestava proti komukoli, jen nominované hráčky)
// a 📤 souhrn uzavřeného zápasu ke sdílení (výsledek, třetiny, góly s asistencemi, střely, trestné minuty). Čisté funkce bez DOM.
// Živý zápis (live-engine.js) ani uložená data zápasu se tu nemění.

// ===== Importy =====
import {compactRot} from "../core/selectors.js";
import {goalScores} from "./timeline.js";

// ===== Konstanty =====
const PER = {1: "1.", 2: "2.", 3: "3.", 4: "P"};                 // označení třetin v souhrnu (4 = prodloužení)

// ===== Sestava „Jako minule“ =====
// Poslední jiný zápas s vyplněnou sestavou (proti komukoli): nejdřív zápasy do data tohoto zápasu, nejnovější první; null = žádný
export function lastLineupMatch(matches, m) {
  const date = (m && m.date) || "9999-12-31", id = m && m.id;
  const L = (matches || []).filter(x => x && x.id !== id && x.lineup && Object.keys(x.lineup).length)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.id).localeCompare(String(a.id)));
  return L.find(x => String(x.date || "") <= date) || L[0] || null;
}
// Sestava z předchozího zápasu jen s hráčkami, které jsou v tomto zápase nominované (ok(id) = hráčka smí do sestavy);
// prázdná místa se setřesou (rotace), vrací nový objekt
export function lineupLike(prev, nom, ok = () => true) {
  const N = new Set(nom || []), lu = {};
  Object.entries(prev || {}).forEach(([k, id]) => { if (id && N.has(id) && ok(id)) lu[k] = id; });
  return compactRot(lu);
}
// Jednotky přesilovek a oslabení z předchozího zápasu jen s nominovanými hráčkami (prázdné jednotky vynechá)
export function unitsLike(prevSp, nom) {
  const N = new Set(nom || []), out = {};
  Object.entries(prevSp || {}).forEach(([k, u]) => {
    const x = {};
    Object.entries(u || {}).forEach(([c, id]) => { if (N.has(id)) x[c] = id; });
    if (Object.keys(x).length) out[k] = x;
  });
  return out;
}

// ===== Souhrn ke sdílení =====
// Skóre po třetinách „1:0, 2:1, 1:1“ (prodloužení jen když v něm padl gól nebo zápas do něj šel)
export function periodScores(m) {
  const E = (m && m.events) || [], last = Math.max(3, ...E.map(e => +e.per || 1));
  const out = [];
  for (let p = 1; p <= last; p++) {
    const g = E.filter(e => e.k === "G" && +e.per === p);
    out.push(g.filter(e => e.team === "us").length + ":" + g.filter(e => e.team === "opp").length);
  }
  return out;
}
// Text souhrnu uzavřeného zápasu: team = název týmu, name(id) = jméno hráčky (čistý text), fd(datum) = formát data
export function matchSummary(m, {team = "", name = id => id, fd = d => d} = {}) {
  const E = (m && m.events) || [], us = E.filter(e => e.k === "G" && e.team === "us").length, op = E.filter(e => e.k === "G" && e.team === "opp").length;
  const res = us > op ? "výhra" : us < op ? "prohra" : "remíza", pair = m.home ? team + " – " + m.opp : m.opp + " – " + team;
  const sc = m.home ? us + ":" + op : op + ":" + us, per = periodScores(m).map(x => (m.home ? x : x.split(":").reverse().join(":")));
  const lines = [`🏒 ${pair} ${sc} (${per.join(", ")}) – ${res}`, `📅 ${fd(m.date)}${m.time ? " " + m.time : ""}${m.place ? " · " + m.place : ""} · ${m.home ? "doma" : "venku"}`];
  // Góly v pořadí zápasu se stavem po gólu; naše se střelkyní a asistencemi
  const gs = goalScores(m), G = [...gs.keys()];
  if (G.length) {
    lines.push("", "🥅 Góly:");
    G.forEach(e => {
      const st = m.home ? gs.get(e) : gs.get(e).split(":").reverse().join(":"), when = (PER[e.per] || e.per + ".") + " tř." + (e.time ? " " + e.time : "");
      const who = e.team === "us" ? (e.scorer ? name(e.scorer) : "?") + ([e.a1, e.a2].filter(Boolean).length ? " (" + [e.a1, e.a2].filter(Boolean).map(name).join(", ") + ")" : "") : "soupeř";
      lines.push(`${st} ${who} · ${when}`);
    });
  }
  // Střely a trestné minuty (jen když se zapisovaly)
  const sh = t => E.filter(e => e.k === "S" && e.team === t).length + E.filter(e => e.k === "G" && e.team === t).length;
  const pim = t => E.filter(e => e.k === "P" && e.team === t).reduce((s, e) => s + (+e.min || 0), 0);
  const extra = [];
  if (E.some(e => e.k === "S")) extra.push("🏒 Střely " + (m.home ? sh("us") + ":" + sh("opp") : sh("opp") + ":" + sh("us")));
  if (E.some(e => e.k === "P")) extra.push("🚫 Tresty " + (m.home ? pim("us") + ":" + pim("opp") : pim("opp") + ":" + pim("us")) + " min");
  if (extra.length) lines.push("", extra.join(" · "));
  // Nejlepší střelkyně týmu v zápase (góly + asistence)
  const pts = {};
  E.filter(e => e.k === "G" && e.team === "us").forEach(e => { [e.scorer, e.a1, e.a2].filter(Boolean).forEach(id => { pts[id] = (pts[id] || 0) + 1; }); });
  const top = Object.entries(pts).sort((a, b) => b[1] - a[1]).filter(([, n], i, a) => n === a[0][1]).map(([id]) => name(id));
  if (top.length && top.length <= 3) lines.push("⭐ Nejvíc bodů: " + top.join(", ") + " (" + Object.values(pts).sort((a, b) => b - a)[0] + ")");
  return lines.join("\n");
}
