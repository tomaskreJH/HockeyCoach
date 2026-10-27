// ⚠️ Team → 💰 Platby → ☑ Hromadně (správce pokladny): potvrzení více úhrad najednou. 🏦 Načtený výpis z banky (CSV) se spáruje
// s předpisy (domain/bank-match.js) – přesné shody se předvyberou, ostatní jsou k ruční kontrole; pod tím ruční výběr nezaplacených
// předpisů po událostech. ✅ Zapsat = payMany (payments.js), potvrzení druhým klepnutím. Pohyb z výpisu nese značku bt (bez dvojího zápisu).
// Dva účty: volí se účet výpisu (platby se nesmí slučovat). ⚙ Sloupce výpisu: ruční přiřazení uložené v settings/cash bank[účet].
// Datum platby: z výpisu, u ručního výběru volitelné. Přeplatek vybraného páru a nespárovaná příchozí platba (➕) se zapíšou jako příjem.
// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {pl, pn, pri} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, fd, td, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {ACC, accIban, accName, accOf, cashCfg, isDay, chargeMsg, contribEvent, contribYm, fmtDue, kc, overdue, personVs, r2, restOf, twoAcc} from "../domain/cash.js";
import {colKey, mapDoc, matchStatement, readStatement} from "../domain/bank-match.js";
import {payMany} from "./payments.js";
import {render} from "./shell.js";

// ===== Stav (jen pro tuto obrazovku) =====
// acc = účet výpisu (main / op), stm = načtený výpis {file, text, hi (ruční řádek záhlaví), map (ruční přiřazení), open (⚙ Sloupce), res, m},
// sp = vybrané páry výpisu (index), sc = ručně vybrané předpisy (cid)
let acc = "main", stm = null;
const sp = new Set(), sc = new Set();
let md = null;               // datum platby ručně vybraných předpisů (prázdné = dnešek)
const local = new Set();     // značky pohybů výpisu zapsaných v této obrazovce (než se vrátí přes odběr dat)
const HOW = {vs: "VS předpisu", osoba: "osobní VS – souhrnná platba", "zpráva": "číslo ve zprávě – zkontroluj"};
// Pole přiřazení sloupců v ⚙ Sloupce výpisu
const FIELDS = [["amt", "Částka (povinné)"], ["vs", "Variabilní symbol"], ["date", "Datum"], ["name", "Plátce / název protiúčtu"], ["msg", "Zpráva pro příjemce"], ["ref", "Id pohybu"]];

