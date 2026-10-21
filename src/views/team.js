// Záložka Team: soupiska, realizační tým, základní formace, náhradnice, přetahování a (od v17.5) správa pokladny.
// Struktura: Importy -> Pomocné funkce -> players (soupiska a realizační tým) -> formV (přepínač režimů, základní formace) -> teamDrag (přetahování).
// Přepínač nahoře (jen správce pokladny): Team | 💰 Platby | 🏦 Pokladna | 📅 Měsíce (stav S.tm); režimy pokladny vykresluje cashPanel() z events.js.
// Hráčka s příznakem pokladník vidí formaci, náhradnice, soupisku a realizační tým jen ke čtení (bez úprav a přetahování).
// Role (v17.3): přidávat a mazat hráčky a spravovat realizační tým smí jen trenér; kustod u hráčky mění stav, pokladník skupinu plateb a plat člena týmu.
// Tlačítka, na která role nemá právo, se nezobrazují (práva navíc vynucují pravidla databáze).
import {KIND,POS,ST} from "../config/constants.js";
import {saveDef} from "../core/actions.js";
import {PG,isG,pl,pn,pri,stOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {$,clone,esc,toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {benchOrder} from "../domain/lineup.js";
import {GRP,exOf,fxOf,fxPct,grpOf,pctToFx} from "../domain/cash.js";
import {luEditor} from "./lineup-editor.js";
import {modal} from "./modal.js";
import {CASH_MODES,cashPanel} from "./events.js";
import {render} from "./shell.js";

// ===== Pomocné funkce =====
// Pohled jen ke čtení (přihlášená hráčka; do Teamu se dostane jen jako pokladník)
const ro=()=>HK.role()==="hracka";
// Přepínač režimů záložky Team; pro uživatele bez práv pokladny se nevykresluje
const modeChips=()=>HK.isCash()?`<div class="chips">${[["team","Team"],...CASH_MODES].map(([k,t])=>`<button class="chip ${S.tm===k?"on":""}" data-tm="${k}">${t}</button>`).join("")}</div>`:"";
const bindChips=a=>a.querySelectorAll("[data-tm]").forEach(b=>b.onclick=()=>{S.tm=b.dataset.tm;S.cf=null;render();window.scrollTo(0,0)});

// ===== Soupiska a realizační tým =====
// Bezpečný výběr prvku (tlačítko nemusí být podle role vykreslené)
const Q2=s=>document.querySelector(s)||{};
export function players(a){const cnt=k=>S.pl.filter(p=>stOf(p)===k).length;const l=S.pl.filter(p=>(S.pf==="all"||stOf(p)===S.pf)&&(S.pq==="all"||(p.pos||"")===S.pq)).sort((x,y)=>pri(x)-pri(y)||x.name.localeCompare(y.name,"cs"));
const T=[...S.tr].sort((x,y)=>(x.name||"").localeCompare(y.name||"","cs"));
// Oprávnění přihlášeného uživatele
const coach=HK.role()==="trener",cashier=HK.isCash()&&!ro(),edit=!ro();
a.innerHTML=`${coach?`<div class="cd"><h2>Přidat hráče</h2><div class="row"><div style="flex:3"><label>Přezdívka / jméno</label><input id="n"></div><div><label>Číslo</label><input id="c" inputmode="numeric"></div></div>
<div class="row"><div><label>Pozice</label><select id="p">${POS.map(x=>`<option>${x}</option>`).join("")}<option value="">Neurčeno</option></select></div><div><label>Alternativní pozice</label><select id="q"><option value="">–</option>${POS.map(x=>`<option>${x}</option>`).join("")}</select></div></div>
<div class="row"><div><label>Skupina plateb</label><select id="py">${Object.entries(GRP).map(([k,t])=>`<option value="${k}">${t}</option>`).join("")}</select></div><div><label>Koeficient (% z ceny)</label><input id="pfx" type="number" min="0" max="100" step="0.1" inputmode="decimal" value="100"></div></div><label class="row" style="align-items:center;gap:8px;flex-wrap:nowrap"><input id="pex" type="checkbox" style="width:auto;margin:0"> Osvobozená (zvýhodněná) hráčka</label><label>Poznámka k platbám (např. kompenzace)</label><input id="pnt">
<button class="p w" id="add">Přidat</button></div>`:""}
<div class="cd"><div class="row" style="align-items:center;flex-wrap:nowrap"><h2 style="margin:0;flex:1">Soupiska (${l.length})</h2><button class="s" id="ft" style="flex:none">Filtry ${S.fo?"▴":"▾"}</button></div>
<div class="mu" style="margin:6px 0 4px">${({act:"Aktivní",inj:"Zranění",end:"Ukončili",all:"Všichni"})[S.pf]} · ${S.pq==="all"?"všechny pozice":S.pq===""?"Neurčeno":S.pq}</div>
${S.fo?`<h3>Pozice</h3><div class="chips">${[["all","Všechny"],...POS.map(x=>[x,x+" ("+S.pl.filter(p=>p.pos===x&&(S.pf==="all"||stOf(p)===S.pf)).length+")"]),["","Neurčeno"]].map(([k,t])=>`<button class="chip ${S.pq===k?"on":""}" data-pq="${k}">${t}</button>`).join("")}</div><h3>Stav</h3><div class="chips">${[["act","Aktivní ("+cnt("act")+")"],["inj","Zranění ("+cnt("inj")+")"],["end","Ukončili ("+cnt("end")+")"],["all","Všichni ("+S.pl.length+")"]].map(([k,t])=>`<button class="chip ${S.pf===k?"on":""}" data-pf="${k}">${t}</button>`).join("")}</div>`:""}
${l.length?l.map((p,i)=>(S.pq==="all"&&(i===0||pri(l[i-1])!==pri(p))?`<h3>${PG[pri(p)]}</h3>`:"")+`<div class="it"><div><b>${pn(p.id)}</b><div class="mu">${esc(p.pos||"")}${p.alt?" / "+esc(p.alt):""}${isG(p)?"":` · <span class="tag">${GRP[grpOf(p)]}${exOf(p)?" · osvobozená":""}${fxOf(p)!==1?" · "+fxPct(fxOf(p)):""}</span>`}${stOf(p)!=="act"?` · <span class="tag ${stOf(p)==="inj"?"sh":"red"}">${ST[stOf(p)]}</span>`:""}</div></div><div class="row" style="flex:none;flex-wrap:nowrap">${edit?`<button class="s" data-e="${p.id}" style="padding:8px 12px">Upravit</button>`:""}${coach?`<button class="d" data-d="${p.id}" style="padding:8px 12px;${S.cf===p.id?"background:var(--no);color:#fff":""}">${S.cf===p.id?"Opravdu smazat?":"Smazat"}</button>`:""}</div></div>`).join(""):'<div class="msg">V tomto výběru nikdo není.</div>'}</div>
<div class="cd"><h2>Realizační tým (${T.length})</h2><div class="mu" style="margin-bottom:8px">Trenéři a další členové týmu se zapisují do docházky na události. Neplatí a nenominují se do zápasu. Spravuje trenér.</div>
${T.length?T.map(t=>`<div class="it"><div><b>${esc(t.name)}</b><div class="mu">${esc(t.kind||"")}</div></div><div class="row" style="flex:none;flex-wrap:nowrap">${coach||cashier?`<button class="s" data-te="${t.id}" style="padding:8px 12px">Upravit</button>`:""}${coach?`<button class="d" data-td="${t.id}" style="padding:8px 12px;${S.cf==="t"+t.id?"background:var(--no);color:#fff":""}">${S.cf==="t"+t.id?"Opravdu smazat?":"Smazat"}</button>`:""}</div></div>`).join(""):'<div class="msg">Zatím nikdo.</div>'}
${coach?`<div class="row" style="margin-top:10px"><div style="flex:3"><label>Jméno</label><input id="stn"></div><div><label>Funkce</label><select id="stk">${KIND.map(k=>`<option>${k}</option>`).join("")}</select></div></div>
<button class="p w" id="stadd">Přidat do realizačního týmu</button>`:""}</div>`;
$("#ft").onclick=()=>{S.fo=!S.fo;render()};
a.querySelectorAll("[data-pq]").forEach(b=>b.onclick=()=>{S.pq=b.dataset.pq;render()});
a.querySelectorAll("[data-pf]").forEach(b=>b.onclick=()=>{S.pf=b.dataset.pf;render()});
// Přidání hráčky: koeficient se zadává v procentech (0–100 %), ukládá se jako 0..1
Q2("#add").onclick=()=>{const n=$("#n").value.trim();if(!n)return;const fx=pctToFx($("#pfx").value);if(fx==null)return toast("Zadej koeficient 0–100 %");S.db.collection("players").add({name:n,num:$("#c").value.trim(),pos:$("#p").value,alt:$("#q").value,st:"act",grp:$("#py").value,fx,ex:$("#pex").checked,note:$("#pnt").value.trim()}).catch(()=>toast("Uložení se nepovedlo"))};
a.querySelectorAll("[data-e]").forEach(b=>b.onclick=()=>{const p=pl(b.dataset.e);S.M={k:"EP",id:p.id,name:p.name||"",num:p.num||"",pos:p.pos||"",alt:p.alt||"",st:stOf(p),grp:grpOf(p),ex:exOf(p),pct:String(Math.round(fxOf(p)*1000)/10),note:p.note||""};modal()});
a.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>{const id=b.dataset.d;if(S.cf===id){S.cf=null;S.db.doc("players/"+id).delete().catch(()=>toast("Smazání se nepovedlo"))}else{S.cf=id;render();setTimeout(()=>{if(S.cf===id){S.cf=null;render()}},4000)}});
// Realizační tým: přidání, úprava a smazání (se smazáním členu zmizí i jeho docházka)
Q2("#stadd").onclick=()=>{const n=$("#stn").value.trim();if(!n)return toast("Zadej jméno");S.db.collection("staff").add({name:n,kind:$("#stk").value}).catch(()=>toast("Uložení se nepovedlo"))};
a.querySelectorAll("[data-te]").forEach(b=>b.onclick=()=>{const t=S.tr.find(x=>x.id===b.dataset.te);if(!t)return;S.M={k:"ES",id:t.id,name:t.name||"",kind:t.kind||KIND[0],pay:t.pay||{m:"none",amt:0}};modal()});
a.querySelectorAll("[data-td]").forEach(b=>b.onclick=()=>{const id=b.dataset.td,k="t"+id;if(S.cf===k){S.cf=null;S.at.filter(x=>x.pid===id).forEach(x=>S.db.doc("attendance/"+x.id).delete());S.db.doc("staff/"+id).delete().catch(()=>toast("Smazání se nepovedlo"))}else{S.cf=k;render();setTimeout(()=>{if(S.cf===k){S.cf=null;render()}},4000)}})}

// ===== Přepínač režimů, základní formace a náhradnice =====
export function formV(a){
// Režim pokladny (Platby / Pokladna / Měsíce) – vykreslí events.js; jinak formace a soupiska
if(S.tm!=="team"&&cashPanel(a,modeChips())){bindChips(a);return}
S.tm="team";
const lu=S.def.lu||{},B=benchOrder(),r=ro();
a.innerHTML=`${modeChips()}${r?'<div class="cd mu">Formace, soupiska a realizační tým jsou pro tebe jen ke čtení. Upravuje je trenér a kustod.</div>':""}<div class="cd"><h2>Základní formace</h2><div class="mu" style="margin-bottom:10px">Tato sestava se zkopíruje do každého nového zápasu, kde ji můžeš upravit.</div>${r?"":'<div class="mu" style="margin-bottom:6px">Klepnutím vybereš hráčku na místo. Podržením a přetažením ji přesuneš na jiné místo nebo mezi náhradnice (obsazené místo se prohodí).</div>'}<div class="tw">${luEditor(lu,0,"d:")}</div></div>
<div class="cd"><h2>Náhradnice (${B.length})</h2>${r?"":'<div class="mu" style="margin-bottom:8px">Nezařazené hráčky. Přetažením je dáš na místo v sestavě, nebo je prohodíš mezi sebou. Sestavu sem můžeš vrátit přetažením místa na tuto plochu.</div>'}<div class="bz" data-bz="1">${B.map(id=>`<button class="chip bn" data-bn="${id}">${pn(id)} <small class="mu">${esc((pl(id).pos||"?")[0])}</small></button>`).join("")||'<span class="mu">Všechny hráčky jsou v sestavě.</span>'}</div></div>
<div id="plw"></div>`;
bindChips(a);
// Přetahování a výběr na místo jen pro trenéra a kustoda (pohled jen ke čtení je bez obsluhy)
if(!r)teamDrag(a);
players($("#plw"))}

// ===== Přetahování (sestava, náhradnice) =====
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