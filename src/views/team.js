// Záložka Team: soupiska, realizační tým, základní formace, náhradnice, přetahování; přepínač S.tm (Team | 📚 Cvičení | 💰 Platby |
// 🏦 Pokladna | 🧾 Náklady | 📅 Měsíce | 📊 Rozpočet – režimy pokladny jen správce pokladny, vykresluje cashPanel() z events.js).
// Hráčky a realizační tým přidává a maže manager a trenér; asistent mění u hráčky stav, pokladník platby (okno Platby / Plat v modal.js).
// Hráčka-pokladník vidí formaci jen ke čtení. Platební pole jsou v plpay/{pid} a staffpay/{tid} (nová hráčka v jedné dávce s plpay).
// 🎟 Hostující = players.guest (domain/guests.js), počítá se jako ostatní.
import {KIND,POS,ST} from "../config/constants.js";
import {confirm2,saveDef} from "../core/actions.js";
import {PG,isG,kindOf,pl,pn,pri,stOf} from "../core/selectors.js";
import {makeDrag} from "../core/drag.js";
import {S} from "../core/state.js";
import {$, clone, esc, failMsg, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {benchOrder} from "../domain/lineup.js";
import {ROLE_LABELS} from "../domain/permissions.js";
import {GRP,exOf,fxOf,fxPct,grpOf,pctToFx} from "../domain/cash.js";
import {NOTE_COLL,PPAY_COLL,SPAY_COLL,plPayDoc} from "../domain/private-data.js";
import {luEditor} from "./lineup-editor.js";
import {modal} from "./modal.js";
import {drillsView} from "./drills-view.js";
import {CASH_MODES,cashPanel} from "./events.js";
import {render} from "./shell.js";

// ===== Pomocné funkce =====
// Pohled jen ke čtení (přihlášená hráčka; do Teamu se dostane jen jako pokladník)
const ro=()=>HK.can("onlyOwn");
// Režimy záložky Team podle práv: 📚 Cvičení (modul drills), pokladna (správce pokladny)
const modes=()=>[["team","Team"],...(HK.perm("drills","r")?[["drills","📚 Cvičení"]]:[]),...(HK.can("money")?CASH_MODES:[])];
// Přepínač režimů záložky Team; s jediným režimem se nevykresluje
const modeChips=()=>{const m=modes();return m.length>1?`<div class="chips">${m.map(([k,t])=>`<button class="chip ${S.tm===k?"on":""}" data-tm="${k}">${t}</button>`).join("")}</div>`:""};
const bindChips=a=>a.querySelectorAll("[data-tm]").forEach(b=>b.onclick=()=>{S.tm=b.dataset.tm;S.cf=null;render();window.scrollTo(0,0)});

// ===== Soupiska a realizační tým =====
// Bezpečný výběr prvku (tlačítko nemusí být podle role vykreslené)
const Q2=s=>document.querySelector(s)||{};
export function players(a){const cnt=k=>S.pl.filter(p=>stOf(p)===k).length;const l=S.pl.filter(p=>(S.pf==="all"||stOf(p)===S.pf)&&(S.pq==="all"||(p.pos||"")===S.pq)).sort((x,y)=>pri(x)-pri(y)||x.name.localeCompare(y.name,"cs"));
const T=[...S.tr].sort((x,y)=>(x.name||"").localeCompare(y.name||"","cs"));
// Oprávnění přihlášeného uživatele
// Upravit hráčku: trenér, asistent (stav) a správce pokladny (pole plateb – i hráčka s příznakem pokladník); sestavu a přetahování hráčka-pokladník nemění
const coach=HK.can("roster"),cashier=HK.can("money"),edit=!ro()||cashier;
a.innerHTML=`${coach?`<div class="cd"><h2>Přidat hráče</h2><div class="row"><div style="flex:3"><label>Přezdívka / jméno</label><input id="n"></div><div><label>Číslo</label><input id="c" inputmode="numeric"></div></div>
<div class="row"><div><label>Pozice</label><select id="p">${POS.map(x=>`<option>${x}</option>`).join("")}<option value="">Neurčeno</option></select></div><div><label>Alternativní pozice</label><select id="q"><option value="">–</option>${POS.map(x=>`<option>${x}</option>`).join("")}</select></div></div>
<div class="row"><div><label>Skupina plateb</label><select id="py">${Object.entries(GRP).map(([k,t])=>`<option value="${k}">${t}</option>`).join("")}</select></div><div><label>Koeficient (% z ceny)</label><input id="pfx" type="number" min="0" max="100" step="0.1" inputmode="decimal" value="100"></div></div><label class="row" style="align-items:center;gap:8px;flex-wrap:nowrap"><input id="pex" type="checkbox" style="width:auto;margin:0"> Osvobozená (zvýhodněná) hráčka</label><label class="row" style="align-items:center;gap:8px;flex-wrap:nowrap"><input id="pgs" type="checkbox" style="width:auto;margin:0"> 🎟 Hostující hráčka (z jiného týmu; účet s rolí Hostující uvidí jen sebe)</label><label>Poznámka k platbám (např. kompenzace)</label><input id="pnt">
<button class="p w" id="add">Přidat</button></div>`:""}
<div class="cd"><div class="row" style="align-items:center;flex-wrap:nowrap"><h2 style="margin:0;flex:1">Soupiska (${l.length})</h2><button class="s" id="ft" style="flex:none">Filtry ${S.fo?"▴":"▾"}</button></div>
<div class="mu" style="margin:6px 0 4px">${({act:"Aktivní",inj:"Zranění",end:"Ukončili",all:"Všichni"})[S.pf]} · ${S.pq==="all"?"všechny pozice":S.pq===""?"Neurčeno":S.pq}</div>
${S.fo?`<h3>Pozice</h3><div class="chips">${[["all","Všechny"],...POS.map(x=>[x,x+" ("+S.pl.filter(p=>p.pos===x&&(S.pf==="all"||stOf(p)===S.pf)).length+")"]),["","Neurčeno"]].map(([k,t])=>`<button class="chip ${S.pq===k?"on":""}" data-pq="${k}">${t}</button>`).join("")}</div><h3>Stav</h3><div class="chips">${[["act","Aktivní ("+cnt("act")+")"],["inj","Zranění ("+cnt("inj")+")"],["end","Ukončili ("+cnt("end")+")"],["all","Všichni ("+S.pl.length+")"]].map(([k,t])=>`<button class="chip ${S.pf===k?"on":""}" data-pf="${k}">${t}</button>`).join("")}</div>`:""}
${l.length?l.map((p,i)=>(S.pq==="all"&&(i===0||pri(l[i-1])!==pri(p))?`<h3>${PG[pri(p)]}</h3>`:"")+`<div class="it"><div><b>${pn(p.id)}</b><div class="mu">${esc(p.pos||"")}${p.alt?" / "+esc(p.alt):""}${isG(p)||!cashier?"":` · <span class="tag">${GRP[grpOf(p)]}${exOf(p)?" · osvobozená":""}${fxOf(p)!==1?" · "+fxPct(fxOf(p)):""}</span>`}${stOf(p)!=="act"?` · <span class="tag ${stOf(p)==="inj"?"sh":"red"}">${ST[stOf(p)]}</span>`:""}</div></div><div class="row" style="flex:none;flex-wrap:nowrap">${edit?`<button class="s ib" data-e="${p.id}" title="Upravit">✏️</button>`:""}${coach?`<button class="d ib" data-d="${p.id}" title="Smazat" style="${S.cf===p.id?"background:var(--no);color:#fff":""}">${S.cf===p.id?"🗑 Smazat?":"🗑"}</button>`:""}</div></div>`).join(""):'<div class="msg">V tomto výběru nikdo není.</div>'}</div>
<div class="cd"><h2>Realizační tým (${T.length})</h2><div class="mu" style="margin-bottom:8px">Trenéři a další členové týmu se zapisují do docházky na události. Neplatí a nenominují se do zápasu. Přidává a maže manager nebo trenér, funkce má stejné názvy jako role (Manager, Trenér, Asistent).</div>
${T.length?T.map(t=>`<div class="it"><div><b>${esc(t.name)}</b><div class="mu">${esc(kindOf(t))}</div></div><div class="row" style="flex:none;flex-wrap:nowrap">${coach||cashier?`<button class="s ib" data-te="${t.id}" title="Upravit">✏️</button>`:""}${coach?`<button class="d ib" data-td="${t.id}" title="Smazat" style="${S.cf==="t"+t.id?"background:var(--no);color:#fff":""}">${S.cf==="t"+t.id?"🗑 Smazat?":"🗑"}</button>`:""}</div></div>`).join(""):'<div class="msg">Zatím nikdo.</div>'}
${coach?`<div class="row" style="margin-top:10px"><div style="flex:3"><label>Jméno</label><input id="stn"></div><div><label>Funkce</label><select id="stk">${KIND.map(k=>`<option>${k}</option>`).join("")}</select></div></div>
${HK.can("admin")?`<div class="row"><div style="flex:3"><label>E-mail účtu (nepovinné – rovnou přístup do aplikace)</label><input id="stm" type="email" inputmode="email" autocomplete="off" placeholder="jmeno@gmail.com"></div><div><label>Role</label><select id="str">${["trener","asistent","manager"].map(r=>`<option value="${r}">${esc(ROLE_LABELS[r])}</option>`).join("")}</select></div></div>`:""}
<button class="p w" id="stadd">Přidat do realizačního týmu</button>`:""}</div>`;
$("#ft").onclick=()=>{S.fo=!S.fo;render()};
a.querySelectorAll("[data-pq]").forEach(b=>b.onclick=()=>{S.pq=b.dataset.pq;render()});
a.querySelectorAll("[data-pf]").forEach(b=>b.onclick=()=>{S.pf=b.dataset.pf;render()});
// Přidání hráčky: koeficient se zadává v procentech (0–100 %), ukládá se jako 0..1; soupiska do players, platební pole do plpay (jedna dávka)
Q2("#add").onclick=()=>{const n=$("#n").value.trim();if(!n)return;const fx=pctToFx($("#pfx").value);if(fx==null)return toast("Zadej koeficient 0–100 %");
const id=S.db.collection("players").newId();
S.db.batch().set("players/"+id,{name:n,num:$("#c").value.trim(),pos:$("#p").value,alt:$("#q").value,st:"act",...($("#pgs").checked?{guest:true}:{})}).set(PPAY_COLL+"/"+id,plPayDoc({grp:$("#py").value,fx,ex:$("#pex").checked,note:$("#pnt").value.trim()})).commit()};
a.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>{const p=pl(b.dataset.e);S.M={k:"EP",id:p.id,name:p.name||"",num:p.num||"",pos:p.pos||"",alt:p.alt||"",st:stOf(p),guest:p.guest===true,grp:grpOf(p),ex:exOf(p),pct:String(Math.round(fxOf(p)*1000)/10),note:p.note||""};modal()});
// Smazání hráčky (jen trenér): s ní i její platební pole v plpay
a.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{const id=b.dataset.d;confirm2(id,()=>{S.db.doc("players/"+id).delete().catch(()=>toast(failMsg("Smazání")));S.db.doc(PPAY_COLL+"/"+id).delete()})});
// Realizační tým: přidání, úprava a smazání (se smazáním členu zmizí i jeho docházka, důvody a plat ve staffpay)
// Manager může rovnou zadat e-mail a roli: po založení člena týmu se zapíše members/{e-mail} s propojením tid (stejně jako v ⚙️ → 👥 Členové)
Q2("#stadd").onclick=async()=>{const n=$("#stn").value.trim();if(!n)return toast("Zadej jméno");const em=(($("#stm")||{}).value||"").trim().toLowerCase(),rl=($("#str")||{}).value||"trener";
if(em&&!/^\S+@\S+\.\S+$/.test(em))return toast("Zadej platný e-mail (nebo pole nech prázdné)");
const r=await S.db.collection("staff").add({name:n,kind:$("#stk").value}).catch(()=>{toast(failMsg("Uložení"));return null});
if(r&&em&&HK.cfg&&await HK.cfg.saveMember(em,rl,"",r.id,false))toast("✅ "+n+" přidán(a) – přístup "+em+" ("+ROLE_LABELS[rl]+")")};
a.querySelectorAll("[data-te]").forEach(b=>b.onclick=()=>{const t=S.tr.find(x=>x.id===b.dataset.te);if(!t)return;S.M={k:"ES",id:t.id,name:t.name||"",kind:kindOf(t)||KIND[0],pay:t.pay||{m:"none",amt:0}};modal()});
a.querySelectorAll("[data-td]").forEach(b=>b.onclick=()=>{const id=b.dataset.td;confirm2("t"+id,()=>{S.at.filter(x=>x.pid===id).forEach(x=>{S.db.doc("attendance/"+x.id).delete();if(S.an[x.id])S.db.doc(NOTE_COLL+"/"+x.id).delete()});S.db.doc(SPAY_COLL+"/"+id).delete();S.db.doc("staff/"+id).delete().catch(()=>toast(failMsg("Smazání")))})})}

