// Moje platby: člen vidí jen své předpisy, zaplacené částky, dluh a QR platbu. Banner s upozorněním na dluh v Událostech.
// Struktura: Importy -> Stav -> Pomocné funkce -> Banner -> QR okno -> Vykreslení -> Export.
// Data: S.ch (u člena jen jeho předpisy, mid = pid / tid), nastavení pokladny S.cc (IBAN hlavního a provozního účtu). Předpis měsíčního příspěvku má eid "c_RRRR-MM" (F4).
// QR je formát SPD (české QR platby) generovaný lokálně (src/lib/qrcode.js).
// Zpráva pro příjemce: za co se platí + jméno plátce (chargeMsg v cash.js – uložená v předpisu, u starších sestavená); je u předpisu, v QR okně i v QR kódu (MSG).
// Dva účty: každý předpis má svůj účet (hlavní / provozní). Nezaplacené předpisy se zobrazují po účtech; souhrnnou platbu (jeden QR)
// lze poslat jen za předpisy na STEJNÝ účet (stejný IBAN) – platby na různé účty sloučit nejde. Souhrnná platba má osobní VS a zprávu „Souhrn: …“.
// Blokace: kdo má neuhrazený předpis po splatnosti bez výjimky, nemůže se přihlásit „Jdu“ (kontrola v events.js, výjimku uděluje pokladník / trenér).
// Zabezpečení QR: QR se vytvoří jen z účtu, který projde kontrolními součty (accCheck); kód je v alfanumerickém režimu
// (zpráva qrMsg – bez diakritiky, VELKÁ písmena), volitelně okamžitá platba. Zařízení si pamatuje ověřené účty (seenAccs):
// je-li účet nový oproti dřívějšku, nebo změněný v posledních 14 dnech, okno nejdřív ukáže varování a QR až po potvrzení.
// V okně je vždy upozornění na kontrolu účtu před odesláním a vyloučení odpovědnosti. Správcům pokladny ukáže banner čekající návrh změny účtu.
// Uložení QR: tlačítko ⬇️ Uložit QR je jen u zobrazeného QR (po kontrole účtu a ověření); obrázek PNG se kreslí
// z téhož objektu qrcode, který okno zobrazilo (qr-image.js) – obsah QR se nemění. Android / iPhone: Sdílet, jinde stažení.

// ===== Importy =====
import {S} from "../core/state.js";
import {esc, fd, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {accCheck, ibanFmt, ibanToCz, markSeen, recentChange, seenAccs} from "../domain/bank-account.js";
import {accIban, accName, accOf, cashCfg, chargeItem, chargeMsg, debtOf, fmtDue, kc, multiMsg, overdue, payerName, personVs, qrMsg, r2, restOf, spdPay, twoAcc, vsHash} from "../domain/cash.js";
import qrcode from "../lib/qrcode.js";
import {qrFileName, saveQrImage} from "./qr-image.js";
import {render} from "./shell.js";

// ===== Stav =====
let qr = null;   // otevřené okno s QR: id předpisu, nebo "g:" + IBAN + "|" + mid pro souhrnnou platbu
let shown = null; // právě zobrazený QR: {q – objekt qrcode, info – údaje popisku, name – název souboru}; jinak null

// ===== Pomocné funkce =====
const ids = () => [HK.pid(), HK.tid()].filter(Boolean);
// Upozornění před platbou – vždy v okně QR
const WARN_TXT = "Před odesláním zkontroluj v bankovní aplikaci číslo účtu příjemce, částku a variabilní symbol. Pokud se účet liší od účtu, který znáš od trenéra, neplať a ozvi se trenérovi. Aplikace ani správci týmu neodpovídají za platbu odeslanou na jiný účet.";
const fDay = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("cs-CZ"); };
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
  return {title: chargeItem(x.eid, S).title, acc: a, iban: accIban(cfg, a), amt: restOf(x), vs: x.vs || vsHash(x.id), msg: chargeMsg(x, S), list: null};
}

