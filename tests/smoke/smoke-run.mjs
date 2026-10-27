// Kouřový test všech rolí (npm run smoke): každá role v samostatném procesu (smoke-role.mjs), chyba v konzoli nebo výjimka = selhání.
// Volba --save <adresář> uloží vykreslené HTML obrazovek (porovnání: node tests/smoke/smoke-compare.mjs <a> <b>).
// Volba --beta spustí aplikaci z adresy 🧪 bety (…/beta/): pruh bety, zamčená beta u účtů, které nejsou testeři.

// ===== Importy =====
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {ROLES} from "./smoke-data.mjs";

// ===== Konstanty =====
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const i = process.argv.indexOf("--save"), dir = i > 0 ? process.argv[i + 1] : "";
const beta = process.argv.includes("--beta");
const only = process.argv.slice(2).filter((a, k, all) => !a.startsWith("--") && all[k - 1] !== "--save");

// ===== Pomocné funkce =====
// Jedna role v samostatném procesu (souběžně); výsledek {role, steps, errors}
function runRole(role) {
  return new Promise(res => {
    const p = spawn(process.execPath, ["--import", "./tests/smoke/smoke-env.mjs", "tests/smoke/smoke-role.mjs", role, dir], {cwd: ROOT, env: beta ? {...process.env, SMOKE_URL: "https://hockeycoach.test/beta/"} : process.env});
    let out = "", err = "";
    const kill = setTimeout(() => p.kill(), 90000);
    p.stdout.on("data", d => { out += d; });
    p.stderr.on("data", d => { err += d; });
    p.on("close", () => {
      clearTimeout(kill);
      const line = out.split("\n").find(l => l.startsWith("SMOKE "));
      res(line ? JSON.parse(line.slice(6)) : {role, steps: [], errors: ["proces skončil bez výsledku: " + err.slice(-800)]});
    });
  });
}

// ===== Hlavní logika =====
const roles = Object.keys(ROLES).filter(r => !only.length || only.includes(r));
const results = await Promise.all(roles.map(runRole));
let fail = 0;
for (const res of results) {
  const ok = !res.errors.length;
  if (!ok) fail++;
  console.log(`${ok ? "ok  " : "CHYBA"} ${res.role.padEnd(16)} ${res.steps.length} obrazovek`);
  res.errors.forEach(e => console.log("      " + String(e).split("\n").slice(0, 4).join("\n      ")));
}
console.log(fail ? `\n${fail} rolí s chybou` : "\nVšechny role bez chyb");
process.exit(fail ? 1 : 0);
