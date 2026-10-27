// Řádek stavu na kartě události v seznamu Událostí: 💰 vyúčtování a placení (jen správce pokladny – manager, pokladník)
// a 🏒 stav tréninku (plán, ⏱ živý trénink, ⭐ hodnocení – kdo smí číst hodnocení, tj. trenéři). Výpočet: domain/event-status.js.
// Stav tréninků se čte jednorázově (trplan, trlive, treval) a drží se v S.trs nejvýš TRS_TTL; po načtení se seznam překreslí.
// ===== Importy =====
import {pl} from "../core/selectors.js";
import {S} from "../core/state.js";
import {td} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {kc} from "../domain/cash.js";
import {isCancelled} from "../domain/event-cancel.js";
import {cashState, trainState} from "../domain/event-status.js";
import {TREVAL_COLL} from "../domain/training-eval.js";
import {TRLIVE_COLL} from "../domain/training-live.js";
import {TRPLAN_COLL} from "../domain/training-plan.js";
import {render} from "./shell.js";

// ===== Konstanty =====
const TRS_TTL = 5 * 60 * 1000;   // jak dlouho platí načtený stav tréninků (ms)

// ===== Pomocné funkce =====
const tag = (txt, color) => `<span class="tag"${color ? ` style="color:${color}"` : ""}>${txt}</span>`;
// Bezpečné jednorázové čtení kolekce: chyba (práva, offline) = prázdný seznam
const readAll = c => Promise.resolve().then(() => S.db.collection(c).getAll()).catch(() => []);
const byId = L => { const o = {}; (L || []).forEach(x => { o[x.id] = x; }); return o; };
// Vidí účet stav tréninků? (hodnocení čtou jen trenéři; hráčky a hostující ne)
const trainer = () => !HK.can("guest") && HK.perm("treval", "r");

// ===== Hlavní logika =====
// Načtení stavu tréninků (jednou za TRS_TTL, jen pro trenéry); po načtení překreslí seznam
export function ensureTrainStatus() {
  if (!trainer()) return;
  const t = S.trs;
  if (t && (t.busy || Date.now() - t.at < TRS_TTL)) return;
  S.trs = {...(t || {plan: {}, live: {}, ev: {}}), busy: true, at: (t || {}).at || 0};
  Promise.all([readAll(TRPLAN_COLL), readAll(TRLIVE_COLL), readAll(TREVAL_COLL)]).then(([p, l, e]) => {
    S.trs = {plan: byId(p), live: byId(l), ev: byId(e), at: Date.now(), busy: false};
    if (S.tab === "ev" && !S.evid && !S.evf) render();
  });
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
// 🏒 Stav tréninku na kartě (trenéři): jen tréninky dnes a v minulosti
function trainLine(e) {
  if (e.type === "match" || !trainer() || String(e.date || "") > td()) return "";
  const t = S.trs;
  if (!t || (!t.at && t.busy)) return "";
  const s = trainState(t.plan[e.id], t.live[e.id], t.ev[e.id]);
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
