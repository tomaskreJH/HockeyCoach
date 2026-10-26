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
  if (await tap('[data-qa="e2|yes"]', 250)) snap("ev-quick");
  if (await tap("#evnt", 250)) { snap("ev-form"); await tap("#evfx", 200); }
  if (!(await tap('[data-eo="e1"]', 400))) return;
  snap("ev-e1");
  if (await tap("#tped", 300)) {
    snap("plan-edit");
    if (await tap('[data-tpdu="1|1"]', 250)) snap("plan-edit-dur");
    if (await tap('[data-tpadd="all"]', 250)) snap("plan-edit-add");
    if (await tap("#tponly", 250)) snap("plan-edit-only");
    await tap("#tpx", 250);
    await tap("#tpx", 250);
  }
  if (await tap("#tlgo", 600)) {
    snap("trlive");
    // ▶ Teď: první klepnutí se zeptá (u cizího řídícího nejdřív převzetí řízení), další skočí na blok (bloky mezi se vypustí)
    if (await tap("[data-tlj]", 200)) {
      snap("trlive-jump-arm");
      for (let i = 0; i < 2 && document.querySelector("[data-tlj]"); i++) await tap("[data-tlj]", 300);
      snap("trlive-jump");
    }
    await tap("#tlx", 200);
  }
  await tap("#evb", 200);
}
// Peníze: Team → 💰 Platby → ⚖️ Tarify a ☑ Hromadně (správce pokladny), Moje platby → 📅 Po měsících s 📊 docházkou (kdo má pid / tid)
async function money() {
  if (await tap('#nav button[data-t="fo"]', 250) && await tap('[data-tm="pay"]', 250)) {
    if (await tap('[data-fv="tf"]', 250)) snap("pay-tariff");
    // ☑ Hromadně: zaškrtnutí předpisu, zápis druhým klepnutím
    if (await tap('[data-fv="hb"]', 250)) {
      snap("pay-bulk");
      if (await tap("[data-hc]", 150) && await tap("#hbw", 200)) { snap("pay-bulk-arm"); if (await tap("#hbw", 300)) snap("pay-bulk-done"); }
    }
    await tap('[data-fv="pl"]', 150);
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
  await settings();
  await help();
  await events();
  await money();
  await tap('#nav button[data-t="home"]', 250);
  snap("end");
} catch (e) {
  globalThis.__smokeErr.push("scénář: " + (e && e.stack || e));
}
console.log("SMOKE " + JSON.stringify({role, steps, errors: globalThis.__smokeErr}));
process.exit(0);
