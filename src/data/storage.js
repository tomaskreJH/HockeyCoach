/* Datová vrstva: Firebase (Firestore + přihlášení přes Google).
   Rozhraní `db`: collection/doc, set (celý dokument), merge (jen uvedená pole – ostatní pole dokumentu zůstanou), add, delete, onSnapshot
   a batch() pro atomické zápisy (úhrada = příjem do pokladny + předpis; uzavření vyúčtování = evcash + událost + předpisy + audit),
   a collection(c).where(pole, hodnota) pro členy, kteří smí číst jen své předpisy, collection(c).one(id) pro jediný vlastní dokument
   (hráčka: plpay/{pid}). Ceny událostí na hlavu evprice doplní ⚙️ → Pokladna (domain/economy.js pricePlan). Struktura: Importy -> Konstanty a stav
   -> Pomocné funkce -> Náhled role -> Data (poslech, zápis, kontrola mazání) -> Přihlášení a role -> Rozhraní pro okno ⚙️ (HK.cfg;
   vykreslení je v views/settings-view.js) -> Matice práv a brána verze -> Zálohy -> Exporty.
   Náhled role: vývojář (DEV_EMAILS) si v ⚙️ zvolí roli, hráčku / člena týmu a příznak pokladníka; volba je jen v paměti
   zařízení (sessionStorage), po znovunačtení stránky platí jako role účtu (main.js podle ní poslouchá jen povolená data).
   Výchozí je jen ke čtení – každý zápis (doc.set, add, delete, dávka, členové, obnova zálohy) skončí hláškou „V náhledu se nezapisuje“.
   Brána verze: dokument settings/app = {minVer, minBy, minAt}. Klient se starší verzí (core/app-version.js) nezapisuje –
   strážce blocked() zastaví každý zápis (doc.set, add, delete, dávka, členové, obnova) a nahoře je pruh „Načíst novou verzi“.
   Minimum nastavuje jen manager (⚙️ → 👤 Účet → 🔒 Vyžadovat verzi) a jen směrem nahoru; ze zálohy se neobnovuje.
   Role a práva: domain/permissions.js (manager / trener / asistent / hracka / host; jiná hodnota role, např. stará kustod, nemá přístup – stejně jako v pravidlech databáze);
   matice práv settings/perm (zapisuje jen manager, ⚙️ → 🔐 Práva rolí) se předává do HK.can a HK.perm – chybějící dokument = výchozí práva.
   Účet Google bez členství vidí formulář ✋ žádosti o přijetí (joinreq/{e-mail}, views/join-view.js), manager ji vyřídí v okně z 🏠 / ⚙️.
   Pokladník (bez role manager) spravuje jen členy s rolí Hráčka a nemění vlastní účet (stejně vynucují pravidla databáze).
   Role Hostující (host, jen manager ji přiřadí hráčce označené 🎟): vidí jen sebe – vlastní hráčku, docházku, předpisy a veřejné
   dokumenty evpub / lineuppub (main.js poslouchá jen ty); collection(c).part(id) = poslech jednoho dokumentu, výsledky se sčítají.
   Úplné smazání události se vším souvisejícím (wipeEvent, domain/event-cancel.js) smí jen vývojář s rolí manager mimo náhled.
   syncOps = tichý zápis odvozených dokumentů (veřejné dokumenty hostujících, automatické omluvy z nepřítomnosti) bez hlášek.
   Soukromí: citlivá data jsou v kolekcích attnote (důvody omluv), staffpay (platy týmu) a plpay (platební pole hráček) – jsou v záloze.
   Obnova staré zálohy rozdělí stará pole do nových kolekcí (splitLegacy), protože pravidla databáze je už zapsat nedovolí. */

