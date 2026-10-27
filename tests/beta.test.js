// Testy 🧪 beta kanálu: rozpoznání kanálu z adresy (core/channel.js), seznam testerů a nabídka bety (domain/beta.js),
// kontrola textu pravidel settings/beta, service workeru (cache podle kanálu), zálohy (testeři se neobnovují) a nasazení z obou větví.

// ===== Importy =====
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {BETA_DIR, CHANNEL, betaPath, cachePrefix, channelOf, stablePath} from "../src/core/channel.js";
import {BETA_DOC, MAX_TESTERS, betaDocOf, betaOffer, canUseBeta, isTester, setTester, testersOf} from "../src/domain/beta.js";

// ===== Pomocné funkce =====
const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

// ===== Kanál =====
test("channelOf: složka beta/ = beta, jinak stabilní", () => {
  assert.equal(channelOf("/HockeyCoach/"), "stable");
  assert.equal(channelOf("/HockeyCoach/index.html"), "stable");
  assert.equal(channelOf("/HockeyCoach/beta/"), "beta");
  assert.equal(channelOf("/HockeyCoach/beta/index.html"), "beta");
  assert.equal(channelOf("/beta/"), "beta");
  assert.equal(channelOf("/"), "stable");
  assert.equal(channelOf(""), "stable");
  assert.equal(CHANNEL, "stable", "v testech (bez adresy) stabilní");
});

test("stablePath / betaPath: přepnutí kanálu z obou stran", () => {
  assert.equal(stablePath("/HockeyCoach/beta/index.html"), "/HockeyCoach/");
  assert.equal(stablePath("/HockeyCoach/beta/"), "/HockeyCoach/");
  assert.equal(stablePath("/HockeyCoach/index.html"), "/HockeyCoach/");
  assert.equal(betaPath("/HockeyCoach/"), "/HockeyCoach/" + BETA_DIR);
  assert.equal(betaPath("/HockeyCoach/beta/"), "/HockeyCoach/beta/");
  assert.equal(stablePath("/beta/"), "/");
  assert.equal(betaPath("/"), "/beta/");
});

test("cachePrefix: stabilní hokej-v (staré cache), beta hokej-beta-v – předpony se nepřekrývají", () => {
  assert.equal(cachePrefix("stable"), "hokej-v");
  assert.equal(cachePrefix("beta"), "hokej-beta-v");
  assert.ok(!"hokej-beta-v108".startsWith(cachePrefix("stable")), "Načíst novou verzi ve stabilní nesmaže cache bety");
  assert.ok(!"hokej-v108".startsWith(cachePrefix("beta")));
});

// ===== Testeři =====
test("testersOf / setTester: malá písmena, bez duplicit a prázdných, seřazení", () => {
  assert.deepEqual(testersOf({testers: [" B@x.cz", "a@x.cz", "b@x.cz", ""]}), ["a@x.cz", "b@x.cz"]);
  assert.deepEqual(testersOf(null), []);
  assert.deepEqual(testersOf({testers: "a@x.cz"}), []);
  assert.deepEqual(setTester(["a@x.cz"], "C@x.cz", true), ["a@x.cz", "c@x.cz"]);
  assert.deepEqual(setTester(["a@x.cz", "c@x.cz"], "A@X.CZ", false), ["c@x.cz"]);
  assert.deepEqual(setTester(["a@x.cz"], "", true), ["a@x.cz"]);
});

test("isTester / canUseBeta: vývojář vždy, manager smí do bety, ostatní jen ze seznamu", () => {
  const d = {testers: ["anna@x.cz"]};
  assert.equal(isTester(d, "Anna@x.cz", false), true);
  assert.equal(isTester(d, "eva@x.cz", false), false);
  assert.equal(isTester(null, "dev@x.cz", true), true);
  assert.equal(isTester(d, "", false), false);
  assert.equal(canUseBeta(false, true), true);
  assert.equal(canUseBeta(true, false), true);
  assert.equal(canUseBeta(false, false), false);
});

