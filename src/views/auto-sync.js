// Tichá synchronizace odvozených dat (HK.syncOps; v náhledu a ve starší verzi se nezapisuje), spouští main.js 1,5 s po poslední změně:
// 1) veřejné evpub / lineuppub pro hostující (guests.js pubPlan) – jen manager / trenér / asistent, jen rozdíly a po načtení obou dokumentů,
// 2) automatická omluva z 🏖 nepřítomnosti (absAuto) u otevřených událostí bez odpovědi – sport za všechny, ostatní za sebe;
//    po úspěšném zápisu i záznam do 🕘 historie přihlášek (samostatně, chyba historie omluvu nezastaví).
// ===== Importy =====
import {S} from "../core/state.js";
import {td} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {absAuto} from "../domain/absence.js";
import {pubPlan} from "../domain/guests.js";
import {NOTE_COLL, attDoc, noteDoc, noteId} from "../domain/private-data.js";
import {logAtt} from "./att-log-view.js";

// ===== Konstanty a stav =====
const WAIT = 1500;                    // prodleva po poslední změně dat (ms)
let timer = null;
const pending = new Map();            // klíč zápisu → čas odeslání (stejný zápis se do 60 s neopakuje)
const HOLD = 60000;
let logs = [];                        // 🕘 záznamy historie přihlášek k automatickým omluvám (zapisují se až po úspěšné synchronizaci)

// ===== Pomocné funkce =====
const email = () => { const u = HK.user(); return ((u && u.email) || "").toLowerCase(); };
// Sjednocený seznam událostí pro výpočty (trénink i zápas)
const items = () => [...S.ev, ...S.ma].map(e => ({id: e.id, date: e.date || "", time: e.time || "", dl: e.dl || "", cancelled: e.cancelled || null}));
// Je člen (hráčka, člen týmu) aktivní a smí za něj tento účet zapisovat?
function mayWrite(mid) {
  if (HK.can("sport")) return S.pl.some(p => p.id === mid && (p.st || "act") !== "end") || S.tr.some(t => t.id === mid);
  return mid === HK.pid() || mid === HK.tid();
}
// Zápis ještě čeká na potvrzení?
function fresh(key) {
  const t = pending.get(key), now = Date.now();
  if (t && now - t < HOLD) return false;
  pending.set(key, now);
  return true;
}

// ===== Hlavní logika =====
// Plán zápisů: veřejné dokumenty + automatické omluvy; vrací operace pro HK.syncOps
function plan() {
  const ops = [], now = Date.now(), today = td();
  logs = [];
  if (HK.can("sport") && S.pubOk.evpub && S.pubOk.lineuppub) {
    const p = pubPlan(S.ev, S.ma, S.pl, S.tr, S.pubMap, today);
    p.set.forEach(x => { if (fresh("s:" + x.c + "/" + x.id + ":" + JSON.stringify(x.d))) ops.push(["set", x.c, x.id, x.d]); });
    p.del.forEach(x => { if (fresh("d:" + x.c + "/" + x.id)) ops.push(["del", x.c, x.id]); });
  }
  const by = email(), at = new Date().toISOString();
  absAuto(S.ab, items(), S.at, now, today).filter(x => mayWrite(x.mid)).forEach(x => {
    const id = noteId(x.eid, x.mid);
    if (!fresh("a:" + id)) return;
    ops.push(["set", "attendance", id, {...attDoc(x.eid, x.mid, "no", at, by), abs: x.abs}]);
    logs.push({eid: x.eid, pid: x.mid, st: "no", src: "auto"});
    const n = noteDoc(x.eid, x.mid, x.reason);
    if (n) ops.push(["set", NOTE_COLL, id, n]);
  });
  return ops;
}

// ===== Eventy =====
// Naplánuje synchronizaci (volá main.js po každé změně dat)
export function autoSync() {
  if (!S.ready || !S.db || !HK.syncOps) return;
  clearTimeout(timer);
  timer = setTimeout(() => { try { const ops = plan(), lg = logs; if (ops.length) HK.syncOps(ops).then(ok => { if (ok && lg.length) logAtt(lg); }); } catch (e) { console.warn("Synchronizace se nespočítala:", e); } }, WAIT);
}

// ===== Exporty =====
// (autoSync je označený u definice výše)
