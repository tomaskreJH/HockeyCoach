// 📚 Výběr cvičení z banky přes celou obrazovku (v úpravě plánu tréninku místo dlouhého seznamu): 🔍 hledání v názvu, pomůckách
// a popisu, část tréninku (kategorie), dovednost, ⭐ oblíbená (z banky v tomto zařízení); klepnutí na cvičení ho vybere. Stav filtru je v S.dpk.
// Okno #dpk se vkládá do body (nad úpravu plánu), Zpět / ✕ ho zavře. Filtr domain/drills.js (drillFilter).
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Vykreslení -> Eventy -> Exporty.

// ===== Importy =====
import {CATS, LEVELS, SKILLS} from "../config/skills.js";
import {S} from "../core/state.js";
import {esc} from "../core/utils.js";
import {drillFilter} from "../domain/drills.js";

// ===== Konstanty a stav =====
const FAV_KEY = "hk-drill-fav";                          // stejný klíč jako ⭐ oblíbená v 📚 bance (views/drills-view.js)
// P = otevřený výběr: el, cur (id vybraného), pick (funkce po výběru), timer (zpoždění hledání)
let P = null;
const CSS = `<style>
#dpk{position:fixed;inset:0;z-index:44;background:var(--bg);color:var(--tx);overflow:auto;padding:12px 12px calc(12px + env(safe-area-inset-bottom,0px))}
#dpk .dph{display:flex;gap:8px;align-items:center;margin-bottom:8px;position:sticky;top:-12px;background:var(--bg);padding:8px 0;z-index:2}
#dpk .dph input{flex:1;min-width:0;margin:0}
#dpk .dpi{display:block;width:100%;text-align:left;padding:10px;margin-bottom:6px;border:1px solid var(--bd);border-radius:10px;background:var(--cd);color:var(--tx);min-height:52px}
#dpk .dpi.on{border:2px solid var(--ac)}
#dpk .dpi small{display:block;color:var(--mu);font-size:12px}
#dpk .chips{margin:4px 0}
</style>`;

// ===== Pomocné funkce =====
const favs = () => { try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); } catch (e) { return new Set(); } };
const F = () => (S.dpk = S.dpk || {q: "", cat: "", sk: "", fav: false});

// ===== Vykreslení =====
function listHtml() {
  const f = F(), fv = favs(), L = drillFilter(S.dr, {...f, arch: false}, fv);
  return L.length ? L.slice(0, 120).map(d => `<button class="dpi ${d.id === P.cur ? "on" : ""}" data-dpi="${esc(d.id)}">${fv.has(d.id) ? "⭐ " : ""}<b>${esc(d.name)}</b><small>${esc(CATS[d.cat] || "")} · ${+d.dur || "?"} min · ${LEVELS[d.lvl] || ""}${d.meas ? " · ⏲ měření" : ""}${d.img && d.img.length ? " · 📷" : ""}${d.url || d.pdf ? " · ▶" : ""}</small></button>`).join("")
    + (L.length > 120 ? `<div class="mu">… a dalších ${L.length - 120} – upřesni hledání.</div>` : "")
    : '<div class="mu" style="margin:10px 0">Nic nenalezeno – zkus jiné hledání nebo zruš filtr.</div>';
}
function screenHtml() {
  const f = F();
  return CSS + `<div class="dph"><button class="s" id="dpx" style="flex:none;min-height:46px">✕</button><input id="dpq" type="search" placeholder="🔍 Hledat cvičení" value="${esc(f.q)}" autocomplete="off"></div>
<div class="chips"><button class="chip ${f.fav ? "on" : ""}" id="dpf">⭐ Oblíbená</button>${P.cur ? '<button class="chip" id="dp0">✕ Bez cvičení</button>' : ""}${f.q || f.cat || f.sk || f.fav ? '<button class="chip" id="dpr">↺ Zrušit filtr</button>' : ""}</div>
<div class="row" style="margin:4px 0 8px"><select id="dpc" style="margin:0"><option value="">Část tréninku – vše</option>${Object.entries(CATS).map(([k, t]) => `<option value="${k}" ${f.cat === k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
<select id="dps" style="margin:0"><option value="">Dovednost – vše</option>${Object.entries(SKILLS).map(([k, t]) => `<option value="${k}" ${f.sk === k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
<div id="dpl">${listHtml()}</div>`;
}
function paint(keepFocus) {
  if (!P) return;
  if (keepFocus) { const l = P.el.querySelector("#dpl"); if (l) { l.innerHTML = listHtml(); bindList(); return; } }
  P.el.innerHTML = screenHtml();
  bind();
}

// ===== Eventy =====
function bindList() {
  P.el.querySelectorAll("[data-dpi]").forEach(b => b.onclick = () => { const id = b.dataset.dpi, fn = P.pick; close(); fn(id); });
}
function bind() {
  const el = P.el, f = F();
  el.querySelector("#dpx").onclick = close;
  // Hledání: seznam se obnoví po krátké pauze v psaní, pole zůstane aktivní (klávesnice nezmizí)
  el.querySelector("#dpq").oninput = e => { f.q = e.target.value; clearTimeout(P.timer); P.timer = setTimeout(() => paint(true), 150); };
  el.querySelector("#dpf").onclick = () => { f.fav = !f.fav; paint(); };
  const r = el.querySelector("#dpr");
  if (r) r.onclick = () => { S.dpk = null; paint(); };
  const z = el.querySelector("#dp0");
  if (z) z.onclick = () => { const fn = P.pick; close(); fn(""); };
  el.querySelector("#dpc").onchange = e => { f.cat = e.target.value; paint(); };
  el.querySelector("#dps").onchange = e => { f.sk = e.target.value; paint(); };
  bindList();
}
function close() {
  if (!P) return;
  clearTimeout(P.timer);
  P.el.remove();
  P = null;
}

// ===== Exporty =====
// Otevře výběr: cur = id vybraného cvičení, pick(id) = po výběru (prázdné id = bez cvičení)
export function openDrillPicker(cur, pick) {
  close();
  const el = document.createElement("div");
  el.id = "dpk";
  document.body.appendChild(el);
  P = {el, cur: cur || "", pick, timer: null};
  paint();
}
