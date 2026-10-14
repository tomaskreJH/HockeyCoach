// Čtecí pomocníci nad stavem: hráčky, nominace, skóre, střely, aktuální zápas.
import {COLS, LN, POS, SL} from "../config/constants.js";
import {S} from "./state.js";
import {esc, norm} from "./utils.js";

export const isG=p=>/^Brank/.test((p&&p.pos)||"");
export const vsOf=(name,ex)=>S.ma.filter(x=>x.closed&&x.id!==ex&&norm(x.opp)===norm(name)).sort((a,b)=>b.date.localeCompare(a.date));
export const nomOf=m=>m.nom||luPlayers(m.lineup);
export const pri=p=>isG(p)?0:p.pos===POS[1]?1:p.pos===POS[0]?2:3;
export const PG=["Brankářky","Obránkyně","Útočnice","Neurčeno"];
export const stOf=p=>p.st||"act";
export const pl=id=>S.pl.find(p=>p.id===id);
export const pn=id=>{const p=pl(id);return p?(p.num?"#"+esc(p.num)+" ":"")+esc(p.name)+(stOf(p)==="inj"?" 🤕":stOf(p)==="end"?" ⛔":""):"?"};
export const lineIds=(lu,n)=>SL.map(s=>lu[n+s]).filter(Boolean);
export const luPlayers=lu=>[...new Set(Object.values(lu||{}).filter(Boolean))];
export const skaters=lu=>[...new Set(LN.flatMap(n=>SL.flatMap(x=>slotIds(lu,n+x))))];
export const shots=m=>{const r={us:0,opp:0,p:{1:[0,0],2:[0,0],3:[0,0],4:[0,0]}};(m.events||[]).forEach(e=>{if(e.k==="S"||e.k==="G"){const i=e.team==="us"?0:1;r[e.team]++;(r.p[e.per]||r.p[1])[i]++}});return r};
export const score=m=>{const e=m.events||[];return[e.filter(x=>x.k==="G"&&x.team==="us").length,e.filter(x=>x.k==="G"&&x.team==="opp").length]};
export const curM=()=>S.ma.find(x=>x.id===S.mid);
// Rotace více hráček na jednom místě: "1C" = hlavní hráčka, "1C+" = druhá, "1C++" = třetí (player_ids slotu).
export const baseKey=k=>k.replace(/\+/g,"");
export const slotIds=(lu,k)=>{const r=[];for(let s=k;lu&&lu[s];s+="+")r.push(lu[s]);return r};
export const slotKey=(lu,id)=>Object.keys(lu||{}).find(k=>lu[k]===id&&k[0]!=="G");
// aktivní hráčka slotu = player_ids[rotation_index]; index se drží v živém stavu (L.ri), aby ho vracelo Zpět
export const activeId=(lu,L,k)=>{const r=slotIds(lu,k);return r.length?r[((L.ri||{})[k]||0)%r.length]:undefined};
// po vyprázdnění hlavního místa posune partnerky nahoru (přepisuje jen sloty s mezerou)
export const compactRot=lu=>{LN.forEach(n=>SL.forEach(c=>{const k=n+c,ks=[k,k+"+",k+"++"];if(!ks.some((x,i)=>!lu[x]&&ks.slice(i+1).some(y=>lu[y])))return;const ids=ks.map(x=>lu[x]).filter(Boolean);ks.forEach(x=>delete lu[x]);ids.forEach((id,i)=>lu[ks[i]]=id)}));return lu};
export const ownCol=(m,id)=>{const k=slotKey(m.lineup,id);return k?baseKey(k).slice(1):null};
export const liveIds=L=>[...COLS.map(c=>L.ice[c]),L.G].filter(Boolean);
