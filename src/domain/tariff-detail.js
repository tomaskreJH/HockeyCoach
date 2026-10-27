// Doména: ⚖️ detail tarifu jedné hráčky pro správce pokladny (čisté funkce bez DOM) – po měsících sezóny co skutečně platila,
// za které uzavřené události, co by platila druhým způsobem, kolik „ledu“ využila (cena na hlavu = náklady ÷ hráčky v poli)
// a dopad na týmovou pokladnu, kdyby neplatila (o kolik by se zvedla platba ostatním). Jen pomocník pro rozhodnutí o úlevě.
// Výpočet druhého způsobu přebírá compareMonths (domain/economy.js), nic se tu nezapisuje.
// ===== Importy =====
import {chargeItem, isContrib, r2, ymOk} from "./cash.js";
import {compareMonths, myMonths} from "./economy.js";
import {seasonOf} from "./attendance.js";
import {ceil} from "../core/utils.js";

// ===== Konstanty =====
// Pod tímto využitím (zaplaceno vs. hodnota využitého ledu, v %) se u příspěvku nabídne tip na úlevu
export const LOW_USE = 50;

// ===== Pomocné funkce =====
const sum = (a, f) => (a || []).reduce((s, x) => s + (+f(x) || 0), 0);
const seasonKey = ym => seasonOf(ym + "-15").from;
const other = g => (g === "monthly" ? "single" : "monthly");
// Cena „ledu“ na hlavu ze snapshotu uzavření (náklady ÷ hráčky v poli); bez nákladů 0
const valueOf = st => { const n = +(st || {}).n || 0, t = +(st || {}).total || 0; return n > 0 && t > 0 ? r2(t / n) : 0; };
// Kolik ostatních platí v téže události / měsíci příspěvku (předpis s částkou > 0, jiná osoba)
const othersIn = (ch, x) => (ch || []).filter(y => y.eid === x.eid && y.mid !== x.mid && (+y.amt || 0) > 0).length;

// ===== Hlavní logika =====
// p = hráčka s platebními poli (plpay), D = {ev, ma} pro názvy událostí, ch = všechny předpisy, prices = evprice [{id, ym, date, head}],
// ec = evcash [{id, settle}], went = eid -> byla přihlášená, contrib = výše příspěvku, now = dnešní měsíc „RRRR-MM“, day = den určující sezónu.
// Vrací null (není hráčka), {skip} (osvobozená / koeficient 0 – porovnání nedává smysl, ale události a dopad se vrací) nebo
// {grp, alt, fx, season, months: [{ym, grp, act, alt, items: [předpisy {eid, title, date, contrib, amt, paid}], went: [události]}],
//  use: {n, value, act, pct}, team: {lost, ev: {amt, inc, n}, c: {amt, inc, n}}, total: {act, alt}, better}.
// Událost ve went = {eid, title, date, value (cena ledu na hlavu), mine (předepsáno jí), altAmt (druhým způsobem), covered (kryto příspěvkem)}.
export function tariffDetail(p, D, ch, prices, ec, went, contrib, now, day) {
  if (!p) return null;
  const mine = (ch || []).filter(x => x.mid === p.id);
  const mm = myMonths(mine, D, day), from = mm.season.from;
  const cmp = compareMonths(p, mm, prices, went, contrib, now);
  const skip = !cmp || cmp.skip ? (cmp ? cmp.skip : "none") : null;
  const fx = skip ? 0 : cmp.fx, alt = skip ? "" : cmp.alt;
  const st = id => ((ec || []).find(x => x.id === id) || {}).settle || null;
  // Uzavřené události sezóny (do dnešního měsíce), kde byla přihlášená
  const evs = (prices || []).filter(x => ymOk(x.ym) && x.ym <= now && seasonKey(x.ym) === from && went(x.id))
    .map(x => {
      const s = st(x.id), it = chargeItem(x.id, D), c = mine.find(y => y.eid === x.id);
      return {eid: x.id, ym: x.ym, title: it.title, date: x.date, value: valueOf(s), mine: c ? r2(+c.amt || 0) : 0,
        altAmt: skip ? 0 : ceil((+(x.head || {})[alt] || 0) * fx), covered: !!s && !((s.who || {}).monthly || {}).pays};
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  // Měsíce: z porovnání (skutečně / druhý způsob), doplněné o předpisy a navštívené události
  const rowsBy = {};
  (skip ? [] : cmp.rows).forEach(r => { rowsBy[r.ym] = r; });
  const yms = [...new Set([...mm.months.map(m => m.ym), ...evs.map(e => e.ym), ...Object.keys(rowsBy)])].filter(ym => ym <= now).sort().reverse();
  const months = yms.map(ym => {
    const m = mm.months.find(o => o.ym === ym), r = rowsBy[ym];
    const items = ((m || {}).items || []).map(x => {
      const it = chargeItem(x.eid, D);
      return {eid: x.eid, title: it.title, date: it.date || "", contrib: isContrib(x), amt: r2(+x.amt || 0), paid: r2(Math.min(+x.paid || 0, +x.amt || 0))};
    }).sort((a, b) => (b.contrib - a.contrib) || b.date.localeCompare(a.date));
    return {ym, grp: r ? r.grp : "", act: r ? r.act : r2((m || {}).amt || 0), alt: r ? r.alt : 0, items, went: evs.filter(e => e.ym === ym)};
  });
  // Využití: hodnota ledu na událostech, kde byla, vs. co v sezóně skutečně předepsáno
  const act = r2(mm.total.amt), value = r2(sum(evs, e => e.value));
  const use = {n: evs.length, value, act, pct: act > 0 ? Math.round(value / act * 100) : null};
  // Dopad na pokladnu: kdyby neplatila, její předpisy by se rozpočítaly mezi ostatní platící (v události / v měsíci příspěvku)
  const team = {lost: act, ev: {amt: 0, inc: 0, n: 0}, c: {amt: 0, inc: 0, n: 0}};
  mm.months.forEach(m => m.items.forEach(x => {
    const a = +x.amt || 0;
    if (!(a > 0)) return;
    const o = othersIn(ch, x), k = isContrib(x) ? team.c : team.ev;
    k.amt = r2(k.amt + a); k.n++;
    if (o > 0) k.inc = r2(k.inc + a / o);
  }));
  if (skip) return {skip, grp: "", alt: "", fx: 0, season: mm.season, months, use, team, total: {act, alt: 0}, better: null, events: evs};
  return {grp: cmp.grp, alt, fx, season: mm.season, months, use, team, total: cmp.total, better: cmp.better, events: evs};
}
// Tip na úlevu: platí příspěvek a využila méně než LOW_USE % zaplaceného (např. zranění) – jen pomocník, nic se nemění samo
export function reliefHint(d) {
  if (!d || d.skip || d.grp !== "monthly" || !(d.use.act > 0) || d.use.pct == null) return false;
  return d.use.pct < LOW_USE;
}

// ===== Exporty =====
// (exportované funkce a konstanty jsou označené u definic výše)
