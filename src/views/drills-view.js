// 📚 Banka cvičení (Team → přepínač 📚 Cvičení): seznam s hledáním a filtrem (kategorie, dovednost, úroveň, ⭐, vyřazená),
// detail cvičení, formulář nového cvičení / úpravy, ⧉ kopie, 🗄 vyřazení a ↩ vrácení, 🗑 smazání vyřazeného (druhým klepnutím).
// Práva: číst / upravovat / mazat podle modulu drills matice (HK.perm); pravidla databáze vynucují totéž.
// ⭐ oblíbená jsou osobní a pamatují se v tomto zařízení (localStorage). Výpočty a kontrola formuláře: domain/drills.js.
// 📷 Obrázky (nejvýš 3, zmenšené v zařízení) se ukládají spolu s cvičením v jedné dávce do drillimg/{id}; 📄 PDF jen jako odkaz.
// 🗑 smazání vyřazeného cvičení jen, když ho nepoužívá žádný plán tréninku ani šablona (jednorázové čtení trplan a trtpl); smaže i jeho obrázky.
// 📥 Základní sada a 📄 import z tabulky: views/drill-import-view.js.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Vykreslení (seznam, detail, formulář) -> Eventy -> Exporty.

// ===== Importy =====
import {CATS, GROUPS, LEVELS, SKILLS, UNITS} from "../config/skills.js";
import {armed, confirm2} from "../core/actions.js";
import {S} from "../core/state.js";
import {$, esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {DRILLIMG_COLL, DRILL_COLL, DRILL_MAX, DUR_MAX, DUR_MIN, IMG_MAX, drillBlank, drillCanDelete, drillCopy, drillCounts, drillDoc, drillError, drillFilter, imgChanges, imgDoc} from "../domain/drills.js";
import {TRTPL_COLL} from "../domain/plan-reuse.js";
import {TRPLAN_COLL, drillUsage} from "../domain/training-plan.js";
import {bindMedia, bindThumbs, imgForget, imgRemember, imgSrc, loadImgs, mediaHtml, shrinkImage, thumbsHtml} from "./drill-media.js";
import {bindImportBtns, importBtnsHtml, importOpen, importView} from "./drill-import-view.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
const FAV_KEY = "hk-drill-fav";                    // localStorage: id oblíbených cvičení (jen toto zařízení)
let foOpen = false;                                // rozbalený filtr

// ===== Pomocné funkce =====
// Oblíbená cvičení (prohlížeč může úložiště odmítnout – pak prázdná množina)
const favs = () => { try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); } catch { return new Set(); } };
function favToggle(id) {
  const f = favs();
  if (f.has(id)) f.delete(id); else f.add(id);
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...f])); } catch { toast("Oblíbená se v tomto zařízení neuloží"); }
}
// Práva přihlášeného uživatele v modulu drills
const canE = () => HK.perm("drills", "e");
const canD = () => HK.perm("drills", "d");
// Autor a čas zápisu
const stamp = () => { const u = HK.user(); return {by: ((u && u.email) || "").toLowerCase(), at: new Date().toISOString()}; };
const byId = id => S.dr.find(d => d.id === id);
// Štítky dovedností jako ikony s popisem
const skIcons = d => (d.sk || []).filter(k => SKILLS[k]).map(k => `<span title="${esc(SKILLS[k])}">${SKILLS[k].split(" ")[0]}</span>`).join(" ");
const chip = (on, attr, text) => `<button class="chip ${on ? "on" : ""}" ${attr}>${text}</button>`;
const measText = m => m ? UNITS[m.u] + (m.low ? " · nižší je lepší" : " · vyšší je lepší") : "";
// Rozpracované cvičení: d = formulář, orig = id obrázků před úpravou, nw = nové obrázky [{id, d, w, h}] (uloží se s cvičením)
const draft = (id, d) => ({id, d, orig: id ? [...(d.img || [])] : [], nw: []});
// Překreslení po načtení obrázku: ve formuláři nejdřív převzít rozepsané hodnoty
const redraw = () => { if (document.getElementById("dfn")) readForm(); render(); };
// Použití cvičení v plánech tréninků a šablonách (S.dru): načte se jednou při otevření vyřazeného cvičení s právem mazat.
// Plány musí jít přečíst (jinak se mazat nedá); šablony jen, když na ně uživatel má právo (jinak se nepočítají).
function loadUsage() {
  if (S.dru) return;
  const R = S.dru = {st: "load", m: {}};
  const tpl = S.db.collection(TRTPL_COLL).getAll().catch(() => []);
  Promise.all([S.db.collection(TRPLAN_COLL).getAll(), tpl])
    .then(([p, t]) => { if (S.dru === R) { R.m = drillUsage([...p, ...t]); R.st = "ok"; render(); } })
    .catch(e => { if (S.dru === R) { R.st = "err"; R.err = (e && (e.code || e.message)) || "chyba"; render(); } });
}
// Řádek se smazáním vyřazeného cvičení: podle použití v plánech tlačítko, nebo vysvětlení, proč smazat nejde
function deleteHtml(d) {
  if (!canD() || !d.arch) return "";
  loadUsage();
  const U = S.dru, k = "dr-del:" + d.id;
  if (U.st === "load") return '<div class="mu" style="font-size:12px">Ověřuji, zda cvičení nepoužívá nějaký plán…</div>';
  if (U.st === "err") return `<div class="mu" style="font-size:12px;color:var(--wa)">Použití v plánech nejde ověřit (${esc(U.err)}) – smazat teď nejde.</div>`;
  const used = U.m[d.id] || 0;
  if (!drillCanDelete(d, used)) return `<div class="mu" style="font-size:12px">Používá ho ${used} ${used === 1 ? "plán tréninku nebo šablona" : used < 5 ? "plány tréninků nebo šablony" : "plánů tréninků nebo šablon"} – smazat nejde, zůstává vyřazené.</div>`;
  return `<button class="d" data-ddl="${esc(d.id)}" style="flex:none;${armed(k) ? "background:var(--no);color:#fff" : ""}">${armed(k) ? "Opravdu smazat?" : "🗑 Smazat"}</button>`;
}

