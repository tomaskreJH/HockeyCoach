// Doména: 🔔 push notifikace – čisté funkce bez DOM a bez Firebase (testuje je tests/notif.test.js).
// Posílání řeší Cloud Functions (functions/, nasazuje se zvlášť); aplikace jen eviduje zařízení (devices) a drží hlavní vypínač settings/notif.
// Fail-safe: chybějící dokument settings/notif = notifikace VYPNUTÉ. STOP = on:false (funkce pak nic nečtou ani neposílají).
// Struktura: Konstanty -> Podpora zařízení -> Dokumenty -> Rozhodování o obnově -> Texty.

// ===== Konstanty =====
export const NOTIF_DOC = "notif";                       // settings/notif = {on, vapid, by, at}
export const DEV_COLL = "devices";                      // devices/{e-mail}__{kód} = jedno zařízení jednoho účtu
export const LS_KEY = "hk-notif";                       // stav tohoto zařízení: {on, code, z, u, pid, tid, at}
export const RENEW_DAYS = 7;                            // token se obnoví nejvýš jednou za tolik dní (1 zápis na zařízení)
export const VAPID_RE = /^[A-Za-z0-9_-]{60,140}$/;      // veřejný klíč VAPID z Firebase konzole (shoduje se s firestore.rules)
const DAY_MS = 86400000;

// ===== Podpora zařízení =====
// env = {sw, push, notif, ios, standalone}: co prohlížeč umí. Vrací {ok, why}; why je text pro uživatele, když push nejde.
// iPhone / iPad: web push funguje jen z aplikace přidané na plochu („Přidat na plochu“) – v obyčejném Safari ne.
export function pushSupport(env) {
  const e = env || {};
  if (e.ios && !e.standalone) return {ok: false, why: "Na iPhonu a iPadu notifikace fungují jen z aplikace přidané na plochu (Sdílet → Přidat na plochu) – otevři ji z ikony na ploše."};
  if (!e.sw || !e.push || !e.notif) return {ok: false, why: "Tento prohlížeč webové notifikace nepodporuje."};
  return {ok: true, why: ""};
}

// ===== Dokumenty =====
// Hlavní vypínač z dokumentu settings/notif (chybí nebo je poškozený → vypnuto)
export function globalOf(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  return {on: r.on === true, vapid: typeof r.vapid === "string" && VAPID_RE.test(r.vapid) ? r.vapid : "", by: typeof r.by === "string" ? r.by : "", at: typeof r.at === "string" ? r.at : ""};
}
// Nový obsah settings/notif; vapid se přidá jen když je zadaný (prázdný řetězec klíč smaže). Vrací null při neplatném klíči.
export function notifDocOf(on, vapid, email, at) {
  const d = {on: on === true, by: String(email || "").toLowerCase(), at: String(at || "")};
  if (vapid != null) {
    const v = String(vapid).trim();
    if (v && !VAPID_RE.test(v)) return null;
    d.vapid = v;
  }
  return d;
}
// Id dokumentu zařízení: e-mail malými písmeny + "__" + náhodný kód (kód je jen z písmen a číslic, nejvýš 30 znaků – hlídá to firestore.rules)
export const deviceDocId = (email, code) => String(email || "").toLowerCase() + "__" + String(code || "").replace(/[^a-z0-9]/gi, "").slice(0, 30);
// Dokument zařízení bez času zápisu (`at` doplní server); prázdné pid a tid jsou "" (ne null), jak to vyžadují pravidla
export function deviceDoc(o) {
  return {tok: String(o.tok || ""), email: String(o.email || "").toLowerCase(), pid: o.pid || "", tid: o.tid || "", ch: o.ch === "beta" ? "beta" : "stable", z: o.z !== false, u: o.u !== false};
}
// Stav tohoto zařízení z localStorage (poškozený zápis → vypnuto)
export function localOf(txt) {
  try {
    const o = JSON.parse(txt || "null");
    if (!o || typeof o !== "object" || o.on !== true || typeof o.code !== "string" || !o.code) return {on: false, code: "", z: true, u: true, pid: "", tid: "", at: 0};
    return {on: true, code: o.code, z: o.z !== false, u: o.u !== false, pid: o.pid || "", tid: o.tid || "", at: +o.at || 0};
  } catch (e) { return {on: false, code: "", z: true, u: true, pid: "", tid: "", at: 0}; }
}

// ===== Rozhodování o obnově =====
// Má se zařízení při spuštění tiše obnovit (nový token + zápis)? Jen když je zapnuté, oprávnění je uděleno, vypínač týmu je zapnutý,
// je znám klíč VAPID a uplynul týden, nebo se změnilo propojení účtu (pid / tid).
export function needsSync(o) {
  const l = o.local, g = o.global;
  if (!l || !l.on || !g || !g.on || !g.vapid || o.perm !== "granted") return false;
  if ((o.pid || "") !== l.pid || (o.tid || "") !== l.tid) return true;
  return o.now - l.at >= RENEW_DAYS * DAY_MS;
}

// ===== Texty =====
// Stav tohoto zařízení pro sekci v ⚙️: {txt, warn}
export function deviceStatus(o) {
  if (!o.support.ok) return {txt: o.support.why, warn: true};
  if (o.perm === "denied") return {txt: "Notifikace jsou v prohlížeči zakázané – povol je v nastavení webu (ikona zámku vedle adresy).", warn: true};
  if (!o.local.on) return {txt: "Na tomto zařízení vypnuto.", warn: false};
  if (!o.global.on) return {txt: "Zapnuto na tomto zařízení, ale celý tým je právě VYPNUTÝ (STOP) – nic nepřijde.", warn: true};
  return {txt: "Zapnuto na tomto zařízení.", warn: false};
}
