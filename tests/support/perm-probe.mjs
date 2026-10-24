// Pomocný skript testu matice práv: přihlásí účet s rolí, načte settings/perm ze zástupce Firebase a vypíše HK.can(), HK.perm()
// a zápis matice (HK.cfg.savePerms) jako JSON. Použití: node --import ./tests/support/setup.mjs tests/support/perm-probe.mjs <role> <cash 0|1> <rv> <roles JSON|"">
// Prázdné roles = dokument settings/perm neexistuje (výchozí práva). Každá role potřebuje samostatný proces (přihlášení proběhne jen jednou).

// ===== Hlavní logika =====
const [role, cash, rv, rolesJson] = process.argv.slice(2);
const settings = rolesJson ? {perm: {v: 1, roles: JSON.parse(rolesJson), by: "boss@test.cz", at: "2026-10-24T10:00:00Z"}} : {};
globalThis.__fb = {user: {email: "x@test.cz", uid: "u"}, writes: [],
  members: {"x@test.cz": {role, cash: cash === "1", rv: rv ? Number(rv) : undefined, pid: role === "hracka" || role === "host" ? "p1" : undefined}}, data: {settings}};
const {HK} = await import("../../src/data/storage.js");
const db = await HK.ready();
db.collection("settings").onSnapshot(() => {});
const acts = ["sport", "money", "members", "roster", "accounts", "admin", "onlyOwn", "guest", "wipe"];
const cells = ["events.e", "events.c", "events.d", "matches.e", "matches.c", "matches.d", "opp.r", "opp.e", "opp.d", "stats.r", "attview.r", "members.e"];
const can = Object.fromEntries(acts.map(a => [a, HK.can(a)]));
const perm = Object.fromEntries(cells.map(k => { const [m, a] = k.split("."); return [k, HK.perm(m, a)]; }));
const state = HK.cfg.permState();
const saved = await HK.cfg.savePerms({trener: {events: {d: false}, members: {e: true}}});
process.stdout.write(JSON.stringify({can, perm, state, saved, writes: globalThis.__fb.writes.filter(w => w.path === "settings/perm")}));
process.exit(0);
