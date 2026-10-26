// Obrázky cvičení (drillimg/{id}): zmenšení fotky v zařízení před uložením, načtení na vyžádání s pamětí v zařízení,
// náhledy (klepnutí = prohlížeč přes celou obrazovku #imv, ‹ › mezi obrázky, klepnutí na obrázek = zvětšení 2×, ✕ / Zpět zavře).
// Obrázek se čte jednorázově (S.db.doc().get – i z offline paměti Firestore); výsledek zůstává v paměti do zavření aplikace.
// ▶ Video a 📄 PDF cvičení (odkaz) se přehrají v náhledu přímo v okně cvičení (mediaHtml / bindMedia – YouTube, Google Disk, .mp4 / .webm).
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Zmenšení obrázku -> Načtení a náhledy -> Prohlížeč -> Náhled videa a PDF -> Exporty (u funkcí).

// ===== Importy =====
import {S} from "../core/state.js";
import {esc} from "../core/utils.js";
import {DRILLIMG_COLL, IMG_LEN, IMG_PX, imgFit, mediaOf} from "../domain/drills.js";

// ===== Konstanty a stav =====
const cache = new Map();                 // id → data:URL | "err" (načtení selhalo)
const loading = new Set();               // id, která se právě načítají
const QUALITY = [0.82, 0.72, 0.62, 0.5]; // kvalita JPEG při zmenšování (postupně, dokud se obrázek nevejde do IMG_LEN)
let viewer = null;                       // otevřený prohlížeč {ids, i, zoom}

// ===== Pomocné funkce =====
// Obrázek z data:URL nebo souboru jako prvek <img> (čeká na načtení)
const loadEl = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("Obrázek nejde přečíst")); im.src = src; });
const readFile = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error("Soubor nejde přečíst")); r.readAsDataURL(f); });
// Zdroj obrázku pro <img>: data:URL z paměti, nebo null (ještě se načítá / chyba)
export const imgSrc = id => { const v = cache.get(id); return v && v !== "err" ? v : null; };
// Uloží nově zmenšený obrázek do paměti (po uložení cvičení se nemusí znovu načítat)
export const imgRemember = (id, d) => { if (id && d) cache.set(id, d); };
export const imgForget = id => cache.delete(id);

// ===== Zmenšení obrázku =====
// Fotka z <input type="file"> → {d: data:URL JPEG, w, h}; delší strana nejvýš IMG_PX, velikost nejvýš IMG_LEN znaků
export async function shrinkImage(file) {
  if (!file || !/^image\//.test(file.type || "")) throw new Error("Vyber obrázek (fotka, snímek obrazovky)");
  const im = await loadEl(await readFile(file));
  let {w, h} = imgFit(im.naturalWidth || im.width, im.naturalHeight || im.height, IMG_PX);
  for (let step = 0; step < 3; step++) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const cx = cv.getContext("2d");
    cx.fillStyle = "#fff"; cx.fillRect(0, 0, w, h);          // průhledné PNG na bílém pozadí (JPEG průhlednost nemá)
    cx.drawImage(im, 0, 0, w, h);
    for (const q of QUALITY) { const d = cv.toDataURL("image/jpeg", q); if (d.length <= IMG_LEN) return {d, w, h}; }
    w = Math.round(w * 0.75); h = Math.round(h * 0.75);       // ani nejnižší kvalita nestačí → menší rozměr
  }
  throw new Error("Obrázek je příliš velký");
}

