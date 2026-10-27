// ⚠️ 🔓 Hromadné výjimky z blokace (Team → 💰 Platby → 🔓 Výjimky, správce pokladny): dlužnice po splatnosti, výběr ☑ a jedním
// potvrzením udělit / zrušit výjimku všem vybraným (např. platby z výpisu ještě nespárované). Volitelně i na předpisy před splatností.
// Přehled: domain/block-exc.js, zápis: payments.js (excMany). Výjimka jednoho předpisu zůstává v 💰 Platby → Podle hráček.
// ===== Importy =====
import {confirm2} from "../core/actions.js";
import {pl, pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, toast} from "../core/utils.js";
import {kc} from "../domain/cash.js";
import {excRows, excTargets} from "../domain/block-exc.js";
import {excMany} from "./payments.js";
import {render} from "./shell.js";

// ===== Stav (jen pro tuto obrazovku) =====
let mode = "blk";       // blk = ⛓ blokované (udělit výjimku), exc = 🔓 s výjimkou (zrušit)
let sel = new Set();    // vybrané osoby (mid)
let inc = false;        // při udělení i předpisy, které ještě nejsou po splatnosti
let note = "";          // důvod do záznamů (audit)
let q = "";             // hledání podle jména

// ===== Pomocné funkce =====
// Jen hráčky (realizační tým blokaci nemá)
const rows = () => excRows(S.ch, mid => !!pl(mid) && !S.tr.some(t => t.id === mid), Date.now());
const shownOf = R => R.filter(r => (mode === "blk" ? r.blocked : !r.blocked)).filter(r => !q || pn(r.mid).toLowerCase().includes(q.toLowerCase()));

// ===== Vykreslení =====
export function excHtml() {
  const R = rows(), blk = R.filter(r => r.blocked).length, ex = R.length - blk, shown = shownOf(R);
  sel = new Set([...sel].filter(id => shown.some(r => r.mid === id)));
  const on = mode === "blk", cnt = excTargets(S.ch, R, [...sel], on, inc).length;
  const chips = `<div class="chips"><button class="chip ${on ? "on" : ""}" data-xm="blk">⛓ Blokované (${blk})</button><button class="chip ${on ? "" : "on"}" data-xm="exc">🔓 S výjimkou (${ex})</button></div>`;
  const list = shown.length ? shown.map(r => `<label class="pr" style="cursor:pointer"><div style="display:flex;gap:10px;align-items:center"><input type="checkbox" data-xs="${esc(r.mid)}" ${sel.has(r.mid) ? "checked" : ""} style="width:22px;height:22px"><div><b>${pn(r.mid)}</b><div class="mu">po splatnosti ${kc(r.over)} (${r.cids.over.length}×, ${r.days} dní)${r.debt > r.over ? " · celkem " + kc(r.debt) : ""}${r.exc ? " · 🔓 " + r.exc + "×" : ""}</div></div></div></label>`).join("")
    : `<div class="msg">${on ? "Nikdo není blokovaný. 🎉" : "Nikdo nemá výjimku."}</div>`;
  const all = shown.length && shown.every(r => sel.has(r.mid));
  const key = "xg" + mode;
  const act = sel.size ? `<div style="position:sticky;bottom:0;background:var(--bg);padding:8px 0;margin-top:8px">
${on ? `<label class="mu" style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><input type="checkbox" id="xinc" ${inc ? "checked" : ""}> i na předpisy, které ještě nejsou po splatnosti</label>` : ""}
<input id="xnote" placeholder="Důvod (např. platba zatím nespárovaná)" value="${esc(note)}" maxlength="120" style="margin-bottom:6px">
<button class="${S.cf === key ? "d" : "p"} w" id="xgo" style="min-height:52px;${S.cf === key ? "background:var(--no);color:#fff" : ""}" ${cnt ? "" : "disabled"}>${S.cf === key ? "Opravdu? Klepni znovu" : (on ? "🔓 Udělit výjimku" : "⛓ Zrušit výjimku") + ` – ${sel.size} ${sel.size === 1 ? "hráčka" : sel.size < 5 ? "hráčky" : "hráček"} (${cnt}× předpis)`}</button></div>` : "";
  return `<div class="cd"><h2>🔓 Výjimky z blokace</h2><div class="mu" style="margin-bottom:8px">Dlužnice po splatnosti mají zablokované přihlášení „Jdu“. Vyber hráčky a výjimku jim udělíš (nebo zrušíš) najednou – např. když platby z výpisu ještě nejsou spárované. Výjimka platí pro předpis, dokud se nezaplatí; zapisuje se do záznamů.</div>
${chips}<input id="xq" placeholder="🔍 Hledat hráčku" value="${esc(q)}" style="margin:6px 0">
${shown.length ? `<div class="chips"><button class="chip ${all ? "on" : ""}" id="xall">${all ? "Zrušit výběr" : "Vybrat vše (" + shown.length + ")"}</button></div>` : ""}${list}${act}</div>`;
}

// ===== Eventy =====
export function bindExc(a) {
  a.querySelectorAll("[data-xm]").forEach(b => b.onclick = () => { mode = b.dataset.xm; sel = new Set(); render(); });
  a.querySelectorAll("[data-xs]").forEach(b => b.onchange = () => { if (b.checked) sel.add(b.dataset.xs); else sel.delete(b.dataset.xs); render(); });
  const all = a.querySelector("#xall");
  if (all) all.onclick = () => {
    const shown = shownOf(rows());
    sel = shown.every(r => sel.has(r.mid)) ? new Set() : new Set(shown.map(r => r.mid));
    render();
  };
  const qi = a.querySelector("#xq");
  if (qi) qi.onchange = () => { q = qi.value.trim(); render(); };
  const ni = a.querySelector("#xnote");
  if (ni) ni.oninput = () => { note = ni.value; };
  const ii = a.querySelector("#xinc");
  if (ii) ii.onchange = () => { inc = ii.checked; render(); };
  const go = a.querySelector("#xgo");
  if (go) go.onclick = () => confirm2("xg" + mode, () => {
    const on = mode === "blk", ids = excTargets(S.ch, rows(), [...sel], on, inc);
    const n = excMany(ids, on, note);
    sel = new Set(); note = "";
    toast(n ? (on ? "Výjimka udělena" : "Výjimka zrušena") + " (" + n + "× předpis)" : "Nic ke změně");
    render();
  });
}

// ===== Exporty =====
// (exportované funkce jsou označené u definic výše)
