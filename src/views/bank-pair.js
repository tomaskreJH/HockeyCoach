// ⚠️ Team → 💰 Platby → ☑ Hromadně (správce pokladny): potvrzení více úhrad najednou. 🏦 Načtený výpis z banky (CSV) se spáruje
// s předpisy (domain/bank-match.js) – přesné shody se předvyberou, ostatní jsou k ruční kontrole; pod tím ruční výběr nezaplacených
// předpisů po událostech. ✅ Zapsat = payMany (payments.js), potvrzení druhým klepnutím. Pohyb z výpisu nese značku bt (bez dvojího zápisu).
// Při dvou účtech se volí účet výpisu – páruje se jen s předpisy na tento účet (platby na různé účty se nesmí slučovat).
// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {pl, pn, pri} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, fd, td, toast} from "../core/utils.js";
import {ACC, accIban, accName, accOf, cashCfg, chargeMsg, contribEvent, contribYm, fmtDue, kc, overdue, personVs, r2, restOf, twoAcc} from "../domain/cash.js";
import {matchStatement, readStatement} from "../domain/bank-match.js";
import {payMany} from "./payments.js";
import {render} from "./shell.js";

// ===== Stav (jen pro tuto obrazovku) =====
// acc = účet výpisu (main / op), stm = načtený výpis {file, res, m}, sp = vybrané páry výpisu (index), sc = ručně vybrané předpisy (cid)
let acc = "main", stm = null;
const sp = new Set(), sc = new Set();
const HOW = {vs: "VS předpisu", osoba: "osobní VS – souhrnná platba", "zpráva": "číslo ve zprávě – zkontroluj"};

// ===== Pomocné funkce =====
const icon = e => (e && e.type === "match" ? "🆚" : e && e.type === "contrib" ? "📅" : "🏒");
// Nezaplacené předpisy hráček na zvoleném účtu (při jednom účtu všechny)
function openCharges(cfg) {
  const two = twoAcc(cfg), ib = accIban(cfg, acc);
  return S.ch.filter(x => restOf(x) > 0 && pl(x.mid) && (!two || accIban(cfg, accOf(x, cfg)) === ib));
}
// Značky už zapsaných pohybů výpisu (pokladna)
const doneRefs = () => new Set((S.cs || []).map(m => m.bt).filter(Boolean));
// Znovu spárovat načtený výpis (po změně účtu nebo po zápisu); přesné shody předvybrat
function rematch() {
  if (!stm) return;
  const cfg = cashCfg(S.cc);
  stm.m = matchStatement(stm.res.txs, openCharges(cfg), personVs, doneRefs());
  sp.clear();
  stm.m.pairs.forEach((p, i) => { if (p.exact) sp.add(i); });
}
// Předpisy obsažené ve vybraných párech výpisu (ruční výběr je u nich zablokovaný)
function pairCids() {
  const out = new Set();
  if (stm && stm.m) sp.forEach(i => { const p = stm.m.pairs[i]; if (p) p.items.forEach(x => out.add(x.cid)); });
  return out;
}
// Seznam k zápisu: páry výpisu (částky z výpisu, datum platby, značka bt) + ručně vybrané předpisy (celý zbytek)
function toWrite() {
  const list = [], inPair = pairCids();
  if (stm && stm.m) sp.forEach(i => {
    const p = stm.m.pairs[i];
    if (!p) return;
    const note = ["výpis" + (p.tx.name ? " " + p.tx.name : ""), p.how === "osoba" ? "souhrnná platba VS " + p.tx.vs : ""].filter(Boolean).join(" · ");
    p.items.forEach(x => list.push({cid: x.cid, amt: x.amt, note, d: p.tx.date || td(), bt: p.tx.ref}));
  });
  sc.forEach(cid => { if (!inPair.has(cid)) list.push({cid, amt: null, note: "hromadné potvrzení"}); });
  return list;
}
// Součet k zápisu (ručně vybrané = celý zbytek předpisu)
function totalOf(list) {
  return r2(list.reduce((s, o) => { const x = S.ch.find(c => c.id === o.cid); return s + (o.amt == null ? (x ? restOf(x) : 0) : o.amt); }, 0));
}
// Text CSV z bajtů: UTF-8, jinak windows-1250 (starší exporty českých bank)
function decode(buf) {
  try { return new TextDecoder("utf-8", {fatal: true}).decode(buf); } catch (e) { /* není UTF-8 */ }
  try { return new TextDecoder("windows-1250").decode(buf); } catch (e) { return new TextDecoder().decode(buf); }
}