// ===== Banner s upozorněním na dluh (v seznamu Událostí) =====
// Správci pokladny navíc uvidí čekající návrh změny účtu (potvrzuje jiný správce než navrhovatel)
function pendBanner() {
  const p = (S.cc || {}).ibanPend, u = HK.user(), me = ((u && u.email) || "").toLowerCase();
  if (!p || !HK.isCash()) return "";
  return `<div class="cd" style="border-color:var(--wa)"><b style="color:var(--wa)">⏳ Čeká na potvrzení změna účtů týmu</b><div class="mu">Navrhl ${esc(p.by)} · ${esc(fDay(p.at))}.${p.by === me ? " Potvrdit musí jiný trenér nebo pokladník." : " Před potvrzením ověř číslo účtu s navrhovatelem."}</div><button class="s w" data-mko style="margin-top:8px">🏦 Otevřít nastavení pokladny</button></div>`;
}
export function mineBanner() {
  const pb = pendBanner();
  if (!ids().length) return pb;
  const d = debtOf(S.ch, ids());
  if (!d.debt) return pb;
  return pb + `<div class="cd" style="border-color:var(--no)"><b style="color:var(--no)">⚠️ Máš nezaplaceno ${kc(d.debt)}</b>${d.over ? `<div class="mu">Po splatnosti: ${kc(d.over)}${d.blocked ? " – přihlášení „Jdu“ je zablokováno, dokud nezaplatíš (nebo ti pokladník neudělí výjimku)." : ""}</div>` : ""}<button class="s w" data-mk style="margin-top:8px">💳 Moje platby</button></div>`;
}
export function bindBanner(a) {
  a.querySelectorAll("[data-mk]").forEach(b => b.onclick = () => { S.tab = "mk"; S.mid = null; S.evid = null; render(); window.scrollTo(0, 0); });
  a.querySelectorAll("[data-mko]").forEach(b => b.onclick = () => { if (HK.openCash) HK.openCash(); });
}