// ===== Importy =====
import {KIND_OLD} from "../config/constants.js";
import {APP_NAME, DEV_EMAILS} from "../config/team-config.js";
import {APP_LABEL, APP_VERSION, canRaise, isOutdated} from "../core/app-version.js";
import {csv, downloadFile, esc, toast} from "../core/utils.js";
import {BUDGET_COLL} from "../domain/budget.js";
import {exOf, fxOf} from "../domain/cash.js";
import {DEBT_COLL, debtorPlanFor, debtorRebuild} from "../domain/debtors.js";
import {ABS_COLL} from "../domain/absence.js";
import {DRILLIMG_COLL, DRILL_COLL} from "../domain/drills.js";
import {wipePlan} from "../domain/event-cancel.js";
import {EVPUB_COLL, LUPUB_COLL, isGuest} from "../domain/guests.js";
import {PRICE_COLL, pricePlan} from "../domain/economy.js";
import {JOIN_COLL, openJoins} from "../domain/join-requests.js";
import {PID_ROLE_KEYS, ROLE_KEYS, ROLE_LABELS, ROLE_VER, STAFF_ROLE_KEYS, actOf, keepsManager, permClean, permDoc, permOf, roleLabel, roleOf} from "../domain/permissions.js";
import {REQ_COLL} from "../domain/requests.js";
import {NOTE_COLL, PPAY_COLL, SPAY_COLL, splitLegacy, withPlPay} from "../domain/private-data.js";
import {SERIES_COLL} from "../domain/recurrence.js";
import {TRTPL_COLL} from "../domain/plan-reuse.js";
import {TRPLAN_COLL} from "../domain/training-plan.js";
import {PLEVEL_COLL} from "../domain/line-split.js";
import {TRMS_COLL} from "../domain/stopwatch.js";
import {TREVAL_COLL} from "../domain/training-eval.js";
import {TRLIVE_COLL} from "../domain/training-live.js";
import {FIREBASE_CONFIG} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {GoogleAuthProvider, getAuth, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {collection as fsCol, deleteDoc, deleteField, doc as fsDoc, getDoc, getDocs, initializeFirestore, onSnapshot, persistentLocalCache, persistentMultipleTabManager, query, serverTimestamp, setDoc, where, writeBatch} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ===== Konstanty a stav =====
const VERSION = APP_LABEL;                                              // číslo verze je jen v core/app-version.js
{ const v = document.getElementById("ver"); if (v) v.textContent = VERSION; }
// kolekce aplikace (events = tréninky, attendance = docházka, staff = realizační tým,
// charges = předpisy (události i měsíční příspěvky), cash = pokladna (příjmy, výdaje, platy), audit = záznamy o uzavření, znovuotevření,
// výjimkách, stornech, příspěvcích a platech, evcash = náklady a vyúčtování událostí (jen správci pokladny; v dokumentu události je jen příznak ss),
// attnote = důvody omluv, staffpay = platy realizačního týmu, plpay = platební pole hráček (soukromé kolekce, jsou v záloze)
// series = definice sérií tréninků (domain/recurrence.js); v záloze, pokud se v zařízení načetla (manager / trenér / asistent)
// budget = rozpočty sezón (domain/budget.js); v záloze, pokud se v zařízení načetla (správce pokladny)
// absence = nepřítomnosti členů od – do (domain/absence.js); v záloze, pokud se v zařízení načetla (manager / trenér / asistent všechny)
// drills = 📚 banka cvičení modulu Trénink (domain/drills.js); v záloze, pokud se v zařízení načetla (kdo smí číst modul drills)
const COLL = ["players", "matches", "opponents", "settings", "events", "attendance", "staff", "charges", "cash", "audit", "evcash", NOTE_COLL, SPAY_COLL, PPAY_COLL, SERIES_COLL, BUDGET_COLL, ABS_COLL, DRILL_COLL];
const ROLES = ROLE_LABELS;                                              // popisy rolí v members/{email} (domain/permissions.js)
const PID_ROLES = PID_ROLE_KEYS;                                        // role, které vstupují jen s propojenou hráčkou (pid)
const STAFF = STAFF_ROLE_KEYS;                                          // role s přístupem do celé aplikace (manager, trener, asistent)
const PV_KEY = "hk-preview";                                            // klíč náhledu v sessionStorage (jen toto zařízení / okno)
const RO_MSG = "V náhledu se nezapisuje";
const OLD_MSG = "Starší verze aplikace – zápis je zablokovaný. Načti novou verzi (⚙️ → Načíst novou verzi).";
const APP_DOC = "app";                                                  // settings/app = brána verze {minVer, minBy, minAt}
const PERM_DOC = "perm";                                                // settings/perm = matice práv {v, roles, by, at} (zapisuje jen manager)

// role = účinná role (domain/permissions.js roleOf), stored = role a rv uložené v members (popis neplatné role v ⚙️),
// pid = hráčka propojená s účtem, tid = člen realizačního týmu propojený s účtem, cash = pokladník (příznak navíc k roli)
let fs = null, auth = null, user = null, role = null, pid = null, tid = null, cash = false, isReady = false, readyP = null;
let stored = {role: null, rv: null}, memCache = [];          // memCache = poslední načtený seznam members (ochrana posledního managera)
// pv = aktivní náhled {role, pid, tid, cash, write}; real = skutečná role účtu vývojáře během náhledu
let pv = null, real = null, lastRo = 0;
const data = {};                       // zrcadlo dat pro export a zálohy
const subs = {};                       // odběratelé změn podle kolekce
const first = {};                      // už dorazil první snapshot kolekce?
const listening = new Set();           // kolekce, které se právě poslouchají
// Kolekce mimo zálohu: debtors = veřejný souhrn dlužníků bez částek (odvozuje se z předpisů, po obnově se přepočítá),
// evprice = ceny uzavřených událostí na hlavu (odvozují se z evcash, po obnově se doplní v ⚙️ → Pokladna),
// requests = žádosti členů (průběh vyřízení; výsledek schválení je v plpay a v auditu),
// joinreq = žádosti o přijetí do týmu (čte jen manager a uchazeč; výsledek je v members, soupisce a auditu),
// evpub / lineuppub = veřejné hlavičky a formace událostí pro hostující (odvozují se z událostí, zapisuje je aplikace managera / trenéra / asistenta),
// trlive = společné hodiny ⏱ živého tréninku (průběžný stav, poslech jen u otevřeného tréninku)
const EXTRA = [DEBT_COLL, PRICE_COLL, REQ_COLL, JOIN_COLL, EVPUB_COLL, LUPUB_COLL, TRLIVE_COLL];
// Kolekce Tréninku, které se v zařízení nečtou celé (plán, ⏲ výsledky měření a ⭐ hodnocení jen u otevřeného tréninku, obrázky cvičení, šablony plánu a ⭐ výkonnost na vyžádání):
// do zálohy se načtou při stažení (manager / trenér / asistent), obnova je jen doplní / přepíše (nemaže)
const FETCH = [TRPLAN_COLL, DRILLIMG_COLL, TRTPL_COLL, PLEVEL_COLL, TRMS_COLL, TREVAL_COLL];
[...COLL, ...EXTRA, ...FETCH].forEach(c => { data[c] = {}; subs[c] = []; });

// ===== Pomocné funkce =====
const clone = o => JSON.parse(JSON.stringify(o));
const stamp = () => new Date().toISOString().slice(0, 10);
const say = m => toast(m);
const errTxt = e => (e && (e.code || e.message)) || String(e);
const isStaff = () => STAFF.includes(role);
const isCash = () => actOf(role, cash, "money");               // správce pokladny: manager nebo pokladník (příznak cash)
// Matice práv ze settings/perm (jen upravitelné buňky); chybějící dokument nebo hostující (nečte ho) = výchozí práva
const permRaw = () => (data.settings || {})[PERM_DOC] || null;
const perms = () => permClean((permRaw() || {}).roles);
// ===== Oprávnění (jediné místo) =====
// Akce → kdo ji smí (podle účinné role přihlášeného účtu, v náhledu role podle náhledu). Pohledy se ptají jen přes HK.can(akce);
// tabulka se odvozuje z matice domain/permissions.js (actOf + settings/perm). Pravidla databáze (firestore.rules) vynucují totéž na serveru.
const CAN = {
  sport: () => actOf(role, cash, "sport", false, perms()),        // zápasy, sestavy, události, docházka za ostatní: manager, trenér, asistent
  money: () => actOf(role, cash, "money", false, perms()),        // pokladna, platby, předpisy, Měsíce, nastavení pokladny: manager, pokladník
  members: () => actOf(role, cash, "members", false, perms()),    // ⚙️ Členové týmu: manager (všichni), pokladník (jen hráčky)
  roster: () => actOf(role, cash, "roster", false, perms()),      // přidat a smazat hráčku, spravovat realizační tým: manager, trenér
  accounts: () => actOf(role, cash, "accounts", false, perms()),  // navrhnout změnu účtu pro QR platby: manager
  admin: () => actOf(role, cash, "admin", false, perms()),        // obnova ze zálohy, brána verze, role členů, ✋ žádosti, matice práv: manager
  onlyOwn: () => actOf(role, cash, "onlyOwn", false, perms()),    // hráčka a hostující: vidí a mění jen své (odpověď, Moje platby), Team jen ke čtení
  guest: () => actOf(role, cash, "guest", false, perms()),        // hostující s účtem: jen vlastní data a veřejné dokumenty (evpub, lineuppub)
  wipe: () => actOf(role, cash, "wipe", isDev() && !pv, perms())  // úplné smazání události se vším (testovací data): jen vývojář mimo náhled
};
// Smí přihlášený účet akci? Neznámá akce je chyba programu (výjimka), ne tiché „ne“.
const can = a => { const f = CAN[a]; if (!f) throw new Error("Neznámá akce oprávnění: " + a); return f(); };
// Smí přihlášený účet akci v modulu matice (modul a akce z domain/permissions.js MODULES / ACTIONS)? Neznámý modul = výjimka.
const perm = (mod, act) => permOf(role, mod, act, perms());
const configOk = () => !!FIREBASE_CONFIG.apiKey && !/^VLOZ/.test(FIREBASE_CONFIG.apiKey) && !!FIREBASE_CONFIG.projectId && !/^VLOZ/.test(FIREBASE_CONFIG.projectId);
const splitPath = p => { const i = p.indexOf("/"); return [p.slice(0, i), p.slice(i + 1)]; };

// ===== Náhled role =====
const isDev = () => !!(user && DEV_EMAILS.includes(user.email.toLowerCase()));
// Uložená volba náhledu (jen platná role, u hráčky / hostující s hráčkou)
const pvRead = () => { try { const o = JSON.parse(sessionStorage.getItem(PV_KEY) || "null"); if (o) o.role = roleOf(o.role); return o && o.role && (!PID_ROLES.includes(o.role) || o.pid) ? o : null; } catch (e) { return null; } };
const pvWrite = o => { try { if (o) sessionStorage.setItem(PV_KEY, JSON.stringify(o)); else sessionStorage.removeItem(PV_KEY); } catch (e) {} };
// Náhled jen ke čtení?
const ro = () => !!(pv && !pv.write);
// Brána verze: požadované minimum ze settings/app (načítá se s ostatním nastavením) a test, zda je tato verze starší
const minVer = () => ((data.settings || {})[APP_DOC] || {}).minVer || "";
const outdated = () => isOutdated(APP_VERSION, minVer());
// Strážce zápisu: starší verze aplikace nebo náhled jen ke čtení vrátí true a ukáže hlášku (nejvýš jednou za 3 s, aby se hlášky nehromadily)
function blocked() {
  const old = outdated();
  if (!old && !ro()) return false;
  const t = Date.now();
  if (t - lastRo > 3000) { lastRo = t; say(old ? OLD_MSG : RO_MSG); }
  return true;
}
// Popis náhledu pro pruh nahoře: role · hráčka / člen týmu · pokladník · režim zápisu
function pvLabel() {
  if (!pv) return "";
  const p = pv.pid && data.players[pv.pid], t = pv.tid && data.staff[pv.tid];
  return [ROLES[pv.role] + (p ? " " + p.name : ""), t ? "🎓 " + (t.name || "?") : "", pv.cash && pv.role !== "manager" ? "💰 pokladník" : "", pv.write ? "✏️ zápis povolen" : "jen ke čtení"].filter(Boolean).join(" · ");
}
// Spuštění / ukončení náhledu: uloží volbu a načte aplikaci znovu (poslech dat se nastaví podle role náhledu)
const startPreview = o => { pvWrite(o); location.reload(); };
const endPreview = () => { pvWrite(null); location.reload(); };

// ===== Data: poslech změn a zápis =====
// Jeden poslech na kolekci, změny se rozesílají všem odběratelům (aplikace, doc.onSnapshot)
function listen(c) {
  if (listening.has(c)) return;
  listening.add(c);
  onSnapshot(fsCol(fs, c), snap => {
    data[c] = {};
    snap.docs.forEach(d => { data[c][d.id] = d.data(); });
    first[c] = true;
    fire(c);
  }, err => subs[c].forEach(s => s.er && s.er(err)));
}
// Filtrovaný poslech (člen čte jen své předpisy): výsledky více dotazů téže kolekce se sloučí; odběrateli se vrací sjednocení
const parts = {};
function listenWhere(c, f, v, cb, er) {
  const key = f + "=" + v;
  onSnapshot(query(fsCol(fs, c), where(f, "==", v)), snap => {
    const m = {};
    snap.docs.forEach(d => { m[d.id] = d.data(); });
    (parts[c] = parts[c] || {})[key] = m;
    data[c] = Object.assign({}, ...Object.values(parts[c]));
    first[c] = true;
    try { cb(view(c)); } catch (e) { console.error(e); }
  }, err => er && er(err));
}
// Poslech jednoho dokumentu (člen smí číst jen svůj, např. plpay/{pid}): odběratel dostane kolekci s nejvýše tímto dokumentem
function listenOne(c, id, cb, er) {
  onSnapshot(fsDoc(fs, c, id), snap => {
    data[c] = snap.exists() ? {[id]: snap.data()} : {};
    first[c] = true;
    try { cb(view(c)); } catch (e) { console.error(e); }
  }, err => er && er(err));
}
// Poslech jednoho dokumentu jako části kolekce (hostující: formace událostí, kam je přihlášená): výsledky více dokumentů se sčítají
// jako u listenWhere; chyba (např. pravidla po změně odpovědi) dokument z kolekce jen odebere
function listenPart(c, id, cb, er) {
  const key = "#" + id, put = m => { (parts[c] = parts[c] || {})[key] = m; data[c] = Object.assign({}, ...Object.values(parts[c])); first[c] = true; try { cb(view(c)); } catch (e) { console.error(e); } };
  return onSnapshot(fsDoc(fs, c, id), snap => put(snap.exists() ? {[id]: snap.data()} : {}), err => { put({}); if (er) er(err); });
}
const view = c => ({docs: Object.entries(data[c]).map(([id, d]) => ({id, data: () => clone(d)}))});
function fire(c) { subs[c].forEach(s => { try { s.cb(view(c)); } catch (e) { console.error(e); } }); }
function subscribe(c, cb, er) {
  subs[c].push({cb, er});
  listen(c);
  if (first[c]) setTimeout(() => cb(view(c)), 0);
}
// Zápis se projeví lokálně hned (i offline), na server odejde po připojení; chyba (např. práva) se zobrazí hláškou
function writeDoc(c, id, d) { if (blocked()) return; setDoc(fsDoc(fs, c, id), clone(d)).catch(e => say("Uložení se nepovedlo: " + errTxt(e))); }
// Hodnoty pro částečný zápis: "__del" smaže pole, "__now" = čas serveru (serverTimestamp), ostatní se zkopírují;
// undefDel = i undefined smaže pole (jinak se vynechá)
const mergeVals = (d, undefDel) => { const o = {}; Object.entries(d).forEach(([k, v]) => { if (v === undefined && !undefDel) return; o[k] = v === "__now" ? serverTimestamp() : v === "__del" || v === undefined ? deleteField() : clone({v}).v; }); return o; };
// Částečný zápis dokumentu: změní jen uvedená pole (mergeFields), ostatní pole – i ta, která tato verze nezná – zůstanou.
// Stejně jako writeDoc nečeká na server (offline se zápis odešle po připojení); chyba se ukáže hláškou.
function mergeDoc(c, id, d) {
  if (blocked()) return;
  const o = mergeVals(d, true);
  setDoc(fsDoc(fs, c, id), o, {mergeFields: Object.keys(o)}).catch(e => say("Uložení se nepovedlo: " + errTxt(e)));
}
// Kontrola mazání události / zápasu s vyúčtováním:
//  - vyúčtovanou událost smaže jen správce pokladny,
//  - uzavřené vyúčtování s nezaplacenými předpisy smazat nejde (nejdřív úhrada, nebo „Znovu otevřít“).
function canDelete(c, id) {
  if (c !== "matches" && c !== "events") return true;
  const d = data[c][id] || {};
  const settled = !!(d.ss || (data.evcash[id] || {}).settle);   // ss = příznak vyúčtování v dokumentu události
  if (settled && !isCash()) { say("Vyúčtovanou událost smaže jen trenér nebo pokladník"); return false; }
  const open = Object.values(data.charges).filter(x => x.eid === id && (+x.amt || 0) - (+x.paid || 0) > 0.0001).length;
  if (settled && open) { say("Událost má " + open + " nezaplacených předpisů. Nejdřív je uhraď, nebo vyúčtování znovu otevři."); return false; }
  return true;
}
function removeDoc(c, id) {
  if (blocked() || !canDelete(c, id)) return;
  // S událostí se smažou její předpisy bez úhrady (předpisy se zaplacenou částí zůstávají jako historie)
  if (c === "matches" || c === "events") {
    const cids = Object.entries(data.charges).filter(([, x]) => x.eid === id && !(+x.paid > 0)).map(([cid]) => cid);
    cids.forEach(cid => removeDoc("charges", cid));
    // Souhrn dlužníků: po smazání předpisů se přepočítá pro jejich vlastníky (jen správce pokladny)
    if (cids.length && isCash()) writeDebtors(debtorPlanFor(chList(), [], cids, isStaffId));
  }
  // Vyúčtování události (evcash) se maže spolu s ní
  if ((c === "matches" || c === "events") && isCash() && data.evcash[id]) deleteDoc(fsDoc(fs, "evcash", id)).catch(() => {});
  // Cena události na hlavu pro hráčky (evprice) také
  if ((c === "matches" || c === "events") && isCash() && data[PRICE_COLL][id]) deleteDoc(fsDoc(fs, PRICE_COLL, id)).catch(() => {});
  deleteDoc(fsDoc(fs, c, id)).catch(e => say("Smazání se nepovedlo: " + errTxt(e)));
}
// Předpisy jako seznam {id, ...data} a test člena realizačního týmu (pro souhrn dlužníků)
const chList = () => Object.entries(data.charges).map(([id, d]) => ({id, ...d}));
const isStaffId = mid => !!data.staff[mid];
// Hráčky s připojenými platebními poli z plpay (nové místo má přednost, jinak staré pole v players) – CSV soupisky
const plMerged = () => Object.fromEntries(Object.entries(data.players).map(([id, p]) => [id, withPlPay(p, data[PPAY_COLL][id])]));
// Zápis plánu dlužníků po jednotlivých dokumentech (mazání předpisů u události také není jedna dávka)
function writeDebtors(plan) {
  plan.set.forEach(x => writeDoc(DEBT_COLL, x.id, x.d));
  plan.del.forEach(id => deleteDoc(fsDoc(fs, DEBT_COLL, id)).catch(e => say("Souhrn dlužníků se nepovedlo uložit: " + errTxt(e))));
}
// Celý přepočet souhrnu dlužníků ze všech předpisů (⚙️ → Přepočítat dlužníky, obnova ze zálohy); ch = předpisy, výchozí aktuální.
// Vrací počet dlužníků, nebo null, když zápis zastavil strážce (náhled, starší verze).
async function rebuildDebtors(ch) {
  if (blocked()) return null;
  if (!isCash()) throw new Error("Přepočet dlužníků smí jen trenér nebo pokladník");
  const plan = debtorRebuild(ch || chList(), Object.keys(data[DEBT_COLL]), isStaffId);
  await commitOps([...plan.set.map(x => ["set", DEBT_COLL, x.id, x.d]), ...plan.del.map(id => ["del", DEBT_COLL, id])]);
  return plan.set.length;
}
// Doplnění cen událostí na hlavu (evprice) ze snapshotů uzavření evcash (⚙️ → Pokladna, idempotentní – zapíše jen chybějící a změněné,
// smaže ceny událostí bez uzavřeného vyúčtování). Vrací {set, del} počty, nebo null, když zápis zastavil strážce.
async function rebuildPrices() {
  if (blocked()) return null;
  if (!isCash()) throw new Error("Doplnění cen smí jen trenér nebo pokladník");
  const list = c => Object.entries(data[c]).map(([id, d]) => ({id, ...d}));
  const plan = pricePlan(list("evcash"), {ev: list("events"), ma: list("matches")}, data[PRICE_COLL]);
  await commitOps([...plan.set.map(x => ["set", PRICE_COLL, x.id, x.d]), ...plan.del.map(id => ["del", PRICE_COLL, id])]);
  return {set: plan.set.length, del: plan.del.length};
}
// Tichý zápis odvozených dokumentů (veřejné dokumenty hostujících, automatické omluvy): v náhledu a ve starší verzi se nezapisuje
// a chyba (např. nepublikovaná pravidla) se jen zapíše do konzole – bez hlášky, protože zápis nespustil uživatel. ops jako commitOps.
async function syncOps(ops) {
  if (!ops || !ops.length || ro() || outdated()) return false;
  try { await commitOps(ops); return true; } catch (e) { console.warn("Synchronizace se nepovedla:", errTxt(e)); return false; }
}
// Úplné smazání události se vším souvisejícím (jen vývojář): docházka, důvody, předpisy, úhrady v pokladně, vyúčtování, cena,
// žádosti a veřejné dokumenty; potom přepočet dlužníků. wipePreview = jen plán (počty pro potvrzení). Vrací plán, nebo null.
const wipeSrc = () => ({attendance: data.attendance, attnote: data[NOTE_COLL], charges: data.charges, cash: data.cash, evcash: data.evcash, evprice: data[PRICE_COLL], requests: data[REQ_COLL], evpub: data[EVPUB_COLL], lineuppub: data[LUPUB_COLL]});
const wipePreview = (c, id) => wipePlan(c, id, wipeSrc());
async function wipeEvent(c, id) {
  if (c !== "events" && c !== "matches") throw new Error("Smazat jde jen událost nebo zápas");
  const plan = wipePreview(c, id);
  if (!can("wipe")) { say("Úplné smazání smí jen vývojář"); return null; }
  if (blocked()) return null;
  await commitOps(plan.ops);
  if (plan.cids.length) { try { await rebuildDebtors(chList().filter(x => !plan.cids.includes(x.id))); } catch (e) { say("Událost smazána, ale dlužníci se nepřepočítali: " + errTxt(e)); } }
  return plan;
}
// Dávka zápisů (atomicky): b.set("kolekce/id", data).delete("kolekce/id").commit()
function makeBatch() {
  const b = writeBatch(fs), api = {
    set: (p, d) => { const [c, id] = splitPath(p); b.set(fsDoc(fs, c, id), clone(d)); return api; },
    // Částečná změna dokumentu; hodnota "__del" smaže pole
    merge: (p, d) => { const [c, id] = splitPath(p); b.set(fsDoc(fs, c, id), mergeVals(d), {merge: true}); return api; },
    delete: p => { const [c, id] = splitPath(p); b.delete(fsDoc(fs, c, id)); return api; },
    // V náhledu jen ke čtení se dávka nepotvrdí (nic neodejde)
    commit: () => blocked() ? Promise.resolve() : b.commit().catch(e => say("Uložení se nepovedlo: " + errTxt(e)))
  };
  return api;
}

const db = {
  collection: c => ({
    onSnapshot: (cb, er) => subscribe(c, cb, er),
    where: (f, v) => ({onSnapshot: (cb, er) => listenWhere(c, f, v, cb, er)}),
    one: id => ({onSnapshot: (cb, er) => listenOne(c, id, cb, er)}),
    // Jeden dokument jako část kolekce (více volání = sjednocení); onSnapshot vrací funkci pro ukončení poslechu
    part: id => ({onSnapshot: (cb, er) => listenPart(c, id, cb, er)}),
    add: async d => { const id = fsDoc(fsCol(fs, c)).id; writeDoc(c, id, d); return {id}; },
    // Nové id dokumentu (bez zápisu) – pro založení hráčky a jejích platebních polí v jedné dávce
    newId: () => fsDoc(fsCol(fs, c)).id,
    // Jednorázové čtení celé kolekce [{id, ...data}] (šablony plánu, kontrola použití cvičení); chyba (práva, offline bez kopie) = výjimka
    getAll: async () => (await getDocs(fsCol(fs, c))).docs.map(d => ({id: d.id, ...clone(d.data())}))
  }),
  doc: p => {
    const [c, id] = splitPath(p);
    return {
      set: async d => { writeDoc(c, id, d); },
      merge: async d => { mergeDoc(c, id, d); },
      delete: async () => { removeDoc(c, id); },
      // Jednorázové čtení (i z offline paměti zařízení); null = dokument neexistuje, chyba (práva, offline bez kopie) = výjimka
      get: async () => { const s = await getDoc(fsDoc(fs, c, id)); return s.exists() ? clone(s.data()) : null; },
      onSnapshot: (cb, er) => subscribe(c, () => { const d = data[c][id]; cb({exists: !!d, data: () => d ? clone(d) : undefined}); }, er)
    };
  },
  batch: makeBatch
};

// ===== Přihlášení a role =====
function initFirebase() {
  const app = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(app);
  // Offline paměť: aplikace funguje i bez signálu (hala), změny se odešlou po připojení
  fs = initializeFirestore(app, {localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()}), ignoreUndefinedProperties: true});
}
// Celoobrazovková hláška s tlačítky; vrací id stisknutého tlačítka
function screen(title, text, btns) {
  return new Promise(res => {
    const nav = document.getElementById("nav"), app = document.getElementById("app");
    nav.style.display = "none";
    app.innerHTML = `<div class="cd" style="max-width:420px;margin:40px auto;text-align:center"><h2>${title}</h2><div class="mu" style="margin-bottom:14px">${text}</div>${btns.map(([id, t, c]) => `<button class="${c || "s"} w" data-g="${id}" style="margin-top:8px;min-height:52px">${t}</button>`).join("")}</div>`;
    app.querySelectorAll("[data-g]").forEach(b => { b.onclick = () => res(b.dataset.g); });
  });
}
const authUser = () => new Promise(res => { const un = onAuthStateChanged(auth, u => { un(); res(u); }); });
async function doLogin() {
  const prov = new GoogleAuthProvider();
  prov.setCustomParameters({prompt: "select_account"});
  try { return (await signInWithPopup(auth, prov)).user; }
  catch (e) {
    // Prohlížeč zablokoval okno: přihlášení přesměrováním (stránka se po návratu načte znovu)
    if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") { await signInWithRedirect(auth, prov); return new Promise(() => {}); }
    if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") say("Přihlášení se nepovedlo: " + errTxt(e));
    return null;
  }
}
// Role, propojení (pid hráčka, tid člen týmu) a příznak pokladníka z dokumentu members/{email} (e-mail malými písmeny)
async function checkRole() {
  try { const s = await getDoc(fsDoc(fs, "members", user.email.toLowerCase())); const d = s.exists() ? s.data() : {}; return {role: d.role || null, rv: d.rv || null, pid: d.pid || null, tid: d.tid || null, cash: d.cash === true}; }
  catch (e) { return {err: e}; }
}
// Žádost o přijetí (účet bez members): obrazovka views/join-view.js; zápisy jen do vlastního dokumentu joinreq/{e-mail}
// (pravidla databáze: založit smí jen účet bez členství, číst vlastník a manager). Vrací "ok" (schváleno) nebo "out".
async function joinFlow() {
  const em = user.email.toLowerCase(), ref = fsDoc(fs, JOIN_COLL, em), app = document.getElementById("app");
  document.getElementById("nav").style.display = "none";
  const {joinScreen} = await import("../views/join-view.js");
  return joinScreen(app, {
    email: em,
    watch: (cb, er) => onSnapshot(ref, s => cb(s.exists() ? s.data() : null), er),
    send: d => setDoc(ref, clone(d)),
    cancel: () => deleteDoc(ref)
  });
}
// Spuštění: přihlášení -> kontrola role -> teprve potom se vrátí databáze
async function boot() {
  if (!configOk()) { await screen("Chybí nastavení Firebase", "Vyplň hodnoty v souboru <code>src/data/firebase-config.js</code>.", []); return new Promise(() => {}); }
  initFirebase();
  try { await getRedirectResult(auth); } catch (e) { say("Přihlášení se nepovedlo: " + errTxt(e)); }
  user = await authUser();
  for (;;) {
    if (!user) {
      await screen("🏒 " + APP_NAME, "Přihlas se účtem Google. Pokud ještě nejsi členem týmu, po přihlášení můžeš trenéra požádat o přijetí.", [["login", "Přihlásit přes Google", "p"]]);
      user = await doLogin();
      continue;
    }
    const r = await checkRole();
    if (r.err) {
      const g = await screen("Nelze ověřit oprávnění", "Zkontroluj připojení k internetu. (" + esc(errTxt(r.err)) + ")", [["retry", "Zkusit znovu", "p"], ["out", "Odhlásit"]]);
      if (g === "out") { await signOut(auth); user = null; }
      continue;
    }
    // Účinná role: jen platná hodnota; neplatná (např. stará kustod) zůstane a přístup se nepovolí
    stored = {role: r.role, rv: r.rv}; role = roleOf(r.role) || r.role; pid = r.pid; tid = r.tid; cash = r.cash;
    // Manager, trenér a asistent vstupují vždy; hráčka a hostující jen tehdy, když je manager propojil s hráčkou v soupisce
    if (STAFF.includes(role) || (PID_ROLES.includes(role) && pid)) {
      // Náhled role: jen účet vývojáře; role náhledu nahradí roli účtu ještě před poslechem dat (main.js)
      const o = isDev() ? pvRead() : null;
      if (o) { real = {role, pid, tid, cash}; pv = {role: o.role, pid: o.pid || null, tid: o.tid || null, cash: o.cash === true, write: o.write === true}; role = pv.role; pid = pv.pid; tid = pv.tid; cash = pv.cash; }
      else pvWrite(null);
      break;
    }
    // Účet bez členství: formulář ✋ žádosti o přijetí; po schválení managerem se role ověří znovu
    if (!role) {
      const g = await joinFlow();
      if (g === "ok") continue;
    } else if (!PID_ROLES.includes(role)) {
      // Neplatná role v members (např. stará kustod): manager ji musí změnit v ⚙️ → Členové týmu
      await screen("Přístup zatím není povolen", "Účet <b>" + esc(user.email) + "</b> má neplatnou roli „" + esc(role) + "“. Požádej managera týmu, ať ti nastaví roli (⚙️ → Členové týmu).", [["out", "Odhlásit jiným účtem", "p"]]);
    } else {
      await screen("Přístup zatím není povolen", "Účet <b>" + esc(user.email) + "</b> zatím není propojen s hráčkou v soupisce. Požádej managera týmu, ať ho propojí (⚙️ → Členové týmu).", [["out", "Odhlásit jiným účtem", "p"]]);
    }
    await signOut(auth); user = null; role = null; pid = null; tid = null; cash = false; stored = {role: null, rv: null};
  }
  document.getElementById("nav").style.display = "";
  isReady = true;
  return db;
}

