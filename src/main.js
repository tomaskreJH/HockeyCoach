// Spuštění aplikace: připojení k úložišti, odběr změn dat, první vykreslení, obsluha tlačítka Zpět.
// Kolekce events, attendance (docházka) a staff (realizační tým) nesmí blokovat zbytek aplikace: při chybě (např. chybějící pravidla) se jen zobrazí hláška v záložce Události.
// Správci pokladny (trenér a pokladník) poslouchají charges (všechny předpisy), cash, audit a evcash (vyúčtování událostí).
// Ostatní členové poslouchají jen své předpisy (charges s mid = jejich pid / tid, včetně měsíčních příspěvků); pravidla jiné předpisy nepustí.
// Nastavení pokladny (settings/cash) čtou všichni členové; otevřené okno nastavení pokladny se po změně překreslí (návrh / potvrzení účtu).
// Automatické zakládání soupeřů a oprava uzavřených zápasů jsou zápisy do databáze, proto běží jen u trenéra a kustoda (hráčka nemá právo zápisu).
// Soukromí (domain/private-data.js): důvody omluv (attnote) čte trenér a kustod všechny, ostatní jen své; platební pole hráček (plpay)
// a platy realizačního týmu (staffpay) jen správci pokladny, hráčka navíc svůj dokument plpay/{pid} (koeficient a skupina pro Moje platby).
// Připojí se k záznamům v paměti (S.at, S.pl, S.tr) s náhradou ze starých polí; chyba nových kolekcí (nepublikovaná pravidla) aplikaci nezastaví.
// Ceny uzavřených událostí na hlavu (evprice → S.pr) čtou všichni členové (porovnání způsobu placení v Moje platby).
// Žádosti (requests → S.rq): správci pokladny všechny, trenér / kustod navíc žádosti o změnu účasti (kind "att"), ostatní jen své (mid == pid / tid).
// Rozpočty sezón (budget → S.bd): jen správci pokladny; chyba (nepublikovaná pravidla) aplikaci nezastaví.
// Žádosti o přijetí do týmu (joinreq → S.jr): jen trenér; otevřené okno vyřízení se po změně žádostí, soupisky a týmu překreslí.
// Nepřítomnosti (absence → S.ab): trenér / kustod všechny, ostatní jen své. Veřejné dokumenty hostujících (evpub, lineuppub → S.pubMap)
// poslouchá trenér / kustod, aby je views/auto-sync.js udržoval; automatické omluvy z nepřítomnosti zapisuje tentýž modul.
// Hostující účet (HK.can("guest")) poslouchá jen: svou hráčku, evpub (místo events / matches), svou docházku, důvody, předpisy, platební pole,
// žádosti, nepřítomnosti, ceny na hlavu, settings cash / events / app a formace (lineuppub) událostí, kde má „Jdu“.

// ===== Importy =====
import {HK} from "./data/storage.js";
import {installDebug} from "./debug.js";
import {fixClosed, syncOps} from "./core/actions.js";
import {initNav} from "./core/nav.js";
import {S} from "./core/state.js";
import {initTableSort} from "./core/table-sort.js";
import {ABS_COLL} from "./domain/absence.js";
import {ATT_KIND} from "./domain/att-requests.js";
import {BUDGET_COLL} from "./domain/budget.js";
import {PRICE_COLL} from "./domain/economy.js";
import {EVPUB_COLL, LUPUB_COLL, fromPub} from "./domain/guests.js";
import {JOIN_COLL} from "./domain/join-requests.js";
import {REQ_COLL} from "./domain/requests.js";
import {NOTE_COLL, PPAY_COLL, SPAY_COLL, joinAttNotes, joinPlPay, joinStaffPay} from "./domain/private-data.js";
import {SERIES_COLL} from "./domain/recurrence.js";
import {autoSync} from "./views/auto-sync.js";
import {openCashSettings, refreshCashSettings} from "./views/cash-settings.js";
import {initHelp} from "./views/help.js";
import {openEventSettings, refreshEventSettings} from "./views/event-settings.js";
import {openJoinWindow, refreshJoin} from "./views/join-view.js";
import {leaveLive} from "./views/live-events.js";
import {liveTick} from "./views/live-view.js";
import {render} from "./views/shell.js";

// ===== Konstanty a stav =====
// Surová data z databáze; do S jde jejich spojení s citlivými kolekcemi (pl + pp, tr + sp, at + an)
const R={pl:[],pp:{},tr:[],sp:{},at:[]};
// Hostující: události, jejichž formaci už poslouchá (lineuppub/{eid})
const luOn=new Set();

