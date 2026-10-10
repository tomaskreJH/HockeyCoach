// Soupeři a vzájemné zápasy.
import {ensureOp, save} from "../core/actions.js";
import {pn, score, vsOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {$, clone, esc, fd, norm, toast} from "../core/utils.js";
import {render} from "./shell.js";

export function h2h(name,ex,title){const L=vsOf(name,ex);
if(!L.length)return`<h2>${title}</h2><div class="mu">Zatím žádný uzavřený zápas s tímto soupeřem.</div>`;
let w=0,d=0,l=0,gf=0,ga=0;const sc={},op={};
L.forEach(x=>{const[g,o]=score(x);gf+=g;ga+=o;if(g>o)w++;else if(g<o)l++;else d++;
(x.events||[]).forEach(e=>{if(e.k==="G"&&e.team==="us")[["g",e.scorer],["a",e.a1],["a",e.a2]].forEach(([f,id])=>{if(id){sc[id]=sc[id]||{g:0,a:0};sc[id][f]++}})});
(x.opr||[]).forEach(r=>{const k=norm(r.num)+"|"+norm(r.name),t=op[k]=op[k]||{num:r.num,name:r.name,g:0,a:0,pim:0,n:0};t.g+=+r.g||0;t.a+=+r.a||0;t.pim+=+r.pim||0;t.n++})});
const top=Object.entries(sc).sort((x,y)=>(y[1].g+y[1].a)-(x[1].g+x[1].a)).slice(0,5),tp=Object.values(op).sort((x,y)=>(y.g+y.a)-(x.g+x.a)).slice(0,6);
return`<h2>${title}</h2><div class="grid3"><div class="stat"><b>${w}-${d}-${l}</b>V–R–P</div><div class="stat"><b>${gf}:${ga}</b>skóre</div><div class="stat"><b>${L.length}</b>zápasů</div></div>
<h3>Předchozí zápasy</h3>${L.map(x=>{const[g,o]=score(x);return`<div class="mu">${fd(x.date)} · ${x.home?"doma":"venku"} · <b>${g}:${o}</b></div>`}).join("")}
${top.length?`<h3>Naše nejlepší proti nim</h3>${top.map(([id,t])=>`<div class="mu">${pn(id)} – ${t.g} G, ${t.a} A</div>`).join("")}`:""}
${tp.length?`<h3>Jejich hráčky ze statistik</h3>${tp.map(t=>`<div class="mu">${t.num?"#"+esc(t.num)+" ":""}${esc(t.name||"")} – ${t.g} G, ${t.a} A, ${t.pim} TM (${t.n}×)</div>`).join("")}`:""}`}
export function oppsView(a){
if(S.oid){const o=S.op.find(x=>x.id===S.oid);if(o)return oppDetail(a,o);S.oid=null}
const l=[...S.op].sort((x,y)=>x.name.localeCompare(y.name,"cs"));
a.innerHTML=`<div class="cd"><h2>Přidat soupeře</h2><div class="row" style="flex-wrap:nowrap"><input id="oi" placeholder="Název soupeře" style="margin:0"><button class="p" id="oa" style="flex:none">Přidat</button></div></div><div class="cd"><h2>Soupeři (${l.length})</h2>${l.length?l.map(o=>`<div class="it" data-o="${o.id}"><b>${esc(o.name)}</b><span class="mu">${vsOf(o.name).length} zápasů</span></div>`).join(""):'<div class="msg">Zatím žádní soupeři. Přidají se i automaticky při založení zápasu.</div>'}</div>`;
$("#oa").onclick=()=>{const n=$("#oi").value.trim();if(!n)return;ensureOp(n)};
a.querySelectorAll("[data-o]").forEach(i=>i.onclick=()=>{S.oid=i.dataset.o;render()})}
export function oppDetail(a,o){const n=S.ma.filter(x=>norm(x.opp)===norm(o.name)).length;
a.innerHTML=`<button class="s" id="bk" style="margin-bottom:12px">← Soupeři</button><div class="cd"><label>Název soupeře</label><div class="row" style="flex-wrap:nowrap"><input id="rn2" value="${esc(o.name)}" style="margin:0"><button class="s" id="rs" style="flex:none">Přejmenovat</button></div></div><div class="cd">${h2h(o.name,null,"Vzájemné zápasy")}</div><button class="d w" id="od" style="${S.cf===o.id?"background:var(--no);color:#fff":""}">${n?"Soupeř má zápasy – nelze smazat":S.cf===o.id?"Opravdu smazat? Klepni znovu":"Smazat soupeře"}</button>`;
$("#bk").onclick=()=>{S.oid=null;render()};
$("#rs").onclick=()=>{const nn=$("#rn2").value.trim();if(!nn)return;const old=o.name;S.db.doc("opponents/"+o.id).set({name:nn});if(norm(nn)!==norm(old))S.ma.filter(m=>norm(m.opp)===norm(old)).forEach(m=>save({...clone(m),opp:nn}));toast("Přejmenováno")};
$("#od").onclick=()=>{if(n)return;if(S.cf===o.id){S.cf=null;S.db.doc("opponents/"+o.id).delete();S.oid=null}else{S.cf=o.id;render();setTimeout(()=>{if(S.cf===o.id){S.cf=null;render()}},4000)}}}
