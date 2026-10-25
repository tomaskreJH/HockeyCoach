// ⭐ Hodnocení cvičení tréninku: karta „⭐ Hodnocení cvičení“ v kartě plánu (jen realizační tým – treval r), okno #tev pro poznámku
// a hodnocení hráček jedné linky, a výzva v ⏱ živém tréninku po skončeném kole (1 klepnutí – 😃 🙂 😐 😴, bez psaní na ledě).
// Data treval/{eid} (jeden dokument na trénink, poslech jen u otevřeného tréninku), zápis dávkou s hlubokým sloučením (jen daná linka /
// hráčka); hodnotit smí HK.perm("treval", "e"). Klepnutí na zvolené hodnocení ho zruší (r 0). Výpočty domain/training-eval.js.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Poslech -> Vykreslení (karta, okno, výzva) -> Eventy -> Exporty.

// ===== Importy =====
import {nm} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {NOTE_MAX, RATE, RATES, TREVAL_COLL, entryOf, evalLanes, evalPatch, noteOf, playerPatch, playerRates, rateIcon, rateOk, unrated} from "../domain/training-eval.js";
import {render} from "./shell.js";
import {lanePlayers} from "./stopwatch-view.js";

// ===== Konstanty a stav =====
// E = poslech hodnocení otevřeného tréninku: eid, un (konec poslechu), res (dokument | null | undefined = načítá se), err,
// loc ({klíč linky: hodnocení} – vlastní zápis, než dorazí z databáze), hook (překreslení ⏱ živého tréninku), open ({eid: rozbalená karta})
let E = {eid: null, un: null, res: undefined, err: null, loc: {}, hook: null, open: {}};
// W = otevřené okno linky: eid, lane (z evalLanes), pids (hráčky linky), all (přihlášené pro „+ Přidat“), nt ({pid: otevřená poznámka}), el
let W = null;
const CSS = `<style>
#evw .tev{border-top:1px solid var(--bd);margin-top:8px;padding-top:8px}
#evw .tev>summary{cursor:pointer;padding:6px 0;min-height:40px;list-style-position:inside}
#evw .tevl{padding:8px 0;border-bottom:1px solid var(--bd)}
#evw .tevk,#tev .tevk,#tlv .tevk{display:inline-block;min-width:22px;font-weight:800;color:var(--ac)}
.tevg{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:6px 0}
.tevg button{min-height:48px;font-size:22px;padding:2px;border:2px solid var(--bd);border-radius:12px;background:var(--cd,transparent);color:var(--tx)}
.tevg button small{display:block;font-size:11px;line-height:13px}
.tevg button.on{border-color:var(--ac);background:color-mix(in srgb,var(--ac) 18%,transparent);font-weight:800}
.tevg.big button{min-height:62px;font-size:28px}
.tevg.sm button{min-height:42px;font-size:20px}
#tev{position:fixed;inset:0;z-index:45;background:var(--bg);color:var(--tx);overflow:auto;padding:12px 12px calc(12px + env(safe-area-inset-bottom,0px))}
#tev .tevh{display:flex;gap:8px;align-items:center;margin-bottom:6px}
#tev .tevh h2{flex:1;margin:0;font-size:18px;min-width:0}
#tev textarea{width:100%;min-height:70px}
#tev .tevp{border:2px solid var(--bd);border-radius:12px;padding:6px 8px;margin-bottom:8px}
#tev .tevp .row{align-items:center;flex-wrap:nowrap}
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
// Čtyři tlačítka hodnocení; cur = zvolené, attr = data atribut s předponou hodnoty, size = "big" | "sm" | ""
function rateBtns(cur, attr, size, label) {
  return `<div class="tevg ${size || ""}">${RATES.map(r => `<button class="${cur === r ? "on" : ""}" ${attr}|${r}" title="${esc(RATE[r].t)}">${RATE[r].i}${label ? `<small>${esc(RATE[r].t)}</small>` : ""}</button>`).join("")}</div>`;
}
// Text hodnocení pro čtení (bez práva hodnotit)
const rateTxt = r => (rateOk(r) ? RATE[r].i + " " + esc(RATE[r].t) : '<span class="mu">neohodnoceno</span>');

// ===== Poslech hodnocení =====
// Jeden poslech treval/{eid} pro otevřený trénink (karta, okno i výzva v živém tréninku); předchozí trénink se odhlásí
function ensureEv(eid) {
  if (E.eid === eid) return;
  if (E.un) try { E.un(); } catch (e) { /* poslech už skončil */ }
  E = {eid, un: null, res: undefined, err: null, loc: {}, hook: null, open: E.open};
  E.un = S.db.collection(TREVAL_COLL).part(eid).onSnapshot(v => {
    const d = v.docs.find(x => x.id === eid);
    E.res = d ? d.data() : null; E.err = null; E.loc = {};
    if (W && W.el && W.eid === eid) paint();
    if (E.hook) E.hook();
    if (S.evid === eid && !S.tpe && !(W && W.el)) render();
  }, e => { E.err = (e && (e.code || e.message)) || "chyba"; E.res = null; if (S.evid === eid) render(); });
}

// ===== Vykreslení: karta =====
function laneRowHtml(l, can) {
  const e = entry(l.key), pr = playerRates(e), tag = l.tag ? `<span class="tevk">${esc(l.tag)}</span>` : "";
  const extra = [e.n ? "📝 " + esc(e.n) : "", pr.length ? "👤 " + pr.map(x => esc(nm(x.pid)) + " " + rateIcon(x.r)).join(", ") : ""].filter(Boolean).join(" · ");
  return `<div class="tevl"><div>${tag}<b>${esc(l.dn)}</b> <span class="mu" style="font-size:12px">${esc(l.where)}</span></div>
