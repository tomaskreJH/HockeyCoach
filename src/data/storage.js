/* Datová vrstva: Firebase (Firestore + přihlášení přes Google).
   Rozhraní `db` zůstává stejné jako dřív (collection/doc, set, add, delete, onSnapshot),
   takže zbytek aplikace se nemění. Struktura: Importy -> Konstanty a stav -> Pomocné funkce
   -> Data (poslech, zápis) -> Přihlášení a role -> Okno nastavení -> Zálohy -> Exporty. */

// ===== Importy =====
import {downloadFile, esc, toast} from "../core/utils.js";
import {FIREBASE_CONFIG} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {GoogleAuthProvider, getAuth, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {collection as fsCol, deleteDoc, doc as fsDoc, getDoc, getDocs, initializeFirestore, onSnapshot, persistentLocalCache, persistentMultipleTabManager, setDoc, writeBatch} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ===== Konstanty a stav =====
const VERSION = "v15.6 · 17. 10. 2026";
{ const v = document.getElementById("ver"); if (v) v.textContent = VERSION; }
const COLL = ["players", "matches", "opponents", "settings"];           // kolekce aplikace
const ROLES = {trener: "Trenér", kustod: "Kustod", hracka: "Hráčka"};   // role v members/{email}
const STAFF = ["trener", "kustod"];                                     // role s přístupem do aplikace

let fs = null, auth = null, user = null, role = null, isReady = false, readyP = null;
const data = {};                       // zrcadlo dat pro export a zálohy
const subs = {};                       // odběratelé změn podle kolekce
const first = {};                      // už dorazil první snapshot kolekce?
const listening = new Set();           // kolekce, které se právě poslouchají
COLL.forEach(c => { data[c] = {}; subs[c] = []; });

// ===== Pomocné funkce =====
const clone = o => JSON.parse(JSON.stringify(o));
const stamp = () => new Date().toISOString().slice(0, 10);
const say = m => toast(m);
const errTxt = e => (e && (e.code || e.message)) || String(e);
const configOk = () => !!FIREBASE_CONFIG.apiKey && !/^VLOZ/.test(FIREBASE_CONFIG.apiKey) && !!FIREBASE_CONFIG.projectId && !/^VLOZ/.test(FIREBASE_CONFIG.projectId);

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
const view = c => ({docs: Object.entries(data[c]).map(([id, d]) => ({id, data: () => clone(d)}))});
function fire(c) { subs[c].forEach(s => { try { s.cb(view(c)); } catch (e) { console.error(e); } }); }
function subscribe(c, cb, er) {
  subs[c].push({cb, er});
  listen(c);
  if (first[c]) setTimeout(() => cb(view(c)), 0);
}
// Zápis se projeví lokálně hned (i offline), na server odejde po připojení; chyba (např. práva) se zobrazí hláškou
function writeDoc(c, id, d) { setDoc(fsDoc(fs, c, id), clone(d)).catch(e => say("Uložení se nepovedlo: " + errTxt(e))); }
function removeDoc(c, id) { deleteDoc(fsDoc(fs, c, id)).catch(e => say("Smazání se nepovedlo: " + errTxt(e))); }

const db = {
  collection: c => ({
    onSnapshot: (cb, er) => subscribe(c, cb, er),
    add: async d => { const id = fsDoc(fsCol(fs, c)).id; writeDoc(c, id, d); return {id}; }
  }),
  doc: p => {
    const i = p.indexOf("/"), c = p.slice(0, i), id = p.slice(i + 1);
    return {
      set: async d => { writeDoc(c, id, d); },
      delete: async () => { removeDoc(c, id); },
      onSnapshot: (cb, er) => subscribe(c, () => { const d = data[c][id]; cb({exists: !!d, data: () => d ? clone(d) : undefined}); }, er)
    };
  }
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
// Role z dokumentu members/{email} (e-mail malými písmeny)
async function checkRole() {
  try { const s = await getDoc(fsDoc(fs, "members", user.email.toLowerCase())); return {role: s.exists() ? (s.data().role || null) : null}; }
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
      await screen("🏒 Hokej – zápasy", "Přihlas se účtem Google, který má trenér zapsaný mezi členy týmu.", [["login", "Přihlásit přes Google", "p"]]);
      user = await doLogin();
      continue;
    }
    const r = await checkRole();
    if (r.err) {
      const g = await screen("Nelze ověřit oprávnění", "Zkontroluj připojení k internetu. (" + esc(errTxt(r.err)) + ")", [["retry", "Zkusit znovu", "p"], ["out", "Odhlásit"]]);
      if (g === "out") { await signOut(auth); user = null; }
      continue;
    }
    role = r.role;
    if (STAFF.includes(role)) break;
    const msg = role === "hracka" ? "Přístup hráček se zpřístupní s modulem docházky a tréninků." : "Účet <b>" + esc(user.email) + "</b> nemá přístup. Požádej trenéra, ať ti ho přidá.";
    await screen("Přístup zatím není povolen", msg, [["out", "Odhlásit jiným účtem", "p"]]);
    await signOut(auth); user = null;
  }
  document.getElementById("nav").style.display = "";
  isReady = true;
  return db;
}

