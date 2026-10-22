// Moje platby: člen vidí jen své předpisy, zaplacené částky, dluh a QR platbu. Banner s upozorněním na dluh v Událostech.
// Struktura: Importy -> Stav -> Pomocné funkce -> Banner -> QR okno -> Vykreslení -> Export.
// Data: S.ch (u člena jen jeho předpisy, mid = pid / tid), nastavení pokladny S.cc (IBAN hlavního a provozního účtu). Předpis měsíčního příspěvku má eid "c_RRRR-MM" (F4).
// QR je formát SPD (české QR platby) generovaný lokálně (src/lib/qrcode.js).
// Zpráva pro příjemce: za co se platí + jméno plátce (chargeMsg v cash.js – uložená v předpisu, u starších sestavená); je u předpisu, v QR okně i v QR kódu (MSG).
// Dva účty (v17.7): každý předpis má svůj účet (hlavní / provozní). Nezaplacené předpisy se zobrazují po účtech; souhrnnou platbu (jeden QR)
// lze poslat jen za předpisy na STEJNÝ účet (stejný IBAN) – platby na různé účty sloučit nejde. Souhrnná platba má osobní VS a zprávu „Souhrn: …“.
// Blokace: kdo má neuhrazený předpis po splatnosti bez výjimky, nemůže se přihlásit „Jdu“ (kontrola v events.js, výjimku uděluje pokladník / trenér).

// ===== Importy =====
import {S} from "../core/state.js";
import {esc, fd} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {accIban, accName, accOf, cashCfg, chargeItem, chargeMsg, debtOf, fmtDue, kc, multiMsg, overdue, payerName, personVs, r2, restOf, spdPay, twoAcc, vsOf} from "../domain/cash.js";
import qrcode from "../lib/qrcode.js";
import {render} from "./shell.js";

// ===== Stav =====
let qr = null;   // otevřené okno s QR: id předpisu, nebo "g:" + IBAN + "|" + mid pro souhrnnou platbu

// ===== Pomocné funkce =====
const ids = () => [HK.pid(), HK.tid()].filter(Boolean);
const ibanFmt = s => String(s || "").replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
// Nezaplacené předpisy rozdělené podle IBAN a osoby (souhrnná platba jen v rámci jednoho účtu): [{key, acc, iban, mid, items, sum}]
function groups(items, cfg) {
  const g = {};
  items.filter(x => restOf(x) > 0).forEach(x => {
    const a = accOf(x, cfg), ib = accIban(cfg, a), key = "g:" + ib + "|" + x.mid;
    const o = g[key] = g[key] || {key, acc: a, iban: ib, mid: x.mid, items: [], sum: 0};
    o.items.push(x); o.sum = r2(o.sum + restOf(x));
  });
  return Object.values(g);
}
// Data platby pro QR okno: jeden předpis, nebo souhrnná platba skupiny
function payData(cfg) {
  if (!qr) return null;
  if (qr.startsWith("g:")) {
    const gr = groups(S.ch.filter(x => ids().includes(x.mid)), cfg).find(o => o.key === qr);
    if (!gr || gr.items.length < 2) return null;
    const items = gr.items.map(x => chargeItem(x.eid, S));
    return {title: "Souhrnná platba (" + gr.items.length + "×)", acc: gr.acc, iban: gr.iban, amt: gr.sum, vs: personVs(gr.mid), msg: multiMsg(items, payerName(gr.mid, S)), list: gr.items};
  }
  const x = S.ch.find(c => c.id === qr);
  if (!x || restOf(x) <= 0) return null;
  const a = accOf(x, cfg);
  return {title: chargeItem(x.eid, S).title, acc: a, iban: accIban(cfg, a), amt: restOf(x), vs: x.vs || vsOf(x.id), msg: chargeMsg(x, S), list: null};
}

// ===== Banner s upozorněním na dluh (v seznamu Událostí) =====
export function mineBanner() {
  if (!ids().length) return "";
  const d = debtOf(S.ch, ids());
  if (!d.debt) return "";
  return `<div class="cd" style="border-color:var(--no)"><b style="color:var(--no)">⚠️ Máš nezaplaceno ${kc(d.debt)}</b>${d.over ? `<div class="mu">Po splatnosti: ${kc(d.over)}${d.blocked ? " – přihlášení „Jdu“ je zablokováno, dokud nezaplatíš (nebo ti pokladník neudělí výjimku)." : ""}</div>` : ""}<button class="s w" data-mk style="margin-top:8px">💳 Moje platby</button></div>`;
}
export function bindBanner(a) {
  a.querySelectorAll("[data-mk]").forEach(b => b.onclick = () => { S.tab = "mk"; S.mid = null; S.evid = null; render(); window.scrollTo(0, 0); });
}

