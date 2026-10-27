// Detail události (S.evid): hlavička (jen nadpis s datem, poznámka, moje odpověď), výsledek zápasu a 📋 Zápis utkání, 📋 plán tréninku (trplan-view.js;
// úprava nahradí celý detail), 🎽 rozdělení do dresů zkráceně (úprava line-split-view.js), ℹ️ podrobnosti sbalené, 👥 docházka sbalená (🕘 historie jen v okně),
// žádosti o změnu účasti, pokladna u události (payments.js) a dole ⚙ Úpravy: upravit, ❌ zrušit / obnovit, 🗑 smazat prázdnou,
// série (event-series.js), 🧨 úplné smazání vývojářem. Práva HK.perm(events / matches, e·c·d); hostující vidí formaci z lineuppub.

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {isG, kindOf, PG, pl, pn, pri, score} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {canNos, isNos, nosCount, startMs} from "../domain/attendance.js";
import {cancelBlock, cancelPatch, cancelText, isCancelled, isEmptyEvent, uncancelPatch, wipeText} from "../domain/event-cancel.js";
import {dressName, LINE_NOS, lineCounts, setLine, trKey} from "../domain/event-helpers.js";
import {defEnd, endOk, meetOf, okTime} from "../domain/event-time.js";
import {bindLog, logBtn, logModal} from "./att-log-view.js";
import {attReqBanner, attReqBox, attReqModal, bindAttReqAdmin, bindAttReqBox} from "./att-request-view.js";
import {debtTag} from "./attendance.js";
import {activePl, ANS, answer, atMap, bindSheet, counts, CSS, defDl, defs, dlLine, guest, isLocked, isPl, myTr, ORD, placeLine, roster, rosterLine, saveLines, sheetHtml, staff, timeLine, titleLine, toggleNos, trs} from "./event-core.js";
import {bindSerDel, serDelBtn, serLine} from "./event-series.js";
import {bindSplit, splitHtml} from "./line-split-view.js";
import {bindPay, payHtml} from "./payments.js";
import {matchStatsHtml, renderReport} from "./report.js";
import {render} from "./shell.js";
import {planEditor} from "./trplan-edit.js";
import {bindPlanCard, planCardHtml, planEditing} from "./trplan-view.js";

// ===== Stav =====
let attOpen = null;                                                     // id události s rozbalenou docházkou (jinak sbalená)

