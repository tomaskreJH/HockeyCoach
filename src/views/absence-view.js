// 🏖 Nepřítomnost od – do: karta v 🏠 Domů (vlastní nepřítomnosti, u trenéra / kustoda i nepřítomnosti týmu) a okno formuláře
// s náhledem „co se změní“ (S.abf). Výpočty: domain/absence.js, žádosti po uzávěrce: domain/att-requests.js.
// Uložení je jedna dávka: absence/{id} + u otevřených událostí odpověď „Nejdu“ (abs = id) a důvod v attnote; po uzávěrce (do začátku)
// člen pošle žádost o změnu účasti, trenér / kustod zapíše odpověď rovnou. Zrušení smaže nepřítomnost a jí zapsané omluvy
// u otevřených budoucích událostí. Úprava = zrušení staré a uložení nové v jedné dávce.

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {nm, pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, fd, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {ABS_COLL, ABS_KINDS, absDoc, absError, absPlan, absRange, absReason, absRevert, activeAbs} from "../domain/absence.js";
import {attReqDoc} from "../domain/att-requests.js";
import {NOTE_COLL, attDoc, noteDoc, noteId} from "../domain/private-data.js";
import {REQ_COLL} from "../domain/requests.js";
import {render} from "./shell.js";

// ===== Konstanty =====
const PREV = {yes: "✅ Jdu", maybe: "❓ Nejistá", no: "❌ Nejdu"};

// ===== Pomocné funkce =====
const me = () => { const u = HK.user(); return ((u && u.email) || "").toLowerCase(); };
const myMid = () => HK.pid() || HK.tid() || null;
const staff = () => HK.can("sport");
// Události pro výpočty a náhled (trénink i zápas)
const items = () => [...S.ev.map(e => ({id: e.id, title: e.title || "Trénink", date: e.date || "", time: e.time || "", dl: e.dl || "", cancelled: e.cancelled || null})),
  ...S.ma.map(m => ({id: m.id, title: "Zápas – " + (m.opp || ""), date: m.date || "", time: m.time || "", dl: m.dl || "", cancelled: m.cancelled || null}))];
const evById = id => items().find(e => e.id === id);
const whoH = mid => pn(mid, {staff: true});
// Členové pro výběr (trenér / kustod): aktivní hráčky a realizační tým
const memberOpts = sel => [...S.pl.filter(p => (p.st || "act") !== "end").sort((a, b) => a.name.localeCompare(b.name, "cs")).map(p => [p.id, nm(p.id)]),
  ...[...S.tr].sort((a, b) => (a.name || "").localeCompare(b.name || "", "cs")).map(t => [t.id, "🎓 " + (t.name || "?")])]
  .map(([id, t]) => `<option value="${esc(id)}"${id === sel ? " selected" : ""}>${esc(t)}</option>`).join("");
// Řádek nepřítomnosti v kartě
const absRow = (a, who) => `<div class="hmr" style="cursor:default"><div>${who ? "<b>" + whoH(a.mid) + "</b> · " : ""}${esc(ABS_KINDS[a.kind] || "")} <b>${esc(absRange(a))}</b>${a.note ? `<div class="mu">${esc(a.note)}</div>` : ""}</div><div class="row" style="flex:none;flex-wrap:nowrap"><button class="s" data-abe="${esc(a.id)}" style="padding:6px 10px">✏️</button><button class="d" data-abd="${esc(a.id)}" style="padding:6px 10px">${armed("abd" + a.id) ? "Zrušit?" : "🗑"}</button></div></div>`;

// ===== Vykreslení =====
// Karta 🏖 v 🏠 Domů: vlastní platné nepřítomnosti a u trenéra / kustoda nepřítomnosti týmu
export function absCardHtml() {
  const mid = myMid(), today = td(), act = activeAbs(S.ab, today);
  if (!mid && !staff()) return "";
  const mine = mid ? act.filter(a => a.mid === mid) : [], team = staff() ? act.filter(a => a.mid !== mid) : [];
  return `<div class="cd"><div class="hmh"><h2 style="margin:0">🏖 Nepřítomnost</h2>${mid ? '<button class="s" data-abn="me" style="flex:none">+ Přidat</button>' : ""}</div>
<div class="mu" style="margin:6px 0">Dovolená, nemoc… – v otevřených událostech období se zapíše „Nejdu“, po uzávěrce odejde žádost trenérovi.</div>
${mine.map(a => absRow(a, false)).join("") || (mid ? '<div class="mu">Žádná naplánovaná nepřítomnost.</div>' : "")}
${staff() ? `<h3 style="margin-top:10px">Tým</h3>${team.map(a => absRow(a, true)).join("") || '<div class="mu">Nikdo z týmu nehlásí nepřítomnost.</div>'}<button class="s w" data-abn="team" style="margin-top:8px">+ Zadat za člena</button>` : ""}</div>`;
}
// Náhled změn pro formulář
function previewHtml(f) {
  const err = absError(f, td());
  if (err) return `<div class="mu" style="color:var(--wa)">${esc(err)}</div>`;
  const id = f.id || "", rev = new Set(id ? absRevert({id, mid: f.mid}, items(), S.at, Date.now(), td()) : []);
  // Při úpravě se nejdřív vrátí omluvy staré nepřítomnosti – v náhledu se tyto odpovědi berou jako nevyplněné
  const at = S.at.filter(x => !rev.has(x.id)), p = absPlan({...f, id}, items(), at, S.rq, Date.now(), td());
  const line = (x, t) => { const e = evById(x.eid); return e ? `<div>• ${esc(e.title)} ${esc(fd(e.date))}${e.time ? " " + esc(e.time) : ""} – ${t}${x.prev ? ` <span class="mu">(teď ${PREV[x.prev] || x.prev})</span>` : ""}</div>` : ""; };
  const reqT = staff() ? "zapíše se ❌ Nejdu (po uzávěrce)" : "✋ žádost trenérovi (po uzávěrce)";
  const body = p.write.map(x => line(x, "zapíše se ❌ Nejdu")).join("") + p.req.map(x => line(x, reqT)).join("");
  return `<h3>Co se změní</h3>${body || '<div class="mu">V období nejsou žádné otevřené události – omluva se zapíše i do událostí založených později.</div>'}${p.keep.length ? `<div class="mu">Beze změny (už Nejdu nebo čekající žádost): ${p.keep.length}</div>` : ""}${p.past ? `<div class="mu">Uplynulé / začaté události období se nemění: ${p.past}</div>` : ""}`;
}
// Okno formuláře (S.abf)
export function absModal() {
  const f = S.abf;
  if (!f) return "";
  const pick = staff() ? `<label>Člen</label><select id="abm">${memberOpts(f.mid)}</select>` : `<div class="mu" style="margin-bottom:6px">${whoH(f.mid)}</div>`;
  return `<div class="md" id="abbg"><div class="mb"><h2>🏖 ${f.id ? "Upravit nepřítomnost" : "Nepřítomnost"}</h2>${pick}
<label>Druh</label><div class="chips">${Object.entries(ABS_KINDS).map(([k, t]) => `<button class="chip ${f.kind === k ? "on" : ""}" data-abk="${k}">${t}</button>`).join("")}</div>
<div class="row"><div><label>Od</label><input type="date" id="abfr" value="${esc(f.from)}"></div><div><label>Do</label><input type="date" id="abto" value="${esc(f.to)}"></div></div>
<label>Poznámka (nepovinná)</label><input id="abnt" maxlength="300" value="${esc(f.note)}">
<div class="mu" style="margin-bottom:6px">${f.kind === "sick" ? "Druh „Nemoc“ vidí jen manager, trenér, asistent a ty." : "Druh a poznámku vidí jen manager, trenér, asistent a ty; ostatní uvidí jen ❌ Nejdu."}</div>
<div id="abpv">${previewHtml(f)}</div>
<div class="row" style="margin-top:10px"><button class="p" id="absv">${armed("absv") ? "Opravdu uložit? Klepni znovu" : "Uložit"}</button><button class="s" id="abx">Zavřít</button></div></div></div>`;
}

// ===== Hlavní logika =====
// Zápis omluvy do dávky (odpověď Nejdu s abs a důvod)
function putNo(b, eid, mid, absId, reason, at) {
  const id = noteId(eid, mid), n = noteDoc(eid, mid, reason);
  b.set("attendance/" + id, {...attDoc(eid, mid, "no", at, me()), abs: absId});
  if (n) b.set(NOTE_COLL + "/" + id, n);
}
// Vrácení omluv nepřítomnosti do dávky (odpovědi a důvody u otevřených budoucích událostí)
function putRevert(b, a) {
  absRevert(a, items(), S.at, Date.now(), td()).forEach(id => { b.delete("attendance/" + id); if (S.an[id]) b.delete(NOTE_COLL + "/" + id); });
}
// Uložení: stará nepřítomnost (úprava) se zruší, nová se zapíše s omluvami / žádostmi – vše jedna dávka
function save() {
  const f = S.abf, today = td(), err = absError(f, today);
  if (err) return toast(err);
  const at = new Date().toISOString(), b = S.db.batch(), old = f.id ? S.ab.find(x => x.id === f.id) : null;
  if (old) { putRevert(b, old); b.delete(ABS_COLL + "/" + old.id); }
  const id = S.db.collection(ABS_COLL).newId(), d = absDoc(f.mid, f.kind, f.from, f.to, f.note, me(), at), a = {...d, id};
  const rev = new Set(old ? absRevert(old, items(), S.at, Date.now(), today) : []);
  const p = absPlan(a, items(), S.at.filter(x => !rev.has(x.id)), S.rq, Date.now(), today), reason = absReason(a);
  b.set(ABS_COLL + "/" + id, d);
  p.write.forEach(x => putNo(b, x.eid, f.mid, id, reason, at));
  // Po uzávěrce: trenér / kustod zapíše rovnou, člen pošle žádost
  p.req.forEach(x => { if (staff()) putNo(b, x.eid, f.mid, id, reason, at); else b.set(REQ_COLL + "/" + S.db.collection(REQ_COLL).newId(), attReqDoc(x.eid, f.mid, "no", reason, me(), at, id)); });
  b.commit();
  S.abf = null;
  toast("Nepřítomnost uložena" + (p.write.length ? " · omluveno " + p.write.length : "") + (p.req.length && !staff() ? " · žádosti " + p.req.length : ""));
  render();
}
// Zrušení nepřítomnosti s vrácením jejích omluv
function remove(a) {
  const b = S.db.batch();
  putRevert(b, a);
  b.delete(ABS_COLL + "/" + a.id).commit();
  toast("Nepřítomnost zrušena");
  render();
}

// ===== Eventy =====
// Karta v 🏠 Domů a okno formuláře (volá home-view.js po vykreslení)
export function bindAbs(a) {
  const today = td(), blank = mid => ({id: null, mid, kind: "vac", from: today, to: today, note: ""});
  a.querySelectorAll("[data-abn]").forEach(b => b.onclick = () => {
    const mid = b.dataset.abn === "me" ? myMid() : (S.pl.find(p => (p.st || "act") !== "end") || S.tr[0] || {}).id;
    if (!mid) return toast("Účet není propojen s členem týmu");
    S.abf = blank(mid); render();
  });
  a.querySelectorAll("[data-abe]").forEach(b => b.onclick = () => { const x = S.ab.find(y => y.id === b.dataset.abe); if (x) { S.abf = {id: x.id, mid: x.mid, kind: x.kind, from: x.from, to: x.to, note: x.note || ""}; render(); } });
  a.querySelectorAll("[data-abd]").forEach(b => b.onclick = () => { const x = S.ab.find(y => y.id === b.dataset.abd); if (x) confirm2("abd" + x.id, () => remove(x)); });
  const f = S.abf;
  if (!f) return;
  const q = s => a.querySelector(s), read = () => { if (q("#abm")) f.mid = q("#abm").value; f.from = q("#abfr").value; f.to = q("#abto").value; f.note = q("#abnt").value; };
  const pv = () => { read(); if (f.to < f.from && f.from) { f.to = f.from; q("#abto").value = f.to; } q("#abpv").innerHTML = previewHtml(f); };
  ["#abm", "#abfr", "#abto"].forEach(s => { if (q(s)) q(s).onchange = pv; });
  q("#abnt").oninput = () => { f.note = q("#abnt").value; };
  a.querySelectorAll("[data-abk]").forEach(b => b.onclick = () => { read(); f.kind = b.dataset.abk; render(); });
  q("#absv").onclick = () => { read(); if (absError(f, td())) return toast(absError(f, td())); confirm2("absv", save); };
  const close = () => { S.abf = null; render(); };
  q("#abx").onclick = close;
  q("#abbg").onclick = e => { if (e.target.id === "abbg") close(); };
}

// ===== Exporty =====
// (exportované funkce jsou označené u definic výše)
