// Doména: 📊 pokrytí dovedností – co trénovaly hráčky přihlášené na trénink za posledních N dní (docházka × plány tréninků × dovednosti cvičení).
// Hráčka „trénovala“ dovednost, když byla na tréninku (✅ Jdu bez 🚫) a její skupina měla v plánu linku s cvičením té dovednosti
// (u stanovišť podle rozpisu točení, u bloku Společně linka její skupiny nebo linka pro všechny). Dovednost 🧤 se počítá jen u brankářek.
// Plány se čtou jen pro tréninky v období (ne celá kolekce) – výběr tréninků dělá coverWindow, načtení pohled. Čisté funkce bez DOM.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Období -> Cvičení a dovednosti skupiny v plánu -> Pokrytí.

// ===== Importy =====
import {SKILLS} from "../config/skills.js";
import {isNos} from "./attendance.js";
import {GK, groupIn, laneOf, laneSeq, myGroup, posGrp, rotation, seqTimes} from "./training-plan.js";

// ===== Konstanty =====
export const COVER_DAYS = [14, 30, 60];                  // nabízená období (dny)
export const COVER_DEF = 30;
export const COVER_LOW = 50;                             // pod tímto podílem (%) se dovednost zvýrazní

// ===== Pomocné funkce =====
// "YYYY-MM-DD" posunuté o n dní (UTC, bez vlivu letního času)
export function addDays(ymd, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ""));
  if (!m) return "";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n));
  return d.toISOString().slice(0, 10);
}

// ===== Období =====
// Tréninky v období [datum − days, datum) před tímto tréninkem: nezrušené, s datem; nejnovější první
export function coverWindow(events, eid, days = COVER_DEF) {
  const cur = (events || []).find(e => e.id === eid);
  if (!cur || !cur.date) return [];
  const from = addDays(cur.date, -days);
  return (events || []).filter(e => e.id !== eid && !e.cancelled && e.date && e.date >= from && e.date < cur.date).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

// ===== Cvičení a dovednosti skupiny v plánu =====
// Minuty po cvičeních, která skupina g (číslo pětky, "G" nebo null = bez pětky) trénovala podle plánu: {klíč: {d (id cvičení), dn (název z plánu), min}};
// klíč = id cvičení (bez id „n:“ + název). pg = skupina podle postu ("F" / "D" / "G") pro bloky dělené podle postů (chybí = jako bez skupiny).
// Banku cvičení nepotřebuje – použije ji i hráčka (📈 přehled Tréninku).
export function groupDrills(plan, g, pg) {
  const out = {};
  ((plan && plan.blocks) || []).forEach(b => {
    const gb = groupIn(b, g, pg === undefined ? null : pg);
    rotation(b).forEach(r => {
      let lid = gb == null ? null : laneOf(b, r, gb);
      // Bez pětky: v bloku Společně linka pro všechny (bez skupin); na stanovištích nikde
      if (lid == null && b.mode === "all") { const open = (b.lanes || []).find(l => !(l.grp || []).length); lid = open ? open.id : null; }
      const l = (b.lanes || []).find(x => x.id === lid), seq = l && laneSeq(b, l);
      // Řada cvičení: každé cvičení své minuty (jen část v tomto kole)
      const parts = seq ? seqTimes(b, seq).map(x => ({d: x.drill, dn: x.dn, s: Math.max(0, Math.min(x.b, r.b) - Math.max(x.a, r.a))}))
        : l ? [{d: l.drill, dn: l.dn, s: r.b - r.a}] : [];
      parts.forEach(({d, dn, s: sec}) => {
        if (!d || !(sec > 0)) return;
        const o = out[d] || (out[d] = {d, dn: String(dn || ""), min: 0});
        o.min += sec / 60;
      });
    });
  });
  return out;
}
// Minuty po dovednostech, které skupina g trénovala podle plánu (groupDrills × dovednosti cvičení z banky drills = mapa id → cvičení)
export function groupSkills(plan, g, drills, pg) {
  const out = {}, D = drills || {};
  Object.values(groupDrills(plan, g, pg)).forEach(x => { const d = D[x.d]; if (d) (d.sk || []).forEach(k => { out[k] = (out[k] || 0) + x.min; }); });
  return out;
}

// ===== Pokrytí =====
// Pokrytí pro hráčky pids (goalies = množina id brankářek, pos = mapa id → post z soupisky) z tréninků trainings [{id, lines}]
// s plány plans {eid: plán | null} a docházkou att [{eid, pid, st, nos}]. Výsledek: {n (tréninků s plánem), rows [{k, have, pop, pct, min, miss [pid]}], none [pid bez tréninku]}.
// rows jen pro dovednosti, které mají koho počítat (🧤 jen brankářky, ostatní jen hráčky v poli); řazeno od nejméně pokryté.
export function skillCoverage({pids, goalies, trainings, plans, att, drills, pos}) {
  const G = goalies || new Set(), P = plans || {}, T = (trainings || []).filter(t => P[t.id] && (P[t.id].blocks || []).length);
  const went = new Set((att || []).filter(a => a.st === "yes" && !isNos(a)).map(a => a.eid + "|" + a.pid));
  const per = {}, none = [];
  (pids || []).forEach(pid => {
    const m = {};
    let n = 0;
    T.forEach(t => {
      if (!went.has(t.id + "|" + pid)) return;
      n++;
      const gs = groupSkills(P[t.id], myGroup(t.lines, pid, G.has(pid)), drills, G.has(pid) ? GK : posGrp((pos || {})[pid]));
      Object.entries(gs).forEach(([k, v]) => { m[k] = (m[k] || 0) + v; });
    });
    per[pid] = m;
    if (!n) none.push(pid);
  });
  const field = (pids || []).filter(p => !G.has(p)), gk = (pids || []).filter(p => G.has(p));
  const rows = Object.keys(SKILLS).map(k => {
    const pop = k === "gk" ? gk : field, have = pop.filter(p => per[p][k] > 0);
    const min = Math.round(pop.reduce((s, p) => s + (per[p][k] || 0), 0) / (pop.length || 1));
    return {k, have: have.length, pop: pop.length, pct: pop.length ? Math.round(have.length / pop.length * 100) : 0, min, miss: pop.filter(p => !(per[p][k] > 0))};
  }).filter(r => r.pop).sort((a, b) => a.pct - b.pct || a.min - b.min);
  return {n: T.length, rows, none};
}
