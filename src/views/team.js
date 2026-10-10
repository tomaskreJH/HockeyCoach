// Záložka Team: soupiska, základní formace, náhradnice, přetahování.
import {POS, ST} from "../config/constants.js";
import {saveDef} from "../core/actions.js";
import {PG, pl, pn, pri, stOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {$, clone, esc, toast} from "../core/utils.js";
import {benchOrder} from "../domain/lineup.js";
import {luEditor} from "./lineup-editor.js";
import {modal} from "./modal.js";
import {render} from "./shell.js";

export function players(a){const cnt=k=>S.pl.filter(p=>stOf(p)===k).length;const l=S.pl.filter(p=>(S.pf==="all"||stOf(p)===S.pf)&&(S.pq==="all"||(p.pos||"")===S.pq)).sort((x,y)=>pri(x)-pri(y)||x.name.localeCompare(y.name,"cs"));
a.innerHTML=`<div class="cd"><h2>Přidat hráče</h2><div class="row"><div style="flex:3"><label>Přezdívka / jméno</label><input id="n"></div><div><label>Číslo</label><input id="c" inputmode="numeric"></div></div>
<div class="row"><div><label>Pozice</label><select id="p">${POS.map(x=>`<option>${x}</option>`).join("")}<option value="">Neurčeno</option></select></div><div><label>Alternativní pozice</label><select id="q"><option value="">–</option>${POS.map(x=>`<option>${x}</option>`).join("")}</select></div></div>
<button class="p w" id="add">Přidat</button></div>
<div class="cd"><div class="row" style="align-items:center;flex-wrap:nowrap"><h2 style="margin:0;flex:1">Soupiska (${l.length})</h2><button class="s" id="ft" style="flex:none">Filtry ${S.fo?"▴":"▾"}</button></div>
<div class="mu" style="margin:6px 0 4px">${({act:"Aktivní",inj:"Zranění",end:"Ukončili",all:"Všichni"})[S.pf]} · ${S.pq==="all"?"všechny pozice":S.pq===""?"Neurčeno":S.pq}</div>
${S.fo?`<h3>Pozice</h3><div class="chips">${[["all","Všechny"],...POS.map(x=>[x,x+" ("+S.pl.filter(p=>p.pos===x&&(S.pf==="all"||stOf(p)===S.pf)).length+")"]),["","Neurčeno"]].map(([k,t])=>`<button class="chip ${S.pq===k?"on":""}" data-pq="${k}">${t}</button>`).join("")}</div><h3>Stav</h3><div class="chips">${[["act","Aktivní ("+cnt("act")+")"],["inj","Zranění ("+cnt("inj")+")"],["end","Ukončili ("+cnt("end")+")"],["all","Všichni ("+S.pl.length+")"]].map(([k,t])=>`<button class="chip ${S.pf===k?"on":""}" data-pf="${k}">${t}</button>`).join("")}</div>`:""}
${l.length?l.map((p,i)=>(S.pq==="all"&&(i===0||pri(l[i-1])!==pri(p))?`<h3>${PG[pri(p)]}</h3>`:"")+`<div class="it"><div><b>${pn(p.id)}</b><div class="mu">${esc(p.pos||"")}${p.alt?" / "+esc(p.alt):""}${stOf(p)!=="act"?` · <span class="tag ${stOf(p)==="inj"?"sh":"red"}">${ST[stOf(p)]}</span>`:""}</div></div><div class="row" style="flex:none;flex-wrap:nowrap"><button class="s" data-e="${p.id}" style="padding:8px 12px">Upravit</button><button class="d" data-d="${p.id}" style="padding:8px 12px;${S.cf===p.id?"background:var(--no);color:#fff":""}">${S.cf===p.id?"Opravdu smazat?":"Smazat"}</button></div></div>`).join(""):'<div class="msg">V tomto výběru nikdo není.</div>'}</div>`;
$("#ft").onclick=()=>{S.fo=!S.fo;render()};
a.querySelectorAll("[data-pq]").forEach(b=>b.onclick=()=>{S.pq=b.dataset.pq;render()});
a.querySelectorAll("[data-pf]").forEach(b=>b.onclick=()=>{S.pf=b.dataset.pf;render()});
$("#add").onclick=()=>{const n=$("#n").value.trim();if(!n)return;S.db.collection("players").add({name:n,num:$("#c").value.trim(),pos:$("#p").value,alt:$("#q").value,st:"act"}).catch(()=>toast("Uložení se nepovedlo"))};
a.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>{const p=pl(b.dataset.e);S.M={k:"EP",id:p.id,name:p.name||"",num:p.num||"",pos:p.pos||"",alt:p.alt||"",st:stOf(p)};modal()});
a.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{const id=b.dataset.d;if(S.cf===id){S.cf=null;S.db.doc("players/"+id).delete().catch(()=>toast("Smazání se nepovedlo"))}else{S.cf=id;render();setTimeout(()=>{if(S.cf===id){S.cf=null;render()}},4000)}})}
export function formV(a){const lu=S.def.lu||{},B=benchOrder();
a.innerHTML=`<div class="cd"><h2>Základní formace</h2><div class="mu" style="margin-bottom:10px">Tato sestava se zkopíruje do každého nového zápasu, kde ji můžeš upravit.</div><div class="mu" style="margin-bottom:6px">Klepnutím vybereš hráčku na místo. Podržením a přetažením ji přesuneš na jiné místo nebo mezi náhradnice (obsazené místo se prohodí).</div><div class="tw">${luEditor(lu,0,"d:")}</div></div>
<div class="cd"><h2>Náhradnice (${B.length})</h2><div class="mu" style="margin-bottom:8px">Nezařazené hráčky. Přetažením je dáš na místo v sestavě, nebo je prohodíš mezi sebou. Sestavu sem můžeš vrátit přetažením místa na tuto plochu.</div><div class="bz" data-bz="1">${B.map(id=>`<button class="chip bn" data-bn="${id}">${pn(id)} <small class="mu">${esc((pl(id).pos||"?")[0])}</small></button>`).join("")||'<span class="mu">Všechny hráčky jsou v sestavě.</span>'}</div></div>
<div id="plw"></div>`;
teamDrag(a);players($("#plw"))}
export function teamDrag(root){let D=null,timer=null,blk=false;const SEL='[data-sl^="d:"],[data-bn],[data-bz]';
const closest=(x,y)=>{const e=document.elementFromPoint(x,y);return e&&e.closest?e.closest(SEL):null};
const info=b=>b.dataset.bn?{t:"b",id:b.dataset.bn}:b.dataset.sl?{t:"s",k:b.dataset.sl.slice(2)}:{t:"z"};
const clr=()=>{if(D&&D.g)D.g.remove();root.querySelectorAll(".ov,.dg").forEach(n=>n.classList.remove("ov","dg"));D=null};
const mv=(x,y)=>{D.x=x;D.y=y;D.g.style.left=x+"px";D.g.style.top=y+"px";root.querySelectorAll(".ov").forEach(n=>n.classList.remove("ov"));const b=closest(x,y);if(b&&b!==D.el)b.classList.add("ov")};
const begin=(b,x,y)=>{const s=info(b);if(s.t==="s"&&!(S.def.lu||{})[s.k])return;const g=document.createElement("div");g.className="ghost";g.textContent=b.textContent.replace(/\s+[ÚOB?]$/,"");document.body.appendChild(g);D={s,g,el:b};b.classList.add("dg");mv(x,y);navigator.vibrate&&navigator.vibrate(15)};
const drop=(s,t)=>{if(!t)return;const lu=clone(S.def.lu||{});let B=benchOrder();
if(s.t==="s"){const p=lu[s.k];if(!p)return;
 if(t.t==="s"&&t.k!==s.k){const q=lu[t.k];lu[t.k]=p;if(q)lu[s.k]=q;else delete lu[s.k]}
 else if(t.t==="b"){const i=B.indexOf(t.id);lu[s.k]=t.id;B[i]=p}
 else if(t.t==="z"){delete lu[s.k];B.push(p)}else return}
else{if(t.t==="s"){const q=lu[t.k],i=B.indexOf(s.id);lu[t.k]=s.id;if(q)B[i]=q;else B.splice(i,1)}
 else if(t.t==="b"&&t.id!==s.id){const i=B.indexOf(s.id),j=B.indexOf(t.id);[B[i],B[j]]=[B[j],B[i]]}else return}
S.def={lu,bn:B};saveDef(lu,B)};
const end=(x,y)=>{if(!D)return;const b=closest(x,y),s=D.s;clr();blk=true;setTimeout(()=>blk=false,450);if(b)drop(s,info(b))};
root.querySelectorAll('[data-sl^="d:"],[data-bn]').forEach(b=>{
if(b.dataset.sl)b.onclick=()=>{if(blk)return;S.pickAll=false;S.pick={slot:b.dataset.sl.slice(2),get:()=>clone(S.def.lu||{}),onCh:lu=>saveDef(lu,(S.def||{}).bn||[]),pool:undefined};modal()};
b.addEventListener("contextmenu",e=>e.preventDefault());
b.addEventListener("touchstart",e=>{const t=e.touches[0];clearTimeout(timer);b._s={x:t.clientX,y:t.clientY};timer=setTimeout(()=>begin(b,t.clientX,t.clientY),320)},{passive:true});
b.addEventListener("touchmove",e=>{const t=e.touches[0];if(D){e.preventDefault();mv(t.clientX,t.clientY)}else if(Math.abs(t.clientX-b._s.x)+Math.abs(t.clientY-b._s.y)>10)clearTimeout(timer)},{passive:false});
b.addEventListener("touchend",e=>{clearTimeout(timer);if(D){e.preventDefault();end(D.x,D.y)}});
b.addEventListener("touchcancel",()=>{clearTimeout(timer);clr()});
b.addEventListener("mousedown",e=>{if(e.button!==0)return;const sx=e.clientX,sy=e.clientY;
const mm=ev=>{if(!D&&Math.abs(ev.clientX-sx)+Math.abs(ev.clientY-sy)>6)begin(b,ev.clientX,ev.clientY);if(D)mv(ev.clientX,ev.clientY)};
const mu=ev=>{document.removeEventListener("mousemove",mm);document.removeEventListener("mouseup",mu);end(ev.clientX,ev.clientY)};
document.addEventListener("mousemove",mm);document.addEventListener("mouseup",mu)})})}
