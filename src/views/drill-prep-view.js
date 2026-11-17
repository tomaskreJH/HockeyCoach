// 📚 Cvičení pro hráčky (Statistiky → 📚 Cvičení, v22.59): cvičení z plánů nejbližších tréninků – popis, pomůcky, obrázky, video a PDF, jen čtení.
// Banku cvičení hráčka nečte; plány (kopie názvu, obrázků a podrobností) se načtou jednorázově po jednom (nejvýš PREP_FUTURE + PREP_PAST)
// a drží se v paměti nejvýš PREP_TTL; plán už načtený v 🏒 Trénink se použije znovu. Výpočty domain/drill-prep.js.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Načtení -> Vykreslení -> Eventy -> Exporty.

// ===== Importy =====
import {CATS, LEVELS} from "../config/skills.js";
import {S} from "../core/state.js";
import {esc, td} from "../core/utils.js";
import {prepDrills, prepEvents, prepFilter} from "../domain/drill-prep.js";
import {TRPLAN_COLL} from "../domain/training-plan.js";
import {bindMedia, bindThumbs, mediaHtml, thumbsHtml} from "./drill-media.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
const PREP_TTL = 5 * 60 * 1000;                // jak dlouho platí načtené plány (ms)
let R = null;                                  // {st: "load" | "ok" | "err", at, evs, plans, err}
let open = null;                               // id rozbaleného cvičení
let query = "";                                // hledaný text

// ===== Pomocné funkce =====
const errTxt = e => (e && (e.code || e.message)) || "chyba";
// Datum česky (d. m.)
const dm = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "")); return m ? +m[3] + ". " + +m[2] + "." : String(s || ""); };
// Jednorázové čtení plánu tréninku (chyba = nic)
const one = id => Promise.resolve().then(() => S.db.doc(TRPLAN_COLL + "/" + id).get()).catch(() => null);

// ===== Načtení =====
// Plány nejbližších tréninků; znovu až po PREP_TTL. Už načtený plán z 🏒 Trénink (S.tst.plans) se nečte podruhé.
function ensure() {
  if (R && (R.st === "load" || (R.st === "ok" && Date.now() - R.at < PREP_TTL))) return;
  const evs = prepEvents(S.ev, td());
  const X = R = {st: "load", at: Date.now(), evs, plans: {}, err: null};
  const have = (S.tst && S.tst.plans) || {};
  Promise.all(evs.map(e => (have[e.id] !== undefined ? Promise.resolve(have[e.id]) : one(e.id)).then(p => { X.plans[e.id] = p; })))
    .then(() => { if (R !== X) return; X.st = "ok"; X.at = Date.now(); if (S.tab === "st") render(); })
    .catch(e => { if (R !== X) return; X.st = "err"; X.err = errTxt(e); if (S.tab === "st") render(); });
}

// ===== Vykreslení =====
function itemHtml(r) {
  const dx = r.dx || {}, o = open === r.id;
  const meta = [CATS[dx.cat] || "", LEVELS[dx.lvl] || "", dx.dur ? +dx.dur + " min" : ""].filter(Boolean).join(" · ");
  const when = r.next ? "📅 příště " + dm(r.next) : r.last ? "naposledy " + dm(r.last) : "";
  return `<div class="it" data-dpo="${esc(r.id)}" style="cursor:pointer;align-items:flex-start"><div style="flex:1">
<b>${esc(r.name)}</b>
<div class="mu">${esc([meta, when].filter(Boolean).join(" · "))}</div>
${o ? `<div style="margin-top:8px" data-stop="1">
${dx.eq ? `<div class="mu">Pomůcky: ${esc(dx.eq)}</div>` : ""}${dx.desc ? `<div style="white-space:pre-wrap;margin:6px 0">${esc(dx.desc)}</div>` : ""}
${thumbsHtml(r.img, 96, render) || ""}${dx.url ? mediaHtml(dx.url, "▶ Přehrát video") : ""}${dx.pdf ? mediaHtml(dx.pdf, "📄 Zobrazit PDF") : ""}
${!dx.eq && !dx.desc && !dx.url && !dx.pdf && !r.img.length ? '<div class="mu">Popis trenér zatím nezveřejnil.</div>' : ""}</div>` : ""}</div></div>`;
}
// Obsah záložky; hráčky bez načtených plánů vidí průběh nebo chybu
function bodyHtml() {
  ensure();
  if (!R || R.st === "load") return '<div class="cd"><h2>📚 Cvičení</h2><div class="mu">Načítám cvičení z plánů tréninků…</div></div>';
  if (R.st === "err") return `<div class="cd"><h2>📚 Cvičení</h2><div class="msg">Cvičení se nepodařilo načíst (${esc(R.err)}).</div></div>`;
  const all = prepDrills(R.evs, R.plans, td()), l = prepFilter(all, query);
  return `<div class="cd"><h2>📚 Cvičení (${all.length})</h2>
<div class="mu" style="margin-bottom:6px">Cvičení z plánů nejbližších a posledních tréninků – ať víš, co tě čeká.</div>
${all.length ? `<input id="dpq" placeholder="🔍 Hledat v názvu, pomůckách a popisu" value="${esc(query)}" style="margin:0 0 6px">` : ""}
<div id="dpl">${l.length ? l.map(itemHtml).join("") : `<div class="msg">${all.length ? "Nic nenalezeno." : "Trenér zatím žádný plán s cvičeními nezveřejnil."}</div>`}</div></div>`;
}

// ===== Eventy =====
function bind(box) {
  const q = box.querySelector("#dpq");
  if (q) q.oninput = () => {
    query = q.value;
    const all = prepDrills(R.evs, R.plans, td()), l = prepFilter(all, query), el = box.querySelector("#dpl");
    if (el) { el.innerHTML = l.length ? l.map(itemHtml).join("") : '<div class="msg">Nic nenalezeno.</div>'; bind2(box); }
  };
  bind2(box);
}
// Napojení klepnutí uvnitř seznamu (i po částečném překreslení hledáním)
function bind2(box) {
  bindThumbs(box);
  bindMedia(box);
  box.querySelectorAll("[data-dpo]").forEach(el => el.onclick = e => {
    if (e.target.closest("[data-stop]")) return;       // klepnutí do rozbaleného detailu (video, obrázky) nezavírá
    open = open === el.dataset.dpo ? null : el.dataset.dpo;
    render();
  });
}

// ===== Exporty =====
// Vykreslí záložku 📚 Cvičení do kontejneru box
export function drillPrepView(box) {
  box.innerHTML = bodyHtml();
  if (R && R.st === "ok") bind(box);
}
