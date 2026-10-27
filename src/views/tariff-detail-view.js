// ⚠️ Detail tarifu hráčky (Team → 💰 Platby → ⚖️ Tarify → klepnutí na hráčku, jen správce pokladny): po měsících sezóny co platila
// a za které události, co by platila druhým způsobem, využití ledu a dopad na pokladnu, kdyby neplatila (rozpočítání na ostatní).
// Jen čtení a pomocník pro úlevu (např. zraněná hráčka) – změna způsobu placení dál v 🕘 Historii placení. Výpočet: domain/tariff-detail.js.
// ===== Importy =====
import {S} from "../core/state.js";
import {esc, fd, td} from "../core/utils.js";
import {GRP, cashCfg, kc, ymLabel, ymNow} from "../domain/cash.js";
import {LOW_USE, reliefHint, tariffDetail} from "../domain/tariff-detail.js";

// ===== Pomocné funkce =====
// Přihlášená (✅) na událost? Sada „eid|pid“ z odpovědí docházky
const wentSet = () => new Set((S.at || []).filter(a => a.st === "yes").map(a => a.eid + "|" + a.pid));
const grpTxt = g => esc(GRP[g] || "–");
// Řádek předpisu v měsíci
const itemRow = x => `<div class="mu">${x.contrib ? "📅" : "💰"} ${esc(x.title)}${x.contrib || !x.date ? "" : " · " + fd(x.date)}: <b>${kc(x.amt)}</b>${x.paid < x.amt ? ` <span style="color:var(--no)">(zaplaceno ${kc(x.paid)})</span>` : " ✅"}</div>`;
// Řádek navštívené uzavřené události: hodnota ledu, co jí bylo předepsáno a co by platila druhým způsobem
function wentRow(e, d) {
  const now = e.mine > 0 ? "platila " + kc(e.mine) : e.covered && d.grp === "monthly" ? "v příspěvku" : "neplatila";
  const al = d.skip ? "" : ` · ${esc((GRP[d.alt] || "").toLowerCase())} ${kc(e.altAmt)}`;
  return `<div class="mu">🏒 ${fd(e.date)} ${esc(e.title)} – led ${kc(e.value)} · ${now}${al}</div>`;
}

// ===== Vykreslení =====
// HTML rozbaleného detailu pod řádkem hráčky v ⚖️ Tarify (p = hráčka s platebními poli)
export function tariffDetailHtml(p) {
  const W = wentSet();
  const d = tariffDetail(p, S, S.ch, S.pr, S.ec, eid => W.has(eid + "|" + p.id), cashCfg(S.cc).contrib, ymNow(), td());
  if (!d) return "";
  const u = d.use, t = d.team;
  // Využití ledu (hodnota účasti vs. zaplaceno) a tip na úlevu
  const useH = `<div class="mu">Uzavřené události sezóny, kde byla: <b>${u.n}</b> · hodnota ledu ${kc(u.value)} (náklady ÷ hráčky v poli) · předepsáno ${kc(u.act)}${u.pct != null ? ` · využití <b>${u.pct} %</b>` : ""}</div>`
    + (reliefHint(d) ? `<div class="mu" style="color:var(--wa)">💡 Využívá méně než ${LOW_USE} % zaplaceného (např. zranění) – lze zvážit úlevu: 🕘 Historie placení → za události nebo koeficient.</div>` : "");
  // Dopad na pokladnu, kdyby neplatila
  const teamH = t.lost > 0
    ? `<div class="mu" style="margin-top:4px"><b>Kdyby neplatila:</b> pokladna v sezóně −${kc(t.lost)}.${t.c.amt > 0 ? ` Příspěvky ${kc(t.c.amt)} → každé hráčce s příspěvkem by se zvedlo celkem o ~${kc(t.c.inc)} (${t.c.n} ${t.c.n === 1 ? "měsíc" : t.c.n < 5 ? "měsíce" : "měsíců"}).` : ""}${t.ev.amt > 0 ? ` Poplatky za události ${kc(t.ev.amt)} → spoluplatící by za tytéž události zaplatila celkem o ~${kc(t.ev.inc)} víc (${t.ev.n}× událost).` : ""}</div>`
    : '<div class="mu" style="margin-top:4px">V sezóně zatím nic nezaplatila – na pokladnu bez dopadu.</div>';
  // Souhrn porovnání
  const cmpH = d.skip ? `<div class="mu">${d.skip === "exempt" ? "Osvobozená" : "Koeficient 0 %"} – porovnání způsobu placení se nepočítá.</div>`
    : `<div class="mu">Sezóna celkem: ${grpTxt(d.grp)} skutečně <b>${kc(d.total.act)}</b> · ${esc((GRP[d.alt] || "").toLowerCase())} by bylo <b>${kc(d.total.alt)}</b></div>`;
  // Po měsících (nejnovější nahoře)
  const monH = d.months.length ? d.months.map(m => `<div style="padding:6px 0;border-top:1px solid var(--bd)"><div><b>${esc(ymLabel(m.ym))}</b>${m.grp ? " · " + grpTxt(m.grp) : ""} · skutečně ${kc(m.act)}${d.skip ? "" : " · " + esc((GRP[m.grp === "monthly" ? "single" : "monthly"] || "").toLowerCase()) + " " + kc(m.alt)}</div>${m.items.map(itemRow).join("")}${m.went.map(e => wentRow(e, d)).join("")}</div>`).join("")
    : '<div class="mu">V sezóně zatím žádné předpisy ani uzavřené události.</div>';
  return `<div style="padding:4px 0 10px 8px;border-bottom:1px solid var(--bd)">${cmpH}${useH}${teamH}<details style="margin-top:6px"><summary>📅 Po měsících a událostech</summary>${monH}</details><button class="s" data-fh="${esc(p.id)}" style="margin-top:8px;min-height:44px">🕘 Historie placení</button></div>`;
}

// ===== Exporty =====
// (exportované funkce jsou označené u definic výše)
