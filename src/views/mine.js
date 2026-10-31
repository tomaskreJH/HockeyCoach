// ⚠️ Moje platby: člen vidí jen své předpisy (S.ch), zaplacené, dluh a QR platbu (SPD, lokálně src/lib/qrcode.js); banner dluhu v Událostech.
// Přepínač 📄 Předpisy / 📅 Po měsících (S.mk) s kartou 📊 Moje docházka (sezóna, účast po měsících) a ✋ žádostí o změnu placení.
// Porovnání způsobu placení hráčka nevidí – je jen pro správce pokladny (finance.js → ⚖️ Tarify).
// Nezaplacené po účtech; souhrnná platba (osobní VS, zpráva „Souhrn: …“) jen za předpisy se stejným IBAN. Příspěvek má eid "c_RRRR-MM".
// Blokace „Jdu“ dluhem po splatnosti je v events.js.
// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {S} from "../core/state.js";
import {esc, fd, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {accCheck, accCode, ibanFmt, ibanToCz, markSeen, recentChange, seenAccs} from "../domain/bank-account.js";
import {attByMonth, attEvents, attSummary, pastEvents, seasonOf} from "../domain/attendance.js";
import {GRP, accIban, accLabel, accName, accOf, cashCfg, chargeItem, chargeMsg, debtOf, fmtDue, grpAt, kc, multiMsg, overdue, payerName, personVs, qrMsg, r2, restOf, spdPay, twoAcc, vsHash, ymLabel, ymNow} from "../domain/cash.js";
import {myMonths} from "../domain/economy.js";
import {REQ_COLL, REQ_ST, openReq, payReqDoc, payReqError, reqYms, reqsOf} from "../domain/requests.js";
import qrcode from "../lib/qrcode.js";
import {moneyWaitHtml} from "./payments.js";
import {qrFileName, saveQrImage} from "./qr-image.js";
import {bindReq, reqBanner, reqLine} from "./request-list.js";
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
  if (!p || !HK.can("money")) return "";
  return `<div class="cd" style="border-color:var(--wa)"><b style="color:var(--wa)">⏳ Čeká na potvrzení změna účtů týmu</b><div class="mu">Navrhl ${esc(p.by)} · ${esc(fDay(p.at))}.${p.by === me ? " Potvrdit musí jiný správce pokladny." : " Před potvrzením ověř číslo účtu s navrhovatelem."}</div><button class="s w" data-mko style="margin-top:8px">🏦 Otevřít nastavení pokladny</button></div>`;
}
export function mineBanner() {
  const pb = pendBanner() + reqBanner(true);
  if (!ids().length) return pb;
  const d = debtOf(S.ch, ids());
  if (!d.debt) return pb;
  return pb + `<div class="cd" style="border-color:var(--no)"><b style="color:var(--no)">⚠️ Máš nezaplaceno ${kc(d.debt)}</b>${d.over ? `<div class="mu">Po splatnosti: ${kc(d.over)}${d.blocked ? " – přihlášení „Jdu“ je zablokováno, dokud nezaplatíš (nebo ti pokladník neudělí výjimku)." : ""}</div>` : ""}<button class="s w" data-mk style="margin-top:8px">💳 Moje platby</button></div>`;
}
export function bindBanner(a) {
  a.querySelectorAll("[data-mk]").forEach(b => b.onclick = () => { S.tab = "mk"; S.mid = null; S.evid = null; render(); window.scrollTo(0, 0); });
  a.querySelectorAll("[data-mko]").forEach(b => b.onclick = () => { if (HK.openCash) HK.openCash(); });
  bindReq(a);   // banner žádostí → Team → Platby
}

