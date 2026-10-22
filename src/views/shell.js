// Kostra aplikace: záložky a hlavní vykreslení.
// Záložka Události sloučila dřívější Zápasy a Tréninky: je-li otevřený zápas (S.mid), zobrazí se jeho karta, jinak seznam událostí.
// Přihlášená hráčka (role "hracka") vidí záložky Události, Statistiky, Soupeři (od v17.7, jen ke čtení) a Moje platby; karta zápasu je jen pro trenéra a kustoda.
// Team vidí trenér a kustod; hráčka s příznakem pokladník (HK.isCash) ho vidí také – formaci a soupisku jen ke čtení, plus Platby / Pokladna / Měsíce (v17.5).
// Statistiky jsou od v17.3 přístupné všem členům týmu (jen ke čtení).
// Záložka Moje platby je pro každého, kdo má v účtu propojenou hráčku nebo člena týmu (pid / tid).
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

export function tabs(){const all=[["ev","Události"],["fo","Team"],["st","Statistiky"],["op","Soupeři"]],base=onlyPl()?all.filter(([k])=>plTabs().includes(k)):all,list=hasMine()?[...base,["mk","Moje platby"]]:base;$("#nav").innerHTML=list.map(([k,l])=>`<button class="${S.tab===k?"on":""}" data-t="${k}">${l}</button>`).join("");
$("#nav").querySelectorAll("button").forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;S.mid=null;S.oid=null;S.evid=null;S.evf=null;S.evr=null;S.evBack=null;render()})}
export function render(){if(onlyPl()){if(!plTabs().includes(S.tab))S.tab="ev";S.mid=null}if(S.tab==="mk"&&!hasMine())S.tab="ev";tabs();const a=$("#app");
if(S.err){a.innerHTML=`<div class="msg">${esc(S.err)}</div>`;return}
if(!S.ready){a.innerHTML='<div class="msg">Načítám…</div>';return}
({ev:a=>S.mid?matches(a):eventsView(a),ma:matches,fo:formV,st:stats,op:oppsView,mk:mineView})[S.tab](a);modal();liveRender();renderEditor()}
