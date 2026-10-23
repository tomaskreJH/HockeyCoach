// Události a docházka: seznam, kalendář, přihlašování (jdu / nejdu / nejsem jistý), detail události, rozdělení do pětek na tréninku.
// Záložka Události řeší jen události (Nadcházející / Minulé / Kalendář / Docházka); správce odklikává docházku v detailu události;
// rychlá tlačítka na kartě platí za přihlášenou hráčku, nebo za trenéra / kustoda propojeného s realizačním týmem (jinak se na kartě nezobrazí).
// Režimy Platby, Pokladna, Měsíce a Rozpočet jsou v záložce Team (vykresluje je cashPanel() z tohoto souboru, volá ho views/team.js).
// V detailu události je pokladna (vyúčtování) až na konci stránky, nahoře jsou údaje pro trénink a hokej.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Zápis dat -> Vykreslení (seznam, kalendář, detail, formulář, okno s důvodem) -> Eventy -> Export.
// Data: kolekce "events" (tréninky); zápasy se berou z "matches" (čas, místo a termín přihlašování jsou v polích time, place, dl zápasu);
// odpovědi jsou v kolekci "attendance" (id dokumentu = {eventId}_{memberId}), členem je hráčka nebo člen realizačního týmu (kolekce "staff").
// Role: trenér a kustod spravují vše a zapisují odpovědi za kohokoli; hráčka (HK.can("onlyOwn")) vidí události, mění jen svoji odpověď
// a jen do termínu přihlašování. Kartu zápasu má jen trenér a kustod.
// Trenér / kustod propojený s členem realizačního týmu (members/{email}.tid, ⚙️ → Členové týmu) se přihlašuje jedním klepnutím přímo na kartě události.
// Náklady a platby vidí jen správci pokladny (HK.can("money"): trenér a pokladník); data jsou v kolekci evcash (e.cx), ostatním zůstává jen příznak raw.ss. Člen s dluhem po splatnosti se nemůže přihlásit „Jdu“. Pokladna u události: views/payments.js, domain/cash.js;
// přehled plateb a dluhů: views/finance.js (Team → „💰 Platby“); pohyby pokladny: views/cashbook.js (Team → „🏦 Pokladna“);
// příspěvky, platy, hospodaření po měsících a CSV: views/money.js (Team → „📅 Měsíce“, F4); rozpočet sezóny: views/budget-view.js (Team → „📊 Rozpočet“).
// Statistiky uzavřeného zápasu vidí v detailu události každý člen (i hráčka, která nemá přístup ke kartě zápasu); tlačítko 📋 Zápis utkání
// otevře celý zápis (views/report.js, okno #rp, S.rp = id zápasu) – stejně jako v záložce Soupeři, jen ke čtení a exportu.
// Řazení: Nadcházející vzestupně, Minulé a Kalendář sestupně (domain/event-helpers.js). Pětky tréninku: hráčky a přihlášení členové
// realizačního týmu (klíč "t:" + id v events.lines).
// Přepínač „Docházka“ (S.evm = "att") – přehled docházky pro všechny členy (views/attendance.js, výpočet domain/attendance.js);
// v detailu události má dlužnice po splatnosti u jména značku ⛓ (výjimka 🔓) podle veřejného souhrnu debtors (bez částek).
// Důvod omluvy je v samostatné kolekci attnote/{eid}_{mid} (čte vlastník a trenér / kustod) – zapisuje se v jedné dávce s odpovědí;
// S.at má důvod už připojený (main.js). Blokace „Jdu“ za jiného člena se ověřuje i podle souhrnu debtors (cizí předpisy nejsou v zařízení).
// Série tréninků (🔁 Opakovat, úprava a smazání „jen tato / tato a další“): views/event-series.js, výpočty domain/recurrence.js.
// Čas od – do (konec tréninku events.end) a ⏰ sraz (pole meet = minuty před začátkem, trénink i zápas) – výpočty domain/event-time.js,
// výchozí hodnoty settings/events (S.es, ⚙️ → ⏰ Nastavení událostí). Rychlá tlačítka na kartě ukazují počty ✅ / ❌ / ❓.
// 🚫 Nedorazila bez omluvy: trenér / kustod v detailu po začátku události označí hráčku s odpovědí „Jdu“ (attendance.nos, merge; hráčka ji nezmění).

