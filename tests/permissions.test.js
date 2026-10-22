// Test oprávnění na jednom místě: HK.can(akce) v data/storage.js dává pro každou roli stejný výsledek
// jako dřívější kontroly v pohledech (isStaff = trenér / kustod, isCash = trenér nebo příznak pokladník,
// role === "trener", role === "hracka"). Každá role běží v samostatném procesu (tests/support/can-probe.mjs).
// Struktura: Importy -> Očekávané hodnoty -> Testy.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const probe = (role, cash) => JSON.parse(execFileSync(process.execPath, ["--import", "./tests/support/setup.mjs", "tests/support/can-probe.mjs", role, cash ? "1" : "0"], {cwd: ROOT, encoding: "utf8"}));

// ===== Očekávané hodnoty (chování v18.9) =====
const T = true, F = false;
const EXP = [
  ["trener", F, {sport: T, money: T, members: T, roster: T, accounts: T, admin: T, onlyOwn: F}],
  ["kustod", F, {sport: T, money: F, members: F, roster: F, accounts: F, admin: F, onlyOwn: F}],
  ["kustod", T, {sport: T, money: T, members: T, roster: F, accounts: F, admin: F, onlyOwn: F}],
  ["hracka", F, {sport: F, money: F, members: F, roster: F, accounts: F, admin: F, onlyOwn: T}],
  ["hracka", T, {sport: F, money: T, members: T, roster: F, accounts: F, admin: F, onlyOwn: T}]
];

// ===== Testy =====
for (const [role, cash, exp] of EXP) {
  test(`can(): ${role}${cash ? " + pokladník" : ""}`, () => {
    const r = probe(role, cash);
    assert.deepEqual(r.can, exp);
    assert.match(r.unknown, /Neznámá akce oprávnění/, "neznámá akce je chyba");
    assert.deepEqual(r.old, [], "HK už nenabízí isStaff / isCash / role – jen can()");
  });
}
