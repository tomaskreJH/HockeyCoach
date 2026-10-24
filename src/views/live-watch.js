// 👁 Náhled živého zápasu pro členy bez práva zápisu (otevírá se klepnutím na kartu 🔴 v 🏠 Domů, stav S.hw = id zápasu).
// Jen ke čtení: skóre, střely, čas a třetina, průběh (góly, tresty, střely, konce třetin). Bez sestav, času na ledě a ovládání.
// Data se obnovují samy z poslechu kolekce matches (main.js → render); čas mezi uloženími dopočítává místní odpočet.
// Výpočty: domain/watch-feed.js. Nic nezapisuje, živý zápis se nemění.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Vykreslení -> Eventy -> Export.

// ===== Importy =====
import {TEAM_NAME} from "../config/team-config.js";
import {S} from "../core/state.js";
import {cd, esc} from "../core/utils.js";
import {perLabel} from "../domain/timeline.js";
import {watchClock, watchFeed, watchScore} from "../domain/watch-feed.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
const TICK_MS = 1000;            // obnova odpočtu na obrazovce
let timer = null;                // jediný běžící odpočet (zastaví se sám, když náhled zmizí)
let shotsOn = true;              // zobrazit střely v průběhu (volba jen v tomto zařízení, do zavření aplikace)
const CSS = `<style>
#hwv .hws{font-size:40px;font-weight:800;text-align:center;letter-spacing:2px;margin:2px 0}
#hwv .hwc{font-size:26px;font-weight:800;text-align:center;font-variant-numeric:tabular-nums}
#hwv .hwr{display:grid;grid-template-columns:auto 1fr;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);align-items:start}
#hwv .hwr:last-child{border-bottom:0}
#hwv .hwr.g{border-left:4px solid var(--ok);padding-left:8px}
#hwv .hwr.go{border-left:4px solid var(--no);padding-left:8px}
#hwv .hwr.pe{font-weight:700}
#hwv .hwt{white-space:nowrap;font-variant-numeric:tabular-nums}
</style>`;

// ===== Pomocné funkce =====
// Názvy týmů a skóre ve správném pořadí (domácí vlevo)
const sides = (m, sc) => m.home
  ? {l: TEAM_NAME, r: m.opp || "Soupeř", s: sc.us + " : " + sc.them, sh: sc.shUs + " : " + sc.shThem}
  : {l: m.opp || "Soupeř", r: TEAM_NAME, s: sc.them + " : " + sc.us, sh: sc.shThem + " : " + sc.shUs};
// Text stavu času: běží / přerušeno / konec
const stateText = c => c.ended ? "🏁 Konec zápasu" : c.running ? "▶ Hra běží" : "⏸ Přerušeno";
// Třída řádku průběhu (náš gól zeleně, gól soupeře červeně, konce třetin tučně)
const rowCls = e => e.kind === "G" ? (e.team === "us" ? " g" : " go") : e.kind === "per" || e.kind === "end" ? " pe" : "";

// ===== Vykreslení =====
function feedHtml(list) {
  if (!list.length) return '<div class="mu" style="margin-top:6px">Zatím se nic nestalo.</div>';
  return list.map(e => `<div class="hwr${rowCls(e)}"><span class="hwt mu">${esc(perLabel(e.per || 1))} ${esc(e.el || "")}</span><span>${esc(e.text)}</span></div>`).join("");
}
function viewHtml(m) {
  const c = watchClock(m, Date.now()), sc = watchScore(m), sd = sides(m, sc), list = watchFeed(m, {shotsOn});
  return CSS + `<div id="hwv">
<button class="s" id="hwb" style="margin-bottom:8px">← Domů</button>
<div class="cd" style="border-color:var(--no);border-width:2px">
<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="color:var(--no)">👁 Živě – jen náhled</b><span class="tag">${esc(c.perText)}</span></div>
<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-top:8px">
<b style="text-align:right">${esc(sd.l)}</b><div class="hws">${sd.s}</div><b>${esc(sd.r)}</b></div>
<div class="mu" style="text-align:center">Střely ${sd.sh}</div>
<div class="hwc" id="hwclk" style="margin-top:6px">${c.ended ? "–" : cd(c.left)}</div>
<div class="mu" style="text-align:center" id="hwst">${stateText(c)}</div></div>
<div class="cd"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h2 style="margin:0">Průběh</h2>
<label class="mu" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="hwsh"${shotsOn ? " checked" : ""}> Střely</label></div>
${feedHtml(list)}</div>
<div class="mu" style="text-align:center;margin:6px 0 12px">Sestavy a čas na ledě vidí manager, trenér a asistent. Celý průběh najdeš v detailu zápasu po jeho uzavření.</div></div>`;
}

// ===== Eventy =====
// Místní odpočet: přepočítá čas z uloženého stavu zápasu; když náhled zmizí, odpočet se zastaví
function tick() {
  const el = document.getElementById("hwclk"), m = (S.ma || []).find(x => x.id === S.hw);
  if (!el || !m || !m.live) { clearInterval(timer); timer = null; return; }
  const c = watchClock(m, Date.now()), st = document.getElementById("hwst");
  el.textContent = c.ended ? "–" : cd(c.left);
  if (st) st.textContent = stateText(c);
}
function bind(a) {
  const b = a.querySelector("#hwb"), sh = a.querySelector("#hwsh");
  if (b) b.onclick = () => { S.hw = null; render(); window.scrollTo(0, 0); };
  if (sh) sh.onchange = () => { shotsOn = sh.checked; render(); };
  if (!timer) timer = setInterval(tick, TICK_MS);
}

// ===== Export =====
// Je zápas id stále živý (zahájený živý zápis, neuzavřený)? Jinak náhled nemá co ukázat
export const watchable = id => { const m = (S.ma || []).find(x => x.id === id); return !!(m && m.live && !m.closed); };
// Vykreslení náhledu běžícího zápasu S.hw do kontejneru a (volá home-view.js, když watchable(S.hw))
export function liveWatchView(a) {
  const m = (S.ma || []).find(x => x.id === S.hw);
  a.innerHTML = viewHtml(m);
  bind(a);
}
