/* Okno ⚙️ Účet a data (všechny role): sbalitelné sekce, nahoře vždy přihlášený účet. Rozbalená je nejvýš jedna sekce,
   pamatuje se v zařízení (localStorage, jen pohodlí). Sbalená sekce ukazuje stav v záhlaví (žádosti, minimální verze, kontrola dat).
   Jen vykreslení a obsluha – údaje a zápisy dává datová vrstva přes HK.cfg, oprávnění HK.can (kontroly rolí jsou v storage.js).
   Otevírá se tlačítkem ⚙️ (HK.openCfg z main.js); zavírá Zavřít, klepnutí mimo okno a Zpět. 💾 Data obsahuje i převod rolí (náhled, volba managerů).
   🔐 Práva rolí (views/perm-view.js): přehled „kdo co smí“ pro členy kromě hostující, editor matice jen pro managera.
   Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Sekce -> Hlavní logika -> Eventy -> Export. */

// ===== Importy =====
import {APP_VERSION} from "../core/app-version.js";
import {armed, confirm2} from "../core/actions.js";
import {LS, esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
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
// 👤 Účet: e-mail, role, připojení, odhlášení, verze aplikace (vždy vidět, nesbaluje se)
function accountHtml(coach, staff) {
  const a = C().acct();
  return `<div class="cd" style="margin:0"><div class="mu" style="margin-bottom:8px"><b>${esc(a.email)}</b> · ${esc(a.label)}${a.preview ? " (👁 náhled)" : ""}${a.cash ? " · 💰 pokladník" : ""}${a.player ? " · " + esc(a.player) : ""}${staff && a.staff ? " · 🎓 " + esc(a.staff) : ""}<br>${C().online() ? "Online – změny se ukládají do databáze." : "Offline – změny se uloží v zařízení a odešlou po připojení."}<br>Verze aplikace: <b>${esc(HK.version)}</b>${coach ? "" : verInfo()}</div><div class="row"><button class="s" id="cu2">Načíst novou verzi</button><button class="s" id="clo">Odhlásit</button></div><div class="mu" style="margin-top:6px">Pokud po nahrání nové verze vidíš starou, načti ji tlačítkem Načíst novou verzi.</div></div>`;
}
// 👥 Tým a členové: ✋ žádosti o přijetí (manager), seznam členů, formulář přidání až po rozkliknutí
function teamHtml(coach) {
  const n = coach ? C().joinCount() : 0;
  const join = coach ? `<button class="s w" id="cjr" style="margin-bottom:8px${n ? ";border-color:var(--wa)" : ""}">✋ Žádosti o přijetí do týmu${n ? " (" + n + ")" : " – žádné otevřené"}</button>` : "";
  const form = `<div class="mu" style="margin:8px 0">Přístup mají jen zapsané e-maily (přesně tak, jak je používá Google účet). U role Hráčka vyber hráčku, za kterou se bude zapisovat docházka. Volitelně vyber člena realizačního týmu (Team → Realizační tým) a příznak Pokladník. Stejný e-mail znovu = změna nastavení.${coach ? " Většinu členů přidáš přijetím ✋ žádosti." : " Pokladník přidává a mění jen členy s rolí Hráčka a nemění vlastní účet; ostatní role spravuje manager."}</div><input id="cme" type="email" placeholder="e-mail@gmail.com"><select id="cmr">${opts(C().memberRoles())}</select><select id="cmp">${listOpts(C().playerList(), "— vyber hráčku —")}</select><select id="cmt">${listOpts(C().staffList(), "— člen realizačního týmu (volitelné) —")}</select><select id="cmc"><option value="">Bez práv pokladníka</option><option value="1">Pokladník</option></select><button class="p w" id="cma">Přidat člena</button>`;
  const body = `${join}<h3 style="margin-top:4px">Členové týmu</h3><div id="cmb" style="margin-bottom:8px"></div><button class="s w" id="cmo">${addOpen ? "▾ Skrýt přidání člena" : "+ Přidat člena ručně"}</button><div id="cmf"${addOpen ? "" : " hidden"}>${form}</div>`;
  return sec("team", "👥 Tým a členové", body, n ? "✋ " + n + (n === 1 ? " žádost" : n < 5 ? " žádosti" : " žádostí") : "", n > 0);
}
// 📅 Události: výchozí sraz a délka tréninku (okno views/event-settings.js)
function eventsHtml() {
  return sec("events", "📅 Události", `<div class="mu" style="margin-bottom:8px">Výchozí sraz na trénink a zápas (minuty před začátkem) a délka tréninku – platí pro nové události a události bez vlastního srazu / konce.</div><button class="s w" id="ces">⏰ Nastavení událostí (sraz, délka tréninku)</button>`);
}
// 💰 Pokladna: nastavení pokladny, přepočet dlužníků, doplnění cen pro hráčky
function cashHtml() {
  return sec("cash", "💰 Pokladna", `<button class="s w" id="ccs">💰 Nastavení pokladny (IBAN, šablony, kategorie)</button><div class="mu" style="margin:8px 0">Značka ⛓ u dlužníků v Docházce se zapisuje s každou změnou předpisů. Poprvé (a po ruční změně v databázi) ji naplň přepočtem ze všech předpisů – bez částek.</div><button class="s w" id="cdb">⛓ Přepočítat dlužníky</button><div class="mu" style="margin:8px 0">Hráčky v Moje platby porovnávají způsob placení podle ceny uzavřených událostí na hlavu. Pro dříve uzavřené události (nebo po obnově zálohy) ceny doplň – opakování nic nepokazí.</div><button class="s w" id="cpr">💲 Doplnit ceny pro hráčky</button>`);
}
// Kontrola dat – pole ex: náhled doplnění, bez nálezu jen potvrzení
function exFixHtml(plan) {
  if (!plan.length) return `<div class="mu" style="margin-bottom:8px">✅ Všechny hráčky mají pole <b>ex</b> (osvobozená ano / ne).</div>`;
  const list = plan.map(x => esc(x.name) + " → " + (x.ex ? "osvobozená, koeficient 100 %" : "neosvobozená")).join("<br>");
  return `<div class="mu" style="margin-bottom:8px">⚠️ Pole <b>ex</b> chybí u ${plan.length} hráček. Bez doplnění se hráčka s koeficientem 0 % nepočítá jako osvobozená (starý tvar dat se už nečte). Doplnění vrátí význam, jaký data měla:<br>${list}</div><button class="s w" id="cex" style="margin-bottom:8px">Doplnit pole ex (${plan.length})</button>`;
}
// Úklid starých citlivých polí (po převodu): náhled počtů; tlačítko jen při minimální verzi aspoň cleanMin
function cleanHtml(p) {
  const c = p.clean, k = c.keep, n = c.ops.length;
  const kept = k.pp + k.sp + k.an ? `<br>⚠️ Bez protějšku v nové kolekci zůstává: platební pole ${k.pp}, platy ${k.sp}, důvody ${k.an} (nesmažou se – zkontroluj je v záloze).` : "";
  if (!n) return `<div class="mu" style="margin-bottom:8px">✅ Stará citlivá pole jsou smazaná (soupiska, realizační tým a docházka už je neobsahují). Pokud ještě nejsou, publikuj zúžená pravidla <b>firestore.rules</b>.${kept}</div>`;
  const what = `🧹 <b>Stará citlivá pole</b> (čte je dosud každý člen): platby u <b>${c.pp}</b> hráček, plat u <b>${c.sp}</b> členů týmu, důvod u <b>${c.an}</b> odpovědí.`;
  if (!p.gate) return `<div class="mu" style="margin-bottom:8px">${what}<br>Smazat je půjde, až budou všechna zařízení na v${APP_VERSION} a nastavíš v sekci 🔒 Aplikace <b>🔒 Vyžadovat verzi</b> (starší verze stará pole ještě čtou a zapisují).${kept}</div>`;
  return `<div class="mu" style="margin-bottom:8px">${what}<br>Hodnoty už jsou v samostatných kolekcích – smaže se jen kopie ve starém místě (prázdná pole také). Před smazáním se stáhne záloha. Potom publikuj zúžená pravidla <b>firestore.rules</b>.${kept}</div><button class="d w" id="cpc" style="margin-bottom:8px">🧹 Smazat stará citlivá pole (${n})</button>`;
}
// Kontrola dat – soukromí: náhled převodu do samostatných kolekcí; bez načtených kolekcí (nepublikovaná pravidla) se nenabídne
function privHtml(p) {
  if (!p.loaded) return `<div class="mu" style="margin-bottom:8px">⚠️ Soukromé kolekce (důvody omluv, platy, platby hráček) se zatím nenačetly. Je publikováno <b>firestore.rules</b>? Zkus ⚙️ otevřít znovu.</div>`;
  const plan = p.plan, left = p.left, n = plan.ops.length;
  const skip = plan.skip.length ? `<br>⚠️ ${plan.skip.length} odpovědí má jiný tvar id – důvod se nepřevede (zůstane ve starém poli).` : "";
  const old = `<br>Ve starých polích zatím zůstává: platby ${left.pp} hráček, plat ${left.sp} členů týmu, ${left.an} důvodů – smazat je půjde po převodu.`;
  if (!n) return `<div class="mu" style="margin-bottom:8px">✅ Citlivá data jsou v samostatných kolekcích (čte je jen vlastník a správci).${skip}</div>${cleanHtml(p)}`;
  return `<div class="mu" style="margin-bottom:8px">🔒 <b>Soukromí:</b> převod zkopíruje citlivá data do kolekcí, které čte jen vlastník a správci:<br>· platební pole (skupina, osvobozená, koeficient, poznámka): <b>${plan.pp.length}</b> hráček → plpay<br>· plat: <b>${plan.sp.length}</b> členů realizačního týmu → staffpay<br>· důvody omluv: <b>${plan.an.length}</b> → attnote${skip}<br>Kopírují se jen chybějící hodnoty (nové se nepřepíšou); převod lze spustit znovu.${old}</div><button class="s w" id="cpv" style="margin-bottom:8px">🔒 Převést citlivá data (${n})</button>`;
}
// 💾 Data: záloha a CSV (manager, trenér, asistent), obnova ze zálohy, kontrola dat a převod rolí (manager); v záhlaví upozornění na nevyřízenou kontrolu
function dataHtml(coach) {
  let body = `<h3 style="margin-top:4px">Záloha dat</h3><div class="row"><button class="s" id="ce">Stáhnout zálohu (JSON)</button><button class="s" id="cc">Soupiska (CSV)</button></div>`, st = "", wa = false;
  if (coach) {
    const ex = C().exPlan(), pv = C().privState();
    body += `<h3>Obnovit ze zálohy</h3><input type="file" id="cf" accept=".json,application/json"><div class="mu" id="ci" style="margin-bottom:8px"></div><div class="row"><button class="s" id="cm">Sloučit s daty</button><button class="d" id="cr">Nahradit vším</button></div><h3>Kontrola dat</h3>${exFixHtml(ex)}${privHtml(pv)}<h3>🔁 Převod rolí</h3><div id="crl"><div class="mu">Načítám…</div></div>`;
    const todo = ex.length || !pv.loaded || pv.plan.ops.length || (pv.gate && pv.clean.ops.length);
    if (todo) { st = "⚠️ kontrola dat"; wa = true; }
  }
  return sec("data", "💾 Data", body, st, wa);
}
// 🔒 Aplikace: brána verze (jen manager); v záhlaví minimální verze nebo upozornění, že není nastavená
function appHtml() {
  const g = C().gateInfo();
  const body = `<div class="mu" style="margin-bottom:8px">Zařízení se starší verzí, než je minimální, nic nezapisuje a ukáže pruh Načíst novou verzi. Minimum jde jen zvýšit.${verInfo()}</div>${g.raise ? `<button class="s w" id="cmv">🔒 Vyžadovat verzi v${esc(APP_VERSION)}</button>` : `<div class="mu">✅ Minimální verze odpovídá této verzi.</div>`}`;
  return sec("app", "🔒 Aplikace", body, g.min ? "min. v" + g.min + (g.raise ? " · lze zvýšit" : "") : "⚠️ minimální verze není nastavená", !g.min);
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
// Seznam členů (manager a pokladník): e-mail, role, propojení, Odebrat podle oprávnění
async function renderMembers(el) {
  const box = el.querySelector("#cmb");
  if (!box) return;
  box.textContent = "Načítám…";
  try {
    const rows = await C().memberRows();
    box.innerHTML = rows.map(r => {
      const i = C().memberInfo(r);
      const who = (i.player !== undefined ? (i.player ? " · " + esc(i.player) : " · ⚠️ bez hráčky") : "") + (i.staff !== undefined ? (i.staff !== null ? " · 🎓 " + esc(i.staff) : " · ⚠️ člen týmu neexistuje") : "") + (r.cash ? " · 💰 pokladník" : "");
      return `<div class="it" style="cursor:default"><div><b>${esc(r.email)}</b><div class="mu">${esc(i.label)}${who}</div></div>${C().canRemove(r) ? `<button class="d" data-md="${esc(r.email)}" style="padding:8px 12px">Odebrat</button>` : ""}</div>`;
    }).join("") || "–";
    box.querySelectorAll("[data-md]").forEach(b => { b.onclick = async () => {
      if (HK.blocked() || !confirm("Odebrat přístup: " + b.dataset.md + "?")) return;
      if (await C().removeMember(b.dataset.md)) renderMembers(el);
    }; });
  } catch (e) { box.textContent = "Nelze načíst: " + ((e && (e.code || e.message)) || e); }
}
// Převod rolí (manager): náhled „co se změní“ – u každého trenéra před převodem volba Manager / Trenér + pokladník,
// kustod → asistent; tlačítko až při minimální verzi (🔒 Vyžadovat verzi), potvrzení druhým klepnutím
async function renderRoles(el, close) {
  const box = el.querySelector("#crl");
  if (!box) return;
  let st;
  try { st = await C().roleState(); } catch (e) { box.innerHTML = `<div class="mu">Nelze načíst členy: ${esc((e && (e.code || e.message)) || e)}</div>`; return; }
  if (!el.contains(box)) return;
  if (!st.plan.list.length) { box.innerHTML = `<div class="mu" style="margin-bottom:8px">✅ Role jsou převedené (Manager · Trenér · Asistent). Managerů: <b>${st.managers}</b>.</div>`; return; }
  const chk = st.trainers.map(t => `<label style="display:flex;align-items:center;gap:8px;margin:4px 0"><input type="checkbox" data-rm="${esc(t.email)}" style="width:auto;margin:0"${t.def ? " checked" : ""}>${esc(t.email)} → Manager</label>`).join("");
  const intro = `<div class="mu" style="margin-bottom:6px">Nové role: <b>Manager</b> = vše (členové, ✋ žádosti, obnova, účty pro QR, brána verze), <b>Trenér</b> = sport (zápasy, události, docházka, soupeři, formace, soupiska, realizační tým), <b>Asistent</b> = dřívější Kustod beze změny. Trenér, který nebude managerem, dostane příznak 💰 Pokladník – pokladna se mu nezmění. Zaškrtni, kdo bude Manager (aspoň jeden):</div>${chk}<div class="mu" id="crp" style="margin:8px 0"></div>`;
  const gate = st.gate ? `<button class="s w" id="crc" style="margin-bottom:8px">🔁 Převést role</button>`
    : `<div class="mu" style="margin-bottom:8px">⚠️ Převést půjde, až budou všechna zařízení na v${esc(APP_VERSION)} a nastavíš v sekci 🔒 Aplikace <b>🔒 Vyžadovat verzi</b> (aspoň v${esc(st.min)}) – starší verze nové role neznají a člena by nepustily dál.</div>`;
  box.innerHTML = intro + gate;
  const picked = () => [...box.querySelectorAll("[data-rm]")].filter(c => c.checked).map(c => c.dataset.rm);
  // Náhled plánu podle zaškrtnutí: kdo → na co, počet managerů, chyba
  const draw = () => {
    const p = C().rolePreview(st.rows, picked());
    const lines = p.list.map(l => esc(l.email) + ": " + esc(C().roleLabel(l.from)) + " → <b>" + esc(C().roleLabel(l.to, 2)) + "</b>" + (l.cash ? " + 💰 pokladník" : "")).join("<br>");
    box.querySelector("#crp").innerHTML = `<b>Co se změní (${p.list.length}):</b><br>${lines}<br>Managerů po převodu: <b>${p.managers}</b>. Před zápisem se stáhne záloha členů (JSON); převod lze spustit znovu (převede jen zbylé).${p.ok ? "" : `<br>⚠️ ${esc(p.err)}`}`;
    const b = box.querySelector("#crc");
    if (b) { b.disabled = !p.ok; b.textContent = b.dataset.t = "🔁 Převést role (" + p.list.length + ")"; }
  };
  box.querySelectorAll("[data-rm]").forEach(c => { c.onchange = draw; });
  draw();
  const b = box.querySelector("#crc");
  if (b) b.onclick = () => arm2(b, "roles", "Opravdu převést? Nejdřív se stáhne záloha – klepni znovu", () => C().runRoleConvert(picked(), close));
}
// Otevře okno ⚙️ podle oprávnění přihlášeného účtu (v náhledu podle role náhledu)
function openSettings() {
  const el = document.getElementById("cfg"), coach = HK.can("admin"), cashier = HK.can("members"), staff = HK.can("sport"), dev = C().isDev(), team = !HK.can("guest");
  const q = s => el.querySelector(s), close = () => { el.innerHTML = ""; };
  pendingImport = null; seq++; resetPermWork();
  el.innerHTML = `<div class="md" id="cbg"><div class="mb"><h2>⚙️ Účet a data</h2>
 ${accountHtml(coach, staff)}
 ${cashier ? teamHtml(coach) : ""}
 ${team ? sec("perm", "🔐 Práva rolí", '<div id="cpm"></div>', permStatus()) : ""}
 ${staff ? eventsHtml() : ""}
 ${cashier ? cashHtml() : ""}
 ${staff ? dataHtml(coach) : ""}
 ${coach ? appHtml() : ""}
 ${dev ? devHtml() : ""}
 <button class="s w" id="cz" style="margin-top:14px">Zavřít</button></div></div>`;
  bindCommon(el, q, close);
  if (cashier) bindTeam(el, q, close, coach);
  if (staff) bindData(q, close, coach);
  if (cashier) bindCash(q, close);
  if (coach && q("#cmv")) q("#cmv").onclick = () => arm2(q("#cmv"), "minver", "Opravdu? Starší verze přestanou zapisovat – klepni znovu", () => C().raiseMinVer(close));
  if (dev) bindPv(q);
  if (cashier) renderMembers(el);
  if (coach && staff) renderRoles(el, close);
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
  // Výběr hráčky jen u role Hráčka / Hostující; člen týmu a pokladník ne u hostující
  const sync = () => { const r = q("#cmr").value; q("#cmp").style.display = C().needsPid(r) ? "" : "none"; q("#cmt").style.display = q("#cmc").style.display = C().staffOk(r) ? "" : "none"; };
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
    catch (e) { toast("Přepočet se nepovedl: " + ((e && (e.code || e.message)) || e) + " – je publikováno firestore.rules?"); }
  };
  q("#cpr").onclick = async () => {
    try { const r = await C().rebuildPrices(); if (r) toast(r.set || r.del ? "Ceny pro hráčky: zapsáno " + r.set + ", smazáno " + r.del : "Ceny pro hráčky jsou aktuální"); }
    catch (e) { toast("Doplnění se nepovedlo: " + ((e && (e.code || e.message)) || e) + " – je publikováno firestore.rules?"); }
  };
}
// Data: záloha, CSV; manager navíc obnova ze zálohy a kontrola dat (potvrzení druhým klepnutím)
function bindData(q, close, coach) {
  q("#ce").onclick = HK.exportJSON; q("#cc").onclick = HK.exportCSV;
  if (!coach) return;
  if (q("#cex")) q("#cex").onclick = () => arm2(q("#cex"), "exfix", "Opravdu doplnit? Nejdřív se stáhne záloha – klepni znovu", () => C().runExFix(close));
  if (q("#cpv")) q("#cpv").onclick = () => arm2(q("#cpv"), "privfix", "Opravdu převést? Nejdřív se stáhne záloha – klepni znovu", () => C().runPrivFix(close));
  if (q("#cpc")) q("#cpc").onclick = () => arm2(q("#cpc"), "privclean", "Opravdu smazat? Nejdřív se stáhne záloha – klepni znovu", () => C().runPrivClean(close));
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
