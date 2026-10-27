// Doména: 🔓 hromadné výjimky z blokace přihlášení „Jdu“ (čisté funkce bez DOM) – přehled dlužníků po osobách a výběr předpisů,
// kterým se výjimka (exc) udělí nebo zruší. Zapisuje views/payments.js (excMany), zobrazuje views/block-exc-view.js.
// ===== Importy =====
import {r2, restOf} from "./cash.js";

// ===== Konstanty =====
const DAY_MS = 86400000;

// ===== Pomocné funkce =====
const ms = d => { const t = new Date(d || "").getTime(); return Number.isFinite(t) ? t : null; };
const isOver = (x, now) => { const t = ms(x.due); return restOf(x) > 0 && t != null && t < now; };

// ===== Hlavní logika =====
// ch = předpisy, keep = mid -> počítat osobu (hráčky, ne realizační tým), now = čas v ms.
// Vrací osoby s nezaplaceným předpisem po splatnosti [{mid, over, debt, days, blocked, cids: {over, open}, exc}] seřazené podle dní:
// over = částka po splatnosti, debt = nezaplaceno celkem, blocked = aspoň jeden předpis po splatnosti bez výjimky,
// cids.over = předpisy po splatnosti, cids.open = všechny nezaplacené, exc = počet nezaplacených s výjimkou.
export function excRows(ch, keep, now) {
  const n = now == null ? Date.now() : now, by = new Map();
  (ch || []).forEach(x => {
    if (!x || !x.mid || restOf(x) <= 0 || (keep && !keep(x.mid))) return;
    const o = by.get(x.mid) || {mid: x.mid, over: 0, debt: 0, first: null, blocked: false, cids: {over: [], open: []}, exc: 0};
    o.debt = r2(o.debt + restOf(x));
    o.cids.open.push(x.id);
    if (x.exc) o.exc++;
    if (isOver(x, n)) {
      o.over = r2(o.over + restOf(x));
      o.cids.over.push(x.id);
      if (!x.exc) o.blocked = true;
      const t = ms(x.due);
      if (o.first == null || t < o.first) o.first = t;
    }
    by.set(x.mid, o);
  });
  return [...by.values()].filter(o => o.cids.over.length)
    .map(({first, ...o}) => ({...o, days: Math.max(0, Math.floor((n - first) / DAY_MS))}))
    .sort((a, b) => b.days - a.days || b.over - a.over);
}
// Předpisy k zápisu: rows = výsledek excRows, mids = vybrané osoby, on = udělit (true) / zrušit (false),
// all = při udělení i nezaplacené předpisy, které ještě nejsou po splatnosti. Vrací [cid] jen tam, kde se exc opravdu mění.
export function excTargets(ch, rows, mids, on, all) {
  const pick = new Set(mids || []), byId = new Map((ch || []).map(x => [x.id, x]));
  const out = [];
  (rows || []).filter(r => pick.has(r.mid)).forEach(r => {
    (on && all ? r.cids.open : on ? r.cids.over : r.cids.open).forEach(id => {
      const x = byId.get(id);
      if (x && !!x.exc !== on) out.push(id);
    });
  });
  return out;
}

// ===== Exporty =====
// (exportované funkce jsou označené u definic výše)
