// Datová vrstva: Firebase (Firestore, přihlášení Google), oprávnění HK.can / HK.perm (jediné místo, z domain/permissions.js a settings/perm),
// 👁 náhled role vývojáře (sessionStorage, výchozí jen ke čtení), strážce zápisu blocked() (náhled, starší verze pod settings/app.minVer).
// Rozhraní db: collection(c) – onSnapshot, where(pole, hodnota), one(id), part(id), add, newId, getAll, getWhere; doc(cesta) – set, merge, delete, get,
// onSnapshot; batch() – set / merge / delete / commit; tx(cesty, fn) – transakce nad aktuálním stavem serveru (úhrady předpisů). 📉 Události a docházka s oknem (listenWin; hráčka 15 dní dopředu, dál farListen; domain/data-window.js). Okno ⚙️: data/cfg-api.js, zálohy: data/backup.js.
// Účet bez členství → ✋ žádost o přijetí (views/join-view.js); neplatná role (např. stará kustod) nemá přístup. 📉 Pokladna na vyžádání: HK.money (domain/money-load.js).

// ===== Importy =====
import {APP_NAME, DEV_EMAILS} from "../config/team-config.js";
import {APP_LABEL, APP_VERSION, cmpVer, isOutdated} from "../core/app-version.js";
import {CHANNEL, IS_BETA, cachePrefix} from "../core/channel.js";
import {clone, esc, td, toast} from "../core/utils.js";
import {BUDGET_COLL} from "../domain/budget.js";
import {ATT_D_VER, WIN, archNeed, attDate, countFrom, dayAdd, mergeBand, winFrom, winTo} from "../domain/data-window.js";
import {DEBT_COLL, debtorPlanFor, debtorRebuild} from "../domain/debtors.js";
import {ABS_COLL} from "../domain/absence.js";
import {BETA_DOC, canUseBeta, isTester} from "../domain/beta.js";
import {DRILLIMG_COLL, DRILL_COLL} from "../domain/drills.js";
import {wipePlan} from "../domain/event-cancel.js";
import {EVPUB_COLL, LUPUB_COLL} from "../domain/guests.js";
import {PRICE_COLL, pricePlan} from "../domain/economy.js";
import {JOIN_COLL} from "../domain/join-requests.js";
import {MONEY_LAZY_KEY, lazyMoney, moneyReady} from "../domain/money-load.js";
import {PID_ROLE_KEYS, ROLE_LABELS, STAFF_ROLE_KEYS, actOf, permClean, permOf, roleLabel, roleOf} from "../domain/permissions.js";
import {REQ_COLL} from "../domain/requests.js";
import {NOTE_COLL, PPAY_COLL, SPAY_COLL, withPlPay} from "../domain/private-data.js";
import {SERIES_COLL} from "../domain/recurrence.js";
import {TRTPL_COLL} from "../domain/plan-reuse.js";
import {TRPLAN_COLL} from "../domain/training-plan.js";
import {PLEVEL_COLL} from "../domain/line-split.js";
import {TRMS_COLL} from "../domain/stopwatch.js";
import {TREVAL_COLL} from "../domain/training-eval.js";
import {TRLIVE_COLL} from "../domain/training-live.js";
import {backupApi} from "./backup.js";
import {cfgApi} from "./cfg-api.js";
import {FIREBASE_CONFIG} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {GoogleAuthProvider, getAuth, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {collection as fsCol, deleteDoc, deleteField, doc as fsDoc, getDoc, getDocs, getDocsFromCache, getDocsFromServer, initializeFirestore, onSnapshot, persistentLocalCache, persistentMultipleTabManager, query, runTransaction, serverTimestamp, setDoc, where, writeBatch} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ===== Konstanty a stav =====
const VERSION = APP_LABEL + (IS_BETA ? " · 🧪 beta" : "");             // číslo verze je jen v core/app-version.js; v betě se štítkem kanálu
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
let stored = {role: null, rv: null};
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
// 🧪 Beta: dokument settings/beta (testeři; čtou členové týmu se zbytkem nastavení), tester podle skutečného účtu (ne náhledu role)
const betaRaw = () => (data.settings || {})[BETA_DOC] || null;
const tester = () => !!user && isTester(betaRaw(), user.email, isDev());
// Smí účet pracovat v betě? Tester, nebo skutečný manager (spravuje testery)
const betaOk = () => canUseBeta(tester(), stored.role === "manager");
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
  if (win[c]) { listenWin(c); return; }
  onSnapshot(fsCol(fs, c), snap => {
    data[c] = {};
    snap.docs.forEach(d => { data[c][d.id] = d.data(); });
    first[c] = true;
    fire(c);
  }, err => subs[c].forEach(s => s.er && s.er(err)));
}
// ===== Data: 📉 okno poslechu (události, docházka) =====
// win[c] = {from, to, live, arch, far, farOn, liveOk, at, st, err}: živě se poslouchá pole >= from (u hráčky < to), starší dokumenty
// (archiv) z paměti zařízení; vzdálenější budoucnost hráčky (far, >= to) až po farListen() – tlačítko Načíst další v Událostech;
// ze serveru se archiv načte celý jen jednou na zařízení (nebo ručně v ⚙️), pak po WIN[c].ttl jen pás BAND dní před oknem.
const win = {};
const ARCH_KEY = c => "hk-arch-" + c;
const toMap = s => Object.fromEntries(s.docs.map(d => [d.id, d.data()]));
const stampOf = c => { try { return JSON.parse(localStorage.getItem(ARCH_KEY(c)) || "null"); } catch (e) { return null; } };
const stampSet = (c, v) => { try { localStorage.setItem(ARCH_KEY(c), JSON.stringify(v)); } catch (e) {} };
// Nastavení oken po přihlášení: události vždy, docházka až od 🔒 Vyžadovat verzi ≥ ATT_D_VER (všechny aplikace zapisují datum d)
function setupWindows(gateVer) {
  const from = winFrom(td(), STAFF.includes(role)), to = winTo(td(), STAFF.includes(role));
  Object.keys(WIN).forEach(c => {
    if (c === "attendance" && cmpVer(gateVer || "0", ATT_D_VER) < 0) return;
    win[c] = {from, to, live: {}, arch: {}, far: {}, farOn: false, liveOk: false, at: (stampOf(c) || {}).at || 0, st: "", err: ""};
  });
}
// Sloučení archivu, vzdálené budoucnosti a živé části (živá má přednost) a rozeslání odběratelům
function winMerge(c) { const W = win[c]; data[c] = {...W.arch, ...W.far, ...W.live}; fire(c); }
// Živý poslech okna; po prvním snímku se načte archiv, dokument, který z okna odešel (změna data), se dohledá v paměti zařízení
function listenWin(c) {
  const W = win[c], f = WIN[c].f;
  const q = W.to ? query(fsCol(fs, c), where(f, ">=", W.from), where(f, "<", W.to)) : query(fsCol(fs, c), where(f, ">=", W.from));
  onSnapshot(q, snap => {
    W.live = toMap(snap);
    const gone = typeof snap.docChanges === "function" && snap.docChanges().some(x => x.type === "removed");
    const firstTime = !W.liveOk;
    W.liveOk = true; first[c] = true;
    winMerge(c);
    if (firstTime) archLoad(c, false);
    else if (gone) archCache(c).then(() => winMerge(c));
  }, err => subs[c].forEach(s => s.er && s.er(err)));
}
// 📉 Vzdálená budoucnost hráčky (pole >= to): druhý živý poslech jen na vyžádání (Události → Načíst další), platí do zavření aplikace.
// Živý (ne jednorázový) – vlastní odpověď na vzdálenou událost i změny trenéra se hned projeví; při dalším spuštění se znovu nečte.
function farListen() {
  Object.entries(win).forEach(([c, W]) => {
    if (!W.to || W.farOn) return;
    W.farOn = true;
    onSnapshot(query(fsCol(fs, c), where(WIN[c].f, ">=", W.to)), snap => { W.far = toMap(snap); winMerge(c); },
      err => { W.farOn = false; subs[c].forEach(s => s.er && s.er(err)); });
  });
}
// Stav vzdálené budoucnosti pro Události: {to} = od kterého dne chybí (hráčka bez načtení), jinak null (vše načteno / realizační tým)
const farInfo = () => { const W = win.events; return W && W.to && !W.farOn ? {to: W.to} : null; };
// Archiv z paměti zařízení (zdarma; chyba = beze změny)
async function archCache(c) {
  const W = win[c];
  try { W.arch = toMap(await getDocsFromCache(query(fsCol(fs, c), where(WIN[c].f, "<", W.from)))); } catch (e) { /* paměť není k dispozici */ }
}
// Načtení archivu: paměť zařízení, pak podle archNeed celý archiv nebo pás ze serveru; force = ruční obnova z ⚙️
async function archLoad(c, force) {
  const W = win[c], {f, ttl, band} = WIN[c];
  if (!W || W.st === "load") return;
  W.st = "load"; W.err = "";
  try {
    if (!force) await archCache(c);
    const need = archNeed(stampOf(c), Date.now(), ttl, Object.keys(W.arch).length, force);
    if (need === "all") {
      W.arch = toMap(await getDocsFromServer(query(fsCol(fs, c), where(f, "<", W.from))));
      stampSet(c, {at: Date.now(), all: true});
    } else if (need === "band") {
      const lo = dayAdd(W.from, -band);
      W.arch = mergeBand(W.arch, toMap(await getDocsFromServer(query(fsCol(fs, c), where(f, ">=", lo), where(f, "<", W.from)))), f, lo, W.from);
      stampSet(c, {at: Date.now(), all: true});
    }
    W.at = (stampOf(c) || {}).at || 0; W.st = "";
  } catch (e) { W.st = "err"; W.err = errTxt(e); console.warn("Archiv " + c + " se nenačetl ze serveru:", W.err); }
  winMerge(c);
}
// Stav oken pro ⚙️ → 💾 Data: [{c, from, live, arch, at, st, err}]
const winInfo = () => Object.entries(win).map(([c, W]) => ({c, from: W.from, to: W.to, live: Object.keys(W.live).length, arch: Object.keys(W.arch).length, far: W.farOn ? Object.keys(W.far).length : null, at: W.at, st: W.st, err: W.err}));
// Ruční obnova archivu ze serveru (čte všechny starší dokumenty)
const archRefresh = () => Promise.all(Object.keys(win).filter(c => win[c].liveOk).map(c => archLoad(c, true)));