// ===== Přepínač režimů, základní formace a náhradnice =====
export function formV(a){
// Režim 📚 Cvičení (banka cvičení) – vykreslí drills-view.js
if(S.tm==="drills"&&HK.perm("drills","r")){drillsView(a,modeChips());bindChips(a);return}
// Režim pokladny (Platby / Pokladna / Náklady / Měsíce / Rozpočet) – vykreslí events.js; jinak formace a soupiska
if(S.tm!=="team"&&cashPanel(a,modeChips())){bindChips(a);return}
S.tm="team";
const lu=S.def.lu||{},B=benchOrder(),r=ro();
a.innerHTML=`${modeChips()}${r?'<div class="cd mu">Formace, soupiska a realizační tým jsou pro tebe jen ke čtení. Formace upravuje manager, trenér a asistent, soupisku a realizační tým manager a trenér.</div>':""}<div class="cd"><h2>Základní formace</h2><div class="mu" style="margin-bottom:10px">Tato sestava se zkopíruje do každého nového zápasu, kde ji můžeš upravit.</div>${r?"":'<div class="mu" style="margin-bottom:6px">Klepnutím vybereš hráčku na místo. Podržením a přetažením ji přesuneš na jiné místo nebo mezi náhradnice (obsazené místo se prohodí).</div>'}<div class="tw">${luEditor(lu,0,"d:")}</div></div>
<div class="cd"><h2>Náhradnice (${B.length})</h2>${r?"":'<div class="mu" style="margin-bottom:8px">Nezařazené hráčky. Přetažením je dáš na místo v sestavě, nebo je prohodíš mezi sebou. Sestavu sem můžeš vrátit přetažením místa na tuto plochu.</div>'}<div class="bz" data-bz="1">${B.map(id=>`<button class="chip bn" data-bn="${id}">${pn(id)} <small class="mu">${esc((pl(id).pos||"?")[0])}</small></button>`).join("")||'<span class="mu">Všechny hráčky jsou v sestavě.</span>'}</div></div>
<div id="plw"></div>`;
bindChips(a);
// Přetahování a výběr na místo jen pro managera, trenéra a asistenta (pohled jen ke čtení je bez obsluhy)
if(!r)teamDrag(a);
players($("#plw"))}

