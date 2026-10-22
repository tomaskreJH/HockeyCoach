// Spuštění aplikace: připojení k úložišti, odběr změn dat, první vykreslení, obsluha tlačítka Zpět.
// Kolekce events, attendance (docházka) a staff (realizační tým) nesmí blokovat zbytek aplikace: při chybě (např. chybějící pravidla) se jen zobrazí hláška v záložce Události.
// Správci pokladny (trenér a pokladník) poslouchají charges (všechny předpisy), cash, audit a evcash (vyúčtování událostí).
// Ostatní členové poslouchají jen své předpisy (charges s mid = jejich pid / tid, včetně měsíčních příspěvků); pravidla jiné předpisy nepustí.
// Nastavení pokladny (settings/cash) čtou všichni členové; otevřené okno nastavení pokladny se po změně překreslí (návrh / potvrzení účtu).
// Automatické zakládání soupeřů a oprava uzavřených zápasů jsou zápisy do databáze, proto běží jen u trenéra a kustoda (hráčka nemá právo zápisu).
import {HK} from "./data/storage.js";
import {installDebug} from "./debug.js";
import {fixClosed, syncOps} from "./core/actions.js";
import {initNav} from "./core/nav.js";
import {S} from "./core/state.js";
import {initTableSort} from "./core/table-sort.js";
import {openCashSettings, refreshCashSettings} from "./views/cash-settings.js";
import {initHelp} from "./views/help.js";
import {leaveLive, liveTick} from "./views/live.js";
import {render} from "./views/shell.js";

if(new URLSearchParams(location.search).has("debug"))installDebug();
// Řazení tabulek kliknutím na hlavičku (sleduje změny DOM, funguje i po překreslení)
initTableSort();
// Nápověda: tlačítko ❓ v záhlaví
initHelp();
// Tlačítko Zpět na telefonu: zavírá okna a detaily uvnitř aplikace, z domovské stránky se zeptá na ukončení;
// odchod ze živého zápisu zastaví čas zápasu (leaveLive z views/live.js)
initNav({leaveLive});
// Okno nastavení pokladny se otevírá z ⚙️
HK.openCash=openCashSettings;
setInterval(liveTick,500);
(async()=>{render();try{const db=await HK.ready();
S.db=db;const f={};const ok=k=>{f[k]=1;if(f.p&&f.m&&f.s&&f.o&&f.e&&f.a){S.ready=true}};
const er=e=>{S.err="Chyba databáze: "+e.message;render()};
const erX=k=>e=>{S.evErr=e.code||e.message;ok(k);render()};
db.collection("players").onSnapshot(s=>{S.pl=s.docs.map(d=>({id:d.id,...d.data()}));ok("p");render()},er);
db.collection("matches").onSnapshot(s=>{S.ma=s.docs.map(d=>({id:d.id,...d.data()}));ok("m");render();if(S.ready&&HK.isStaff()){syncOps();fixClosed()}},er);
db.collection("opponents").onSnapshot(s=>{S.op=s.docs.map(d=>({id:d.id,...d.data()}));ok("o");render();if(S.ready&&HK.isStaff())syncOps()},er);
db.collection("events").onSnapshot(s=>{S.ev=s.docs.map(d=>({id:d.id,...d.data()}));ok("e");render()},erX("e"));
db.collection("attendance").onSnapshot(s=>{S.at=s.docs.map(d=>({id:d.id,...d.data()}));ok("a");render()},erX("a"));
db.collection("staff").onSnapshot(s=>{S.tr=s.docs.map(d=>({id:d.id,...d.data()}));render()},erX("t"));
// Souhrn dlužníků bez částek: čtou všichni členové; chyba = nepublikovaná pravidla (Docházka pak ukáže upozornění, zbytek aplikace běží)
db.collection("debtors").onSnapshot(s=>{S.dt=s.docs.map(d=>({id:d.id,...d.data()}));S.dtErr=null;render()},e=>{S.dtErr=e.code||e.message;render()});
const ec=e=>{S.payErr=e.code||e.message;render()};
if(HK.isCash()){
db.collection("charges").onSnapshot(s=>{S.ch=s.docs.map(d=>({id:d.id,...d.data()}));S.payErr=null;render()},ec);
db.collection("cash").onSnapshot(s=>{S.cs=s.docs.map(d=>({id:d.id,...d.data()}));render()},ec);
db.collection("audit").onSnapshot(s=>{S.au=s.docs.map(d=>({id:d.id,...d.data()}));render()},ec);
db.collection("evcash").onSnapshot(s=>{S.ec=s.docs.map(d=>({id:d.id,...d.data()}));render()},ec)}
else{[HK.pid(),HK.tid()].filter(Boolean).forEach(id=>db.collection("charges").where("mid",id).onSnapshot(s=>{S.ch=s.docs.map(d=>({id:d.id,...d.data()}));S.payErr=null;render()},ec))}   // odběratel dostane sjednocení výsledků všech dotazů
db.doc("settings/cash").onSnapshot(s=>{S.cc=s.exists?s.data():{};render();refreshCashSettings()},er);
db.doc("settings/lineup").onSnapshot(s=>{S.def=s.exists?s.data():{};ok("s");render()},er)}catch(e){S.err="Nepodařilo se spustit úložiště: "+(e&&e.message||e);render()}})();
