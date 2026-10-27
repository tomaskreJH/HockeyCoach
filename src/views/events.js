// Záložka Události: Nadcházející / Minulé / Kalendář / 📊 Docházka, karta události s rychlými tlačítky ✅ ❌ ❓ (za propojenou hráčku,
// jinak za člena realizačního týmu – selfMember), řádek stavu 💰 vyúčtování / 🏒 tréninku (event-badges.js), + Trénink / + Zápas. Detail: event-detail.js, formulář: event-form.js, základ: event-core.js.
// Režimy pokladny v záložce Team (💰 Platby, 🏦 Pokladna, 🧾 Náklady, 📅 Měsíce, 📊 Rozpočet) vykresluje cashPanel().

// ===== Importy =====
import {score} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, td} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {costTotal, kc} from "../domain/cash.js";
import {cancelText, isCancelled} from "../domain/event-cancel.js";
import {selfMember, sortEvents} from "../domain/event-helpers.js";
import {attReqBanner, attReqModal, bindAttReqAdmin} from "./att-request-view.js";
import {attHtml, bindAtt} from "./attendance.js";
import {bindBudget, budgetHtml} from "./budget-view.js";
import {bindCashbook, cashbookHtml} from "./cashbook.js";
import {bindCost, costHtml} from "./cost-view.js";
import {activePl, allEvents, ANS, answer, atMap, bindSheet, cashMgr, counts, CSS, defDl, defs, dlLine, guest, isLocked, isPl, MONTHS, ORD, pad, restLine, roster, rosterLine, sheetHtml, staff, titleLine} from "./event-core.js";
import {ensureTrainStatus, forgetTrainStatus, statusLine} from "./event-badges.js";
import {detail} from "./event-detail.js";
import {formView} from "./event-form.js";
import {bindFinance, financeHtml} from "./finance.js";
import {bindBanner, mineBanner} from "./mine.js";
import {modal} from "./modal.js";
import {bindMoney, moneyHtml} from "./money.js";
import {render} from "./shell.js";

