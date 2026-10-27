// Kanál aplikace: stabilní (kořen webu) nebo 🧪 beta (podsložka beta/ – větev beta v GitHubu, nasazení .github/workflows/pages.yml).
// Kód je v obou kanálech stejný, kanál se pozná jen podle adresy stránky – vydání bety do stabilní nic nepřepisuje.
// Service worker (sw.js) má stejné pravidlo opsané u sebe (klasický skript nemůže importovat modul); cache mají podle kanálu vlastní předponu.

// ===== Konstanty =====
export const BETA_DIR = "beta/";                       // podsložka bety vedle stabilní verze
const BETA_RE = /\/beta\/[^/]*$/;                      // stránka přímo ve složce beta/ („/beta/“ nebo „/beta/index.html“)
const PFX = {stable: "hokej-v", beta: "hokej-beta-v"}; // předpona názvu cache service workeru podle kanálu

// ===== Pomocné funkce =====
// Kanál podle cesty stránky: "beta" | "stable"
export const channelOf = path => BETA_RE.test(String(path || "")) ? "beta" : "stable";
// Složka stránky bez souboru (/HockeyCoach/index.html → /HockeyCoach/)
const dirOf = path => String(path || "/").replace(/[^/]*$/, "") || "/";
// Cesta ke stabilní verzi z libovolného kanálu
export const stablePath = path => channelOf(path) === "beta" ? dirOf(path).slice(0, -BETA_DIR.length) || "/" : dirOf(path);
// Cesta k betě z libovolného kanálu
export const betaPath = path => stablePath(path) + BETA_DIR;
// Předpona cache service workeru daného kanálu (staré cache hokej-vNN patří stabilní verzi)
export const cachePrefix = ch => PFX[ch === "beta" ? "beta" : "stable"];

// ===== Stav (kanál této stránky) =====
const here = typeof location !== "undefined" && location ? location.pathname : "/";
export const CHANNEL = channelOf(here);
export const IS_BETA = CHANNEL === "beta";
export const CHANNEL_LABEL = IS_BETA ? "🧪 Beta" : "Stabilní";
// Adresy přepnutí kanálu pro tuto stránku
export const STABLE_URL = stablePath(here);
export const BETA_URL = betaPath(here);
