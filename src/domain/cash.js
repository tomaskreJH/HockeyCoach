// Doména: ⚠️ pokladna (čisté funkce bez DOM) – skupiny a koeficient osob, šablony událostí, výpočet a úhrady předpisů, zůstatek,
// přehled dluhů, měsíční příspěvky, platy realizačního týmu, hospodaření po měsících, zpráva pro příjemce a QR, částky pro CSV.
// Platí jen hráčky (brankářky a realizační tým ne); skupina grp (monthly | single) podle měsíce z historie grpH (grpAt / asOf / grpOf).
// Dva účty: hlavní (iban) a provozní (iban2), předpis i pohyb nese acc ("main" | "op"); převod mezi nimi = pohyb k "tr" (from → to).
// Pravidla výpočtu jsou u sekcí Výpočet předpisů, Měsíční příspěvky, Účty a Zpráva pro příjemce.
// ===== Importy =====
import {isG, pl} from "../core/selectors.js";
import {ibanToCz} from "./bank-account.js";

// ===== Konstanty =====
export const GRP = {monthly: "Příspěvek", single: "Za událost"};
// Rychlé volby koeficientu v procentech (zadat jde libovolnou hodnotu 0–100 %)
export const FX_QUICK = [100, 75, 50, 25, 0];
export const WHO = {monthly: "Hráčky s příspěvkem", single: "Hráčky platící za událost", exempt: "Osvobozené (zvýhodněné)"};
export const STAFF_PAY = {none: "Bez platu", month: "Měsíčně", event: "Za událost"};
export const CATS = {
  in: ["Příspěvky", "Platby za události", "Vklady / dary", "Jiné příjmy"],
  out: ["Pronájem ledu", "Rozhodčí", "Doprava", "Vybavení", "Služby / doména", "Platy trenérů", "Jiné výdaje"]
};
export const CAT_EVENT = "Platby za události";
export const CAT_CONTRIB = "Příspěvky";
export const CAT_SALARY = "Platy trenérů";
// Předpona id „události“ měsíčního příspěvku: předpis má eid "c_RRRR-MM" a id "c_RRRR-MM_{pid}"
export const CPRE = "c_";
// Předpona id výdaje platu v pokladně: "sal_RRRR-MM_{tid}" (jeden plat za člena a měsíc)
const SPRE = "sal_";
// Účty týmu: hlavní a provozní
export const ACC = {main: "Hlavní účet", op: "Provozní účet"};
// Druh pohybu „převod mezi vlastními účty“ {k: "tr", from, to, amt, d}: do příjmů a výdajů týmu se nepočítá, mění jen zůstatky účtů
export const TR = "tr";
// Předpona pro osobní variabilní symbol souhrnné platby (hash "vs_" + id osoby)
const PVS = "vs_";
const MONTHS = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];

