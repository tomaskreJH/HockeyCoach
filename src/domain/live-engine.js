// Jádro živého zápisu bez DOM: čas, střídání, tresty podle IIHF, jednotky, formace.
// Hráčka je NA LEDĚ (L.ice[sloupec]), VE FRONTĚ (L.q[sloupec], na místo nejvýš jedna) nebo ZAPARKOVANÁ (partnerka z rotace).
// L.ri[místo] = index hráčky rotace na ledě / další na řadě; L.unit = aktivní jednotka PP/OS.
// Každý příchod na led volá claimSlot, každá akce končí settle (kontrola invariantů).
import {COLS, LAYOUT, POS} from "../config/constants.js";
import {upd} from "../core/actions.js";
import {activeId, baseKey, curM, isG, nomOf, ownCol, pl, score, slotIds, slotKey} from "../core/selectors.js";
import {S} from "../core/state.js";
import {LS, clone, mmss, toast, uid} from "../core/utils.js";

// ===== Čas =====
export const shiftMax=()=>+LS.get("shiftMax")||120;
export const perMin=()=>((curM()||{}).perLen||20);
export const perMs=L=>L.per>=4?300000:perMin()*60000;
export const el_=L=>L.acc+(L.running?Date.now()-L.t0:0);
export const toff=L=>S.toffP===L.per?(S.toff||0):0;
export const ela=(L,now)=>Math.max(0,now-L.pst+toff(L));

// ===== Inicializace =====
export function initLive(m){const lu=m.lineup||{},L={running:false,t0:0,acc:0,per:1,pst:0,ice:{},q:{},since:{},sh:[],pen:[],seq:0,u:[],ri:{},G:lu.G1||null};
COLS.forEach(c=>{const q=[1,2,3,4].map(n=>activeId(lu,L,n+c)).filter(Boolean);L.ice[c]=q.shift()||null;L.q[c]=q;if(L.ice[c])L.since[L.ice[c]]=0});return L}
// Záznam doplňujících událostí pro podrobný zápis (konec třetiny, nasazení jednotky, návrat z trestu...)
export const logEv=(n,o)=>{(n.log=n.log||[]).push({id:uid(),...o})};
// Konec třetiny / zápasu: po 3. třetině rozhoduje skóre a nastavení prodloužení zápasu (m.ot)
export const periodEndPlan=m=>{const L=m.live,[g,o]=score(m);if(L.per>=4)return"end";if(L.per===3)return g!==o||m.ot===false?"end":"ot";return"next"};
export function endMatch(L,n,t){logEv(n,{ty:"per",per:L.per,at:t});L.running=false;L.acc=t;L.t0=0;n.end={per:L.per,at:t}}
export function endPeriod(L,n,t){if(periodEndPlan(n)==="end")return endMatch(L,n,t);logEv(n,{ty:"per",per:L.per,at:t});L.running=false;L.acc=t;L.t0=0;(L.ps=L.ps||[]).push(t);L.per=Math.min(4,L.per+1);L.pst=t}
// Uzavření střídání hráčky (zápis střídání s přesným začátkem a koncem)
export const leave=(L,p,c,now)=>{L.sh.push({p,c,a:L.since[p]||0,b:now,per:L.per});delete L.since[p]};

