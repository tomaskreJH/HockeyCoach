// Doména: opakované události (série tréninků) – výpočet termínů podle pravidla, termín přihlašování relativně k datu,
// plán úprav a mazání „tato a další“ a zápisy pro založení série. Čisté funkce bez DOM a bez databáze (používá je views/event-series.js,
// později i Rozpočet). Data: událost série má ser = {id, i, x?} (x = ručně upravená), definice série je v kolekci series/{id}.
// Datum = text "YYYY-MM-DD", termín přihlašování = "YYYY-MM-DDTHH:MM" (stejně jako pole dl u událostí). Dny v týdnu jako Date.getDay() (0 = neděle).
// Struktura: Konstanty -> Pomocné funkce -> Termíny -> Úpravy a mazání série -> Zápisy

// ===== Konstanty =====
export const SERIES_COLL = "series";      // kolekce definic sérií
export const BATCH_MAX = 400;             // nejvíc zápisů v jedné dávce (limit Firestore je 500)
export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];   // pořadí dnů ve formuláři: Po … Ne
const DAY_MS = 86400000;

// ===== Pomocné funkce =====
const p2 = n => String(n).padStart(2, "0");
// Datum ↔ milisekundy v UTC (bez posunů letního času)
const msOf = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const isoOf = ms => { const d = new Date(ms); return d.getUTCFullYear() + "-" + p2(d.getUTCMonth() + 1) + "-" + p2(d.getUTCDate()); };
const okDate = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(msOf(s));
// Pondělí týdne, do kterého datum patří (ms)
const monday = ms => ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY_MS;
// Rozdělení pole na části po n prvcích (dávky zápisů)
export const chunks = (arr, n = BATCH_MAX) => { const r = []; for (let i = 0; i < arr.length; i += n) r.push(arr.slice(i, i + n)); return r; };
// Posun data o n dní
export const addDays = (s, n) => isoOf(msOf(s) + n * DAY_MS);

// ===== Termíny =====
// Konec sezóny (30. 6.) pro datum: od července do prosince příští rok, jinak tento rok
export function seasonEnd(date) {
  if (!okDate(date)) return "";
  const y = +date.slice(0, 4), m = +date.slice(5, 7);
  return (m >= 7 ? y + 1 : y) + "-06-30";
}
// Termíny série: pravidlo {days: [0–6], every: 1 | 2}, od–do včetně (do nejdéle konec sezóny od data „od“), vynechat = seznam dat.
// „Každý 2. týden“ počítá týdny (po–ne) od týdne data „od“. Vrací seřazená data.
export function datesOf(rule, from, to, skip) {
  const days = new Set(((rule && rule.days) || []).map(Number).filter(d => d >= 0 && d <= 6));
  const every = rule && +rule.every === 2 ? 2 : 1;
  if (!days.size || !okDate(from) || !okDate(to)) return [];
  const end = Math.min(msOf(to), msOf(seasonEnd(from))), w0 = monday(msOf(from)), sk = new Set(skip || []), out = [];
  for (let t = msOf(from); t <= end; t += DAY_MS) {
    const wk = Math.round((monday(t) - w0) / (7 * DAY_MS));
    if (wk % every !== 0 || !days.has(new Date(t).getUTCDay())) continue;
    const s = isoOf(t);
    if (!sk.has(s)) out.push(s);
  }
  return out;
}
// Termín přihlašování relativně k datu události: rel = {d: dnů předem, t: "HH:MM"} → "YYYY-MM-DDTHH:MM"
export function relDl(date, rel) {
  if (!okDate(date) || !rel || !/^\d{2}:\d{2}$/.test(rel.t || "")) return "";
  return addDays(date, -Math.max(0, Math.round(+rel.d || 0))) + "T" + rel.t;
}
// Opačný převod: z data události a termínu přihlašování → {d, t} (null, když termín chybí nebo je po dni události)
export function relOf(date, dl) {
  if (!okDate(date) || typeof dl !== "string" || !okDate(dl.slice(0, 10)) || !/^\d{2}:\d{2}/.test(dl.slice(11, 16))) return null;
  const d = Math.round((msOf(date) - msOf(dl.slice(0, 10))) / DAY_MS);
  return d < 0 ? null : {d, t: dl.slice(11, 16)};
}

