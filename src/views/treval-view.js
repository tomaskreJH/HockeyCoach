// ⭐ Hodnocení hráček (nepovinné): karta v kartě plánu (jen realizační tým – treval r) a výzva v ⏱ živém tréninku po skončeném kole
// (hráčky mé linky, jméno + 😃 🙂 😐 😴, 🙂 Ostatním, ⏰ Později, 🔕 Dnes nehodnotit); po tréninku doplnění po linkách a 📝 poznámky, nebo vůbec.
// 🔥 Rozcvička se nehodnotí (noEval). Druhé klepnutí hodnocení zruší (r 0). Data treval/{eid}, poslech jen u otevřeného tréninku, zápis dávkou
// s hlubokým sloučením; hodnotí HK.perm("treval", "e"). Výpočty domain/training-eval.js.
// ===== Importy =====
import {nm} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {NOTE_MAX, RATE, RATES, TREVAL_COLL, entryOf, evalLanes, evalPatch, lanePids, noteOf, playerPatch, rateLanes, rateOk, unratedCount, unratedPids} from "../domain/training-eval.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
// E = poslech hodnocení otevřeného tréninku: eid, un (konec poslechu), res (dokument | null | undefined = načítá se), err,
// loc ({klíč linky: {n, pl}} – vlastní zápis, než dorazí z databáze), hook (překreslení ⏱ živého tréninku),
// open ({eid: rozbalená karta}), lo ({eid: {klíč linky: rozbalená}}), nt ({klíč|pid: otevřená poznámka}),
// later (Set klíčů výzev odložených ⏰ Později – jen do zavření aplikace), items (linky právě zobrazené výzvy pro 🙂 Ostatním)
let E = {eid: null, un: null, res: undefined, err: null, loc: {}, hook: null, open: {}, lo: {}, nt: {}, later: new Set(), items: []};
const OFF_KEY = "hk-tev-off";                            // 🔕 tréninky bez výzev k hodnocení na ledě (toto zařízení), nejvýš OFF_MAX
const OFF_MAX = 20;
const FILL_R = 3;                                        // 🙂 Ostatním = „v pohodě“
const CSS = `<style>
.tev{border-top:1px solid var(--bd);margin-top:8px;padding-top:8px}
.tev>summary,.tevl>summary{cursor:pointer;padding:6px 0;min-height:40px}
.tevl{border-bottom:1px solid var(--bd);padding:2px 0}
.tevk{display:inline-block;min-width:22px;font-weight:800;color:var(--ac)}
.tevr{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px;padding:4px 0;border-top:1px solid color-mix(in srgb,var(--bd) 60%,transparent)}
.tevr .nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px}
.tevg{display:flex;gap:4px}
.tevg button{width:42px;height:44px;font-size:20px;padding:0;border:2px solid var(--bd);border-radius:10px;background:var(--cd,transparent);color:var(--tx)}
.tevl .tevg button{width:38px;height:40px;font-size:18px}
.tevg button.on{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 22%,transparent)}
.tevg button.nt,.tevl .tevg button.nt{font-size:15px;width:32px}
.tevr input{grid-column:1/-1;margin:0}
.tevn{margin:4px 0}
.tevb{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.tevb button{flex:1 1 30%;min-height:46px;font-size:15px;padding:4px 6px}
</style>`;

