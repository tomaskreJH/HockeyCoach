// Role a práva po modulech: jediné místo pravdy (čisté funkce bez DOM). Role manager / trener / asistent / hracka / host,
// výchozí matice práv DEFAULT_PERMS (= chování před OM), zkratky aplikace (sport, money, …) odvozené z matice v actOf.
// Manager smí vše (nejde omezit), host má pevná práva mimo matici, pokladník = příznak cash (pevně, mimo matici).
// Platí jen role ROLE_KEYS (stará hodnota kustod nemá přístup – stejně jako v pravidlech databáze); rv se zapisuje u každého nového člena.
// Struktura: Konstanty -> Pomocné funkce a výchozí matice -> Práva -> Ochrana posledního managera (exporty přímo u funkcí).

// ===== Konstanty =====
export const ROLE_VER = 2;                                                // members.rv: verze rolí (2 = role po OM1)
export const ROLE_KEYS = ["manager", "trener", "asistent", "hracka", "host"];   // platné role
export const MATRIX_ROLES = ["trener", "asistent", "hracka"];             // role, jejichž práva jde měnit v matici (settings/perm)
export const PERM_VER = 1;                                                // settings/perm.v: verze tvaru matice
export const ROLE_LABELS = {manager: "Manager", trener: "Trenér", asistent: "Asistent", hracka: "Hráčka", host: "Hostující"};
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
  app: {label: "Nastavení aplikace a data", acts: ["r", "e"]},
  drills: {label: "📚 Banka cvičení", acts: ["r", "e", "d"]},
  trplan: {label: "📋 Plán tréninku", acts: ["r", "e"]},
  treval: {label: "⏲ Měření a hodnocení tréninku", acts: ["r", "e"]}
};
// Zkratky oprávnění aplikace (HK.can)
export const CAN_ACTS = ["sport", "money", "members", "roster", "accounts", "admin", "onlyOwn", "guest", "wipe"];

// ===== Pomocné funkce a výchozí matice =====
// Řádek matice z výčtu akcí ("rcd" → {r: true, e: false, c: true, d: true})
const row = s => ({r: s.includes("r"), e: s.includes("e"), c: s.includes("c"), d: s.includes("d")});
const deepFreeze = o => { Object.values(o).forEach(v => { if (v && typeof v === "object") deepFreeze(v); }); return Object.freeze(o); };
// Výchozí práva = chování před OM: trenér = sport (bez členů, žádostí, obnovy, účtů a brány verze),
// asistent = dřívější kustod (u hráčky jen stav – to není „upravovat“ soupisku), hráčka čte týmové moduly a nic za ostatní nezapisuje.
// Banka cvičení (drills): trenér vše, asistent čte a zakládá / upravuje (mazat ne), hráčka ji nevidí.
// Plán tréninku (trplan): trenér a asistent čtou a upravují, hráčka plán jen čte (vidí, co se bude trénovat), hostující nic.
// Měření a hodnocení (treval): trenér a asistent měří (⏲ stopky) a později hodnotí; výsledky měření vidí celý tým přes trplan r,
// hodnocení a poznámky trenérů (E4) hráčka nečte.
export const DEFAULT_PERMS = deepFreeze({
  trener: {events: row("recd"), matches: row("recd"), att: row("red"), lines: row("red"), roster: row("red"), staff: row("red"), opp: row("red"),
    stats: row("r"), attview: row("r"), members: row(""), budget: row(""), app: row("r"), drills: row("red"), trplan: row("re"), treval: row("re")},
  asistent: {events: row("recd"), matches: row("recd"), att: row("red"), lines: row("red"), roster: row("r"), staff: row("r"), opp: row("red"),
    stats: row("r"), attview: row("r"), members: row(""), budget: row(""), app: row("r"), drills: row("re"), trplan: row("re"), treval: row("re")},
  hracka: {events: row("r"), matches: row("r"), att: row(""), lines: row("r"), roster: row("r"), staff: row("r"), opp: row("r"),
    stats: row("r"), attview: row("r"), members: row(""), budget: row(""), app: row(""), drills: row(""), trplan: row("r"), treval: row("")}
});

// Upravitelné buňky matice ("modul.akce") = to, co v této verzi řídí aplikace i pravidla databáze; ostatní buňky jsou pevně výchozí.
// Pevné: číst události a zápasy, upravovat zápasy (= celý sport: živý zápis, docházka za ostatní, pětky), soupiska, realizační tým,
// členové (jen manager), rozpočet (pokladník), nastavení. Soupeře „upravovat“ potřebuje založení zápasu (nový soupeř se zapíše sám).
// Banka cvičení: číst pevně (sport ji potřebuje k plánu), upravovat a mazat jde měnit; hráčka banku nemá (záložka Team jí chybí).
// Plán tréninku: číst pevně pro všechny členy kromě hostující, upravovat jde měnit u trenéra a asistenta.
// Měření a hodnocení: číst pevně (realizační tým), měřit / hodnotit jde měnit u trenéra a asistenta; hráčka pevně nic.
const STAFF_EDIT = ["events.e", "events.c", "events.d", "matches.c", "matches.d", "opp.r", "opp.d", "stats.r", "attview.r", "drills.e", "drills.d", "trplan.e", "treval.e"];
export const EDITABLE = deepFreeze({trener: [...STAFF_EDIT], asistent: [...STAFF_EDIT], hracka: ["opp.r", "stats.r", "attview.r"]});