// ===== QR okno =====
function qrHtml() {
  shown = null;   // uložit lze jen QR, který se v tomto vykreslení skutečně zobrazí
  if (!qr) return "";
  const cfg = cashCfg(S.cc), p = payData(cfg);
  if (!p) { qr = null; return ""; }
  const two = twoAcc(cfg), accLine = two ? `<b>${esc(accName(cfg, p.acc))}</b><br>` : "";
  let body;
  // Údaje pro ruční platbu: číslo účtu v českém tvaru i IBAN, zpráva přesně jako v QR
  const msg = qrMsg(p.msg), cz = ibanToCz(p.iban);
  const facts = `<div style="text-align:center;margin-top:6px">${accLine}Účet: <b style="font-size:18px">${esc(cz || p.iban)}</b><br><span class="mu">IBAN ${esc(ibanFmt(p.iban))}</span><br>Částka: <b>${kc(p.amt)}</b><br>Variabilní symbol: <b>${esc(p.vs)}</b><br>Zpráva pro příjemce: <b>${esc(msg)}</b>${cfg.inst ? "<br><span class=\"mu\">Okamžitá platba (pokud ji tvoje banka podporuje)</span>" : ""}</div>`;
  const since = cfg.ibanAt ? `<div class="mu" style="text-align:center;margin-top:6px">Účet platí od ${esc(fDay(cfg.ibanAt))} (navrhl ${esc(cfg.ibanBy || "?")}, potvrdil ${esc(cfg.ibanOk || "?")}).</div>` : "";
  const warn = `<div class="cd" style="border-color:var(--wa);margin-top:10px;padding:10px;font-size:13px">⚠️ ${WARN_TXT}</div>`;
  const seen = seenAccs(), fresh = recentChange(cfg.ibanAt), gate = !seen.includes(p.iban) && (seen.length > 0 || fresh);
  if (!p.iban) body = '<div class="mu">Účet týmu zatím není nastaven. Požádej trenéra nebo pokladníka.</div>';
  else if (!accCheck(p.iban)) body = '<div class="cd" style="border-color:var(--no);color:var(--no)"><b>⛔ Účet týmu neprošel kontrolou čísla účtu.</b><div>QR se z bezpečnostních důvodů nevytvoří. Neplať a ozvi se trenérovi.</div></div>';
  else if (gate) {
    // Nový nebo nedávno změněný účet: nejdřív varování, QR až po potvrzení hráčky (zapamatuje se v zařízení)
    body = `<div class="cd" style="border-color:var(--no)"><b style="color:var(--no)">⚠️ ${seen.length ? "Účet týmu se od tvé minulé platby změnil." : "Účet týmu byl nedávno změněn."}</b><div style="margin-top:6px">Nový účet: <b style="font-size:18px">${esc(cz)}</b></div><div class="mu" style="margin-top:6px">${cfg.ibanAt ? "Změna platí od " + esc(fDay(cfg.ibanAt)) + " (navrhl " + esc(cfg.ibanBy || "?") + ", potvrdil " + esc(cfg.ibanOk || "?") + "). " : ""}Než zaplatíš, ověř si číslo účtu přímo u trenéra (osobně nebo telefonem).</div><button class="p w" data-mkok style="margin-top:10px;min-height:48px">Ověřila jsem účet – zobrazit QR</button></div>${warn}`;
  } else {
    try {
      markSeen(p.iban);
      // Celý text QR je v sadě alfanumerického režimu (velká písmena, číslice, mezera, $ % * + - . / :) – kompatibilní i s přísnějšími bankami
      const q = qrcode(0, "M");
      q.addData(spdPay(p.iban, p.amt, p.vs, p.msg, cfg.inst), "Alphanumeric");
      q.make();
      // Údaje pro obrázek – stejné hodnoty jako v okně, zpráva přesně jako v QR
      shown = {q, name: qrFileName(p.vs), info: {title: p.title, accName: accName(cfg, p.acc), cz, iban: p.iban, ibanFmt: ibanFmt(p.iban), amtTxt: kc(p.amt), vs: p.vs, msg, inst: !!cfg.inst, created: new Date().toLocaleDateString("cs-CZ")}};
      body = `<div style="background:#fff;padding:12px;border-radius:12px;width:min(300px,100%);margin:0 auto">${q.createSvgTag({cellSize: 4, margin: 4, scalable: true})}</div>
<button class="s w" id="mksave" style="margin-top:10px;min-height:48px">⬇️ Uložit QR</button>
<div class="mu" style="margin-top:4px;text-align:center">Platíš z tohoto telefonu? Ulož QR do Galerie a v bankovní aplikaci ho načti z obrázku.</div>
<div class="mu" style="margin-top:10px;text-align:center">Naskenuj v bankovní aplikaci. Údaje pro ruční platbu:</div>${facts}${since}${warn}`;
    } catch (e) { body = `<div class="mu" style="color:var(--no)">QR kód se nepodařilo vytvořit. Použij údaje pro ruční platbu.</div>${facts}${warn}`; }
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
<div class="mu">${i.date ? fd(i.date) + " · " : ""}předpis ${kc(+x.amt || 0)}${x.paid ? " · zaplaceno " + kc(+x.paid) : ""}${x.due ? " · splatnost " + fmtDue(x.due) : ""}${x.exc && rest ? " · 🔓 výjimka od blokace" : ""}</div>${rest ? `<div class="mu">${two ? "Na účet: <b>" + esc(accName(cfg, accOf(x, cfg))) + "</b> · " : ""}VS <b>${esc(x.vs || vsHash(x.id))}</b> · zpráva: <b>${esc(qrMsg(chargeMsg(x, S)))}</b></div>` : ""}${rest ? `<button class="p w" data-mq="${x.id}" style="margin-top:8px;min-height:48px">📱 Zaplatit ${kc(rest)} (QR)</button>` : ""}</div>`;
  }).join("") : '<div class="msg">Zatím nemáš žádné předpisy.</div>';
  a.innerHTML = `${err}<h2 style="margin:0 0 10px">💳 Moje platby</h2>${grid}${state}${sum}${list}` + qrHtml();
  a.querySelectorAll("[data-mq]").forEach(b => b.onclick = () => { qr = b.dataset.mq; render(); });
  // Hráčka potvrdila ověření nového účtu: zapamatuje se v zařízení a ukáže se QR
  const ok = a.querySelector("[data-mkok]");
  if (ok) ok.onclick = () => { const p = payData(cashCfg(S.cc)); if (p && p.iban) markSeen(p.iban); render(); };
  // ⬇️ Uložit QR: obrázek ze zobrazeného QR – Sdílet (Galerie / banka), jinde stažení souboru
  const sv = a.querySelector("#mksave");
  if (sv) sv.onclick = () => {
    const sh = shown;   // kopie – okno se mezitím může překreslit
    if (!sh) return;
    saveQrImage(sh.q, sh.info, sh.name).then(r => {
      if (r === "download") toast("QR uložen jako " + sh.name);
      else if (r === "error") toast("Obrázek QR se nepodařilo vytvořit. Použij údaje pro ruční platbu.");
    }).catch(() => toast("Obrázek QR se nepodařilo uložit."));
  };
  const x = a.querySelector("#mkx");
  if (x) x.onclick = () => { qr = null; render(); };
  const bg = a.querySelector("#mkq");
  if (bg) bg.onclick = e => { if (e.target.id === "mkq") { qr = null; render(); } };
}
