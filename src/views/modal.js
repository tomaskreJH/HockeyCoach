// Modální okna (gól, vyloučení, nový zápas, úprava hráčky včetně příznaku 🎟 hostující – jen trenér, úprava člena realizačního týmu).
// Platební pole hráčky se ukládají do plpay/{pid}, plat člena týmu do staffpay/{tid} (soukromé kolekce, domain/private-data.js).
// Struktura: Importy -> Pomocné funkce (chips, opts) -> modal() (výběr hráčky, nový zápas, hráčka, člen týmu, gól/vyloučení) -> bindV.
// Nový zápas = nová událost: soupeř, datum, čas začátku, místo, termín přihlašování (výchozí den předem v 18:00), doma / venku,
// délka třetiny a prodloužení. Po vytvoření se otevře detail události v Událostech – postup: přihlášky → nominace → sestava → uzavření sestavy.
import {KIND,LN,POS,REA,SIT,ST} from "../config/constants.js";
import {TEAM_NAME} from "../config/team-config.js";
import {ensureOp,save} from "../core/actions.js";
import {compactRot,isG,lineIds,liveIds,luPlayers,pl,pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {$,clone,dlBeforeStart,dlDefault,esc,norm,td,toast,uid} from "../core/utils.js";
import {addPen,el_,fitLayout,goalPen,logEv,migrate,procExp} from "../domain/live-engine.js";
import {HK} from "../data/storage.js";
import {FX_QUICK,GRP,STAFF_PAY,fxPct,grpHWith,grpOf,pctToFx,ymNow} from "../domain/cash.js";
import {guestPatch} from "../domain/guests.js";
import {PPAY_COLL,SPAY_COLL,plPayDoc,staffPayDoc} from "../domain/private-data.js";
import {pickModal} from "./lineup-editor.js";
import {render} from "./shell.js";

// ===== Pomocné funkce =====
export function chips(key,ids,sel,multi){return`<div class="chips">${ids.map(id=>`<button class="chip ${(multi?(sel||[]).includes(id):sel===id)?"on":""}" data-k="${key}" data-id="${id}">${pn(id)}</button>`).join("")||'<span class="mu">Nejdřív nastav sestavu zápasu.</span>'}</div>`}
export function opts(key,arr,sel){return`<div class="chips">${arr.map(([v,l])=>`<button class="chip ${String(sel)===String(v)?"on":""}" data-v="${key}" data-val="${v}">${l}</button>`).join("")}</div>`}

// ===== Hlavní funkce =====
export function modal(){const el=$("#mod");const M=S.M;

// --- Výběr hráčky na místo v sestavě ---
if(S.pick){el.innerHTML=pickModal();const P=S.pick;
el.querySelectorAll("[data-pp]").forEach(b=>b.onclick=()=>{const v=b.dataset.pp;if(v==="all"){S.pickAll=true;return modal()}if(v==="x"){S.pick=null;return modal()}const lu=P.get();Object.keys(lu).forEach(k=>{if(v&&lu[k]===v)delete lu[k]});if(v)lu[P.slot]=v;else delete lu[P.slot];compactRot(lu);S.pick=null;P.onCh(lu);modal()});
$("#bg").onclick=e=>{if(e.target.id==="bg"){S.pick=null;modal()}};return}
if(!M){el.innerHTML="";return}

// --- Nový zápas / úprava zápasu ---
if(M.k==="NEW"&&M.dl===undefined){M.dl=dlDefault(M.date||td());M.dlAuto=true;M.time=M.time||"";M.place=M.place||""}
if(M.k==="NEW"||M.k==="EM"){el.innerHTML=`<div class="md" id="bg"><div class="mb"><h2>${M.k==="EM"?"Upravit zápas":"Nový zápas"}</h2><label>Soupeř (vyber, nebo napiš nového)</label>${S.op.length?`<div class="chips">${[...S.op].sort((x,y)=>x.name.localeCompare(y.name,"cs")).map(o=>`<button class="chip ${norm(M.opp)===norm(o.name)?"on":""}" data-oc="${o.id}">${esc(o.name)}</button>`).join("")}</div>`:""}<input id="o" value="${esc(M.opp)}" placeholder="Název soupeře"><label>Datum</label><input type="date" id="d" value="${M.date}">${M.k==="NEW"?`<label>Čas začátku</label><input type="time" id="ti" value="${esc(M.time)}"><label>Místo</label><input id="pc" value="${esc(M.place)}"><label>Konečný termín přihlašování</label><input type="datetime-local" id="dl" value="${esc(M.dl)}">`:""}${opts("home",[[1,"Doma"],[0,"Venku"]],M.home?1:0)}${M.k==="NEW"?`<label>Délka třetiny</label>${opts("plen",[[15,"15 min"],[20,"20 min"],[25,"25 min"]],M.perLen||20)}<label>Prodloužení (jen při nerozhodném stavu po 3. třetině)</label>${opts("ot",[[1,"Ano (5 min)"],[0,"Ne – soutěž ho nehraje"]],M.ot===false?0:1)}`:""}<div class="row"><button class="p" id="ok">${M.k==="EM"?"Uložit":"Vytvořit"}</button><button class="s" id="cl">Zrušit</button></div></div></div>`;
const sy=()=>{M.opp=$("#o").value;M.date=$("#d").value;if($("#ti")){M.time=$("#ti").value||"";M.place=$("#pc").value.trim();M.dl=$("#dl").value||""}};
// Nový zápas: změna data posune výchozí termín přihlašování (dokud ho trenér nezměnil ručně)
if(M.k==="NEW"){$("#d").onchange=()=>{sy();if(M.dlAuto)M.dl=dlDefault(M.date);modal()};$("#dl").oninput=()=>{M.dlAuto=false}}bindV(sy);el.querySelectorAll("[data-oc]").forEach(b=>b.onclick=()=>{sy();M.opp=S.op.find(o=>o.id===b.dataset.oc).name;modal()});$("#cl").onclick=()=>{S.M=null;modal()};
// Nový zápas vzniká bez nominace a sestavy jako zveřejněná událost: hráčky se přihlásí, teprve pak trenér nominuje z přihlášených
$("#ok").onclick=async()=>{sy();const o=M.opp.trim();if(!o)return toast("Zadej soupeře");
if(M.k==="NEW"){if(HK.blocked())return;const dt=M.date||td();if(!M.dl)return toast("Zadej konečný termín přihlašování");if(!dlBeforeStart(M.dl,dt,M.time))return toast("Termín přihlašování musí být před začátkem zápasu")}if(M.k==="EM"){const mm=S.ma.find(x=>x.id===M.id);if(mm&&mm.live)toast("Zápas je zahájen – údaje nelze měnit");else if(mm){save({...clone(mm),opp:o,date:M.date||td(),home:M.home});ensureOp(o)}S.M=null;return modal()}const d={date:M.date||td(),time:M.time||"",place:M.place||"",dl:M.dl,opp:o,home:M.home,perLen:M.perLen||20,ot:M.ot!==false,lineup:{},nom:[],events:[]};
const r=await S.db.collection("matches").add(d).catch(()=>toast("Uložení se nepovedlo"));S.M=null;
// Po vytvoření detail události (přihlášky); místní kopie zápasu hned, než dorazí změna z databáze
if(r){if(!S.ma.some(x=>x.id===r.id))S.ma=[...S.ma,{id:r.id,...d}];S.mid=null;S.tab="ev";S.evid=r.id;S.evBack=null;S.evf=null;ensureOp(o);toast("Zápas je zveřejněn – hráčky se mohou přihlašovat")}render()};return}

// --- Úprava hráčky ---
// Hráčka s příznakem pokladník (bez sportovních práv) upravuje jen pole plateb; jméno, číslo, pozice a stav nemění
if(M.k==="EP"){const payOnly=!HK.can("sport")&&HK.can("money"),payF=HK.can("money")?`<label>Skupina plateb</label><div class="chips">${Object.entries(GRP).map(([k,t])=>`<button class="chip ${M.grp===k?"on":""}" data-ey="${k}">${t}</button>`).join("")}</div><label>Osvobozená (zvýhodněná)</label><div class="chips"><button class="chip ${M.ex?"":"on"}" data-eo="0">Ne</button><button class="chip ${M.ex?"on":""}" data-eo="1">Ano</button></div><label>Koeficient (% z ceny; ${fxPct(pctToFx(M.pct)==null?1:pctToFx(M.pct))})</label><div class="row" style="flex-wrap:nowrap;align-items:center"><input id="efx" type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${esc(M.pct)}" style="margin:0;max-width:110px"><div class="chips" style="margin:0">${FX_QUICK.map(v=>`<button class="chip ${+String(M.pct).replace(",",".")===v?"on":""}" data-ex="${v}">${v} %</button>`).join("")}</div></div><label>Poznámka k platbám (např. kompenzace)</label><input id="enp" value="${esc(M.note||"")}"><div class="mu" style="margin-bottom:10px">Příspěvek = platí měsíčně; Za událost = platí podíl z ceny události. Koeficient = kolik procent ze svého podílu hráčka platí (100 % celý, 50 % polovinu, 0 % nic). Osvobozená = zvýhodněná hráčka: u událostí má vlastní nastavení (platí / neplatí / pevná částka), příspěvek se jí ve výchozím stavu nevystavuje. Do dělení ceny se každá hráčka počítá celá. Brankářky neplatí.</div>`:"";
el.innerHTML=payOnly?`<div class="md" id="bg"><div class="mb"><h2>Platby – ${esc(M.name)}</h2><div class="mu" style="margin-bottom:8px">${esc(M.num?"#"+M.num+" · ":"")}${esc(M.pos||"")}</div>${payF}<div class="row"><button class="p" id="ok">Uložit</button><button class="s" id="cl">Zrušit</button></div></div></div>`:`<div class="md" id="bg"><div class="mb"><h2>Upravit hráče</h2><div class="row"><div style="flex:3"><label>Přezdívka / jméno</label><input id="en" value="${esc(M.name)}"></div><div><label>Číslo</label><input id="ec" inputmode="numeric" value="${esc(M.num)}"></div></div><div class="row"><div><label>Pozice</label><select id="ep">${POS.map(x=>`<option ${x===M.pos?"selected":""}>${x}</option>`).join("")}<option value="" ${M.pos?"":"selected"}>Neurčeno</option></select></div><div><label>Alternativní pozice</label><select id="eq"><option value="">–</option>${POS.map(x=>`<option ${x===M.alt?"selected":""}>${x}</option>`).join("")}</select></div></div><label>Stav</label><div class="chips">${Object.entries(ST).map(([k,t])=>`<button class="chip ${M.st===k?"on":""}" data-es="${k}">${t}</button>`).join("")}</div>${HK.can("roster")?`<label>🎟 Hostující hráčka</label><div class="chips"><button class="chip ${M.guest?"":"on"}" data-eg="0">Ne</button><button class="chip ${M.guest?"on":""}" data-eg="1">Ano</button></div>`:""}${payF}<div class="mu" style="margin-bottom:10px">Ukončení hráči zmizí z výběrů a ze soupisky, zůstanou jen v historických statistikách.</div><div class="row"><button class="p" id="ok">Uložit</button><button class="s" id="cl">Zrušit</button></div></div></div>`;
$("#cl").onclick=()=>{S.M=null;modal()};$("#bg").onclick=e=>{if(e.target.id==="bg"){S.M=null;modal()}};
// Přepsání polí formuláře do stavu (pole plateb jsou jen u správce pokladny)
const rd=()=>{if($("#en")){M.name=$("#en").value;M.num=$("#ec").value;M.pos=$("#ep").value;M.alt=$("#eq").value}if($("#enp"))M.note=$("#enp").value;if($("#efx"))M.pct=$("#efx").value};
el.querySelectorAll("[data-es]").forEach(b=>b.onclick=()=>{rd();M.st=b.dataset.es;modal()});
// Hostující (jen trenér – kustod smí měnit jen stav): zapnutí zapíše guest: true, vypnutí pole smaže
el.querySelectorAll("[data-eg]").forEach(b=>b.onclick=()=>{rd();M.guest=b.dataset.eg==="1";modal()});
el.querySelectorAll("[data-ey]").forEach(b=>b.onclick=()=>{rd();M.grp=b.dataset.ey;modal()});
el.querySelectorAll("[data-ex]").forEach(b=>b.onclick=()=>{rd();M.pct=b.dataset.ex;modal()});
el.querySelectorAll("[data-eo]").forEach(b=>b.onclick=()=>{rd();M.ex=b.dataset.eo==="1";modal()});
// Uložení přes merge: zapíšou se jen pole z okna, ostatní pole dokumentu (i ta, která tato verze nezná) zůstanou.
// Pole plateb (grp, fx, ex, note) zapisuje jen správce pokladny a jen do plpay/{pid}; ostatní je vůbec neposílají (pravidla by zápis odmítla).
// Hráčka s historií způsobu placení (grpH): ruční změna skupiny platí od běžného měsíce a zapíše se i do historie
const payDoc=()=>{const fx=pctToFx(M.pct);if(fx==null)return null;const o=plPayDoc({grp:M.grp||"monthly",fx,ex:!!M.ex,note:(M.note||"").trim()}),p=S.pl.find(x=>x.id===M.id);
if(p&&Array.isArray(p.grpH)&&p.grpH.length&&grpOf(p)!==o.grp)o.grpH=grpHWith(p,o.grp,ymNow());return o};
const done=()=>{S.M=null;modal()};
$("#ok").onclick=()=>{rd();
// Jen pole plateb (pokladník bez práva na soupisku)
if(payOnly){const pd=payDoc();if(!pd)return toast("Zadej koeficient 0–100 %");if(!S.pl.some(p=>p.id===M.id))return;
S.db.batch().merge(PPAY_COLL+"/"+M.id,pd).commit().then(done);return}
const n=M.name.trim();if(!n)return toast("Zadej jméno");const d={name:n,num:M.num.trim(),pos:M.pos,alt:M.alt,st:M.st};if(HK.can("roster"))Object.assign(d,guestPatch(M.guest));
// Trenér: soupiska i platební pole v jedné dávce; kustod jen soupiska (pravidla mu povolí jen stav)
if(HK.can("money")){const pd=payDoc();if(!pd)return toast("Zadej koeficient 0–100 %");S.db.batch().merge("players/"+M.id,d).merge(PPAY_COLL+"/"+M.id,pd).commit().then(done);return}
S.db.doc("players/"+M.id).merge(d).then(done).catch(()=>toast("Uložení se nepovedlo"))};return}

// --- Člen realizačního týmu (kolekce staff): jméno, funkce, plat ---
// Jméno a funkci mění jen trenér; správce pokladny (pokladník) jen plat
if(M.k==="ES"){const payOnly=!HK.can("roster");el.innerHTML=`<div class="md" id="bg"><div class="mb"><h2>${payOnly?"Plat – "+esc(M.name):"Upravit člena realizačního týmu"}</h2>${payOnly?`<div class="mu" style="margin-bottom:8px">${esc(M.kind||"")}</div>`:`<label>Jméno</label><input id="sn" value="${esc(M.name)}"><label>Funkce</label><div class="chips">${KIND.map(k=>`<button class="chip ${M.kind===k?"on":""}" data-sk="${k}">${k}</button>`).join("")}</div>`}<label>Plat</label><div class="chips">${Object.entries(STAFF_PAY).map(([k,t])=>`<button class="chip ${((M.pay||{}).m||"none")===k?"on":""}" data-sm="${k}">${t}</button>`).join("")}</div><label>Částka (Kč za měsíc / za událost)</label><input id="sa" type="number" min="0" value="${(M.pay||{}).amt||""}" style="max-width:160px"><div class="row"><button class="p" id="ok">Uložit</button><button class="s" id="cl">Zrušit</button></div></div></div>`;
$("#cl").onclick=()=>{S.M=null;modal()};$("#bg").onclick=e=>{if(e.target.id==="bg"){S.M=null;modal()}};
const rs=()=>{if($("#sn"))M.name=$("#sn").value;M.pay=M.pay||{m:"none",amt:0};M.pay.amt=+$("#sa").value||0};
el.querySelectorAll("[data-sk]").forEach(b=>b.onclick=()=>{rs();M.kind=b.dataset.sk;modal()});
el.querySelectorAll("[data-sm]").forEach(b=>b.onclick=()=>{rs();M.pay.m=b.dataset.sm;modal()});
// Uložení: plat do staffpay/{tid} (pokladník jen plat), jméno a funkce přes merge do staff (ostatní pole dokumentu zůstanou)
$("#ok").onclick=()=>{rs();const sp=staffPayDoc(M.pay),close=()=>{S.M=null;modal()};
if(payOnly){if(!S.tr.some(t=>t.id===M.id))return;S.db.batch().set(SPAY_COLL+"/"+M.id,sp).commit().then(close);return}
const n=M.name.trim();if(!n)return toast("Zadej jméno");S.db.batch().merge("staff/"+M.id,{name:n,kind:M.kind||KIND[0]}).set(SPAY_COLL+"/"+M.id,sp).commit().then(close)};return}

// --- Gól / vyloučení (ruční zadání do zápasu) ---
const m=S.ma.find(x=>x.id===S.mid);if(!m){S.M=null;el.innerHTML="";return}
const lu=m.lineup||{},inl=luPlayers(lu);const lvA=m.live&&!M.all?liveIds(m.live):inl,lvS=m.live&&!M.all?liveIds(m.live).filter(i=>i!==m.live.G):inl;
let h=`<h2>${M.eid?"✏️ ":""}${M.k==="G"?(M.team==="us"?"🥅 Gól "+TEAM_NAME:"🥅 Gól soupeře"):"🚫 Vyloučení"}</h2><label>Třetina</label>${opts("per",[[1,"1."],[2,"2."],[3,"3."],...(m.ot===false?[]:[[4,"Prodl."]])],M.per)}<label>Čas ve třetině (volitelně)</label><input id="tm" placeholder="např. 12:35" value="${esc(M.time)}" style="max-width:160px">${m.live&&!M.all?'<div><button class="s" data-all style="margin-bottom:10px">Zobrazit celou sestavu</button></div>':""}`;
if(M.k==="G"){h+=`<label>Situace</label>${opts("sit",Object.entries(SIT),M.sit)}`;
if(M.team==="us")h+=`<label>Střelec</label>${chips("scorer",lvS,M.scorer)}<label>Asistence 1</label>${chips("a1",lvS.filter(i=>i!==M.scorer&&i!==M.a2),M.a1)}<label>Asistence 2</label>${chips("a2",lvS.filter(i=>i!==M.scorer&&i!==M.a1),M.a2)}`;
h+=`<label>${M.team==="us"?"Další hráči na ledě":"Kdo byl na ledě"} (celá pětka jedním klepnutím)</label><div class="chips">${LN.map(n=>`<button class="chip" data-line="${n}">${n}. pětka</button>`).join("")}</div>${chips("on",lvA,M.on,true)}`}
else h+=`<label>Tým</label>${opts("team",[["us",TEAM_NAME],["opp","Soupeř"]],M.team)}${M.team==="us"?`<label>Hráč</label>${chips("pid",lvA,M.pid)}`:""}<label>Délka</label>${opts("min",[[2,"2 min"],[4,"2+2"],[5,"5 min"],[10,"10 osobní"],[20,"Do konce"]],M.min)}<label>Důvod</label><div class="chips">${REA.map(r=>`<button class="chip ${M.reason===r?"on":""}" data-v="reason" data-val="${r}">${r}</button>`).join("")}</div>`;
h+=`<div class="row" style="margin-top:8px"><button class="p" id="ok">Uložit</button><button class="s" id="cl">Zrušit</button></div>`;
el.innerHTML=`<div class="md" id="bg"><div class="mb">${h}</div></div>`;
const sync=()=>{const t=$("#tm");if(t)M.time=t.value.trim()};
el.querySelectorAll("[data-k]").forEach(b=>b.onclick=()=>{sync();const k=b.dataset.k,id=b.dataset.id;if(k==="on")M.on=M.on.includes(id)?M.on.filter(x=>x!==id):[...M.on,id];else{M[k]=M[k]===id?null:id;if(k==="scorer"&&M.scorer){if(M.a1===M.scorer)M.a1=null;if(M.a2===M.scorer)M.a2=null}}modal()});
el.querySelectorAll("[data-line]").forEach(b=>b.onclick=()=>{sync();const ids=lineIds(lu,b.dataset.line);const all=ids.every(i=>M.on.includes(i));M.on=all?M.on.filter(i=>!ids.includes(i)):[...new Set([...M.on,...ids])];modal()});
bindV(sync);el.querySelectorAll("[data-all]").forEach(b=>b.onclick=()=>{sync();M.all=true;modal()});$("#cl").onclick=()=>{S.M=null;modal()};
$("#ok").onclick=()=>{sync();const e={id:M.eid||uid(),k:M.k,team:M.team,per:M.per,time:M.time};{const at=M.eid?M.at:(m.live?el_(m.live):undefined);if(at!=null)e.at=at}
if(M.k==="G"){e.sit=M.sit;if(M.team==="us"){if(!M.scorer)return toast("Vyber střelce");e.scorer=M.scorer;e.a1=M.a1||null;e.a2=M.a2||null;e.on=[...new Set([M.scorer,M.a1,M.a2,...M.on].filter(Boolean))]}else{e.on=M.on;e.gk=(M.on.map(pl).find(x=>isG(x))||{}).id||null}}
else{e.min=M.min;e.reason=M.reason;if(M.team==="us"){if(!M.pid)return toast("Vyber hráče");e.pid=M.pid}}
const n=clone(m);n.events=[...(n.events||[]).filter(x=>x.id!==M.eid),e].sort((a,b)=>a.per-b.per||(a.time||"99:99").localeCompare(b.time||"99:99"));if(m.live&&!M.eid&&(M.k==="P"||M.k==="G")){const L=n.live;migrate(L);const now=el_(L),snap=clone(L);delete snap.u;procExp(L,now);let ret=null;
if(M.k==="P")addPen(L,{t:M.team,p:M.team==="us"?M.pid:null,min:M.min},now,m);else ret=goalPen(L,M.team,now);if(ret)logEv(n,{ty:"ret",p:ret,cause:"gól ukončil trest",at:now,per:L.per});fitLayout(L,now);
L.u=[...(L.u||[]),{l:snap,ids:[e.id],t:M.k==="P"?"Vyloučení":"Gól"}].slice(-15);if(ret)toast("Gól ukončil trest – na led se vrací "+((pl(ret)||{}).name||""))}save(n);S.M=null;modal()};
$("#bg").onclick=e=>{if(e.target.id==="bg"){S.M=null;modal()}};
}

// ===== Obsluha přepínačů (data-v) =====
// Přepínač délky třetiny (plen) se ukládá do pole perLen, které čte vytvoření zápasu
export function bindV(sync){$("#mod").querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{sync&&sync();const k=b.dataset.v,v=b.dataset.val,t=k==="plen"?"perLen":k;S.M[t]=k==="home"||k==="ot"?v==="1":(["per","min","plen"].includes(k)?+v:v);if(k==="team"&&S.M.k==="P")S.M.pid=null;modal()})}
