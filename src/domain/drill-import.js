// Doména: hromadné přidání cvičení do banky – 📥 Základní sada (config/drill-starter.js) a 📄 import z tabulky CSV (Excel, Google Tabulky).
// Výsledkem je seznam položek k výběru {d (dokument drillDoc), who (pl | gk), dup (název už v bance), err (chyba řádku), line}; zapisuje pohled.
// CSV: oddělovač ; , nebo tabulátor (pozná se z hlavičky), uvozovky jako v Excelu; hodnoty jako klíče číselníku (shot) i popisky (Střelba).
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Základní sada -> Čtení CSV -> Převod řádku -> Vzor CSV.

// ===== Importy =====
import {CATS, GROUPS, LEVELS, SKILLS, UNITS} from "../config/skills.js";
import {DRILL_STARTER} from "../config/drill-starter.js";
import {drillDoc, drillError, fold} from "./drills.js";

// ===== Konstanty =====
export const IMPORT_MAX = 200;                       // nejvíc řádků jednoho importu (jedna dávka zápisu)
// Sloupce CSV: klíč pole → názvy sloupce (bez diakritiky, malými písmeny, bez mezer a znaků)
export const CSV_COLS = {
  name: ["nazev", "jmeno", "cviceni", "name"],
  cat: ["kategorie", "cast", "casttreninku", "cat"],
  sk: ["dovednosti", "dovednost", "zamereni", "sk"],
  lvl: ["uroven", "obtiznost", "lvl"],
  dur: ["delka", "delkamin", "minuty", "min", "dur"],
  grp: ["skupiny", "vhodnepro", "pro", "grp"],
  eq: ["pomucky", "eq"],
  desc: ["popis", "desc"],
  url: ["video", "odkaz", "url"],
  pdf: ["pdf"],
  meas: ["mereni", "meas"]
};
// Hlavička vzoru CSV (pořadí sloupců)
export const CSV_HEAD = ["Název", "Kategorie", "Dovednosti", "Úroveň", "Délka (min)", "Skupiny", "Pomůcky", "Popis", "Video", "PDF", "Měření"];

// ===== Pomocné funkce =====
// Klíč pro porovnání názvů (bez diakritiky, malá písmena, jedna mezera)
export const nameKey = s => fold(s).replace(/\s+/g, " ").trim();
// Text sloupce bez diakritiky a jiných znaků než písmena a číslice
const colKey = s => fold(s).replace(/[^a-z0-9]/g, "");
// Popisek bez úvodní ikony („🥅 Střelba“ → „strelba“)
const labelKey = t => fold(String(t).replace(/^[^\p{L}\p{N}]+/u, "")).trim();
// Hodnota → klíč číselníku: klíč přímo, celý popisek, nebo začátek popisku (aspoň 3 znaky); null = nenalezeno
export function dictKey(v, dict) {
  const s = String(v == null ? "" : v).trim();
  if (!s) return null;
  if (Object.prototype.hasOwnProperty.call(dict, s)) return s;
  const f = labelKey(s);
  if (!f) return null;
  const E = Object.entries(dict);
  const hit = E.find(([, t]) => labelKey(t) === f) || (f.length >= 3 ? E.find(([, t]) => labelKey(t).startsWith(f)) : null);
  return hit ? hit[0] : null;
}
// Více hodnot v jedné buňce (oddělené čárkou, + nebo |; lomítko patří do popisku „Přesilovka / oslabení“); vrací {keys, bad}
function dictKeys(v, dict) {
  const parts = String(v == null ? "" : v).split(/[,+|]/).map(x => x.trim()).filter(Boolean), keys = [], bad = [];
  parts.forEach(p => { const k = dictKey(p, dict); if (k) { if (!keys.includes(k)) keys.push(k); } else bad.push(p); });
  return {keys, bad};
}
// Kdo cvičení použije: brankářky (jen skupina a dovednost brankářek), jinak hráčky
export const whoOf = d => ((d.grp || []).includes("gk") && (d.sk || []).includes("gk") ? "gk" : "pl");

// ===== Základní sada =====
// Položky základní sady k výběru; dup = cvičení se stejným názvem už v bance je (i vyřazené) – ve výchozím výběru se nezaškrtne
export function starterItems(existing, starter = DRILL_STARTER) {
  const have = new Set((existing || []).map(d => nameKey(d.name)));
  return starter.map((x, i) => { const d = drillDoc(x); return {d, who: whoOf(d), dup: have.has(nameKey(d.name)), err: drillError(d), line: i + 1}; });
}

// ===== Čtení CSV =====
// Text souboru → řádky buněk; oddělovač podle první řádky (nejčastější z ; , tab), uvozovky "" uvnitř buňky, konce řádků CRLF / LF, BOM pryč
export function csvRows(text) {
  const t0 = String(text == null ? "" : text), t = t0.charCodeAt(0) === 0xfeff ? t0.slice(1) : t0;    // bez BOM (Excel ho píše na začátek)
  const first = t.split(/\r?\n/, 1)[0] || "", cnt = c => first.split(c).length - 1;
  const sep = [";", "\t", ","].reduce((a, c) => (cnt(c) > cnt(a) ? c : a), ";");
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ""));
}
// Mapa pole → index sloupce z hlavičky (neznámé sloupce se přeskočí)
export function csvHeader(head) {
  const m = {};
  (head || []).forEach((h, i) => {
    const k = colKey(h);
    const f = Object.keys(CSV_COLS).find(key => CSV_COLS[key].includes(k) || CSV_COLS[key].some(n => n.length > 3 && k.startsWith(n)));
    if (f && m[f] == null) m[f] = i;
  });
  return m;
}

