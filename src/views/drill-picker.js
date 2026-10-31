// 📚 Výběr cvičení z banky přes celou obrazovku (úprava plánu tréninku): 🔍 hledání v názvu, pomůckách a popisu, část tréninku, dovednost,
// ⭐ oblíbená (toto zařízení); klepnutí cvičení vybere. ➕ Nové cvičení (právo drills e): krátký formulář (název, kategorie, délka, popis,
// volitelně 📷 / ▶ / 📄), uloží do 📚 banky (writeDrill z drills-view.js) a hned ho vybere – plán zůstane otevřený na stejném místě.
// Okno #dpk se vkládá do body, ✕ ho zavře. Stav filtru S.dpk, filtr domain/drills.js (drillFilter), výchozí dovednost quickDrill.

// ===== Importy =====
import {CATS, LEVELS, SKILLS} from "../config/skills.js";
import {S} from "../core/state.js";
import {esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {DRILL_MAX, DRILLIMG_COLL, DUR_MAX, DUR_MIN, IMG_MAX, drillFilter} from "../domain/drills.js";
import {QUICK_DUR, quickDrill} from "../domain/training-impro.js";
import {shrinkImage} from "./drill-media.js";
import {writeDrill} from "./drills-view.js";

// ===== Konstanty a stav =====
const FAV_KEY = "hk-drill-fav";                          // stejný klíč jako ⭐ oblíbená v 📚 bance (views/drills-view.js)
// P = otevřený výběr: el, cur (id vybraného), pick (funkce po výběru), timer (zpoždění hledání),
// nd = rozpracované ➕ nové cvičení {name, cat, dur, desc, url, pdf, more (▸ obrázek / video / PDF), nw: [{id, d, w, h}]} | null
let P = null;
const CSS = `<style>
#dpk{position:fixed;inset:0;z-index:44;background:var(--bg);color:var(--tx);overflow:auto;padding:12px 12px calc(12px + env(safe-area-inset-bottom,0px))}
#dpk .dph{display:flex;gap:8px;align-items:center;margin-bottom:8px;position:sticky;top:-12px;background:var(--bg);padding:8px 0;z-index:2}
#dpk .dph input{flex:1;min-width:0;margin:0}
#dpk .dpi{display:block;width:100%;text-align:left;padding:10px;margin-bottom:6px;border:1px solid var(--bd);border-radius:10px;background:var(--cd);color:var(--tx);min-height:52px}
#dpk .dpi.on{border:2px solid var(--ac)}
#dpk .dpi small{display:block;color:var(--mu);font-size:12px}
#dpk .chips{margin:4px 0}
#dpk .dpn input,#dpk .dpn select,#dpk .dpn textarea{width:100%;font-size:16px;margin-bottom:6px}
#dpk .dpn .dpq{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
#dpk .dpn .dpq button{min-height:44px;min-width:48px}
</style>`;

// ===== Pomocné funkce =====
const favs = () => { try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); } catch (e) { return new Set(); } };
const F = () => (S.dpk = S.dpk || {q: "", cat: "", sk: "", fav: false});
const canNew = () => HK.perm("drills", "e");
// Nové cvičení: název z hledání, kategorie z filtru (jinak dovednosti), délka 10 min
const ndBlank = () => { const f = F(); return {name: String(f.q || "").trim().slice(0, DRILL_MAX.name), cat: CATS[f.cat] ? f.cat : "skill", dur: 10, desc: "", url: "", pdf: "", more: false, nw: []}; };
// Přenese vstupy formuláře nového cvičení do P.nd (před překreslením)
function readNew() {
  const n = P && P.nd, el = P && P.el;
  if (!n || !el) return;
  const v = id => { const x = el.querySelector("#" + id); return x ? x.value : null; };
  if (v("dpnn") != null) n.name = v("dpnn");
  if (v("dpnc") != null) n.cat = v("dpnc");
  if (v("dpnd") != null) n.dur = parseInt(v("dpnd"), 10) || n.dur;
  if (v("dpns") != null) n.desc = v("dpns");
  if (v("dpnu") != null) n.url = v("dpnu").trim();
  if (v("dpnp") != null) n.pdf = v("dpnp").trim();
}

