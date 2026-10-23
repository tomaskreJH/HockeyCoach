// Pokladna u události (trenér a pokladník): šablona, náklady, kdo platí, pokrytí nákladů (podíl příspěvků, výsledek, návrh poplatku – domain/economy.js),
// uzavření vyúčtování → snapshot + charges, ruční znovuotevření s auditem, úhrady předpisů.
// Struktura: Importy -> Pomocné funkce -> Uzavření vyúčtování (zápis) -> Úhrady -> Vykreslení -> Eventy -> Export.
// Data: náklady, kdo platí a snapshot vyúčtování jsou v kolekci evcash/{id události} (čtou jen správci pokladny; ev.cx).
// V dokumentu události / zápasu je jen příznak ss (vyúčtováno). Snapshot nese i podíl příspěvků (share) a měsíc (ym) v okamžiku uzavření.
// Uzavření i znovuotevření je JEDNA atomická dávka (evcash + příznak ss + předpisy + audit). Po uzavření se NIKDY nic automaticky nepřepočítává.
// Cena na hlavu pro hráčky (evprice/{id}, Moje platby) se zapíše / smaže hned po dávce zvlášť – nepublikovaná pravidla nesmí zastavit vyúčtování.
// Předpis nese účet (acc, z šablony nebo volby u události) a zprávu pro příjemce (msg); úhrada zapíše do pokladny stejnou zprávu, VS a účet.
// Každá dávka, která mění předpisy, zapíše i veřejný souhrn dlužníků debtors/{mid} (bez částek, domain/debtors.js).
// Celkový přehled dluhů je ve views/finance.js, pohyby pokladny ve views/cashbook.js, příspěvky, platy a měsíce ve views/money.js.

