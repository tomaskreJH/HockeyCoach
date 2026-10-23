// Úvodní přehled 🏠 Domů: čisté výpočty bez DOM – příští zápas, nadcházející události příštích 7 dní s mojí odpovědí,
// stav mých plateb, souhrn pokladny týmu pro správce, varování cashflow a běžící zápas.
// Nic nezapisuje; vstupem jsou data ze stavu aplikace (events, matches, attendance, charges, requests) a dnešní datum / čas.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Události -> Platby -> Živý zápas -> Exporty (u funkcí).

// ===== Importy =====
import {score} from "../core/selectors.js";
import {debtOf, r2, restOf} from "./cash.js";
import {openReqs} from "./requests.js";

// ===== Konstanty =====
export const PER_LABEL = ["", "1. třetina", "2. třetina", "3. třetina", "Prodloužení"];   // název třetiny podle live.per

// ===== Pomocné funkce =====
const p2 = n => String(n).padStart(2, "0");
const iso = d => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
// Okamžik začátku události v ms (bez času = začátek dne)
const startMs = e => new Date(e.date + "T" + (/^\d{1,2}:\d{2}$/.test(e.time || "") ? e.time.padStart(5, "0") : "00:00")).getTime();
const byStart = (a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""));

// ===== Události =====
// Počet dní nadcházejícího období v přehledu (dnes + 6 dalších dní)
export const DAYS_AHEAD = 7;
// První a poslední den období „příštích n dní“ od dneška today ("RRRR-MM-DD"), dnešek se počítá
export function daysRange(today, n = DAYS_AHEAD) {
  const d = new Date(today + "T12:00:00"), end = new Date(d); end.setDate(d.getDate() + n - 1);
  return {from: iso(d), to: iso(end)};
}
// Sjednocený seznam tréninků (events) a zápasů (matches) pro přehled; zápas nese soupeře a doma / venku.
// end (konec tréninku) a meet (sraz v minutách) se přenesou beze změny – zobrazení dopočítá domain/event-time.js
export function homeItems(ev, ma) {
  const t = (ev || []).map(e => ({id: e.id, type: "training", title: e.title || "Trénink", date: e.date || "", time: e.time || "", end: e.end || "", meet: e.meet, place: e.place || "", dl: e.dl || ""}));
  const m = (ma || []).map(x => ({id: x.id, type: "match", title: "Zápas – " + (x.opp || "?"), opp: x.opp || "", home: !!x.home, date: x.date || "", time: x.time || "", meet: x.meet, place: x.place || "", dl: x.dl || "", closed: !!x.closed, live: !!x.live}));
  return [...t, ...m].filter(e => e.date);
}
// Přihlašování uzavřeno: po termínu dl nebo po dni události (stejné pravidlo jako v Událostech)
export function regClosed(e, now, today) {
  const t = e.dl ? new Date(e.dl).getTime() : NaN;
  return (!isNaN(t) && now > t) || e.date < today;
}
// Odpověď člena mid na událost eid ("yes" | "no" | "maybe" | null); bez člena null
export const myAnswer = (at, eid, mid) => { if (!mid) return null; const a = (at || []).find(x => x.eid === eid && x.pid === mid); return a ? a.st || null : null; };
// Počet odpovědí „Jdu“ u události
export const goingCount = (at, eid) => (at || []).filter(x => x.eid === eid && x.st === "yes").length;
// Příští zápas: nejbližší neuzavřený a nezahájený zápas, který ještě nezačal (dnešní zápas do svého začátku); null = žádný
export function nextMatch(items, now, today) {
  const list = (items || []).filter(e => e.type === "match" && !e.closed && !e.live && e.date >= today && (e.date > today || !e.time || startMs(e) >= now));
  return list.sort(byStart)[0] || null;
}
// Nadcházející události příštích 7 dní (dnes až dnes + 6) seřazené od nejbližší. Uplynulé se vynechají: dřívější dny,
// dnešní událost po svém začátku (bez času až zítra) a uzavřený zápas; běžící zápas ukazuje karta 🔴 nahoře.
// Každá s mojí odpovědí, počtem „Jdu“ a uzavřením přihlašování (po termínu nebo zahájený zápas).
export function upcomingEvents(items, at, mid, now, today, n = DAYS_AHEAD) {
  const {from, to} = daysRange(today, n);
  const ahead = e => e.date > today || !e.time || startMs(e) >= now;
  return (items || []).filter(e => e.date >= from && e.date <= to && ahead(e) && !e.closed && !e.live).sort(byStart).map(e => ({
    ...e, ans: myAnswer(at, e.id, mid), going: goingCount(at, e.id), locked: regClosed(e, now, today), past: false
  }));
}
// Počet událostí, na které člen ještě neodpověděl a přihlašování je otevřené (❓ v přehledu)
export const unanswered = list => (list || []).filter(e => !e.ans && !e.locked && !e.past).length;

// ===== Platby =====
// Moje platby: state "none" (žádný předpis), "ok" (vše zaplaceno), "due" (k úhradě), "over" (po splatnosti);
// debt = nezaplaceno celkem, over = z toho po splatnosti, blocked = přihlášení „Jdu“ blokováno (bez výjimky), next = nejbližší splatnost nezaplaceného
export function myPay(ch, ids, now) {
  const d = debtOf(ch, ids || []);
  const open = d.items.filter(x => restOf(x) > 0 && x.due).map(x => x.due).sort();
  const nextDue = open.find(s => new Date(s).getTime() >= now) || open[0] || "";
  const state = !d.items.length ? "none" : !d.debt ? "ok" : d.over ? "over" : "due";
  return {state, debt: d.debt, over: d.over, blocked: d.blocked, next: nextDue, n: d.items.filter(x => restOf(x) > 0).length};
}
// Souhrn pokladny týmu pro správce: nezaplaceno celkem, po splatnosti (částka a počet dlužníků), otevřené žádosti
export function teamPay(ch, rq, now) {
  let unpaid = 0, over = 0;
  const who = new Set();
  (ch || []).forEach(x => {
    const r = restOf(x);
    if (r <= 0) return;
    unpaid += r;
    if (x.due && new Date(x.due).getTime() < now) { over += r; who.add(x.mid); }
  });
  return {unpaid: r2(unpaid), over: r2(over), debtors: who.size, reqs: openReqs(rq).length};
}
// Varování cashflow z výsledku cashflow() (domain/budget-track.js): první měsíc pod rezervou / pod nulou, jinak null
export function flowWarn(flow) {
  const f = flow && flow.first;
  return f ? {ym: f.ym, bal: f.bal, neg: f.bal < 0, res: flow.res || 0} : null;
}

// ===== Živý zápis =====
// Běžící zápas (zahájený živý zápis, neuzavřený): {id, opp, home, us, them, per, perText, running, ended}; null = žádný
export function liveMatch(ma) {
  const m = (ma || []).filter(x => x && x.live && !x.closed).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0];
  if (!m) return null;
  const [us, them] = score(m), per = +m.live.per || 1, ended = !!m.end;
  return {id: m.id, opp: m.opp || "", home: !!m.home, us, them, per, perText: ended ? "Konec zápasu" : PER_LABEL[per] || per + ". třetina", running: !!m.live.running, ended};
}
