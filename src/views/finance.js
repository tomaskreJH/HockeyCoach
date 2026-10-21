// Přehled plateb a dlužných částek (trenér a pokladník): režim „💰 Platby“ v záložce Události.
// Struktura: Importy -> Stav -> Pomocné funkce -> Vykreslení (souhrn, po hráčkách, po událostech) -> Eventy.
// Data: kolekce charges (S.ch); událost se bere ze seznamu předaného z events.js (tréninky + zápasy).
// Dluh = součet nezaplacených zbytků předpisů hráčky. Úhrada (částečná i plná) se zapisuje přes okno úhrady z payments.js.

// ===== Importy =====
import {pl, pn, pri} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, fd, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {costTotal, fmtDue, kc, ledger, overdue, restOf} from "../domain/cash.js";
import {openPay, payCharge} from "./payments.js";
import {render} from "./shell.js";

// ===== Stav (jen pro tuto obrazovku) =====
let vw = "pl";      // pl = podle hráček, ev = podle událostí
let all = false;    // v přehledu hráček zobrazit i ty bez dluhu
let open = null;    // rozbalená hráčka

// ===== Pomocné funkce =====
const desc = (x, y) => y.date.localeCompare(x.date);
const icon = e => (e.type === "match" ? "🆚" : "🏒");

// ===== Vykreslení =====
// evs = sjednocený seznam událostí z events.js, AT = odpovědi podle události a člena (pro počet účastí)
export function financeHtml(evs, AT) {
  if (!HK.isCash()) return "";
  const today = td(), byId = {};
  evs.forEach(e => { byId[e.id] = e; });
  const L = ledger(S.ch, id => byId[id]);
  const past = evs.filter(e => e.date < today);
  const err = S.payErr ? `<div class="cd" style="color:var(--no)">Pokladnu se nepodařilo načíst (${esc(S.payErr)}). Zkontroluj pravidla databáze (firestore.rules).</div>` : "";

  // Souhrn
  const grid = `<div class="grid3"><div class="stat"><b style="color:${L.owed ? "var(--no)" : "var(--ok)"}">${kc(L.owed)}</b>dluh celkem</div><div class="stat"><b>${kc(L.got)}</b>vybráno</div><div class="stat"><b>${L.debtors}</b>dlužnic</div></div>`;
  const tabs = `<div class="chips"><button class="chip ${vw === "pl" ? "on" : ""}" data-fv="pl">Podle hráček</button><button class="chip ${vw === "ev" ? "on" : ""}" data-fv="ev">Podle událostí</button></div>`;

  // Uplynulé události s náklady, které ještě nemají uzavřené vyúčtování
  const unset = past.filter(e => costTotal(e.raw) > 0 && !e.raw.settle).sort(desc);
  const unsetH = unset.length
    ? `<div class="cd"><h2>⚠️ Neuzavřená vyúčtování (${unset.length})</h2><div class="mu" style="margin-bottom:6px">Mají náklady, ale vyúčtování zatím není uzavřeno. Otevři událost a uzavři ho.</div>${unset.map(e => `<div class="it" data-fe="${e.id}"><div><b>${icon(e)} ${esc(e.title)}</b><div class="mu">${fd(e.date)} · náklady ${kc(costTotal(e.raw))}</div></div><span class="tag sh">neuzavřeno</span></div>`).join("")}</div>`
    : "";

  let body;
  if (vw === "pl") {
    // Přehled po hráčkách: největší dluh nahoře
    const rows = L.rows.filter(r => all || r.debt > 0)
      .sort((x, y) => y.debt - x.debt || pri(pl(x.pid)) - pri(pl(y.pid)) || pl(x.pid).name.localeCompare(pl(y.pid).name, "cs"));
    const toggle = `<div class="chips" style="margin-top:8px"><button class="chip ${all ? "on" : ""}" data-fall>Zobrazit i bez dluhu</button></div>`;
    body = `<div class="cd"><h2>Dluhy podle hráček</h2>${toggle}${rows.length ? rows.map(r => {
      const att = past.filter(e => ((AT[e.id] || {})[r.pid] || {}).st === "yes").length, key = "fa" + r.pid;
      let h = `<div class="it" data-fo="${r.pid}"><div><b>${pn(r.pid)}</b><div class="mu">Účast ${att} z ${past.length} uplynulých · nezaplaceno ${r.open}× · zaplaceno ${kc(r.paid)}</div></div><b style="color:${r.debt ? "var(--no)" : "var(--ok)"}">${r.debt ? kc(r.debt) : "✅ 0 Kč"}</b></div>`;
      if (open === r.pid) {
        const items = r.items.map(x => ({x, e: byId[x.eid]})).sort((a, b) => desc(a.e, b.e));
        h += `<div style="padding:0 0 10px 8px;border-bottom:1px solid var(--bd)">${items.map(({x, e}) => `<div class="pr"><div>${icon(e)} ${esc(e.title)}<div class="mu">${fd(e.date)} · ${kc(+x.amt || 0)}${x.paid ? " · zaplaceno " + kc(+x.paid) : ""}${x.due ? " · splatnost " + fmtDue(x.due) : ""}${overdue(x) ? " · ⏰ po splatnosti" : ""}</div></div><div class="evq">${restOf(x) > 0 ? `<button data-fp="${x.id}" style="min-width:150px">💳 Zaplatit ${kc(restOf(x))}</button>` : '<button class="on-yes" disabled style="min-width:150px">✅ Zaplaceno</button>'}</div></div>`).join("")}${r.open ? `<button class="${S.cf === key ? "d" : "p"} w" data-fa="${r.pid}" style="margin-top:10px;min-height:48px;${S.cf === key ? "background:var(--no);color:#fff" : ""}">${S.cf === key ? "Opravdu? Klepni znovu" : "✅ Zaplatila vše (" + r.open + "×, " + kc(r.debt) + ")"}</button>` : ""}</div>`;
      }
      return h;
    }).join("") : `<div class="msg">${all ? "Zatím žádné předpisy." : "Nikdo nedluží. 🎉"}</div>`}<div class="mu" style="margin-top:8px">Zobrazují se jen hráčky s předpisem. Klepnutím na hráčku rozbalíš její předpisy, tlačítkem 💳 zapíšeš celou nebo částečnou úhradu.</div></div>`;
  } else {
    // Přehled po událostech: nejnovější nahoře
    const rows = evs.map(e => ({e, ps: S.ch.filter(x => x.eid === e.id && pl(x.mid))})).filter(o => o.ps.length).sort((a, b) => desc(a.e, b.e));
    body = `<div class="cd"><h2>Předpisy podle událostí</h2>${rows.length ? rows.map(({e, ps}) => {
      const un = ps.filter(x => restOf(x) > 0), tot = ps.reduce((s, x) => s + (+x.amt || 0), 0), debt = un.reduce((s, x) => s + restOf(x), 0);
      return `<div class="it" data-fe="${e.id}"><div><b>${icon(e)} ${esc(e.title)}</b><div class="mu">${fd(e.date)} · zaplaceno ${ps.length - un.length} z ${ps.length} · vybráno ${kc(tot - debt)} z ${kc(tot)}</div>${un.length ? `<div class="mu">Nezaplatily: ${un.map(x => pn(x.mid)).join(", ")}</div>` : ""}</div><b style="color:${debt ? "var(--no)" : "var(--ok)"}">${debt ? kc(debt) : "✅"}</b></div>`;
    }).join("") : '<div class="msg">Zatím žádná uzavřená vyúčtování.</div>'}</div>`;
  }
  return err + grid + tabs + unsetH + body;
}

