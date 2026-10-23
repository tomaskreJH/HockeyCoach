// Export rozpočtu sezóny pro valnou hromadu (jen správci pokladny): okno #rp (stejné jako Zápis utkání) s tiskem / PDF a CSV.
// Obsah: schválený rozpočet, aktuální úprava a porovnání, plán po měsících, plnění, cashflow, úpravy po schválení a komentář.
// Komentář se drží jen v paměti zařízení (neukládá se). Nic se nezapisuje. Výpočty: domain/budget-review.js a domain/budget-track.js.
// Struktura: Importy -> Stav -> Pomocné funkce -> Vykreslení -> Eventy -> Export.

// ===== Importy =====
import {TEAM_NAME} from "../config/team-config.js";
import {$, csv, downloadFile, esc, td} from "../core/utils.js";
import {seasonLabel} from "../domain/budget.js";
import {CMP_ROWS, approvedOf, budgetCsvRows, dmy, revList} from "../domain/budget-review.js";
import {kc, ymLabel} from "../domain/cash.js";

// ===== Stav =====
const notes = {};      // komentář k exportu podle sezóny (jen v paměti)
let cur = null;        // otevřený export {key, sv, pl, track, flow, by}

// ===== Pomocné funkce =====
const sg = n => (n > 0 ? "+" : n < 0 ? "−" : "") + kc(Math.abs(n));
const cnt = (k, v) => (k === "n" ? String(v) : kc(v));
const dif = (k, v) => (k === "n" ? (v > 0 ? "+" : "") + v : sg(v));
const tbl = (head, rows) => `<div class="tw"><table style="min-width:0"><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr>${rows.join("")}</table></div>`;