// ===== Pomocné funkce =====
const rows=s=>s.docs.map(d=>({id:d.id,...d.data()}));
const mapOf=s=>Object.fromEntries(s.docs.map(d=>[d.id,d.data()]));
// Spojení surových dat s citlivými kolekcemi (nové místo má přednost, jinak staré pole)
const joinPl=()=>{S.pl=joinPlPay(R.pl,R.pp)};
const joinTr=()=>{S.tr=joinStaffPay(R.tr,R.sp)};
const joinAt=()=>{S.at=joinAttNotes(R.at,S.an)};
// Chyba citlivé / nové kolekce: jen záznam do konzole, aplikace běží dál
const erP=c=>e=>console.warn("Kolekce "+c+" se nenačetla:",e&&(e.code||e.message));
// Překreslení a automatická synchronizace (veřejné dokumenty hostujících, omluvy z nepřítomnosti – views/auto-sync.js)
const upd=()=>{render();autoSync()};

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
// Okno žádostí o přijetí do týmu (trenér) se otevírá z ⚙️ → Členové týmu
HK.openJoin=openJoinWindow;
// Okno výchozích hodnot událostí (sraz, délka tréninku) se otevírá z ⚙️ (trenér a kustod)
HK.openEvSet=openEventSettings;
setInterval(liveTick,500);

// ===== Hlavní logika: poslech dat hostujícího účtu =====
// Hostující vidí jen sebe: žádná cizí kolekce se neposlouchá (pravidla databáze by ji stejně nepustila)
function guestData(db){const pid=HK.pid(),f={};const ok=k=>{f[k]=1;if(f.p&&f.e&&f.a&&f.s&&!S.ready){S.ready=true;autoSync()}};
S.tr=[];S.op=[];S.dt=[];S.lu={};S.def={};
const er=e=>{S.err="Chyba databáze: "+e.message;render()};
db.collection("players").one(pid).onSnapshot(s=>{R.pl=rows(s);joinPl();ok("p");render()},er);
// Veřejné hlavičky událostí místo events / matches (bez odpovědí ostatních a bez statistik)
db.collection(EVPUB_COLL).onSnapshot(s=>{const x=fromPub(rows(s));S.ev=x.ev;S.ma=x.ma;S.evErr=null;ok("e");upd()},e=>{S.evErr=e.code||e.message;S.ev=[];S.ma=[];ok("e");render()});
// Vlastní docházka; formace se poslouchá u událostí s odpovědí „Jdu“ (pravidla ji pustí jen tehdy)
db.collection("attendance").where("pid",pid).onSnapshot(s=>{R.at=rows(s);joinAt();ok("a");
R.at.filter(a=>a.st==="yes"&&!luOn.has(a.eid)).forEach(a=>{luOn.add(a.eid);db.collection(LUPUB_COLL).part(a.eid).onSnapshot(x=>{S.lu=mapOf(x);render()},()=>{})});upd()},e=>{S.evErr=e.code||e.message;ok("a");render()});
db.collection(NOTE_COLL).where("mid",pid).onSnapshot(s=>{S.an=mapOf(s);joinAt();render()},erP(NOTE_COLL));
db.collection("charges").where("mid",pid).onSnapshot(s=>{S.ch=rows(s);S.payErr=null;render()},e=>{S.payErr=e.code||e.message;render()});
db.collection(PPAY_COLL).one(pid).onSnapshot(s=>{R.pp=mapOf(s);joinPl();render()},erP(PPAY_COLL));
db.collection(REQ_COLL).where("mid",pid).onSnapshot(s=>{S.rq=rows(s);render()},erP(REQ_COLL));
db.collection(ABS_COLL).where("mid",pid).onSnapshot(s=>{S.ab=rows(s);upd()},erP(ABS_COLL));
db.collection(PRICE_COLL).onSnapshot(s=>{S.pr=rows(s);render()},erP(PRICE_COLL));
// Nastavení: jen pokladna (účet pro QR), výchozí sraz a brána verze – každý dokument zvlášť (celou kolekci hostující nečte)
["cash","events","app"].forEach(k=>db.collection("settings").part(k).onSnapshot(s=>{const m=mapOf(s);S.cc=m.cash||{};S.es=m.events||{};ok("s");render();refreshCashSettings();refreshEventSettings()},e=>{ok("s");erP("settings/"+k)(e)}))}

