// Doména: hospodaření události a měsíce (čisté funkce bez DOM) – podíl příspěvků na kryté události, výsledek události a měsíce, návrh poplatku.
// Událost krytá příspěvkem = skupina Příspěvek v ní neplatí a událost má náklady (pravidelný trénink, domácí zápas).
// Příspěvky měsíce (předepsané i zaplacené, předpisy c_RRRR-MM) se dělí mezi kryté události měsíce podle nákladů; nevystavené = odhad ze soupisky.
// Uzavřená událost s uloženým podílem (evcash.settle.share) si ho ponechá, zbytek příspěvků se dělí mezi ostatní kryté události.
// Výpočty pokladny (calcCash), předpisy ani šablony se tu nemění – jen se čtou.

// ===== Importy =====
import {CAT_SALARY, calcCash, contribEid, contribRows, costTotal, cxOf, evCash, fxOf, grpKey, r2} from "./cash.js";

// ===== Konstanty =====
// Skupiny, kterým se navrhuje poplatek (Za událost, Osvobozené) – jen pokud v události platí
export const SUGGEST_GROUPS = ["single", "exempt"];

// ===== Pomocné funkce =====
const cl = o => JSON.parse(JSON.stringify(o));
const ceil = x => Math.ceil(x - 1e-9);
const sum = (a, f) => (a || []).reduce((s, x) => s + (+f(x) || 0), 0);
const inYm = (d, ym) => String(d || "").startsWith(ym);
// Předepsáno a zaplaceno (zaplaceno nejvýše do výše předpisu)
const owed = xs => ({amt: r2(sum(xs, x => x.amt)), paid: r2(sum(xs, x => Math.min(+x.paid || 0, +x.amt || 0))), n: xs.length});

// Kryje událost příspěvek? (skupina Příspěvek v ní neplatí)
export const coveredBy = who => !!who && !(who.monthly || {}).pays;

