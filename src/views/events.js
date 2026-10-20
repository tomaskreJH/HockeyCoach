// Události a docházka: seznam, kalendář, přihlašování (jdu / nejdu / nejsem jistý), detail události, rozdělení do pětek na tréninku a přehled plateb.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Zápis dat -> Vykreslení (seznam, kalendář, detail, formulář, okno s důvodem) -> Eventy -> Export.
// Data: kolekce "events" (tréninky); zápasy se berou z "matches" (čas, místo, termín přihlašování a cena jsou v polích time, place, dl, fee, pm zápasu);
// odpovědi jsou v kolekci "attendance" (id dokumentu = {eventId}_{memberId}), členem je hráčka nebo člen realizačního týmu (kolekce "staff").
// Role: trenér a kustod spravují vše a zapisují odpovědi za kohokoli; hráčka (HK.role() === "hracka") vidí události, mění jen svoji odpověď
// a jen do termínu přihlašování. Zápasy se nadále zakládají a vedou stejně jako dřív (karta zápasu je jen pro trenéra a kustoda).
// Trenér / kustod propojený s členem realizačního týmu (members/{email}.tid, ⚙️ → Členové týmu) se předvybere sám a přihlašuje se jedním klepnutím.
// Platby za události (cena, způsob úhrady, vyúčtování) řeší views/payments.js a domain/payments.js, přehled plateb a dluhů views/finance.js (režim „💰 Platby“).