// ===== Importy =====
import {POS} from "../config/constants.js";
import {confirm2, upd} from "../core/actions.js";
import {PG, isG, pl, pn, pri, score, stOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {clone, dlBeforeStart, dlDefault, dlText, esc, fd, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {canNos, isNos, nosCount, nosPatch, startMs} from "../domain/attendance.js";
import {costTotal, cxOf, kc} from "../domain/cash.js";
import {memberBlocked} from "../domain/debtors.js";
import {LINE_NOS, answerCounts, baseLines, lineCounts, setLine, sortEvents, trKey} from "../domain/event-helpers.js";
import {MEET_MAX, clampMin, defEnd, endOk, evDefaults, meetAt, meetDefault, meetOf, okTime, timeFields, timeParts} from "../domain/event-time.js";
import {NOTE_COLL, attDoc, noteDoc, noteId} from "../domain/private-data.js";
import {bindCashbook, cashbookHtml} from "./cashbook.js";
import {bindFinance, financeHtml} from "./finance.js";
import {modal} from "./modal.js";
import {bindBanner, mineBanner} from "./mine.js";
import {bindMoney, moneyHtml} from "./money.js";
import {bindPay, payHtml} from "./payments.js";
import {bindRep, bindScope, bindSerDel, repHtml, repOn, repSave, repSaveText, scopeHtml, serDelBtn, serEditSave, serLine} from "./event-series.js";
import {attHtml, bindAtt, debtTag} from "./attendance.js";
import {bindBudget, budgetHtml} from "./budget-view.js";
import {matchStatsHtml, renderReport} from "./report.js";
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
#evw .evq button.evns{border-style:dashed}
#evw .evq button.evns.on{background:var(--no);color:#fff;border-color:var(--no);border-style:solid}
#evw .evq button[disabled]{opacity:.4}
#evw .evq .evqn{display:inline-block;min-width:20px;padding:0 6px;margin-left:2px;border-radius:9px;background:var(--bd);font-size:12px;line-height:18px}
#evw .evq button[class^="on-"] .evqn{background:rgba(255,255,255,.3)}
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
#evw .dbt{display:inline-block;padding:1px 6px;border-radius:4px;font-weight:700;font-size:12px;color:#fff;border:1px solid #222;background:repeating-linear-gradient(90deg,#333 0 3px,#777 3px 7px);text-shadow:0 0 2px #000;white-space:nowrap}
#evw table td,#evw table th{white-space:nowrap}
</style>`;
// Režimy pokladny v záložce Team (jen správci pokladny); klíč = hodnota S.tm
const CASH_MODES = [["pay", "💰 Platby"], ["cash", "🏦 Pokladna"], ["mon", "📅 Měsíce"], ["bud", "📊 Rozpočet"]];

// ===== Pomocné funkce =====
const pad = n => String(n).padStart(2, "0");
const staff = () => HK.can("sport");                                    // trenér / kustod (přihlášený uživatel)
const cashMgr = () => HK.can("money");                                   // správce pokladny (trenér / pokladník)
const isPl = () => HK.can("onlyOwn");                           // přihlášená hráčka (omezený přístup)
const dayOf = s => new Date(s + "T00:00:00");
const fDay = s => DAYS[dayOf(s).getDay()] + " " + fd(s);
const fDl = dlText;                    // text termínu přihlašování (core/utils.js)
const dlMs = dl => { const t = dl ? new Date(dl).getTime() : NaN; return isNaN(t) ? null : t; };
// Přihlašování je uzavřeno po termínu nebo po dni události
const isLocked = ev => { const t = dlMs(ev.dl); return (t != null && Date.now() > t) || ev.date < td(); };
// Výchozí termín: den před událostí v 18:00 (core/utils.js – stejný i pro nový zápas v modal.js)
const defDl = dlDefault;
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
  // cx = data pokladny z kolekce evcash (jen správci pokladny; ostatní vidí jen příznak raw.ss = vyúčtováno)
  const cx = id => (cashMgr() ? cxOf(id, S.ec) : {});
  const t = S.ev.map(e => ({id: e.id, type: "training", title: e.title || "Trénink", date: e.date || "", time: e.time || "", end: e.end || "", meet: e.meet, place: e.place || "", dl: e.dl || "", note: e.note || "", raw: e, cx: cx(e.id)}));
  const m = S.ma.map(x => ({id: x.id, type: "match", title: "Zápas – " + x.opp, date: x.date || "", time: x.time || "", meet: x.meet, place: x.place || "", dl: x.dl || "", note: "", raw: x, cx: cx(x.id)}));
  return [...t, ...m].filter(e => e.date);
}
// Odpovědi podle události a člena: AT[eventId][memberId]
function atMap() { const M = {}; S.at.forEach(a => { (M[a.eid] = M[a.eid] || {})[a.pid] = a; }); return M; }
// Počty odpovědí aktivních hráček (✅ / ❌ / ❓ / bez odpovědi) – domain/event-helpers.js
const counts = (ev, AT, P) => answerCounts(AT[ev.id], P.map(p => p.id));
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
// Den, čas od – do (zápas jen začátek), ⏰ sraz a místo; výchozí sraz a délka tréninku ze settings/events
const defs = () => evDefaults(S.es);
const timeTxt = e => { const t = timeParts(e, defs()); return (t.range ? " · " + esc(t.range) : "") + (t.meet ? " · ⏰ sraz " + t.meet : ""); };
const whenLine = e => fDay(e.date) + timeTxt(e) + (e.place ? " · " + esc(e.place) : "");

// ===== Zápis dat =====
// Odpověď a důvod v jedné dávce: attendance bez důvodu (set celého dokumentu smaže i starý attendance.reason), důvod do attnote;
// prázdný důvod = existující dokument attnote se smaže (nový se nezakládá)
function setAt(eid, pid, st, reason) {
  const u = HK.user(), id = noteId(eid, pid), n = noteDoc(eid, pid, reason), b = S.db.batch();
  b.set("attendance/" + id, attDoc(eid, pid, st, new Date().toISOString(), (u && u.email) || ""));
  if (n) b.set(NOTE_COLL + "/" + id, n); else if (S.an[id]) b.delete(NOTE_COLL + "/" + id);
  b.commit();
}
// Smazání důvodu do dávky, jen když dokument existuje (smazání neexistujícího by pravidla hráčce odmítla)
const delNote = (b, id) => { if (S.an[id]) b.delete(NOTE_COLL + "/" + id); return b; };
// Zrušení odpovědi: odpověď i důvod v jedné dávce
const clearAt = (eid, pid) => { const id = noteId(eid, pid); delNote(S.db.batch().delete("attendance/" + id), id).commit(); };
// Změna odpovědi: „Jdu“ se zapíše hned (opakované klepnutí ji zruší), „Nejdu“ a „Nejsem jistý“ otevřou okno s důvodem.
// Hráčka smí měnit jen svoji odpověď a jen do termínu; trenér a kustod kdykoli a za kohokoli (i za člena realizačního týmu).
function answer(eid, pid, st) {
  const ev = allEvents().find(x => x.id === eid);
  if (!ev) return;
  if (!pid) return toast("Nejdřív vyber hráčku");
  if (isPl() && pid !== HK.pid()) return toast("Můžeš měnit jen svoji odpověď");
  if (isLocked(ev) && !staff()) return toast("Přihlašování je uzavřeno");
  const cur = (atMap()[eid] || {})[pid];
  // 🚫 nedorazila bez omluvy: odpověď se značkou mění jen trenér a kustod (změna odpovědi značku zruší)
  if (isNos(cur) && !staff()) return toast("Trenér označil 🚫 nedorazila bez omluvy – odpověď už změní jen trenér nebo kustod.");
  // Blokace „Jdu“: neuhrazený předpis po splatnosti bez výjimky (správce pokladny smí zapisovat vždy a výjimky uděluje).
  // Vlastní předpisy jsou v zařízení (S.ch); za jiného člena rozhoduje veřejný souhrn debtors (S.dt) – kustod cizí předpisy nevidí.
  if (st === "yes" && !(cur && cur.st === "yes") && !cashMgr() && memberBlocked(S.ch, S.dt, pid, Date.now())) {
    const own = pid === HK.pid() || pid === HK.tid();
    return toast(own ? "Máš neuhrazený předpis po splatnosti – přihlášení je zablokováno. Zaplať (Moje platby), nebo požádej pokladníka o výjimku."
      : "Člen má neuhrazený předpis po splatnosti – přihlášení „Jdu“ je zablokováno. Výjimku udělí trenér nebo pokladník.");
  }
  if (st === "yes") { if (cur && cur.st === "yes") clearAt(eid, pid); else setAt(eid, pid, "yes", ""); return; }
  S.evr = {eid, pid, st, reason: cur && cur.st === st ? (cur.reason || "") : "", had: !!cur};
  render();
}
// Uložení rozdělení do pětek u tréninku (pole lines: {hráčka: číslo pětky, "t:" + člen týmu: číslo pětky}); merge zapíše jen pole lines
// 🚫 nedorazila bez omluvy: přepnutí značky u odpovědi „Jdu“ po začátku události (jen trenér a kustod, merge jen pole nos)
function toggleNos(ev, pid) {
  if (!staff()) return;
  const cur = (atMap()[ev.id] || {})[pid];
  if (!canNos(cur, startMs(ev.date, ev.time), Date.now())) return toast("🚫 jde označit jen u odpovědi „Jdu“ po začátku události.");
  S.db.doc("attendance/" + noteId(ev.id, pid)).merge(nosPatch(!isNos(cur)));
}
function saveLines(ev, lines) { S.db.doc("events/" + ev.id).merge({lines}); }

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
  const c = counts(e, AT, P), mine = S.evp ? (AT[e.id] || {})[S.evp] : null, lk = isLocked(e) && !staff(), mt = e.type === "match", m = e.raw;
  const sc = mt && m.closed ? ` <span class="tag">🔒 ${score(m).join(":")}</span>` : "";
  const tot = cashMgr() ? costTotal(e.cx) : 0, pay = tot ? " · 💰 náklady " + kc(tot) : "";   // náklady jen pro správce pokladny
  return `<div class="cd evi" data-eo="${e.id}"><div class="evh"><b>${mt ? "🆚" : "🏒"} ${esc(e.title)}</b>${sc}</div>
<div class="mu">${whenLine(e)}${mt ? (m.home ? " · doma" : " · venku") : ""}${pay}</div>
<div class="mu">${dlLine(e, isLocked(e))}${S.evp ? "" : ` · ✅ ${c.yes} · ❓ ${c.maybe} · ❌ ${c.no}`}</div>
<div class="mu">Přihlášeno: ${rosterLine(roster(e, AT))}</div>
${S.evp ? quick(e, mine, lk, c) : ""}${mine && mine.reason ? `<div class="mu" style="margin-top:6px">${esc(mine.reason)}</div>` : ""}</div>`;
}
function list(a) {
  const P = activePl(), AT = atMap(), evs = allEvents(), today = td(), pl_ = isPl();
  if (!S.evc) { const n = new Date(); S.evc = {y: n.getFullYear(), m: n.getMonth()}; }
  // Za koho platí rychlá tlačítka na kartě: hráčka vždy sama za sebe; trenér / kustod jen když je propojen s realizačním týmem
  if (pl_) S.evp = HK.pid();
  else { const me = myTr(); S.evp = me ? me.id : null; }
  if (S.evp && !P.some(p => p.id === S.evp) && !isTr(S.evp)) S.evp = null;
  // Dřívější režimy pokladny (pay / cash / mon) jsou v záložce Team; tady zůstávají Nadcházející, Minulé, Kalendář a Docházka
  const mode = ["up", "past", "cal", "att"].includes(S.evm) ? S.evm : "up";
  const modes = [["up", "Nadcházející"], ["past", "Minulé"], ["cal", "Kalendář"], ["att", "📊 Docházka"]];
  const chipsH = `<div class="chips">${modes.map(([k, t]) => `<button class="chip ${mode === k ? "on" : ""}" data-evm="${k}">${t}</button>`).join("")}</div>`;
  const errH = S.evErr ? `<div class="cd" style="color:var(--no)">Události, docházku nebo realizační tým se nepodařilo načíst (${esc(S.evErr)}). Zkontroluj pravidla databáze (firestore.rules).</div>` : "";
  let shown;
  // Nadcházející vzestupně (nejbližší nahoře), Minulé a Kalendář sestupně (nejnovější nahoře)
  if (mode === "up") shown = sortEvents(evs.filter(e => e.date >= today), "up");
  else if (mode === "past") shown = sortEvents(evs.filter(e => e.date < today), "past");
  else if (mode === "att") shown = [];
  else { const pre = S.evc.y + "-" + pad(S.evc.m + 1); shown = sortEvents(evs.filter(e => S.evd ? e.date === S.evd : e.date.startsWith(pre)), "cal"); }
  // Hlavička: hráčka bez propojení dostane upozornění; správce tlačítka pro založení události
  const head = pl_
    ? (S.evp ? "" : '<div class="cd" style="color:var(--no)">Tvůj účet není propojen s aktivní hráčkou. Požádej trenéra.</div>')
    : `<div class="row" style="margin-bottom:12px"><button class="p" id="evnt">+ Trénink</button><button class="s" id="evnm">+ Zápas</button></div>`;
  a.innerHTML = CSS + `<div id="evw">${errH}
${mineBanner()}
${head}
${chipsH}
${mode === "cal" ? calHtml(evs, today) : ""}
${mode === "att" ? attHtml() : shown.length ? shown.map(e => card(e, AT, P)).join("") : '<div class="msg">Žádné události.</div>'}</div>` + sheetHtml();
  // Eventy seznamu
  const nt = a.querySelector("#evnt"), nm = a.querySelector("#evnm");
  if (nt) nt.onclick = () => { S.evf = {id: null, type: "training", title: "Trénink", date: today, time: "", end: "", endAuto: true, meet: defs().meetT, place: "", dl: defDl(today), note: "", dlAuto: true}; render(); };
  if (nm) nm.onclick = () => { S.M = {k: "NEW", date: today, opp: "", home: true}; modal(); };
  a.querySelectorAll("[data-evm]").forEach(b => b.onclick = () => { S.evm = b.dataset.evm; S.evd = null; render(); });
  bindBanner(a);
  if (mode === "att") bindAtt(a);
  a.querySelectorAll("[data-cn]").forEach(b => b.onclick = () => { const c = S.evc; c.m += +b.dataset.cn; if (c.m < 0) { c.m = 11; c.y--; } if (c.m > 11) { c.m = 0; c.y++; } S.evd = null; render(); });
  a.querySelectorAll("[data-cd]").forEach(b => b.onclick = () => { S.evd = S.evd === b.dataset.cd ? null : b.dataset.cd; render(); });
  a.querySelectorAll("[data-eo]").forEach(c => c.onclick = () => { S.evid = c.dataset.eo; S.evBack = null; render(); window.scrollTo(0, 0); });
  a.querySelectorAll("[data-qa]").forEach(b => b.onclick = ev => { ev.stopPropagation(); const [eid, st] = b.dataset.qa.split("|"); answer(eid, S.evp, st); });
  bindSheet(a);
}

// ===== Vykreslení: režimy pokladny pro záložku Team =====
// Vykreslí přepínač (předaný jako head) a vybraný režim S.tm: Platby, Pokladna, Měsíce, nebo Rozpočet (views/budget-view.js). Jen pro správce pokladny.
// Vrací false, pokud se režim pokladny nevykresluje (pak Team vykreslí formaci a soupisku).
export function cashPanel(a, head) {
  if (!cashMgr() || !CASH_MODES.some(([k]) => k === S.tm)) return false;
  const errH = S.evErr ? `<div class="cd" style="color:var(--no)">Události nebo docházku se nepodařilo načíst (${esc(S.evErr)}).</div>` : "";
  const body = S.tm === "pay" ? financeHtml(allEvents(), atMap()) : S.tm === "cash" ? cashbookHtml() : S.tm === "bud" ? budgetHtml() : moneyHtml();
  a.innerHTML = CSS + `<div id="evw">${errH}${head}${body}</div>`;
  if (S.tm === "pay") bindFinance(a); else if (S.tm === "cash") bindCashbook(a); else if (S.tm === "bud") bindBudget(a); else bindMoney(a);
  return true;
}
export {CASH_MODES};

// ===== Vykreslení: detail události =====
// Pořadí: hlavička → docházka → výsledek a statistiky zápasu → rozdělení do pětek → pokladna (jen správci, na konci stránky)
// Rozdělení do pětek (jen trénink): přihlášené hráčky (bez brankářek) a přihlášení členové realizačního týmu, barevné volby 1.–4. pětky;
// hráčka vidí rozdělení jen ke čtení. Člen týmu má v lines klíč "t:" + id (vede stanoviště / jde s pětkou).
function linesHtml(ev, A, P, T, ro) {
  const going = P.filter(p => A[p.id] && A[p.id].st === "yes" && !isG(p)), goT = T.filter(t => A[t.id] && A[t.id].st === "yes"), L = ev.raw.lines || {};
  const c = lineCounts(L, going.map(p => p.id), goT.map(t => t.id));
  // Řádek: key = klíč v lines, label = jméno (HTML)
  const row = (key, label) => ro
    ? `<div class="pr"><div>${label}</div><div>${L[key] ? `<span class="evl L${L[key]}">${L[key]}. pětka</span>` : '<span class="mu">–</span>'}</div></div>`
    : `<div class="pr"><div>${label}</div><div class="evln">${[0, ...LINE_NOS].map(n => `<button class="chip ${(L[key] || 0) === n ? (n ? "L" + n : "on") : ""}" data-ln="${key}|${n}">${n || "–"}</button>`).join("")}</div></div>`;
  const trH = goT.length ? '<div class="lnl">Realizační tým</div>' + goT.map(t => row(trKey(t.id), "🎓 " + esc(t.name) + (t.kind ? ` <span class="mu">${esc(t.kind)}</span>` : ""))).join("") : "";
  return `<div class="cd"><h2>Rozdělení do pětek</h2><div class="mu" style="margin-bottom:8px">Z hráček, které jdou (bez brankářek), a přihlášeného realizačního týmu. Barvy jako v živém zápisu.</div>
<div style="margin-bottom:10px">${LINE_NOS.map(n => `<span class="evl L${n}">${n}. pětka: ${c.pl[n]}${c.tr[n] ? " + 🎓" + c.tr[n] : ""}</span>`).join("")}<span class="evl L0">bez pětky: ${c.free}</span></div>
${ro ? "" : '<div class="row" style="margin-bottom:8px"><button class="s" id="evlb">↻ Podle základní formace</button><button class="s" id="evlc">Vymazat</button></div>'}
${going.length || goT.length ? going.map(p => row(p.id, pn(p.id))).join("") + trH : '<div class="msg">Zatím se nikdo nepřihlásil.</div>'}</div>`;
}
function detail(a, ev) {
  const P = activePl(), AT = atMap(), A = AT[ev.id] || {}, c = counts(ev, AT, P), lk = isLocked(ev), mt = ev.type === "match", ownP = isPl(), me = HK.pid();
  const can = !lk || staff(), T = trs(), st0 = startMs(ev.date, ev.time), now = Date.now(), nn = nosCount(A, P.map(p => p.id));
  const rows = P.map((p, i) => {
    const x = A[p.id], mine = p.id === me, nos = isNos(x), ok = can && (!ownP || mine) && (!nos || staff());   // hráčka mění jen svůj řádek, 🚫 jen trenér
    const showReason = x && x.reason && (!ownP || mine);                // důvody ostatních vidí jen trenér a kustod
    // 🚫 tlačítko: trenér / kustod u odpovědi „Jdu“ po začátku události
    const nb = !ownP && canNos(x, st0, now) ? `<button class="evns ${nos ? "on" : ""}" data-nos="${p.id}" title="Nedorazila bez omluvy">🚫</button>` : "";
    return (i === 0 || pri(P[i - 1]) !== pri(p) ? `<div class="lnl">${PG[pri(p)]}</div>` : "") +
      `<div class="pr"><div>${p.id === S.evp ? "<b>" : ""}${pn(p.id)}${p.id === S.evp ? "</b>" : ""}${debtTag(p.id)}${x && ANS[x.st] ? ` <span class="tag ${ANS[x.st].cls}">${ANS[x.st].t}</span>` : ""}${nos ? ' <span class="tag red">🚫 Nedorazila</span>' : ""}${showReason ? `<div class="mu">${esc(x.reason)}</div>` : ""}</div><div class="evq">${ORD.map(k => `<button class="${x && x.st === k ? "on-" + k : ""}" data-pa="${p.id}|${k}" ${ok ? "" : "disabled"}>${ANS[k].ic}</button>`).join("")}${nb}</div></div>`;
  }).join("");
  // Realizační tým: odpovědi mění jen trenér a kustod, hráčka je vidí jen ke čtení (bez důvodů)
  const trRows = T.map((t, i) => {
    const x = A[t.id], ok = can && !ownP, showReason = x && x.reason && !ownP;
    return (i === 0 ? '<div class="lnl">Realizační tým</div>' : "") +
      `<div class="pr"><div>${t.id === S.evp ? "<b>" : ""}🎓 ${esc(t.name)}${t.id === S.evp ? "</b>" : ""} <span class="mu">${esc(t.kind || "")}</span>${x && ANS[x.st] ? ` <span class="tag ${ANS[x.st].cls}">${ANS[x.st].t}</span>` : ""}${showReason ? `<div class="mu">${esc(x.reason)}</div>` : ""}</div><div class="evq">${ORD.map(k => `<button class="${x && x.st === k ? "on-" + k : ""}" data-pa="${t.id}|${k}" ${ok ? "" : "disabled"}>${ANS[k].ic}</button>`).join("")}</div></div>`;
  }).join("");
  const key = "ev" + ev.id;
  const btns = ownP ? "" : `<div class="row" style="margin-top:10px">${mt ? '<button class="p" id="evo">🏒 Otevřít zápas</button>' : ""}<button class="s" id="eve">✏️ ${mt ? "Čas, místo, termín" : "Upravit"}</button>${mt ? "" : `<button class="d" id="evd" style="${S.cf === key ? "background:var(--no);color:#fff" : ""}">${S.cf === key ? "Opravdu smazat? Klepni znovu" : ev.raw.ser ? "🗑 Jen tato" : "🗑 Smazat"}</button>${serDelBtn(ev)}`}</div>`;
  a.innerHTML = CSS + `<div id="evw"><button class="s" id="evb" style="margin-bottom:12px">${S.evBack === "fo" ? "← Team" : S.evBack === "home" ? "← Domů" : "← Události"}</button>
<div class="cd"><div class="evh"><b style="font-size:18px">${mt ? "🆚" : "🏒"} ${esc(ev.title)}</b></div><div class="mu">${whenLine(ev)}${mt ? (ev.raw.home ? " · doma" : " · venku") : ""}</div><div class="mu" style="margin-top:4px">${dlLine(ev, lk)}</div>${mt ? "" : serLine(ev)}${ev.note ? `<div style="margin-top:6px">${esc(ev.note)}</div>` : ""}
<div class="grid3" style="margin-top:10px"><div class="stat"><b>${c.yes}</b>jdou</div><div class="stat"><b>${c.maybe}</b>nejistí</div><div class="stat"><b>${c.no}</b>nejdou</div></div>${c.none ? `<div class="mu">Bez odpovědi: ${c.none}</div>` : ""}${nn ? `<div class="mu">🚫 Nedorazilo bez omluvy: ${nn}</div>` : ""}<div class="mu" style="margin-top:6px">Přihlášeno: ${rosterLine(roster(ev, AT))}</div>${btns}</div>
<div class="cd"><h2>Docházka</h2>${lk ? `<div class="mu" style="margin-bottom:6px">${staff() ? "Termín vypršel – jako trenér můžeš odpovědi stále měnit." + (st0 <= now ? " 🚫 = přihlášená hráčka nedorazila bez omluvy (klepni znovu pro zrušení)." : "") : "Přihlašování je uzavřeno."}</div>` : ""}${ownP ? '<div class="mu" style="margin-bottom:6px">Měnit můžeš jen svůj řádek.</div>' : ""}${rows || '<div class="msg">Žádné hráčky.</div>'}${trRows}</div>
${mt && ev.raw.closed ? `<div class="cd"><div class="sc">${score(ev.raw).join(" : ")}</div><button class="p w" id="evrp" style="margin:6px 0 10px;min-height:48px">📋 Zápis utkání</button>${matchStatsHtml(ev.raw)}</div>` : ""}
${mt ? "" : linesHtml(ev, A, P, T, ownP)}
${payHtml(ev)}</div>` + sheetHtml();
  // Eventy detailu
  // Zpět: do Teamu (otevřeno z přehledu plateb), jinak do seznamu událostí
  a.querySelector("#evb").onclick = () => { S.evid = null; if (S.evBack) { S.tab = S.evBack; S.evBack = null; } render(); window.scrollTo(0, 0); };
  a.querySelectorAll("[data-pa]").forEach(b => b.onclick = () => { const [pid, st] = b.dataset.pa.split("|"); answer(ev.id, pid, st); });
  // Zápis utkání uzavřeného zápasu: stejné okno jako v záložce Soupeři (pro všechny role, jen čtení a export)
  const rp = a.querySelector("#evrp");
  if (rp) rp.onclick = () => { S.rp = ev.id; renderReport(); };
  bindSheet(a);
  bindPay(a, ev);
  if (ownP) return;                                                   // zbytek jsou správcovské akce (jen trenér a kustod)
  a.querySelectorAll("[data-nos]").forEach(b => b.onclick = () => toggleNos(ev, b.dataset.nos));
  const eo = a.querySelector("#evo");
  if (eo) eo.onclick = () => { S.mid = ev.id; S.showLu = false; S.showNom = false; S.step = 1; S.evid = null; render(); window.scrollTo(0, 0); };
  // Úprava: konec uložený, jinak automaticky začátek + délka; sraz uložený, jinak výchozí podle typu
  a.querySelector("#eve").onclick = () => {
    const endSet = !mt && okTime(ev.raw.end) && endOk(ev.time, ev.raw.end);
    S.evf = {id: ev.id, type: ev.type, title: ev.title, date: ev.date, time: ev.time, end: endSet ? ev.raw.end : defEnd(ev.time, defs()), endAuto: !endSet, meet: meetOf(ev, defs()), place: ev.place, dl: ev.dl || defDl(ev.date), note: ev.note, dlAuto: !ev.dl, ser: mt ? null : ev.raw.ser || null, scope: "one"}; render();
  };
  // Smazání tréninku: nejdřív kontrola vyúčtování (HK.canDelete), pak docházka; předpisy bez úhrady maže datová vrstva spolu s událostí
  const ed = a.querySelector("#evd");
  if (ed) ed.onclick = () => {
    confirm2(key, () => {
      if (!HK.canDelete("events", ev.id)) { render(); return; }
      // Docházka a důvody události po dávkách (limit dávky 500 operací)
      const ids = S.at.filter(x => x.eid === ev.id).map(x => x.id);
      for (let i = 0; i < ids.length; i += 200) { const b = S.db.batch(); ids.slice(i, i + 200).forEach(id => delNote(b.delete("attendance/" + id), id)); b.commit(); }
      S.db.doc("events/" + ev.id).delete(); S.evid = null; render();   // evcash dokument maže datová vrstva
    });
  };
  // Smazání „tato a další budoucí“ u tréninku ze série (views/event-series.js)
  bindSerDel(a, ev);
  // Pětky: klíč je id hráčky, nebo "t:" + id člena realizačního týmu
  a.querySelectorAll("[data-ln]").forEach(b => b.onclick = () => {
    const [key, n] = b.dataset.ln.split("|");
    saveLines(ev, setLine(ev.raw.lines, key, n));
  });
  const lb = a.querySelector("#evlb"), lc = a.querySelector("#evlc");
  // Podle základní formace přepíše jen hráčky; přiřazení realizačního týmu zůstane
  if (lb) lb.onclick = () => saveLines(ev, baseLines((S.def || {}).lu, P.filter(p => A[p.id] && A[p.id].st === "yes" && !isG(p)).map(p => p.id), ev.raw.lines));
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
// Trénink: všechna pole; zápas: jen čas, místo a termín přihlašování (ostatní údaje zápasu se mění v kartě zápasu, náklady v Pokladně u události).
// Nový trénink může být série (🔁 Opakovat – datum je pak „od“ a termín přihlašování relativní); úprava tréninku ze série má volbu „jen tato / tato a další“.
// Trénink má čas konce (dokud ho nikdo nezmění, počítá se začátek + výchozí délka – f.endAuto); trénink i zápas mají ⏰ sraz v minutách před začátkem.
function formView(a) {
  const f = S.evf, mt = f.type === "match", rep = repOn(f), D = defs();
  if (f.meet == null) f.meet = meetDefault(f.type, D);               // formulář otevřený bez srazu (výchozí podle typu)
  if (!mt && f.endAuto) f.end = defEnd(f.time, D);
  const mHint = () => { const m = meetAt({type: f.type, time: f.time, meet: clampMin(f.meet, MEET_MAX, meetDefault(f.type, D))}, D); return m ? "Sraz v " + m : f.time ? "Bez srazu" : "Čas srazu se dopočítá po zadání začátku"; };
  a.innerHTML = CSS + `<div id="evw"><button class="s" id="evfx" style="margin-bottom:12px">← Zpět</button><div class="cd"><h2>${mt ? "Zápas – čas, místo, termín" : f.id ? "Upravit trénink" : "Nový trénink"}</h2>
${mt ? `<div class="mu" style="margin-bottom:8px">${esc(f.title)} · ${fDay(f.date)}</div>` : `<label>Název</label><input id="ft" value="${esc(f.title)}"><label>${rep ? "Od (první trénink)" : "Datum"}</label><input type="date" id="fd" value="${esc(f.date)}">`}
<label>Čas začátku</label><input type="time" id="fti" value="${esc(f.time)}">${mt ? "" : `<label>Čas konce${f.endAuto ? ` <span class="mu">(automaticky +${D.len} min)</span>` : ""}</label><input type="time" id="fte" value="${esc(f.end)}">`}
<label>⏰ Sraz – minut před začátkem</label><div class="row" style="align-items:center"><input type="number" id="fme" inputmode="numeric" min="0" max="${MEET_MAX}" step="5" value="${esc(String(f.meet))}" style="max-width:110px"><span class="mu" id="fmh">${mHint()}</span></div>
<label>Místo</label><input id="fp" value="${esc(f.place)}">
${rep ? "" : `<label>Konečný termín přihlašování</label><input type="datetime-local" id="fdl" value="${esc(f.dl)}">`}
${mt ? "" : `<label>Poznámka</label><input id="fn" value="${esc(f.note)}">`}
${mt ? "" : repHtml(f) + scopeHtml(f)}
<button class="p w" id="evfs" style="min-height:52px">${repSaveText(f)}</button></div></div>`;
  const g = id => { const e = document.getElementById(id); return e ? e.value : null; };
  // Přepsání polí do stavu formuláře (před každým překreslením)
  const readF = () => {
    if (g("ft") != null) f.title = g("ft").trim();
    if (g("fd") != null) f.date = g("fd");
    f.time = g("fti") || ""; f.place = (g("fp") || "").trim(); if (g("fdl") != null) f.dl = g("fdl");
    if (g("fte") != null) f.end = f.endAuto ? defEnd(f.time, D) : g("fte") || "";
    if (g("fme") != null) f.meet = g("fme");
    if (g("fn") != null) f.note = g("fn").trim();
  };
  const fd_ = document.getElementById("fd");
  if (fd_) fd_.onchange = () => { readF(); if (f.dlAuto) f.dl = defDl(f.date); render(); };
  const fdl = document.getElementById("fdl");
  if (fdl) fdl.oninput = () => { f.dlAuto = false; };
  // Změna začátku posune automatický konec; ruční změna konce automatiku vypne; sraz jen obnoví text „Sraz v …“
  const fti = document.getElementById("fti"), fte = document.getElementById("fte"), fme = document.getElementById("fme");
  if (fti) fti.onchange = () => { readF(); render(); };
  if (fte) fte.oninput = () => { f.endAuto = false; };
  if (fme) fme.oninput = () => { f.meet = fme.value; const h = document.getElementById("fmh"); if (h) h.textContent = mHint(); };
  // Opakování a rozsah úpravy série (views/event-series.js); readR přepíše pole opakování před uložením
  const readR = mt ? () => {} : bindRep(a, f, readF);
  if (!mt) bindScope(a, f, readF);
  document.getElementById("evfx").onclick = () => { S.evf = null; render(); };
  document.getElementById("evfs").onclick = () => {
    readF(); readR();
    if (!mt && !endOk(f.time, f.end)) return toast("Konec tréninku musí být po začátku");
    // Série: vlastní kontroly a zápis po dávkách
    if (repOn(f)) { if (repSave(f)) { S.evf = null; render(); } return; }
    if (!f.date) return toast("Zadej datum");
    if (!f.dl) return toast("Zadej konečný termín přihlašování");
    if (!dlBeforeStart(f.dl, f.date, f.time)) return toast("Termín přihlašování musí být před začátkem události");
    if (mt) {
      const m = S.ma.find(x => x.id === f.id);
      if (!m) { S.evf = null; return render(); }
      const n = clone(m); n.time = f.time; n.place = f.place; n.dl = f.dl; n.meet = timeFields("match", f, D).meet;
      S.evf = null; return upd(n);
    }
    // Úprava zapíše přes merge jen údaje z formuláře – pětky (lines), příznak vyúčtování (ss) a další pole zůstanou
    const d = {type: "training", title: f.title || "Trénink", date: f.date, time: f.time, ...timeFields("training", f, D), place: f.place, dl: f.dl, note: f.note || ""};
    if (f.id && f.ser) { if (serEditSave(f, d)) { S.evf = null; render(); } return; }
    if (f.id) S.db.doc("events/" + f.id).merge(d); else S.db.collection("events").add({...d, lines: {}});
    S.evf = null; render();
  };
}

// ===== Export =====
export function eventsView(a) {
  if (S.evf && !isPl()) return formView(a);
  if (S.evid) { const ev = allEvents().find(x => x.id === S.evid); if (ev) return detail(a, ev); S.evid = null; }
  list(a);
}
