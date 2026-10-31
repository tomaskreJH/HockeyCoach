// ⚠️ Nastavení pokladny (okno #cset z ⚙️, HK.openCash, správce pokladny) → settings/cash: účty, příspěvek, splatnosti, kategorie, šablony, inst.
// Hlavní (iban) a provozní (iban2) účet; české číslo nebo IBAN, ověření mod 11 a mod 97; účet plateb příspěvků acc.contrib, šablony t.acc.
// Změna účtu jen návrh (ibanPend) a potvrzení JINÝM správcem pokladny (4 oči), vše do auditu (acc-prop, acc-ok, acc-no, acc-off).
// „Uložit nastavení“ účty nikdy nemění; ukládá merge jen známých polí (šablony a kategorie se nahradí celé). Smazání šablony = confirm2.
// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {S} from "../core/state.js";
import {clone, esc, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {accCheck, codeMatch, ibanFmt, ibanToCz, pairCode, parseAcc} from "../domain/bank-account.js";
import {ACC, ACC_META, WHO, accMeta, cashCfg} from "../domain/cash.js";
import {watchAudit} from "./audit-feed.js";

// ===== Stav =====
let D = null;        // rozpracované nastavení
let sel = "train";   // vybraná šablona
const TD_KEY = "cset-tpl-del";   // klíč potvrzení smazání šablony (confirm2)
let accIn = null;    // rozpracované vstupy nových účtů {a1, a2} (jen trenér)

// ===== Pomocné funkce =====
const el = () => document.getElementById("cset");
// Zápis hodnoty pole do rozpracovaného nastavení; cesta "t.…" míří do vybrané šablony
function setP(i) {
  const ks = i.dataset.f.split(".");
  let o = D;
  if (ks[0] === "t") { o = D.tpls[sel]; ks.shift(); }
  while (ks.length > 1) o = o[ks.shift()];
  o[ks[0]] = i.dataset.n === "nul" ? (i.value === "" ? null : +i.value) : i.dataset.n != null ? (+i.value || 0) : i.value.trim();
}
const sync = e => e.querySelectorAll("[data-f]").forEach(setP);
// Zrušení rozpracovaného potvrzení smazání šablony
const disarm = () => { if (armed(TD_KEY)) S.cf = null; };
const chip = (on, attr, label) => `<button class="chip ${on ? "on" : ""}" ${attr}>${label}</button>`;

// ===== Účty =====
const me = () => { const u = HK.user(); return ((u && u.email) || "").toLowerCase(); };
const fDt = iso => { const d = new Date(iso); return isNaN(d) ? "?" : d.toLocaleString("cs-CZ", {day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"}); };
// Účet pro zobrazení: české číslo + IBAN po čtveřicích (prázdný = „nenastaven“)
// Kód účtu (v22.21) se ukazuje u každého účtu, aby ho šlo porovnat s obrazovkou hráčky
const accTxt = ib => ib ? `<b>${esc(ibanToCz(ib) || ib)}</b> <span class="mu">(${esc(ibanFmt(ib))})</span> <span class="mu">kód <b>${esc(pairCode(ib))}</b></span>${accCheck(ib) ? "" : ' <b style="color:var(--no)">⚠️ neplatný – QR se nevytvoří</b>'}` : '<span class="mu">nenastaven</span>';
// Výsledek kontroly vstupu pod polem (u platného účtu i jeho kód)
function chkTxt(v) {
  const r = parseAcc(v);
  if (!String(v || "").trim()) return {r, h: '<div class="mu" style="margin:-6px 0 10px">Prázdné = bez účtu</div>'};
  return {r, h: r.err ? `<div style="margin:-6px 0 10px;color:var(--no);font-weight:600">✗ ${esc(r.err)}</div>` : `<div style="margin:-6px 0 10px;color:var(--ok);font-weight:600">✓ Kontrolní součty v pořádku · IBAN ${esc(ibanFmt(r.iban))} · kód <span style="font-size:17px">${esc(pairCode(r.iban))}</span></div>`};
}
// Záznam do auditu (jen přidání; pravidla databáze ho nedovolí změnit ani smazat)
const auditDoc = (act, note) => ({ts: new Date().toISOString(), by: me(), eid: "", act, note});
const ACT_TXT = {"acc-prop": "návrh změny účtu", "acc-ok": "změna účtu potvrzena", "acc-no": "návrh zamítnut", "acc-off": "návrh zrušen"};
const pairTxt = (a, b) => "hlavní " + (ibanToCz(a) || a || "–") + ", provozní " + (ibanToCz(b) || b || "–");
// Sekce účtů: aktuální stav, poslední změna, čekající návrh (potvrdit / zamítnout / zrušit), formulář návrhu (trenér), historie
function accHtml() {
  const c = S.cc || {}, pend = c.ibanPend, coach = HK.can("accounts"), mine = pend && pend.by === me();
  const last = c.ibanAt ? `Platí od ${esc(fDt(c.ibanAt))} · navrhl ${esc(c.ibanBy || "?")} · potvrdil ${esc(c.ibanOk || "?")}` : "Změna účtu zatím nebyla zaznamenána (účet zadaný před v18.6.1).";
  // Kód návrhu: navrhovatel ho vidí a přečte; potvrzující ho přepíše a aplikace ho porovná s účty z návrhu (v approve)
  const pendCode = pend ? pairCode(pend.iban, pend.iban2) : "";
  const pendBad = pend && pend.code && !codeMatch(pendCode, pend.code);
  const pendH = pend ? `<div class="cd" style="border-color:var(--wa);padding:10px"><b style="color:var(--wa)">⏳ Čeká na potvrzení změny účtů</b><div style="margin:6px 0">Hlavní: ${accTxt(pend.iban)}<br>Provozní: ${accTxt(pend.iban2)}</div><div class="mu">Navrhl ${esc(pend.by)} · ${esc(fDt(pend.at))}</div>
${pendBad ? '<div style="margin:6px 0;color:var(--no);font-weight:600">⛔ Kód se neshoduje s účty v návrhu – návrh mohl být změněn. Zamítni ho a navrhni znovu.</div>' : ""}
${mine ? `<div class="mu" style="margin:6px 0">Kód návrhu: <b style="font-size:17px">${esc(pendCode)}</b> – řekni ho potvrzujícímu (osobně nebo telefonem). Potvrdit musí jiný správce pokladny.</div><button class="s w" data-apx>Zrušit návrh</button>` : '<div class="mu" style="margin:6px 0">Před potvrzením si nech od navrhovatele přečíst kód návrhu a ověř ho jinou cestou (telefonem nebo osobně), ne jen zprávou.</div><div class="row"><button class="p" data-apo>✓ Potvrdit změnu</button><button class="d" data-apn>✕ Zamítnout</button></div>'}</div>` : "";
  const v1 = accIn ? accIn.a1 : ibanToCz(c.iban) || c.iban || "", v2 = accIn ? accIn.a2 : ibanToCz(c.iban2) || c.iban2 || "";
  const form = coach ? `<h3>Navrhnout změnu účtů</h3><label>Hlavní účet – číslo účtu (např. 19-2000145399/0800) nebo IBAN</label><input id="acc1" value="${esc(v1)}" inputmode="text" autocomplete="off"><div id="ack1">${chkTxt(v1).h}</div><label>Provozní účet (nepovinné; prázdné = vše na hlavní účet)</label><input id="acc2" value="${esc(v2)}" inputmode="text" autocomplete="off"><div id="ack2">${chkTxt(v2).h}</div><div class="mu" style="margin-bottom:6px">Změna se projeví až po potvrzení jiným trenérem nebo pokladníkem. Návrh i potvrzení se zapíší do auditu a hráčkám se nový účet zobrazí s varováním.</div><button class="s w" data-apr>📝 Navrhnout změnu účtů</button>` : '<div class="mu" style="margin-top:6px">Čísla účtů navrhuje jen trenér; pokladník změnu potvrzuje.</div>';
  watchAudit("", refreshCashSettings);   // 📉 obecné záznamy auditu (změny účtů) až při otevření nastavení
  const hist = (S.au || []).filter(x => ACT_TXT[x.act]).sort((a, b) => (b.ts || "").localeCompare(a.ts || "")).slice(0, 10)
    .map(x => `<div class="mu">${esc(fDt(x.ts))} · ${esc(ACT_TXT[x.act])} · ${esc(x.by || "")}${x.note ? " · " + esc(x.note) : ""}</div>`).join("");
  return `<div class="cd"><h2>🏦 Účty pro QR platby</h2><div>Hlavní: ${accTxt(c.iban)}<br>Provozní: ${accTxt(c.iban2)}</div><div class="mu" style="margin:6px 0 10px">${last}</div>${pendH}${form}${hist ? `<h3>Historie změn účtů</h3>${hist}` : ""}</div>`;
}
// Akce účtů: zapisují se hned dávkou (nastavení + audit), nezávisle na „Uložit nastavení“
function propose(e) {
  const a = chkTxt(e.querySelector("#acc1").value).r, b = chkTxt(e.querySelector("#acc2").value).r, c = S.cc || {};
  if (a.err || b.err) return toast("Oprav číslo účtu – neprošlo kontrolou");
  if (!a.iban) return toast("Hlavní účet je povinný");
  if (a.iban === (c.iban || "") && b.iban === (c.iban2 || "")) return toast("Účty jsou stejné jako současné");
  // code = kód účtů spočítaný na zařízení navrhovatele z toho, co zadal; potvrzující ho porovná s účty uloženými v návrhu
  const p = {iban: a.iban, iban2: b.iban, code: pairCode(a.iban, b.iban), by: me(), at: new Date().toISOString()};
  S.db.batch().merge("settings/cash", {ibanPend: p}).set("audit/" + uid(), auditDoc("acc-prop", pairTxt(p.iban, p.iban2))).commit();
  accIn = null;
  toast("Návrh odeslán – potvrdí ho jiný správce pokladny");
}
function approve() {
  const p = (S.cc || {}).ibanPend;
  if (!p || p.by === me()) return;
  if (!accCheck(p.iban) || (p.iban2 && !accCheck(p.iban2))) return toast("Navržený účet neprošel kontrolou – zamítni ho");
  // Kontrola kódem: potvrzující přepíše kód, který mu navrhovatel přečetl z jeho obrazovky. Musí sedět na účty uložené v návrhu
  // (odhalí podvržený nebo přepsaný návrh) i na kód navrhovatele uložený v návrhu.
  // Návrh bez kódu (vzniklý před v22.21) pravidla nepotvrdí – musí se zamítnout a navrhnout znovu
  if (!p.code) return toast("Návrh nemá kód (vznikl ve starší verzi) – zamítni ho a navrhni znovu.");
  const want = pairCode(p.iban, p.iban2);
  const typed = prompt("Potvrzuješ nové účty týmu?\n\n" + pairTxt(p.iban, p.iban2) + "\n\nNavrhl: " + p.by + "\n\nPřečti si od navrhovatele kód návrhu a napiš ho sem (oba účty, např. 1A2B-3C4D 5E6F-7A8B):");
  if (typed === null) return;
  if (!codeMatch(want, typed) || !codeMatch(p.code, typed)) return toast("Kód nesouhlasí – návrh nepotvrzen. Zamítni ho a navrhni znovu.");
  // ibanCode = kód potvrzený z návrhu (pravidla vyžadují shodu s kódem v návrhu)
  S.db.batch().merge("settings/cash", {iban: p.iban, iban2: p.iban2 || "", ibanBy: p.by, ibanOk: me(), ibanAt: new Date().toISOString(), ibanCode: p.code, ibanPend: "__del"})
    .set("audit/" + uid(), auditDoc("acc-ok", pairTxt(p.iban, p.iban2) + " (navrhl " + p.by + ")")).commit();
  toast("Změna účtů potvrzena");
}
function dropPend(act) {
  const p = (S.cc || {}).ibanPend;
  if (!p) return;
  S.db.batch().merge("settings/cash", {ibanPend: "__del"}).set("audit/" + uid(), auditDoc(act, pairTxt(p.iban, p.iban2) + " (navrhl " + p.by + ")")).commit();
}

// ===== Vykreslení =====
function html() {
  const t = D.tpls[sel], keys = Object.keys(D.tpls);
  const cats = k => `<div class="chips">${D.cats[k].map((c, i) => chip(false, `data-rc="${k}|${i}"`, esc(c) + " ✕")).join("")}</div><div class="row" style="flex-wrap:nowrap"><input id="nc${k}" placeholder="Nová kategorie" style="margin:0"><button class="s" data-ra="${k}" style="flex:none">Přidat</button></div>`;
  const catOpts = v => [...new Set([...D.cats.out, v].filter(Boolean))].map(c => `<option ${c === v ? "selected" : ""}>${esc(c)}</option>`).join("");
  const cost = t.cost.map((x, i) => `<div class="row" style="flex-wrap:nowrap;align-items:center;margin-bottom:6px"><select data-f="t.cost.${i}.cat" style="margin:0">${catOpts(x.cat)}</select><input data-f="t.cost.${i}.payee" value="${esc(x.payee || "")}" placeholder="Komu" style="margin:0"><input data-f="t.cost.${i}.amt" data-n="1" type="number" min="0" value="${x.amt || ""}" placeholder="Kč" style="margin:0;max-width:90px"><button class="d" data-cr="${i}" style="flex:none;padding:8px 12px">🗑</button></div>`).join("");
  const who = Object.keys(WHO).map(g => {
    // Všechny skupiny včetně osvobozených mají stejné volby (platí / neplatí, výpočet / pevná částka)
    const w = t.who[g] || {pays: false, mode: "calc", flat: 0};
    return `<div class="cd" style="padding:10px;margin-bottom:8px"><b>${WHO[g]}</b><div class="chips" style="margin-top:6px">${chip(w.pays, `data-wp="${g}"`, w.pays ? "Platí: ANO" : "Platí: NE")}${chip(w.mode !== "flat", `data-wm="${g}|calc"`, "Výpočet")}${chip(w.mode === "flat", `data-wm="${g}|flat"`, "Pevná částka")}</div>${w.mode === "flat" ? `<input data-f="t.who.${g}.flat" data-n="1" type="number" min="0" value="${w.flat || ""}" placeholder="Kč na osobu (před koeficientem)" style="max-width:200px;margin:0">` : ""}</div>`;
  }).join("");
  return `<div style="max-width:800px;margin:0 auto"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px"><h2 style="margin:0">💰 Nastavení pokladny</h2><button class="s" id="csx">Zavřít</button></div>
${accHtml()}
<div class="cd"><h2>Obecné</h2><label>Okamžitá platba v QR</label><div class="chips">${chip(D.inst !== false, "data-ip", D.inst !== false ? "Okamžitá platba: ANO" : "Okamžitá platba: NE")}</div><div class="mu" style="margin-bottom:6px">QR požádá banku o okamžitou platbu (PT:IP); banka, která ji nepodporuje, pošle běžnou platbu.</div><label>Příspěvky se platí na</label><div class="chips">${Object.entries(ACC).map(([a, t]) => chip(D.acc.contrib === a, `data-ac="${a}"`, t)).join("")}</div><div class="mu" style="margin-bottom:6px">Platby na různé účty hráčka nesmí sloučit do jednoho převodu; souhrnná platba (jeden QR) jde jen za předpisy na stejný účet.</div><label>Měsíční příspěvek (Kč, jedna částka pro všechny; individuálně přes koeficient hráčky v %)</label><input data-f="contrib" data-n="1" type="number" min="0" value="${D.contrib || ""}" style="max-width:160px"><div class="row"><div><label>Splatnost události: dnů po události</label><input data-f="due.ev" data-n="1" type="number" min="0" value="${D.due.ev}"></div><div><label>Splatnost příspěvku: den v měsíci (předem)</label><input data-f="due.cm" data-n="1" type="number" min="1" max="28" value="${D.due.cm}"></div></div></div>
<div class="cd"><h2>Kategorie příjmů</h2>${cats("in")}</div><div class="cd"><h2>Kategorie výdajů</h2>${cats("out")}</div>
<div class="cd"><h2>Šablony událostí</h2><div class="chips">${keys.map(k => chip(k === sel, `data-tp="${k}"`, esc(D.tpls[k].name))).join("")}</div>
<label>Název šablony</label><input data-f="t.name" value="${esc(t.name)}"><label>Platby za událost na účet</label><div class="chips">${Object.entries(ACC).map(([a, n]) => chip((t.acc || "op") === a, `data-ta="${a}"`, n)).join("")}</div><label>Splatnost: dnů po události (prázdné = výchozí)</label><input data-f="t.dueDays" data-n="nul" type="number" min="0" value="${t.dueDays != null ? t.dueDays : ""}" style="max-width:160px">
<h3>Náklady</h3>${cost || '<div class="mu" style="margin-bottom:6px">Bez nákladů (doplní se u konkrétní události).</div>'}<button class="s" data-ca style="margin-bottom:10px">+ Nákladová položka</button>
<h3>Kdo platí a jak se počítá</h3><div class="mu" style="margin-bottom:6px">Cena se dělí všemi přihlášenými hráčkami (každá jako jeden celý kus) a násobí koeficientem hráčky. Osvobozené (zvýhodněné) hráčky mají vlastní nastavení.</div>${who}
<div class="row"><button class="s" data-tn>+ Nová šablona (kopie této)</button>${sel.startsWith("t_") ? `<button class="d" data-td style="${armed(TD_KEY) ? "background:var(--no);color:#fff" : ""}">${armed(TD_KEY) ? "Opravdu smazat? Klepni znovu" : "Smazat šablonu"}</button>` : ""}</div></div>
<button class="p w" id="css" style="min-height:52px">💾 Uložit nastavení</button><button class="s w" id="csx2" style="margin-top:10px;min-height:48px">Zavřít bez uložení</button></div>`;
}

// ===== Eventy =====
function draw() {
  const e = el(), st = e.scrollTop;
  e.innerHTML = html();
  bind(e);
  e.scrollTop = st;
}
function bind(e) {
  const q = s => e.querySelectorAll(s), close = () => { e.style.display = "none"; e.innerHTML = ""; D = null; };
  // Každá jiná akce zruší rozpracované potvrzení smazání šablony (vybraná šablona se pak nemůže změnit pod rukou)
  const act = (s, fn) => q(s).forEach(b => { b.onclick = () => { sync(e); disarm(); fn(b); draw(); }; });
  q("[data-f]").forEach(i => { i.onchange = () => { sync(e); draw(); }; });
  act("[data-tp]", b => { sel = b.dataset.tp; });
  act("[data-ac]", b => { D.acc.contrib = b.dataset.ac; });
  act("[data-ip]", () => { D.inst = D.inst === false; });
  // Účty: průběžná kontrola při psaní, rozpracované hodnoty přežijí překreslení
  const a1 = e.querySelector("#acc1"), a2 = e.querySelector("#acc2");
  const keep = () => { if (a1) accIn = {a1: a1.value, a2: a2.value}; };
  if (a1) { a1.oninput = () => { keep(); e.querySelector("#ack1").innerHTML = chkTxt(a1.value).h; }; a2.oninput = () => { keep(); e.querySelector("#ack2").innerHTML = chkTxt(a2.value).h; }; }
  act("[data-apr]", () => propose(e));
  act("[data-apo]", () => approve());
  act("[data-apn]", () => { if (confirm("Zamítnout návrh změny účtů?")) dropPend("acc-no"); });
  act("[data-apx]", () => dropPend("acc-off"));
  act("[data-ta]", b => { D.tpls[sel].acc = b.dataset.ta; });
  act("[data-ra]", b => { const k = b.dataset.ra, v = (document.getElementById("nc" + k).value || "").trim(); if (v && !D.cats[k].includes(v)) D.cats[k].push(v); });
  act("[data-rc]", b => { const [k, i] = b.dataset.rc.split("|"); D.cats[k].splice(+i, 1); });
  act("[data-ca]", () => { D.tpls[sel].cost.push({cat: D.cats.out[0] || "", payee: "", amt: 0}); });
  act("[data-cr]", b => { D.tpls[sel].cost.splice(+b.dataset.cr, 1); });
  // Skupina chybějící ve starší šabloně se doplní s výchozími hodnotami
  const wOf = g => (D.tpls[sel].who[g] = D.tpls[sel].who[g] || {pays: false, mode: "calc", flat: 0});
  act("[data-wp]", b => { const w = wOf(b.dataset.wp); w.pays = !w.pays; });
  act("[data-wm]", b => { const [g, m] = b.dataset.wm.split("|"); wOf(g).mode = m; });
  act("[data-tn]", () => { const k = "t_" + uid(), c = clone(D.tpls[sel]); c.name = "Nová šablona"; D.tpls[k] = c; sel = k; });
  // Smazání šablony: 1. klepnutí označí, 2. do 4 s smaže (jen z rozpracovaného nastavení – do databáze až „Uložit“)
  q("[data-td]").forEach(b => { b.onclick = () => { sync(e); confirm2(TD_KEY, () => { delete D.tpls[sel]; sel = "train"; draw(); }, refreshCashSettings); }; });
  // Tlačítka Zavřít (každému tlačítku zvlášť; q() vrací seznam uzlů)
  q("#csx, #csx2").forEach(b => { b.onclick = () => { disarm(); close(); }; });
  q("#css")[0].onclick = () => {
    sync(e);
    // Účty a jejich zabezpečení se nikdy nemění tímto uložením: převezmou se z aktuálního stavu databáze (i čekající návrh)
    const c = S.cc || {};
    ACC_META.forEach(k => { delete D[k]; });
    Object.assign(D, {iban: c.iban || "", iban2: c.iban2 || ""}, accMeta(c));
    S.db.doc("settings/cash").merge(D).then(() => toast("Nastavení pokladny uloženo")).catch(() => toast("Uložení se nepovedlo"));
    disarm(); close();
  };
}

// ===== Export =====
export function openCashSettings() {
  if (!HK.can("money")) return;
  let e = el();
  if (!e) { e = document.createElement("div"); e.id = "cset"; document.body.appendChild(e); }
  // Nad živým zápisem, zápisem utkání, opravami a nápovědou
  e.style.cssText = "position:fixed;inset:0;z-index:56;background:var(--bg);overflow:auto;padding:12px;padding-top:calc(12px + env(safe-area-inset-top,0px));padding-bottom:calc(40px + env(safe-area-inset-bottom,0px));display:block";
  D = cashCfg(S.cc);
  sel = "train";
  disarm();
  accIn = null;
  draw();
}
// Překreslení otevřeného okna po změně nastavení v databázi (potvrzení / návrh z jiného zařízení); rozpracované údaje zůstávají
export function refreshCashSettings() { const e = el(); if (D && e && e.style.display !== "none") { sync(e); draw(); } }
