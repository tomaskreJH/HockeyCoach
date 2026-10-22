/* Datová vrstva: Firebase (Firestore + přihlášení přes Google).
   Rozhraní `db` zůstává stejné jako dřív (collection/doc, set, add, delete, onSnapshot) a přibyl batch() pro atomické zápisy
   (úhrada = příjem do pokladny + předpis; uzavření vyúčtování = evcash + událost + předpisy + audit), merge pro částečné změny dokumentu
   a collection(c).where(pole, hodnota) pro členy, kteří smí číst jen své předpisy. Struktura: Importy -> Konstanty a stav
   -> Pomocné funkce -> Data (poslech, zápis, kontrola mazání) -> Přihlášení a role -> Okno nastavení -> Zálohy -> Exporty.
   Migrace z v16.3 (payments -> charges) a přesun dat pokladny do evcash (v17.2) jsou hotové a z kódu odstraněné (v17.3). */

// ===== Importy =====
import {downloadFile, esc, toast} from "../core/utils.js";
import {exOf, fxOf} from "../domain/cash.js";
import {FIREBASE_CONFIG} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {GoogleAuthProvider, getAuth, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {collection as fsCol, deleteDoc, deleteField, doc as fsDoc, getDoc, getDocs, initializeFirestore, onSnapshot, persistentLocalCache, persistentMultipleTabManager, query, setDoc, where, writeBatch} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ===== Konstanty a stav =====
const VERSION = "v18.0 · 22. 10. 2026";
{ const v = document.getElementById("ver"); if (v) v.textContent = VERSION; }
// kolekce aplikace (events = tréninky, attendance = docházka, staff = realizační tým,
// charges = předpisy (události i měsíční příspěvky), cash = pokladna (příjmy, výdaje, platy), audit = záznamy o uzavření, znovuotevření,
// výjimkách, stornech, příspěvcích a platech, evcash = náklady a vyúčtování událostí (jen správci pokladny; v dokumentu události je jen příznak ss))
const COLL = ["players", "matches", "opponents", "settings", "events", "attendance", "staff", "charges", "cash", "audit", "evcash"];
const ROLES = {trener: "Trenér", kustod: "Kustod", hracka: "Hráčka"};   // role v members/{email}
const STAFF = ["trener", "kustod"];                                     // role s plným přístupem do aplikace

// pid = hráčka propojená s účtem, tid = člen realizačního týmu propojený s účtem, cash = pokladník (příznak navíc k roli)
let fs = null, auth = null, user = null, role = null, pid = null, tid = null, cash = false, isReady = false, readyP = null;
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
const isStaff = () => STAFF.includes(role);
const isCash = () => role === "trener" || cash === true;       // správce pokladny: trenér nebo pokladník
const configOk = () => !!FIREBASE_CONFIG.apiKey && !/^VLOZ/.test(FIREBASE_CONFIG.apiKey) && !!FIREBASE_CONFIG.projectId && !/^VLOZ/.test(FIREBASE_CONFIG.projectId);
const splitPath = p => { const i = p.indexOf("/"); return [p.slice(0, i), p.slice(i + 1)]; };

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
function writeDoc(c, id, d) { setDoc(fsDoc(fs, c, id), clone(d)).catch(e => say("Uložení se nepovedlo: " + errTxt(e))); }
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
  if (!canDelete(c, id)) return;
  // S událostí se smažou její předpisy bez úhrady (předpisy se zaplacenou částí zůstávají jako historie)
  if (c === "matches" || c === "events") Object.entries(data.charges).filter(([, x]) => x.eid === id && !(+x.paid > 0)).forEach(([cid]) => removeDoc("charges", cid));
  // Vyúčtování události (evcash) se maže spolu s ní
  if ((c === "matches" || c === "events") && isCash() && data.evcash[id]) deleteDoc(fsDoc(fs, "evcash", id)).catch(() => {});
  deleteDoc(fsDoc(fs, c, id)).catch(e => say("Smazání se nepovedlo: " + errTxt(e)));
}
// Dávka zápisů (atomicky): b.set("kolekce/id", data).delete("kolekce/id").commit()
function makeBatch() {
  const b = writeBatch(fs), api = {
    set: (p, d) => { const [c, id] = splitPath(p); b.set(fsDoc(fs, c, id), clone(d)); return api; },
    // Částečná změna dokumentu; hodnota "__del" smaže pole
    merge: (p, d) => { const [c, id] = splitPath(p), o = {}; Object.entries(d).forEach(([k, v]) => { o[k] = v === "__del" ? deleteField() : clone({v}).v; }); b.set(fsDoc(fs, c, id), o, {merge: true}); return api; },
    delete: p => { const [c, id] = splitPath(p); b.delete(fsDoc(fs, c, id)); return api; },
    commit: () => b.commit().catch(e => say("Uložení se nepovedlo: " + errTxt(e)))
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
    role = r.role; pid = r.pid; tid = r.tid; cash = r.cash;
    // Trenér a kustod vstupují vždy; hráčka jen tehdy, když ji trenér propojil s hráčkou v soupisce
    if (STAFF.includes(role) || (role === "hracka" && pid)) break;
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
async function renderMembers(el) {
  const box = el.querySelector("#cmb"), coach = role === "trener";
  box.textContent = "Načítám…";
  try {
    const s = await getDocs(fsCol(fs, "members"));
    const rows = s.docs.map(d => ({email: d.id, role: d.data().role, pid: d.data().pid, tid: d.data().tid, cash: d.data().cash === true})).sort((a, b) => a.email.localeCompare(b.email));
    box.innerHTML = rows.map(r => {
      const p = r.pid && data.players[r.pid], t = r.tid && data.staff[r.tid];
      const who = (r.role === "hracka" ? (p ? " · " + esc((p.num ? "#" + p.num + " " : "") + p.name) : " · ⚠️ bez hráčky") : "") + (r.tid ? (t ? " · 🎓 " + esc(t.name) : " · ⚠️ člen týmu neexistuje") : "") + (r.cash ? " · 💰 pokladník" : "");
      const canDel = r.email !== user.email.toLowerCase() && (coach || r.role !== "trener");
      return `<div class="it" style="cursor:default"><div><b>${esc(r.email)}</b><div class="mu">${esc(ROLES[r.role] || r.role || "?")}${who}</div></div>${canDel ? `<button class="d" data-md="${esc(r.email)}" style="padding:8px 12px">Odebrat</button>` : ""}</div>`;
    }).join("") || "–";
    box.querySelectorAll("[data-md]").forEach(b => { b.onclick = async () => {
      if (!confirm("Odebrat přístup: " + b.dataset.md + "?")) return;
      try { await deleteDoc(fsDoc(fs, "members", b.dataset.md)); renderMembers(el); } catch (e) { say("Nepovedlo se: " + errTxt(e)); }
    }; });
  } catch (e) { box.textContent = "Nelze načíst: " + errTxt(e); }
}
function openCfg() {
  const el = document.getElementById("cfg"), coach = role === "trener", cashier = isCash(), staff = isStaff(), q = s => el.querySelector(s), close = () => { el.innerHTML = ""; };
  pendingImport = null;
  el.innerHTML = `<div class="md" id="cbg"><div class="mb"><h2>⚙️ Účet a data</h2>
 <h3>Přihlášený účet</h3><div class="mu" style="margin-bottom:8px"><b>${esc(user.email)}</b> · ${esc(ROLES[role] || role)}${cash && role !== "trener" ? " · 💰 pokladník" : ""}${role === "hracka" && data.players[pid] ? " · " + esc(data.players[pid].name) : ""}${staff && tid && data.staff[tid] ? " · 🎓 " + esc(data.staff[tid].name) : ""}<br>${navigator.onLine ? "Online – změny se ukládají do databáze." : "Offline – změny se uloží v zařízení a odešlou po připojení."}</div><button class="s w" id="clo">Odhlásit</button>
 ${cashier ? `<h3>Pokladna</h3><button class="s w" id="ccs">💰 Nastavení pokladny (IBAN, šablony, kategorie)</button>` : ""}
 ${cashier ? `<h3>Členové týmu</h3><div class="mu" style="margin-bottom:8px">Přístup mají jen zapsané e-maily (přesně tak, jak je používá Google účet). U role Hráčka vyber hráčku, za kterou se bude zapisovat docházka. Volitelně vyber člena realizačního týmu (Team → Realizační tým) a příznak Pokladník. Stejný e-mail znovu = změna nastavení.${coach ? "" : " Členy s rolí Trenér spravuje jen trenér."}</div><div id="cmb" style="margin-bottom:8px"></div><input id="cme" type="email" placeholder="e-mail@gmail.com"><select id="cmr">${coach ? '<option value="trener">Trenér</option>' : ""}<option value="kustod" selected>Kustod</option><option value="hracka">Hráčka</option></select><select id="cmp" style="display:none"><option value="">— vyber hráčku —</option>${playerOpts()}</select><select id="cmt"><option value="">— člen realizačního týmu (volitelné) —</option>${staffOpts()}</select><select id="cmc"><option value="">Bez práv pokladníka</option><option value="1">Pokladník</option></select><button class="p w" id="cma">Přidat člena</button>` : ""}
 ${staff ? `<h3>Záloha dat</h3><div class="row"><button class="s" id="ce">Stáhnout zálohu (JSON)</button><button class="s" id="cc">Soupiska (CSV)</button></div>` : ""}
 ${coach ? `<h3>Obnovit ze zálohy</h3><input type="file" id="cf" accept=".json,application/json"><div class="mu" id="ci" style="margin-bottom:8px"></div><div class="row"><button class="s" id="cm">Sloučit s daty</button><button class="d" id="cr">Nahradit vším</button></div>` : ""}
 <h3>Verze aplikace</h3><div class="mu" style="margin-bottom:8px">Používáš: <b>${VERSION}</b>. Pokud po nahrání nové verze vidíš starou, načti ji tlačítkem níže.</div><button class="s w" id="cu2">Načíst novou verzi</button>
 <button class="s w" id="cz" style="margin-top:14px">Zavřít</button></div></div>`;
  q("#cu2").onclick = refresh; q("#cz").onclick = close; q("#cbg").onclick = e => { if (e.target.id === "cbg") close(); };
  q("#clo").onclick = async () => { await signOut(auth); location.reload(); };
  if (staff) { q("#ce").onclick = exportJSON; q("#cc").onclick = exportCSV; }
  if (!cashier) return;
  // Nastavení pokladny se otevírá z views/cash-settings.js (napojeno v main.js)
  q("#ccs").onclick = () => { close(); if (HK.openCash) HK.openCash(); };
  renderMembers(el);
  // Výběr hráčky se ukáže jen u role Hráčka; člen týmu je volitelný u každé role (hráčka může být i členem týmu)
  q("#cmr").onchange = () => { q("#cmp").style.display = q("#cmr").value === "hracka" ? "" : "none"; };
  q("#cma").onclick = async () => {
    const em = q("#cme").value.trim().toLowerCase(), rl = q("#cmr").value, pp = q("#cmp").value, tt = q("#cmt").value, cc = q("#cmc").value === "1";
    if (!/^\S+@\S+\.\S+$/.test(em)) return say("Zadej platný e-mail");
    if (rl === "hracka" && !pp) return say("Vyber hráčku");
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
  const q = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  // Koeficient se exportuje v procentech, osvobozená jako ano / prázdné
  const rows = [["Přezdívka", "Číslo", "Pozice", "Alternativní pozice", "Stav", "Skupina plateb", "Osvobozená", "Koeficient (%)", "Poznámka k platbám"], ...Object.values(data.players).map(p => [p.name, p.num, p.pos, p.alt, p.st || "act", p.grp || "monthly", exOf(p) ? "ano" : "", String(Math.round(fxOf(p) * 1000) / 10).replace(".", ","), p.note || ""])];
  downloadFile("soupiska-" + stamp() + ".csv", "\ufeff" + rows.map(r => r.map(q).join(";")).join("\r\n"), "text/csv");
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
// Kolekce payments (staré platby do v16.3) se z dřívějších záloh neobnovuje – už se nepoužívá.
async function importData(obj, replace) {
  if (!obj || obj.app !== "hokej-zapasy" || !obj.data) throw new Error("Soubor není záloha aplikace Hokej – zápasy.");
  const ops = [];
  COLL.forEach(c => {
    if (c === "audit") return;
    const src = obj.data[c] || {};
    if (replace && obj.data[c]) Object.keys(data[c]).forEach(id => { if (!(id in src)) ops.push(["del", c, id]); });
    Object.entries(src).forEach(([id, d]) => ops.push(["set", c, id, d]));
  });
  await commitOps(ops);
}
// ===== Exporty a spuštění =====
document.getElementById("gear").onclick = () => { if (isReady) openCfg(); };
export const HK = {version: VERSION, refresh, ready: () => readyP || (readyP = boot()), importData, exportJSON, exportCSV, canDelete, role: () => role, pid: () => pid, tid: () => tid, isStaff, isCash, user: () => user, openCash: null};
window.HK = HK;
if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register("sw.js").catch(() => {});