// ===== Vykreslení: detail události =====
// Pořadí: hlavička (jen nadpis s datem, poznámka, moje odpověď) → výsledek zápasu → 📋 plán tréninku → 🎽 rozdělení do dresů (zkráceně)
// → ℹ️ Podrobnosti (místo, čas a sraz, termín, počty – sbalené, jsou i na kartě) → 👥 docházka (sbalená) → žádosti → pokladna → ⚙ Úpravy.
// Úprava plánu tréninku se vykreslí místo celého detailu (planEditor).
// 🎽 Rozdělení do dresů (jen trénink, skupiny = pětky v lines): zkráceně „Modrá: Hanča, Bětka“; kdo smí měnit dresy, otevře ✏️ Upravit dresy
// (S.lse = id události) – přihlášené hráčky (bez brankářek) a realizační tým, barevné volby, panel automatického rozdělení a ⭐ výkonnosti
// (views/line-split-view.js). Člen týmu má v lines klíč "t:" + id (vede stanoviště / jde se skupinou).
const short = id => { const p = pl(id); return p ? esc(p.name) : "?"; };
function linesHtml(ev, A, P, T, ro) {
  const going = P.filter(p => A[p.id] && A[p.id].st === "yes" && !isG(p)), goT = T.filter(t => A[t.id] && A[t.id].st === "yes"), L = ev.raw.lines || {};
  const c = lineCounts(L, going.map(p => p.id), goT.map(t => t.id)), edit = !ro && S.lse === ev.id;
  if (!edit) {
    // Zkrácený přehled: jeden řádek na barvu (hráčky, pak 🎓 realizační tým), bez dresu jen pro trenéry
    const rows = LINE_NOS.map(n => {
      const nm = [...going.filter(p => +L[p.id] === n).map(p => short(p.id)), ...goT.filter(t => +L[trKey(t.id)] === n).map(t => "🎓 " + esc(t.name))];
      return nm.length ? `<div style="margin:6px 0"><span class="evl L${n}">${dressName(n)}</span> ${nm.join(", ")}</div>` : "";
    }).join("");
    const free = ro ? "" : going.filter(p => !L[p.id]).map(p => short(p.id));
    const freeH = free.length ? `<div class="mu" style="margin-top:6px">Bez dresu: ${free.join(", ")}</div>` : "";
    const btn = ro ? "" : `<button class="s w" id="lse" style="margin-top:8px">✏️ Upravit dresy</button>`;
    return `<div class="cd"><h2>🎽 Rozdělení do dresů</h2>${rows || `<div class="mu">${ro ? "Trenér zatím dresy nerozdělil." : going.length ? "Zatím nerozděleno – ✨ Připravit trénink nebo ✏️ Upravit dresy." : "Zatím se nikdo nepřihlásil."}</div>`}${freeH}${btn}</div>`;
  }
  // Úprava: řádek = klíč v lines a jméno (HTML), volby – / Modrá / Žlutá / Zelená / Růžová
  const row = (key, label) => `<div class="pr"><div>${label}</div><div class="evln">${[0, ...LINE_NOS].map(n => `<button class="chip ${(L[key] || 0) === n ? (n ? "L" + n : "on") : ""}" data-ln="${key}|${n}" title="${n ? dressName(n) : "bez dresu"}">${n ? dressName(n).slice(0, 1) : "–"}</button>`).join("")}</div></div>`;
  const trH = goT.length ? '<div class="lnl">Realizační tým</div>' + goT.map(t => row(trKey(t.id), "🎓 " + esc(t.name) + (kindOf(t) ? ` <span class="mu">${esc(kindOf(t))}</span>` : ""))).join("") : "";
  return `<div class="cd"><div class="row" style="align-items:center;flex-wrap:nowrap"><h2 style="margin:0;flex:1">🎽 Rozdělení do dresů</h2><button class="p" id="lsdone" style="flex:none">✓ Hotovo</button></div>
<div class="mu" style="margin:6px 0 8px">Z hráček, které jdou (bez brankářek), a přihlášeného realizačního týmu.</div>
<div style="margin-bottom:10px">${LINE_NOS.map(n => `<span class="evl L${n}">${dressName(n)}: ${c.pl[n]}${c.tr[n] ? " + 🎓" + c.tr[n] : ""}</span>`).join("")}<span class="evl L0">bez dresu: ${c.free}</span></div>
${splitHtml(ev, P, A)}
${going.length || goT.length ? going.map(p => row(p.id, pn(p.id))).join("") + trH : '<div class="msg">Zatím se nikdo nepřihlásil.</div>'}</div>`;
}
// Formace pro hostující (lineuppub → S.lu): jen u události, kde má odpověď „Jdu“; pravidla databáze jinou nepustí
function pubLinesHtml(ev, A) {
  const mine = A[HK.pid()], d = S.lu[ev.id];
  if (!mine || mine.st !== "yes") return `<div class="cd"><h2>${ev.type === "match" ? "Formace" : "🎽 Rozdělení do dresů"}</h2><div class="mu">Formaci uvidíš po přihlášení ✅ Jdu.</div></div>`;
  const rows = d && Array.isArray(d.rows) ? d.rows : [];
  return `<div class="cd"><h2>${ev.type === "match" ? "Formace" : "🎽 Rozdělení do dresů"}</h2>${rows.length ? rows.map(r => `<div class="lnl">${esc(r.t)}</div><div>${(r.n || []).map(x => esc(x)).join(" · ")}</div>`).join("") : '<div class="mu">Trenér zatím formaci nezveřejnil.</div>'}</div>`;
}
// Zdroj pro test prázdné události (docházka, vyúčtování, předpisy ze zařízení)
const emptySrc = () => ({attendance: Object.fromEntries(S.at.map(x => [x.id, x])), evcash: Object.fromEntries(S.ec.filter(x => x.settle).map(x => [x.id, x])), charges: Object.fromEntries(S.ch.map(x => [x.id, x]))});
// Řádek zrušení / formulář zrušení / upozornění na vyúčtování (manager, trenér a asistent)
function cancelHtml(ev, mt) {
  const cn = isCancelled(ev), settled = !!(ev.raw.ss || (ev.cx || {}).settle);
  const warn = settled && staff() ? '<div class="mu" style="margin-top:6px;color:var(--wa)">⚠️ Událost je vyúčtovaná – předpisy zůstávají. Storno proveď ručně: Pokladna u události → Znovu otevřít, pak nezaplacené předpisy smazat.</div>' : "";
  if (cn) return `<div class="cd" style="border-color:var(--no)"><b style="color:var(--no)">${esc(cancelText(ev.raw))}</b><div class="mu">Přihlašování je zamčené a událost se nepočítá do Docházky.${mt ? " Zápas nejde zahájit." : ""}</div>${warn}</div>`;
  if (S.evx !== ev.id || !staff()) return "";
  const k = "evx" + ev.id;
  return `<div class="cd" style="border-color:var(--no)"><h2>❌ Zrušit ${mt ? "zápas" : "událost"}</h2><div class="mu" style="margin-bottom:6px">Událost zůstane v historii přeškrtnutá, přihlašování se zamkne a do Docházky se nepočítá. Zrušení lze vrátit.</div>
<input id="evxr" maxlength="200" placeholder="Důvod (např. led nedostupný)" value="${esc(S.evxr)}">${warn}<div class="row" style="margin-top:8px"><button class="d" id="evxo" style="${armed(k) ? "background:var(--no);color:#fff" : ""}">${armed(k) ? "Opravdu zrušit? Klepni znovu" : "❌ Zrušit událost"}</button><button class="s" id="evxc">Zpět</button></div></div>`;
}
function detail(a, ev) {
  const P = activePl(), AT = atMap(), A = AT[ev.id] || {}, c = counts(ev, AT, P), lk = isLocked(ev), mt = ev.type === "match", ownP = isPl(), me = HK.pid(), g = guest(), cn = isCancelled(ev);
  const can = !cn && (!lk || staff()), T = trs(), st0 = startMs(ev.date, ev.time), now = Date.now(), nn = nosCount(A, P.map(p => p.id));
  // 📋 Plán tréninku: konec uložený, jinak začátek + výchozí délka; úprava plánu nahradí celý detail
  const tpCtx = {ev, P, A, T, end: okTime(ev.raw.end) && endOk(ev.time, ev.raw.end) ? ev.raw.end : defEnd(ev.time, defs()), css: CSS}, tpOn = !mt && !g && !cn;
  if (tpOn && planEditing(ev.id)) { planEditor(a, tpCtx); return; }
  // Řádek hráčky v docházce (u přihlášené hráčky se její řádek ukáže i v hlavičce – odpoví bez posouvání dolů)
  const pRow = p => {
    const x = A[p.id], mine = p.id === me, nos = isNos(x), ok = can && (!ownP || mine) && (!nos || staff());   // hráčka mění jen svůj řádek, 🚫 jen trenér
    const showReason = x && x.reason && (!ownP || mine);                // důvody ostatních vidí jen manager, trenér a asistent
    // 🚫 tlačítko: manager / trenér / asistent u odpovědi „Jdu“ po začátku události (ne u zrušené)
    const nb = !ownP && !cn && canNos(x, st0, now) ? `<button class="evns ${nos ? "on" : ""}" data-nos="${p.id}" title="Nedorazila bez omluvy">🚫</button>` : "";
    return `<div class="pr"><div>${p.id === S.evp ? "<b>" : ""}${pn(p.id)}${p.id === S.evp ? "</b>" : ""}${debtTag(p.id)}${x && ANS[x.st] ? ` <span class="tag ${ANS[x.st].cls}">${ANS[x.st].t}</span>` : ""}${nos ? ' <span class="tag red">🚫 Nedorazila</span>' : ""}${showReason ? `<div class="mu">${esc(x.reason)}</div>` : ""}</div><div class="evq">${ORD.map(k => `<button class="${x && x.st === k ? "on-" + k : ""}" data-pa="${p.id}|${k}" ${ok ? "" : "disabled"}>${ANS[k].ic}</button>`).join("")}${nb}</div></div>`;
  };
  const rows = P.map((p, i) => (i === 0 || pri(P[i - 1]) !== pri(p) ? `<div class="lnl">${PG[pri(p)]}</div>` : "") + pRow(p)).join("");
  const myP = me ? P.find(p => p.id === me) : null;                   // vlastní řádek hráčky (i člena týmu, který je zároveň hráčka)
  // Realizační tým: odpovědi mění jen manager, trenér a asistent, hráčka je vidí jen ke čtení (bez důvodů)
  const trRows = T.map((t, i) => {
    const x = A[t.id], ok = can && !ownP, showReason = x && x.reason && !ownP;
    return (i === 0 ? '<div class="lnl">Realizační tým</div>' : "") +
      `<div class="pr"><div>${t.id === S.evp ? "<b>" : ""}🎓 ${esc(t.name)}${t.id === S.evp ? "</b>" : ""} <span class="mu">${esc(kindOf(t))}</span>${x && ANS[x.st] ? ` <span class="tag ${ANS[x.st].cls}">${ANS[x.st].t}</span>` : ""}${showReason ? `<div class="mu">${esc(x.reason)}</div>` : ""}</div><div class="evq">${ORD.map(k => `<button class="${x && x.st === k ? "on-" + k : ""}" data-pa="${t.id}|${k}" ${ok ? "" : "disabled"}>${ANS[k].ic}</button>`).join("")}</div></div>`;
  }).join("");
  // Tlačítka managera / trenéra / asistenta: otevřít zápas, úprava, zrušit / obnovit, smazat prázdnou, série; vývojář smazat úplně
  // Matice práv (⚙️ → 🔐): úprava, zrušení a smazání podle modulu Události / Zápasy
  const pm = mt ? "matches" : "events", canE = HK.perm(pm, "e"), canC = HK.perm(pm, "c"), canD = HK.perm(pm, "d");
  const key = "ev" + ev.id, ku = "evu" + ev.id, kw = "evw" + ev.id, empty = isEmptyEvent(ev.id, ev.raw, emptySrc()), blk = cancelBlock(ev.raw, mt) || (canC ? null : "bez práva rušit");
  const wipeB = HK.can("wipe") && !empty ? `<button class="d" id="evwp" style="${armed(kw) ? "background:var(--no);color:#fff" : ""}">${armed(kw) ? "Smazat VŠE (" + esc(wipeText(HK.wipePreview(mt ? "matches" : "events", ev.id))) + ")? Klepni znovu" : "🧨 Smazat úplně (vývojář)"}</button>` : "";
  const delB = empty && canD ? `<button class="d" id="evd" style="${S.cf === key ? "background:var(--no);color:#fff" : ""}">${S.cf === key ? "Opravdu smazat? Klepni znovu" : ev.raw.ser ? "🗑 Jen tato" : "🗑 Smazat"}</button>` : "";
  const cnB = cn ? (!canC ? "" : `<button class="s" id="evun" style="${armed(ku) ? "background:var(--wa);color:#fff" : ""}">${armed(ku) ? "Obnovit událost? Klepni znovu" : "↩ Obnovit událost"}</button>`) : blk ? "" : '<button class="d" id="evcx">❌ Zrušit</button>';
  // Úpravy události (méně časté) jsou dole pod rozbalením; otevřené samy, když běží potvrzení nebo formulář zrušení
  const ebtn = ownP ? "" : `${canE ? `<button class="s" id="eve">✏️ ${mt ? "Čas, místo, termín" : "Upravit"}</button>` : ""}${cnB}${delB}${mt || !canD ? "" : serDelBtn(ev)}${wipeB}`;
  const eOpen = [key, ku, kw, "evs" + ev.id].includes(S.cf) || S.evx === ev.id;
  const edits = ebtn.trim() ? `<details class="cd evx" ${eOpen ? "open" : ""}><summary><b>⚙ Úpravy ${mt ? "zápasu" : "události"}</b> <span class="mu">upravit, zrušit, smazat</span></summary><div class="row" style="margin-top:10px">${ebtn}</div></details>` : "";
  const openM = !ownP && mt && !cn ? '<button class="p w" id="evo" style="margin-top:10px;min-height:48px">🏒 Otevřít zápas</button>' : "";
  const stats = g ? "" : `<div class="evs"><span>✅ <b>${c.yes}</b> jdou</span><span>❓ <b>${c.maybe}</b></span><span>❌ <b>${c.no}</b></span>${c.none ? `<span class="mu">bez odpovědi ${c.none}</span>` : ""}${nn ? `<span class="mu">🚫 ${nn}</span>` : ""}</div><div style="margin-top:4px;font-size:14px">${rosterLine(roster(ev, AT))}</div>`;
  const pL = placeLine(ev, false), tL = timeLine(ev);                // 📍 místo (bez nákladů – pokladna je níž), 🕔 čas a ⏰ sraz
  const reqMid = staff() ? null : HK.pid() || (myTr() || {}).id || null;
  a.innerHTML = CSS + `<div id="evw"><button class="s" id="evb" style="margin-bottom:12px">${S.evBack === "fo" ? "← Team" : S.evBack === "home" ? "← Domů" : "← Události"}</button>
<div class="cd evhd"><div class="evh"><span class="evt">${titleLine(ev, cn)}</span>${cn ? '<span class="tag red">❌ Zrušeno</span>' : ""}</div>
${ev.note ? `<div style="margin-top:6px">${esc(ev.note)}</div>` : ""}${myP ? `<div style="margin-top:6px">${pRow(myP)}</div>` : ""}${openM}</div>
${attReqBanner()}
${mt && ev.raw.closed ? `<div class="cd"><div class="sc">${score(ev.raw).join(" : ")}</div>${HK.perm("stats", "r") ? '<button class="p w" id="evrp" style="margin:6px 0 10px;min-height:48px">📋 Zápis utkání</button>' + matchStatsHtml(ev.raw) : ""}</div>` : ""}
${tpOn ? planCardHtml(tpCtx) : ""}
${g ? (cn ? "" : pubLinesHtml(ev, A)) : mt ? "" : linesHtml(ev, A, P, T, ownP)}
<details class="cd evx"><summary><b>ℹ️ Podrobnosti</b> <span class="mu">místo, čas a sraz, termín, kdo jde</span></summary><div style="margin-top:8px">
${pL ? `<div>${pL}</div>` : ""}${tL ? `<div class="evtm">${tL}</div>` : ""}
<div class="mu" style="margin-top:4px;font-size:13px">${cn ? "🔒 Přihlašování zamčené (zrušeno)" : dlLine(ev, lk)}</div>
${stats}${mt ? "" : serLine(ev)}</div></details>
<details class="cd evx" id="evatt" ${attOpen === ev.id ? "open" : ""}><summary><b>👥 Docházka</b> <span class="mu">✅ ${c.yes} · ❓ ${c.maybe} · ❌ ${c.no}${nn ? " · 🚫 " + nn : ""}</span></summary><div style="margin-top:8px">${lk && !cn ? `<div class="mu" style="margin-bottom:6px">${staff() ? "Termín vypršel – jako trenér můžeš odpovědi stále měnit." + (st0 <= now ? " 🚫 = přihlášená hráčka nedorazila bez omluvy (klepni znovu pro zrušení)." : "") : "Přihlašování je uzavřeno." + (reqMid && st0 > now ? " O změnu můžeš požádat níže." : "")}</div>` : ""}${ownP && !g ? '<div class="mu" style="margin-bottom:6px">Měnit můžeš jen svůj řádek.</div>' : ""}${rows || '<div class="msg">Žádné hráčky.</div>'}${trRows}${ownP || g ? "" : logBtn(ev)}</div></details>
${cn ? "" : attReqBox(ev, reqMid)}
${payHtml(ev)}
${edits}
${cancelHtml(ev, mt)}</div>` + sheetHtml() + attReqModal() + (ownP || g ? "" : logModal(ev));
  // Eventy detailu
  // Zpět: do Teamu (otevřeno z přehledu plateb), jinak do seznamu událostí
  a.querySelector("#evb").onclick = () => { S.evid = null; S.evx = null; S.lse = null; S.tpv = null; S.tpe = null; if (S.evBack) { S.tab = S.evBack; S.evBack = null; } render(); window.scrollTo(0, 0); };
  // Docházka sbalená: rozbalení se pamatuje pro otevřenou událost (klepnutí na odpověď ji nezavře)
  const att = a.querySelector("#evatt");
  if (att) att.ontoggle = () => {
    const was = attOpen === ev.id;
    attOpen = att.open ? ev.id : was ? null : attOpen;
    if (att.open && !was && !ownP && !g) render();                       // po rozbalení se načte 🕘 historie (časy a kdo zapsal)
  };
  a.querySelectorAll("[data-pa]").forEach(b => b.onclick = () => { const [pid, st] = b.dataset.pa.split("|"); answer(ev.id, pid, st); });
  // Zápis utkání uzavřeného zápasu: stejné okno jako v záložce Soupeři (pro všechny role, jen čtení a export)
  const rp = a.querySelector("#evrp");
  if (rp) rp.onclick = () => { S.rp = ev.id; renderReport(); };
  bindSheet(a);
  bindPay(a, ev);
  bindAttReqAdmin(a);
  bindAttReqBox(a, ev, reqMid);
  if (tpOn) bindPlanCard(a, tpCtx);
  if (ownP) return;                                                   // zbytek jsou správcovské akce (jen manager, trenér a asistent)
  if (!g) bindLog(a, ev);                                             // 🕘 historie přihlášek
  a.querySelectorAll("[data-nos]").forEach(b => b.onclick = () => toggleNos(ev, b.dataset.nos));
  const eo = a.querySelector("#evo");
  if (eo) eo.onclick = () => { S.mid = ev.id; S.showLu = false; S.showNom = false; S.step = 1; S.evid = null; render(); window.scrollTo(0, 0); };
  // Úprava: konec uložený, jinak automaticky začátek + délka; sraz uložený, jinak výchozí podle typu
  const eb = a.querySelector("#eve");
  if (eb) eb.onclick = () => {
    const endSet = !mt && okTime(ev.raw.end) && endOk(ev.time, ev.raw.end);
    S.evf = {id: ev.id, type: ev.type, title: ev.title, date: ev.date, time: ev.time, end: endSet ? ev.raw.end : defEnd(ev.time, defs()), endAuto: !endSet, meet: meetOf(ev, defs()), place: ev.place, dl: ev.dl || defDl(ev.date), note: ev.note, dlAuto: !ev.dl, ser: mt ? null : ev.raw.ser || null, scope: "one"}; render();
  };
  // Zrušení: formulář s důvodem → potvrzení druhým klepnutím → merge pole cancelled; obnovení smaže pole
  const path = (mt ? "matches/" : "events/") + ev.id, u = HK.user(), by = (u && u.email) || "";
  const cx = a.querySelector("#evcx");
  if (cx) cx.onclick = () => { S.evx = ev.id; S.evxr = ""; render(); };
  const xr = a.querySelector("#evxr");
  if (xr) xr.oninput = () => { S.evxr = xr.value; };
  const xc = a.querySelector("#evxc");
  if (xc) xc.onclick = () => { S.evx = null; render(); };
  const xo = a.querySelector("#evxo");
  if (xo) xo.onclick = () => confirm2("evx" + ev.id, () => { S.db.doc(path).merge(cancelPatch(by, new Date().toISOString(), S.evxr)); S.evx = null; S.evxr = ""; toast("Událost zrušena"); render(); });
  const un = a.querySelector("#evun");
  if (un) un.onclick = () => confirm2(ku, () => { S.db.doc(path).merge(uncancelPatch()); toast("Zrušení vráceno – přihlašování platí podle termínu"); render(); });
  // Smazání prázdné události (bez odpovědí a vyúčtování): manager / trenér / asistent; datová vrstva ještě zkontroluje vyúčtování (HK.canDelete)
  const ed = a.querySelector("#evd");
  if (ed) ed.onclick = () => {
    confirm2(key, () => {
      if (!HK.canDelete(mt ? "matches" : "events", ev.id)) { render(); return; }
      S.db.doc(path).delete(); S.evid = null; render();
    });
  };
  // Úplné smazání se vším (vývojář): docházka, důvody, předpisy, úhrady, vyúčtování, cena, žádosti, veřejné dokumenty
  const wp = a.querySelector("#evwp");
  if (wp) wp.onclick = () => confirm2(kw, async () => {
    try { const r = await HK.wipeEvent(mt ? "matches" : "events", ev.id); if (r) { toast("Smazáno úplně: " + wipeText(r)); S.evid = null; S.mid = null; render(); } }
    catch (e) { toast("Smazání se nepovedlo: " + ((e && (e.code || e.message)) || e)); }
  });
  // Smazání „tato a další budoucí“ u tréninku ze série (views/event-series.js)
  bindSerDel(a, ev);
  // 🎽 ✏️ Upravit dresy / ✓ Hotovo (přehled ↔ úprava)
  const lse = a.querySelector("#lse"), lsd = a.querySelector("#lsdone");
  if (lse) lse.onclick = () => { S.lse = ev.id; render(); };
  if (lsd) lsd.onclick = () => { S.lse = null; render(); };
  // Dresy (pětky): klíč je id hráčky, nebo "t:" + id člena realizačního týmu
  a.querySelectorAll("[data-ln]").forEach(b => b.onclick = () => {
    const [key, n] = b.dataset.ln.split("|");
    saveLines(ev, setLine(ev.raw.lines, key, n));
  });
  // Automatické rozdělení (způsob, počet dresů, ⚔ poměr postů), Vymazat a ⭐ Výkonnost: views/line-split-view.js
  if (a.querySelector("#lsgo")) bindSplit(a, ev, P, A);
}

// ===== Exporty =====
export {detail};
