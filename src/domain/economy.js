// Doména: hospodaření události a měsíce (čisté funkce bez DOM) – podíl příspěvků na kryté události, výsledek události a měsíce, návrh poplatku.
// Událost krytá příspěvkem = skupina Příspěvek v ní neplatí a událost má náklady (pravidelný trénink, domácí zápas).
// Příspěvky měsíce (předepsané i zaplacené, předpisy c_RRRR-MM) se dělí mezi kryté události měsíce podle nákladů; nevystavené = odhad ze soupisky.
// Uzavřená událost s uloženým podílem (evcash.settle.share) si ho ponechá, zbytek příspěvků se dělí mezi ostatní kryté události.
// Moje platby: předpisy osoby po měsících (myMonths) a porovnání způsobu placení (compareMonths) z cen na hlavu evprice/{eid}
// (priceDoc – zapisuje se při uzavření vyúčtování, čte každý člen). Výpočty pokladny (calcCash), předpisy ani šablony se tu nemění – jen se čtou.

// ===== Importy =====
import {seasonOf} from "./attendance.js";
import {CAT_SALARY, calcCash, chargeItem, contribEid, contribRows, costTotal, cxOf, evCash, exOf, fxOf, grpAt, grpKey, grpOf, isContrib, r2, ymOk} from "./cash.js";

// ===== Konstanty =====
// Skupiny, kterým se navrhuje poplatek (Za událost, Osvobozené) – jen pokud v události platí
export const SUGGEST_GROUPS = ["single", "exempt"];
// Kolekce cen na hlavu uzavřených událostí (evprice/{eid} = {ym, date, tpl, head: {monthly, single, exempt}})
export const PRICE_COLL = "evprice";
// Skupiny plateb v ceně na hlavu
const HEAD_GROUPS = ["monthly", "single", "exempt"];

// ===== Pomocné funkce =====
const cl = o => JSON.parse(JSON.stringify(o));
const ceil = x => Math.ceil(x - 1e-9);
const sum = (a, f) => (a || []).reduce((s, x) => s + (+f(x) || 0), 0);
const inYm = (d, ym) => String(d || "").startsWith(ym);
// Cena na hlavu s přesností na desetitisíciny (dělení nákladů počtem hráček se před koeficientem nezaokrouhluje)
const r4 = n => Math.round((+n || 0) * 10000) / 10000;
// Sezóna, do které patří měsíc (od začátku – „RRRR-08-01“), stejně jako Docházka
const seasonKey = ym => seasonOf(ym + "-15").from;
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
  const rows = contribRows(D.pl, D.cfg, {}, ym).filter(r => !r.ex && r.amt > 0);
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

