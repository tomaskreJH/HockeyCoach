/* Úložiště pro Hokej – zápasy (mimo Claude)
   Režimy: 1) lokální (localStorage, výchozí)  2) synchronizace přes Supabase (REST) s frontou pro offline provoz. */
(function(){
"use strict";
const VERSION="v7 · 8. 10. 2026";
{const v=document.getElementById("ver");if(v)v.textContent=VERSION}
const LS={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
const K_DATA="hokej_data_v1",K_CFG="hokej_cfg_v1",K_Q="hokej_queue_v1",K_META="hokej_meta_v1";
const COLL=["players","matches","opponents","settings"];
const parse=(t,d)=>{try{return t?JSON.parse(t):d}catch(e){return d}};
let cfg=parse(LS.get(K_CFG),{}),data=parse(LS.get(K_DATA),{}),queue=parse(LS.get(K_Q),[]),meta=parse(LS.get(K_META),{});
COLL.forEach(c=>data[c]=data[c]||{});
const subs=[],clone=o=>JSON.parse(JSON.stringify(o));
const persist=()=>{LS.set(K_DATA,JSON.stringify(data));LS.set(K_Q,JSON.stringify(queue));LS.set(K_META,JSON.stringify(meta))};
let notifyQ=false;
const notify=()=>{if(notifyQ)return;notifyQ=true;setTimeout(()=>{notifyQ=false;subs.forEach(f=>{try{f()}catch(e){console.error(e)}})},0)};
const uid=()=>Math.random().toString(36).slice(2,12)+Date.now().toString(36).slice(-4);
const remote=()=>!!(cfg.url&&cfg.key);
const say=m=>{if(typeof toast==="function")toast(m);else alert(m)};
let status={ok:true,msg:"Ukládá se jen v tomto zařízení (bez synchronizace)."},flushing=false,pulling=false;
const hdr=()=>({apikey:cfg.key,Authorization:"Bearer "+cfg.key,"Content-Type":"application/json"});
const base=()=>cfg.url.replace(/\/+$/,"")+"/rest/v1/docs";
const split=k=>{const i=k.indexOf("/");return[k.slice(0,i),k.slice(i+1)]};
function uiStatus(){const e=document.getElementById("cst");if(e){e.textContent=status.msg;e.style.color=status.ok?"var(--ok)":"var(--no)"}}
async function flush(){
 if(!remote()||flushing||!queue.length)return;flushing=true;
 try{while(queue.length){const op=queue[0];
  if(op.op==="set"){const r=await fetch(base()+"?on_conflict=coll,id",{method:"POST",headers:{...hdr(),Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify({coll:op.coll,id:op.id,data:op.data})});if(!r.ok)throw new Error("HTTP "+r.status);const j=await r.json();if(j[0])meta[op.coll+"/"+op.id]=j[0].updated_at}
  else{const r=await fetch(base()+"?coll=eq."+op.coll+"&id=eq."+encodeURIComponent(op.id),{method:"DELETE",headers:hdr()});if(!r.ok)throw new Error("HTTP "+r.status);delete meta[op.coll+"/"+op.id]}
  queue.shift();persist()}
  status={ok:true,msg:"Synchronizováno "+new Date().toLocaleTimeString("cs")}}
 catch(e){status={ok:false,msg:"Offline nebo chyba ("+e.message+"). Čeká na odeslání: "+queue.length+" změn."}}
 finally{flushing=false;uiStatus()}}
async function pull(){
 if(!remote()||pulling)return;pulling=true;
 try{const r=await fetch(base()+"?select=coll,id,updated_at",{headers:hdr()});if(!r.ok)throw new Error("HTTP "+r.status);
  const rows=await r.json(),seen=new Set(),pend=new Set(queue.map(o=>o.coll+"/"+o.id)),need=[];let changed=false;
  rows.forEach(x=>{const k=x.coll+"/"+x.id;seen.add(k);if(pend.has(k))return;if(meta[k]!==x.updated_at||!(data[x.coll]&&data[x.coll][x.id]))need.push(x)});
  for(let i=0;i<need.length;i+=5)await Promise.all(need.slice(i,i+5).map(async x=>{
   const rr=await fetch(base()+"?select=data,updated_at&coll=eq."+x.coll+"&id=eq."+encodeURIComponent(x.id),{headers:hdr()});const j=await rr.json();
   if(j[0]){(data[x.coll]=data[x.coll]||{})[x.id]=j[0].data;meta[x.coll+"/"+x.id]=j[0].updated_at;changed=true}}));
  Object.keys(meta).forEach(k=>{if(!seen.has(k)&&!pend.has(k)){const[c,id]=split(k);if(data[c])delete data[c][id];delete meta[k];changed=true}});
  if(changed){persist();notify()}
  status={ok:true,msg:"Synchronizováno "+new Date().toLocaleTimeString("cs")}}
 catch(e){status={ok:false,msg:"Offline nebo chyba ("+e.message+")"+(queue.length?". Čeká na odeslání: "+queue.length:"")}}
 finally{pulling=false;uiStatus()}}
const tick=()=>flush().then(pull);
function setDoc(c,id,d){(data[c]=data[c]||{})[id]=clone(d);
 if(remote()){queue=queue.filter(o=>!(o.op==="set"&&o.coll===c&&o.id===id));queue.push({op:"set",coll:c,id,data:clone(d)})}
 persist();notify();flush()}
function delDoc(c,id){if(data[c])delete data[c][id];
 if(remote()){queue=queue.filter(o=>!(o.coll===c&&o.id===id));queue.push({op:"del",coll:c,id})}
 persist();notify();flush()}
const db={
 collection:c=>({onSnapshot:cb=>{const f=()=>cb({docs:Object.entries(data[c]||{}).map(([id,d])=>({id,data:()=>clone(d)}))});subs.push(f);setTimeout(f,0)},
  add:async d=>{const id=uid();setDoc(c,id,d);return{id}}}),
 doc:p=>{const i=p.indexOf("/"),c=p.slice(0,i),id=p.slice(i+1);
  return{set:async d=>setDoc(c,id,d),delete:async()=>delDoc(c,id),
   onSnapshot:cb=>{const f=()=>{const d=(data[c]||{})[id];cb({exists:!!d,data:()=>d?clone(d):undefined})};subs.push(f);setTimeout(f,0)}}}};
async function connect(url,key){
 url=(url||"").trim();key=(key||"").trim();
 if(!url||!key){cfg={};LS.del(K_CFG);queue=[];meta={};persist();status={ok:true,msg:"Odpojeno. Ukládá se jen v tomto zařízení."};uiStatus();return}
 cfg={url,key};LS.set(K_CFG,JSON.stringify(cfg));meta={};queue=[];
 await pull();
 COLL.forEach(c=>Object.entries(data[c]).forEach(([id,d])=>{if(!meta[c+"/"+id])queue.push({op:"set",coll:c,id,data:clone(d)})}));
 persist();await flush();notify()}
/* export / import */
function download(name,text,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
const stamp=()=>new Date().toISOString().slice(0,10);
function exportJSON(){download("hokej-zaloha-"+stamp()+".json",JSON.stringify({app:"hokej-zapasy",version:1,exported:new Date().toISOString(),data},null,1),"application/json")}
function exportCSV(){const q=v=>'"'+String(v==null?"":v).replace(/"/g,'""')+'"';
 const rows=[["Přezdívka","Číslo","Pozice","Alternativní pozice","Stav"],...Object.values(data.players).map(p=>[p.name,p.num,p.pos,p.alt,p.st||"act"])];
 download("soupiska-"+stamp()+".csv","\ufeff"+rows.map(r=>r.map(q).join(";")).join("\r\n"),"text/csv")}
function importData(obj,replace){
 if(!obj||obj.app!=="hokej-zapasy"||!obj.data)throw new Error("Soubor není záloha aplikace Hokej – zápasy.");
 COLL.forEach(c=>{const src=obj.data[c]||{};if(replace)Object.keys(data[c]).forEach(id=>{if(!(id in src))delDoc(c,id)});Object.entries(src).forEach(([id,d])=>setDoc(c,id,d))})}
/* okno nastavení */
let pendingImport=null;
function openCfg(){
 const el=document.getElementById("cfg");pendingImport=null;
 el.innerHTML=`<div class="md" id="cbg"><div class="mb"><h2>⚙️ Data a synchronizace</h2>
 <h3>Synchronizace mezi zařízeními (Supabase)</h3><div class="mu" id="cst" style="margin-bottom:8px"></div>
 <label>Adresa projektu</label><input id="cu" placeholder="https://xxxx.supabase.co" value="${(cfg.url||"").replace(/"/g,"&quot;")}">
 <label>Veřejný klíč (anon public)</label><input id="ck" placeholder="eyJ…" value="${(cfg.key||"").replace(/"/g,"&quot;")}">
 <div class="row"><button class="p" id="cs">Připojit</button><button class="s" id="cx">Odpojit</button></div>
 <h3>Záloha dat</h3><div class="row"><button class="s" id="ce">Stáhnout zálohu (JSON)</button><button class="s" id="cc">Soupiska (CSV)</button></div>
 <h3>Obnovit ze zálohy</h3><input type="file" id="cf" accept=".json,application/json"><div class="mu" id="ci" style="margin-bottom:8px"></div>
 <div class="row"><button class="s" id="cm">Sloučit s daty</button><button class="d" id="cr">Nahradit vším</button></div>
 <h3>Verze aplikace</h3><div class="mu" style="margin-bottom:8px">Používáš: <b>${VERSION}</b>. Pokud po nahrání nové verze vidíš starou, načti ji tlačítkem níže.</div><button class="s w" id="cu2">Načíst novou verzi</button>
 <button class="s w" id="cz" style="margin-top:14px">Zavřít</button></div></div>`;
 const $=s=>el.querySelector(s),close=()=>{el.innerHTML=""};uiStatus();
 $("#cu2").onclick=refresh;$("#cz").onclick=close;$("#cbg").onclick=e=>{if(e.target.id==="cbg")close()};
 $("#cs").onclick=async()=>{$("#cs").disabled=true;await connect($("#cu").value,$("#ck").value);$("#cs").disabled=false;if(!remote())return;say(status.ok?"Připojeno":"Připojení se nepovedlo: "+status.msg)};
 $("#cx").onclick=()=>{connect("","");$("#cu").value="";$("#ck").value=""};
 $("#ce").onclick=exportJSON;$("#cc").onclick=exportCSV;
 $("#cf").onchange=()=>{const f=$("#cf").files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{pendingImport=JSON.parse(r.result);const d=pendingImport.data||{};$("#ci").textContent="Načteno: "+COLL.map(c=>c+" "+Object.keys(d[c]||{}).length).join(", ")}catch(e){pendingImport=null;$("#ci").textContent="Soubor nelze přečíst."}};r.readAsText(f)};
 let armed=false;
 $("#cm").onclick=()=>{try{if(!pendingImport)return say("Nejdřív vyber soubor.");importData(pendingImport,false);say("Data sloučena");close()}catch(e){say(e.message)}};
 $("#cr").onclick=()=>{if(!pendingImport)return say("Nejdřív vyber soubor.");if(!armed){armed=true;$("#cr").textContent="Opravdu nahradit? Klepni znovu";return}try{importData(pendingImport,true);say("Data nahrazena");close()}catch(e){say(e.message)}}}
async function refresh(){try{const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(r=>r.unregister()));const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}catch(e){}location.reload()}
document.getElementById("gear").onclick=openCfg;
window.addEventListener("online",tick);
window.HK={version:VERSION,refresh,ready:async()=>{setInterval(tick,5000);tick();return db},importData,exportJSON,exportCSV,connect,status:()=>status};
if("serviceWorker" in navigator&&/^https?:/.test(location.protocol))navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
