// Pojistka v22.18.1: každý soubor, který volá stamp(), ho musí sám definovat nebo importovat
// (úklid v22.1.2 odstranil „nepoužité“ stamp a 💾 Uložit plán, 📑 šablona a ⭐ Výkonnost pak tiše padaly).
import test from "node:test";
import assert from "node:assert/strict";
import {readdirSync, readFileSync, statSync} from "node:fs";
import {join} from "node:path";

// ===== Pomocné funkce =====
const files = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : p.endsWith(".js") ? [p] : []; });

// ===== Test =====
test("stamp(): použití jen se definicí nebo importem ve stejném souboru", () => {
  const bad = files("src").filter(p => {
    const s = readFileSync(p, "utf8");
    if (!/(?<![\w$])(?<![\w$]\.)stamp\(\)/.test(s)) return false;     // volání stamp(), ne HK.stamp()
    return !/(const|function|let)\s+stamp\b/.test(s) && !/import\s*\{[^}]*\bstamp\b[^}]*\}/.test(s) && !/\{[^}]*\bstamp\b[^}]*\}\s*=\s*C\b/.test(s);
  });
  assert.deepEqual(bad, []);
});
