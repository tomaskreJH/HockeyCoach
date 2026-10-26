// Rozdělení do pětek tréninku: panel automatického rozdělení v detailu tréninku (způsob, počet, ⚔ poměr – localStorage hk-split)
// a okno ⭐ Výkonnost (plevel/team, jen realizační tým, poslech při prvním zobrazení). Výpočet domain/line-split.js.
// Přepíše jen hráčky (realizační tým zůstane), existující rozdělení druhým klepnutím; ✨ Připravit trénink dělí jen nerozdělené (quickSplit).
// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {isG, pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {LINE_NOS} from "../domain/event-helpers.js";
import {LVL_LABELS, LVL_MAX, LVL_MIN, PLEVEL_COLL, PLEVEL_DOC, SPLIT_DEF, SPLIT_MODES, hasLvl, lineSummary, lvlOf, lvlSet, splitLines} from "../domain/line-split.js";
import {DF, posGrp} from "../domain/training-plan.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
// S.plv = mapa výkonnosti {pid: 1–5} | undefined (načítá se), S.plvErr = chyba, S.plvo = otevřené okno ⭐ {eid, y – posun seznamu}, S.lspo = id tréninku s ručně rozbaleným panelem, S.lsp = volby rozdělení
const KEY = "hk-split";
const HINT = {
  even: "Každá pětka podobně silná (silné a slabší hráčky promíchané).",
  tier: "Nejsilnější spolu v 1. pětce, slabší v dalších – pro cvičení podle úrovně.",
  alt: "Střídavě v pořadí soupisky (bez ohledu na výkonnost).",
  base: "Pětky ze základní formace zápasu, ostatní přihlášené se doplní vyrovnaně."
};
let unsub = null;

// ===== Pomocné funkce =====
// Volby rozdělení: z paměti zařízení, jinak výchozí
function opts() {
  if (!S.lsp) {
    let o = null;
    try { o = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { o = null; }
    S.lsp = {...SPLIT_DEF, ...(o && typeof o === "object" ? o : {})};
    if (!SPLIT_MODES[S.lsp.mode]) S.lsp.mode = SPLIT_DEF.mode;
  }
  return S.lsp;
}
function saveOpts(o) { S.lsp = o; try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* bez paměti zařízení */ } }
const posTag = p => (posGrp(p.pos) === DF ? "O" : "Ú");

// ===== Načtení výkonnosti =====
// Jeden poslech plevel/team (jen realizační tým, při prvním zobrazení); výsledek v S.plv
function ensureLevels() {
  if (unsub || !HK.can("sport")) return;
  unsub = () => {};                                        // značka „poslouchá se“ ještě před první odpovědí (bez opakovaného přihlášení)
  unsub = S.db.collection(PLEVEL_COLL).part(PLEVEL_DOC).onSnapshot(v => {
    const d = v.docs.find(x => x.id === PLEVEL_DOC);
    S.plv = (d && d.data().lv) || {};
    S.plvErr = null;
    render();
  }, e => { S.plvErr = (e && (e.code || e.message)) || "chyba"; S.plv = {}; render(); });
}