// ===== Pomocné funkce =====
const cl = o => JSON.parse(JSON.stringify(o));
const sum = (a, f) => (a || []).reduce((s, x) => s + (+f(x) || 0), 0);
const p2 = n => String(n).padStart(2, "0");
const ceil = x => Math.ceil(x - 1e-9);
// Historie způsobu placení (plpay.grpH) a skupina bez historie
const hasH = p => !!p && Array.isArray(p.grpH) && p.grpH.length > 0;
const grp0 = p => (p && p.grp === "single" ? "single" : "monthly");
const hSort = h => h.slice().sort((a, b) => String(a.ym || "").localeCompare(String(b.ym || "")));
// Zaokrouhlení na haléře (částky úhrad)
export const r2 = n => Math.round((+n || 0) * 100) / 100;
export const kc = n => (Math.round(n * 100) / 100).toLocaleString("cs-CZ") + " Kč";
// Platné datum ve tvaru RRRR-MM-DD
export const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && !isNaN(new Date(s + "T12:00:00"));
// Osvobozená (zvýhodněná) hráčka
export const exOf = p => !!p && p.ex === true;
// Koeficient 0..1 (chybí-li, 100 %)
export const fxOf = p => { const v = p && p.fx != null ? +p.fx : 1; return v >= 0 && v <= 1 ? v : 1; };
// Skupina plateb: s historií grpH podle dnešního měsíce, jinak pole grp
export const grpOf = p => (hasH(p) ? grpAt(p, ymNow()) : grp0(p));
// Skupina platná v den / měsíci day ("RRRR-MM-DD" nebo "RRRR-MM"): poslední záznam historie s ym <= měsíc dne; bez historie grp
export function grpAt(p, day) {
  if (!hasH(p)) return grp0(p);
  const ym = String(day || "").slice(0, 7);
  let g = null;
  hSort(p.grpH).forEach(e => { if (String(e.ym || "") <= ym) g = e.grp === "single" ? "single" : "monthly"; });
  return g || grp0(p);
}
// Hráčky se skupinou platnou v den události (pro calcCash – výpočet samotný se nemění); hráčky bez historie beze změny
export const asOf = (P, day) => (P || []).map(p => { if (!hasH(p)) return p; const o = {...p, grp: grpAt(p, day)}; delete o.grpH; return o; });
// Historie po změně skupiny na grp od měsíce ym (stejný měsíc se nahradí); bez historie vznikne výchozí záznam {ym: "", grp: dnešní}
export function grpHWith(p, grp, ym) {
  const h = hasH(p) ? p.grpH.filter(e => String(e.ym || "") !== ym).map(e => ({ym: String(e.ym || ""), grp: e.grp === "single" ? "single" : "monthly"})) : [{ym: "", grp: grpOf(p)}];
  h.push({ym, grp: grp === "single" ? "single" : "monthly"});
  return hSort(h);
}
// 🕘 Zpětná změna způsobu placení (pokladník): grp v měsících from..to (to prázdné = trvale od from, pozdější změny se zruší);
// po to se vrátí způsob, který tehdy platil. Vrací novou historii bez opakování stejného způsobu, nebo null (chybné měsíce).
export function grpHRange(p, grp, from, to) {
  if (!ymOk(from) || (to && (!ymOk(to) || to < from))) return null;
  const g = grp === "single" ? "single" : "monthly", next = to ? ymAdd(to, 1) : "", back = next ? grpAt(p, next) : null;
  let h = grpHWith(p, g, from);
  h = next ? grpHWith({grpH: h.filter(e => !(e.ym > from && e.ym <= to))}, back, next) : h.filter(e => !(e.ym > from));
  return hSort(h).filter((e, i, A) => i === 0 || e.grp !== A[i - 1].grp);
}
// Úseky způsobu placení pro zobrazení: [{from ("" = od začátku), to ("" = dosud), grp}]
export function grpSpans(p) {
  const h = hasH(p) ? hSort(p.grpH) : [{ym: "", grp: grp0(p)}];
  return h.map((e, i) => ({from: String(e.ym || ""), to: h[i + 1] ? ymAdd(String(h[i + 1].ym), -1) : "", grp: e.grp === "single" ? "single" : "monthly"}));
}
// Skupina pro výpočet události: osvobozená má vlastní skupinu, jinak skupina plateb
export const grpKey = p => (exOf(p) ? "exempt" : grpOf(p));
// Koeficient v procentech pro zobrazení ("50 %", "33,3 %") a převod zadaných procent na koeficient 0..1
export const fxPct = fx => String(Math.round((+fx || 0) * 1000) / 10).replace(".", ",") + " %";
export function pctToFx(v) {
  const n = +String(v == null ? "" : v).replace(",", ".").replace("%", "").trim();
  if (String(v).trim() === "" || isNaN(n)) return null;
  return Math.round(Math.min(100, Math.max(0, n)) * 10) / 1000;   // přesnost 0,1 %
}
// Splatnost: datum události + N dní, 23:59 (formát datetime-local)
export function defDue(date, days) {
  const d = new Date(date + "T12:00:00");
  if (isNaN(d)) return "";
  d.setDate(d.getDate() + (+days || 0));
  return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()) + "T23:59";
}
export const fmtDue = s => { const d = new Date(s); return isNaN(d) ? "" : d.getDate() + ". " + (d.getMonth() + 1) + ". " + p2(d.getHours()) + ":" + p2(d.getMinutes()); };
// Variabilní symbol = číselný hash id předpisu (nejvýše 10 číslic)
export const vsHash = id => { let h = 5381; for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0; return String(h >>> 0); };
const chargeId = (eid, mid) => eid + "_" + mid;
export const restOf = x => Math.max(0, r2((+x.amt || 0) - (+x.paid || 0)));
export const overdue = x => restOf(x) > 0 && !!x.due && new Date(x.due).getTime() < Date.now();
// Měsíc: "RRRR-MM", popisek "listopad 2026" a krátký "11/2026", posun o n měsíců
export const ymOk = s => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s || ""));
export const ymNow = () => { const d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1); };
export const ymLabel = ym => (ymOk(ym) ? MONTHS[+ym.slice(5) - 1] + " " + ym.slice(0, 4) : String(ym || ""));
export const ymShort = ym => (ymOk(ym) ? +ym.slice(5) + "/" + ym.slice(0, 4) : String(ym || ""));
export function ymAdd(ym, n) { const d = new Date(+ym.slice(0, 4), +ym.slice(5) - 1 + n, 1); return d.getFullYear() + "-" + p2(d.getMonth() + 1); }
// Poslední den měsíce ve tvaru RRRR-MM-DD
export const ymLast = ym => ym + "-" + p2(new Date(+ym.slice(0, 4), +ym.slice(5), 0).getDate());

