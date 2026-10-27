// Záložka Události: Nadcházející / Minulé / Kalendář / 📊 Docházka, karta události (event-core.js – cardHtml) s rychlými tlačítky ✅ ❌ ❓ (za propojenou hráčku,
// jinak za člena realizačního týmu – selfMember), 📉 hráčka vidí 15 dní dopředu a 8 dní zpět (další tlačítkem), řádek stavu 💰 vyúčtování / 🏒 tréninku (event-badges.js), + Trénink / + Zápas. Detail: event-detail.js, formulář: event-form.js, základ: event-core.js.
// Režimy pokladny v záložce Team (💰 Platby, 🏦 Pokladna, 🧾 Náklady, 📅 Měsíce, 📊 Rozpočet) vykresluje cashPanel().

// ===== Importy =====
import {S} from "../core/state.js";
import {esc, fd, td} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {WIN_DAYS, dayAdd} from "../domain/data-window.js";
import {selfMember, sortEvents} from "../domain/event-helpers.js";
import {attReqBanner, attReqModal, bindAttReqAdmin} from "./att-request-view.js";
import {attHtml, bindAtt} from "./attendance.js";
import {bindBudget, budgetHtml} from "./budget-view.js";
import {bindCashbook, cashbookHtml} from "./cashbook.js";
import {bindCost, costHtml} from "./cost-view.js";
import {activePl, allEvents, answer, atMap, bindSheet, cardHtml, cashMgr, CSS, guest, isPl, MONTHS, pad, sheetHtml} from "./event-core.js";
import {ensureTrainStatus, forgetTrainStatus} from "./event-badges.js";
import {detail} from "./event-detail.js";
import {formView, newTraining} from "./event-form.js";
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
// 📉 Hráčka: tlačítko pro vzdálenější budoucnost (poslech až na vyžádání) a pro starší minulé události (jen z paměti, bez čtení)
const farBtn = f => (f ? `<button class="s w" id="evfar" style="margin:4px 0 12px">⬇ Načíst další události (od ${fd(f.to)})</button>` : "");
const oldBtn = n => (n ? `<button class="s w" id="evold" style="margin:4px 0 12px">⬇ Starší události (${n})</button>` : "");
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
  let shown, more = "";
  // 📉 Hráčka: nadcházející jen do far.to (15 dní, dál po Načíst další), minulé jen posledních WIN_DAYS.other dní (starší tlačítkem)
  const far = pl_ && HK.farInfo ? HK.farInfo() : null, oldFrom = pl_ && !S.evOld ? dayAdd(today, -WIN_DAYS.other) : "";
  // Nadcházející vzestupně (nejbližší nahoře), Minulé a Kalendář sestupně (nejnovější nahoře)
  if (mode === "up") { shown = sortEvents(evs.filter(e => e.date >= today && (!far || e.date < far.to)), "up"); more = farBtn(far); }
  else if (mode === "past") {
    const past = evs.filter(e => e.date < today);
    shown = sortEvents(past.filter(e => e.date >= oldFrom), "past");
    more = oldBtn(past.length - shown.length);
  }
  else if (mode === "att") shown = [];
  else {
    const pre = S.evc.y + "-" + pad(S.evc.m + 1);
    shown = sortEvents(evs.filter(e => S.evd ? e.date === S.evd : e.date.startsWith(pre)), "cal");
    if (far && pre + "-31" >= far.to) more = farBtn(far);                // zobrazený měsíc sahá za načtené období
  }
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
${mode === "att" ? attHtml() : shown.length ? shown.map(e => cardHtml(e, AT, P)).join("") : '<div class="msg">Žádné události.</div>'}${more}</div>` + sheetHtml() + attReqModal();
  // Eventy seznamu
  const nt = a.querySelector("#evnt"), nm = a.querySelector("#evnm");
  if (nt) nt.onclick = () => { S.evf = newTraining(today); render(); };
  if (nm) nm.onclick = () => { S.M = {k: "NEW", date: today, opp: "", home: true}; modal(); };
  a.querySelectorAll("[data-evm]").forEach(b => b.onclick = () => { S.evm = b.dataset.evm; S.evd = null; render(); });
  const fb = a.querySelector("#evfar"), ob = a.querySelector("#evold");
  if (fb) fb.onclick = () => { fb.disabled = true; fb.textContent = "Načítám…"; HK.farListen(); };   // překreslí se po načtení dat
  if (ob) ob.onclick = () => { S.evOld = true; render(); };
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
