// Kostra aplikace: záložky a hlavní vykreslení.
// První záložka 🏠 Domů (úvodní přehled, views/home-view.js) je výchozí po spuštění a vidí ji každý člen.
// Záložka Události obsahuje zápasy i tréninky: je-li otevřený zápas (S.mid), zobrazí se jeho karta, jinak seznam událostí.
// Přihlášená hráčka (role "hracka") vidí záložky Domů, Události, Statistiky, Soupeři (jen ke čtení) a Moje platby; karta zápasu je jen pro trenéra a kustoda.
// Hostující (HK.can("guest")) vidí jen Domů, Události a Moje platby (statistiky, soupeři a tým nejsou její data).
// Team vidí trenér a kustod; hráčka s příznakem pokladník (HK.can("money")) ho vidí také – formaci jen ke čtení, u soupisky a realizačního týmu jen platby, plus Platby / Pokladna / Měsíce.
// Statistiky a Soupeři vidí členové týmu, jejichž role má v matici práv (⚙️ → 🔐 Práva rolí) „číst“ (HK.perm stats / opp).
// Záložka Moje platby je pro každého, kdo má v účtu propojenou hráčku nebo člena týmu (pid / tid).
// Náhled role: při aktivním náhledu je v horní liště nad záložkami stálý pruh „Náhled: … · Ukončit náhled“
// (je součástí lepicí lišty #nav, takže zůstává vidět i při posunu stránky). Záložky se řídí rolí náhledu (HK.can).
// Brána verze: je-li tato verze starší než požadované minimum (settings/app.minVer), je v liště stálý pruh s tlačítkem Načíst novou verzi
// (zápis zastaví strážce v data/storage.js).
import {S} from "../core/state.js";
import {$, esc} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {renderEditor} from "./editor.js";
import {eventsView} from "./events.js";
import {homeView} from "./home-view.js";
import {liveRender} from "./live-view.js";
import {matches} from "./matches.js";
import {mineView} from "./mine.js";
import {modal} from "./modal.js";
import {oppsView} from "./opponents.js";
import {stats} from "./stats.js";
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

// Záložky (a nad nimi případné pruhy staré verze a náhledu); obsluha klepnutí jen na tlačítka záložek (data-t)
export function tabs(){const all=[["home","🏠"],["ev","Události"],["fo","Team"],["st","Statistiky"],["op","Soupeři"]],base=baseTabs(all),list=hasMine()?[...base,["mk","Moje platby"]]:base,bar=oldBar()+pvBar(),nav=$("#nav");nav.style.flexWrap=bar?"wrap":"";nav.innerHTML=bar+list.map(([k,l])=>`<button class="${S.tab===k?"on":""}" data-t="${k}"${k==="home"?HOME_BTN:""}>${l}</button>`).join("");
const x=nav.querySelector("#pvx");if(x)x.onclick=()=>HK.endPreview();
const o=nav.querySelector("#oldx");if(o)o.onclick=()=>HK.refresh();
nav.querySelectorAll("button[data-t]").forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;S.hw=null;S.mid=null;S.oid=null;S.evid=null;S.evf=null;S.evr=null;S.evBack=null;render()})}
export function render(){if(onlyPl()){if(!plTabs().includes(S.tab))S.tab="home";S.mid=null}if(S.tab==="mk"&&!hasMine())S.tab="home";if(permOff(S.tab))S.tab="home";tabs();const a=$("#app");
if(S.err){a.innerHTML=`<div class="msg">${esc(S.err)}</div>`;return}
if(!S.ready){a.innerHTML='<div class="msg">Načítám…</div>';return}
({home:homeView,ev:a=>S.mid?matches(a):eventsView(a),ma:matches,fo:formV,st:stats,op:oppsView,mk:mineView})[S.tab](a);modal();liveRender();renderEditor()}