// ===== Data: 📉 datum události v docházce (d) =====
// Nový dokument docházky dostane datum své události (okno docházky); změna data události se propíše do její docházky
function withD(c, d) {
  if (c !== "attendance" || !d || typeof d !== "object" || "d" in d || !d.eid) return d;
  return {...d, d: attDate(d.eid, data.events, data.matches)};
}
// Docházka události, jejíž datum se mění: [[id, nové datum]] (jen dokumenty, které zařízení vidí)
function attMoves(c, id, d) {
  if ((c !== "events" && c !== "matches") || !d || typeof d.date !== "string") return [];
  return Object.entries(data.attendance || {}).filter(([, a]) => a && a.eid === id && a.d !== d.date).map(([aid]) => [aid, d.date]);
}
// Tiché propsání data do docházky (chyba jen do konzole – zápis nespustil uživatel)
function moveAtt(c, id, d) {
  attMoves(c, id, d).forEach(([aid, v]) => setDoc(fsDoc(fs, "attendance", aid), {d: v}, {merge: true}).catch(e => console.warn("Datum docházky:", errTxt(e))));
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
// 📉 Počty dokumentů v kolekcích, které zařízení poslouchá (= čtení při spuštění po pauze > 30 min); odhad v ⚙️ → 💾 Data
// U kolekcí s oknem se počítá jen živá část (archiv z paměti zařízení se neplatí)
const readCounts = () => Object.fromEntries(Object.keys(data).filter(c => first[c]).map(c => [c, win[c] ? Object.keys(win[c].live).length : Object.keys(data[c]).length]));
// Odhad pro hráčku z dat v zařízení: okno hráčky (8 dní zpět, 15 dopředu) u kolekcí s oknem, ostatní celé
const readCountsPlayer = () => {
  const from = winFrom(td(), false), to = winTo(td(), false);
  return Object.fromEntries(Object.keys(data).filter(c => first[c]).map(c => [c, win[c] ? countFrom(data[c], WIN[c].f, from, to) : Object.keys(data[c]).length]));
};
const view = c => ({docs: Object.entries(data[c]).map(([id, d]) => ({id, data: () => clone(d)}))});
function fire(c) { subs[c].forEach(s => { try { s.cb(view(c)); } catch (e) { console.error(e); } }); }
function subscribe(c, cb, er) {
  subs[c].push({cb, er});
  listen(c);
  if (first[c]) setTimeout(() => cb(view(c)), 0);
}
// Zápis se projeví lokálně hned (i offline), na server odejde po připojení; chyba (např. práva) se zobrazí hláškou
function writeDoc(c, id, d) { if (blocked()) return; setDoc(fsDoc(fs, c, id), clone(withD(c, d))).catch(e => say("Uložení se nepovedlo: " + errTxt(e))); moveAtt(c, id, d); }
// Hodnoty pro částečný zápis: "__del" smaže pole, "__now" = čas serveru (serverTimestamp), ostatní se zkopírují;
// undefDel = i undefined smaže pole (jinak se vynechá)
const mergeVals = (d, undefDel) => { const o = {}; Object.entries(d).forEach(([k, v]) => { if (v === undefined && !undefDel) return; o[k] = v === "__now" ? serverTimestamp() : v === "__del" || v === undefined ? deleteField() : clone({v}).v; }); return o; };
// Částečný zápis dokumentu: změní jen uvedená pole (mergeFields), ostatní pole – i ta, která tato verze nezná – zůstanou.
// Stejně jako writeDoc nečeká na server (offline se zápis odešle po připojení); chyba se ukáže hláškou.
function mergeDoc(c, id, d) {
  if (blocked()) return;
  const o = mergeVals(d, true);
  setDoc(fsDoc(fs, c, id), o, {mergeFields: Object.keys(o)}).catch(e => say("Uložení se nepovedlo: " + errTxt(e)));
  moveAtt(c, id, d);
}
// Kontrola mazání události / zápasu s vyúčtováním:
//  - vyúčtovanou událost smaže jen správce pokladny,
//  - uzavřené vyúčtování s nezaplacenými předpisy smazat nejde (nejdřív úhrada, nebo „Znovu otevřít“).
function canDelete(c, id) {
  if (c !== "matches" && c !== "events") return true;
  const d = data[c][id] || {};
  const settled = !!(d.ss || (data.evcash[id] || {}).settle);   // ss = příznak vyúčtování v dokumentu události
  if (settled && !isCash()) { say("Vyúčtovanou událost smaže jen správce pokladny"); return false; }
  // 📉 Předpisy ještě nejsou v zařízení: kontrola nezaplacených by byla prázdná – nejdřív načíst pokladnu
  if ((settled || data.evcash[id]) && !monOk()) { moneyLoad(); say("⏳ Načítám pokladnu – smazání zkus za chvíli znovu"); return false; }
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
// Hráčky s připojenými platebními poli z plpay – CSV soupisky
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
  if (!isCash()) throw new Error("Přepočet dlužníků smí jen správce pokladny");
  if (!ch) await moneyLoad();                                   // 📉 přepočet ze zařízení potřebuje všechny předpisy
  const plan = debtorRebuild(ch || chList(), Object.keys(data[DEBT_COLL]), isStaffId);
  await commitOps([...plan.set.map(x => ["set", DEBT_COLL, x.id, x.d]), ...plan.del.map(id => ["del", DEBT_COLL, id])]);
  return plan.set.length;
}
// Doplnění cen událostí na hlavu (evprice) ze snapshotů uzavření evcash (⚙️ → Pokladna, idempotentní – zapíše jen chybějící a změněné,
// smaže ceny událostí bez uzavřeného vyúčtování). Vrací {set, del} počty, nebo null, když zápis zastavil strážce.
async function rebuildPrices() {
  if (blocked()) return null;
  if (!isCash()) throw new Error("Doplnění cen smí jen správce pokladny");
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
// ===== Data: 📉 pokladna na vyžádání =====
// monSt: "" = běžný režim (načítá se hned), "wait" = čeká na otevření pokladny, "load" = načítá se, "ok" = načteno.
// Loader (src/main.js) spustí poslech předpisů a pohybů pokladny a vrátí slib, který se splní po prvním snímku obou kolekcí.
let monSt = "", monLoader = null, monP = null;
const monPref = () => { try { return localStorage.getItem(MONEY_LAZY_KEY); } catch (e) { return null; } };
const monOk = () => moneyReady(monSt);
// Registrace loaderu po přihlášení: úsporný režim čeká na otevření pokladny, jinak se načte hned
function moneyInit(loader) {
  monLoader = loader;
  if (lazyMoney(monPref(), can("sport"), can("money"))) { monSt = "wait"; return; }
  monSt = ""; loader();
}
// Načíst pokladnu teď (opakované volání vrací stejný slib); bez loaderu nebo v běžném režimu hned splněno
function moneyLoad() {
  if (monOk() || !monLoader) return Promise.resolve();
  if (!monP) { monSt = "load"; monP = Promise.resolve(monLoader()).then(() => { monSt = "ok"; }); }
  return monP;
}
// Volba zařízení (⚙️ → 💾 Data): true = až při otevření, false = hned; platí od dalšího spuštění (vypnutí načte hned)
function moneySetPref(lazy) {
  try { localStorage.setItem(MONEY_LAZY_KEY, lazy ? "1" : "0"); } catch (e) {}
  if (!lazy) moneyLoad();
}

// Úplné smazání události se vším souvisejícím (jen vývojář): docházka, důvody, předpisy, úhrady v pokladně, vyúčtování, cena,
// žádosti a veřejné dokumenty; potom přepočet dlužníků. wipePreview = jen plán (počty pro potvrzení). Vrací plán, nebo null.
const wipeSrc = () => ({attendance: data.attendance, attnote: data[NOTE_COLL], charges: data.charges, cash: data.cash, evcash: data.evcash, evprice: data[PRICE_COLL], requests: data[REQ_COLL], evpub: data[EVPUB_COLL], lineuppub: data[LUPUB_COLL]});
const wipePreview = (c, id) => wipePlan(c, id, wipeSrc());
async function wipeEvent(c, id) {
  if (c !== "events" && c !== "matches") throw new Error("Smazat jde jen událost nebo zápas");
  await moneyLoad();                                            // 📉 plán smazání potřebuje všechny předpisy a pohyby pokladny
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
    set: (p, d) => { const [c, id] = splitPath(p); b.set(fsDoc(fs, c, id), clone(withD(c, d))); attMoves(c, id, d).forEach(([aid, v]) => b.set(fsDoc(fs, "attendance", aid), {d: v}, {merge: true})); return api; },
    // Částečná změna dokumentu; hodnota "__del" smaže pole
    merge: (p, d) => { const [c, id] = splitPath(p); b.set(fsDoc(fs, c, id), mergeVals(d), {merge: true}); attMoves(c, id, d).forEach(([aid, v]) => b.set(fsDoc(fs, "attendance", aid), {d: v}, {merge: true})); return api; },
    delete: p => { const [c, id] = splitPath(p); b.delete(fsDoc(fs, c, id)); return api; },
    // V náhledu jen ke čtení se dávka nepotvrdí (nic neodejde)
    commit: () => blocked() ? Promise.resolve() : b.commit().catch(e => say("Uložení se nepovedlo: " + errTxt(e)))
  };
  return api;
}
// Transakce (v22.18.2, úhrady předpisů – nález A kontroly): přečte dokumenty paths ze SERVERU (ne z offline paměti), fn(cur, w)
// podle nich naplánuje zápisy (w.set / w.delete s cestou "kolekce/id", stejné rozhraní jako dávka) a vrátí výsledek.
// Souběžná změna týchž dokumentů z jiného zařízení = Firestore fn zopakuje nad novým stavem (fn proto nesmí měnit nic mimo w).
// Bez připojení transakce selže (výjimka) – volající to oznámí. V náhledu jen ke čtení / u starší verze vrací null (nic neodejde).
async function runTx(paths, fn) {
  if (blocked()) return null;
  return runTransaction(fs, async t => {
    const cur = {};
    for (const p of paths || []) {
      const [c, id] = splitPath(p), s = await t.get(fsDoc(fs, c, id));
      cur[p] = s.exists() ? clone(s.data()) : null;
    }
    const w = {
      set: (p, d) => { const [c, id] = splitPath(p); t.set(fsDoc(fs, c, id), clone(d)); return w; },
      delete: p => { const [c, id] = splitPath(p); t.delete(fsDoc(fs, c, id)); return w; }
    };
    return fn(cur, w);
  });
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
    getAll: async () => (await getDocs(fsCol(fs, c))).docs.map(d => ({id: d.id, ...clone(d.data())})),
    // Jednorázové čtení dokumentů s pole == hodnota [{id, ...data}] (🕘 historie přihlášek jedné události); chyba = výjimka
    getWhere: async (f, v) => (await getDocs(query(fsCol(fs, c), where(f, "==", v)))).docs.map(d => ({id: d.id, ...clone(d.data())}))
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
  batch: makeBatch,
  tx: runTx
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
  // 📉 Okna poslechu: brána verze rozhodne, zda už všechny aplikace zapisují datum do docházky (1 čtení, offline z paměti)
  let gate = "";
  try { const g = await getDoc(fsDoc(fs, "settings", APP_DOC)); gate = g.exists() ? (g.data() || {}).minVer || "" : ""; } catch (e) { /* bez okna docházky */ }
  setupWindows(gate);
  document.getElementById("nav").style.display = "";
  isReady = true;
  return db;
}

// Načíst novou verzi: zahodí service worker a cache jen tohoto kanálu (stabilní a 🧪 beta se navzájem nemažou), pak znovu načte stránku
async function refresh() {
  try {
    const scope = new URL("./", location.href).href, pfx = cachePrefix(CHANNEL);
    const rs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(rs.filter(r => r.scope === scope).map(r => r.unregister()));
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k.startsWith(pfx)).map(k => caches.delete(k)));
  } catch (e) {}
  location.reload();
}