// ===== Úpravy a mazání série =====
// Události téže série od dané události dál (podle pořadí i); evs = dokumenty událostí {id, date, ser, …}
export function seriesTail(evs, cur) {
  const s = cur && cur.ser;
  if (!s || !s.id) return [];
  return (evs || []).filter(e => e.ser && e.ser.id === s.id && +e.ser.i >= +s.i).sort((a, b) => a.ser.i - b.ser.i);
}
// Plán úpravy „tato a další“: ch = {time, place, dl} nové hodnoty pro aktuální událost. Termín přihlašování se přenese
// relativně (stejný počet dní předem a stejný čas). Ručně upravené události (ser.x) kromě aktuální se vynechají.
// Vrací {apply: [{id, d}], skip: [události]}.
export function editPlan(evs, cur, ch) {
  const rel = relOf(cur.date, ch.dl), apply = [], skip = [];
  seriesTail(evs, cur).forEach(e => {
    if (e.id !== cur.id && e.ser.x) { skip.push(e); return; }
    const d = {time: ch.time || "", place: ch.place || ""};
    if (rel) d.dl = relDl(e.date, rel);
    apply.push({id: e.id, d});
  });
  return {apply, skip};
}
// Plán smazání „tato a další budoucí“: jen události od dnešního dne; smazat lze jen bez odpovědí v docházce (answered = Set id událostí)
// a bez vyúčtování (příznak ss). Vrací {del: [id], keep: [{id, date, why: "att" | "ss"}]}.
export function deletePlan(evs, cur, answered, today) {
  const del = [], keep = [];
  seriesTail(evs, cur).filter(e => (e.date || "") >= today).forEach(e => {
    if (e.ss) keep.push({id: e.id, date: e.date, why: "ss"});
    else if (answered && answered.has(e.id)) keep.push({id: e.id, date: e.date, why: "att"});
    else del.push(e.id);
  });
  return {del, keep};
}
// Byla událost série ručně změněna oproti stavu před úpravou? (čas, místo, termín přihlašování nebo datum)
export const manualChange = (before, after) => ["date", "time", "place", "dl"].some(k => (before[k] || "") !== (after[k] || ""));

// ===== Zápisy =====
// Zápisy pro založení série: o = {sid, ids (id událostí ve stejném pořadí jako dates), dates, rule, d: {title, time, place, note},
// rel: {d, t}, tpl (šablona pokladny; jen když ji smí zapsat správce pokladny a není výchozí "train"), by, at}.
// Vrací {series: data dokumentu series/{sid}, ops: [["set", kolekce, id, data]]} – události a případně evcash/{id} = {tpl}.
export function seriesOps(o) {
  const d = o.d || {}, ops = [];
  o.dates.forEach((date, i) => {
    const id = o.ids[i];
    ops.push(["set", "events", id, {type: "training", title: d.title || "Trénink", date, time: d.time || "", place: d.place || "", dl: relDl(date, o.rel), note: d.note || "", lines: {}, ser: {id: o.sid, i: i + 1}}]);
    if (o.tpl && o.tpl !== "train") ops.push(["set", "evcash", id, {tpl: o.tpl}]);
  });
  const series = {rule: {days: [...o.rule.days], every: +o.rule.every === 2 ? 2 : 1, from: o.rule.from, to: o.rule.to, skip: [...(o.rule.skip || [])]},
    d: {title: d.title || "Trénink", time: d.time || "", place: d.place || "", note: d.note || "", dl: {d: +o.rel.d || 0, t: o.rel.t}, tpl: o.tpl || "train"},
    n: o.dates.length, by: o.by || "", at: o.at || ""};
  return {series, ops};
}