// ===== Vykreslení: seznam =====
function itemHtml(d, F) {
  const open = S.dro === d.id;
  return `<div class="it" data-dro="${esc(d.id)}" style="cursor:pointer;align-items:flex-start"><div style="flex:1">
<b>${F.has(d.id) ? "⭐ " : ""}${esc(d.name)}</b>
<div class="mu">${esc(CATS[d.cat] || "?")} · ${LEVELS[d.lvl] || ""} · ${+d.dur || "?"} min ${skIcons(d)}</div>
${open ? detailHtml(d, F) : ""}</div></div>`;
}
function listHtml() {
  const F = favs(), l = drillFilter(S.dr, S.drf, F);
  return l.length ? l.map(d => itemHtml(d, F)).join("") : `<div class="msg">${S.dr.length ? "V tomto výběru nic není." : (canE() ? "Banka je zatím prázdná – začni tlačítkem 📥 Základní sada." : "Banka je zatím prázdná.")}</div>`;
}
function filterHtml() {
  const f = S.drf, c = drillCounts(S.dr);
  const n = [f.cat && CATS[f.cat], f.sk && SKILLS[f.sk], f.lvl && LEVELS[f.lvl], f.fav && "⭐ oblíbená", f.arch && "🗄 vyřazená"].filter(Boolean);
  return `<div class="row" style="align-items:center;flex-wrap:nowrap;margin-top:8px"><input id="drq" placeholder="🔍 Hledat v názvu, pomůckách a popisu" value="${esc(f.q || "")}" style="flex:1;margin:0"><button class="s" id="drfo" style="flex:none">Filtry ${foOpen ? "▴" : "▾"}</button></div>
<div class="mu" style="margin:6px 0">${n.length ? esc(n.join(" · ")) + ' <button class="s" id="drfx" style="padding:4px 10px">✕ Zrušit</button>' : "Všechna aktivní cvičení"}</div>
${foOpen ? `<h3>Kategorie</h3><div class="chips">${Object.entries(CATS).map(([k, t]) => chip(f.cat === k, `data-fc="${k}"`, esc(t) + " (" + (c.cat[k] || 0) + ")")).join("")}</div>
<h3>Dovednost</h3><div class="chips">${Object.entries(SKILLS).map(([k, t]) => chip(f.sk === k, `data-fs="${k}"`, esc(t) + " (" + (c.sk[k] || 0) + ")")).join("")}</div>
<h3>Úroveň</h3><div class="chips">${Object.entries(LEVELS).map(([k, t]) => chip(String(f.lvl) === k, `data-fl="${k}"`, esc(t))).join("")}</div>
<h3>Další</h3><div class="chips">${chip(f.fav, 'data-ff="1"', "⭐ Jen oblíbená")}${chip(f.arch, 'data-fa="1"', "🗄 Vyřazená")}</div>` : ""}`;
}