// ===== Sloty rotace a fronty =====
// Hráčky, které nesmí na led (vyloučené, v ošetřování)
const unavail=L=>new Set([...(L.pen||[]).filter(x=>x.t==="us"&&x.p).map(x=>x.p),...(L.tmp||[])]);
// Místo sestavy hráčky: základní klíč (např. "1C") a seznam hráček místa v pořadí rotace; null = hráčka není v řadách
const slotInfo=(m,p)=>{const lu=(m&&m.lineup)||{},k=slotKey(lu,p);return k?{b:baseKey(k),r:slotIds(lu,baseKey(k))}:null};
// Odebrání hráček ze všech front (nová pole, ostatní pořadí zůstává)
const dropQ=(L,ids)=>COLS.forEach(c=>{L.q[c]=(L.q[c]||[]).filter(x=>!ids.includes(x))});
// Pozice, kterou sloupec vyžaduje (obránkyně na LO/PO, jinak útočnice) a zda hráčka na ni sedí (pozice, záložní pozice, neurčeno)
const wantPos=c=>/^(LO|PO)$/.test(c)?POS[1]:POS[0];
const fitsCol=(id,c)=>{const p=pl(id);return !!p&&(p.pos===wantPos(c)||p.alt===wantPos(c)||!p.pos)};
const SIB={LK:"PK",PK:"LK",LO:"PO",PO:"LO"};
// Kandidátka na volnou pozici c: nejdřív hráčka ze stejného sloupce, pak z vedlejšího, pak ostatní; vždy se dává přednost správné pozici.
// qOnly = jen z front (hráčky na ledě se nevybírají). Vyloučené, nenominované a brankářky se přeskakují.
function pickFor(L,m,c,taken,qOnly){const un=unavail(L),nm=nomOf(m),sib=SIB[c],ice=k=>qOnly?[]:[L.ice[k]];
const list=[...ice(c),...(L.q[c]||[]),...(sib?[...ice(sib),...(L.q[sib]||[])]:[]),...COLS.flatMap(k=>ice(k)),...COLS.flatMap(k=>L.q[k]||[])];
const ok=list.filter((id,i)=>id&&list.indexOf(id)===i&&!taken.has(id)&&!un.has(id)&&nm.includes(id)&&pl(id)&&!isG(pl(id)));
return ok.find(id=>fitsCol(id,c))||ok[0]||null}
// Hráčka p je na ledě: index rotace míří na ni a její partnerky se odeberou z front (jsou zaparkované)
export function claimSlot(L,m,p){const s=slotInfo(m,p);if(!s)return;(L.ri=L.ri||{})[s.b]=s.r.indexOf(p);dropQ(L,s.r.filter(x=>x!==p))}
// Fyzický příchod hráčky na led (z fronty): odebrání z front, zápis začátku střídání, index rotace
const putIn=(L,m,id,c,now)=>{dropQ(L,[id]);L.ice[c]=id;L.since[id]=now;claimSlot(L,m,id)};
// Hráčka p jde z ledu na ZAČÁTEK své fronty (bez rotace) – nucený přesun při změně formace
const benchFront=(L,m,p,c,now)=>{leave(L,p,c,now);dropQ(L,[p]);if(slotInfo(m,p)){const oc=ownCol(m,p)||c;(L.q[oc]=L.q[oc]||[]).unshift(p)}};
// Rotace: po konci střídání slot postoupí na další dostupnou hráčku (ne na ledě, ne vyloučenou); vrací, kdo půjde do fronty místo odcházející
export function rotate(L,m,p){const s=slotInfo(m,p);if(!s||s.r.length<2)return p;
const un=unavail(L),on=new Set(COLS.map(c=>L.ice[c]).filter(Boolean)),i=s.r.indexOf(p);
for(let k=1;k<s.r.length;k++){const j=(i+k)%s.r.length,q=s.r[j];if(!un.has(q)&&!on.has(q)){(L.ri=L.ri||{})[s.b]=j;return q}}return p}
// Odcházející hráčka p ze sloupce c: do fronty (na konec) jde další hráčka rotace; ve frontě je vždy jen jedna hráčka místa.
// Hráčka, která není v řadách (nasazená jen jednotkou), se do fronty nezařazuje.
export function requeue(L,m,p,c){const s=slotInfo(m,p);if(!s)return;const nx=rotate(L,m,p),oc=ownCol(m,nx)||c||ownCol(m,p)||"C";
dropQ(L,s.r);
if(!s.r.some(x=>COLS.some(k=>L.ice[k]===x)))(L.ri=L.ri||{})[s.b]=s.r.indexOf(nx);
(L.q[oc]=L.q[oc]||[]).push(nx)}
// Ruční override: ve frontě přehodí aktivní hráčku slotu za partnerku (opakovaně = další v pořadí)
export function swapRot(L,m,p){const lu=m.lineup||{},k=slotKey(lu,p);if(!k)return;const b=baseKey(k),r=slotIds(lu,b),c=b.slice(1),at=(L.q[c]||[]).indexOf(p);if(at<0||r.length<2)return;
const j=(r.indexOf(p)+1)%r.length,q=r[j];if(unavail(L).has(q)||COLS.some(x=>L.ice[x]===q))return toast("Partnerka teď není k dispozici.");L.q[c][at]=q;(L.ri=L.ri||{})[b]=j}
// Střídání: hráčka p z fronty jde na led na místo c; původní hráčka odchází (zápis střídání) a rotuje do fronty
export function putOn(L,p,c,now,m){m=m||curM();COLS.forEach(k=>L.q[k]=(L.q[k]||[]).filter(x=>x!==p));const out=L.ice[c];L.ice[c]=p;L.since[p]=now;claimSlot(L,m,p);if(out&&out!==p){leave(L,out,c,now);requeue(L,m,out,c)}}
// Kontrola invariantů živého stavu (volá se po každé akci):
// 1) hráčka je nejvýš v jedné frontě a není zároveň na ledě ani vyloučená,
// 2) každé místo sestavy má hráčku na ledě, nebo ve frontě (index rotace míří na ni),
// 3) pokud activeId vrací hráčku, která není ve hře, okamžitě se zařadí do fronty (index se nikdy nerozejde s ledem).
export function settle(L,m){if(!L||!m)return;const lu=m.lineup||{},nm=nomOf(m),un=unavail(L);L.ri=L.ri||{};
const onIce=new Set(COLS.map(c=>L.ice[c]).filter(Boolean)),seen=new Set();
COLS.forEach(c=>{L.q[c]=(L.q[c]||[]).filter(id=>{if(!id||seen.has(id)||onIce.has(id)||un.has(id))return false;seen.add(id);return true})});
COLS.forEach(c=>[1,2,3,4].forEach(n=>{const k=n+c,r=slotIds(lu,k);if(!r.length)return;
const ic=r.find(id=>onIce.has(id));if(ic){L.ri[k]=r.indexOf(ic);return}
const avail=r.filter(id=>nm.includes(id)&&!un.has(id));if(!avail.length)return;
const keep=COLS.flatMap(x=>L.q[x]).find(id=>avail.includes(id));
if(keep){dropQ(L,avail.filter(x=>x!==keep));L.ri[k]=r.indexOf(keep);return}
const a=activeId(lu,L,k),pick=avail.includes(a)?a:avail[0];L.q[c].push(pick);seen.add(pick);L.ri[k]=r.indexOf(pick)}))}
export function act(label,fn){const m=curM();if(!m||!m.live||m.closed)return;const n=clone(m),L=n.live,snap=clone(L),end0=n.end?clone(n.end):null,ln=(n.log||[]).length;delete snap.u;migrate(L);const ids=[];fn(L,n,ids,el_(L));(n.log||[]).slice(ln).forEach(x=>ids.push(x.id));fitLayout(L,el_(L),n);if(label===null)L.u=[];else if(label)L.u=[...(L.u||[]),{l:snap,ids,t:label,end0}].slice(-15);upd(n)}
export const doSub=(p,c)=>{const m=curM();if(!m||!m.live)return;const L=m.live,now=el_(L);if(!L.ice[c]&&skCount(L)>=sk(L,"us",now)){toast("Na ledě už je největší povolený počet hráček (trest).");return}act("Střídání: "+(pl(p)||{}).name,(L2,n,ids,t)=>putOn(L2,p,c,t,n))};
export const doShot=p=>act("Střela: "+(pl(p)||{}).name,(L,n,ids,now)=>{const e={id:uid(),k:"S",team:"us",per:L.per,time:mmss(ela(L,now)),shooter:p,at:now};n.events=[...(n.events||[]),e];ids.push(e.id)});
export const doOShot=()=>act("Střela soupeře",(L,n,ids,now)=>{const e={id:uid(),k:"S",team:"opp",per:L.per,time:mmss(ela(L,now)),gk:L.G||null,at:now};n.events=[...(n.events||[]),e];ids.push(e.id)});
export function doUndo(){const m=curM();if(!m||!m.live)return;const L=m.live,u=(L.u||[]).slice(-1)[0];if(!u)return;const n=clone(m);n.live={...u.l,u:L.u.slice(0,-1),running:L.running,t0:L.t0,acc:L.acc};n.events=(n.events||[]).filter(e=>!u.ids.includes(e.id));n.log=(n.log||[]).filter(x=>!u.ids.includes(x.id));if("end0" in u){if(u.end0)n.end=u.end0;else delete n.end}upd(n)}