// ===== Pomocné funkce =====
const canR = () => HK.perm("treval", "r");
const canE = () => HK.perm("treval", "e");
const me = () => { const u = HK.user(); return ((u && u.email) || "").toLowerCase(); };
const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* bez vibrací */ } };
// Hodnocení linky: vlastní poslední zápis (než ho potvrdí poslech) sloučený s databází
function entry(key) {
  const db = entryOf(E.res, key) || {}, lo = E.loc[key];
  if (!lo) return db;
  return {...db, ...lo, pl: {...(db.pl || {}), ...(lo.pl || {})}};
}
const plOf = (key, pid) => (entry(key).pl || {})[pid] || {};
// 🔕 Výzvy na ledě vypnuté pro trénink eid (toto zařízení)
const offList = () => { try { const a = JSON.parse(localStorage.getItem(OFF_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const isOff = eid => offList().includes(eid);
function setOff(eid, on) {
  const a = offList().filter(x => x !== eid);
  if (on) a.push(eid);
  try { localStorage.setItem(OFF_KEY, JSON.stringify(a.slice(-OFF_MAX))); } catch (e) { /* bez paměti zařízení */ }
}
// Klíč výzvy (linky a kolo) – ⏰ Později ji schová, další kolo ukáže novou
const promptKey = items => items.map(x => x.lane.key + ":" + x.pids.join(",")).join("|");
// Řádek hráčky: jméno + 4 smajlíky (+ 📝 poznámka v kartě); can = smí hodnotit, note = zobrazit 📝
function rowHtml(l, pid, can, note) {
  const x = plOf(l.key, pid), k = l.key + "|" + pid, nOpen = note && (E.nt[k] || !!x.n);
  const btns = can ? RATES.map(r => `<button class="${x.r === r ? "on" : ""}" data-tevp="${esc(k)}|${r}" title="${esc(RATE[r].t)}">${RATE[r].i}</button>`).join("")
    : `<span style="font-size:20px">${rateOk(x.r) ? RATE[x.r].i : "–"}</span>`;
  const nb = note && can ? `<button class="nt ${x.n ? "on" : ""}" data-tevpn="${esc(k)}" title="Poznámka">📝</button>` : "";
  const nIn = nOpen ? (can ? `<input data-tevpt="${esc(k)}" maxlength="${NOTE_MAX}" placeholder="Poznámka k hráčce" value="${esc(x.n || "")}">` : `<div class="mu" style="grid-column:1/-1;font-size:13px">📝 ${esc(x.n)}</div>`) : "";
  return `<div class="tevr"><div class="nm">${esc(nm(pid))}</div><div class="tevg">${btns}${nb}</div>${nIn}</div>`;
}

// ===== Poslech hodnocení =====
// Jeden poslech treval/{eid} pro otevřený trénink (karta i výzva v živém tréninku); předchozí trénink se odhlásí
function ensureEv(eid) {
  if (E.eid === eid) return;
  if (E.un) try { E.un(); } catch (e) { /* poslech už skončil */ }
  E = {...E, eid, un: null, res: undefined, err: null, loc: {}, hook: null};
  E.un = S.db.collection(TREVAL_COLL).part(eid).onSnapshot(v => {
    const d = v.docs.find(x => x.id === eid);
    E.res = d ? d.data() : null; E.err = null; E.loc = {};
    if (E.hook) E.hook();
    // Rozepsaná poznámka v kartě se nepřekresluje pod rukama
    const a = document.activeElement;
    if (S.evid === eid && !S.tpe && !(a && a.dataset && (a.dataset.tevpt || a.dataset.tevln))) render();
  }, e => { E.err = (e && (e.code || e.message)) || "chyba"; E.res = null; if (S.evid === eid) render(); });
}

// ===== Vykreslení: karta =====
function laneHtml(eid, l, can, firstOpen) {
  const pl = entry(l.key).pl || {}, un = l.pids.filter(p => !rateOk((pl[p] || {}).r)).length, lo = E.lo[eid] || {};
  const open = lo[l.key] != null ? lo[l.key] : firstOpen, e = entry(l.key), nk = "L|" + l.key, nOpen = E.nt[nk] || !!e.n;
  const note = can ? (nOpen ? `<input class="tevn" data-tevln="${esc(l.key)}" maxlength="${NOTE_MAX}" placeholder="Poznámka ke cvičení (co změnit příště)" value="${esc(e.n || "")}">` : `<button class="s" data-tevpn="${esc(nk)}" style="min-height:36px;padding:4px 10px;margin:4px 0">📝 Poznámka ke cvičení</button>`)
    : e.n ? `<div class="mu" style="font-size:13px">📝 ${esc(e.n)}</div>` : "";
  return `<details class="tevl" data-tevlo="${esc(l.key)}" ${open ? "open" : ""}><summary>${l.tag ? `<span class="tevk">${esc(l.tag)}</span>` : ""}<b>${esc(l.dn)}</b> <span class="mu" style="font-size:12px">${esc(l.where)} · ${un ? "zbývá " + un : "✓"}</span></summary>
${note}${l.pids.map(p => rowHtml(l, p, can, true)).join("")}</details>`;
}
function cardHtml(eid, plan, D, roster, past) {
  ensureEv(eid);
  if (E.res === undefined) return "";
  const L = rateLanes(plan, D, roster).filter(l => l.pids.length);
  if (!L.length) return "";
  const can = canE(), c = unratedCount(L, E.res), open = E.open[eid] != null ? E.open[eid] : past;
  // Rozbalená je první linka s neohodnocenou hráčkou (ostatní klepnutím)
  const first = L.findIndex(l => { const pl = entry(l.key).pl || {}; return l.pids.some(p => !rateOk((pl[p] || {}).r)); });
  return CSS + `<details class="tev" id="tevd" ${open ? "open" : ""}><summary><b>⭐ Hodnocení hráček</b> <span class="mu">${c.n === c.all ? "nehodnoceno (nepovinné)" : c.n ? `bez hodnocení ${c.n} z ${c.all}` : "vše ohodnoceno ✓"}</span></summary>
${E.err ? `<div class="msg">Hodnocení se nepodařilo načíst (${esc(E.err)}). Manager musí publikovat pravidla databáze ve verzi v21.6.</div>` : ""}
<div class="mu" style="font-size:12px;margin-bottom:4px">Vidí jen realizační tým, hráčky ne. Hodnocení je nepovinné – hned na ledě, později tady, nebo vůbec. 🔥 Rozcvička se nehodnotí. ${can ? "Klepnutí na zvolený smajlík hodnocení zruší." : ""}</div>
${can && isOff(eid) ? `<div class="row" style="align-items:center;margin:4px 0"><span class="mu" style="flex:1;font-size:13px">🔕 Výzvy k hodnocení na ledě jsou pro tento trénink vypnuté (toto zařízení).</span><button class="s" data-tevon="${esc(eid)}" style="flex:none;min-height:40px">🔔 Zapnout</button></div>` : ""}
${L.map((l, i) => laneHtml(eid, l, can, i === first)).join("")}</details>`;
}

// ===== Vykreslení: výzva v živém tréninku =====
// items = [{lane (z evalLanes), pids (hráčky linky ve skončeném kole)}]; done = plán skončil; left = bez hodnocení celkem.
// Pod seznamem rychlé volby: 🙂 Ostatním (jen hráčky bez hodnocení), ⏰ Později (schovat – doplní se v detailu), 🔕 Dnes nehodnotit.
function liveHtml(items, done, left) {
  if (!items.length && !done) return "";
  const un = items.reduce((n, x) => n + unratedPids(entry(x.lane.key), x.pids).length, 0);
  const btns = items.length ? `<div class="tevb">${un ? `<button class="s" data-tevq="fill">${RATE[FILL_R].i} Ostatním (${un})</button>` : ""}<button class="s" data-tevq="later">⏰ Později</button><button class="s" data-tevq="off">🔕 Dnes nehodnotit</button></div>` : "";
  return CSS + `<div class="tlln" style="border-color:var(--ok)"><div class="mu">⭐ Jak šlo hráčkám? ${done ? "(poslední kolo)" : "(kolo, které skončilo)"} · nepovinné</div>
${items.map(x => `<div style="margin-top:4px">${x.lane.tag ? `<span class="tevk">${esc(x.lane.tag)}</span>` : ""}<b>${esc(x.lane.dn)}</b></div>${x.pids.map(p => rowHtml(x.lane, p, true, false)).join("")}`).join("")}
${btns}${left ? `<div class="mu" style="font-size:13px;margin-top:4px">Bez hodnocení ${left} – doplníš kdykoli v detailu tréninku (⭐ Hodnocení hráček), nebo nemusíš.</div>` : ""}</div>`;
}

// ===== Eventy =====
// Zápis dávkou s hlubokým sloučením (jen daná hráčka / poznámka); vlastní zápis se ukáže hned
function put(lane, patch, local) {
  if (!canE()) { toast("Hodnotit smí jen realizační tým"); return; }
  const cur = E.loc[lane.key] || {}, lo = local || {};
  E.loc[lane.key] = {...cur, ...lo, pl: {...(cur.pl || {}), ...(lo.pl || {})}};
  S.db.batch().merge(TREVAL_COLL + "/" + E.eid, {...patch, by: me(), at: new Date().toISOString()}).commit();
}
// Hodnocení hráčky (stejná volba znovu = zrušit)
function ratePl(lane, pid, r) {
  const v = plOf(lane.key, pid).r === r ? 0 : r;
  put(lane, playerPatch(lane, pid, {r: v}), {pl: {[pid]: {...plOf(lane.key, pid), r: v}}});
  buzz(v ? 30 : [20, 30, 20]);
}
// 🙂 Ostatním: hráčkám zobrazené výzvy bez hodnocení „v pohodě“ – jedna dávka, ručně zadaná hodnocení zůstanou
function fillRest(items) {
  if (!canE()) return;
  const b = S.db.batch(), st = {by: me(), at: new Date().toISOString()};
  let n = 0;
  items.forEach(x => unratedPids(entry(x.lane.key), x.pids).forEach(pid => {
    b.merge(TREVAL_COLL + "/" + E.eid, {...playerPatch(x.lane, pid, {r: FILL_R}), ...st});
    const cur = E.loc[x.lane.key] || {};
    E.loc[x.lane.key] = {...cur, pl: {...(cur.pl || {}), [pid]: {...plOf(x.lane.key, pid), r: FILL_R}}};
    n++;
  }));
  if (!n) return;
  b.commit();
  buzz(30);
  toast(RATE[FILL_R].i + " Označeno " + n);
}
// Obsluha řádků hráček; lanes = linky plánu (evalLanes), redraw = překreslení
function bindRows(root, lanes, redraw) {
  const laneOf = key => lanes.find(l => l.key === key);
  root.querySelectorAll("[data-tevp]").forEach(b => b.onclick = () => {
    const [key, pid, r] = b.dataset.tevp.split("|"), l = laneOf(key);
    if (l) { ratePl(l, pid, +r); redraw(); }
  });
  root.querySelectorAll("[data-tevpn]").forEach(b => b.onclick = () => {
    const k = b.dataset.tevpn;
    E.nt[k] = true; redraw();
    const i = root.querySelector(k.startsWith("L|") ? `[data-tevln="${k.slice(2)}"]` : `[data-tevpt="${k}"]`);
    if (i) i.focus();
  });
  root.querySelectorAll("[data-tevpt]").forEach(i => i.onchange = () => {
    const [key, pid] = i.dataset.tevpt.split("|"), l = laneOf(key);
    if (!l) return;
    put(l, playerPatch(l, pid, {n: i.value}), {pl: {[pid]: {...plOf(key, pid), n: noteOf(i.value)}}});
    toast("✅ Poznámka uložena");
  });
  root.querySelectorAll("[data-tevln]").forEach(i => i.onchange = () => {
    const l = laneOf(i.dataset.tevln);
    if (!l) return;
    put(l, evalPatch(l, {n: i.value}), {n: noteOf(i.value)});
    toast("✅ Poznámka uložena");
  });
}

// ===== Exporty =====
// Karta „⭐ Hodnocení hráček“ do karty plánu (jen s právem číst hodnocení); roster = přihlášené {lines, skaters, goalies};
// date = datum tréninku (dnešní a minulý trénink má kartu rozbalenou)
export function evalCardHtml(eid, plan, D, roster, date) { return canR() ? cardHtml(eid, plan, D, roster, !!date && date <= td()) : ""; }
// getX = údaje tréninku (derive z trplan-view + D, plan)
export function bindEvalCard(a, eid, getX) {
  if (!canR()) return;
  const d = a.querySelector("#tevd");
  if (d) { const was = d.open; d.ontoggle = () => { if (d.open !== was) E.open[eid] = d.open; }; }
  a.querySelectorAll("[data-tevlo]").forEach(x => { const was = x.open; x.ontoggle = () => { if (x.open !== was) (E.lo[eid] = E.lo[eid] || {})[x.dataset.tevlo] = x.open; }; });
  if (!canE()) return;
  const X = getX();
  bindRows(a, evalLanes(X.plan, X.D), render);
  // 🔔 Znovu zapnout výzvy k hodnocení na ledě (vypnuté 🔕 Dnes nehodnotit)
  a.querySelectorAll("[data-tevon]").forEach(b => b.onclick = () => { setOff(b.dataset.tevon, false); render(); });
}
// Výzva v ⏱ živém tréninku: spots = [{block, lane, round}] moje linky skončeného kola; X = údaje tréninku; done = plán skončil
export function liveEvalHtml(eid, spots, X, done) {
  if (!canE() || isOff(eid)) { E.items = []; return ""; }
  ensureEv(eid);
  // 🔥 rozcvička v evalLanes není – výzva se po ní neukáže
  const all = evalLanes(X.plan, X.D), items = spots.map(s => ({lane: all.find(l => l.bid === s.block.id && l.lid === s.lane.id), pids: lanePids(s.block, s.lane, X.roster, s.round)})).filter(x => x.lane && x.pids.length);
  if (items.length && E.later.has(promptKey(items))) { E.items = []; return ""; }
  E.items = items;
  const left = done ? unratedCount(rateLanes(X.plan, X.D, X.roster), {r: Object.fromEntries(all.map(l => [l.key, entry(l.key)]))}).n : 0;
  return liveHtml(items, done, left);
}
// Obsluha výzvy; redraw = překreslení obrazovky živého tréninku (i po změně z databáze)
export function bindLiveEval(el, eid, X, redraw) {
  if (!canE()) return;
  E.hook = redraw;
  bindRows(el, evalLanes(X.plan, X.D), redraw);
  // Rychlé volby výzvy: 🙂 Ostatním, ⏰ Později (schová tuto výzvu), 🔕 Dnes nehodnotit (pro tento trénink v tomto zařízení)
  el.querySelectorAll("[data-tevq]").forEach(b => b.onclick = () => {
    const k = b.dataset.tevq, items = E.items;
    if (k === "fill") fillRest(items);
    else if (k === "later") { if (items.length) E.later.add(promptKey(items)); toast("⏰ Doplníš v detailu tréninku"); }
    else if (k === "off") { setOff(eid, true); toast("🔕 Dnes bez výzev – zapneš v ⭐ Hodnocení hráček"); }
    redraw();
  });
}
