// Živý zápis – vykreslení obrazovky (#lv), situace a režim jednotek, průběžné odpočty a upozornění.
// Struktura: Importy -> Situace a režim jednotek (grpFor, unitView, unitQueueOrder, unitLabel) -> Vykreslení (liveRender)
//            -> Hlídač situace (watchSit) -> Čas a upozornění (liveTick). Menu ⋯ a panely: live-panels.js, obsluha klepnutí: live-events.js.
// Rozložení shora dolů: horní lišta (třetina, situace 5 na 5 / přesilovka / oslabení, štítky trestů s odpočtem a ✕ a nabídka jednotky
//   nebo ↩ Řady v řádku #lchips, čas, skóre) → hřiště (střela soupeře, červená středová čára, hráčky na ledě) → mantinel →
//   tlačítka pětek a fronty → průběh (všechny kroky zápasu z timeline() včetně střídání, nejnovější nahoře, góly podsvícené).
//   Upozornění (počet hráček na ledě i při čekajícím trestu, dlouhé střídání) jsou v horním řádku průběhu #lwarn, jen když nějaké je.
// Formace podle počtu našich hráček na ledě: 5 = pětky (při přesilovce PP), 4 = OS1/OS2, 3 = OS3/OS4. Po trestu se nabídne jednotka
//   k odsouhlasení (S.lsub "uask"); režim PP/OS trvá i při změně skupiny, k pětkám se vrací při vyrovnané hře. Hlídač situace
//   (watchSit) po změně počtů (konec trestu, gól, ✕, Zpět) nabídne jednotku nové skupiny. Po zranění se otevře Sestava s místem (S.lgap).
// Rotace: dlaždice má jedinou akci (na led), partnerka je malé tlačítko pod hráčkou (klepnutí = na led, podržení = pořadí rotace).
// Odezva (live-feedback.js): vibrace a záblesk po střídání, střele, gólu, trestu, nasazení pětky / jednotky a ↩ Zpět (vibrace jde vypnout v ⋯ → ⚙️).
// Čas na ledě počítá shiftList (nulová vynechá, navazující sloučí). Odchod ze živého zápisu (⋯ → Zavřít, Zpět) zastaví čas zápasu.

// ===== Importy =====
import {COLS, LAYOUT, ULAB} from "../config/constants.js";
import {TEAM_NAME} from "../config/team-config.js";
import {baseKey, curM, nomOf, pl, pn, score, shots, slotIds, slotKey} from "../core/selectors.js";
import {S} from "../core/state.js";
import {$, cd, esc, mmss, toast} from "../core/utils.js";
import {act, el_, ela, logEv, migrate, perMs, periodEndPlan, procExp, shiftMax, sk, skCount} from "../domain/live-engine.js";
import {perLabel, timeline} from "../domain/timeline.js";
import {qaHtml} from "./live-quick.js";
import {applyFlash} from "./live-feedback.js";
import {bindLive} from "./live-events.js";
import {bindPanels, panelHtml} from "./live-panels.js";

// ===== Situace a režim jednotek =====
// Skupina jednotek pro danou situaci: přesilovka → PP1/PP2, oslabení 4 hráčky → SH1/SH2, 3 hráčky → SH3/SH4; vyrovnaná hra → null
export const grpFor=(us,op)=>us>op?["PP1","PP2"]:op>us?(us===4?["SH1","SH2"]:["SH3","SH4"]):null;
// Režim PP/OS na obrazovce: je nasazená jednotka (L.unit) a hra je nevyrovnaná ve stejném smyslu (PP při přesilovce,
// OS při oslabení). Jednotka nemusí být ze skupiny platné situace (OS3 při 4 na 5) – tlačítka a fronty pak ukazují novou skupinu.
export const unitView=(L,us,op)=>{const g=grpFor(us,op);return !!L.unit&&!!g&&L.unit[0]===g[0][0]};
// Pořadí jednotek pro fronty v režimu PP/OS: nejdřív ostatní jednotky platné skupiny, nakonec aktivní (je-li z této skupiny)
const unitQueueOrder=(L,g)=>[...g.filter(k=>k!==L.unit),...(g.includes(L.unit)?[L.unit]:[])];
// Krátký popisek jednotky pro tlačítko (dlouhý název je v ULAB)
const unitLabel=k=>k[0]==="P"?"⚡ PP "+k[2]:"🛡 OS "+(k==="SH1"||k==="SH3"?1:2);

