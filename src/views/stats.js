// Záložka Statistiky: sezónní přehledy zápasů; pod nimi 📉 starší zápasy z paměti zařízení s 🔄 Aktualizovat (statsArch).
// Všechny tabulky mají třídu "sortable" – řadí se klepnutím na hlavičku (viz core/table-sort.js).
// Ø střídání = součet času na ledě ze všech uzavřených zápasů / počet jejích střídání (zápasy bez živého zápisu se nepočítají).
// Výpočet je společný se statistikami jednoho zápasu: playerStats (domain/player-stats.js); ⚪ buly a ⏸ přerušení flowTotals (domain/game-flow.js).
import {TEAM_NAME} from "../config/team-config.js";
import {HK} from "../data/storage.js";
import {pl, pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, mmss, toast} from "../core/utils.js";
import {flowTotals} from "../domain/game-flow.js";
import {playerStats} from "../domain/player-stats.js";

// ===== 📉 Starší zápasy z paměti zařízení =====
// Řádek pod statistikami: kolik starších zápasů je z paměti telefonu a kdy se ověřily se serverem; 🔄 načte je znovu (stojí čtení = počet starších zápasů)
const archLine=()=>{const I=HK.archInfo&&HK.archInfo("matches");if(!I)return"";const at=I.at?new Date(I.at).toLocaleString("cs-CZ",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):"";
return`<div class="mu" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:4px 0 12px"><span>📱 Starší zápasy (${I.arch}) z paměti zařízení${I.st==="load"?" · načítám…":I.st==="err"?` · ⚠️ ${esc(I.err)}`:at?" · ověřeno "+esc(at):""}</span><button class="s" id="starf" style="min-height:36px"${I.st==="load"?" disabled":""}>🔄 Aktualizovat zápasy</button></div>`};
// 🔄 Aktualizovat zápasy: starší zápasy znovu ze serveru (např. po opravě zápisu na jiném zařízení); překreslí se po načtení
const bindArch=a=>{const b=a.querySelector("#starf");if(b)b.onclick=async()=>{b.disabled=true;b.textContent="Načítám…";try{await HK.archRefresh("matches");toast("✅ Zápasy aktualizovány ze serveru")}catch(e){toast("⚠️ Aktualizace zápasů se nepovedla")}}};

// ===== Hlavní logika =====
// Souhrn všech uzavřených zápasů (výpočet playerStats z domain/player-stats.js)
export function stats(a){const cl=S.ma.filter(m=>m.closed),{T,GK,TT}=playerStats(cl),F=flowTotals(cl);
const r=Object.entries(T).filter(([id])=>pl(id)).sort((x,y)=>(y[1].g+y[1].a)-(x[1].g+x[1].a));
a.innerHTML=`<div class="cd"><h2>Statistiky hráčů</h2><div class="mu" style="margin-bottom:8px">+/- se nezapočítává u gólů v přesilovce. B = góly + asistence. Ø stř. = průměrná délka jednoho střídání (jen zápasy se živým zápisem). Klepnutím na hlavičku sloupce tabulku seřadíš.</div>${r.length?`<div class="tw"><table class="sortable"><tr><th>Hráč</th><th>Z</th><th>Ø stř.</th><th>Střely</th><th>G</th><th>%</th><th>A</th><th>B</th><th>+/-</th><th>TM</th><th>G v PP</th><th>B doma</th><th>B venku</th></tr>${r.map(([id,s])=>`<tr><td><b>${pn(id)}</b></td><td>${s.gp}</td><td>${s.sw?mmss(s.toi/s.sw):"–"}</td><td>${s.sh}</td><td>${s.g}</td><td>${s.sh?Math.round(100*s.g/s.sh)+" %":"–"}</td><td>${s.a}</td><td><b>${s.g+s.a}</b></td><td>${s.pm>0?"+":""}${s.pm}</td><td>${s.pim}</td><td>${s.ppg}</td><td>${s.hp}</td><td>${s.ap}</td></tr>`).join("")}</table></div>`:'<div class="msg">Zatím žádná data ze zápasů.</div>'}</div>
<div class="cd"><h2>Tým</h2><div class="tw"><table class="sortable"><tr><th></th><th>Střely</th><th>Góly</th><th>Úspěšnost</th>${F.n?"<th>Buly</th><th>% buly</th>":""}</tr><tr><td><b>${TEAM_NAME}</b></td><td>${TT.sf}</td><td>${TT.gf}</td><td>${TT.sf?Math.round(100*TT.gf/TT.sf)+" %":"–"}</td>${F.n?`<td>${F.us}</td><td>${F.pct} %</td>`:""}</tr><tr><td><b>Soupeř</b></td><td>${TT.sa}</td><td>${TT.ga}</td><td>${TT.sa?Math.round(100*TT.ga/TT.sa)+" %":"–"}</td>${F.n?`<td>${F.opp}</td><td>${100-F.pct} %</td>`:""}</tr></table></div>${F.games?`<div class="mu" style="margin-top:6px">Buly a přerušení ze ${F.games} ${F.games===1?"zápasu":"zápasů"} se zapsanými buly · Ø přerušení na zápas ${F.avgStops}.</div>`:""}</div>
<div class="cd"><h2>Brankáři</h2>${Object.keys(GK).length?`<div class="tw"><table class="sortable"><tr><th>Brankář</th><th>Střely</th><th>Góly</th><th>Zákroky</th><th>Úspěšnost</th></tr>${Object.entries(GK).map(([id,k])=>`<tr><td><b>${pn(id)}</b></td><td>${k.sa}</td><td>${k.ga}</td><td>${k.sa-k.ga}</td><td>${k.sa?(100*(k.sa-k.ga)/k.sa).toFixed(1).replace(".",",")+" %":"–"}</td></tr>`).join("")}</table></div>`:'<div class="msg">Zapisuj střely soupeře s nastaveným brankářem.</div>'}</div>`}
// 📉 Řádek starších zápasů pod statistikami (volá train-stats.js po stats); samostatně, aby výstup stats zůstal beze změny
export function statsArch(a){a.insertAdjacentHTML("beforeend",archLine());bindArch(a)}