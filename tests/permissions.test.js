// Test oprávnění na jednom místě: HK.can(akce) v data/storage.js (tabulka odvozená z domain/permissions.js) dává pro každou roli
// stejný výsledek jako tabulka CAN před OM (trenér = vše, kustod = sport, pokladník = příznak cash). Srovnání: stará role trener → manager,
// kustod → asistent, hracka, host, pokladník; nová role trener (rv 2) = sport + soupiska, pokladna jen s příznakem.
// Každá role běží v samostatném procesu (tests/support/can-probe.mjs). Struktura: Importy -> Očekávané hodnoty -> Testy.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const probe = (role, cash, rv) => JSON.parse(execFileSync(process.execPath, ["--import", "./tests/support/setup.mjs", "tests/support/can-probe.mjs", role, cash ? "1" : "0", rv ? String(rv) : ""], {cwd: ROOT, encoding: "utf8"}));

// ===== Očekávané hodnoty (wipe jen vývojář – testovací účet jím není) =====
const T = true, F = false;
// Dnešní tabulka CAN (před OM) – nesmí se změnit pro staré hodnoty rolí ani pro jejich nové protějšky
const OLD_TRENER = {sport: T, money: T, members: T, roster: T, accounts: T, admin: T, onlyOwn: F, guest: F, wipe: F};
const OLD_KUSTOD = {sport: T, money: F, members: F, roster: F, accounts: F, admin: F, onlyOwn: F, guest: F, wipe: F};
const OLD_KUSTOD_CASH = {sport: T, money: T, members: T, roster: F, accounts: F, admin: F, onlyOwn: F, guest: F, wipe: F};
const OLD_HRACKA = {sport: F, money: F, members: F, roster: F, accounts: F, admin: F, onlyOwn: T, guest: F, wipe: F};
const OLD_HRACKA_CASH = {sport: F, money: T, members: T, roster: F, accounts: F, admin: F, onlyOwn: T, guest: F, wipe: F};
const OLD_HOST = {sport: F, money: F, members: F, roster: F, accounts: F, admin: F, onlyOwn: T, guest: T, wipe: F};
const EXP = [
  ["trener", F, 0, OLD_TRENER],                // trenér před převodem (bez rv) = manager
  ["manager", F, 2, OLD_TRENER],
  ["kustod", F, 0, OLD_KUSTOD],
  ["asistent", F, 2, OLD_KUSTOD],
  ["kustod", T, 0, OLD_KUSTOD_CASH],
  ["asistent", T, 2, OLD_KUSTOD_CASH],
  ["hracka", F, 0, OLD_HRACKA],
  ["hracka", T, 0, OLD_HRACKA_CASH],
  ["host", F, 0, OLD_HOST],
  // Nový trenér (po převodu): sport a soupiska; s příznakem pokladník (OM-10) pokladna a členové-hráčky jako dnes
  ["trener", T, 2, {sport: T, money: T, members: T, roster: T, accounts: F, admin: F, onlyOwn: F, guest: F, wipe: F}],
  ["trener", F, 2, {sport: T, money: F, members: F, roster: T, accounts: F, admin: F, onlyOwn: F, guest: F, wipe: F}]
];

// ===== Testy =====
for (const [role, cash, rv, exp] of EXP) {
  test(`can(): ${role}${rv ? " (rv " + rv + ")" : ""}${cash ? " + pokladník" : ""}`, () => {
    const r = probe(role, cash, rv);
    assert.deepEqual(r.can, exp);
    assert.match(r.unknown, /Neznámá akce oprávnění/, "neznámá akce je chyba");
    assert.deepEqual(r.old, [], "HK už nenabízí isStaff / isCash / role – jen can()");
  });
}
