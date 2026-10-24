/* ⚙️ → 🔐 Práva rolí: přehled „kdo co smí“ (všichni členové kromě hostující) a editor matice pro managera.
   Editor mění jen upravitelné buňky (domain/permissions.js EDITABLE); pevné buňky jsou jen vidět se zámkem 🔒.
   Před uložením náhled „Co se změní“, uložení potvrzením druhým klepnutím (arm2 z okna ⚙️), „Výchozí hodnoty“ jen připraví návrh.
   Data a zápis přes HK.cfg (permState, savePerms); manager smí vše a jeho práva nejdou omezit, pokladna je pevně podle příznaku 💰.
   Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Vykreslení -> Eventy -> Exporty. */

// ===== Importy =====
import {esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {ACTIONS, MATRIX_ROLES, MODULES, ROLE_LABELS, isEditable, permDiff, permDiffText, permGrid, permOf, permOverview} from "../domain/permissions.js";

// ===== Konstanty a stav =====
const LETTER = {r: "Č", e: "U", c: "R", d: "M"};      // zkratky akcí v tabulkách (Číst, Upravovat, Rušit, Mazat)
const ACT_KEYS = Object.keys(ACTIONS);
let wr = "trener";                                    // role vybraná v editoru
let work = null;                                      // rozpracovaná matice editoru (permGrid), null = podle uložené

// ===== Pomocné funkce =====
const C = () => HK.cfg;
const legend = () => `<div class="mu" style="margin:6px 0">${ACT_KEYS.map(a => `<b>${LETTER[a]}</b> = ${esc(ACTIONS[a])}`).join(" · ")}</div>`;
const lettersOf = acts => acts.length ? acts.map(a => LETTER[a]).join(" ") : "—";
// Stav do záhlaví sbalené sekce
function permStatus() { const s = C().permState(); return s.set && permDiff({}, s.perms).length ? "upraveno (" + permDiff({}, s.perms).length + ")" : "výchozí"; }

// ===== Vykreslení =====
// Přehled „kdo co smí“ podle platné matice (sloupce Manager, Trenér, Asistent, Hráčka)
function overviewHtml(perms) {
  const cols = ["manager", ...MATRIX_ROLES];
  const rows = permOverview(perms).map(o => `<tr><td>${esc(o.label)}</td>${cols.map(r => `<td style="white-space:nowrap">${lettersOf(o.roles[r])}</td>`).join("")}</tr>`).join("");
  return `<h3 style="margin-top:4px">Kdo co smí</h3>${legend()}<div class="tw"><table style="min-width:420px"><tr><th>Modul</th>${cols.map(r => `<th>${esc(ROLE_LABELS[r])}</th>`).join("")}</tr>${rows}</table></div>
<div class="mu" style="margin-top:6px">💰 <b>Pokladna</b> (předpisy, úhrady, vyúčtování, platy, rozpočet) je pevně podle příznaku Pokladník – manager je správce pokladny vždy. <b>Hostující</b> vidí jen vlastní data a formace událostí, kde má „Jdu“. Vlastní odpověď, Moje platby, žádosti a nepřítomnost má každý člen vždy.</div>`;
}
// Buňka editoru: upravitelná = přepínač, pevná = hodnota se zámkem, akce, kterou modul nemá = prázdná
function cellHtml(r, m, a, perms) {
  if (!MODULES[m].acts.includes(a)) return "<td></td>";
  if (!isEditable(r, m, a)) return `<td class="mu">${permOf(r, m, a, perms) ? "✓" : "—"}🔒</td>`;
  const on = !!(work[r][m] && work[r][m][a]);
  return `<td><button class="chip${on ? " on" : ""}" data-pc="${r}|${m}|${a}" style="min-width:44px" aria-label="${esc(ACTIONS[a])}">${on ? "✓" : "✕"}</button></td>`;
}
// Editor matice (jen manager): výběr role, tabulka modulů × akcí, náhled změn, uložení a výchozí hodnoty
function editorHtml(st) {
  const diff = permDiff(st.perms, work);
  const chips = MATRIX_ROLES.map(r => `<button class="chip${wr === r ? " on" : ""}" data-pr="${r}">${esc(ROLE_LABELS[r])}</button>`).join("");
  const rows = Object.keys(MODULES).map(m => `<tr><td>${esc(MODULES[m].label)}</td>${ACT_KEYS.map(a => cellHtml(wr, m, a, st.perms)).join("")}</tr>`).join("");
  const prev = diff.length ? diff.map(d => esc(permDiffText(d))).join("<br>") : "Žádná změna oproti uloženým právům.";
  return `<h3 style="margin-top:14px">✏️ Upravit práva role</h3><div class="mu" style="margin-bottom:6px">Klepnutím na ✓ / ✕ právo přidáš nebo odebereš. 🔒 = pevné právo (zatím nejde měnit). Změna se projeví po uložení; seznamy dat se u ostatních načtou podle nových práv po Načíst novou verzi.</div>
<div class="chips">${chips}</div><div class="tw"><table style="min-width:360px"><tr><th>Modul</th>${ACT_KEYS.map(a => `<th>${LETTER[a]}</th>`).join("")}</tr>${rows}</table></div>
<div class="mu" style="margin:8px 0"><b>Co se změní:</b><br>${prev}</div>
<button class="p w" id="cps"${diff.length ? "" : " disabled"}>💾 Uložit práva${diff.length ? " (" + diff.length + ")" : ""}</button>
<button class="s w" id="cpd" style="margin-top:8px">↩ Výchozí hodnoty (návrh – uloží se až tlačítkem Uložit)</button>
<div class="mu" style="margin-top:6px">${st.set && st.by ? "Naposledy změnil " + esc(st.by) + (st.at ? " · " + esc(st.at.slice(0, 16).replace("T", " ")) : "") : "Platí výchozí práva (matice zatím nebyla uložena)."}</div>`;
}
// Vykreslí obsah sekce do #cpm; arm2 = potvrzení druhým klepnutím z okna ⚙️
function renderPerm(el, arm2) {
  const box = el.querySelector("#cpm");
  if (!box) return;
  const st = C().permState();
  if (st.edit && !work) work = permGrid(st.perms);
  box.innerHTML = overviewHtml(st.perms) + (st.edit ? editorHtml(st) : "");
  if (st.edit) bindEditor(el, box, st, arm2);
}

// ===== Eventy =====
function bindEditor(el, box, st, arm2) {
  box.querySelectorAll("[data-pr]").forEach(b => b.onclick = () => { wr = b.dataset.pr; renderPerm(el, arm2); });
  box.querySelectorAll("[data-pc]").forEach(b => b.onclick = () => {
    const [r, m, a] = b.dataset.pc.split("|");
    if (!isEditable(r, m, a)) return;
    work[r][m][a] = !work[r][m][a];
    renderPerm(el, arm2);
  });
  box.querySelector("#cpd").onclick = () => { work = permGrid({}); renderPerm(el, arm2); };
  const sv = box.querySelector("#cps");
  if (sv && !sv.disabled) sv.onclick = () => arm2(sv, "perm", "Opravdu uložit práva? Klepni znovu", async () => {
    const n = permDiff(st.perms, work).length;
    if (!(await C().savePerms(work))) return;
    toast("Práva rolí uložena (" + n + " změn)");
    work = null;
    setTimeout(() => renderPerm(el, arm2), 300);   // počká na snapshot settings/perm
  });
}
// Při otevření okna ⚙️ začíná editor od uložené matice
const resetPermWork = () => { work = null; wr = "trener"; };

// ===== Exporty =====
export {permStatus, renderPerm, resetPermWork, overviewHtml};
