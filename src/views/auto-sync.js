// Automatická synchronizace odvozených dat (bez obrazovky, tichý zápis přes HK.syncOps – v náhledu a ve starší verzi se nezapisuje):
//  1) veřejné dokumenty pro hostující evpub / lineuppub (domain/guests.js pubPlan) – zapisuje jen trenér / kustod a jen rozdíly,
//     a jen když se oba dokumenty načetly (jinak by nepublikovaná pravidla vedla ke zbytečným zápisům),
//  2) automatická omluva z 🏖 nepřítomnosti (domain/absence.js absAuto) u otevřených událostí, kde člen ještě neodpověděl –
//     trenér / kustod za všechny, ostatní za sebe (pravidla jim víc nedovolí).
// Spouští ho main.js po změně dat; běží nejdřív 1,5 s po poslední změně, zápisy čekající na potvrzení se neopakují.

// ===== Importy =====
import {S} from "../core/state.js";
import {td} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {absAuto} from "../domain/absence.js";
import {pubPlan} from "../domain/guests.js";
import {NOTE_COLL, attDoc, noteDoc, noteId} from "../domain/private-data.js";

// ===== Konstanty a stav =====
const WAIT = 1500;                    // prodleva po poslední změně dat (ms)
let timer = null;
const pending = new Map();            // klíč zápisu → čas odeslání (stejný zápis se do 60 s neopakuje)
const HOLD = 60000;

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
  timer = setTimeout(() => { try { const ops = plan(); if (ops.length) HK.syncOps(ops); } catch (e) { console.warn("Synchronizace se nespočítala:", e); } }, WAIT);
}

// ===== Exporty =====
// (autoSync je označený u definice výše)