// Zápis po dávkách (limit Firestore je 500 operací); vyžaduje připojení k internetu. Operace: ["set" | "merge" | "del", kolekce, id, data]
async function commitOps(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(fs);
    ops.slice(i, i + 400).forEach(([t, c, id, d]) => {
      if (t === "set") b.set(fsDoc(fs, c, id), clone(withD(c, d)));
      else if (t === "merge") b.set(fsDoc(fs, c, id), mergeVals(d), {merge: true});
      else b.delete(fsDoc(fs, c, id));
    });
    await b.commit();
  }
}

// ===== Rozhraní ⚙️ a zálohy (data/cfg-api.js, data/backup.js) =====
// Kontext pro moduly okna ⚙️ a záloh: stav účtu se předává jako funkce (mění se při přihlášení a náhledu role)
const C = {data, first, COLL, FETCH, APP_DOC, PERM_DOC, BETA_DOC, ROLES, PID_ROLES, STAFF, RO_MSG, OLD_MSG,
  user: () => user, role: () => role, pid: () => pid, tid: () => tid, cash: () => cash, stored: () => stored, pv: () => pv, real: () => real, fs: () => fs, auth: () => auth,
  can, isStaff, isCash, blocked, ro, outdated, minVer, say, errTxt, stamp, pvLabel, pvWrite, startPreview, permRaw, perms, commitOps, plMerged, rebuildDebtors, isDev, betaRaw, tester, moneyLoad};
