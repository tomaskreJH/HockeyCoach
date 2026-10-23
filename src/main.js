// Spuštění aplikace: připojení k úložišti, odběr změn dat, první vykreslení, obsluha tlačítka Zpět.
// Kolekce events, attendance (docházka) a staff (realizační tým) nesmí blokovat zbytek aplikace: při chybě (např. chybějící pravidla) se jen zobrazí hláška v záložce Události.
// Správci pokladny (trenér a pokladník) poslouchají charges (všechny předpisy), cash, audit a evcash (vyúčtování událostí).
// Ostatní členové poslouchají jen své předpisy (charges s mid = jejich pid / tid, včetně měsíčních příspěvků); pravidla jiné předpisy nepustí.
// Nastavení pokladny (settings/cash) čtou všichni členové; otevřené okno nastavení pokladny se po změně překreslí (návrh / potvrzení účtu).
// Automatické zakládání soupeřů a oprava uzavřených zápasů jsou zápisy do databáze, proto běží jen u trenéra a kustoda (hráčka nemá právo zápisu).
// Soukromí (domain/private-data.js): důvody omluv (attnote) čte trenér a kustod všechny, ostatní jen své; platební pole hráček (plpay)
// a platy realizačního týmu (staffpay) jen správci pokladny. Připojí se k záznamům v paměti (S.at, S.pl, S.tr) s náhradou ze starých polí;
// chyba nových kolekcí (nepublikovaná pravidla) aplikaci nezastaví – zůstanou stará pole.

// ===== Importy =====
import {HK} from "./data/storage.js";
import {installDebug} from "./debug.js";
import {fixClosed, syncOps} from "./core/actions.js";
import {initNav} from "./core/nav.js";
import {S} from "./core/state.js";
import {initTableSort} from "./core/table-sort.js";
import {NOTE_COLL, PPAY_COLL, SPAY_COLL, joinAttNotes, joinPlPay, joinStaffPay} from "./domain/private-data.js";
import {SERIES_COLL} from "./domain/recurrence.js";
import {openCashSettings, refreshCashSettings} from "./views/cash-settings.js";
import {initHelp} from "./views/help.js";
import {leaveLive} from "./views/live-events.js";
import {liveTick} from "./views/live-view.js";
import {render} from "./views/shell.js";

// ===== Konstanty a stav =====
// Surová data z databáze; do S jde jejich spojení s citlivými kolekcemi (pl + pp, tr + sp, at + an)
const R={pl:[],pp:{},tr:[],sp:{},at:[]};

// ===== Pomocné funkce =====
const rows=s=>s.docs.map(d=>({id:d.id,...d.data()}));
const mapOf=s=>Object.fromEntries(s.docs.map(d=>[d.id,d.data()]));
// Spojení surových dat s citlivými kolekcemi (nové místo má přednost, jinak staré pole)
const joinPl=()=>{S.pl=joinPlPay(R.pl,R.pp)};
const joinTr=()=>{S.tr=joinStaffPay(R.tr,R.sp)};
const joinAt=()=>{S.at=joinAttNotes(R.at,S.an)};

// ===== Spuštění =====
if(new URLSearchParams(location.search).has("debug"))installDebug();
// Řazení tabulek kliknutím na hlavičku (sleduje změny DOM, funguje i po překreslení)
initTableSort();
// Nápověda: tlačítko ❓ v záhlaví
initHelp();
// Tlačítko Zpět na telefonu: zavírá okna a detaily uvnitř aplikace, z domovské stránky se zeptá na ukončení;
// odchod ze živého zápisu zastaví čas zápasu (leaveLive z views/live-events.js)
initNav({leaveLive});
// Okno nastavení pokladny se otevírá z ⚙️
HK.openCash=openCashSettings;
setInterval(liveTick,500);

