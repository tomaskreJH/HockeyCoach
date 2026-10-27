// Doména: 📈 přehled a analýza Tréninku (Statistiky → 🏒 Trénink) – tréninky v období, výsledky měření po cvičeních (nejlepší, zlepšení, pořadí),
// zátěž hráček (tréninky, minuty po cvičeních a dovednostech), hodnocení trenérů jedné hráčky a řádky pro CSV. Čisté funkce bez DOM.
// Vstupy: události (S.ev), docházka (S.at), plány trplan, měření trms a hodnocení treval po dokumentu na trénink {eid: dokument | null}.
// Hodnocení (treval) smí do výpočtu jen realizační tým – o tom rozhoduje pohled (hráčka ho nenačte ani nevidí).
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Období -> Měření -> Zátěž hráček -> Hodnocení -> CSV.

// ===== Importy =====
import {SKILLS} from "../config/skills.js";
import {isNos} from "./attendance.js";
import {addDays, groupDrills} from "./skill-coverage.js";
import {bestOf} from "./stopwatch.js";
import {RATES, noteOf, rateOk} from "./training-eval.js";
import {GK, myGroup, posGrp} from "./training-plan.js";

// ===== Konstanty =====
export const TS_DAYS = [30, 60, 90, 180];                // nabízená období (dny)
export const TS_DEF = 60;                                // výchozí období (rozhodnutí uživatele 25. 10. 2026)

// ===== Pomocné funkce =====
const num = v => (typeof v === "number" && isFinite(v) ? v : null);
const r1 = v => Math.round(v * 10) / 10;
// Klíč cvičení ve výsledcích měření: id cvičení z banky, bez id název; jednotka a směr (nižší je lepší) jsou součástí klíče
const exKey = e => (e.d ? e.d : "n:" + String(e.dn || "").trim().toLowerCase()) + "|" + (e.u || "s") + "|" + (e.low ? 1 : 0);
// Zlepšení proti předchozí hodnotě: kladné = lepší (u času nižší, u počtu a bodů vyšší); null bez obou hodnot
export function improve(prev, last, low) {
  if (num(prev) == null || num(last) == null) return null;
  return r1(low ? prev - last : last - prev);
}
// Docházka: množina "eid|pid" hráček, které na tréninku byly (✅ Jdu bez 🚫 nedorazila)
export const wentSet = att => new Set((att || []).filter(a => a.st === "yes" && !isNos(a)).map(a => a.eid + "|" + a.pid));

// ===== Období =====
// Tréninky (události bez zápasů) v období [dnes − days, dnes]: nezrušené, s datem; nejstarší první. today = "YYYY-MM-DD"
export function statWindow(events, today, days = TS_DEF) {
  const from = addDays(today, -days);
  return (events || []).filter(e => e && !e.cancelled && e.type !== "match" && e.date && e.date >= from && e.date <= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time || "").localeCompare(String(b.time || "")));
}

// ===== Měření =====
// Cvičení s výsledky měření v tréninkech (trainings nejstarší první, ms = {eid: dokument trms}). Stejné cvičení na více linkách jednoho
// tréninku se sloučí (nejlepší pokus). Výsledek: [{id, d, dn, u, low, sess: [{eid, date, R: {pid: nejlepší}}]}] řazeno podle názvu.
export function measExercises(trainings, ms) {
  const M = ms || {}, X = {};
  (trainings || []).forEach(t => {
    const doc = M[t.id];
    Object.values((doc && doc.r) || {}).forEach(e => {
      if (!e || !e.ms) return;
      const id = exKey(e), x = X[id] || (X[id] = {id, d: e.d || "", dn: String(e.dn || "Cvičení"), u: e.u || "s", low: !!e.low, sess: []});
      let s = x.sess.find(y => y.eid === t.id);
      Object.entries(e.ms).forEach(([pid, vals]) => {
        const b = bestOf(vals, x.low);
        if (b == null) return;
        if (!s) { s = {eid: t.id, date: t.date, R: {}}; x.sess.push(s); }
        s.R[pid] = s.R[pid] == null ? b : bestOf([s.R[pid], b], x.low);
      });
    });
  });
  return Object.values(X).filter(x => x.sess.length).sort((a, b) => a.dn.localeCompare(b.dn, "cs"));
}
// Řada výsledků jedné hráčky v cvičení: [{eid, date, v}] (nejstarší první)
export const pointsOf = (ex, pid) => ((ex && ex.sess) || []).filter(s => s.R[pid] != null).map(s => ({eid: s.eid, date: s.date, v: s.R[pid]}));
// Tabulka cvičení: [{pid, best, bestDate, last, prev, delta, n, rank}] – best = nejlepší za období, last / prev = poslední a předchozí trénink
// s výsledkem, delta = zlepšení proti minule (kladné = lepší), rank = pořadí týmu podle nejlepšího (stejný výsledek = stejné pořadí)
export function measTable(ex) {
  if (!ex) return [];
  const pids = [...new Set(ex.sess.flatMap(s => Object.keys(s.R)))];
  const L = pids.map(pid => {
    const P = pointsOf(ex, pid), best = bestOf(P.map(p => p.v), ex.low), bp = P.find(p => p.v === best);
    const last = P.length ? P[P.length - 1].v : null, prev = P.length > 1 ? P[P.length - 2].v : null;
    return {pid, best, bestDate: bp ? bp.date : "", last, prev, delta: improve(prev, last, ex.low), n: P.length};
  }).sort((a, b) => (ex.low ? a.best - b.best : b.best - a.best) || a.pid.localeCompare(b.pid));
  L.forEach((x, i) => { x.rank = i && L[i - 1].best === x.best ? L[i - 1].rank : i + 1; });
  return L;
}
// Výsledky jedné hráčky ve všech cvičeních: [{id, dn, u, low, pts, best, last, delta, rank, of}] (jen cvičení, kde má výsledek)
export function playerMeas(exList, pid) {
  return (exList || []).map(ex => {
    const T = measTable(ex), me = T.find(x => x.pid === pid);
    return me ? {id: ex.id, dn: ex.dn, u: ex.u, low: ex.low, pts: pointsOf(ex, pid), best: me.best, last: me.last, delta: me.delta, rank: me.rank, of: T.length} : null;
  }).filter(Boolean);
}

