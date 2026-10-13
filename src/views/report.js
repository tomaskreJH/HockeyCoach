// Statistiky zápasu a zápis utkání (tisk / export).
import {COLS, SIT, UK, ULAB, USLOT, slab} from "../config/constants.js";
import {curM, isG, pl, pn, score, shots, skaters} from "../core/selectors.js";
import {S} from "../core/state.js";
import {$, downloadFile, esc, fd, mmss} from "../core/utils.js";
import {benchM} from "../domain/lineup.js";
import {nameOf, perLabel, shiftStats, timeline} from "../domain/timeline.js";
import {el_, shiftMax} from "../domain/live-engine.js";

// statistiky zápasu
export function matchStatsHtml(m){const L=m.live,now=L?el_(L):0,T={},GK={},g=id=>T[id]=T[id]||{toi:0,sw:0,g:0,a:0,sh:0,pim:0,pm:0},gg=id=>GK[id]=GK[id]||{sa:0,ga:0};
skaters(m.lineup).forEach(g);
if(L){(L.sh||[]).forEach(x=>{const r=g(x.p);r.toi+=x.b-x.a;r.sw++});COLS.forEach(c=>{const p=L.ice[c];if(p){const r=g(p);r.toi+=now-(L.since[p]||0);r.sw++}})}
(m.events||[]).forEach(e=>{
if(e.k==="G"){const us=e.team==="us";if(us){g(e.scorer).g++;g(e.scorer).sh++;[e.a1,e.a2].filter(Boolean).forEach(i=>g(i).a++)}else{const k=e.gk||(e.on||[]).find(i=>isG(pl(i)));if(k){gg(k).sa++;gg(k).ga++}}
 if(e.sit!=="PP")(e.on||[]).forEach(i=>{if(!isG(pl(i)))g(i).pm+=us?1:-1})}
else if(e.k==="S"){if(e.team==="us"){if(e.shooter)g(e.shooter).sh++}else if(e.gk)gg(e.gk).sa++}
else if(e.k==="P"&&e.team==="us"&&e.pid)g(e.pid).pim+=e.min});
const rows=Object.entries(T).filter(([id])=>pl(id)).sort((x,y)=>y[1].toi-x[1].toi||(y[1].g+y[1].a)-(x[1].g+x[1].a)),hl=!!L;
return`<h2>Statistiky zápasu</h2>${rows.length?`<div class="tw"><table><tr><th>Hráčka</th><th>Čas na ledě</th><th>Střídání</th><th>G</th><th>A</th><th>B</th><th>Střely</th><th>TM</th><th>+/-</th></tr>${rows.map(([id,s])=>`<tr><td><b>${pn(id)}</b></td><td>${hl?mmss(s.toi):"–"}</td><td>${hl?s.sw:"–"}</td><td>${s.g}</td><td>${s.a}</td><td><b>${s.g+s.a}</b></td><td>${s.sh}</td><td>${s.pim}</td><td>${s.pm>0?"+":""}${s.pm}</td></tr>`).join("")}</table></div>`:'<div class="msg">Zatím bez sestavy.</div>'}${Object.keys(GK).length?`<h3>Brankářky</h3><div class="tw"><table style="min-width:360px"><tr><th>Brankářka</th><th>Střely</th><th>Góly</th><th>Zákroky</th><th>Úspěšnost</th></tr>${Object.entries(GK).map(([id,k])=>`<tr><td><b>${pn(id)}</b></td><td>${k.sa}</td><td>${k.ga}</td><td>${k.sa-k.ga}</td><td>${k.sa?(100*(k.sa-k.ga)/k.sa).toFixed(1).replace(".",",")+" %":"–"}</td></tr>`).join("")}</table></div>`:""}`}
export function reportHtml(m){const[g,o]=score(m),sh=shots(m),E=m.events||[],lu=m.lineup||{},nm=id=>id?pn(id):"–",perN=n=>n<4?n+". třetina":"Prodloužení";
const evs=E.map((e,i)=>({e,i})).filter(x=>x.e.k!=="S").sort((a,b)=>a.e.per-b.e.per||(a.e.time||"").localeCompare(b.e.time||"")||a.i-b.i).map(x=>x.e);
const pers=[1,2,3,4].filter(n=>n<=3||E.some(e=>e.per===n));
const cnt=(n,t)=>E.filter(e=>e.k==="G"&&e.team===t&&e.per===n).length,scn=(n,t)=>E.filter(e=>(e.k==="S"||e.k==="G")&&e.team===t&&e.per===n).length;
const G={},A={};E.forEach(e=>{if(e.k==="G"&&e.team==="us"){if(e.scorer)G[e.scorer]=(G[e.scorer]||0)+1;[e.a1,e.a2].filter(Boolean).forEach(i=>A[i]=(A[i]||0)+1)}});
const lst=o2=>Object.entries(o2).sort((x,y)=>y[1]-x[1]).map(([id,n])=>nm(id)+(n>1?" ("+n+")":"")).join(", ")||"–";
const lines=[1,2,3,4].filter(n=>COLS.some(c=>lu[n+c])),inj=(m.injLog||[]).map(x=>({tmp:"🩹 dočasně vyřazena",perm:"🤕 trvalé zranění",back:"↩ vrácena do sestavy"}[x.ty]+": "+nm(x.id)+" ("+x.per+". tř. "+(x.time||"")+")"));
const units=UK.filter(k=>Object.values((m.sp||{})[k]||{}).some(Boolean));
const evT=e=>e.k==="G"?(e.team==="us"?"⚽ Gól: <b>"+nm(e.scorer)+"</b> (asistence: "+([e.a1,e.a2].filter(Boolean).map(nm).join(", ")||"bez asistence")+") – "+(SIT[e.sit]||SIT.E):"⚽ Gól soupeře – "+(SIT[e.sit]||SIT.E)):"🚫 "+(e.team==="us"?nm(e.pid):"Soupeř")+" – "+e.min+" min"+(e.reason?", "+esc(e.reason):"");
return`<h2 style="font-size:22px">Zápis utkání <small class="mu" style="font-weight:400">– oficiální část</small></h2><div class="cd"><b>${m.home?"HC Střely – "+esc(m.opp):esc(m.opp)+" – HC Střely"}</b><br><span class="mu">${fd(m.date)} · ${m.home?"doma":"venku"} · třetina ${m.perLen||20} min · ${m.end?"ukončen po "+(m.end.per<4?m.end.per+". třetině":"prodloužení"):"zápas neukončen"} · ${m.closed?"uzavřen":"neuzavřen"}${m.ot===false?" · bez prodloužení":""}</span><div class="sc">${g} : ${o}</div><div class="mu" style="text-align:center">Střely ${sh.us} : ${sh.opp}</div></div>
<div class="cd"><h2>Souhrn</h2><div class="mu"><b>Góly:</b> ${lst(G)}<br><b>Asistence:</b> ${lst(A)}</div><div class="tw" style="margin-top:8px"><table style="min-width:340px"><tr><th></th><th>Góly</th><th>Střely</th></tr>${pers.map(n=>`<tr><td>${perN(n)}</td><td>${cnt(n,"us")}:${cnt(n,"opp")}</td><td>${scn(n,"us")}:${scn(n,"opp")}</td></tr>`).join("")}</table></div></div>
<div class="cd"><h2>Sestava</h2><div class="tw"><table style="min-width:480px"><tr><th>Pětka</th>${COLS.map(c=>`<th>${c}</th>`).join("")}</tr>${lines.map(n=>`<tr><td>${n}.</td>${COLS.map(c=>`<td>${nm(lu[n+c])}</td>`).join("")}</tr>`).join("")}</table></div><div class="mu" style="margin-top:6px"><b>Brankářky:</b> ${nm(lu.G1)}${lu.G2?", "+nm(lu.G2):""}<br><b>Náhradnice:</b> ${benchM(m).map(nm).join(", ")||"–"}${inj.length?"<br><b>Zranění:</b><br>"+inj.join("<br>"):""}${units.length?"<br><b>Jednotky:</b><br>"+units.map(k=>ULAB[k]+": "+USLOT[k].map(c=>slab(k,c)+" "+nm(((m.sp||{})[k]||{})[c])).join(", ")).join("<br>"):""}</div></div>
<div class="cd"><h2>Průběh (góly a tresty)</h2>${evs.length?evs.map(e=>`<div class="ev"><div class="t">${perN(e.per).replace(" třetina",". tř.")} ${esc(e.time||"")}</div><div class="b">${evT(e)}</div></div>`).join(""):'<div class="msg">Nic nezapsáno.</div>'}</div>
<div class="cd">${matchStatsHtml(m)}</div>${detailHtml(m)}`}
// CSS aplikace pro samostatný soubor se zápisem (inline <style>, jinak načtení stylesheetu)
export async function appCss(){const st=document.querySelector("style");if(st)return st.textContent;const l=document.querySelector('link[rel="stylesheet"]');try{return await(await fetch(l.href)).text()}catch(e){try{return [...document.styleSheets].flatMap(s=>[...s.cssRules].map(x=>x.cssText)).join("\n")}catch(e2){return ""}}}
// Podrobný rozbor: úplný vývoj zápasu a statistika střídání (dlouhá střídání jsou označena)
export function detailHtml(m){const lim=shiftMax()*1000,tl=timeline(m,{shots:S.rpShots,subs:S.rpSubs,limit:lim}),st=shiftStats(m,lim);
return`<div class="pb"></div><h2 style="font-size:22px;margin-top:24px">Podrobný rozbor zápasu</h2>
<div class="cd"><h2>Kompletní vývoj zápasu</h2><div class="mu" style="margin-bottom:8px">Góly, tresty, střely, střídání, zranění a další události v pořadí, jak proběhly. ⚠️ označuje střídání delší než ${mmss(lim)} (limit dlouhého střídání).</div>${tl.length?tl.map(e=>`<div class="ev" style="${e.long?"background:#fff3dc;color:#5a3a00;border-radius:8px;padding-left:6px;padding-right:6px":""}"><div class="t">${perLabel(e.per)} ${esc(e.el)}</div><div class="b">${esc(e.text)}</div></div>`).join(""):'<div class="msg">Zatím nic nezapsáno.</div>'}</div>
<div class="cd"><h2>Střídání hráček</h2>${st.length?`<div class="tw"><table style="min-width:500px"><tr><th>Hráčka</th><th>Střídání</th><th>Čas na ledě</th><th>Průměrné</th><th>Nejdelší</th><th>Dlouhých</th></tr>${st.map(r=>`<tr><td><b>${esc(nameOf(r.p))}</b></td><td>${r.n}</td><td>${mmss(r.total)}</td><td>${mmss(r.avg)}</td><td>${r.max>=lim?"⚠️ ":""}${mmss(r.max)} <small class="mu">(${perLabel(r.maxPos.per)} ${mmss(r.maxPos.el)})</small></td><td>${r.long}</td></tr>`).join("")}</table></div><div class="mu" style="margin-top:6px">Nejdelší střídání je uvedeno s časem, kdy skončilo. Střídání, které na konci zápisu ještě trvá, se počítá do konce. Dlouhé = ${mmss(lim)} a více.</div>`:'<div class="msg">Střídání nebyla zaznamenána (živý zápis nebyl použit).</div>'}</div>`}
// CSV pro Excel (středník, UTF-8 s BOM)
const csv=rows=>"\ufeff"+rows.map(r=>r.map(v=>'"'+String(v==null?"":v).replace(/"/g,'""')+'"').join(";")).join("\r\n");
const KIND={G:"Gól",P:"Vyloučení",S:"Střela",sub:"Střídání",inj:"Zranění",start:"Začátek zápasu",per:"Konec třetiny",unit:"Jednotka",end:"Konec zápasu",gk:"Brankářka",ret:"Návrat z trestu"};
export function csvTimeline(m){const lim=shiftMax()*1000;return csv([["Třetina","Čas","Typ","Událost","Dlouhé střídání"],...timeline(m,{shots:true,subs:true,limit:lim}).map(e=>[perLabel(e.per),e.el,KIND[e.kind]||e.kind,e.text,e.long?"ano":""])])}
export function csvShifts(m){const lim=shiftMax()*1000,s2=x=>Math.round(x/1000);return csv([["Hráčka","Střídání","Čas na ledě (s)","Průměrné střídání (s)","Nejdelší střídání (s)","Dlouhých (limit "+s2(lim)+" s)"],...shiftStats(m,lim).map(r=>[nameOf(r.p),r.n,s2(r.total),s2(r.avg),s2(r.max),r.long])])}
export function renderReport(){const e=$("#rp");if(!S.rp){e.style.display="none";e.innerHTML="";return}const m=curM();if(!m){S.rp=false;return renderReport()}
e.style.display="block";e.innerHTML=`<div class="noprint" style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap"><button class="p" id="rpp">🖨 Tisk / PDF</button><button class="s" id="rpd">💾 HTML</button><button class="s" id="rpc1">⬇️ CSV vývoj</button><button class="s" id="rpc2">⬇️ CSV střídání</button><button class="s" id="rpx">Zavřít</button></div><div class="noprint" style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap"><button class="chip ${S.rpShots?"on":""}" id="rps">Střely ve vývoji</button><button class="chip ${S.rpSubs?"on":""}" id="rpu">Střídání ve vývoji</button></div>${reportHtml(m)}`;
const base="zapis-"+m.date+"-"+String(m.opp).toLowerCase().replace(/[^a-z0-9]+/g,"-");
$("#rpp").onclick=()=>window.print();$("#rpx").onclick=()=>{S.rp=false;renderReport()};
$("#rps").onclick=()=>{S.rpShots=!S.rpShots;renderReport()};$("#rpu").onclick=()=>{S.rpSubs=!S.rpSubs;renderReport()};
$("#rpc1").onclick=()=>downloadFile(base+"-vyvoj.csv",csvTimeline(m),"text/csv");$("#rpc2").onclick=()=>downloadFile(base+"-stridani.csv",csvShifts(m),"text/csv");
$("#rpd").onclick=async()=>{const css=await appCss();downloadFile(base+".html",`<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zápis utkání ${esc(m.opp)} ${m.date}</title><style>${css}</style></head><body><main style="padding:14px;max-width:1000px;margin:0 auto">${reportHtml(m)}</main></body></html>`,"text/html")}}
