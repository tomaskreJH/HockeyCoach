// 📊 Docházka pro všechny (Události → Docházka, S.evm = "att"), jen ke čtení, bez důvodů omluv; výpočet domain/attendance.js.
// Ukončené hráčky ⛔ jen s odpovědí v období; dlužnice po splatnosti ⛓ (s výjimkou 🔓), realizační tým značku nemá.
// ===== Importy =====
import {pl, pn, pri, stOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, fd, td} from "../core/utils.js";
import {ATT_KINDS, attEvents, attSummary, hasAnswer, isDayStr, pastEvents, seasonOf} from "../domain/attendance.js";
import {debtorState} from "../domain/debtors.js";
import {render} from "./shell.js";

// ===== Konstanty =====
const KIND_KEYS = ATT_KINDS.map(([k]) => k);
const KIND_ICON = {all: "📋", train: "🏒", home: "🏠", away: "🚌"};

// ===== Pomocné funkce =====
// Volby přehledu (období a typ); výchozí = aktuální zimní sezóna, všechny typy
function opts() {
  if (!S.ao) S.ao = {...seasonOf(td()), kind: "all"};
  const o = S.ao;
  if (!isDayStr(o.from) || !isDayStr(o.to)) Object.assign(o, seasonOf(td()));
  if (!KIND_KEYS.includes(o.kind)) o.kind = "all";
  return o;
}
// Popis období pro výpis („1. 8. 2026 – 1. 7. 2027“)
const range = o => fd(o.from) + " – " + fd(o.to);
// Značka dlužníka u jména: ⛓ mříže (po splatnosti, přihlášení „Jdu“ zablokováno) nebo 🔓 (po splatnosti s výjimkou); bez částek
export function debtTag(mid) {
  const st = debtorState((S.dt || []).find(x => x.id === mid), Date.now());
  if (!st) return "";
  const d = st.days + " d";
  return st.blocked
    ? ` <span class="dbt" title="Neuhrazený předpis po splatnosti ${st.days} dní – přihlášení je zablokováno">⛓ ${d}</span>`
    : ` <span class="tag" title="Po splatnosti ${st.days} dní, výjimka z blokace">🔓 ${d}</span>`;
}
// Dlužníci po splatnosti seřazení od nejdelšího (jen hráčky)
function debtorList() {
  const now = Date.now();
  return (S.dt || []).filter(x => pl(x.id)).map(x => ({id: x.id, st: debtorState(x, now)})).filter(x => x.st).sort((a, b) => b.st.days - a.st.days);
}
// Buňky jednoho řádku tabulky: účast, procento, 🚫 nedorazila bez omluvy, ⏰ odpověď po termínu, nejdu, nejistá, bez odpovědi
const red = n => (n ? `<b style="color:var(--no)">${n}</b>` : 0);
const cells = r => `<td><b>${r.yes}</b>/${r.n}</td><td>${r.pct == null ? "–" : r.pct + " %"}</td><td>${red(r.nos)}</td><td>${r.late ? `<b style="color:var(--wa)">${r.late}</b>` : 0}</td><td>${r.no}</td><td>${r.maybe}</td><td>${red(r.none)}</td>`;
const HEAD = (first) => `<tr><th>${first}</th><th>✅ Účast</th><th>%</th><th>🚫</th><th>⏰ Pozdě</th><th>❌</th><th>❓</th><th>Bez odp.</th></tr>`;

