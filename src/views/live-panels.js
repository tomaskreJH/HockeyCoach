// Živý zápis – menu ⋯ a panely: sestava (i po zranění), jednotky PP/OS a nabídka jednotky, zranění, brankářka,
// čas na ledě, nastavení (limit dlouhého střídání, vibrace), konec třetiny / zápasu, sundat z ledu, sestava znovu.
// Struktura: Importy -> Návrh jednotky (proposeUnit) -> Vykreslení panelu (panelHtml) -> Obsluha panelu (bindPanels).
// Panely nic nepočítají samy – zápis jde přes act() a funkce jádra (domain/live-engine.js).

// ===== Importy =====
import {COLS, LAYOUT, POS, UGRP, UK, ULAB, USLOT, slab} from "../config/constants.js";
import {baseKey, compactRot, curM, nomOf, ownCol, pl, pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {LS, esc, mmss, toast} from "../core/utils.js";
import {act, ela, endMatch, endPeriod, initLive, leave, logEv, requeue, shiftMax} from "../domain/live-engine.js";
import {benchGrouped, luEditor} from "./lineup-editor.js";
import {shiftList} from "../domain/timeline.js";
import {haptic, hapticOn, setHaptic} from "./live-feedback.js";
import {liveRender} from "./live-view.js";
import {leaveLive, openLive} from "./live-events.js";

// ===== Návrh jednotky =====
// Návrh jednotky k odsouhlasení: první jednotka skupiny, která má nejvíc dostupných (nevyloučených, nominovaných) hráček
function proposeUnit(m,L,g){const un=new Set([...(L.pen||[]).filter(x=>x.t==="us"&&x.p).map(x=>x.p),...(L.tmp||[])]),nm=nomOf(m);
const cnt=k=>Object.values((m.sp||{})[k]||{}).filter(id=>id&&pl(id)&&nm.includes(id)&&!un.has(id)).length;return g.reduce((b,k)=>cnt(k)>cnt(b)?k:b,g[0])}

// ===== Vykreslení panelu =====
// HTML menu ⋯ / otevřeného panelu (S.lmenu, S.lsub); bez otevřeného menu prázdný text
export function panelHtml({m,L,us,op,run,ended,plan,sit,grp,uv}){let h="";
if(S.lmenu){const dis=run?"disabled":"";let b;
if(S.lsub==="off")b=`<h2>Kdo opustí led?</h2><div class="lmg">${COLS.map(c=>L.ice[c]).filter(Boolean).map(i=>`<button class="s" data-off="${i}">${pn(i)}</button>`).join("")}</div>`;
else if(S.lsub==="lineup")b=`<h2>Sestava</h2>${S.lgap?`<div class="lgap-note">${S.lgap.kind==="perm"?"🤕":"🩹"} <b>${pn(S.lgap.id)}</b> – ${S.lgap.kind==="perm"?"trvale zraněná, místo v sestavě je prázdné":"v ošetřování, na ledě chybí"}. Vyznačené místo doplň: klepni na něj a vyber hráčku, nebo přetáhni náhradnici.</div>`:""}<div class="mu" style="margin-bottom:6px">Klepnutím vybereš hráčku na místo, podržením a přetažením ji přesuneš nebo prohodíš. Změna se hned promítne do střídání (fronty pod místy).</div>${luEditor(m.lineup||{},0,"m:")}<div class="lnl" style="margin-top:12px">Náhradnice (podle pozic)</div><div class="bz" data-bz="b">${benchGrouped(m)}</div>`;
else if(S.lsub==="units")b=`<h2>Přesilovky a oslabení</h2>${UK.map(k=>{const u=(m.sp||{})[k]||{};return`<div style="margin-bottom:14px"><div class="mu" style="margin-bottom:4px"><b>${ULAB[k]}</b></div><div class="ln">${USLOT[k].map(c=>{const id=u[c],bx=id&&((L.pen||[]).some(x=>x.t==="us"&&x.p===id)||(L.tmp||[]).includes(id));return`<button class="sl ${id&&pl(id)?"f":""}" data-us="${k}:${c}" style="${bx?"outline:2px solid var(--no)":""}"><small>${slab(k,c)}</small>${id&&pl(id)?pn(id):"+"}${bx?" 🚫":""}</button>`}).join("")}</div><button class="s w" data-unit="${k}" style="margin-top:6px;min-height:50px">Nasadit</button></div>`}).join("")}<button class="s w" data-lines="1" style="min-height:50px">↩ Zpět na řady</button>`;
// Nabídka jednotky k odsouhlasení: návrh jednotky pro platnou situaci, vyloučené / ošetřované červeně,
// nesestavená místa se doplní z front; potvrzení = nasazení jednotky (data-unit) a režim PP/OS
else if(S.lsub==="uask"){if(!grp)b=`<h2>Jednotka PP/OS</h2><div class="mu">Hra je vyrovnaná (${sit}) – jednotka není potřeba.</div>`;
else{const k=S.uk&&grp.includes(S.uk)?S.uk:proposeUnit(m,L,grp),lay=LAYOUT(us),u=(m.sp||{})[k]||{},cols=USLOT[k].filter(c=>lay.includes(c)),built=cols.some(c=>u[c]&&pl(u[c]));
b=`<h2>${us>op?"⚡":"🛡"} ${sit}</h2><div class="mu" style="margin-bottom:8px">Zkontroluj jednotku a potvrď. Pak budou tlačítka a fronty jen pro ${us>op?"přesilovku":"oslabení"}; po skončení se obrazovka vrátí k pětkám.</div><div class="chips" style="margin-bottom:8px">${grp.map(x=>`<button class="chip ${x===k?"on":""}" data-uk="${x}">${ULAB[x]}</button>`).join("")}</div><div class="ln">${cols.map(c=>{const id=u[c],ok=id&&pl(id),bx=ok&&((L.pen||[]).some(x=>x.t==="us"&&x.p===id)||(L.tmp||[]).includes(id));return`<div class="sl ${ok?"f":""}${bx?" lu-gap":""}"><small>${slab(k,c)}</small>${ok?pn(id):"z fronty"}${bx?" 🚫":""}</div>`}).join("")}</div><div class="mu" style="margin:6px 0 10px">${built?"Červeně označenou hráčku nahradí hráčka z fronty.":"Jednotka není sestavená – místa se doplní hráčkami z front."}</div><button class="p w" data-unit="${k}" style="min-height:58px">✓ Potvrdit a nasadit</button><button class="s w" data-m="units" style="min-height:50px;margin-top:8px">✏️ Upravit jednotky</button><button class="s w" data-m="cl" style="min-height:50px;margin-top:8px">${L.unit&&uv?"Ponechat "+esc(ULAB[L.unit]||L.unit):"Ponechat pětky"}</button>`}}
else if((S.lsub||"").startsWith("usel:")){const[,uk,uc]=S.lsub.split(":"),cur=((m.sp||{})[uk]||{})[uc],inU=UGRP(uk).flatMap(x=>Object.entries((m.sp||{})[x]||{}).filter(([c])=>!(x===uk&&c===uc)).map(([c,v])=>v)),want=/^(LO|PO)$/.test(uc)?POS[1]:POS[0],pool=S.pl.filter(p=>nomOf(m).includes(p.id)&&!inU.includes(p.id)).sort((x,y)=>(y.pos===want)-(x.pos===want)||x.name.localeCompare(y.name,"cs"));
b=`<h2>${uk} – ${uc}</h2><div class="chips">${pool.map(p=>`<button class="chip ${cur===p.id?"on":""}" data-usp="${p.id}">${pn(p.id)}</button>`).join("")||"Nikdo není nominován."}</div><button class="s w" data-usp="" style="min-height:50px">Vyprázdnit místo</button>`}
else if(S.lsub==="inj")b=`<h2>Zranění</h2>${S.injp?`<div class="mu" style="margin-bottom:8px"><b>${pn(S.injp)}</b></div><div class="lmg"><button class="s" data-injt="tmp" style="min-height:66px">🩹 Dočasně<br><small>v ošetřování</small></button><button class="d" data-injt="perm" style="min-height:66px">🤕 Trvale<br><small>na delší dobu</small></button></div>`:`<div class="mu" style="margin-bottom:8px">Vyber zraněnou hráčku:</div><div class="lmg">${[...COLS.map(c=>L.ice[c]),...COLS.flatMap(c=>L.q[c])].filter(Boolean).map(i=>`<button class="s" data-inj="${i}">${pn(i)}</button>`).join("")||"Nikdo."}</div>`}${(L.tmp||[]).length?`<h3 style="margin-top:16px">V ošetřování</h3>${L.tmp.map(id=>`<div class="ev" style="align-items:center"><div class="b"><b>${pn(id)}</b></div><button class="s" data-tmpr="${id}" style="padding:10px 12px">↩ Vrátit</button><button class="d" data-tmpp="${id}" style="padding:10px 12px">Trvalé</button></div>`).join("")}`:""}`;
else if(S.lsub==="gk")b=`<h2>Brankářka</h2><div class="lmg">${[(m.lineup||{}).G1,(m.lineup||{}).G2].filter(Boolean).map(i=>`<button class="${L.G===i?"p":"s"}" data-gkp="${i}">${pn(i)}</button>`).join("")||"Nikdo v sestavě."}</div>`;
// Čas na ledě: společné pravidlo střídání shiftList – nulová vynechá, navazující sloučí, probíhající do teď
else if(S.lsub==="toi"){const T={},N={};shiftList(m).forEach(x=>{T[x.p]=(T[x.p]||0)+x.b-x.a;N[x.p]=(N[x.p]||0)+1});
b=`<h2>Čas na ledě</h2><table style="min-width:0"><tr><th>Hráčka</th><th>Čas</th><th>Střídání</th></tr>${Object.entries(T).sort((x,y)=>y[1]-x[1]).map(([p,t])=>`<tr><td>${pn(p)}</td><td>${mmss(t)}</td><td>${N[p]}</td></tr>`).join("")}</table>`}
else if(S.lsub==="set")b=`<h2>Limit dlouhého střídání</h2><div class="row" style="align-items:center;text-align:center"><button class="s" data-lim="-15" style="min-height:58px">− 15 s</button><b style="font-size:26px">${mmss(shiftMax()*1000)}</b><button class="s" data-lim="15" style="min-height:58px">+ 15 s</button></div><div class="mu" style="margin-top:8px">Po překročení se dlaždice hráčky zbarví a telefon zavibruje. Nastavení se pamatuje v tomto zařízení.</div><h2 style="margin-top:18px">Odezva při zápisu</h2><button class="${hapticOn()?"p":"s"} w" data-hap="1" style="min-height:54px">📳 Vibrace: ${hapticOn()?"zapnutá":"vypnutá"}</button><div class="mu" style="margin-top:8px">Krátké zavibrování po střídání, střele, gólu, trestu, nasazení pětky nebo jednotky a ↩ Zpět. Tlačítko navíc krátce zabliká (i na iPhonu, kde vibrace nejde). Upozornění na dlouhé střídání a konec trestu vibrují vždy. Pamatuje se v tomto zařízení.</div>`;
// Hlavní menu ⋯ (po přerušení hry); tlačítko „Čas na ledě“ otevírá přehled času pro trenérskou analýzu (S.lsub==="toi")
else b=`${run?'<div class="mu" style="margin-bottom:8px">Některé akce jsou dostupné jen při přerušení hry.</div>':""}<div class="lmg"><button class="s" data-m="lineup">👥 Sestava</button><button class="s" data-m="inj" ${dis}>🤕 Zranění</button>${ended?'<button class="s" data-m="unend">↩ Zrušit konec zápasu</button>':`<button class="s" data-m="end" ${dis}>${plan==="end"?"🏁 Konec zápasu":plan==="ot"?"⏱ Konec 3. třetiny → prodloužení":"⏱ Konec "+L.per+". třetiny"}</button>${plan==="end"?"":`<button class="s" data-m="fin" ${dis}>🏁 Konec zápasu (předčasně)</button>`}`}<button class="s" data-m="gk" ${dis}>🧤 Brankářka</button><button class="s" data-m="toi">📊 Čas na ledě</button><button class="s" data-m="set">⚙️ Nastavení</button><button class="s" data-m="off" ${dis}>⬇️ Sundat z ledu</button><button class="s" data-m="re" ${dis}>🔄 Sestava znovu</button><button class="s" data-m="units">⚡ Jednotky PP/OS</button><button class="d" data-m="x">✕ Zavřít živý zápis (zastaví čas)</button></div>`;
h+=`<div class="lmw" id="lmw"><div class="lmb">${b}${S.lsub==="uask"?"":`<button class="s w" data-m="${S.lsub?"back":"cl"}" style="margin-top:14px;min-height:54px">Zpět</button>`}</div></div>`}
return h}

// ===== Obsluha panelu =====
// Napojí tlačítka menu ⋯ a panelů (jen při otevřeném menu)
export function bindPanels({e,m,plan}){const Q2=x=>e.querySelectorAll(x);
if(S.lmenu){const cl=()=>{S.lmenu=false;S.lsub=null;S.injp=null;S.lgap=null;S.uk=null;liveRender()};
e.querySelector("#lmw").onclick=ev=>{if(ev.target.id==="lmw")cl()};
Q2("[data-m]").forEach(b=>b.onclick=()=>{const k=b.dataset.m;
if(k==="cl")cl();else if(k==="back"&&(S.lsub==="uask"||(S.lsub==="lineup"&&S.lgap)))cl();else if(k==="back"){S.lsub=(S.lsub||"").startsWith("usel:")?"units":null;S.injp=null;liveRender()}
else if(k==="x"){cl();leaveLive()}
else if(k==="gu")openLive("G","us");else if(k==="go")openLive("G","opp");else if(k==="pe")openLive("P");
else if(["inj","gk","toi","set","off","units","lineup"].includes(k)){S.lsub=k;liveRender()}
else if(k==="end"){cl();act(plan==="end"?"Konec zápasu":"Konec třetiny",(L,n,i,t)=>endPeriod(L,n,t))}
else if(k==="fin"){cl();act("Konec zápasu",(L,n,i,t)=>endMatch(L,n,t))}
else if(k==="unend"){cl();act("Zrušení konce zápasu",(L,n)=>{delete n.end})}
else if(k==="re"){cl();act(null,(L,n,i,t)=>{COLS.forEach(c=>{if(L.ice[c])leave(L,L.ice[c],c,t)});const f=initLive(n);COLS.forEach(c=>{f.ice[c]=f.ice[c];if(f.ice[c])f.since[f.ice[c]]=t});delete L.unit;Object.assign(L,{ice:f.ice,q:f.q,since:f.since,G:f.G})})}});
Q2("[data-inj]").forEach(b=>b.onclick=()=>{S.injp=b.dataset.inj;liveRender()});
// Po zranění hned Sestava s vyznačeným místem: dočasně = místa hráčky, trvale = prázdná místa po ní (po compactRot)
const openGap=(id,kind,keys)=>{const lu=(curM()||{}).lineup||{};let ks=keys;if(kind==="perm")ks=[...new Set(keys.map(baseKey))].flatMap(b=>{const e=[b,b+"+",b+"++"].filter(x=>!lu[x]&&(x===b||lu[b]));return e.length?[e[0]]:[b]});
S.lgap={id,kind,keys:ks};S.lmenu=true;S.lsub="lineup";S.injp=null;liveRender()};
const permInj=id=>{const ks=Object.keys((m.lineup||{})).filter(k=>m.lineup[k]===id&&!/^G/.test(k));cl();act(null,(L,n,i,t)=>{COLS.forEach(c=>{if(L.ice[c]===id){leave(L,id,c,t);L.ice[c]=null}L.q[c]=L.q[c].filter(x=>x!==id)});L.tmp=(L.tmp||[]).filter(x=>x!==id);n.nom=nomOf(n).filter(x=>x!==id);Object.keys(n.lineup||{}).forEach(k=>{if(n.lineup[k]===id)delete n.lineup[k]});compactRot(n.lineup||{});(n.injLog=n.injLog||[]).push({id,ty:"perm",per:L.per,time:mmss(ela(L,t)),at:t})});const p=pl(id);if(p){const r={...p};delete r.id;r.st="inj";S.db.doc("players/"+id).set(r)}toast("Trvalé zranění – hráčka je označena v soupisce");if(ks.length)openGap(id,"perm",ks)};
Q2("[data-injt]").forEach(b=>b.onclick=()=>{const id=S.injp;if(!id)return;if(b.dataset.injt==="perm"){permInj(id);return}cl();act("Dočasně vyřazena: "+(pl(id)||{}).name,(L,n,i,t)=>{COLS.forEach(c=>{if(L.ice[c]===id){leave(L,id,c,t);L.ice[c]=null}L.q[c]=L.q[c].filter(x=>x!==id)});if(!(L.tmp=L.tmp||[]).includes(id))L.tmp.push(id);(n.injLog=n.injLog||[]).push({id,ty:"tmp",per:L.per,time:mmss(ela(L,t)),at:t})});const lu=(curM()||{}).lineup||{},ks=Object.keys(lu).filter(k=>lu[k]===id&&!/^G/.test(k));if(ks.length)openGap(id,"tmp",ks)});
Q2("[data-tmpr]").forEach(b=>b.onclick=()=>{const id=b.dataset.tmpr;act("Návrat z ošetřování: "+(pl(id)||{}).name,(L,n,i,t)=>{L.tmp=(L.tmp||[]).filter(x=>x!==id);const oc=ownCol(n,id);if(oc&&nomOf(n).includes(id)&&!COLS.some(c=>L.ice[c]===id)&&!L.q[oc].includes(id))L.q[oc].push(id);(n.injLog=n.injLog||[]).push({id,ty:"back",per:L.per,time:mmss(ela(L,t)),at:t})})});
Q2("[data-tmpp]").forEach(b=>b.onclick=()=>permInj(b.dataset.tmpp));
Q2("[data-gkp]").forEach(b=>b.onclick=()=>{cl();act("Brankářka",(L,n,i,t)=>{L.G=b.dataset.gkp;logEv(n,{ty:"gk",p:b.dataset.gkp,at:t,per:L.per})})});
Q2("[data-off]").forEach(b=>b.onclick=()=>{const id=b.dataset.off;cl();act("Z ledu: "+(pl(id)||{}).name,(L,n,i,t)=>{const c=COLS.find(k=>L.ice[k]===id);if(!c)return;leave(L,id,c,t);L.ice[c]=null;requeue(L,curM(),id,c)})});
Q2("[data-lim]").forEach(b=>b.onclick=()=>{LS.set("shiftMax",Math.max(30,shiftMax()+ +b.dataset.lim));liveRender()});
// Vypínač vibrace odezvy; po zapnutí krátce zavibruje na zkoušku
Q2("[data-hap]").forEach(b=>b.onclick=()=>{const on=!hapticOn();setHaptic(on);if(on)haptic("ok");liveRender()})}}
