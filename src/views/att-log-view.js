// 🕘 Historie přihlášek u události (manager, trenér, asistent): kdy se kdo přihlásil, omluvil, odpověď zrušil, a kdo zapisoval za koho.
// Zápis záznamů logAtt() posílá tiše přes HK.syncOps (chyba pravidel nikdy nezablokuje samotnou odpověď). Čtení jednorázově
// (getWhere eid) při rozbalení 👥 Docházky, platí 5 min (S.alg). V řádcích docházky čas poslední změny a kdo ji zapsal, okno s celou historií.

// ===== Importy =====
import {pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {startMs} from "../domain/attendance.js";
import {byPerson, filterRows, lastWriter, LOG_COLL, LOG_TXT, logMs, logOps, logRows, logSummary, SRC_TXT} from "../domain/att-log.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
const TTL = 5 * 60 * 1000;                                            // načtená historie platí 5 min
const DAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const FILTERS = [["all", "Vše"], ["other", "✍ Za někoho"], ["late", "⏰ Po termínu"]];
const VIEWS = [["time", "🕒 Podle času"], ["pers", "👥 Podle osob"]];
// S.alg = {eid: {st: "load" | "ok" | "err", L: záznamy, at: čas načtení}}; S.alo = otevřené okno {eid, f, v}

// ===== Pomocné funkce =====
const p2 = n => String(n).padStart(2, "0");
const canSee = () => HK.can("sport");                                 // historii čte manager, trenér a asistent (pravidla isStaff)
// Čas změny: „Út 22. 10. 14:03“; bez času = záznam se ještě nezapsal na server, u starší odpovědi čas neznámý
const fTime = (ms, old) => { if (ms == null) return old ? "čas neznámý" : "⏳ ukládá se"; const d = new Date(ms); return DAYS[d.getDay()] + " " + d.getDate() + ". " + (d.getMonth() + 1) + ". " + p2(d.getHours()) + ":" + p2(d.getMinutes()); };
const short = mail => esc(String(mail || "").split("@")[0] || "?");
// Kdo změnu zapsal: vlastní odpověď, jméno zapisující osoby, nebo jen účet (starší odpověď bez historie)
function whoTxt(r) {
  if (r.old) return r.by ? "účet " + short(r.by) : "";
  if (r.self) return "👤 sám/sama";
  return "✍ zapsal(a) " + (r.bp ? pn(r.bp, {staff: true, fb: short(r.by)}) : short(r.by));
}
const tags = r => (r.after ? ' <span class="tag red">po začátku</span>' : r.late ? ' <span class="tag sh">⏰ po termínu</span>' : "");
const cache = eid => (S.alg || {})[eid];
// Odpovědi události ve tvaru pro časovou osu
const attOf = eid => S.at.filter(a => a.eid === eid);
const rowsOf = ev => { const c = cache(ev.id); return logRows(c && c.L, attOf(ev.id), {id: ev.id, dl: ev.dl, start: startMs(ev.date, ev.time)}); };

// ===== Hlavní logika: zápis a čtení =====
// Zápis záznamů historie [{eid, pid, st, src}] – tiše, bez dávky odpovědi; po zápisu se načtená historie události obnoví při dalším zobrazení
export function logAtt(items) {
  if (!S.db || !HK.syncOps || !items || !items.length) return;
  const u = HK.user(), ops = logOps(items, ((u && u.email) || "").toLowerCase(), {pid: HK.pid(), tid: HK.tid()}, () => S.db.collection(LOG_COLL).newId());
  if (!ops.length) return;
  // Po potvrzení zápisu se už načtená historie události načte znovu (jen u událostí, kde ji správce právě má)
  HK.syncOps(ops).then(ok => { if (ok) new Set(items.map(x => x.eid)).forEach(eid => { if (S.alg && S.alg[eid] && S.alg[eid].st !== "load") loadLog(eid, true); }); });
}
// Načtení historie události (jen kdo ji smí číst); force = i když je v paměti čerstvá
export function loadLog(eid, force) {
  if (!canSee() || !S.db) return;
  S.alg = S.alg || {};
  const c = S.alg[eid];
  // Probíhající čtení se neopakuje; výsledek i chyba platí TTL (chyba se tak neopakuje při každém vykreslení)
  if (c && (c.st === "load" || (!force && Date.now() - c.at < TTL))) return;
  S.alg[eid] = {st: "load", L: c ? c.L : [], at: Date.now()};
  S.db.collection(LOG_COLL).getWhere("eid", eid)
    .then(L => { S.alg[eid] = {st: "ok", L, at: Date.now()}; render(); })
    .catch(e => { console.warn("Historie přihlášek se nenačetla:", e && (e.code || e.message)); S.alg[eid] = {st: "err", L: [], at: Date.now()}; render(); });
}

// ===== Vykreslení =====
// Malý řádek pod jménem v docházce: čas poslední změny a kdo ji zapsal (jen správci, jen při rozbalené docházce)
export function rowLog(ev, pid, x) {
  if (!canSee() || !x) return "";
  const r = lastWriter(rowsOf(ev), pid, x), ms = r ? r.ms : logMs(x.at);
  if (ms == null && !r) return "";
  return `<div class="mu" style="font-size:12px">🕘 ${fTime(ms)}${r && !r.self ? " · " + whoTxt(r) : ""}${r && r.src ? " · " + SRC_TXT[r.src] : ""}</div>`;
}
// Tlačítko otevření okna (pod docházkou)
export const logBtn = ev => (canSee() ? `<button class="s w" data-alg="${esc(ev.id)}" style="margin-top:10px">🕘 Historie přihlášek</button>` : "");
// Jeden řádek historie; withName = i jméno osoby (pohled podle času)
function lineHtml(r, withName) {
  const T = LOG_TXT[r.st], meta = [fTime(r.ms, r.old), whoTxt(r), r.src ? SRC_TXT[r.src] : ""].filter(Boolean).join(" · ");
  return `<div class="it" style="cursor:default;display:block"><div>${withName ? "<b>" + pn(r.pid, {staff: true}) + "</b> · " : ""}${T.ic} ${T.t}${tags(r)}${r.old ? ' <span class="mu">(poslední změna)</span>' : ""}</div><div class="mu" style="font-size:12px">${meta}</div></div>`;
}
// Okno s celou historií události
export function logModal(ev) {
  const o = S.alo;
  if (!o || !ev || o.eid !== ev.id || !canSee()) return "";
  const c = cache(ev.id), all = rowsOf(ev), rows = filterRows(all, o.f), sm = logSummary(all);
  const chips = (L, cur, attr) => `<div class="chips">${L.map(([k, t]) => `<button class="chip ${cur === k ? "on" : ""}" ${attr}="${k}">${t}</button>`).join("")}</div>`;
  const body = !c || c.st === "load" ? '<div class="msg">Načítám…</div>'
    : c.st === "err" ? '<div class="msg">Historii se nepodařilo načíst (bez připojení, nebo nejsou publikovaná pravidla databáze).</div>'
    : !rows.length ? '<div class="msg">Žádné změny.</div>'
    : o.v === "pers" ? byPerson(rows).map(g => `<div class="lnl">${pn(g.pid, {staff: true})}</div>${g.rows.map(r => lineHtml(r, false)).join("")}`).join("")
    : rows.map(r => lineHtml(r, true)).join("");
  return `<div class="md" id="algm"><div class="mb"><h2>🕘 Historie přihlášek</h2><div class="mu">${esc(ev.title)}</div>
<div class="mu" style="margin:4px 0 8px">Změn ${sm.n} · osob ${sm.people} · za někoho ${sm.other} · po termínu ${sm.late}${sm.after ? " · po začátku " + sm.after : ""}</div>
${chips(FILTERS, o.f, "data-alf")}${chips(VIEWS, o.v, "data-alv")}<div style="margin-top:8px">${body}</div>
<div class="mu" style="font-size:12px;margin-top:8px">Historie se zapisuje od v22.7. U starších odpovědí je vidět jen poslední změna a účet, který ji zapsal. Důvody omluv jsou v docházce.</div>
<div class="row" style="margin-top:10px"><button class="s" id="algr">↻ Obnovit</button><button class="p" id="algx">Zavřít</button></div></div></div>`;
}

// ===== Eventy =====
// Obsluha tlačítka a okna (volá detail události po vykreslení)
export function bindLog(a, ev) {
  const b = a.querySelector("[data-alg]");
  if (b) b.onclick = () => { S.alo = {eid: ev.id, f: "all", v: "time"}; loadLog(ev.id, true); render(); };
  const m = document.getElementById("algm");
  if (!m) return;
  const close = () => { S.alo = null; render(); };
  m.onclick = e => { if (e.target.id === "algm") close(); };
  document.getElementById("algx").onclick = close;
  document.getElementById("algr").onclick = () => { loadLog(ev.id, true); render(); };
  m.querySelectorAll("[data-alf]").forEach(x => x.onclick = () => { S.alo.f = x.dataset.alf; render(); });
  m.querySelectorAll("[data-alv]").forEach(x => x.onclick = () => { S.alo.v = x.dataset.alv; render(); });
}
