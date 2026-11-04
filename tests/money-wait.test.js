// Test opravy v22.41.1: pohled „⏳ Načítám pokladnu…“ se po načtení překreslí sám (hlídá pořadí v src/main.js a data/storage.js).
// Struktura: Pomocné funkce -> Testy.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// ===== Pomocné funkce =====
const read = f => readFileSync(new URL("../" + f, import.meta.url), "utf8");

// ===== Testy =====
test("pokladna na vyžádání: překreslení po načtení běží až po přepnutí stavu na „načteno“", () => {
  assert.match(read("src/main.js"), /res\(\); setTimeout\(render, 0\);/);
  assert.match(read("src/data/storage.js"), /\.then\(\(\) => \{ monSt = "ok"; \}\)/);
});