// ===== Rozhraní pro okno ⚙️ (vykreslení je v views/settings-view.js) =====
// Datová vrstva jen poskytuje údaje a zápisy (účet, členové, náhled role, záloha, kontrola dat, brána verze);
// kontroly rolí a jejich popisky zůstávají tady, okno se ptá přes HK.cfg a HK.can.
const meEmail = () => (user ? user.email.toLowerCase() : "");
// Přihlášený účet pro záhlaví ⚙️: e-mail, popis role, náhled, pokladník, propojená hráčka / člen týmu
const acct = () => ({email: user ? user.email : "", label: pv ? ROLES[role] || role || "?" : roleLabel(stored.role), preview: !!pv, cash: cash && role !== "manager",
  player: PID_ROLES.includes(role) && data.players[pid] ? data.players[pid].name : "", staff: isStaff() && tid && data.staff[tid] ? data.staff[tid].name || "" : ""});
// Hráčky pro výběr při propojení účtu (bez ukončených), seřazené podle jména; hostující mají značku 🎟
const playerList = () => Object.entries(data.players).filter(([, p]) => (p.st || "act") !== "end").sort((a, b) => a[1].name.localeCompare(b[1].name, "cs"))
  .map(([id, p]) => ({id, label: (p.num ? "#" + p.num + " " : "") + p.name + (isGuest(p) ? " 🎟" : "")}));
