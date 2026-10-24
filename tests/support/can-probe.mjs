// Pomocný skript testu oprávnění: přihlásí účet s danou rolí přes zástupce Firebase a vypíše výsledky HK.can() jako JSON.
// Použití: node --import ./tests/support/setup.mjs tests/support/can-probe.mjs <role> <cash 0|1> [rv]
// rv = verze rolí v members (2 = role po převodu; bez ní je stará hodnota trener = manager).
// Každá role potřebuje samostatný proces (přihlášení proběhne v aplikaci jen jednou).

// ===== Hlavní logika =====
const [role, cash, rv] = process.argv.slice(2);
globalThis.__fb = {user: {email: "x@test.cz", uid: "u"}, members: {"x@test.cz": {role, cash: cash === "1", rv: rv ? Number(rv) : undefined, pid: role === "hracka" || role === "host" ? "p1" : undefined}}, data: {}};
const {HK} = await import("../../src/data/storage.js");
await HK.ready();
const acts = ["sport", "money", "members", "roster", "accounts", "admin", "onlyOwn", "guest", "wipe"];
let unknown = "";
try { HK.can("neznama"); } catch (e) { unknown = e.message; }
process.stdout.write(JSON.stringify({can: Object.fromEntries(acts.map(a => [a, HK.can(a)])), unknown, old: ["isStaff", "isCash", "role"].filter(k => k in HK)}));
process.exit(0);