// ===== Vykreslení =====
// Tisková podoba exportu (bez ovládacích prvků)
function reportHtml(o) {
  const a = approvedOf(o.sv), revs = revList(o.sv), pl = o.pl, note = (notes[o.key] || "").trim();
  const state = a ? `✅ Schváleno ${esc(dmy(a.at))} (${esc(a.by)})${revs.length ? ` · úprav po schválení: ${revs.length}` : ""}` : "📝 Neschválený návrh";
  const sum = tbl(["", "Schválený rozpočet", "Aktuální plán", "Rozdíl"], CMP_ROWS.map(([k, label]) => {
    const c = pl.tot[k] || 0, av = a ? a.sum.tot[k] || 0 : null;
    return `<tr><td><b>${esc(label)}</b></td><td>${av == null ? "–" : cnt(k, av)}</td><td>${cnt(k, c)}</td><td>${av == null ? "–" : dif(k, c - av)}</td></tr>`;
  }));
  const am = new Map(a ? a.sum.months.map(m => [m.ym, m]) : []);
  const plan = tbl(["Měsíc", "Událostí", "Příjmy", "Výdaje", "Saldo", "Kumulativně", "Saldo schválené"], pl.months.map(m =>
    `<tr><td><b>${esc(ymLabel(m.ym))}</b></td><td>${m.n}</td><td>${kc(m.inc)}</td><td>${kc(m.out)}</td><td>${sg(m.saldo)}</td><td>${sg(m.cum)}</td><td>${a ? sg((am.get(m.ym) || {}).saldo || 0) : "–"}</td></tr>`));
  const t = o.track;
  const track = t ? tbl(["Měsíc", "Události plán / proběhlo", "Výdaje plán / skut.", "Příjmy plán / skut.", "Saldo plán / skut.", "Odhad kumul."], t.months.map(m => {
    const fut = m.st === "fut", s = v => (fut ? "–" : v);
    return `<tr><td><b>${esc(ymLabel(m.ym))}</b>${m.st === "cur" ? " (běží)" : ""}${m.warn ? " ⚠️" : ""}</td><td>${m.plan.n} / ${s(m.done)}</td><td>${kc(m.plan.out)} / ${s(kc(m.out))}</td><td>${kc(m.plan.inc)} / ${s(kc(m.inc))}</td><td>${sg(m.plan.saldo)} / ${s(sg(m.saldo))}</td><td>${sg(m.fcCum)}</td></tr>`;
  })) + `<div class="mu" style="margin-top:6px">Skutečnost k ${esc(dmy(td()))} · odhad sezóny ${sg(t.tot.fc.saldo)} (plán ${sg(t.tot.plan.saldo)}). ⚠️ = odchylka nad 10 %.</div>` : "";
  const f = o.flow;
  const flow = f ? `<div class="mu" style="margin-bottom:6px">Zůstatek pokladny dnes ${sg(f.today.bal)} · rezerva ${kc(f.res)}</div>` + tbl(["Měsíc", "Očekávané příjmy", "Očekávané výdaje", "Zůstatek na konci", ""],
    f.months.map(m => `<tr><td><b>${esc(ymLabel(m.ym))}</b></td><td>${kc(m.in)}</td><td>${kc(m.out)}</td><td>${sg(m.bal)}</td><td>${m.low === "neg" ? "⛔ pod nulou" : m.low === "res" ? "⚠️ pod rezervou" : "✅"}</td></tr>`)) : "";
  const rev = revs.length ? tbl(["Datum", "Kdo", "Důvod", "Saldo sezóny"], revs.map(r => `<tr><td>${esc(dmy(r.at))}</td><td>${esc(r.by)}</td><td>${esc(r.note)}</td><td>${sg(r.saldo)}</td></tr>`)) : "";
  return `<h2 style="font-size:22px">Rozpočet sezóny ${esc(seasonLabel(o.key))} <small class="mu" style="font-weight:400">– ${esc(TEAM_NAME)}</small></h2>
<div class="cd"><b>${state}</b><div class="mu">Export ${esc(dmy(td()))}${o.by ? " · " + esc(o.by) : ""} · sezóna 1. 8. – 30. 6.</div></div>
<div class="cd"><h2>Souhrn – schválený rozpočet a aktuální plán</h2>${sum}</div>
<div class="cd"><h2>Plán po měsících (aktuální)</h2>${plan}</div>
${track ? `<div class="cd"><h2>Plnění plánu</h2>${track}</div>` : ""}
${flow ? `<div class="cd"><h2>Cashflow – odhad zůstatku pokladny</h2>${flow}</div>` : ""}
${rev ? `<div class="cd"><h2>Úpravy po schválení</h2>${rev}</div>` : ""}
${note ? `<div class="cd"><h2>Komentář</h2><div style="white-space:pre-wrap">${esc(note)}</div></div>` : ""}`;
}
// Vykreslení okna: ovládání (netiskne se) + tisková část
function draw() {
  const e = $("#rp"), o = cur;
  if (!e || !o) return;
  e.style.display = "block";
  e.innerHTML = `<div class="noprint" style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap"><button class="p" id="bpp">🖨 Tisk / PDF</button><button class="s" id="bpc">⬇️ CSV (Excel)</button><button class="s" id="rpx">Zavřít</button></div>
<div class="noprint cd"><label>Komentář pro valnou hromadu (vytiskne se, neukládá se)</label><textarea id="bpn" rows="3" style="width:100%;margin:0">${esc(notes[o.key] || "")}</textarea></div>
<div id="bpr">${reportHtml(o)}</div>`;
  bind();
}

// ===== Eventy =====
function bind() {
  const o = cur;
  $("#bpp").onclick = () => window.print();
  $("#bpc").onclick = () => downloadFile("rozpocet-" + o.key + "-" + td() + ".csv",
    csv(budgetCsvRows({team: TEAM_NAME, key: o.key, at: new Date().toISOString(), by: o.by, sv: o.sv, pl: o.pl, track: o.track, flow: o.flow, note: notes[o.key] || ""})), "text/csv");
  $("#rpx").onclick = closeBudgetPrint;
  // Komentář: uloží se do paměti a překreslí jen tiskovou část (pole zůstane v rozepsaném stavu)
  $("#bpn").oninput = ev => { notes[o.key] = ev.target.value; $("#bpr").innerHTML = reportHtml(o); };
}

// ===== Export =====
// Otevře export: o = {key, sv (uložený dokument), pl (plán uloženého rozpočtu), track, flow (null = sezóna skončila), by}
export function openBudgetPrint(o) { cur = o; draw(); }
// Zavře okno exportu
export function closeBudgetPrint() { cur = null; const e = $("#rp"); if (e) { e.style.display = "none"; e.innerHTML = ""; } }
