// 🕘 Historie přihlášek: záznamy změn odpovědí na události v kolekci attlog (jen přidávání, nikdy úprava).
// Záznam {eid, pid, st, by, bp, src, at}: st = nová odpověď (yes / no / maybe), del = odpověď zrušena, nos / nos0 = 🚫 označeno / zrušeno;
// by = e-mail zapisujícího účtu, bp = jeho osoba (pid / tid), src = původ (abs = 🏖 nepřítomnost, req = ✋ schválená žádost, auto = automatická omluva).
// Čisté funkce bez DOM: stavba záznamu, převod času, časová osa události (s posledními změnami starších odpovědí bez historie), souhrny.

// ===== Konstanty =====
export const LOG_COLL = "attlog";
export const LOG_ST = ["yes", "no", "maybe", "del", "nos", "nos0"];   // povolené hodnoty st (stejné jako ve firestore.rules)
export const LOG_SRC = ["abs", "req", "auto"];                       // povolené hodnoty src (prázdný = ruční zápis)
// Text změny podle stavu (ikona, sloveso)
export const LOG_TXT = {
  yes: {ic: "✅", t: "Jdu"}, no: {ic: "❌", t: "Nejdu"}, maybe: {ic: "❓", t: "Nejsem jistý"},
  del: {ic: "↩", t: "Odpověď zrušena"}, nos: {ic: "🚫", t: "Označeno: nedorazila"}, nos0: {ic: "🚫", t: "Zrušeno: nedorazila"}
};
export const SRC_TXT = {abs: "🏖 z nepřítomnosti", req: "✋ schválená žádost", auto: "🏖 automatická omluva"};
const SAME_MS = 5 * 60 * 1000;                                       // záznam a dokument docházky se shodují, když se liší nejvýš o 5 min

// ===== Pomocné funkce =====
const str = v => (typeof v === "string" ? v : "");
const num = v => (typeof v === "number" && isFinite(v) ? v : null);
// Čas v ms: číslo, Timestamp Firestore (toMillis), jeho JSON {seconds, nanoseconds}, nebo text ISO; jinak null
export function logMs(v) {
  if (num(v) != null) return v;
  if (v && typeof v.toMillis === "function") return v.toMillis();
  if (v && num(v.seconds) != null) return v.seconds * 1000 + Math.round((num(v.nanoseconds) || 0) / 1e6);
  if (typeof v === "string" && v) { const t = Date.parse(v); return isNaN(t) ? null : t; }
  return null;
}
// Termín přihlašování v ms (text „RRRR-MM-DDTHH:MM“), nebo null
const dlOf = dl => (dl ? logMs(String(dl)) : null);

// ===== Stavba záznamu =====
// Osoba zapisujícího účtu: když zapisuje za sebe, je to cílová osoba; jinak jeho člen realizačního týmu, nebo hráčka
export const writerOf = (pid, me) => (me && me.pid && me.pid === pid) || (me && me.tid && me.tid === pid) ? pid : (me && (me.tid || me.pid)) || "";
// Záznam pro zápis (merge s at = "__now" = čas serveru); null, když chybí událost, osoba nebo neznámý stav
export function logEntry(eid, pid, st, by, bp, src) {
  if (!str(eid) || !str(pid) || !LOG_ST.includes(st)) return null;
  const d = {eid, pid, st, by: str(by), bp: str(bp), at: "__now"};
  if (src && LOG_SRC.includes(src)) d.src = src;
  return d;
}
// Operace pro HK.syncOps z položek [{eid, pid, st, src}]; newId = funkce, která vrátí nové id dokumentu
export function logOps(items, by, me, newId) {
  return (items || []).map(x => logEntry(x.eid, x.pid, x.st, by, writerOf(x.pid, me), x.src)).filter(Boolean).map(d => ["merge", LOG_COLL, newId(), d]);
}

// ===== Časová osa události =====
// Řádky historie jedné události, nejnovější nahoře: {pid, st, ms, by, bp, src, self, late, after, old}
//  - self = zapsal(a) sama za sebe (bp = pid); late = po termínu přihlašování; after = po začátku události;
//  - old = jen poslední změna z dokumentu docházky (odpověď z doby před historií – bez záznamu v attlog).
// logs = záznamy attlog (libovolné události, filtruje se eid), att = odpovědi události [{pid, st, at, by}], ev = {id, dl, start (ms)}
export function logRows(logs, att, ev) {
  const dl = dlOf(ev && ev.dl), start = num(ev && ev.start);
  const mark = r => ({...r, late: dl != null && r.ms != null && r.ms > dl, after: start != null && r.ms != null && r.ms > start});
  const rows = (logs || []).filter(x => x && x.eid === ev.id && str(x.pid) && LOG_ST.includes(x.st)).map(x => mark({
    pid: x.pid, st: x.st, ms: logMs(x.at), by: str(x.by), bp: str(x.bp), src: LOG_SRC.includes(x.src) ? x.src : "", self: !!x.bp && x.bp === x.pid, old: false
  }));
  // Odpovědi bez jediného záznamu: poslední změna z dokumentu docházky (kdo neví – jen e-mail účtu)
  const has = new Set(rows.map(r => r.pid));
  (att || []).filter(a => a && str(a.pid) && !has.has(a.pid) && LOG_ST.includes(a.st)).forEach(a => rows.push(mark({
    pid: a.pid, st: a.st, ms: logMs(a.at), by: str(a.by), bp: "", src: "", self: false, old: true
  })));
  // Nejnovější první; záznam bez času (čeká na server) úplně nahoře, starší odpověď bez času úplně dole
  const key = r => (r.ms != null ? r.ms : r.old ? -Infinity : Infinity);
  return rows.sort((a, b) => (key(b) === key(a) ? 0 : key(b) > key(a) ? 1 : -1));
}
// Řádky po osobách v pořadí prvního výskytu (nejnovější změna osoby nahoře): [{pid, rows}]
export function byPerson(rows) {
  const m = new Map();
  (rows || []).forEach(r => { if (!m.has(r.pid)) m.set(r.pid, []); m.get(r.pid).push(r); });
  return [...m.entries()].map(([pid, rs]) => ({pid, rows: rs}));
}
// Souhrn pro hlavičku okna: počet změn, změny za jinou osobu, po termínu, po začátku, osob
export function logSummary(rows) {
  const r = (rows || []).filter(x => !x.old);
  return {n: r.length, other: r.filter(x => !x.self).length, late: r.filter(x => x.late).length, after: r.filter(x => x.after).length, people: new Set(r.map(x => x.pid)).size};
}
// Filtr řádků: all = vše, other = zapsal někdo jiný, late = po termínu
export function filterRows(rows, f) {
  if (f === "other") return (rows || []).filter(r => !r.old && !r.self);
  if (f === "late") return (rows || []).filter(r => r.late);
  return rows || [];
}
// Poslední ruční / automatická změna osoby, která odpovídá dokumentu docházky (stejný stav, čas do 5 min) – kdo zapsal aktuální odpověď; jinak null
export function lastWriter(rows, pid, cur) {
  if (!cur) return null;
  const am = logMs(cur.at), r = (rows || []).find(x => x.pid === pid && !x.old && ["yes", "no", "maybe"].includes(x.st));
  if (!r || r.st !== cur.st) return null;
  if (am != null && r.ms != null && Math.abs(am - r.ms) > SAME_MS) return null;
  return r;
}
