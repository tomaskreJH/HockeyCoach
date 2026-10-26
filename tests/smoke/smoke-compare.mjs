// Porovnání dvou uložení kouřového testu (npm run smoke -- --save <adresář>): vypíše chybějící a odlišné obrazovky.
// Použití: node tests/smoke/smoke-compare.mjs <před> <po>. Úklid bez změny chování = shoda (kromě záměrně změněných textů).

// ===== Importy =====
import {existsSync, readFileSync, readdirSync} from "node:fs";
import {join} from "node:path";

// ===== Pomocné funkce =====
// Číslo verze aplikace se mezi verzemi liší vždy – při porovnání se nahradí značkou
const norm = t => t.replace(/v\d+(\.\d+){0,2}( · \d+\. \d+\. \d{4})?/g, "vX");

// ===== Hlavní logika =====
const [a, b] = process.argv.slice(2);
if (!a || !b) { console.log("Použití: node tests/smoke/smoke-compare.mjs <před> <po>"); process.exit(2); }
const names = [...new Set([...readdirSync(a), ...readdirSync(b)])].sort();
let diff = 0;
for (const n of names) {
  if (!existsSync(join(a, n)) || !existsSync(join(b, n))) { diff++; console.log("chybí v " + (existsSync(join(a, n)) ? b : a) + ": " + n); continue; }
  const x = norm(readFileSync(join(a, n), "utf8")).split("\n"), y = norm(readFileSync(join(b, n), "utf8")).split("\n");
  if (x.join("\n") === y.join("\n")) continue;
  diff++;
  const k = x.findIndex((l, j) => l !== y[j]);
  console.log(`rozdíl: ${n} (řádek ${k + 1})\n  před: ${(x[k] || "").slice(0, 200)}\n  po:   ${(y[k] || "").slice(0, 200)}`);
}
console.log(diff ? `\n${diff} rozdílných z ${names.length}` : `Shoda všech ${names.length} obrazovek`);
process.exit(diff ? 1 : 0);