${can ? rateBtns(e.r, `data-tevr="${esc(l.key)}`, "sm") : `<div style="margin:4px 0">${rateTxt(e.r)}</div>`}
${extra ? `<div class="mu" style="font-size:13px">${extra}</div>` : ""}${can ? `<button class="s" data-tevo="${esc(l.key)}" style="min-height:40px;margin-top:4px">📝 Poznámka a hráčky</button>` : ""}</div>`;
}
function cardHtml(eid, plan, D, past) {
  ensureEv(eid);
  if (E.res === undefined) return "";
  const L = evalLanes(plan, D);
  if (!L.length) return "";
  const can = canE(), un = unrated(L, E.res).length, open = E.open[eid] != null ? E.open[eid] : past;
  return CSS + `<details class="tev" id="tevd" ${open ? "open" : ""}><summary><b>⭐ Hodnocení cvičení</b> <span class="mu">${un ? `neohodnoceno ${un} z ${L.length}` : "vše ohodnoceno ✓"}</span></summary>
${E.err ? `<div class="msg">Hodnocení se nepodařilo načíst (${esc(E.err)}). Manager musí publikovat pravidla databáze ve verzi v21.6.</div>` : ""}
<div class="mu" style="font-size:12px;margin-bottom:4px">Vidí jen realizační tým, hráčky ne. ${can ? "Na ledě stačí jedno klepnutí (i v ⏱ živém tréninku po kole), poznámky a hráčky doplň po tréninku. Druhé klepnutí hodnocení zruší." : ""}</div>
${L.map(l => laneRowHtml(l, can)).join("")}</details>`;
}

// ===== Vykreslení: okno linky =====
function playerHtml(pid) {
  const x = plOf(W.lane.key, pid), open = W.nt[pid] || !!x.n;
  return `<div class="tevp"><div class="row"><b style="flex:1;min-width:0">${esc(nm(pid))}</b><button class="s" data-tevpn="${esc(pid)}" style="flex:none;min-height:40px">📝</button></div>
${rateBtns(x.r, `data-tevp="${esc(pid)}`, "sm")}${open ? `<input data-tevpt="${esc(pid)}" maxlength="${NOTE_MAX}" placeholder="Poznámka k hráčce" value="${esc(x.n || "")}">` : ""}</div>`;
}
function screenHtml() {
  const l = W.lane, e = entry(l.key), rest = W.all.filter(p => !W.pids.includes(p));
  return CSS + `<div class="tevh"><button class="s" id="tevx" style="flex:none;min-height:48px">✕ Hotovo</button><h2>⭐ ${l.tag ? esc(l.tag) + " · " : ""}${esc(l.dn)}</h2></div>
