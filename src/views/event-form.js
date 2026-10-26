// Formulář události (S.evf): trénink všechna pole (název, datum, čas od – do, ⏰ sraz, místo, termín, poznámka, 🔁 série),
// zápas jen čas, místo, sraz a termín přihlašování. Konec tréninku se počítá automaticky (začátek + výchozí délka), dokud ho nikdo nezmění.
// Úprava zapíše merge jen údaje z formuláře (pětky lines a vyúčtování zůstanou); série přes event-series.js.

// ===== Importy =====
import {upd} from "../core/actions.js";
import {S} from "../core/state.js";
import {clone, dlBeforeStart, esc, fd, toast} from "../core/utils.js";
import {clampMin, defEnd, endOk, MEET_MAX, meetAt, meetDefault, timeFields} from "../domain/event-time.js";
import {CSS, defDl, defs, fDay} from "./event-core.js";
import {bindRep, bindScope, repHtml, repOn, repSave, repSaveText, scopeHtml, serEditSave} from "./event-series.js";
import {render} from "./shell.js";

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

// ===== Exporty =====
export {formView};
