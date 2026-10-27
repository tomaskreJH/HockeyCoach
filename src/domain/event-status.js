// Doména: stav události pro kartu v seznamu Událostí (čisté funkce bez DOM) – 💰 vyúčtování a placení (správce pokladny)
// a 🏒 stav tréninku: plán, průběh živého tréninku, ⭐ hodnocení (trenéři). Vykresluje views/event-badges.js.
// ===== Importy =====
import {costTotal, r2, restOf} from "./cash.js";

// ===== Pomocné funkce =====
const ms = d => { const t = new Date(d || "").getTime(); return Number.isFinite(t) ? t : null; };

// ===== Hlavní logika =====
// Stav pokladny události: e = událost {id, date, raw, cx}, ch = předpisy této události (jen hráčky), today = „RRRR-MM-DD“, now = ms.
// Vrací null (nic k zobrazení) nebo {st: "set" | "open", cost, n, paid, amt, got, over, all}:
// set = vyúčtování uzavřeno (n předpisů, paid zaplacených celých, amt předepsáno, got vybráno, over po splatnosti, all = vše zaplaceno),
// open = uplynulá událost s náklady bez uzavřeného vyúčtování.
export function cashState(e, ch, today, now) {
  if (!e) return null;
  const cx = e.cx || {}, set = !!((e.raw || {}).ss || cx.settle), cost = costTotal(cx);
  if (set) {
    const xs = ch || [], n0 = now == null ? Date.now() : now;
    const amt = r2(xs.reduce((s, x) => s + (+x.amt || 0), 0)), got = r2(xs.reduce((s, x) => s + Math.min(+x.paid || 0, +x.amt || 0), 0));
    const paid = xs.filter(x => restOf(x) <= 0).length;
    const over = xs.filter(x => { const t = ms(x.due); return restOf(x) > 0 && t != null && t < n0; }).length;
    return {st: "set", cost: +((cx.settle || {}).total) || cost, n: xs.length, paid, amt, got, over, all: paid === xs.length};
  }
  if (cost > 0 && String(e.date || "") < today) return {st: "open", cost};
  return null;
}
// Stav tréninku: plan = dokument trplan (nebo null), live = trlive (nebo null), ev = treval (nebo null).
// Vrací {plan: počet bloků, live: "run" | "pause" | "end" | "", rated: počet ohodnocených hráček}
export function trainState(plan, live, ev) {
  const blocks = plan && Array.isArray(plan.blocks) ? plan.blocks.length : 0;
  const st = live && ["run", "pause", "end"].includes(live.st) ? live.st : "";
  const pids = new Set();
  Object.values((ev && ev.r) || {}).forEach(o => Object.keys((o && o.pl) || {}).forEach(pid => { if ((o.pl[pid] || {}).r) pids.add(pid); }));
  return {plan: blocks, live: st, rated: pids.size};
}

// ===== Exporty =====
// (exportované funkce jsou označené u definic výše)