<div class="mu" style="margin-bottom:6px">${esc(l.where)} · vidí jen realizační tým · ukládá se hned</div>
${E.err ? `<div class="msg">Hodnocení se nepodařilo načíst (${esc(E.err)}) – uložení nejspíš neprojde.</div>` : ""}
<label>Cvičení</label>${rateBtns(e.r, 'data-tevw="x', "big", true)}
<label>Poznámka ke cvičení</label><textarea id="tevn" maxlength="${NOTE_MAX}" placeholder="Co fungovalo, co změnit příště">${esc(e.n || "")}</textarea>
<h3 style="margin:12px 0 4px">Hráčky <span class="mu" style="font-weight:400;font-size:13px">(volitelně)</span></h3>
${W.pids.map(playerHtml).join("") || '<div class="mu">Na lince nikdo není – přidej hráčku.</div>'}
${rest.length ? `<label>+ Přidat hráčku</label><select id="tevadd"><option value="">— vyber —</option>${rest.map(p => `<option value="${esc(p)}">${esc(nm(p))}</option>`).join("")}</select>` : ""}`;
}
function paint() {
  if (!W || !W.el) return;
  const y = W.el.scrollTop;
  W.el.innerHTML = screenHtml();
  W.el.scrollTop = y;
  bindScreen();
}

// ===== Vykreslení: výzva v živém tréninku =====
// lanes = linky skončeného kola, které přihlášený hodnotí (z evalLanes); done = plán skončil (připomenutí neohodnocených);
// ohodnocená linka má menší tlačítka (méně místa na ledě, oprava jde dál)
function liveHtml(lanes, all, done) {
  if (!canE() || (!lanes.length && !done)) return "";
  const un = done ? unrated(all, E.res).length : 0;
  return CSS + `<div class="tlln" style="border-color:var(--ok)"><div class="mu">⭐ Jak šlo cvičení? ${done ? "(poslední kolo)" : "(kolo, které skončilo)"}</div>