// ===== Pomocné funkce =====
const icon = e => (e && e.type === "match" ? "🆚" : e && e.type === "contrib" ? "📅" : "🏒");
// Nezaplacené předpisy hráček na zvoleném účtu (při jednom účtu všechny)
function openCharges(cfg) {
  const two = twoAcc(cfg), ib = accIban(cfg, acc);
  return S.ch.filter(x => restOf(x) > 0 && pl(x.mid) && (!two || accIban(cfg, accOf(x, cfg)) === ib));
}
// Značky už zapsaných pohybů výpisu (pokladna)
const doneRefs = () => new Set([...(S.cs || []).map(m => m.bt).filter(Boolean), ...local]);
// Kategorie příjmu pro přeplatek a nespárovanou platbu: „Jiné příjmy“, jinak poslední kategorie příjmů
const otherCat = cfg => (cfg.cats.in.includes("Jiné příjmy") ? "Jiné příjmy" : cfg.cats.in[cfg.cats.in.length - 1] || "Jiné příjmy");
const who = () => { const u = HK.user(); return (u && u.email) || ""; };
// Příjem z výpisu bez předpisu (přeplatek, nespárovaná platba) – pohyb nese značku bt, aby se nezapsal dvakrát
function incomeOf(tx, amt, why, bt, cfg) {
  const note = [why, tx.name || "", tx.vs ? "VS " + tx.vs : "", tx.msg || ""].filter(Boolean).join(" · ").slice(0, 200);
  return {d: isDay(tx.date) ? tx.date : td(), k: "in", amt: r2(amt), cat: otherCat(cfg), note, acc: twoAcc(cfg) ? acc : "main", bt: String(bt), by: who()};
}
// Znovu spárovat načtený výpis (po změně účtu nebo po zápisu); přesné shody předvybrat
function rematch() {
  if (!stm) return;
  const cfg = cashCfg(S.cc);
  stm.m = matchStatement(stm.res.txs, openCharges(cfg), personVs, doneRefs());
  sp.clear();
  stm.m.pairs.forEach((p, i) => { if (p.exact) sp.add(i); });
}
// Uložené přiřazení sloupců pro účet výpisu
const savedMap = () => (S.cc && S.cc.bank && S.cc.bank[acc]) || null;
// Nové čtení výpisu (ruční / uložené přiřazení, řádek záhlaví) a párování
function reread() {
  if (!stm) return;
  stm.res = readStatement(stm.text, {map: stm.map || savedMap(), hi: stm.hi});
  stm.m = null;
  if (stm.res.txs.length) rematch(); else if (!stm.res.err) stm.res.err = "Ve výpisu nejsou žádné pohyby.";
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
  sc.forEach(cid => { if (!inPair.has(cid)) list.push({cid, amt: null, note: "hromadné potvrzení", d: isDay(md) ? md : td()}); });
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
// ⚙ Sloupce výpisu: řádek záhlaví, výběr sloupců (s ukázkou hodnoty z prvního řádku), uložení pro účet
function mapHtml() {
  const r = stm.res, H = r.head || [], s0 = (r.sample && r.sample[0]) || [], M = r.map || {}, saved = savedMap();
  const sel = (k, v) => `<select data-hmk="${k}" style="margin:0 0 6px">${k === "msg" ? `<option value="*" ${v === "*" ? "selected" : ""}>všechny textové (automaticky)</option>` : ""}<option value="" ${!v ? "selected" : ""}>— nic —</option>${H.map((h, i) => { const n = colKey(h); return n ? `<option value="${esc(n)}" ${v === n ? "selected" : ""}>${esc(h)}${s0[i] ? " – " + esc(String(s0[i]).slice(0, 30)) : ""}</option>` : ""; }).join("")}</select>`;
  const rows = (r.cand || []).map(c => `<option value="${c.i}" ${c.i === r.hi ? "selected" : ""}>${c.i + 1}. ${esc(c.label || "(prázdný)")}</option>`).join("");
  const on = armed("hmf" + acc);
  return `<div class="cd" style="margin:8px 0;border-style:dashed"><b>⚙ Sloupce výpisu</b><div class="mu" style="margin:4px 0 8px">Když banka změní formát, stačí sloupce jednou přiřadit a uložit – příště se použijí samy.</div>
<label>Řádek se záhlavím (názvy sloupců)</label><select data-hmh style="margin:0 0 6px">${rows}</select>
${FIELDS.map(([k, t]) => `<label>${esc(t)}</label>${sel(k, M[k] || "")}`).join("")}
<div class="row" style="margin-top:6px"><button class="p" data-hms ${M.amt ? "" : "disabled"} style="min-height:48px">💾 Uložit pro ${esc(twoAcc(cashCfg(S.cc)) ? accName(cashCfg(S.cc), acc).toLowerCase() : "účet týmu")}</button><button class="s" data-hmr style="min-height:48px">↺ Automaticky</button></div>
${saved ? `<button class="d w" data-hmf style="margin-top:8px;min-height:44px;${on ? "background:var(--no);color:#fff" : ""}">${on ? "Opravdu zapomenout? Klepni znovu" : "🗑 Zapomenout uložené sloupce"}</button>` : ""}</div>`;
}
// Stav přiřazení sloupců pod souhrnem výpisu
const mapTag = () => (stm.res.manual ? (stm.map ? "sloupce: ruční (neuložené)" : "sloupce: uložené pro účet") : "sloupce: automaticky");
// Výpis z banky: načtení, souhrn, páry ke kontrole, nespárované příjmy
function statementHtml(cfg) {
  const two = twoAcc(cfg);
  const accChips = two ? `<div class="mu" style="margin:6px 0 4px">Výpis je z účtu:</div><div class="chips">${Object.entries(ACC).map(([k, t]) => `<button class="chip ${acc === k ? "on" : ""}" data-hba="${k}">${esc(t)}</button>`).join("")}</div>` : "";
  const load = `<label class="p w" style="display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:10px;cursor:pointer;margin-top:8px">📥 Načíst výpis z banky (CSV)<input type="file" id="hbf" accept=".csv,.txt,text/csv" style="display:none"></label>`;
  if (!stm) return `<div class="cd"><h2>🏦 Výpis z banky</h2><div class="mu">V internetovém bankovnictví stáhni pohyby účtu jako <b>CSV</b> (např. za poslední měsíc) a načti je sem. Platby se spárují podle VS – přesné shody se rovnou vyberou, zbytek zkontroluješ.</div>${accChips}${load}</div>`;
  const {res, m} = stm;
  if (!m) return `<div class="cd"><h2>🏦 Výpis z banky</h2><div class="mu">${esc(stm.file)}</div><div style="color:var(--no)">${esc(res.err || "Výpis se nepodařilo přečíst.")}</div>${accChips}${mapHtml()}${load}<button class="s w" id="hbx" style="margin-top:10px;min-height:44px">✕ Zavřít výpis</button></div>`;
  const ex = m.pairs.filter(p => p.exact).length;
  const pairs = m.pairs.map((p, i) => {
    const on = sp.has(i), tags = [p.how !== "vs" ? `<span class="tag sh">${esc(HOW[p.how])}</span>` : "", p.over > 0 ? `<span class="tag sh">přeplatek ${kc(p.over)} → příjem</span>` : "", !p.exact && p.over <= 0 && p.how === "vs" ? '<span class="tag sh">částečná úhrada</span>' : ""].join(" ");
    return `<label class="pr" style="align-items:flex-start;cursor:pointer"><input type="checkbox" data-hp="${i}" ${on ? "checked" : ""} style="width:24px;height:24px;flex:none;margin:2px 8px 0 0"><div style="flex:1;min-width:0"><b>${kc(p.tx.amt)}</b> · ${p.tx.date ? fd(p.tx.date) : "bez data"}${p.tx.name ? " · " + esc(p.tx.name) : ""}${p.tx.vs ? " · VS " + esc(p.tx.vs) : ""} ${tags}
<div class="mu">${p.items.map(x => { const c = S.ch.find(y => y.id === x.cid); return `→ ${pn(x.mid)}: ${esc(c ? chargeMsg(c, S) : "")} · ${kc(x.amt)}`; }).join("<br>")}</div></div></label>`;
  }).join("");
  const loose = m.loose.length ? `<details style="margin-top:8px"><summary class="mu" style="min-height:40px;padding:8px 0;cursor:pointer">❓ Nespárované příchozí platby (${m.loose.length}) – zapiš ručně tlačítkem 💳, nebo ➕ jako příjem (${esc(otherCat(cfg))})</summary>${m.loose.map((t, i) => { const on = armed("hbl" + i); return `<div class="pr"><div><b>${kc(t.amt)}</b> · ${t.date ? fd(t.date) : "bez data"}${t.name ? " · " + esc(t.name) : ""}${t.vs ? " · VS " + esc(t.vs) : ""}<div class="mu">${esc(t.msg || "")}</div></div><button class="${on ? "d" : "s"}" data-hbl="${i}" style="flex:none;min-height:44px;${on ? "background:var(--no);color:#fff" : ""}">${on ? "Zapsat?" : "➕ Příjem"}</button></div>`; }).join("")}</details>` : "";
  return `<div class="cd"><h2>🏦 Výpis z banky${two ? " – " + esc(accName(cfg, acc)) : ""}</h2>
<div class="mu">${esc(stm.file)} · spárováno <b>${m.pairs.length}</b> (přesně ${ex}) · nespárováno ${m.loose.length}${m.seen.length ? ` · už zapsáno ${m.seen.length}` : ""}${m.out ? ` · výdaje ${m.out} (nepárují se)` : ""}</div>
${res.err ? `<div class="mu" style="color:var(--wa)">${esc(res.err)}</div>` : ""}${accChips}
<button class="chip ${stm.open ? "on" : ""}" data-hmo style="margin-top:6px">⚙ ${esc(mapTag())}</button>${stm.open ? mapHtml() : ""}
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
<label>Datum platby</label><input id="hbd" type="date" value="${esc(isDay(md) ? md : td())}" max="${td()}" style="max-width:220px">
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
    const cfg = cashCfg(S.cc), overs = [];
    if (stm && stm.m) sp.forEach(i => { const p = stm.m.pairs[i]; if (p && p.over > 0) overs.push(incomeOf(p.tx, p.over, "přeplatek z výpisu", p.tx.ref + "#p", cfg)); });
    const n = payMany(toWrite());
    if (overs.length) { const b = S.db.batch(); overs.forEach(o => b.set("cash/" + uid(), o)); b.commit(); }
    sp.clear(); sc.clear(); stm = null;
    toast((n ? "Zapsáno úhrad: " + n : "Nic k zápisu – předpisy už jsou zaplacené") + (overs.length ? ", přeplatky jako příjem: " + overs.length : ""));
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
  a.querySelectorAll("[data-hba]").forEach(b => b.onclick = () => { acc = b.dataset.hba; sc.clear(); if (stm) { stm.map = null; stm.hi = null; reread(); } render(); });
  // Načtení výpisu (CSV) – UTF-8 nebo windows-1250
  const f = a.querySelector("#hbf");
  if (f) f.onchange = () => {
    const file = f.files && f.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      stm = {file: file.name, text: decode(new Uint8Array(rd.result)), hi: null, map: null, open: false, res: null, m: null};
      reread();
      render();
    };
    rd.onerror = () => toast("Soubor se nepodařilo přečíst");
    rd.readAsArrayBuffer(file);
  };
  // ⚙ Sloupce výpisu: otevřít / zavřít, řádek záhlaví, sloupec, uložit pro účet, automaticky, zapomenout uložené
  a.querySelectorAll("[data-hmo]").forEach(b => b.onclick = () => { stm.open = !stm.open; render(); });
  a.querySelectorAll("[data-hmh]").forEach(b => b.onchange = () => { stm.hi = +b.value; stm.map = null; stm.open = true; reread(); render(); });
  a.querySelectorAll("[data-hmk]").forEach(b => b.onchange = () => { stm.map = {...(stm.res.map || {}), [b.dataset.hmk]: b.value}; stm.open = true; reread(); render(); });
  a.querySelectorAll("[data-hms]").forEach(b => b.onclick = () => {
    const d = mapDoc(stm.res.map);
    if (!d) return;
    S.db.doc("settings/cash").merge({bank: {...((S.cc && S.cc.bank) || {}), [acc]: d}}).then(() => toast("Sloupce výpisu uloženy"));
    stm.map = null; stm.open = false;
    render();
  });
  a.querySelectorAll("[data-hmr]").forEach(b => b.onclick = () => { stm.map = null; stm.hi = null; reread(); render(); });
  a.querySelectorAll("[data-hmf]").forEach(b => b.onclick = () => confirm2("hmf" + acc, () => {
    const bank = {...((S.cc && S.cc.bank) || {})};
    delete bank[acc];
    S.db.doc("settings/cash").merge({bank}).then(() => toast("Uložené sloupce zapomenuty"));
  }));
  const x = a.querySelector("#hbx");
  if (x) x.onclick = () => { stm = null; sp.clear(); render(); };
  // Páry výpisu: zaškrtnutí, vybrat vše / zrušit
  a.querySelectorAll("[data-hp]").forEach(b => b.onchange = () => { const i = +b.dataset.hp; if (b.checked) sp.add(i); else sp.delete(i); render(); });
  a.querySelectorAll("[data-hpa]").forEach(b => b.onclick = () => { sp.clear(); if (b.dataset.hpa === "1" && stm && stm.m) stm.m.pairs.forEach((p, i) => sp.add(i)); render(); });
  // Ruční výběr: datum platby (bez překreslení)
  const dd = a.querySelector("#hbd");
  if (dd) dd.onchange = () => { md = dd.value; };
  // ➕ Nespárovaná příchozí platba jako příjem (druhým klepnutím); značka bt zabrání dvojímu zápisu
  a.querySelectorAll("[data-hbl]").forEach(b => b.onclick = () => confirm2("hbl" + b.dataset.hbl, () => {
    const t = stm && stm.m && stm.m.loose[+b.dataset.hbl];
    if (!t) return;
    S.db.doc("cash/" + uid()).set(incomeOf(t, t.amt, "výpis", t.ref, cashCfg(S.cc))).catch(() => toast("Uložení se nepovedlo"));
    local.add(t.ref);
    stm.m.loose = stm.m.loose.filter(x => x !== t); stm.m.seen.push(t);   // výběr párů zůstane beze změny
    toast("Příjem zapsán");
    render();
  }));
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