// ===== Načtení a náhledy =====
// Načte chybějící obrázky; po načtení zavolá done (překreslení). Chyba (práva, offline bez kopie) = náhled s ⚠️.
export function loadImgs(ids, done) {
  (ids || []).filter(id => id && !cache.has(id) && !loading.has(id)).forEach(id => {
    loading.add(id);
    S.db.doc(DRILLIMG_COLL + "/" + id).get()
      .then(x => { cache.set(id, x && x.d ? x.d : "err"); })
      .catch(() => { cache.set(id, "err"); })
      .finally(() => { loading.delete(id); if (done) done(); });
  });
}
// Náhledy obrázků (klepnutí otevře prohlížeč); h = výška náhledu v px. Chybějící se načtou a pak se zavolá done.
export function thumbsHtml(ids, h = 72, done) {
  const L = (ids || []).filter(Boolean);
  if (!L.length) return "";
  loadImgs(L, done);
  const g = esc(L.join(","));
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">${L.map((id, i) => {
    const src = imgSrc(id), bad = cache.get(id) === "err";
    return src
      ? `<img src="${src}" alt="Obrázek ${i + 1}" data-imv="${g}|${i}" style="height:${h}px;max-width:100%;border-radius:8px;border:1px solid var(--bd);cursor:zoom-in;object-fit:cover">`
      : `<div style="height:${h}px;width:${h}px;border-radius:8px;border:1px dashed var(--bd);display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--mu)">${bad ? "⚠️" : "…"}</div>`;
  }).join("")}</div>`;
}
// Napojí klepnutí na náhledy v kořeni root
export function bindThumbs(root) {
  (root || document).querySelectorAll("[data-imv]").forEach(el => el.onclick = e => {
    e.stopPropagation();
    const [ids, i] = el.dataset.imv.split("|");
    openViewer(ids.split(","), +i || 0);
  });
}

// ===== Prohlížeč =====
// Prohlížeč přes celou obrazovku (nad vším, Zpět ho zavře přes core/nav.js – #imv #imx)
export function openViewer(ids, i = 0) {
  viewer = {ids: ids.filter(id => imgSrc(id)), i: 0, zoom: false};
  if (!viewer.ids.length) { viewer = null; return; }
  viewer.i = Math.max(0, Math.min(viewer.ids.length - 1, viewer.ids.indexOf(ids[i]) >= 0 ? viewer.ids.indexOf(ids[i]) : 0));
  drawViewer();
}
function closeViewer() { viewer = null; const el = document.getElementById("imv"); if (el) el.remove(); }
function drawViewer() {
  let el = document.getElementById("imv");
  if (!viewer) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement("div"); el.id = "imv"; document.body.appendChild(el); }
  const n = viewer.ids.length, src = imgSrc(viewer.ids[viewer.i]), z = viewer.zoom;
  const btn = "position:absolute;z-index:2;min-width:52px;min-height:52px;border-radius:26px;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:24px";
  el.style.cssText = "position:fixed;inset:0;z-index:40;background:#000;overflow:auto;-webkit-overflow-scrolling:touch";
  el.innerHTML = `<button id="imx" style="${btn};top:calc(10px + env(safe-area-inset-top,0px));right:10px">✕</button>
${n > 1 ? `<button data-imn="-1" style="${btn};left:8px;top:50%">‹</button><button data-imn="1" style="${btn};right:8px;top:50%">›</button><div style="position:fixed;bottom:calc(14px + env(safe-area-inset-bottom,0px));left:0;right:0;text-align:center;color:#fff;z-index:2">${viewer.i + 1} / ${n}</div>` : ""}
<div style="min-height:100%;display:flex;align-items:center;justify-content:center"><img id="imi" src="${src}" alt="Obrázek cvičení" style="${z ? "width:200%;max-width:none" : "max-width:100%;max-height:100vh;object-fit:contain"};cursor:${z ? "zoom-out" : "zoom-in"}"></div>`;
  el.querySelector("#imx").onclick = closeViewer;
  el.querySelector("#imi").onclick = () => { viewer.zoom = !viewer.zoom; drawViewer(); };
  el.querySelectorAll("[data-imn]").forEach(b => b.onclick = () => { viewer.i = (viewer.i + +b.dataset.imn + n) % n; viewer.zoom = false; drawViewer(); });
}

// ===== Náhled videa a PDF =====
// Odkaz cvičení jako tlačítko ▶ Přehrát (nic se nestahuje, dokud trenér neklepne) a po klepnutí přehrávač přímo v okně cvičení:
// YouTube a Google Disk (video i PDF) v rámečku, soubor .mp4 / .webm v přehrávači, ostatní odkazem. label = text tlačítka.
export function mediaHtml(url, label) {
  const m = mediaOf(url);
  if (!m) return "";
  const open = `<a href="${esc(url)}" target="_blank" rel="noopener" class="mu" style="font-size:12px">otevřít zvlášť ↗</a>`;
  if (m.kind === "link") return `<div style="margin:6px 0"><a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a></div>`;
  return `<div class="dmv" style="margin:6px 0"><button class="s w" data-dmv="${esc(m.kind)}|${esc(m.src)}" style="min-height:46px">${esc(label)}</button><div style="text-align:right">${open}</div></div>`;
}
// Klepnutí na ▶ nahradí tlačítko přehrávačem (16 : 9, u PDF vyšší)
export function bindMedia(root) {
  if (!root) return;
  root.querySelectorAll("[data-dmv]").forEach(b => b.onclick = () => {
    const i = b.dataset.dmv.indexOf("|"), kind = b.dataset.dmv.slice(0, i), src = b.dataset.dmv.slice(i + 1), pdf = /pdf/i.test(b.textContent);
    const box = document.createElement("div");
    box.style.cssText = "position:relative;width:100%;border-radius:10px;overflow:hidden;background:#000;" + (pdf ? "height:70vh" : "aspect-ratio:16/9");
    box.innerHTML = kind === "video"
      ? `<video src="${esc(src)}" controls playsinline autoplay style="width:100%;height:100%"></video>`
      : `<iframe src="${esc(src)}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen style="border:0;width:100%;height:100%"></iframe>`;
    b.replaceWith(box);
  });
}