// ===== Importy =====
import {POS} from "../config/constants.js";
import {strip, upd} from "../core/actions.js";
import {PG, isG, pl, pn, pri, score, stOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {LS, clone, esc, fd, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {HINTS, MODES, feeOf, kc, modeOf} from "../domain/payments.js";
import {bindFinance, financeHtml} from "./finance.js";
import {modal} from "./modal.js";
import {bindPay, payHtml} from "./payments.js";
import {render} from "./shell.js";

// ===== Konstanty =====
const ANS = {yes: {ic: "✅", t: "Jdu", cls: "pp"}, no: {ic: "❌", t: "Nejdu", cls: "red"}, maybe: {ic: "❓", t: "Nejsem jistý", cls: "sh"}};
const ORD = ["yes", "no", "maybe"];                                   // pořadí tlačítek
const REASONS = ["Nemoc", "Zranění", "Škola", "Práce", "Rodina", "Jiné"]; // rychlé důvody
const DAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const MONTHS = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
// Styly jen pro tuto obrazovku (main.css se nemění)
const CSS = `<style>
#evw .evi{cursor:pointer}
#evw .evh{display:flex;justify-content:space-between;align-items:center;gap:8px}
#evw .evq{display:flex;gap:6px;margin-top:10px}
#evw .evq button{flex:1;min-height:48px;border-radius:10px;border:1px solid var(--bd);background:var(--bg);color:var(--tx);font-weight:700}
#evw .evq button.on-yes{background:var(--ok);color:#fff;border-color:var(--ok)}
#evw .evq button.on-no{background:var(--no);color:#fff;border-color:var(--no)}
#evw .evq button.on-maybe{background:var(--wa);color:#fff;border-color:var(--wa)}
#evw .evq button[disabled]{opacity:.4}
#evw .pr{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;padding:8px 0;border-bottom:1px solid var(--bd)}
#evw .pr .evq{margin:0}
#evw .pr .evq button{flex:none;min-height:40px;min-width:44px}
#evw .cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
#evw .cal .dh{text-align:center;font-size:12px;color:var(--mu)}
#evw .cal button{min-height:46px;border-radius:8px;border:1px solid var(--bd);background:var(--bg);color:var(--tx);padding:2px}
#evw .cal button.today{border-color:var(--ac);font-weight:700}
#evw .cal button.sel{outline:3px solid var(--ac)}
#evw .cal small{display:block;font-size:9px;color:var(--ac)}
#evw .evl{display:inline-block;padding:2px 10px;border-radius:99px;font-weight:700;font-size:13px;margin:0 2px 4px 0}
#evw .evln{display:flex;gap:4px}
#evw .evln .chip{padding:8px 0;min-width:38px;text-align:center}
</style>`;
let autoMe = false;                                                   // vlastní záznam trenéra se předvybírá jen jednou za spuštění

// ===== Pomocné funkce =====
const pad = n => String(n).padStart(2, "0");
const staff = () => HK.isStaff();                                    // trenér / kustod (přihlášený uživatel)
const isPl = () => HK.role() === "hracka";                           // přihlášená hráčka (omezený přístup)
const dayOf = s => new Date(s + "T00:00:00");
const fDay = s => DAYS[dayOf(s).getDay()] + " " + fd(s);
const fDl = dl => { const d = new Date(dl); return isNaN(d) ? "" : d.getDate() + ". " + (d.getMonth() + 1) + ". " + pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const dlMs = dl => { const t = dl ? new Date(dl).getTime() : NaN; return isNaN(t) ? null : t; };
// Přihlašování je uzavřeno po termínu nebo po dni události
const isLocked = ev => { const t = dlMs(ev.dl); return (t != null && Date.now() > t) || ev.date < td(); };
// Výchozí termín: den před událostí v 18:00 (formát pro input datetime-local)
const defDl = date => { if (!date) return ""; const d = new Date(date + "T18:00:00"); d.setDate(d.getDate() - 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T18:00"; };
const asc = (x, y) => x.date.localeCompare(y.date) || (x.time || "99").localeCompare(y.time || "99");
const activePl = () => S.pl.filter(p => stOf(p) !== "end").sort((x, y) => pri(x) - pri(y) || x.name.localeCompare(y.name, "cs"));
// Členové realizačního týmu (trenéři, kustodi…) seřazení podle jména; zapisují se do docházky, neplatí a nenominují se
const trs = () => [...S.tr].sort((x, y) => (x.name || "").localeCompare(y.name || "", "cs"));
const isTr = id => S.tr.some(t => t.id === id);
// Jméno člena pro výpis (hráčka s číslem, nebo člen týmu s ikonou)
const who = id => { const t = S.tr.find(x => x.id === id); return pl(id) ? pn(id) : t ? "🎓 " + esc(t.name) : "?"; };
// Vlastní záznam přihlášeného trenéra / kustoda v realizačním týmu (propojení members/{email}.tid), nebo null
const myTr = () => { const t = isPl() ? null : HK.tid(); return t && isTr(t) ? S.tr.find(x => x.id === t) : null; };
// Sjednocený seznam událostí: tréninky (events) + zápasy (matches)
function allEvents() {
  const t = S.ev.map(e => ({id: e.id, type: "training", title: e.title || "Trénink", date: e.date || "", time: e.time || "", place: e.place || "", dl: e.dl || "", note: e.note || "", raw: e}));
  const m = S.ma.map(x => ({id: x.id, type: "match", title: "Zápas – " + x.opp, date: x.date || "", time: x.time || "", place: x.place || "", dl: x.dl || "", note: "", raw: x}));
  return [...t, ...m].filter(e => e.date);
}
// Odpovědi podle události a člena: AT[eventId][memberId]
function atMap() { const M = {}; S.at.forEach(a => { (M[a.eid] = M[a.eid] || {})[a.pid] = a; }); return M; }
function counts(ev, AT, P) {
  const r = {yes: 0, no: 0, maybe: 0, none: 0};
  P.forEach(p => { const a = (AT[ev.id] || {})[p.id]; if (a && r[a.st] != null) r[a.st]++; else r.none++; });
  return r;
}
// Přihlášení (odpověď „Jdu“) podle rolí: útočnice, obránkyně, brankářky, neurčeno a trenéři (realizační tým)
function roster(ev, AT) {
  const r = {u: 0, o: 0, g: 0, n: 0, t: 0};
  Object.values(AT[ev.id] || {}).forEach(a => {
    if (a.st !== "yes") return;
    const p = pl(a.pid);
    if (p) { if (stOf(p) === "end") return; if (isG(p)) r.g++; else if (p.pos === POS[1]) r.o++; else if (p.pos === POS[0]) r.u++; else r.n++; }
    else if (isTr(a.pid)) r.t++;
  });
  return r;
}
const rosterLine = r => `Útočnice: <b>${r.u}</b> · Obránkyně: <b>${r.o}</b> · Brankářky: <b>${r.g}</b>${r.n ? ` · Neurčeno: <b>${r.n}</b>` : ""} · Trenéři: <b>${r.t}</b>`;
const dlLine = (e, lk) => e.dl ? (lk ? "🔒 Přihlašování uzavřeno (" + fDl(e.dl) + ")" : "Přihlášení do " + fDl(e.dl)) : (lk ? "🔒 Uzavřeno" : "⚠️ Termín nenastaven");
const whenLine = e => fDay(e.date) + (e.time ? " · " + esc(e.time) : "") + (e.place ? " · " + esc(e.place) : "");

// ===== Zápis dat =====
function setAt(eid, pid, st, reason) {
  const u = HK.user();
  S.db.doc("attendance/" + eid + "_" + pid).set({eid, pid, st, reason: reason || "", at: new Date().toISOString(), by: (u && u.email) || ""})
    .catch(() => toast("Uložení se nepovedlo"));
}
const clearAt = (eid, pid) => S.db.doc("attendance/" + eid + "_" + pid).delete().catch(() => toast("Smazání se nepovedlo"));
// Změna odpovědi: „Jdu“ se zapíše hned (opakované klepnutí ji zruší), „Nejdu“ a „Nejsem jistý“ otevřou okno s důvodem.
// Hráčka smí měnit jen svoji odpověď a jen do termínu; trenér a kustod kdykoli a za kohokoli (i za člena realizačního týmu).
function answer(eid, pid, st) {
  const ev = allEvents().find(x => x.id === eid);
  if (!ev) return;
  if (!pid) return toast("Nejdřív vyber hráčku");
  if (isPl() && pid !== HK.pid()) return toast("Můžeš měnit jen svoji odpověď");
  if (isLocked(ev) && !staff()) return toast("Přihlašování je uzavřeno");
  const cur = (atMap()[eid] || {})[pid];
  if (st === "yes") { if (cur && cur.st === "yes") clearAt(eid, pid); else setAt(eid, pid, "yes", ""); return; }
  S.evr = {eid, pid, st, reason: cur && cur.st === st ? (cur.reason || "") : "", had: !!cur};
  render();
}
// Uložení rozdělení do pětek u tréninku (pětky jsou v poli lines: {hráčka: číslo pětky})
function saveLines(ev, lines) { const d = strip(clone(ev.raw)); d.lines = lines; S.db.doc("events/" + ev.id).set(d); }
// Rozdělení podle základní formace (jen hráčky, které jdou); partnerky z rotace ("1C+") patří do téže pětky
function baseLines(going) {
  const lu = (S.def || {}).lu || {}, r = {};
  Object.entries(lu).forEach(([k, id]) => { const n = +k[0]; if (n >= 1 && n <= 4 && going.includes(id)) r[id] = n; });
  return r;
}

// ===== Vykreslení: kalendář a seznam =====
function calHtml(evs, today) {
  const {y, m} = S.evc, off = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), by = {};
  evs.forEach(e => { by[e.date] = (by[e.date] || 0) + 1; });
  let cells = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map(d => `<div class="dh">${d}</div>`).join("") + "<div></div>".repeat(off);
  for (let d = 1; d <= n; d++) {
    const k = y + "-" + pad(m + 1) + "-" + pad(d);
    cells += `<button class="${k === today ? "today " : ""}${k === S.evd ? "sel" : ""}" data-cd="${k}">${d}${by[k] ? `<small>${"●".repeat(Math.min(by[k], 3))}</small>` : ""}</button>`;
  }
  return `<div class="cd"><div class="evh" style="margin-bottom:8px"><button class="s" data-cn="-1">◀</button><b>${MONTHS[m]} ${y}</b><button class="s" data-cn="1">▶</button></div><div class="cal">${cells}</div></div>`;
}
const quick = (e, mine, dis) => `<div class="evq">${ORD.map(k => `<button class="${mine && mine.st === k ? "on-" + k : ""}" data-qa="${e.id}|${k}" ${dis ? "disabled" : ""}>${ANS[k].ic} ${ANS[k].t}</button>`).join("")}</div>`;
function card(e, AT, P) {
  const c = counts(e, AT, P), mine = S.evp ? (AT[e.id] || {})[S.evp] : null, lk = isLocked(e) && !staff(), mt = e.type === "match", m = e.raw;
  const sc = mt && m.closed ? ` <span class="tag">🔒 ${score(m).join(":")}</span>` : "";
  const fee = feeOf(e), pay = fee && modeOf(e) !== "none" ? " · 💰 " + kc(fee) : "";
  return `<div class="cd evi" data-eo="${e.id}"><div class="evh"><b>${mt ? "🆚" : "🏒"} ${esc(e.title)}</b>${sc}</div>
<div class="mu">${whenLine(e)}${mt ? (m.home ? " · doma" : " · venku") : ""}${pay}</div>
<div class="mu">${dlLine(e, isLocked(e))} · ✅ ${c.yes} · ❓ ${c.maybe} · ❌ ${c.no}</div>
<div class="mu">Přihlášeno: ${rosterLine(roster(e, AT))}</div>
${quick(e, mine, lk || !S.evp)}${mine && mine.reason ? `<div class="mu" style="margin-top:6px">${esc(mine.reason)}</div>` : ""}</div>`;
}
function list(a) {
  const P = activePl(), AT = atMap(), evs = allEvents(), today = td(), pl_ = isPl();
  if (!S.evc) { const n = new Date(); S.evc = {y: n.getFullYear(), m: n.getMonth()}; }
  if (pl_) S.evp = HK.pid();                                          // hráčka zapisuje vždy jen sama za sebe
  else if (!S.evp) { const s = LS.get("evPlayer"); if (s) S.evp = s; }
  if (S.evp && !P.some(p => p.id === S.evp) && !isTr(S.evp)) S.evp = null;
  // Trenér / kustod propojený s realizačním týmem: při prvním otevření se předvybere sám (bez uloženého výběru)
  const me = myTr();
  if (me && !S.evp && !autoMe) { S.evp = me.id; autoMe = true; }
  const mode = S.evm === "pay" && !staff() ? "up" : (S.evm || "up");
  const T = trs();
  const modes = [["up", "Nadcházející"], ["past", "Minulé"], ["cal", "Kalendář"], ...(staff() ? [["pay", "💰 Platby"]] : [])];
  const chipsH = `<div class="chips">${modes.map(([k, t]) => `<button class="chip ${mode === k ? "on" : ""}" data-evm="${k}">${t}</button>`).join("")}</div>`;
  const errH = S.evErr ? `<div class="cd" style="color:var(--no)">Události, docházku nebo realizační tým se nepodařilo načíst (${esc(S.evErr)}). Zkontroluj pravidla databáze (firestore.rules).</div>` : "";
  const bindModes = () => a.querySelectorAll("[data-evm]").forEach(b => b.onclick = () => { S.evm = b.dataset.evm; S.evd = null; render(); });
  // Režim Platby: přehled plateb a dluhů (jen trenér a kustod)
  if (mode === "pay") {
    a.innerHTML = CSS + `<div id="evw">${errH}${chipsH}${financeHtml(evs, AT)}</div>`;
    bindModes(); bindFinance(a);
    return;
  }
  let shown;
  if (mode === "up") shown = evs.filter(e => e.date >= today).sort(asc);
  else if (mode === "past") shown = evs.filter(e => e.date < today).sort((x, y) => asc(y, x));
  else { const pre = S.evc.y + "-" + pad(S.evc.m + 1); shown = evs.filter(e => S.evd ? e.date === S.evd : e.date.startsWith(pre)).sort(asc); }
  const head = pl_
    ? (S.evp ? `<div class="cd"><div class="mu">Zapisuješ účast za</div><b>${pn(S.evp)}</b></div>` : '<div class="cd" style="color:var(--no)">Tvůj účet není propojen s aktivní hráčkou. Požádej trenéra.</div>')
    : `<div class="cd"><label>Zapisuji účast za</label><select id="evpl" style="margin-bottom:0"><option value="">— vyber —</option><optgroup label="Hráčky">${P.map(p => `<option value="${p.id}" ${p.id === S.evp ? "selected" : ""}>${esc((p.num ? "#" + p.num + " " : "") + p.name)}</option>`).join("")}</optgroup>${T.length ? `<optgroup label="Realizační tým">${T.map(t => `<option value="${t.id}" ${t.id === S.evp ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</optgroup>` : ""}</select>${me ? `<button class="s w" id="evme" style="margin-top:8px">👤 Přihlašuji se sám za sebe: ${esc(me.name)}</button>` : ""}</div>
<div class="row" style="margin-bottom:12px"><button class="p" id="evnt">+ Trénink</button><button class="s" id="evnm">+ Zápas</button></div>`;
  a.innerHTML = CSS + `<div id="evw">${errH}
${head}
${chipsH}
${mode === "cal" ? calHtml(evs, today) : ""}
${shown.length ? shown.map(e => card(e, AT, P)).join("") : '<div class="msg">Žádné události.</div>'}</div>` + sheetHtml();
  // Eventy seznamu
  const sel = a.querySelector("#evpl"), nt = a.querySelector("#evnt"), nm = a.querySelector("#evnm"), meB = a.querySelector("#evme");
  if (sel) sel.onchange = e => { S.evp = e.target.value || null; LS.set("evPlayer", S.evp || ""); render(); };
  if (meB) meB.onclick = () => { S.evp = me.id; LS.set("evPlayer", me.id); render(); };
  if (nt) nt.onclick = () => { S.evf = {id: null, type: "training", title: "Trénink", date: today, time: "", place: "", dl: defDl(today), note: "", lines: {}, dlAuto: true, fee: "", pm: "contrib", settle: null}; render(); };
  if (nm) nm.onclick = () => { S.M = {k: "NEW", date: today, opp: "", home: true}; modal(); };
  bindModes();
  a.querySelectorAll("[data-cn]").forEach(b => b.onclick = () => { const c = S.evc; c.m += +b.dataset.cn; if (c.m < 0) { c.m = 11; c.y--; } if (c.m > 11) { c.m = 0; c.y++; } S.evd = null; render(); });
  a.querySelectorAll("[data-cd]").forEach(b => b.onclick = () => { S.evd = S.evd === b.dataset.cd ? null : b.dataset.cd; render(); });
  a.querySelectorAll("[data-eo]").forEach(c => c.onclick = () => { S.evid = c.dataset.eo; render(); window.scrollTo(0, 0); });
  a.querySelectorAll("[data-qa]").forEach(b => b.onclick = ev => { ev.stopPropagation(); const [eid, st] = b.dataset.qa.split("|"); answer(eid, S.evp, st); });
  bindSheet(a);
}

// ===== Vykreslení: detail události =====
// Rozdělení do pětek (jen trénink): hráčky, které jdou, a barevné volby 1.–4. pětky; hráčka vidí rozdělení jen ke čtení
function linesHtml(ev, A, P, ro) {
  const going = P.filter(p => A[p.id] && A[p.id].st === "yes" && !isG(p)), L = ev.raw.lines || {};
  const cnt = n => going.filter(p => L[p.id] === n).length, free = going.filter(p => !L[p.id]).length;
  const row = p => ro
    ? `<div class="pr"><div>${pn(p.id)}</div><div>${L[p.id] ? `<span class="evl L${L[p.id]}">${L[p.id]}. pětka</span>` : '<span class="mu">–</span>'}</div></div>`
    : `<div class="pr"><div>${pn(p.id)}</div><div class="evln">${[0, 1, 2, 3, 4].map(n => `<button class="chip ${(L[p.id] || 0) === n ? (n ? "L" + n : "on") : ""}" data-ln="${p.id}|${n}">${n || "–"}</button>`).join("")}</div></div>`;
  return `<div class="cd"><h2>Rozdělení do pětek</h2><div class="mu" style="margin-bottom:8px">Z hráček, které jdou (bez brankářek). Barvy jako v živém zápisu.</div>
<div style="margin-bottom:10px">${[1, 2, 3, 4].map(n => `<span class="evl L${n}">${n}. pětka: ${cnt(n)}</span>`).join("")}<span class="evl L0">bez pětky: ${free}</span></div>
${ro ? "" : '<div class="row" style="margin-bottom:8px"><button class="s" id="evlb">↻ Podle základní formace</button><button class="s" id="evlc">Vymazat</button></div>'}
${going.length ? going.map(row).join("") : '<div class="msg">Zatím se nikdo nepřihlásil.</div>'}</div>`;
}
function detail(a, ev) {
  const P = activePl(), AT = atMap(), A = AT[ev.id] || {}, c = counts(ev, AT, P), lk = isLocked(ev), mt = ev.type === "match", ownP = isPl(), me = HK.pid();
  const can = !lk || staff(), T = trs();
  const rows = P.map((p, i) => {
    const x = A[p.id], mine = p.id === me, ok = can && (!ownP || mine);   // hráčka mění jen svůj řádek
    const showReason = x && x.reason && (!ownP || mine);                // důvody ostatních vidí jen trenér a kustod
    return (i === 0 || pri(P[i - 1]) !== pri(p) ? `<div class="lnl">${PG[pri(p)]}</div>` : "") +
      `<div class="pr"><div>${p.id === S.evp ? "<b>" : ""}${pn(p.id)}${p.id === S.evp ? "</b>" : ""}${x && ANS[x.st] ? ` <span class="tag ${ANS[x.st].cls}">${ANS[x.st].t}</span>` : ""}${showReason ? `<div class="mu">${esc(x.reason)}</div>` : ""}</div><div class="evq">${ORD.map(k => `<button class="${x && x.st === k ? "on-" + k : ""}" data-pa="${p.id}|${k}" ${ok ? "" : "disabled"}>${ANS[k].ic}</button>`).join("")}</div></div>`;
  }).join("");
  // Realizační tým: odpovědi mění jen trenér a kustod, hráčka je vidí jen ke čtení (bez důvodů)
  const trRows = T.map((t, i) => {
    const x = A[t.id], ok = can && !ownP, showReason = x && x.reason && !ownP;
    return (i === 0 ? '<div class="lnl">Realizační tým</div>' : "") +
      `<div class="pr"><div>${t.id === S.evp ? "<b>" : ""}🎓 ${esc(t.name)}${t.id === S.evp ? "</b>" : ""} <span class="mu">${esc(t.kind || "")}</span>${x && ANS[x.st] ? ` <span class="tag ${ANS[x.st].cls}">${ANS[x.st].t}</span>` : ""}${showReason ? `<div class="mu">${esc(x.reason)}</div>` : ""}</div><div class="evq">${ORD.map(k => `<button class="${x && x.st === k ? "on-" + k : ""}" data-pa="${t.id}|${k}" ${ok ? "" : "disabled"}>${ANS[k].ic}</button>`).join("")}</div></div>`;
  }).join("");
  const key = "ev" + ev.id, fee = feeOf(ev);
  const btns = ownP ? "" : `<div class="row" style="margin-top:10px">${mt ? '<button class="p" id="evo">🏒 Otevřít zápas</button>' : ""}<button class="s" id="eve">✏️ ${mt ? "Čas, místo, termín, cena" : "Upravit"}</button>${mt ? "" : `<button class="d" id="evd" style="${S.cf === key ? "background:var(--no);color:#fff" : ""}">${S.cf === key ? "Opravdu smazat? Klepni znovu" : "🗑 Smazat"}</button>`}</div>`;
  a.innerHTML = CSS + `<div id="evw"><button class="s" id="evb" style="margin-bottom:12px">← Události</button>
<div class="cd"><div class="evh"><b style="font-size:18px">${mt ? "🆚" : "🏒"} ${esc(ev.title)}</b></div><div class="mu">${whenLine(ev)}${mt ? (ev.raw.home ? " · doma" : " · venku") : ""}${fee && modeOf(ev) !== "none" ? " · 💰 " + kc(fee) : ""}</div><div class="mu" style="margin-top:4px">${dlLine(ev, lk)}</div>${ev.note ? `<div style="margin-top:6px">${esc(ev.note)}</div>` : ""}
<div class="grid3" style="margin-top:10px"><div class="stat"><b>${c.yes}</b>jdou</div><div class="stat"><b>${c.maybe}</b>nejistí</div><div class="stat"><b>${c.no}</b>nejdou</div></div>${c.none ? `<div class="mu">Bez odpovědi: ${c.none}</div>` : ""}<div class="mu" style="margin-top:6px">Přihlášeno: ${rosterLine(roster(ev, AT))}</div>${btns}</div>
<div class="cd"><h2>Docházka</h2>${lk ? `<div class="mu" style="margin-bottom:6px">${staff() ? "Termín vypršel – jako trenér můžeš odpovědi stále měnit." : "Přihlašování je uzavřeno."}</div>` : ""}${ownP ? '<div class="mu" style="margin-bottom:6px">Měnit můžeš jen svůj řádek.</div>' : ""}${rows || '<div class="msg">Žádné hráčky.</div>'}${trRows}</div>
${payHtml(ev)}
${mt ? "" : linesHtml(ev, A, P, ownP)}</div>` + sheetHtml();
  // Eventy detailu
  a.querySelector("#evb").onclick = () => { S.evid = null; render(); };
  a.querySelectorAll("[data-pa]").forEach(b => b.onclick = () => { const [pid, st] = b.dataset.pa.split("|"); answer(ev.id, pid, st); });
  bindSheet(a);
  bindPay(a, ev);
  if (ownP) return;                                                   // zbytek jsou správcovské akce (jen trenér a kustod)
  const eo = a.querySelector("#evo");
  if (eo) eo.onclick = () => { S.mid = ev.id; S.showLu = false; S.showNom = false; S.step = 1; S.evid = null; render(); window.scrollTo(0, 0); };
  a.querySelector("#eve").onclick = () => { S.evf = {id: ev.id, type: ev.type, title: ev.title, date: ev.date, time: ev.time, place: ev.place, dl: ev.dl || defDl(ev.date), note: ev.note, lines: ev.raw.lines || {}, dlAuto: !ev.dl, fee: ev.raw.fee != null ? String(ev.raw.fee) : "", pm: modeOf(ev), settle: ev.raw.settle || null}; render(); };
  const ed = a.querySelector("#evd");
  if (ed) ed.onclick = () => {
    if (S.cf === key) {
      S.cf = null;
      S.at.filter(x => x.eid === ev.id).forEach(x => S.db.doc("attendance/" + x.id).delete());
      S.pay.filter(x => x.eid === ev.id).forEach(x => S.db.doc("payments/" + x.id).delete());
      S.db.doc("events/" + ev.id).delete(); S.evid = null; render();
    } else { S.cf = key; render(); setTimeout(() => { if (S.cf === key) { S.cf = null; render(); } }, 4000); }
  };
  a.querySelectorAll("[data-ln]").forEach(b => b.onclick = () => {
    const [pid, n] = b.dataset.ln.split("|"), l = {...(ev.raw.lines || {})};
    if (+n) l[pid] = +n; else delete l[pid];
    saveLines(ev, l);
  });
  const lb = a.querySelector("#evlb"), lc = a.querySelector("#evlc");
  if (lb) lb.onclick = () => saveLines(ev, baseLines(P.filter(p => A[p.id] && A[p.id].st === "yes" && !isG(p)).map(p => p.id)));
  if (lc) lc.onclick = () => saveLines(ev, {});
}

// ===== Vykreslení: okno s důvodem =====
function sheetHtml() {
  const r = S.evr;
  if (!r) return "";
  const A = ANS[r.st];
  return `<div class="md" id="evsh"><div class="mb"><h2>${A.ic} ${A.t}</h2><div class="mu" style="margin-bottom:8px">${who(r.pid)}</div><label>Důvod${r.st === "no" ? "" : " (nepovinný)"}</label><div class="chips">${REASONS.map(x => `<button class="chip ${r.reason === x ? "on" : ""}" data-rr="${x}">${x}</button>`).join("")}</div><input id="evrs" value="${esc(r.reason)}" placeholder="Vlastní důvod"><div class="row"><button class="p" id="evrk">Uložit</button><button class="s" id="evrc">Zavřít</button></div>${r.had ? '<button class="d w" id="evrd" style="margin-top:8px">Zrušit odpověď</button>' : ""}</div></div>`;
}
function bindSheet(a) {
  const r = S.evr;
  if (!r) return;
  const el = id => document.getElementById(id), inp = el("evrs");
  inp.oninput = () => { r.reason = inp.value; };
  a.querySelectorAll("[data-rr]").forEach(b => b.onclick = () => { r.reason = b.dataset.rr; render(); });
  el("evrc").onclick = () => { S.evr = null; render(); };
  el("evsh").onclick = e => { if (e.target.id === "evsh") { S.evr = null; render(); } };
  const d = el("evrd");
  if (d) d.onclick = () => { clearAt(r.eid, r.pid); S.evr = null; render(); };
  el("evrk").onclick = () => {
    const t = inp.value.trim();
    if (r.st === "no" && !t) return toast("Zadej důvod");
    setAt(r.eid, r.pid, r.st, t); S.evr = null; render();
  };
}

// ===== Vykreslení: formulář události =====
// Trénink: všechna pole; zápas: jen čas, místo, termín přihlašování, cena a způsob úhrady (ostatní údaje zápasu se mění v kartě zápasu)
function formView(a) {
  const f = S.evf, mt = f.type === "match";
  a.innerHTML = CSS + `<div id="evw"><button class="s" id="evfx" style="margin-bottom:12px">← Zpět</button><div class="cd"><h2>${mt ? "Zápas – čas, místo, termín, cena" : f.id ? "Upravit trénink" : "Nový trénink"}</h2>
${mt ? `<div class="mu" style="margin-bottom:8px">${esc(f.title)} · ${fDay(f.date)}</div>` : `<label>Název</label><input id="ft" value="${esc(f.title)}"><label>Datum</label><input type="date" id="fd" value="${esc(f.date)}">`}
<label>Čas začátku</label><input type="time" id="fti" value="${esc(f.time)}"><label>Místo</label><input id="fp" value="${esc(f.place)}">
<label>Konečný termín přihlašování</label><input type="datetime-local" id="fdl" value="${esc(f.dl)}">
<label>Cena události (Kč)</label><input type="number" min="0" step="1" inputmode="numeric" id="ffee" value="${esc(f.fee)}" style="max-width:160px">
<label>Způsob úhrady</label><div class="chips">${Object.entries(MODES).map(([k, t]) => `<button class="chip ${f.pm === k ? "on" : ""}" data-pm="${k}">${t}</button>`).join("")}</div><div class="mu" style="margin-bottom:10px">${HINTS[f.pm]}</div>
${mt ? "" : `<label>Poznámka</label><input id="fn" value="${esc(f.note)}">`}
<button class="p w" id="evfs" style="min-height:52px">Uložit</button></div></div>`;
  const g = id => { const e = document.getElementById(id); return e ? e.value : null; };
  // Přepsání polí do stavu formuláře (před každým překreslením)
  const readF = () => {
    if (g("ft") != null) f.title = g("ft").trim();
    if (g("fd") != null) f.date = g("fd");
    f.time = g("fti") || ""; f.place = (g("fp") || "").trim(); f.dl = g("fdl") || "";
    f.fee = (g("ffee") || "").trim();
    if (g("fn") != null) f.note = g("fn").trim();
  };
  const fd_ = document.getElementById("fd");
  if (fd_) fd_.onchange = () => { readF(); if (f.dlAuto) f.dl = defDl(f.date); render(); };
  document.getElementById("fdl").oninput = () => { f.dlAuto = false; };
  a.querySelectorAll("[data-pm]").forEach(b => b.onclick = () => { readF(); f.pm = b.dataset.pm; render(); });
  document.getElementById("evfx").onclick = () => { S.evf = null; render(); };
  document.getElementById("evfs").onclick = () => {
    readF();
    if (!f.date) return toast("Zadej datum");
    if (!f.dl) return toast("Zadej konečný termín přihlašování");
    if (new Date(f.dl) > new Date(f.date + "T" + (f.time || "23:59"))) return toast("Termín přihlašování musí být před začátkem události");
    const fee = Math.max(0, Math.round((+f.fee || 0) * 100) / 100);
    if (mt) {
      const m = S.ma.find(x => x.id === f.id);
      if (!m) { S.evf = null; return render(); }
      const n = clone(m); n.time = f.time; n.place = f.place; n.dl = f.dl; n.fee = fee; n.pm = f.pm;
      S.evf = null; return upd(n);
    }
    const d = {type: "training", title: f.title || "Trénink", date: f.date, time: f.time, place: f.place, dl: f.dl, note: f.note || "", lines: f.lines || {}, fee, pm: f.pm};
    if (f.settle) d.settle = f.settle;                                // snímek vyúčtování se úpravou tréninku neztratí
    if (f.id) S.db.doc("events/" + f.id).set(d); else S.db.collection("events").add(d);
    S.evf = null; render();
  };
}

// ===== Export =====
export function eventsView(a) {
  if (S.evf && !isPl()) return formView(a);
  if (S.evid) { const ev = allEvents().find(x => x.id === S.evid); if (ev) return detail(a, ev); S.evid = null; }
  list(a);
}