// ===== Vykreslení =====
// Panel rozdělení: způsob, počet pětek, ⚔ poměr, tlačítka a souhrn pětek (počet, útočnice / obránkyně, průměr ⭐)
function panelHtml(ev, going) {
  const o = opts(), lv = S.plv || {}, L = ev.raw.lines || {}, k = "lsp" + ev.id, staff = HK.can("sport");
  const rated = going.filter(p => hasLvl(lv, p.id)).length, sum = lineSummary(L, going, lv);
  const used = LINE_NOS.filter(n => sum[n].c);
  // Panel je sbalený, když už je někdo v pětce (méně posouvání); otevřený, když se teprve rozděluje nebo ho trenér rozbalil
  const open = S.lspo === ev.id || !going.some(p => L[p.id]) || armed(k);
  return `<details id="lsdt" style="border:1px solid var(--bd);border-radius:12px;padding:8px;margin-bottom:10px" ${open ? "open" : ""}>
<summary style="cursor:pointer;min-height:36px;padding:4px 0"><b>↻ Rozdělit automaticky</b> <span class="mu" style="font-size:12px">${esc(SPLIT_MODES[o.mode])} · ${o.n} pětky${o.pos ? " · ⚔" : ""}</span></summary>
<div class="chips" style="margin:4px 0">${Object.entries(SPLIT_MODES).map(([m, t]) => `<button class="chip ${o.mode === m ? "on" : ""}" data-lsm="${m}">${t}</button>`).join("")}</div>
<div class="mu" style="font-size:12px;margin-bottom:4px">${esc(HINT[o.mode])}</div>
<div class="chips" style="margin:4px 0;align-items:center"><span class="mu" style="font-size:12px">Pětek</span>${[2, 3, 4].map(n => `<button class="chip ${o.n === n ? "on" : ""}" data-lsn="${n}">${n}</button>`).join("")}
<button class="chip ${o.pos ? "on" : ""}" id="lspos" title="V každé pětce poměrně útočnic i obránkyň">⚔ Poměr útok / obrana</button></div>
<div class="row" style="margin-top:6px"><button class="p" id="lsgo" style="flex:2;${armed(k) ? "background:var(--wa);color:#fff" : ""}">${armed(k) ? "Přepsat pětky? Klepni znovu" : "↻ Rozdělit"}</button>${staff ? '<button class="s" id="lslv" style="flex:1">⭐ Výkonnost</button>' : ""}<button class="s" id="evlc" style="flex:1">Vymazat</button></div>
${staff ? `<div class="mu" style="font-size:12px;margin-top:6px">${S.plv === undefined ? "Načítám výkonnost…" : S.plvErr ? "Výkonnost se nenačetla (" + esc(S.plvErr) + ") – manager musí publikovat pravidla v21.3." : `⭐ hodnoceno ${rated} z ${going.length} přihlášených (bez hodnocení = ⭐3)`}</div>` : ""}
${used.length ? `<div style="margin-top:6px">${used.map(n => `<span class="evl L${n}">${n}.: ${sum[n].c} · Ú ${sum[n].f} / O ${sum[n].d}${staff && sum[n].avg != null ? " · Ø⭐" + String(sum[n].avg).replace(".", ",") : ""}</span>`).join("")}</div>` : ""}</details>`;
}
// Okno ⭐ Výkonnost: přihlášené na trénink nahoře, pak ostatní aktivní hráčky (bez brankářek); klepnutí ukládá hned
function sheetHtml(going, all) {
  if (!S.plvo) return "";
  const lv = S.plv || {}, ids = new Set(going.map(p => p.id)), rest = all.filter(p => !ids.has(p.id));
  const row = p => `<div class="pr" style="align-items:center"><div>${pn(p.id)} <span class="mu">${posTag(p)}</span></div><div class="chips" style="flex-wrap:nowrap">${Array.from({length: LVL_MAX - LVL_MIN + 1}, (_, i) => i + LVL_MIN).map(n => `<button class="chip ${hasLvl(lv, p.id) && lvlOf(lv, p.id) === n ? "on" : ""}" data-lsl="${esc(p.id)}|${n}" title="${esc(LVL_LABELS[n])}" style="min-width:38px;padding:8px 0;text-align:center">${n}</button>`).join("")}</div></div>`;
  return `<div class="md" id="plvm"><div class="mb" style="max-height:88vh;overflow:auto"><h2>⭐ Výkonnost hráček</h2>
<div class="mu" style="font-size:13px;margin-bottom:6px">1 = ${esc(LVL_LABELS[1])} … 5 = ${esc(LVL_LABELS[5])} · klepnutí na vybrané číslo hodnocení zruší (pak platí ⭐3). Vidí jen realizační tým.</div>
${going.length ? '<div class="lnl">Přihlášené na trénink</div>' + going.map(row).join("") : ""}
${rest.length ? '<div class="lnl">Ostatní</div>' + rest.map(row).join("") : ""}
<button class="s w" id="plvx" style="margin-top:10px;min-height:52px">Zavřít</button></div></div>`;
}

