// Pohled: editace střídání (záložka „Střídání“ v Opravách zápisu).
// Struktura: Importy -> Pomocné funkce -> Vykreslení (seznam, formulář) -> Hlavní logika (ukládání) -> Eventy.
// Stav formuláře je v S.ed.sf, filtr hráčky v S.ed.spl.

// ===== Importy =====
import {COLS} from "../config/constants.js";
import {upd} from "../core/actions.js";
import {isG, nomOf, pl, pri} from "../core/selectors.js";
import {S} from "../core/state.js";
import {$, clone, esc, mmss, toast} from "../core/utils.js";
import {parseClock, periodEnd} from "../domain/corrections.js";
import {el_, shiftMax} from "../domain/live-engine.js";
import {addShift, checkShifts, cleanShifts, deleteShift, editShift, findShift, handoverAt, listShifts, replacePlayer} from "../domain/shift-edit.js";
import {nameOf, perLabel, periodAt, periodStart} from "../domain/timeline.js";

// ===== Pomocné funkce =====
const chip = (k, v, label, on) => `<button class="chip ${on ? "on" : ""}" data-sxc="${k}" data-v="${esc(v)}">${label}</button>`;
// Začátek přesně na hranici třetin patří do následující třetiny (00:00)
const startPos = (m, t) => { const p = periodAt(m, t); return m.live.per > p.per && t === periodStart(m, p.per + 1) ? {per: p.per + 1, el: 0} : p; };
const fmt = pos => perLabel(pos.per) + " " + mmss(pos.el);
const toGame = (m, per, ms) => periodStart(m, per) + ms;
// Leží čas t uvnitř zvolené třetiny?
const inPeriod = (m, per, t) => { const e = periodEnd(m, per); return per <= m.live.per && t >= periodStart(m, per) && t <= (e != null ? e : el_(m.live)); };
// Nominované bruslařky (+ aktuální hráčka), seřazené podle pozic
const pool = (m, cur) => [...new Set([...nomOf(m), cur].filter(Boolean))]
  .filter(id => pl(id) && !isG(pl(id)))
  .sort((x, y) => pri(pl(x)) - pri(pl(y)) || pl(x).name.localeCompare(pl(y).name, "cs"));

// ===== Vykreslení: seznam střídání =====
export function shiftsHtml(m) {
  const L = m.live;
  if (!L) return '<div class="msg">Zápas nemá živý zápis, střídání se zde neupravují.</div>';
  const ed = S.ed, lim = shiftMax() * 1000, all = listShifts(m), flt = ed.spl || null, probs = checkShifts(m);
  const rows = all.filter(x => !flt || x.p === flt);
  const who = [...new Set(all.map(x => x.p))].filter(pl).sort((x, y) => pri(pl(x)) - pri(pl(y)) || pl(x).name.localeCompare(pl(y).name, "cs"));
  let h = '<div class="mu" style="margin-bottom:8px">Čas se zadává jako třetina + mm:ss herního času. Změna se promítne do času na ledě, počtu střídání a statistik.</div>';
  h += '<div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:10px"><button class="s" data-sxadd>+ Přidat střídání</button><button class="s" data-sxclean>🧹 Vyčistit prázdná a duplicitní</button></div>';
  if (probs.length) h += `<div class="cd" style="background:#fff3dc;color:#5a3a00"><b>⚠️ Zjištěné nesrovnalosti</b><div style="margin-top:4px">${probs.map(t => esc(t)).join("<br>")}</div></div>`;
  h += `<div class="chips"><button class="chip ${flt ? "" : "on"}" data-sxf="">Všechny</button>${who.map(id => `<button class="chip ${flt === id ? "on" : ""}" data-sxf="${id}">${esc(nameOf(id))}</button>`).join("")}</div>`;
  h += rows.length ? rows.map(x => {
    const d = x.b - x.a, long = d >= lim, key = "s" + x.ref;
    return `<div class="ev" style="align-items:center${long ? ";background:#fff3dc;color:#5a3a00;border-radius:8px;padding-left:6px;padding-right:6px" : ""}"><div class="t">${fmt(startPos(m, x.a))}</div><div class="b"><b>${esc(nameOf(x.p))}</b> · ${x.c}<div class="mu">${x.open ? "na ledě (probíhá)" : "do " + fmt(periodAt(m, x.b))} · ${mmss(d)}${long ? " ⚠️" : ""}</div></div><button class="s" data-sxe="${x.ref}" title="Upravit časy" style="padding:10px 12px">✏️</button><button class="s" data-sxs="${x.ref}" title="Výměna / předání hráčky" style="padding:10px 12px">🔁</button>${x.open ? "" : `<button class="d" data-sxd="${x.ref}" style="padding:10px 12px;${S.cf === key ? "background:var(--no);color:#fff" : ""}">${S.cf === key ? "Smazat?" : "🗑"}</button>`}</div>`;
  }).join("") : '<div class="msg">Žádná střídání.</div>';
  return h;
}

