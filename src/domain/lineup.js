// Doména sestavy: příprava zápasu, náhradnice, způsobilost ke spuštění živého zápisu.
import {COLS} from "../config/constants.js";
import {activeId, compactRot, isG, nomOf, pl, pri, slotIds, stOf} from "../core/selectors.js";
import {S} from "../core/state.js";

export function benchOrder(){const used=new Set(Object.values((S.def||{}).lu||{})),un=S.pl.filter(p=>stOf(p)!=="end"&&!used.has(p.id)),ids=un.map(p=>p.id),st=((S.def||{}).bn||[]).filter(id=>ids.includes(id)),rest=un.filter(p=>!st.includes(p.id)).sort((x,y)=>pri(x)-pri(y)||x.name.localeCompare(y.name,"cs")).map(p=>p.id);return[...st,...rest]}
export function fillDef(n){const dl=(S.def||{}).lu||{},nm=nomOf(n);n.lineup={};Object.entries(dl).forEach(([k,id])=>{if(nm.includes(id)&&pl(id)&&stOf(pl(id))!=="end")n.lineup[k]=id});compactRot(n.lineup)}
// Synchronizace živého stavu se sestavou (po změně sestavy za zápasu).
// Pravidla: na každé místo (řada + pozice) připadá právě jedna hráčka, která je buď na ledě, nebo čeká ve frontě
// svého sloupce; ostatní hráčky místa jsou "zaparkované" (rotace). Index rotace L.ri se přepočítá podle skutečného stavu.
export function syncLive(L,m,now){const lu=m.lineup||{},boxed=new Set([...(L.pen||[]).filter(x=>x.t==="us"&&x.p).map(x=>x.p),...(L.tmp||[])]),onIce=new Set(COLS.map(c=>L.ice[c]).filter(Boolean));
L.ri=L.ri||{};
COLS.forEach(c=>{const old=L.q[c]||[],sel=[];
// jedno místo = jedna hráčka ve hře: na ledě → ve frontě → aktivní podle indexu → první dostupná
[1,2,3,4].forEach(n=>{const k=n+c,r=slotIds(lu,k);if(!r.length)return;
const ic=r.find(id=>onIce.has(id));if(ic){L.ri[k]=r.indexOf(ic);return}
const free=r.filter(id=>!boxed.has(id)),act=activeId(lu,L,k),qd=old.find(id=>free.includes(id)),pick=qd||(free.includes(act)?act:free[0]);
if(pick){L.ri[k]=r.indexOf(pick);sel.push(pick)}});
// stabilní pořadí: stávající fronta (jen platné hráčky), potom nově přidané
L.q[c]=[...old.filter(id=>sel.includes(id)),...sel.filter(id=>!old.includes(id))];
// hráčka smí být jen v jedné frontě
COLS.forEach(k=>{if(k!==c)L.q[k]=(L.q[k]||[]).filter(id=>!sel.includes(id))})});
if(L.G&&L.G!==lu.G1&&L.G!==lu.G2)L.G=lu.G1||null;if(!L.G)L.G=lu.G1||null}
export function benchM(m){const nom=nomOf(m),used=new Set(Object.values(m.lineup||{}));return nom.filter(id=>pl(id)&&stOf(pl(id))!=="end"&&!used.has(id)).sort((x,y)=>pri(pl(x))-pri(pl(y))||pl(x).name.localeCompare(pl(y).name,"cs"))}
export function readiness(m){const nom=nomOf(m),lu=m.lineup||{},gk=nom.filter(i=>pl(i)&&isG(pl(i))).length,sk=nom.filter(i=>pl(i)&&!isG(pl(i))).length;
const miss=[...COLS.filter(c=>!lu["1"+c]||!nom.includes(lu["1"+c])),...(lu.G1&&nom.includes(lu.G1)?[]:["brankářka"])],done=miss.length===0;
return{nom:{ok:gk>=1&&sk>=5,txt:`Nominace: ${gk} brankářka, ${sk} bruslařek (potřeba min. 1 + 5)`},lu:{done,ok:done&&!!m.luOk,txt:!done?"Sestava: v 1. pětce chybí "+miss.join(", "):(m.luOk?"Sestava uzavřena":"Sestava je hotová, ale ještě není uzavřená")}}}