// ===== Pokladna: zůstatek, kategorie, úhrady =====
// Součty příjmů a výdajů a zůstatek z pohybů (cash); s cfg a acc jen pohyby daného účtu.
// Převody (k "tr") se do příjmů a výdajů nepočítají; u jednoho účtu jsou zvlášť v tr {in, out} a jsou v zůstatku účtu.
export function sumCash(cs, cfg, acc) {
  let i = 0, o = 0, ti = 0, to = 0;
  (cs || []).forEach(x => {
    const a = +x.amt || 0;
    if (x.k === TR) { if (acc) { if (trTo(x) === acc) ti += a; if (trFrom(x) === acc) to += a; } return; }
    if (acc && cashAcc(x, cfg) !== acc) return;
    if (x.k === "in") i += a; else if (x.k === "out") o += a;
  });
  return acc ? {in: r2(i), out: r2(o), tr: {in: r2(ti), out: r2(to)}, bal: r2(i - o + ti - to)} : {in: r2(i), out: r2(o), bal: r2(i - o)};
}
// Zdrojový a cílový účet převodu (výchozí hlavní → provozní)
export const trFrom = x => accKey(x && x.from, "main");
export const trTo = x => accKey(x && x.to, trFrom(x) === "main" ? "op" : "main");
// Kontrola převodu mezi vlastními účty: dva různé účty, kladná částka, platné datum (vrací {amt} nebo {err})
export function trCheck(f, two) {
  if (!two) return {err: "Převod jde jen mezi dvěma různými účty (⚙️ → Nastavení pokladny)"};
  if (!f || f.from === f.to || !ACC[f.from] || !ACC[f.to]) return {err: "Vyber dva různé účty"};
  const amt = r2(+String(f.amt).replace(",", "."));
  if (!(amt > 0)) return {err: "Zadej kladnou částku"};
  if (!isDay(f.d)) return {err: "Zadej datum převodu"};
  return {amt};
}
// Součty podle kategorií zvlášť pro příjmy a výdaje
export function catSums(cs) {
  const r = {in: {}, out: {}};
  (cs || []).forEach(x => {
    if (x.k !== "in" && x.k !== "out") return;
    const c = x.cat || "Bez kategorie";
    r[x.k][c] = r2((r[x.k][c] || 0) + (+x.amt || 0));
  });
  return r;
}
// Kontrola částky úhrady předpisu: kladná a nejvýše zbývající dluh (vrací {amt} nebo {err})
export function payAmount(x, v) {
  const a = r2(+String(v).replace(",", "."));
  if (!(a > 0)) return {err: "Zadej kladnou částku"};
  const rest = restOf(x);
  if (rest <= 0) return {err: "Předpis je už zaplacený"};
  if (a > rest + 1e-9) return {err: "Částka je vyšší než zbývá (" + kc(rest) + ")"};
  return {amt: Math.min(a, rest)};
}
// Plán úhrad nad AKTUÁLNÍM stavem předpisů (v22.18.2 – čte se v transakci ze serveru, ne ze zastaralé kopie zařízení):
// list = [{cid, amt (null = celý zbytek), ...}], chOf(cid) = předpis {id, amt, paid, …} nebo null (smazaný).
// Částka se omezí zbytkem po dřívějších položkách téhož předpisu; zaplacený nebo smazaný předpis vypadne (skip).
// Vrací {lines: [{x, a, part, o}], paid: Map(cid → přidaná částka), skip}; part = částečná úhrada (zbude dluh).
export function payPlan(list, chOf) {
  const paid = new Map(), lines = [];
  let skip = 0;
  (list || []).forEach(o => {
    const x = chOf(o.cid);
    if (!x) { skip++; return; }
    const rest = r2(restOf(x) - (paid.get(x.id) || 0)), a = o.amt == null ? rest : r2(Math.min(+o.amt || 0, rest));
    if (!(a > 0)) { skip++; return; }
    paid.set(x.id, r2((paid.get(x.id) || 0) + a));
    lines.push({x, a, part: a < restOf(x), o});
  });
  return {lines, paid, skip};
}

