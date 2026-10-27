// 🏠 Domů – ❔ Chybí odpověď a 📲 připomenutí (K2, krok 2): nejbližší událost s otevřeným přihlašováním, hráčky bez odpovědi
// a text připomínky ke sdílení (WhatsApp / SMS přes sdílení telefonu, bez serveru). Čisté funkce bez DOM a databáze.
// „Bez odpovědi“ = aktivní hráčka soupisky (stav jiný než ukončená) bez záznamu docházky – stejně jako počet v detailu události.

// ===== Konstanty =====
const DAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

// ===== Pomocné funkce =====
const stOf = p => p.st || "act";
// Krátké datum „Út 28. 10.“
export function dayShort(s) {
  const d = new Date(s + "T12:00:00");
  return isNaN(d) ? String(s || "") : DAYS[d.getDay()] + " " + d.getDate() + ". " + (d.getMonth() + 1) + ".";
}

// ===== Hlavní logika =====
// Nejbližší událost, na kterou se ještě dá odpovědět (seznam z upcomingEvents – seřazený od nejbližší); null = žádná
export const nearestOpen = list => (list || []).find(e => !e.locked && !e.cancelled && !e.past) || null;
// Hráčky bez odpovědi na událost eid: [{id, name}] seřazené podle jména (ukončené se nepočítají)
export function missingAnswers(players, at, eid) {
  const done = new Set((at || []).filter(a => a.eid === eid && a.st).map(a => a.pid));
  return (players || []).filter(p => stOf(p) !== "end" && !done.has(p.id))
    .map(p => ({id: p.id, name: p.name || "?"})).sort((a, b) => a.name.localeCompare(b.name, "cs"));
}
// Text připomínky: událost (den, čas, sraz, místo), termín přihlášení, kdo chybí a odkaz do aplikace.
// e = položka z homeItems, when = hotový řádek času a srazu („17:00–18:30 · ⏰ sraz 16:40“), dl = text termínu, url = adresa aplikace
export function reminderText(e, names, {when = "", dl = "", url = ""} = {}) {
  const head = (e.type === "match" ? "🆚 " : "🏒 ") + (e.title || "") + " · " + dayShort(e.date) + (when ? " · " + when : "") + (e.place ? " · " + e.place : "");
  const lines = [head];
  if (dl) lines.push("Přihlášení do " + dl);
  if ((names || []).length) lines.push("Chybí odpověď: " + names.join(", "));
  lines.push("Prosím odpovězte v aplikaci ✅ / ❌ / ❓" + (url ? ": " + url : "."));
  return lines.join("\n");
}