test("betaDocOf: tvar settings/beta a horní mez seznamu", () => {
  const many = Array.from({length: 60}, (_, i) => "t" + i + "@x.cz");
  const d = betaDocOf(many, "Mgr@X.cz", "2026-10-27T10:00:00.000Z");
  assert.deepEqual(Object.keys(d).sort(), ["at", "by", "testers"]);
  assert.equal(d.testers.length, MAX_TESTERS);
  assert.equal(d.by, "mgr@x.cz");
  assert.equal(BETA_DOC, "beta");
});

test("betaOffer: jen tester ve stabilní, jen novější beta, ne skrytá", () => {
  const base = {channel: "stable", tester: true, cur: "22.10", beta: "22.12", hidden: null};
  assert.equal(betaOffer(base), true);
  assert.equal(betaOffer({...base, channel: "beta"}), false);
  assert.equal(betaOffer({...base, tester: false}), false);
  assert.equal(betaOffer({...base, beta: "22.10"}), false, "po vydání má stabilní stejné číslo – žádná nabídka");
  assert.equal(betaOffer({...base, beta: "22.9"}), false);
  assert.equal(betaOffer({...base, beta: ""}), false);
  assert.equal(betaOffer({...base, hidden: "22.12"}), false);
  assert.equal(betaOffer({...base, hidden: "22.11"}), true, "skrytá starší beta neskryje novější");
});

// ===== Pravidla, záloha, service worker, nasazení =====
test("firestore.rules: settings/beta zapisuje manager nebo vývojář, jen povolená pole, nejde smazat", () => {
  const r = read("firestore.rules");
  assert.match(r, /function betaSettingsOk\(\)/);
  assert.match(r, /\(isMgr\(\) \|\| isDevAcct\(\)\) && request\.resource\.data\.keys\(\)\.hasOnly\(\['testers', 'by', 'at'\]\)/);
  assert.match(r, /testers\.size\(\) <= 50/);
  assert.match(r, /id == 'beta' \? betaSettingsOk\(\)/);
  assert.match(r, /allow delete: if id != 'cash' && id != 'app' && id != 'beta'/);
  const dev = read("src/config/team-config.js").match(/DEV_EMAILS = \[([^\]]*)\]/)[1];
  assert.ok(r.includes("mail() in [" + dev.replace(/"/g, "'") + "]"), "vývojář v pravidlech = DEV_EMAILS");
});

test("záloha: settings/beta se neobnovuje ani nemaže", () => {
  const b = read("src/data/backup.js");
  assert.match(b, /id === PERM_DOC \|\| id === BETA_DOC\)\) return;/);
  assert.match(b, /id === APP_DOC \|\| id === PERM_DOC \|\| id === BETA_DOC\)/);
});

test("sw.js: kanál podle adresy, maže jen vlastní cache, stabilní nechá betu", () => {
  const s = read("sw.js");
  assert.match(s, /const BETA = \/\\\/beta\\\/sw\\\.js\$\/\.test\(self\.location\.pathname\)/);
  assert.match(s, /x\.startsWith\(PFX\) && x !== C/);
  assert.match(s, /if \(!BETA && u\.pathname\.startsWith\(BETA_PATH\)\) return;/);
});

test("Načíst novou verzi a 🔒 Vyžadovat verzi: jen vlastní kanál, v betě se minimum nenastavuje", () => {
  const st = read("src/data/storage.js"), cf = read("src/data/cfg-api.js");
  assert.match(st, /rs\.filter\(r => r\.scope === scope\)/);
  assert.match(st, /ks\.filter\(k => k\.startsWith\(pfx\)\)/);
  assert.match(cf, /raise: !IS_BETA && canRaise/);
  assert.match(cf, /if \(IS_BETA\) \{ say\(/);
});

test("nasazení: workflow staví main do kořene a betu do beta/", () => {
  const w = read(".github/workflows/pages.yml");
  assert.match(w, /branches: \[main, beta\]/);
  assert.match(w, /beta\/ _site\/beta\//);
  assert.match(w, /actions\/deploy-pages@v4/);
});
