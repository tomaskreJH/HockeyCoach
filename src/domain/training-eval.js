// Doména: ⭐ hodnocení hráček v tréninku – kolekce treval/{eid} (jeden dokument na trénink, jen realizační tým; hráčka ho nečte).
// Hodnotí se každá hráčka na každé lince plánu (u stanovišť každé stanoviště zvlášť) stupnicí 😃 super · 🙂 v pohodě · 😐 nic moc ·
// 😴 vůbec se nesnaží, volitelně poznámka k hráčce a ke cvičení. Celkové hodnocení linky (r) se už nezadává (staré zůstává v datech).
// 0 = bez hodnocení (zrušené hodnocení – zápis dávkou neumí smazat vnořené pole).
// Dokument: {v, r: {klíč linky "blok_linka" (u řady cvičení "blok_linka-cvičení"): {d (id cvičení), dn (název), r (0–4), n (poznámka), pl: {pid: {r, n}}}}, by, at}.
// Struktura: Importy -> Konstanty -> Pomocné funkce -> Linky k hodnocení -> Živý trénink -> Zápis -> Souhrny.

// ===== Importy =====
import {msKey} from "./stopwatch.js";
import {MODES, expandLanes, isBreak, isFixedLane, laneTags, rotation} from "./training-plan.js";
import {groupPids, liveAt} from "./training-live.js";

// ===== Konstanty =====
export const TREVAL_COLL = "treval";
export const EV_VER = 1;                                 // treval.v: verze tvaru hodnocení
export const RATES = [4, 3, 2, 1];                       // pořadí tlačítek (nejlepší vlevo)
export const RATE = {4: {i: "😃", t: "super"}, 3: {i: "🙂", t: "v pohodě"}, 2: {i: "😐", t: "nic moc"}, 1: {i: "😴", t: "vůbec se nesnaží"}};
export const NOTE_MAX = 300;                             // nejdelší poznámka (znaků)

// ===== Pomocné funkce =====
// Platné hodnocení 1–4 (0 / jiné = bez hodnocení)
export const rateOk = r => RATES.includes(r);
// Ikona hodnocení pro zobrazení („–“ bez hodnocení)
export const rateIcon = r => (rateOk(r) ? RATE[r].i : "–");
// Poznámka oříznutá na NOTE_MAX znaků
export const noteOf = s => String(s == null ? "" : s).trim().slice(0, NOTE_MAX);
// Hodnocení linky z dokumentu (null = zatím nic)
export const entryOf = (res, key) => (res && res.r && res.r[key]) || null;

// ===== Linky k hodnocení =====
// Linky plánu s cvičením v pořadí plánu: {key, bi, li, bid, lid, d, dn, tag (A–D / 🥅 / ""), where ("Blok 2 · Stanoviště A")};
// linka s řadou cvičení = jedna položka na cvičení (lid = blok_linka-cvičení, li = pořadí linky, where navíc „· 2/4“);
// drills = banka {id: cvičení} – název z banky, jinak kopie v plánu
export function evalLanes(plan, drills) {
  const out = [], D = drills || {};
  ((plan && plan.blocks) || []).forEach((b, bi) => {
    const T = laneTags(b), LI = Object.fromEntries((b.lanes || []).map((l, i) => [l.id, i]));
    expandLanes(b).forEach(l => {
      if (!l.drill) return;
      const li = LI[l.pid || l.id], dd = D[l.drill], tag = T[li];
      out.push({key: msKey(b.id, l.id), bi, li, bid: b.id, lid: l.id, d: l.drill, dn: String((dd && dd.name) || l.dn || "Cvičení").slice(0, 80), tag,
        where: "Blok " + (bi + 1) + (tag === "🥅" ? " · 🥅 Brankářky" : tag ? " · Stanoviště " + tag : " · " + (MODES[b.mode] || "")) + (l.sid ? " · " + (l.si + 1) + "/" + l.sn : "")});
    });
  });
  return out;
}
// Linky bez hodnocení cvičení (starší celkové hodnocení linky – jen pro přehledy)
export const unrated = (lanes, res) => (lanes || []).filter(l => !rateOk((entryOf(res, l.key) || {}).r));

