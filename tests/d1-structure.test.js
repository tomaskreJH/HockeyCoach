// Testy úklidu D1 (část 2, v18.9.1): jediný výpočet statistik playerStats (domain/player-stats.js)
// a hlídání struktury kódu – každá věc na jednom místě (kontrola textu zdrojů).
// Struktura: Importy -> Pomocné funkce -> playerStats -> Struktura kódu.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, statSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {S} from "../src/core/state.js";
import {playerStats} from "../src/domain/player-stats.js";

// ===== Pomocné funkce =====
const SRC = fileURLToPath(new URL("../src/", import.meta.url));
// Všechny zdroje aplikace kromě cizí knihovny (src/lib)
const files = (d = SRC) => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? (f === "lib" ? [] : files(p)) : p.endsWith(".js") ? [p] : []; });
const rel = p => p.slice(SRC.length).replace(/\\/g, "/");
const grep = re => files().filter(p => re.test(readFileSync(p, "utf8"))).map(rel).sort();

// ===== playerStats =====
test("playerStats: rozpis jednoho zápasu vs. souhrn (+/- brankářek, gp, PP, doma / venku, tým)", () => {
  S.pl = [{id: "g", name: "G", pos: "Brankářka"}, {id: "a", name: "A", pos: "Útočnice"}, {id: "b", name: "B", pos: "Obránkyně"}, {id: "c", name: "C", pos: "Útočnice"}];
  const m1 = {id: "m1", home: true, lineup: {G1: "g", "1C": "a", "1LO": "b", "2C": "c"}, events: [
    {k: "G", team: "us", sit: "E", scorer: "a", a1: "b", on: ["a", "b", "g"]},
    {k: "G", team: "us", sit: "PP", scorer: "b", on: ["a", "b", "g"]},
    {k: "G", team: "opp", sit: "E", on: ["a", "g"]},
    {k: "S", team: "us", shooter: "a"}, {k: "S", team: "opp", gk: "g"},
    {k: "P", team: "us", pid: "b", min: 2}]};
  const m2 = {id: "m2", home: false, lineup: {G1: "g", "1C": "a"}, events: [{k: "G", team: "us", sit: "E", scorer: "a", on: ["a", "g"]}]};
  const one = playerStats([m1], {match: true});
  assert.deepEqual(Object.keys(one.T), ["a", "b", "c"], "rozpis: bruslařky sestavy, brankářka bez +/-");
  assert.deepEqual([one.T.a.g, one.T.a.sh, one.T.a.pm, one.T.b.a, one.T.b.pim, one.T.b.pm, one.T.c.pm], [1, 2, 0, 1, 2, 1, 0]);
  assert.deepEqual(one.GK, {g: {sa: 2, ga: 1}});
  assert.equal(one.T.a.toi, 0, "bez živého zápisu žádné střídání");
  const all = playerStats([m1, m2]);
  assert.deepEqual(Object.keys(all.T), ["g", "a", "b", "c"], "souhrn: všichni v sestavě, pořadí prvního výskytu");
  assert.deepEqual([all.T.a.gp, all.T.c.gp, all.T.g.pm, all.T.b.ppg, all.T.a.hp, all.T.a.ap, all.T.b.hp], [2, 1, 1, 1, 1, 1, 2]);
  assert.deepEqual(all.TT, {sf: 4, sa: 2, gf: 3, ga: 1}, "střely týmu = góly + střely");
  assert.deepEqual(playerStats([]), {T: {}, GK: {}, TT: {sf: 0, sa: 0, gf: 0, ga: 0}});
});

// ===== Struktura kódu =====
test("struktura: název týmu a aplikace jen v src/config/team-config.js", () => {
  assert.deepEqual(grep(/HC Střely|Hokej – zápasy/), ["config/team-config.js"]);
});
test("struktura: kontroly rolí jen v data/storage.js (pohledy jen přes HK.can)", () => {
  assert.deepEqual(grep(/HK\.(isStaff|isCash|role)\(|role\(\) ?===/), []);
});
test("struktura: potvrzení druhým klepnutím jen přes confirm2, CSV jen přes csv, přetahování jen v core/drag.js", () => {
  assert.deepEqual(grep(/setTimeout\(\(\) ?=> ?\{ ?if ?\(S\.cf ?===/), ["core/actions.js"]);
  assert.deepEqual(grep(/\\ufeff|﻿/), ["core/utils.js"]);
  assert.deepEqual(grep(/addEventListener\("touchstart"/), ["core/drag.js"]);
});
test("struktura: statistiky hráček počítá jen domain/player-stats.js", () => {
  assert.deepEqual(grep(/\.pim\s*\+=\s*e\.min/), ["domain/player-stats.js"], "trestné minuty z událostí zápasu");
});
test("struktura: komentáře bez historie verzí, živý zápis rozdělený (live.js neexistuje)", () => {
  assert.deepEqual(grep(/\/\/ *v1\d\./), []);
  assert.ok(!files().some(p => rel(p) === "views/live.js"));
  // Stejný název má jen starší pár views/attendance.js a domain/attendance.js – další soubory se stejným názvem nesmí přibýt
  const names = files().map(p => p.split(/[\\/]/).pop()), dup = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))].sort();
  assert.deepEqual(dup, ["attendance.js"], "žádný další soubor se stejným názvem");
});
