// 🏠 Domů (výchozí záložka, všichni): nahoře 💳 Moje platby jen při dluhu, běžící zápas, 🆚 příští zápas a pod ním tréninky a další akce
// příštích 7 dní (bez zápasů) jako karty z Událostí (event-core.js – cardHtml) s rychlými tlačítky ✅ ❌ ❓ (přihlášení bez dalších kliků),
// u správce pokladny souhrn týmu a varování cashflow, u managera ✋ žádosti o přijetí (join-view.js), 🏖 nepřítomnost (absence-view.js).
// Manager / trenér / asistent: pruh ❔ Chybí odpověď u nejbližší otevřené události – jména a 📲 Připomenout (domain/home-remind.js).
// Běžící zápas: sport rovnou do živého zápisu, ostatní 👁 náhled (live-watch.js). Výpočty domain/home-summary.js.
// ===== Importy =====
import {TEAM_NAME} from "../config/team-config.js";
import {S} from "../core/state.js";
import {STABLE_URL} from "../core/channel.js";
import {dlText, esc, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {cashflow} from "../domain/budget-track.js";
import {budgetPlan, normBudget, seasonKeyOf} from "../domain/budget.js";
import {cashCfg, fmtDue, kc, ymLabel} from "../domain/cash.js";
import {selfMember} from "../domain/event-helpers.js";
import {evDefaults, timeParts} from "../domain/event-time.js";
import {dayShort, missingAnswers, nearestOpen, reminderText} from "../domain/home-remind.js";
import {DAYS_AHEAD, flowWarn, homeItems, liveMatch, myPay, nextMatch, teamPay, teamPayLite, unanswered, upcomingEvents} from "../domain/home-summary.js";
import {absCardHtml, absModal, bindAbs} from "./absence-view.js";
import {activePl, allEvents, answer, atMap, bindSheet, cardHtml, CSS as EV_CSS, isPl, sheetHtml} from "./event-core.js";
import {joinBanner, openJoinWindow} from "./join-view.js";
import {liveWatchView, watchable} from "./live-watch.js";
import {bindMoneyWait, econData} from "./payments.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
// Styly jen pro tuto obrazovku (main.css se nemění); karty událostí mají styly #evw z event-core.js
const CSS = `<style>
#hmw .hmc{cursor:pointer}
#hmw .hmh{display:flex;justify-content:space-between;align-items:center;gap:8px}
#hmw .hmr{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--bd);cursor:pointer}
#hmw .hmr:last-child{border-bottom:0}
#hmw .hms{font-size:30px;font-weight:800;text-align:center;letter-spacing:2px;margin:4px 0}
#hmw .hmb{display:block;width:100%;text-align:left;margin-top:8px}
#hmw .hml{border-color:var(--no);border-width:2px}
#hmw .hmq{border-color:var(--wa);border-width:2px}
#hmw .hmn{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
#hmw .hmt{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:16px 2px 8px}
#hmw .hmt h2{margin:0}
</style>`;
let missOpen = null;                                                  // id události s rozbaleným seznamem ❔ Chybí odpověď
let missTxt = "";                                                     // text připomínky k ručnímu zkopírování (bez sdílení i schránky)

// ===== Pomocné funkce =====
// Řádek času a srazu bez HTML (text připomínky)
const whenPlain = e => { const t = timeParts(e, evDefaults(S.es)); return [t.range, t.meet ? "⏰ sraz " + t.meet : ""].filter(Boolean).join(" · "); };
// Za koho platí rychlá tlačítka (stejně jako v Událostech): propojená hráčka, jinak člen realizačního týmu; hráčka nikdy za člena týmu
function setSelf(P) {
  const pl_ = isPl();
  S.evp = selfMember(HK.pid(), pl_ ? null : HK.tid(), P.map(p => p.id), S.tr.map(t => t.id), pl_);
}
// 📲 Sdílení textu: nabídka sdílení telefonu (WhatsApp, SMS …), jinak zkopírovat do schránky, jinak ukázat text k ručnímu zkopírování
async function shareText(text) {
  if (navigator.share) { try { await navigator.share({text}); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(text); toast("Připomínka zkopírována – vlož ji do WhatsApp nebo SMS"); }
  catch (e) { missTxt = text; render(); }
}
// Varování cashflow z uloženého rozpočtu běžící sezóny (jen správce pokladny); chyba výpočtu přehled nezastaví
function flowOf() {
  const k = seasonKeyOf(td()), sv = (S.bd || []).find(x => x.id === k);
  if (!sv || !HK.money.ok()) return null;                     // 📉 bez načtených předpisů a pohybů by odhad zůstatku nebyl pravdivý
  try { const b = normBudget(sv, k), cfg = cashCfg(S.cc); return flowWarn(cashflow(b, budgetPlan(b, cfg, S.ev), econData(), td(), cfg)); }
  catch (e) { console.warn("Cashflow pro přehled se nespočítal:", e); return null; }
}

// ===== Vykreslení karet =====
// 🔴 Běžící zápas: manager / trenér / asistent rovnou do živého zápisu, ostatní klepnutím do 👁 náhledu (jen ke čtení)
function liveHtml(L) {
  if (!L) return "";
  const names = L.home ? esc(TEAM_NAME) + " – " + esc(L.opp) : esc(L.opp) + " – " + esc(TEAM_NAME), sc = L.home ? L.us + " : " + L.them : L.them + " : " + L.us;
  const act = HK.can("sport") ? '<button class="p w" data-hlv style="margin-top:8px;min-height:52px">▶ Do živého zápisu</button>'
    : '<div class="mu" style="text-align:center;margin-top:4px">👁 Klepni pro čas a průběh zápasu →</div>';
  return `<div class="cd hml${HK.can("sport") ? "" : ' hmc" data-hwt="1'}"><div class="hmh"><b style="color:var(--no)">🔴 Zápas právě běží</b><span class="tag">${esc(L.perText)}${L.ended ? "" : L.running ? " · ▶" : " · ⏸"}</span></div>
<div style="text-align:center;margin-top:6px"><b>${names}</b></div><div class="hms">${sc}</div>${act}</div>`;
}
// 📅 Příštích 7 dní (dnes až dnes + 6, jen nadcházející, bez zápasů – ty má 🆚 Příští zápas): stejné karty jako v Událostech, s rychlými tlačítky
function weekHtml(cards, q) {
  const head = `<div class="hmt"><h2>📅 Tréninky – příštích ${DAYS_AHEAD} dní</h2>${q ? `<span class="tag sh">❔ ${q} bez odpovědi</span>` : ""}</div>`;
  return head + (cards || `<div class="cd mu">V příštích ${DAYS_AHEAD} dnech nejsou žádné tréninky.</div>`);
}
// 🆚 Příští zápas (nahoře nad tréninky): stejná karta jako v Událostech
const nextHtml = card => (card ? `<div class="hmt"><h2>🆚 Příští zápas</h2></div>${card}` : "");
// ❔ Chybí odpověď (manager / trenér / asistent): nejbližší otevřená událost s hráčkami bez odpovědi; rozbalené = jména a 📲 Připomenout
function missHtml(e, miss) {
  if (!e || !miss.length) return "";
  const open = missOpen === e.id;
  const body = open ? `<div class="hmn">${miss.map(m => `<span class="tag">${esc(m.name)}</span>`).join("")}</div><div class="row"><button class="p" data-hrm>📲 Připomenout</button><button class="s" data-heo="${esc(e.id)}">Otevřít událost →</button></div>${missTxt ? `<textarea readonly rows="5" style="margin-top:8px">${esc(missTxt)}</textarea>` : ""}` : "";
  return `<div class="cd hmq"><div class="hmh hmc" data-hms><b>❔ Chybí odpověď: ${miss.length}</b><span class="mu">${e.type === "match" ? "🆚" : "🏒"} ${esc(e.title)} · ${esc(dayShort(e.date))} ${open ? "▴" : "▾"}</span></div>${body}</div>`;
}
// 💳 Moje platby – jen když člen dluží (💳 k úhradě = nový předpis, ⛔ po splatnosti); bez dluhu se karta neukazuje
function payHtml(p) {
  if (!p || (p.state !== "due" && p.state !== "over")) return "";
  const t = p.state === "due" ? `<b>💳 K úhradě ${kc(p.debt)}</b><div class="mu">${p.next ? "Nejbližší splatnost " + fmtDue(p.next) : ""}</div>`
    : `<b style="color:var(--no)">⛔ Po splatnosti ${kc(p.over)}</b>${p.debt > p.over ? `<div class="mu">Celkem nezaplaceno ${kc(p.debt)}</div>` : ""}<div class="mu">${p.blocked ? "Přihlášení „Jdu“ je zablokované, dokud nezaplatíš (nebo ti pokladník neudělí výjimku)." : "Máš výjimku od pokladníka – přihlášení není blokované."}</div>`;
  return `<div class="cd hmc" data-hmk${p.state === "over" ? ' style="border-color:var(--no);border-width:2px"' : ""}><h2>💳 Moje platby</h2>${t}<div class="mu" style="margin-top:6px">Klepni pro Moje platby a 📱 QR platbu →</div></div>`;
}
// Souhrn pokladny týmu (jen správce pokladny): nezaplaceno, po splatnosti, žádosti ✋, varování cashflow
function teamHtml(t, f) {
  const w = f ? `<button class="s hmb" data-hbud style="border-color:${f.neg ? "var(--no)" : "var(--wa)"}">⚠️ Cashflow ${esc(ymLabel(f.ym))}: odhad zůstatku ${kc(f.bal)} – ${f.neg ? "pod nulou" : "pod rezervou " + kc(f.res)} →</button>` : "";
  return `<div class="cd"><h2>💰 Pokladna týmu</h2>
<div class="hmr" data-hpay><div>Nezaplaceno celkem</div><b>${kc(t.unpaid)}</b></div>
<div class="hmr" data-hpay><div>Po splatnosti${t.debtors ? ` <span class="mu">(${t.debtors} ${t.debtors === 1 ? "dlužník" : t.debtors < 5 ? "dlužníci" : "dlužníků"})</span>` : ""}</div><b style="color:${t.over ? "var(--no)" : "var(--ok)"}">${kc(t.over)}</b></div>
<div class="hmr" data-hpay><div>✋ Otevřené žádosti</div><b style="color:${t.reqs ? "var(--wa)" : "inherit"}">${t.reqs}</b></div>${w}</div>`;
}

// 📉 Pokladna ještě nenačtená: dlužníci z veřejného souhrnu (bez částek), otevřené žádosti a ⬇ Načíst pokladnu
function teamLiteHtml(t) {
  const n = t.debtors, w = n === 1 ? "dlužník" : n < 5 ? "dlužníci" : "dlužníků";
  return `<div class="cd"><h2>💰 Pokladna týmu</h2>
<div class="hmr" data-hpay><div>Po splatnosti${t.blocked ? ` <span class="mu">(⛓ ${t.blocked} blokováno)</span>` : ""}</div><b style="color:${n ? "var(--no)" : "var(--ok)"}">${n} ${w}</b></div>
<div class="hmr" data-hpay><div>✋ Otevřené žádosti</div><b style="color:${t.reqs ? "var(--wa)" : "inherit"}">${t.reqs}</b></div>
<div class="mu" style="margin:6px 0">Částky a cashflow po načtení pokladny (📉 úspora čtení).</div><button class="s w" data-mload>⬇ Načíst pokladnu</button></div>`;
}

// ===== Eventy =====
// Odkazy z přehledu: detail události (Zpět vrátí do Domů), rychlé odpovědi, živý zápis, Moje platby, Team → Platby / Rozpočet
function bind(a, L, M) {
  const go = fn => () => { fn(); render(); window.scrollTo(0, 0); };
  const toEvent = id => go(() => { S.tab = "ev"; S.mid = null; S.evf = null; S.evid = id; S.evBack = "home"; });
  a.querySelectorAll("[data-heo]").forEach(b => b.onclick = toEvent(b.dataset.heo));
  a.querySelectorAll("[data-eo]").forEach(b => b.onclick = toEvent(b.dataset.eo));
  // ✅ ❌ ❓ přímo z karty: stejný zápis jako v Událostech (❌ / ❓ otevře okno s důvodem), klepnutí neotevře detail
  a.querySelectorAll("[data-qa]").forEach(b => b.onclick = ev => { ev.stopPropagation(); const [eid, st] = b.dataset.qa.split("|"); answer(eid, S.evp, st); });
  a.querySelectorAll("[data-hmk]").forEach(b => b.onclick = go(() => { S.tab = "mk"; S.mid = null; S.evid = null; }));
  a.querySelectorAll("[data-hpay]").forEach(b => b.onclick = go(() => { S.tab = "fo"; S.tm = "pay"; S.mid = null; S.evid = null; }));
  a.querySelectorAll("[data-hjr]").forEach(b => b.onclick = () => openJoinWindow());
  // ❔ Chybí odpověď: rozbalit / sbalit jména, 📲 Připomenout = text ke sdílení s odkazem na stabilní verzi aplikace
  a.querySelectorAll("[data-hms]").forEach(b => b.onclick = () => { if (!M) return; missOpen = missOpen === M.e.id ? null : M.e.id; missTxt = ""; render(); });
  a.querySelectorAll("[data-hrm]").forEach(b => b.onclick = () => { if (M) shareText(reminderText(M.e, M.miss.map(m => m.name), {when: whenPlain(M.e), dl: M.e.dl && !M.e.locked ? dlText(M.e.dl) : "", url: location.origin + STABLE_URL})); });
  a.querySelectorAll("[data-hbud]").forEach(b => b.onclick = go(() => { S.tab = "fo"; S.tm = "bud"; S.mid = null; S.evid = null; }));
  // Manager / trenér / asistent: otevře kartu běžícího zápasu a v ní živý zápis (stejně jako ▶ Pokračovat v živém zápisu)
  // Ostatní členové: 👁 náhled běžícího zápasu jen ke čtení
  a.querySelectorAll("[data-hwt]").forEach(b => b.onclick = go(() => { if (L) S.hw = L.id; }));
  a.querySelectorAll("[data-hlv]").forEach(b => b.onclick = () => { if (!L || !HK.can("sport")) return; S.tab = "ev"; S.evid = null; S.mid = L.id; S.step = 3; S.lv = true; render(); });
  bindSheet(a);                                                        // okno s důvodem ❌ / ❓
}

// ===== Export =====
// Vykreslení záložky 🏠 Domů do kontejneru a
export function homeView(a) {
  // Otevřený náhled živého zápasu; po uzavření zápasu (nebo zrušení živého zápisu) se vrátí přehled
  if (S.hw && !HK.can("sport") && watchable(S.hw)) return liveWatchView(a);
  S.hw = null;
  const P = activePl(), AT = atMap(), byId = new Map(allEvents().map(e => [e.id, e]));
  setSelf(P);
  const now = Date.now(), today = td(), items = homeItems(S.ev, S.ma), L = liveMatch(S.ma);
  const week = upcomingEvents(items, S.at, S.evp, now, today), nm = nextMatch(items, now, today);
  // 🆚 Příští zápas nahoře, pod ním karty týdne bez zápasů (tréninky a další akce)
  const card = e => { const x = byId.get(e.id); return x ? cardHtml(x, AT, P) : ""; };
  const tw = week.filter(e => e.type !== "match"), cards = tw.map(card).join(""), nextCard = nm ? card(nm) : "";
  const ids = [HK.pid(), HK.tid()].filter(Boolean), mp = ids.length ? myPay(S.ch, ids, now) : null;
  const team = !HK.can("money") ? "" : HK.money.ok() ? teamHtml(teamPay(S.ch, S.rq, now), flowOf()) : teamLiteHtml(teamPayLite(S.dt, S.rq, now));
  // ❔ Chybí odpověď jen pro sport (manager, trenér, asistent) – nejbližší událost s otevřeným přihlašováním
  const ne = HK.can("sport") ? nearestOpen(week) : null, M = ne ? {e: ne, miss: missingAnswers(S.pl, S.at, ne.id)} : null;
  a.innerHTML = EV_CSS + CSS + `<div id="evw"><div id="hmw">${payHtml(mp)}${joinBanner()}${S.evErr ? `<div class="cd mu">⚠️ Události se nenačetly (${esc(S.evErr)}).</div>` : ""}${liveHtml(L)}${M ? missHtml(M.e, M.miss) : ""}${nextHtml(nextCard)}${weekHtml(cards, S.evp ? unanswered(tw) : 0)}${absCardHtml()}${team}</div></div>${sheetHtml()}${absModal()}`;
  bind(a, L, M);
  bindAbs(a);
  bindMoneyWait(a);
}
