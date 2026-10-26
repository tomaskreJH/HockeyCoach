// 🏠 Domů (výchozí záložka, všichni): běžící a příští zápas, události příštích 7 dní s mojí odpovědí, moje platby, u správce pokladny
// souhrn týmu a varování cashflow, u managera ✋ žádosti o přijetí (join-view.js), 🏖 nepřítomnost (absence-view.js).
// Běžící zápas: sport rovnou do živého zápisu, ostatní 👁 náhled (live-watch.js). Jen čte a odkazuje; výpočty domain/home-summary.js.
// Hostující nevidí počty ostatních.
// ===== Importy =====
import {TEAM_NAME} from "../config/team-config.js";
import {S} from "../core/state.js";
import {dlText, esc, fd, td} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {cashflow} from "../domain/budget-track.js";
import {budgetPlan, normBudget, seasonKeyOf} from "../domain/budget.js";
import {cashCfg, fmtDue, kc, ymLabel} from "../domain/cash.js";
import {evDefaults, timeParts} from "../domain/event-time.js";
import {DAYS_AHEAD, flowWarn, goingCount, homeItems, liveMatch, myAnswer, myPay, nextMatch, regClosed, teamPay, unanswered, upcomingEvents} from "../domain/home-summary.js";
import {absCardHtml, absModal, bindAbs} from "./absence-view.js";
import {joinBanner, openJoinWindow} from "./join-view.js";
import {liveWatchView, watchable} from "./live-watch.js";
import {econData} from "./payments.js";
import {render} from "./shell.js";

// ===== Konstanty =====
const DAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const ANS = {yes: "✅ Jdu", no: "❌ Nejdu", maybe: "❓ Nejsem jistý"};
// Styly jen pro tuto obrazovku (main.css se nemění)
const CSS = `<style>
#hmw .hmc{cursor:pointer}
#hmw .hmh{display:flex;justify-content:space-between;align-items:center;gap:8px}
#hmw .hmr{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--bd);cursor:pointer}
#hmw .hmr:last-child{border-bottom:0}
#hmw .hmr.past{opacity:.55}
#hmw .hma{font-weight:700;white-space:nowrap;font-size:14px}
#hmw .hml{border-color:var(--no);border-width:2px}
#hmw .hms{font-size:30px;font-weight:800;text-align:center;letter-spacing:2px;margin:4px 0}
#hmw .hmb{display:block;width:100%;text-align:left;margin-top:8px}
</style>`;

// ===== Pomocné funkce =====
const me = () => HK.pid() || HK.tid() || null;                        // člen, za kterého se ukazují odpovědi (hráčka / propojený trenér)
const mineIds = () => [HK.pid(), HK.tid()].filter(Boolean);
const fDay = s => DAYS[new Date(s + "T12:00:00").getDay()] + " " + fd(s);
// Den, čas od – do (trénink), ⏰ sraz (výchozí hodnoty z settings/events, S.es) a místo
const timeTxt = e => { const t = timeParts(e, evDefaults(S.es)); return (t.range ? " · " + esc(t.range) : "") + (t.meet ? " · ⏰ sraz " + t.meet : ""); };
const when = e => fDay(e.date) + timeTxt(e) + (e.place ? " · " + esc(e.place) : "");
// Zrušená událost: značka místo odpovědi
const ansHtml = e => e.cancelled ? '<span class="hma" style="color:var(--no)">❌ Zrušeno</span>' : e.ans ? `<span class="hma">${ANS[e.ans] || ""}</span>`
  : e.past || e.locked ? '<span class="hma mu">–</span>' : '<span class="hma" style="color:var(--wa)">❔ Odpověz</span>';