// ===== QR okno =====
// QR jen z účtu, který projde kontrolními součty (accCheck), zpráva qrMsg; zařízení si pamatuje ověřené účty (seenAccs) – nový účet
// nebo změna v posledních 14 dnech = nejdřív varování, QR až po potvrzení. ⬇️ Uložit QR kreslí PNG z téhož objektu qrcode (qr-image.js).
function qrHtml() {
  shown = null;   // uložit lze jen QR, který se v tomto vykreslení skutečně zobrazí
  if (!qr) return "";
  const cfg = cashCfg(S.cc), p = payData(cfg);
  if (!p) { qr = null; return ""; }
  const two = twoAcc(cfg), accLine = two ? `<b>${esc(accLabel(cfg, p.acc))}</b><br>` : "";
  let body;
  // Údaje pro ruční platbu: číslo účtu v českém tvaru i IBAN, zpráva přesně jako v QR
  const msg = qrMsg(p.msg), cz = ibanToCz(p.iban);
  // Kontrolní kód účtu (v22.21): stejný kód je v nastavení pokladny – porovnáním z jiného zařízení se ověří, že QR ukazuje na správný účet
  const code = accCode(p.iban);
  const facts = `<div style="text-align:center;margin-top:6px">${accLine}Účet: <b style="font-size:18px">${esc(cz || p.iban)}</b><br><span class="mu">IBAN ${esc(ibanFmt(p.iban))}</span><br>Kód účtu: <b>${esc(code)}</b> <span class="mu">(shodný s kódem u trenéra)</span><br>Částka: <b>${kc(p.amt)}</b><br>Variabilní symbol: <b>${esc(p.vs)}</b><br>Zpráva pro příjemce: <b>${esc(msg)}</b>${cfg.inst ? "<br><span class=\"mu\">Okamžitá platba (pokud ji tvoje banka podporuje)</span>" : ""}</div>`;
  const since = cfg.ibanAt ? `<div class="mu" style="text-align:center;margin-top:6px">Účet platí od ${esc(fDay(cfg.ibanAt))} (navrhl ${esc(cfg.ibanBy || "?")}, potvrdil ${esc(cfg.ibanOk || "?")}).</div>` : "";
  const warn = `<div class="cd" style="border-color:var(--wa);margin-top:10px;padding:10px;font-size:13px">⚠️ ${WARN_TXT}</div>`;
  const seen = seenAccs(), fresh = recentChange(cfg.ibanAt), gate = !seen.includes(p.iban) && (seen.length > 0 || fresh);
  if (!p.iban) body = '<div class="mu">Účet týmu zatím není nastaven. Požádej trenéra nebo pokladníka.</div>';
  else if (!accCheck(p.iban)) body = '<div class="cd" style="border-color:var(--no);color:var(--no)"><b>⛔ Účet týmu neprošel kontrolou čísla účtu.</b><div>QR se z bezpečnostních důvodů nevytvoří. Neplať a ozvi se trenérovi.</div></div>';
  else if (gate) {
    // Nový nebo nedávno změněný účet: nejdřív varování, QR až po potvrzení hráčky (zapamatuje se v zařízení)
    body = `<div class="cd" style="border-color:var(--no)"><b style="color:var(--no)">⚠️ ${seen.length ? "Účet týmu se od tvé minulé platby změnil." : "Účet týmu byl nedávno změněn."}</b><div style="margin-top:6px">Nový účet: <b style="font-size:18px">${esc(cz)}</b> · kód <b>${esc(code)}</b></div><div class="mu" style="margin-top:6px">${cfg.ibanAt ? "Změna platí od " + esc(fDay(cfg.ibanAt)) + " (navrhl " + esc(cfg.ibanBy || "?") + ", potvrdil " + esc(cfg.ibanOk || "?") + "). " : ""}Než zaplatíš, ověř si číslo účtu přímo u trenéra (osobně nebo telefonem).</div><button class="p w" data-mkok style="margin-top:10px;min-height:48px">Ověřila jsem účet – zobrazit QR</button></div>${warn}`;
  } else {
    try {
      markSeen(p.iban);
      // Celý text QR je v sadě alfanumerického režimu (velká písmena, číslice, mezera, $ % * + - . / :) – kompatibilní i s přísnějšími bankami
      const q = qrcode(0, "M");
      q.addData(spdPay(p.iban, p.amt, p.vs, p.msg, cfg.inst), "Alphanumeric");
      q.make();
      // Údaje pro obrázek – stejné hodnoty jako v okně, zpráva přesně jako v QR
      shown = {q, name: qrFileName(p.vs, cz), info: {title: p.title, accName: accLabel(cfg, p.acc), cz, iban: p.iban, ibanFmt: ibanFmt(p.iban), code, amtTxt: kc(p.amt), vs: p.vs, msg, inst: !!cfg.inst, created: new Date().toLocaleDateString("cs-CZ")}};
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

// ===== Po měsících =====
// Pohled Moje platby: v = "list" | "mon", day = den určující sezónu, open = rozbalený měsíc
const mk = () => (S.mk = S.mk || {v: "list", day: td(), open: null});
// Sezóna jako text „2026/27“
const seasonTxt = se => se.from.slice(0, 4) + "/" + se.to.slice(2, 4);
// Řádek předpisu v rozbaleném měsíci (s tlačítkem QR u nezaplaceného)
function monItem(x) {
  const i = chargeItem(x.eid, S), rest = restOf(x);
  return `<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:6px"><span>${esc(i.title)}${i.date && i.type !== "contrib" ? " · " + fd(i.date) : ""}<br><span class="mu">předpis ${kc(+x.amt || 0)}${x.paid ? " · zaplaceno " + kc(Math.min(+x.paid, +x.amt || 0)) : ""}</span></span>${rest ? `<button class="p" data-mq="${x.id}" style="flex:0 0 auto">📱 ${kc(rest)}</button>` : '<span class="tag pp">zaplaceno</span>'}</div>`;
}
// Karta jednoho měsíce: předepsáno (příspěvek / události), zaplaceno, zbývá, účast v měsíci (at); klepnutím rozbalit předpisy
function monCard(m, open, at) {
  const parts = [m.contrib.amt ? "příspěvek " + kc(m.contrib.amt) : "", m.ev.amt ? "události " + kc(m.ev.amt) : ""].filter(Boolean).join(" · ");
  const list = open ? `<div style="margin-top:6px;border-top:1px solid var(--bd);padding-top:4px">${m.items.slice().sort((p, q) => (chargeItem(p.eid, S).date || "").localeCompare(chargeItem(q.eid, S).date || "")).map(monItem).join("")}</div>` : "";
  return `<div class="cd"><div data-mkm="${m.ym}" style="cursor:pointer"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${open ? "▾" : "▸"} ${esc(ymLabel(m.ym))}</b><span class="tag ${m.rest ? "sh" : "pp"}">${m.rest ? "zbývá " + kc(m.rest) : "zaplaceno"}</span></div>
<div class="mu">Předepsáno ${kc(m.amt)}${parts ? " (" + parts + ")" : ""} · zaplaceno ${kc(m.paid)}${at && at.n ? " · účast " + at.yes + " z " + at.n : ""}</div></div>${list}</div>`;
}
// Karta 📊 Moje docházka: uplynulé události sezóny (tréninky, domácí a venkovní zápasy) – účast, %, 🚫 nedorazila, ❌ omluvena.
// Porovnání způsobu placení hráčka nevidí (v22.1.3) – má ho jen správce pokladny v Team → 💰 Platby → ⚖️ Tarify.
const ATT_ROWS = [["train", "🏒 Tréninky"], ["home", "🏠 Domácí zápasy"], ["away", "🚌 Venkovní zápasy"]];
function attCard(se) {
  const id = HK.pid() || HK.tid();
  if (!id) return "";
  const r = attSummary(pastEvents(attEvents(S.ev, S.ma), se.from, se.to, Date.now()), S.at, [id])[id], head = "<h2>📊 Moje docházka</h2>";
  if (!r.all.n) return `<div class="cd">${head}<div class="mu">V této sezóně zatím nebyla žádná událost.</div></div>`;
  const line = (l, x) => `<div style="display:flex;justify-content:space-between;gap:8px;margin-top:4px"><span>${l}</span><span><b>${x.yes}</b> z ${x.n}${x.pct == null ? "" : " · " + x.pct + " %"}${x.nos ? ` · <b style="color:var(--no)">🚫 ${x.nos}</b>` : ""}</span></div>`;
  const rows = ATT_ROWS.filter(([k]) => r[k].n).map(([k, l]) => line(l, r[k])).join("");
  const a = r.all, other = `❌ omluveno ${a.no} · ❓ nejistá ${a.maybe} · bez odpovědi ${a.none}${a.late ? ` · <b style="color:var(--wa)">⏰ pozdě ${a.late}</b>` : ""}`;
  return `<div class="cd">${head}<div class="grid3"><div class="stat"><b>${a.yes} / ${a.n}</b>účast</div><div class="stat"><b>${a.pct == null ? "–" : a.pct + " %"}</b>docházka</div><div class="stat"><b style="color:${a.nos ? "var(--no)" : "inherit"}">${a.nos}</b>🚫 bez omluvy</div></div>${rows}<div class="mu" style="margin-top:6px">${other}. Počítají se uplynulé nezrušené události sezóny.</div></div>`;
}
// ===== Žádost o změnu placení =====
// Hráčka (s plpay) propojená s účtem, nebo null
const meP = () => { const pid = HK.pid(); return pid ? S.pl.find(p => p.id === pid) || null : null; };
const otherGrp = g => (g === "monthly" ? "single" : "monthly");
// Stav vlastní žádosti: otevřená (lze zrušit), nebo poslední vyřízená v posledních 30 dnech s odpovědí
function reqState() {
  const p = meP();
  if (!p) return "";
  const o = openReq(S.rq, p.id, "pay");
  if (o) return `<div class="cd" style="border-color:var(--wa)"><b>✋ Žádost o změnu placení – ${esc(REQ_ST.open)}</b><div>${reqLine(o)}</div>${o.note ? `<div class="mu">„${esc(o.note)}“</div>` : ""}<button class="s w" id="mkrqdel" style="margin-top:8px">${armed("mkrqdel" + o.id) ? "Opravdu zrušit žádost?" : "Zrušit žádost"}</button></div>`;
  const l = reqsOf(S.rq, p.id, "pay").find(r => r.st !== "open" && Date.now() - new Date(r.doneAt || r.at).getTime() < 30 * 864e5);
  if (!l) return "";
  return `<div class="cd" style="border-color:var(--${l.st === "ok" ? "ok" : "no"})"><b>${l.st === "ok" ? "✅" : "❌"} Žádost o změnu placení – ${esc(REQ_ST[l.st] || l.st)}</b><div>${reqLine(l)}</div>${l.reply ? `<div class="mu">Odpověď: „${esc(l.reply)}“</div>` : ""}</div>`;
}
// Formulář žádosti (v pohledu Po měsících): bez otevřené žádosti tlačítko, po klepnutí měsíc od kdy a poznámka
function reqForm() {
  const p = meP(), o = mk();
  if (!p || p.ex === true || openReq(S.rq, p.id, "pay")) return "";
  if (!o.rq) return `<button class="s w" id="mkrq" style="margin-bottom:10px;min-height:48px">✋ Požádat o změnu placení</button>`;
  const yms = reqYms(ymNow()), ym = yms.includes(o.rq.ym) ? o.rq.ym : yms[0], to = otherGrp(grpAt(p, ym));
  return `<div class="cd"><h2>✋ Žádost o změnu placení</h2><div>Od <select id="mkrqym">${yms.map(y => `<option value="${y}"${y === ym ? " selected" : ""}>${esc(ymLabel(y))}</option>`).join("")}</select> chci platit: <b>${esc(GRP[to])}</b></div>
<textarea id="mkrqn" maxlength="300" placeholder="Poznámka pro pokladníka (nepovinné)" style="margin-top:8px;width:100%">${esc(o.rq.note || "")}</textarea>
<div class="mu">Změna platí nejdřív od příštího měsíce. O osvobození nebo jiný koeficient požádej pokladníka osobně.</div>
<div class="row" style="margin-top:8px"><button class="p" id="mkrqok">Odeslat žádost</button><button class="s" id="mkrqx">Zrušit</button></div></div>`;
}
// Odeslání žádosti: kontrola (payReqError), nový dokument v requests
function sendReq() {
  const p = meP(), o = mk();
  if (!p || !o.rq) return;
  const yms = reqYms(ymNow()), ym = yms.includes(o.rq.ym) ? o.rq.ym : yms[0], to = otherGrp(grpAt(p, ym));
  const e = payReqError(p, to, ym, ymNow(), S.rq);
  if (e) return toast(e);
  const u = HK.user();
  S.db.collection(REQ_COLL).add(payReqDoc(p, to, ym, o.rq.note, (u && u.email) || "", new Date().toISOString()))
    .then(() => toast("Žádost odeslána pokladníkovi")).catch(() => toast("Žádost se nepodařilo odeslat"));
  o.rq = null;
  render();
}

// Pohled 📅 Po měsících: sezóna (◀ ▶), souhrn plateb sezóny, 📊 moje docházka, měsíce od nejnovějšího (platby + účast)
function monthsHtml(items) {
  const o = mk(), mm = myMonths(items, S, o.day), se = mm.season, id = HK.pid() || HK.tid();
  const am = id ? attByMonth(pastEvents(attEvents(S.ev, S.ma), se.from, se.to, Date.now()), S.at, id) : {};
  const nav = `<div class="row" style="align-items:center;margin-bottom:8px"><button class="s" data-mks="-1" style="flex:0 0 auto">◀</button><b style="text-align:center">Sezóna ${seasonTxt(se)}</b><button class="s" data-mks="1" style="flex:0 0 auto">▶</button></div>`;
  const tot = `<div class="grid3"><div class="stat"><b>${kc(mm.total.amt)}</b>předepsáno</div><div class="stat"><b style="color:var(--ok)">${kc(mm.total.paid)}</b>zaplaceno</div><div class="stat"><b style="color:${mm.total.rest ? "var(--no)" : "inherit"}">${kc(mm.total.rest)}</b>zbývá</div></div>`;
  const list = mm.months.length ? mm.months.map(m => monCard(m, o.open === m.ym, am[m.ym])).join("") : '<div class="msg">V této sezóně nemáš žádné předpisy.</div>';
  return nav + tot + attCard(se) + list + reqForm();
}

// ===== Vykreslení =====
export function mineView(a) {
  const my = ids();
  if (!my.length) { a.innerHTML = '<div class="msg">Tvůj účet není propojen s hráčkou ani s členem týmu. Požádej trenéra (⚙️ → Členové týmu).</div>'; return; }
  // 📉 Správce pokladny v úsporném režimu: Moje platby načtou pokladnu (po načtení se aplikace překreslí sama)
  if (!HK.money.ok()) { HK.money.load(); a.innerHTML = moneyWaitHtml(false); return; }
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
<div class="mu">${i.date ? fd(i.date) + " · " : ""}předpis ${kc(+x.amt || 0)}${x.paid ? " · zaplaceno " + kc(+x.paid) : ""}${x.due ? " · splatnost " + fmtDue(x.due) : ""}${x.exc && rest ? " · 🔓 výjimka od blokace" : ""}</div>${rest ? `<div class="mu">${two ? "Na účet: <b>" + esc(accLabel(cfg, accOf(x, cfg))) + "</b> · " : ""}VS <b>${esc(x.vs || vsHash(x.id))}</b> · zpráva: <b>${esc(qrMsg(chargeMsg(x, S)))}</b></div>` : ""}${rest ? `<button class="p w" data-mq="${x.id}" style="margin-top:8px;min-height:48px">📱 Zaplatit ${kc(rest)} (QR)</button>` : ""}</div>`;
  }).join("") : '<div class="msg">Zatím nemáš žádné předpisy.</div>';
  const o = mk(), tabs = `<div class="row" style="margin-bottom:10px"><button class="${o.v === "list" ? "p" : "s"}" data-mkv="list">📄 Předpisy</button><button class="${o.v === "mon" ? "p" : "s"}" data-mkv="mon">📅 Po měsících</button></div>`;
  const body = o.v === "mon" ? monthsHtml(d.items) : sum + list;
  a.innerHTML = `${err}<h2 style="margin:0 0 10px">💳 Moje platby</h2>${grid}${state}${reqState()}${tabs}${body}` + qrHtml();
  a.querySelectorAll("[data-mq]").forEach(b => b.onclick = e => { e.stopPropagation(); qr = b.dataset.mq; render(); });
  // Přepínač pohledu, posun sezóny a rozbalení měsíce
  a.querySelectorAll("[data-mkv]").forEach(b => b.onclick = () => { mk().v = b.dataset.mkv; render(); });
  a.querySelectorAll("[data-mks]").forEach(b => b.onclick = () => { const k = mk(), y = +seasonOf(k.day).from.slice(0, 4) + (+b.dataset.mks); k.day = y + "-09-01"; k.open = null; render(); });
  a.querySelectorAll("[data-mkm]").forEach(b => b.onclick = () => { const k = mk(); k.open = k.open === b.dataset.mkm ? null : b.dataset.mkm; render(); });
  // Žádost o změnu placení: otevřít formulář, měsíc a poznámka (pamatují se při překreslení), odeslat, zrušit otevřenou žádost
  const q = s => a.querySelector(s);
  if (q("#mkrq")) q("#mkrq").onclick = () => { mk().rq = {ym: reqYms(ymNow())[0], note: ""}; render(); };
  if (q("#mkrqym")) q("#mkrqym").onchange = () => { mk().rq.ym = q("#mkrqym").value; render(); };
  if (q("#mkrqn")) q("#mkrqn").oninput = () => { mk().rq.note = q("#mkrqn").value; };
  if (q("#mkrqok")) q("#mkrqok").onclick = sendReq;
  if (q("#mkrqx")) q("#mkrqx").onclick = () => { mk().rq = null; render(); };
  if (q("#mkrqdel")) q("#mkrqdel").onclick = () => {
    const o = meP() && openReq(S.rq, meP().id, "pay");
    if (o) confirm2("mkrqdel" + o.id, () => { S.db.doc(REQ_COLL + "/" + o.id).delete(); toast("Žádost zrušena"); });
  };
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
