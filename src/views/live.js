// Živý zápis: obrazovka, střídání, přetahování, odpočty.
// Struktura: Importy -> Gól / trest přes okno (openLive) -> Střídání s odezvou (subFb) -> Přetahování (lvDrag) -> Vykreslení (liveRender) -> Odchod (leaveLive) -> Čas (nudgeT, liveTick).
// v18.3: rozložení B (jediné) – horní lišta s řádkem stavu (tresty, ošetřování, PP/OS), střela soupeře, čára, pětky, led,
//        pod ním čekající; rotace: dlaždice má jedinou akci, partnerka je malé tlačítko pod hráčkou (klepnutí = na led,
//        podržení = pořadí rotace). Pevná místa z v18.2 (#lpen, #lunit, #ltmp, #lqbox) nahradil řádek #lchips.
// v18.2: pevné rozložení – tresty (#lpen), jednotky PP/OS (#lunit) a ošetřování (#ltmp) mají vyhrazená místa pevné výšky
//        a fronty jsou v rámečku pevné výšky (#lqbox, řádek na řadě dole), takže tlačítka pětek, front, ledu a střely se neposouvají.
//        Odezva (live-feedback.js): vibrace a záblesk tlačítka po střídání, střele, gólu, trestu, nasazení pětky / jednotky a ↩ Zpět;
//        vibraci lze vypnout v ⋯ → ⚙️ Nastavení. Logika střel, gólů, trestů, časomíry a střídání se nemění.
// v18.1: místo POSLEDNÍ AKCE je PRŮBĚH – všechny kroky zápasu z timeline() včetně střídání, nejnovější nahoře, v rámečku pevné výšky.
//        Upozornění (počet hráček na ledě, dlouhé střídání) jsou v pevném řádku nad průběhem (#lwarn), takže už neposouvají tlačítka.
//        Čas na ledě počítá střídání společným pravidlem shiftList (nulová vynechá, navazující sloučí).
//        Odchod ze živého zápisu (menu ⋯ → Zavřít i tlačítko Zpět na telefonu) zastaví čas zápasu.
import {COLS, LAYOUT, POS, REA, UGRP, UK, ULAB, USLOT, slab} from "../config/constants.js";
import {upd} from "../core/actions.js";
import {baseKey, compactRot, curM, liveIds, nomOf, ownCol, pl, pn, score, shots, slotIds, slotKey} from "../core/selectors.js";
import {S} from "../core/state.js";
import {$, LS, Q, cd, clone, esc, mmss, toast} from "../core/utils.js";
import {SA, act, afterRemove, applyLine, applyUnit, doOShot, doShot, doSub, doUndo, el_, ela, endMatch, endPeriod, initLive, leave, logEv, migrate, perMs, periodEndPlan, procExp, requeue, shiftMax, sk, skCount, swapRot, toLines, toff} from "../domain/live-engine.js";
import {benchGrouped, luEditor, matchDrag} from "./lineup-editor.js";
import {perLabel, shiftList, timeline} from "../domain/timeline.js";
import {qaClick, qaHtml, qaStart} from "./live-quick.js";
import {applyFlash, feedback, haptic, hapticOn, setHaptic} from "./live-feedback.js";
import {modal} from "./modal.js";
import {render} from "./shell.js";