// ===== Vykreslení =====
// Sestaví celou obrazovku živého zápisu, pak napojí obsluhu (live-events.js) a panely menu ⋯ (live-panels.js)
export function liveRender(){const e=$("#lv");
if(!S.lv){if(e.style.display!=="none"){e.innerHTML="";e.style.display="none"}if(S.wl){S.wl.release().catch(()=>{});S.wl=null}return}
const m=curM();if(!m||!m.live||m.closed){S.lv=false;e.style.display="none";return}
if(!S.wl&&navigator.wakeLock)navigator.wakeLock.request("screen").then(l=>S.wl=l).catch(()=>{});
e.style.display="block";migrate(m.live);const L=m.live,[g,o]=score(m),sh=shots(m),now=el_(L),us=sk(L,"us",now),op=sk(L,"opp",now),u=(L.u||[]).slice(-1)[0],run=L.running,ended=!!m.end,plan=periodEndPlan(m);
const sit=us>op?"Přesilovka "+us+" na "+op:op>us?"Oslabení "+us+" na "+op:us+" na "+op,grp=grpFor(us,op),uv=unitView(L,us,op);e.style.paddingBottom=run?"130px":"310px";const lay=LAYOUT(us),shown=COLS.filter(c=>lay.includes(c)||L.ice[c]),gt=`grid-template-columns:repeat(${shown.length},minmax(0,1fr))`;
// Zobrazené fronty.
// Běžné řady: při oslabení se fronty skrytých sloupců (PK, u 3 hráček i LK) přidají pod nejbližší viditelný sloupec (stejné pořadí jako ve fitLayout), aby čekající hráčky šly nasadit.
// Režim PP/OS (uv): ve frontě jsou hráčky z jednotek platné skupiny (i po změně skupiny, např. OS3 → OS1/OS2; aktivní
// jednotka nakonec, pokud do skupiny patří), bez rotace; nemá-li jednotky nikdo na střídání, zobrazí se běžná fronta.
const um=uv,onIce=new Set(COLS.map(c=>L.ice[c]).filter(Boolean)),HM={LK:["LK","C"],PK:["LK","C"]},dq={};
if(um){const bad=new Set([...(L.pen||[]).filter(x=>x.t==="us"&&x.p).map(x=>x.p),...(L.tmp||[])]),nmL=nomOf(m),ord=unitQueueOrder(L,grp);
shown.forEach(c=>{const seen=new Set(),a=[];ord.forEach(k=>{const id=((m.sp||{})[k]||{})[c];if(id&&!seen.has(id)&&!onIce.has(id)&&!bad.has(id)&&nmL.includes(id)&&pl(id)){seen.add(id);a.push(id)}});dq[c]=a});
if(!shown.some(c=>dq[c].length))shown.forEach(c=>{dq[c]=[...(L.q[c]||[])]})}
else{shown.forEach(c=>{dq[c]=[...(L.q[c]||[])]});
COLS.filter(c=>!shown.includes(c)).forEach(hc=>{const t=(HM[hc]||["C"]).find(x=>shown.includes(x))||shown[0];if(t)(L.q[hc]||[]).forEach(id=>{if(!dq[t].includes(id))dq[t].push(id)})})}
// ===== Rozložení – shora dolů =====
// 1) horní lišta (sticky): řádek třetiny #lchips (třetina, situace, malé štítky trestů s odpočtem a ✕, nabídka jednotky PP/OS /
//    ↩ Řady – jeden řádek, posouvá se do strany, takže nic pod lištou neposune), čas ◀ ▶, skóre se střelami
// 2) hřiště: STŘELA NA NAŠI BRÁNU → červená středová čára → hráčky na ledě (klepnutí = střela)
// 3) mantinel → tlačítka celých pětek (v režimu PP/OS tlačítka jednotek situace a ↩ Řady)
// 4) pod každým místem sloupec čekajících: na řadě (větší dlaždice) → pod ní malé tlačítko rotující partnerky → další ve frontě
//    → dole partnerky hráček na ledě; 5) průběh s řádkem upozornění nahoře (jen když nějaké je).
const tag=`<span class="tag ${us>op?"pp":op>us?"sh":""} lsit">${sit}</span>`,
// Štítek trestu (kompaktní): naše hráčka číslem (bez čísla jménem), soupeř „Soup.“, odpočet / délka a ✕
pnum=id=>{const p=pl(id);return p?(p.num?"#"+esc(p.num):esc(p.name)):"?"},
pchips=(L.pen||[]).map(x=>{const tl={min:"2'",maj:"5'",mis:"10'",gm:"DK"}[x.ty],t=x.ty==="gm"?tl:x.end!=null?`<b data-bx="${x.end}">${cd(x.end-now)}</b>`:`čeká ${mmss(x.rem)}`;return`<span class="lchip pen" title="${x.t==="us"?esc((pl(x.p)||{}).name||""):"Soupeř"}">🚫 ${x.t==="us"?pnum(x.p):"Soup."} ${t}<button data-pcx="${x.id}" aria-label="Zrušit trest" title="Zrušit trest">✕</button></span>`}).join(""),
// Nabídka jednotky při nerovnosti bez režimu PP/OS nebo s jednotkou jiné skupiny; jednotka z minulé nerovnosti → ↩ Řady
uchips=(grp&&(!uv||!grp.includes(L.unit))?`<button class="lchip ub ${us>op?"pp":"sh"}" data-uask="1">${us>op?"⚡ PP":"🛡 OS"}</button>`:"")+(L.unit&&!uv?`<button class="lchip ub" data-lines="1">↩ Řady</button>`:""),
chips=pchips+uchips;
let h=`<div class="lt lt-b"><div class="lt-r1"><div class="lt-left"><div class="lper" id="lchips"><small>${L.per<4?L.per+". třetina":"Prodloužení"}</small>${tag}${chips}</div><div style="display:flex;align-items:center;gap:10px"><button id="tm5" aria-label="Posunout čas o 5 s zpět" title="O 5 s zpět" class="lnud">◀</button><b id="lclk">${cd(perMs(L)-ela(L,now))}</b><button id="tp5" aria-label="Posunout čas o 5 s dopředu" title="O 5 s dopředu" class="lnud">▶</button></div></div><div class="lsc">${g}:${o}<small>střely ${sh.us}:${sh.opp}</small></div></div></div>`;
// Pomocné pro dlaždice: pětka hráčky (barva), číslo, jméno
const lineOf=id=>{const k=Object.keys(m.lineup||{}).find(k=>m.lineup[k]===id&&/^\d/.test(k));return k?+k[0]:0},numOf=id=>((pl(id)||{}).num)||"–",nmOf=id=>esc((pl(id)||{}).name||"?");
const firstUp=new Set(shown.map(c=>dq[c][0]).filter(Boolean)),waiting=new Set(COLS.flatMap(c=>dq[c]||[])),lastShift=(L.sh||[]).slice(-1)[0],playerState=id=>`live-player${onIce.has(id)?" on-ice":""}${firstUp.has(id)?" next":""}${lastShift&&lastShift.p===id&&waiting.has(id)?" just-off":""}`;
// 2) Hřiště: obdélník v barvě ledu – nahoře střela soupeře, tlustá červená středová čára, pod ní hráčky na ledě
h+=`<div class="lrink"><button class="lgk${run?"":" dd"}" id="lgk">🥅 STŘELA NA NAŠI BRÁNU<br><small style="font-weight:400">${L.G?pn(L.G):"brankářka?"} · střely soupeře: ${sh.opp}${run?"":" · hra je přerušena"}</small></button><div class="ldiv" aria-hidden="true"></div>`;
// Hráčky na ledě: popisky míst a dlaždice (klepnutí = střela, odpočet střídání)
h+=`<div class="lg lpos" style="${gt}">${shown.map(c=>`<small class="mu" style="text-align:center;font-size:11px">${us===4&&c==="LK"?"Ú":c}</small>`).join("")}</div>`;
h+=`<div class="lg ice-strip" style="${gt}">${shown.map(c=>{const p=L.ice[c];return p?`<button class="lice L${lineOf(p)} ${playerState(p)} tl" data-ice="${c}"><span class="n">${numOf(p)}</span><span class="nm">${nmOf(p)}</span><span class="t" data-sh="${p}">${mmss(now-(L.since[p]||0))}</span></button>`:`<button class="lice tl" data-ice="${c}"><span class="nm">— prázdné —</span></button>`}).join("")}</div></div>`;
// 3) Mantinel a za ním tlačítka: běžně celé pětky (nasadí celou pětku najednou), v režimu PP/OS jednotky situace a ↩ Řady
h+=`<div class="lboard" aria-hidden="true"></div>`;
if(uv)h+=`<div class="row lpl-row lunit-row">${grp.map(k=>`<button class="ub ${k[0]==="P"?"pp":"sh"}${L.unit===k?" on":""}" data-unit="${k}" title="${ULAB[k]}">${unitLabel(k)}</button>`).join("")}<button class="ub" data-lines="1" title="Zpět na běžné pětky">↩ Řady</button></div>`;
else{const lbn=[1,2,3,4].filter(n=>COLS.some(c=>(m.lineup||{})[n+c]));
if(lbn.length)h+=`<div class="row lpl-row">${lbn.map(n=>`<button class="L${n}" data-pline="${n}" title="Celá ${n}. pětka na led">${n}. pětka</button>`).join("")}</div>`}
// 4) Čekající a rotace (B3): partnerky = ostatní hráčky téhož místa sestavy (k+, k++), které jsou k dispozici
// (ne na ledě, ne ve frontě, ne vyloučené ani v ošetřování); při aktivní jednotce PP/OS se rotace nepoužívá.
const unav=new Set([...(L.pen||[]).filter(x=>x.t==="us"&&x.p).map(x=>x.p),...(L.tmp||[])]),nomL=nomOf(m),
rp=id=>{if(um)return[];const lu=m.lineup||{},k=slotKey(lu,id);if(!k)return[];return slotIds(lu,baseKey(k)).filter(x=>x!==id&&pl(x)&&nomL.includes(x)&&!onIce.has(x)&&!waiting.has(x)&&!unav.has(x))},
pbtn=(x,c,of)=>`<button class="lrp L${lineOf(x)}${of?"":" ofice"}" data-rp="${x}" data-col="${c}"${of?` data-of="${of}"`:""} title="${of?"Klepnutí: rovnou na led · podržení: změnit pořadí rotace":"Klepnutí: vystřídá partnerku na ledě"}">⇄ ${numOf(x)} ${nmOf(x)}</button>`,
colHtml=c=>{let s="";(dq[c]||[]).slice(0,8).forEach((q,i)=>{s+=`<button class="lq L${lineOf(q)} ${playerState(q)} tl${i===0?" nx":""}" data-q="${q}" data-col="${c}"><span class="n">${numOf(q)}</span><span class="nm">${nmOf(q)}</span></button>`;rp(q).forEach(x=>{s+=pbtn(x,c,q)})});
const ip=L.ice[c];if(ip)rp(ip).forEach(x=>{s+=pbtn(x,c,null)});return`<div class="lqcol">${s}</div>`};
h+=`<div class="lg lqs" style="${gt}">${shown.map(colHtml).join("")}</div>`;
// Průběh: všechny kroky zápasu včetně střídání, nejnovější nahoře; dlouhá střídání zvýrazněná.
// Horní řádek průběhu #lwarn plní liveTick a ukazuje se jen, když nějaké upozornění je (průběh je dole – nic neposune).
// Góly podsvícené podle týmu: náš gól .lev-gu (zelená), gól soupeře .lev-go (červená) – barvy pro obě schémata v main.css.
const lim=shiftMax()*1000,tl=timeline(m,{shots:true,subs:true,limit:lim}).reverse(),evCls=x=>x.kind==="G"?(x.team==="us"?" lev-gu":" lev-go"):"";
h+=`<div style="margin-top:22px"><div class="mu" style="text-align:center;margin-bottom:4px">PRŮBĚH</div><div id="lwarn" style="display:none"></div><div style="height:220px;overflow:auto;border:1px solid var(--bd);border-radius:8px;padding:0 6px">${tl.map(x=>`<div class="ev${evCls(x)}" style="padding:6px 0;${x.long?"background:#fff3dc;color:#5a3a00;border-radius:6px;padding-left:4px;padding-right:4px":""}"><div class="t">${perLabel(x.per)} ${esc(x.el)}</div><div class="b">${esc(x.text)}</div></div>`).join("")||'<div class="mu" style="text-align:center;padding:10px 0">Zatím nic.</div>'}</div></div>`;
h+=`<div class="lb" style="flex-direction:column;gap:10px">${run?"":ended?`<div style="display:flex;gap:12px"><button id="lmn" style="flex:1;font-size:15px">⋯ Další volby</button></div>`:`<div style="display:flex;gap:12px"><button id="qg" style="flex:1;font-size:16px;background:var(--ac);color:#fff;border-color:transparent">🥅 Gól ${TEAM_NAME}</button><button id="qo" style="flex:1;font-size:16px;background:var(--no);color:#fff;border-color:transparent">🥅 Gól soupeř</button></div><div style="display:flex;gap:12px"><button id="qp" style="flex:1;font-size:15px">🚫 Trest</button><button id="lmn" style="flex:1;font-size:15px">⋯ Další volby</button></div>`}<div style="display:flex;gap:12px"><button id="lun" style="flex:1;font-size:14px" title="${u?esc(u.t):""}">↩ Zpět</button><button id="lpl" style="flex:2.4;font-size:20px;background:${ended?"#6b7480":run?"var(--no)":"var(--ok)"};color:#fff;border-color:transparent">${ended?"🏁 Zápas ukončen":run?"⏸ Přerušit":"▶ Start"}</button></div></div>`;
// Menu ⋯ a panely (sestava, jednotky, zranění, brankářka, čas na ledě, nastavení) – live-panels.js
h+=panelHtml({m,L,us,op,run,ended,plan,sit,grp,uv});
if(S.qa)h+=qaHtml(m,L);
e.innerHTML=h;applyFlash(e);
// Obsluha klepnutí na obrazovce a v panelech (stejné pořadí napojení jako dřív v jednom souboru)
const ctx={e,m,L,run,ended,plan};bindLive(ctx);bindPanels(ctx);
liveTick();watchSit(m,L,us,op,ended)}
// ===== Hlídač situace =====
// Volá se po každém vykreslení. Pamatuje si zápas, počty a skupinu jednotek (S.lsit). Když se počty změní (konec trestu,
// gól ukončil trest, zrušení ✕, ↩ Zpět) a hra je dál nevyrovnaná s jinou skupinou jednotek (3 na 5 → 4 na 5 = OS3/OS4 → OS1/OS2,
// oslabení ↔ přesilovka) a nasazená jednotka do ní nepatří, otevře nabídku jednotky. Při vyrovnané hře zavře otevřenou nabídku.
// Nic nezapisuje; nepřekryje jiné otevřené okno (menu, rychlý zápis). První vykreslení zápasu jen uloží výchozí stav.
function watchSit(m,L,us,op,ended){const g=grpFor(us,op),gk=g?g.join(","):"",cur={id:m.id,us,op,gk},prev=S.lsit;S.lsit=cur;
if(!prev||prev.id!==m.id||(prev.us===us&&prev.op===op)||ended)return;
if(!g){if(S.lmenu&&S.lsub==="uask"){S.lmenu=false;S.lsub=null;S.uk=null;liveRender()}return}
if(prev.gk===gk||(L.unit&&g.includes(L.unit))||S.qa||(S.lmenu&&S.lsub!=="uask"))return;
S.lmenu=true;S.lsub="uask";S.uk=null;liveRender()}
// ===== Čas a upozornění =====
// Každou sekundu (main.js): odpočty, dlouhá střídání, řádek upozornění, konec trestů
export function liveTick(){if(!S.lv)return;const m=curM();if(!m||!m.live)return;const L=m.live,now=el_(L),mx=shiftMax()*1000,w=[];
const c=$("#lclk");if(c)c.textContent=cd(perMs(L)-ela(L,now));
COLS.forEach(k=>{const p=L.ice[k];if(!p)return;const t=now-(L.since[p]||0),x=document.querySelector('[data-sh="'+p+'"]'),b=document.querySelector('[data-ice="'+k+'"]');if(x)x.textContent=mmss(t);if(b){b.classList.toggle("wr",t>=mx);b.classList.toggle("wr2",t>=mx*1.5)}
if(t>=mx){w.push(pn(p)+" "+mmss(t));const key=p+"@"+(L.since[p]||0);if(!S.wd[key]){S.wd[key]=1;navigator.vibrate&&navigator.vibrate([200,100,200])}}});
// Upozornění v horním řádku průběhu – řádek je vidět, jen když nějaké je.
// Chybějící hráčka se hlásí vždy jako varování ⚠️ (i při čekajícím trestu – 2+2, třetí trest).
const z=$("#lwarn");if(z){const mx5=sk(L,"us",now),op=sk(L,"opp",now),cnt=skCount(L),wa=[],nf=[],ended=!!m.end;
if(!ended&&cnt>mx5)wa.push("⚠️ Přebývá hráčka: na ledě je "+cnt+", má být "+mx5+" – sundej ji (⋯ → Sundat z ledu).");
if(!ended&&cnt<mx5)wa.push("⚠️ Chybí hráčka na ledě: je "+cnt+", má být "+mx5+" – pošli hráčku z fronty.");
if(w.length)wa.push("⚠️ Dlouhé střídání: "+w.join(" · "));
if(!ended&&L.unit&&!unitView(L,mx5,op))wa.push(grpFor(mx5,op)?"⚠️ Situace se změnila, na ledě je jednotka "+(ULAB[L.unit]||L.unit)+" – potvrď novou jednotku nebo ↩ Řady.":"⚠️ Nerovnost skončila, na ledě je jednotka "+(ULAB[L.unit]||L.unit)+" – pošli pětku nebo ↩ Řady.");
if(!ended&&!L.G)wa.push("⚠️ Není vybraná brankářka (⋯ → Brankářka).");
const pp=[...new Set((L.pen||[]).filter(x=>x.t==="us"&&x.p).map(x=>x.p))];if(pp.length)nf.push("🚫 Na trestu: "+pp.map(pn).join(", "));
if((L.tmp||[]).length)nf.push("🩹 V ošetřování: "+L.tmp.map(pn).join(", "));
const html=[...wa.map(x=>`<div class="lw-w">${x}</div>`),...nf.map(x=>`<div class="lw-i">${x}</div>`)].join("");
if(z.innerHTML!==html)z.innerHTML=html;z.style.display=html?"block":"none"}
document.querySelectorAll("[data-bx]").forEach(e=>{e.textContent=cd(+e.dataset.bx-now)});
if((L.pen||[]).some(x=>x.end!=null&&x.ty!=="gm"&&x.end<=now)&&!S.pp){S.pp=1;act(false,(L2,n2,i,t)=>{const r=procExp(L2,t);r.forEach(p=>logEv(n2,{ty:"ret",p,cause:"trest vypršel",at:t,per:L2.per}));if(r.length){toast("Trest skončil – na led se vrací: "+r.map(x=>(pl(x)||{}).name).join(", "));navigator.vibrate&&navigator.vibrate([150,80,150])}});setTimeout(()=>{S.pp=0},1500)}}
