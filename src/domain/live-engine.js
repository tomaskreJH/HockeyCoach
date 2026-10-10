// Jádro živého zápisu bez DOM: čas, střídání, tresty podle IIHF, jednotky, formace.
import {COLS, LAYOUT} from "../config/constants.js";
import {upd} from "../core/actions.js";
import {curM, nomOf, ownCol, pl} from "../core/selectors.js";
import {S} from "../core/state.js";
import {LS, clone, mmss, toast, uid} from "../core/utils.js";

export const shiftMax=()=>+LS.get("shiftMax")||120;
export const perMin=()=>((curM()||{}).perLen||20);
export const perMs=L=>L.per>=4?300000:perMin()*60000;
export const el_=L=>L.acc+(L.running?Date.now()-L.t0:0);
export const toff=L=>S.toffP===L.per?(S.toff||0):0;
export const ela=(L,now)=>Math.max(0,now-L.pst+toff(L));
export function initLive(m){const lu=m.lineup||{},L={running:false,t0:0,acc:0,per:1,pst:0,ice:{},q:{},since:{},sh:[],pen:[],seq:0,u:[],G:lu.G1||null};
COLS.forEach(c=>{const q=[1,2,3,4].map(n=>lu[n+c]).filter(Boolean);L.ice[c]=q.shift()||null;L.q[c]=q;if(L.ice[c])L.since[L.ice[c]]=0});return L}
export const leave=(L,p,c,now)=>{L.sh.push({p,c,a:L.since[p]||0,b:now,per:L.per});delete L.since[p]};
export function putOn(L,p,c,now){COLS.forEach(k=>L.q[k]=L.q[k].filter(x=>x!==p));const out=L.ice[c];L.ice[c]=p;L.since[p]=now;if(out){leave(L,out,c,now);const oc=ownCol(curM(),out);if(oc)L.q[oc].push(out)}}
export function act(label,fn){const m=curM();if(!m||!m.live||m.closed)return;const n=clone(m),L=n.live,snap=clone(L);delete snap.u;migrate(L);const ids=[];fn(L,n,ids,el_(L));fitLayout(L,el_(L));if(label===null)L.u=[];else if(label)L.u=[...(L.u||[]),{l:snap,ids,t:label}].slice(-15);upd(n)}
export const doSub=(p,c)=>{const m=curM();if(!m||!m.live)return;const L=m.live,now=el_(L);if(!L.ice[c]&&skCount(L)>=sk(L,"us",now)){toast("Na ledě už je největší povolený počet hráček (trest).");return}act("Střídání: "+(pl(p)||{}).name,(L2,n,ids,t)=>putOn(L2,p,c,t))};
export const doShot=p=>act("Střela: "+(pl(p)||{}).name,(L,n,ids,now)=>{const e={id:uid(),k:"S",team:"us",per:L.per,time:mmss(ela(L,now)),shooter:p};n.events=[...(n.events||[]),e];ids.push(e.id)});
export const doOShot=()=>act("Střela soupeře",(L,n,ids,now)=>{const e={id:uid(),k:"S",team:"opp",per:L.per,time:mmss(ela(L,now)),gk:L.G||null};n.events=[...(n.events||[]),e];ids.push(e.id)});
export function doUndo(){const m=curM();if(!m||!m.live)return;const L=m.live,u=(L.u||[]).slice(-1)[0];if(!u)return;const n=clone(m);n.live={...u.l,u:L.u.slice(0,-1),running:L.running,t0:L.t0,acc:L.acc};n.events=(n.events||[]).filter(e=>!u.ids.includes(e.id));upd(n)}
export const SA=x=>x.ty==="min"||x.ty==="maj";
export const sk=(L,t,now)=>5-Math.min(2,(L.pen||[]).filter(x=>x.t===t&&SA(x)&&x.end!=null).length);
export const skCount=L=>COLS.filter(k=>L.ice[k]).length;
export function migrate(L){if(!L.pen)L.pen=[];if(!L.seq)L.seq=0;if(!L.tmp)L.tmp=[];
if(L.box||L.obox){(L.box||[]).forEach(b=>L.pen.push({id:uid(),t:"us",p:b.p,ty:"min",rem:120000,end:b.end,seq:++L.seq,col:b.c||null}));(L.obox||[]).forEach(b=>L.pen.push({id:uid(),t:"opp",p:null,ty:"min",rem:120000,end:b.end,seq:++L.seq,col:null}));delete L.box;delete L.obox}}
// IIHF: na ledě min. 3 bruslaři; max. 2 současně odpykávané tresty na tým; 2+2 po sobě; osobní/do konce tým neoslabují
export function schedule(L,t,now){const P=L.pen;let n=P.filter(x=>x.t===t&&SA(x)&&x.end!=null).length;
P.filter(x=>x.t===t&&!SA(x)&&x.end==null).forEach(x=>{x.end=now+x.rem});
P.filter(x=>x.t===t&&SA(x)&&x.end==null).sort((a,b)=>a.seq-b.seq).forEach(w=>{if(n>=2)return;if(P.some(y=>y!==w&&y.p&&y.p===w.p&&y.seq<w.seq))return;w.end=now+w.rem;n++})}
export function retIce(L,p,now,bench){const own=ownCol(curM(),p)||"C";COLS.forEach(k=>L.q[k]=L.q[k].filter(x=>x!==p));
if(bench){L.q[own].unshift(p);return}
const c=!L.ice[own]?own:COLS.find(k=>!L.ice[k]);if(c){L.ice[c]=p;L.since[p]=now}else L.q[own].unshift(p)}
export function afterRemove(L,c,now){if(c.p&&c.t==="us"&&!L.pen.some(x=>x.p===c.p))retIce(L,c.p,now,c.ty==="mis"||c.ty==="gm");schedule(L,c.t,now)}
export function procExp(L,now){const out=[];for(;;){const x=L.pen.filter(y=>y.end!=null&&y.end<=now&&y.ty!=="gm").sort((a,b)=>a.end-b.end)[0];if(!x)break;L.pen=L.pen.filter(y=>y!==x);
if(x.p&&x.t==="us"&&!L.pen.some(y=>y.p===x.p)){retIce(L,x.p,x.end,x.ty==="mis");if(x.ty!=="mis")out.push(x.p)}
schedule(L,x.t,x.end)}return out}
export function addPen(L,o,now,m){const segs=o.min===4?[120000,120000]:o.min===5?[300000]:o.min===10?[600000]:o.min===20?[1e12]:[120000];
const ty=o.min===5?"maj":o.min===10?"mis":o.min===20?"gm":"min";
if(o.t==="us"&&o.p){const c=COLS.find(k=>L.ice[k]===o.p);if(c){leave(L,o.p,c,now);L.ice[c]=null}COLS.forEach(k=>L.q[k]=L.q[k].filter(x=>x!==o.p))}
segs.forEach(r=>L.pen.push({id:uid(),t:o.t,p:o.p||null,ty,rem:r,end:null,seq:++L.seq,col:o.p?ownCol(m,o.p):null}));schedule(L,o.t,now)}
// gól ukončí nejstarší odpykávaný dvouminutový trest oslabeného týmu, pokud gól dal tým s větším počtem hráčů na ledě
export function goalPen(L,team,now){const other=team==="us"?"opp":"us";if(sk(L,team,now)<=sk(L,other,now))return null;
const c=L.pen.filter(x=>x.t===other&&x.ty==="min"&&x.end!=null).sort((a,b)=>a.seq-b.seq)[0];if(!c)return null;
L.pen=L.pen.filter(x=>x!==c);afterRemove(L,c,now);return c.p&&!L.pen.some(x=>x.p===c.p)&&c.t==="us"?c.p:null}
export function fitLayout(L,now){const n=sk(L,"us",now);if(n>=5)return;const lay=LAYOUT(n);
COLS.filter(c=>!lay.includes(c)&&L.ice[c]).forEach(c=>{const p=L.ice[c],pref=(c==="LK"||c==="PK")?["LK","C"]:(c==="LO"||c==="PO")?["LO","PO"]:["C"],free=[...pref,...lay].find(k=>lay.includes(k)&&!L.ice[k]);if(free){L.ice[c]=null;L.ice[free]=p}})}
export function applyMap(L,m,u,now){const unav=new Set([...(L.pen||[]).filter(x=>x.t==="us"&&x.p).map(x=>x.p),...(L.tmp||[])]),nm=nomOf(m),skip=[],skipCols=[];
let T={};COLS.forEach(c=>{const p=u[c];if(!p)return;if(unav.has(p)||!nm.includes(p)){skip.push((pl(p)||{}).name||"?");skipCols.push(c);return}T[c]=p});
const max=sk(L,"us",now);let trim=false;
if(Object.keys(T).length>max){trim=true;const keep=["C","LO","PO","LK","PK"].filter(c=>T[c]).slice(0,max),N={};keep.forEach(c=>N[c]=T[c]);T=N}
const rep=[];
skipCols.forEach(c=>{if(Object.keys(T).length>=max)return;const sib={LK:"PK",PK:"LK",LO:"PO",PO:"LO"}[c],taken=new Set(Object.values(T)),cand=[...(L.q[c]||[]),...(sib?L.q[sib]||[]:[]),...COLS.flatMap(k=>L.q[k]||[])].find(id=>id&&!taken.has(id)&&!unav.has(id)&&nm.includes(id));if(cand){T[c]=cand;rep.push((pl(cand)||{}).name||"?")}});
COLS.forEach(c=>{const cur=L.ice[c];if(cur&&T[c]!==cur){leave(L,cur,c,now);L.ice[c]=null;if(!Object.values(T).includes(cur)){const oc=ownCol(m,cur);if(oc)L.q[oc].push(cur)}}});
COLS.forEach(c=>{const p=T[c];if(!p||L.ice[c]===p)return;const e=COLS.find(k=>L.ice[k]===p);if(e){leave(L,p,e,now);L.ice[e]=null}COLS.forEach(k=>L.q[k]=L.q[k].filter(x=>x!==p));L.ice[c]=p;L.since[p]=now});
return{skip,trim,rep}}
export function applyUnit(L,m,key,now){const r=applyMap(L,m,(m.sp||{})[key]||{},now);L.unit=key;return r}
export function applyLine(L,m,n,now){const u={};COLS.forEach(c=>{const p=(m.lineup||{})[n+c];if(p)u[c]=p});const r=applyMap(L,m,u,now);delete L.unit;return r}
export function toLines(L,m,now){COLS.forEach(c=>{const p=L.ice[c];if(p){leave(L,p,c,now);L.ice[c]=null;L.q[ownCol(m,p)||c].push(p)}});
const max=sk(L,"us",now),bx=(L.pen||[]).filter(x=>x.t==="us"&&x.p&&SA(x)).map(x=>ownCol(m,x.p)),lay=LAYOUT(max),order=[...lay.filter(c=>!bx.includes(c)),...lay.filter(c=>bx.includes(c))];let n=0;order.forEach(c=>{if(n>=max)return;const p=L.q[c].shift();if(p){L.ice[c]=p;L.since[p]=now;n++}});delete L.unit}
// rychlý zápis gólů a trestů
export function autoSit(L,team,now){const us=sk(L,"us",now),op=sk(L,"opp",now);return team==="us"?(us>op?"PP":us<op?"SH":"E"):(op>us?"PP":op<us?"SH":"E")}
