// Pokladna u události (trenér a pokladník): šablona, náklady, kdo platí, pokrytí nákladů, uzavření vyúčtování → snapshot + charges, ruční znovuotevření s auditem, úhrady předpisů.
// Struktura: Importy -> Pomocné funkce -> Uzavření vyúčtování (zápis) -> Úhrady -> Vykreslení -> Eventy -> Export.
// Data: pole události tpl, cost, who, due a settle (snapshot) v dokumentu události / zápasu; předpisy v kolekci charges ({eid}_{mid}); příjmy v cash; audit v audit.
// Uzavření i znovuotevření je JEDNA atomická dávka (dokument události + předpisy + audit). Po uzavření se NIKDY nic automaticky nepřepočítává.
// Celkový přehled dluhů je ve views/finance.js, pohyby pokladny ve views/cashbook.js.

// ===== Importy =====
import {strip} from "../core/actions.js";
import {goingOf, isG, pl, pn, pri} from "../core/selectors.js";
import {S} from "../core/state.js";
import {clone, esc, td, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {CAT_CONTRIB, CAT_EVENT, GRP, WHO, calcCash, cashCfg, defDue, evCash, fmtDue, grpKey, kc, overdue, payAmount, planCharges, r2, restOf} from "../domain/cash.js";
import {render} from "./shell.js";

// ===== Pomocné funkce =====
const who = () => { const u = HK.user(); return (u && u.email) || ""; };
export const evOfMatch = m => ({id: m.id, type: "match", raw: m});
// Přihlášené hráčky události bez brankářek (dělitel ceny)
const players = eid => goingOf(eid).map(id => pl(id)).filter(p => p && !isG(p));
const evPath = ev => (ev.type === "match" ? "matches/" : "events/") + ev.id;
const saveEv = (ev, raw) => S.db.doc(evPath(ev)).set(strip(raw)).catch(() => toast("Uložení se nepovedlo"));
const auditDoc = (eid, act, note) => ({ts: new Date().toISOString(), by: who(), eid, act, note: note || ""});
const dueDays = (cfg, tpl) => { const t = cfg.tpls[tpl]; return t && t.dueDays != null ? t.dueDays : cfg.due.ev; };
const byName = (a, b) => pri(pl(a.mid)) - pri(pl(b.mid)) || pl(a.mid).name.localeCompare(pl(b.mid).name, "cs");
// Rozpracovaná úprava (jen v paměti, dokud se neuloží)
let dr = null;
function draft(ev, cfg) {
  if (!dr || dr.eid !== ev.id) dr = {eid: ev.id, ...evCash(ev, cfg)};
  return dr;
}
const applyDraft = raw => {
  raw.tpl = dr.tpl; raw.cost = clone(dr.cost).filter(x => +x.amt > 0); raw.who = clone(dr.who);
  if (dr.due) raw.due = dr.due; else delete raw.due;
};

// ===== Uzavření vyúčtování (zápis) =====
// Zapíše snapshot do raw a v JEDNÉ dávce uloží dokument události, předpisy a audit. Vrací výpočet, nebo null (nic se nestalo).
// force=false (automatické uzavření zápasu): bez předpisů se nic nezapíše; stávající snapshot se nikdy nepřepisuje.
// Volající (matches.js) po návratu ještě ukládá zápas sám – stejná data, zápis je idempotentní.
export function settleEvent(ev, raw, force) {
  if (!HK.isCash() || raw.settle) return null;
  const cfg = cashCfg(S.cc), c = evCash({...ev, raw}, cfg), k = calcCash(c, players(ev.id));
  if (!force && !k.payers.length) return null;
  const due = c.due || defDue(raw.date, dueDays(cfg, c.tpl));
  raw.tpl = c.tpl; raw.cost = c.cost; raw.who = c.who;
  if (c.due) raw.due = c.due; else delete raw.due;
  raw.settle = {at: new Date().toISOString(), by: who(), tpl: c.tpl, cost: c.cost, who: c.who, due, n: k.N, total: k.total, collect: k.collect, lines: k.payers};
  const have = {};
  S.ch.filter(x => x.eid === ev.id && x.kind === "event").forEach(x => { have[x.mid] = x; });
  const plan = planCharges(ev.id, k, due, have), b = S.db.batch();
  b.set(evPath(ev), strip(raw));
  plan.set.forEach(x => b.set("charges/" + x.id, x.d));
  plan.del.forEach(id => b.delete("charges/" + id));
  b.set("audit/" + uid(), auditDoc(ev.id, "close", k.payers.length + " předpisů, vybereme " + kc(k.collect) + " z " + kc(k.total)));
  b.commit();
  return k;
}

// ===== Úhrady =====
// Zámek proti dvojímu klepnutí (než se změna vrátí přes odběr dat)
const busy = new Set();
// Úhrada předpisu (částečná i plná; amt prázdné = celý zbytek): příjem do pokladny + nová zaplacená částka v jedné dávce
export function payCharge(cid, amt) {
  const x = S.ch.find(c => c.id === cid);
  if (!x || busy.has(cid)) return false;
  const rest = restOf(x), a = amt == null ? rest : r2(amt);
  if (rest <= 0 || !(a > 0) || a > rest + 1e-9) return false;
  busy.add(cid);
  setTimeout(() => busy.delete(cid), 2000);
  const d = {...strip(x), paid: r2((+x.paid || 0) + a)};
  S.db.batch()
    .set("cash/" + uid(), {d: td(), k: "in", amt: a, cat: x.kind === "contrib" ? CAT_CONTRIB : CAT_EVENT, mid: x.mid, cid, eid: x.eid || "", note: a < rest ? "Částečná úhrada" : "", by: who()})
    .set("charges/" + cid, d).commit();
  toast(a < rest ? "Částečná úhrada zapsána" : "Úhrada zapsána");
  return true;
}
// Okno s volbou částky úhrady (výchozí = celý zbytek)
export function openPay(cid) {
  const x = S.ch.find(c => c.id === cid);
  if (!x || restOf(x) <= 0) return;
  let e = document.getElementById("cpay");
  if (!e) { e = document.createElement("div"); e.id = "cpay"; document.body.appendChild(e); }
  e.style.cssText = "position:fixed;inset:0;z-index:57;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center";
  const rest = restOf(x), close = () => { e.style.display = "none"; e.innerHTML = ""; };
  e.innerHTML = `<div class="mb"><h2>💳 Úhrada</h2><div class="mu" style="margin-bottom:8px">${pn(x.mid)} · předpis ${kc(+x.amt || 0)}, zaplaceno ${kc(+x.paid || 0)}, zbývá <b>${kc(rest)}</b></div><label>Zaplacená částka (Kč)</label><input id="cpa" type="number" min="0" step="0.01" inputmode="decimal" value="${rest}"><div id="cpe" class="mu" style="color:var(--no);margin-bottom:8px"></div><div class="row"><button class="p" id="cpo" style="min-height:52px">Zapsat úhradu</button><button class="s" id="cpx" style="min-height:52px">Zavřít</button></div></div>`;
  e.onclick = ev => { if (ev.target === e) close(); };
  document.getElementById("cpx").onclick = close;
  document.getElementById("cpo").onclick = () => {
    const r = payAmount(x, document.getElementById("cpa").value);
    if (r.err) { document.getElementById("cpe").textContent = r.err; return; }
    close();
    payCharge(cid, r.amt);
  };
}

// ===== Vykreslení =====
function closedHtml(ev, st, err) {
  const cs = S.ch.filter(x => x.eid === ev.id && pl(x.mid)).sort(byName);
  const tot = cs.reduce((s, x) => s + (+x.amt || 0), 0), got = cs.reduce((s, x) => s + Math.min(+x.paid || 0, +x.amt || 0), 0);
  const rows = cs.map(x => `<div class="pr"><div>${pn(x.mid)}<div class="mu">${kc(+x.amt || 0)}${x.paid ? " · zaplaceno " + kc(+x.paid) : ""}${x.due ? " · splatnost " + fmtDue(x.due) : ""}${overdue(x) ? " · ⏰ po splatnosti" : ""}</div></div><div class="evq">${restOf(x) > 0 ? `<button data-cp="${x.id}" style="min-width:150px">💳 Zaplatit ${kc(restOf(x))}</button>` : '<button class="on-yes" disabled style="min-width:150px">✅ Zaplaceno</button>'}</div></div>`).join("");
  const logs = S.au.filter(x => x.eid === ev.id).sort((a, b) => (b.ts || "").localeCompare(a.ts || "")).slice(0, 5)
    .map(x => `<div class="mu">${new Date(x.ts).toLocaleString("cs-CZ")} · ${esc(x.act === "close" ? "uzavřeno" : x.act === "reopen" ? "znovu otevřeno" : x.act)} · ${esc(x.by || "")}${x.note ? " · " + esc(x.note) : ""}</div>`).join("");
  return `<div class="cd"><h2>💰 Pokladna – uzavřeno</h2>${err}<div class="mu" style="margin-bottom:6px">Uzavřeno ${st.at ? new Date(st.at).toLocaleString("cs-CZ") : "–"} (${esc(st.by || "")}). Náklady ${kc(+st.total || 0)}, předepsáno ${kc(+st.collect || 0)}, hráček v poli ${+st.n || 0}. Nic se samo nepřepočítává.</div>
<div class="mu" style="margin:6px 0"><b>Zaplaceno ${kc(got)} z ${kc(tot)}</b></div>${rows || '<div class="mu">Nikdo neplatí.</div>'}
<button class="${S.cf === "ro" + ev.id ? "d" : "s"} w" id="cero" style="margin-top:10px;min-height:48px;${S.cf === "ro" + ev.id ? "background:var(--no);color:#fff" : ""}">${S.cf === "ro" + ev.id ? "Opravdu znovu otevřít? Klepni znovu" : "↩ Znovu otevřít (úprava vyúčtování)"}</button>${logs ? `<h3>Záznamy</h3>${logs}` : ""}</div>`;
}
function editHtml(ev, cfg, err) {
  const d = draft(ev, cfg), P = players(ev.id), k = calcCash(d, P), cnt = g => P.filter(p => grpKey(p) === g).length;
  const tplChips = [...Object.entries(cfg.tpls).map(([key, t]) => [key, t.name]), ["custom", "Vlastní"]]
    .map(([key, t]) => `<button class="chip ${d.tpl === key ? "on" : ""}" data-tpl="${key}">${esc(t)}</button>`).join("");
  const catOpts = v => [...new Set([...cfg.cats.out, v].filter(Boolean))].map(c => `<option ${c === v ? "selected" : ""}>${esc(c)}</option>`).join("");
  const cost = d.cost.map((x, i) => `<div class="row" style="flex-wrap:nowrap;align-items:center;margin-bottom:6px"><select data-f="cost.${i}.cat" style="margin:0">${catOpts(x.cat)}</select><input data-f="cost.${i}.payee" value="${esc(x.payee || "")}" placeholder="Komu" style="margin:0"><input data-f="cost.${i}.amt" data-n="1" type="number" min="0" value="${x.amt || ""}" placeholder="Kč" style="margin:0;max-width:90px"><button class="d" data-cr="${i}" style="flex:none;padding:8px 12px">🗑</button></div>`).join("");
  const wh = Object.keys(WHO).map(g => {
    const w = d.who[g], lock = g === "exempt";
    return `<div class="cd" style="padding:10px;margin-bottom:8px"><b>${WHO[g]}</b> <span class="mu">(${cnt(g)} v poli)</span><div class="chips" style="margin-top:6px">${lock ? '<span class="mu">Neplatí (fx 0 → 0 Kč)</span>' : `<button class="chip ${w.pays ? "on" : ""}" data-wp="${g}">${w.pays ? "Platí: ANO" : "Platí: NE"}</button><button class="chip ${w.mode !== "flat" ? "on" : ""}" data-wm="${g}|calc">Výpočet</button><button class="chip ${w.mode === "flat" ? "on" : ""}" data-wm="${g}|flat">Pevná částka</button>`}</div>${!lock && w.mode === "flat" ? `<input data-f="who.${g}.flat" data-n="1" type="number" min="0" value="${w.flat || ""}" placeholder="Kč na osobu (před fx)" style="max-width:200px;margin:0">` : ""}</div>`;
  }).join("");
  const def = defDue(ev.raw.date, dueDays(cfg, d.tpl)).replace("T", " ");
  const diff = k.collect - k.total;
  const preview = `<div class="grid3"><div class="stat"><b>${k.N}</b>hráček v poli</div><div class="stat"><b>${kc(k.total)}</b>náklady</div><div class="stat"><b>${kc(k.collect)}</b>vybereme</div></div>
<div class="mu" style="margin-bottom:6px"><b>Vybereme ${kc(k.collect)} z ${kc(k.total)}</b>${k.total ? " (" + Math.round(100 * k.collect / k.total) + " %)" : ""}${k.total && diff < 0 ? " · schodek " + kc(-diff) : diff > 0 && k.total ? " · přebytek " + kc(diff) : ""}. Dělí se všemi ${k.N} přihlášenými hráčkami (bez brankářek a realizačního týmu, osvobozené se počítají).</div>
${k.payers.length ? k.payers.map(l => `<div class="pr"><div>${pn(l.pid)}<div class="mu">${GRP[l.g] || "Osvobozená"}${l.fx !== 1 ? " · fx " + l.fx : ""}</div></div><b>${kc(l.amt)}</b></div>`).join("") : '<div class="mu">Nikdo neplatí (např. venkovní zápas – náklady nese soupeř).</div>'}`;
  return `<div class="cd" id="cew"><h2>💰 Pokladna – vyúčtování</h2>${err}<div class="mu" style="margin-bottom:6px">Dosud neuzavřeno. Po uzavření vzniknou předpisy a vyúčtování se už samo nemění.</div>
<label>Šablona</label><div class="chips">${tplChips}</div><h3>Náklady</h3>${cost || '<div class="mu" style="margin-bottom:6px">Žádné náklady.</div>'}<button class="s" data-ca style="margin-bottom:10px">+ Nákladová položka</button>
<h3>Kdo platí a jak se počítá</h3>${wh}<label>Splatnost (prázdné = výchozí ${def})</label><input type="datetime-local" data-f="due" value="${esc(d.due)}">
<h3>Pokrytí nákladů</h3>${preview}
<div class="row" style="margin-top:12px"><button class="s" id="ces" style="min-height:52px">💾 Uložit nastavení</button><button class="p" id="cec" style="min-height:52px">💰 Uzavřít vyúčtování</button></div></div>`;
}
export function payHtml(ev) {
  if (!HK.isCash()) return "";
  const err = S.payErr ? `<div class="mu" style="color:var(--no);margin-bottom:6px">Pokladnu se nepodařilo načíst (${esc(S.payErr)}). Zkontroluj pravidla databáze (firestore.rules).</div>` : "";
  const st = ev.raw.settle;
  return st ? closedHtml(ev, st, err) : editHtml(ev, cashCfg(S.cc), err);
}

// ===== Eventy =====
export function bindPay(a, ev) {
  if (!HK.isCash()) return;
  const cfg = cashCfg(S.cc), q = s => a.querySelectorAll(s);
  // Přepsání polí formuláře do rozpracované úpravy
  const sync = () => {
    if (!dr || dr.eid !== ev.id) return;
    q("#cew [data-f]").forEach(i => {
      const ks = i.dataset.f.split(".");
      let o = dr;
      while (ks.length > 1) o = o[ks.shift()];
      o[ks[0]] = i.dataset.n != null ? (+i.value || 0) : i.value.trim();
    });
  };
  const act = (s, fn) => q(s).forEach(b => { b.onclick = () => { sync(); fn(b); render(); }; });
  q("#cew [data-f]").forEach(i => { i.onchange = () => { sync(); render(); }; });
  act("[data-tpl]", b => { const t = cfg.tpls[b.dataset.tpl]; dr.tpl = b.dataset.tpl; if (t) { dr.cost = clone(t.cost); dr.who = clone(t.who); Object.keys(WHO).forEach(g => { if (!dr.who[g]) dr.who[g] = {pays: false, mode: "calc", flat: 0}; }); } });
  act("[data-ca]", () => { dr.cost.push({cat: cfg.cats.out[0] || "", payee: "", amt: 0}); });
  act("[data-cr]", b => { dr.cost.splice(+b.dataset.cr, 1); });
  act("[data-wp]", b => { const w = dr.who[b.dataset.wp]; w.pays = !w.pays; });
  act("[data-wm]", b => { const [g, m] = b.dataset.wm.split("|"); dr.who[g].mode = m; });
  // Uložení nastavení bez uzavření
  const es = a.querySelector("#ces");
  if (es) es.onclick = () => { sync(); const raw = clone(ev.raw); applyDraft(raw); saveEv(ev, raw); toast("Nastavení uloženo"); };
  // Uzavření vyúčtování (jedna atomická dávka v settleEvent)
  const ec = a.querySelector("#cec");
  if (ec) ec.onclick = () => {
    sync();
    const raw = clone(ev.raw);
    applyDraft(raw);
    if (!settleEvent(ev, raw, true)) return toast("Vyúčtování se nepodařilo uzavřít");
    dr = null;
    toast("Vyúčtování uzavřeno");
  };
  q("[data-cp]").forEach(b => { b.onclick = () => openPay(b.dataset.cp); });
  // Znovu otevřít: potvrzení druhým klepnutím; dokument události + audit v jedné dávce; předpisy zůstávají do dalšího uzavření
  const ro = a.querySelector("#cero");
  if (ro) ro.onclick = () => {
    const key = "ro" + ev.id;
    if (S.cf === key) {
      S.cf = null;
      const raw = clone(ev.raw);
      delete raw.settle;
      S.db.batch().set(evPath(ev), strip(raw)).set("audit/" + uid(), auditDoc(ev.id, "reopen", "ruční znovuotevření vyúčtování")).commit();
      dr = null;
      toast("Vyúčtování znovu otevřeno");
    } else { S.cf = key; render(); setTimeout(() => { if (S.cf === key) { S.cf = null; render(); } }, 4000); }
  };
}