// Varování cashflow z uloženého rozpočtu běžící sezóny (jen správce pokladny); chyba výpočtu přehled nezastaví
function flowOf() {
  const k = seasonKeyOf(td()), sv = (S.bd || []).find(x => x.id === k);
  if (!sv) return null;
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
// Příští zápas: soupeř, kdy a kde, doma / venku, moje odpověď a uzávěrka přihlašování
function nextHtml(m, mine) {
  if (!m) return `<div class="cd"><h2>🆚 Příští zápas</h2><div class="mu">Žádný naplánovaný zápas.</div></div>`;
  const dl = m.dl ? (m.locked ? "🔒 Přihlašování uzavřeno" : "Přihlášení do " + dlText(m.dl)) : (m.locked ? "🔒 Uzavřeno" : "Termín přihlašování nenastaven");
  return `<div class="cd hmc" data-heo="${esc(m.id)}"><h2>🆚 Příští zápas</h2><div class="hmh"><b style="font-size:18px">${esc(m.opp)}</b><span class="tag">${m.home ? "🏠 doma" : "🚌 venku"}</span></div>
<div class="mu" style="margin-top:4px">${when(m)}</div><div class="hmh" style="margin-top:6px"><span class="mu">${dl}${HK.can("guest") ? "" : " · ✅ " + m.going}</span>${mine ? ansHtml(m) : ""}</div></div>`;
}
// Příštích 7 dní (dnes až dnes + 6, jen nadcházející): tréninky a zápasy s mojí odpovědí (bez propojeného člena počet „Jdu“)
function weekHtml(list, mine) {
  const q = unanswered(list), rows = list.map(e => `<div class="hmr${e.past || e.cancelled ? " past" : ""}" data-heo="${esc(e.id)}"><div><b>${e.type === "match" ? "🆚" : "🏒"} ${e.cancelled ? "<s>" + esc(e.title) + "</s>" : esc(e.title)}</b>${e.type === "match" ? ` <span class="mu">${e.home ? "doma" : "venku"}</span>` : ""}<div class="mu">${when(e)}</div></div>${mine ? ansHtml(e) : e.cancelled ? ansHtml(e) : `<span class="hma">✅ ${e.going}</span>`}</div>`).join("");
  return `<div class="cd"><div class="hmh"><h2 style="margin:0">📅 Příštích ${DAYS_AHEAD} dní</h2>${mine && q ? `<span class="tag sh">❔ ${q} bez odpovědi</span>` : ""}</div>
${rows || '<div class="mu" style="margin-top:6px">V příštích ' + DAYS_AHEAD + ' dnech nejsou žádné události.</div>'}</div>`;
}
// Moje platby: ✅ vše zaplaceno / 💳 k úhradě / ⛔ po splatnosti → Moje platby
function payHtml(p) {
  if (!p || p.state === "none") return "";
  const t = p.state === "ok" ? '<b style="color:var(--ok)">✅ Vše zaplaceno</b>'
    : p.state === "due" ? `<b>💳 K úhradě ${kc(p.debt)}</b><div class="mu">${p.next ? "Nejbližší splatnost " + fmtDue(p.next) : ""}</div>`
    : `<b style="color:var(--no)">⛔ Po splatnosti ${kc(p.over)}</b>${p.debt > p.over ? `<div class="mu">Celkem nezaplaceno ${kc(p.debt)}</div>` : ""}<div class="mu">${p.blocked ? "Přihlášení „Jdu“ je zablokované, dokud nezaplatíš (nebo ti pokladník neudělí výjimku)." : "Máš výjimku od pokladníka – přihlášení není blokované."}</div>`;
  return `<div class="cd hmc" data-hmk${p.state === "over" ? ' style="border-color:var(--no)"' : ""}><h2>💳 Moje platby</h2>${t}<div class="mu" style="margin-top:6px">Klepni pro Moje platby →</div></div>`;
}
// Souhrn pokladny týmu (jen trenér a pokladník): nezaplaceno, po splatnosti, žádosti ✋, varování cashflow
function teamHtml(t, f) {
  const w = f ? `<button class="s hmb" data-hbud style="border-color:${f.neg ? "var(--no)" : "var(--wa)"}">⚠️ Cashflow ${esc(ymLabel(f.ym))}: odhad zůstatku ${kc(f.bal)} – ${f.neg ? "pod nulou" : "pod rezervou " + kc(f.res)} →</button>` : "";
  return `<div class="cd"><h2>💰 Pokladna týmu</h2>
<div class="hmr" data-hpay><div>Nezaplaceno celkem</div><b>${kc(t.unpaid)}</b></div>
<div class="hmr" data-hpay><div>Po splatnosti${t.debtors ? ` <span class="mu">(${t.debtors} ${t.debtors === 1 ? "dlužník" : t.debtors < 5 ? "dlužníci" : "dlužníků"})</span>` : ""}</div><b style="color:${t.over ? "var(--no)" : "var(--ok)"}">${kc(t.over)}</b></div>
<div class="hmr" data-hpay><div>✋ Otevřené žádosti</div><b style="color:${t.reqs ? "var(--wa)" : "inherit"}">${t.reqs}</b></div>${w}</div>`;
}

// ===== Eventy =====
// Odkazy z přehledu: detail události (Zpět vrátí do Domů), živý zápis, Moje platby, Team → Platby / Rozpočet
function bind(a, L) {
  const go = fn => () => { fn(); render(); window.scrollTo(0, 0); };
  a.querySelectorAll("[data-heo]").forEach(b => b.onclick = go(() => { S.tab = "ev"; S.mid = null; S.evf = null; S.evid = b.dataset.heo; S.evBack = "home"; }));
  a.querySelectorAll("[data-hmk]").forEach(b => b.onclick = go(() => { S.tab = "mk"; S.mid = null; S.evid = null; }));
  a.querySelectorAll("[data-hpay]").forEach(b => b.onclick = go(() => { S.tab = "fo"; S.tm = "pay"; S.mid = null; S.evid = null; }));
  a.querySelectorAll("[data-hjr]").forEach(b => b.onclick = () => openJoinWindow());
  a.querySelectorAll("[data-hbud]").forEach(b => b.onclick = go(() => { S.tab = "fo"; S.tm = "bud"; S.mid = null; S.evid = null; }));
  // Manager / trenér / asistent: otevře kartu běžícího zápasu a v ní živý zápis (stejně jako ▶ Pokračovat v živém zápisu)
  // Ostatní členové: 👁 náhled běžícího zápasu jen ke čtení
  a.querySelectorAll("[data-hwt]").forEach(b => b.onclick = go(() => { if (L) S.hw = L.id; }));
  a.querySelectorAll("[data-hlv]").forEach(b => b.onclick = () => { if (!L || !HK.can("sport")) return; S.tab = "ev"; S.evid = null; S.mid = L.id; S.step = 3; S.lv = true; render(); });
}

// ===== Export =====
// Vykreslení záložky 🏠 Domů do kontejneru a
export function homeView(a) {
  // Otevřený náhled živého zápasu; po uzavření zápasu (nebo zrušení živého zápisu) se vrátí přehled
  if (S.hw && !HK.can("sport") && watchable(S.hw)) return liveWatchView(a);
  S.hw = null;
  const now = Date.now(), today = td(), mid = me(), items = homeItems(S.ev, S.ma), L = liveMatch(S.ma);
  const nm = nextMatch(items, now, today), week = upcomingEvents(items, S.at, mid, now, today);
  const next = nm ? {...nm, ans: myAnswer(S.at, nm.id, mid), going: goingCount(S.at, nm.id), locked: regClosed(nm, now, today)} : null;
  const mp = mineIds().length ? myPay(S.ch, mineIds(), now) : null;
  const team = HK.can("money") ? teamHtml(teamPay(S.ch, S.rq, now), flowOf()) : "";
  a.innerHTML = CSS + `<div id="hmw">${joinBanner()}${S.evErr ? `<div class="cd mu">⚠️ Události se nenačetly (${esc(S.evErr)}).</div>` : ""}${liveHtml(L)}${nextHtml(next, !!mid)}${weekHtml(week, !!mid)}${payHtml(mp)}${absCardHtml()}${team}</div>${absModal()}`;
  bind(a, L);
  bindAbs(a);
}