// ===== Eventy =====
function bindPanel(a, ev, going) {
  const o = opts(), dt = a.querySelector("#lsdt");
  // Jen změna trenérem (událost toggle přijde i při vložení otevřeného panelu)
  if (dt) { const was = dt.open; dt.ontoggle = () => { if (dt.open !== was) S.lspo = dt.open ? ev.id : null; }; }
  a.querySelectorAll("[data-lsm]").forEach(b => b.onclick = () => { saveOpts({...o, mode: b.dataset.lsm}); render(); });
  a.querySelectorAll("[data-lsn]").forEach(b => b.onclick = () => { saveOpts({...o, n: +b.dataset.lsn}); render(); });
  const ps = a.querySelector("#lspos");
  if (ps) ps.onclick = () => { saveOpts({...o, pos: !o.pos}); render(); };
  const go = a.querySelector("#lsgo");
  if (go) go.onclick = () => {
    const L = ev.raw.lines || {}, run = () => {
      const lines = splitLines(going, {...o, lv: S.plv || {}, lu: (S.def || {}).lu, prev: L});
      S.db.doc("events/" + ev.id).merge({lines});
      toast("Rozděleno: " + SPLIT_MODES[o.mode] + " do " + o.n + " pětek");
    };
    // Už rozdělené hráčky = potvrzení druhým klepnutím (přepíše se jejich pětka)
    if (going.some(p => L[p.id])) confirm2("lsp" + ev.id, run); else run();
  };
  const lc = a.querySelector("#evlc");
  if (lc) lc.onclick = () => S.db.doc("events/" + ev.id).merge({lines: {}});
  const lv = a.querySelector("#lslv");
  if (lv) lv.onclick = () => { S.plvo = {eid: ev.id}; render(); };
}
function bindSheet(a) {
  const m = a.querySelector("#plvm");
  if (!m) return;
  m.querySelector("#plvx").onclick = () => { S.plvo = null; render(); };
  // Překreslení po klepnutí okno vytvoří znovu – posun seznamu se pamatuje (S.plvo.y), aby obrazovka neskočila nahoru
  const box = m.querySelector(".mb");
  if (box) { box.scrollTop = (S.plvo && S.plvo.y) || 0; box.onscroll = () => { if (S.plvo) S.plvo.y = box.scrollTop; }; }
  m.querySelectorAll("[data-lsl]").forEach(b => b.onclick = () => {
    const [id, n] = b.dataset.lsl.split("|"), lv = lvlSet(S.plv || {}, id, +n);
    S.plv = lv;
    S.db.doc(PLEVEL_COLL + "/" + PLEVEL_DOC).merge({v: 1, lv, ...stamp()});
    render();
  });
}

// ===== Exporty =====
// Panel rozdělení a okno výkonnosti pro detail tréninku (jen kdo smí měnit pětky); P = aktivní hráčky v pořadí soupisky, A = docházka
export function splitHtml(ev, P, A) {
  ensureLevels();
  if (S.plvo && S.plvo.eid !== ev.id) S.plvo = null;
  const going = P.filter(p => A[p.id] && A[p.id].st === "yes" && !isG(p));
  return panelHtml(ev, going) + (HK.can("sport") ? sheetHtml(going, P.filter(p => !isG(p))) : "");
}
// ✨ Připravit trénink: rozdělí přihlášené hráčky posledním způsobem (volby zařízení), jen když ještě žádná z nich v pětce není;
// vrací popis pro hlášku, "" = nic se nedělilo (už rozděleno, nikdo nejde nebo chybí právo)
export function quickSplit(ev, P, A) {
  if (!HK.can("sport")) return "";
  const going = P.filter(p => A[p.id] && A[p.id].st === "yes" && !isG(p)), L = ev.raw.lines || {}, o = opts();
  if (!going.length || going.some(p => L[p.id])) return "";
  const lines = splitLines(going, {...o, lv: S.plv || {}, lu: (S.def || {}).lu, prev: L});
  S.db.doc("events/" + ev.id).merge({lines});
  return SPLIT_MODES[o.mode] + " do " + o.n + " pětek";
}
export function bindSplit(a, ev, P, A) {
  const going = P.filter(p => A[p.id] && A[p.id].st === "yes" && !isG(p));
  bindPanel(a, ev, going);
  if (HK.can("sport")) bindSheet(a);
}
