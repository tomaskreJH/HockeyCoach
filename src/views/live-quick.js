// Rychlý zápis gólů a trestů v živém zápisu.
import {COLS, REA, SIT} from "../config/constants.js";
import {upd} from "../core/actions.js";
import {curM, isG, liveIds, nomOf, pl, pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {clone, esc, mmss, toast, uid} from "../core/utils.js";
import {addPen, autoSit, el_, ela, fitLayout, goalPen, procExp} from "../domain/live-engine.js";
import {liveRender} from "./live.js";

export function commitEv(e){const m=curM();if(!m||!m.live||m.closed)return;const n=clone(m),L=n.live;if(!L.pen)L.pen=[];if(!L.seq)L.seq=0;
const now=el_(L),snap=clone(L);delete snap.u;procExp(L,now);n.events=[...(n.events||[]),e];
if(e.k==="P")addPen(L,{t:e.team,p:e.team==="us"?e.pid:null,min:e.min},now,m);else goalPen(L,e.team,now);fitLayout(L,now);
L.u=[...(L.u||[]),{l:snap,ids:[e.id],t:e.k==="P"?"Vyloučení":(e.team==="us"?"Gól HC Střely":"Gól soupeře")}].slice(-15);upd(n)}
export function qaStart(kind){const m=curM();if(!m||!m.live)return;const L=m.live;if(L.running)return toast("Nejdřív přeruš hru");
const now=el_(L),b={per:L.per,time:mmss(ela(L,now))};
if(kind==="GO"){commitEv({id:uid(),k:"G",team:"opp",...b,sit:autoSit(L,"opp",now),on:liveIds(L),gk:L.G||null});toast("Gól soupeře zapsán (↩ vrátí)");return}
S.qa=kind==="G"?{k:"G",...b,team:"us",step:"scorer",scorer:null,a1:null,a2:null,sit:autoSit(L,"us",now)}:{k:"P",...b,step:"who",team:"us",pid:null,min:2};liveRender()}
export function qaHtml(m,L){const Q_=S.qa,ice=COLS.map(c=>L.ice[c]).filter(Boolean),bt=(id,l,c)=>`<button class="${c||"s"}" data-qb="${id}">${l}</button>`;let t="",b="",x="";
if(Q_.k==="G"){x=`<div class="chips" style="margin-bottom:10px">${["E","PP","SH"].map(s=>`<button class="chip ${Q_.sit===s?"on":""}" data-qs="${s}">${SIT[s]}</button>`).join("")}</div>`;
 if(Q_.step==="scorer"){t="⚽ Kdo dal gól?";b=ice.map(i=>bt("sc:"+i,pn(i))).join("")}
 else if(Q_.step==="a1"){t="1. asistence";b=bt("a1:-","Bez asistence","p")+ice.filter(i=>i!==Q_.scorer).map(i=>bt("a1:"+i,pn(i))).join("")}
 else{t="2. asistence";b=bt("a2:-","Hotovo – bez 2. asistence","p")+ice.filter(i=>i!==Q_.scorer&&i!==Q_.a1).map(i=>bt("a2:"+i,pn(i))).join("")}}
else if(Q_.step==="who"){t="🚫 Vyloučení – kdo?";b=bt("who:opp","Soupeř","d")+ice.map(i=>bt("who:"+i,pn(i))).join("")+bt("who:other","Jiná hráčka…")}
else if(Q_.step==="other"){t="🚫 Jiná hráčka";const used=new Set(ice);b=nomOf(m).filter(i=>pl(i)&&!isG(pl(i))&&!used.has(i)).map(i=>bt("who:"+i,pn(i))).join("")||'<div class="mu">Nikdo další.</div>'}
else if(Q_.step==="len"){t="Délka trestu"+(Q_.team==="opp"?" (soupeř)":"");b=[[2,"2 min"],[4,"2+2 min"],[5,"5 min"],[10,"10 min osobní"],[20,"Do konce zápasu"]].map(([v,l])=>bt("len:"+v,l)).join("")}
else{t="Důvod";b=REA.map(r=>bt("why:"+r,r)).join("")}
return`<div class="lmw" id="qw"><div class="lmb"><h2>${t}</h2><div class="mu" style="margin-bottom:8px">${Q_.per}. tř. ${esc(Q_.time)}</div>${x}<div class="qg">${b}</div><button class="s w" data-qb="x" style="margin-top:14px;min-height:54px">Zrušit</button></div></div>`}
export function qaClick(id,m,L){const Q_=S.qa,i=id.indexOf(":"),k=i<0?id:id.slice(0,i),v=i<0?"":id.slice(i+1);
function fin(){const e={id:uid(),k:"G",team:"us",per:Q_.per,time:Q_.time,sit:Q_.sit,scorer:Q_.scorer,a1:Q_.a1,a2:Q_.a2,on:liveIds(L)};S.qa=null;commitEv(e)}
if(id==="x"){S.qa=null;return liveRender()}
if(Q_.k==="G"){if(k==="sc"){Q_.scorer=v;Q_.step="a1"}else if(k==="a1"){if(v==="-")return fin();Q_.a1=v;Q_.step="a2"}else if(k==="a2"){Q_.a2=v==="-"?null:v;return fin()}return liveRender()}
if(k==="who"){if(v==="opp"){Q_.team="opp";Q_.step="len"}else if(v==="other")Q_.step="other";else{Q_.team="us";Q_.pid=v;Q_.step="len"}}
else if(k==="len"){Q_.min=+v;Q_.step="why"}
else if(k==="why"){const e={id:uid(),k:"P",team:Q_.team,per:Q_.per,time:Q_.time,min:Q_.min,reason:v};if(Q_.team==="us")e.pid=Q_.pid;S.qa=null;return commitEv(e)}
liveRender()}
