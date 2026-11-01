// Okno ⚙️ Účet a data (všechny role, HK.openCfg z main.js): nahoře 👤 Účet (verze, Načíst novou verzi, u managera 🔒 Vyžadovat verzi),
// pod ním sbalitelné sekce (otevřená nejvýš jedna, localStorage), stav v záhlaví sbalené sekce; 💾 Data = záloha, CSV, obnova a 📉 odhad čtení;
// 🧪 Beta testování (manager nebo vývojář) a přepnutí kanálu v 👤 Účet – views/beta-view.js.
// Jen vykreslení a obsluha – údaje a zápisy přes HK.cfg, oprávnění HK.can. 🔐 Práva rolí: views/perm-view.js.

// ===== Importy =====
import {APP_VERSION, cmpVer} from "../core/app-version.js";
import {IS_BETA} from "../core/channel.js";
import {armed, confirm2} from "../core/actions.js";
import {esc, failMsg, LS, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {onlineCount, seenState} from "../domain/presence.js";
import {READ_LIMIT, collLabel, readCost} from "../domain/read-cost.js";
import {betaAcctHtml, betaSecHtml, bindBetaAcct, renderBetaTesters} from "./beta-view.js";
import {permStatus, renderPerm, resetPermWork} from "./perm-view.js";

// ===== Konstanty a stav =====
const OPEN_KEY = "hk-cfg-open";      // id rozbalené sekce v localStorage
let seq = 0;                         // pořadí otevření ⚙️ – klíč potvrzení platí jen v právě otevřeném okně
let pendingImport = null;            // načtený soubor zálohy čekající na Sloučit / Nahradit
let addOpen = false;                 // formulář „+ Přidat člena ručně“ rozbalený

// ===== Pomocné funkce =====
const C = () => HK.cfg;
const opts = (list, sel) => list.map(([v, t, def]) => `<option value="${esc(v)}"${(sel != null ? v === sel : def) ? " selected" : ""}>${esc(t)}</option>`).join("");
const listOpts = (list, empty) => `<option value="">${esc(empty)}</option>` + list.map(x => `<option value="${esc(x.id)}">${esc(x.label)}</option>`).join("");
const openId = () => LS.get(OPEN_KEY) || "";
// Doplněk hlášky po obnově: kolik důvodů omluv ze staré zálohy se nepřevedlo (jiný tvar id docházky)
const dropTxt = k => k ? " (" + k + " důvodů omluv ze staré zálohy se nepřevedlo)" : "";
// Potvrzení druhým klepnutím přes společné confirm2: 1. klepnutí změní text a barvu tlačítka, 2. do 4 s provede fn
function arm2(btn, name, txt, fn) {
  const key = "cfg:" + seq + ":" + name;
  if (btn.dataset.t == null) btn.dataset.t = btn.textContent;
  const draw = () => { const on = armed(key); btn.textContent = on ? txt : btn.dataset.t; btn.style.background = on ? "var(--no)" : ""; btn.style.color = on ? "#fff" : ""; };
  confirm2(key, fn, draw);
}
// Sbalitelná sekce: záhlaví s ikonou, názvem a stavem (st = text, wa = zvýraznit jako upozornění), obsah skrytý, dokud není rozbalená
function sec(id, title, body, st, wa) {
  const on = openId() === id;
  return `<div class="acc${on ? " on" : ""}" data-acc="${id}"><button class="acc-h" data-acch="${id}" aria-expanded="${on}"><span>${title}</span><span class="acc-st${wa ? " wa" : ""}">${st ? esc(st) : ""}</span><span class="acc-ch">▸</span></button><div class="acc-b"${on ? "" : " hidden"}>${body}</div></div>`;
}
// Popis brány verze: požadované minimum, kdo ho nastavil, a zda tato verze stačí
function verInfo() {
  const g = C().gateInfo();
  if (!g.min) return "<br>Minimální verze není nastavená (zapisovat smí každá verze).";
  return "<br>Minimální verze: <b>v" + esc(g.min) + "</b>" + (g.at ? " (" + esc(g.at) + (g.by ? ", " + esc(g.by) : "") + ")" : "") + (g.old ? " – <b>tato verze je starší, zápis je zablokovaný.</b>" : ".");
}

// ===== Sekce =====
// 👤 Účet: e-mail, role, připojení, odhlášení, verze aplikace a brána verze (vždy vidět, nesbaluje se);
// manager tu má i 🔒 Vyžadovat verzi (zvýšení minimální verze – potvrzení druhým klepnutím)
function accountHtml(coach, staff) {
  const a = C().acct();
  return `<div class="cd" style="margin:0"><div class="mu" style="margin-bottom:8px"><b>${esc(a.email)}</b> · ${esc(a.label)}${a.preview ? " (👁 náhled)" : ""}${a.cash ? " · 💰 pokladník" : ""}${a.player ? " · " + esc(a.player) : ""}${staff && a.staff ? " · 🎓 " + esc(a.staff) : ""}<br>${C().online() ? "Online – změny se ukládají do databáze." : "Offline – změny se uloží v zařízení a odešlou po připojení."}<br>Verze aplikace: <b>${esc(HK.version)}</b>${verInfo()}</div><div class="row"><button class="s" id="cu2">Načíst novou verzi</button><button class="s" id="clo">Odhlásit</button></div><div class="mu" style="margin-top:6px">Pokud po nahrání nové verze vidíš starou, načti ji tlačítkem Načíst novou verzi.</div>${betaAcctHtml()}${coach ? gateHtml() : ""}</div>`;
}
// 🔒 Brána verze (jen manager, pod Načíst novou verzi): zvýšit minimum na tuto verzi, nebo stav, že minimum odpovídá; v 🧪 betě jen poznámka
function gateHtml() {
  if (IS_BETA) return `<div class="mu" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd)">🔒 Vyžadovat verzi se v betě nenastavuje (zablokovalo by stabilní verzi) – nastav ho ve stabilní verzi po vydání.</div>`;
  const g = C().gateInfo();
  return `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd)">${g.raise ? `<button class="s w" id="cmv">🔒 Vyžadovat verzi v${esc(APP_VERSION)}</button>` : '<div class="mu">✅ Minimální verze odpovídá této verzi.</div>'}<div class="mu" style="margin-top:6px">Zařízení se starší verzí, než je minimální, nic nezapisuje a ukáže pruh Načíst novou verzi. Minimum jde jen zvýšit – nastav ho, až je nová verze na všech zařízeních.</div></div>`;
}
// 👥 Tým a členové: ✋ žádosti o přijetí (manager), seznam členů, formulář přidání až po rozkliknutí
function teamHtml(coach) {
  const n = coach ? C().joinCount() : 0;
  const join = coach ? `<button class="s w" id="cjr" style="margin-bottom:8px${n ? ";border-color:var(--wa)" : ""}">✋ Žádosti o přijetí do týmu${n ? " (" + n + ")" : " – žádné otevřené"}</button>` : "";
  const form = `<div class="mu" style="margin:8px 0">Přístup mají jen zapsané e-maily (přesně tak, jak je používá Google účet). U role Hráčka vyber hráčku, za kterou se bude zapisovat docházka. Manager, trenér nebo asistent, který zároveň hraje, má vybranou i hráčku – na události se pak hlásí jako hráčka. Volitelně vyber člena realizačního týmu (Team → Realizační tým) a příznak Pokladník. Stejný e-mail znovu = změna nastavení.${coach ? " Většinu členů přidáš přijetím ✋ žádosti." : " Pokladník přidává a mění jen členy s rolí Hráčka a nemění vlastní účet; ostatní role spravuje manager."}</div><input id="cme" type="email" placeholder="e-mail@gmail.com"><select id="cmr">${opts(C().memberRoles())}</select><select id="cmp">${listOpts(C().playerList(), "— vyber hráčku —")}</select><select id="cmt">${listOpts(C().staffList(), "— člen realizačního týmu (volitelné) —")}</select><select id="cmc"><option value="">Bez práv pokladníka</option><option value="1">Pokladník</option></select><button class="p w" id="cma">Přidat člena</button>`;
  const body = `${join}<h3 style="margin-top:4px">Členové týmu</h3><div id="cmb" style="margin-bottom:8px"></div><button class="s w" id="cmo">${addOpen ? "▾ Skrýt přidání člena" : "+ Přidat člena ručně"}</button><div id="cmf"${addOpen ? "" : " hidden"}>${form}</div>`;
  return sec("team", "👥 Tým a členové", body, n ? "✋ " + n + (n === 1 ? " žádost" : n < 5 ? " žádosti" : " žádostí") : "", n > 0);
}
// 📅 Události: výchozí sraz a délka tréninku (okno views/event-settings.js)
function eventsHtml() {
  return sec("events", "📅 Události", `<div class="mu" style="margin-bottom:8px">Výchozí sraz na trénink a zápas (minuty před začátkem) a délka tréninku – platí pro nové události a události bez vlastního srazu / konce.</div><button class="s w" id="ces">⏰ Nastavení událostí (sraz, délka tréninku)</button>`);
}
// 💰 Pokladna: nastavení pokladny, přepočet dlužníků, doplnění cen pro hráčky
function cashHtml() {
  return sec("cash", "💰 Pokladna", `<button class="s w" id="ccs">💰 Nastavení pokladny (IBAN, šablony, kategorie)</button><div class="mu" style="margin:8px 0">Značka ⛓ u dlužníků v Docházce se zapisuje s každou změnou předpisů. Poprvé (a po ruční změně v databázi) ji naplň přepočtem ze všech předpisů – bez částek.</div><button class="s w" id="cdb">⛓ Přepočítat dlužníky</button><div class="mu" style="margin:8px 0">Přehled ⚖️ Tarify (Team → 💰 Platby) porovnává způsob placení hráček podle ceny uzavřených událostí na hlavu. Pro dříve uzavřené události (nebo po obnově zálohy) ceny doplň – opakování nic nepokazí.</div><button class="s w" id="cpr">💲 Doplnit ceny pro hráčky</button>`);
}
// 📉 Odhad čtení databáze: kolik dokumentů přečte jedno spuštění aplikace v tomto zařízení a u hráčky (limit zdarma READ_LIMIT za den),
// okna poslechu (živě od data, starší z paměti zařízení) a ↻ ruční obnova starších dat ze serveru
function readHtml() {
  const r = readCost(C().readCounts(), 5, C().readCountsPlayer()), n = v => v.toLocaleString("cs-CZ");
  const top = r.top.map(([c, v]) => `${esc(collLabel(c))} ${n(v)}`).join(" · ");
  const dt = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? +m[3] + ". " + +m[2] + ". " + m[1] : s || "–"; };
  const W = C().winInfo().map(w => `<div>${esc(collLabel(w.c))}: živě od ${dt(w.from)}${w.to ? " do " + dt(w.to) + " (bez něj)" : ""} (${n(w.live)})${w.far != null ? `, další budoucnost ${n(w.far)}` : ""}, starší ${n(w.arch)} z paměti zařízení${w.st === "load" ? " · načítám…" : w.st === "err" ? ` · <span style="color:var(--wa)">ze serveru se nenačetly (${esc(w.err)})</span>` : w.at ? " · ze serveru ověřeno " + esc(new Date(w.at).toLocaleString("cs-CZ")) : ""}</div>`).join("");
  return `<h3>📉 Čtení databáze</h3><div class="mu" style="margin-bottom:8px">Spuštění aplikace po pauze delší než 30 min přečte v tomto zařízení asi <b>${n(r.total)}</b> dokumentů${top ? ` (nejvíc ${top})` : ""}; u hráčky asi <b>${n(r.player)}</b>. Denní limit zdarma je ${n(READ_LIMIT)} čtení (obnova ráno) – do limitu se vejde asi ${n(r.starts)} takových spuštění tohoto zařízení. Každé obnovení stránky, nová verze a 👁 náhled role je nové spuštění.</div>`
    + (W ? `<div class="mu" style="margin-bottom:8px">${W}<div style="margin-top:4px">Starší události a docházka se ze serveru ověřují samy (události denně, docházka týdně – posledních 60 dní před oknem). Změnu starších dat z jiného zařízení načte hned ↻.</div></div><button class="s w" id="carf">↻ Obnovit starší data ze serveru</button>` : "");
}
// 📉 Pokladna na vyžádání (správce pokladny): volba tohoto zařízení a stav načtení předpisů a pohybů pokladny
function moneyLazyHtml() {
  if (!HK.can("money")) return "";
  const st = HK.money.st(), s = st === "ok" || st === "" ? "načteno" : st === "load" ? "načítám…" : "zatím nenačteno (načte se při otevření pokladny)";
  return `<h3>💰 Pokladna při spuštění</h3><label style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><input type="checkbox" id="cml" style="width:auto;margin:0"${HK.money.lazy() ? " checked" : ""}>Předpisy a pohyby pokladny načítat až při otevření pokladny</label><div class="mu" style="margin-bottom:8px">Šetří čtení u trenéra, který pokladnu neotevírá při každém spuštění. Přehled v 🏠 Domů (dlužníci, žádosti) a stav vyúčtování na kartách událostí zůstávají. Platí od dalšího spuštění tohoto zařízení. Teď: ${esc(s)}.</div>`;
}
// 💾 Data: záloha a CSV (manager, trenér, asistent), obnova ze zálohy (manager), 📉 odhad čtení
function dataHtml(coach) {
  let body = `<h3 style="margin-top:4px">Záloha dat</h3><div class="row"><button class="s" id="ce">Stáhnout zálohu (JSON)</button><button class="s" id="cc">Soupiska (CSV)</button></div>`;
  if (coach) body += `<h3>Obnovit ze zálohy</h3><input type="file" id="cf" accept=".json,application/json"><div class="mu" id="ci" style="margin-bottom:8px"></div><div class="row"><button class="s" id="cm">Sloučit s daty</button><button class="d" id="cr">Nahradit vším</button></div>`;
  body += readHtml() + moneyLazyHtml();
  return sec("data", "💾 Data", body);
}
// 🛠 Vývojář: 👁 náhled role (jen DEV_EMAILS); při běžícím náhledu popis a Ukončit
function devHtml() {
  const p = C().pvInfo();
  const body = p
    ? `<h3 style="margin-top:4px">👁 Náhled role</h3><div class="mu" style="margin-bottom:8px">Právě: <b>${esc(p.label)}</b>. Skutečný účet: ${esc(p.real)}.</div><button class="p w" id="pve">Ukončit náhled</button>`
    : `<h3 style="margin-top:4px">👁 Náhled role</h3><div class="mu" style="margin-bottom:8px">Zobrazí aplikaci tak, jak ji vidí vybraná role – jen v tomto zařízení, databáze members se nemění. Data, která by role nesměla číst (cizí předpisy, vyúčtování, audit), se nenačtou. Výchozí je jen ke čtení.</div><select id="pvr">${opts(C().PV_ROLES, "hracka")}</select><select id="pvp">${listOpts(C().playerList(), "— vyber hráčku —")}</select><select id="pvt">${listOpts(C().staffList(), "— člen realizačního týmu (volitelné) —")}</select><select id="pvc"><option value="">Bez práv pokladníka</option><option value="1">Pokladník</option></select><label style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><input type="checkbox" id="pvw" style="width:auto;margin:0">Povolit zápis (zapisuje se pod tvým účtem za vybranou roli)</label><button class="p w" id="pvs">👁 Spustit náhled</button>`;
  return sec("dev", "🛠 Vývojář", body, p ? "👁 náhled běží" : "", !!p);
}

