// Statistiky zápasu a zápis utkání (tisk / export).
import {COLS, SIT, UK, ULAB, USLOT, slab} from "../config/constants.js";
import {curM, isG, pl, pn, score, shots, skaters} from "../core/selectors.js";
import {S} from "../core/state.js";
import {$, esc, fd, mmss} from "../core/utils.js";
import {benchM} from "../domain/lineup.js";
import {el_} from "../domain/live-engine.js";

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
return`<h2 style="font-size:22px">Zápis utkání</h2><div class="cd"><b>${m.home?"HC Střely – "+esc(m.opp):esc(m.opp)+" – HC Střely"}</b><br><span class="mu">${fd(m.date)} · ${m.home?"doma":"venku"} · třetina ${m.perLen||20} min · ${m.closed?"zápas uzavřen":"zápas není uzavřen"}</span><div class="sc">${g} : ${o}</div><div class="mu" style="text-align:center">Střely ${sh.us} : ${sh.opp}</div></div>
<div class="cd"><h2>Souhrn</h2><div class="mu"><b>Góly:</b> ${lst(G)}<br><b>Asistence:</b> ${lst(A)}</div><div class="tw" style="margin-top:8px"><table style="min-width:340px"><tr><th></th><th>Góly</th><th>Střely</th></tr>${pers.map(n=>`<tr><td>${perN(n)}</td><td>${cnt(n,"us")}:${cnt(n,"opp")}</td><td>${scn(n,"us")}:${scn(n,"opp")}</td></tr>`).join("")}</table></div></div>
<div class="cd"><h2>Sestava</h2><div class="tw"><table style="min-width:480px"><tr><th>Pětka</th>${COLS.map(c=>`<th>${c}</th>`).join("")}</tr>${lines.map(n=>`<tr><td>${n}.</td>${COLS.map(c=>`<td>${nm(lu[n+c])}</td>`).join("")}</tr>`).join("")}</table></div><div class="mu" style="margin-top:6px"><b>Brankářky:</b> ${nm(lu.G1)}${lu.G2?", "+nm(lu.G2):""}<br><b>Náhradnice:</b> ${benchM(m).map(nm).join(", ")||"–"}${inj.length?"<br><b>Zranění:</b><br>"+inj.join("<br>"):""}${units.length?"<br><b>Jednotky:</b><br>"+units.map(k=>ULAB[k]+": "+USLOT[k].map(c=>slab(k,c)+" "+nm(((m.sp||{})[k]||{})[c])).join(", ")).join("<br>"):""}</div></div>
<div class="cd"><h2>Průběh (góly a tresty)</h2>${evs.length?evs.map(e=>`<div class="ev"><div class="t">${perN(e.per).replace(" třetina",". tř.")} ${esc(e.time||"")}</div><div class="b">${evT(e)}</div></div>`).join(""):'<div class="msg">Nic nezapsáno.</div>'}</div>
<div class="cd">${matchStatsHtml(m)}</div>`}
// CSS aplikace pro samostatný soubor se zápisem (inline <style>, jinak načtení stylesheetu)
export async function appCss(){const st=document.querySelector("style");if(st)return st.textContent;const l=document.querySelector('link[rel="stylesheet"]');try{return await(await fetch(l.href)).text()}catch(e){try{return [...document.styleSheets].flatMap(s=>[...s.cssRules].map(x=>x.cssText)).join("\n")}catch(e2){return ""}}}
export function renderReport(){const e=$("#rp");if(!S.rp){e.style.display="none";e.innerHTML="";return}const m=curM();if(!m){S.rp=false;return renderReport()}
e.style.display="block";e.innerHTML=`<div class="noprint" style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap"><button class="p" id="rpp">🖨 Tisk / PDF</button><button class="s" id="rpd">💾 Stáhnout (HTML)</button><button class="s" id="rpx">Zavřít</button></div>${reportHtml(m)}`;
$("#rpp").onclick=()=>window.print();$("#rpx").onclick=()=>{S.rp=false;renderReport()};
$("#rpd").onclick=async()=>{const css=await appCss(),h=`<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zápis utkání ${esc(m.opp)} ${m.date}</title><style>${css}</style></head><body><main style="padding:14px;max-width:1000px;margin:0 auto">${reportHtml(m)}</main></body></html>`,a=document.createElement("a");a.href=URL.createObjectURL(new Blob([h],{type:"text/html"}));a.download="zapis-"+m.date+"-"+String(m.opp).toLowerCase().replace(/[^a-z0-9]+/g,"-")+".html";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}}
