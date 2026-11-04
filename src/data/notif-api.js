// Datová vrstva 🔔 notifikací: hlavní vypínač týmu (settings/notif), registrace tohoto zařízení (devices) a tichá obnova při spuštění.
// Nic se neposílá odsud – rozesílá Cloud Functions (functions/). Aplikace jen zapíše zařízení; bez zapnutého vypínače nepřijde nic.
// Náklady: 1 zápis při zapnutí zařízení, pak nejvýš 1 zápis týdně (obnova tokenu); vypínač týmu se čte z už otevřeného poslechu settings.
// Struktura: Importy -> Konstanty -> Rozhraní.

// ===== Importy =====
import {IS_BETA} from "../core/channel.js";
import {LS, uid} from "../core/utils.js";
import {DEV_COLL, LS_KEY, NOTIF_DOC, deviceDoc, deviceDocId, globalOf, localOf, needsSync, notifDocOf, pushSupport} from "../domain/notif.js";
import {deleteDoc, doc as fsDoc, serverTimestamp, setDoc} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ===== Konstanty =====
const SDK = "https://www.gstatic.com/firebasejs/10.14.1/";   // stejná verze SDK jako ostatní importy (messaging se načte až při zapnutí)
const defDeps = {
  app: () => import(SDK + "firebase-app.js"),
  msg: () => import(SDK + "firebase-messaging.js"),
  env: () => ({sw: "serviceWorker" in navigator, push: "PushManager" in window, notif: "Notification" in window,
    ios: /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    standalone: navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)}),
  perm: () => (typeof Notification !== "undefined" ? Notification.permission : "denied"),
  ask: () => Notification.requestPermission(),
  reg: () => navigator.serviceWorker.getRegistration(),
  now: () => Date.now()
};

// ===== Rozhraní =====
// C = kontext ze storage.js (data, user(), pid(), tid(), fs(), pv(), blocked(), isDev(), can()); deps jen pro testy
export function notifApi(C, deps) {
  const D = {...defDeps, ...(deps || {})};
  const email = () => (C.user() ? C.user().email.toLowerCase() : "");
  const glob = () => globalOf((C.data.settings || {})[NOTIF_DOC]);
  const local = () => localOf(LS.get(LS_KEY));
  const saveLocal = o => LS.set(LS_KEY, o ? JSON.stringify(o) : "");
  const ch = IS_BETA ? "beta" : "stable";
  // Stav pro sekci v ⚙️
  const info = () => ({global: glob(), local: local(), support: pushSupport(D.env()), perm: D.perm(), edit: C.can("admin") || C.isDev(), preview: !!C.pv()});

  // Hlavní vypínač týmu (manager nebo vývojář): on = true zapne, false = STOP. Klíč VAPID se zachová (merge).
  async function setGlobal(on) {
    if (C.blocked()) return false;
    const d = notifDocOf(on, null, email(), new Date().toISOString().slice(0, 10));
    await setDoc(fsDoc(C.fs(), "settings", NOTIF_DOC), d, {merge: true});
    return true;
  }
  // Veřejný klíč VAPID (jednou, manager nebo vývojář); vrací false při neplatném klíči
  async function setVapid(v) {
    if (C.blocked()) return false;
    const d = notifDocOf(glob().on, v, email(), new Date().toISOString().slice(0, 10));
    if (!d) return false;
    await setDoc(fsDoc(C.fs(), "settings", NOTIF_DOC), d, {merge: true});
    return true;
  }

  // Token tohoto zařízení z FCM (potřebuje klíč VAPID a registrovaný service worker); vyhodí chybu s popisem
  async function token(vapid) {
    const reg = await D.reg();
    if (!reg) throw new Error("Service worker není aktivní – načti aplikaci znovu");
    const app = await D.app(), msg = await D.msg();
    const t = await msg.getToken(msg.getMessaging(app.getApp()), {vapidKey: vapid, serviceWorkerRegistration: reg});
    if (!t) throw new Error("Zařízení nedostalo token");
    return t;
  }
  // Zapíše dokument tohoto zařízení a stav do localStorage
  async function write(code, tok, z, u) {
    const d = {...deviceDoc({tok, email: email(), pid: C.pid(), tid: C.tid(), ch, z, u}), at: serverTimestamp()};
    await setDoc(fsDoc(C.fs(), DEV_COLL, deviceDocId(email(), code)), d);
    saveLocal({on: true, code, z, u, pid: d.pid, tid: d.tid, at: D.now()});
  }

  // Zapnout (nebo změnit volby) na tomto zařízení; volat z klepnutí (prohlížeč jinak odmítne žádost o povolení). Vrací {ok, why}.
  async function enable(z, u) {
    if (C.blocked()) return {ok: false, why: ""};
    const sup = pushSupport(D.env()), g = glob();
    if (!sup.ok) return {ok: false, why: sup.why};
    if (!g.vapid) return {ok: false, why: "Manager ještě nevložil klíč VAPID (⚙️ → 🔔 Notifikace)."};
    if (D.perm() !== "granted" && (await D.ask()) !== "granted") return {ok: false, why: "Notifikace nejsou povolené."};
    const l = local(), code = l.code || uid() + uid();
    await write(code, await token(g.vapid), z, u);
    return {ok: true, why: ""};
  }
  // Vypnout na tomto zařízení: smaže dokument zařízení (funkce mu pak nic neposílají) a zapomene stav
  async function disable() {
    const l = local();
    if (l.code && email()) { try { await deleteDoc(fsDoc(C.fs(), DEV_COLL, deviceDocId(email(), l.code))); } catch (e) { /* offline – dokument smaže další úklid nebo manager */ } }
    saveLocal(null);
  }
  // Tichá obnova při spuštění: nikdy nežádá o povolení; selhání ignoruje (zkusí se při dalším spuštění)
  async function sync() {
    try {
      const l = local(), g = glob();
      if (C.pv() || !email() || !needsSync({local: l, global: g, perm: D.perm(), pid: C.pid() || "", tid: C.tid() || "", now: D.now()})) return false;
      await write(l.code, await token(g.vapid), l.z, l.u);
      return true;
    } catch (e) { return false; }
  }
  // Při odhlášení: smazat zařízení tohoto účtu, ať sdílený telefon nedostává cizí oznámení
  const leave = disable;

  return {info, setGlobal, setVapid, enable, disable, sync, leave};
}