// ===== Vykreslení =====
function listHtml() {
  const f = F(), fv = favs(), L = drillFilter(S.dr, {...f, arch: false}, fv);
  return L.length ? L.slice(0, 120).map(d => `<button class="dpi ${d.id === P.cur ? "on" : ""}" data-dpi="${esc(d.id)}">${fv.has(d.id) ? "⭐ " : ""}<b>${esc(d.name)}</b><small>${esc(CATS[d.cat] || "")} · ${+d.dur || "?"} min · ${LEVELS[d.lvl] || ""}${d.meas ? " · ⏲ měření" : ""}${d.img && d.img.length ? " · 📷" : ""}${d.url || d.pdf ? " · ▶" : ""}</small></button>`).join("")
    + (L.length > 120 ? `<div class="mu">… a dalších ${L.length - 120} – upřesni hledání.</div>` : "")
    : `<div class="mu" style="margin:10px 0">Nic nenalezeno – zkus jiné hledání nebo zruš filtr.</div>${canNew() ? '<button class="p w" data-dpnew="1" style="min-height:52px">➕ Nové cvičení</button>' : ""}`;
}
// ➕ Formulář nového cvičení: povinně název, kategorie a délka; popis a ▸ obrázek / video / PDF volitelně (dovednosti doplní banka)
function newHtml() {
  const n = P.nd, img = n.nw.map((x, i) => `<div style="position:relative"><img src="${x.d}" alt="" style="height:72px;border-radius:8px;border:1px solid var(--bd)"><button class="d" data-dpni="${i}" style="position:absolute;top:2px;right:2px;padding:2px 8px;min-height:0">✕</button></div>`).join("");
  return CSS + `<div class="dph"><button class="s" id="dpnx" style="flex:none;min-height:46px">← Zpět</button><b style="flex:1">➕ Nové cvičení do 📚 banky</b></div>
<div class="dpn"><input id="dpnn" maxlength="${DRILL_MAX.name}" value="${esc(n.name)}" placeholder="Název cvičení" autocomplete="off">
<select id="dpnc">${Object.entries(CATS).map(([k, t]) => `<option value="${k}" ${n.cat === k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
<div class="dpq"><span class="mu" style="align-self:center">⏱</span>${QUICK_DUR.map(m => `<button class="${n.dur === m ? "p" : "s"}" data-dpnm="${m}">${m}</button>`).join("")}<input id="dpnd" type="number" inputmode="numeric" min="${DUR_MIN}" max="${DUR_MAX}" value="${esc(n.dur)}" style="width:70px;margin:0;text-align:center"><span class="mu" style="align-self:center">min</span></div>
<textarea id="dpns" rows="3" maxlength="${DRILL_MAX.desc}" placeholder="Popis (nepovinné)">${esc(n.desc)}</textarea>
${n.more ? `<input id="dpnu" maxlength="${DRILL_MAX.url}" inputmode="url" value="${esc(n.url)}" placeholder="▶ Odkaz na video (nepovinné)">
<input id="dpnp" maxlength="${DRILL_MAX.url}" inputmode="url" value="${esc(n.pdf)}" placeholder="📄 Odkaz na PDF (nepovinné)">
<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${img}</div>${n.nw.length < IMG_MAX ? '<input id="dpnf" type="file" accept="image/*">' : ""}`
    : '<button class="s w" id="dpnmo" style="margin-bottom:6px">▸ 📷 Obrázek, ▶ video, 📄 PDF</button>'}
<div class="mu" style="font-size:12px;margin-bottom:8px">Dovednosti, úroveň a pomůcky doplníš později v 📚 bance.</div>
<button class="p w" id="dpnok" style="min-height:56px">💾 Uložit do banky a vybrat</button></div>`;
}
function screenHtml() {
  if (P.nd) return newHtml();
  const f = F();
  return CSS + `<div class="dph"><button class="s" id="dpx" style="flex:none;min-height:46px">✕</button><input id="dpq" type="search" placeholder="🔍 Hledat cvičení" value="${esc(f.q)}" autocomplete="off"></div>
<div class="chips">${canNew() ? '<button class="chip" data-dpnew="1">➕ Nové cvičení</button>' : ""}<button class="chip ${f.fav ? "on" : ""}" id="dpf">⭐ Oblíbená</button>${P.cur ? '<button class="chip" id="dp0">✕ Bez cvičení</button>' : ""}${f.q || f.cat || f.sk || f.fav ? '<button class="chip" id="dpr">↺ Zrušit filtr</button>' : ""}</div>
<div class="row" style="margin:4px 0 8px"><select id="dpc" style="margin:0"><option value="">Část tréninku – vše</option>${Object.entries(CATS).map(([k, t]) => `<option value="${k}" ${f.cat === k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
<select id="dps" style="margin:0"><option value="">Dovednost – vše</option>${Object.entries(SKILLS).map(([k, t]) => `<option value="${k}" ${f.sk === k ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
<div id="dpl">${listHtml()}</div>`;
}
function paint(keepFocus) {
  if (!P) return;
  if (keepFocus) { const l = P.el.querySelector("#dpl"); if (l) { l.innerHTML = listHtml(); bindList(); return; } }
  P.el.innerHTML = screenHtml();
  bind();
}

// ===== Eventy =====
function bindList() {
  P.el.querySelectorAll("[data-dpi]").forEach(b => b.onclick = () => { const id = b.dataset.dpi, fn = P.pick; close(); fn(id); });
  P.el.querySelectorAll("[data-dpnew]").forEach(b => b.onclick = () => { P.nd = ndBlank(); paint(); const n = P.el.querySelector("#dpnn"); if (n && !P.nd.name) n.focus(); });
}
// ➕ Formulář nového cvičení: délka klepnutím, ▸ další (obrázek / odkazy), 📷 zmenšení fotky v zařízení, uložení a výběr
function bindNew() {
  const el = P.el, n = P.nd;
  el.querySelector("#dpnx").onclick = () => { P.nd = null; paint(); };
  el.querySelectorAll("[data-dpnm]").forEach(b => b.onclick = () => { readNew(); n.dur = +b.dataset.dpnm; paint(); });
  const mo = el.querySelector("#dpnmo");
  if (mo) mo.onclick = () => { readNew(); n.more = true; paint(); };
  el.querySelectorAll("[data-dpni]").forEach(b => b.onclick = () => { readNew(); n.nw.splice(+b.dataset.dpni, 1); paint(); });
  const fi = el.querySelector("#dpnf");
  if (fi) fi.onchange = async () => {
    const file = fi.files && fi.files[0];
    if (!file) return;
    readNew();
    try { const x = await shrinkImage(file); if (P && P.nd === n) n.nw.push({id: S.db.collection(DRILLIMG_COLL).newId(), ...x}); }
    catch (e) { toast((e && e.message) || "Obrázek se nepodařilo přidat"); }
    if (P && P.nd === n) paint();
  };
  el.querySelector("#dpnok").onclick = () => {
    readNew();
    // Základ z ⚡ improvizace (výchozí dovednost podle kategorie), popis od trenéra, jinak poznámka „doplň popis“
    const base = quickDrill(n.name, n.cat, n.dur), dur = Math.max(DUR_MIN, Math.min(DUR_MAX, parseInt(n.dur, 10) || base.dur));
    const r = writeDrill({id: null, d: {...base, dur, desc: String(n.desc || "").trim() || base.desc, url: n.url, pdf: n.pdf}, orig: [], nw: n.nw});
    if (r.err) return toast(r.err);
    const fn = P.pick;
    close();
    toast("💾 Cvičení uloženo do banky");
    fn(r.id, r.doc);
  };
}
function bind() {
  if (P.nd) return bindNew();
  const el = P.el, f = F();
  el.querySelector("#dpx").onclick = close;
  // Hledání: seznam se obnoví po krátké pauze v psaní, pole zůstane aktivní (klávesnice nezmizí)
  el.querySelector("#dpq").oninput = e => { f.q = e.target.value; clearTimeout(P.timer); P.timer = setTimeout(() => paint(true), 150); };
  el.querySelector("#dpf").onclick = () => { f.fav = !f.fav; paint(); };
  const r = el.querySelector("#dpr");
  if (r) r.onclick = () => { S.dpk = null; paint(); };
  const z = el.querySelector("#dp0");
  if (z) z.onclick = () => { const fn = P.pick; close(); fn(""); };
  el.querySelector("#dpc").onchange = e => { f.cat = e.target.value; paint(); };
  el.querySelector("#dps").onchange = e => { f.sk = e.target.value; paint(); };
  bindList();
}
function close() {
  if (!P) return;
  clearTimeout(P.timer);
  P.el.remove();
  P = null;
}

// ===== Exporty =====
// Otevře výběr: cur = id vybraného cvičení, pick(id, doc?) = po výběru (prázdné id = bez cvičení; doc = právě založené ➕ nové cvičení)
export function openDrillPicker(cur, pick) {
  close();
  const el = document.createElement("div");
  el.id = "dpk";
  document.body.appendChild(el);
  P = {el, cur: cur || "", pick, timer: null, nd: null};
  paint();
}