const CFG = cfgApi(C), {exportJSON, exportCSV, importData} = backupApi(C);

// ===== Exporty a spuštění =====
// Okno ⚙️ vykresluje views/settings-view.js (napojeno v main.js jako HK.openCfg)
document.getElementById("gear").onclick = () => { if (isReady && HK.openCfg) HK.openCfg(); };
export const HK = {version: VERSION, refresh, outdated, ready: () => readyP || (readyP = boot()), importData, exportJSON, exportCSV, canDelete, can, perm, pid: () => pid, tid: () => tid, user: () => user, openCash: null, openJoin: null, openEvSet: null, openCfg: null,
  // Úplné smazání události (vývojář; wipePreview = jen plán s počty) a tichý zápis odvozených dokumentů
  wipeEvent, wipePreview, syncOps,
  // 📉 Vzdálená budoucnost hráčky: farInfo() = {to} dokud není načtená, farListen() = načíst (Události → Načíst další)
  farInfo, farListen,
  // Účty members [{email, role, pid, tid, cash}] – okno žádostí o přijetí (manager)
  listMembers: async () => (await getDocs(fsCol(fs, "members"))).docs.map(d => ({email: d.id, ...d.data()})),
  // Náhled role: preview() = null nebo {label, write}; ro() = jen ke čtení; blocked() = strážce zápisu s hláškou
  preview: () => pv ? {label: pvLabel(), write: pv.write} : null, ro, blocked, endPreview,
  // 📉 Pokladna na vyžádání: init(loader) po přihlášení (main.js), ok() = předpisy a pohyby jsou v zařízení, load() = načíst teď,
  // lazy() = úsporný režim tohoto zařízení, setLazy(b) = volba v ⚙️ → 💾 Data
  money: {init: moneyInit, ok: monOk, load: moneyLoad, st: () => monSt, lazy: () => lazyMoney(monPref(), can("sport"), can("money")), setLazy: moneySetPref},
  // 🧪 Beta kanál: tester() = nabídka bety a přístup do ní, betaOk() = smí pracovat v betě (tester nebo manager)
  tester, betaOk,
  // Okno ⚙️ (views/settings-view.js): údaje a zápisy bez vykreslení
  cfg: {...CFG, isDev, endPreview, rebuildDebtors, rebuildPrices, roleLabel, online: () => navigator.onLine, readCounts, readCountsPlayer, winInfo, archRefresh}};
window.HK = HK;
if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
