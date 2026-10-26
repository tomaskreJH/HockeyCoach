// Doména: 🏦 párování výpisu z banky s předpisy (bez DOM). Výpis = CSV z internetového bankovnictví (Fio, ČSOB, KB, Air Bank,
// Raiffeisen, Moneta, Česká spořitelna…) – sloupce se poznají podle názvu v záhlaví. Páruje se jen příjem (částka > 0):
// VS předpisu → ten předpis, osobní VS (souhrnná platba) → nejstarší předpisy osoby, jinak VS / číslo ve zprávě. Zapsaný pohyb
// výpisu nese značku bt (stejný výpis podruhé nenabídne). Nepoznaný formát = ruční přiřazení sloupců uložené pro účet týmu.
// ===== Importy =====
import {r2, restOf} from "./cash.js";

// ===== Konstanty =====
export const BT_MAX = 80;                                // nejdelší značka pohybu výpisu (bt) v pokladně
// Rozpoznání sloupců: názvy bez diakritiky malými písmeny; první shoda v pořadí vzorů vyhrává
const COLS = {
  amt: [/^castka v mene uctu$/, /^zauctovana castka$/, /^objem$/, /^castka$/, /^castka \(?czk\)?$/, /^amount$/, /^castka/],
  vs: [/^vs$/, /^variabilni symbol$/, /variabilni/, /^v\.?s\.?$/],
  date: [/^datum zauctovani$/, /^datum provedeni$/, /^datum$/, /^datum splatnosti$/, /^datum/, /^date$/],
  name: [/^nazev protiuctu$/, /^nazev uctu protistrany$/, /^partner name$/, /^nazev protistrany$/, /^jmeno protistrany$/, /protiuct.*(nazev|jmeno)|(nazev|jmeno).*protiuct/, /^platce$/, /^odesilatel$/],
  acc: [/^protiucet$/, /^cislo protiuctu$/, /^protiucet a kod banky$/, /^partner iban$/, /^iban protistrany$/],
  ref: [/^id pohybu$/, /^id transakce$/, /^referencni cislo$/, /^identifikace transakce$/, /^reference$/, /^id$/],
  cur: [/^mena$/, /^mena uctu$/, /^currency$/]
};
// Textové sloupce, ve kterých se hledá VS / číslo předpisu, když chybí ve sloupci VS
const MSG = /zprava|popis|poznamka|komentar|upresneni|informace|message|note|memo|description|remark|detail/;

// ===== Pomocné funkce =====
const plain = s => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
// Název sloupce pro přiřazení (stejný tvar jako v uloženém přiřazení)
export const colKey = s => plain(s);
// VS bez úvodních nul (banky ho vypisují i s nulami); jen číslice
export const vsNorm = v => String(v == null ? "" : v).replace(/\D/g, "").replace(/^0+/, "");
// Částka z textu: „1 234,50“, „-1234.50“, „1.234,50 CZK“, „+500“ → číslo, nesmysl = null
export function parseAmount(v) {
  let s = String(v == null ? "" : v).replace(/[\s ]/g, "").replace(/[^\d,.\-+]/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return isFinite(n) ? r2(n) : null;
}
// Datum z textu: „24.10.2026“, „24. 10. 2026“, „2026-10-24“, „24/10/2026“ (i s časem) → „RRRR-MM-DD“, jinak ""
export function parseDate(v) {
  const s = String(v == null ? "" : v).trim(), p2 = n => String(n).padStart(2, "0");
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + "-" + p2(m[2]) + "-" + p2(m[3]);
  m = s.match(/^(\d{1,2})\s*[./]\s*(\d{1,2})\s*[./]\s*(\d{4})/);
  return m ? m[3] + "-" + p2(m[2]) + "-" + p2(m[1]) : "";
}
// Oddělovač sloupců: nejčastější z ; , tabulátor v prvních řádcích (mimo uvozovky)
function delimOf(text) {
  const lines = text.split(/\r?\n/).slice(0, 30), cnt = {";": 0, ",": 0, "\t": 0};
  lines.forEach(l => { let q = false; for (const c of l) { if (c === '"') q = !q; else if (!q && c in cnt) cnt[c]++; } });
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
}
// Rozdělení CSV na řádky a buňky (uvozovky, zdvojené uvozovky, nové řádky v uvozovkách)
export function parseCsv(text, delim) {
  const t = String(text || ""), d = delim || delimOf(t), rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === d) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim() !== ""));
}
// Index sloupce podle vzorů (první vzor, který najde shodu)
function colOf(head, pats) {
  for (const re of pats) { const i = head.findIndex(h => re.test(h)); if (i >= 0) return i; }
  return -1;
}
// Krátká značka pohybu výpisu: id z banky, jinak datum|částka|VS|protiúčet|zpráva
const refOf = (id, date, amt, vs, acc, msg) => String(id || [date, amt, vs, acc, msg].join("|")).slice(0, BT_MAX);