// ===== Nastavení a šablony =====
const W = (m, s, x) => ({monthly: {pays: m, mode: "calc", flat: 0}, single: {pays: s, mode: "calc", flat: 0}, exempt: {pays: x, mode: "calc", flat: 0}});
export const DEF_TPL = {
  train: {name: "Pravidelný trénink", cost: [], who: W(false, true, false), dueDays: null, acc: "op"},
  extra: {name: "Mimořádný trénink", cost: [], who: W(true, true, false), dueDays: null, acc: "op"},
  home: {name: "Domácí zápas", cost: [], who: W(false, true, false), dueDays: null, acc: "op"},
  away: {name: "Venkovní zápas", cost: [], who: W(false, false, false), dueDays: null, acc: "op"}   // bez vyúčtování hráčkám, náklady nese soupeř
};
// Normalizované nastavení pokladny z dokumentu settings/cash (výchozí šablony se vždy doplní)
export function cashCfg(r) {
  r = r || {};
  const tpls = {};
  Object.entries(DEF_TPL).forEach(([k, v]) => { tpls[k] = cl(v); });
  Object.entries(r.tpls || {}).forEach(([k, v]) => { tpls[k] = {name: v.name || k, cost: cl(v.cost || []), who: {...W(false, false, false), ...cl(v.who || {})}, dueDays: v.dueDays != null ? +v.dueDays : null, acc: accKey(v.acc, "op")}; });
  const c = r.cats || {};
  return {
    iban: r.iban || "", iban2: r.iban2 || "", acc: {contrib: accKey(r.acc && r.acc.contrib, "main")}, contrib: +r.contrib || 0,
    // Zabezpečení účtů a okamžitá platba: pole se přenesou jen když existují (uložení nesmí přidat prázdné hodnoty)
    ...accMeta(r), inst: r.inst !== false,
    due: {ev: r.due && r.due.ev != null ? +r.due.ev : 3, cm: r.due && r.due.cm != null ? +r.due.cm : 1},
    cats: {in: c.in && c.in.length ? cl(c.in) : cl(CATS.in), out: c.out && c.out.length ? cl(c.out) : cl(CATS.out)},
    tpls
  };
}
export const tplFor = (type, home) => (type === "match" ? (home === false ? "away" : "home") : "train");

// ===== Vyúčtování událostí =====
// Efektivní nastavení události: uložená pole v evcash (tpl, cost, who, due), jinak výchozí šablona podle typu
export function evCash(ev, cfg) {
  const r = ev.cx || {}, home = (ev.raw || {}).home, tk = r.tpl || tplFor(ev.type, home), t = cfg.tpls[tk] || cfg.tpls[tplFor(ev.type, home)] || DEF_TPL.train;
  const who = cl(r.who || t.who);
  Object.keys(WHO).forEach(g => { if (!who[g]) who[g] = {pays: false, mode: "calc", flat: 0}; });
  return {tpl: tk, cost: cl(r.cost || t.cost), who, due: r.due || "", acc: accKey(r.acc || t.acc, "op")};
}
export const costTotal = r => sum((r || {}).cost, x => x.amt);
// Vyúčtování události z kolekce evcash/{eid} (čtou jen správci pokladny); bez dokumentu prázdný objekt
export function cxOf(id, ec) {
  const c = (ec || []).find(x => x.id === id);
  if (!c) return {};
  const o = {...c};
  delete o.id;
  return o;
}
// Dluh osoby (ids = její pid / tid): předpisy, dluh, část po splatnosti a blokace přihlášení „Jdu“ (po splatnosti a bez výjimky exc)
export function debtOf(ch, ids) {
  const items = (ch || []).filter(x => ids.includes(x.mid));
  let debt = 0, over = 0, blocked = false;
  items.forEach(x => {
    const r = restOf(x);
    if (r > 0) { debt += r; if (overdue(x)) { over += r; if (!x.exc) blocked = true; } }
  });
  return {items, debt: r2(debt), over: r2(over), blocked};
}
// Variabilní symbol unikátní mezi předpisy: při shodě hashe se zvyšuje o 1 (nejvýše 10 číslic)
export function uniqVs(id, taken) {
  let n = +vsHash(id);
  while (taken.has(String(n))) n = (n + 1) % 4294967296;
  return String(n);
}
// Pole zabezpečení účtů z dokumentu settings/cash (jen existující)
export const ACC_META = ["ibanBy", "ibanOk", "ibanAt", "ibanCode", "ibanPend"];
export function accMeta(r) { const o = {}; ACC_META.forEach(k => { if (r && r[k] != null && r[k] !== "") o[k] = cl(r[k]); }); return o; }
// QR platba v českém formátu SPD (zpráva jen ASCII bez znaku *)
const asciiFull = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .,\-]/g, "");
// Zpráva pro QR: bez diakritiky, VELKÁ písmena, jen znaky alfanumerického režimu QR, jednoduché mezery, max. 60 znaků
export const qrMsg = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9 $%+\-./:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60).trim();
// Text QR platby; inst = požadavek na okamžitou platbu (PT:IP, banka bez podpory ho ignoruje)
export const spdPay = (iban, amt, vs, msg, inst) => "SPD*1.0*ACC:" + String(iban).replace(/\s+/g, "").toUpperCase() + "*AM:" + (+amt).toFixed(2) + "*CC:CZK*X-VS:" + String(vs).replace(/\D/g, "").slice(0, 10) + (qrMsg(msg) ? "*MSG:" + qrMsg(msg) : "") + (inst ? "*PT:IP" : "");
// ===== Účty =====
// Starší záznamy bez acc: příspěvek → účet příspěvků z nastavení, událost → provozní, ostatní → hlavní. Zůstatek = příjmy (k "in") − výdaje (k "out"); zůstatek účtu ± převody (k "tr").
// iban / iban2 mění jen potvrzený návrh (ibanPend, potvrdí jiný správce pokladny; ibanBy, ibanOk, ibanAt) – vynucují pravidla databáze.
// Platný klíč účtu, jinak výchozí
const accKey = (v, def) => (v === "main" || v === "op" ? v : def);
// Tým má dva různé účty (provozní je vyplněný a liší se od hlavního)
export const twoAcc = cfg => !!cfg.iban2 && cfg.iban2 !== cfg.iban;
// IBAN účtu; chybí-li jeden z účtů, použije se druhý
export const accIban = (cfg, a) => (a === "op" ? cfg.iban2 || cfg.iban : cfg.iban || cfg.iban2);
// Název účtu pro zobrazení (při jednom účtu „Účet týmu“)
export const accName = (cfg, a) => (twoAcc(cfg) ? ACC[accKey(a, "main")] : "Účet týmu");
// Název účtu i s číslem účtu v českém tvaru (QR okno a obrázek, přehled účtů), např. „Provozní účet 19-2000145399/0800“
export const accLabel = (cfg, a) => { const cz = ibanToCz(accIban(cfg, a)); return accName(cfg, a) + (cz ? " " + cz : ""); };
// Měsíc, za který je výdaj (pym „RRRR-MM“, jinak měsíc data pohybu) – např. led účtovaný zpětně za minulý měsíc
export const forYm = x => (ymOk(x && x.pym) ? x.pym : String((x && x.d) || "").slice(0, 7));
// Účet předpisu: uložené acc, u starších předpisů podle druhu (příspěvek → účet příspěvků, událost → provozní)
export const accOf = (x, cfg) => accKey(x && x.acc, x && x.kind === "contrib" ? cfg.acc.contrib : "op");
// Účet pohybu v pokladně: uložené acc, u starších podle kategorie
export const cashAcc = (x, cfg) => accKey(x && x.acc, x && x.cat === CAT_CONTRIB ? cfg.acc.contrib : x && x.cat === CAT_EVENT ? "op" : "main");
// Osobní variabilní symbol pro souhrnnou platbu více předpisů (stejný pro osobu napříč měsíci)
export const personVs = mid => vsHash(PVS + mid);

