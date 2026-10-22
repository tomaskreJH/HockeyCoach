// Živý zápis – obsluha klepnutí na obrazovce: start / přerušení, posun času, ↩ Zpět, střely, rychlý zápis gólů a trestů,
// pětky a jednotky, štítky trestů (✕), rotující partnerky, střídání klepnutím i přetažením; odchod ze živého zápisu.
// Struktura: Importy -> Gól / trest přes okno (openLive) -> Střídání s odezvou (subFb) -> Přetahování (lvDrag)
//            -> Obsluha obrazovky (bindLive) -> Odchod (leaveLive) -> Nabídka po trestu (askUnit) -> Posun času (nudgeT).

// ===== Importy =====
import {REA, ULAB} from "../config/constants.js";
import {upd} from "../core/actions.js";
import {curM, liveIds, pl} from "../core/selectors.js";
import {makeDrag} from "../core/drag.js";
import {S} from "../core/state.js";
import {Q, clone, mmss, toast} from "../core/utils.js";
import {act, afterRemove, applyLine, applyUnit, doOShot, doShot, doSub, doUndo, el_, ela, logEv, sk, skCount, swapRot, toLines, toff} from "../domain/live-engine.js";
import {matchDrag} from "./lineup-editor.js";
import {qaClick, qaStart} from "./live-quick.js";
import {feedback, haptic} from "./live-feedback.js";
import {modal} from "./modal.js";
import {render} from "./shell.js";
import {grpFor, liveRender, liveTick} from "./live-view.js";

// ===== Gól / trest přes okno =====
export function openLive(kind,team){const m=curM(),L=m.live,now=el_(L),us=sk(L,"us",now),op=sk(L,"opp",now);S.lmenu=false;S.lsub=null;
const base={per:L.per,time:mmss(ela(L,now))};
if(kind==="G"){const sit=team==="us"?(us>op?"PP":us<op?"SH":"E"):(op>us?"PP":op<us?"SH":"E");S.M={k:"G",team,...base,sit,scorer:null,a1:null,a2:null,on:liveIds(L)}}
else S.M={k:"P",team:"us",...base,min:2,reason:REA[0],pid:null};modal()}
// Střídání s odezvou: doSub se volá beze změny; stejnou podmínkou jako doSub (plný led při trestu) se jen určí,
// zda potvrdit (záblesk místa na ledě), nebo dát chybovou vibraci (doSub sám ukáže hlášku).
function subFb(p,c){const m=curM(),L=m&&m.live;const full=!!L&&!L.ice[c]&&skCount(L)>=sk(L,"us",el_(L));doSub(p,c);if(L)feedback(full?"err":"tap",full?null:`[data-ice="${c}"]`)}
// Přetahování hráčky z fronty na místo na ledě; klepnutí = střídání na její místo
function lvDrag(root){makeDrag(root,[...root.querySelectorAll("[data-q]")],{target:"[data-ice]",
start:b=>({data:b.dataset.q,text:(pl(b.dataset.q)||{}).name||""}),
drop:(p,b)=>subFb(p,b.dataset.ice),
click:b=>()=>subFb(b.dataset.q,b.dataset.col)})}