// ===== Hlavní logika: čtení výpisu =====
// Pole přiřazení sloupců (uložené v settings/cash bank[účet]): názvy sloupců bez diakritiky; msg "*" = všechny textové sloupce
export const MAP_KEYS = ["amt", "vs", "date", "name", "msg", "ref"];
// Text CSV → {txs: [{ref, date, amt, vs, name, acc, msg, cur}], head (názvy sloupců), hi (řádek záhlaví), cand (prvních 15 řádků
// pro volbu záhlaví), sample (3 řádky pod záhlavím), map (použité přiřazení), manual (podle uloženého / ručního přiřazení), err}.
// opt.map = ruční přiřazení sloupců (najde se řádek, který obsahuje sloupec částky), opt.hi = ručně zvolený řádek záhlaví.
// Bez přiřazení: záhlaví = první řádek z prvních 40, kde se pozná sloupec částky a VS / data (nad ním bývají údaje o účtu).
export function readStatement(text, opt) {
  const t = String(text || ""), rows = parseCsv(t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t), o = opt || {}, M = o.map && o.map.amt ? o.map : null;
  const top = rows.slice(0, 40).map(r => r.map(plain));
  let hi = Number.isInteger(o.hi) && o.hi >= 0 && o.hi < rows.length ? o.hi : -1;
  if (hi < 0 && M) hi = top.findIndex(h => h.includes(M.amt));
  if (hi < 0) hi = top.findIndex(h => colOf(h, COLS.amt) >= 0 && (colOf(h, COLS.vs) >= 0 || colOf(h, COLS.date) >= 0));
  const found = hi >= 0;
  // Nepoznané záhlaví: nabídne se řádek s nejvíce vyplněnými buňkami (uživatel ho může změnit)
  if (!found) top.forEach((h, i) => { if (hi < 0 || h.filter(Boolean).length > top[hi].filter(Boolean).length) hi = i; });
  const cand = rows.slice(0, 15).map((r, i) => ({i, label: r.filter(x => String(x).trim()).slice(0, 4).join(" · ").slice(0, 60)}));
  if (hi < 0) return {txs: [], head: [], hi: -1, cand, sample: [], map: null, manual: false, cols: {}, err: "Soubor je prázdný."};
  const head = rows[hi].map(plain), manual = !!M && head.includes(M.amt);
  const cols = {}, idx = name => (name ? head.indexOf(name) : -1);
  Object.keys(COLS).forEach(k => { cols[k] = manual ? (MAP_KEYS.includes(k) && k !== "msg" ? idx(M[k]) : colOf(head, COLS[k])) : colOf(head, COLS[k]); });
  const msgAuto = head.map((h, i) => (MSG.test(h) ? i : -1)).filter(i => i >= 0);
  const msgCols = manual && M.msg && M.msg !== "*" ? [idx(M.msg)].filter(i => i >= 0) : manual && !M.msg ? [] : msgAuto;
  const map = {amt: head[cols.amt] || "", vs: head[cols.vs] || "", date: head[cols.date] || "", name: head[cols.name] || "", msg: manual && M.msg !== "*" ? (M.msg || "") : "*", ref: head[cols.ref] || ""};
  const base = {head: rows[hi].map(String), hi, cand, sample: rows.slice(hi + 1, hi + 4).map(r => r.map(String)), map, manual, cols};
  if (cols.amt < 0) return {...base, txs: [], err: found || manual ? "Vyber sloupec s částkou." : "Ve výpisu jsem nepoznal záhlaví – vyber řádek záhlaví a sloupce (⚙ Sloupce výpisu)."};
  const txs = [];
  rows.slice(hi + 1).forEach(r => {
    const g = i => (i >= 0 && i < r.length ? String(r[i]).trim() : "");
    const amt = parseAmount(g(cols.amt));
    if (amt == null) return;
    const date = parseDate(g(cols.date)), vs = vsNorm(g(cols.vs)), acc = g(cols.acc), msg = msgCols.map(g).filter(Boolean).join(" · ");
    txs.push({ref: refOf(g(cols.ref), date, amt, vs, acc, msg), date, amt, vs, name: g(cols.name), acc, msg, cur: g(cols.cur)});
  });
  return {...base, txs, err: cols.vs < 0 ? "Výpis nemá sloupec VS – páruji jen podle čísel ve zprávě." : ""};
}
// Uložitelné přiřazení sloupců (jen známá pole, krátké texty) z ručního výběru; bez sloupce částky null
export function mapDoc(m) {
  if (!m || !m.amt) return null;
  const o = {};
  MAP_KEYS.forEach(k => { o[k] = String(m[k] == null ? "" : m[k]).slice(0, 60); });
  return o;
}

