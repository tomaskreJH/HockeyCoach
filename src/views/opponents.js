// Soupeři a vzájemné zápasy.
// Struktura: Importy -> Pomocné funkce -> Vzájemné zápasy (h2h, i pro kartu zápasu) -> Seznam soupeřů -> Detail soupeře -> Eventy.
// Záložku Soupeři vidí všichni členové týmu (hráčky jen ke čtení – bez přidávání, přejmenování a mazání).
// Seznam ukazuje rovnou bilanci se soupeřem (V–R–P, skóre, počet zápasů). V detailu je seznam uzavřených zápasů;
// klepnutím na zápas se otevře zápis utkání s kompletním vývojem zápasu (renderReport s id zápasu v S.rp).

// ===== Importy =====
import {confirm2, ensureOp, save} from "../core/actions.js";
import {pn, score, matchesVs} from "../core/selectors.js";
import {S} from "../core/state.js";
import {$, clone, esc, fd, norm, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {renderReport} from "./report.js";
import {render} from "./shell.js";

// ===== Pomocné funkce =====
// Správu soupeřů (přidat, přejmenovat, smazat) má jen trenér a kustod
const canEdit = () => HK.isStaff();
// Bilance uzavřených zápasů se soupeřem: výhry, remízy, prohry, góly
function balance(L) {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  L.forEach(x => { const [g, o] = score(x); gf += g; ga += o; if (g > o) w++; else if (g < o) l++; else d++; });
  return {w, d, l, gf, ga, n: L.length};
}
// Výsledek zápasu z našeho pohledu pro štítek (V / R / P)
const res = (g, o) => (g > o ? '<span class="tag pp">V</span>' : g < o ? '<span class="tag red">P</span>' : '<span class="tag sh">R</span>');

// ===== Vzájemné zápasy (detail soupeře i karta zápasu) =====
// Řádky „Předchozí zápasy“ mají data-rpm = id zápasu; klepnutí obslouží bindH2h (otevře zápis utkání s vývojem zápasu).
export function h2h(name, ex, title) {
  const L = matchesVs(name, ex);
  if (!L.length) return `<h2>${title}</h2><div class="mu">Zatím žádný uzavřený zápas s tímto soupeřem.</div>`;
  const B = balance(L), sc = {}, op = {};
  L.forEach(x => {
    (x.events || []).forEach(e => { if (e.k === "G" && e.team === "us") [["g", e.scorer], ["a", e.a1], ["a", e.a2]].forEach(([f, id]) => { if (id) { sc[id] = sc[id] || {g: 0, a: 0}; sc[id][f]++; } }); });
    (x.opr || []).forEach(r => { const k = norm(r.num) + "|" + norm(r.name), t = op[k] = op[k] || {num: r.num, name: r.name, g: 0, a: 0, pim: 0, n: 0}; t.g += +r.g || 0; t.a += +r.a || 0; t.pim += +r.pim || 0; t.n++; });
  });
  const top = Object.entries(sc).sort((x, y) => (y[1].g + y[1].a) - (x[1].g + x[1].a)).slice(0, 5), tp = Object.values(op).sort((x, y) => (y.g + y.a) - (x.g + x.a)).slice(0, 6);
  return `<h2>${title}</h2><div class="grid3"><div class="stat"><b>${B.w}-${B.d}-${B.l}</b>V–R–P</div><div class="stat"><b>${B.gf}:${B.ga}</b>skóre</div><div class="stat"><b>${B.n}</b>zápasů</div></div>
<h3>Předchozí zápasy</h3><div class="mu" style="margin-bottom:4px">Klepnutím otevřeš zápis utkání a kompletní vývoj zápasu.</div>${L.map(x => { const [g, o] = score(x); return `<div class="it" data-rpm="${x.id}"><div>${fd(x.date)} · ${x.home ? "doma" : "venku"}</div><div>${res(g, o)} <b>${g}:${o}</b> ›</div></div>`; }).join("")}
${top.length ? `<h3>Naše nejlepší proti nim</h3>${top.map(([id, t]) => `<div class="mu">${pn(id)} – ${t.g} G, ${t.a} A</div>`).join("")}` : ""}
${tp.length ? `<h3>Jejich hráčky ze statistik</h3>${tp.map(t => `<div class="mu">${t.num ? "#" + esc(t.num) + " " : ""}${esc(t.name || "")} – ${t.g} G, ${t.a} A, ${t.pim} TM (${t.n}×)</div>`).join("")}` : ""}`;
}
// Klepnutí na zápas ve „Předchozích zápasech“: zápis utkání s kompletním vývojem (jen ke čtení, i pro hráčky)
export function bindH2h(a) {
  a.querySelectorAll("[data-rpm]").forEach(b => b.onclick = () => { S.rp = b.dataset.rpm; renderReport(); });
}

// ===== Seznam soupeřů =====
export function oppsView(a) {
  if (S.oid) { const o = S.op.find(x => x.id === S.oid); if (o) return oppDetail(a, o); S.oid = null; }
  const l = [...S.op].sort((x, y) => x.name.localeCompare(y.name, "cs"));
  const add = canEdit() ? `<div class="cd"><h2>Přidat soupeře</h2><div class="row" style="flex-wrap:nowrap"><input id="oi" placeholder="Název soupeře" style="margin:0"><button class="p" id="oa" style="flex:none">Přidat</button></div></div>` : "";
  // Řádek soupeře: název a rovnou bilance (V–R–P, skóre); bez odehraného zápasu jen poznámka
  const row = o => {
    const B = balance(matchesVs(o.name));
    const info = B.n ? `<span class="mu" style="text-align:right"><b>${B.w}-${B.d}-${B.l}</b> V–R–P · <b>${B.gf}:${B.ga}</b> · ${B.n} ${B.n === 1 ? "zápas" : B.n < 5 ? "zápasy" : "zápasů"}</span>` : '<span class="mu">bez odehraného zápasu</span>';
    return `<div class="it" data-o="${o.id}"><b>${esc(o.name)}</b>${info}</div>`;
  };
  a.innerHTML = `${add}<div class="cd"><h2>Soupeři (${l.length})</h2>${l.length ? l.map(row).join("") : `<div class="msg">Zatím žádní soupeři.${canEdit() ? " Přidají se i automaticky při založení zápasu." : ""}</div>`}<div class="mu" style="margin-top:8px">Bilance je z uzavřených zápasů. Klepnutím na soupeře zobrazíš jednotlivé zápasy.</div></div>`;
  if (canEdit()) $("#oa").onclick = () => { const n = $("#oi").value.trim(); if (!n) return; ensureOp(n); };
  a.querySelectorAll("[data-o]").forEach(i => i.onclick = () => { S.oid = i.dataset.o; render(); });
}

// ===== Detail soupeře =====
function oppDetail(a, o) {
  const n = S.ma.filter(x => norm(x.opp) === norm(o.name)).length;
  const edit = canEdit() ? `<div class="cd"><label>Název soupeře</label><div class="row" style="flex-wrap:nowrap"><input id="rn2" value="${esc(o.name)}" style="margin:0"><button class="s" id="rs" style="flex:none">Přejmenovat</button></div></div>` : `<h2 style="margin:0 0 10px">${esc(o.name)}</h2>`;
  const del = canEdit() ? `<button class="d w" id="od" style="${S.cf === o.id ? "background:var(--no);color:#fff" : ""}">${n ? "Soupeř má zápasy – nelze smazat" : S.cf === o.id ? "Opravdu smazat? Klepni znovu" : "Smazat soupeře"}</button>` : "";
  a.innerHTML = `<button class="s" id="bk" style="margin-bottom:12px">← Soupeři</button>${edit}<div class="cd">${h2h(o.name, null, "Vzájemné zápasy")}</div>${del}`;

  // ===== Eventy =====
  $("#bk").onclick = () => { S.oid = null; render(); };
  bindH2h(a);
  if (!canEdit()) return;
  $("#rs").onclick = () => { const nn = $("#rn2").value.trim(); if (!nn) return; const old = o.name; S.db.doc("opponents/" + o.id).set({name: nn}); if (norm(nn) !== norm(old)) S.ma.filter(m => norm(m.opp) === norm(old)).forEach(m => save({...clone(m), opp: nn})); toast("Přejmenováno"); };
  $("#od").onclick = () => { if (n) return; confirm2(o.id, () => { S.db.doc("opponents/" + o.id).delete(); S.oid = null; }); };
}