// ===== Vykreslení =====
export function attHtml() {
  const o = opts(), evs = pastEvents(attEvents(S.ev, S.ma), o.from, o.to, Date.now());
  // Hráčky: aktivní a zraněné vždy, ukončené jen s odpovědí v období; řazení jako v soupisce (brankářky, obránkyně, útočnice)
  const P = S.pl.filter(p => stOf(p) !== "end" || hasAnswer(evs, S.at, p.id)).sort((x, y) => pri(x) - pri(y) || x.name.localeCompare(y.name, "cs"));
  const T = [...S.tr].sort((x, y) => (x.name || "").localeCompare(y.name || "", "cs"));
  const sum = attSummary(evs, S.at, [...P.map(p => p.id), ...T.map(t => t.id)]), k = o.kind;
  const nOf = kk => evs.filter(e => kk === "all" || e.kind === kk).length;
  // Přepínač období a typu událostí
  const head = `<div class="cd"><h2>Docházka</h2><div class="mu" style="margin-bottom:8px">Uplynulé události v období ${range(o)}. Účast = odpověď „Jdu“; 🚫 nedorazila bez omluvy, ❓ nejistá a bez odpovědi (= nejde) se do účasti nepočítají. ⏰ Pozdě = odpověď nebo její změna až po termínu přihlášení – trenér pak nestihne připravit trénink.</div>
<div class="row" style="align-items:flex-end"><div style="flex:1"><label>Od</label><input type="date" id="atf" value="${o.from}"></div><div style="flex:1"><label>Do</label><input type="date" id="att" value="${o.to}"></div></div>
<button class="s w" id="ats" style="margin-top:6px">Tato sezóna (1. 8. – 1. 7.)</button>
<div class="chips" style="margin-top:10px">${ATT_KINDS.map(([kk, t]) => `<button class="chip ${k === kk ? "on" : ""}" data-atk="${kk}">${KIND_ICON[kk]} ${t} (${nOf(kk)})</button>`).join("")}</div></div>`;
  // Dlužníci (bez částek): seznam od nejdelšího, nebo upozornění na nepublikovaná pravidla
  const dl = debtorList();
  const debtH = S.dtErr
    ? `<div class="cd mu">Značku dlužníků se nepodařilo načíst (${esc(S.dtErr)}). Správce: publikovat firestore.rules a v ⚙️ spustit „Přepočítat dlužníky“.</div>`
    : dl.length ? `<div class="cd"><h2>⛓ Po splatnosti</h2><div class="mu" style="margin-bottom:6px">⛓ přihlášení „Jdu“ zablokováno · 🔓 výjimka. Bez částek, dny od nejstarší splatnosti.</div>${dl.map(x => `<div class="pr"><div>${pn(x.id)}</div><div>${debtTag(x.id)}</div></div>`).join("")}</div>` : "";
  // Tabulky: hráčky a realizační tým zvlášť (řazení klepnutím na hlavičku – core/table-sort.js)
  const plRows = P.map(p => `<tr><td>${pn(p.id)}${debtTag(p.id)}</td>${cells(sum[p.id][k])}</tr>`).join("");
  const trRows = T.map(t => `<tr><td>🎓 ${esc(t.name || "?")}</td>${cells(sum[t.id][k])}</tr>`).join("");
  const empty = !evs.some(e => k === "all" || e.kind === k);
  const body = empty ? '<div class="msg">V tomto období zatím žádná uplynulá událost tohoto typu.</div>'
    : `<div class="cd"><h2>Hráčky</h2>${P.length ? `<div class="tw"><table class="sortable" style="min-width:440px">${HEAD("Hráčka")}${plRows}</table></div>` : '<div class="msg">Žádné hráčky.</div>'}</div>
${T.length ? `<div class="cd"><h2>Realizační tým</h2><div class="tw"><table class="sortable" style="min-width:440px">${HEAD("Člen")}${trRows}</table></div></div>` : ""}`;
  return head + debtH + body;
}

// ===== Eventy =====
export function bindAtt(a) {
  const o = opts(), f = a.querySelector("#atf"), t = a.querySelector("#att"), s = a.querySelector("#ats");
  // Změna období: prázdné / neplatné datum se ignoruje; prohozené meze se srovnají
  const setRange = () => {
    const x = f.value, y = t.value;
    if (!isDayStr(x) || !isDayStr(y)) return;
    o.from = x <= y ? x : y; o.to = x <= y ? y : x;
    render();
  };
  if (f) f.onchange = setRange;
  if (t) t.onchange = setRange;
  if (s) s.onclick = () => { Object.assign(o, seasonOf(td())); render(); };
  a.querySelectorAll("[data-atk]").forEach(b => b.onclick = () => { o.kind = b.dataset.atk; render(); });
}