// ===== Okno nastavení =====
let pendingImport = null;
async function renderMembers(el) {
  const box = el.querySelector("#cmb");
  box.textContent = "Načítám…";
  try {
    const s = await getDocs(fsCol(fs, "members"));
    const rows = s.docs.map(d => ({email: d.id, role: d.data().role})).sort((a, b) => a.email.localeCompare(b.email));
    box.innerHTML = rows.map(r => `<div class="it" style="cursor:default"><div><b>${esc(r.email)}</b><div class="mu">${esc(ROLES[r.role] || r.role || "?")}</div></div>${r.email === user.email.toLowerCase() ? "" : `<button class="d" data-md="${esc(r.email)}" style="padding:8px 12px">Odebrat</button>`}</div>`).join("") || "–";
    box.querySelectorAll("[data-md]").forEach(b => { b.onclick = async () => {
      if (!confirm("Odebrat přístup: " + b.dataset.md + "?")) return;
      try { await deleteDoc(fsDoc(fs, "members", b.dataset.md)); renderMembers(el); } catch (e) { say("Nepovedlo se: " + errTxt(e)); }
    }; });
  } catch (e) { box.textContent = "Nelze načíst: " + errTxt(e); }
}
function openCfg() {
  const el = document.getElementById("cfg"), coach = role === "trener", q = s => el.querySelector(s), close = () => { el.innerHTML = ""; };
  pendingImport = null;
  el.innerHTML = `<div class="md" id="cbg"><div class="mb"><h2>⚙️ Účet a data</h2>
 <h3>Přihlášený účet</h3><div class="mu" style="margin-bottom:8px"><b>${esc(user.email)}</b> · ${esc(ROLES[role] || role)}<br>${navigator.onLine ? "Online – změny se ukládají do databáze." : "Offline – změny se uloží v zařízení a odešlou po připojení."}</div><button class="s w" id="clo">Odhlásit</button>
 ${coach ? `<h3>Členové týmu</h3><div class="mu" style="margin-bottom:8px">Přístup mají jen zapsané e-maily (přesně tak, jak je používá Google účet).</div><div id="cmb" style="margin-bottom:8px"></div><input id="cme" type="email" placeholder="e-mail@gmail.com"><select id="cmr"><option value="trener">Trenér</option><option value="kustod" selected>Kustod</option><option value="hracka">Hráčka</option></select><button class="p w" id="cma">Přidat člena</button>` : ""}
 <h3>Záloha dat</h3><div class="row"><button class="s" id="ce">Stáhnout zálohu (JSON)</button><button class="s" id="cc">Soupiska (CSV)</button></div>
 ${coach ? `<h3>Obnovit ze zálohy</h3><input type="file" id="cf" accept=".json,application/json"><div class="mu" id="ci" style="margin-bottom:8px"></div><div class="row"><button class="s" id="cm">Sloučit s daty</button><button class="d" id="cr">Nahradit vším</button></div>` : ""}
 <h3>Verze aplikace</h3><div class="mu" style="margin-bottom:8px">Používáš: <b>${VERSION}</b>. Pokud po nahrání nové verze vidíš starou, načti ji tlačítkem níže.</div><button class="s w" id="cu2">Načíst novou verzi</button>
 <button class="s w" id="cz" style="margin-top:14px">Zavřít</button></div></div>`;
  q("#cu2").onclick = refresh; q("#cz").onclick = close; q("#cbg").onclick = e => { if (e.target.id === "cbg") close(); };
  q("#clo").onclick = async () => { await signOut(auth); location.reload(); };
  q("#ce").onclick = exportJSON; q("#cc").onclick = exportCSV;
  if (!coach) return;
  renderMembers(el);
  q("#cma").onclick = async () => {
    const em = q("#cme").value.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(em)) return say("Zadej platný e-mail");
    try { await setDoc(fsDoc(fs, "members", em), {role: q("#cmr").value, addedBy: user.email}); q("#cme").value = ""; renderMembers(el); }
    catch (e) { say("Nepovedlo se: " + errTxt(e)); }
  };
  q("#cf").onchange = () => {
    const f = q("#cf").files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { pendingImport = JSON.parse(r.result); const d = pendingImport.data || {}; q("#ci").textContent = "Načteno: " + COLL.map(c => c + " " + Object.keys(d[c] || {}).length).join(", "); }
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
async function refresh() {
  try {
    const rs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(rs.map(r => r.unregister()));
    const ks = await caches.keys();
    await Promise.all(ks.map(k => caches.delete(k)));
  } catch (e) {}
  location.reload();
}

// ===== Zálohy: export a import =====
function exportJSON() { downloadFile("hokej-zaloha-" + stamp() + ".json", JSON.stringify({app: "hokej-zapasy", version: 1, exported: new Date().toISOString(), data}, null, 1), "application/json"); }
function exportCSV() {
  const q = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const rows = [["Přezdívka", "Číslo", "Pozice", "Alternativní pozice", "Stav"], ...Object.values(data.players).map(p => [p.name, p.num, p.pos, p.alt, p.st || "act"])];
  downloadFile("soupiska-" + stamp() + ".csv", "\ufeff" + rows.map(r => r.map(q).join(";")).join("\r\n"), "text/csv");
}
// Import po dávkách (limit Firestore je 500 operací); vyžaduje připojení k internetu
async function importData(obj, replace) {
  if (!obj || obj.app !== "hokej-zapasy" || !obj.data) throw new Error("Soubor není záloha aplikace Hokej – zápasy.");
  const ops = [];
  COLL.forEach(c => {
    const src = obj.data[c] || {};
    if (replace) Object.keys(data[c]).forEach(id => { if (!(id in src)) ops.push(["del", c, id]); });
    Object.entries(src).forEach(([id, d]) => ops.push(["set", c, id, d]));
  });
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(fs);
    ops.slice(i, i + 400).forEach(([t, c, id, d]) => { if (t === "set") b.set(fsDoc(fs, c, id), clone(d)); else b.delete(fsDoc(fs, c, id)); });
    await b.commit();
  }
}

// ===== Exporty a spuštění =====
document.getElementById("gear").onclick = () => { if (isReady) openCfg(); };
export const HK = {version: VERSION, refresh, ready: () => readyP || (readyP = boot()), importData, exportJSON, exportCSV, role: () => role, user: () => user};
window.HK = HK;
if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});