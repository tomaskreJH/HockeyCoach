// Spuštění aplikace: připojení k úložišti, odběr změn dat, první vykreslení.
import {HK} from "./data/storage.js";
import {installDebug} from "./debug.js";
import {syncOps} from "./core/actions.js";
import {S} from "./core/state.js";
import {liveTick} from "./views/live.js";
import {render} from "./views/shell.js";

if(new URLSearchParams(location.search).has("debug"))installDebug();
setInterval(liveTick,500);
(async()=>{render();try{const db=await HK.ready();
S.db=db;const f={};const ok=k=>{f[k]=1;if(f.p&&f.m&&f.s&&f.o){S.ready=true}};
const er=e=>{S.err="Chyba databáze: "+e.message;render()};
db.collection("players").onSnapshot(s=>{S.pl=s.docs.map(d=>({id:d.id,...d.data()}));ok("p");render()},er);
db.collection("matches").onSnapshot(s=>{S.ma=s.docs.map(d=>({id:d.id,...d.data()}));ok("m");render();if(S.ready)syncOps()},er);
db.collection("opponents").onSnapshot(s=>{S.op=s.docs.map(d=>({id:d.id,...d.data()}));ok("o");render();if(S.ready)syncOps()},er);
db.doc("settings/lineup").onSnapshot(s=>{S.def=s.exists?s.data():{};ok("s");render()},er)}catch(e){S.err="Nepodařilo se spustit úložiště: "+(e&&e.message||e);render()}})();
