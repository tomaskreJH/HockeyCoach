// ⚠️ Přehled plateb a dluhů (Team → 💰 Platby, správce pokladny): souhrn, po hráčkách, po událostech; data S.ch, události z events.js.
// Příspěvek (eid "c_RRRR-MM") = pseudo-událost 📅 (klepnutí → 📅 Měsíce). 🔒 výjimka z blokace u předpisu po splatnosti.
// Úhrada přes okno z payments.js; „Zaplatila vše“ zvlášť pro každý účet (osobní VS). Nahoře žádosti o změnu placení (request-list.js).
// ⚖️ Tarify: využívá hráčka zvolený způsob placení (domain/economy.js tariffRows) + docházka sezóny – jen pro správce pokladny.
// ☑ Hromadně: více úhrad najednou, 🏦 párování výpisu z banky (bank-pair.js).
// ===== Importy =====
import {confirm2} from "../core/actions.js";
import {isG, pl, pn, pri, stOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, fd, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {attEvents, attSummary, pastEvents, seasonOf} from "../domain/attendance.js";
import {GRP, accIban, accName, accOf, cashCfg, chargeMsg, contribEvent, contribYm, costTotal, fmtDue, fxPct, kc, ledger, overdue, personVs, r2, restOf, twoAcc, ymNow} from "../domain/cash.js";
import {tariffRows} from "../domain/economy.js";
import {bindBulk, bulkHtml} from "./bank-pair.js";
import {openMonth} from "./money.js";
import {openPay, payCharge, toggleExc} from "./payments.js";
import {bindReq, reqBanner, reqModal} from "./request-list.js";
import {render} from "./shell.js";

// ===== Stav (jen pro tuto obrazovku) =====
let vw = "pl";      // pl = podle hráček, ev = podle událostí, hb = ☑ hromadně (výpis z banky), tf = ⚖️ tarify
let all = false;    // v přehledu hráček zobrazit i ty bez dluhu
let open = null;    // rozbalená hráčka

// ===== Pomocné funkce =====
const desc = (x, y) => y.date.localeCompare(x.date);
const icon = e => (e.type === "match" ? "🆚" : e.type === "contrib" ? "📅" : "🏒");
// Nezaplacené předpisy osoby rozdělené podle IBAN (souhrnná platba jen v rámci jednoho účtu): [{acc, iban, items, sum}]
function byAccount(items, cfg) {
  const g = {};
  items.filter(x => restOf(x) > 0).forEach(x => {
    const a = accOf(x, cfg), ib = accIban(cfg, a) || a, o = g[ib] = g[ib] || {acc: a, iban: ib, items: [], sum: 0};
    o.items.push(x); o.sum = r2(o.sum + restOf(x));
  });
  return Object.values(g);
}
// Atribut pro klepnutí na řádek: událost otevře detail, příspěvek režim 📅 Měsíce na daném měsíci
const openAttr = e => (e.type === "contrib" ? `data-fm="${contribYm(e.id)}"` : `data-fe="${e.id}"`);

// ===== ⚖️ Tarify =====
// Verdikt pro správce pokladny: využívá hráčka zvolený způsob placení? (diff < 0 = druhým způsobem by zaplatila méně)
function verdict(r) {
  const d = kc(Math.abs(r.diff));
  if (r.empty) return {ord: 3, tag: "", txt: "V sezóně zatím není co porovnat."};
  if (r.better === r.alt) return r.grp === "monthly"
    ? {ord: 0, tag: '<span class="tag red">nevyužívá</span>', txt: `Za události by zaplatila o <b>${d}</b> méně – příspěvek nevyužívá.`}
    : {ord: 0, tag: '<span class="tag sh">💡 příspěvek</span>', txt: `S příspěvkem by zaplatila o <b>${d}</b> méně.`};
  if (r.better === r.grp) return {ord: 2, tag: '<span class="tag pp">využívá</span>', txt: `Zvolený způsob je pro ni výhodnější o ${d}.`};
  return {ord: 1, tag: '<span class="tag">stejně</span>', txt: "Oba způsoby vycházejí stejně."};
}
// Přehled ⚖️ Tarify: hráčky (bez brankářek, ukončených a hostujících) – způsob placení, koeficient, docházka sezóny, sezóna skutečně → druhým způsobem.
// Jen správce pokladny (financeHtml); hráčky porovnání nevidí.
function tariffHtml() {
  const se = seasonOf(td()), P = S.pl.filter(p => stOf(p) !== "end" && !isG(p) && p.guest !== true);
  const R = tariffRows(P, S.ch, S, S.pr, S.at, cashCfg(S.cc).contrib, ymNow(), td());
  const A = attSummary(pastEvents(attEvents(S.ev, S.ma), se.from, se.to, Date.now()), S.at, P.map(p => p.id));
  const name = (x, y) => pri(x.p) - pri(y.p) || x.p.name.localeCompare(y.p.name, "cs");
  const act = R.filter(r => !r.skip).map(r => ({r, v: verdict(r)})).sort((x, y) => x.v.ord - y.v.ord || x.r.diff - y.r.diff || name(x.r, y.r));
  const skip = R.filter(r => r.skip).sort(name);
  const att = id => { const a = (A[id] || {}).all; return a && a.n ? `docházka ${a.yes} z ${a.n}${a.pct == null ? "" : " (" + a.pct + " %)"}` : "bez uplynulých událostí"; };
  const cnt = g => act.filter(o => o.r.grp === g), bad = g => cnt(g).filter(o => o.v.ord === 0).length;
  const sumH = `<div class="grid3"><div class="stat"><b>${cnt("monthly").length}</b>příspěvek${bad("monthly") ? ` · <span style="color:var(--no)">${bad("monthly")} nevyužívá</span>` : ""}</div><div class="stat"><b>${cnt("single").length}</b>za událost${bad("single") ? ` · <span style="color:var(--wa)">${bad("single")} 💡</span>` : ""}</div><div class="stat"><b>${skip.length}</b>osvobozené / 0 %</div></div>`;
  const row = ({r, v}) => `<div class="it" style="cursor:default"><div><b>${esc(r.p.name)}</b> ${v.tag}<div class="mu">${esc(GRP[r.grp])}${r.fx !== 1 ? " · koeficient " + fxPct(r.fx) : ""} · ${att(r.p.id)}</div>${r.empty ? "" : `<div class="mu">Sezóna: skutečně ${kc(r.act)} → ${esc(GRP[r.alt].toLowerCase())} ${kc(r.altAmt)}${r.alt === "single" ? " (" + r.n + "× uzavřená událost)" : ""}</div>`}<div>${v.txt}</div></div></div>`;
  const skipH = skip.length ? `<div class="mu" style="margin-top:8px">Osvobozené / koeficient 0 % (neporovnává se): ${skip.map(r => esc(r.p.name)).join(", ")}</div>` : "";
  return `<div class="cd"><h2>⚖️ Využití tarifu – sezóna ${se.from.slice(0, 4)}/${se.to.slice(2, 4)}</h2><div class="mu" style="margin-bottom:8px">Skutečně předepsáno v sezóně vs. druhý způsob placení: za události = cena na hlavu × koeficient za uzavřené události, kde byla přihlášená; příspěvek = dnešní výše × koeficient a události, kde platí i hráčky s příspěvkem. Neuzavřené události se nepočítají. Hráčky toto porovnání nevidí.</div>${sumH}${act.length ? act.map(row).join("") : '<div class="msg">Žádná hráčka k porovnání.</div>'}${skipH}</div>`;
}

// ===== Vykreslení =====
// evs = sjednocený seznam událostí z events.js, AT = odpovědi podle události a člena (pro počet účastí)
export function financeHtml(evs, AT) {
  if (!HK.can("money")) return "";
  const today = td(), byId = {}, cfg = cashCfg(S.cc), two = twoAcc(cfg);
  evs.forEach(e => { byId[e.id] = e; });
  // Měsíční příspěvky: pseudo-události podle měsíce (aby se předpisy příspěvků započítaly do dluhů)
  S.ch.forEach(x => { const ym = contribYm(x.eid); if (ym && !byId[x.eid]) byId[x.eid] = contribEvent(ym); });
  const evx = [...evs, ...Object.values(byId).filter(e => e.type === "contrib")];
  const L = ledger(S.ch, id => byId[id]);
  const past = evs.filter(e => e.date < today);
  const err = S.payErr ? `<div class="cd" style="color:var(--no)">Pokladnu se nepodařilo načíst (${esc(S.payErr)}). Zkontroluj pravidla databáze (firestore.rules).</div>` : "";

  // Souhrn
  const grid = `<div class="grid3"><div class="stat"><b style="color:${L.owed ? "var(--no)" : "var(--ok)"}">${kc(L.owed)}</b>dluh celkem</div><div class="stat"><b>${kc(L.got)}</b>vybráno</div><div class="stat"><b>${L.debtors}</b>dlužnic</div></div>`;
  const tabs = `<div class="chips"><button class="chip ${vw === "pl" ? "on" : ""}" data-fv="pl">Podle hráček</button><button class="chip ${vw === "ev" ? "on" : ""}" data-fv="ev">Podle událostí</button><button class="chip ${vw === "hb" ? "on" : ""}" data-fv="hb">☑ Hromadně</button><button class="chip ${vw === "tf" ? "on" : ""}" data-fv="tf">⚖️ Tarify</button></div>`;

  // Uplynulé události s náklady, které ještě nemají uzavřené vyúčtování
  const unset = past.filter(e => costTotal(e.cx || {}) > 0 && !e.raw.ss && !(e.cx || {}).settle).sort(desc);
  const unsetH = unset.length
    ? `<div class="cd"><h2>⚠️ Neuzavřená vyúčtování (${unset.length})</h2><div class="mu" style="margin-bottom:6px">Mají náklady, ale vyúčtování zatím není uzavřeno. Otevři událost a uzavři ho.</div>${unset.map(e => `<div class="it" data-fe="${e.id}"><div><b>${icon(e)} ${esc(e.title)}</b><div class="mu">${fd(e.date)} · náklady ${kc(costTotal(e.cx || {}))}</div></div><span class="tag sh">neuzavřeno</span></div>`).join("")}</div>`
    : "";

  let body;
  if (vw === "tf") body = tariffHtml();
  else if (vw === "hb") body = bulkHtml(byId);
  else if (vw === "pl") {
    // Přehled po hráčkách: největší dluh nahoře
    const rows = L.rows.filter(r => all || r.debt > 0)
      .sort((x, y) => y.debt - x.debt || pri(pl(x.pid)) - pri(pl(y.pid)) || pl(x.pid).name.localeCompare(pl(y.pid).name, "cs"));
    const toggle = `<div class="chips" style="margin-top:8px"><button class="chip ${all ? "on" : ""}" data-fall>Zobrazit i bez dluhu</button></div>`;
    body = `<div class="cd"><h2>Dluhy podle hráček</h2>${toggle}${rows.length ? rows.map(r => {
      const att = past.filter(e => ((AT[e.id] || {})[r.pid] || {}).st === "yes").length, key = "fa" + r.pid;
      let h = `<div class="it" data-fo="${r.pid}"><div><b>${pn(r.pid)}</b><div class="mu">Účast ${att} z ${past.length} uplynulých · nezaplaceno ${r.open}× · zaplaceno ${kc(r.paid)}</div></div><b style="color:${r.debt ? "var(--no)" : "var(--ok)"}">${r.debt ? kc(r.debt) : "✅ 0 Kč"}</b></div>`;
      if (open === r.pid) {
        const items = r.items.map(x => ({x, e: byId[x.eid]})).sort((a, b) => desc(a.e, b.e));
        const groups = byAccount(r.items, cfg);
        h += `<div style="padding:0 0 10px 8px;border-bottom:1px solid var(--bd)"><div class="mu" style="margin:6px 0">Osobní VS pro souhrnnou platbu: <b>${esc(personVs(r.pid))}</b></div>${items.map(({x, e}) => `<div class="pr"><div>${icon(e)} ${esc(e.title)}<div class="mu">${e.type === "contrib" ? "příspěvek" : fd(e.date)} · ${kc(+x.amt || 0)}${x.paid ? " · zaplaceno " + kc(+x.paid) : ""}${x.due ? " · splatnost " + fmtDue(x.due) : ""}${overdue(x) ? " · ⏰ po splatnosti" : ""}</div></div><div class="evq" style="flex-direction:column">${restOf(x) > 0 ? `<button data-fp="${x.id}" style="min-width:150px">💳 Zaplatit ${kc(restOf(x))}</button>` : '<button class="on-yes" disabled style="min-width:150px">✅ Zaplaceno</button>'}${overdue(x) ? `<button data-fx="${x.id}" style="min-width:150px">${x.exc ? "🔓 Zrušit výjimku" : "🔒 Dát výjimku z blokace"}</button>` : ""}</div><div class="mu" style="grid-column:1/-1">VS <b>${esc(x.vs || "–")}</b>${two ? " · " + esc(accName(cfg, accOf(x, cfg))) : ""} · ${esc(chargeMsg(x, S))}</div></div>`).join("")}${groups.map(gr => { const k2 = key + "|" + gr.iban, on = S.cf === k2; return `<button class="${on ? "d" : "p"} w" data-fa="${r.pid}|${esc(gr.iban)}" style="margin-top:10px;min-height:48px;${on ? "background:var(--no);color:#fff" : ""}">${on ? "Opravdu? Klepni znovu" : "✅ Zaplatila vše" + (groups.length > 1 || two ? " – " + esc(accName(cfg, gr.acc)) : "") + " (" + gr.items.length + "×, " + kc(gr.sum) + ")"}</button>`; }).join("")}${groups.length > 1 ? '<div class="mu" style="margin-top:6px">Předpisy jsou na dvou různých účtech – souhrnná platba se zapisuje zvlášť za každý účet.</div>' : ""}</div>`;
      }
      return h;
    }).join("") : `<div class="msg">${all ? "Zatím žádné předpisy." : "Nikdo nedluží. 🎉"}</div>`}<div class="mu" style="margin-top:8px">Zobrazují se jen hráčky s předpisem. Klepnutím na hráčku rozbalíš její předpisy, tlačítkem 💳 zapíšeš celou nebo částečnou úhradu.</div></div>`;
  } else {
    // Přehled po událostech: nejnovější nahoře
    const rows = evx.map(e => ({e, ps: S.ch.filter(x => x.eid === e.id && pl(x.mid))})).filter(o => o.ps.length).sort((a, b) => desc(a.e, b.e));
    body = `<div class="cd"><h2>Předpisy podle událostí a příspěvků</h2>${rows.length ? rows.map(({e, ps}) => {
      const un = ps.filter(x => restOf(x) > 0), tot = ps.reduce((s, x) => s + (+x.amt || 0), 0), debt = un.reduce((s, x) => s + restOf(x), 0);
      return `<div class="it" ${openAttr(e)}><div><b>${icon(e)} ${esc(e.title)}</b><div class="mu">${e.type === "contrib" ? "měsíční příspěvek" : fd(e.date)} · zaplaceno ${ps.length - un.length} z ${ps.length} · vybráno ${kc(tot - debt)} z ${kc(tot)}</div>${un.length ? `<div class="mu">Nezaplatily: ${un.map(x => pn(x.mid)).join(", ")}</div>` : ""}</div><b style="color:${debt ? "var(--no)" : "var(--ok)"}">${debt ? kc(debt) : "✅"}</b></div>`;
    }).join("") : '<div class="msg">Zatím žádná uzavřená vyúčtování.</div>'}</div>`;
  }
  return err + reqBanner() + grid + tabs + unsetH + body + reqModal();
}

// ===== Eventy =====
export function bindFinance(a) {
  bindReq(a);   // pruh a okno žádostí o změnu placení
  if (vw === "hb") bindBulk(a);   // ☑ Hromadně a výpis z banky
  a.querySelectorAll("[data-fv]").forEach(b => b.onclick = () => { vw = b.dataset.fv; render(); });
  a.querySelectorAll("[data-fall]").forEach(b => b.onclick = () => { all = !all; render(); });
  a.querySelectorAll("[data-fo]").forEach(b => b.onclick = () => { open = open === b.dataset.fo ? null : b.dataset.fo; render(); });
  // Úhrada jednoho předpisu: okno s částkou (celá nebo částečná)
  a.querySelectorAll("[data-fp]").forEach(b => b.onclick = ev => { ev.stopPropagation(); openPay(b.dataset.fp); });
  // Výjimka z blokace přihlášení „Jdu“ (předpis po splatnosti)
  a.querySelectorAll("[data-fx]").forEach(b => b.onclick = ev => { ev.stopPropagation(); toggleExc(b.dataset.fx); });
  // Zaplatila vše (na jeden účet): potvrzení druhým klepnutím, každý předpis daného účtu se uhradí celý; poznámka uvede souhrnnou platbu s osobním VS
  a.querySelectorAll("[data-fa]").forEach(b => b.onclick = () => {
    const [pid, iban] = b.dataset.fa.split("|"), key = "fa" + pid + "|" + iban, cfg = cashCfg(S.cc);
    confirm2(key, () => {
      const gr = byAccount(S.ch.filter(x => x.mid === pid), cfg).find(g => g.iban === iban);
      if (gr) gr.items.forEach(x => payCharge(x.id, null, gr.items.length > 1 ? "souhrnná platba VS " + personVs(pid) : ""));
      toast("Označeno jako zaplacené");
    });
  });
  // Otevření detailu události v záložce Události; tlačítko Zpět vrátí do Team → Platby (S.evBack)
  a.querySelectorAll("[data-fe]").forEach(b => b.onclick = () => { S.tab = "ev"; S.mid = null; S.evid = b.dataset.fe; S.evBack = "fo"; render(); window.scrollTo(0, 0); });
  // Příspěvek: přepnutí do režimu Team → 📅 Měsíce na daném měsíci
  a.querySelectorAll("[data-fm]").forEach(b => b.onclick = () => { openMonth(b.dataset.fm); S.tm = "mon"; render(); window.scrollTo(0, 0); });
}