// ===== Převod řádku =====
// Měření z textu: čas / s → nižší je lepší, počet / ks a body → vyšší je lepší; prázdné = neměří se
function measOf(v) {
  const s = labelKey(v);
  if (!s || s === "ne" || s === "nemeri se") return {m: null, bad: false};
  const u = dictKey(v, UNITS) || (/^(cas|s|sec|sekundy)/.test(s) ? "s" : /^(pocet|ks|kusy)/.test(s) ? "ks" : /^(body|b)$/.test(s) ? "b" : null);
  return u ? {m: {u, low: u === "s"}, bad: false} : {m: null, bad: true};
}
// Úroveň z čísla 1–3 nebo popisku (Základní / Střední / Náročné)
const lvlOf = v => { const n = parseInt(v, 10); return LEVELS[n] ? n : Number(dictKey(v, LEVELS)) || null; };
// Jeden řádek CSV → {d, err}; chybí-li kategorie, použije se Dovednosti; neznámé hodnoty jsou chyba řádku (uživatel ji opraví v tabulce)
export function rowDrill(row, cols) {
  const v = k => (cols[k] == null ? "" : String(row[cols[k]] == null ? "" : row[cols[k]]).trim());
  const sk = dictKeys(v("sk"), SKILLS), grp = dictKeys(v("grp"), GROUPS), me = measOf(v("meas"));
  const cat = v("cat") ? dictKey(v("cat"), CATS) : "skill", lvl = v("lvl") ? lvlOf(v("lvl")) : 1;
  const x = {name: v("name"), cat, sk: sk.keys, lvl: lvl || 1, dur: v("dur") ? parseInt(v("dur"), 10) : 10, grp: grp.keys.length ? grp.keys : ["all"],
    eq: v("eq"), desc: v("desc"), url: v("url"), pdf: v("pdf"), meas: me.m};
  // Nejdřív neznámé hodnoty (přesnější hláška), pak běžná kontrola formuláře
  let err = !x.name ? null : !cat ? "Neznámá kategorie „" + v("cat") + "“" : sk.bad.length ? "Neznámá dovednost „" + sk.bad[0] + "“"
    : grp.bad.length ? "Neznámá skupina „" + grp.bad[0] + "“" : v("lvl") && !lvl ? "Neznámá úroveň „" + v("lvl") + "“" : me.bad ? "Neznámé měření „" + v("meas") + "“" : null;
  if (!err) err = drillError(x);
  return {d: drillDoc(x), err};
}
// Celý soubor → {items, err}: err = chyba souboru (bez hlavičky, bez sloupce Název, příliš řádků); dup = v bance nebo dřív v souboru
export function csvDrills(text, existing) {
  const rows = csvRows(text);
  if (rows.length < 2) return {items: [], err: "Soubor nemá hlavičku a aspoň jeden řádek cvičení."};
  const cols = csvHeader(rows[0]);
  if (cols.name == null) return {items: [], err: "V hlavičce chybí sloupec „Název“."};
  if (rows.length - 1 > IMPORT_MAX) return {items: [], err: "Najednou jde načíst nejvýš " + IMPORT_MAX + " cvičení (soubor má " + (rows.length - 1) + ")."};
  const have = new Set((existing || []).map(d => nameKey(d.name)));
  const items = rows.slice(1).map((r, i) => {
    const {d, err} = rowDrill(r, cols), k = nameKey(d.name), dup = have.has(k);
    if (k) have.add(k);
    return {d, who: whoOf(d), dup, err, line: i + 2};
  });
  return {items, err: null};
}
// Položky, které se zapíšou: vybrané (on), bez chyby
export const importPick = items => (items || []).filter(x => x.on && !x.err);

// ===== Vzor CSV =====
// Řádky vzoru pro core/utils.js csv(): hlavička a dvě ukázková cvičení (popisky, jak je uživatel napíše v tabulce)
export function csvSample() {
  const lab = (dict, k) => String(dict[k]).replace(/^[^\p{L}\p{N}]+/u, "");
  return [CSV_HEAD,
    ["Střelba z mezikruží", lab(CATS, "skill"), [lab(SKILLS, "shot"), lab(SKILLS, "puck")].join(", "), lab(LEVELS, 2), 8, lab(GROUPS, "st"), "puky, kužely", "Hráčky střílí z mezikruží po přihrávce od trenéra.", "", "", "počet (ks)"],
    ["Brankářky: posuny v brankovišti", lab(CATS, "skill"), lab(SKILLS, "gk"), lab(LEVELS, 1), 6, lab(GROUPS, "gk"), "", "Šoupání a T-push mezi tyčemi.", "", "", ""]];
}