// ===== Vykreslení: formulář (úprava časů / výměna hráčky / přidání) =====
export function shiftFormHtml(m, f) {
  const pers = Array.from({length: m.live.per}, (_, i) => i + 1);
  const pc = (k, sel) => `<div class="chips">${pers.map(n => chip(k, n, n < 4 ? n + "." : "Prodl.", sel === n)).join("")}</div>`;
  const pp = (k, sel, ex) => `<div class="chips">${pool(m, f.p).filter(id => id !== ex).map(id => chip(k, id, esc(nameOf(id)), sel === id)).join("") || '<span class="mu">Nikdo.</span>'}</div>`;
  const tin = (id, v) => `<input id="${id}" value="${esc(v || "")}" placeholder="02:15" style="max-width:160px">`;
  let h = "";
  if (f.mode === "edit") {
    h += `<h3>Úprava času střídání: ${esc(nameOf(f.p))} · ${f.c}</h3><label>Začátek – třetina</label>${pc("sp", f.sp)}<label>Začátek (mm:ss v třetině)</label>${tin("sxs_t", f.st)}`;
    h += f.open ? '<div class="mu" style="margin-bottom:8px">Střídání právě probíhá, konec se nastaví střídáním v živém zápisu.</div>'
      : `<label>Konec – třetina</label>${pc("ep", f.ep)}<label>Konec (mm:ss v třetině)</label>${tin("sxe_t", f.et)}`;
    h += `<label>Posunout i navazující střídání na stejném místě (předání)</label><div class="chips">${chip("chain", "1", "Ano", f.chain)}${chip("chain", "0", "Ne", !f.chain)}</div>`;
  } else if (f.mode === "swap") {
    h += `<h3>Výměna / předání: ${esc(nameOf(f.p))} · ${f.c}</h3><label>Způsob</label><div class="chips">${chip("whole", "1", "Celé střídání (oprava chyby)", f.whole)}${chip("whole", "0", "Od času (předání)", !f.whole)}</div>`;
    h += `<div class="mu" style="margin-bottom:8px">${f.whole ? "Nová hráčka převezme celé střídání (oprava omylem zvolené hráčky)." : "Původní hráčka skončí v zadaný čas a nová hráčka pokračuje do konce střídání."}</div>`;
    if (!f.whole) h += `<label>Čas předání – třetina</label>${pc("tp", f.tp)}<label>Čas předání (mm:ss v třetině)</label>${tin("sxt_t", f.tt)}`;
    h += `<label>Nová hráčka</label>${pp("np", f.np, f.p)}`;
  } else {
    h += `<h3>Přidat střídání</h3><label>Hráčka</label>${pp("p", f.p)}<label>Místo</label><div class="chips">${COLS.map(c => chip("c", c, c, f.c === c)).join("")}</div>`;
    h += `<label>Začátek – třetina</label>${pc("sp", f.sp)}<label>Začátek (mm:ss v třetině)</label>${tin("sxs_t", f.st)}<label>Konec – třetina</label>${pc("ep", f.ep)}<label>Konec (mm:ss v třetině)</label>${tin("sxe_t", f.et)}`;
  }
  return h + '<div class="row" style="margin-top:14px"><button class="p" id="sxsv" style="min-height:52px">Uložit</button><button class="s" id="sxcn" style="min-height:52px">Zrušit</button></div>';
}

