// 🟢 Přítomnost členů: seen/{e-mail} = {at, v, ch} – čas poslední aktivity (čas serveru), verze aplikace a kanál (s = stabilní, b = 🧪 beta).
// Zapisuje každý účet jen svůj dokument (při spuštění a pak nejvýš jednou za PING_MS, když je aplikace na obrazovce); čte jen manager
// v ⚙️ → 👥 Členové týmu (na vyžádání, žádný trvalý poslech). Čisté funkce bez DOM a databáze (tests/presence.test.js); zápis v data/storage.js.

// ===== Konstanty =====
export const SEEN_COLL = "seen";
// Jak často se zapisuje aktivita, když je aplikace otevřená (10 min) – zápisy zdarma 20 000 denně, tým jich spotřebuje desítky
export const PING_MS = 10 * 60 * 1000;
// Kdo se ukáže jako 🟢 online: aktivita za posledních 15 min (ping každých 10 min + rezerva)
export const ONLINE_MS = 15 * 60 * 1000;
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

// ===== Pomocné funkce =====
// Čas aktivity v ms: Timestamp z Firestore (toMillis), Date, číslo nebo text; jinak null
export function seenMs(at) {
  if (at == null) return null;
  if (typeof at.toMillis === "function") return at.toMillis();
  if (at instanceof Date) return at.getTime();
  const t = typeof at === "number" ? at : new Date(at).getTime();
  return isNaN(t) ? null : t;
}
const pad = n => String(n).padStart(2, "0");

// ===== Hlavní logika =====
// Má se teď zapsat aktivita? last = čas posledního zápisu v tomto zařízení (ms), force = spuštění aplikace
export const pingDue = (last, now, force) => !!force || !last || now - last >= PING_MS;
// Stav člena pro seznam: null (nikdy od zavedení přehledu), jinak {on, ms, text, v, beta}
// text: „🟢 online“, „před 25 min“, „před 3 h“, „včera 21:40“, „31. 10. 21:40“
export function seenState(doc, now) {
  const ms = doc ? seenMs(doc.at) : null;
  if (ms == null) return null;
  const n = now == null ? Date.now() : now, ago = Math.max(0, n - ms), d = new Date(ms), hm = d.getHours() + ":" + pad(d.getMinutes());
  const y = new Date(n); y.setHours(0, 0, 0, 0);
  let text;
  if (ago < ONLINE_MS) text = "🟢 online";
  else if (ago < HOUR) text = "před " + Math.round(ago / MIN) + " min";
  else if (ago < 6 * HOUR) text = "před " + Math.floor(ago / HOUR) + " h";
  else if (ms >= y.getTime()) text = "dnes " + hm;
  else if (ms >= y.getTime() - DAY) text = "včera " + hm;
  else text = d.getDate() + ". " + (d.getMonth() + 1) + ". " + (d.getFullYear() !== y.getFullYear() ? d.getFullYear() + " " : "") + hm;
  return {on: ago < ONLINE_MS, ms, text, v: String(doc.v || ""), beta: doc.ch === "b"};
}
// Počet členů teď online (seen = {e-mail: dokument})
export const onlineCount = (seen, now) => Object.values(seen || {}).filter(d => { const s = seenState(d, now); return s && s.on; }).length;

// ===== Exporty =====
// (exportované funkce a konstanty jsou označené u definic výše)
