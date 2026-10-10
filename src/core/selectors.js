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
export const skaters=lu=>[...new Set(LN.flatMap(n=>SL.map(x=>(lu||{})[n+x])).filter(Boolean))];
export const shots=m=>{const r={us:0,opp:0,p:{1:[0,0],2:[0,0],3:[0,0],4:[0,0]}};(m.events||[]).forEach(e=>{if(e.k==="S"||e.k==="G"){const i=e.team==="us"?0:1;r[e.team]++;(r.p[e.per]||r.p[1])[i]++}});return r};
export const score=m=>{const e=m.events||[];return[e.filter(x=>x.k==="G"&&x.team==="us").length,e.filter(x=>x.k==="G"&&x.team==="opp").length]};
export const curM=()=>S.ma.find(x=>x.id===S.mid);
export const ownCol=(m,id)=>{const k=Object.keys(m.lineup||{}).find(k=>m.lineup[k]===id&&k[0]!=="G");return k?k.slice(1):null};
export const liveIds=L=>[...COLS.map(c=>L.ice[c]),L.G].filter(Boolean);
