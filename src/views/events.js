// Události a docházka: seznam, kalendář, přihlašování (jdu / nejdu / nejsem jistý), detail události a rozdělení do pětek na tréninku.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Zápis dat -> Vykreslení (seznam, kalendář, detail, formulář, okno s důvodem) -> Eventy -> Export.
// Data: kolekce "events" (tréninky); zápasy se berou z "matches" (čas, místo a termín přihlašování jsou v polích time, place, dl zápasu);
// odpovědi jsou v kolekci "attendance" (id dokumentu = {eventId}_{playerId}).
// Zápasy se nadále zakládají a vedou stejně jako dřív (karta zápasu se otevře tlačítkem v detailu události).

// ===== Importy =====
import {strip, upd} from "../core/actions.js";
import {PG, isG, pl, pn, pri, score, stOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {LS, clone, esc, fd, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {modal} from "./modal.js";
import {render} from "./shell.js";

// ===== Konstanty =====
const ANS = {yes: {ic: "✅", t: "Jdu", cls: "pp"}, no: {ic: "❌", t: "Nejdu", cls: "red"}, maybe: {ic: "❓", t: "Nejsem jistý", cls: "sh"}};
const ORD = ["yes", "no", "maybe"];                                   // pořadí tlačítek
const REASONS = ["Nemoc", "Zranění", "Škola", "Práce", "Rodina", "Jiné"]; // rychlé důvody
const DAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const MONTHS = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
const STAFF = ["trener", "kustod"];                                   // role, které smí měnit odpovědi i po termínu
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

// ===== Pomocné funkce =====
const pad = n => String(n).padStart(2, "0");
const staff = () => STAFF.includes(HK.role());
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
// Sjednocený seznam událostí: tréninky (events) + zápasy (matches)
function allEvents() {
  const t = S.ev.map(e => ({id: e.id, type: "training", title: e.title || "Trénink", date: e.date || "", time: e.time || "", place: e.place || "", dl: e.dl || "", note: e.note || "", raw: e}));
  const m = S.ma.map(x => ({id: x.id, type: "match", title: "Zápas – " + x.opp, date: x.date || "", time: x.time || "", place: x.place || "", dl: x.dl || "", note: "", raw: x}));
  return [...t, ...m].filter(e => e.date);
}
// Odpovědi podle události a hráčky: AT[eventId][playerId]
function atMap() { const M = {}; S.at.forEach(a => { (M[a.eid] = M[a.eid] || {})[a.pid] = a; }); return M; }
function counts(ev, AT, P) {
  const r = {yes: 0, no: 0, maybe: 0, none: 0};
  P.forEach(p => { const a = (AT[ev.id] || {})[p.id]; if (a && r[a.st] != null) r[a.st]++; else r.none++; });
  return r;
}
const dlLine = (e, lk) => e.dl ? (lk ? "🔒 Přihlašování uzavřeno (" + fDl(e.dl) + ")" : "Přihlášení do " + fDl(e.dl)) : (lk ? "🔒 Uzavřeno" : "⚠️ Termín nenastaven");
const whenLine = e => fDay(e.date) + (e.time ? " · " + esc(e.time) : "") + (e.place ? " · " + esc(e.place) : "");

// ===== Zápis dat =====
function setAt(eid, pid, st, reason) {
  const u = HK.user();
  S.db.doc("attendance/" + eid + "_" + pid).set({eid, pid, st, reason: reason || "", at: new Date().toISOString(), by: (u && u.email) || ""})
    .catch(() => toast("Uložení se nepovedlo"));
}
const clearAt = (eid, pid) => S.db.doc("attendance/" + eid + "_" + pid).delete().catch(() => toast("Smazání se nepovedlo"));
// Změna odpovědi: „Jdu“ se zapíše hned (opakované klepnutí ji zruší), „Nejdu“ a „Nejsem jistý“ otevřou okno s důvodem
function answer(eid, pid, st) {
  const ev = allEvents().find(x => x.id === eid);
  if (!ev) return;
  if (!pid) return toast("Nejdřív vyber hráčku");
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
  const c = counts(e, AT, P), mine = S.evp ? (AT[e.id] || {})[S.evp] : null, lk = isLocked(e), mt = e.type === "match", m = e.raw;
  const sc = mt && m.closed ? ` <span class="tag">🔒 ${score(m).join(":")}</span>` : "";
  return `<div class="cd evi" data-eo="${e.id}"><div class="evh"><b>${mt ? "🆚" : "🏒"} ${esc(e.title)}</b>${sc}</div>
<div class="mu">${whenLine(e)}${mt ? (m.home ? " · doma" : " · venku") : ""}</div>
<div class="mu">${dlLine(e, lk)} · ✅ ${c.yes} · ❓ ${c.maybe} · ❌ ${c.no}</div>
${quick(e, mine, lk || !S.evp)}${mine && mine.reason ? `<div class="mu" style="margin-top:6px">${esc(mine.reason)}</div>` : ""}</div>`;
}
function list(a) {
  const P = activePl(), AT = atMap(), evs = allEvents(), today = td();
  if (!S.evc) { const n = new Date(); S.evc = {y: n.getFullYear(), m: n.getMonth()}; }
  if (!S.evp) { const s = LS.get("evPlayer"); if (s) S.evp = s; }
  if (S.evp && !P.some(p => p.id === S.evp)) S.evp = null;
  const mode = S.evm || "up";
  let shown;
  if (mode === "up") shown = evs.filter(e => e.date >= today).sort(asc);
  else if (mode === "past") shown = evs.filter(e => e.date < today).sort((x, y) => asc(y, x));
  else { const pre = S.evc.y + "-" + pad(S.evc.m + 1); shown = evs.filter(e => S.evd ? e.date === S.evd : e.date.startsWith(pre)).sort(asc); }
  a.innerHTML = CSS + `<div id="evw">${S.evErr ? `<div class="cd" style="color:var(--no)">Události nebo docházku se nepodařilo načíst (${esc(S.evErr)}). Zkontroluj pravidla databáze (firestore.rules).</div>` : ""}
<div class="cd"><label>Zapisuji účast za</label><select id="evpl" style="margin-bottom:0"><option value="">— vyber hráčku —</option>${P.map(p => `<option value="${p.id}" ${p.id === S.evp ? "selected" : ""}>${esc((p.num ? "#" + p.num + " " : "") + p.name)}</option>`).join("")}</select></div>
<div class="row" style="margin-bottom:12px"><button class="p" id="evnt">+ Trénink</button><button class="s" id="evnm">+ Zápas</button></div>
<div class="chips">${[["up", "Nadcházející"], ["past", "Minulé"], ["cal", "Kalendář"]].map(([k, t]) => `<button class="chip ${mode === k ? "on" : ""}" data-evm="${k}">${t}</button>`).join("")}</div>
${mode === "cal" ? calHtml(evs, today) : ""}
${shown.length ? shown.map(e => card(e, AT, P)).join("") : '<div class="msg">Žádné události.</div>'}</div>` + sheetHtml();
  // Eventy seznamu
  a.querySelector("#evpl").onchange = e => { S.evp = e.target.value || null; LS.set("evPlayer", S.evp || ""); render(); };
  a.querySelector("#evnt").onclick = () => { S.evf = {id: null, type: "training", title: "Trénink", date: today, time: "", place: "", dl: defDl(today), note: "", lines: {}, dlAuto: true}; render(); };
  a.querySelector("#evnm").onclick = () => { S.M = {k: "NEW", date: today, opp: "", home: true}; modal(); };
  a.querySelectorAll("[data-evm]").forEach(b => b.onclick = () => { S.evm = b.dataset.evm; S.evd = null; render(); });
  a.querySelectorAll("[data-cn]").forEach(b => b.onclick = () => { const c = S.evc; c.m += +b.dataset.cn; if (c.m < 0) { c.m = 11; c.y--; } if (c.m > 11) { c.m = 0; c.y++; } S.evd = null; render(); });
  a.querySelectorAll("[data-cd]").forEach(b => b.onclick = () => { S.evd = S.evd === b.dataset.cd ? null : b.dataset.cd; render(); });
  a.querySelectorAll("[data-eo]").forEach(c => c.onclick = () => { S.evid = c.dataset.eo; render(); window.scrollTo(0, 0); });
  a.querySelectorAll("[data-qa]").forEach(b => b.onclick = ev => { ev.stopPropagation(); const [eid, st] = b.dataset.qa.split("|"); answer(eid, S.evp, st); });
  bindSheet(a);
}

// ===== Vykreslení: detail události =====
// Rozdělení do pětek (jen trénink): hráčky, které jdou, a barevné volby 1.–4. pětky
function linesHtml(ev, A, P) {
  const going = P.filter(p => A[p.id] && A[p.id].st === "yes" && !isG(p)), L = ev.raw.lines || {};
  const cnt = n => going.filter(p => L[p.id] === n).length, free = going.filter(p => !L[p.id]).length;
  return `<div class="cd"><h2>Rozdělení do pětek</h2><div class="mu" style="margin-bottom:8px">Z hráček, které jdou (bez brankářek). Barvy jako v živém zápisu.</div>
<div style="margin-bottom:10px">${[1, 2, 3, 4].map(n => `<span class="evl L${n}">${n}. pětka: ${cnt(n)}</span>`).join("")}<span class="evl L0">bez pětky: ${free}</span></div>
<div class="row" style="margin-bottom:8px"><button class="s" id="evlb">↻ Podle základní formace</button><button class="s" id="evlc">Vymazat</button></div>
${going.length ? going.map(p => `<div class="pr"><div>${pn(p.id)}</div><div class="evln">${[0, 1, 2, 3, 4].map(n => `<button class="chip ${(L[p.id] || 0) === n ? (n ? "L" + n : "on") : ""}" data-ln="${p.id}|${n}">${n || "–"}</button>`).join("")}</div></div>`).join("") : '<div class="msg">Zatím se nikdo nepřihlásil.</div>'}</div>`;
}
function detail(a, ev) {
  const P = activePl(), AT = atMap(), A = AT[ev.id] || {}, c = counts(ev, AT, P), lk = isLocked(ev), mt = ev.type === "match", can = !lk || staff();
  const rows = P.map((p, i) => {
    const x = A[p.id];
    return (i === 0 || pri(P[i - 1]) !== pri(p) ? `<div class="lnl">${PG[pri(p)]}</div>` : "") +
      `<div class="pr"><div>${p.id === S.evp ? "<b>" : ""}${pn(p.id)}${p.id === S.evp ? "</b>" : ""}${x && ANS[x.st] ? ` <span class="tag ${ANS[x.st].cls}">${ANS[x.st].t}</span>` : ""}${x && x.reason ? `<div class="mu">${esc(x.reason)}</div>` : ""}</div><div class="evq">${ORD.map(k => `<button class="${x && x.st === k ? "on-" + k : ""}" data-pa="${p.id}|${k}" ${can ? "" : "disabled"}>${ANS[k].ic}</button>`).join("")}</div></div>`;
  }).join("");
  const key = "ev" + ev.id;
  a.innerHTML = CSS + `<div id="evw"><button class="s" id="evb" style="margin-bottom:12px">← Události</button>
<div class="cd"><div class="evh"><b style="font-size:18px">${mt ? "🆚" : "🏒"} ${esc(ev.title)}</b></div><div class="mu">${whenLine(ev)}${mt ? (ev.raw.home ? " · doma" : " · venku") : ""}</div><div class="mu" style="margin-top:4px">${dlLine(ev, lk)}</div>${ev.note ? `<div style="margin-top:6px">${esc(ev.note)}</div>` : ""}
<div class="grid3" style="margin-top:10px"><div class="stat"><b>${c.yes}</b>jdou</div><div class="stat"><b>${c.maybe}</b>nejistí</div><div class="stat"><b>${c.no}</b>nejdou</div></div>${c.none ? `<div class="mu">Bez odpovědi: ${c.none}</div>` : ""}
<div class="row" style="margin-top:10px">${mt ? '<button class="p" id="evo">🏒 Otevřít zápas</button>' : ""}<button class="s" id="eve">✏️ ${mt ? "Čas, místo, termín" : "Upravit"}</button>${mt ? "" : `<button class="d" id="evd" style="${S.cf === key ? "background:var(--no);color:#fff" : ""}">${S.cf === key ? "Opravdu smazat? Klepni znovu" : "🗑 Smazat"}</button>`}</div></div>
<div class="cd"><h2>Docházka</h2>${lk ? `<div class="mu" style="margin-bottom:6px">${staff() ? "Termín vypršel – jako trenér můžeš odpovědi stále měnit." : "Přihlašování je uzavřeno."}</div>` : ""}${rows || '<div class="msg">Žádné hráčky.</div>'}</div>
${mt ? "" : linesHtml(ev, A, P)}</div>` + sheetHtml();
  // Eventy detailu
  a.querySelector("#evb").onclick = () => { S.evid = null; render(); };
  a.querySelectorAll("[data-pa]").forEach(b => b.onclick = () => { const [pid, st] = b.dataset.pa.split("|"); answer(ev.id, pid, st); });
  const eo = a.querySelector("#evo");
  if (eo) eo.onclick = () => { S.mid = ev.id; S.showLu = false; S.showNom = false; S.step = 1; S.evid = null; render(); window.scrollTo(0, 0); };
  a.querySelector("#eve").onclick = () => { S.evf = {id: ev.id, type: ev.type, title: ev.title, date: ev.date, time: ev.time, place: ev.place, dl: ev.dl || defDl(ev.date), note: ev.note, lines: ev.raw.lines || {}, dlAuto: !ev.dl}; render(); };
  const ed = a.querySelector("#evd");
  if (ed) ed.onclick = () => {
    if (S.cf === key) {
      S.cf = null;
      S.at.filter(x => x.eid === ev.id).forEach(x => S.db.doc("attendance/" + x.id).delete());
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
  bindSheet(a);
}

// ===== Vykreslení: okno s důvodem =====
function sheetHtml() {
  const r = S.evr;
  if (!r) return "";
  const A = ANS[r.st];
  return `<div class="md" id="evsh"><div class="mb"><h2>${A.ic} ${A.t}</h2><div class="mu" style="margin-bottom:8px">${pn(r.pid)}</div><label>Důvod${r.st === "no" ? "" : " (nepovinný)"}</label><div class="chips">${REASONS.map(x => `<button class="chip ${r.reason === x ? "on" : ""}" data-rr="${x}">${x}</button>`).join("")}</div><input id="evrs" value="${esc(r.reason)}" placeholder="Vlastní důvod"><div class="row"><button class="p" id="evrk">Uložit</button><button class="s" id="evrc">Zavřít</button></div>${r.had ? '<button class="d w" id="evrd" style="margin-top:8px">Zrušit odpověď</button>' : ""}</div></div>`;
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
// Trénink: všechna pole; zápas: jen čas, místo a termín přihlašování (ostatní údaje zápasu se mění v kartě zápasu)
function formView(a) {
  const f = S.evf, mt = f.type === "match";
  a.innerHTML = CSS + `<div id="evw"><button class="s" id="evfx" style="margin-bottom:12px">← Zpět</button><div class="cd"><h2>${mt ? "Zápas – čas, místo, termín" : f.id ? "Upravit trénink" : "Nový trénink"}</h2>
${mt ? `<div class="mu" style="margin-bottom:8px">${esc(f.title)} · ${fDay(f.date)}</div>` : `<label>Název</label><input id="ft" value="${esc(f.title)}"><label>Datum</label><input type="date" id="fd" value="${esc(f.date)}">`}
<label>Čas začátku</label><input type="time" id="fti" value="${esc(f.time)}"><label>Místo</label><input id="fp" value="${esc(f.place)}">
<label>Konečný termín přihlašování</label><input type="datetime-local" id="fdl" value="${esc(f.dl)}">
${mt ? "" : `<label>Poznámka</label><input id="fn" value="${esc(f.note)}">`}
<button class="p w" id="evfs" style="min-height:52px">Uložit</button></div></div>`;
  const g = id => { const e = document.getElementById(id); return e ? e.value : null; };
  // Přepsání polí do stavu formuláře (před každým překreslením)
  const readF = () => {
    if (g("ft") != null) f.title = g("ft").trim();
    if (g("fd") != null) f.date = g("fd");
    f.time = g("fti") || ""; f.place = (g("fp") || "").trim(); f.dl = g("fdl") || "";
    if (g("fn") != null) f.note = g("fn").trim();
  };
  const fd_ = document.getElementById("fd");
  if (fd_) fd_.onchange = () => { readF(); if (f.dlAuto) f.dl = defDl(f.date); render(); };
  document.getElementById("fdl").oninput = () => { f.dlAuto = false; };
  document.getElementById("evfx").onclick = () => { S.evf = null; render(); };
  document.getElementById("evfs").onclick = () => {
    readF();
    if (!f.date) return toast("Zadej datum");
    if (!f.dl) return toast("Zadej konečný termín přihlašování");
    if (new Date(f.dl) > new Date(f.date + "T" + (f.time || "23:59"))) return toast("Termín přihlašování musí být před začátkem události");
    if (mt) {
      const m = S.ma.find(x => x.id === f.id);
      if (!m) { S.evf = null; return render(); }
      const n = clone(m); n.time = f.time; n.place = f.place; n.dl = f.dl;
      S.evf = null; return upd(n);
    }
    const d = {type: "training", title: f.title || "Trénink", date: f.date, time: f.time, place: f.place, dl: f.dl, note: f.note || "", lines: f.lines || {}};
    if (f.id) S.db.doc("events/" + f.id).set(d); else S.db.collection("events").add(d);
    S.evf = null; render();
  };
}

// ===== Export =====
export function eventsView(a) {
  if (S.evf) return formView(a);
  if (S.evid) { const ev = allEvents().find(x => x.id === S.evid); if (ev) return detail(a, ev); S.evid = null; }
  list(a);
}