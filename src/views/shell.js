// Kostra aplikace: záložky a hlavní vykreslení.
// První záložka 🏠 Domů (úvodní přehled, views/home-view.js) je výchozí po spuštění a vidí ji každý člen.
// Záložka Události obsahuje zápasy i tréninky: je-li otevřený zápas (S.mid), zobrazí se jeho karta, jinak seznam událostí.
// Přihlášená hráčka (role "hracka") vidí záložky Domů, Události, Statistiky, Soupeři (jen ke čtení) a Moje platby; karta zápasu je jen pro managera, trenéra a asistenta.
// Hostující (HK.can("guest")) vidí jen Domů, Události a Moje platby (statistiky, soupeři a tým nejsou její data).
// Team vidí manager, trenér a asistent; hráčka s příznakem pokladník (HK.can("money")) ho vidí také – formaci jen ke čtení, u soupisky a realizačního týmu jen platby, plus Platby / Pokladna / Měsíce.
// Statistiky a Soupeři vidí členové týmu, jejichž role má v matici práv (⚙️ → 🔐 Práva rolí) „číst“ (HK.perm stats / opp).
// Záložka Moje platby je pro každého, kdo má v účtu propojenou hráčku nebo člena týmu (pid / tid).
// Náhled role: při aktivním náhledu je v horní liště nad záložkami stálý pruh „Náhled: … · Ukončit náhled“
// (je součástí lepicí lišty #nav, takže zůstává vidět i při posunu stránky). Záložky se řídí rolí náhledu (HK.can).
// Brána verze: je-li tato verze starší než požadované minimum (settings/app.minVer), je v liště stálý pruh s tlačítkem Načíst novou verzi
// (zápis zastaví strážce v data/storage.js).
// 🧪 Beta kanál (views/beta-view.js): v betě fialový pruh se štítkem a cestou na stabilní verzi, ve stabilní nabídka novější bety testerovi;
// účet, který není tester ani manager, vidí v betě místo aplikace jen obrazovku Přejít na stabilní verzi (bez záložek).
import {S} from "../core/state.js";
import {$, esc} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {betaBar, betaLockView, betaLocked, bindBetaBar} from "./beta-view.js";
import {renderEditor} from "./editor.js";
import {eventsView} from "./events.js";
import {homeView} from "./home-view.js";
import {liveRender} from "./live-view.js";
import {matches} from "./matches.js";
import {mineView} from "./mine.js";
import {modal} from "./modal.js";
import {oppsView} from "./opponents.js";
import {statsView} from "./train-stats.js";
import {formV} from "./team.js";

const onlyPl = () => HK.can("onlyOwn");
const hasMine = () => !!(HK.pid() || HK.tid());
// Záložky dostupné hráčce (Soupeři jen ke čtení); hráčka-pokladník má navíc Team
const plTabs = () => HK.can("guest") ? ["home", "ev", "mk"] : HK.can("money") ? ["home", "ev", "fo", "st", "op", "mk"] : ["home", "ev", "st", "op", "mk"];
// Záložky skryté maticí práv: Statistiky (stats r) a Soupeři (opp r)
const permOff = k => (k === "st" && !HK.perm("stats", "r")) || (k === "op" && !HK.perm("opp", "r"));
// Záložky, které přihlášený účet vidí (bez Moje platby)
const baseTabs = all => (onlyPl() ? all.filter(([k]) => plTabs().includes(k)) : all).filter(([k]) => !permOff(k));
// Záložka 🏠 Domů jen jako ikona (šetří místo v liště s až šesti záložkami)
const HOME_BTN = ' style="flex:0 0 52px;font-size:20px" title="Domů" aria-label="Domů"';
// Pruh náhledu role přes celou šířku lišty (prázdný, když náhled neběží)
const pvBar = () => { const p = HK.preview && HK.preview(); return p ? `<div style="flex-basis:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 12px;background:var(--wa);color:#fff;font-size:13px;font-weight:600"><span>👁 Náhled: ${esc(p.label)}</span><button id="pvx" style="flex:none;padding:6px 10px;border:1px solid #fff;border-radius:8px;background:none;color:#fff;font:inherit;font-size:13px;cursor:pointer">Ukončit náhled</button></div>` : ""; };

