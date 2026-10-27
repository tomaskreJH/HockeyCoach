// Formulář události (S.evf): trénink všechna pole (název, datum, čas od – do, ⏰ sraz, místo, termín, poznámka, 🔁 série),
// zápas jen čas, místo, sraz a termín přihlašování. Konec tréninku se počítá automaticky (začátek + výchozí délka), dokud ho nikdo nezmění.
// Úprava zapíše merge jen údaje z formuláře (pětky lines a vyúčtování zůstanou); série přes event-series.js.
// Nový trénink se předvyplní z posledního tréninku (stejný den v týdnu přednostně) – domain/event-prefill.js; po ruční změně polí už ne.

// ===== Importy =====
import {upd} from "../core/actions.js";
import {S} from "../core/state.js";
import {clone, dlBeforeStart, esc, fd, toast} from "../core/utils.js";
import {trainingPrefill} from "../domain/event-prefill.js";
import {clampMin, defEnd, endOk, MEET_MAX, meetAt, meetDefault, timeFields} from "../domain/event-time.js";
import {CSS, defDl, defs, fDay} from "./event-core.js";
import {bindRep, bindScope, repHtml, repOn, repSave, repSaveText, scopeHtml, serEditSave} from "./event-series.js";
import {render} from "./shell.js";

// ===== Pomocné funkce: předvyplnění nového tréninku =====
// Přepíše do formuláře název, čas, konec, sraz a místo posledního tréninku pro datum formuláře (f.pfAuto = pole zatím nikdo neměnil)
function applyPrefill(f) {
  const p = trainingPrefill(S.ev, f.date);
  f.pfFrom = null;
  if (!p) return;
  Object.assign(f, p);
  if (p.meet == null) f.meet = defs().meetT;
  f.pfFrom = true;
}
/** Nový trénink na `date`: výchozí hodnoty + předvyplnění z posledního tréninku. */
function newTraining(date) {
  const f = {id: null, type: "training", title: "Trénink", date, time: "", end: "", endAuto: true, meet: defs().meetT, place: "", dl: defDl(date), note: "", dlAuto: true, pfAuto: true};
  applyPrefill(f);
  return f;
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
${!f.id && f.pfFrom ? `<div class="mu" style="margin:4px 0">↺ Čas, sraz a místo podle posledního tréninku${f.pfAuto ? " – při změně data se dopočítají" : ""}</div>` : ""}
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
  // Změna data: automatický termín přihlašování a (u nového tréninku bez ručních změn) předvyplnění podle dne v týdnu
  if (fd_) fd_.onchange = () => { readF(); if (f.dlAuto) f.dl = defDl(f.date); if (!f.id && !mt && f.pfAuto) applyPrefill(f); render(); };
  // Ruční změna názvu, času, konce, srazu nebo místa vypne další předvyplňování
  ["ft", "fti", "fte", "fme", "fp"].forEach(id => { const e = document.getElementById(id); if (e) e.addEventListener("input", () => { f.pfAuto = false; }); });
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

// ===== Exporty =====
export {formView, newTraining};
