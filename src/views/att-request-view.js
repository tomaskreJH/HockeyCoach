// ✋ Žádosti o změnu účasti po uzávěrce (requests, kind "att"): pruh a okno vyřízení pro managera / trenéra / asistenta (v Událostech)
// a rámeček v detailu události pro člena (podání žádosti, stav, zrušení otevřené žádosti). Výpočty: domain/att-requests.js.
// Schválení je jedna dávka: žádost (st, reply, doneBy, doneAt) + odpověď v docházce (jako ruční změna trenérem) + důvod v attnote;
// u vyúčtované události okno upozorní, že předpisy se nepřepočítají samy. Žádost vzniklá z 🏖 nepřítomnosti nese abs.

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {nm, pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, fd, reqWord, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {WANT, attDecidePlan, attReqDoc, attReqError, myAttReqs, openAttReq, openAttReqs} from "../domain/att-requests.js";
import {cxOf} from "../domain/cash.js";
import {NOTE_COLL, attDoc, noteDoc, noteId} from "../domain/private-data.js";
import {REQ_COLL} from "../domain/requests.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
const ST = {open: "⏳ čeká na vyřízení", ok: "✅ schváleno", no: "✕ zamítnuto"};
let reply = "";                       // rozepsaná odpověď trenéra v okně

// ===== Pomocné funkce =====
const me = () => { const u = HK.user(); return ((u && u.email) || "").toLowerCase(); };
// Událost podle id (trénink nebo zápas) jako {id, title, date, time, dl, cancelled, ss}
function evOf(id) {
  const e = S.ev.find(x => x.id === id);
  if (e) return {id, title: e.title || "Trénink", date: e.date || "", time: e.time || "", dl: e.dl || "", cancelled: e.cancelled || null, ss: !!e.ss};
  const m = S.ma.find(x => x.id === id);
  return m ? {id, title: "Zápas – " + (m.opp || ""), date: m.date || "", time: m.time || "", dl: m.dl || "", cancelled: m.cancelled || null, ss: !!m.ss} : null;
}
// Jméno žadatele (hráčka nebo člen týmu)
const whoH = mid => pn(mid, {staff: true});
const evLine = e => e ? esc(e.title) + " · " + esc(fd(e.date)) + (e.time ? " " + esc(e.time) : "") : "?";
// Současná odpověď člena k události
const curOf = (eid, mid) => { const a = S.at.find(x => x.eid === eid && x.pid === mid); return a ? a.st || null : null; };

// ===== Vykreslení: manager / trenér / asistent =====
// Pruh v Událostech: počet otevřených žádostí a tlačítko ke každé
export function attReqBanner() {
  if (!HK.can("sport")) return "";
  const rs = openAttReqs(S.rq);
  if (!rs.length) return "";
  const list = rs.map(r => `<button class="s w" data-aqo="${esc(r.id)}" style="margin-top:6px;text-align:left">${whoH(r.mid)} · ${evLine(evOf(r.eid))} → <b>${esc(WANT[r.want] || r.want)}</b>${r.abs ? " 🏖" : ""}</button>`).join("");
  return `<div class="cd" style="border-color:var(--wa)"><b style="color:var(--wa)">✋ ${rs.length} ${reqWord(rs.length)} o změnu účasti</b>${list}</div>`;
}
// Okno vyřízení (S.aqo); bez otevřené žádosti prázdné
export function attReqModal() {
  if (!S.aqo || !HK.can("sport")) return "";
  const r = S.rq.find(x => x.id === S.aqo);
  if (!r || r.st !== "open") { S.aqo = null; reply = ""; return ""; }
  const e = evOf(r.eid), cur = curOf(r.eid, r.mid), settled = e && (e.ss || (HK.can("money") && cxOf(e.id, S.ec).settle));
  const warn = settled ? '<div class="mu" style="margin-top:8px;color:var(--wa)">⚠️ Událost je vyúčtovaná – změna účasti předpisy nepřepočítá. Případně vyúčtování ručně znovu otevři (Pokladna u události).</div>' : "";
  return `<div class="md" id="aqbg"><div class="mb"><h2>✋ Žádost o změnu účasti</h2><div><b>${whoH(r.mid)}</b></div><div style="margin-top:4px">${evLine(e)}</div>
<div style="margin-top:6px">Teď: <b>${esc(cur ? WANT[cur] : "bez odpovědi")}</b> → chce: <b>${esc(WANT[r.want] || r.want)}</b></div>
${r.reason ? `<div style="margin-top:6px">„${esc(r.reason)}“</div>` : ""}<div class="mu">Podáno ${esc(fd(String(r.at || "").slice(0, 10)))}${r.by ? " · " + esc(r.by) : ""}${r.abs ? " · z nepřítomnosti 🏖" : ""}</div>${warn}
<input id="aqrep" placeholder="Odpověď (nepovinné)" maxlength="300" value="${esc(reply)}" style="margin-top:10px"><div class="row" style="margin-top:8px"><button class="p" id="aqok">${armed("aqok" + r.id) ? "Opravdu schválit?" : "✓ Schválit"}</button><button class="d" id="aqno">${armed("aqno" + r.id) ? "Opravdu zamítnout?" : "✕ Zamítnout"}</button></div>
<button class="s w" id="aqx" style="margin-top:12px;min-height:48px">Zavřít</button></div></div>`;
}

// ===== Vykreslení: člen v detailu události =====
// Rámeček v detailu uzavřené události: stav vlastní žádosti, nebo formulář nové. mid = člen (hráčka / člen týmu).
export function attReqBox(ev, mid) {
  if (!mid || HK.can("sport")) return "";
  const e = evOf(ev.id) || ev, now = Date.now(), today = td(), cur = curOf(ev.id, mid);
  const o = openAttReq(S.rq, ev.id, mid), last = myAttReqs(S.rq, ev.id, mid).find(r => r.st !== "open");
  if (o) return `<div class="cd" style="border-color:var(--wa)"><h2>✋ Žádost o změnu účasti</h2><div>Chceš: <b>${esc(WANT[o.want] || o.want)}</b> · ${ST.open}</div>${o.reason ? `<div class="mu">„${esc(o.reason)}“</div>` : ""}<button class="d w" id="aqdel" style="margin-top:8px">${armed("aqdel" + o.id) ? "Opravdu zrušit žádost? Klepni znovu" : "Zrušit žádost"}</button></div>`;
  const lastH = last ? `<div class="mu" style="margin-bottom:8px">Poslední žádost (${esc(WANT[last.want] || last.want)}): ${ST[last.st] || last.st}${last.reply ? " – „" + esc(last.reply) + "“" : ""}</div>` : "";
  // Formulář jen tehdy, když jde o jinou odpověď smysluplně žádat (uzávěrka minula, událost nezačala, není zrušená)
  const can = Object.keys(WANT).some(w => !attReqError(e, mid, w, cur, S.rq, now, today));
  if (!can) return lastH ? `<div class="cd">${lastH}</div>` : "";
  const f = S.aq && S.aq.eid === ev.id ? S.aq : {eid: ev.id, want: "", reason: ""};
  return `<div class="cd"><h2>✋ Požádat o změnu účasti</h2>${lastH}<div class="mu" style="margin-bottom:8px">Přihlašování je uzavřené. Manager, trenér nebo asistent žádost schválí, nebo zamítne.</div>
<div class="chips">${Object.entries(WANT).filter(([k]) => k !== cur).map(([k, t]) => `<button class="chip ${f.want === k ? "on" : ""}" data-aqw="${k}">${t}</button>`).join("")}</div>
<input id="aqrs" placeholder="Důvod (u Nejdu povinný)" maxlength="300" value="${esc(f.reason)}"><button class="p w" id="aqsend" style="margin-top:8px">✋ Odeslat žádost</button></div>`;
}

// ===== Hlavní logika =====
// Vyřízení v jedné dávce: žádost + docházka + důvod (bez auditu – asistent do auditu zapisovat nesmí)
function decide(r, ok) {
  if (r.st !== "open") return;
  const at = new Date().toISOString(), plan = attDecidePlan(r, ok, reply, me(), at), b = S.db.batch().merge(REQ_COLL + "/" + r.id, plan.req);
  if (plan.att) {
    const id = noteId(r.eid, r.mid), d = attDoc(r.eid, r.mid, plan.att.st, at, me()), n = noteDoc(r.eid, r.mid, plan.att.reason);
    if (plan.att.abs) d.abs = plan.att.abs;
    b.set("attendance/" + id, d);
    if (n) b.set(NOTE_COLL + "/" + id, n); else if (S.an[id]) b.delete(NOTE_COLL + "/" + id);
  }
  b.commit();
  S.aqo = null; reply = "";
  toast(ok ? "Žádost schválena – docházka změněna" : "Žádost zamítnuta");
  render();
}
// Odeslání žádosti člena
function send(ev, mid) {
  const f = S.aq || {}, e = evOf(ev.id) || ev, err = attReqError(e, mid, f.want, curOf(ev.id, mid), S.rq, Date.now(), td());
  if (err) return toast(err);
  if (f.want === "no" && !String(f.reason || "").trim()) return toast("Zadej důvod");
  S.db.doc(REQ_COLL + "/" + S.db.collection(REQ_COLL).newId()).set(attReqDoc(ev.id, mid, f.want, f.reason, me(), new Date().toISOString()));
  S.aq = null;
  toast("Žádost odeslána – " + nm(mid, {staff: true}));
  render();
}

// ===== Eventy =====
// Pruh a okno trenéra (volá events.js po vykreslení seznamu i detailu)
export function bindAttReqAdmin(a) {
  a.querySelectorAll("[data-aqo]").forEach(b => b.onclick = () => { S.aqo = b.dataset.aqo; reply = ""; render(); });
  const rep = a.querySelector("#aqrep");
  if (rep) rep.oninput = () => { reply = rep.value; };
  const r = S.aqo ? S.rq.find(x => x.id === S.aqo) : null, ok = a.querySelector("#aqok"), no = a.querySelector("#aqno");
  if (ok && r) ok.onclick = () => confirm2("aqok" + r.id, () => decide(r, true));
  if (no && r) no.onclick = () => confirm2("aqno" + r.id, () => decide(r, false));
  const close = () => { S.aqo = null; reply = ""; render(); };
  const x = a.querySelector("#aqx");
  if (x) x.onclick = close;
  const bg = a.querySelector("#aqbg");
  if (bg) bg.onclick = e => { if (e.target.id === "aqbg") close(); };
}
// Rámeček člena v detailu události
export function bindAttReqBox(a, ev, mid) {
  const keep = () => { const i = a.querySelector("#aqrs"); if (i && S.aq) S.aq.reason = i.value; };
  a.querySelectorAll("[data-aqw]").forEach(b => b.onclick = () => { const i = a.querySelector("#aqrs"); S.aq = {eid: ev.id, want: b.dataset.aqw, reason: i ? i.value : ""}; render(); });
  const i = a.querySelector("#aqrs");
  if (i) i.oninput = () => { if (!S.aq || S.aq.eid !== ev.id) S.aq = {eid: ev.id, want: "", reason: ""}; keep(); };
  const s = a.querySelector("#aqsend");
  if (s) s.onclick = () => { keep(); send(ev, mid); };
  const o = openAttReq(S.rq, ev.id, mid), d = a.querySelector("#aqdel");
  if (d && o) d.onclick = () => confirm2("aqdel" + o.id, () => { S.db.doc(REQ_COLL + "/" + o.id).delete(); toast("Žádost zrušena"); });
}

// ===== Exporty =====
// (exportované funkce jsou označené u definic výše)
