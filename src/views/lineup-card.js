// 📋 Sestava zápasu pro hráčky (jen čtení): karta v detailu zápasu a značka „Sestava k dispozici“ na kartě události a v 🏠 Domů.
// Ukazuje se jen uzavřená sestava (domain/lineup.js – lineupVisible); rozpracovanou sestavu vidí jen manager, trenér a asistent v kroku Sestava.
// Nic nezapisuje, nemění živý zápis ani uložená data zápasu. Struktura: Importy -> Pomocné funkce -> Značka -> Karta -> Exporty.

// ===== Importy =====
import {COLS, UK, ULAB, USLOT, slab} from "../config/constants.js";
import {pn, slotIds} from "../core/selectors.js";
import {benchM, lineupVisible} from "../domain/lineup.js";

// ===== Pomocné funkce =====
// Jméno hráčky s číslem, prázdné místo = pomlčka
const who = id => (id ? pn(id) : "–");

// ===== Značka =====
// 📋 Sestava k dispozici: jen u zápasu, který ještě není uzavřený (m = dokument zápasu); jinak prázdný text
export function lineupTag(m) {
  return m && !m.closed && lineupVisible(m) ? '<span class="tag pp">📋 Sestava k dispozici</span>' : "";
}

// ===== Karta =====
// Karta „Sestava zápasu“: pětky (řady × pozice, střídající se hráčky na jednom místě oddělené ⇄), brankářky, náhradnice a jednotky přesilovek a oslabení
export function lineupCardHtml(m) {
  if (!lineupVisible(m)) return "";
  const lu = m.lineup || {};
  const lines = [1, 2, 3, 4].filter(n => COLS.some(c => lu[n + c]));
  // Jednotky přesilovek a oslabení jen s vyplněnou hráčkou
  const units = UK.filter(k => Object.values((m.sp || {})[k] || {}).some(Boolean));
  const bench = benchM(m).map(who).join(", ") || "–";
  const rows = lines.map(n => `<tr><td>${n}.</td>${COLS.map(c => `<td>${slotIds(lu, n + c).map(who).join(" ⇄ ") || "–"}</td>`).join("")}</tr>`).join("");
  const sp = units.length
    ? "<br><b>Jednotky:</b><br>" + units.map(k => ULAB[k] + ": " + USLOT[k].map(c => slab(k, c) + " " + who(((m.sp || {})[k] || {})[c])).join(", ")).join("<br>")
    : "";
  return `<div class="cd" id="evlu"><h2>📋 Sestava zápasu</h2><div class="tw"><table style="min-width:420px"><tr><th>Pětka</th>${COLS.map(c => `<th>${c}</th>`).join("")}</tr>${rows}</table></div>
<div class="mu" style="margin-top:6px"><b>Brankářky:</b> ${who(lu.G1)}${lu.G2 ? ", " + who(lu.G2) : ""}<br><b>Náhradnice:</b> ${bench}${sp}</div></div>`;
}