// ===== Hlavní logika: párování =====
// txs = pohyby výpisu, ch = předpisy (jen nezaplacené na účtu výpisu), pvs(mid) = osobní VS, done = značky už zapsaných pohybů.
// Vrací {pairs: [{tx, how: "vs" | "osoba" | "zpráva", items: [{cid, mid, amt}], sum, over (přeplatek), exact}], loose: [tx] (příjem bez
// shody), out: počet výdajů, seen: [tx] (už zapsané)}. Zbytek předpisu se odečítá postupně – dva pohyby nezaplatí víc než zbytek.
export function matchStatement(txs, ch, pvs, done) {
  const D = done instanceof Set ? done : new Set(done || []), left = new Map(), byVs = new Map(), byPerson = new Map();
  (ch || []).filter(x => restOf(x) > 0).forEach(x => {
    left.set(x.id, restOf(x));
    const v = vsNorm(x.vs);
    if (v && !byVs.has(v)) byVs.set(v, x);
    const p = vsNorm(pvs ? pvs(x.mid) : "");
    if (p) { if (!byPerson.has(p)) byPerson.set(p, []); byPerson.get(p).push(x); }
  });
  // Nejstarší předpisy osoby první (splatnost, pak id)
  byPerson.forEach(L => L.sort((a, b) => String(a.due || "9").localeCompare(String(b.due || "9")) || String(a.id).localeCompare(String(b.id))));
  const out = {pairs: [], loose: [], out: 0, seen: []};
  // Rozdělení částky do předpisů (každý nejvýš do svého zbytku)
  const spread = (list, amt) => {
    let rest = r2(amt);
    const items = [];
    list.forEach(x => {
      const l = left.get(x.id) || 0;
      if (rest <= 0 || l <= 0) return;
      const a = r2(Math.min(l, rest));
      items.push({cid: x.id, mid: x.mid, amt: a});
      left.set(x.id, r2(l - a)); rest = r2(rest - a);
    });
    return items;
  };
  const find = v => (byVs.has(v) ? {how: "vs", list: [byVs.get(v)]} : byPerson.has(v) ? {how: "osoba", list: byPerson.get(v)} : null);
  (txs || []).forEach(tx => {
    if (!(tx.amt > 0)) { out.out++; return; }
    if (D.has(tx.ref)) { out.seen.push(tx); return; }
    let hit = tx.vs ? find(tx.vs) : null;
    if (!hit) {
      // VS chybí nebo nesedí: hledá se číslo předpisu nebo osobní VS ve zprávě (nejméně 5 číslic)
      const nums = (String(tx.msg || "") + " " + String(tx.name || "")).match(/\d{5,}/g) || [];
      for (const n of nums) { const f = find(vsNorm(n)); if (f) { hit = {...f, how: "zpráva"}; break; } }
    }
    const items = hit ? spread(hit.list, tx.amt) : [];
    if (!items.length) { out.loose.push(tx); return; }
    const sum = r2(items.reduce((s, x) => s + x.amt, 0)), over = r2(tx.amt - sum);
    // Přesná shoda = celá částka rozdělena, každý předpis doplacen celý a párování podle VS (ne jen čísla ve zprávě)
    const full = items.every(x => (left.get(x.cid) || 0) === 0);
    out.pairs.push({tx, how: hit.how, items, sum, over, exact: over === 0 && full && hit.how !== "zpráva"});
  });
  return out;
}