// ===== Tresty =====
export const SA=x=>x.ty==="min"||x.ty==="maj";
export const sk=(L,t,now)=>5-Math.min(2,(L.pen||[]).filter(x=>x.t===t&&SA(x)&&x.end!=null).length);
export const skCount=L=>COLS.filter(k=>L.ice[k]).length;
export function migrate(L){if(!L.pen)L.pen=[];if(!L.seq)L.seq=0;if(!L.tmp)L.tmp=[];if(!L.ri)L.ri={};
if(L.box||L.obox){(L.box||[]).forEach(b=>L.pen.push({id:uid(),t:"us",p:b.p,ty:"min",rem:120000,end:b.end,seq:++L.seq,col:b.c||null}));(L.obox||[]).forEach(b=>L.pen.push({id:uid(),t:"opp",p:null,ty:"min",rem:120000,end:b.end,seq:++L.seq,col:null}));delete L.box;delete L.obox}}
// IIHF: na ledě min. 3 bruslaři; max. 2 současně odpykávané tresty na tým; 2+2 po sobě; osobní/do konce tým neoslabují
export function schedule(L,t,now){const P=L.pen;let n=P.filter(x=>x.t===t&&SA(x)&&x.end!=null).length;
P.filter(x=>x.t===t&&!SA(x)&&x.end==null).forEach(x=>{x.end=now+x.rem});
P.filter(x=>x.t===t&&SA(x)&&x.end==null).sort((a,b)=>a.seq-b.seq).forEach(w=>{if(n>=2)return;if(P.some(y=>y!==w&&y.p&&y.p===w.p&&y.seq<w.seq))return;w.end=now+w.rem;n++})}
// Návrat hráčky z trestu: bez rotace, na svou pozici / volné místo (přednost má místo odpovídající pozici), jinak na začátek fronty.
// Hráčka mimo řady (nasazená jen jednotkou) se do fronty nezařazuje.
export function retIce(L,p,now,bench){const m=curM(),inLu=!!slotKey((m&&m.lineup)||{},p),own=ownCol(m,p)||"C";COLS.forEach(k=>L.q[k]=L.q[k].filter(x=>x!==p));
if(bench){if(inLu)L.q[own].unshift(p);return}
const c=!L.ice[own]?own:(COLS.find(k=>!L.ice[k]&&fitsCol(p,k))||COLS.find(k=>!L.ice[k]));if(c){L.ice[c]=p;L.since[p]=now;claimSlot(L,m,p)}else if(inLu)L.q[own].unshift(p)}
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