// ===== Hráčky na lince =====
// Hráčky linky: roster = {lines, skaters [{id, pos}], goalies [id]} (přihlášené); round = kolo z rotation (jen hráčky v tomto kole),
// bez kola všechny hráčky, které linkou během bloku projdou. Linka 🥅 = brankářky, Společně bez skupin = všechny hráčky v poli.
export function lanePids(block, lane, roster, round) {
  const R = roster || {};
  if (!lane) return [];
  if (isFixedLane(lane)) return [...(R.goalies || [])];
  const grpOf = r => (r && r.lanes && r.lanes[lane.id]) || lane.grp || [];
  const rounds = round ? [round] : rotation(block);
  const G = [...new Set(rounds.flatMap(grpOf))];
  if (!G.length) return block && block.mode === "st" ? [] : (R.skaters || []).map(p => p.id);
  return groupPids(block, G, R);
}
// Linky plánu k hodnocení i s hráčkami: evalLanes + pids (všechny hráčky, které linkou projdou)
export function rateLanes(plan, drills, roster) {
  const B = (plan && plan.blocks) || [];
  return evalLanes(plan, drills).map(l => ({...l, pids: lanePids(B[l.bi], B[l.bi].lanes[l.li], roster)}));
}
// Počet neohodnocených hráček na linkách (rateLanes) a celkový počet; res = dokument treval
export function unratedCount(lanes, res) {
  let n = 0, all = 0;
  (lanes || []).forEach(l => { const pl = (entryOf(res, l.key) || {}).pl || {}; (l.pids || []).forEach(pid => { all++; if (!rateOk((pl[pid] || {}).r)) n++; }); });
  return {n, all};
}

// ===== Živý trénink =====
// Kolo, které právě skončilo (k hodnocení po kole / bloku): poloha těsně před začátkem současného kola, po konci plánu poslední kolo;
// ☕ pauza se přeskočí; null = trénink ještě nezačal (první kolo). at = liveAt(blocks, sec).
export function prevSpot(blocks, at) {
  if (!at) return null;
  let p = at.done ? (at.total > 0 ? liveAt(blocks, at.total - 0.01) : null) : at.a > 0 ? liveAt(blocks, at.a - 0.01) : null;
  // ☕ Pauza se přeskočí – hodnotí se cvičení před ní
  while (p && !p.done && isBreak((blocks || [])[p.bi])) p = p.a > 0 ? liveAt(blocks, p.a - 0.01) : null;
  return p;
}

// ===== Zápis =====
// Část dokumentu pro dávku s hlubokým sloučením: hodnocení (r) a / nebo poznámka (n) linky; ostatní linky a hráčky zůstanou.
// lane = {key, d, dn} z evalLanes, val = {r?, n?}
export function evalPatch(lane, val) {
  const v = val || {}, e = {d: String(lane.d || ""), dn: String(lane.dn || "").slice(0, 80)};
  if (v.r !== undefined) e.r = rateOk(v.r) ? v.r : 0;
  if (v.n !== undefined) e.n = noteOf(v.n);
  return {v: EV_VER, r: {[lane.key]: e}};
}
// Část dokumentu pro hodnocení hráčky na lince: val = {r?, n?}
export function playerPatch(lane, pid, val) {
  const v = val || {}, p = {};
  if (v.r !== undefined) p.r = rateOk(v.r) ? v.r : 0;
  if (v.n !== undefined) p.n = noteOf(v.n);
  const out = evalPatch(lane, {});
  out.r[lane.key].pl = {[String(pid)]: p};
  return out;
}

// ===== Souhrny =====
// Hodnocení hráček linky: [{pid, r, n}] jen hodnocené (r 1–4) nebo s poznámkou, nejlepší nahoře
export function playerRates(entry) {
  return Object.entries((entry && entry.pl) || {})
    .map(([pid, x]) => ({pid, r: rateOk(x && x.r) ? x.r : 0, n: noteOf(x && x.n)}))
    .filter(x => x.r || x.n)
    .sort((a, b) => b.r - a.r || a.pid.localeCompare(b.pid));
}
// Počty hodnocení cvičení v tréninku podle stupně {4: n, 3: n, 2: n, 1: n} (jen linky zadané v lanes, když jsou)
export function rateCounts(res, lanes) {
  const out = {4: 0, 3: 0, 2: 0, 1: 0}, keys = lanes ? lanes.map(l => l.key) : Object.keys((res && res.r) || {});
  keys.forEach(k => { const r = (entryOf(res, k) || {}).r; if (rateOk(r)) out[r]++; });
  return out;
}
