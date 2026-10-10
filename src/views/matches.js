// Seznam zápasů a detail zápasu (průvodce kroky).
import {REA, SIT, UGRP, UK, ULAB, USLOT, slab} from "../config/constants.js";
import {save, upd} from "../core/actions.js";
import {PG, nomOf, pl, pn, pri, score, shots, skaters, stOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {$, Q, clone, esc, fd, td, toast, uid} from "../core/utils.js";
import {benchM, fillDef, readiness} from "../domain/lineup.js";
import {initLive} from "../domain/live-engine.js";
import {benchGrouped, bindLu, luEditor, matchDrag} from "./lineup-editor.js";
import {liveRender} from "./live.js";
import {modal} from "./modal.js";
import {h2h} from "./opponents.js";
import {matchStatsHtml, renderReport} from "./report.js";
import {render} from "./shell.js";

export function matches(a){if(S.mid){const m=S.ma.find(x=>x.id===S.mid);if(m){S.mt=0;return detail(a,m)}if(!S.mt)S.mt=Date.now();if(Date.now()-S.mt<4000){a.innerHTML='<div class="msg">Načítám zápas…</div>';setTimeout(render,500);return}S.mid=null;S.mt=0}
const l=[...S.ma].sort((x,y)=>y.date.localeCompare(x.date));
a.innerHTML=`<button class="p w" id="nw" style="margin-bottom:12px">+ Nový zápas</button><div class="cd">${l.length?l.map(m=>{const[g,o]=score(m);return`<div class="it" data-id="${m.id}"><div><b>${esc(m.opp)}</b><div class="mu">${fd(m.date)} · ${m.home?"doma":"venku"}</div></div><div><b style="font-size:20px">${m.closed?"🔒 ":""}${g}:${o}</b> <span class="tag ${g>o?"pp":g<o?"red":""}">${g>o?"V":g<o?"P":"R"}</span></div></div>`}).join(""):'<div class="msg">Žádné zápasy.</div>'}</div>`;
$("#nw").onclick=()=>{S.M={k:"NEW",date:td(),opp:"",home:true};modal()};
a.querySelectorAll(".it").forEach(i=>i.onclick=()=>{S.mid=i.dataset.id;S.showLu=false;S.showNom=false;S.step=1;render()})}
export function detail(a,m){const[g,o]=score(m);const ev=(m.events||[]).map((e,i)=>({e,i})).sort((x,y)=>y.e.per-x.e.per||(y.e.time||"").localeCompare(x.e.time||"")||y.i-x.i).map(x=>x.e);const sh=shots(m),sk=skaters(m.lineup),gk=m.gk||(m.lineup||{}).G1,ge=m.events||[];const tm=e=>e.per+". tř."+(e.time?" "+esc(e.time):"");
const lu=m.lineup||{},nom=nomOf(m),lk=!!m.closed,opr=m.opr||[],sg=opr.reduce((x,r)=>x+(+r.g||0),0),sNm=!lk&&!m.live,st=S.step||1,NM=["Zápas","Sestava","Zápas živě"],R0=readiness(m),BM=benchM(m),ph=m.live||lk?"lu":(!R0.nom.ok?"nom":(S.ph||"lu")),OUT=S.pl.filter(p=>stOf(p)!=="end"&&!nom.includes(p.id)).sort((x,y)=>pri(x)-pri(y)||x.name.localeCompare(y.name,"cs")).map(p=>p.id);
const startCard=sn=>`<div class="cd" data-s="${sn}"><h2>Živý zápis</h2>${lk?'<div class="mu">Zápas je uzavřený.</div>':m.live?'<button class="p w" data-lvo style="padding:20px">▶ Pokračovat v živém zápisu</button>':`<div class="ev"><div class="b">${R0.nom.ok?"✅":"⛔"} ${R0.nom.txt}</div></div><div class="ev"><div class="b">${R0.lu.ok?"✅":"⛔"} ${R0.lu.txt}</div></div>${R0.nom.ok&&R0.lu.ok?'<button class="p w" data-lvs style="padding:20px;margin-top:10px">Zahájit zápas</button>':`<button class="p w" data-fx style="padding:16px;margin-top:10px">${!R0.nom.ok?"Dokončit nominaci →":"Dokončit sestavu →"}</button>`}`}</div>`;
a.innerHTML=`<div class="${lk?"lk":""} stp" data-cur="${st}"><div class="cd" style="padding:10px 14px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${esc(m.opp)}</b><span class="mu">${fd(m.date)} · ${m.home?"doma":"venku"} · ${m.perLen||20} min</span></div><div class="mu" style="margin-top:4px">${R0.nom.ok?"✅":"⛔"} Nominace · ${R0.lu.ok?"✅":"⛔"} Sestava${m.live&&!lk?" · ▶ zápas běží":""}${lk?" · 🔒 uzavřeno":""}</div></div><div class="chips" style="margin-bottom:10px">${NM.map((t,i)=>`<button class="chip ${st===i+1?"on":""}" data-st="${i+1}">${i+1} ${t}</button>`).join("")}</div>
<div class="cd" data-s="1"><div class="sc">${g} : ${o}</div><div style="text-align:center"><b>${m.home?"HC Střely – "+esc(m.opp):esc(m.opp)+" – HC Střely"}</b></div>${lk?'<div style="text-align:center;margin-top:6px"><span class="tag red">🔒 Uzavřeno</span></div>':m.live?'<div class="mu" style="text-align:center;margin-top:8px">🔒 Zápas je zahájen – soupeř, datum a doma/venku už nelze měnit.</div>':'<button class="s w ed" id="em" style="margin-top:10px">✏️ Upravit soupeře, datum, doma/venku</button>'}</div>
${(()=>{const pm=m.perLen||20;return`<div class="cd" data-s="1"><h2>Délka třetiny</h2>${lk?`<div class="mu">${pm} min</div>`:`<div class="row" style="align-items:center;text-align:center;flex-wrap:nowrap"><button class="s" data-pl="-1" style="min-height:52px;flex:none;min-width:64px">−</button><b style="font-size:22px">${pm} min</b><button class="s" data-pl="1" style="min-height:52px;flex:none;min-width:64px">+</button></div><div class="mu" style="margin-top:6px">Standard je 20 min, prodloužení 5 min.</div>`}</div>`})()}
${startCard(1)}
<div class="cd" data-s="1">${h2h(m.opp,m.id,"Vzájemné zápasy – "+esc(m.opp))}</div>
${startCard(3)}
<div class="sc" data-s="3">${g} : ${o}</div>
<div class="cd" data-s="3"><h2>Průběh</h2>${ev.length?ev.map(e=>e.k==="G"?`<div class="ev"><div class="t">${tm(e)}</div><div class="b"><b>${e.team==="us"?"⚽ "+(e.scorer?pn(e.scorer):"?"):"⚽ Gól soupeře"}</b> <span class="tag ${e.sit==="PP"?"pp":e.sit==="SH"?"sh":""}">${SIT[e.sit]||SIT.E}</span>${e.team==="us"?`<div class="mu">Asistence: ${[e.a1,e.a2].filter(Boolean).map(pn).join(", ")||"bez asistence"}</div>`:""}<div class="mu">Na ledě: ${(e.on||[]).map(pn).join(", ")||"–"}</div></div></div>`:e.k==="S"?`<div class="ev"><div class="t">${tm(e)}</div><div class="b">${e.team==="us"?"🏒 Střela: <b>"+(e.shooter?pn(e.shooter):"?")+"</b>":"🏒 Střela soupeře"+(e.gk&&pl(e.gk)?'<div class="mu">Brankářka: '+pn(e.gk)+"</div>":"")}</div></div>`:`<div class="ev"><div class="t">${tm(e)}</div><div class="b"><b>🚫 ${e.team==="us"?(e.pid?pn(e.pid):"?"):"Soupeř"}</b> <span class="tag red">${e.min} min</span><div class="mu">${esc(e.reason||"")}</div></div></div>`).join(""):'<div class="msg">Zatím nic nezapsáno.</div>'}</div>
<div class="cd" data-s="3">${matchStatsHtml(m)}</div>
${m.live||(m.events||[]).length?`<div class="cd" data-s="3"><h2>Zápis utkání</h2><div class="mu" style="margin-bottom:8px">Souhrn pro trenéry a hráčky: výsledek, sestava, průběh, tresty a statistiky. Jde vytisknout nebo uložit.</div><button class="p w" data-rpt style="min-height:56px">📄 Otevřít zápis utkání</button></div>`:""}
${m.live&&!lk?'<div class="mu" data-s="2" style="margin-bottom:8px">🔒 Nominace je po zahájení zápasu uzamčena. Sestavu můžeš měnit i za zápasu (živý zápis → ⋯ → Sestava).</div>':""}
${m.live||lk?"":`<div class="chips" data-s="2"><button class="chip ${ph==="nom"?"on":""}" data-ph="nom">A  Nominace</button><button class="chip ${ph==="lu"?"on":""}" data-ph="lu" ${R0.nom.ok?"":'disabled style="opacity:.4"'}>B  Sestava</button></div>`}
${ph==="nom"?`<div class="cd" data-s="2"><h2>Nominace (${nom.length})</h2><div class="mu" style="margin-bottom:8px">Klepnutím vyber hráčky, které má trenér k dispozici.<br>${R0.nom.ok?"✅":"⛔"} ${R0.nom.txt}</div>${lk||m.live?`<div class="mu">${nom.map(pn).join(", ")||"–"}</div>`:`<div class="row" style="margin-bottom:8px"><button class="s" data-nall>Všechny aktivní</button><button class="s" data-nnone>Zrušit vše</button></div>${(()=>{const l=S.pl.filter(p=>stOf(p)!=="end"||nom.includes(p.id)).sort((x,y)=>pri(x)-pri(y)||x.name.localeCompare(y.name,"cs"));return l.map((p,i)=>(i===0||pri(l[i-1])!==pri(p)?(i?"</div>":"")+`<div class="lnl">${PG[pri(p)]}</div><div class="chips">`:"")+`<button class="chip ${nom.includes(p.id)?"on":""}" data-tn="${p.id}">${pn(p.id)}</button>`).join("")+(l.length?"</div>":"")})()}<button class="p w" data-gols style="margin-top:12px;min-height:56px" ${R0.nom.ok?"":"disabled"}>Pokračovat – sestava →</button>`}</div>`:`<div class="cd" data-s="2"><h2>Sestava zápasu</h2><div class="mu" style="margin-bottom:6px">${R0.lu.ok?"✅":R0.lu.done?"🟡":"⛔"} ${R0.lu.txt}</div>${lk?"":`<div class="mu" style="margin-bottom:6px">Klepnutím vybereš hráčku na místo, podržením a přetažením ji přesuneš nebo prohodíš.${m.live?" Změna se promítne do střídání.":""}</div>`}<div class="tw">${luEditor(lu,0,"m:")}</div>${lk||m.live?"":`<div class="row" style="margin-top:8px"><button class="s" data-fdef style="${S.cf==="f"+m.id?"background:var(--no);color:#fff":""}">${S.cf==="f"+m.id?"Opravdu přepsat? Klepni znovu":"↻ Podle základní formace"}</button></div>${m.luOk?'<button class="s w" data-luop style="margin-top:10px;min-height:52px">🔒 Sestava uzavřena – znovu otevřít</button>':`<button class="p w" data-lucl style="margin-top:10px;min-height:56px" ${R0.lu.done?"":"disabled"}>✔ Uzavřít sestavu</button>`}`}</div>
<div class="cd" data-s="2"><h2>Náhradnice (${BM.length})</h2><div class="mu" style="margin-bottom:8px">Nominované hráčky mimo sestavu, rozdělené podle pozic. Přetáhni je na místo v sestavě.</div><div class="bz" data-bz="b">${benchGrouped(m)}</div></div>`}
${ph==="lu"?`<div class="cd" data-s="2"><h2>Přesilovky a oslabení</h2><div class="mu" style="margin-bottom:8px">Formace 5:5 jsou řady výše. Zvlášť určuješ přesilovky (5 hráček), oslabení se 4 hráčkami (střed, útočník Ú, oba obránci) a oslabení se 3 hráčkami (střed a dva obránci). Hráčka může být v každém druhu jen jednou (např. jen v jedné přesilovce a jen v jednom oslabení 4 hráčky), mezi druhy se překrývat smí. Kombinace si můžeš zvolit libovolně. Za zápasu jdou jednotky měnit v menu živého zápisu.</div><div class="tw">${UK.map(k=>{const u=(m.sp||{})[k]||{};return`<div class="lnl">${ULAB[k]}</div><div class="ln">${USLOT[k].map(c=>{const id=u[c];return`<button class="sl ${id&&pl(id)?"f":""}" data-sl="${k}:${c}"><small>${slab(k,c)}</small>${id&&pl(id)?pn(id):"+"}</button>`}).join("")}</div>`}).join("")}</div><button class="s w ed" id="cpsp" style="margin-top:6px">Zkopírovat z posledního zápasu</button></div>`:""}

${lk?`<div class="cd" data-s="3"><b>🔒 Zápas je uzavřený</b><div class="mu">Nic v něm nejde měnit. Pokud je potřeba oprava, otevři ho znovu.</div><button class="s w" id="ro" style="margin-top:8px">${S.cf==="o"+m.id?"Opravdu otevřít? Klepni znovu":"Znovu otevřít"}</button></div>`:`<div class="cd" data-s="3"><h2>Uzavření zápasu</h2><div class="mu" style="margin-bottom:8px">Do uzavření jde všechno upravovat: nominaci, sestavu, průběh i soupeřovu sestavu (tu můžeš doplnit i za pár dní z oficiálního zápisu). Po uzavření se zápas zamkne.</div><button class="p w" id="cz">${S.cf==="c"+m.id?"Opravdu uzavřít? Klepni znovu":"Uzavřít a potvrdit zápas"}</button></div>`}
<button class="d w ed" data-s="1" id="dm" style="${S.cf===m.id?"background:var(--no);color:#fff":""}">${S.cf===m.id?"Opravdu smazat celý zápas? Klepni znovu":"Smazat zápas"}</button><div style="display:flex;gap:12px;margin:16px 0">${st>1?`<button class="s" id="pv" style="flex:1;min-height:56px">← ${NM[st-2]}</button>`:""}${st<3?`<button class="p" id="nx" style="flex:2;min-height:56px">${NM[st]} →</button>`:""}</div></div>`;

const go=n=>{S.step=n;render();window.scrollTo(0,0)};Q("#pv").onclick=()=>go(st-1);Q("#nx").onclick=()=>go(st+1);a.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>go(+b.dataset.st));
a.querySelectorAll("[data-lvs]").forEach(b=>b.onclick=()=>{const R=readiness(m);if(!R.nom.ok||!R.lu.ok)return toast("Nejdřív dokonči nominaci a sestavu");const n=clone(m);n.live=initLive(n);S.lv=true;upd(n)});
a.querySelectorAll("[data-fx]").forEach(b=>b.onclick=()=>{S.step=2;S.ph=R0.nom.ok?"lu":"nom";if(R0.nom.ok&&!Object.keys(m.lineup||{}).length){const n=clone(m);fillDef(n);save(n)}render();window.scrollTo(0,0)});
a.querySelectorAll("[data-pl]").forEach(b=>b.onclick=()=>{const n=clone(m);n.perLen=Math.max(1,Math.min(30,(m.perLen||20)+ +b.dataset.pl));upd(n)});
a.querySelectorAll("[data-lvo]").forEach(b=>b.onclick=()=>{S.lv=true;liveRender()});
a.querySelectorAll("[data-rpt]").forEach(b=>b.onclick=()=>{S.rp=true;renderReport()});
Q("#em").onclick=()=>{S.M={k:"EM",id:m.id,opp:m.opp,date:m.date,home:m.home};modal()};
Q("#tn").onclick=()=>{S.showNom=!S.showNom;render()};
const two=(id,f)=>{if(S.cf===id){S.cf=null;f()}else{S.cf=id;render();setTimeout(()=>{if(S.cf===id){S.cf=null;render()}},4000)}};
Q("#cz").onclick=()=>two("c"+m.id,()=>{const n=clone(m);n.closed=true;save(n)});
Q("#ro").onclick=()=>two("o"+m.id,()=>{const n=clone(m);delete n.closed;save(n)});
Q("#to").onclick=()=>{S.showOp=!S.showOp;render()};
Q("#ra").onclick=()=>{const c=$("#rc").value.trim(),nm=$("#rn").value.trim();if(!c&&!nm)return toast("Zadej číslo nebo jméno");const n=clone(m);n.opr=[...(n.opr||[]),{id:uid(),num:c,name:nm,g:0,a:0,pim:0}].sort((x,y)=>(+x.num||999)-(+y.num||999));save(n)};
a.querySelectorAll("[data-rid]").forEach(i=>i.onchange=()=>{const n=clone(m),r=(n.opr||[]).find(x=>x.id===i.dataset.rid);if(r){r[i.dataset.f]=Math.max(0,+i.value||0);save(n)}});
a.querySelectorAll("[data-rd]").forEach(b=>b.onclick=()=>{const n=clone(m);n.opr=(n.opr||[]).filter(x=>x.id!==b.dataset.rd);save(n)});
if(!lk)a.querySelectorAll("[data-ee]").forEach(r=>r.onclick=()=>{const e=ge.find(x=>x.id===r.dataset.ee);if(!e)return;S.M={...clone(e),eid:e.id,all:true,on:clone(e.on||[])};modal()});
const setNom=nm=>{const n=clone(m);n.nom=nm;n.lineup=n.lineup||{};Object.keys(n.lineup).forEach(k=>{if(!nm.includes(n.lineup[k]))delete n.lineup[k]});if(n.gk&&!nm.includes(n.gk))delete n.gk;if(!n.live)n.luOk=false;save(n)};
a.querySelectorAll("[data-nall]").forEach(b=>b.onclick=()=>setNom(S.pl.filter(p=>stOf(p)==="act").map(p=>p.id)));
a.querySelectorAll("[data-nnone]").forEach(b=>b.onclick=()=>setNom([]));
a.querySelectorAll("[data-tn]").forEach(b=>b.onclick=()=>{const id=b.dataset.tn;setNom(nom.includes(id)?nom.filter(x=>x!==id):[...nom,id])});
const toLu=()=>{if(!Object.keys(m.lineup||{}).length){const n=clone(m);fillDef(n);n.luOk=false;save(n)}S.ph="lu";render();window.scrollTo(0,0)};
a.querySelectorAll("[data-gols]").forEach(b=>b.onclick=()=>{if(R0.nom.ok)toLu()});
a.querySelectorAll("[data-ph]").forEach(b=>b.onclick=()=>{if(b.dataset.ph==="lu"){if(R0.nom.ok)toLu()}else{S.ph="nom";render()}});
a.querySelectorAll("[data-fdef]").forEach(b=>b.onclick=()=>two("f"+m.id,()=>{const n=clone(m);fillDef(n);n.luOk=false;save(n)}));
a.querySelectorAll("[data-lucl]").forEach(b=>b.onclick=()=>{if(!R0.lu.done)return toast("V 1. pětce chybí hráčky nebo brankářka");const n=clone(m);n.luOk=true;save(n)});
a.querySelectorAll("[data-luop]").forEach(b=>b.onclick=()=>{const n=clone(m);delete n.luOk;save(n)});

Q("#gu").onclick=()=>{S.M={k:"G",team:"us",per:S.per,time:"",sit:"E",scorer:null,a1:null,a2:null,on:[]};modal()};
Q("#go").onclick=()=>{S.M={k:"G",team:"opp",per:S.per,time:"",sit:"E",on:[gk].filter(Boolean)};modal()};
Q("#pe").onclick=()=>{S.M={k:"P",team:"us",per:S.per,time:"",min:2,reason:REA[0],pid:null};modal()};
Q("#dm").onclick=()=>{if(S.cf===m.id){S.cf=null;S.db.doc("matches/"+m.id).delete();S.mid=null}else{S.cf=m.id;render();setTimeout(()=>{if(S.cf===m.id){S.cf=null;render()}},4000)}};
const add=o=>{const n=clone(m);n.events=[...(n.events||[]),{id:uid(),k:"S",per:S.per,...o}];save(n)};
const del=f=>{const n=clone(m);const i=n.events.map((e,j)=>e.k==="S"&&f(e)?j:-1).filter(j=>j>=0).pop();if(i===undefined)return;n.events.splice(i,1);save(n)};
a.querySelectorAll("[data-per]").forEach(b=>b.onclick=()=>{S.per=+b.dataset.per;render()});
a.querySelectorAll("[data-sp]").forEach(b=>b.onclick=()=>add({team:"us",shooter:b.dataset.sp}));
a.querySelectorAll("[data-sm]").forEach(b=>b.onclick=()=>del(e=>e.team==="us"&&e.shooter===b.dataset.sm));
Q("[data-op]").onclick=()=>add({team:"opp",gk:gk||null});
Q("[data-om]").onclick=()=>del(e=>e.team==="opp");
a.querySelectorAll("[data-gk]").forEach(b=>b.onclick=()=>{const n=clone(m);n.gk=b.dataset.gk;save(n)});
a.querySelectorAll("[data-x]").forEach(b=>b.onclick=ev=>{ev.stopPropagation();const n=clone(m);n.events=n.events.filter(e=>e.id!==b.dataset.x);save(n)});
if(!lk){matchDrag(a,m);
UK.forEach(k=>{const oth=UGRP(k).filter(x=>x!==k).flatMap(x=>Object.values((m.sp||{})[x]||{}));bindLu(a,k+":",()=>clone((m.sp||{})[k]||{}),l=>{const n=clone(m);n.sp=n.sp||{};n.sp[k]=l;save(n)},nom.filter(id=>!oth.includes(id)))});
Q("#cpsp").onclick=()=>{const pv=S.ma.filter(x=>x.id!==m.id&&x.sp).sort((x,y)=>y.date.localeCompare(x.date))[0];if(!pv)return toast("Žádný předchozí zápas nemá jednotky");const n=clone(m);n.sp=clone(pv.sp);[["PP1","PP2"],["SH1","SH2"],["SH3","SH4"]].forEach(g=>{const seen=new Set();g.forEach(k=>Object.keys(n.sp[k]||{}).forEach(c=>{const id=n.sp[k][c];if(seen.has(id))delete n.sp[k][c];else seen.add(id)}))});Object.values(n.sp).forEach(u=>Object.keys(u).forEach(c=>{if(!nom.includes(u[c]))delete u[c]}));save(n);toast("Zkopírováno (nenominované hráčky vynechány)")}}}