// ===== Práva =====
// Účinná role z members: jen platná role ROLE_KEYS, jiná hodnota (i stará kustod) → null (bez přístupu)
export const roleOf = raw => ROLE_KEYS.includes(raw) ? raw : null;
// Popis role pro seznamy; neplatná hodnota dostane poznámku, že účet nemá přístup
export const roleLabel = raw => ROLE_LABELS[raw] || (raw ? raw + " (neplatná role – bez přístupu)" : "?");
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

// ===== Matice settings/perm =====
// Je buňka matice upravitelná (editor ⚙️ → 🔐 Práva rolí)?
export const isEditable = (role, mod, act) => !!EDITABLE[role] && EDITABLE[role].includes(mod + "." + act);
// Uložená matice (settings/perm.roles) → jen upravitelné buňky s boolean hodnotou, které se liší od výchozí. Ostatní se ignorují.
export function permClean(roles) {
  const out = {};
  MATRIX_ROLES.forEach(r => {
    const src = roles && typeof roles === "object" ? roles[r] : null;
    if (!src || typeof src !== "object") return;
    EDITABLE[r].forEach(k => {
      const [m, a] = k.split("."), v = src[m] && typeof src[m] === "object" ? src[m][a] : undefined;
      if (typeof v !== "boolean" || v === DEFAULT_PERMS[r][m][a]) return;
      out[r] = out[r] || {}; out[r][m] = out[r][m] || {}; out[r][m][a] = v;
    });
  });
  return out;
}
// Úplná upravitelná matice pro editor: {role: {modul: {akce: boolean}}} jen s upravitelnými buňkami (podle perms, jinak výchozí)
export function permGrid(perms) {
  const g = {};
  MATRIX_ROLES.forEach(r => { g[r] = {}; EDITABLE[r].forEach(k => { const [m, a] = k.split("."); g[r][m] = g[r][m] || {}; g[r][m][a] = permOf(r, m, a, perms); }); });
  return g;
}
// Změny mezi dvěma maticemi (jen upravitelné buňky): [{role, mod, act, from, to}] v pořadí modulů
export function permDiff(before, after) {
  const out = [];
  Object.keys(MODULES).forEach(m => MATRIX_ROLES.forEach(r => MODULES[m].acts.forEach(a => {
    if (!isEditable(r, m, a)) return;
    const from = permOf(r, m, a, before), to = permOf(r, m, a, after);
    if (from !== to) out.push({role: r, mod: m, act: a, from, to});
  })));
  return out;
}
// Text jedné změny pro náhled „Co se změní“
export const permDiffText = d => ROLE_LABELS[d.role] + " · " + MODULES[d.mod].label + " · " + ACTIONS[d.act] + ": " + (d.to ? "✅ smí" : "⛔ nesmí");
// Přehled „kdo co smí“: řádek na modul, u role seznam povolených akcí (manager vše, host nic – má jen vlastní data)
export function permOverview(perms) {
  return Object.entries(MODULES).map(([m, x]) => ({mod: m, label: x.label, acts: x.acts,
    roles: Object.fromEntries(["manager", ...MATRIX_ROLES].map(r => [r, x.acts.filter(a => permOf(r, m, a, perms))])),
    edit: Object.fromEntries(MATRIX_ROLES.map(r => [r, x.acts.filter(a => isEditable(r, m, a))]))}));
}
// Dokument settings/perm k zápisu: {v, roles (jen rozdíly od výchozích), by, at}
export const permDoc = (roles, by, at) => ({v: PERM_VER, roles: permClean(roles), by: String(by || "").toLowerCase(), at: String(at || "")});

// ===== Ochrana posledního managera =====
// Je účet manager?
export const isManager = r => !!r && roleOf(r.role) === "manager";
// Počet managerů v seznamu members [{email, role, rv}]
export const managerCount = rows => (rows || []).filter(isManager).length;
// Zůstane po změně aspoň jeden manager? rows = dnešní members, em = měněný účet, next = nová role (null = odebrání)
export function keepsManager(rows, em, next) {
  const e = String(em || "").toLowerCase(), cur = (rows || []).find(r => r.email === e);
  if (!cur || !isManager(cur) || next === "manager") return true;
  return managerCount(rows) > 1;
}
