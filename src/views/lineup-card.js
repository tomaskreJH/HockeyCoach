// 📋 Sestava zápasu pro hráčky (jen čtení): karta v detailu zápasu a značka „Sestava k dispozici“ na kartě události a v 🏠 Domů.
// Vzhled jako zveřejnění sestavy velkoklubu: hlavička se znakem týmu a soupeřem, brankářky, pětky po třech útočnicích a dvou obráncích,
// velká čísla a příjmení; přihlášená hráčka je zvýrazněná štítkem TY a nahoře je řádek, kde hraje. Šířka se přizpůsobí telefonu (mřížka bez posunu do strany).
// Ukazuje se jen uzavřená sestava (domain/lineup.js – lineupVisible); rozpracovanou sestavu vidí jen manager, trenér a asistent v kroku Sestava.
// Nic nezapisuje, nemění živý zápis ani uložená data zápasu. Struktura: Importy -> Styly -> Pomocné funkce -> Značka -> Karta -> Exporty.

// ===== Importy =====
import {COLS, UK, ULAB, USLOT, slab} from "../config/constants.js";
import {TEAM_NAME} from "../config/team-config.js";
import {baseKey, pl, slotIds, slotKey} from "../core/selectors.js";
import {esc, fd} from "../core/utils.js";
import {benchM, lineupVisible} from "../domain/lineup.js";

// ===== Styly =====
// Jen pro kartu #evlu; barvy z proměnných aplikace (světlý i tmavý režim)
const CSS = `<style>
#evlu{padding:0;overflow:hidden}
#evlu .luh{display:flex;align-items:center;gap:12px;padding:14px;background:linear-gradient(135deg,var(--ac),color-mix(in srgb,var(--ac) 55%,#000));color:#fff}
#evlu .luh img{width:48px;height:48px;object-fit:contain;flex:none;background:#fff;border-radius:50%;padding:3px}
#evlu .lut{font-size:12px;letter-spacing:.18em;font-weight:800;opacity:.85}
#evlu .lus{font-size:18px;font-weight:800;line-height:1.15;overflow-wrap:anywhere}
#evlu .lud{font-size:12px;opacity:.85;margin-top:2px}
#evlu .lub{padding:12px 14px 14px}
#evlu .lume{margin:0 0 12px;padding:9px 12px;border-radius:10px;background:color-mix(in srgb,var(--ok) 16%,var(--cd));border:1px solid var(--ok);font-weight:700;text-align:center}
#evlu .lul{display:flex;align-items:center;gap:8px;margin:14px 0 8px;font-size:12px;font-weight:800;letter-spacing:.14em;color:var(--mu);text-transform:uppercase}
#evlu .lul::before,#evlu .lul::after{content:"";height:1px;background:var(--bd);flex:1}
#evlu .lul:first-child{margin-top:0}
#evlu .lur{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:6px}
#evlu .lur.d2{width:66.66%;margin-left:auto;margin-right:auto;grid-template-columns:repeat(2,minmax(0,1fr))}
#evlu .lur.g1{width:33.33%;margin-left:auto;margin-right:auto;grid-template-columns:minmax(0,1fr)}
#evlu .lur.g2{width:66.66%;margin-left:auto;margin-right:auto;grid-template-columns:repeat(2,minmax(0,1fr))}
#evlu .lus1{display:flex;flex-direction:column;gap:4px;min-width:0}
#evlu .luc{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;min-width:0;padding:16px 3px 7px;border-radius:10px;background:var(--a2);border:1px solid var(--bd);line-height:1.15}
#evlu .luc .lup{position:absolute;top:3px;left:0;right:0;font-size:9px;font-weight:800;letter-spacing:.1em;color:var(--mu)}
#evlu .luc .lun{font-size:22px;font-weight:800;color:var(--ac);font-variant-numeric:tabular-nums}
#evlu .luc .lnf{font-size:10px;color:var(--mu);max-width:100%;overflow-wrap:anywhere}
#evlu .luc .lnm{font-size:12px;font-weight:700;max-width:100%;overflow-wrap:anywhere;hyphens:auto}
#evlu .luc .luk{position:absolute;top:3px;right:4px;font-size:9px;font-weight:800;color:var(--wa)}
#evlu .luc.g{border-color:var(--wa)}
#evlu .luc.me{background:var(--ok);border-color:var(--ok);color:#fff;box-shadow:0 0 0 2px color-mix(in srgb,var(--ok) 35%,transparent)}
#evlu .luc.me .lun,#evlu .luc.me .lup,#evlu .luc.me .lnf,#evlu .luc.me .luk{color:#fff}
#evlu .luc .lut2{position:absolute;bottom:-1px;left:50%;transform:translateX(-50%);padding:0 6px;border-radius:6px 6px 0 0;background:#fff;color:var(--ok);font-size:9px;font-weight:800;letter-spacing:.08em}
#evlu .lub2{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
#evlu .lub2 .luc{padding-top:8px;opacity:.9}
#evlu .lus2{margin-top:12px;font-size:12px;color:var(--mu);line-height:1.5}
#evlu .lus2 b{color:var(--tx)}
#evlu .lus2 .lmy{color:var(--ok);font-weight:800}
</style>`;

