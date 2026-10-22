/* Datová vrstva: Firebase (Firestore + přihlášení přes Google).
   Rozhraní `db`: collection/doc, set, add, delete, onSnapshot a batch() pro atomické zápisy
   (úhrada = příjem do pokladny + předpis; uzavření vyúčtování = evcash + událost + předpisy + audit), merge pro částečné změny dokumentu
   a collection(c).where(pole, hodnota) pro členy, kteří smí číst jen své předpisy. Struktura: Importy -> Konstanty a stav
   -> Pomocné funkce -> Náhled role -> Data (poslech, zápis, kontrola mazání) -> Přihlášení a role -> Okno nastavení -> Zálohy -> Exporty.
   Náhled role: vývojář (DEV_EMAILS) si v ⚙️ zvolí roli, hráčku / člena týmu a příznak pokladníka; volba je jen v paměti
   zařízení (sessionStorage), po znovunačtení stránky platí jako role účtu (main.js podle ní poslouchá jen povolená data).
   Výchozí je jen ke čtení – každý zápis (doc.set, add, delete, dávka, členové, obnova zálohy) skončí hláškou „V náhledu se nezapisuje“.
   Brána verze: dokument settings/app = {minVer, minBy, minAt}. Klient se starší verzí (core/app-version.js) nezapisuje –
   strážce blocked() zastaví každý zápis (doc.set, add, delete, dávka, členové, obnova) a nahoře je pruh „Načíst novou verzi“.
   Minimum nastavuje jen trenér (⚙️ → Verze aplikace) a jen směrem nahoru; ze zálohy se neobnovuje.
   Pokladník (bez role trenér) spravuje jen členy s rolí Hráčka a nemění vlastní účet (stejně vynucují pravidla databáze). */