// ===== Zpráva pro příjemce =====
// Zpráva msg se uloží do předpisu při vzniku; stejný text je v QR, u úhrady v pokladně i v CSV (párování s výpisem).
// QR: jen znaky alfanumerického režimu (VELKÁ písmena bez diakritiky, číslice, mezera, $ % + - . / :) kvůli mBank; PT:IP = okamžitá platba (inst).
// Zpráva pro příjemce: za co se platí, aby pokladník platbu poznal i bez variabilního symbolu.
// it = {type: "match" | "training" | "contrib", title, date "RRRR-MM-DD", opp, ym "RRRR-MM"}, name = jméno plátce (nepovinné).
// Tvary: "Zápas 10.10. Sokol - Jana", "Trénink 14.10. - Jana", "Mimořádný trénink 18.10. - Jana", "Příspěvek 10/2026 - Jana".
// Do QR jde přes qrMsg (bez diakritiky, VELKÁ písmena, nejvýše 60 znaků), proto je jméno na konci a případné zkrácení postihne jen jeho konec.
const dayMonth = d => { const [, m, x] = String(d || "").split("-"); return m && x ? +x + "." + +m + "." : ""; };
export function payMsg(it, name) {
  const t = it || {};
  let s;
  if (t.type === "contrib") s = "Příspěvek " + ymShort(t.ym);
  else if (t.type === "match") s = ["Zápas", dayMonth(t.date), t.opp || ""].filter(Boolean).join(" ");
  else if (t.type === "training") s = [t.title || "Trénink", dayMonth(t.date)].filter(Boolean).join(" ");
  else s = [t.title || "Platba", dayMonth(t.date)].filter(Boolean).join(" ");
  const n = String(name || "").trim();
  return n ? s + " - " + n : s;
}
// Popis události pro zprávu z dat tréninku / zápasu (type "training" | "match", raw = dokument)
export const evItem = (type, raw) => (type === "match" ? {type: "match", date: (raw || {}).date || "", opp: (raw || {}).opp || ""} : {type: "training", title: (raw || {}).title || "Trénink", date: (raw || {}).date || ""});
// Popis předpisu podle eid: příspěvek, trénink, zápas, nebo smazaná událost. D = {ev, ma} (stav aplikace).
export function chargeItem(eid, D) {
  const ym = contribYm(eid);
  if (ym) return {type: "contrib", ym, title: "Příspěvek " + ymLabel(ym), date: ym + "-01"};
  const t = (D.ev || []).find(x => x.id === eid);
  if (t) return {...evItem("training", t), title: t.title || "Trénink"};
  const m = (D.ma || []).find(x => x.id === eid);
  return m ? {...evItem("match", m), title: "Zápas – " + (m.opp || "")} : {type: "", title: "Událost (smazána)", date: ""};
}
// Jméno osoby (hráčka nebo člen realizačního týmu) pro zprávu. D = {pl, tr}
export const payerName = (mid, D) => { const p = (D.pl || []).find(x => x.id === mid) || (D.tr || []).find(x => x.id === mid); return p ? p.name || "" : ""; };
// Zpráva k předpisu: uložená při vzniku (msg), u starších předpisů sestavená z aktuálních dat
export const chargeMsg = (x, D) => (x && x.msg) || payMsg(chargeItem(x && x.eid, D), payerName(x && x.mid, D));
// Zpráva souhrnné platby: „Souhrn: Trénink 14.10., Zápas 10.10. Sokol - Jana“; když se nevejde do 60 znaků QR,
// zkrácený tvar „Souhrn 4 platby 10.10.-24.10. - Jana“. items = popisy předpisů (chargeItem), name = jméno plátce.
export function multiMsg(items, name) {
  const n = String(name || "").trim(), tail = n ? " - " + n : "";
  const full = "Souhrn: " + items.map(i => payMsg(i, "")).join(", ") + tail;
  if (asciiFull(full).trim().length > 60) {   // celý text se do QR nevejde (MSG max. 60 znaků) – použije se zkrácený tvar
    const ds = items.map(i => i.date || "").filter(Boolean).sort(), dm = d => dayMonth(d);
    const range = ds.length ? " " + dm(ds[0]) + (ds.length > 1 && ds[0] !== ds[ds.length - 1] ? "-" + dm(ds[ds.length - 1]) : "") : "";
    const cnt = items.length, word = cnt >= 2 && cnt <= 4 ? "platby" : "plateb";
    return "Souhrn " + cnt + " " + word + range + tail;
  }
  return full;
}

