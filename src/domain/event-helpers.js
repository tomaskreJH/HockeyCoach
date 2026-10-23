// Doména: události – řazení seznamu (Nadcházející / Minulé / Kalendář) a rozdělení do pětek na tréninku (čisté funkce bez DOM).
// Pravidla: Nadcházející vzestupně (nejbližší nahoře), Minulé a Kalendář sestupně (nejnovější nahoře);
// pětky jsou v poli events.lines = {klíč: číslo pětky 1–4}; klíč hráčky = její id, klíč člena realizačního týmu = "t:" + id
// (předpona brání záměně s hráčkou). Do pětky se přiřazují jen přihlášení („Jdu“) – hráčky bez brankářek a členové realizačního týmu.

// ===== Konstanty =====
export const TR_PRE = "t:";                     // předpona klíče člena realizačního týmu v events.lines
export const LINE_NOS = [1, 2, 3, 4];           // čísla pětek

// ===== Pomocné funkce =====
// Porovnání událostí podle data a času (bez času na konec dne)
export const evAsc = (x, y) => x.date.localeCompare(y.date) || (x.time || "99").localeCompare(y.time || "99");
// Klíč člena realizačního týmu v events.lines a zpětné rozpoznání
export const trKey = id => TR_PRE + id;
export const isTrKey = k => String(k || "").startsWith(TR_PRE);

// ===== Řazení seznamu =====
// Seřazená kopie událostí podle režimu: "up" vzestupně, "past" a "cal" sestupně (nejnovější nahoře)
export function sortEvents(evs, mode) {
  const out = [...(evs || [])];
  return mode === "up" ? out.sort(evAsc) : out.sort((x, y) => evAsc(y, x));
}

// ===== Rozdělení do pětek =====
// Rozdělení hráček podle základní formace (lu = {"1C": id, "1C+": id, …}); going = id přihlášených hráček (bez brankářek).
// Partnerky z rotace ("1C+") patří do téže pětky. Přiřazení členů realizačního týmu z prev se zachová.
export function baseLines(lu, going, prev) {
  const r = {}, g = new Set(going || []);
  Object.entries(lu || {}).forEach(([k, id]) => { const n = +k[0]; if (n >= 1 && n <= 4 && g.has(id)) r[id] = n; });
  Object.entries(prev || {}).forEach(([k, n]) => { if (isTrKey(k)) r[k] = n; });
  return r;
}
// Nové rozdělení po změně jednoho klíče (hráčka id / člen týmu "t:id"); n = 0 klíč odebere. Vrací novou kopii.
export function setLine(lines, key, n) {
  const l = {...(lines || {})};
  if (+n >= 1 && +n <= 4) l[key] = +n; else delete l[key];
  return l;
}
// Počty v pětkách: pl = id přihlášených hráček, tr = id přihlášených členů týmu.
// Vrací {pl: {1..4}, tr: {1..4}, free} – free = přihlášené hráčky bez pětky (členové týmu bez pětky se nepočítají).
export function lineCounts(lines, pl, tr) {
  const L = lines || {}, c = {pl: {}, tr: {}, free: 0};
  LINE_NOS.forEach(n => { c.pl[n] = 0; c.tr[n] = 0; });
  (pl || []).forEach(id => { const n = L[id]; if (c.pl[n] != null) c.pl[n]++; else c.free++; });
  (tr || []).forEach(id => { const n = L[trKey(id)]; if (c.tr[n] != null) c.tr[n]++; });
  return c;
}

// ===== Počty odpovědí =====
// Počty odpovědí členů ids na událost: A = {memberId: {st}} → {yes, no, maybe, none} (neznámý stav = bez odpovědi)
export function answerCounts(A, ids) {
  const r = {yes: 0, no: 0, maybe: 0, none: 0};
  (ids || []).forEach(id => { const a = (A || {})[id]; if (a && r[a.st] != null) r[a.st]++; else r.none++; });
  return r;
}
