// Kostra aplikace: záložky a hlavní vykreslení.
// Záložka Události sloučila dřívější Zápasy a Tréninky: je-li otevřený zápas (S.mid), zobrazí se jeho karta, jinak seznam událostí.
import {S} from "../core/state.js";
import {$, esc} from "../core/utils.js";
import {renderEditor} from "./editor.js";
import {eventsView} from "./events.js";
import {liveRender} from "./live.js";
import {matches} from "./matches.js";
import {modal} from "./modal.js";
import {oppsView} from "./opponents.js";
import {stats} from "./stats.js";
import {formV} from "./team.js";

export function tabs(){$("#nav").innerHTML=[["ev","Události"],["fo","Team"],["st","Statistiky"],["op","Soupeři"]].map(([k,l])=>`<button class="${S.tab===k?"on":""}" data-t="${k}">${l}</button>`).join("");
$("#nav").querySelectorAll("button").forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;S.mid=null;S.oid=null;S.evid=null;S.evf=null;S.evr=null;render()})}
export function render(){tabs();const a=$("#app");
if(S.err){a.innerHTML=`<div class="msg">${esc(S.err)}</div>`;return}
if(!S.ready){a.innerHTML='<div class="msg">Načítám…</div>';return}
({ev:a=>S.mid?matches(a):eventsView(a),ma:matches,fo:formV,st:stats,op:oppsView})[S.tab](a);modal();liveRender();renderEditor()}