// ===== Vykreslení: detail =====
function detailHtml(d, F) {
  const e = canE();
  return `<div style="margin-top:8px" data-stop="1">
${d.arch ? '<div><span class="tag red">🗄 Vyřazené</span></div>' : ""}
${(d.sk || []).length ? `<div class="mu">Dovednosti: ${esc(d.sk.map(x => SKILLS[x] || x).join(", "))}</div>` : ""}
${(d.grp || []).length ? `<div class="mu">Vhodné pro: ${esc(d.grp.map(x => GROUPS[x] || x).join(", "))}</div>` : ""}
${d.eq ? `<div class="mu">Pomůcky: ${esc(d.eq)}</div>` : ""}
${d.meas ? `<div class="mu">⏲ Měření: ${esc(measText(d.meas))}</div>` : ""}
${d.desc ? `<div style="white-space:pre-wrap;margin:6px 0">${esc(d.desc)}</div>` : ""}
${thumbsHtml(d.img, 96, render)}
${d.url ? mediaHtml(d.url, "▶ Přehrát video") : ""}
${d.pdf ? mediaHtml(d.pdf, "📄 Zobrazit PDF") : ""}
<div class="mu" style="font-size:12px;margin-top:4px">${d.by ? "Upravil(a) " + esc(d.by) : ""}${d.at ? " · " + esc(String(d.at).slice(0, 10)) : ""}</div>
<div class="row" style="margin-top:8px;flex-wrap:wrap">
<button class="s" data-fav="${esc(d.id)}" style="flex:none">${F.has(d.id) ? "☆ Odebrat z oblíbených" : "⭐ Oblíbené"}</button>
${e && !d.arch ? `<button class="s" data-ded="${esc(d.id)}" style="flex:none">✏️ Upravit</button><button class="s" data-dcp="${esc(d.id)}" style="flex:none">⧉ Kopie</button>` : ""}
${e ? `<button class="s" data-dar="${esc(d.id)}" style="flex:none">${d.arch ? "↩ Vrátit do banky" : "🗄 Vyřadit"}</button>` : ""}
${deleteHtml(d)}
</div>${e && !d.arch ? '<div class="mu" style="font-size:12px;margin-top:4px">Cvičení se nemaže, ale vyřazuje – plány tréninků na něj mohou odkazovat. Smazat jde jen vyřazené.</div>' : ""}</div>`;
}

