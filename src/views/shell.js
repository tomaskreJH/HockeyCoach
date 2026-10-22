// Kostra aplikace: záložky a hlavní vykreslení.
// Záložka Události sloučila dřívější Zápasy a Tréninky: je-li otevřený zápas (S.mid), zobrazí se jeho karta, jinak seznam událostí.
// Přihlášená hráčka (role "hracka") vidí záložky Události, Statistiky, Soupeři (od v17.7, jen ke čtení) a Moje platby; karta zápasu je jen pro trenéra a kustoda.
// Team vidí trenér a kustod; hráčka s příznakem pokladník (HK.isCash) ho vidí také – formaci a soupisku jen ke čtení, plus Platby / Pokladna / Měsíce (v17.5).
// Statistiky jsou od v17.3 přístupné všem členům týmu (jen ke čtení).
// Záložka Moje platby je pro každého, kdo má v účtu propojenou hráčku nebo člena týmu (pid / tid).
// Náhled role (v18.6): při aktivním náhledu je v horní liště nad záložkami stálý pruh „Náhled: … · Ukončit náhled“
// (je součástí lepicí lišty #nav, takže zůstává vidět i při posunu stránky). Záložky se řídí rolí náhledu (HK.role() apod.).
import {S} from "../core/state.js";
import {$, esc} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {renderEditor} from "./editor.js";
import {eventsView} from "./events.js";
import {liveRender} from "./live.js";
import {matches} from "./matches.js";
import {mineView} from "./mine.js";
import {modal} from "./modal.js";
import {oppsView} from "./opponents.js";
import {stats} from "./stats.js";
import {formV} from "./team.js";

const onlyPl = () => HK.role() === "hracka";
const hasMine = () => !!(HK.pid() || HK.tid());
// Záložky dostupné hráčce (od v17.7 i Soupeři, jen ke čtení); hráčka-pokladník má navíc Team
const plTabs = () => HK.isCash() ? ["ev", "fo", "st", "op", "mk"] : ["ev", "st", "op", "mk"];
// Pruh náhledu role přes celou šířku lišty (prázdný, když náhled neběží)
const pvBar = () => { const p = HK.preview && HK.preview(); return p ? `<div style="flex-basis:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 12px;background:var(--wa);color:#fff;font-size:13px;font-weight:600"><span>👁 Náhled: ${esc(p.label)}</span><button id="pvx" style="flex:none;padding:6px 10px;border:1px solid #fff;border-radius:8px;background:none;color:#fff;font:inherit;font-size:13px;cursor:pointer">Ukončit náhled</button></div>` : ""; };

// Záložky (a nad nimi případný pruh náhledu); obsluha klepnutí jen na tlačítka záložek (data-t)
export function tabs(){const all=[["ev","Události"],["fo","Team"],["st","Statistiky"],["op","Soupeři"]],base=onlyPl()?all.filter(([k])=>plTabs().includes(k)):all,list=hasMine()?[...base,["mk","Moje platby"]]:base,bar=pvBar(),nav=$("#nav");nav.style.flexWrap=bar?"wrap":"";nav.innerHTML=bar+list.map(([k,l])=>`<button class="${S.tab===k?"on":""}" data-t="${k}">${l}</button>`).join("");
const x=nav.querySelector("#pvx");if(x)x.onclick=()=>HK.endPreview();
nav.querySelectorAll("button[data-t]").forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;S.mid=null;S.oid=null;S.evid=null;S.evf=null;S.evr=null;S.evBack=null;render()})}
export function render(){if(onlyPl()){if(!plTabs().includes(S.tab))S.tab="ev";S.mid=null}if(S.tab==="mk"&&!hasMine())S.tab="ev";tabs();const a=$("#app");
if(S.err){a.innerHTML=`<div class="msg">${esc(S.err)}</div>`;return}
if(!S.ready){a.innerHTML='<div class="msg">Načítám…</div>';return}
({ev:a=>S.mid?matches(a):eventsView(a),ma:matches,fo:formV,st:stats,op:oppsView,mk:mineView})[S.tab](a);modal();liveRender();renderEditor()}