// ===== Vykreslení =====
// Výpis z banky: načtení, souhrn, páry ke kontrole, nespárované příjmy
function statementHtml(cfg) {
  const two = twoAcc(cfg);
  const accChips = two ? `<div class="mu" style="margin:6px 0 4px">Výpis je z účtu:</div><div class="chips">${Object.entries(ACC).map(([k, t]) => `<button class="chip ${acc === k ? "on" : ""}" data-hba="${k}">${esc(t)}</button>`).join("")}</div>` : "";
  const load = `<label class="p w" style="display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:10px;cursor:pointer;margin-top:8px">📥 Načíst výpis z banky (CSV)<input type="file" id="hbf" accept=".csv,.txt,text/csv" style="display:none"></label>`;
  if (!stm) return `<div class="cd"><h2>🏦 Výpis z banky</h2><div class="mu">V internetovém bankovnictví stáhni pohyby účtu jako <b>CSV</b> (např. za poslední měsíc) a načti je sem. Platby se spárují podle VS – přesné shody se rovnou vyberou, zbytek zkontroluješ.</div>${accChips}${load}</div>`;
  const {res, m} = stm;
  if (!m) return `<div class="cd"><h2>🏦 Výpis z banky</h2><div style="color:var(--no)">${esc(res.err || "Výpis se nepodařilo přečíst.")}</div>${res.head && res.head.length ? `<div class="mu" style="margin-top:6px">Sloupce v souboru: ${esc(res.head.slice(0, 20).join(" · "))}</div>` : ""}${accChips}${load}</div>`;
  const ex = m.pairs.filter(p => p.exact).length;
  const pairs = m.pairs.map((p, i) => {
    const on = sp.has(i), tags = [p.how !== "vs" ? `<span class="tag sh">${esc(HOW[p.how])}</span>` : "", p.over > 0 ? `<span class="tag sh">přeplatek ${kc(p.over)}</span>` : "", !p.exact && p.over <= 0 && p.how === "vs" ? '<span class="tag sh">částečná úhrada</span>' : ""].join(" ");
    return `<label class="pr" style="align-items:flex-start;cursor:pointer"><input type="checkbox" data-hp="${i}" ${on ? "checked" : ""} style="width:24px;height:24px;flex:none;margin:2px 8px 0 0"><div style="flex:1;min-width:0"><b>${kc(p.tx.amt)}</b> · ${p.tx.date ? fd(p.tx.date) : "bez data"}${p.tx.name ? " · " + esc(p.tx.name) : ""}${p.tx.vs ? " · VS " + esc(p.tx.vs) : ""} ${tags}
<div class="mu">${p.items.map(x => { const c = S.ch.find(y => y.id === x.cid); return `→ ${pn(x.mid)}: ${esc(c ? chargeMsg(c, S) : "")} · ${kc(x.amt)}`; }).join("<br>")}</div></div></label>`;
  }).join("");
  const loose = m.loose.length ? `<details style="margin-top:8px"><summary class="mu" style="min-height:40px;padding:8px 0;cursor:pointer">❓ Nespárované příchozí platby (${m.loose.length}) – zapiš ručně tlačítkem 💳 nebo jako vklad</summary>${m.loose.map(t => `<div class="pr"><div><b>${kc(t.amt)}</b> · ${t.date ? fd(t.date) : "bez data"}${t.name ? " · " + esc(t.name) : ""}${t.vs ? " · VS " + esc(t.vs) : ""}<div class="mu">${esc(t.msg || "")}</div></div></div>`).join("")}</details>` : "";
  return `<div class="cd"><h2>🏦 Výpis z banky${two ? " – " + esc(accName(cfg, acc)) : ""}</h2>
<div class="mu">${esc(stm.file)} · spárováno <b>${m.pairs.length}</b> (přesně ${ex}) · nespárováno ${m.loose.length}${m.seen.length ? ` · už zapsáno ${m.seen.length}` : ""}${m.out ? ` · výdaje ${m.out} (nepárují se)` : ""}</div>
${res.err ? `<div class="mu" style="color:var(--wa)">${esc(res.err)}</div>` : ""}${accChips}
${pairs ? `<div class="chips" style="margin:8px 0"><button class="chip" data-hpa="1">Vybrat vše</button><button class="chip" data-hpa="0">Zrušit výběr</button></div>${pairs}` : '<div class="msg" style="margin-top:8px">Žádná platba z výpisu nesedí na nezaplacený předpis.</div>'}${loose}
<button class="s w" id="hbx" style="margin-top:10px;min-height:44px">✕ Zavřít výpis</button></div>`;
}
// Ruční výběr: nezaplacené předpisy po událostech (nejnovější nahoře), hledání podle jména / události
function manualHtml(cfg, byId) {
  const inPair = pairCids(), G = new Map();
  openCharges(cfg).forEach(x => { if (!G.has(x.eid)) G.set(x.eid, []); G.get(x.eid).push(x); });
  const evOf = eid => byId[eid] || (contribYm(eid) ? contribEvent(contribYm(eid)) : {title: "Událost", date: ""});
  const groups = [...G.entries()].map(([eid, L]) => ({eid, e: evOf(eid), L})).sort((a, b) => String(b.e.date).localeCompare(String(a.e.date)));
  if (!groups.length) return '<div class="cd"><h2>☑ Ruční výběr</h2><div class="msg">Nikdo nedluží. 🎉</div></div>';
  const body = groups.map(({eid, e, L}) => {
    L.sort((a, b) => pri(pl(a.mid)) - pri(pl(b.mid)) || pl(a.mid).name.localeCompare(pl(b.mid).name, "cs"));
    const sum = r2(L.reduce((s, x) => s + restOf(x), 0)), q = (e.title || "").toLowerCase();
    return `<div class="hbg" data-q="${esc(q)}"><div class="it" style="cursor:default"><div><b>${icon(e)} ${esc(e.title)}</b><div class="mu">${e.type === "contrib" ? "měsíční příspěvek" : e.date ? fd(e.date) : ""} · nezaplaceno ${L.length}× · ${kc(sum)}</div></div><button class="chip" data-hge="${esc(eid)}" style="flex:none">Vybrat vše</button></div>
${L.map(x => { const lock = inPair.has(x.id); return `<label class="pr hbr" data-q="${esc((pl(x.mid).name || "").toLowerCase() + " " + q)}" style="cursor:pointer;${lock ? "opacity:.55" : ""}"><input type="checkbox" data-hc="${x.id}" ${sc.has(x.id) || lock ? "checked" : ""} ${lock ? "disabled" : ""} style="width:24px;height:24px;flex:none;margin-right:8px"><div style="flex:1;min-width:0">${pn(x.mid)}<div class="mu">VS ${esc(x.vs || "–")}${x.due ? " · splatnost " + fmtDue(x.due) : ""}${overdue(x) ? " · ⏰ po splatnosti" : ""}${lock ? " · z výpisu" : ""}</div></div><b style="flex:none">${kc(restOf(x))}</b></label>`; }).join("")}</div>`;
  }).join("");
  return `<div class="cd"><h2>☑ Ruční výběr</h2><div class="mu" style="margin-bottom:6px">Zaškrtni předpisy, které jsou zaplacené (celá částka), a dole je zapiš najednou.</div>
<input id="hbq" type="search" placeholder="🔍 Hledat hráčku nebo událost" style="margin-bottom:6px">${body}</div>`;
}
// Spodní lišta: počet a součet vybraných úhrad, zápis druhým klepnutím
function barInner() {
  const list = toWrite(), n = new Set(list.map(o => o.cid)).size, sum = totalOf(list), on = armed("hbpay");
  return `<button class="${on ? "d" : "p"} w" id="hbw" ${n ? "" : "disabled"} style="min-height:54px;font-size:17px;${on ? "background:var(--no);color:#fff" : ""}">${on ? `Zapsat úhrady: ${n}× (${kc(sum)})? Klepni znovu` : n ? `✅ Zapsat úhrady (${n}×, ${kc(sum)})` : "Vyber platby k zápisu"}</button>`;
}
const barHtml = () => `<div id="hbbar" style="position:sticky;bottom:0;z-index:5;background:var(--bg);padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--bd)">${barInner()}</div>`;
// Celý režim ☑ Hromadně; byId = události podle id (z finance.js)
export function bulkHtml(byId) {
  const cfg = cashCfg(S.cc);
  if (!twoAcc(cfg)) acc = "main";
  return statementHtml(cfg) + manualHtml(cfg, byId || {}) + barHtml();
}

