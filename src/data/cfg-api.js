// Rozhraní okna ⚙️ nad datovou vrstvou (HK.cfg; vykreslení je ve views/settings-view.js): přihlášený účet, náhled role,
// členové týmu (přidání, změna, odebrání – ochrana posledního managera, pokladník jen hráčky a ne vlastní účet), brána verze
// (od v22.9 s doplněním data události do docházky) a matice práv settings/perm (zapisuje jen manager). Kontroly rolí jsou tady a ve storage.js; stav účtu dostává přes kontext C.

// ===== Importy =====
import {KIND_OLD} from "../config/constants.js";
import {APP_VERSION, canRaise, cmpVer} from "../core/app-version.js";
import {ATT_D_VER, attDateFix} from "../domain/data-window.js";
import {isGuest} from "../domain/guests.js";
import {JOIN_COLL, openJoins} from "../domain/join-requests.js";
import {ROLE_KEYS, ROLE_VER, keepsManager, permDoc, roleLabel} from "../domain/permissions.js";
import {signOut} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {collection as fsCol, deleteDoc, doc as fsDoc, getDocs, setDoc} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ===== Hlavní logika =====
// C = kontext ze storage.js: data, konstanty kolekcí a rolí, stav účtu jako funkce (user(), role(), pid(), tid(), cash(), stored(), pv(), real(), fs(), auth())
// a pomůcky (can, isStaff, blocked, say, errTxt, náhled role, brána verze, matice práv). Vrací funkce pro HK.cfg.
export function cfgApi(C) {
  const {data, ROLES, PID_ROLES, STAFF, COLL, FETCH, APP_DOC, PERM_DOC, can, isStaff, blocked, say, errTxt, pvLabel, pvWrite, startPreview, outdated, minVer, permRaw, perms} = C;
  let memCache = [];                     // poslední načtený seznam members (ochrana posledního managera)
  // Datová vrstva jen poskytuje údaje a zápisy (účet, členové, náhled role, záloha, kontrola dat, brána verze);
  // kontroly rolí a jejich popisky zůstávají tady, okno se ptá přes HK.cfg a HK.can.
  const meEmail = () => (C.user() ? C.user().email.toLowerCase() : "");
  // Přihlášený účet pro záhlaví ⚙️: e-mail, popis role, náhled, pokladník, propojená hráčka / člen týmu
  const acct = () => ({email: C.user() ? C.user().email : "", label: C.pv() ? ROLES[C.role()] || C.role() || "?" : roleLabel(C.stored().role), preview: !!C.pv(), cash: C.cash() && C.role() !== "manager",
    player: C.pid() && data.players[C.pid()] ? data.players[C.pid()].name : "", staff: isStaff() && C.tid() && data.staff[C.tid()] ? data.staff[C.tid()].name || "" : ""});
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
  async function memberDocs() { const s = await getDocs(fsCol(C.fs(), "members")); return Object.fromEntries(s.docs.map(d => [d.id, d.data()])); }
  function rowsOf(docs) {
    memCache = Object.entries(docs).map(([email, d]) => ({email, role: d.role, rv: d.rv || null, pid: d.pid, tid: d.tid, cash: d.cash === true})).sort((a, b) => a.email.localeCompare(b.email));
    return memCache;
  }
  // Popis propojení pro seznam členů (neplatná role dostane poznámku „bez přístupu“)
  const memberInfo = r => {
    const p = r.pid && data.players[r.pid], t = r.tid && data.staff[r.tid];
    return {label: roleLabel(r.role), player: PID_ROLES.includes(r.role) || r.pid ? (p ? (p.num ? "#" + p.num + " " : "") + p.name : null) : undefined, staff: r.tid ? (t ? t.name || "" : null) : undefined};
  };
  // Odebrat smí: nikdy vlastní účet ani posledního managera; pokladník (bez role manager) jen členy s rolí Hráčka
  const canRemove = r => r.email !== meEmail() && (can("admin") || r.role === "hracka") && keepsManager(memCache, r.email, null);
  // Odebrání člena: seznam se načte znovu (mezitím se mohl změnit), posledního managera nejde odebrat
  async function removeMember(em) {
    if (blocked()) return false;
    try {
      if (!keepsManager(await memberRows(), em, null)) { say("Posledního managera nejde odebrat"); return false; }
      await deleteDoc(fsDoc(C.fs(), "members", em)); return true;
    } catch (e) { say("Nepovedlo se: " + errTxt(e)); return false; }
  }
  // Přidání / změna člena: kontrola, pak zápis members/{e-mail}. Vrací true po uložení.
  async function saveMember(em, rl, pp, tt, cc) {
    em = String(em || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(em)) { say("Zadej platný e-mail"); return false; }
    if (!ROLE_KEYS.includes(rl)) { say("Vyber roli"); return false; }
    if (needsPid(rl) && pidRoleErr(rl, pp)) { say(pidRoleErr(rl, pp)); return false; }
    // Manager / trenér / asistent smí být volitelně zároveň hráčkou (ne hostující) – přihlašuje se pak na události jako hráčka
    if (pp && STAFF.includes(rl) && pidRoleErr("hracka", pp)) { say(pidRoleErr("hracka", pp)); return false; }
    // Pokladník bez role manager: jen role Hráčka a ne vlastní účet (pravidla databáze by zápis odmítla)
    if (!can("admin") && (rl !== "hracka" || em === meEmail())) { say("Pokladník spravuje jen jiné členy s rolí Hráčka"); return false; }
    if (blocked()) return false;
    // Nová role zapisuje rv (verze rolí ROLE_VER); pokladník jen u rolí, které ho nemají vždy (manager je správce pokladny vždy)
    const d = {role: rl, rv: ROLE_VER, addedBy: C.user().email};
    if (needsPid(rl) || (pp && STAFF.includes(rl))) d.pid = pp;
    if (tt && staffOk(rl)) d.tid = tt;
    if (cc && cashOk(rl)) d.cash = true;
    try {
      if (can("admin") && !keepsManager(await memberRows(), em, rl)) { say("Aspoň jeden člen musí zůstat Manager"); return false; }
      await setDoc(fsDoc(C.fs(), "members", em), d); return true;
    } catch (e) { say("Nepovedlo se: " + errTxt(e)); return false; }
  }
  // Náhled role pro ⚙️: popis běžícího náhledu a skutečné role účtu, nebo null
  const pvInfo = () => C.pv() ? {label: pvLabel(), real: ROLES[C.real().role] || C.real().role} : null;
  // Spuštění náhledu z formuláře ⚙️: kontrola výběru a uložení volby; vrací text chyby, nebo null
  function runPreview(r, p, t, c, w) {
    const pid_ = needsPid(r);
    if (pid_ && !p) return "Vyber hráčku";
    if (pid_ && pidRoleErr(r, p)) return pidRoleErr(r, p);
    startPreview({role: r, pid: pid_ ? p : null, tid: staffOk(r) ? t || null : null, cash: cashOk(r) && c, write: !!w});
    return null;
  }
  const logout = async () => { pvWrite(null); await signOut(C.auth()); location.reload(); };
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
    try { await setDoc(fsDoc(C.fs(), "settings", PERM_DOC), permDoc(roles, meEmail(), new Date().toISOString())); return true; }
    catch (e) { say("Nepovedlo se: " + errTxt(e) + " – je publikováno firestore.rules?"); return false; }
  }
  // Manager zvýší minimální verzi na tuto (po potvrzení druhým klepnutím). Starší klienti pak nezapisují, dokud nenačtou novou verzi.
  async function raiseMinVer(close) {
    if (blocked()) return;
    try {
      // 📉 Od ATT_D_VER zapnou aplikace okno docházky: nejdřív doplnit datum události d do všech dokumentů docházky (idempotentní)
      if (cmpVer(APP_VERSION, ATT_D_VER) >= 0) {
        const fix = attDateFix(data.attendance, data.events, data.matches);
        if (fix.length) { await C.commitOps(fix.map(([id, d]) => ["merge", "attendance", id, {d}])); say("Datum události doplněno do docházky: " + fix.length + "×"); }
      }
      await setDoc(fsDoc(C.fs(), "settings", APP_DOC), {minVer: APP_VERSION, minBy: C.user().email.toLowerCase(), minAt: new Date().toISOString()}, {merge: true}); say("Minimální verze nastavena na v" + APP_VERSION); close();
    } catch (e) { say("Nepovedlo se: " + errTxt(e) + " – je publikováno firestore.rules?"); }
  }
  return {acct, pvInfo, runPreview, logout, PV_ROLES, memberRoles, needsPid, cashOk, staffOk, pidRoleOf, pidRoleErr, playerList, staffList,
    joinCount, memberRows, memberInfo, canRemove, removeMember, saveMember, backupCounts, gateInfo, raiseMinVer, permState, savePerms};
}