// Členové realizačního týmu pro výběr při propojení účtu (podle jména)
const staffList = () => Object.entries(data.staff).sort((a, b) => (a[1].name || "").localeCompare(b[1].name || "", "cs"))
  .map(([id, t]) => ({id, label: (t.name || "?") + (t.kind ? " (" + (KIND_OLD[t.kind] || t.kind) + ")" : "")}));
// Role, která k hráčce patří: hostující 🎟 → host, ostatní → hracka (výběr hráčky v náhledu a ve Členech role sám přepne)
const pidRoleOf = pp => (data.players[pp] && isGuest(data.players[pp]) ? "host" : "hracka");
// Kontrola propojení role a hráčky: vrací text chyby, nebo null
const pidRoleErr = (rl, pp) => { const p = data.players[pp]; if (!p) return "Vyber hráčku"; if (rl === "host" && !isGuest(p)) return "Role Hostující patří jen hráčce označené 🎟 (Team → Upravit → Hostující)"; if (rl === "hracka" && isGuest(p)) return "Hostující hráčku 🎟 propoj s rolí Hostující"; return null; };
// Volby rolí: náhled (vývojář) a přidání člena (manager všechny, pokladník jen Hráčka); třetí položka = výchozí výběr
const PV_ROLES = [["hracka", "Hráčka"], ["host", "Hostující"], ["asistent", "Asistent"], ["trener", "Trenér"], ["manager", "Manager"]];
const memberRoles = () => can("admin") ? [["manager", "Manager (vše, správa členů a práv)"], ["trener", "Trenér (sport)"], ["asistent", "Asistent (dříve Kustod)", true], ["hracka", "Hráčka"], ["host", "Hostující 🎟 (vidí jen sebe)"]] : [["hracka", "Hráčka", true]];
// Co role při propojení účtu potřebuje / smí: hráčku (Hráčka, Hostující), příznak pokladník (ne manager – je jím vždy – a ne hostující), člena týmu (ne hostující)
const needsPid = r => PID_ROLES.includes(r);
const cashOk = r => r !== "manager" && r !== "host";
const staffOk = r => r !== "host";
// Počet otevřených ✋ žádostí o přijetí do týmu
const joinCount = () => openJoins(Object.entries(data[JOIN_COLL]).map(([id, d]) => ({id, ...d}))).length;
// Účty members seřazené podle e-mailu {email, role, rv, pid, tid, cash}; poslední seznam se pamatuje (ochrana posledního managera)
async function memberRows() { return rowsOf(await memberDocs()); }
// Všechny dokumenty members jako {e-mail: data}
async function memberDocs() { const s = await getDocs(fsCol(fs, "members")); return Object.fromEntries(s.docs.map(d => [d.id, d.data()])); }
function rowsOf(docs) {
  memCache = Object.entries(docs).map(([email, d]) => ({email, role: d.role, rv: d.rv || null, pid: d.pid, tid: d.tid, cash: d.cash === true})).sort((a, b) => a.email.localeCompare(b.email));
  return memCache;
}
// Popis propojení pro seznam členů (neplatná role dostane poznámku „bez přístupu“)
const memberInfo = r => {
  const p = r.pid && data.players[r.pid], t = r.tid && data.staff[r.tid];
  return {label: roleLabel(r.role), player: PID_ROLES.includes(r.role) ? (p ? (p.num ? "#" + p.num + " " : "") + p.name : null) : undefined, staff: r.tid ? (t ? t.name || "" : null) : undefined};
};
// Odebrat smí: nikdy vlastní účet ani posledního managera; pokladník (bez role manager) jen členy s rolí Hráčka
const canRemove = r => r.email !== meEmail() && (can("admin") || r.role === "hracka") && keepsManager(memCache, r.email, null);
// Odebrání člena: seznam se načte znovu (mezitím se mohl změnit), posledního managera nejde odebrat
async function removeMember(em) {
  if (blocked()) return false;
  try {
    if (!keepsManager(await memberRows(), em, null)) { say("Posledního managera nejde odebrat"); return false; }
    await deleteDoc(fsDoc(fs, "members", em)); return true;
  } catch (e) { say("Nepovedlo se: " + errTxt(e)); return false; }
}
// Přidání / změna člena: kontrola, pak zápis members/{e-mail}. Vrací true po uložení.
async function saveMember(em, rl, pp, tt, cc) {
  em = String(em || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(em)) { say("Zadej platný e-mail"); return false; }
  if (!ROLE_KEYS.includes(rl)) { say("Vyber roli"); return false; }
  if (needsPid(rl) && pidRoleErr(rl, pp)) { say(pidRoleErr(rl, pp)); return false; }
  // Pokladník bez role manager: jen role Hráčka a ne vlastní účet (pravidla databáze by zápis odmítla)
  if (!can("admin") && (rl !== "hracka" || em === meEmail())) { say("Pokladník spravuje jen jiné členy s rolí Hráčka"); return false; }
  if (blocked()) return false;
  // Nová role zapisuje rv (verze rolí ROLE_VER); pokladník jen u rolí, které ho nemají vždy (manager je správce pokladny vždy)
  const d = {role: rl, rv: ROLE_VER, addedBy: user.email};
  if (needsPid(rl)) d.pid = pp;
  if (tt && staffOk(rl)) d.tid = tt;
  if (cc && cashOk(rl)) d.cash = true;
  try {
    if (can("admin") && !keepsManager(await memberRows(), em, rl)) { say("Aspoň jeden člen musí zůstat Manager"); return false; }
    await setDoc(fsDoc(fs, "members", em), d); return true;
  } catch (e) { say("Nepovedlo se: " + errTxt(e)); return false; }
}
// Náhled role pro ⚙️: popis běžícího náhledu a skutečné role účtu, nebo null
const pvInfo = () => pv ? {label: pvLabel(), real: ROLES[real.role] || real.role} : null;
// Spuštění náhledu z formuláře ⚙️: kontrola výběru a uložení volby; vrací text chyby, nebo null
function runPreview(r, p, t, c, w) {
  const pid_ = needsPid(r);
  if (pid_ && !p) return "Vyber hráčku";
  if (pid_ && pidRoleErr(r, p)) return pidRoleErr(r, p);
  startPreview({role: r, pid: pid_ ? p : null, tid: staffOk(r) ? t || null : null, cash: cashOk(r) && c, write: !!w});
  return null;
}
const logout = async () => { pvWrite(null); await signOut(auth); location.reload(); };
// Počty dokumentů ve vybraném souboru zálohy (náhled před obnovou)
const backupCounts = obj => { const d = (obj && obj.data) || {}; return [...COLL, ...FETCH].map(c => [c, Object.keys(d[c] || {}).length]); };
// Brána verze pro ⚙️: požadované minimum, kdo a kdy ho nastavil, zda je tato verze starší a zda ji jde vyžadovat
const gateInfo = () => { const a = data.settings[APP_DOC] || {}; return {min: a.minVer || "", by: a.minBy || "", at: a.minAt ? String(a.minAt).slice(0, 10) : "", old: outdated(), raise: canRaise(APP_VERSION, minVer())}; };