// Události měsíce (tréninky D.ev + zápasy D.ma) ve tvaru pro pokladnu {id, type, title, date, time, raw, cx}, seřazené podle data a času
export function monthEvents(ym, D) {
  const cx = id => cxOf(id, D.ec);
  const t = (D.ev || []).filter(e => inYm(e.date, ym)).map(e => ({id: e.id, type: "training", title: e.title || "Trénink", date: e.date, time: e.time || "", raw: e, cx: cx(e.id)}));
  const m = (D.ma || []).filter(x => inYm(x.date, ym)).map(x => ({id: x.id, type: "match", title: "Zápas – " + (x.opp || ""), date: x.date, time: x.time || "", raw: x, cx: cx(x.id)}));
  return [...t, ...m].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

// Příspěvky měsíce: vystavené předpisy; když žádné nejsou, odhad ze soupisky (est: true, osvobozené vynechané jako ve výchozím vystavení)
export function contribOf(ym, D) {
  const xs = (D.ch || []).filter(x => x.eid === contribEid(ym));
  if (xs.length || !D.cfg || !D.pl) return {...owed(xs), est: false};
  const rows = contribRows(D.pl, D.cfg, {}).filter(r => !r.ex && r.amt > 0);
  return {amt: r2(sum(rows, r => r.amt)), paid: 0, n: rows.length, est: true};
}

// Vyúčtování jedné události: nastavení (c), náklady, vybereme (předepsáno), zaplaceno; over = rozpracovaná úprava {id, c, collect}
function evPlan(ev, D, over) {
  const st = (ev.cx || {}).settle, paid = r2(sum((D.ch || []).filter(x => x.eid === ev.id && x.kind === "event"), x => Math.min(+x.paid || 0, +x.amt || 0)));
  if (st) return {c: {cost: st.cost || [], who: st.who || {}}, cost: r2(+st.total || 0), collect: r2(+st.collect || 0), paid, settled: true, snap: st.share != null ? r2(+st.share || 0) : null};
  if (over && over.id === ev.id) return {c: over.c, cost: r2(costTotal(over.c)), collect: r2(+over.collect || 0), paid, settled: false, snap: null};
  const c = evCash(ev, D.cfg), P = D.players ? D.players(ev.id) : [];
  return {c, cost: r2(costTotal(c)), collect: r2(calcCash(c, P).collect), paid, settled: false, snap: null};
}

// ===== Hlavní logika =====
// Hospodaření měsíce ym ("RRRR-MM"). D = {ev, ma, ec, ch, cs, pl, cfg, players(eid)}; over = rozpracovaná úprava jedné události.
// Vrací {ym, contrib, events[], cov, evc, cost, salary, result, left}:
//  - events[i] = {id, type, title, date, cost, collect, paid, covered, settled, share, sharePaid, res},
//  - cov = kryté události {n, cost, collect, res} (res = příspěvky + vybrané za kryté události − jejich náklady → „led se vyplatil“ / ztráta),
//  - evc = platby za události {amt (uzavřené), paid, est (neuzavřené – odhad z přihlášených)}, cost = {settled, planned, total},
//  - salary = vyplacené platy měsíce (pokladna), result = příspěvky + platby za události − náklady − platy, left = nerozdělené příspěvky.
export function monthEconomy(ym, D, over) {
  const contrib = contribOf(ym, D);
  const evs = monthEvents(ym, D).map(ev => ({ev, p: evPlan(ev, D, over)}));
  const cov = evs.filter(x => coveredBy(x.p.c.who) && x.p.cost > 0);
  // Dělení příspěvků: uzavřené s uloženým podílem ho mají pevně, zbytek podle nákladů ostatních krytých událostí
  const fixed = sum(cov.filter(x => x.p.snap != null), x => x.p.snap);
  const free = cov.filter(x => x.p.snap == null), W = sum(free, x => x.p.cost), rest = Math.max(0, contrib.amt - fixed);
  const shareOf = new Map();
  cov.forEach(x => shareOf.set(x.ev.id, x.p.snap != null ? x.p.snap : W > 0 ? r2(rest * x.p.cost / W) : 0));
  const paidRatio = contrib.amt > 0 ? contrib.paid / contrib.amt : 0;
  const events = evs.map(({ev, p}) => {
    const covered = shareOf.has(ev.id), share = covered ? shareOf.get(ev.id) : 0;
    return {id: ev.id, type: ev.type, title: ev.title, date: ev.date, cost: p.cost, collect: p.collect, paid: p.paid, covered, settled: p.settled, fixed: p.snap != null,
      share, sharePaid: r2(share * paidRatio), res: r2(p.collect + share - p.cost)};
  });
  const covE = events.filter(e => e.covered), settled = events.filter(e => e.settled), open = events.filter(e => !e.settled);
  const salary = r2(sum((D.cs || []).filter(x => x.k === "out" && x.cat === CAT_SALARY && x.ym === ym), x => x.amt));
  const cost = {settled: r2(sum(settled, e => e.cost)), planned: r2(sum(open, e => e.cost))};
  cost.total = r2(cost.settled + cost.planned);
  const evc = {amt: r2(sum(settled, e => e.collect)), paid: r2(sum(events, e => e.paid)), est: r2(sum(open, e => e.collect))};
  const covCost = r2(sum(covE, e => e.cost)), covColl = r2(sum(covE, e => e.collect));
  return {
    ym, contrib, events,
    cov: {n: covE.length, cost: covCost, collect: covColl, res: r2(contrib.amt + covColl - covCost)},
    evc, cost, salary,
    result: r2(contrib.amt + evc.amt + evc.est - cost.total - salary),
    left: r2(contrib.amt - sum(covE, e => e.share))
  };
}

// Výsledek jedné události v jejím měsíci (s rozpracovanou úpravou over) + souhrn měsíce pro řádek „Měsíc: …“; bez data null
export function eventResult(ev, D, over) {
  const date = ev.date || (ev.raw || {}).date || "";
  if (!date) return null;
  const me = monthEconomy(date.slice(0, 7), D, over), e = me.events.find(x => x.id === ev.id);
  if (!e) return null;
  return {...e, month: {ym: me.ym, n: me.cov.n, contrib: me.contrib, per: me.cov.n ? r2(me.contrib.amt / me.cov.n) : 0}};
}

// Návrh poplatku pro jednu událost (šablona se nemění): c = {cost, who}, P = přihlášené hráčky, share = podíl příspěvků.
// a) výpočet – platící skupiny dělí náklady (náklady ÷ hráčky v poli); b) paušál – pevná částka na hráčku před koeficientem:
//    (náklady − podíl příspěvků − platby ostatních skupin) ÷ součet koeficientů platících, nahoru na celé Kč (nejméně 0).
// Vrací null, když žádná z navrhovaných skupin neplatí; jinak {groups, n, fxs, need, flat, calc: {who, collect, res}, flatOpt: {who, collect, res}}.
export function suggestFlat(c, P, share) {
  const who0 = c.who || {}, groups = SUGGEST_GROUPS.filter(g => (who0[g] || {}).pays);
  if (!groups.length) return null;
  const total = r2(costTotal(c)), sh = +share || 0, pick = P.filter(p => groups.includes(grpKey(p)));
  const fxs = r2(sum(pick, p => fxOf(p)));
  // Platby ostatních skupin (navrhované skupiny dočasně neplatí)
  const others = cl(who0);
  groups.forEach(g => { others[g] = {...others[g], pays: false}; });
  const base = calcCash({cost: c.cost, who: others}, P).collect;
  const need = r2(total - sh - base), flat = fxs > 0 ? Math.max(0, ceil(need / fxs)) : 0;
  const opt = mode => {
    const who = cl(who0);
    groups.forEach(g => { who[g] = {...who[g], pays: true, mode, flat: mode === "flat" ? flat : +(who[g] || {}).flat || 0}; });
    const k = calcCash({cost: c.cost, who}, P);
    return {who, collect: k.collect, res: r2(k.collect + sh - total)};
  };
  return {groups, n: pick.length, fxs, need, flat, calc: opt("calc"), flatOpt: opt("flat")};
}

// ===== Exporty =====
// (exportované funkce a konstanty jsou označené u definic výše)