// ===== Eventy =====
export function bindFinance(a) {
  a.querySelectorAll("[data-fv]").forEach(b => b.onclick = () => { vw = b.dataset.fv; render(); });
  a.querySelectorAll("[data-fall]").forEach(b => b.onclick = () => { all = !all; render(); });
  a.querySelectorAll("[data-fo]").forEach(b => b.onclick = () => { open = open === b.dataset.fo ? null : b.dataset.fo; render(); });
  // Úhrada jednoho předpisu: okno s částkou (celá nebo částečná)
  a.querySelectorAll("[data-fp]").forEach(b => b.onclick = ev => { ev.stopPropagation(); openPay(b.dataset.fp); });
  // Zaplatila vše: potvrzení druhým klepnutím, každý předpis se uhradí celý
  a.querySelectorAll("[data-fa]").forEach(b => b.onclick = () => {
    const pid = b.dataset.fa, key = "fa" + pid;
    if (S.cf === key) {
      S.cf = null;
      S.ch.filter(x => x.mid === pid && restOf(x) > 0).forEach(x => payCharge(x.id));
      toast("Označeno jako zaplacené");
    } else { S.cf = key; render(); setTimeout(() => { if (S.cf === key) { S.cf = null; render(); } }, 4000); }
  });
  // Otevření detailu události (po návratu zůstane režim Platby)
  a.querySelectorAll("[data-fe]").forEach(b => b.onclick = () => { S.evid = b.dataset.fe; render(); window.scrollTo(0, 0); });
}