// ===== Výpočet předpisů =====
// Cena hráčky = (součet nákladů ÷ počet VŠECH přihlášených hráček v poli) nebo pevná částka, × fx (0..1, zadává se v %), nahoru na celé Kč.
// Do dělitele se každá přihlášená hráčka počítá jako jeden celý kus (bez ohledu na skupinu, osvobození i fx).
// Osvobozená = jen ex: true; v událostech vlastní skupina „Osvobozené“ s vlastním nastavením (platí / neplatí, výpočet / pevná částka).
// c = {cost, who}; P = přihlášené hráčky (objekty, bez brankářek). Vrací řádky po hráčkách a součty.
// Dělitel N = počet všech přihlášených hráček (každá jako jeden celý kus); skupina (i osvobozené) určuje jen, zda a jak platí, fx výši podílu.
export function calcCash(c, P) {
  const N = P.length, total = sum(c.cost, x => x.amt);
  const lines = P.map(p => {
    const g = grpKey(p), w = (c.who || {})[g] || {}, fx = fxOf(p);
    let amt = 0;
    if (N > 0 && w.pays) amt = ceil((w.mode === "flat" ? (+w.flat || 0) : total / N) * fx);
    return {pid: p.id, g, fx, amt: Math.max(0, amt)};
  });
  const payers = lines.filter(l => l.amt > 0);
  return {N, total, lines, payers, collect: sum(payers, l => l.amt)};
}

// ===== Předpisy (charges) =====
// have = stávající předpisy události podle mid. Zaplacená částka se zachová; nezaplacené předpisy hráček, které už neplatí, se smažou.
// ext = {acc, msg: pid -> zpráva}: účet a zpráva pro příjemce. Stávající předpis si zprávu ponechá; účet jen pokud už má úhradu.
export function planCharges(eid, k, due, have, all, ext) {
  const X = ext || {};
  const set = [], del = [], keep = new Set(k.payers.map(x => x.pid));
  const taken = new Set((all || []).map(c => c.vs).filter(Boolean));   // už použité variabilní symboly
  k.payers.forEach(x => {
    const id = chargeId(eid, x.pid), o = have[x.pid];
    let vs = o && o.vs;
    if (!vs) { vs = uniqVs(id, taken); taken.add(vs); }
    const acc = o && o.acc && +o.paid > 0 ? o.acc : accKey(X.acc, "op"), msg = (o && o.msg) || (X.msg ? X.msg(x.pid) : "");
    set.push({id, d: {eid, mid: x.pid, amt: x.amt, paid: o ? (+o.paid || 0) : 0, due, kind: "event", vs, acc, ...(msg ? {msg} : {}), ...(o && o.exc ? {exc: true} : {})}});
  });
  Object.values(have).forEach(o => { if (!keep.has(o.mid) && !(+o.paid > 0)) del.push(chargeId(eid, o.mid)); });
  return {set, del};
}

