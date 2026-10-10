// Záložka Statistiky: sezónní přehledy.
import {isG, luPlayers, pl, pn} from "../core/selectors.js";
import {S} from "../core/state.js";

export function stats(a){const T={};const GK={},TT={sf:0,sa:0,gf:0,ga:0};const gg=id=>GK[id]=GK[id]||{sa:0,ga:0};const g=id=>T[id]=T[id]||{sh:0,gp:0,g:0,a:0,pim:0,pm:0,ppg:0,hp:0,ap:0};
S.ma.filter(m=>m.closed).forEach(m=>{luPlayers(m.lineup).forEach(id=>g(id).gp++);(m.events||[]).forEach(e=>{
if(e.k==="G"){const us=e.team==="us";
if(us){const s=g(e.scorer);s.g++;s.sh++;if(e.sit==="PP")s.ppg++;[e.scorer,e.a1,e.a2].filter(Boolean).forEach(id=>g(id)[m.home?"hp":"ap"]++);[e.a1,e.a2].filter(Boolean).forEach(id=>g(id).a++)}
if(e.sit!=="PP")(e.on||[]).forEach(id=>g(id).pm+=us?1:-1)}
else if(e.team==="us"&&e.pid)g(e.pid).pim+=e.min;
if(e.k==="G"){if(e.team==="us"){TT.sf++;TT.gf++}else{TT.sa++;TT.ga++;const k=e.gk||((e.on||[]).find(i=>pl(i)&&isG(pl(i))));if(k){gg(k).sa++;gg(k).ga++}}}
if(e.k==="S"){if(e.team==="us"){TT.sf++;if(e.shooter)g(e.shooter).sh++}else{TT.sa++;if(e.gk)gg(e.gk).sa++}}})});
const r=Object.entries(T).filter(([id])=>pl(id)).sort((x,y)=>(y[1].g+y[1].a)-(x[1].g+x[1].a));
a.innerHTML=`<div class="cd"><h2>Statistiky hráčů</h2><div class="mu" style="margin-bottom:8px">+/- se nezapočítává u gólů v přesilovce. B = góly + asistence.</div>${r.length?`<div class="tw"><table><tr><th>Hráč</th><th>Z</th><th>Střely</th><th>G</th><th>%</th><th>A</th><th>B</th><th>+/-</th><th>TM</th><th>G v PP</th><th>B doma</th><th>B venku</th></tr>${r.map(([id,s])=>`<tr><td><b>${pn(id)}</b></td><td>${s.gp}</td><td>${s.sh}</td><td>${s.g}</td><td>${s.sh?Math.round(100*s.g/s.sh)+" %":"–"}</td><td>${s.a}</td><td><b>${s.g+s.a}</b></td><td>${s.pm>0?"+":""}${s.pm}</td><td>${s.pim}</td><td>${s.ppg}</td><td>${s.hp}</td><td>${s.ap}</td></tr>`).join("")}</table></div>`:'<div class="msg">Zatím žádná data ze zápasů.</div>'}</div>
<div class="cd"><h2>Tým</h2><div class="tw"><table><tr><th></th><th>Střely</th><th>Góly</th><th>Úspěšnost</th></tr><tr><td><b>HC Střely</b></td><td>${TT.sf}</td><td>${TT.gf}</td><td>${TT.sf?Math.round(100*TT.gf/TT.sf)+" %":"–"}</td></tr><tr><td><b>Soupeř</b></td><td>${TT.sa}</td><td>${TT.ga}</td><td>${TT.sa?Math.round(100*TT.ga/TT.sa)+" %":"–"}</td></tr></table></div></div>
<div class="cd"><h2>Brankáři</h2>${Object.keys(GK).length?`<div class="tw"><table><tr><th>Brankář</th><th>Střely</th><th>Góly</th><th>Zákroky</th><th>Úspěšnost</th></tr>${Object.entries(GK).map(([id,k])=>`<tr><td><b>${pn(id)}</b></td><td>${k.sa}</td><td>${k.ga}</td><td>${k.sa-k.ga}</td><td>${k.sa?(100*(k.sa-k.ga)/k.sa).toFixed(1).replace(".",",")+" %":"–"}</td></tr>`).join("")}</table></div>`:'<div class="msg">Zapisuj střely soupeře s nastaveným brankářem.</div>'}</div>`}