// ===== Obsluha obrazovky =====
// Napojí tlačítka obrazovky (ctx z liveRender); panely menu ⋯ napojuje live-panels.js
export function bindLive({e,m,L,run,ended}){
const Q2=x=>e.querySelectorAll(x);if(S.lmenu&&S.lsub==="lineup"&&!m.closed)matchDrag(e,m);
// Sestava po zranění: vyznačit místo zraněné hráčky (dočasně – její místo, trvale – prázdné místo po ní)
if(S.lmenu&&S.lsub==="lineup"&&S.lgap)S.lgap.keys.forEach(k=>Q2(`[data-sl="m:${k}"]`).forEach(b=>b.classList.add("lu-gap")));
e.querySelector("#lpl").onclick=()=>{if(ended)return toast("Zápas je ukončen (zrušit konec: menu ⋯)");act(false,(L,n,i,t)=>{if(L.running){L.acc=t;L.running=false;L.t0=0}else{L.running=true;L.t0=Date.now()}})};
e.querySelector("#tm5").onclick=()=>nudgeT(-5000);e.querySelector("#tp5").onclick=()=>nudgeT(5000);
// ↩ Zpět s odezvou (jen když bylo co vrátit)
e.querySelector("#lun").onclick=()=>{const had=(L.u||[]).length>0;doUndo();if(had)feedback("undo","#lun")};
Q("#lmn").onclick=()=>{S.lmenu=true;S.lsub=null;liveRender()};
const nope=()=>toast("Nejdřív přeruš hru");
Q("#qg").onclick=()=>run?nope():qaStart("G");
Q("#qo").onclick=()=>run?nope():qaStart("GO");
Q("#qp").onclick=()=>run?nope():qaStart("P");
Q2("[data-qb]").forEach(b=>b.onclick=()=>qaClick(b.dataset.qb,m,L));
Q2("[data-qs]").forEach(b=>b.onclick=()=>{S.qa.sit=b.dataset.qs;liveRender()});
// Střely s odezvou (záblesk tlačítka, krátká vibrace)
e.querySelector("#lgk").onclick=()=>{if(run){doOShot();feedback("tap","#lgk")}else toast("Hra je přerušena – střelu nelze zapsat")};
Q2("[data-ice]").forEach(b=>b.onclick=()=>{const c=b.dataset.ice,p=L.ice[c];if(p){if(run){doShot(p);feedback("tap",`[data-ice="${c}"]`)}else toast("Hra je přerušena – střelu nelze zapsat")}});
Q2("[data-pline]").forEach(b=>b.onclick=()=>{const k=+b.dataset.pline;act(k+". pětka na led",(L2,n,ids,t)=>{const r=applyLine(L2,n,k,t);if(r.none){toast("Pětku nelze nasadit (hráčky nejsou k dispozici)");haptic("err");return}feedback("ok",`[data-pline="${k}"]`);logEv(n,{ty:"unit",label:k+". pětka na led",at:t,per:L2.per});if(r.skip.length)toast("Nenasazeny (trest/nenominovány): "+r.skip.join(", "))})});
// Nabídka jednotky: z řádku stavu otevře panel, v panelu přepne navrhovanou jednotku
Q2("[data-uask]").forEach(b=>b.onclick=()=>{S.lmenu=true;S.lsub="uask";S.uk=null;liveRender()});
Q2("[data-uk]").forEach(b=>b.onclick=()=>{S.uk=b.dataset.uk;liveRender()});
Q2("[data-us]").forEach(b=>b.onclick=()=>{S.lsub="usel:"+b.dataset.us;liveRender()});
Q2("[data-usp]").forEach(b=>b.onclick=()=>{const[,k,c]=S.lsub.split(":"),n=clone(m);n.sp=n.sp||{};n.sp[k]=n.sp[k]||{};if(b.dataset.usp)n.sp[k][c]=b.dataset.usp;else delete n.sp[k][c];S.lsub="units";upd(n)});
Q2("[data-unit]").forEach(b=>b.onclick=()=>{const k=b.dataset.unit;S.lmenu=false;S.lsub=null;act(ULAB[k],(L2,n,ids,t)=>{const r=applyUnit(L2,n,k,t);if(r.none){toast("Jednotku nelze nasadit (hráčky nejsou k dispozici)");haptic("err");return}feedback("ok",`[data-unit="${k}"]`);logEv(n,{ty:"unit",label:ULAB[k],at:t,per:L2.per});if(r.skip.length||r.rep.length)toast((r.skip.length?"Nenasazeny: "+r.skip.join(", "):"")+(r.rep.length?(r.skip.length?" – ":"")+"doplnily: "+r.rep.join(", "):""));else if(r.trim)toast("Jednotka zkrácena podle počtu hráček na ledě")})});
Q2("[data-lines]").forEach(b=>b.onclick=()=>{S.lmenu=false;S.lsub=null;act("Zpět na řady",(L2,n,ids,t)=>{toLines(L2,n,t);feedback("ok","#lchips");logEv(n,{ty:"unit",label:"Zpět na řady",at:t,per:L2.per})})});
Q2("[data-pcx]").forEach(b=>b.onclick=()=>act("Zrušení trestu",(L,n,i,t)=>{const c=L.pen.find(x=>x.id===b.dataset.pcx);if(!c)return;L.pen=L.pen.filter(x=>x!==c);afterRemove(L,c,t)}));
// Rotující partnerka: klepnutí = rovnou na led (stejné střídání jako z fronty), podržení u partnerky čekající hráčky =
// změna pořadí rotace (swapRot – partnerka se postaví do fronty místo ní)
Q2("[data-rp]").forEach(b=>{let tmr=null,held=false;
const hold=()=>{held=false;clearTimeout(tmr);if(!b.dataset.of)return;tmr=setTimeout(()=>{held=true;const of=b.dataset.of,x=b.dataset.rp;act("Rotace: "+(pl(of)||{}).name,(L2,n)=>swapRot(L2,n,of));feedback("ok",`[data-q="${x}"]`)},550)},stop=()=>clearTimeout(tmr);
b.addEventListener("pointerdown",hold);["pointerup","pointerleave","pointercancel"].forEach(t=>b.addEventListener(t,stop));
b.addEventListener("contextmenu",ev=>ev.preventDefault());
b.onclick=()=>{if(held){held=false;return}subFb(b.dataset.rp,b.dataset.col)}});
lvDrag(e);}

// ===== Odchod, nabídka po trestu, posun času =====
// Odchod ze živého zápisu: zastaví čas zápasu (bez záznamu do Zpět) a zavře obrazovku.
// Volá menu ⋯ → Zavřít živý zápis a tlačítko Zpět na telefonu (core/nav.js).
export function leaveLive(){const m=curM();S.qa=null;S.lmenu=false;S.lsub=null;S.injp=null;S.lgap=null;S.uk=null;S.lsit=null;
if(m&&m.live&&m.live.running&&!m.closed)act(false,(L,n,i,t)=>{L.acc=t;L.running=false;L.t0=0});
S.lv=false;render()}
// Nabídka jednotky po trestu: volá rychlý zápis po zapsání vyloučení, když se změnil počet hráček
// a hra je nevyrovnaná (přesilovka / oslabení). Nic nezapisuje – jen otevře panel k odsouhlasení.
export function askUnit(before){const m=curM();if(!m||!m.live||m.closed)return;const L=m.live,now=el_(L),us=sk(L,"us",now),op=sk(L,"opp",now);
if(!grpFor(us,op)||(before&&before[0]===us&&before[1]===op))return;S.lmenu=true;S.lsub="uask";S.uk=null;liveRender()}
// Posun času zápasu o d ms (◀ ▶ o 5 s), nejvýš na začátek třetiny
function nudgeT(d){const m=curM();if(!m||!m.live)return;const L=m.live,el=el_(L)-L.pst;S.toffP=L.per;S.toff=Math.max(-el,toff(L)+d);liveTick()}
