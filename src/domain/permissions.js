// Role a práva po modulech: jediné místo pravdy (čisté funkce bez DOM). Role manager / trener / asistent / hracka / host,
// výchozí matice práv DEFAULT_PERMS (= chování před OM), zkratky aplikace (sport, money, …) odvozené z matice v actOf.
// Manager smí vše (nejde omezit), host má pevná práva mimo matici, pokladník = příznak cash (pevně, mimo matici).
// Staré hodnoty members.role: kustod = asistent; trener bez rv = trenér před převodem (smí vše jako manager).
// Struktura: Konstanty -> Pomocné funkce a výchozí matice -> Práva -> Převod rolí (exporty přímo u funkcí).

// ===== Konstanty =====
export const ROLE_VER = 2;                                                // members.rv: verze rolí (2 = role po OM1)
export const ROLE_KEYS = ["manager", "trener", "asistent", "hracka", "host"];   // platné role po převodu
export const MATRIX_ROLES = ["trener", "asistent", "hracka"];             // role, jejichž práva půjde měnit v matici (v20.5)
export const ROLE_LABELS = {manager: "Manager", trener: "Trenér", asistent: "Asistent", hracka: "Hráčka", host: "Hostující", kustod: "Kustod"};
export const PID_ROLE_KEYS = ["hracka", "host"];                          // role propojené s hráčkou (pid)
export const STAFF_ROLE_KEYS = ["manager", "trener", "asistent"];         // role s přístupem do celé aplikace
// Akce matice: číst / upravovat (založit i změnit) / rušit (pole cancelled – jen události a zápasy) / mazat
export const ACTIONS = {r: "číst", e: "upravovat", c: "rušit", d: "mazat"};
// Moduly matice: název a akce, které u modulu dávají smysl
export const MODULES = {
  events: {label: "Události a tréninky", acts: ["r", "e", "c", "d"]},
  matches: {label: "Zápasy", acts: ["r", "e", "c", "d"]},
  att: {label: "Docházka za ostatní", acts: ["r", "e", "d"]},
  lines: {label: "Pětky a základní formace", acts: ["r", "e", "d"]},
  roster: {label: "Soupiska hráček", acts: ["r", "e", "d"]},
  staff: {label: "Realizační tým", acts: ["r", "e", "d"]},
  opp: {label: "Soupeři", acts: ["r", "e", "d"]},
  stats: {label: "Statistiky a Zápis utkání", acts: ["r"]},
  attview: {label: "📊 Docházka přehled", acts: ["r"]},
  members: {label: "Členové týmu a ✋ žádosti o přijetí", acts: ["r", "e", "d"]},
  budget: {label: "Rozpočet", acts: ["r", "e", "d"]},
  app: {label: "Nastavení aplikace a data", acts: ["r", "e"]}
};
// Zkratky oprávnění aplikace (HK.can)
export const CAN_ACTS = ["sport", "money", "members", "roster", "accounts", "admin", "onlyOwn", "guest", "wipe"];

// ===== Pomocné funkce a výchozí matice =====
// Řádek matice z výčtu akcí ("rcd" → {r: true, e: false, c: true, d: true})
const row = s => ({r: s.includes("r"), e: s.includes("e"), c: s.includes("c"), d: s.includes("d")});
const deepFreeze = o => { Object.values(o).forEach(v => { if (v && typeof v === "object") deepFreeze(v); }); return Object.freeze(o); };
// Výchozí práva = chování před OM: trenér = sport (bez členů, žádostí, obnovy, účtů a brány verze),
// asistent = dnešní kustod (u hráčky jen stav – to není „upravovat“ soupisku), hráčka čte týmové moduly a nic za ostatní nezapisuje.
export const DEFAULT_PERMS = deepFreeze({
  trener: {events: row("recd"), matches: row("recd"), att: row("red"), lines: row("red"), roster: row("red"), staff: row("red"), opp: row("red"),
    stats: row("r"), attview: row("r"), members: row(""), budget: row(""), app: row("r")},
  asistent: {events: row("recd"), matches: row("recd"), att: row("red"), lines: row("red"), roster: row("r"), staff: row("r"), opp: row("red"),
    stats: row("r"), attview: row("r"), members: row(""), budget: row(""), app: row("r")},
  hracka: {events: row("r"), matches: row("r"), att: row(""), lines: row("r"), roster: row("r"), staff: row("r"), opp: row("r"),
    stats: row("r"), attview: row("r"), members: row(""), budget: row(""), app: row("")}
});

