// Jádro notifikací: rozhodování, kdo co dostane a kdy. Pracuje jen přes rozhraní `store` (databáze) a `push` (odesílání), takže ho
// testuje tests/notify-core.test.js s falešným úložištěm; skutečné Firestore a FCM jsou v store.js a index.js.
// Pořadí pojistek (vždy stejné): 1) nic se nezměnilo → konec bez čtení, 2) STOP (settings/notif.on) → konec, 3) dedupe (záznam pushLog),
// 4) příjemci, 5) hodinový limit zařízení, 6) denní strop týmu, 7) odeslání, 8) úklid zrušených tokenů.
//
// Rozhraní store:  settings() → {on}; claim(klíč) → true, pokud je klíč nový; attendance(eid) → [{pid, st}]; devices() → [{id, tok, email, pid, tid, ch, z, u, at}];
//   eventsDue(kolekce, odDl, doDl) → [{id, …data}]; members(pids, tids) → {p: {id: {ended}}, t: {id: {}}}; bumpBurst(hodina, [id]) → {id: počet};
//   reserve(den, kolik, strop) → kolik smí odejít; dropDevices([id]); cleanup(předMs).
// Rozhraní push:   send(zařízení, {title, body, tag}, {ttl}) → {sent, bad: [id zařízení se zrušeným tokenem]}.
// ctx = {store, push, now: () => ms, log: {info, warn}}.
// Struktura: Importy -> Změna události -> Uzávěrky -> Úklid.

// ===== Importy =====
import {LIMITS} from "./config.js";
import {answeredSet, burstAction, changeRecipients, changeText, dayKey, deadlineRecipients, deadlineText, deadlineTtl, hourKey, inWindow, isCancelled, pragueParts, summaryText,
  detectChange, usableDevices, dayAdd} from "./logic.js";

// ===== Změna události =====
// Zrušení, obnovení a změna času události: oznámení přihlášeným (Jdu / Nejsem jistý). eventId = id události z Firestore (stejná změna nepřijde dvakrát).
// Živý zápis zapisuje do zápasů stále – tam se končí hned na prvním řádku, bez jediného čtení nebo zápisu.
export async function handleChange(ctx, {coll, id, before, after, eventId}) {
  const isMatch = coll === "matches", ch = detectChange(before, after, isMatch);
  if (!ch) return {r: "none"};
  const now = ctx.now(), today = pragueParts(now).date;
  if (!inWindow(after.date, today) && !inWindow(before.date, today)) return {r: "outside"};
  if (!(await ctx.store.settings()).on) return {r: "off"};
  if (!(await ctx.store.claim("e_" + eventId))) return {r: "dup"};
  const att = (await ctx.store.attendance(id)).filter(a => a.st === "yes" || a.st === "maybe");
  if (!att.length) return {r: "nobody"};
  const to = changeRecipients(usableDevices(await ctx.store.devices()), att);
  if (!to.length) return {r: "nodevices"};
  // Hodinový limit na zařízení: do BURST_MAX plná oznámení, další jednou souhrn, zbytek se zahodí
  const counts = await ctx.store.bumpBurst(hourKey(now), to.map(d => d.id));
  const queue = [...to.filter(d => burstAction(counts[d.id]) === "send").map(d => ({d, s: false})), ...to.filter(d => burstAction(counts[d.id]) === "summary").map(d => ({d, s: true}))];
  if (!queue.length) return {r: "burst", sent: 0};
  // Denní strop týmu: smí odejít jen tolik oznámení, kolik strop dovolí
  const granted = await ctx.store.reserve(dayKey(now), queue.length, LIMITS.DAY_CAP);
  const out = queue.slice(0, granted);
  if (!out.length) { ctx.log.warn("Denní strop notifikací je vyčerpaný, změna události " + id + " se neposílá"); return {r: "capped", sent: 0}; }
  const full = out.filter(x => !x.s).map(x => x.d), sum = out.filter(x => x.s).map(x => x.d);
  const opt = {ttl: LIMITS.TTL_CHANGE_S}, bad = [];
  let sent = 0;
  if (full.length) { const r = await ctx.push.send(full, changeText(ch, before, after, isMatch, id), opt); sent += r.sent; bad.push(...r.bad); }
  if (sum.length) { const r = await ctx.push.send(sum, summaryText(), opt); sent += r.sent; bad.push(...r.bad); }
  if (bad.length) await ctx.store.dropDevices(bad);
  return {r: "sent", kind: ch.kind, sent, capped: queue.length - out.length, dropped: bad.length};
}

// ===== Uzávěrky =====
// Připomínka hodinu před uzávěrkou přihlášení členům, kteří ještě neodpověděli. Volá plánovač každých 15 minut; za jednu událost a termín
// (klíč kolekce + id + dl) odejde nejvýš jedna vlna. Zrušené a proběhlé události se přeskočí.
export async function runDeadlines(ctx) {
  const now = ctx.now(), here = pragueParts(now), limit = pragueParts(now + LIMITS.DEADLINE_MIN * 60000).dl;
  if (!(await ctx.store.settings()).on) return {r: "off"};
  const found = [];
  for (const coll of ["events", "matches"]) {
    (await ctx.store.eventsDue(coll, here.dl, limit)).forEach(e => found.push({coll, id: e.id, ev: e}));
  }
  const due = found.filter(x => !isCancelled(x.ev) && typeof x.ev.date === "string" && x.ev.date >= here.date && typeof x.ev.dl === "string").slice(0, LIMITS.MAX_EVENTS_RUN);
  if (!due.length) return {r: "idle", events: 0};
  // Zařízení a členové se čtou jednou za běh (ne pro každou událost zvlášť)
  const devs = usableDevices(await ctx.store.devices());
  const ents = await ctx.store.members([...new Set(devs.map(d => d.pid).filter(Boolean))], [...new Set(devs.map(d => d.tid).filter(Boolean))]);
  let sent = 0, capped = 0, handled = 0;
  const bad = [];
  for (const x of due) {
    if (!(await ctx.store.claim("u_" + x.coll + "_" + x.id + "_" + x.ev.dl))) continue;
    handled++;
    const answered = answeredSet(await ctx.store.attendance(x.id));
    const to = deadlineRecipients(devs, answered, ents);
    if (!to.length) continue;
    const granted = await ctx.store.reserve(dayKey(now), to.length, LIMITS.DAY_CAP), list = to.slice(0, granted);
    capped += to.length - list.length;
    if (!list.length) { ctx.log.warn("Denní strop notifikací je vyčerpaný, připomínka k události " + x.id + " se neposílá"); continue; }
    const r = await ctx.push.send(list, deadlineText(x.ev, x.coll === "matches", x.id), {ttl: deadlineTtl(here.dl, x.ev.dl)});
    sent += r.sent; bad.push(...r.bad);
  }
  if (bad.length) await ctx.store.dropDevices(bad);
  return {r: "done", events: handled, sent, capped, dropped: bad.length};
}

// ===== Úklid =====
// Jednou za noc smaže záznamy pushLog starší než LOG_KEEP_DAYS (nezávisí na zapnutí notifikací)
export async function runCleanup(ctx) {
  const before = Date.parse(dayAdd(pragueParts(ctx.now()).date, -LIMITS.LOG_KEEP_DAYS) + "T00:00:00Z");
  return {r: "cleanup", deleted: await ctx.store.cleanup(before)};
}