// ===== Přehled dluhů =====
// ch = předpisy (S.ch), evOf = id události -> událost (u příspěvků pseudo-událost měsíce); předpisy smazaných událostí a hráček se přeskočí.
export function ledger(ch, evOf) {
  const by = {};
  let owed = 0, got = 0;
  ch.forEach(x => {
    if (!pl(x.mid) || !evOf(x.eid)) return;
    const r = by[x.mid] = by[x.mid] || {pid: x.mid, items: [], debt: 0, paid: 0, open: 0};
    r.items.push(x);
    const rest = restOf(x), pd = Math.min(+x.paid || 0, +x.amt || 0);
    r.paid += pd; got += pd;
    if (rest > 0) { r.debt += rest; r.open++; owed += rest; }
  });
  const rows = Object.values(by);
  return {rows, owed: r2(owed), got: r2(got), debtors: rows.filter(r => r.debt > 0).length};
}

// ===== Měsíční příspěvky (F4) =====
// Příspěvek = částka z nastavení × fx; platí skupina monthly (ne ukončené, ne brankářky, ne fx 0; osvobozené jen po zahrnutí pro měsíc).
export const isContrib = x => !!x && x.kind === "contrib";
export const contribEid = ym => CPRE + ym;
// Měsíc z eid příspěvku ("c_RRRR-MM" -> "RRRR-MM"), jinak prázdný řetězec
export const contribYm = eid => { const s = String(eid || ""); return s.startsWith(CPRE) && ymOk(s.slice(CPRE.length)) ? s.slice(CPRE.length) : ""; };
// Pseudo-událost pro výpisy (přehled dluhů, Moje platby): název a datum = 1. den měsíce
export const contribEvent = ym => ({id: contribEid(ym), type: "contrib", title: "Příspěvek " + ymLabel(ym), date: ym + "-01", time: "", raw: {}, cx: {}});
// Splatnost příspěvku: den v měsíci z nastavení (1–28, předem), 23:59
export const contribDue = (ym, day) => ym + "-" + p2(Math.min(28, Math.max(1, Math.round(+day) || 1))) + "T23:59";
// Kdo příspěvek platí: hráčky ve skupině monthly, ne ukončené, ne brankářky, fx > 0. Výchozí částka = příspěvek × fx (nahoru na Kč).
// Osvobozené hráčky jsou v seznamu také (ex: true), ale ve výchozím stavu se příspěvek nevystavuje (obrazovka je musí zahrnout).
// players = soupiska, cfg = nastavení pokladny, have = existující předpisy příspěvku za měsíc podle mid, ym = měsíc příspěvku (skupina
// podle historie grpH platná v tom měsíci; bez ym dnešní). Vrací řádky {pid, fx, ex, amt, has} seřazené podle jména (has = už vystavený předpis).
export function contribRows(players, cfg, have, ym) {
  const base = +cfg.contrib || 0, gOf = p => (ym ? grpAt(p, ym) : grpOf(p));
  const pays = (players || []).filter(p => (p.st || "act") !== "end" && !isG(p) && gOf(p) === "monthly" && fxOf(p) > 0);
  const ids = new Set(pays.map(p => p.id));
  // Hráčky, které už předpis mají (i když mezitím změnily skupinu), se v seznamu ukážou také
  Object.keys(have || {}).forEach(id => { const p = (players || []).find(x => x.id === id); if (p && !ids.has(id)) { pays.push(p); ids.add(id); } });
  return pays.sort((a, b) => (a.name || "").localeCompare(b.name || "", "cs"))
    .map(p => ({pid: p.id, fx: fxOf(p), ex: exOf(p), amt: ceil(base * fxOf(p)), has: (have || {})[p.id] || null}));
}
// Vystavení příspěvků: rows = vybrané řádky {pid, amt}; existující předpisy se nepřepisují (idempotentní). all = všechny předpisy (VS).
// msgOf = pid -> zpráva pro příjemce; účet = účet příspěvků z nastavení.
export function contribPlan(ym, rows, cfg, all, msgOf) {
  const eid = contribEid(ym), due = contribDue(ym, cfg.due.cm), set = [];
  const have = new Set((all || []).map(c => c.id));
  const taken = new Set((all || []).map(c => c.vs).filter(Boolean));
  rows.forEach(r => {
    const id = chargeId(eid, r.pid), amt = ceil(+r.amt || 0);
    if (have.has(id) || !(amt > 0)) return;
    const vs = uniqVs(id, taken);
    taken.add(vs);
    const msg = msgOf ? msgOf(r.pid) : "";
    set.push({id, d: {eid, mid: r.pid, amt, paid: 0, due, kind: "contrib", vs, acc: cfg.acc.contrib, ...(msg ? {msg} : {})}});
  });
  return set;
}