// ===== Hlavní logika: poslech dat =====
(async()=>{render();try{const db=await HK.ready();
S.db=db;
if(HK.can("guest")){guestData(db);return}
// Po načtení všech základních kolekcí: aplikace je připravená a proběhne první synchronizace (views/auto-sync.js)
const f={};const ok=k=>{f[k]=1;if(f.p&&f.m&&f.s&&f.o&&f.e&&f.a&&!S.ready){S.ready=true;autoSync()}};
const er=e=>{S.err="Chyba databáze: "+e.message;render()};
const erX=k=>e=>{S.evErr=e.code||e.message;ok(k);render()};
db.collection("players").onSnapshot(s=>{R.pl=rows(s);joinPl();ok("p");upd();refreshJoin()},er);
db.collection("matches").onSnapshot(s=>{S.ma=rows(s);ok("m");upd();if(S.ready&&HK.can("sport")){syncOps();fixClosed()}},er);
db.collection("opponents").onSnapshot(s=>{S.op=rows(s);ok("o");render();if(S.ready&&HK.can("sport"))syncOps()},er);
db.collection("events").onSnapshot(s=>{S.ev=rows(s);ok("e");upd()},erX("e"));
db.collection("attendance").onSnapshot(s=>{R.at=rows(s);joinAt();ok("a");upd()},erX("a"));
db.collection("staff").onSnapshot(s=>{R.tr=rows(s);joinTr();upd();refreshJoin()},erX("t"));
// Žádosti o přijetí do týmu: jen trenér (pruh v 🏠 Domů, okno vyřízení); chyba (nepublikovaná pravidla) aplikaci nezastaví
if(HK.can("admin"))db.collection(JOIN_COLL).onSnapshot(s=>{S.jr=rows(s);render();refreshJoin()},erP(JOIN_COLL));
// Definice sérií tréninků: jen trenér / kustod (kvůli záloze a úpravám série); chyba (nepublikovaná pravidla) aplikaci neblokuje
if(HK.can("sport"))db.collection(SERIES_COLL).onSnapshot(()=>{},erP(SERIES_COLL));
// Důvody omluv: trenér a kustod celou kolekci, ostatní jen své (dotaz mid == pid / tid; odběratel dostane sjednocení dotazů)
const onNotes=s=>{S.an=mapOf(s);joinAt();render()};
if(HK.can("sport"))db.collection(NOTE_COLL).onSnapshot(onNotes,erP(NOTE_COLL));
else[HK.pid(),HK.tid()].filter(Boolean).forEach(id=>db.collection(NOTE_COLL).where("mid",id).onSnapshot(onNotes,erP(NOTE_COLL)));
// Nepřítomnosti: trenér a kustod všechny (zadávají i za člena), ostatní jen své
const onAbs=s=>{S.ab=rows(s);upd()};
if(HK.can("sport"))db.collection(ABS_COLL).onSnapshot(onAbs,erP(ABS_COLL));
else[HK.pid(),HK.tid()].filter(Boolean).forEach(id=>db.collection(ABS_COLL).where("mid",id).onSnapshot(onAbs,erP(ABS_COLL)));
// Veřejné dokumenty hostujících: trenér / kustod je poslouchá, aby auto-sync zapisoval jen rozdíly (chyba = nepublikovaná pravidla, zápis se vypne)
if(HK.can("sport"))[EVPUB_COLL,LUPUB_COLL].forEach(c=>db.collection(c).onSnapshot(s=>{S.pubMap[c]=mapOf(s);S.pubOk[c]=true;autoSync()},e=>{S.pubOk[c]=false;erP(c)(e)}));
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
db.collection(SPAY_COLL).onSnapshot(s=>{R.sp=mapOf(s);joinTr();render()},erP(SPAY_COLL));
// Žádosti o změnu placení (vyřizuje správce pokladny) a o změnu účasti (trenér) – celá kolekce
db.collection(REQ_COLL).onSnapshot(s=>{S.rq=rows(s);upd()},erP(REQ_COLL));
// Rozpočty sezón (Team → 📊 Rozpočet)
db.collection(BUDGET_COLL).onSnapshot(s=>{S.bd=rows(s);render()},erP(BUDGET_COLL))}
else{[HK.pid(),HK.tid()].filter(Boolean).forEach(id=>db.collection("charges").where("mid",id).onSnapshot(s=>{S.ch=rows(s);S.payErr=null;render()},ec));   // odběratel dostane sjednocení výsledků všech dotazů
// Hráčka: jen svůj dokument platebních polí (skupina, koeficient) – připojí se k S.pl
if(HK.pid())db.collection(PPAY_COLL).one(HK.pid()).onSnapshot(s=>{R.pp=mapOf(s);joinPl();render()},erP(PPAY_COLL));
// Vlastní žádosti (stav žádosti o změnu placení v Moje platby, o změnu účasti v detailu události);
// kustod navíc všechny žádosti o změnu účasti (vyřizuje je) – sjednocení dotazů
[HK.pid(),HK.tid()].filter(Boolean).forEach(id=>db.collection(REQ_COLL).where("mid",id).onSnapshot(s=>{S.rq=rows(s);upd()},erP(REQ_COLL)));
if(HK.can("sport"))db.collection(REQ_COLL).where("kind",ATT_KIND).onSnapshot(s=>{S.rq=rows(s);upd()},erP(REQ_COLL))}
// Ceny uzavřených událostí na hlavu: všichni členové; chyba (nepublikovaná pravidla) jen vypne porovnání v Moje platby
db.collection(PRICE_COLL).onSnapshot(s=>{S.pr=rows(s);render()},erP(PRICE_COLL));
db.doc("settings/cash").onSnapshot(s=>{S.cc=s.exists?s.data():{};render();refreshCashSettings()},er);
// Výchozí sraz a délka tréninku (settings/events) – čtou všichni členové
db.doc("settings/events").onSnapshot(s=>{S.es=s.exists?s.data():{};render();refreshEventSettings()},er);
db.doc("settings/lineup").onSnapshot(s=>{S.def=s.exists?s.data():{};ok("s");render()},er)}catch(e){S.err="Nepodařilo se spustit úložiště: "+(e&&e.message||e);render()}})();