// ===== Práva =====
// Účinná role z members: kustod → asistent; trener bez rv (před převodem) → manager; neznámá hodnota → null
export function roleOf(raw, rv) {
  if (raw === "kustod") return "asistent";
  if (raw === "trener" && rv !== ROLE_VER) return "manager";
  return ROLE_KEYS.includes(raw) ? raw : null;
}
// Je účet před převodem (stará hodnota role)?
export const isLegacy = (raw, rv) => raw === "kustod" || (raw === "trener" && rv !== ROLE_VER);
// Popis role pro seznamy: stará hodnota dostane poznámku, jak se dnes chová
export function roleLabel(raw, rv) {
  if (raw === "kustod") return "Kustod (= Asistent, čeká na převod)";
  if (raw === "trener" && rv !== ROLE_VER) return "Trenér (= Manager, čeká na převod)";
  return ROLE_LABELS[raw] || raw || "?";
}
// Smí role akci v modulu? manager vždy, host nikdy (pevná práva mimo matici), ostatní podle matice (chybějící hodnota = výchozí).
// Neznámý modul nebo akce = chyba programu.
export function permOf(role, mod, act, perms) {
  if (!MODULES[mod]) throw new Error("Neznámý modul práv: " + mod);
  if (!ACTIONS[act]) throw new Error("Neznámá akce práv: " + act);
  if (!MODULES[mod].acts.includes(act)) return false;
  if (role === "manager") return true;
  if (!MATRIX_ROLES.includes(role)) return false;
  const v = perms && perms[role] && perms[role][mod] ? perms[role][mod][act] : undefined;
  return typeof v === "boolean" ? v : DEFAULT_PERMS[role][mod][act];
}
// Text chyby pro hlášku, nebo null, když role akci smí
export function permError(role, mod, act, perms) {
  if (permOf(role, mod, act, perms)) return null;
  return "Role " + (ROLE_LABELS[role] || role || "?") + " nemá právo " + ACTIONS[act] + ": " + MODULES[mod].label;
}
// Správce pokladny: manager vždy, jinak příznak cash (hostující nikdy – stejně jako pravidla databáze)
export const cashOf = (role, cash) => role === "manager" || (cash === true && ROLE_KEYS.includes(role) && role !== "host");
// Zkratka oprávnění aplikace pro účinnou roli. dev = účet vývojáře mimo náhled (jen úplné smazání).
export function actOf(role, cash, act, dev, perms) {
  switch (act) {
    case "sport": return permOf(role, "matches", "e", perms);                           // zápasy, události, docházka za ostatní
    case "money": return cashOf(role, cash);                                            // pokladna: pevně podle příznaku
    case "members": return cashOf(role, cash) || permOf(role, "members", "e", perms);   // pokladník jen hráčky
    case "roster": return permOf(role, "roster", "d", perms);                           // přidat / smazat hráčku, realizační tým
    case "accounts": return role === "manager";                                         // návrh účtu pro QR: jen manager
    case "admin": return role === "manager";                                            // členy, žádosti, obnova, brána verze
    case "onlyOwn": return PID_ROLE_KEYS.includes(role);
    case "guest": return role === "host";
    case "wipe": return !!dev && role === "manager";
    default: throw new Error("Neznámá akce oprávnění: " + act);
  }
}

// ===== Převod rolí =====
// Je účet (po převodu) manager? Stará role trener bez rv se počítá jako manager.
export const isManager = r => !!r && roleOf(r.role, r.rv) === "manager";
// Počet managerů v seznamu members [{email, role, rv}]
export const managerCount = rows => (rows || []).filter(isManager).length;
// Plán převodu members.role. rows = [{email, role, rv, cash}], mgr = e-maily, které se mají stát managerem (jen z dnešních trenérů).
// trener → manager (vybraní) nebo trener s rv a cash: true (pokladna se nezmění, OM-10); kustod → asistent; ostatní beze změny.
// Vrací {ok, err, ops: [[druh, kolekce, id, data]], list: [{email, from, to, cash}], managers} – idempotentní (druhé spuštění = nic).
export function rolePlan(rows, mgr) {
  const pick = new Set((mgr || []).map(e => String(e).toLowerCase())), ops = [], list = [];
  (rows || []).forEach(r => {
    if (r.role === "trener" && r.rv !== ROLE_VER) {
      const toMgr = pick.has(r.email), d = {role: toMgr ? "manager" : "trener", rv: ROLE_VER};
      if (!toMgr && r.cash !== true) d.cash = true;
      ops.push(["merge", "members", r.email, d]);
      list.push({email: r.email, from: "trener", to: d.role, cash: !!d.cash});
    } else if (r.role === "kustod") {
      ops.push(["merge", "members", r.email, {role: "asistent", rv: ROLE_VER}]);
      list.push({email: r.email, from: "kustod", to: "asistent", cash: false});
    }
  });
  const after = (rows || []).map(r => { const x = list.find(l => l.email === r.email); return x ? {role: x.to, rv: ROLE_VER} : r; });
  const managers = managerCount(after);
  if (ops.length && !managers) return {ok: false, err: "Aspoň jeden člen musí zůstat Manager – zaškrtni ho", ops: [], list, managers};
  return {ok: true, err: "", ops, list, managers};
}
// Zůstane po změně aspoň jeden manager? rows = dnešní members, em = měněný účet, next = nová role (null = odebrání)
export function keepsManager(rows, em, next) {
  const e = String(em || "").toLowerCase(), cur = (rows || []).find(r => r.email === e);
  if (!cur || !isManager(cur) || next === "manager") return true;
  return managerCount(rows) > 1;
}