// ===== Pomocné funkce =====
// Rozdělení jména na křestní a příjmení (jednoslovné jméno = jen příjmení)
const split = name => { const t = String(name || "").trim().split(/\s+/); return t.length > 1 ? [t[0], t.slice(1).join(" ")] : ["", t[0] || "?"]; };
// Krátké jméno do textu jednotek: příjmení, svoje zvýrazněné
const short = (id, me) => { const p = pl(id), t = id ? esc(split(p ? p.name : "?")[1]) : "–"; return id && id === me ? `<span class="lmy">${t} (TY)</span>` : t; };
// Dlaždice hráčky: číslo, jméno, pozice na řadě (pos), brankářka (g), ⓒ kapitánka, štítek TY u přihlášené hráčky (me)
function chip(id, pos, me, g = false) {
  const p = pl(id);
  if (!p) return `<div class="luc${g ? " g" : ""}"><span class="lup">${esc(pos)}</span><b class="lun">–</b><span class="lnm">?</span></div>`;
  const [f, s] = split(p.name), mine = id === me;
  return `<div class="luc${g ? " g" : ""}${mine ? " me" : ""}"><span class="lup">${esc(pos)}</span>${p.cap === true ? '<span class="luk">C</span>' : ""}<b class="lun">${p.num ? esc(p.num) : "•"}</b>${f ? `<span class="lnf">${esc(f)}</span>` : ""}<span class="lnm">${esc(s)}</span>${mine ? '<span class="lut2">TY</span>' : ""}</div>`;
}
// Místo v pětce: jedna hráčka, nebo víc střídajících se pod sebou
const slot = (lu, key, pos, me) => `<div class="lus1">${(slotIds(lu, key).length ? slotIds(lu, key) : [null]).map(id => id ? chip(id, pos, me) : `<div class="luc"><span class="lup">${esc(pos)}</span><b class="lun">–</b></div>`).join("")}</div>`;
// Kde hraje přihlášená hráčka: text pro řádek nahoře, prázdný = není nominovaná
function mineText(m, me) {
  if (!me) return "";
  const lu = m.lineup || {};
  if (lu.G1 === me || lu.G2 === me) return "🥅 Jsi v brance" + (lu.G1 === me ? "" : " (2. brankářka)");
  const k = slotKey(lu, me);
  if (k) return "⭐ Hraješ: " + baseKey(k)[0] + ". pětka · " + baseKey(k).slice(1);
  if (benchM(m).includes(me)) return "⭐ Jsi mezi náhradnicemi";
  return "";
}

// ===== Značka =====
// 📋 Sestava k dispozici: jen u zápasu, který ještě není uzavřený (m = dokument zápasu); jinak prázdný text
export function lineupTag(m) {
  return m && !m.closed && lineupVisible(m) ? '<span class="tag pp">📋 Sestava k dispozici</span>' : "";
}

// ===== Karta =====
// Karta „Sestava“ (m = dokument zápasu, me = id přihlášené hráčky nebo ""): hlavička, brankářky, pětky, náhradnice a jednotky přesilovek a oslabení
export function lineupCardHtml(m, me = "") {
  if (!lineupVisible(m)) return "";
  const lu = m.lineup || {}, mine = mineText(m, me);
  const lines = [1, 2, 3, 4].filter(n => COLS.some(c => lu[n + c]));
  const gk = [lu.G1, lu.G2].filter(Boolean);
  const rows = lines.map(n => `<div class="lul">${n}. pětka</div>
<div class="lur">${["LK", "C", "PK"].map(c => slot(lu, n + c, c, me)).join("")}</div>
<div class="lur d2">${["LO", "PO"].map(c => slot(lu, n + c, c, me)).join("")}</div>`).join("");
  const bench = benchM(m);
  const units = UK.filter(k => Object.values((m.sp || {})[k] || {}).some(Boolean));
  const sp = units.length
    ? `<div class="lus2"><b>Přesilovky a oslabení</b><br>${units.map(k => ULAB[k] + ": " + USLOT[k].map(c => slab(k, c) + " " + short(((m.sp || {})[k] || {})[c], me)).join(", ")).join("<br>")}</div>`
    : "";
  const vs = m.home ? esc(TEAM_NAME) + " – " + esc(m.opp) : esc(m.opp) + " – " + esc(TEAM_NAME);
  return CSS + `<div class="cd" id="evlu"><div class="luh"><img src="logo-strely.png" alt=""><div><div class="lut">SESTAVA</div><div class="lus">${vs}</div><div class="lud">${m.date ? esc(fd(m.date)) : ""}${m.time ? " · " + esc(m.time) : ""}${m.place ? " · " + esc(m.place) : ""}${m.date || m.time || m.place ? " · " : ""}${m.home ? "doma" : "venku"}</div></div></div>
<div class="lub">${mine ? `<div class="lume">${esc(mine)}</div>` : ""}${gk.length ? `<div class="lul">Brankářky</div><div class="lur ${gk.length > 1 ? "g2" : "g1"}">${gk.map((id, i) => chip(id, i ? "G2" : "G", me, true)).join("")}</div>` : ""}${rows}${bench.length ? `<div class="lul">Náhradnice</div><div class="lub2">${bench.map(id => chip(id, "N", me)).join("")}</div>` : ""}${sp}</div></div>`;
}
