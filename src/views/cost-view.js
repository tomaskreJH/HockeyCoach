// ⚠️ Team → 🧾 Náklady (správce pokladny): očekávané náklady událostí (led, rozhodčí, časomíra …) proti zaplaceným výdajům po měsících sezóny,
// nezávisle na účtu. Výpočet: domain/cost-check.js (data econData z payments.js). ➖ Zapsat platbu předvyplní výdaj v 🏦 Pokladna (openOut).
// Klepnutí na řádek rozbalí události a výdaje; ⬇️ CSV celé sezóny.
// ===== Importy =====
import {S} from "../core/state.js";
import {csv, downloadFile, esc, fd, td} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {seasonOf} from "../domain/attendance.js";
import {csvNum, kc, ymLabel, ymNow, ymShort} from "../domain/cash.js";
import {COST_ST, costPeriod, ymRange} from "../domain/cost-check.js";
import {openOut} from "./cashbook.js";
import {econData} from "./payments.js";
import {render} from "./shell.js";

// ===== Stav (jen pro tuto obrazovku) =====
let day = null;       // den určující sezónu (◀ ▶ posouvá o rok)
let open = null;      // rozbalený řádek „RRRR-MM|kategorie|příjemce“
let fut = false;      // zobrazit i budoucí měsíce sezóny (jen plán)

// ===== Pomocné funkce =====
const seasonTxt = se => se.from.slice(0, 4) + "/" + se.to.slice(2, 4);
// Měsíce sezóny: od srpna do dneška (budoucí jen na přání), nejnovější první
function months(se) {
  const now = ymNow(), last = se.to.slice(0, 7) > now && !fut ? now : se.to.slice(0, 7);
  return ymRange(se.from.slice(0, 7), last);
}
const icon = t => (t === "match" ? "🆚" : "🏒");
// Barva a text stavu řádku
const stTag = r => {
  const cls = r.st === "wait" ? "sh" : r.st === "ok" ? "pp" : "";
  const txt = r.st === "wait" ? COST_ST.wait + " " + kc(r.rest) : r.st === "over" ? COST_ST.over + " " + kc(r.paid - r.exp) : COST_ST[r.st];
  return `<span class="tag ${cls}" style="white-space:nowrap">${esc(txt)}</span>`;
};