${lanes.map(l => { const r = entry(l.key).r; return `<div style="margin-top:4px">${l.tag ? `<span class="tevk">${esc(l.tag)}</span>` : ""}<b>${esc(l.dn)}</b>${rateOk(r) ? ' <span class="mu">✓</span>' : ""}</div>${rateBtns(r, `data-tevr="${esc(l.key)}`, rateOk(r) ? "sm" : "big")}`; }).join("")}
${un ? `<div class="mu" style="font-size:13px">Neohodnoceno ${un} – poznámky a hráčky doplníš v detailu tréninku.</div>` : ""}</div>`;
}

// ===== Eventy =====
// Zápis dávkou s hlubokým sloučením (jen daná linka / hráčka); vlastní zápis se ukáže hned
function put(lane, patch, local) {
  if (!canE()) { toast("Hodnotit smí jen realizační tým"); return; }
  const cur = E.loc[lane.key] || {}, lo = local || {};
  E.loc[lane.key] = {...cur, ...lo, pl: {...(cur.pl || {}), ...(lo.pl || {})}};
  S.db.batch().merge(TREVAL_COLL + "/" + E.eid, {...patch, by: me(), at: new Date().toISOString()}).commit();
}
// Hodnocení cvičení linky (stejná volba znovu = zrušit)
function rateLane(lane, r) {
  const v = entry(lane.key).r === r ? 0 : r;
  put(lane, evalPatch(lane, {r: v}), {r: v});
  buzz(v ? 40 : [20, 30, 20]);
  if (!v) toast("Hodnocení zrušeno");
}
function bindRates(root, lanes, redraw) {
  root.querySelectorAll("[data-tevr]").forEach(b => b.onclick = () => {
    const [key, r] = b.dataset.tevr.split("|"), lane = lanes.find(l => l.key === key);
    if (!lane) return;
    rateLane(lane, +r);
    redraw();
  });
}
function bindScreen() {
  const el = W.el, l = W.lane;
  el.querySelector("#tevx").onclick = close;
  el.querySelectorAll("[data-tevw]").forEach(b => b.onclick = () => { rateLane(l, +b.dataset.tevw.split("|")[1]); paint(); });
  const n = el.querySelector("#tevn");
  if (n) n.onchange = () => { put(l, evalPatch(l, {n: n.value}), {n: noteOf(n.value)}); toast("Poznámka uložena"); };
  el.querySelectorAll("[data-tevp]").forEach(b => b.onclick = () => {
    const [pid, r] = b.dataset.tevp.split("|"), v = plOf(l.key, pid).r === +r ? 0 : +r;
    put(l, playerPatch(l, pid, {r: v}), {pl: {[pid]: {...plOf(l.key, pid), r: v}}});
    buzz(30); paint();
  });
  el.querySelectorAll("[data-tevpn]").forEach(b => b.onclick = () => { W.nt[b.dataset.tevpn] = true; paint(); const i = el.querySelector(`[data-tevpt="${b.dataset.tevpn}"]`); if (i) i.focus(); });
  el.querySelectorAll("[data-tevpt]").forEach(i => i.onchange = () => {
    const pid = i.dataset.tevpt;
    put(l, playerPatch(l, pid, {n: i.value}), {pl: {[pid]: {...plOf(l.key, pid), n: noteOf(i.value)}}});
    toast("Poznámka uložena");
  });
  const add = el.querySelector("#tevadd");
  if (add) add.onchange = () => { if (add.value && !W.pids.includes(add.value)) W.pids = [...W.pids, add.value]; paint(); };
}
// Zavření okna: rozepsaná poznámka (bez opuštění pole) se ještě uloží
function close() {
  if (!W) return;
  const a = W.el && document.activeElement;
  if (a && W.el.contains(a) && a.onchange) a.onchange();
  if (W.el) W.el.remove();
  W = null;
  render();
}
function openLane(eid, lane, X) {
  if (!canE()) { toast("Hodnotit smí jen realizační tým"); return; }
  if (W) close();
  ensureEv(eid);
  const b = X.plan.blocks[lane.bi], ln = b && b.lanes[lane.li], R = X.roster || {};
  const pids = ln ? lanePlayers(b, ln, X) : [], all = [...(R.skaters || []).map(p => p.id), ...(R.goalies || [])];
  // Hráčky s hodnocením z dřívějška zůstanou v okně, i když už na lince nejsou
  const had = Object.keys(entry(lane.key).pl || {});
  const el = document.createElement("div");
  el.id = "tev";
  document.body.appendChild(el);
  W = {eid, lane, pids: [...new Set([...pids, ...had])], all: [...new Set([...pids, ...all])], nt: {}, el};
  paint();
}

// ===== Exporty =====
// Karta „⭐ Hodnocení cvičení“ do karty plánu (jen s právem číst hodnocení); past = trénink už začal / proběhl (karta rozbalená)
export function evalCardHtml(eid, plan, D, date) { return canR() ? cardHtml(eid, plan, D, !!date && date <= td()) : ""; }
// getX = údaje tréninku (derive z trplan-view + D, plan) – okno linky potřebuje hráčky a soupisku
export function bindEvalCard(a, eid, getX) {
  if (!canR()) return;
  const d = a.querySelector("#tevd");
  if (d) d.ontoggle = () => { E.open[eid] = d.open; };
  const lanes = () => { const X = getX(); return evalLanes(X.plan, X.D); };
  bindRates(a, lanes(), render);
  a.querySelectorAll("[data-tevo]").forEach(b => b.onclick = () => { const X = getX(), l = evalLanes(X.plan, X.D).find(x => x.key === b.dataset.tevo); if (l) openLane(eid, l, X); });
}
// Výzva k hodnocení v ⏱ živém tréninku: lanes = moje linky skončeného kola, all = všechny linky plánu (evalLanes), done = plán skončil
export function liveEvalHtml(eid, lanes, all, done) {
  if (!canE()) return "";
  ensureEv(eid);
  return liveHtml(lanes, all, done);
}
// Obsluha výzvy; redraw = překreslení obrazovky živého tréninku (i po změně z databáze)
export function bindLiveEval(el, eid, all, redraw) {
  if (!canE()) return;
  E.hook = redraw;
  bindRates(el, all, redraw);
}
