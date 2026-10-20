// Přehled plateb a dlužných částek (jen trenér a kustod): režim „💰 Platby“ v záložce Události.
// Struktura: Importy -> Stav -> Pomocné funkce -> Vykreslení (souhrn, po hráčkách, po událostech) -> Eventy.
// Data: kolekce payments (S.pay), událost se bere ze seznamu předaného z events.js (tréninky + zápasy).
// Dluh = součet nezaplacených plateb hráčky přes všechny vyúčtované události. Zaplacení lze označit přímo zde.

// ===== Importy =====
import {pl, pn, pri} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, fd, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {feeOf, kc, ledger, modeOf} from "../domain/payments.js";
import {togglePaid} from "./payments.js";
import {render} from "./shell.js";

// ===== Stav (jen pro tuto obrazovku) =====
let vw = "pl";      // pl = podle hráček, ev = podle událostí
let all = false;    // v přehledu hráček zobrazit i ty bez dluhu
let open = null;    // rozbalená hráčka

// ===== Pomocné funkce =====
const desc = (x, y) => y.date.localeCompare(x.date);
const icon = e => (e.type === "match" ? "🆚" : "🏒");
const paidDay = x => (x.paid && x.paidAt ? " · zaplaceno " + new Date(x.paidAt).toLocaleDateString("cs-CZ") : "");

// ===== Vykreslení =====
// evs = sjednocený seznam událostí z events.js, AT = odpovědi podle události a člena (pro počet účastí)
export function financeHtml(evs, AT) {
  if (!HK.isStaff()) return "";
  const today = td(), byId = {};
  evs.forEach(e => { byId[e.id] = e; });
  const L = ledger(S.pay, id => byId[id]);
  const past = evs.filter(e => e.date < today);
  const err = S.payErr ? `<div class="cd" style="color:var(--no)">Platby se nepodařilo načíst (${esc(S.payErr)}). Zkontroluj pravidla databáze (firestore.rules).</div>` : "";

  // Souhrn
  const grid = `<div class="grid3"><div class="stat"><b style="color:${L.owed ? "var(--no)" : "var(--ok)"}">${kc(L.owed)}</b>dluh celkem</div><div class="stat"><b>${kc(L.got)}</b>vybráno</div><div class="stat"><b>${L.debtors}</b>dlužnic</div></div>`;
  const tabs = `<div class="chips"><button class="chip ${vw === "pl" ? "on" : ""}" data-fv="pl">Podle hráček</button><button class="chip ${vw === "ev" ? "on" : ""}" data-fv="ev">Podle událostí</button></div>`;

  // Uplynulé události s cenou, které ještě nemají vyúčtování
  const unset = past.filter(e => feeOf(e) > 0 && modeOf(e) !== "none" && !e.raw.settle).sort(desc);
  const unsetH = unset.length
    ? `<div class="cd"><h2>⚠️ Nevyúčtované události (${unset.length})</h2><div class="mu" style="margin-bottom:6px">Mají cenu, ale vyúčtování zatím nevzniklo. Otevři událost a potvrď vyúčtování.</div>${unset.map(e => `<div class="it" data-fe="${e.id}"><div><b>${icon(e)} ${esc(e.title)}</b><div class="mu">${fd(e.date)} · ${kc(feeOf(e))}</div></div><span class="tag sh">nevyúčtováno</span></div>`).join("")}</div>`
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
        h += `<div style="padding:0 0 10px 8px;border-bottom:1px solid var(--bd)">${items.map(({x, e}) => `<div class="pr"><div>${icon(e)} ${esc(e.title)}<div class="mu">${fd(e.date)} · ${kc(+x.amt || 0)}${paidDay(x)}</div></div><div class="evq"><button class="${x.paid ? "on-yes" : ""}" data-fp="${x.eid}|${x.pid}|${x.paid ? 0 : 1}" style="min-width:150px">${x.paid ? "✅ Zaplaceno" : "⬜ Nezaplaceno"}</button></div></div>`).join("")}${r.open ? `<button class="${S.cf === key ? "d" : "p"} w" data-fa="${r.pid}" style="margin-top:10px;min-height:48px;${S.cf === key ? "background:var(--no);color:#fff" : ""}">${S.cf === key ? "Opravdu? Klepni znovu" : "✅ Zaplatila vše (" + r.open + "×, " + kc(r.debt) + ")"}</button>` : ""}</div>`;
      }
      return h;
    }).join("") : `<div class="msg">${all ? "Zatím žádné vyúčtované platby." : "Nikdo nedluží. 🎉"}</div>`}<div class="mu" style="margin-top:8px">Zobrazují se jen hráčky s vyúčtovanou platbou. Klepnutím na hráčku rozbalíš její platby.</div></div>`;
  } else {
    // Přehled po událostech: nejnovější nahoře
    const rows = evs.map(e => ({e, ps: S.pay.filter(x => x.eid === e.id && pl(x.pid))})).filter(o => o.ps.length).sort((a, b) => desc(a.e, b.e));
    body = `<div class="cd"><h2>Platby podle událostí</h2>${rows.length ? rows.map(({e, ps}) => {
      const un = ps.filter(x => !x.paid), tot = ps.reduce((s, x) => s + (+x.amt || 0), 0), debt = un.reduce((s, x) => s + (+x.amt || 0), 0);
      return `<div class="it" data-fe="${e.id}"><div><b>${icon(e)} ${esc(e.title)}</b><div class="mu">${fd(e.date)} · zaplaceno ${ps.length - un.length} z ${ps.length} · vybráno ${kc(tot - debt)} z ${kc(tot)}</div>${un.length ? `<div class="mu">Nezaplatily: ${un.map(x => pn(x.pid)).join(", ")}</div>` : ""}</div><b style="color:${debt ? "var(--no)" : "var(--ok)"}">${debt ? kc(debt) : "✅"}</b></div>`;
    }).join("") : '<div class="msg">Zatím žádné vyúčtované události.</div>'}</div>`;
  }
  return err + grid + tabs + unsetH + body;
}

// ===== Eventy =====
export function bindFinance(a) {
  a.querySelectorAll("[data-fv]").forEach(b => b.onclick = () => { vw = b.dataset.fv; render(); });
  a.querySelectorAll("[data-fall]").forEach(b => b.onclick = () => { all = !all; render(); });
  a.querySelectorAll("[data-fo]").forEach(b => b.onclick = () => { open = open === b.dataset.fo ? null : b.dataset.fo; render(); });
  // Zaplaceno / nezaplaceno u jedné platby (změna se vrátí přes odběr dat)
  a.querySelectorAll("[data-fp]").forEach(b => b.onclick = ev => { ev.stopPropagation(); const [eid, pid, v] = b.dataset.fp.split("|"); togglePaid(eid, pid, v === "1"); });
  // Zaplatila vše: potvrzení druhým klepnutím
  a.querySelectorAll("[data-fa]").forEach(b => b.onclick = () => {
    const pid = b.dataset.fa, key = "fa" + pid;
    if (S.cf === key) {
      S.cf = null;
      S.pay.filter(x => x.pid === pid && !x.paid).forEach(x => togglePaid(x.eid, x.pid, true));
      toast("Označeno jako zaplacené");
    } else { S.cf = key; render(); setTimeout(() => { if (S.cf === key) { S.cf = null; render(); } }, 4000); }
  });
  // Otevření detailu události (po návratu zůstane režim Platby)
  a.querySelectorAll("[data-fe]").forEach(b => b.onclick = () => { S.evid = b.dataset.fe; render(); window.scrollTo(0, 0); });
}