// ===== Ceny na hlavu (evprice) =====
// Cena na hlavu před koeficientem pro každou skupinu ze snapshotu uzavření: neplatí = 0, paušál = flat, výpočet = náklady ÷ počet hráček
export function headOf(st) {
  const n = +(st || {}).n || 0, total = +(st || {}).total || 0, who = (st || {}).who || {}, o = {};
  HEAD_GROUPS.forEach(g => {
    const w = who[g] || {};
    o[g] = !w.pays ? 0 : w.mode === "flat" ? r4(+w.flat || 0) : n > 0 ? r4(total / n) : 0;
  });
  return o;
}
// Dokument evprice/{eid} z uzavřeného vyúčtování (st = evcash.settle) a data události; bez data null
export function priceDoc(st, date) {
  const d = String(date || "");
  if (!st || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return {ym: d.slice(0, 7), date: d, tpl: st.tpl || "", head: headOf(st)};
}
// Doplnění cen (⚙️ → Pokladna, idempotentní): ec = evcash [{id, settle}], D = {ev, ma}, have = evprice {eid: doc}.
// Vrací {set: [{id, d}] – chybějící nebo jiné ceny, del: [id] – ceny bez uzavřeného vyúčtování nebo smazané události}.
export function pricePlan(ec, D, have) {
  const dateOf = id => ((D.ev || []).find(x => x.id === id) || (D.ma || []).find(x => x.id === id) || {}).date || "";
  const set = [], keep = new Set();
  (ec || []).forEach(x => {
    const d = x.settle ? priceDoc(x.settle, dateOf(x.id)) : null;
    if (!d) return;
    keep.add(x.id);
    if (JSON.stringify((have || {})[x.id] || null) !== JSON.stringify(d)) set.push({id: x.id, d});
  });
  const del = Object.keys(have || {}).filter(id => !keep.has(id));
  return {set, del};
}

// ===== Moje platby po měsících =====
// Měsíc předpisu: měsíc příspěvku, datum události; u smazané události podle splatnosti
export function chargeYm(x, D) {
  const i = chargeItem(x && x.eid, D);
  return String(i.date || (x && x.due) || "").slice(0, 7);
}
// Předpisy osoby (ch = jen její předpisy) po měsících sezóny dne day (1. 8. – 1. 7.); částečná úhrada = zaplaceno v měsíci předpisu.
// Vrací {season: {from, to}, months: [{ym, contrib: {amt, paid}, ev: {amt, paid}, amt, paid, rest, items}] od nejnovějšího, total: {amt, paid, rest}}.
export function myMonths(ch, D, day) {
  const season = seasonOf(day), by = {};
  (ch || []).forEach(x => {
    const ym = chargeYm(x, D);
    if (!ymOk(ym) || seasonKey(ym) !== season.from) return;
    const m = by[ym] = by[ym] || {ym, contrib: {amt: 0, paid: 0}, ev: {amt: 0, paid: 0}, items: []};
    const k = isContrib(x) ? m.contrib : m.ev, amt = +x.amt || 0;
    k.amt = r2(k.amt + amt); k.paid = r2(k.paid + Math.min(+x.paid || 0, amt));
    m.items.push(x);
  });
  const months = Object.values(by).map(m => {
    const amt = r2(m.contrib.amt + m.ev.amt), paid = r2(m.contrib.paid + m.ev.paid);
    return {...m, amt, paid, rest: r2(amt - paid)};
  }).sort((a, b) => b.ym.localeCompare(a.ym));
  const total = {amt: r2(sum(months, m => m.amt)), paid: r2(sum(months, m => m.paid))};
  total.rest = r2(total.amt - total.paid);
  return {season, months, total};
}

// ===== Porovnání způsobu placení („Kdybych platila jinak“) =====
// me = hráčka (s platebními poli z plpay), mm = výsledek myMonths, prices = evprice [{id, ym, date, head}], went = eid -> byla přihlášená,
// contrib = výše příspěvku z nastavení pokladny, now = dnešní měsíc „RRRR-MM“ (budoucí měsíce se nepočítají).
// Skutečnost = předepsáno v měsíci; druhý způsob = (příspěvek × koeficient, pokud by platila příspěvek) + cena na hlavu × koeficient
// za uzavřené události, kde byla přihlášená a druhá skupina platí. Skupina měsíce podle historie grpH (grpAt). Osvobozená / koeficient 0 → {skip}.
// Vrací {grp, alt (dnes), fx, rows: [{ym, grp, act, alt, n}] od nejnovějšího, mixed (sezóna s oběma způsoby), total: {act, alt},
// better: grp | alt | null (rozdíl pod 1 Kč)}.
export function compareMonths(me, mm, prices, went, contrib, now) {
  if (!me) return null;
  if (exOf(me)) return {skip: "exempt"};
  const fx = fxOf(me);
  if (!(fx > 0)) return {skip: "fx0"};
  const other = g => (g === "monthly" ? "single" : "monthly");
  const grp = grpOf(me), alt = other(grp), from = (mm || {}).season ? mm.season.from : "";
  const act = {};
  ((mm || {}).months || []).forEach(m => { act[m.ym] = m.amt; });
  // Uzavřené události sezóny, kde byla přihlášená (do dnešního měsíce)
  const mine = (prices || []).filter(p => ymOk(p.ym) && p.ym <= now && (!from || seasonKey(p.ym) === from) && went(p.id));
  const yms = [...new Set([...Object.keys(act), ...mine.map(p => p.ym)])].filter(ym => ym <= now).sort().reverse();
  const rows = yms.map(ym => {
    const g = grpAt(me, ym), o = other(g), evs = mine.filter(p => p.ym === ym);
    const base = o === "monthly" ? ceil((+contrib || 0) * fx) : 0;
    const a = base + sum(evs, p => ceil((+(p.head || {})[o] || 0) * fx));
    return {ym, grp: g, act: r2(act[ym] || 0), alt: r2(a), n: evs.length};
  });
  const total = {act: r2(sum(rows, r => r.act)), alt: r2(sum(rows, r => r.alt))};
  const d = total.alt - total.act;
  return {grp, alt, fx, rows, mixed: rows.some(r => r.grp !== grp), total, better: Math.abs(d) < 1 ? null : d < 0 ? alt : grp};
}

// ===== Exporty =====
// (exportované funkce a konstanty jsou označené u definic výše)