// ===== Hlavní logika =====
// Provede úpravu nad kopií zápasu; při chybě zobrazí její text a nic neuloží
function commit(m, fn, msg) {
  if (m.live && m.live.running) return toast("Nejdřív přeruš hodiny v živém zápisu");
  const n = clone(m), r = fn(n);
  if (r !== true) return toast(typeof r === "string" ? r : "Úprava se nepovedla");
  S.ed.sf = null;
  toast(typeof msg === "function" ? msg() : (msg || "Střídání upraveno"));
  upd(n);
}
// Přečte čas ve třetině; vrací herní čas v ms, nebo text chyby
function readTime(m, per, str, label) {
  const ms = parseClock(str);
  if (ms == null) return label + " zadej jako mm:ss, např. 02:15";
  const t = toGame(m, per, ms);
  return inPeriod(m, per, t) ? t : label + " leží mimo zvolenou třetinu";
}
function saveForm(m) {
  const f = S.ed.sf;
  if (f.mode === "swap") {
    if (!f.np) return toast("Vyber novou hráčku");
    if (f.whole) return commit(m, n => replacePlayer(n, f.ref, f.np), "Hráčka opravena");
    const t = readTime(m, f.tp, f.tt, "Čas předání");
    if (typeof t === "string") return toast(t);
    return commit(m, n => handoverAt(n, f.ref, t, f.np), "Předání zapsáno");
  }
  const a = readTime(m, f.sp, f.st, "Začátek");
  if (typeof a === "string") return toast(a);
  let b = null;
  if (f.mode === "add" || !f.open) { b = readTime(m, f.ep, f.et, "Konec"); if (typeof b === "string") return toast(b); }
  if (f.mode === "add") {
    if (!f.p) return toast("Vyber hráčku");
    return commit(m, n => addShift(n, {p: f.p, c: f.c, a, b}), "Střídání přidáno");
  }
  commit(m, n => editShift(n, f.ref, {a, b}, f.chain));
}

// ===== Eventy =====
export function bindShifts(e, m, rerender) {
  const ed = S.ed, q = s => e.querySelectorAll(s), L = m.live;
  if (!L) return;
  // Přepsání polí s časem do stavu formuláře (před každým překreslením)
  const sync = () => { const f = ed.sf; if (!f) return; [["sxs_t", "st"], ["sxe_t", "et"], ["sxt_t", "tt"]].forEach(([id, k]) => { const i = $("#" + id); if (i) f[k] = i.value.trim(); }); };
  // Filtr podle hráčky
  q("[data-sxf]").forEach(b => b.onclick = () => { ed.spl = b.dataset.sxf || null; rerender(); });
  // Úprava časů
  q("[data-sxe]").forEach(b => b.onclick = () => {
    const s = findShift(m, b.dataset.sxe); if (!s) return;
    const a = startPos(m, s.a), z = periodAt(m, s.b);
    ed.sf = {mode: "edit", ref: s.ref, p: s.p, c: s.c, open: s.open, chain: true, sp: a.per, st: mmss(a.el), ep: z.per, et: mmss(z.el)};
    rerender();
  });
  // Výměna / předání (výchozí čas předání = střed střídání)
  q("[data-sxs]").forEach(b => b.onclick = () => {
    const s = findShift(m, b.dataset.sxs); if (!s) return;
    const mid = periodAt(m, Math.round((s.a + s.b) / 2000) * 1000);
    ed.sf = {mode: "swap", ref: s.ref, p: s.p, c: s.c, open: s.open, np: null, whole: false, tp: mid.per, tt: mmss(mid.el)};
    rerender();
  });
  // Přidání střídání
  q("[data-sxadd]").forEach(b => b.onclick = () => { ed.sf = {mode: "add", p: null, c: "C", sp: L.per, st: "", ep: L.per, et: ""}; rerender(); });
  // Smazání (dvojklik s potvrzením)
  q("[data-sxd]").forEach(b => b.onclick = () => {
    const ref = b.dataset.sxd, key = "s" + ref;
    if (S.cf === key) { S.cf = null; commit(m, n => deleteShift(n, ref), "Střídání smazáno"); }
    else { S.cf = key; rerender(); setTimeout(() => { if (S.cf === key) { S.cf = null; rerender(); } }, 4000); }
  });
  // Vyčištění historie
  q("[data-sxclean]").forEach(b => b.onclick = () => {
    let info = "";
    commit(m, n => {
      const r = cleanShifts(n);
      if (!r.removed && !r.merged) return "Není co čistit";
      info = "Smazáno prázdných: " + r.removed + ", sloučeno: " + r.merged;
      return true;
    }, () => info);
  });
  // Formulář: výběry
  q("[data-sxc]").forEach(b => b.onclick = () => {
    sync();
    const f = ed.sf, k = b.dataset.sxc, v = b.dataset.v;
    if (["sp", "ep", "tp"].includes(k)) f[k] = +v;
    else if (k === "whole" || k === "chain") f[k] = v === "1";
    else if (k === "np" || k === "p") f[k] = f[k] === v ? null : v;
    else f[k] = v;
    rerender();
  });
  q("#sxcn").forEach(b => b.onclick = () => { ed.sf = null; rerender(); });
  q("#sxsv").forEach(b => b.onclick = () => { sync(); saveForm(m); });
}