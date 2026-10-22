// Háček zavaděče modulů pro testy: adresy Firebase SDK (https://www.gstatic.com/firebasejs/…) se načtou ze zástupce firebase-stub.mjs.
// Ostatní moduly aplikace se načítají beze změny přímo ze složky src/.
const STUB = new URL("./firebase-stub.mjs", import.meta.url).href;

// ===== Hlavní logika =====
export async function resolve(spec, ctx, next) {
  if (spec.startsWith("https://www.gstatic.com/")) return {url: STUB, shortCircuit: true};
  return next(spec, ctx);
}
