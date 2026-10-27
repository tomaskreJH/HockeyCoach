// Události – společný základ pro seznam, detail, formulář a 🏠 Domů: styly #evw, konstanty odpovědí, pomocné funkce (sjednocený seznam
// událostí allEvents, odpovědi atMap, počty, řádky karty), karta události cardHtml (nadpis → místo → čas a sraz → termín → útočnice…), zápis odpovědí (attendance + důvod v attnote v jedné dávce),
// 🚫 nedorazila, pětky a okno s důvodem omluvy. Každá změna odpovědi se zapíše i do 🕘 historie přihlášek (views/att-log-view.js). „Jdu“ hned, „Nejdu“ / „Nejsem jistý“ přes okno; hráčka jen svoji odpověď do termínu,
// blokace „Jdu“ dluhem po splatnosti (vlastní předpisy nebo veřejný souhrn debtors). Okno s důvodem nabízí i naposledy použité vlastní důvody (paměť zařízení).

// ===== Importy =====
import {POS} from "../config/constants.js";
import {isG, pl, pn, pri, score, stOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {dlDefault, dlText, esc, fd, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {canNos, isNos, nosPatch, startMs} from "../domain/attendance.js";
import {costTotal, cxOf, kc} from "../domain/cash.js";
import {memberBlocked} from "../domain/debtors.js";
import {cancelText, isCancelled} from "../domain/event-cancel.js";
import {answerCounts} from "../domain/event-helpers.js";
import {pushReason, reasonChips} from "../domain/event-prefill.js";
import {evDefaults, timeParts} from "../domain/event-time.js";
import {attDoc, NOTE_COLL, noteDoc, noteId} from "../domain/private-data.js";
import {logAtt} from "./att-log-view.js";
import {statusLine} from "./event-badges.js";
import {render} from "./shell.js";

// ===== Konstanty =====
const ANS = {yes: {ic: "✅", t: "Jdu", cls: "pp"}, no: {ic: "❌", t: "Nejdu", cls: "red"}, maybe: {ic: "❓", t: "Nejsem jistý", cls: "sh"}};
const ORD = ["yes", "no", "maybe"];                                   // pořadí tlačítek
const OTHER = "Jiné";                                                  // rychlý důvod, který jen otevře psaní vlastního
const REASONS = ["Nemoc", "Zranění", "Škola", "Práce", "Rodina", OTHER]; // rychlé důvody
const RS_KEY = "hk-reasons";                                          // localStorage: naposledy použité vlastní důvody (jen toto zařízení)
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
#evw .tw table td,#evw .tw table th{white-space:nowrap}
#evw .evhd{background:var(--a2)}
#evw .evhd>div{margin-top:2px}
#evw .evt{font-size:18px;font-weight:700}
#evw .evt .evdt{font-weight:600;white-space:nowrap}
#evw .evs{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:8px;font-size:15px}
#evw .evx>summary{cursor:pointer;min-height:36px;padding:4px 0}
#evw .evtm{font-size:16px;font-weight:600;margin-top:2px}
</style>`;

// ===== Pomocné funkce =====
const pad = n => String(n).padStart(2, "0");
const staff = () => HK.can("sport");                                    // manager / trenér / asistent (přihlášený uživatel)
const cashMgr = () => HK.can("money");                                   // správce pokladny (manager / pokladník)
const isPl = () => HK.can("onlyOwn");                           // přihlášená hráčka nebo hostující (omezený přístup)
const guest = () => HK.can("guest");                            // hostující s účtem: vidí jen sebe
const dayOf = s => new Date(s + "T00:00:00");
const fDay = s => DAYS[dayOf(s).getDay()] + " " + fd(s);
const fDl = dlText;                    // text termínu přihlašování (core/utils.js)
const dlMs = dl => { const t = dl ? new Date(dl).getTime() : NaN; return isNaN(t) ? null : t; };
// Přihlašování je uzavřeno po termínu, po dni události, nebo je událost zrušená
const isLocked = ev => { const t = dlMs(ev.dl); return (t != null && Date.now() > t) || ev.date < td() || isCancelled(ev); };
// Výchozí termín: den před událostí v 18:00 (core/utils.js – stejný i pro nový zápas v modal.js)
const defDl = dlDefault;
const activePl = () => S.pl.filter(p => stOf(p) !== "end").sort((x, y) => pri(x) - pri(y) || x.name.localeCompare(y.name, "cs"));
// Členové realizačního týmu (trenéři, asistenti…) seřazení podle jména; zapisují se do docházky, neplatí a nenominují se
const trs = () => [...S.tr].sort((x, y) => (x.name || "").localeCompare(y.name || "", "cs"));
const isTr = id => S.tr.some(t => t.id === id);
// Jméno člena pro výpis (hráčka s číslem, nebo člen týmu s ikonou)
const who = id => { const t = S.tr.find(x => x.id === id); return pl(id) ? pn(id) : t ? "🎓 " + esc(t.name) : "?"; };
// Vlastní záznam přihlášeného managera / trenéra / asistenta v realizačním týmu (propojení members/{email}.tid), nebo null
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
// Zkrácené datum bez roku („Po 27. 10.“)
const shortDay = s => fDay(s).replace(/ \d{4}$/, "");
// Řádek místa: 📍 místo, u zápasu doma / venku, u správce pokladny 💰 náklady (cost = false v detailu – tam je pokladna zvlášť)
const placeLine = (e, cost = true) => {
  const tot = cost && cashMgr() ? costTotal(e.cx) : 0;
  return [e.place ? "📍 " + esc(e.place) : "", e.type === "match" ? (e.raw.home ? "doma" : "venku") : "", tot ? "💰 náklady " + kc(tot) : ""].filter(Boolean).join(" · ");
};
// Řádek času (větší písmo): 🕔 od – do (zápas jen začátek) · ⏰ sraz
const timeLine = e => { const t = timeParts(e, defs()); return [t.range ? "🕔 " + esc(t.range) : "", t.meet ? "⏰ sraz " + esc(t.meet) : ""].filter(Boolean).join(" · "); };
// Nadpis události v jednom řádku: ikona, název a zkrácené datum (seznam i detail)
const titleLine = (e, cn) => `${e.type === "match" ? "🆚" : "🏒"} ${cn ? "<s>" + esc(e.title) + "</s>" : esc(e.title)} · <span class="evdt">${esc(shortDay(e.date))}</span>`;
// Naposledy použité vlastní důvody v zařízení (bez paměti = prázdný seznam)
const recentR = () => { try { return JSON.parse(localStorage.getItem(RS_KEY) || "[]"); } catch (e) { return []; } };
const saveR = t => { try { localStorage.setItem(RS_KEY, JSON.stringify(pushReason(recentR(), t, REASONS))); } catch (e) { /* bez paměti zařízení */ } };
let attOpen = null;                                                     // id události s rozbalenou docházkou (jinak sbalená)

// ===== Zápis dat =====
// Odpověď a důvod v jedné dávce: attendance bez důvodu (set celého dokumentu smaže i starý attendance.reason), důvod do attnote;
// prázdný důvod = existující dokument attnote se smaže (nový se nezakládá)
function setAt(eid, pid, st, reason) {
  const u = HK.user(), id = noteId(eid, pid), n = noteDoc(eid, pid, reason), b = S.db.batch();
  b.set("attendance/" + id, attDoc(eid, pid, st, new Date().toISOString(), (u && u.email) || ""));
  if (n) b.set(NOTE_COLL + "/" + id, n); else if (S.an[id]) b.delete(NOTE_COLL + "/" + id);
  b.commit();
  logAtt([{eid, pid, st}]);                                            // 🕘 historie přihlášek (tiše, mimo dávku)
}
// Smazání důvodu do dávky, jen když dokument existuje (smazání neexistujícího by pravidla hráčce odmítla)
const delNote = (b, id) => { if (S.an[id]) b.delete(NOTE_COLL + "/" + id); return b; };
// Zrušení odpovědi: odpověď i důvod v jedné dávce
const clearAt = (eid, pid) => { const id = noteId(eid, pid); delNote(S.db.batch().delete("attendance/" + id), id).commit(); logAtt([{eid, pid, st: "del"}]); };
// Změna odpovědi: „Jdu“ se zapíše hned (opakované klepnutí ji zruší), „Nejdu“ a „Nejsem jistý“ otevřou okno s důvodem.
// Hráčka smí měnit jen svoji odpověď a jen do termínu; manager, trenér a asistent kdykoli a za kohokoli (i za člena realizačního týmu).
function answer(eid, pid, st) {
  const ev = allEvents().find(x => x.id === eid);
  if (!ev) return;
  if (!pid) return toast("Nejdřív vyber hráčku");
  if (isCancelled(ev)) return toast("Událost je zrušená – přihlašování je zamčené");
  if (isPl() && pid !== HK.pid()) return toast("Můžeš měnit jen svoji odpověď");
  if (isLocked(ev) && !staff()) return toast("Přihlašování je uzavřeno");
  const cur = (atMap()[eid] || {})[pid];
  // 🚫 nedorazila bez omluvy: odpověď se značkou mění jen manager, trenér a asistent (změna odpovědi značku zruší)
  if (isNos(cur) && !staff()) return toast("Trenér označil 🚫 nedorazila bez omluvy – odpověď už změní jen manager, trenér nebo asistent.");
  // Blokace „Jdu“: neuhrazený předpis po splatnosti bez výjimky (správce pokladny smí zapisovat vždy a výjimky uděluje).
  // Vlastní předpisy jsou v zařízení (S.ch); za jiného člena rozhoduje veřejný souhrn debtors (S.dt) – asistent cizí předpisy nevidí.
  if (st === "yes" && !(cur && cur.st === "yes") && !cashMgr() && memberBlocked(S.ch, S.dt, pid, Date.now())) {
    const own = pid === HK.pid() || pid === HK.tid();
    return toast(own ? "Máš neuhrazený předpis po splatnosti – přihlášení je zablokováno. Zaplať (Moje platby), nebo požádej pokladníka o výjimku."
      : "Člen má neuhrazený předpis po splatnosti – přihlášení „Jdu“ je zablokováno. Výjimku udělí správce pokladny.");
  }
  if (st === "yes") { if (cur && cur.st === "yes") clearAt(eid, pid); else setAt(eid, pid, "yes", ""); return; }
  S.evr = {eid, pid, st, reason: cur && cur.st === st ? (cur.reason || "") : "", had: !!cur};
  render();
}
// Uložení rozdělení do pětek u tréninku (pole lines: {hráčka: číslo pětky, "t:" + člen týmu: číslo pětky}); merge zapíše jen pole lines
// 🚫 nedorazila bez omluvy: přepnutí značky u odpovědi „Jdu“ po začátku události (jen manager, trenér a asistent, merge jen pole nos)
function toggleNos(ev, pid) {
  if (!staff() || isCancelled(ev)) return;
  const cur = (atMap()[ev.id] || {})[pid];
  if (!canNos(cur, startMs(ev.date, ev.time), Date.now())) return toast("🚫 jde označit jen u odpovědi „Jdu“ po začátku události.");
  S.db.doc("attendance/" + noteId(ev.id, pid)).merge(nosPatch(!isNos(cur)));
  logAtt([{eid: ev.id, pid, st: isNos(cur) ? "nos0" : "nos"}]);
}
function saveLines(ev, lines) { S.db.doc("events/" + ev.id).merge({lines}); }

// ===== Vykreslení: karta události (seznam Událostí i 🏠 Domů) =====
// Rychlá tlačítka na kartě: moje odpověď a počet odpovědí týmu (c = counts) v každém tlačítku
const quick = (e, mine, dis, c) => `<div class="evq">${ORD.map(k => `<button class="${mine && mine.st === k ? "on-" + k : ""}" data-qa="${e.id}|${k}" ${dis ? "disabled" : ""}>${ANS[k].ic} ${ANS[k].t} <b class="evqn">${c[k]}</b></button>`).join("")}</div>`;
// Karta: nadpis (ikona, název, datum) → 📍 místo → 🕔 čas a ⏰ sraz (větší) → termín přihlášení → útočnice / obránkyně / brankářky / trenéři
// → řádek stavu (event-badges.js) → rychlá tlačítka za S.evp (selfMember). Klepnutí na kartu (data-eo) otevře detail – obsluhuje volající.
// Hostující nevidí počty ostatních: rychlá tlačítka bez čísel, bez řádku útočnic…
function cardHtml(e, AT, P) {
  const c = counts(e, AT, P), mine = S.evp ? (AT[e.id] || {})[S.evp] : null, cn = isCancelled(e), lk = (isLocked(e) && !staff()) || cn, m = e.raw, g = guest();
  const sc = cn ? ' <span class="tag red">❌ Zrušeno</span>' : e.type === "match" && m.closed ? ` <span class="tag">🔒 ${score(m).join(":")}</span>` : "";
  const cq = g ? {yes: "", no: "", maybe: ""} : c, pL = placeLine(e), tL = timeLine(e);
  return `<div class="cd evi" data-eo="${e.id}"${cn ? ' style="opacity:.7"' : ""}><div class="evh"><b>${titleLine(e, cn)}</b>${sc}</div>
${pL ? `<div class="mu">${pL}</div>` : ""}${tL ? `<div class="evtm">${tL}</div>` : ""}
<div class="mu">${cn ? esc(cancelText(m)) : dlLine(e, isLocked(e))}${S.evp || g ? "" : ` · ✅ ${c.yes} · ❓ ${c.maybe} · ❌ ${c.no}`}</div>
${g ? "" : `<div class="mu">${rosterLine(roster(e, AT))}</div>`}
${statusLine(e)}
${S.evp ? quick(e, mine, lk, cq) : ""}${mine && mine.reason ? `<div class="mu" style="margin-top:6px">${esc(mine.reason)}</div>` : ""}</div>`;
}

// ===== Vykreslení: okno s důvodem =====
// Rychlé důvody = naposledy použité vlastní (nahoře) + základní; klepnutí na důvod rovnou uloží odpověď (jedno klepnutí místo psaní)
function sheetHtml() {
  const r = S.evr;
  if (!r) return "";
  const A = ANS[r.st];
  r.chips = reasonChips(recentR(), REASONS);
  return `<div class="md" id="evsh"><div class="mb"><h2>${A.ic} ${A.t}</h2><div class="mu" style="margin-bottom:8px">${who(r.pid)}</div><label>Důvod${r.st === "no" ? "" : " (nepovinný)"} – klepnutím uložíš</label><div class="chips">${r.chips.map((x, i) => `<button class="chip ${r.reason === x ? "on" : ""}" data-rr="${i}">${esc(x)}</button>`).join("")}</div><input id="evrs" value="${esc(r.reason)}" placeholder="Vlastní důvod (zapamatuje se)"><div class="row"><button class="p" id="evrk">Uložit</button><button class="s" id="evrc">Zavřít</button></div>${r.had ? '<button class="d w" id="evrd" style="margin-top:8px">Zrušit odpověď</button>' : ""}</div></div>`;
}
function bindSheet(a) {
  const r = S.evr;
  if (!r) return;
  const el = id => document.getElementById(id), inp = el("evrs");
  inp.oninput = () => { r.reason = inp.value; };
  // Uložení odpovědi s důvodem (rychlý důvod i tlačítko Uložit); vlastní důvod se zapamatuje v zařízení
  const save = t => { setAt(r.eid, r.pid, r.st, t); if (t) saveR(t); S.evr = null; render(); };
  // „Jiné“ jen přesune kurzor do pole pro vlastní důvod (ten se po uložení nabídne příště nahoře)
  a.querySelectorAll("[data-rr]").forEach(b => b.onclick = () => { const t = r.chips[+b.dataset.rr]; if (t === OTHER) { inp.value = ""; r.reason = ""; inp.focus(); } else if (t) save(t); });
  el("evrc").onclick = () => { S.evr = null; render(); };
  el("evsh").onclick = e => { if (e.target.id === "evsh") { S.evr = null; render(); } };
  const d = el("evrd");
  if (d) d.onclick = () => { clearAt(r.eid, r.pid); S.evr = null; render(); };
  el("evrk").onclick = () => {
    const t = inp.value.trim();
    if (r.st === "no" && !t) return toast("Zadej důvod");
    save(t);
  };
}

// ===== Exporty =====
export {ANS, CSS, MONTHS, ORD, activePl, allEvents, answer, atMap, bindSheet, cardHtml, cashMgr, counts, defDl, defs, dlLine, fDay, guest, isLocked, isPl, myTr, pad, placeLine, roster, rosterLine, saveLines, sheetHtml, staff, timeLine, titleLine, toggleNos, trs};
