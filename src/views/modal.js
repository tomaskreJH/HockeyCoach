// Modální okna (gól, vyloučení, nový zápas, úprava hráčky).
import {LN, POS, REA, SIT, ST} from "../config/constants.js";
import {ensureOp, save} from "../core/actions.js";
import {isG, lineIds, liveIds, luPlayers, pl, pn, stOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {$, clone, esc, norm, td, toast, uid} from "../core/utils.js";
import {addPen, el_, fitLayout, goalPen, migrate, procExp} from "../domain/live-engine.js";
import {pickModal} from "./lineup-editor.js";
import {render} from "./shell.js";

export function chips(key,ids,sel,multi){return`<div class="chips">${ids.map(id=>`<button class="chip ${(multi?(sel||[]).includes(id):sel===id)?"on":""}" data-k="${key}" data-id="${id}">${pn(id)}</button>`).join("")||'<span class="mu">Nejdřív nastav sestavu zápasu.</span>'}</div>`}
export function opts(key,arr,sel){return`<div class="chips">${arr.map(([v,l])=>`<button class="chip ${String(sel)===String(v)?"on":""}" data-v="${key}" data-val="${v}">${l}</button>`).join("")}</div>`}
export function modal(){const el=$("#mod");const M=S.M;
if(S.pick){el.innerHTML=pickModal();const P=S.pick;
el.querySelectorAll("[data-pp]").forEach(b=>b.onclick=()=>{const v=b.dataset.pp;if(v==="all"){S.pickAll=true;return modal()}if(v==="x"){S.pick=null;return modal()}const lu=P.get();Object.keys(lu).forEach(k=>{if(v&&lu[k]===v)delete lu[k]});if(v)lu[P.slot]=v;else delete lu[P.slot];S.pick=null;P.onCh(lu);modal()});
$("#bg").onclick=e=>{if(e.target.id==="bg"){S.pick=null;modal()}};return}
if(!M){el.innerHTML="";return}
if(M.k==="NEW"||M.k==="EM"){el.innerHTML=`<div class="md" id="bg"><div class="mb"><h2>${M.k==="EM"?"Upravit zápas":"Nový zápas"}</h2><label>Soupeř (vyber, nebo napiš nového)</label>${S.op.length?`<div class="chips">${[...S.op].sort((x,y)=>x.name.localeCompare(y.name,"cs")).map(o=>`<button class="chip ${norm(M.opp)===norm(o.name)?"on":""}" data-oc="${o.id}">${esc(o.name)}</button>`).join("")}</div>`:""}<input id="o" value="${esc(M.opp)}" placeholder="Název soupeře"><label>Datum</label><input type="date" id="d" value="${M.date}">${opts("home",[[1,"Doma"],[0,"Venku"]],M.home?1:0)}${M.k==="NEW"?`<label>Délka třetiny</label>${opts("plen",[[15,"15 min"],[20,"20 min"],[25,"25 min"]],M.perLen||20)}`:""}<div class="row"><button class="p" id="ok">${M.k==="EM"?"Uložit":"Vytvořit"}</button><button class="s" id="cl">Zrušit</button></div></div></div>`;
const sy=()=>{M.opp=$("#o").value;M.date=$("#d").value};bindV(sy);el.querySelectorAll("[data-oc]").forEach(b=>b.onclick=()=>{sy();M.opp=S.op.find(o=>o.id===b.dataset.oc).name;modal()});$("#cl").onclick=()=>{S.M=null;modal()};
$("#ok").onclick=async()=>{sy();const o=M.opp.trim();if(!o)return toast("Zadej soupeře");if(M.k==="EM"){const mm=S.ma.find(x=>x.id===M.id);if(mm&&mm.live)toast("Zápas je zahájen – údaje nelze měnit");else if(mm){save({...clone(mm),opp:o,date:M.date||td(),home:M.home});ensureOp(o)}S.M=null;return modal()}const nom0=S.pl.filter(p=>stOf(p)==="act").map(p=>p.id);const r=await S.db.collection("matches").add({date:M.date||td(),opp:o,home:M.home,perLen:M.perLen||20,lineup:Object.fromEntries(Object.entries(S.def.lu||{}).filter(([k,v])=>nom0.includes(v))),nom:nom0,events:[]}).catch(()=>toast("Uložení se nepovedlo"));S.M=null;if(r){S.mid=r.id;S.step=1;ensureOp(o)}render()};return}
if(M.k==="EP"){el.innerHTML=`<div class="md" id="bg"><div class="mb"><h2>Upravit hráče</h2><div class="row"><div style="flex:3"><label>Přezdívka / jméno</label><input id="en" value="${esc(M.name)}"></div><div><label>Číslo</label><input id="ec" inputmode="numeric" value="${esc(M.num)}"></div></div><div class="row"><div><label>Pozice</label><select id="ep">${POS.map(x=>`<option ${x===M.pos?"selected":""}>${x}</option>`).join("")}<option value="" ${M.pos?"":"selected"}>Neurčeno</option></select></div><div><label>Alternativní pozice</label><select id="eq"><option value="">–</option>${POS.map(x=>`<option ${x===M.alt?"selected":""}>${x}</option>`).join("")}</select></div></div><label>Stav</label><div class="chips">${Object.entries(ST).map(([k,t])=>`<button class="chip ${M.st===k?"on":""}" data-es="${k}">${t}</button>`).join("")}</div><div class="mu" style="margin-bottom:10px">Ukončení hráči zmizí z výběrů a ze soupisky, zůstanou jen v historických statistikách.</div><div class="row"><button class="p" id="ok">Uložit</button><button class="s" id="cl">Zrušit</button></div></div></div>`;
$("#cl").onclick=()=>{S.M=null;modal()};$("#bg").onclick=e=>{if(e.target.id==="bg"){S.M=null;modal()}};
const rd=()=>{M.name=$("#en").value;M.num=$("#ec").value;M.pos=$("#ep").value;M.alt=$("#eq").value};
el.querySelectorAll("[data-es]").forEach(b=>b.onclick=()=>{rd();M.st=b.dataset.es;modal()});
$("#ok").onclick=()=>{rd();const n=M.name.trim();if(!n)return toast("Zadej jméno");S.db.doc("players/"+M.id).set({name:n,num:M.num.trim(),pos:M.pos,alt:M.alt,st:M.st}).then(()=>{S.M=null;modal()}).catch(()=>toast("Uložení se nepovedlo"))};return}
const m=S.ma.find(x=>x.id===S.mid),lu=m.lineup||{},inl=luPlayers(lu);const lvA=m.live&&!M.all?liveIds(m.live):inl,lvS=m.live&&!M.all?liveIds(m.live).filter(i=>i!==m.live.G):inl;
let h=`<h2>${M.eid?"✏️ ":""}${M.k==="G"?(M.team==="us"?"⚽ Gól HC Střelych":"⚽ Gól soupeře"):"🚫 Vyloučení"}</h2><label>Třetina</label>${opts("per",[[1,"1."],[2,"2."],[3,"3."],[4,"Prodl."]],M.per)}<label>Čas ve třetině (volitelně)</label><input id="tm" placeholder="např. 12:35" value="${esc(M.time)}" style="max-width:160px">${m.live&&!M.all?'<div><button class="s" data-all style="margin-bottom:10px">Zobrazit celou sestavu</button></div>':""}`;
if(M.k==="G"){h+=`<label>Situace</label>${opts("sit",Object.entries(SIT),M.sit)}`;
if(M.team==="us")h+=`<label>Střelec</label>${chips("scorer",lvS,M.scorer)}<label>Asistence 1</label>${chips("a1",lvS.filter(i=>i!==M.scorer&&i!==M.a2),M.a1)}<label>Asistence 2</label>${chips("a2",lvS.filter(i=>i!==M.scorer&&i!==M.a1),M.a2)}`;
h+=`<label>${M.team==="us"?"Další hráči na ledě":"Kdo byl na ledě"} (celá pětka jedním klepnutím)</label><div class="chips">${LN.map(n=>`<button class="chip" data-line="${n}">${n}. pětka</button>`).join("")}</div>${chips("on",lvA,M.on,true)}`}
else h+=`<label>Tým</label>${opts("team",[["us","HC Střely"],["opp","Soupeř"]],M.team)}${M.team==="us"?`<label>Hráč</label>${chips("pid",lvA,M.pid)}`:""}<label>Délka</label>${opts("min",[[2,"2 min"],[4,"2+2"],[5,"5 min"],[10,"10 osobní"],[20,"Do konce"]],M.min)}<label>Důvod</label><div class="chips">${REA.map(r=>`<button class="chip ${M.reason===r?"on":""}" data-v="reason" data-val="${r}">${r}</button>`).join("")}</div>`;
h+=`<div class="row" style="margin-top:8px"><button class="p" id="ok">Uložit</button><button class="s" id="cl">Zrušit</button></div>`;
el.innerHTML=`<div class="md" id="bg"><div class="mb">${h}</div></div>`;
const sync=()=>{const t=$("#tm");if(t)M.time=t.value.trim()};
el.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{sync();const k=b.dataset.k,id=b.dataset.id;if(k==="on")M.on=M.on.includes(id)?M.on.filter(x=>x!==id):[...M.on,id];else{M[k]=M[k]===id?null:id;if(k==="scorer"&&M.scorer){if(M.a1===M.scorer)M.a1=null;if(M.a2===M.scorer)M.a2=null}}modal()});
el.querySelectorAll("[data-line]").forEach(b=>b.onclick=()=>{sync();const ids=lineIds(lu,b.dataset.line);const all=ids.every(i=>M.on.includes(i));M.on=all?M.on.filter(i=>!ids.includes(i)):[...new Set([...M.on,...ids])];modal()});
bindV(sync);el.querySelectorAll("[data-all]").forEach(b=>b.onclick=()=>{sync();M.all=true;modal()});$("#cl").onclick=()=>{S.M=null;modal()};
$("#ok").onclick=()=>{sync();const e={id:M.eid||uid(),k:M.k,team:M.team,per:M.per,time:M.time};
if(M.k==="G"){e.sit=M.sit;if(M.team==="us"){if(!M.scorer)return toast("Vyber střelce");e.scorer=M.scorer;e.a1=M.a1||null;e.a2=M.a2||null;e.on=[...new Set([M.scorer,M.a1,M.a2,...M.on].filter(Boolean))]}else{e.on=M.on;e.gk=(M.on.map(pl).find(x=>isG(x))||{}).id||null}}
else{e.min=M.min;e.reason=M.reason;if(M.team==="us"){if(!M.pid)return toast("Vyber hráče");e.pid=M.pid}}
const n=clone(m);n.events=[...(n.events||[]).filter(x=>x.id!==M.eid),e].sort((a,b)=>a.per-b.per||(a.time||"99:99").localeCompare(b.time||"99:99"));if(m.live&&!M.eid&&(M.k==="P"||M.k==="G")){const L=n.live;migrate(L);const now=el_(L),snap=clone(L);delete snap.u;procExp(L,now);let ret=null;
if(M.k==="P")addPen(L,{t:M.team,p:M.team==="us"?M.pid:null,min:M.min},now,m);else ret=goalPen(L,M.team,now);fitLayout(L,now);
L.u=[...(L.u||[]),{l:snap,ids:[e.id],t:M.k==="P"?"Vyloučení":"Gól"}].slice(-15);if(ret)toast("Gól ukončil trest – na led se vrací "+((pl(ret)||{}).name||""))}save(n);S.M=null;modal()};
$("#bg").onclick=e=>{if(e.target.id==="bg"){S.M=null;modal()}}}
export function bindV(sync){$("#mod").querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{sync&&sync();const k=b.dataset.v,v=b.dataset.val;S.M[k]=k==="home"?v==="1":(["per","min","plen"].includes(k)?+v:v);if(k==="team"&&S.M.k==="P")S.M.pid=null;modal()})}