// ===== Eventy =====
// Lišta zápisu: ✅ Zapsat druhým klepnutím; po zápisu se výběr i výpis vyprázdní (stav předpisů přijde přes odběr dat)
function bindBar(a) {
  const w = a.querySelector("#hbw");
  if (w) w.onclick = () => confirm2("hbpay", () => {
    const n = payMany(toWrite());
    sp.clear(); sc.clear(); stm = null;
    toast(n ? "Zapsáno úhrad: " + n : "Nic k zápisu – předpisy už jsou zaplacené");
  });
}
// Obnova jen lišty (ruční zaškrtnutí – bez překreslení stránky, nic neposkočí)
function refreshBar(a) {
  const e = a.querySelector("#hbbar");
  if (!e) return;
  e.innerHTML = barInner();
  bindBar(a);
}
export function bindBulk(a) {
  // Volba účtu výpisu: nové párování a ruční výběr jen pro tento účet
  a.querySelectorAll("[data-hba]").forEach(b => b.onclick = () => { acc = b.dataset.hba; sc.clear(); rematch(); render(); });
  // Načtení výpisu (CSV) – UTF-8 nebo windows-1250
  const f = a.querySelector("#hbf");
  if (f) f.onchange = () => {
    const file = f.files && f.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      const res = readStatement(decode(new Uint8Array(rd.result)));
      stm = {file: file.name, res, m: null};
      if (res.txs.length) rematch(); else if (!res.err) res.err = "Ve výpisu nejsou žádné pohyby.";
      render();
    };
    rd.onerror = () => toast("Soubor se nepodařilo přečíst");
    rd.readAsArrayBuffer(file);
  };
  const x = a.querySelector("#hbx");
  if (x) x.onclick = () => { stm = null; sp.clear(); render(); };
  // Páry výpisu: zaškrtnutí, vybrat vše / zrušit
  a.querySelectorAll("[data-hp]").forEach(b => b.onchange = () => { const i = +b.dataset.hp; if (b.checked) sp.add(i); else sp.delete(i); render(); });
  a.querySelectorAll("[data-hpa]").forEach(b => b.onclick = () => { sp.clear(); if (b.dataset.hpa === "1" && stm && stm.m) stm.m.pairs.forEach((p, i) => sp.add(i)); render(); });
  // Ruční výběr: předpis, celá událost
  a.querySelectorAll("[data-hc]").forEach(b => b.onchange = () => { if (b.checked) sc.add(b.dataset.hc); else sc.delete(b.dataset.hc); refreshBar(a); });
  a.querySelectorAll("[data-hge]").forEach(b => b.onclick = () => {
    const inPair = pairCids(), L = openCharges(cashCfg(S.cc)).filter(c => c.eid === b.dataset.hge && !inPair.has(c.id)), all = L.every(c => sc.has(c.id));
    L.forEach(c => { if (all) sc.delete(c.id); else sc.add(c.id); });
    a.querySelectorAll("[data-hc]").forEach(i => { if (!i.disabled) i.checked = sc.has(i.dataset.hc); });
    refreshBar(a);
  });
  // Hledání bez překreslení (zůstane fokus a klávesnice): skryje řádky a prázdné události
  const q = a.querySelector("#hbq");
  if (q) q.oninput = () => {
    const t = q.value.trim().toLowerCase();
    a.querySelectorAll(".hbg").forEach(g => {
      let any = false;
      g.querySelectorAll(".hbr").forEach(r => { const ok = !t || r.dataset.q.includes(t); r.style.display = ok ? "" : "none"; any = any || ok; });
      g.style.display = any ? "" : "none";
    });
  };
  bindBar(a);
}
