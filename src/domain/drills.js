// Doména: banka cvičení (čisté funkce bez DOM) – kontrola formuláře, filtr, kopie, vyřazení a smazání.
// drills/{id}: name, cat, sk, lvl 1–3, dur, grp [all|st|gk], eq, desc, url, pdf, img, meas {u, low} | null, by, at, arch.
// Obrázky drillimg/{id} = {d, did, w, h, by, at} (nejvýš IMG_MAX); cvičení se vyřazuje (arch), smazat jde jen vyřazené.
// Odkazy url / pdf se přehrají v náhledu (mediaOf – YouTube, Google Disk, .mp4 / .webm).
// ===== Importy =====
import {CATS, GROUPS, LEVELS, SKILLS, UNITS} from "../config/skills.js";

// ===== Konstanty =====
export const DRILL_COLL = "drills";
export const DRILLIMG_COLL = "drillimg";                            // obrázky cvičení (jeden dokument = jeden obrázek)
export const DRILL_MAX = {name: 80, eq: 200, desc: 2000, url: 300};   // nejdelší texty (url platí i pro pdf)
export const IMG_MAX = 3;                                            // obrázků na cvičení
export const IMG_PX = 1280;                                          // delší strana zmenšeného obrázku (px)
export const IMG_LEN = 700000;                                       // nejdelší data:URL obrázku (znaků; dokument Firestore má limit 1 MiB)
export const DUR_MIN = 1, DUR_MAX = 60, DUR_DEF = 10;                 // délka cvičení v minutách
// Pole dokumentu, která zapisuje formulář (by, at a arch zapisuje aplikace)
export const DRILL_FIELDS = ["name", "cat", "sk", "lvl", "dur", "grp", "eq", "desc", "url", "pdf", "img", "meas"];

// ===== Pomocné funkce =====
const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
// Text pro hledání: malá písmena bez diakritiky
export const fold = s => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Seznam klíčů jen z povoleného číselníku, bez opakování, v pořadí číselníku
const keysOf = (v, dict) => { const set = new Set(Array.isArray(v) ? v : []); return Object.keys(dict).filter(k => set.has(k)); };
const urlOk = u => /^https?:\/\/\S+$/i.test(u);

// ===== Kontrola a úprava =====
// Chyba formuláře (text pro hlášku), nebo null
export function drillError(x) {
  const d = x || {};
  if (!str(d.name, 999)) return "Zadej název cvičení";
  if (str(d.name, 999).length > DRILL_MAX.name) return "Název je delší než " + DRILL_MAX.name + " znaků";
  if (!CATS[d.cat]) return "Vyber kategorii";
  if (!keysOf(d.sk, SKILLS).length) return "Vyber aspoň jednu dovednost";
  const dur = Number(d.dur);
  if (!Number.isInteger(dur) || dur < DUR_MIN || dur > DUR_MAX) return "Délka musí být " + DUR_MIN + " až " + DUR_MAX + " min";
  const u = str(d.url, 999);
  if (u && !urlOk(u)) return "Odkaz na video musí začínat http:// nebo https://";
  const pf = str(d.pdf, 999);
  if (pf && !urlOk(pf)) return "Odkaz na PDF musí začínat http:// nebo https://";
  if (Array.isArray(d.img) && d.img.length > IMG_MAX) return "Nejvýš " + IMG_MAX + " obrázky";
  if (d.meas && !UNITS[d.meas.u]) return "Vyber jednotku měření";
  return null;
}
// Normalizovaný dokument k uložení (jen pole formuláře; neplatné hodnoty nahradí výchozí). Kontrolu dělá drillError.
export function drillDoc(x) {
  const d = x || {}, lvl = Number(d.lvl), dur = Number(d.dur), u = str(d.url, DRILL_MAX.url), pf = str(d.pdf, DRILL_MAX.url);
  return {
    name: str(d.name, DRILL_MAX.name),
    cat: CATS[d.cat] ? d.cat : Object.keys(CATS)[0],
    sk: keysOf(d.sk, SKILLS),
    lvl: LEVELS[lvl] ? lvl : 1,
    dur: Number.isInteger(dur) && dur >= DUR_MIN && dur <= DUR_MAX ? dur : DUR_DEF,
    grp: keysOf(d.grp, GROUPS),
    eq: str(d.eq, DRILL_MAX.eq),
    desc: str(d.desc, DRILL_MAX.desc),
    url: urlOk(u) ? u : "",
    pdf: urlOk(pf) ? pf : "",
    img: [...new Set((Array.isArray(d.img) ? d.img : []).filter(i => typeof i === "string" && /^[\w-]{1,40}$/.test(i)))].slice(0, IMG_MAX),
    meas: d.meas && UNITS[d.meas.u] ? {u: d.meas.u, low: d.meas.low === true} : null
  };
}
// Prázdný formulář nového cvičení
export const drillBlank = () => ({name: "", cat: "skill", sk: [], lvl: 1, dur: DUR_DEF, grp: ["all"], eq: "", desc: "", url: "", pdf: "", img: [], meas: null});