// ===== QR okno =====
function qrHtml() {
  if (!qr) return "";
  const cfg = cashCfg(S.cc), p = payData(cfg);
  if (!p) { qr = null; return ""; }
  const two = twoAcc(cfg), accLine = two ? `<b>${esc(accName(cfg, p.acc))}</b><br>` : "";
  let body;
  if (!p.iban) body = '<div class="mu">Účet týmu zatím není nastaven. Požádej trenéra nebo pokladníka.</div>';
  else {
    try {
      const q = qrcode(0, "M");
      q.addData(spdPay(p.iban, p.amt, p.vs, p.msg));   // zpráva se v spdPay převede na ASCII (asciiMsg)
      q.make();
      body = `<div style="background:#fff;padding:8px;border-radius:12px;width:min(280px,100%);margin:0 auto">${q.createSvgTag({cellSize: 4, margin: 2, scalable: true})}</div>
<div class="mu" style="margin-top:10px;text-align:center">Naskenuj v bankovní aplikaci. Údaje pro ruční platbu:</div>
<div style="text-align:center;margin-top:6px">${accLine}Účet: <b>${esc(ibanFmt(p.iban))}</b><br>Částka: <b>${kc(p.amt)}</b><br>Variabilní symbol: <b>${esc(p.vs)}</b><br>Zpráva pro příjemce: <b>${esc(p.msg)}</b></div>`;
    } catch (e) { body = '<div class="mu" style="color:var(--no)">QR kód se nepodařilo vytvořit. Použij údaje pro ruční platbu.</div>'; }
  }
  // Souhrnná platba: seznam zahrnutých předpisů (všechny na stejný účet)
  const list = p.list ? `<div class="mu" style="margin-top:10px">Zahrnuje: ${p.list.map(x => esc(chargeMsg(x, S)) + " (" + kc(restOf(x)) + ")").join("; ")}.</div><div class="mu" style="margin-top:4px">Platí se jedním převodem s tvým osobním VS. Platby na jiný účet sem nepatří – zaplať je zvlášť.</div>` : "";
  return `<div class="md" id="mkq"><div class="mb"><h2>📱 Platba</h2><div class="mu" style="margin-bottom:10px">${esc(p.title)} · ${kc(p.amt)}</div>${body}${list}<button class="s w" id="mkx" style="margin-top:14px;min-height:52px">Zavřít</button></div></div>`;
}

// ===== Vykreslení =====
export function mineView(a) {
  const my = ids();
  if (!my.length) { a.innerHTML = '<div class="msg">Tvůj účet není propojen s hráčkou ani s členem týmu. Požádej trenéra (⚙️ → Členové týmu).</div>'; return; }
  const cfg = cashCfg(S.cc), two = twoAcc(cfg);
  const d = debtOf(S.ch, my);
  const err = S.payErr ? `<div class="cd" style="color:var(--no)">Platby se nepodařilo načíst (${esc(S.payErr)}).</div>` : "";
  const grid = `<div class="grid3"><div class="stat"><b style="color:${d.debt ? "var(--no)" : "var(--ok)"}">${kc(d.debt)}</b>dluh</div><div class="stat"><b style="color:${d.over ? "var(--no)" : "inherit"}">${kc(d.over)}</b>po splatnosti</div><div class="stat"><b>${d.items.filter(x => restOf(x) <= 0).length}</b>zaplaceno</div></div>`;
  const state = d.blocked ? '<div class="cd" style="color:var(--no)"><b>Přihlášení „Jdu“ je zablokováno</b><div class="mu">Máš neuhrazený předpis po splatnosti. Po zaplacení se blokace zruší, nebo ti ji může zrušit pokladník (výjimka).</div></div>' : "";
  // Souhrnná platba: jen pro skupinu se 2 a více předpisy na stejný účet
  const G = groups(d.items, cfg), multi = G.filter(g => g.items.length > 1);
  const sum = multi.length ? `<div class="cd"><h2>Zaplatit najednou</h2>${multi.map(g => `<button class="p w" data-mq="${esc(g.key)}" style="margin-top:6px;min-height:48px">📱 Zaplatit vše${two ? " na " + esc(accName(cfg, g.acc).toLowerCase()) : ""} – ${g.items.length}×, ${kc(g.sum)} (QR)</button>`).join("")}${G.length > 1 ? '<div class="mu" style="margin-top:6px">Platby jdou na dva různé účty, proto je nelze sloučit do jednoho převodu. Každý účet zaplať zvlášť.</div>' : ""}</div>` : "";
  const item = x => chargeItem(x.eid, S);
  const items = d.items.map(x => ({x, i: item(x)})).sort((p, q) => (restOf(q.x) > 0) - (restOf(p.x) > 0) || (restOf(p.x) > 0 ? (p.x.due || "9").localeCompare(q.x.due || "9") : (q.i.date || "").localeCompare(p.i.date || "")));
  const list = items.length ? items.map(({x, i}) => {
    const rest = restOf(x), od = overdue(x);
    return `<div class="cd"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${esc(i.title)}</b><span class="tag ${rest ? (od ? "red" : "sh") : "pp"}">${rest ? (od ? "po splatnosti" : "k úhradě") : "zaplaceno"}</span></div>
<div class="mu">${i.date ? fd(i.date) + " · " : ""}předpis ${kc(+x.amt || 0)}${x.paid ? " · zaplaceno " + kc(+x.paid) : ""}${x.due ? " · splatnost " + fmtDue(x.due) : ""}${x.exc && rest ? " · 🔓 výjimka od blokace" : ""}</div>${rest ? `<div class="mu">${two ? "Na účet: <b>" + esc(accName(cfg, accOf(x, cfg))) + "</b> · " : ""}VS <b>${esc(x.vs || vsOf(x.id))}</b> · zpráva: <b>${esc(chargeMsg(x, S))}</b></div>` : ""}${rest ? `<button class="p w" data-mq="${x.id}" style="margin-top:8px;min-height:48px">📱 Zaplatit ${kc(rest)} (QR)</button>` : ""}</div>`;
  }).join("") : '<div class="msg">Zatím nemáš žádné předpisy.</div>';
  a.innerHTML = `${err}<h2 style="margin:0 0 10px">💳 Moje platby</h2>${grid}${state}${sum}${list}` + qrHtml();
  a.querySelectorAll("[data-mq]").forEach(b => b.onclick = () => { qr = b.dataset.mq; render(); });
  const x = a.querySelector("#mkx");
  if (x) x.onclick = () => { qr = null; render(); };
  const bg = a.querySelector("#mkq");
  if (bg) bg.onclick = e => { if (e.target.id === "mkq") { qr = null; render(); } };
}