// ===== Importy =====
import {APP_NAME, DEV_EMAILS} from "../config/team-config.js";
import {APP_LABEL, APP_VERSION, canRaise, isOutdated} from "../core/app-version.js";
import {csv, downloadFile, esc, toast} from "../core/utils.js";
import {exFixPlan, exOf, fxOf} from "../domain/cash.js";
import {DEBT_COLL, debtorPlanFor, debtorRebuild} from "../domain/debtors.js";
import {FIREBASE_CONFIG} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {GoogleAuthProvider, getAuth, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {collection as fsCol, deleteDoc, deleteField, doc as fsDoc, getDoc, getDocs, initializeFirestore, onSnapshot, persistentLocalCache, persistentMultipleTabManager, query, setDoc, where, writeBatch} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ===== Konstanty a stav =====
const VERSION = APP_LABEL;                                              // číslo verze je jen v core/app-version.js
{ const v = document.getElementById("ver"); if (v) v.textContent = VERSION; }
// kolekce aplikace (events = tréninky, attendance = docházka, staff = realizační tým,
// charges = předpisy (události i měsíční příspěvky), cash = pokladna (příjmy, výdaje, platy), audit = záznamy o uzavření, znovuotevření,
// výjimkách, stornech, příspěvcích a platech, evcash = náklady a vyúčtování událostí (jen správci pokladny; v dokumentu události je jen příznak ss))
const COLL = ["players", "matches", "opponents", "settings", "events", "attendance", "staff", "charges", "cash", "audit", "evcash"];
const ROLES = {trener: "Trenér", kustod: "Kustod", hracka: "Hráčka"};   // role v members/{email}
const STAFF = ["trener", "kustod"];                                     // role s plným přístupem do aplikace
const PV_KEY = "hk-preview";                                            // klíč náhledu v sessionStorage (jen toto zařízení / okno)
const RO_MSG = "V náhledu se nezapisuje";
const OLD_MSG = "Starší verze aplikace – zápis je zablokovaný. Načti novou verzi (⚙️ → Načíst novou verzi).";
const APP_DOC = "app";                                                  // settings/app = brána verze {minVer, minBy, minAt}

// pid = hráčka propojená s účtem, tid = člen realizačního týmu propojený s účtem, cash = pokladník (příznak navíc k roli)
let fs = null, auth = null, user = null, role = null, pid = null, tid = null, cash = false, isReady = false, readyP = null;
// pv = aktivní náhled {role, pid, tid, cash, write}; real = skutečná role účtu vývojáře během náhledu
let pv = null, real = null, lastRo = 0;
const data = {};                       // zrcadlo dat pro export a zálohy
const subs = {};                       // odběratelé změn podle kolekce
const first = {};                      // už dorazil první snapshot kolekce?
const listening = new Set();           // kolekce, které se právě poslouchají
// Kolekce mimo zálohu: debtors = veřejný souhrn dlužníků bez částek (odvozuje se z předpisů, po obnově se přepočítá)
const EXTRA = [DEBT_COLL];
[...COLL, ...EXTRA].forEach(c => { data[c] = {}; subs[c] = []; });

// ===== Pomocné funkce =====
const clone = o => JSON.parse(JSON.stringify(o));
const stamp = () => new Date().toISOString().slice(0, 10);
const say = m => toast(m);
const errTxt = e => (e && (e.code || e.message)) || String(e);
const isStaff = () => STAFF.includes(role);
const isCash = () => role === "trener" || cash === true;       // správce pokladny: trenér nebo pokladník
// ===== Oprávnění (jediné místo) =====
// Akce → kdo ji smí (podle role přihlášeného účtu, v náhledu role podle náhledu). Pohledy se ptají jen přes HK.can(akce);
// nové role (fáze O) změní jen tuto tabulku. Pravidla databáze (firestore.rules) vynucují totéž na serveru.
const CAN = {
  sport: () => isStaff(),            // zápasy, sestavy, události, soupeři, docházka za ostatní: trenér, kustod
  money: () => isCash(),             // pokladna, platby, předpisy, Měsíce, nastavení pokladny: trenér, pokladník
  members: () => isCash(),           // ⚙️ Členové týmu: trenér (všichni), pokladník (jen hráčky)
  roster: () => role === "trener",   // přidat a smazat hráčku, spravovat realizační tým: trenér
  accounts: () => role === "trener", // navrhnout změnu účtu pro QR platby: trenér
  admin: () => role === "trener",    // obnova ze zálohy, brána verze, role trenér / kustod u členů: trenér
  onlyOwn: () => role === "hracka"   // hráčka: vidí a mění jen své (odpověď, Moje platby), Team jen ke čtení
};
// Smí přihlášený účet akci? Neznámá akce je chyba programu (výjimka), ne tiché „ne“.
const can = a => { const f = CAN[a]; if (!f) throw new Error("Neznámá akce oprávnění: " + a); return f(); };
const configOk = () => !!FIREBASE_CONFIG.apiKey && !/^VLOZ/.test(FIREBASE_CONFIG.apiKey) && !!FIREBASE_CONFIG.projectId && !/^VLOZ/.test(FIREBASE_CONFIG.projectId);
const splitPath = p => { const i = p.indexOf("/"); return [p.slice(0, i), p.slice(i + 1)]; };

// ===== Náhled role =====
const isDev = () => !!(user && DEV_EMAILS.includes(user.email.toLowerCase()));
const pvRead = () => { try { const o = JSON.parse(sessionStorage.getItem(PV_KEY) || "null"); return o && ROLES[o.role] && (o.role !== "hracka" || o.pid) ? o : null; } catch (e) { return null; } };
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
  return [ROLES[pv.role] + (p ? " " + p.name : ""), t ? "🎓 " + (t.name || "?") : "", pv.cash && pv.role !== "trener" ? "💰 pokladník" : "", pv.write ? "✏️ zápis povolen" : "jen ke čtení"].filter(Boolean).join(" · ");
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
const view = c => ({docs: Object.entries(data[c]).map(([id, d]) => ({id, data: () => clone(d)}))});
function fire(c) { subs[c].forEach(s => { try { s.cb(view(c)); } catch (e) { console.error(e); } }); }
function subscribe(c, cb, er) {
  subs[c].push({cb, er});
  listen(c);
  if (first[c]) setTimeout(() => cb(view(c)), 0);
}
// Zápis se projeví lokálně hned (i offline), na server odejde po připojení; chyba (např. práva) se zobrazí hláškou
function writeDoc(c, id, d) { if (blocked()) return; setDoc(fsDoc(fs, c, id), clone(d)).catch(e => say("Uložení se nepovedlo: " + errTxt(e))); }
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
  deleteDoc(fsDoc(fs, c, id)).catch(e => say("Smazání se nepovedlo: " + errTxt(e)));
}
// Předpisy jako seznam {id, ...data} a test člena realizačního týmu (pro souhrn dlužníků)
const chList = () => Object.entries(data.charges).map(([id, d]) => ({id, ...d}));
const isStaffId = mid => !!data.staff[mid];
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
// Dávka zápisů (atomicky): b.set("kolekce/id", data).delete("kolekce/id").commit()
function makeBatch() {
  const b = writeBatch(fs), api = {
    set: (p, d) => { const [c, id] = splitPath(p); b.set(fsDoc(fs, c, id), clone(d)); return api; },
    // Částečná změna dokumentu; hodnota "__del" smaže pole
    merge: (p, d) => { const [c, id] = splitPath(p), o = {}; Object.entries(d).forEach(([k, v]) => { o[k] = v === "__del" ? deleteField() : clone({v}).v; }); b.set(fsDoc(fs, c, id), o, {merge: true}); return api; },
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
    add: async d => { const id = fsDoc(fsCol(fs, c)).id; writeDoc(c, id, d); return {id}; }
  }),
  doc: p => {
    const [c, id] = splitPath(p);
    return {
      set: async d => { writeDoc(c, id, d); },
      delete: async () => { removeDoc(c, id); },
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
  try { const s = await getDoc(fsDoc(fs, "members", user.email.toLowerCase())); const d = s.exists() ? s.data() : {}; return {role: d.role || null, pid: d.pid || null, tid: d.tid || null, cash: d.cash === true}; }
  catch (e) { return {err: e}; }
}
// Spuštění: přihlášení -> kontrola role -> teprve potom se vrátí databáze
async function boot() {
  if (!configOk()) { await screen("Chybí nastavení Firebase", "Vyplň hodnoty v souboru <code>src/data/firebase-config.js</code>.", []); return new Promise(() => {}); }
  initFirebase();
  try { await getRedirectResult(auth); } catch (e) { say("Přihlášení se nepovedlo: " + errTxt(e)); }
  user = await authUser();
  for (;;) {
    if (!user) {
      await screen("🏒 " + APP_NAME, "Přihlas se účtem Google, který má trenér zapsaný mezi členy týmu.", [["login", "Přihlásit přes Google", "p"]]);
      user = await doLogin();
      continue;
    }
    const r = await checkRole();
    if (r.err) {
      const g = await screen("Nelze ověřit oprávnění", "Zkontroluj připojení k internetu. (" + esc(errTxt(r.err)) + ")", [["retry", "Zkusit znovu", "p"], ["out", "Odhlásit"]]);
      if (g === "out") { await signOut(auth); user = null; }
      continue;
    }
    role = r.role; pid = r.pid; tid = r.tid; cash = r.cash;
    // Trenér a kustod vstupují vždy; hráčka jen tehdy, když ji trenér propojil s hráčkou v soupisce
    if (STAFF.includes(role) || (role === "hracka" && pid)) {
      // Náhled role: jen účet vývojáře; role náhledu nahradí roli účtu ještě před poslechem dat (main.js)
      const o = isDev() ? pvRead() : null;
      if (o) { real = {role, pid, tid, cash}; pv = {role: o.role, pid: o.pid || null, tid: o.tid || null, cash: o.cash === true, write: o.write === true}; role = pv.role; pid = pv.pid; tid = pv.tid; cash = pv.cash; }
      else pvWrite(null);
      break;
    }
    const msg = role === "hracka" ? "Účet <b>" + esc(user.email) + "</b> zatím není propojen s hráčkou v soupisce. Požádej trenéra, ať ho propojí (⚙️ → Členové týmu)." : "Účet <b>" + esc(user.email) + "</b> nemá přístup. Požádej trenéra, ať ti ho přidá.";
    await screen("Přístup zatím není povolen", msg, [["out", "Odhlásit jiným účtem", "p"]]);
    await signOut(auth); user = null; role = null; pid = null; tid = null; cash = false;
  }
  document.getElementById("nav").style.display = "";
  isReady = true;
  return db;
}

// ===== Okno nastavení =====
let pendingImport = null;
// Hráčky pro výběr při propojení účtu (bez ukončených), seřazené podle jména
const playerOpts = () => Object.entries(data.players).filter(([, p]) => (p.st || "act") !== "end").sort((a, b) => a[1].name.localeCompare(b[1].name, "cs"))
  .map(([id, p]) => `<option value="${esc(id)}">${esc((p.num ? "#" + p.num + " " : "") + p.name)}</option>`).join("");
// Členové realizačního týmu pro výběr při propojení účtu (podle jména)
const staffOpts = () => Object.entries(data.staff).sort((a, b) => (a[1].name || "").localeCompare(b[1].name || "", "cs"))
  .map(([id, t]) => `<option value="${esc(id)}">${esc((t.name || "?") + (t.kind ? " (" + t.kind + ")" : ""))}</option>`).join("");
// Sekce náhledu v ⚙️ (jen účet vývojáře): při aktivním náhledu popis a Ukončit, jinak formulář pro spuštění
function pvSection() {
  if (!isDev()) return "";
  if (pv) return `<h3>👁 Náhled role</h3><div class="mu" style="margin-bottom:8px">Právě: <b>${esc(pvLabel())}</b>. Skutečný účet: ${esc(ROLES[real.role] || real.role)}.</div><button class="p w" id="pve">Ukončit náhled</button>`;
  return `<h3>👁 Náhled role</h3><div class="mu" style="margin-bottom:8px">Zobrazí aplikaci tak, jak ji vidí vybraná role – jen v tomto zařízení, databáze members se nemění. Data, která by role nesměla číst (cizí předpisy, vyúčtování, audit), se nenačtou. Výchozí je jen ke čtení.</div><select id="pvr"><option value="hracka">Hráčka</option><option value="kustod">Kustod</option><option value="trener">Trenér</option></select><select id="pvp"><option value="">— vyber hráčku —</option>${playerOpts()}</select><select id="pvt"><option value="">— člen realizačního týmu (volitelné) —</option>${staffOpts()}</select><select id="pvc"><option value="">Bez práv pokladníka</option><option value="1">Pokladník</option></select><label style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><input type="checkbox" id="pvw" style="width:auto;margin:0">Povolit zápis (zapisuje se pod tvým účtem za vybranou roli)</label><button class="p w" id="pvs">👁 Spustit náhled</button>`;
}
function bindPv(q) {
  if (!isDev()) return;
  if (pv) { q("#pve").onclick = endPreview; return; }
  // Výběr hráčky jen u role Hráčka; trenér je vždy správce pokladny (volba pokladníka se skryje)
  const sync = () => { const r = q("#pvr").value; q("#pvp").style.display = r === "hracka" ? "" : "none"; q("#pvc").style.display = r === "trener" ? "none" : ""; };
  q("#pvr").onchange = sync; sync();
  q("#pvs").onclick = () => {
    const r = q("#pvr").value, p = q("#pvp").value;
    if (r === "hracka" && !p) return say("Vyber hráčku");
    startPreview({role: r, pid: r === "hracka" ? p : null, tid: q("#pvt").value || null, cash: r !== "trener" && q("#pvc").value === "1", write: q("#pvw").checked});
  };
}
async function renderMembers(el) {
  const box = el.querySelector("#cmb"), coach = can("admin");
  box.textContent = "Načítám…";
  try {
    const s = await getDocs(fsCol(fs, "members"));
    const rows = s.docs.map(d => ({email: d.id, role: d.data().role, pid: d.data().pid, tid: d.data().tid, cash: d.data().cash === true})).sort((a, b) => a.email.localeCompare(b.email));
    box.innerHTML = rows.map(r => {
      const p = r.pid && data.players[r.pid], t = r.tid && data.staff[r.tid];
      const who = (r.role === "hracka" ? (p ? " · " + esc((p.num ? "#" + p.num + " " : "") + p.name) : " · ⚠️ bez hráčky") : "") + (r.tid ? (t ? " · 🎓 " + esc(t.name) : " · ⚠️ člen týmu neexistuje") : "") + (r.cash ? " · 💰 pokladník" : "");
      // Odebrat: nikdy vlastní účet; pokladník (bez role trenér) jen členy s rolí Hráčka
      const canDel = r.email !== user.email.toLowerCase() && (coach || r.role === "hracka");
      return `<div class="it" style="cursor:default"><div><b>${esc(r.email)}</b><div class="mu">${esc(ROLES[r.role] || r.role || "?")}${who}</div></div>${canDel ? `<button class="d" data-md="${esc(r.email)}" style="padding:8px 12px">Odebrat</button>` : ""}</div>`;
    }).join("") || "–";
    box.querySelectorAll("[data-md]").forEach(b => { b.onclick = async () => {
      if (blocked() || !confirm("Odebrat přístup: " + b.dataset.md + "?")) return;
      try { await deleteDoc(fsDoc(fs, "members", b.dataset.md)); renderMembers(el); } catch (e) { say("Nepovedlo se: " + errTxt(e)); }
    }; });
  } catch (e) { box.textContent = "Nelze načíst: " + errTxt(e); }
}
function openCfg() {
  const el = document.getElementById("cfg"), coach = can("admin"), cashier = can("members"), staff = can("sport"), q = s => el.querySelector(s), close = () => { el.innerHTML = ""; };
  pendingImport = null;
  el.innerHTML = `<div class="md" id="cbg"><div class="mb"><h2>⚙️ Účet a data</h2>
 <h3>Přihlášený účet</h3><div class="mu" style="margin-bottom:8px"><b>${esc(user.email)}</b> · ${esc(ROLES[role] || role)}${pv ? " (👁 náhled)" : ""}${cash && role !== "trener" ? " · 💰 pokladník" : ""}${role === "hracka" && data.players[pid] ? " · " + esc(data.players[pid].name) : ""}${staff && tid && data.staff[tid] ? " · 🎓 " + esc(data.staff[tid].name) : ""}<br>${navigator.onLine ? "Online – změny se ukládají do databáze." : "Offline – změny se uloží v zařízení a odešlou po připojení."}</div><button class="s w" id="clo">Odhlásit</button>
 ${pvSection()}
 ${cashier ? `<h3>Pokladna</h3><button class="s w" id="ccs">💰 Nastavení pokladny (IBAN, šablony, kategorie)</button><div class="mu" style="margin:8px 0">Značka ⛓ u dlužníků v Docházce se zapisuje s každou změnou předpisů. Poprvé (a po ruční změně v databázi) ji naplň přepočtem ze všech předpisů – bez částek.</div><button class="s w" id="cdb">⛓ Přepočítat dlužníky</button>` : ""}
 ${cashier ? `<h3>Členové týmu</h3><div class="mu" style="margin-bottom:8px">Přístup mají jen zapsané e-maily (přesně tak, jak je používá Google účet). U role Hráčka vyber hráčku, za kterou se bude zapisovat docházka. Volitelně vyber člena realizačního týmu (Team → Realizační tým) a příznak Pokladník. Stejný e-mail znovu = změna nastavení.${coach ? "" : " Pokladník přidává a mění jen členy s rolí Hráčka a nemění vlastní účet; ostatní role spravuje trenér."}</div><div id="cmb" style="margin-bottom:8px"></div><input id="cme" type="email" placeholder="e-mail@gmail.com"><select id="cmr">${coach ? '<option value="trener">Trenér</option><option value="kustod" selected>Kustod</option>' : ""}<option value="hracka"${coach ? "" : " selected"}>Hráčka</option></select><select id="cmp"${coach ? ' style="display:none"' : ""}><option value="">— vyber hráčku —</option>${playerOpts()}</select><select id="cmt"><option value="">— člen realizačního týmu (volitelné) —</option>${staffOpts()}</select><select id="cmc"><option value="">Bez práv pokladníka</option><option value="1">Pokladník</option></select><button class="p w" id="cma">Přidat člena</button>` : ""}
 ${staff ? `<h3>Záloha dat</h3><div class="row"><button class="s" id="ce">Stáhnout zálohu (JSON)</button><button class="s" id="cc">Soupiska (CSV)</button></div>` : ""}
 ${coach ? `<h3>Obnovit ze zálohy</h3><input type="file" id="cf" accept=".json,application/json"><div class="mu" id="ci" style="margin-bottom:8px"></div><div class="row"><button class="s" id="cm">Sloučit s daty</button><button class="d" id="cr">Nahradit vším</button></div>` : ""}
 ${coach ? exFixHtml() : ""}
 <h3>Verze aplikace</h3><div class="mu" style="margin-bottom:8px">Používáš: <b>${VERSION}</b>. Pokud po nahrání nové verze vidíš starou, načti ji tlačítkem níže.${verInfo()}</div><button class="s w" id="cu2">Načíst novou verzi</button>${coach && canRaise(APP_VERSION, minVer()) ? `<button class="s w" id="cmv" style="margin-top:8px">🔒 Vyžadovat verzi v${APP_VERSION}</button>` : ""}
 <button class="s w" id="cz" style="margin-top:14px">Zavřít</button></div></div>`;
  q("#cu2").onclick = refresh; q("#cz").onclick = close;
  if (q("#cmv")) q("#cmv").onclick = () => raiseMinVer(q("#cmv"), close);
  if (q("#cex")) q("#cex").onclick = () => runExFix(q("#cex"), close); q("#cbg").onclick = e => { if (e.target.id === "cbg") close(); };
  q("#clo").onclick = async () => { pvWrite(null); await signOut(auth); location.reload(); };
  bindPv(q);
  if (staff) { q("#ce").onclick = exportJSON; q("#cc").onclick = exportCSV; }
  if (!cashier) return;
  // Nastavení pokladny se otevírá z views/cash-settings.js (napojeno v main.js)
  q("#ccs").onclick = () => { close(); if (HK.openCash) HK.openCash(); };
  q("#cdb").onclick = async () => {
    try { const n = await rebuildDebtors(); if (n != null) say("Dlužníci přepočítáni (" + n + " s nezaplaceným předpisem)"); }
    catch (e) { say("Přepočet se nepovedl: " + errTxt(e) + " – je publikováno firestore.rules?"); }
  };
  renderMembers(el);
  // Výběr hráčky se ukáže jen u role Hráčka; člen týmu je volitelný u každé role (hráčka může být i členem týmu)
  q("#cmr").onchange = () => { q("#cmp").style.display = q("#cmr").value === "hracka" ? "" : "none"; };
  q("#cma").onclick = async () => {
    const em = q("#cme").value.trim().toLowerCase(), rl = q("#cmr").value, pp = q("#cmp").value, tt = q("#cmt").value, cc = q("#cmc").value === "1";
    if (!/^\S+@\S+\.\S+$/.test(em)) return say("Zadej platný e-mail");
    if (rl === "hracka" && !pp) return say("Vyber hráčku");
    // Pokladník bez role trenér: jen role Hráčka a ne vlastní účet (pravidla databáze by zápis odmítla)
    if (!coach && (rl !== "hracka" || em === user.email.toLowerCase())) return say("Pokladník spravuje jen jiné členy s rolí Hráčka");
    if (blocked()) return;
    const d = {role: rl, addedBy: user.email};
    if (rl === "hracka") d.pid = pp;
    if (tt) d.tid = tt;
    if (cc) d.cash = true;
    try { await setDoc(fsDoc(fs, "members", em), d); q("#cme").value = ""; q("#cmp").value = ""; q("#cmt").value = ""; q("#cmc").value = ""; renderMembers(el); }
    catch (e) { say("Nepovedlo se: " + errTxt(e)); }
  };
  if (!coach) return;
  q("#cf").onchange = () => {
    const f = q("#cf").files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { pendingImport = JSON.parse(r.result); const d = pendingImport.data || {}; q("#ci").textContent = "Načteno: " + COLL.map(c => c + " " + Object.keys(d[c] || {}).length).join(", ") + " (audit se neobnovuje)"; }
      catch (e) { pendingImport = null; q("#ci").textContent = "Soubor nelze přečíst."; }
    };
    r.readAsText(f);
  };
  q("#cm").onclick = async () => {
    if (!pendingImport) return say("Nejdřív vyber soubor.");
    try { await importData(pendingImport, false); say("Data sloučena"); close(); } catch (e) { say(errTxt(e)); }
  };
  let armed = false;
  q("#cr").onclick = async () => {
    if (!pendingImport) return say("Nejdřív vyber soubor.");
    if (!armed) { armed = true; q("#cr").textContent = "Opravdu nahradit? Klepni znovu"; return; }
    try { await importData(pendingImport, true); say("Data nahrazena"); close(); } catch (e) { say(errTxt(e)); }
  };
}
// Popis brány verze v ⚙️: požadované minimum, kdo ho nastavil, a zda tato verze stačí
function verInfo() {
  const a = data.settings[APP_DOC] || {}, m = a.minVer;
  if (!m) return "<br>Minimální verze není nastavená (zapisovat smí každá verze).";
  return "<br>Minimální verze: <b>v" + esc(m) + "</b>" + (a.minAt ? " (" + esc(String(a.minAt).slice(0, 10)) + (a.minBy ? ", " + esc(a.minBy) : "") + ")" : "") + (outdated() ? " – <b>tato verze je starší, zápis je zablokovaný.</b>" : ".");
}
// ===== Kontrola dat: pole ex u hráček =====
// Náhled převodu (kolik hráček nemá pole ex a co dostanou); bez nálezu jen potvrzení, že je vše v pořádku
function exFixHtml() {
  const plan = exFixPlan(data.players);
  if (!plan.length) return `<h3>Kontrola dat</h3><div class="mu" style="margin-bottom:8px">✅ Všechny hráčky mají pole <b>ex</b> (osvobozená ano / ne).</div>`;
  const list = plan.map(x => esc(x.name) + " → " + (x.ex ? "osvobozená, koeficient 100 %" : "neosvobozená")).join("<br>");
  return `<h3>Kontrola dat</h3><div class="mu" style="margin-bottom:8px">Pole <b>ex</b> chybí u ${plan.length} hráček. Doplnění nic nemění na platbách (stejný význam jako dosud) – je nutné před odstraněním starého tvaru dat:<br>${list}</div><button class="s w" id="cex">Doplnit pole ex (${plan.length})</button>`;
}
// Doplnění pole ex (jen trenér): potvrzení druhým klepnutím, před zápisem se stáhne záloha; lze spustit znovu (doplní jen chybějící)
async function runExFix(btn, close) {
  if (!btn.dataset.armed) { btn.dataset.armed = "1"; btn.textContent = "Opravdu doplnit? Nejdřív se stáhne záloha – klepni znovu"; return; }
  if (blocked()) return;
  const plan = exFixPlan(data.players);
  if (!plan.length) { say("Není co doplnit"); close(); return; }
  exportJSON();
  try { await commitOps(plan.map(x => ["set", "players", x.id, x.doc])); say("Pole ex doplněno u " + plan.length + " hráček"); close(); }
  catch (e) { say("Doplnění se nepovedlo: " + errTxt(e)); }
}
// Trenér zvýší minimální verzi na tuto (potvrzení druhým klepnutím). Starší klienti pak nezapisují, dokud nenačtou novou verzi.
async function raiseMinVer(btn, close) {
  if (!btn.dataset.armed) { btn.dataset.armed = "1"; btn.textContent = "Opravdu? Starší verze přestanou zapisovat – klepni znovu"; return; }
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
// Záloha obsahuje jen kolekce, které se v tomto zařízení načetly (kustod tak nezálohuje prázdné předpisy, které by „Nahradit vším“ smazalo)
function exportJSON() {
  const out = {};
  COLL.forEach(c => { if (first[c]) out[c] = data[c]; });
  downloadFile("hokej-zaloha-" + stamp() + ".json", JSON.stringify({app: "hokej-zapasy", version: 1, exported: new Date().toISOString(), data: out}, null, 1), "application/json");
}
function exportCSV() {
  // Koeficient se exportuje v procentech, osvobozená jako ano / prázdné
  const rows = [["Přezdívka", "Číslo", "Pozice", "Alternativní pozice", "Stav", "Skupina plateb", "Osvobozená", "Koeficient (%)", "Poznámka k platbám"], ...Object.values(data.players).map(p => [p.name, p.num, p.pos, p.alt, p.st || "act", p.grp || "monthly", exOf(p) ? "ano" : "", String(Math.round(fxOf(p) * 1000) / 10).replace(".", ","), p.note || ""])];
  downloadFile("soupiska-" + stamp() + ".csv", csv(rows), "text/csv");
}
// Zápis po dávkách (limit Firestore je 500 operací); vyžaduje připojení k internetu
async function commitOps(ops) {
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(fs);
    ops.slice(i, i + 400).forEach(([t, c, id, d]) => { if (t === "set") b.set(fsDoc(fs, c, id), clone(d)); else b.delete(fsDoc(fs, c, id)); });
    await b.commit();
  }
}
// Při „Nahradit vším“ se mažou jen kolekce, které záloha obsahuje (stará záloha bez událostí, docházky, týmu a pokladny je nesmaže).
// Kolekce audit se přeskakuje: pravidla databáze dovolují jen přidávání, jiný zápis by shodil celou dávku.
// Kolekce payments (staré platby) se z dřívějších záloh neobnovuje – už se nepoužívá.
// Brána verze settings/app se ze zálohy neobnovuje ani nemaže (stará záloha nesmí snížit požadovanou verzi; pravidla mazání nedovolí).
// Účty týmu v settings/cash (iban, iban2 a záznam o jejich změně) se ze zálohy neobnovují – zůstávají aktuální; měnit je jde jen
// návrhem a potvrzením (vynucují pravidla databáze), jinak by obnova staré zálohy shodila celou dávku nebo podvrhla účet.
const ACC_KEYS = ["iban", "iban2", "ibanBy", "ibanOk", "ibanAt", "ibanPend"];
function keepAcc(d) { const o = clone(d), cur = data.settings.cash || {}; ACC_KEYS.forEach(k => { if (cur[k] != null) o[k] = clone(cur[k]); else delete o[k]; }); return o; }
async function importData(obj, replace) {
  if (!obj || obj.app !== "hokej-zapasy" || !obj.data) throw new Error("Soubor není záloha aplikace " + APP_NAME + ".");
  if (outdated()) throw new Error(OLD_MSG);
  if (ro()) throw new Error(RO_MSG);
  const ops = [];
  COLL.forEach(c => {
    if (c === "audit") return;
    const src = obj.data[c] || {};
    if (replace && obj.data[c]) Object.keys(data[c]).forEach(id => { if (!(id in src) && !(c === "settings" && (id === "cash" || id === APP_DOC))) ops.push(["del", c, id]); });
    Object.entries(src).forEach(([id, d]) => { if (c === "settings" && id === APP_DOC) return; ops.push(["set", c, id, c === "settings" && id === "cash" ? keepAcc(d) : d]); });
  });
  // Předpisy po obnově (pro přepočet souhrnu dlužníků): nahrazení = jen ze zálohy, sloučení = stávající + ze zálohy
  const chSrc = obj.data.charges, chNew = chSrc ? Object.entries(replace ? chSrc : {...data.charges, ...chSrc}).map(([id, d]) => ({id, ...d})) : null;
  await commitOps(ops);
  // Souhrn dlužníků se ze zálohy neobnovuje, ale přepočítá; chyba (např. nepublikovaná pravidla) obnovu nezruší
  if (chNew && isCash()) { try { await rebuildDebtors(chNew); } catch (e) { say("Data obnovena, ale souhrn dlužníků se nepřepočítal: " + errTxt(e)); } }
}
// ===== Exporty a spuštění =====
document.getElementById("gear").onclick = () => { if (isReady) openCfg(); };
export const HK = {version: VERSION, refresh, outdated, ready: () => readyP || (readyP = boot()), importData, exportJSON, exportCSV, canDelete, can, pid: () => pid, tid: () => tid, user: () => user, openCash: null,
  // Náhled role: preview() = null nebo {label, write}; ro() = jen ke čtení; blocked() = strážce zápisu s hláškou
  preview: () => pv ? {label: pvLabel(), write: pv.write} : null, ro, blocked, endPreview};
window.HK = HK;
if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