// ===== Konstanty =====
// Režimy pokladny v záložce Team (jen správci pokladny); klíč = hodnota S.tm
const CASH_MODES = [["pay", "💰 Platby"], ["cash", "🏦 Pokladna"], ["cost", "🧾 Náklady"], ["mon", "📅 Měsíce"], ["bud", "📊 Rozpočet"]];

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
// Rychlá tlačítka na kartě: moje odpověď a počet odpovědí týmu (c = counts) v každém tlačítku
const quick = (e, mine, dis, c) => `<div class="evq">${ORD.map(k => `<button class="${mine && mine.st === k ? "on-" + k : ""}" data-qa="${e.id}|${k}" ${dis ? "disabled" : ""}>${ANS[k].ic} ${ANS[k].t} <b class="evqn">${c[k]}</b></button>`).join("")}</div>`;
function card(e, AT, P) {
  const c = counts(e, AT, P), mine = S.evp ? (AT[e.id] || {})[S.evp] : null, cn = isCancelled(e), lk = (isLocked(e) && !staff()) || cn, mt = e.type === "match", m = e.raw, g = guest();
  const sc = cn ? ' <span class="tag red">❌ Zrušeno</span>' : mt && m.closed ? ` <span class="tag">🔒 ${score(m).join(":")}</span>` : "";
  const tot = cashMgr() ? costTotal(e.cx) : 0, pay = tot ? " · 💰 náklady " + kc(tot) : "";   // náklady jen pro správce pokladny
  // Hostující nevidí počty ostatních: rychlá tlačítka bez čísel, bez řádku Přihlášeno
  const cq = g ? {yes: "", no: "", maybe: ""} : c;
  const rl = restLine(e);
  return `<div class="cd evi" data-eo="${e.id}"${cn ? ' style="opacity:.7"' : ""}><div class="evh"><b>${titleLine(e, cn)}</b>${sc}</div>
<div class="mu">${rl}${mt ? (m.home ? " · doma" : " · venku") : ""}${pay}</div>
<div class="mu">${cn ? esc(cancelText(m)) : dlLine(e, isLocked(e))}${S.evp || g ? "" : ` · ✅ ${c.yes} · ❓ ${c.maybe} · ❌ ${c.no}`}</div>
${g ? "" : `<div class="mu">${rosterLine(roster(e, AT))}</div>`}
${statusLine(e)}
${S.evp ? quick(e, mine, lk, cq) : ""}${mine && mine.reason ? `<div class="mu" style="margin-top:6px">${esc(mine.reason)}</div>` : ""}</div>`;
}
function list(a) {
  const P = activePl(), AT = atMap(), evs = allEvents(), today = td(), pl_ = isPl();
  if (!S.evc) { const n = new Date(); S.evc = {y: n.getFullYear(), m: n.getMonth()}; }
  // Za koho platí rychlá tlačítka na kartě: propojená hráčka má přednost (i u managera / trenéra / asistenta, který je zároveň hráčka),
  // jinak člen realizačního týmu (members/{email}.tid); hráčka nikdy za člena týmu (domain/event-helpers.js – selfMember)
  S.evp = selfMember(HK.pid(), pl_ ? null : HK.tid(), P.map(p => p.id), S.tr.map(t => t.id), pl_);
  // Dřívější režimy pokladny (pay / cash / mon) jsou v záložce Team; tady zůstávají Nadcházející, Minulé, Kalendář a Docházka
  // Hostující nemá přehled Docházky (vidí jen sebe)
  const modes = [["up", "Nadcházející"], ["past", "Minulé"], ["cal", "Kalendář"], ...(guest() || !HK.perm("attview", "r") ? [] : [["att", "📊 Docházka"]])];
  const mode = modes.some(([k]) => k === S.evm) ? S.evm : "up";
  const chipsH = `<div class="chips">${modes.map(([k, t]) => `<button class="chip ${mode === k ? "on" : ""}" data-evm="${k}">${t}</button>`).join("")}</div>`;
  const errH = S.evErr ? `<div class="cd" style="color:var(--no)">Události, docházku nebo realizační tým se nepodařilo načíst (${esc(S.evErr)}). Zkontroluj pravidla databáze (firestore.rules).</div>` : "";
  let shown;
  // Nadcházející vzestupně (nejbližší nahoře), Minulé a Kalendář sestupně (nejnovější nahoře)
  if (mode === "up") shown = sortEvents(evs.filter(e => e.date >= today), "up");
  else if (mode === "past") shown = sortEvents(evs.filter(e => e.date < today), "past");
  else if (mode === "att") shown = [];
  else { const pre = S.evc.y + "-" + pad(S.evc.m + 1); shown = sortEvents(evs.filter(e => S.evd ? e.date === S.evd : e.date.startsWith(pre)), "cal"); }
  ensureTrainStatus(shown);   // 🏒 stav jen zobrazených tréninků pro trenéry (📉 čtení po dokumentech, překreslí se samo)
  // Hlavička: hráčka bez propojení dostane upozornění; správce tlačítka pro založení události
  const head = pl_
    ? (S.evp ? "" : '<div class="cd" style="color:var(--no)">Tvůj účet není propojen s aktivní hráčkou. Požádej trenéra.</div>')
    : `<div class="row" style="margin-bottom:12px">${HK.perm("events", "e") ? '<button class="p" id="evnt">+ Trénink</button>' : ""}<button class="s" id="evnm">+ Zápas</button></div>`;
  a.innerHTML = CSS + `<div id="evw">${errH}
${mineBanner()}
${attReqBanner()}
${head}
${chipsH}
${mode === "cal" ? calHtml(evs, today) : ""}
${mode === "att" ? attHtml() : shown.length ? shown.map(e => card(e, AT, P)).join("") : '<div class="msg">Žádné události.</div>'}</div>` + sheetHtml() + attReqModal();
  // Eventy seznamu
  const nt = a.querySelector("#evnt"), nm = a.querySelector("#evnm");
  if (nt) nt.onclick = () => { S.evf = {id: null, type: "training", title: "Trénink", date: today, time: "", end: "", endAuto: true, meet: defs().meetT, place: "", dl: defDl(today), note: "", dlAuto: true}; render(); };
  if (nm) nm.onclick = () => { S.M = {k: "NEW", date: today, opp: "", home: true}; modal(); };
  a.querySelectorAll("[data-evm]").forEach(b => b.onclick = () => { S.evm = b.dataset.evm; S.evd = null; render(); });
  bindBanner(a);
  bindAttReqAdmin(a);
  if (mode === "att") bindAtt(a);
  a.querySelectorAll("[data-cn]").forEach(b => b.onclick = () => { const c = S.evc; c.m += +b.dataset.cn; if (c.m < 0) { c.m = 11; c.y--; } if (c.m > 11) { c.m = 0; c.y++; } S.evd = null; render(); });
  a.querySelectorAll("[data-cd]").forEach(b => b.onclick = () => { S.evd = S.evd === b.dataset.cd ? null : b.dataset.cd; render(); });
  a.querySelectorAll("[data-eo]").forEach(c => c.onclick = () => { forgetTrainStatus(c.dataset.eo); S.evid = c.dataset.eo; S.evBack = null; render(); window.scrollTo(0, 0); });
  a.querySelectorAll("[data-qa]").forEach(b => b.onclick = ev => { ev.stopPropagation(); const [eid, st] = b.dataset.qa.split("|"); answer(eid, S.evp, st); });
  bindSheet(a);
}

// ===== Vykreslení: režimy pokladny pro záložku Team =====
// Vykreslí přepínač (předaný jako head) a vybraný režim S.tm: Platby, Pokladna, Náklady (cost-view.js), Měsíce, nebo Rozpočet (budget-view.js). Jen pro správce pokladny.
// Vrací false, pokud se režim pokladny nevykresluje (pak Team vykreslí formaci a soupisku).
export function cashPanel(a, head) {
  if (!cashMgr() || !CASH_MODES.some(([k]) => k === S.tm)) return false;
  const errH = S.evErr ? `<div class="cd" style="color:var(--no)">Události nebo docházku se nepodařilo načíst (${esc(S.evErr)}).</div>` : "";
  const body = S.tm === "pay" ? financeHtml(allEvents(), atMap()) : S.tm === "cash" ? cashbookHtml() : S.tm === "cost" ? costHtml() : S.tm === "bud" ? budgetHtml() : moneyHtml();
  a.innerHTML = CSS + `<div id="evw">${errH}${head}${body}</div>`;
  if (S.tm === "pay") bindFinance(a); else if (S.tm === "cash") bindCashbook(a); else if (S.tm === "cost") bindCost(a); else if (S.tm === "bud") bindBudget(a); else bindMoney(a);
  return true;
}
export {CASH_MODES};

// ===== Export =====
export function eventsView(a) {
  if (S.evf && !isPl()) return formView(a);
  if (S.evid) { const ev = allEvents().find(x => x.id === S.evid); if (ev) return detail(a, ev); S.evid = null; }
  list(a);
}