// ===== Přetahování (sestava, náhradnice) =====
function teamDrag(root){const SEL='[data-sl^="d:"],[data-bn],[data-bz]';
const info=b=>b.dataset.bn?{t:"b",id:b.dataset.bn}:b.dataset.sl?{t:"s",k:b.dataset.sl.slice(2)}:{t:"z"};
const drop=(s,t)=>{if(!t)return;const lu=clone(S.def.lu||{});let B=benchOrder();
if(s.t==="s"){const p=lu[s.k];if(!p)return;
 if(t.t==="s"&&t.k!==s.k){const q=lu[t.k];lu[t.k]=p;if(q)lu[s.k]=q;else delete lu[s.k]}
 else if(t.t==="b"){const i=B.indexOf(t.id);lu[s.k]=t.id;B[i]=p}
 else if(t.t==="z"){delete lu[s.k];B.push(p)}else return}
else{if(t.t==="s"){const q=lu[t.k],i=B.indexOf(s.id);lu[t.k]=s.id;if(q)B[i]=q;else B.splice(i,1)}
 else if(t.t==="b"&&t.id!==s.id){const i=B.indexOf(s.id),j=B.indexOf(t.id);[B[i],B[j]]=[B[j],B[i]]}else return}
S.def={lu,bn:B};saveDef(lu,B)};
makeDrag(root,[...root.querySelectorAll('[data-sl^="d:"],[data-bn]')],{target:SEL,
start:b=>{const s=info(b);if(s.t==="s"&&!(S.def.lu||{})[s.k])return null;return{data:s,text:b.textContent.replace(/\s+[ÚOB?]$/,"")}},
drop:(s,b)=>drop(s,info(b)),
click:b=>b.dataset.sl?()=>{S.pickAll=false;S.pick={slot:b.dataset.sl.slice(2),get:()=>clone(S.def.lu||{}),onCh:lu=>saveDef(lu,(S.def||{}).bn||[]),pool:undefined};modal()}:null})}