// ===== Zátěž hráček =====
// Tréninky a minuty podle plánu pro hráčky pids: {pid: {nt (tréninků s účastí), n (z toho s plánem), min, dr: {klíč: {d, dn, min}}, sk: {dovednost: min}, list [eid]}}.
// goalies = množina id brankářek, pos = {id: post}, plans = {eid: trplan}, drills = banka {id: cvičení} (bez banky jen minuty po cvičeních – hráčka).
export function playerLoad({pids, trainings, plans, att, goalies, pos, drills}) {
  const G = goalies || new Set(), P = plans || {}, went = wentSet(att), D = drills || null, out = {};
  (pids || []).forEach(pid => {
    const o = out[pid] = {nt: 0, n: 0, min: 0, dr: {}, sk: {}, list: []};
    (trainings || []).forEach(t => {
      if (!went.has(t.id + "|" + pid)) return;
      o.nt++; o.list.push(t.id);
      const plan = P[t.id];
      if (!plan || !(plan.blocks || []).length) return;
      o.n++;
      const gk = G.has(pid), gd = groupDrills(plan, myGroup(t.lines, pid, gk), gk ? GK : posGrp((pos || {})[pid]));
      Object.values(gd).forEach(x => {
        const r = o.dr[x.d] || (o.dr[x.d] = {d: x.d, dn: (D && D[x.d] && D[x.d].name) || x.dn || "Cvičení", min: 0});
        r.min += x.min; o.min += x.min;
        if (D && D[x.d]) (D[x.d].sk || []).forEach(k => { o.sk[k] = (o.sk[k] || 0) + x.min; });
      });
    });
  });
  return out;
}
// Dovednosti, které někdo v období trénoval (pořadí podle číselníku SKILLS)
export const loadSkills = load => Object.keys(SKILLS).filter(k => Object.values(load || {}).some(o => (o.sk[k] || 0) > 0));
// Cvičení hráčky od nejvíc minut: [{d, dn, min}] (minuty zaokrouhlené)
export const drillList = o => Object.values((o && o.dr) || {}).map(x => ({...x, min: Math.round(x.min)})).filter(x => x.min > 0).sort((a, b) => b.min - a.min || a.dn.localeCompare(b.dn, "cs"));
// Hráčky, které dovednost k v období netrénovaly (z těch, které na nějakém tréninku s plánem byly)
export const missSkill = (load, k) => Object.entries(load || {}).filter(([, o]) => o.n && !((o.sk[k] || 0) > 0)).map(([pid]) => pid);

// ===== Hodnocení =====
// Hodnocení jedné hráčky trenéry v tréninkech (ev = {eid: dokument treval}): {cnt {4..1}, avg, items [{eid, date, dn, r, n}]} – nejnovější první
export function playerEvals(trainings, ev, pid) {
  const cnt = Object.fromEntries(RATES.map(r => [r, 0])), items = [], E = ev || {};
  [...(trainings || [])].reverse().forEach(t => {
    Object.values(((E[t.id] || {}).r) || {}).forEach(e => {
      const x = ((e && e.pl) || {})[pid];
      if (!x) return;
      const r = rateOk(x.r) ? x.r : 0, n = noteOf(x.n);
      if (!r && !n) return;
      if (r) cnt[r]++;
      items.push({eid: t.id, date: t.date, dn: String(e.dn || "Cvičení"), r, n});
    });
  });
  const k = RATES.reduce((s, r) => s + cnt[r], 0);
  return {cnt, avg: k ? r1(RATES.reduce((s, r) => s + r * cnt[r], 0) / k) : null, items};
}

// ===== CSV =====
// Řádky CSV zátěže: hráčka, tréninky, s plánem, minuty celkem a po dovednostech; name = id → jméno
export function loadRows(load, pids, name, skills) {
  const K = skills || loadSkills(load);
  return [["Hráčka", "Tréninky", "S plánem", "Minut celkem", ...K.map(k => SKILLS[k])],
    ...(pids || []).map(pid => { const o = load[pid] || {nt: 0, n: 0, min: 0, sk: {}}; return [name(pid), o.nt, o.n, Math.round(o.min), ...K.map(k => Math.round(o.sk[k] || 0))]; })];
}
// Řádky CSV měření (všechna cvičení): cvičení, jednotka, hráčka, pořadí, nejlepší, poslední, zlepšení, počet tréninků; fmt = (hodnota, jednotka) → text
export function measRows(exList, name, fmt) {
  const rows = [["Cvičení", "Jednotka", "Hráčka", "Pořadí", "Nejlepší", "Datum nejlepšího", "Poslední", "Zlepšení proti minule", "Tréninků s výsledkem"]];
  (exList || []).forEach(ex => measTable(ex).forEach(x => rows.push([ex.dn, ex.u, name(x.pid), x.rank, fmt(x.best, ex.u), x.bestDate, fmt(x.last, ex.u), x.delta == null ? "" : (x.delta > 0 ? "+" : x.delta < 0 ? "−" : "") + fmt(Math.abs(x.delta), ex.u), x.n])));
  return rows;
}