// ===== Hlavní logika =====
// 🟢 Řádek aktivity člena (jen manager): online / poslední aktivita, verze aplikace (🧪 beta), starší verze oranžově
function seenLine(doc, now) {
  const s = seenState(doc, now);
  if (!s) return '<div class="mu">⚪ zatím bez záznamu aktivity</div>';
  const old = s.v && cmpVer(s.v, APP_VERSION) < 0;
  return `<div class="mu"><b style="color:${s.on ? "var(--ok)" : "inherit"}">${esc(s.text)}</b>${s.v ? ` · <span style="color:${old ? "var(--wa)" : "inherit"}">v${esc(s.v)}${s.beta ? " 🧪" : ""}</span>` : ""}</div>`;
}
// Seznam členů (manager a pokladník): e-mail, role, propojení, Odebrat podle oprávnění; manager navíc 🟢 aktivitu (online / naposledy, verze)
async function renderMembers(el) {
  const box = el.querySelector("#cmb");
  if (!box) return;
  box.textContent = "Načítám…";
  try {
    const [rows, seen] = await Promise.all([C().memberRows(), C().seenMap()]), now = Date.now(), mgr = HK.can("admin");
    // Seřazení pro managera: online nahoře, pak podle poslední aktivity (bez záznamu na konci)
    const ms = r => { const s = seen ? seenState(seen[r.email], now) : null; return s ? s.ms : 0; };
    const list = mgr && seen ? [...rows].sort((a, b) => ms(b) - ms(a) || a.email.localeCompare(b.email)) : rows;
    const head = !mgr ? "" : seen === null ? '<div class="mu" style="margin-bottom:6px">🟢 Aktivitu se nepodařilo načíst (pravidla databáze ještě nejsou publikovaná?).</div>'
      : `<div class="row" style="align-items:center;margin-bottom:6px"><b>🟢 Teď online: ${onlineCount(seen, now)}</b><button class="s" id="cmbr" style="padding:6px 12px">↻</button></div>`;
    box.innerHTML = head + (list.map(r => {
      const i = C().memberInfo(r);
      const who = (i.player !== undefined ? (i.player ? " · " + esc(i.player) : " · ⚠️ bez hráčky") : "") + (i.staff !== undefined ? (i.staff !== null ? " · 🎓 " + esc(i.staff) : " · ⚠️ člen týmu neexistuje") : "") + (r.cash ? " · 💰 pokladník" : "");
      return `<div class="it" style="cursor:default"><div><b>${esc(r.email)}</b><div class="mu">${esc(i.label)}${who}</div>${mgr && seen ? seenLine(seen[r.email], now) : ""}</div>${C().canRemove(r) ? `<button class="d" data-md="${esc(r.email)}" style="padding:8px 12px">Odebrat</button>` : ""}</div>`;
    }).join("") || "–");
    const rb = box.querySelector("#cmbr");
    if (rb) rb.onclick = () => renderMembers(el);
    // Odebrat přístup: potvrzení druhým klepnutím jako všude (dřív okno prohlížeče)
    box.querySelectorAll("[data-md]").forEach(b => { b.onclick = () => {
      if (HK.blocked()) return;
      arm2(b, "md:" + b.dataset.md, "Odebrat přístup? Klepni znovu", async () => { if (await C().removeMember(b.dataset.md)) renderMembers(el); });
    }; });
  } catch (e) { box.textContent = "Nelze načíst: " + ((e && (e.code || e.message)) || e); }
}
// Otevře okno ⚙️ podle oprávnění přihlášeného účtu (v náhledu podle role náhledu)
function openSettings() {
  const el = document.getElementById("cfg"), coach = HK.can("admin"), cashier = HK.can("members"), staff = HK.can("sport"), dev = C().isDev(), team = !HK.can("guest"), beta = C().betaInfo().edit;
  const q = s => el.querySelector(s), close = () => { el.innerHTML = ""; };
  pendingImport = null; seq++; resetPermWork();
  el.innerHTML = `<div class="md" id="cbg"><div class="mb"><h2>⚙️ Účet a data</h2>
 ${accountHtml(coach, staff)}
 ${cashier ? teamHtml(coach) : ""}
 ${team ? sec("perm", "🔐 Práva rolí", '<div id="cpm"></div>', permStatus()) : ""}
 ${staff ? eventsHtml() : ""}
 ${cashier ? cashHtml() : ""}
 ${staff ? dataHtml(coach) : ""}
 ${beta ? betaSecHtml(sec) : ""}
 ${dev ? devHtml() : ""}
 <button class="s w" id="cz" style="margin-top:14px">Zavřít</button></div></div>`;
  bindCommon(el, q, close);
  if (cashier) bindTeam(el, q, close, coach);
  if (staff) bindData(q, close, coach);
  if (staff && q("#cml")) q("#cml").onchange = () => { HK.money.setLazy(q("#cml").checked); toast(q("#cml").checked ? "Pokladna se načte až při otevření (od dalšího spuštění)" : "Pokladna se bude načítat hned při spuštění"); };
  if (staff && q("#carf")) q("#carf").onclick = () => arm2(q("#carf"), "arch", "Načte všechny starší dokumenty (stojí čtení) – klepni znovu", async () => { await C().archRefresh(); toast("Starší data obnovena ze serveru"); close(); });
  if (cashier) bindCash(q, close);
  if (coach && q("#cmv")) q("#cmv").onclick = () => arm2(q("#cmv"), "minver", "Opravdu? Starší verze přestanou zapisovat – klepni znovu", () => C().raiseMinVer(close));
  if (dev) bindPv(q);
  bindBetaAcct(q);
  if (cashier) renderMembers(el);
  if (beta) renderBetaTesters(el);
  if (team) renderPerm(el, arm2);
}

