// Řádek stavu na kartě události v seznamu Událostí: 💰 vyúčtování a placení (jen správce pokladny – manager, pokladník)
// a 🏒 stav tréninku (plán, ⏱ živý trénink, ⭐ hodnocení – kdo smí číst hodnocení, tj. trenéři). Výpočet: domain/event-status.js.
// 📉 Stav tréninků se čte po dokumentech jen pro tréninky zobrazené v seznamu (dnes a v minulosti); starší než OLD_DAYS se pamatují
// v localStorage natrvalo, novější se obnoví po TRS_TTL. Otevření detailu události stav zapomene (forgetTrainStatus) – načte se znovu.

// ===== Importy =====
import {pl} from "../core/selectors.js";
import {S} from "../core/state.js";
import {LS, td} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {kc} from "../domain/cash.js";
import {isCancelled} from "../domain/event-cancel.js";
import {cashState, trainState} from "../domain/event-status.js";
import {TREVAL_COLL} from "../domain/training-eval.js";
import {TRLIVE_COLL} from "../domain/training-live.js";
import {TRPLAN_COLL} from "../domain/training-plan.js";
import {render} from "./shell.js";

// ===== Konstanty =====
const TRS_TTL = 10 * 60 * 1000;   // jak dlouho platí načtený stav nedávného tréninku (ms)
const OLD_DAYS = 7;               // trénink starší než tolik dní se už nemění – stav se pamatuje natrvalo
const LS_KEY = "hk-trs-v1";       // localStorage: {eid: {plan, live, rated}} jen starších tréninků
const CHUNK = 8;                  // kolik tréninků se čte najednou (3 dokumenty na trénink)

// ===== Pomocné funkce =====
const tag = (txt, color) => `<span class="tag"${color ? ` style="color:${color}"` : ""}>${txt}</span>`;
// Bezpečné jednorázové čtení jednoho dokumentu: chyba (práva, offline bez kopie) = nic
const readOne = (c, id) => Promise.resolve().then(() => S.db.doc(c + "/" + id).get()).catch(() => null);
// Vidí účet stav tréninků? (hodnocení čtou jen trenéři; hráčky a hostující ne)
const trainer = () => !HK.can("guest") && HK.perm("treval", "r");
// Datum před n dny ve tvaru RRRR-MM-DD (hranice „staršího“ tréninku)
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
// Uložené stavy starších tréninků (poškozený záznam = prázdný)
function lsLoad() {
  try { const o = JSON.parse(LS.get(LS_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; }
}
// Uloží jen stavy starších tréninků (novější se mohou měnit)
function lsSave() {
  const T = S.trs, old = daysAgo(OLD_DAYS), out = {};
  Object.keys(T.st).forEach(id => { if (T.at[id] && T.old[id] && T.old[id] < old) out[id] = T.st[id]; });
  LS.set(LS_KEY, JSON.stringify(out));
}
// Stav tréninků v paměti: st = {eid: stav}, at = {eid: čas načtení}, old = {eid: datum tréninku}, busy = právě se čte
function trs() {
  if (S.trs && S.trs.st) return S.trs;
  const st = lsLoad(), at = {}, old = {};
  Object.keys(st).forEach(id => { at[id] = 1; old[id] = "0000-00-00"; });   // uložené = starší trénink, platí natrvalo
  return (S.trs = {st, at, old, busy: new Set()});
}
// Potřebuje trénink (znovu) načíst? Starší jen poprvé, novější po TRS_TTL
function stale(e, T, now, old) {
  if (T.busy.has(e.id)) return false;
  if (!T.at[e.id]) return true;
  return e.date >= old && now - T.at[e.id] > TRS_TTL;
}

// ===== Hlavní logika =====
// Načtení stavu zobrazených tréninků (jen trenéři): dnes a v minulosti, bez zrušených; po načtení každé dávky překreslí seznam
export function ensureTrainStatus(evs) {
  if (!trainer() || !S.db) return;
  const T = trs(), today = td(), old = daysAgo(OLD_DAYS), now = Date.now();
  const need = (evs || []).filter(e => e && e.type !== "match" && String(e.date || "") <= today && !isCancelled(e) && stale(e, T, now, old));
  if (!need.length) return;
  need.forEach(e => T.busy.add(e.id));
  (async () => {
    for (let i = 0; i < need.length; i += CHUNK) {
      const part = need.slice(i, i + CHUNK);
      const got = await Promise.all(part.map(e => Promise.all([readOne(TRPLAN_COLL, e.id), readOne(TRLIVE_COLL, e.id), readOne(TREVAL_COLL, e.id)])));
      part.forEach((e, j) => {
        const [p, l, v] = got[j];
        T.st[e.id] = trainState(p, l, v); T.at[e.id] = Date.now(); T.old[e.id] = e.date; T.busy.delete(e.id);
      });
      lsSave();
      if (S.tab === "ev" && !S.evid && !S.evf) render();
    }
  })();
}
// Zapomene stav jednoho tréninku (otevřený detail – plán nebo hodnocení se mohly změnit); příště se načte znovu
export function forgetTrainStatus(eid) {
  const T = S.trs;
  if (!T || !T.at || !T.at[eid]) return;
  delete T.at[eid]; delete T.old[eid];
  lsSave();
}
// 💰 Stav vyúčtování a placení na kartě (správce pokladny); prázdné, pokud není co ukázat
function cashLine(e) {
  if (!HK.can("money")) return "";
  const c = cashState(e, S.ch.filter(x => x.eid === e.id && pl(x.mid)), td(), Date.now());
  if (!c) return "";
  if (c.st === "open") return tag("⚠️ vyúčtování neuzavřeno", "var(--wa)");
  if (!c.n) return tag("💰 vyúčtováno · nikdo neplatí", "var(--ok)");
  return tag("💰 vyúčtováno", "var(--ok)") + " " + tag(`${c.all ? "✅" : "💳"} zaplaceno ${c.paid}/${c.n} · ${kc(c.got)} z ${kc(c.amt)}`, c.all ? "var(--ok)" : "var(--wa)")
    + (c.over ? " " + tag(`⏰ ${c.over} po splatnosti`, "var(--no)") : "");
}
// 🏒 Stav tréninku na kartě (trenéři): jen tréninky dnes a v minulosti, až po načtení stavu
function trainLine(e) {
  if (e.type === "match" || !trainer() || String(e.date || "") > td()) return "";
  const s = S.trs && S.trs.st ? S.trs.st[e.id] : null;
  if (!s) return "";
  const plan = s.plan ? tag("📋 plán", "var(--ok)") : tag("📋 bez plánu", "var(--mu)");
  const live = s.live === "end" ? tag("⏱ uzavřen", "var(--ok)") : s.live ? tag("⏱ probíhá", "var(--wa)") : s.plan ? tag("⏱ nespuštěn", "var(--mu)") : "";
  const ev = s.rated ? tag(`⭐ ohodnoceno ${s.rated}`, "var(--ok)") : tag("⭐ bez hodnocení", "var(--mu)");
  return [plan, live, ev].filter(Boolean).join(" ");
}
// Celý řádek stavu pro kartu (prázdný řetězec = nic)
export function statusLine(e) {
  if (isCancelled(e) && !(e.raw || {}).ss && !(e.cx || {}).settle) return "";
  const h = [cashLine(e), trainLine(e)].filter(Boolean).join(" ");
  return h ? `<div class="mu" style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">${h}</div>` : "";
}

// ===== Exporty =====
// (exportované funkce jsou označené u definic výše)
