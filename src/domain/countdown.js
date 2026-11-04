// Odpočty: čistý text zbývajícího času pro 🆚 Příští zápas na Domů (HH:MM:SS pod 24 hodin) a pro ⏳ termín přihlášení u událostí
// („3 dny“, „1 den 5 h“, „5 h 12 min“). Bez DOM a bez stavu – tikání textu zajišťuje views/countdown-tick.js.

// ===== Konstanty =====
export const DAY_MS = 864e5;                                     // jeden den v ms

// ===== Pomocné funkce =====
const p2 = n => String(n).padStart(2, "0");
// Počet dní se správným tvarem: 1 den, 2–4 dny, 5 a více dní
const daysWord = d => d + (d === 1 ? " den" : d < 5 ? " dny" : " dní");

// ===== Exporty =====
// Hodiny na displeji HH:MM:SS (hodin může být i víc než 24); záporný čas = 00:00:00
export function clockText(ms) {
  const t = Math.floor(Math.max(0, ms) / 1000);
  return p2(Math.floor(t / 3600)) + ":" + p2(Math.floor(t % 3600 / 60)) + ":" + p2(t % 60);
}
// Zbývá do termínu (přesnost na minuty): 5 a více dní „7 dní“, 3–4 dny jen dny, 1–2 dny „1 den 5 h“, pod den „5 h 12 min“, pod hodinu „41 min“
export function leftText(ms) {
  const t = Math.max(0, Math.floor(ms / 6e4));
  const d = Math.floor(t / 1440), h = Math.floor(t % 1440 / 60), m = t % 60;
  if (d >= 3) return daysWord(d);
  if (d >= 1) return daysWord(d) + (h ? " " + h + " h" : "");
  if (h >= 1) return h + " h" + (m ? " " + m + " min" : "");
  return m >= 1 ? m + " min" : "méně než minuta";
}
