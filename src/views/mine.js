// Moje platby: člen vidí jen své předpisy, zaplacené částky, dluh a QR platbu. Banner s upozorněním na dluh v Událostech.
// Struktura: Importy -> Stav -> Pomocné funkce -> Banner -> QR okno -> Vykreslení -> Export.
// Data: S.ch (u člena jen jeho předpisy, mid = pid / tid), nastavení pokladny S.cc (IBAN). Předpis měsíčního příspěvku má eid "c_RRRR-MM" (F4). QR je formát SPD (české QR platby) generovaný lokálně (src/lib/qrcode.js).
// Zpráva pro příjemce (v17.6): za co se platí + jméno plátce (payMsg v cash.js), zobrazí se u předpisu, v QR okně a je i v QR kódu (MSG).
// Blokace: kdo má neuhrazený předpis po splatnosti bez výjimky, nemůže se přihlásit „Jdu“ (kontrola v events.js, výjimku uděluje pokladník / trenér).

// ===== Importy =====
import {S} from "../core/state.js";
import {esc, fd} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {cashCfg, contribYm, debtOf, fmtDue, kc, overdue, payMsg, restOf, spdPay, vsOf, ymLabel} from "../domain/cash.js";
import qrcode from "../lib/qrcode.js";
import {render} from "./shell.js";

// ===== Stav =====
let qr = null;   // id předpisu, pro který je otevřené okno s QR kódem

// ===== Pomocné funkce =====
const ids = () => [HK.pid(), HK.tid()].filter(Boolean);
// Název, datum a druh události (tréninku, zápasu nebo měsíčního příspěvku) k předpisu; type, opp a ym slouží pro zprávu pro příjemce
function evInfo(eid) {
  const ym = contribYm(eid);
  if (ym) return {title: "Příspěvek " + ymLabel(ym), date: ym + "-01", type: "contrib", ym};
  const t = S.ev.find(x => x.id === eid);
  if (t) return {title: t.title || "Trénink", date: t.date || "", type: "training"};
  const m = S.ma.find(x => x.id === eid);
  return m ? {title: "Zápas – " + m.opp, date: m.date || "", type: "match", opp: m.opp || ""} : {title: "Událost (smazána)", date: "", type: ""};
}
// Jméno plátce předpisu (hráčka podle pid, člen realizačního týmu podle tid) pro zprávu pro příjemce
function payerName(mid) {
  const p = S.pl.find(x => x.id === mid) || S.tr.find(x => x.id === mid);
  return p ? p.name || "" : "";
}
// Zpráva pro příjemce k předpisu (stejný text jako v QR, jen s diakritikou)
const msgOf = x => payMsg(evInfo(x.eid), payerName(x.mid));
const ibanFmt = s => String(s || "").replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();

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
  const x = S.ch.find(c => c.id === qr);
  if (!x || restOf(x) <= 0) { qr = null; return ""; }
  const cfg = cashCfg(S.cc), rest = restOf(x), info = evInfo(x.eid), vs = x.vs || vsOf(x.id), msg = msgOf(x);
  let body;
  if (!cfg.iban) body = '<div class="mu">IBAN klubu zatím není nastaven. Požádej trenéra nebo pokladníka.</div>';
  else {
    try {
      const q = qrcode(0, "M");
      q.addData(spdPay(cfg.iban, rest, vs, msg));   // zpráva se v spdPay převede na ASCII (asciiMsg)
      q.make();
      body = `<div style="background:#fff;padding:8px;border-radius:12px;width:min(280px,100%);margin:0 auto">${q.createSvgTag({cellSize: 4, margin: 2, scalable: true})}</div>
<div class="mu" style="margin-top:10px;text-align:center">Naskenuj v bankovní aplikaci. Údaje pro ruční platbu:</div>
<div style="text-align:center;margin-top:6px">Účet: <b>${esc(ibanFmt(cfg.iban))}</b><br>Částka: <b>${kc(rest)}</b><br>Variabilní symbol: <b>${esc(vs)}</b><br>Zpráva pro příjemce: <b>${esc(msg)}</b></div>`;
    } catch (e) { body = '<div class="mu" style="color:var(--no)">QR kód se nepodařilo vytvořit. Použij údaje pro ruční platbu.</div>'; }
  }
  return `<div class="md" id="mkq"><div class="mb"><h2>📱 Platba</h2><div class="mu" style="margin-bottom:10px">${esc(info.title)} · ${kc(rest)}</div>${body}<button class="s w" id="mkx" style="margin-top:14px;min-height:52px">Zavřít</button></div></div>`;
}

