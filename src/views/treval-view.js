// ⭐ Hodnocení hráček: karta v kartě plánu (jen realizační tým – treval r) a výzva v ⏱ živém tréninku po skončeném kole
// (hráčky mé linky, jméno + 😃 🙂 😐 😴); po tréninku doplnění po linkách a 📝 poznámky. Druhé klepnutí hodnocení zruší (r 0).
// Data treval/{eid}, poslech jen u otevřeného tréninku, zápis dávkou s hlubokým sloučením; hodnotí HK.perm("treval", "e"). Výpočty domain/training-eval.js.
// ===== Importy =====
import {nm} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {NOTE_MAX, RATE, RATES, TREVAL_COLL, entryOf, evalLanes, evalPatch, lanePids, noteOf, playerPatch, rateLanes, rateOk, unratedCount} from "../domain/training-eval.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
// E = poslech hodnocení otevřeného tréninku: eid, un (konec poslechu), res (dokument | null | undefined = načítá se), err,
// loc ({klíč linky: {n, pl}} – vlastní zápis, než dorazí z databáze), hook (překreslení ⏱ živého tréninku),
// open ({eid: rozbalená karta}), lo ({eid: {klíč linky: rozbalená}}), nt ({klíč|pid: otevřená poznámka})
let E = {eid: null, un: null, res: undefined, err: null, loc: {}, hook: null, open: {}, lo: {}, nt: {}};
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
  return CSS + `<details class="tev" id="tevd" ${open ? "open" : ""}><summary><b>⭐ Hodnocení hráček</b> <span class="mu">${c.n ? `neohodnoceno ${c.n} z ${c.all}` : "vše ohodnoceno ✓"}</span></summary>
${E.err ? `<div class="msg">Hodnocení se nepodařilo načíst (${esc(E.err)}). Manager musí publikovat pravidla databáze ve verzi v21.6.</div>` : ""}
<div class="mu" style="font-size:12px;margin-bottom:4px">Vidí jen realizační tým, hráčky ne. ${can ? "Na ledě se seznam ukáže v ⏱ živém tréninku po každém kole; tady doplníš zbytek. Klepnutí na zvolený smajlík hodnocení zruší." : ""}</div>
${L.map((l, i) => laneHtml(eid, l, can, i === first)).join("")}</details>`;
}

// ===== Vykreslení: výzva v živém tréninku =====
// items = [{lane (z evalLanes), pids (hráčky linky ve skončeném kole)}]; done = plán skončil; left = neohodnoceno celkem
function liveHtml(items, done, left) {
  if (!items.length && !done) return "";
  return CSS + `<div class="tlln" style="border-color:var(--ok)"><div class="mu">⭐ Jak šlo hráčkám? ${done ? "(poslední kolo)" : "(kolo, které skončilo)"}</div>
${items.map(x => `<div style="margin-top:4px">${x.lane.tag ? `<span class="tevk">${esc(x.lane.tag)}</span>` : ""}<b>${esc(x.lane.dn)}</b></div>${x.pids.map(p => rowHtml(x.lane, p, true, false)).join("")}`).join("")}
${left ? `<div class="mu" style="font-size:13px;margin-top:4px">Neohodnoceno ${left} – doplníš v detailu tréninku (⭐ Hodnocení hráček).</div>` : ""}</div>`;
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
    toast("Poznámka uložena");
  });
  root.querySelectorAll("[data-tevln]").forEach(i => i.onchange = () => {
    const l = laneOf(i.dataset.tevln);
    if (!l) return;
    put(l, evalPatch(l, {n: i.value}), {n: noteOf(i.value)});
    toast("Poznámka uložena");
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
}
// Výzva v ⏱ živém tréninku: spots = [{block, lane, round}] moje linky skončeného kola; X = údaje tréninku; done = plán skončil
export function liveEvalHtml(eid, spots, X, done) {
  if (!canE()) return "";
  ensureEv(eid);
  const all = evalLanes(X.plan, X.D), items = spots.map(s => ({lane: all.find(l => l.bid === s.block.id && l.lid === s.lane.id), pids: lanePids(s.block, s.lane, X.roster, s.round)})).filter(x => x.lane && x.pids.length);
  const left = done ? unratedCount(rateLanes(X.plan, X.D, X.roster), {r: Object.fromEntries(all.map(l => [l.key, entry(l.key)]))}).n : 0;
  return liveHtml(items, done, left);
}
// Obsluha výzvy; redraw = překreslení obrazovky živého tréninku (i po změně z databáze)
export function bindLiveEval(el, eid, X, redraw) {
  if (!canE()) return;
  E.hook = redraw;
  bindRows(el, evalLanes(X.plan, X.D), redraw);
}