// ===== Importy =====
import {confirm2} from "../core/actions.js";
import {goingOf, isG, pl, pn, pri} from "../core/selectors.js";
import {S} from "../core/state.js";
import {clone, esc, td, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {ACC, CAT_CONTRIB, CAT_EVENT, GRP, WHO, accName, accOf, calcCash, cashCfg, chargeMsg, cxOf, defDue, evCash, evItem, fmtDue, fxPct, grpKey, kc, overdue, payAmount, payMsg, planCharges, r2, restOf, twoAcc, ymLabel} from "../domain/cash.js";
import {applyDebtors, debtorPlanFor} from "../domain/debtors.js";
import {PRICE_COLL, coveredBy, eventResult, priceDoc, suggestFlat} from "../domain/economy.js";
import {render} from "./shell.js";

// ===== Pomocné funkce =====
// Předpis bez pole id (id dokumentu se do dat nezapisuje)
const chData = x => { const {id, ...r} = x; return r; };
const who = () => { const u = HK.user(); return (u && u.email) || ""; };
// Zápas pro pokladnu (volá ho matches.js při uzavření zápasu)
export const evOfMatch = m => ({id: m.id, type: "match", raw: m, cx: cxOf(m.id, S.ec)});
// Přihlášené hráčky události bez brankářek (dělitel ceny)
const players = eid => goingOf(eid).map(id => pl(id)).filter(p => p && !isG(p));
const evPath = ev => (ev.type === "match" ? "matches/" : "events/") + ev.id;
const auditDoc = (eid, act, note) => ({ts: new Date().toISOString(), by: who(), eid, act, note: note || ""});
const dueDays = (cfg, tpl) => { const t = cfg.tpls[tpl]; return t && t.dueDays != null ? t.dueDays : cfg.due.ev; };
// Člen realizačního týmu (do souhrnu dlužníků se nezapisuje)
const isStaffId = mid => S.tr.some(t => t.id === mid);
// Souhrn dlužníků po změně předpisů (sets = [{id, d}], dels = [id]) přidaný do téže dávky
const withDebtors = (b, sets, dels) => applyDebtors(b, debtorPlanFor(S.ch, sets, dels, isStaffId));
const byName = (a, b) => pri(pl(a.mid)) - pri(pl(b.mid)) || pl(a.mid).name.localeCompare(pl(b.mid).name, "cs");
// Data pro hospodaření události a měsíce (domain/economy.js)
export const econData = () => ({ev: S.ev, ma: S.ma, ec: S.ec, ch: S.ch, cs: S.cs, pl: S.pl, cfg: cashCfg(S.cc), players});
// Rozpracovaná úprava (jen v paměti, dokud se neuloží)
let dr = null;
// Id události s otevřeným návrhem poplatku (💡 Navrhnout)
let sug = null;
function draft(ev, cfg) {
  if (!dr || dr.eid !== ev.id) dr = {eid: ev.id, ...evCash(ev, cfg)};
  return dr;
}
// Hodnoty rozpracované úpravy ve tvaru pro uložení (náklady s nulovou částkou se zahodí)
const fromDraft = () => { const c = {tpl: dr.tpl, cost: clone(dr.cost).filter(x => +x.amt > 0), who: clone(dr.who), acc: dr.acc}; if (dr.due) c.due = dr.due; return c; };

// ===== Uzavření vyúčtování (zápis) =====
// V JEDNÉ dávce uloží evcash, příznak ss v dokumentu události, předpisy a audit. Vrací výpočet, nebo null (nic se nestalo).
// force=false (automatické uzavření zápasu): bez předpisů se nic nezapíše; stávající snapshot se nikdy nepřepisuje.
// d = rozpracovaná úprava z formuláře (jinak se použije uložené nastavení / šablona).
// Do raw (kopie zápasu, kterou si po návratu ukládá matches.js) se zapíše příznak ss.
export function settleEvent(ev, raw, force, d) {
  if (!HK.can("money")) return null;
  const cx0 = ev.cx || cxOf(ev.id, S.ec);
  if (cx0.settle) return null;
  const cfg = cashCfg(S.cc), c = d ? {tpl: d.tpl, cost: clone(d.cost).filter(x => +x.amt > 0), who: clone(d.who), due: d.due || "", acc: d.acc || "op"} : evCash({...ev, cx: cx0}, cfg);
  const k = calcCash(c, players(ev.id));
  if (!force && !k.payers.length) return null;
  const due = c.due || defDue(raw.date, dueDays(cfg, c.tpl));
  // Podíl příspěvků a měsíc v okamžiku uzavření (historie se později nemění)
  const er = eventResult({id: ev.id, date: raw.date}, econData(), {id: ev.id, c, collect: k.collect});
  const settle = {at: new Date().toISOString(), by: who(), tpl: c.tpl, cost: c.cost, who: c.who, due, n: k.N, total: k.total, collect: k.collect, lines: k.payers,
    share: er && er.covered ? er.share : 0, ym: String(raw.date || "").slice(0, 7)};
  const cx = {tpl: c.tpl, cost: c.cost, who: c.who, acc: c.acc, settle};
  if (c.due) cx.due = c.due;
  const have = {};
  S.ch.filter(x => x.eid === ev.id && x.kind === "event").forEach(x => { have[x.mid] = x; });
  // Zpráva pro příjemce se sestaví z dat události (raw) a jména hráčky a uloží se do předpisu
  const item = evItem(ev.type, raw), msg = pid => payMsg(item, (pl(pid) || {}).name || "");
  const plan = planCharges(ev.id, k, due, have, S.ch, {acc: c.acc, msg}), b = S.db.batch();
  b.set("evcash/" + ev.id, cx);
  b.merge(evPath(ev), {ss: 1});
  plan.set.forEach(x => b.set("charges/" + x.id, x.d));
  plan.del.forEach(id => b.delete("charges/" + id));
  withDebtors(b, plan.set, plan.del);
  b.set("audit/" + uid(), auditDoc(ev.id, "close", k.payers.length + " předpisů, vybereme " + kc(k.collect) + " z " + kc(k.total)));
  b.commit();
  // Cena na hlavu pro porovnání v Moje platby (mimo dávku; chybějící doplní ⚙️ → Pokladna → Doplnit ceny pro hráčky)
  const pd = priceDoc(settle, raw.date);
  if (pd) S.db.doc(PRICE_COLL + "/" + ev.id).set(pd);
  raw.ss = 1;
  return k;
}

// ===== Úhrady =====
// Zámek proti dvojímu klepnutí (než se změna vrátí přes odběr dat)
const busy = new Set();
// Úhrada předpisu (částečná i plná; amt prázdné = celý zbytek): příjem do pokladny + nová zaplacená částka v jedné dávce.
// Pohyb nese zprávu pro příjemce (stejnou jako v QR), VS a účet předpisu; extra = doplněk poznámky (např. souhrnná platba).
export function payCharge(cid, amt, extra) {
  const x = S.ch.find(c => c.id === cid);
  if (!x || busy.has(cid)) return false;
  const rest = restOf(x), a = amt == null ? rest : r2(amt);
  if (rest <= 0 || !(a > 0) || a > rest + 1e-9) return false;
  busy.add(cid);
  setTimeout(() => busy.delete(cid), 2000);
  const d = {...chData(x), paid: r2((+x.paid || 0) + a)}, cfg = cashCfg(S.cc);
  const note = [chargeMsg(x, S), a < rest ? "částečná úhrada" : "", extra || ""].filter(Boolean).join(" · ");
  const b = S.db.batch()
    .set("cash/" + uid(), {d: td(), k: "in", amt: a, cat: x.kind === "contrib" ? CAT_CONTRIB : CAT_EVENT, mid: x.mid, cid, eid: x.eid || "", note, vs: x.vs || "", acc: accOf(x, cfg), by: who()})
    .set("charges/" + cid, d);
  withDebtors(b, [{id: cid, d}], []).commit();
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
  const cfg = cashCfg(S.cc);
  e.innerHTML = `<div class="mb"><h2>💳 Úhrada</h2><div class="mu" style="margin-bottom:8px">${pn(x.mid)} · předpis ${kc(+x.amt || 0)}, zaplaceno ${kc(+x.paid || 0)}, zbývá <b>${kc(rest)}</b></div><div class="mu" style="margin-bottom:8px">VS <b>${esc(x.vs || "–")}</b> · ${esc(chargeMsg(x, S))}${twoAcc(cfg) ? " · " + esc(accName(cfg, accOf(x, cfg))) : ""}</div><label>Zaplacená částka (Kč)</label><input id="cpa" type="number" min="0" step="0.01" inputmode="decimal" value="${rest}"><div id="cpe" class="mu" style="color:var(--no);margin-bottom:8px"></div><div class="row"><button class="p" id="cpo" style="min-height:52px">Zapsat úhradu</button><button class="s" id="cpx" style="min-height:52px">Zavřít</button></div></div>`;
  e.onclick = ev => { if (ev.target === e) close(); };
  document.getElementById("cpx").onclick = close;
  document.getElementById("cpo").onclick = () => {
    const r = payAmount(x, document.getElementById("cpa").value);
    if (r.err) { document.getElementById("cpe").textContent = r.err; return; }
    close();
    payCharge(cid, r.amt);
  };
}

// Výjimka z blokace přihlášení „Jdu“ u předpisu po splatnosti (uděluje a ruší pokladník / trenér; zapisuje se do auditu)
export function toggleExc(cid) {
  const x = S.ch.find(c => c.id === cid);
  if (!x || busy.has("e" + cid)) return;
  busy.add("e" + cid);
  setTimeout(() => busy.delete("e" + cid), 1500);
  const d = chData(x), on = !x.exc;
  if (on) d.exc = true; else delete d.exc;
  const b = S.db.batch().set("charges/" + cid, d).set("audit/" + uid(), auditDoc(x.eid || "", on ? "exc" : "exc-off", pn(x.mid) + (on ? ": výjimka z blokace udělena" : ": výjimka zrušena")));
  withDebtors(b, [{id: cid, d}], []).commit();
  toast(on ? "Výjimka udělena" : "Výjimka zrušena");
}

// ===== Vykreslení =====
function closedHtml(ev, st, err) {
  const cs = S.ch.filter(x => x.eid === ev.id && pl(x.mid)).sort(byName);
  const tot = cs.reduce((s, x) => s + (+x.amt || 0), 0), got = cs.reduce((s, x) => s + Math.min(+x.paid || 0, +x.amt || 0), 0);
  const cfg = cashCfg(S.cc), two = twoAcc(cfg);
  const rows = cs.map(x => `<div class="pr"><div>${pn(x.mid)}<div class="mu">VS ${esc(x.vs || "–")}${two ? " · " + esc(accName(cfg, accOf(x, cfg))) : ""} · ${kc(+x.amt || 0)}${x.paid ? " · zaplaceno " + kc(+x.paid) : ""}${x.due ? " · splatnost " + fmtDue(x.due) : ""}${overdue(x) ? " · ⏰ po splatnosti" : ""}</div></div><div class="evq" style="flex-direction:column">${restOf(x) > 0 ? `<button data-cp="${x.id}" style="min-width:150px">💳 Zaplatit ${kc(restOf(x))}</button>` : '<button class="on-yes" disabled style="min-width:150px">✅ Zaplaceno</button>'}${overdue(x) ? `<button data-cx="${x.id}" style="min-width:150px">${x.exc ? "🔓 Zrušit výjimku" : "🔒 Dát výjimku z blokace"}</button>` : ""}</div></div>`).join("");
  const logs = S.au.filter(x => x.eid === ev.id).sort((a, b) => (b.ts || "").localeCompare(a.ts || "")).slice(0, 5)
    .map(x => `<div class="mu">${new Date(x.ts).toLocaleString("cs-CZ")} · ${esc(x.act === "close" ? "uzavřeno" : x.act === "reopen" ? "znovu otevřeno" : x.act === "exc" ? "výjimka udělena" : x.act === "exc-off" ? "výjimka zrušena" : x.act)} · ${esc(x.by || "")}${x.note ? " · " + esc(x.note) : ""}</div>`).join("");
  return `<div class="cd"><h2>💰 Pokladna – uzavřeno</h2>${err}<div class="mu" style="margin-bottom:6px">Uzavřeno ${st.at ? new Date(st.at).toLocaleString("cs-CZ") : "–"} (${esc(st.by || "")}). Náklady ${kc(+st.total || 0)}, předepsáno ${kc(+st.collect || 0)}, hráček v poli ${+st.n || 0}. Nic se samo nepřepočítává.</div>
${closedEcon(ev, st)}<div class="mu" style="margin:6px 0"><b>Zaplaceno ${kc(got)} z ${kc(tot)}</b></div>${rows || '<div class="mu">Nikdo neplatí.</div>'}
<button class="${S.cf === "ro" + ev.id ? "d" : "s"} w" id="cero" style="margin-top:10px;min-height:48px;${S.cf === "ro" + ev.id ? "background:var(--no);color:#fff" : ""}">${S.cf === "ro" + ev.id ? "Opravdu znovu otevřít? Klepni znovu" : "↩ Znovu otevřít (úprava vyúčtování)"}</button>${logs ? `<h3>Záznamy</h3>${logs}` : ""}</div>`;
}
// Výsledek události: přebytek / kryto / schodek (schodek jen když ztrátu nekryje ani podíl příspěvků)
function resTag(res, cov) {
  if (res < 0) return `<b style="color:var(--no)">⚠️ schodek ${kc(-res)}${cov ? " i po podílu příspěvků" : ""}</b>`;
  return `<b style="color:var(--ok)">✅ ${res >= 1 ? "přebytek " + kc(res) : "kryto"}</b>`;
}
// Řádek měsíce: kolik krytých událostí a jak velké příspěvky je kryjí
function monthLine(m) {
  if (!m || !m.n) return "";
  return `<div class="mu" style="margin-bottom:6px">Měsíc ${esc(ymLabel(m.ym))}: ${m.n} ${m.n === 1 ? "událost kryjí" : m.n < 5 ? "události kryjí" : "událostí kryjí"} příspěvky ${kc(m.contrib.amt)} (${m.contrib.n} hráček${m.contrib.est ? ", odhad – příspěvky ještě nejsou vystavené" : ""}), na událost průměrně ${kc(m.per)}. Podíl události se počítá podle jejích nákladů; příspěvek nepřítomné hráčky propadá ve prospěch události.</div>`;
}
// Souhrn hospodaření u uzavřené události (podíl z okamžiku uzavření; starší uzavření bez uloženého podílu = dnešní odhad)
function closedEcon(ev, st) {
  const total = +st.total || 0;
  if (!coveredBy(st.who) || !(total > 0)) return "";
  const live = st.share == null ? eventResult(ev, econData()) : null, share = st.share != null ? +st.share || 0 : live ? live.share : 0;
  return `<div class="it" style="cursor:default"><span>Podíl příspěvků ${kc(share)}${st.share == null ? " (dnešní odhad)" : " (při uzavření)"}</span>${resTag(Math.round(((+st.collect || 0) + share - total) * 100) / 100, true)}</div>`;
}
// Panel návrhu poplatku (jen předvyplní hodnoty u této události, šablona se nemění)
function suggestHtml(s, share) {
  if (!s) return "";
  const names = s.groups.map(g => (g === "exempt" ? "Osvobozené" : GRP[g])).join(" a ");
  const row = (t, o, key) => `<div class="pr"><div>${t}<div class="mu">vybereme ${kc(o.collect)} · výsledek ${o.res < 0 ? "−" + kc(-o.res) : kc(o.res)}</div></div><button class="s" data-sgu="${key}" style="min-width:90px">Použít</button></div>`;
  const body = s.n ? row("a) Výpočet – náklady ÷ hráčky v poli", s.calc, "calc") + row(`b) Paušál <b>${kc(s.flat)}</b> na hráčku (před koeficientem)`, s.flatOpt, "flat")
    : '<div class="mu">Z platících skupin není nikdo přihlášený.</div>';
  return `<div class="cd" style="padding:10px;margin-bottom:8px"><b>💡 Návrh poplatku – ${esc(names)}</b>${body}<div class="mu" style="margin-top:6px">Paušál = (náklady − podíl příspěvků ${kc(share)} − platby ostatních skupin) ÷ součet koeficientů platících (${String(s.fxs).replace(".", ",")}), nahoru na celé Kč. Návrh se jen předvyplní; uložíš ho tlačítkem Uložit nastavení nebo Uzavřít vyúčtování. Šablony se nemění.</div></div>`;
}
function editHtml(ev, cfg, err) {
  const d = draft(ev, cfg), P = players(ev.id), k = calcCash(d, P), cnt = g => P.filter(p => grpKey(p) === g).length;
  const tplChips = [...Object.entries(cfg.tpls).map(([key, t]) => [key, t.name]), ["custom", "Vlastní"]]
    .map(([key, t]) => `<button class="chip ${d.tpl === key ? "on" : ""}" data-tpl="${key}">${esc(t)}</button>`).join("");
  const catOpts = v => [...new Set([...cfg.cats.out, v].filter(Boolean))].map(c => `<option ${c === v ? "selected" : ""}>${esc(c)}</option>`).join("");
  const cost = d.cost.map((x, i) => `<div class="row" style="flex-wrap:nowrap;align-items:center;margin-bottom:6px"><select data-f="cost.${i}.cat" style="margin:0">${catOpts(x.cat)}</select><input data-f="cost.${i}.payee" value="${esc(x.payee || "")}" placeholder="Komu" style="margin:0"><input data-f="cost.${i}.amt" data-n="1" type="number" min="0" value="${x.amt || ""}" placeholder="Kč" style="margin:0;max-width:90px"><button class="d" data-cr="${i}" style="flex:none;padding:8px 12px">🗑</button></div>`).join("");
  const wh = Object.keys(WHO).map(g => {
    // Všechny skupiny včetně osvobozených mají stejné volby (platí / neplatí, výpočet / pevná částka)
    const w = d.who[g];
    return `<div class="cd" style="padding:10px;margin-bottom:8px"><b>${WHO[g]}</b> <span class="mu">(${cnt(g)} v poli)</span><div class="chips" style="margin-top:6px"><button class="chip ${w.pays ? "on" : ""}" data-wp="${g}">${w.pays ? "Platí: ANO" : "Platí: NE"}</button><button class="chip ${w.mode !== "flat" ? "on" : ""}" data-wm="${g}|calc">Výpočet</button><button class="chip ${w.mode === "flat" ? "on" : ""}" data-wm="${g}|flat">Pevná částka</button></div>${w.mode === "flat" ? `<input data-f="who.${g}.flat" data-n="1" type="number" min="0" value="${w.flat || ""}" placeholder="Kč na osobu (před koeficientem)" style="max-width:200px;margin:0">` : ""}</div>`;
  }).join("");
  const def = defDue(ev.raw.date, dueDays(cfg, d.tpl)).replace("T", " ");
  // Hospodaření: podíl příspěvků (u událostí krytých příspěvkem) a výsledek události s rozpracovanou úpravou
  const er = eventResult(ev, econData(), {id: ev.id, c: d, collect: k.collect}), cov = !!(er && er.covered), share = cov ? er.share : 0;
  const res = Math.round((k.collect + share - k.total) * 100) / 100;
  const sg = sug === ev.id ? suggestFlat(d, P, share) : null, canSg = !!suggestFlat(d, P, share) && k.total > 0;
  const econ = k.total ? `<div class="it" style="cursor:default"><span>Náklady ${kc(k.total)} · vybereme za událost ${kc(k.collect)}${cov ? ` · podíl příspěvků ${kc(share)}${er.sharePaid < share ? " (z toho zaplaceno " + kc(er.sharePaid) + ")" : ""}` : ""}</span>${resTag(res, cov)}</div>${cov ? monthLine(er.month) : ""}` : "";
  const preview = `<div class="grid3"><div class="stat"><b>${k.N}</b>hráček v poli</div><div class="stat"><b>${kc(k.total)}</b>náklady</div><div class="stat"><b>${kc(k.collect)}</b>vybereme</div></div>
${econ}${canSg ? `<button class="s w" data-sg style="margin:4px 0 8px">${sug === ev.id ? "✕ Zavřít návrh" : "💡 Navrhnout poplatek"}</button>` : ""}${suggestHtml(sg, share)}
<div class="mu" style="margin-bottom:6px"><b>Vybereme ${kc(k.collect)} z ${kc(k.total)}</b>${k.total ? " (" + Math.round(100 * k.collect / k.total) + " %)" : ""}. Dělí se všemi ${k.N} přihlášenými hráčkami, každá se počítá jako jeden celý kus (bez brankářek a realizačního týmu; osvobozené i hráčky se sníženým koeficientem se počítají celé). Výsledný podíl se násobí koeficientem hráčky.</div>
${k.payers.length ? k.payers.map(l => `<div class="pr"><div>${pn(l.pid)}<div class="mu">${l.g === "exempt" ? "Osvobozená" : GRP[l.g]}${l.fx !== 1 ? " · koeficient " + fxPct(l.fx) : ""}</div></div><b>${kc(l.amt)}</b></div>`).join("") : '<div class="mu">Nikdo neplatí (např. venkovní zápas – náklady nese soupeř).</div>'}`;
  return `<div class="cd" id="cew"><h2>💰 Pokladna – vyúčtování</h2>${err}<div class="mu" style="margin-bottom:6px">Dosud neuzavřeno. Po uzavření vzniknou předpisy a vyúčtování se už samo nemění.</div>
<label>Šablona</label><div class="chips">${tplChips}</div><h3>Náklady</h3>${cost || '<div class="mu" style="margin-bottom:6px">Žádné náklady.</div>'}<button class="s" data-ca style="margin-bottom:10px">+ Nákladová položka</button>
${twoAcc(cfg) ? `<h3>Platby na účet</h3><div class="chips">${Object.entries(ACC).map(([key, t]) => `<button class="chip ${d.acc === key ? "on" : ""}" data-acc="${key}">${t}</button>`).join("")}</div><div class="mu" style="margin-bottom:6px">Výchozí účet určuje šablona (⚙️ → Nastavení pokladny). Hráčky platí na tento účet a v QR se jim nabídne právě on.</div>` : ""}
<h3>Kdo platí a jak se počítá</h3>${wh}<label>Splatnost (prázdné = výchozí ${def})</label><input type="datetime-local" data-f="due" value="${esc(d.due)}">
<h3>Pokrytí nákladů</h3>${preview}
<div class="row" style="margin-top:12px"><button class="s" id="ces" style="min-height:52px">💾 Uložit nastavení</button><button class="p" id="cec" style="min-height:52px">💰 Uzavřít vyúčtování</button></div></div>`;
}
export function payHtml(ev) {
  if (!HK.can("money")) return "";
  const err = S.payErr ? `<div class="mu" style="color:var(--no);margin-bottom:6px">Pokladnu se nepodařilo načíst (${esc(S.payErr)}). Zkontroluj pravidla databáze (firestore.rules).</div>` : "";
  const st = (ev.cx || {}).settle;
  return st ? closedHtml(ev, st, err) : editHtml(ev, cashCfg(S.cc), err);
}

// ===== Eventy =====
export function bindPay(a, ev) {
  if (!HK.can("money")) return;
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
  act("[data-acc]", b => { dr.acc = b.dataset.acc; });
  act("[data-tpl]", b => { const t = cfg.tpls[b.dataset.tpl]; dr.tpl = b.dataset.tpl; if (t) { dr.cost = clone(t.cost); dr.who = clone(t.who); dr.acc = t.acc || "op"; Object.keys(WHO).forEach(g => { if (!dr.who[g]) dr.who[g] = {pays: false, mode: "calc", flat: 0}; }); } });
  act("[data-ca]", () => { dr.cost.push({cat: cfg.cats.out[0] || "", payee: "", amt: 0}); });
  act("[data-cr]", b => { dr.cost.splice(+b.dataset.cr, 1); });
  act("[data-wp]", b => { const w = dr.who[b.dataset.wp]; w.pays = !w.pays; });
  act("[data-wm]", b => { const [g, m] = b.dataset.wm.split("|"); dr.who[g].mode = m; });
  // Návrh poplatku: otevřít / zavřít panel, použít výpočet nebo paušál (jen do rozpracované úpravy)
  act("[data-sg]", () => { sug = sug === ev.id ? null : ev.id; });
  act("[data-sgu]", b => {
    const er = eventResult(ev, econData(), {id: ev.id, c: dr, collect: calcCash(dr, players(ev.id)).collect});
    const s = suggestFlat(dr, players(ev.id), er && er.covered ? er.share : 0);
    if (s) dr.who = clone(b.dataset.sgu === "flat" ? s.flatOpt.who : s.calc.who);
    sug = null;
    toast("Návrh předvyplněn – ulož ho");
  });
  // Uložení nastavení bez uzavření (jen dokument evcash)
  const es = a.querySelector("#ces");
  if (es) es.onclick = () => {
    sync();
    S.db.doc("evcash/" + ev.id).set({...fromDraft()});
    toast("Nastavení uloženo");
  };
  // Uzavření vyúčtování (jedna atomická dávka v settleEvent)
  const ec = a.querySelector("#cec");
  if (ec) ec.onclick = () => {
    sync();
    if (!settleEvent(ev, clone(ev.raw), true, dr)) return toast("Vyúčtování se nepodařilo uzavřít");
    dr = null;
    toast("Vyúčtování uzavřeno");
  };
  q("[data-cp]").forEach(b => { b.onclick = () => openPay(b.dataset.cp); });
  q("[data-cx]").forEach(b => { b.onclick = () => toggleExc(b.dataset.cx); });
  // Znovu otevřít: potvrzení druhým klepnutím; evcash bez snapshotu + zrušení příznaku ss + audit v jedné dávce; předpisy zůstávají do dalšího uzavření
  const ro = a.querySelector("#cero");
  if (ro) ro.onclick = () => {
    const key = "ro" + ev.id;
    confirm2(key, () => {
      const cx = {...(ev.cx || {})};
      delete cx.settle;
      S.db.batch().set("evcash/" + ev.id, cx).merge(evPath(ev), {ss: "__del"})
        .set("audit/" + uid(), auditDoc(ev.id, "reopen", "ruční znovuotevření vyúčtování")).commit();
      // Otevřená událost nemá platnou cenu na hlavu (mimo dávku, stejně jako zápis při uzavření)
      if ((S.pr || []).some(x => x.id === ev.id)) S.db.doc(PRICE_COLL + "/" + ev.id).delete();
      dr = null;
      toast("Vyúčtování znovu otevřeno");
    });
  };
}