// ===== Vykreslení: formulář =====
function formHtml(E) {
  const d = E.d, m = d.meas;
  return `<div class="cd"><h2>${E.id ? "✏️ Upravit cvičení" : "➕ Nové cvičení"}</h2>
<label>Název</label><input id="dfn" maxlength="${DRILL_MAX.name}" value="${esc(d.name)}">
<label>Kategorie (část tréninku)</label><select id="dfc">${Object.entries(CATS).map(([k, t]) => `<option value="${k}" ${d.cat === k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
<label>Dovednosti (aspoň jedna)</label><div class="chips">${Object.entries(SKILLS).map(([k, t]) => chip(d.sk.includes(k), `data-dsk="${k}"`, esc(t))).join("")}</div>
<label>Úroveň</label><div class="chips">${Object.entries(LEVELS).map(([k, t]) => chip(String(d.lvl) === k, `data-dlv="${k}"`, esc(t))).join("")}</div>
<label>Vhodné pro</label><div class="chips">${Object.entries(GROUPS).map(([k, t]) => chip(d.grp.includes(k), `data-dgr="${k}"`, esc(t))).join("")}</div>
<div class="row"><div><label>Délka (min, ${DUR_MIN}–${DUR_MAX})</label><input id="dfd" type="number" inputmode="numeric" min="${DUR_MIN}" max="${DUR_MAX}" value="${esc(d.dur)}"></div>
<div style="flex:2"><label>Pomůcky</label><input id="dfe" maxlength="${DRILL_MAX.eq}" value="${esc(d.eq)}" placeholder="kužely, puky, …"></div></div>
<label>Popis</label><textarea id="dfs" rows="5" maxlength="${DRILL_MAX.desc}">${esc(d.desc)}</textarea>
<label>▶ Odkaz na video (nepovinné – YouTube, Google Disk, soubor .mp4 / .webm; přehraje se v aplikaci)</label><input id="dfu" maxlength="${DRILL_MAX.url}" inputmode="url" value="${esc(d.url)}" placeholder="https://…">
<label>📄 Odkaz na PDF (nepovinné – Google Disk týmového účtu, sdílení „Kdokoli s odkazem“)</label><input id="dfp" maxlength="${DRILL_MAX.url}" inputmode="url" value="${esc(d.pdf || "")}" placeholder="https://…">
${imgFormHtml(E)}
<label>⏲ Měření pro stopky a testy</label><select id="dfm"><option value="">Neměří se</option>${Object.entries(UNITS).map(([k, t]) => `<option value="${k}" ${m && m.u === k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
${m ? `<label class="row" style="align-items:center;gap:8px;flex-wrap:nowrap"><input id="dfl" type="checkbox" style="width:auto;margin:0" ${m.low ? "checked" : ""}> Nižší hodnota je lepší (např. čas)</label>` : ""}
<div class="row" style="margin-top:10px"><button class="s" id="dfx">Zrušit</button><button class="p" id="dfok" style="flex:2">💾 Uložit</button></div></div>`;
}
// 📷 Obrázky ve formuláři: uložené (d.img) i nové (nw), u každého ✕; přidání fotky z galerie nebo fotoaparátu
function imgFormHtml(E) {
  const kept = E.d.img || [], n = kept.length + E.nw.length;
  loadImgs(kept, redraw);
  const box = (src, attr) => `<div style="position:relative">${src ? `<img src="${src}" alt="" style="height:84px;border-radius:8px;border:1px solid var(--bd)">` : '<div style="height:84px;width:84px;border:1px dashed var(--bd);border-radius:8px"></div>'}<button class="d" ${attr} style="position:absolute;top:2px;right:2px;padding:2px 8px;min-height:0">✕</button></div>`;
  return `<label>📷 Obrázky (nejvýš ${IMG_MAX}) – nákres nebo fotka tabule, trenér je na stanovišti otevře přes celou obrazovku</label>
<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${kept.map(id => box(imgSrc(id), `data-dik="${esc(id)}"`)).join("")}${E.nw.map((x, i) => box(x.d, `data-din="${i}"`)).join("")}</div>
${n < IMG_MAX ? `<input id="dfi" type="file" accept="image/*" style="margin-bottom:4px"><div class="mu" style="font-size:12px;margin-bottom:8px">Obrázek se před uložením zmenší (asi 200 kB), takže se rychle načte i na ledě.</div>` : ""}`;
}
// Přenese vstupy formuláře do rozpracovaného cvičení (před překreslením po klepnutí na štítek)
function readForm() {
  const d = S.dre.d, mu = $("#dfm").value, low = document.querySelector("#dfl");
  d.name = $("#dfn").value; d.cat = $("#dfc").value; d.dur = parseInt($("#dfd").value, 10);
  d.eq = $("#dfe").value; d.desc = $("#dfs").value; d.url = $("#dfu").value.trim(); d.pdf = $("#dfp").value.trim();
  d.meas = mu ? {u: mu, low: low ? low.checked : mu === "s"} : null;
}

// ===== Hlavní logika: uložení a změny =====
// Uložení v jedné dávce: nové obrázky (drillimg), smazání odebraných obrázků a cvičení (nové = set s arch: false, úprava = merge)
function save() {
  readForm();
  const E = S.dre, st = stamp(), id = E.id || S.db.collection(DRILL_COLL).newId();
  const nw = E.nw.map(x => ({id: x.id, doc: imgDoc(x.d, id, x.w, x.h, st.by, st.at)})).filter(x => x.doc);
  const img = [...(E.d.img || []), ...nw.map(x => x.id)];
  const err = drillError({...E.d, img});
  if (err) return toast(err);
  const doc = {...drillDoc({...E.d, img}), ...st}, b = S.db.batch();
  nw.forEach(x => { b.set(DRILLIMG_COLL + "/" + x.id, x.doc); imgRemember(x.id, x.doc.d); });
  imgChanges(E.orig, img).del.forEach(x => { b.delete(DRILLIMG_COLL + "/" + x); imgForget(x); });
  if (E.id) b.merge(DRILL_COLL + "/" + id, doc); else b.set(DRILL_COLL + "/" + id, {...doc, arch: false});
  b.commit();
  S.dre = null; render();
}
// Přidání fotky: zmenšení v zařízení, uložení až s cvičením
async function addImage(file) {
  readForm();
  try {
    const x = await shrinkImage(file);
    if (!S.dre) return;
    S.dre.nw.push({id: S.db.collection(DRILLIMG_COLL).newId(), ...x});
    toast("Obrázek přidán (" + Math.round(x.d.length * 0.75 / 1024) + " kB) – ulož cvičení");
  } catch (e) { toast((e && e.message) || "Obrázek se nepodařilo přidat"); }
  render();
}
// Smazání vyřazeného a nepoužitého cvičení v jedné dávce i s jeho obrázky (drillimg)
function removeDrill(id) {
  const d = byId(id), b = S.db.batch();
  (d && d.img || []).forEach(x => { b.delete(DRILLIMG_COLL + "/" + x); imgForget(x); });
  b.delete(DRILL_COLL + "/" + id);
  b.commit();
  S.dro = null; toast("Cvičení smazáno");
}
function archToggle(id) {
  const d = byId(id);
  if (!d) return;
  S.dru = null;                                    // po vyřazení se použití v plánech ověří znovu
  S.db.doc(DRILL_COLL + "/" + id).merge({arch: !d.arch, ...stamp()}).catch(() => toast("Uložení se nepovedlo"));
  toast(d.arch ? "Cvičení je zpět v bance" : "Cvičení je vyřazené (najdeš ho ve filtru 🗄 Vyřazená)");
}

// ===== Eventy =====
function bindForm(a) {
  const tog = (attr, fn) => a.querySelectorAll("[" + attr + "]").forEach(b => b.onclick = () => { readForm(); fn(b.getAttribute(attr)); render(); });
  const flip = (arr, k) => arr.includes(k) ? arr.filter(x => x !== k) : [...arr, k];
  tog("data-dsk", k => { S.dre.d.sk = flip(S.dre.d.sk, k); });
  tog("data-dgr", k => { S.dre.d.grp = flip(S.dre.d.grp, k); });
  tog("data-dlv", k => { S.dre.d.lvl = +k; });
  $("#dfm").onchange = () => { readForm(); render(); };
  $("#dfx").onclick = () => { S.dre = null; render(); };
  $("#dfok").onclick = save;
  const fi = document.querySelector("#dfi");
  if (fi) fi.onchange = () => { if (fi.files && fi.files[0]) addImage(fi.files[0]); };
  // ✕ u obrázku: uložený se odebere (smaže se až při uložení cvičení), nový se zahodí
  tog("data-dik", k => { S.dre.d.img = (S.dre.d.img || []).filter(x => x !== k); });
  tog("data-din", k => { S.dre.nw.splice(+k, 1); });
}
function bindList(a) {
  const upd = () => { $("#drl").innerHTML = listHtml(); bindItems(a); };
  $("#drq").oninput = e => { S.drf.q = e.target.value; upd(); };
  $("#drfo").onclick = () => { foOpen = !foOpen; render(); };
  const fx = document.querySelector("#drfx");
  if (fx) fx.onclick = () => { S.drf = {}; render(); };
  const set = (attr, key, val) => a.querySelectorAll("[" + attr + "]").forEach(b => b.onclick = () => { const v = val(b.getAttribute(attr)); S.drf[key] = S.drf[key] === v ? undefined : v; S.dro = null; render(); });
  set("data-fc", "cat", v => v); set("data-fs", "sk", v => v); set("data-fl", "lvl", v => +v);
  set("data-ff", "fav", () => true); set("data-fa", "arch", () => true);
  const nw = document.querySelector("#drnew");
  if (nw) nw.onclick = () => { S.dre = draft(null, drillBlank()); render(); window.scrollTo(0, 0); };
  bindItems(a);
}
function bindItems(a) {
  // Otevření cvičení; u vyřazeného se použití v plánech načte znovu (mohlo se změnit)
  a.querySelectorAll("[data-dro]").forEach(b => b.onclick = e => { if (e.target.closest("[data-stop]")) return; S.dro = S.dro === b.dataset.dro ? null : b.dataset.dro; if (S.dro && (byId(S.dro) || {}).arch) S.dru = null; render(); });
  a.querySelectorAll("[data-fav]").forEach(b => b.onclick = () => { favToggle(b.dataset.fav); render(); });
  a.querySelectorAll("[data-ded]").forEach(b => b.onclick = () => { const d = byId(b.dataset.ded); if (d) { S.dre = draft(d.id, drillDoc(d)); render(); window.scrollTo(0, 0); } });
  a.querySelectorAll("[data-dcp]").forEach(b => b.onclick = () => { const d = byId(b.dataset.dcp); if (d) { S.dre = draft(null, drillCopy(d)); render(); window.scrollTo(0, 0); } });
  bindThumbs(a);
  bindMedia(a);
  a.querySelectorAll("[data-dar]").forEach(b => b.onclick = () => archToggle(b.dataset.dar));
  a.querySelectorAll("[data-ddl]").forEach(b => b.onclick = () => { const id = b.dataset.ddl; confirm2("dr-del:" + id, () => removeDrill(id)); });
}

// ===== Exporty =====
// Režim 📚 Cvičení záložky Team; head = přepínač režimů (Team | 📚 Cvičení | pokladna …)
export function drillsView(a, head) {
  if (S.dre && !canE()) S.dre = null;
  if (S.dre) { a.innerHTML = head + formHtml(S.dre); bindForm(a); return; }
  if (importOpen()) { importView(a, head); return; }
  const act = S.dr.filter(d => !d.arch).length;
  a.innerHTML = `${head}<div class="cd"><div class="row" style="align-items:center;flex-wrap:nowrap"><h2 style="margin:0;flex:1">📚 Banka cvičení (${act})</h2>${canE() ? '<button class="p" id="drnew" style="flex:none">➕ Nové</button>' : ""}</div>
${importBtnsHtml()}
${S.drErr ? `<div class="msg">Banku cvičení se nepodařilo načíst (${esc(S.drErr)}). Manager musí publikovat pravidla databáze ve verzi v21.1.</div>` : ""}
${filterHtml()}<div id="drl">${listHtml()}</div></div>`;
  bindList(a);
  bindImportBtns(a);
}
