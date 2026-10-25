// Doména: banka cvičení (kolekce drills) – kontrola a úprava formuláře, filtr seznamu, kopie, vyřazení a smazání. Čisté funkce bez DOM.
// Dokument drills/{id}: name, cat, sk [dovednosti], lvl 1–3, dur (min), grp [all|st|gk], eq, desc, url, meas {u, low} | null, by, at, arch.
// Cvičení se z banky nemaže, ale vyřazuje (arch: true) – plány tréninku na něj mohou odkazovat; smazat jde jen vyřazené.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Kontrola a úprava -> Seznam a filtr -> Kopie a vyřazení.

// ===== Importy =====
import {CATS, GROUPS, LEVELS, SKILLS, UNITS} from "../config/skills.js";

// ===== Konstanty =====
export const DRILL_COLL = "drills";
export const DRILL_MAX = {name: 80, eq: 200, desc: 2000, url: 300};   // nejdelší texty
export const DUR_MIN = 1, DUR_MAX = 60, DUR_DEF = 10;                 // délka cvičení v minutách
// Pole dokumentu, která zapisuje formulář (by, at a arch zapisuje aplikace)
export const DRILL_FIELDS = ["name", "cat", "sk", "lvl", "dur", "grp", "eq", "desc", "url", "meas"];

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
  if (d.meas && !UNITS[d.meas.u]) return "Vyber jednotku měření";
  return null;
}
// Normalizovaný dokument k uložení (jen pole formuláře; neplatné hodnoty nahradí výchozí). Kontrolu dělá drillError.
export function drillDoc(x) {
  const d = x || {}, lvl = Number(d.lvl), dur = Number(d.dur), u = str(d.url, DRILL_MAX.url);
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
    meas: d.meas && UNITS[d.meas.u] ? {u: d.meas.u, low: d.meas.low === true} : null
  };
}
// Prázdný formulář nového cvičení
export const drillBlank = () => ({name: "", cat: "skill", sk: [], lvl: 1, dur: DUR_DEF, grp: ["all"], eq: "", desc: "", url: "", meas: null});

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
// Kopie cvičení jako nový formulář (bez autora, času a vyřazení); název s příponou „(kopie)“ v mezích délky
export function drillCopy(d) {
  const c = drillDoc(d), suf = " (kopie)";
  c.name = c.name.slice(0, DRILL_MAX.name - suf.length) + suf;
  return c;
}
// Smí se cvičení smazat? Jen vyřazené (aktivní se nejdřív vyřadí); used = počet plánů, které ho používají (od E2)
export const drillCanDelete = (d, used = 0) => !!(d && d.arch) && !used;