// ===== Matice práv (⚙️ → 🔐 Práva rolí, zapisuje jen manager) =====
// Stav pro okno: platná matice (jen upravitelné buňky), kdo a kdy ji naposledy změnil, zda jde měnit
const permState = () => { const r = permRaw(); return {perms: perms(), set: !!r, by: r ? r.by || "" : "", at: r ? r.at || "" : "", edit: can("admin")}; };
// Uložení matice (celý dokument settings/perm, jen rozdíly od výchozích hodnot). roles = {} obnoví výchozí práva. Vrací true po uložení.
async function savePerms(roles) {
  if (!can("admin")) { say("Práva rolí mění jen manager"); return false; }
  if (blocked()) return false;
  try { await setDoc(fsDoc(fs, "settings", PERM_DOC), permDoc(roles, meEmail(), new Date().toISOString())); return true; }
  catch (e) { say("Nepovedlo se: " + errTxt(e) + " – je publikováno firestore.rules?"); return false; }
}
// Manager zvýší minimální verzi na tuto (po potvrzení druhým klepnutím). Starší klienti pak nezapisují, dokud nenačtou novou verzi.
async function raiseMinVer(close) {
  if (blocked()) return;
  try { await setDoc(fsDoc(fs, "settings", APP_DOC), {minVer: APP_VERSION, minBy: user.email.toLowerCase(), minAt: new Date().toISOString()}, {merge: true}); say("Minimální verze nastavena na v" + APP_VERSION); close(); }
  catch (e) { say("Nepovedlo se: " + errTxt(e) + " – je publikováno firestore.rules?"); }
}
async function refresh() {
  try {
    const rs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(rs.map(r => r.unregister()));
    const ks = await caches.keys();
    await Promise.all(ks.map(k => caches.delete(k)));
  } catch (e) {}
  location.reload();
}

