// Žádosti o přijetí do týmu (joinreq/{email}): čisté funkce bez DOM – kontrola formuláře, dokument žádosti, možnost poslat znovu,
// volné hráčky / členové týmu bez účtu, shoda podle čísla dresu a plán vyřízení (přijetí = soupiska + members + žádost + audit
// v jedné dávce, zamítnutí = žádost + audit). Žádost zakládá jen účet sám za sebe (id = e-mail z přihlášení), vyřizuje manager.
// Role při přijetí jsou nové role (domain/permissions.js), účet dostane rv (role po převodu).
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Formulář žádosti -> Vyřízení -> Exporty.

// ===== Importy =====
import {ROLE_VER} from "./permissions.js";

// ===== Konstanty =====
export const JOIN_COLL = "joinreq";                                    // kolekce žádostí o přijetí (id dokumentu = e-mail malými písmeny)
export const JOIN_KINDS = {hracka: "Hráčka", staff: "Realizační tým"};  // druh žádosti (určuje uchazeč)
export const JOIN_ROLES = {hracka: "Hráčka", asistent: "Asistent", trener: "Trenér", manager: "Manager"};   // role při přijetí (určuje manager)
export const RESEND_MS = 24 * 60 * 60 * 1000;                          // nová žádost po vyřízení nejdřív za 24 h
export const NICK_MAX = 40, NOTE_MAX = 300;
// Funkce člena realizačního týmu (pole kind v staff) podle role při přijetí – stejné názvy jako role
const STAFF_KIND = {manager: "Manager", trener: "Trenér", asistent: "Asistent", hracka: "Jiný"};

// ===== Pomocné funkce =====
const str = v => String(v == null ? "" : v).trim();
const active = p => (p.st || "act") !== "end";
const byName = (a, b) => str(a.name).localeCompare(str(b.name), "cs");
// Propojené id (pid hráček, tid členů týmu) ze seznamu members [{email, pid, tid}]
function linked(members) {
  const pid = new Set(), tid = new Set();
  (members || []).forEach(m => { if (m.pid) pid.add(m.pid); if (m.tid) tid.add(m.tid); });
  return {pid, tid};
}

// ===== Formulář žádosti =====
// Kontrola formuláře uchazeče: přezdívka povinná (max 40), číslo dresu 1–99 nebo prázdné, druh, poznámka max 300.
// Vrací {ok: true, d} s očištěnými poli, nebo {ok: false, err} s hláškou.
export function joinCheck(f) {
  const nick = str(f && f.nick), num = str(f && f.num), kind = str(f && f.kind), note = str(f && f.note);
  if (!nick) return {ok: false, err: "Vyplň přezdívku"};
  if (nick.length > NICK_MAX) return {ok: false, err: "Přezdívka je moc dlouhá (max " + NICK_MAX + " znaků)"};
  if (num && !/^[1-9]\d?$/.test(num)) return {ok: false, err: "Číslo dresu musí být 1–99 (nebo nech prázdné)"};
  if (!JOIN_KINDS[kind]) return {ok: false, err: "Vyber, zda jsi hráčka, nebo člen realizačního týmu"};
  if (note.length > NOTE_MAX) return {ok: false, err: "Poznámka je moc dlouhá (max " + NOTE_MAX + " znaků)"};
  return {ok: true, d: {nick, num, kind, note}};
}
// Dokument nové žádosti: jen pole formuláře (stejně vynucují pravidla databáze); e-mail vždy z přihlášení, malými písmeny
export const joinDoc = (email, d, at) => ({email: str(email).toLowerCase(), nick: d.nick, num: d.num, kind: d.kind, note: d.note, st: "open", at});
// Smí uchazeč poslat (novou) žádost? Bez žádosti ano; otevřená ne; vyřízená (zamítnutá / odebraný přístup) až 24 h po vyřízení.
// Vrací {ok, from} – from = čas (ms), od kdy to půjde.
export function canResend(req, now) {
  if (!req) return {ok: true, from: 0};
  if (req.st === "open") return {ok: false, from: 0};
  const from = (+req.doneMs || 0) + RESEND_MS;
  return {ok: now >= from, from};
}
// Otevřené žádosti od nejstarší (pro pruh a okno trenéra)
export const openJoins = list => (list || []).filter(r => r && r.st === "open").sort((a, b) => str(a.at).localeCompare(str(b.at)));