// ===== Formace a jednotky =====
// Při oslabení se hráčky ze skrytých pozic přesunou do pozic zredukované formace (4 hráčky: C, Ú, LO, PO; 3 hráčky: C, LO, PO).
// Nejdřív na odpovídající volnou pozici; není-li, zaujme volnou pozici hráčka z fronty správné pozice (obránkyně za obránkyni)
// a přesunutá hráčka jde na začátek své fronty. Teprve když taková hráčka není, přejde hráčka na volné místo sama. Nakonec settle.
export function fitLayout(L,now,m){m=m||curM();const n=sk(L,"us",now);
if(n<5){const lay=LAYOUT(n);
COLS.filter(c=>!lay.includes(c)&&L.ice[c]).forEach(c=>{const p=L.ice[c],pref=(c==="LK"||c==="PK")?["LK","C"]:(c==="LO"||c==="PO")?["LO","PO"]:["C"],free=pref.find(k=>lay.includes(k)&&!L.ice[k]);
if(free){L.ice[c]=null;L.ice[free]=p;return}
const any=lay.find(k=>!L.ice[k]);if(!any)return;
const cand=pickFor(L,m,any,new Set(),true);L.ice[c]=null;
if(cand&&fitsCol(cand,any)){benchFront(L,m,p,c,now);putIn(L,m,cand,any,now)}else L.ice[any]=p})}
settle(L,m||curM())}
// Nasazení mapy pozic (jednotka PP/OS, pětka). Pravidla:
//  - nominované a nevyloučené hráčky se nasadí na své sloupce; pozice mimo zredukovanou formaci (podle počtu hráček) se vynechají,
//  - prázdné pozice formace se doplní (přednost má hráčka, která už na ledě je, pak fronta; vždy podle pozice),
//  - hráčka, která zůstává na ledě a jen změní pozici, nekončí střídání,
//  - nelze-li nasadit nikoho, nic se nezmění (none).
// Pořadí: 1) odchod, 2) příchod na led (claimSlot), 3) teprve potom rotace odcházejících.
export function applyMap(L,m,u,now){const un=unavail(L),nm=nomOf(m),skip=[],rep=[];
let T={};COLS.forEach(c=>{const p=u[c];if(!p||Object.values(T).includes(p))return;if(un.has(p)||!nm.includes(p)||!pl(p)){skip.push((pl(p)||{}).name||"?");return}T[c]=p});
const max=sk(L,"us",now),lay=LAYOUT(max);let trim=false;
Object.keys(T).forEach(c=>{if(!lay.includes(c)){delete T[c];trim=true}});
lay.filter(c=>!T[c]).forEach(c=>{const id=pickFor(L,m,c,new Set(Object.values(T)),false);if(!id)return;T[c]=id;if(!COLS.some(k=>L.ice[k]===id))rep.push((pl(id)||{}).name||"?")});
if(!Object.keys(T).length)return{skip,trim,rep,none:true};
const stay=new Set(Object.values(T)),gone=[];
// 1) odchod: zůstávající jen uvolní místo, ostatním se uzavře střídání
COLS.forEach(c=>{const cur=L.ice[c];if(cur&&T[c]!==cur){if(stay.has(cur))L.ice[c]=null;else{leave(L,cur,c,now);L.ice[c]=null;gone.push([cur,c])}}});
// 2) příchod: hráčka jde fyzicky na led, index rotace míří na ni
COLS.forEach(c=>{const p=T[c];if(!p||L.ice[c]===p)return;dropQ(L,[p]);L.ice[c]=p;if(L.since[p]==null)L.since[p]=now;claimSlot(L,m,p)});
// 3) odcházející rotují do front
gone.forEach(([p,c])=>requeue(L,m,p,c));
return{skip,trim,rep,none:false}}
export function applyUnit(L,m,key,now){const r=applyMap(L,m,(m.sp||{})[key]||{},now);if(!r.none)L.unit=key;return r}
// Nasazení celé pětky: z každého místa se bere aktivní hráčka; je-li vyloučená / v ošetřování, vezme se její partnerka z rotace
export function applyLine(L,m,n,now){const u={},un=unavail(L),lu=m.lineup||{};COLS.forEach(c=>{const k=n+c,r=slotIds(lu,k),a=activeId(lu,L,k),p=a&&!un.has(a)?a:r.find(x=>!un.has(x));if(p)u[c]=p});const r=applyMap(L,m,u,now);if(!r.none)delete L.unit;return r}
// Zpět na řady: všichni z ledu (s rotací do front), pak se pozice zredukované formace obsadí z front (přednost mají nepenalizované pozice)
export function toLines(L,m,now){COLS.forEach(c=>{const p=L.ice[c];if(p){leave(L,p,c,now);L.ice[c]=null;requeue(L,m,p,c)}});
const max=sk(L,"us",now),bx=(L.pen||[]).filter(x=>x.t==="us"&&x.p&&SA(x)).map(x=>ownCol(m,x.p)),lay=LAYOUT(max),order=[...lay.filter(c=>!bx.includes(c)),...lay.filter(c=>bx.includes(c))];let n=0;
order.forEach(c=>{if(n>=max)return;const p=(L.q[c]||[]).shift();if(p){putIn(L,m,p,c,now);n++}});
// prázdná místa se doplní z front ostatních pozic (správná pozice má přednost), aby na ledě byl plný počet
order.forEach(c=>{if(n>=max||L.ice[c])return;const id=pickFor(L,m,c,new Set(),true);if(!id)return;putIn(L,m,id,c,now);n++});delete L.unit}
// rychlý zápis gólů a trestů
export function autoSit(L,team,now){const us=sk(L,"us",now),op=sk(L,"opp",now);return team==="us"?(us>op?"PP":us<op?"SH":"E"):(op>us?"PP":op<us?"SH":"E")}