// ===== Vykreslení =====
export function mineView(a) {
  const my = ids();
  if (!my.length) { a.innerHTML = '<div class="msg">Tvůj účet není propojen s hráčkou ani s členem týmu. Požádej trenéra (⚙️ → Členové týmu).</div>'; return; }
  const d = debtOf(S.ch, my);
  const err = S.payErr ? `<div class="cd" style="color:var(--no)">Platby se nepodařilo načíst (${esc(S.payErr)}).</div>` : "";
  const grid = `<div class="grid3"><div class="stat"><b style="color:${d.debt ? "var(--no)" : "var(--ok)"}">${kc(d.debt)}</b>dluh</div><div class="stat"><b style="color:${d.over ? "var(--no)" : "inherit"}">${kc(d.over)}</b>po splatnosti</div><div class="stat"><b>${d.items.filter(x => restOf(x) <= 0).length}</b>zaplaceno</div></div>`;
  const state = d.blocked ? '<div class="cd" style="color:var(--no)"><b>Přihlášení „Jdu“ je zablokováno</b><div class="mu">Máš neuhrazený předpis po splatnosti. Po zaplacení se blokace zruší, nebo ti ji může zrušit pokladník (výjimka).</div></div>' : "";
  const items = d.items.map(x => ({x, i: evInfo(x.eid)})).sort((p, q) => (restOf(q.x) > 0) - (restOf(p.x) > 0) || (restOf(p.x) > 0 ? (p.x.due || "9").localeCompare(q.x.due || "9") : (q.i.date || "").localeCompare(p.i.date || "")));
  const list = items.length ? items.map(({x, i}) => {
    const rest = restOf(x), od = overdue(x);
    return `<div class="cd"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${esc(i.title)}</b><span class="tag ${rest ? (od ? "red" : "sh") : "pp"}">${rest ? (od ? "po splatnosti" : "k úhradě") : "zaplaceno"}</span></div>
<div class="mu">${i.date ? fd(i.date) + " · " : ""}předpis ${kc(+x.amt || 0)}${x.paid ? " · zaplaceno " + kc(+x.paid) : ""}${x.due ? " · splatnost " + fmtDue(x.due) : ""}${x.exc && rest ? " · 🔓 výjimka od blokace" : ""}</div>${rest ? `<div class="mu">Zpráva pro příjemce: <b>${esc(msgOf(x))}</b></div>` : ""}${rest ? `<button class="p w" data-mq="${x.id}" style="margin-top:8px;min-height:48px">📱 Zaplatit ${kc(rest)} (QR)</button>` : ""}</div>`;
  }).join("") : '<div class="msg">Zatím nemáš žádné předpisy.</div>';
  a.innerHTML = `${err}<h2 style="margin:0 0 10px">💳 Moje platby</h2>${grid}${state}${list}` + qrHtml();
  a.querySelectorAll("[data-mq]").forEach(b => b.onclick = () => { qr = b.dataset.mq; render(); });
  const x = a.querySelector("#mkx");
  if (x) x.onclick = () => { qr = null; render(); };
  const bg = a.querySelector("#mkq");
  if (bg) bg.onclick = e => { if (e.target.id === "mkq") { qr = null; render(); } };
}