// ===== Vyřízení =====
// Výchozí role při přijetí podle druhu žádosti
export const defaultRole = kind => (kind === "staff" ? "asistent" : "hracka");
// Hráčky bez propojeného účtu (bez ukončených), shoda čísla dresu první, pak podle jména
export function freePlayers(players, members, num) {
  const used = linked(members).pid, n = str(num);
  return (players || []).filter(p => p && p.id && active(p) && !used.has(p.id))
    .sort((a, b) => (n ? (str(b.num) === n) - (str(a.num) === n) : 0) || byName(a, b));
}
// Členové realizačního týmu bez propojeného účtu, podle jména
export const freeStaff = (staff, members) => { const used = linked(members).tid; return (staff || []).filter(t => t && t.id && !used.has(t.id)).sort(byName); };
// Aktivní hráčky se stejným číslem dresu (upozornění při přijetí, ne blokace)
export const numTaken = (players, num) => { const n = str(num); return n ? (players || []).filter(p => p && active(p) && str(p.num) === n) : []; };
// Plán přijetí. ch = {role, target}: target "new" = založit (hráčku / člena týmu), "none" = bez propojení (jen role manager / trenér / asistent),
// jinak id existující hráčky (role hracka) / člena týmu. ctx = {by, at (ISO), ms, newId, auditId, label = jméno existujícího pro audit}.
// Vrací {ok, err} nebo {ok, ops: [[druh, cesta, data]], member} – ops se zapíší jednou dávkou (set / merge).
export function approvePlan(req, ch, ctx) {
  if (!req || req.st !== "open") return {ok: false, err: "Žádost už je vyřízená"};
  const role = ch && ch.role, target = str(ch && ch.target), email = str(req.email).toLowerCase();
  if (!JOIN_ROLES[role]) return {ok: false, err: "Vyber roli"};
  if (role === "hracka" && (!target || target === "none")) return {ok: false, err: "Vyber hráčku, nebo založ novou"};
  const ops = [], member = {role, rv: ROLE_VER, addedBy: ctx.by};
  let link = "", who = "";
  if (role === "hracka") {
    const pid = target === "new" ? ctx.newId : target;
    if (target === "new") ops.push(["set", "players/" + pid, {name: req.nick, num: str(req.num), pos: "", alt: "", st: "act"}]);
    member.pid = pid; link = "pid"; who = target === "new" ? "nová hráčka" : "hráčka " + (ctx.label || pid);
  } else if (target && target !== "none") {
    const tid = target === "new" ? ctx.newId : target;
    if (target === "new") ops.push(["set", "staff/" + tid, {name: req.nick, kind: STAFF_KIND[role]}]);
    member.tid = tid; link = "tid"; who = target === "new" ? "nový člen týmu" : "člen týmu " + (ctx.label || tid);
  }
  ops.push(["set", "members/" + email, member]);
  const done = {st: "ok", reply: "", doneBy: ctx.by, doneMs: ctx.ms};
  if (link) done[link] = member[link];
  ops.push(["merge", JOIN_COLL + "/" + email, done]);
  ops.push(["set", "audit/" + ctx.auditId, {ts: ctx.at, by: ctx.by, eid: "", act: "join", note: "Přijetí do týmu: " + email + " (" + req.nick + ") jako " + JOIN_ROLES[role] + (who ? ", " + who : "")}]);
  return {ok: true, ops, member};
}
// Plán zamítnutí: důvod povinný (uchazeč ho uvidí), žádost + audit jednou dávkou
export function rejectPlan(req, reason, ctx) {
  if (!req || req.st !== "open") return {ok: false, err: "Žádost už je vyřízená"};
  const r = str(reason);
  if (!r) return {ok: false, err: "Napiš důvod zamítnutí"};
  if (r.length > NOTE_MAX) return {ok: false, err: "Důvod je moc dlouhý (max " + NOTE_MAX + " znaků)"};
  const email = str(req.email).toLowerCase();
  return {ok: true, ops: [
    ["merge", JOIN_COLL + "/" + email, {st: "no", reply: r, doneBy: ctx.by, doneMs: ctx.ms}],
    ["set", "audit/" + ctx.auditId, {ts: ctx.at, by: ctx.by, eid: "", act: "join-no", note: "Žádost o přijetí zamítnuta: " + email + " (" + req.nick + ") – " + r}]
  ]};
}
