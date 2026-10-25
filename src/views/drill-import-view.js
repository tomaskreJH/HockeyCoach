// 📥 Hromadné přidání cvičení do banky (Team → 📚 Cvičení, jen s HK.perm("drills", "e")): 📥 Základní sada (hráčky a brankářky)
// a 📄 import z tabulky CSV (vzor ke stažení, soubor z Excelu i Google Tabulek, UTF-8 i Windows-1250). Před zápisem seznam se zaškrtávátky:
// cvičení se stejným názvem jako v bance se ve výchozím výběru nezaškrtnou, řádky s chybou nejdou vybrat. Zápis v jedné dávce (drills/{id}).
// Výpočty a kontrola řádků: domain/drill-import.js; obsah sady: config/drill-starter.js.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Vykreslení -> Hlavní logika (soubor, zápis) -> Eventy -> Exporty.

// ===== Importy =====
import {CATS, LEVELS, SKILLS} from "../config/skills.js";
import {S} from "../core/state.js";
import {csv, downloadFile, esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {IMPORT_MAX, csvDrills, csvSample, importPick, starterItems} from "../domain/drill-import.js";
import {DRILL_COLL} from "../domain/drills.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
// S.dri = {kind: "set" | "csv", items: [{d, who, dup, err, line, on}] | null (CSV ještě nenačtené), err (chyba souboru), file}
const WHO = {pl: "🏒 Hráčky", gk: "🥅 Brankářky"};
const CSS = `<style>
.dii{display:flex;gap:10px;align-items:flex-start;padding:8px 4px;border-bottom:1px solid var(--bd);cursor:pointer}
.dii.off{opacity:.55}
.dii .bx{flex:none;width:26px;height:26px;border:2px solid var(--bd);border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:800}
.dii.on .bx{background:var(--ac);border-color:var(--ac);color:#fff}
.dii .ds{font-size:12px;opacity:.75;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.disv{position:sticky;bottom:0;background:var(--cd);padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px));z-index:3}
</style>`;

// ===== Pomocné funkce =====
const canE = () => HK.perm("drills", "e");
const stamp = () => { const u = HK.user(); return {by: ((u && u.email) || "").toLowerCase(), at: new Date().toISOString()}; };
// Výchozí výběr: bez chyby a bez shody názvu s bankou
const withOn = items => items.map(x => ({...x, on: !x.err && !x.dup}));
const skIcons = d => (d.sk || []).filter(k => SKILLS[k]).map(k => SKILLS[k].split(" ")[0]).join(" ");
// Text souboru: nejdřív UTF-8, při chybě Windows-1250 (Excel v češtině ukládá „CSV (oddělený středníkem)“ v této znakové sadě)
async function fileText(file) {
  const buf = await file.arrayBuffer();
  try { return new TextDecoder("utf-8", {fatal: true}).decode(buf); } catch { return new TextDecoder("windows-1250").decode(buf); }
}

// ===== Vykreslení =====
function itemHtml(x, i) {
  const d = x.d, st = x.err ? `<div style="color:var(--no);font-size:12px">⛔ Řádek ${x.line}: ${esc(x.err)}</div>` : x.dup ? '<div style="color:var(--wa);font-size:12px">⚠️ Cvičení se stejným názvem už v bance je</div>' : "";
  return `<div class="dii ${x.on ? "on" : ""} ${x.err ? "off" : ""}" data-dii="${i}"><div class="bx">${x.on ? "✓" : ""}</div><div style="flex:1;min-width:0">
<b>${esc(d.name || "(bez názvu)")}</b><div class="mu" style="font-size:13px">${esc(CATS[d.cat] || "?")} · ${LEVELS[d.lvl] || ""} · ${+d.dur || "?"} min ${skIcons(d)}${d.meas ? " · ⏲" : ""}</div>
${d.desc ? `<div class="ds">${esc(d.desc)}</div>` : ""}${st}</div></div>`;
}
function groupHtml(who, list) {
  if (!list.length) return "";
  const on = list.filter(({x}) => x.on).length;
  return `<div class="row" style="align-items:center;flex-wrap:nowrap;margin-top:12px"><h3 style="margin:0;flex:1">${WHO[who]} (${on} / ${list.length})</h3>
<button class="s" data-dia="${who}|1" style="flex:none;padding:4px 10px;min-height:0">Vše</button><button class="s" data-dia="${who}|0" style="flex:none;padding:4px 10px;min-height:0">Nic</button></div>
${list.map(({x, i}) => itemHtml(x, i)).join("")}`;
}
function listHtml(R) {
  const all = R.items.map((x, i) => ({x, i})), n = importPick(R.items).length, dup = R.items.filter(x => x.dup).length, bad = R.items.filter(x => x.err).length;
  return `<div class="mu" style="margin-top:6px">${R.items.length} cvičení${dup ? ` · ${dup} už v bance (nezaškrtnuté)` : ""}${bad ? ` · ${bad} s chybou (oprav v tabulce a načti znovu)` : ""}. Klepnutím vybereš nebo zrušíš; po přidání jde každé upravit, doplnit video a obrázky.</div>
${groupHtml("pl", all.filter(({x}) => x.who === "pl"))}${groupHtml("gk", all.filter(({x}) => x.who === "gk"))}
<div class="disv"><div class="row"><button class="s" id="dix" style="flex:1">Zrušit</button><button class="p" id="diok" style="flex:2;min-height:52px" ${n ? "" : "disabled"}>💾 Přidat vybraná (${n})</button></div></div>`;
}
function csvStartHtml(R) {
  return `<div class="mu" style="margin:6px 0">Cvičení si napiš v Excelu nebo Google Tabulkách (jeden řádek = jedno cvičení) a ulož jako CSV. Sloupce: Název, Kategorie, Dovednosti (víc oddělit čárkou), Úroveň (1–3 nebo Základní / Střední / Náročné), Délka (min), Skupiny (Celý tým, Stanoviště, Brankářky), Pomůcky, Popis, Video, PDF, Měření (čas, počet, body). Povinný je Název a Dovednosti; nejvýš ${IMPORT_MAX} řádků.</div>
<button class="s w" id="dism" style="margin:6px 0">⬇️ Stáhnout vzor tabulky (CSV)</button>
<label>📄 Soubor CSV</label><input id="dif" type="file" accept=".csv,.txt,text/csv,text/plain">
${R.err ? `<div class="msg">${esc(R.err)}</div>` : ""}
<div class="row" style="margin-top:10px"><button class="s" id="dix">Zrušit</button></div>`;
}
function viewHtml(R) {
  const title = R.kind === "set" ? "📥 Základní sada cvičení" : "📄 Import cvičení z tabulky";
  const intro = R.kind === "set" ? '<div class="mu">Připravená základní cvičení pro hráčky a brankářky (rozbruslení, bruslení, puk, přihrávky, střelba, souboje, hra v malém prostoru, herní situace, závěr, mimo led). Vyber, která chceš mít v bance.</div>' : (R.file ? `<div class="mu">Soubor: ${esc(R.file)} <button class="s" id="dire" style="padding:4px 10px;min-height:0">Jiný soubor</button></div>` : "");
  return CSS + `<div class="cd"><h2>${title}</h2>${intro}${R.items ? listHtml(R) : csvStartHtml(R)}</div>`;
}

// ===== Hlavní logika =====
// Načtení CSV souboru do seznamu k výběru
async function readCsv(file) {
  const R = S.dri;
  try {
    const out = csvDrills(await fileText(file), S.dr);
    if (S.dri !== R) return;
    R.file = file.name; R.err = out.err; R.items = out.err ? null : withOn(out.items);
    if (R.items && !R.items.length) { R.items = null; R.err = "V souboru nejsou žádná cvičení."; }
  } catch (e) { R.err = "Soubor se nepodařilo přečíst (" + ((e && e.message) || e) + ")."; }
  render();
}
// Zápis vybraných cvičení v jedné dávce (nová cvičení: arch false, autor a čas)
function save() {
  const pick = importPick(S.dri.items);
  if (!pick.length) return toast("Nic není vybráno");
  const st = stamp(), b = S.db.batch();
  pick.forEach(x => b.set(DRILL_COLL + "/" + S.db.collection(DRILL_COLL).newId(), {...x.d, ...st, arch: false}));
  b.commit();
  toast("Do banky přidáno " + pick.length + " cvičení");
  S.dri = null; render(); window.scrollTo(0, 0);
}

// ===== Eventy =====
function bindView(a) {
  const R = S.dri, q = s => a.querySelector(s);
  q("#dix").onclick = () => { S.dri = null; render(); };
  const sm = q("#dism");
  if (sm) sm.onclick = () => downloadFile("vzor-cviceni.csv", csv(csvSample()), "text/csv;charset=utf-8");
  const f = q("#dif");
  if (f) f.onchange = () => { if (f.files && f.files[0]) readCsv(f.files[0]); };
  const re = q("#dire");
  if (re) re.onclick = () => { R.items = null; R.err = null; R.file = null; render(); };
  a.querySelectorAll("[data-dii]").forEach(el => el.onclick = () => { const x = R.items[+el.dataset.dii]; if (x && !x.err) { x.on = !x.on; render(); } });
  a.querySelectorAll("[data-dia]").forEach(el => el.onclick = () => { const [who, v] = el.dataset.dia.split("|"); R.items.forEach(x => { if (x.who === who && !x.err) x.on = v === "1"; }); render(); });
  const ok = q("#diok");
  if (ok) ok.onclick = save;
}

// ===== Exporty =====
// Tlačítka do záhlaví banky (prázdný text bez práva upravovat)
export const importBtnsHtml = () => (canE() ? '<div class="row" style="margin-top:8px"><button class="s" id="dist">📥 Základní sada</button><button class="s" id="dicsv">📄 Import z tabulky</button></div>' : "");
export function bindImportBtns(a) {
  const s = a.querySelector("#dist"), c = a.querySelector("#dicsv");
  if (s) s.onclick = () => { S.dri = {kind: "set", items: withOn(starterItems(S.dr)), err: null, file: null}; render(); window.scrollTo(0, 0); };
  if (c) c.onclick = () => { S.dri = {kind: "csv", items: null, err: null, file: null}; render(); window.scrollTo(0, 0); };
}
// Je otevřené hromadné přidání? (banka pak místo seznamu vykreslí importView)
export const importOpen = () => !!(S.dri && canE());
export function importView(a, head) {
  a.innerHTML = head + viewHtml(S.dri);
  bindView(a);
}