// ===== Vykreslení =====
// Řádek kategorie a příjemce v měsíci, rozbalený s událostmi a výdaji
function rowHtml(ym, r) {
  const key = ym + "|" + r.cat + "|" + r.payee, on = open === key;
  const head = `<div data-cko="${esc(key)}" style="cursor:pointer;display:flex;justify-content:space-between;gap:8px;align-items:center"><div><b>${on ? "▾" : "▸"} ${esc(r.cat)}</b>${r.payee ? " · " + esc(r.payee) : ""}
<div class="mu">${r.n ? r.n + "× událost" + (r.nFut ? ` (z toho ${r.nFut} budoucí)` : "") + " · očekáváno " + kc(r.exp) + " · " : ""}zaplaceno ${kc(r.paid)}</div></div>${stTag(r)}</div>`;
  if (!on) return `<div class="it" style="display:block">${head}</div>`;
  const evs = r.evs.map(e => `<div class="mu">${icon(e.type)} ${fd(e.date)} · ${esc(e.title)} · ${kc(e.amt)}${e.fut ? " · budoucí" : ""}${e.settled ? " · vyúčtováno" : ""}</div>`).join("");
  const pays = r.pays.map(x => `<div class="mu">➖ ${x.d ? fd(x.d) : "–"} · ${kc(+x.amt || 0)}${x.payee ? " · " + esc(x.payee) : ""}${x.pym ? " · za " + ymShort(x.pym) : ""}${x.note ? " · " + esc(x.note) : ""}</div>`).join("");
  const btn = r.rest > 0 ? `<button class="p w" data-ckp="${esc(key)}" style="margin-top:8px;min-height:48px">➖ Zapsat platbu ${kc(r.rest)}</button>` : `<button class="s w" data-ckp="${esc(key)}" style="margin-top:8px;min-height:44px">➖ Zapsat další výdaj</button>`;
  return `<div class="it" style="display:block">${head}<div style="margin-top:6px;border-top:1px solid var(--bd);padding-top:6px">${evs ? "<b>Události</b>" + evs : ""}${pays ? `<b style="display:block;margin-top:4px">Výdaje</b>${pays}` : '<div class="mu">Zatím bez výdaje.</div>'}${btn}</div></div>`;
}
function monthHtml(m) {
  const tag = m.rest > 0 ? `<span class="tag sh">čeká ${kc(m.rest)}</span>` : m.due > 0 ? '<span class="tag pp">zaplaceno</span>' : "";
  return `<div class="cd"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><h2 style="margin:0;text-transform:capitalize">${esc(ymLabel(m.ym))}</h2>${tag}</div>
<div class="mu" style="margin:4px 0 6px">očekáváno ${kc(m.exp)}${m.due !== m.exp ? " (do dneška " + kc(m.due) + ")" : ""} · zaplaceno ${kc(m.paid)}</div>${m.rows.map(r => rowHtml(m.ym, r)).join("")}</div>`;
}
export function costHtml() {
  if (!HK.can("money")) return "";
  if (!day) day = td();
  const se = seasonOf(day), P = costPeriod(months(se), econData(), td());
  const nav = `<div class="cd"><div class="evh"><button class="s" data-cky="-1">◀</button><b style="font-size:17px">Sezóna ${esc(seasonTxt(se))}</b><button class="s" data-cky="1">▶</button></div>
<div class="chips" style="margin-top:8px"><button class="chip ${fut ? "on" : ""}" data-ckf>🗓 I budoucí měsíce</button><button class="chip" data-ckc>⬇️ CSV</button></div></div>`;
  const grid = `<div class="grid3"><div class="stat"><b style="color:${P.rest > 0 ? "var(--no)" : "var(--ok)"}">${kc(P.rest)}</b>čeká na platbu</div><div class="stat"><b>${kc(P.paid)}</b>zaplaceno</div><div class="stat"><b>${kc(P.exp)}</b>očekáváno</div></div>`;
  const help = `<div class="mu" style="margin:0 0 10px">Náklady se berou z událostí (💰 Pokladna u události, jinak šablona v ⚙️ → Nastavení pokladny). Výdaj zapiš v 🏦 Pokladna se stejnou kategorií, příjemcem a měsícem „Za měsíc“ (led placený zpětně). Výdaj bez příjemce se rozdělí podle kategorie. Účet nerozhoduje.</div>`;
  const body = P.months.length ? P.months.map(monthHtml).join("") : '<div class="msg">V sezóně nejsou žádné náklady událostí. Náklady (led, rozhodčí …) nastav v šablonách ⚙️ → Nastavení pokladny nebo u události v 💰 Pokladna.</div>';
  return `<div id="ckw">${nav}${grid}${help}${body}</div>`;
}

// ===== Eventy =====
// CSV sezóny: měsíc, kategorie, příjemce, počet událostí, očekáváno, do dneška, zaplaceno, zbývá, stav
function exportCsv() {
  const se = seasonOf(day || td()), P = costPeriod(months(se), econData(), td());
  const rows = [["Měsíc", "Kategorie", "Příjemce", "Událostí", "Očekáváno", "Do dneška", "Zaplaceno", "Zbývá", "Stav"]];
  P.months.slice().reverse().forEach(m => m.rows.forEach(r => rows.push([m.ym, r.cat, r.payee, r.n, csvNum(r.exp), csvNum(r.due), csvNum(r.paid), csvNum(Math.max(0, r.rest)), COST_ST[r.st] || ""])));
  downloadFile("naklady-" + se.from.slice(0, 4) + "-" + td() + ".csv", csv(rows), "text/csv");
}
export function bindCost(a) {
  if (!HK.can("money")) return;
  a.querySelectorAll("[data-cky]").forEach(b => b.onclick = () => { const d = new Date((day || td()) + "T12:00:00"); d.setFullYear(d.getFullYear() + +b.dataset.cky); day = d.toISOString().slice(0, 10); open = null; render(); });
  a.querySelectorAll("[data-ckf]").forEach(b => b.onclick = () => { fut = !fut; render(); });
  a.querySelectorAll("[data-ckc]").forEach(b => b.onclick = exportCsv);
  a.querySelectorAll("[data-cko]").forEach(b => b.onclick = () => { open = open === b.dataset.cko ? null : b.dataset.cko; render(); });
  // ➖ Zapsat platbu: předvyplněný výdaj (kategorie, příjemce, měsíc, zbývající částka) v 🏦 Pokladna
  a.querySelectorAll("[data-ckp]").forEach(b => b.onclick = () => {
    const [ym, cat, ...rest] = b.dataset.ckp.split("|"), payee = rest.join("|");
    const P = costPeriod([ym], econData(), td()), m = P.months[0], r = m && m.rows.find(x => x.cat === cat && x.payee === payee);
    openOut({cat, payee, pym: ym, amt: r && r.rest > 0 ? r.rest : 0});
    S.tm = "cash";
    render();
    window.scrollTo(0, 0);
  });
}