// ===== Obrázky =====
// Rozměr zmenšeného obrázku: delší strana nejvýš max, poměr stran zachovaný, menší obrázek se nezvětšuje
export function imgFit(w, h, max = IMG_PX) {
  const W = Math.max(1, Math.round(+w || 1)), H = Math.max(1, Math.round(+h || 1)), k = Math.min(1, max / Math.max(W, H));
  return {w: Math.max(1, Math.round(W * k)), h: Math.max(1, Math.round(H * k))};
}
// Dokument obrázku drillimg/{id}; null, když data nejsou obrázek data:URL nebo jsou příliš velká
export function imgDoc(d, did, w, h, by, at) {
  if (typeof d !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(d) || d.length > IMG_LEN) return null;
  return {d, did: String(did || ""), w: Math.round(+w || 0), h: Math.round(+h || 0), by: String(by || ""), at: String(at || "")};
}
// Změna obrázků při uložení: del = id dokumentů drillimg ke smazání (byly u cvičení, po úpravě už nejsou)
export function imgChanges(before, after) {
  const a = new Set(after || []);
  return {del: (before || []).filter(id => !a.has(id))};
}

// ===== Seznam a filtr =====
// Filtr banky: q (hledání v názvu, pomůckách a popisu), cat, sk (dovednost), lvl, fav (jen ⭐), arch (true = jen vyřazená, jinak jen aktivní).
// favs = množina id oblíbených. Řazení: ⭐ nahoře, pak podle názvu (česky).
export function drillFilter(list, f = {}, favs = new Set()) {
  const q = fold(f.q).trim();
  return (list || []).filter(d => {
    if (!!d.arch !== !!f.arch) return false;
    if (f.cat && d.cat !== f.cat) return false;
    if (f.sk && !(d.sk || []).includes(f.sk)) return false;
    if (f.lvl && Number(d.lvl) !== Number(f.lvl)) return false;
    if (f.fav && !favs.has(d.id)) return false;
    if (q && !fold([d.name, d.eq, d.desc].join(" ")).includes(q)) return false;
    return true;
  }).sort((a, b) => (favs.has(b.id) ? 1 : 0) - (favs.has(a.id) ? 1 : 0) || String(a.name || "").localeCompare(String(b.name || ""), "cs"));
}
// Počty aktivních cvičení po kategoriích a dovednostech (štítky filtru)
export function drillCounts(list) {
  const cat = {}, sk = {};
  (list || []).filter(d => !d.arch).forEach(d => {
    cat[d.cat] = (cat[d.cat] || 0) + 1;
    (d.sk || []).forEach(k => { sk[k] = (sk[k] || 0) + 1; });
  });
  return {cat, sk};
}

// ===== Kopie a vyřazení =====
// Kopie cvičení jako nový formulář (bez autora, času, vyřazení a obrázků – obrázky patří původnímu cvičení); název s příponou „(kopie)“
export function drillCopy(d) {
  const c = drillDoc(d), suf = " (kopie)";
  c.img = [];
  c.name = c.name.slice(0, DRILL_MAX.name - suf.length) + suf;
  return c;
}
// Smí se cvičení smazat? Jen vyřazené (aktivní se nejdřív vyřadí); used = počet plánů, které ho používají (od E2)
export const drillCanDelete = (d, used = 0) => !!(d && d.arch) && !used;

// ===== Náhled videa a dokumentu =====
// Jak zobrazit odkaz cvičení přímo v aplikaci: {kind: "yt" | "drive" | "video" | "link", src} – YouTube a Google Disk (video i PDF)
// v rámečku přehrávače, soubor .mp4 / .webm / .mov přímo v přehrávači, ostatní jen odkazem (otevře se v novém okně)
export function mediaOf(url) {
  const u = String(url || "").trim();
  if (!/^https?:\/\//i.test(u)) return null;
  let m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/i.exec(u);
  if (m) return {kind: "yt", src: "https://www.youtube-nocookie.com/embed/" + m[1]};
  m = /drive\.google\.com\/(?:file\/d\/|open\?(?:.*&)?id=|uc\?(?:.*&)?id=)([\w-]{10,})/i.exec(u);
  if (m) return {kind: "drive", src: "https://drive.google.com/file/d/" + m[1] + "/preview"};
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u)) return {kind: "video", src: u};
  return {kind: "link", src: u};
}
