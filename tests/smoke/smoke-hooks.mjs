// Kouřový test: háček zavaděče modulů – adresy Firebase SDK (gstatic.com) se načtou ze zástupce smoke-fb.mjs.
const STUB = new URL("./smoke-fb.mjs", import.meta.url).href;

// ===== Hlavní logika =====
export async function resolve(spec, ctx, next) {
  if (spec.startsWith("https://www.gstatic.com/")) return {url: STUB, shortCircuit: true};
  return next(spec, ctx);
}
