// Záložka Statistiky: sezónní přehledy.
// Všechny tabulky mají třídu "sortable" – řadí se klepnutím na hlavičku (viz core/table-sort.js).
// Ø střídání = součet času na ledě ze všech uzavřených zápasů / počet jejích střídání (zápasy bez živého zápisu se nepočítají).
// Výpočet je společný se statistikami jednoho zápasu: playerStats (domain/player-stats.js).
import {TEAM_NAME} from "../config/team-config.js";
import {pl, pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {mmss} from "../core/utils.js";
import {playerStats} from "../domain/player-stats.js";

// Souhrn všech uzavřených zápasů (výpočet playerStats z domain/player-stats.js)
export function stats(a){const {T,GK,TT}=playerStats(S.ma.filter(m=>m.closed));
const r=Object.entries(T).filter(([id])=>pl(id)).sort((x,y)=>(y[1].g+y[1].a)-(x[1].g+x[1].a));
a.innerHTML=`<div class="cd"><h2>Statistiky hráčů</h2><div class="mu" style="margin-bottom:8px">+/- se nezapočítává u gólů v přesilovce. B = góly + asistence. Ø stř. = průměrná délka jednoho střídání (jen zápasy se živým zápisem). Klepnutím na hlavičku sloupce tabulku seřadíš.</div>${r.length?`<div class="tw"><table class="sortable"><tr><th>Hráč</th><th>Z</th><th>Ø stř.</th><th>Střely</th><th>G</th><th>%</th><th>A</th><th>B</th><th>+/-</th><th>TM</th><th>G v PP</th><th>B doma</th><th>B venku</th></tr>${r.map(([id,s])=>`<tr><td><b>${pn(id)}</b></td><td>${s.gp}</td><td>${s.sw?mmss(s.toi/s.sw):"–"}</td><td>${s.sh}</td><td>${s.g}</td><td>${s.sh?Math.round(100*s.g/s.sh)+" %":"–"}</td><td>${s.a}</td><td><b>${s.g+s.a}</b></td><td>${s.pm>0?"+":""}${s.pm}</td><td>${s.pim}</td><td>${s.ppg}</td><td>${s.hp}</td><td>${s.ap}</td></tr>`).join("")}</table></div>`:'<div class="msg">Zatím žádná data ze zápasů.</div>'}</div>
<div class="cd"><h2>Tým</h2><div class="tw"><table class="sortable"><tr><th></th><th>Střely</th><th>Góly</th><th>Úspěšnost</th></tr><tr><td><b>${TEAM_NAME}</b></td><td>${TT.sf}</td><td>${TT.gf}</td><td>${TT.sf?Math.round(100*TT.gf/TT.sf)+" %":"–"}</td></tr><tr><td><b>Soupeř</b></td><td>${TT.sa}</td><td>${TT.ga}</td><td>${TT.sa?Math.round(100*TT.ga/TT.sa)+" %":"–"}</td></tr></table></div></div>
<div class="cd"><h2>Brankáři</h2>${Object.keys(GK).length?`<div class="tw"><table class="sortable"><tr><th>Brankář</th><th>Střely</th><th>Góly</th><th>Zákroky</th><th>Úspěšnost</th></tr>${Object.entries(GK).map(([id,k])=>`<tr><td><b>${pn(id)}</b></td><td>${k.sa}</td><td>${k.ga}</td><td>${k.sa-k.ga}</td><td>${k.sa?(100*(k.sa-k.ga)/k.sa).toFixed(1).replace(".",",")+" %":"–"}</td></tr>`).join("")}</table></div>`:'<div class="msg">Zapisuj střely soupeře s nastaveným brankářem.</div>'}</div>`}