// ===== Eventy =====
// Společné: rozbalení sekcí, zavření, verze, odhlášení, události
function bindCommon(el, q, close) {
  el.querySelectorAll("[data-acch]").forEach(h => { h.onclick = () => {
    const id = h.dataset.acch, now = openId() === id ? "" : id;
    LS.set(OPEN_KEY, now);
    el.querySelectorAll("[data-acc]").forEach(s => { const on = s.dataset.acc === now; s.classList.toggle("on", on); s.querySelector(".acc-b").hidden = !on; s.querySelector(".acc-h").setAttribute("aria-expanded", String(on)); });
  }; });
  q("#cz").onclick = close;
  q("#cbg").onclick = e => { if (e.target.id === "cbg") close(); };
  q("#cu2").onclick = HK.refresh;
  q("#clo").onclick = () => C().logout();
  // Výchozí sraz a délka tréninku: okno views/event-settings.js (napojeno v main.js)
  if (q("#ces")) q("#ces").onclick = () => { close(); if (HK.openEvSet) HK.openEvSet(); };
}
// Tým a členové: žádosti o přijetí, rozbalení formuláře, výběr role a hráčky, přidání člena
function bindTeam(el, q, close, coach) {
  if (q("#cjr")) q("#cjr").onclick = () => { close(); if (HK.openJoin) HK.openJoin(); };
  q("#cmo").onclick = () => { addOpen = !addOpen; q("#cmf").hidden = !addOpen; q("#cmo").textContent = addOpen ? "▾ Skrýt přidání člena" : "+ Přidat člena ručně"; };
  // Výběr hráčky: povinný u role Hráčka / Hostující, volitelný u managera / trenéra / asistenta (je zároveň hráčka); člen týmu a pokladník ne u hostující
  const sync = () => {
    const r = q("#cmr").value, o = q("#cmp").options[0];
    if (o) o.textContent = C().needsPid(r) ? "— vyber hráčku —" : "— je zároveň hráčka (volitelné) —";
    q("#cmt").style.display = q("#cmc").style.display = C().staffOk(r) ? "" : "none";
  };
  q("#cmr").onchange = sync; sync();
  // Výběr hráčky přepne roli Hráčka ↔ Hostující podle značky 🎟 (role Hostující je jen u managera)
  q("#cmp").onchange = () => { const p = q("#cmp").value, r = C().pidRoleOf(p); if (p && C().needsPid(q("#cmr").value) && q("#cmr").querySelector('option[value="' + r + '"]')) { q("#cmr").value = r; sync(); } };
  q("#cma").onclick = async () => {
    const ok = await C().saveMember(q("#cme").value, q("#cmr").value, q("#cmp").value, q("#cmt").value, q("#cmc").value === "1");
    if (!ok) return;
    ["#cme", "#cmp", "#cmt", "#cmc"].forEach(s => { q(s).value = ""; });
    renderMembers(el);
  };
}
// Pokladna: okno nastavení pokladny (views/cash-settings.js), přepočet dlužníků, doplnění cen
function bindCash(q, close) {
  q("#ccs").onclick = () => { close(); if (HK.openCash) HK.openCash(); };
  q("#cdb").onclick = async () => {
    try { const n = await C().rebuildDebtors(); if (n != null) toast("Dlužníci přepočítáni (" + n + " s nezaplaceným předpisem)"); }
    catch (e) { toast(failMsg("Přepočítání", ((e && (e.code || e.message)) || e) + " – je publikováno firestore.rules?")); }
  };
  q("#cpr").onclick = async () => {
    try { const r = await C().rebuildPrices(); if (r) toast(r.set || r.del ? "Ceny pro hráčky: zapsáno " + r.set + ", smazáno " + r.del : "Ceny pro hráčky jsou aktuální"); }
    catch (e) { toast(failMsg("Doplnění", ((e && (e.code || e.message)) || e) + " – je publikováno firestore.rules?")); }
  };
}
// Data: záloha, CSV; manager navíc obnova ze zálohy (Nahradit vším potvrzením druhým klepnutím)
function bindData(q, close, coach) {
  q("#ce").onclick = HK.exportJSON; q("#cc").onclick = HK.exportCSV;
  if (!coach) return;
  q("#cf").onchange = () => {
    const f = q("#cf").files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { pendingImport = JSON.parse(r.result); q("#ci").textContent = "Načteno: " + C().backupCounts(pendingImport).map(([c, n]) => c + " " + n).join(", ") + " (audit se neobnovuje)"; }
      catch (e) { pendingImport = null; q("#ci").textContent = "Soubor nelze přečíst."; }
    };
    r.readAsText(f);
  };
  q("#cm").onclick = async () => {
    if (!pendingImport) return toast("Nejdřív vyber soubor.");
    try { const k = await HK.importData(pendingImport, false); toast("Data sloučena" + dropTxt(k)); close(); } catch (e) { toast((e && (e.code || e.message)) || String(e)); }
  };
  q("#cr").onclick = () => {
    if (!pendingImport) return toast("Nejdřív vyber soubor.");
    arm2(q("#cr"), "replace", "Opravdu nahradit? Klepni znovu", async () => {
      try { const k = await HK.importData(pendingImport, true); toast("Data nahrazena" + dropTxt(k)); close(); } catch (e) { toast((e && (e.code || e.message)) || String(e)); }
    });
  };
}
// Náhled role (vývojář): výběr role, hráčky, člena týmu, pokladníka; spuštění a ukončení
function bindPv(q) {
  if (q("#pve")) { q("#pve").onclick = () => C().endPreview(); return; }
  // Výběr hráčky jen u role Hráčka / Hostující; pokladník a člen týmu se skryjí tam, kde je role nemá
  const sync = () => { const r = q("#pvr").value; q("#pvp").style.display = C().needsPid(r) ? "" : "none"; q("#pvc").style.display = C().cashOk(r) ? "" : "none"; q("#pvt").style.display = C().staffOk(r) ? "" : "none"; };
  q("#pvr").onchange = sync; sync();
  q("#pvp").onchange = () => { const p = q("#pvp").value; if (p && C().needsPid(q("#pvr").value)) { q("#pvr").value = C().pidRoleOf(p); sync(); } };
  q("#pvs").onclick = () => {
    const err = C().runPreview(q("#pvr").value, q("#pvp").value, q("#pvt").value, q("#pvc").value === "1", q("#pvw").checked);
    if (err) toast(err);
  };
}

// ===== Export =====
export {openSettings};