// Pruh staré verze přes celou šířku lišty (prázdný, když verze stačí)
const oldBar = () => HK.outdated && HK.outdated() ? `<div style="flex-basis:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 12px;background:var(--no);color:#fff;font-size:13px;font-weight:600"><span>⚠️ Starší verze aplikace – zápis je zablokovaný</span><button id="oldx" style="flex:none;padding:6px 10px;border:1px solid #fff;border-radius:8px;background:none;color:#fff;font:inherit;font-size:13px;cursor:pointer">Načíst novou verzi</button></div>` : "";

// ===== Ikony záložek (obrysové SVG; vidět jen ve vzhledu „Čistý“, kde je menu dole a bez textu – ostatní vzhledy je skrývají) =====
const ICONS = {
  home: '<path d="M3 11 L12 3 L21 11 V21 H14 V14 H10 V21 H3 Z"/>',
  ev: '<rect x="4" y="5" width="16" height="16"/><path d="M4 10 H20 M8 3 V7 M16 3 V7"/>',
  fo: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20 V18 A6 6 0 0 1 15 18 V20"/><circle cx="17.5" cy="9" r="2.4"/><path d="M17 14.2 A5 5 0 0 1 21 18 V20"/>',
  st: '<path d="M5 20 V12 M12 20 V5 M19 20 V9"/>',
  op: '<path d="M12 3 L20 6 V12 C20 17 16.5 20 12 21 C7.5 20 4 17 4 12 V6 Z"/>',
  mk: '<rect x="3" y="7" width="18" height="13"/><path d="M3 11 H21"/><circle cx="16" cy="15.5" r="1"/>'
};
const icon = k => `<svg class="ti" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">${ICONS[k] || ""}</svg>`;
// Vzhled „Čistý“ (data-clean na <html>, src/core/skin.js): záložky jsou v dolní liště #tabbar, pruhy zůstávají nahoře v #nav
const isClean = () => typeof document !== "undefined" && !!(document.documentElement && document.documentElement.dataset && document.documentElement.dataset.clean);

// ===== Záložky =====
// Záložky (a nad nimi případné pruhy staré verze, náhledu a bety); obsluha klepnutí jen na tlačítka záložek (data-t); zamčená beta bez záložek.
// Ve vzhledu „Čistý“ jsou tlačítka záložek v dolní liště #tabbar (jen ikony, text je skrytý pro čtečky), jinak v #nav za pruhy.
export function tabs() {
  const all = [["home", "🏠"], ["ev", "Události"], ["fo", "Team"], ["st", "Statistiky"], ["op", "Soupeři"]], base = baseTabs(all);
  const list = betaLocked() ? [] : hasMine() ? [...base, ["mk", "Moje platby"]] : base;
  const bar = oldBar() + pvBar() + betaBar(render), nav = $("#nav"), tb = $("#tabbar"), clean = isClean();
  const btns = list.map(([k, l]) => `<button class="${S.tab === k ? "on" : ""}" data-t="${k}"${k === "home" ? HOME_BTN : ` title="${l}" aria-label="${l}"`}>${icon(k)}<span class="tl">${l}</span></button>`).join("");
  nav.style.flexWrap = bar ? "wrap" : "";
  nav.innerHTML = clean ? bar : bar + btns;
  if (tb) tb.innerHTML = clean ? btns : "";
  const x = nav.querySelector("#pvx"); if (x) x.onclick = () => HK.endPreview();
  const o = nav.querySelector("#oldx"); if (o) o.onclick = () => HK.refresh();
  bindBetaBar(nav, render);
  document.querySelectorAll("#nav button[data-t], #tabbar button[data-t]").forEach(b => b.onclick = () => { S.tab = b.dataset.t; S.hw = null; S.mid = null; S.oid = null; S.evid = null; S.evf = null; S.evr = null; S.evBack = null; render(); });
}
// Změna vzhledu v ⚙️ přepíše i umístění záložek (nahoře / dole)
if (typeof window !== "undefined" && typeof window.addEventListener === "function") window.addEventListener("hk-skin", () => tabs());
export function render(){if(onlyPl()){if(!plTabs().includes(S.tab))S.tab="home";S.mid=null}if(S.tab==="mk"&&!hasMine())S.tab="home";if(permOff(S.tab))S.tab="home";tabs();const a=$("#app");
if(S.err){a.innerHTML=`<div class="msg">${esc(S.err)}</div>`;return}
if(!S.ready){a.innerHTML='<div class="msg">Načítám…</div>';return}
if(betaLocked()){betaLockView(a);return}
({home:homeView,ev:a=>S.mid?matches(a):eventsView(a),ma:matches,fo:formV,st:statsView,op:oppsView,mk:mineView})[S.tab](a);modal();liveRender();renderEditor()}