// ===== Zálohy =====
// Záloha obsahuje jen kolekce, které se v tomto zařízení načetly (asistent tak nezálohuje prázdné předpisy, které by „Nahradit vším“ smazalo);
// soukromé kolekce attnote, staffpay a plpay jsou v ní, pokud je role smí číst (manager všechny)
async function exportJSON() {
  const out = {};
  COLL.forEach(c => { if (first[c]) out[c] = data[c]; });
  // Plány tréninků a obrázky cvičení se načtou celé až teď (bez chyby zálohy, když je pravidla nepustí)
  if (can("sport")) for (const c of FETCH) {
    try { const s = await getDocs(fsCol(fs, c)); out[c] = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); } catch (e) { console.warn("Záloha bez " + c + ":", errTxt(e)); }
  }
  downloadFile("hokej-zaloha-" + stamp() + ".json", JSON.stringify({app: "hokej-zapasy", version: 1, exported: new Date().toISOString(), data: out}, null, 1), "application/json");
}
function exportCSV() {
  // Koeficient se exportuje v procentech, osvobozená jako ano / prázdné; platební pole z plpay (náhrada ze starých polí v players)
  const rows = [["Přezdívka", "Číslo", "Pozice", "Alternativní pozice", "Stav", "Skupina plateb", "Osvobozená", "Koeficient (%)", "Poznámka k platbám"], ...Object.values(plMerged()).map(p => [p.name, p.num, p.pos, p.alt, p.st || "act", p.grp || "monthly", exOf(p) ? "ano" : "", String(Math.round(fxOf(p) * 1000) / 10).replace(".", ","), p.note || ""])];
  downloadFile("soupiska-" + stamp() + ".csv", csv(rows), "text/csv");
}
// Zápis po dávkách (limit Firestore je 500 operací); vyžaduje připojení k internetu. Operace: ["set" | "merge" | "del", kolekce, id, data]
async function commitOps(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(fs);
    ops.slice(i, i + 400).forEach(([t, c, id, d]) => {
      if (t === "set") b.set(fsDoc(fs, c, id), clone(d));
      else if (t === "merge") b.set(fsDoc(fs, c, id), mergeVals(d), {merge: true});
      else b.delete(fsDoc(fs, c, id));
    });
    await b.commit();
  }
}
// Při „Nahradit vším“ se mažou jen kolekce, které záloha obsahuje (stará záloha bez událostí, docházky, týmu a pokladny je nesmaže).
// Kolekce audit se přeskakuje: pravidla databáze dovolují jen přidávání, jiný zápis by shodil celou dávku.
// Brána verze settings/app se ze zálohy neobnovuje ani nemaže (stará záloha nesmí snížit požadovanou verzi; pravidla mazání nedovolí).
// Matice práv settings/perm se ze zálohy také neobnovuje ani nemaže (je to nastavení týmu, mění ji jen manager v ⚙️ → 🔐 Práva rolí).
// Účty týmu v settings/cash (iban, iban2 a záznam o jejich změně) se ze zálohy neobnovují – zůstávají aktuální; měnit je jde jen
// návrhem a potvrzením (vynucují pravidla databáze), jinak by obnova staré zálohy shodila celou dávku nebo podvrhla účet.
const ACC_KEYS = ["iban", "iban2", "ibanBy", "ibanOk", "ibanAt", "ibanPend"];
function keepAcc(d) { const o = clone(d), cur = data.settings.cash || {}; ACC_KEYS.forEach(k => { if (cur[k] != null) o[k] = clone(cur[k]); else delete o[k]; }); return o; }
// Schválený rozpočet (budget/{sezóna}.approved) a úpravy po schválení (rev) zůstávají z databáze: pravidla nedovolí schválenou verzi
// změnit ani smazat a úpravy zkrátit; obnova přepíše jen pole plánu. Schválený rozpočet se při „Nahradit vším“ nemaže.
const BUDGET_KEEP = ["approved", "rev"];
function keepBudget(id, d) { const o = clone(d), cur = data[BUDGET_COLL][id]; if (!cur || !cur.approved) return o; BUDGET_KEEP.forEach(k => { if (cur[k] != null) o[k] = clone(cur[k]); else delete o[k]; }); return o; }
// Stará záloha (citlivá data ve starých polích) se nejdřív rozdělí do nových kolekcí (splitLegacy) – pravidla databáze stará pole
// už zapsat nedovolí a dávka by selhala celá. Hodnoty ze zálohy se zapíšou (set) i v nových kolekcích, nová kolekce v záloze má přednost.
// Vrací počet důvodů, které se nepřevedly (docházka s jiným tvarem id) – volající ho ukáže.
async function importData(obj, replace) {
  if (!obj || obj.app !== "hokej-zapasy" || !obj.data) throw new Error("Soubor není záloha aplikace " + APP_NAME + ".");
  if (outdated()) throw new Error(OLD_MSG);
  if (ro()) throw new Error(RO_MSG);
  const {data: bk, dropped} = splitLegacy(obj.data);
  const ops = [];
  COLL.forEach(c => {
    if (c === "audit") return;
    const src = bk[c] || {};
    if (replace && bk[c]) Object.keys(data[c]).forEach(id => { if (!(id in src) && !(c === "settings" && (id === "cash" || id === APP_DOC || id === PERM_DOC)) && !(c === BUDGET_COLL && data[c][id].approved)) ops.push(["del", c, id]); });
    Object.entries(src).forEach(([id, d]) => { if (c === "settings" && (id === APP_DOC || id === PERM_DOC)) return; ops.push(["set", c, id, c === "settings" && id === "cash" ? keepAcc(d) : c === BUDGET_COLL ? keepBudget(id, d) : d]); });
  });
  // Plány tréninků a obrázky cvičení: jen doplnit / přepsat ze zálohy (v zařízení nejsou načtené celé, proto se nic nemaže)
  FETCH.forEach(c => Object.entries(bk[c] || {}).forEach(([id, d]) => ops.push(["set", c, id, d])));
  // Předpisy po obnově (pro přepočet souhrnu dlužníků): nahrazení = jen ze zálohy, sloučení = stávající + ze zálohy
  const chSrc = bk.charges, chNew = chSrc ? Object.entries(replace ? chSrc : {...data.charges, ...chSrc}).map(([id, d]) => ({id, ...d})) : null;
  await commitOps(ops);
  // Souhrn dlužníků se ze zálohy neobnovuje, ale přepočítá; chyba (např. nepublikovaná pravidla) obnovu nezruší
  if (chNew && isCash()) { try { await rebuildDebtors(chNew); } catch (e) { say("Data obnovena, ale souhrn dlužníků se nepřepočítal: " + errTxt(e)); } }
  return dropped;
}
// ===== Exporty a spuštění =====
// Okno ⚙️ vykresluje views/settings-view.js (napojeno v main.js jako HK.openCfg)
document.getElementById("gear").onclick = () => { if (isReady && HK.openCfg) HK.openCfg(); };
export const HK = {version: VERSION, refresh, outdated, ready: () => readyP || (readyP = boot()), importData, exportJSON, exportCSV, canDelete, can, perm, pid: () => pid, tid: () => tid, user: () => user, openCash: null, openJoin: null, openEvSet: null, openCfg: null,
  // Úplné smazání události (vývojář; wipePreview = jen plán s počty) a tichý zápis odvozených dokumentů
  wipeEvent, wipePreview, syncOps,
  // Účty members [{email, role, pid, tid, cash}] – okno žádostí o přijetí (manager)
  listMembers: async () => (await getDocs(fsCol(fs, "members"))).docs.map(d => ({email: d.id, ...d.data()})),
  // Náhled role: preview() = null nebo {label, write}; ro() = jen ke čtení; blocked() = strážce zápisu s hláškou
  preview: () => pv ? {label: pvLabel(), write: pv.write} : null, ro, blocked, endPreview,
  // Okno ⚙️ (views/settings-view.js): údaje a zápisy bez vykreslení
  cfg: {acct, isDev, pvInfo, runPreview, endPreview, logout, PV_ROLES, memberRoles, needsPid, cashOk, staffOk, pidRoleOf, pidRoleErr, playerList, staffList,
    joinCount, memberRows, memberInfo, canRemove, removeMember, saveMember, rebuildDebtors, rebuildPrices, backupCounts,
    gateInfo, raiseMinVer, roleLabel, permState, savePerms, online: () => navigator.onLine}};
window.HK = HK;
if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
