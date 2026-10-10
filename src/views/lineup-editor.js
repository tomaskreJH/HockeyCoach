// Editor sestavy zápasu: řady, náhradnice, výběr hráčky, přetahování.
import {LN, POS, SL} from "../config/constants.js";
import {save, upd} from "../core/actions.js";
import {PG, nomOf, pl, pn, pri, stOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {clone, esc, toast} from "../core/utils.js";
import {benchM, syncLive} from "../domain/lineup.js";
import {el_} from "../domain/live-engine.js";
import {modal} from "./modal.js";

export function luEditor(lu,onCh,pre){let h="";
LN.forEach(n=>{h+=`<div class="lnl">${n}. pětka</div><div class="ln">${SL.map(c=>{const id=lu[n+c];return`<button class="sl ${id&&pl(id)?"f":""}" data-sl="${pre}${n}${c}"><small>${c}</small>${id&&pl(id)?pn(id):"+"}</button>`}).join("")}</div>`});
h+=`<div class="lnl">Brankářky</div><div class="ln">${["G1","G2"].map(c=>{const id=lu[c];return`<button class="sl ${id&&pl(id)?"f":""}" data-sl="${pre}${c}"><small>${c==="G1"?"Základ":"Náhradnice"}</small>${id&&pl(id)?pn(id):"+"}</button>`}).join("")}</div>`;
return h}
export function bindLu(root,pre,get,onCh,pool){
const btns=[...root.querySelectorAll(`[data-sl^="${pre}"]`)];let D=null,timer=null,blk=false;
const key=b=>b.dataset.sl.slice(pre.length);
const slotAt=(x,y)=>{const e=document.elementFromPoint(x,y),b=e&&e.closest&&e.closest(`[data-sl^="${pre}"]`);return b?key(b):null};
const mark=k=>btns.forEach(b=>b.classList.toggle("ov",!!D&&key(b)===k&&k!==D.from));
const mv=(x,y)=>{D.x=x;D.y=y;D.g.style.left=x+"px";D.g.style.top=y+"px";mark(slotAt(x,y))};
const clr=()=>{if(D&&D.g)D.g.remove();btns.forEach(b=>b.classList.remove("dg","ov"));D=null};
const begin=(b,x,y)=>{const id=get()[key(b)];if(!id)return;const g=document.createElement("div");g.className="ghost";g.textContent=(pl(id)||{}).name||"?";document.body.appendChild(g);D={from:key(b),g};b.classList.add("dg");mv(x,y);if(navigator.vibrate)navigator.vibrate(15)};
const end=(x,y)=>{if(!D)return;const to=slotAt(x,y),from=D.from;clr();blk=true;setTimeout(()=>blk=false,450);if(to&&to!==from){const lu=get(),a=lu[from],c=lu[to];lu[to]=a;if(c)lu[from]=c;else delete lu[from];onCh(lu)}};
btns.forEach(b=>{
b.onclick=()=>{if(blk)return;S.pickAll=false;S.pick={slot:key(b),get,onCh,pool};modal()};
b.addEventListener("contextmenu",e=>e.preventDefault());
b.addEventListener("touchstart",e=>{const t=e.touches[0];clearTimeout(timer);b._s={x:t.clientX,y:t.clientY};timer=setTimeout(()=>begin(b,t.clientX,t.clientY),320)},{passive:true});
b.addEventListener("touchmove",e=>{const t=e.touches[0];if(D){e.preventDefault();mv(t.clientX,t.clientY)}else if(Math.abs(t.clientX-b._s.x)+Math.abs(t.clientY-b._s.y)>10)clearTimeout(timer)},{passive:false});
b.addEventListener("touchend",e=>{clearTimeout(timer);if(D){e.preventDefault();end(D.x,D.y)}});
b.addEventListener("touchcancel",()=>{clearTimeout(timer);clr()});
b.addEventListener("mousedown",e=>{if(e.button!==0||!get()[key(b)])return;const sx=e.clientX,sy=e.clientY;
const mm=ev=>{if(!D&&Math.abs(ev.clientX-sx)+Math.abs(ev.clientY-sy)>6)begin(b,ev.clientX,ev.clientY);if(D)mv(ev.clientX,ev.clientY)};
const mu=ev=>{document.removeEventListener("mousemove",mm);document.removeEventListener("mouseup",mu);end(ev.clientX,ev.clientY)};
document.addEventListener("mousemove",mm);document.addEventListener("mouseup",mu)})})}
export function benchGrouped(m){const B=benchM(m);if(!B.length)return'<span class="mu">Žádné.</span>';let h="",last=-1;B.forEach(id=>{const k=pri(pl(id));if(k!==last){h+=`<div class="lnl" style="width:100%;margin:6px 0 0">${PG[k]}</div>`;last=k}h+=`<button class="chip bn" data-bn="${id}">${pn(id)} <small class="mu">${esc((pl(id).pos||"?")[0])}</small></button>`});return h}
export function matchDrag(root,m0){let D=null,timer=null,blk=false;const SEL='[data-sl^="m:"],[data-bn],[data-on],[data-bz]';
const cur=()=>S.ma.find(x=>x.id===m0.id)||m0;
const closest=(x,y)=>{const e=document.elementFromPoint(x,y);return e&&e.closest?e.closest(SEL):null};
const info=b=>b.dataset.bn?{t:"b",id:b.dataset.bn}:b.dataset.on?{t:"o",id:b.dataset.on}:b.dataset.sl?{t:"s",k:b.dataset.sl.slice(2)}:{t:"z",z:b.dataset.bz};
const clr=()=>{if(D&&D.g)D.g.remove();root.querySelectorAll(".ov,.dg").forEach(n=>n.classList.remove("ov","dg"));D=null};
const mv=(x,y)=>{D.x=x;D.y=y;D.g.style.left=x+"px";D.g.style.top=y+"px";root.querySelectorAll(".ov").forEach(n=>n.classList.remove("ov"));const b=closest(x,y);if(b&&b!==D.el)b.classList.add("ov")};
const begin=(b,x,y)=>{const s=info(b),m=cur();if(s.t==="s"&&!(m.lineup||{})[s.k])return;if(s.t==="o"&&m.live)return;const g=document.createElement("div");g.className="ghost";g.textContent=b.textContent.replace(/\s+[ÚOB?]$/,"");document.body.appendChild(g);D={s,g,el:b};b.classList.add("dg");mv(x,y);navigator.vibrate&&navigator.vibrate(15)};
const drop=(s,t)=>{if(!t)return;const m=cur(),n=clone(m);n.lineup=n.lineup||{};let nom=nomOf(n).slice(),B=benchM(n);const lu=n.lineup,lock=!!n.live,lu0=JSON.stringify(n.lineup),nom0=JSON.stringify(nom);
const outT=t.t==="o"||(t.t==="z"&&t.z==="o");
if((s.t==="o"||outT)&&lock)return toast("Nominace je po zahájení zápasu uzamčena");
const un=id=>{nom=nom.filter(x=>x!==id);Object.keys(lu).forEach(k=>{if(lu[k]===id)delete lu[k]});if(n.gk===id)delete n.gk;B=B.filter(x=>x!==id)};
if(s.t==="s"){const p=lu[s.k];if(!p)return;
 if(t.t==="s"&&t.k!==s.k){const q=lu[t.k];lu[t.k]=p;if(q)lu[s.k]=q;else delete lu[s.k]}
 else if(t.t==="b"){const i=B.indexOf(t.id);lu[s.k]=t.id;B[i]=p}
 else if(t.t==="z"&&t.z==="b"){delete lu[s.k];B.push(p)}
 else if(outT)un(p);else return}
else if(s.t==="b"){
 if(t.t==="s"){const q=lu[t.k],i=B.indexOf(s.id);lu[t.k]=s.id;if(q)B[i]=q;else B.splice(i,1)}
 else if(t.t==="b"&&t.id!==s.id)return;
 else if(outT)un(s.id);else return}
else{
 if(t.t==="s"){nom.push(s.id);const q=lu[t.k];lu[t.k]=s.id;if(q)B.push(q)}
 else if(t.t==="b"||(t.t==="z"&&t.z==="b")){nom.push(s.id);B.push(s.id)}else return}
n.nom=nom;delete n.bn;if(!n.live&&(JSON.stringify(n.lineup)!==lu0||JSON.stringify(nom)!==nom0))n.luOk=false;if(n.live)syncLive(n.live,n,el_(n.live));upd(n)};
const end=(x,y)=>{if(!D)return;const b=closest(x,y),s=D.s;clr();blk=true;setTimeout(()=>blk=false,450);if(b)drop(s,info(b))};
root.querySelectorAll('[data-sl^="m:"],[data-bn],[data-on]').forEach(b=>{
if(b.dataset.sl)b.onclick=()=>{if(blk)return;S.pickAll=false;S.pick={slot:b.dataset.sl.slice(2),get:()=>clone(cur().lineup||{}),onCh:l=>{const n=clone(cur()),o=JSON.stringify(n.lineup||{});n.lineup=l;if(!n.live&&JSON.stringify(l)!==o)n.luOk=false;if(n.live)syncLive(n.live,n,el_(n.live));upd(n)},pool:nomOf(cur())};modal()};
if(b.dataset.on)b.onclick=()=>{if(blk||cur().live)return;const n=clone(cur());n.nom=[...nomOf(n),b.dataset.on];save(n)};
b.addEventListener("contextmenu",e=>e.preventDefault());
b.addEventListener("touchstart",e=>{const t=e.touches[0];clearTimeout(timer);b._s={x:t.clientX,y:t.clientY};timer=setTimeout(()=>begin(b,t.clientX,t.clientY),320)},{passive:true});
b.addEventListener("touchmove",e=>{const t=e.touches[0];if(D){e.preventDefault();mv(t.clientX,t.clientY)}else if(Math.abs(t.clientX-b._s.x)+Math.abs(t.clientY-b._s.y)>10)clearTimeout(timer)},{passive:false});
b.addEventListener("touchend",e=>{clearTimeout(timer);if(D){e.preventDefault();end(D.x,D.y)}});
b.addEventListener("touchcancel",()=>{clearTimeout(timer);clr()});
b.addEventListener("mousedown",e=>{if(e.button!==0)return;const sx=e.clientX,sy=e.clientY;
const mm=ev=>{if(!D&&Math.abs(ev.clientX-sx)+Math.abs(ev.clientY-sy)>6)begin(b,ev.clientX,ev.clientY);if(D)mv(ev.clientX,ev.clientY)};
const mu=ev=>{document.removeEventListener("mousemove",mm);document.removeEventListener("mouseup",mu);end(ev.clientX,ev.clientY)};
document.addEventListener("mousemove",mm);document.addEventListener("mouseup",mu)})})}
export function pickModal(){const P=S.pick;if(!P)return"";const lu=P.get(),sl=P.slot;
const want=sl[0]==="G"?POS[2]:/(LO|PO)$/.test(sl)?POS[1]:POS[0];
const lab=want===POS[2]?"brankářky":want===POS[1]?"obránkyně":"útočnice";
const used=Object.entries(lu).filter(([k])=>k!==sl).map(([k,v])=>v);
let l=S.pl.filter(p=>(!P.pool||P.pool.includes(p.id))&&!used.includes(p.id)&&(stOf(p)!=="end"||lu[sl]===p.id));
const fit=p=>p.pos===want||p.alt===want||!p.pos,rk=p=>p.pos===want?0:p.alt===want?1:!p.pos?2:3;
const hid=l.filter(p=>!fit(p)&&lu[sl]!==p.id).length;
if(!S.pickAll)l=l.filter(p=>fit(p)||lu[sl]===p.id);
l.sort((x,y)=>rk(x)-rk(y)||x.name.localeCompare(y.name,"cs"));
return`<div class="md" id="bg"><div class="mb"><h2>${sl} – ${S.pickAll?"všechny volné hráčky":lab}</h2><div class="chips">${l.map(p=>`<button class="chip ${lu[sl]===p.id?"on":""}" data-pp="${p.id}">${pn(p.id)}<small class="mu"> ${p.pos===want?"":p.alt===want?"záloha":esc(p.pos||"?")}</small></button>`).join("")||`<div class="msg">${P.pool&&!P.pool.length?"Nejdřív nominuj hráčky.":"Žádná volná hráčka na tuto pozici."}</div>`}</div>${!S.pickAll&&hid?`<button class="s w" data-pp="all" style="margin-bottom:8px">Zobrazit i ostatní (${hid})</button>`:""}<div class="row"><button class="s" data-pp="">Vyprázdnit</button><button class="s" data-pp="x">Zavřít</button></div></div></div>`}
