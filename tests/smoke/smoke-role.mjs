// Kouřový test jedné role: spustí aplikaci v jsdom se zástupcem Firebase a projde hlavní obrazovky klepáním.
// Použití (spouští smoke-run.mjs): node --import ./tests/smoke/smoke-env.mjs tests/smoke/smoke-role.mjs <role> [adresář pro HTML]
// Výsledek: řádek JSON {role, steps, errors} na standardní výstup; HTML obrazovek do adresáře (porovnání smoke-compare.mjs).

// ===== Importy =====
import {mkdirSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {ROLES, membersMap, teamData} from "./smoke-data.mjs";

// ===== Konstanty a stav =====
const role = process.argv[2], dir = process.argv[3] || "";
const acc = ROLES[role];
if (!acc) { console.log(JSON.stringify({role, steps: [], errors: ["neznámá role " + role]})); process.exit(2); }
const steps = [];
globalThis.__fb = {user: {email: acc.email, uid: "u-" + role, displayName: role}, members: membersMap(), data: teamData(), writes: []};

// ===== Pomocné funkce =====
const wait = ms => new Promise(r => setTimeout(r, ms));
const $ = s => document.querySelector(s);
// Uložení HTML obrazovky (bez časově proměnných značek) a zápis kroku
function snap(name) {
  steps.push(name);
  if (!dir) return;
  mkdirSync(dir, {recursive: true});
  writeFileSync(join(dir, role + "--" + name + ".html"), document.body.innerHTML.replace(/></g, ">\n<"));
}
// Klepnutí na prvek (když existuje) a krátké čekání na překreslení
async function tap(sel, ms = 150) {
  const el = typeof sel === "string" ? $(sel) : sel;
  if (!el) return false;
  el.click();
  await wait(ms);
  return true;
}

// ===== Scénáře =====
async function start() {
  await import("../../src/main.js");
  await wait(600);
  snap("start");
}
// Všechny záložky podle lišty
async function tabs() {
  const keys = [...document.querySelectorAll("#nav button[data-t]")].map(b => b.dataset.t);
  for (const k of keys) { await tap(`#nav button[data-t="${k}"]`, 250); snap("tab-" + k); }
}
// 🏠 Domů – ❔ Chybí odpověď (manager, trenér, asistent): rozbalit jména a 📲 Připomenout (bez sdílení a schránky = text k ručnímu zkopírování)
async function homeMiss() {
  await tap('#nav button[data-t="home"]', 250);
  if (!(await tap("[data-hms]", 200))) return;
  snap("home-miss");
  if (await tap("[data-hrm]", 250)) snap("home-remind");
}
// 🏠 Domů – karta události s rychlými tlačítky: ✅ Jdu přímo z Domů, ❌ otevře okno s důvodem (klepnutí na důvod uloží)
async function homeQuick() {
  await tap('#nav button[data-t="home"]', 250);
  if (await tap("#hmw [data-qa$=\"|yes\"]", 250)) snap("home-quick");
  if (await tap("#hmw [data-qa$=\"|no\"]", 250)) { snap("home-reason"); await tap('[data-rr="0"]', 250); }
}
// 📈 Statistiky → 🏒 Trénink: období, výběr cvičení a hráčky, zpět na Zápasy
async function trainStats() {
  if (!(await tap('#nav button[data-t="st"]', 250)) || !(await tap('[data-stv="t"]', 400))) return;
  snap("stats-train");
  await tap('[data-tsd="30"]', 400);
  const p = $("#tsp");
  if (p && p.options.length > 1) { p.value = p.options[1].value; p.onchange(); await new Promise(r => setTimeout(r, 150)); }
  snap("stats-train-30");
  await tap('[data-stv="m"]', 200);
}
// ⚙️ a všechny jeho sekce
async function settings() {
  if (!(await tap("#gear", 250))) return;
  snap("cfg");
  const n = document.querySelectorAll("[data-acch]").length;
  for (let i = 0; i < n; i++) { await tap(document.querySelectorAll("[data-acch]")[i], 200); snap("cfg-" + i); }
  await tap("#cz");
}
// ❓ Nápověda (všechny kapitoly rozbalené v HTML)
async function help() {
  if (!(await tap("#help", 250))) return;
  snap("help");
  await tap("#hlx", 150);
}
// Události: rychlé tlačítko, detail tréninku s plánem, úprava plánu, živý trénink (▶ Teď)
async function events() {
  await tap('#nav button[data-t="ev"]', 250);
  // Minulé: řádek stavu 💰 vyúčtování / 🏒 tréninku (stav tréninků se načte jednorázově)
  if (await tap('[data-evm="past"]', 400)) { snap("ev-past"); if (await tap("#evold", 250)) snap("ev-past-old"); await tap('[data-evm="up"]', 250); }
  // 📉 Hráčka: vzdálenější budoucnost až tlačítkem (druhý poslech od dnes + 16 dní)
  if (await tap("#evfar", 400)) snap("ev-far");
  if (await tap('[data-qa="e2|yes"]', 250)) snap("ev-quick");
  if (await tap("#evnt", 250)) { snap("ev-form"); await tap("#evfx", 200); }
  // 🖐 K2: okno ❌ s rychlými důvody (klepnutí na důvod uloží), nový zápas s předvyplněným časem a místem
  if (await tap('[data-qa="e2|no"]', 250)) { snap("ev-reason"); await tap('[data-rr="0"]', 250); }
  if (await tap("#evnm", 250)) { snap("ev-match-new"); await tap("#cl", 200); }
  if (!(await tap('[data-eo="e1"]', 400))) return;
  snap("ev-e1");
  // ✅ Potvrdit dresy (trenér): hráčky pak dresy uvidí
  if (await tap("#lsok", 250)) snap("ev-e1-lok");
  // 👥 Docházka rozbalená (řádky bez 🕘 zápisu – seznam se neposouvá) a okno 🕘 Historie přihlášek s filtry a pohledem podle osob
  if (await tap("#evatt summary", 300)) {
    snap("ev-e1-att");
    // v22.32: 🚫 i u realizačního týmu – nabízí se stejně jako u hráček (jen po začátku tréninku; nezávisí na časovém pásmu běhu testu)
    if (["manager", "trener"].includes(role) && !!$('[data-nos="p1"]') !== !!$('[data-nos="t1"]')) throw new Error("🚫 u realizačního týmu se nenabízí stejně jako u hráček");
  }
  if (await tap("[data-alg]", 300)) {
    snap("att-log");
    if (await tap('[data-alf="other"]', 150)) snap("att-log-other");
    if (await tap('[data-alv="pers"]', 150)) snap("att-log-pers");
    await tap("#algx", 150);
  }
  if (await tap("#tped", 300)) {
    snap("plan-edit");
    await tap('[data-tpop="1"]', 200);                                // ▸ sbalený blok 2 rozbalit
    if (await tap('[data-tpdu="1|1"]', 250)) snap("plan-edit-dur");
    // v22.34: 🚫⭐ Nehodnotit u bloku (zapnout a vypnout)
    if (await tap('[data-tpne="1"]', 200)) { if (!/Nehodnotit ✓/.test(document.body.textContent)) throw new Error("🚫⭐ přepínač se nezapnul"); snap("plan-edit-noeval"); await tap('[data-tpne="1"]', 200); }
    // v22.27: 🎓 trenéři přímo u linky (ne v ⚙ Další volby); nový blok rovnou otevře výběr cvičení, ➕ nové cvičení uloží do banky a vybere
    if ($("details.tpmo [data-tpco]")) throw new Error("📋 trenéři linky jsou pořád v ⚙ Další volby");
    if (await tap('[data-tpadd="all"]', 250)) {
      snap("plan-edit-add");
      if (!$("#dpk")) throw new Error("📋 nový blok neotevřel výběr cvičení");
      if (await tap("#dpk [data-dpnew]", 200)) {
        snap("plan-edit-newdrill");
        const n = $("#dpnn"), w0 = globalThis.__fb.writes.length;
        n.value = "Smoke nové cvičení";
        await tap('[data-dpnm="8"]', 150);
        await tap("#dpnok", 250);
        if ($("#dpk")) throw new Error("➕ nové cvičení: výběr se nezavřel");
        if (!globalThis.__fb.writes.slice(w0).some(w => /^drills\//.test(w.path))) throw new Error("➕ nové cvičení se nezapsalo do banky");
        if (!/Smoke nové cvičení/.test(document.body.textContent)) throw new Error("➕ nové cvičení se nevložilo do bloku");
        snap("plan-edit-newdrill-done");
      } else await tap("#dpx", 150);
    }
    // v22.33: 📝 cvičení jen do plánu (bez banky) – nic se nezapíše do drills, linka nese jen název
    if (await tap('[data-tpadd="all"]', 250) && await tap("#dpk [data-dpnew]", 200)) {
      const n = $("#dpnn"), w0 = globalThis.__fb.writes.length;
      n.value = "Smoke jen v plánu";
      await tap("#dpnfree", 250);
      if ($("#dpk")) throw new Error("📝 jen do plánu: výběr se nezavřel");
      if (globalThis.__fb.writes.slice(w0).some(w => /^drills\//.test(w.path))) throw new Error("📝 jen do plánu zapsal cvičení do banky");
      if (!/Smoke jen v plánu \(jen v plánu\)/.test(document.body.textContent)) throw new Error("📝 cvičení jen do plánu se nevložilo do bloku");
      snap("plan-edit-free");
    } else await tap("#dpx", 150);
    if (await tap("#tponly", 250)) snap("plan-edit-only");
    // v22.18.1: 💾 Uložit plán musí zapsat trplan (chyběl podpis stamp – uložení tiše padalo)
    const n0 = globalThis.__fb.writes.length;
    if (await tap("#tpok", 300) && !globalThis.__fb.writes.slice(n0).some(w => /^trplan\//.test(w.path))) throw new Error("📋 Uložit plán nic nezapsal");
  }
  if (await tap("#tlgo", 600)) {
    snap("trlive");
    // v22.17: přilepené záhlaví se zbývajícím časem vždy; řídící má pevnou spodní lištu ⏸ / ⏭ / +1 min
    if (!$("#tlv .tltop #tlr")) throw new Error("⏱ chybí zbývající čas v záhlaví");
    if ($("#tlv .tlbot")) snap("trlive-bar");
    // v22.28: ▶ Teď (linky) hned pod odpočtem, méně časté ovládání sbalené pod 🎛 až za ním
    const sec = $("#tlv .tlsec"), cd = $("#tlv #tlcd");
    if (!sec) throw new Error("⏱ chybí ▶ Teď pod odpočtem");
    if (cd && !(sec.compareDocumentPosition(cd) & 4)) throw new Error("⏱ 🎛 ovládání je nad ▶ Teď");
    // v22.33: 📋 Co následuje s hodinami začátků vidí celý realizační tým (upravit jen kdo smí plán)
    if (!$("#tlv #tlrs .tlck")) throw new Error("⏱ chybí 📋 Co následuje s hodinami začátků");
    // 🔒 Zámek dotyku: zapnout, odemknout dvojitým klepnutím
    if (await tap("#tlk", 200)) {
      snap("trlive-lock");
      if (!$("#tllock #tlc2")) throw new Error("🔒 zamčená obrazovka bez odpočtu");
      await tap("#tllock", 0); await tap("#tllock", 200);
      if ($("#tllock")) throw new Error("🔒 zámek dotyku se dvojitým klepnutím neodemkl");
    }
    // ▶ Teď: první klepnutí se zeptá (u cizího řídícího nejdřív převzetí řízení), další skočí na blok (bloky mezi se vypustí)
    if (await tap("[data-tlj]", 200)) {
      snap("trlive-jump-arm");
      for (let i = 0; i < 2 && document.querySelector("[data-tlj]"); i++) await tap("[data-tlj]", 300);
      snap("trlive-jump");
    }
    // v22.18 ⚡ improvizace: 👥 Na ledě, ➕ cvičení – hledání v bance, nové cvičení názvem, ▶ Hned vloží blok a skočí na něj
    if (await tap('[data-tq="ice"]', 200)) { snap("trlive-ice"); await tap('[data-tq="ice"]', 150); }
    if (await tap('[data-tq="add"]', 250)) {
      if (!$("#tlq #tlqs")) throw new Error("⚡ okno vložení cvičení bez hledání");
      // v22.33: filtr části tréninku v hledání (klepnutí a zrušení)
      if (await tap('#tlq [data-tqc="warm"]', 150)) { snap("trlive-quick-cat"); await tap('#tlq [data-tqc="warm"]', 150); }
      const s = $("#tlqs"), n0 = (globalThis.__fb.writes || []).length;
      s.value = "Hra 2 na 2"; s.dispatchEvent(new window.Event("input"));
      await wait(150);
      snap("trlive-quick");
      await tap('[data-tqm="5"]', 150);
      await tap('[data-tqx="ok"]', 300);
      if ($("#tlq") && await tap('[data-tqx="ok"]', 300)) { /* převzetí řízení druhým klepnutím */ }
      if ($("#tlq")) throw new Error("⚡ vložení cvičení se nezavřelo");
      if ((globalThis.__fb.writes || []).length <= n0) throw new Error("⚡ vložení cvičení nic nezapsalo");
      snap("trlive-quick-done");
    }
    await tap("#tlx", 200);
  }
  await tap("#evb", 200);
}
// Peníze: Team → 💰 Platby → ⚖️ Tarify (detail), 🔓 Výjimky a ☑ Hromadně (správce pokladny), Moje platby → 📅 Po měsících s 📊 docházkou (kdo má pid / tid)
// v22.29 Zápas: uzavřený zápas → krok 3 s 📤 Souhrn zápasu (bez sdílení i schránky ukáže text k ručnímu zkopírování)
async function matchShare() {
  if (!(await tap('#nav button[data-t="ev"]', 250))) return;
  const {S} = await import("../../src/core/state.js"), {render} = await import("../../src/views/shell.js"), {HK} = await import("../../src/data/storage.js");
  if (!HK.can("sport") || !(S.ma || []).some(m => m.id === "m0")) return;   // detail zápasu jen realizační tým
  S.mid = "m0"; S.step = 3; render(); await wait(200);
  snap("match-closed");
  if (!$("#mshc")) throw new Error("📤 uzavřený zápas bez karty Souhrn zápasu");
  await tap("[data-msh]", 250);
  const t = $("#mshc textarea");
  if (!t || !/Lvice – .* 1:2 \(0:1, 1:0, 0:1\)/.test(t.value)) throw new Error("📤 souhrn zápasu chybí nebo je špatně: " + (t ? t.value.split("\n")[0] : "bez textu"));
  snap("match-share");
  S.mid = null; S.step = 1; render(); await wait(150);
}
async function money() {
  // v22.32: manager přidá člena realizačního týmu rovnou s e-mailem a rolí
  if (role === "manager" && await tap('#nav button[data-t="fo"]', 250) && !$("#stm")) throw new Error("👥 realizační tým: chybí e-mail a role u přidání (manager)");
  if (await tap('#nav button[data-t="fo"]', 250) && await tap('[data-tm="pay"]', 250)) {
    if (await tap('[data-fv="tf"]', 250)) {
      snap("pay-tariff");
      if (await tap("[data-ft]", 250)) snap("pay-tariff-detail");   // ⚖️ detail hráčky: měsíce, události, dopad na pokladnu
    }
    // 🔓 Výjimky: výběr dlužnice po splatnosti a hromadná výjimka druhým klepnutím
    if (await tap('[data-fv="ex"]', 250)) {
      snap("pay-exc");
      const cb = $("[data-xs]");
      if (cb) { cb.checked = true; cb.dispatchEvent(new window.Event("change")); await wait(150); }
      if (await tap("#xgo", 200)) { snap("pay-exc-arm"); if (await tap("#xgo", 300)) snap("pay-exc-done"); }
    }
    // ☑ Hromadně: zaškrtnutí předpisu, zápis druhým klepnutím
    if (await tap('[data-fv="hb"]', 250)) {
      snap("pay-bulk");
      // 🏦 výpis neznámé banky: nepoznané záhlaví → ⚙ Sloupce výpisu, ruční přiřazení částky a VS
      const f = $("#hbf");
      if (f) {
        const csv = "Statement\nBooked,Value,Sym,Payer\n2026-10-20,150.00,1001,Anna\n";
        Object.defineProperty(f, "files", {value: [new window.File([csv], "vypis.csv", {type: "text/csv"})]});
        f.dispatchEvent(new window.Event("change"));
        await new Promise(r => setTimeout(r, 300));
        snap("pay-bank-unknown");
        const set = async (k, v) => { const e = $(`[data-hmk="${k}"]`); if (e) { e.value = v; e.dispatchEvent(new window.Event("change")); await new Promise(r => setTimeout(r, 150)); } };
        await set("amt", "value"); await set("vs", "sym");
        snap("pay-bank-mapped");
        await tap("#hbx", 150);
      }
      if (await tap("[data-hc]", 150) && await tap("#hbw", 200)) { snap("pay-bulk-arm"); if (await tap("#hbw", 300)) snap("pay-bulk-done"); }
    }
    // 🕘 Historie placení hráčky (Podle hráček → rozbalit → 🕘), uložení zpětné změny
    if (await tap('[data-fv="pl"]', 150) && await tap('[data-fall]', 150) && await tap("[data-fo]", 200) && await tap("[data-fh]", 200)) {
      snap("pay-hist");
      if (await tap("#phs", 150) && await tap("#phs", 250)) snap("pay-hist-saved");
      await tap("#phx", 150);
    }
    // 🏦 Pokladna: převod mezi účty a výdaj s příjemcem a měsícem; 🧾 Náklady: rozbalení řádku a ➖ Zapsat platbu (předvyplněný výdaj)
    if (await tap('[data-tm="cash"]', 250)) {
      snap("cash");
      if (await tap('[data-cba="tr"]', 150)) {
        const amt = $('[data-cf="amt"]');
        if (amt) amt.value = "250";
        snap("cash-tr");
        if (await tap("#cbs", 200)) snap("cash-tr-saved");
      }
      if (await tap('[data-cba="out"]', 150)) {
        snap("cash-out");
        // v22.31: ➖ výdaj předvyplní kategorii, příjemce a účet posledního výdaje (zkušební data: led, Zimní stadion, provozní účet)
        const py = $('[data-cf="payee"]'), ct = $('[data-cf="cat"]');
        if (!py || py.value !== "Zimní stadion" || !ct || ct.value !== "Pronájem ledu") throw new Error("➖ výdaj se nepředvyplnil z posledního výdaje: " + (py && py.value) + " / " + (ct && ct.value));
        await tap("#cbc", 150);
      }
    }
    if (await tap('[data-tm="cost"]', 250)) {
      snap("cost");
      if (await tap("[data-cko]", 200)) {
        snap("cost-open");
        if (await tap("[data-ckp]", 250)) snap("cost-pay-form");
      }
    }
    // Úhrada s datem platby (Podle hráček → rozbalit → 💳 / ✅ Zaplatila vše)
    if (await tap('[data-tm="pay"]', 250) && await tap('[data-fv="pl"]', 150)) {
      if (!$("[data-fp]")) await tap("[data-fo]", 200);   // hráčka může být rozbalená z předchozího kroku
      if (await tap("[data-fp]", 200)) { snap("pay-one-date"); await tap("#cpx", 150); }
      if (await tap("[data-fa]", 200)) { snap("pay-all-date"); await tap("#cpo", 250); snap("pay-all-done"); }
    }
    await tap('[data-tm="team"]', 200);
  }
  if (await tap('#nav button[data-t="mk"]', 250) && await tap('[data-mkv="mon"]', 250)) {
    snap("mine-months");
    await tap('[data-mkv="list"]', 150);
  }
}

// ===== Hlavní logika =====
try {
  await start();
  await tabs();
  await homeMiss();
  await homeQuick();
  await trainStats();
  await settings();
  await help();
  await events();
  await matchShare();
  await money();
  await tap('#nav button[data-t="home"]', 250);
  snap("end");
} catch (e) {
  globalThis.__smokeErr.push("scénář: " + (e && e.stack || e));
}
console.log("SMOKE " + JSON.stringify({role, steps, errors: globalThis.__smokeErr}));
process.exit(0);