// ===== Platy realizačního týmu (F4) =====
// Návrh platů za měsíc: staff.pay = {m: "month" | "event", amt}. U platu za událost se počítají události měsíce do dneška,
// na které je člen přihlášen „Jdu“ (evs = [{id, date}], at = docházka). paid = už zapsaný výdaj platu v pokladně (cash id sal_RRRR-MM_{tid}).
export function salaryRows(staff, ym, evs, at, cs, today) {
  const inMonth = (evs || []).filter(e => String(e.date || "").startsWith(ym) && e.date <= today).map(e => e.id);
  const going = new Set((at || []).filter(a => a.st === "yes").map(a => a.eid + "|" + a.pid));
  return (staff || []).filter(t => t.pay && (t.pay.m === "month" || t.pay.m === "event"))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "cs"))
    .map(t => {
      const rate = +t.pay.amt || 0, n = t.pay.m === "event" ? inMonth.filter(eid => going.has(eid + "|" + t.id)).length : 0;
      const amt = r2(t.pay.m === "month" ? rate : rate * n), id = salaryId(ym, t.id);
      return {tid: t.id, name: t.name || "?", m: t.pay.m, rate, n, amt, id, paid: (cs || []).find(x => x.id === id) || null};
    });
}
export const salaryId = (ym, tid) => SPRE + ym + "_" + tid;
// Datum výdaje platu: u běžícího měsíce dnešek, jinak poslední den měsíce
export const salaryDay = (ym, today) => (today.startsWith(ym) ? today : ymLast(ym));

// ===== Hospodaření po měsících (F4) =====
// Pohyby pokladny po měsících (podle data pohybu) a zůstatek na konci měsíce. Vrací seřazené řádky {ym, in, out, net, bal}.
export function monthRows(cs) {
  const by = {};
  (cs || []).forEach(x => {
    if (x.k !== "in" && x.k !== "out") return;
    const ym = String(x.d || "").slice(0, 7);
    if (!ymOk(ym)) return;
    const r = by[ym] = by[ym] || {ym, in: 0, out: 0};
    r[x.k] += +x.amt || 0;
  });
  let bal = 0;
  return Object.values(by).sort((a, b) => a.ym.localeCompare(b.ym)).map(r => {
    bal += r.in - r.out;
    return {ym: r.ym, in: r2(r.in), out: r2(r.out), net: r2(r.in - r.out), bal: r2(bal)};
  });
}
// Pohyby jednoho měsíce
export const cashOfMonth = (cs, ym) => (cs || []).filter(x => String(x.d || "").startsWith(ym));
// Předpisy se splatností v měsíci: předepsáno, zaplaceno, zbývá (zvlášť události a příspěvky)
export function chargesOfMonth(ch, ym) {
  const r = {ev: {amt: 0, paid: 0, n: 0}, contrib: {amt: 0, paid: 0, n: 0}};
  (ch || []).forEach(x => {
    if (!String(x.due || "").startsWith(ym)) return;
    const g = isContrib(x) ? r.contrib : r.ev;
    g.amt += +x.amt || 0; g.paid += Math.min(+x.paid || 0, +x.amt || 0); g.n++;
  });
  [r.ev, r.contrib].forEach(g => { g.amt = r2(g.amt); g.paid = r2(g.paid); g.rest = r2(g.amt - g.paid); });
  return r;
}

// ===== Předvyplnění výdaje (v22.31) =====
// Poslední ručně zapsaný výdaj (k: "out" bez výplaty platu mid a úhrady cid; nejnovější datum, při shodě později zapsaný) → {cat, payee, acc} pro nový ➖ výdaj.
// Kategorie jen pokud je stále v nastavení pokladny (cats), účet jen hlavní / provozní; bez výdaje null. Částka ani datum se nepřebírají.
export function lastOutPrefill(cs, cats) {
  const L = (cs || []).map((x, i) => ({x, i})).filter(({x}) => x && x.k === "out" && !x.cid && !x.mid)
    .sort((a, b) => String(b.x.d || "").localeCompare(String(a.x.d || "")) || b.i - a.i);
  if (!L.length) return null;
  const x = L[0].x, C = cats || [];
  return {cat: C.includes(x.cat) ? x.cat : "", payee: String(x.payee || "").trim(), acc: x.acc === "op" ? "op" : "main"};
}

// ===== Částky pro CSV (text CSV: csv v core/utils.js) =====
// Částka pro CSV s desetinnou čárkou (Excel v češtině)
export const csvNum = n => String(r2(n)).replace(".", ",");