// ===== Hlavní logika: poslech dat =====
(async()=>{render();try{const db=await HK.ready();
S.db=db;const f={};const ok=k=>{f[k]=1;if(f.p&&f.m&&f.s&&f.o&&f.e&&f.a){S.ready=true}};
const er=e=>{S.err="Chyba databáze: "+e.message;render()};
const erX=k=>e=>{S.evErr=e.code||e.message;ok(k);render()};
// Chyba citlivé kolekce: jen záznam do konzole, data zůstanou ze starých polí
const erP=c=>e=>console.warn("Kolekce "+c+" se nenačetla:",e&&(e.code||e.message));
db.collection("players").onSnapshot(s=>{R.pl=rows(s);joinPl();ok("p");render()},er);
db.collection("matches").onSnapshot(s=>{S.ma=rows(s);ok("m");render();if(S.ready&&HK.can("sport")){syncOps();fixClosed()}},er);
db.collection("opponents").onSnapshot(s=>{S.op=rows(s);ok("o");render();if(S.ready&&HK.can("sport"))syncOps()},er);
db.collection("events").onSnapshot(s=>{S.ev=rows(s);ok("e");render()},erX("e"));
db.collection("attendance").onSnapshot(s=>{R.at=rows(s);joinAt();ok("a");render()},erX("a"));
db.collection("staff").onSnapshot(s=>{R.tr=rows(s);joinTr();render()},erX("t"));
// Definice sérií tréninků: jen trenér / kustod (kvůli záloze a úpravám série); chyba (nepublikovaná pravidla) aplikaci neblokuje
if(HK.can("sport"))db.collection(SERIES_COLL).onSnapshot(()=>{},erP(SERIES_COLL));
// Důvody omluv: trenér a kustod celou kolekci, ostatní jen své (dotaz mid == pid / tid; odběratel dostane sjednocení dotazů)
const onNotes=s=>{S.an=mapOf(s);joinAt();render()};
if(HK.can("sport"))db.collection(NOTE_COLL).onSnapshot(onNotes,erP(NOTE_COLL));
else[HK.pid(),HK.tid()].filter(Boolean).forEach(id=>db.collection(NOTE_COLL).where("mid",id).onSnapshot(onNotes,erP(NOTE_COLL)));
// Souhrn dlužníků bez částek: čtou všichni členové; chyba = nepublikovaná pravidla (Docházka pak ukáže upozornění, zbytek aplikace běží)
db.collection("debtors").onSnapshot(s=>{S.dt=rows(s);S.dtErr=null;render()},e=>{S.dtErr=e.code||e.message;render()});
const ec=e=>{S.payErr=e.code||e.message;render()};
if(HK.can("money")){
db.collection("charges").onSnapshot(s=>{S.ch=rows(s);S.payErr=null;render()},ec);
db.collection("cash").onSnapshot(s=>{S.cs=rows(s);render()},ec);
db.collection("audit").onSnapshot(s=>{S.au=rows(s);render()},ec);
db.collection("evcash").onSnapshot(s=>{S.ec=rows(s);render()},ec);
// Platební pole hráček a platy realizačního týmu (jen správci pokladny); připojí se k S.pl a S.tr
db.collection(PPAY_COLL).onSnapshot(s=>{R.pp=mapOf(s);joinPl();render()},erP(PPAY_COLL));
db.collection(SPAY_COLL).onSnapshot(s=>{R.sp=mapOf(s);joinTr();render()},erP(SPAY_COLL))}
else{[HK.pid(),HK.tid()].filter(Boolean).forEach(id=>db.collection("charges").where("mid",id).onSnapshot(s=>{S.ch=rows(s);S.payErr=null;render()},ec))}   // odběratel dostane sjednocení výsledků všech dotazů
db.doc("settings/cash").onSnapshot(s=>{S.cc=s.exists?s.data():{};render();refreshCashSettings()},er);
db.doc("settings/lineup").onSnapshot(s=>{S.def=s.exists?s.data():{};ok("s");render()},er)}catch(e){S.err="Nepodařilo se spustit úložiště: "+(e&&e.message||e);render()}})();