export function openLive(kind,team){const m=curM(),L=m.live,now=el_(L),us=sk(L,"us",now),op=sk(L,"opp",now);S.lmenu=false;S.lsub=null;
const base={per:L.per,time:mmss(ela(L,now))};
if(kind==="G"){const sit=team==="us"?(us>op?"PP":us<op?"SH":"E"):(op>us?"PP":op<us?"SH":"E");S.M={k:"G",team,...base,sit,scorer:null,a1:null,a2:null,on:liveIds(L)}}
else S.M={k:"P",team:"us",...base,min:2,reason:REA[0],pid:null};modal()}
// Střídání s odezvou (v18.2): doSub se volá beze změny; stejnou podmínkou jako doSub (plný led při trestu) se jen určí,
// zda potvrdit (záblesk místa na ledě), nebo dát chybovou vibraci (doSub sám ukáže hlášku).
function subFb(p,c){const m=curM(),L=m&&m.live;const full=!!L&&!L.ice[c]&&skCount(L)>=sk(L,"us",el_(L));doSub(p,c);if(L)feedback(full?"err":"tap",full?null:`[data-ice="${c}"]`)}
export function lvDrag(root){let D=null,timer=null,blk=false;
const tgt=(x,y)=>{const e=document.elementFromPoint(x,y),b=e&&e.closest&&e.closest("[data-ice]");return b?b.dataset.ice:null};
const clr=()=>{if(D)D.g.remove();root.querySelectorAll(".ov,.dg").forEach(b=>b.classList.remove("ov","dg"));D=null};
const mv=(x,y)=>{D.x=x;D.y=y;D.g.style.left=x+"px";D.g.style.top=y+"px";const c=tgt(x,y);root.querySelectorAll("[data-ice]").forEach(b=>b.classList.toggle("ov",b.dataset.ice===c))};
const begin=(b,x,y)=>{const g=document.createElement("div");g.className="ghost";g.textContent=(pl(b.dataset.q)||{}).name||"";document.body.appendChild(g);D={p:b.dataset.q,g};b.classList.add("dg");mv(x,y);navigator.vibrate&&navigator.vibrate(15)};
const end=(x,y)=>{if(!D)return;const c=tgt(x,y),p=D.p;clr();blk=true;setTimeout(()=>blk=false,450);if(c)subFb(p,c)};
root.querySelectorAll("[data-q]").forEach(b=>{
b.onclick=()=>{if(!blk)subFb(b.dataset.q,b.dataset.col)};
b.addEventListener("contextmenu",e=>e.preventDefault());
b.addEventListener("touchstart",e=>{const t=e.touches[0];clearTimeout(timer);b._s={x:t.clientX,y:t.clientY};timer=setTimeout(()=>begin(b,t.clientX,t.clientY),320)},{passive:true});
b.addEventListener("touchmove",e=>{const t=e.touches[0];if(D){e.preventDefault();mv(t.clientX,t.clientY)}else if(Math.abs(t.clientX-b._s.x)+Math.abs(t.clientY-b._s.y)>10)clearTimeout(timer)},{passive:false});
b.addEventListener("touchend",e=>{clearTimeout(timer);if(D){e.preventDefault();end(D.x,D.y)}});
b.addEventListener("touchcancel",()=>{clearTimeout(timer);clr()});
b.addEventListener("mousedown",e=>{if(e.button!==0)return;const sx=e.clientX,sy=e.clientY;const mm=ev=>{if(!D&&Math.abs(ev.clientX-sx)+Math.abs(ev.clientY-sy)>6)begin(b,ev.clientX,ev.clientY);if(D)mv(ev.clientX,ev.clientY)};const mu=ev=>{document.removeEventListener("mousemove",mm);document.removeEventListener("mouseup",mu);end(ev.clientX,ev.clientY)};document.addEventListener("mousemove",mm);document.addEventListener("mouseup",mu)})})}
export function liveRender(){const e=$("#lv");
if(!S.lv){if(e.style.display!=="none"){e.innerHTML="";e.style.display="none"}if(S.wl){S.wl.release().catch(()=>{});S.wl=null}return}
const m=curM();if(!m||!m.live||m.closed){S.lv=false;e.style.display="none";return}
if(!S.wl&&navigator.wakeLock)navigator.wakeLock.request("screen").then(l=>S.wl=l).catch(()=>{});
e.style.display="block";migrate(m.live);const L=m.live,[g,o]=score(m),sh=shots(m),now=el_(L),us=sk(L,"us",now),op=sk(L,"opp",now),u=(L.u||[]).slice(-1)[0],run=L.running,ended=!!m.end,plan=periodEndPlan(m);
const sit=us>op?"Přesilovka "+us+" na "+op:op>us?"Oslabení "+us+" na "+op:us+" na "+op;e.style.paddingBottom=run?"130px":"310px";const lay=LAYOUT(us),shown=COLS.filter(c=>lay.includes(c)||L.ice[c]),gt=`grid-template-columns:repeat(${shown.length},minmax(0,1fr))`;
// Zobrazené fronty.
// Běžné řady: při oslabení se fronty skrytých sloupců (PK, u 3 hráček i LK) přidají pod nejbližší viditelný sloupec (stejné pořadí jako ve fitLayout), aby čekající hráčky šly nasadit.
// Aktivní jednotka PP/OS (L.unit): ve frontě jsou hráčky z druhé jednotky téhož druhu (pak z aktivní, pokud někdo vystřídal), bez rotace; nemá-li jednotky nikdo na střídání, zobrazí se běžná fronta.
const um=!!L.unit,onIce=new Set(COLS.map(c=>L.ice[c]).filter(Boolean)),HM={LK:["LK","C"],PK:["LK","C"]},dq={};
if(um){const bad=new Set([...(L.pen||[]).filter(x=>x.t==="us"&&x.p).map(x=>x.p),...(L.tmp||[])]),nmL=nomOf(m),grp=[...UGRP(L.unit).filter(k=>k!==L.unit),L.unit];
shown.forEach(c=>{const seen=new Set(),a=[];grp.forEach(k=>{const id=((m.sp||{})[k]||{})[c];if(id&&!seen.has(id)&&!onIce.has(id)&&!bad.has(id)&&nmL.includes(id)&&pl(id)){seen.add(id);a.push(id)}});dq[c]=a});
if(!shown.some(c=>dq[c].length))shown.forEach(c=>{dq[c]=[...(L.q[c]||[])]})}
else{shown.forEach(c=>{dq[c]=[...(L.q[c]||[])]});
COLS.filter(c=>!shown.includes(c)).forEach(hc=>{const t=(HM[hc]||["C"]).find(x=>shown.includes(x))||shown[0];if(t)(L.q[hc]||[]).forEach(id=>{if(!dq[t].includes(id))dq[t].push(id)})})}
// ===== Rozložení B (v18.3) – shora dolů =====
// 1) horní lišta (sticky): třetina a čas ◀ ▶, skóre se střelami; pod tím řádek pevné výšky #lchips (situace, tresty, ošetřování,
//    tlačítka PP/OS) – posouvá se do strany, takže nic pod lištou neposune
// 2) STŘELA NA NAŠI BRÁNU → dělicí čára → tlačítka pětek → 3) hráčky na ledě (klepnutí = střela)
// 4) pod každým místem sloupec čekajících: na řadě (větší dlaždice) → pod ní malé tlačítko rotující partnerky → další ve frontě
//    → dole partnerky hráček na ledě; 5) upozornění a průběh. Každé tlačítko má jedinou akci (rotace podržením partnerky).
const tag=`<span class="tag ${us>op?"pp":op>us?"sh":""} lchip-sit">${sit}</span>`,
pchips=(L.pen||[]).map(x=>{const tl={min:"2 min",maj:"5 min",mis:"10 min",gm:"do konce"}[x.ty],t=x.ty==="gm"?tl:x.end!=null?`<b data-bx="${x.end}">${cd(x.end-now)}</b>`:`čeká ${mmss(x.rem)}`;return`<span class="lchip pen"><span>🚫 ${x.t==="us"?pn(x.p):"Soupeř"} ${t}</span><button data-pcx="${x.id}" aria-label="Zrušit trest" title="Zrušit trest">✕</button></span>`}).join(""),
tchips=(L.tmp||[]).map(id=>`<span class="lchip tmp">🩹 ${pn(id)}</span>`).join(""),
ub=(us>op?["PP1","PP2"]:op>us?(us===4?["SH1","SH2"]:["SH3","SH4"]):[]).filter(k=>Object.values((m.sp||{})[k]||{}).some(Boolean)),
uchips=ub.map(k=>`<button class="lchip ub ${k[0]==="P"?"pp":"sh"}${L.unit===k?" on":""}" data-unit="${k}">${k[0]==="P"?"⚡ ":"🛡 "}${ULAB[k]}</button>`).join("")+(L.unit?`<button class="lchip ub" data-lines="1">↩ Řady</button>`:"");
let h=`<div class="lt lt-b"><div class="lt-r1"><div><small>${L.per<4?L.per+". třetina":"Prodloužení"}</small><div style="display:flex;align-items:center;gap:10px"><button id="tm5" aria-label="Posunout čas o 5 s zpět" title="O 5 s zpět" class="lnud">◀</button><b id="lclk">${cd(perMs(L)-ela(L,now))}</b><button id="tp5" aria-label="Posunout čas o 5 s dopředu" title="O 5 s dopředu" class="lnud">▶</button></div></div><div class="lsc">${g}:${o}<small>střely ${sh.us}:${sh.opp}</small></div></div><div id="lchips" class="lchips">${tag}${uchips}${pchips}${tchips}</div></div>`;
// Pomocné pro dlaždice: pětka hráčky (barva), číslo, jméno
const lineOf=id=>{const k=Object.keys(m.lineup||{}).find(k=>m.lineup[k]===id&&/^\d/.test(k));return k?+k[0]:0},numOf=id=>((pl(id)||{}).num)||"–",nmOf=id=>esc((pl(id)||{}).name||"?");
const firstUp=new Set(shown.map(c=>dq[c][0]).filter(Boolean)),waiting=new Set(COLS.flatMap(c=>dq[c]||[])),lastShift=(L.sh||[]).slice(-1)[0],playerState=id=>`live-player${onIce.has(id)?" on-ice":""}${firstUp.has(id)?" next":""}${lastShift&&lastShift.p===id&&waiting.has(id)?" just-off":""}`;
// 2) Střela soupeře a dělicí čára
h+=`<button class="lgk${run?"":" dd"}" id="lgk">🥅 STŘELA NA NAŠI BRÁNU<br><small style="font-weight:400">${L.G?pn(L.G):"brankářka?"} · střely soupeře: ${sh.opp}${run?"":" · hra je přerušena"}</small></button><div class="ldiv"></div>`;
// Tlačítka celých pětek (nasadí celou pětku najednou)
{const lbn=[1,2,3,4].filter(n=>COLS.some(c=>(m.lineup||{})[n+c]));
if(lbn.length)h+=`<div class="row lpl-row">${lbn.map(n=>`<button class="L${n}" data-pline="${n}" title="Celá ${n}. pětka na led">${n}. pětka</button>`).join("")}</div>`}
// 3) Hráčky na ledě: popisky míst a dlaždice (klepnutí = střela, odpočet střídání)
h+=`<div class="lg" style="margin-bottom:4px;${gt}">${shown.map(c=>`<small class="mu" style="text-align:center;font-size:11px">${us===4&&c==="LK"?"Ú":c}</small>`).join("")}</div>`;
h+=`<div class="lg ice-strip" style="${gt}">${shown.map(c=>{const p=L.ice[c];return p?`<button class="lice L${lineOf(p)} ${playerState(p)} tl" data-ice="${c}"><span class="n">${numOf(p)}</span><span class="nm">${nmOf(p)}</span><span class="t" data-sh="${p}">${mmss(now-(L.since[p]||0))}</span></button>`:`<button class="lice tl" data-ice="${c}"><span class="nm">— prázdné —</span></button>`}).join("")}</div>`;
// 4) Čekající a rotace (B3): partnerky = ostatní hráčky téhož místa sestavy (k+, k++), které jsou k dispozici
// (ne na ledě, ne ve frontě, ne vyloučené ani v ošetřování); při aktivní jednotce PP/OS se rotace nepoužívá.
const unav=new Set([...(L.pen||[]).filter(x=>x.t==="us"&&x.p).map(x=>x.p),...(L.tmp||[])]),nomL=nomOf(m),
rp=id=>{if(um)return[];const lu=m.lineup||{},k=slotKey(lu,id);if(!k)return[];return slotIds(lu,baseKey(k)).filter(x=>x!==id&&pl(x)&&nomL.includes(x)&&!onIce.has(x)&&!waiting.has(x)&&!unav.has(x))},
pbtn=(x,c,of)=>`<button class="lrp L${lineOf(x)}${of?"":" ofice"}" data-rp="${x}" data-col="${c}"${of?` data-of="${of}"`:""} title="${of?"Klepnutí: rovnou na led · podržení: změnit pořadí rotace":"Klepnutí: vystřídá partnerku na ledě"}">⇄ ${numOf(x)} ${nmOf(x)}</button>`,
colHtml=c=>{let s="";(dq[c]||[]).slice(0,8).forEach((q,i)=>{s+=`<button class="lq L${lineOf(q)} ${playerState(q)} tl${i===0?" nx":""}" data-q="${q}" data-col="${c}"><span class="n">${numOf(q)}</span><span class="nm">${nmOf(q)}</span></button>`;rp(q).forEach(x=>{s+=pbtn(x,c,q)})});
const ip=L.ice[c];if(ip)rp(ip).forEach(x=>{s+=pbtn(x,c,null)});return`<div class="lqcol">${s}</div>`};
h+=`<div class="lg lqs" style="${gt}">${shown.map(colHtml).join("")}</div>`;
// Průběh (v18.1): všechny kroky zápasu včetně střídání, nejnovější nahoře; dlouhá střídání zvýrazněná.
// Nad ním pevný řádek upozornění #lwarn (plní liveTick), aby se tlačítka nad ním nikdy neposouvala.
const lim=shiftMax()*1000,tl=timeline(m,{shots:true,subs:true,limit:lim}).reverse();
h+=`<div style="margin-top:22px"><div class="mu" style="text-align:center;margin-bottom:4px">PRŮBĚH</div><div id="lwarn" class="mu" style="height:40px;overflow:auto;font-size:13px;line-height:18px;padding:2px 6px;border:1px solid var(--bd);border-radius:8px;margin-bottom:6px"></div><div style="height:220px;overflow:auto;border:1px solid var(--bd);border-radius:8px;padding:0 6px">${tl.map(x=>`<div class="ev" style="padding:6px 0;${x.long?"background:#fff3dc;color:#5a3a00;border-radius:6px;padding-left:4px;padding-right:4px":""}"><div class="t">${perLabel(x.per)} ${esc(x.el)}</div><div class="b">${esc(x.text)}</div></div>`).join("")||'<div class="mu" style="text-align:center;padding:10px 0">Zatím nic.</div>'}</div></div>`;
h+=`<div class="lb" style="flex-direction:column;gap:10px">${run?"":ended?`<div style="display:flex;gap:12px"><button id="lmn" style="flex:1;font-size:15px">⋯ Další volby</button></div>`:`<div style="display:flex;gap:12px"><button id="qg" style="flex:1;font-size:16px;background:var(--ac);color:#fff;border-color:transparent">⚽ Gól HC Střely</button><button id="qo" style="flex:1;font-size:16px;background:var(--no);color:#fff;border-color:transparent">⚽ Gól soupeř</button></div><div style="display:flex;gap:12px"><button id="qp" style="flex:1;font-size:15px">🚫 Trest</button><button id="lmn" style="flex:1;font-size:15px">⋯ Další volby</button></div>`}<div style="display:flex;gap:12px"><button id="lun" style="flex:1;font-size:14px" title="${u?esc(u.t):""}">↩ Zpět</button><button id="lpl" style="flex:2.4;font-size:20px;background:${ended?"#6b7480":run?"var(--no)":"var(--ok)"};color:#fff;border-color:transparent">${ended?"🏁 Zápas ukončen":run?"⏸ Přerušit":"▶ Start"}</button></div></div>`;
if(S.lmenu){const dis=run?"disabled":"";let b;
if(S.lsub==="off")b=`<h2>Kdo opustí led?</h2><div class="lmg">${COLS.map(c=>L.ice[c]).filter(Boolean).map(i=>`<button class="s" data-off="${i}">${pn(i)}</button>`).join("")}</div>`;
else if(S.lsub==="lineup")b=`<h2>Sestava</h2><div class="mu" style="margin-bottom:6px">Klepnutím vybereš hráčku na místo, podržením a přetažením ji přesuneš nebo prohodíš. Změna se hned promítne do střídání (fronty pod místy).</div>${luEditor(m.lineup||{},0,"m:")}<div class="lnl" style="margin-top:12px">Náhradnice (podle pozic)</div><div class="bz" data-bz="b">${benchGrouped(m)}</div>`;
else if(S.lsub==="units")b=`<h2>Přesilovky a oslabení</h2>${UK.map(k=>{const u=(m.sp||{})[k]||{};return`<div style="margin-bottom:14px"><div class="mu" style="margin-bottom:4px"><b>${ULAB[k]}</b></div><div class="ln">${USLOT[k].map(c=>{const id=u[c],bx=id&&((L.pen||[]).some(x=>x.t==="us"&&x.p===id)||(L.tmp||[]).includes(id));return`<button class="sl ${id&&pl(id)?"f":""}" data-us="${k}:${c}" style="${bx?"outline:2px solid var(--no)":""}"><small>${slab(k,c)}</small>${id&&pl(id)?pn(id):"+"}${bx?" 🚫":""}</button>`}).join("")}</div><button class="s w" data-unit="${k}" style="margin-top:6px;min-height:50px">Nasadit</button></div>`}).join("")}<button class="s w" data-lines="1" style="min-height:50px">↩ Zpět na řady</button>`;
else if((S.lsub||"").startsWith("usel:")){const[,uk,uc]=S.lsub.split(":"),cur=((m.sp||{})[uk]||{})[uc],inU=UGRP(uk).flatMap(x=>Object.entries((m.sp||{})[x]||{}).filter(([c])=>!(x===uk&&c===uc)).map(([c,v])=>v)),want=/^(LO|PO)$/.test(uc)?POS[1]:POS[0],pool=S.pl.filter(p=>nomOf(m).includes(p.id)&&!inU.includes(p.id)).sort((x,y)=>(y.pos===want)-(x.pos===want)||x.name.localeCompare(y.name,"cs"));
b=`<h2>${uk} – ${uc}</h2><div class="chips">${pool.map(p=>`<button class="chip ${cur===p.id?"on":""}" data-usp="${p.id}">${pn(p.id)}</button>`).join("")||"Nikdo není nominován."}</div><button class="s w" data-usp="" style="min-height:50px">Vyprázdnit místo</button>`}
else if(S.lsub==="inj")b=`<h2>Zranění</h2>${S.injp?`<div class="mu" style="margin-bottom:8px"><b>${pn(S.injp)}</b></div><div class="lmg"><button class="s" data-injt="tmp" style="min-height:66px">🩹 Dočasně<br><small>v ošetřování</small></button><button class="d" data-injt="perm" style="min-height:66px">🤕 Trvale<br><small>na delší dobu</small></button></div>`:`<div class="mu" style="margin-bottom:8px">Vyber zraněnou hráčku:</div><div class="lmg">${[...COLS.map(c=>L.ice[c]),...COLS.flatMap(c=>L.q[c])].filter(Boolean).map(i=>`<button class="s" data-inj="${i}">${pn(i)}</button>`).join("")||"Nikdo."}</div>`}${(L.tmp||[]).length?`<h3 style="margin-top:16px">V ošetřování</h3>${L.tmp.map(id=>`<div class="ev" style="align-items:center"><div class="b"><b>${pn(id)}</b></div><button class="s" data-tmpr="${id}" style="padding:10px 12px">↩ Vrátit</button><button class="d" data-tmpp="${id}" style="padding:10px 12px">Trvalé</button></div>`).join("")}`:""}`;
else if(S.lsub==="gk")b=`<h2>Brankářka</h2><div class="lmg">${[(m.lineup||{}).G1,(m.lineup||{}).G2].filter(Boolean).map(i=>`<button class="${L.G===i?"p":"s"}" data-gkp="${i}">${pn(i)}</button>`).join("")||"Nikdo v sestavě."}</div>`;
// Čas na ledě: společné pravidlo střídání shiftList (v18.1) – nulová vynechá, navazující sloučí, probíhající do teď
else if(S.lsub==="toi"){const T={},N={};shiftList(m).forEach(x=>{T[x.p]=(T[x.p]||0)+x.b-x.a;N[x.p]=(N[x.p]||0)+1});
b=`<h2>Čas na ledě</h2><table style="min-width:0"><tr><th>Hráčka</th><th>Čas</th><th>Střídání</th></tr>${Object.entries(T).sort((x,y)=>y[1]-x[1]).map(([p,t])=>`<tr><td>${pn(p)}</td><td>${mmss(t)}</td><td>${N[p]}</td></tr>`).join("")}</table>`}
else if(S.lsub==="set")b=`<h2>Limit dlouhého střídání</h2><div class="row" style="align-items:center;text-align:center"><button class="s" data-lim="-15" style="min-height:58px">− 15 s</button><b style="font-size:26px">${mmss(shiftMax()*1000)}</b><button class="s" data-lim="15" style="min-height:58px">+ 15 s</button></div><div class="mu" style="margin-top:8px">Po překročení se dlaždice hráčky zbarví a telefon zavibruje. Nastavení se pamatuje v tomto zařízení.</div><h2 style="margin-top:18px">Odezva při zápisu</h2><button class="${hapticOn()?"p":"s"} w" data-hap="1" style="min-height:54px">📳 Vibrace: ${hapticOn()?"zapnutá":"vypnutá"}</button><div class="mu" style="margin-top:8px">Krátké zavibrování po střídání, střele, gólu, trestu, nasazení pětky nebo jednotky a ↩ Zpět. Tlačítko navíc krátce zabliká (i na iPhonu, kde vibrace nejde). Upozornění na dlouhé střídání a konec trestu vibrují vždy. Pamatuje se v tomto zařízení.</div>`;
// Hlavní menu ⋯ (po přerušení hry); tlačítko „Čas na ledě“ otevírá přehled času pro trenérskou analýzu (S.lsub==="toi")
else b=`${run?'<div class="mu" style="margin-bottom:8px">Některé akce jsou dostupné jen při přerušení hry.</div>':""}<div class="lmg"><button class="s" data-m="lineup">👥 Sestava</button><button class="s" data-m="inj" ${dis}>🤕 Zranění</button>${ended?'<button class="s" data-m="unend">↩ Zrušit konec zápasu</button>':`<button class="s" data-m="end" ${dis}>${plan==="end"?"🏁 Konec zápasu":plan==="ot"?"⏱ Konec 3. třetiny → prodloužení":"⏱ Konec "+L.per+". třetiny"}</button>${plan==="end"?"":`<button class="s" data-m="fin" ${dis}>🏁 Konec zápasu (předčasně)</button>`}`}<button class="s" data-m="gk" ${dis}>🧤 Brankářka</button><button class="s" data-m="toi">📊 Čas na ledě</button><button class="s" data-m="set">⚙️ Nastavení</button><button class="s" data-m="off" ${dis}>⬇️ Sundat z ledu</button><button class="s" data-m="re" ${dis}>🔄 Sestava znovu</button><button class="s" data-m="units">⚡ Jednotky PP/OS</button><button class="d" data-m="x">✕ Zavřít živý zápis (zastaví čas)</button></div>`;
h+=`<div class="lmw" id="lmw"><div class="lmb">${b}<button class="s w" data-m="${S.lsub?"back":"cl"}" style="margin-top:14px;min-height:54px">Zpět</button></div></div>`}
if(S.qa)h+=qaHtml(m,L);
e.innerHTML=h;applyFlash(e);
const Q2=x=>e.querySelectorAll(x);if(S.lmenu&&S.lsub==="lineup"&&!m.closed)matchDrag(e,m);
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
Q2("[data-us]").forEach(b=>b.onclick=()=>{S.lsub="usel:"+b.dataset.us;liveRender()});
Q2("[data-usp]").forEach(b=>b.onclick=()=>{const[,k,c]=S.lsub.split(":"),n=clone(m);n.sp=n.sp||{};n.sp[k]=n.sp[k]||{};if(b.dataset.usp)n.sp[k][c]=b.dataset.usp;else delete n.sp[k][c];S.lsub="units";upd(n)});
Q2("[data-unit]").forEach(b=>b.onclick=()=>{const k=b.dataset.unit;S.lmenu=false;S.lsub=null;act(ULAB[k],(L2,n,ids,t)=>{const r=applyUnit(L2,n,k,t);if(r.none){toast("Jednotku nelze nasadit (hráčky nejsou k dispozici)");haptic("err");return}feedback("ok",`[data-unit="${k}"]`);logEv(n,{ty:"unit",label:ULAB[k],at:t,per:L2.per});if(r.skip.length||r.rep.length)toast((r.skip.length?"Nenasazeny: "+r.skip.join(", "):"")+(r.rep.length?(r.skip.length?" – ":"")+"doplnily: "+r.rep.join(", "):""));else if(r.trim)toast("Jednotka zkrácena podle počtu hráček na ledě")})});
Q2("[data-lines]").forEach(b=>b.onclick=()=>{S.lmenu=false;S.lsub=null;act("Zpět na řady",(L2,n,ids,t)=>{toLines(L2,n,t);feedback("ok","#lchips");logEv(n,{ty:"unit",label:"Zpět na řady",at:t,per:L2.per})})});
Q2("[data-pcx]").forEach(b=>b.onclick=()=>act("Zrušení trestu",(L,n,i,t)=>{const c=L.pen.find(x=>x.id===b.dataset.pcx);if(!c)return;L.pen=L.pen.filter(x=>x!==c);afterRemove(L,c,t)}));
// Rotující partnerka (v18.3): klepnutí = rovnou na led (stejné střídání jako z fronty), podržení u partnerky čekající hráčky =
// změna pořadí rotace (swapRot – partnerka se postaví do fronty místo ní)
Q2("[data-rp]").forEach(b=>{let tmr=null,held=false;
const hold=()=>{held=false;clearTimeout(tmr);if(!b.dataset.of)return;tmr=setTimeout(()=>{held=true;const of=b.dataset.of,x=b.dataset.rp;act("Rotace: "+(pl(of)||{}).name,(L2,n)=>swapRot(L2,n,of));feedback("ok",`[data-q="${x}"]`)},550)},stop=()=>clearTimeout(tmr);
b.addEventListener("pointerdown",hold);["pointerup","pointerleave","pointercancel"].forEach(t=>b.addEventListener(t,stop));
b.addEventListener("contextmenu",ev=>ev.preventDefault());
b.onclick=()=>{if(held){held=false;return}subFb(b.dataset.rp,b.dataset.col)}});
lvDrag(e);
if(S.lmenu){const cl=()=>{S.lmenu=false;S.lsub=null;S.injp=null;liveRender()};
e.querySelector("#lmw").onclick=ev=>{if(ev.target.id==="lmw")cl()};
Q2("[data-m]").forEach(b=>b.onclick=()=>{const k=b.dataset.m;
if(k==="cl")cl();else if(k==="back"){S.lsub=(S.lsub||"").startsWith("usel:")?"units":null;S.injp=null;liveRender()}
else if(k==="x"){cl();leaveLive()}
else if(k==="gu")openLive("G","us");else if(k==="go")openLive("G","opp");else if(k==="pe")openLive("P");
else if(["inj","gk","toi","set","off","units","lineup"].includes(k)){S.lsub=k;liveRender()}
else if(k==="end"){cl();act(plan==="end"?"Konec zápasu":"Konec třetiny",(L,n,i,t)=>endPeriod(L,n,t))}
else if(k==="fin"){cl();act("Konec zápasu",(L,n,i,t)=>endMatch(L,n,t))}
else if(k==="unend"){cl();act("Zrušení konce zápasu",(L,n)=>{delete n.end})}
else if(k==="re"){cl();act(null,(L,n,i,t)=>{COLS.forEach(c=>{if(L.ice[c])leave(L,L.ice[c],c,t)});const f=initLive(n);COLS.forEach(c=>{f.ice[c]=f.ice[c];if(f.ice[c])f.since[f.ice[c]]=t});delete L.unit;Object.assign(L,{ice:f.ice,q:f.q,since:f.since,G:f.G})})}});
Q2("[data-inj]").forEach(b=>b.onclick=()=>{S.injp=b.dataset.inj;liveRender()});
const permInj=id=>{cl();act(null,(L,n,i,t)=>{COLS.forEach(c=>{if(L.ice[c]===id){leave(L,id,c,t);L.ice[c]=null}L.q[c]=L.q[c].filter(x=>x!==id)});L.tmp=(L.tmp||[]).filter(x=>x!==id);n.nom=nomOf(n).filter(x=>x!==id);Object.keys(n.lineup||{}).forEach(k=>{if(n.lineup[k]===id)delete n.lineup[k]});compactRot(n.lineup||{});(n.injLog=n.injLog||[]).push({id,ty:"perm",per:L.per,time:mmss(ela(L,t)),at:t})});const p=pl(id);if(p){const r={...p};delete r.id;r.st="inj";S.db.doc("players/"+id).set(r)}toast("Trvalé zranění – hráčka je označena v soupisce")};
Q2("[data-injt]").forEach(b=>b.onclick=()=>{const id=S.injp;if(!id)return;if(b.dataset.injt==="perm"){permInj(id);return}cl();act("Dočasně vyřazena: "+(pl(id)||{}).name,(L,n,i,t)=>{COLS.forEach(c=>{if(L.ice[c]===id){leave(L,id,c,t);L.ice[c]=null}L.q[c]=L.q[c].filter(x=>x!==id)});if(!(L.tmp=L.tmp||[]).includes(id))L.tmp.push(id);(n.injLog=n.injLog||[]).push({id,ty:"tmp",per:L.per,time:mmss(ela(L,t)),at:t})})});
Q2("[data-tmpr]").forEach(b=>b.onclick=()=>{const id=b.dataset.tmpr;act("Návrat z ošetřování: "+(pl(id)||{}).name,(L,n,i,t)=>{L.tmp=(L.tmp||[]).filter(x=>x!==id);const oc=ownCol(n,id);if(oc&&nomOf(n).includes(id)&&!COLS.some(c=>L.ice[c]===id)&&!L.q[oc].includes(id))L.q[oc].push(id);(n.injLog=n.injLog||[]).push({id,ty:"back",per:L.per,time:mmss(ela(L,t)),at:t})})});
Q2("[data-tmpp]").forEach(b=>b.onclick=()=>permInj(b.dataset.tmpp));
Q2("[data-gkp]").forEach(b=>b.onclick=()=>{cl();act("Brankářka",(L,n,i,t)=>{L.G=b.dataset.gkp;logEv(n,{ty:"gk",p:b.dataset.gkp,at:t,per:L.per})})});
Q2("[data-off]").forEach(b=>b.onclick=()=>{const id=b.dataset.off;cl();act("Z ledu: "+(pl(id)||{}).name,(L,n,i,t)=>{const c=COLS.find(k=>L.ice[k]===id);if(!c)return;leave(L,id,c,t);L.ice[c]=null;requeue(L,curM(),id,c)})});
Q2("[data-lim]").forEach(b=>b.onclick=()=>{LS.set("shiftMax",Math.max(30,shiftMax()+ +b.dataset.lim));liveRender()});
// Vypínač vibrace odezvy (v18.2); po zapnutí krátce zavibruje na zkoušku
Q2("[data-hap]").forEach(b=>b.onclick=()=>{const on=!hapticOn();setHaptic(on);if(on)haptic("ok");liveRender()})}
liveTick()}
// Odchod ze živého zápisu (v18.1): zastaví čas zápasu (bez záznamu do Zpět) a zavře obrazovku.
// Volá menu ⋯ → Zavřít živý zápis a tlačítko Zpět na telefonu (core/nav.js).
export function leaveLive(){const m=curM();S.qa=null;S.lmenu=false;S.lsub=null;S.injp=null;
if(m&&m.live&&m.live.running&&!m.closed)act(false,(L,n,i,t)=>{L.acc=t;L.running=false;L.t0=0});
S.lv=false;render()}
export function nudgeT(d){const m=curM();if(!m||!m.live)return;const L=m.live,el=el_(L)-L.pst;S.toffP=L.per;S.toff=Math.max(-el,toff(L)+d);liveTick()}
export function liveTick(){if(!S.lv)return;const m=curM();if(!m||!m.live)return;const L=m.live,now=el_(L),mx=shiftMax()*1000,w=[];
const c=$("#lclk");if(c)c.textContent=cd(perMs(L)-ela(L,now));
COLS.forEach(k=>{const p=L.ice[k];if(!p)return;const t=now-(L.since[p]||0),x=document.querySelector('[data-sh="'+p+'"]'),b=document.querySelector('[data-ice="'+k+'"]');if(x)x.textContent=mmss(t);if(b){b.classList.toggle("wr",t>=mx);b.classList.toggle("wr2",t>=mx*1.5)}
if(t>=mx){w.push(pn(p)+" "+mmss(t));const key=p+"@"+(L.since[p]||0);if(!S.wd[key]){S.wd[key]=1;navigator.vibrate&&navigator.vibrate([200,100,200])}}});
const z=$("#lwarn"),mx5=sk(L,"us",now),cnt=skCount(L);if(z)z.innerHTML=[cnt>mx5?"⚠️ Na ledě je "+cnt+" hráček, má být "+mx5+" – sundej hráčku (menu).":cnt<mx5&&COLS.some(c=>L.q[c].length)&&!(L.pen||[]).some(x=>x.t==="us"&&SA(x)&&x.end==null)?"ℹ️ Na ledě je "+cnt+" hráček, může být "+mx5+" – doplň hráčku.":"",w.length?"⚠️ Dlouhé střídání: "+w.join(" · "):""].filter(Boolean).join("<br>")||"✓ Bez upozornění";
document.querySelectorAll("[data-bx]").forEach(e=>{e.textContent=cd(+e.dataset.bx-now)});
if((L.pen||[]).some(x=>x.end!=null&&x.ty!=="gm"&&x.end<=now)&&!S.pp){S.pp=1;act(false,(L2,n2,i,t)=>{const r=procExp(L2,t);r.forEach(p=>logEv(n2,{ty:"ret",p,cause:"trest vypršel",at:t,per:L2.per}));if(r.length){toast("Trest skončil – na led se vrací: "+r.map(x=>(pl(x)||{}).name).join(", "));navigator.vibrate&&navigator.vibrate([150,80,150])}});setTimeout(()=>{S.pp=0},1500)}}