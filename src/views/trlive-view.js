// ⏱ Živý trénink (jen HK.can("sport")): stav a tlačítko v kartě plánu, obrazovka #tlv (✕ / Zpět zavře, hodiny běží dál; tik 250 ms mění jen čísla).
// Společné hodiny trlive/{eid} řídí, kdo smí upravovat plán (trplan e): ▶ ⏸ ⏮ ⏭ ✂ −1 / +1 / +5 min ⏹, převzetí řízení druhým klepnutím,
// 📋 Zbytek plánu (vypustit / zkrátit další bloky jen pro průběh – adj / skip). Trenér vidí své linky a cvičení řady (laneSub), hráčky, co následuje;
// ⏲ stopky (stopwatch-view.js) a ⭐ výzva k hodnocení (treval-view.js). Zvuk, vibrace, ⌚ oznámení a Wake Lock: trlive-alerts.js.

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {nm} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {laneMeas} from "../domain/stopwatch.js";
import {prevSpot} from "../domain/training-eval.js";
import {adjPatch, alertsDue, coachLanes, cutSec, groupPids, laneSub, LIVE_ST, liveAt, liveBlocks, liveBudget, liveCtl, liveRest, liveSec, mmss, skewNext, skewObs, stepSec, TRLIVE_COLL} from "../domain/training-live.js";
import {DF, expandLanes, FW, GK, grpLabel, isBreak, isPosBlock, laneOf, laneSeq, laneTags, MODES, planTimes, seqTimes} from "../domain/training-plan.js";
import {render} from "./shell.js";
import {mayMeasure, msData, openStopwatch} from "./stopwatch-view.js";
import {bindLiveEval, liveEvalHtml} from "./treval-view.js";
import {alarm, beep, show, toggleNtf, wakeOff, wakeOn} from "./trlive-alerts.js";

// ===== Konstanty a stav =====
const MUTE_KEY = "hk-tl-mute", SKEW_KEY = "hk-clk", NTF_KEY = "hk-tl-ntf";
const HID_WIN = 70;                                      // skrytá aplikace tiká řidčeji: upozornění / točení se pozná až do 70 s zpětně
const FRESH_MS = 5000;                                   // změny doručené až po 5 s poslechu jsou čerstvé (měří se z nich posun hodin)
const SKEW_OK = 10 * 60 * 1000;                          // větší rozdíl doručení a času serveru = stará změna, neměří se
const ICON = {[GK]: "🥅", [FW]: "⚔", [DF]: "🛡"};
// L = poslech a obrazovka: eid, un (konec poslechu), live (dokument | null | undefined = načítá se), t0 (začátek poslechu),
// sess (odhad posunu hodin z tohoto poslechu), getX (údaje tréninku z trplan-view), el (obrazovka), timer, wake, ac (zvuk), shown, prev
// rest = 📋 Zbytek plánu rozbalený (null = podle toho, zda plán přetahuje)
let L = {eid: null, un: null, live: undefined, t0: 0, sess: null, getX: null, el: null, timer: null, wake: null, ac: null, shown: "", prev: null, rest: null};
const CSS = `<style>
#tlv{position:fixed;inset:0;z-index:40;background:var(--bg);color:var(--tx);overflow:auto;padding:12px 12px calc(12px + env(safe-area-inset-bottom,0px))}
#tlv .tlh{display:flex;gap:8px;align-items:center;margin-bottom:8px}
#tlv .tlh h2{flex:1;margin:0;font-size:18px}
#tlv .tlbig{font-size:76px;font-weight:800;text-align:center;line-height:1;font-variant-numeric:tabular-nums;margin:6px 0}
#tlv .tlbig.w{color:var(--wa)} #tlv .tlbig.n{color:var(--no)}
#tlv .tlbar{height:8px;border-radius:4px;background:var(--bd);overflow:hidden;margin:6px 0 10px}
#tlv .tlbar i{display:block;height:100%;background:var(--ac)}
#tlv .tlln{border:2px solid var(--bd);border-radius:12px;padding:10px;margin-bottom:8px}
#tlv .tlln.me{border-color:var(--ac)}
#tlv .tldn{font-size:20px;font-weight:800;margin:2px 0}
#tlv .tlk{display:inline-block;min-width:26px;font-weight:800;color:var(--ac)}
#tlv .tlctl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}
#tlv .tlctl button{min-height:58px;font-size:17px}
#tlv .tlctl .tlend{grid-column:1 / -1;min-height:46px}
#tlv .tlbud{text-align:center;font-size:15px;margin:2px 0}
#tlv .tlbud .w{color:var(--wa);font-weight:700} #tlv .tlbud .ok{color:var(--ok)}
#tlv .tlrs{border:1px solid var(--bd);border-radius:12px;padding:0 10px;margin:8px 0}
#tlv .tlrs>summary{min-height:44px;padding:10px 0;font-weight:700;cursor:pointer}
#tlv .tlrr{display:flex;align-items:center;gap:6px;padding:6px 0;border-top:1px solid var(--bd)}
#tlv .tlrr>div{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tlv .tlrr button{flex:none;min-height:44px;min-width:44px;padding:4px 8px}
#tlv .tlrr.sk>div{text-decoration:line-through;opacity:.55}
#tlv .tlbrk{font-size:28px;font-weight:800;text-align:center;padding:18px 10px}
#tlv .evl{display:inline-block;padding:2px 10px;border-radius:99px;font-weight:700;font-size:13px;margin:0 2px 4px 0;border:1px solid var(--bd)}
#tlv .LG{background:#7b4fb3;color:#fff} #tlv .LF{background:#c0392b;color:#fff} #tlv .LD{background:#34495e;color:#fff}
#tlv .L1{background:#2f6fd6;color:#fff} #tlv .L2{background:#f1c40f;color:#222} #tlv .L3{background:#27ae60;color:#fff} #tlv .L4{background:#e84393;color:#fff}
</style>`;

// ===== Pomocné funkce =====
const me = () => { const u = HK.user(); return ((u && u.email) || "").toLowerCase(); };
const canE = () => HK.perm("trplan", "e");
const muted = () => { try { return localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { return false; } };
// ⌚ Oznámení zapnutá v zařízení a povolená systémem
const ntfOn = () => { try { return localStorage.getItem(NTF_KEY) === "1" && typeof Notification !== "undefined" && Notification.permission === "granted"; } catch (e) { return false; } };
const storedSkew = () => { try { const v = Number(localStorage.getItem(SKEW_KEY)); return isFinite(v) && localStorage.getItem(SKEW_KEY) != null ? v : null; } catch (e) { return null; } };
// Odhad posunu hodin zařízení: z tohoto poslechu, jinak uložený z dřívějška, jinak 0
const skew = () => (L.sess != null ? L.sess : storedSkew() || 0);
const chip = g => `<span class="evl L${g}">${ICON[g] ? ICON[g] + " " + esc(grpLabel(g).replace(/^\S+ /, "")) : g + ". pětka"}</span>`;
const staffName = (X, id) => { const t = (X.staff || []).find(x => x.id === id); return t ? t.name : "?"; };
// Bloky plánu (původní délky) a bloky tohoto průběhu (vypuštěné / zkrácené – úpravy v trlive)
const planB = X => (X && X.plan && X.plan.blocks) || [];
const liveB = X => liveBlocks(planB(X), L.live);
// Krátký název bloku: ☕ pauza, cvičení první linky, jinak režim
function blockName(b, X) {
  if (isBreak(b)) return "☕ " + (b.brk || "Pauza");
  const l = (b.lanes || []).find(x => x.drill || x.dn), d = l && X.D[l.drill];
  return l ? (d ? d.name : l.dn) + ((b.lanes || []).length > 1 ? " +" + (b.lanes.length - 1) : "") : MODES[b.mode];
}
// Řada cvičení na mé lince v současném kole (null = bez řady); mine() je definovaná níž (hoisting funkcí)
function subAt(B, at, X) { if (!at || at.done || !X) return null; const b = B[at.bi], M = b && !isBreak(b) ? mine(b, at.round, X) : null; return M && M.length ? laneSub(b, M, at) : null; }
// Virtuální linka cvičení řady (klíč hodnocení / měření blok_linka-cvičení); it = cvičení řady
const vLane = (b, lid, it) => (it ? expandLanes(b).find(x => x.pid === lid && x.sid === it.id) || null : null);
// Klíč a zbývající čas pro odpočet a upozornění: kolo, u řady cvičení navíc pořadí cvičení
const clk = (B, at, X) => { const s = subAt(B, at, X); return s ? {key: at.key + "|" + s.i, left: s.left, s} : {key: at.key, left: at.left, s: null}; };
// Konec tréninku (ms) z data a času konce události; null bez údajů
function endMs(X) {
  const ev = X && X.ev, e = X && X.end;
  if (!ev || !ev.date || !/^\d{1,2}:\d{2}$/.test(String(e || ""))) return null;
  const t = new Date(ev.date + "T" + String(e).padStart(5, "0") + ":00").getTime();
  return isNaN(t) ? null : t;
}
// Kdo řídí (text)
const ctlName = c => (!c ? "" : c === me() ? "ty" : esc(c.split("@")[0]));

// ===== Poslech hodin =====
// Jeden poslech trlive/{eid} pro otevřený trénink (karta i obrazovka); změny doručené po FRESH_MS zpřesní odhad posunu hodin
function ensureLive(eid) {
  if (L.eid === eid) return;
  if (L.un) try { L.un(); } catch (e) { /* poslech už skončil */ }
  L.eid = eid; L.live = undefined; L.t0 = Date.now(); L.sess = null;
  L.un = S.db.collection(TRLIVE_COLL).part(eid).onSnapshot(v => {
    const d = v.docs.find(x => x.id === eid), now = Date.now(), old = L.live;
    L.live = d ? d.data() : null;
    if (L.live && now - L.t0 > FRESH_MS) {
      const o = skewObs(L.live, now);
      if (o != null && Math.abs(o) < SKEW_OK) { L.sess = skewNext(L.sess, o); try { localStorage.setItem(SKEW_KEY, String(L.sess)); } catch (e) { /* bez paměti */ } }
    }
    if (L.el) paint();
    else if (S.evid === eid && (!old || !L.live || old.st !== L.live.st)) render();
  }, () => { L.live = null; if (L.el) paint(); });
}

// ===== Vykreslení: karta =====
function cardHtml(eid) {
  const v = L.live, st = v && LIVE_ST[v.st] ? v.st : null;
  const txt = v === undefined ? "" : st === "run" ? "🔴 Právě běží" : st === "pause" ? "⏸ Pozastaveno" : st === "end" ? "Skončil" : canE() ? "Spustíš na ledě – hodiny uvidí celý realizační tým." : "Až trenér spustí, uvidíš, kde právě jste.";
  return `<div class="row" style="align-items:center;margin:8px 0"><button class="${st === "run" || st === "pause" ? "p" : "s"}" id="tlgo" style="flex:none;min-height:48px">⏱ Živý trénink</button><span class="mu" style="font-size:13px">${txt}</span></div>`;
}

// ===== Vykreslení: obrazovka =====
// Jedna linka: označení, cvičení, trenéři, skupiny v tomto kole a jejich hráčky
function laneHtml(b, l, tag, round, X, mine, at) {
  // Řada cvičení: současné cvičení řady (virtuální linka – stopky a popis toho cvičení), pod ním celá řada s časy
  const s = at && laneSeq(b, l) ? laneSub(b, [l.id], at) : null, cur = s && s.it ? vLane(b, l.id, s.it) : null, src = cur || l;
  const d = X.D[src.drill], name = s && !s.it ? "☕ volno do konce bloku" : d ? d.name : src.dn || "— bez cvičení —", grp = (round && round.lanes[l.id]) || l.grp || [];
  const all = !grp.length && b.mode === "all", pids = all ? [] : groupPids(b, grp, X.roster);
  const ms = mine && mayMeasure() && !(s && !s.it) ? laneMeas(b, src, X.D, msData(L.eid)) : null;
  const co = (l.co || []).map(id => "🎓 " + esc(staffName(X, id))).join(", ");
  const list = s ? `<div class="mu" style="font-size:13px;margin:2px 0">${seqTimes(b, laneSeq(b, l)).map(x => { const dx = X.D[x.drill], nx = dx ? dx.name : x.dn || "?";
    return `<div>${x.i < s.i ? "✓" : x.i === s.i ? "▶" : "·"} ${x.i === s.i ? "<b>" + esc(nx) + "</b>" : esc(nx)} · ${Math.round((x.b - x.a) / 6) / 10} min</div>`; }).join("")}</div>` : "";
  return `<div class="tlln ${mine ? "me" : ""}">${tag ? `<span class="tlk">${tag}</span>` : ""}${s ? `<div class="mu">🔁 ${s.it ? "cvičení " + (s.i + 1) + "/" + s.n + " · ještě " + mmss(s.left) : "řada skončila"}</div>` : ""}<div class="tldn">${esc(name)}</div>
${co ? `<div class="mu">${co}</div>` : ""}${list}<div style="margin:4px 0">${all ? '<span class="mu">všichni</span>' : grp.map(chip).join("") || '<span class="mu">bez skupiny</span>'}</div>
${pids.length ? `<div style="font-size:14px">${pids.map(id => esc(nm(id))).join(", ")}</div>` : ""}
${ms ? `<button class="p w" data-tsw="${esc(b.id)}|${esc(src.id)}" style="min-height:52px;margin:6px 0">⏲ Stopky – ${esc(ms.dn)}</button>` : ""}
${d && d.eq ? `<div class="mu" style="font-size:13px">Pomůcky: ${esc(d.eq)}</div>` : ""}${d && d.desc ? `<div class="mu" style="font-size:13px;white-space:pre-wrap">${esc(String(d.desc).slice(0, 240))}${String(d.desc).length > 240 ? "…" : ""}</div>` : ""}</div>`;
}
// Moje linky v kole: trenér = linky, které vede; hráčka = linka své skupiny; nikdo = null (ukážou se všechny)
function mine(b, round, X) {
  if (X.tid) { const c = coachLanes(b, X.tid); if (c.length) return c; }
  const g = X.mine != null || X.mineP ? (isPosBlock(b) ? X.mineP : X.mine) : null;
  if (g != null) { const id = laneOf(b, round, g); return id ? [id] : []; }
  return null;
}
function lanesHtml(b, at, X) {
  if (isBreak(b)) return `<div class="tlln tlbrk">☕ ${esc(b.brk || "Pauza")}</div>`;
  const T = laneTags(b), M = mine(b, at.round, X), list = (b.lanes || []).map((l, i) => ({l, t: T[i], m: M && M.includes(l.id)}));
  const show = M && M.length ? list.filter(x => x.m) : list;
  const head = M == null ? "Linky" : M.length ? "📍 Moje stanoviště" : X.tid ? "Teď nevedeš žádnou linku – všechny linky" : "Tvoje skupina teď nemá linku";
  return `<h3 style="margin:10px 0 6px">${head}</h3>${(M && !M.length ? list : show).map(x => laneHtml(b, x.l, x.t, at.round, X, x.m, at)).join("")}
${M && M.length && list.length > show.length ? `<details><summary class="mu">Ostatní linky (${list.length - show.length})</summary>${list.filter(x => !x.m).map(x => laneHtml(b, x.l, x.t, at.round, X, false, at)).join("")}</details>` : ""}`;
}
// Co následuje: další kolo / blok a moje linka v něm
function nextHtml(B, at, X) {
  if (!at || at.done) return "";
  // Řada cvičení: další cvičení řady v tomtéž bloku
  const s = subAt(B, at, X);
  if (s && s.nx) { const dx = X.D[s.nx.drill]; return `<div class="tlln" style="margin-top:8px"><div class="mu">Za ${mmss(s.left)} → 🔁 cvičení ${s.i + 2}/${s.n}</div><div><b>${esc(dx ? dx.name : s.nx.dn || "?")}</b> · ${Math.round((s.nx.b - s.nx.a) / 6) / 10} min</div></div>`; }
  const n = liveAt(B, at.b);
  if (!n || n.done) return `<div class="mu" style="margin-top:8px">Potom: konec plánu.</div>`;
  const b = B[n.bi], M = mine(b, n.round, X), l = M && M.length ? (b.lanes || []).find(x => x.id === M[0]) : null, d = l && X.D[l.drill];
  const what = n.bi !== at.bi ? `blok ${n.bi + 1} · ${isBreak(b) ? "☕ " + esc(b.brk || "Pauza") : MODES[b.mode]}` : `kolo ${n.ri + 1}/${n.nr} (točení)`;
  return `<div class="tlln" style="margin-top:8px"><div class="mu">Za ${mmss(at.left)} → ${what}</div>${l ? `<div><b>${esc(d ? d.name : l.dn || "?")}</b> · ${((n.round.lanes[l.id]) || l.grp || []).map(chip).join("") || "všichni"}</div>` : ""}</div>`;
}
// ⭐ Výzva k hodnocení hráček skončeného kola (realizační tým s právem hodnotit): hráčky mých linek předchozího kola, po konci plánu poslední kolo
function rateHtml(B, at, X) {
  if (!L.live || !LIVE_ST[L.live.st]) return "";
  // Řada cvičení: po skončeném cvičení řady se hodnotí to cvičení (ještě v tomtéž bloku)
  const s = subAt(B, at, X), cb = at && !at.done ? B[at.bi] : null;
  if (s && s.i > 0) { const T = seqTimes(cb, laneSeq(cb, cb.lanes.find(l => l.id === s.lid))), pl = vLane(cb, s.lid, T[Math.min(s.i, T.length) - 1]);
    if (pl && pl.drill) return liveEvalHtml(L.eid, [{block: cb, lane: pl, round: at.round}], X, false); }
  const pv = prevSpot(B, at);
  if (!pv || pv.done) return at && at.done ? liveEvalHtml(L.eid, [], X, true) : "";
  // Trenér hodnotí hráčky svých linek; kdo žádnou linku nevede, vidí všechny linky skončeného kola
  const b = B[pv.bi], M = mine(b, pv.round, X), ids = M == null || !M.length ? (b.lanes || []).map(l => l.id) : M;
  // Linka s řadou: poslední cvičení řady (dřívější se hodnotila během bloku)
  const spots = (b.lanes || []).filter(l => ids.includes(l.id) && l.drill).map(l => { const q = laneSeq(b, l), T = q ? seqTimes(b, q) : null; return {block: b, lane: T && T.length ? vLane(b, l.id, T[T.length - 1]) || l : l, round: pv.round}; });
  return liveEvalHtml(L.eid, spots, X, !!(at && at.done));
}
function controlsHtml(v, at) {
  if (!canE()) return "";
  const st = v && LIVE_ST[v.st] ? v.st : null, other = st && v.ctl && v.ctl !== me() && st !== "end", k = "tlctl" + L.eid, arm = armed(k);
  const take = other ? `<div class="mu" style="margin-top:6px">Řídí ${ctlName(v.ctl)} – první klepnutí na ovládání ${arm ? "<b>potvrdí převzetí</b>" : "se zeptá na převzetí řízení"}.</div>` : "";
  if (!st || st === "end" || (at && at.done && st !== "pause")) {
    const kr = "tlre" + L.eid;
    return `<div class="tlctl" style="grid-template-columns:1fr"><button class="p" data-tl="${st ? "restart" : "start"}" style="${armed(kr) ? "background:var(--wa)" : ""}">${st ? (armed(kr) ? "Spustit znovu od začátku? Klepni znovu" : "↺ Spustit znovu od začátku") : "▶ Spustit trénink"}</button></div>${take}`;
  }
  return `<div class="tlctl">${st === "run" ? '<button class="p" data-tl="pause">⏸ Pauza</button>' : '<button class="p" data-tl="resume">▶ Pokračovat</button>'}
<button class="s" data-tl="prev">⏮ Zpět</button><button class="s" data-tl="next">⏭ Další</button>
<button class="s" data-tl="cut" title="Zkrátit toto kolo o minutu">✂ −1 min</button><button class="s" data-tl="ext">+1 min</button><button class="s" data-tl="ext5">+5 min</button>
<button class="d tlend" data-tl="end" style="${armed("tlend" + L.eid) ? "background:var(--no);color:#fff" : ""}">${armed("tlend" + L.eid) ? "Ukončit trénink? Klepni znovu" : "⏹ Konec"}</button></div>${take}`;
}
// Čas do konce tréninku a o kolik plán přetahuje (čísla mění tik)
function budgetText(X, total, sec) {
  const g = liveBudget(total, sec, endMs(X), Date.now());
  if (g.realLeft == null || Math.abs(g.realLeft) > 6 * 3600) return "";
  const end = g.realLeft >= 0 ? "do konce tréninku <b>" + mmss(g.realLeft) + "</b>" : "<b>po konci tréninku</b>", m = Math.round(g.over / 60);
  return end + " · " + (m >= 1 ? `<span class="w">plán přetahuje o ${m} min</span>` : m <= -1 ? `<span class="ok">rezerva ${-m} min</span>` : "plán sedí");
}
// 📋 Zbytek plánu (jen řídit smí): další bloky jen pro tento průběh – −/+ 1 min, ⏭ vypustit / ↩ vrátit; plán se nemění
function restHtml(X, at, v) {
  if (!canE() || !v || !LIVE_ST[v.st] || v.st === "end" || !at || at.done) return "";
  const R = liveRest(planB(X), v, at), P = planB(X);
  if (!R.length) return "";
  const g = liveBudget(at.total, at.sec, endMs(X), Date.now()), open = L.rest != null ? L.rest : g.over != null && g.over >= 60;
  const left = R.reduce((s, x) => s + x.eff, 0), ch = R.filter(x => x.skip || x.adj).length;
  return `<details class="tlrs" id="tlrs" ${open ? "open" : ""}><summary>📋 Zbytek plánu · ${left} min${ch ? ` · upraveno ${ch}` : ""}</summary>
<div class="mu" style="font-size:13px;margin-bottom:4px">Jen pro dnešní průběh – uložený plán zůstane beze změny.</div>
${R.map(x => `<div class="tlrr ${x.skip ? "sk" : ""}"><div><b>${x.bi + 1}.</b> ${esc(blockName(P[x.bi], X))} · <b>${x.eff}</b> min${x.adj ? ` <span class="mu">(plán ${x.dur})</span>` : ""}</div>
${x.skip ? `<button class="s" data-tla="${esc(x.id)}|skip">↩ Vrátit</button>` : `<button class="s" data-tla="${esc(x.id)}|−">−</button><button class="s" data-tla="${esc(x.id)}|+">+</button><button class="d" data-tla="${esc(x.id)}|skip" title="Vypustit">⏭</button>`}</div>`).join("")}</details>`;
}
function screenHtml() {
  const X = L.getX ? L.getX() : null, B = liveB(X), v = L.live;
  const head = `<div class="tlh"><button class="s" id="tlx" style="flex:none;min-height:48px">✕ Zavřít</button><h2>⏱ ${esc((X && X.ev && X.ev.title) || "Živý trénink")}</h2><button class="s" id="tln" style="flex:none;min-height:48px" title="Oznámení i na hodinky">${ntfOn() ? "⌚✓" : "⌚"}</button><button class="s" id="tlm" style="flex:none;min-height:48px">${muted() ? "🔕" : "🔔"}</button></div>`;
  if (!X || !B.length) return CSS + head + '<div class="msg">Plán tréninku je prázdný – nejdřív ho připrav v detailu tréninku.</div>';
  if (v === undefined) return CSS + head + '<div class="mu">Načítám hodiny…</div>';
  const sec = liveSec(v, Date.now(), skew()), at = liveAt(B, sec || 0), st = v && LIVE_ST[v.st] ? v.st : null, T = planTimes(B);
  const b = B[at.bi], total = T[T.length - 1].b;
  const info = `<div class="mu">${st ? LIVE_ST[st] : "Čeká na spuštění"}${v && v.ctl ? " · řídí " + ctlName(v.ctl) : ""} · <span id="tlt">${mmss(sec || 0)}</span> / ${mmss(total)}</div>
<div class="tlbud" id="tlg">${st && st !== "end" ? budgetText(X, total, sec || 0) : ""}</div>`;
  if (at.done) return CSS + head + info + `<div class="tlbig">✅</div><div style="text-align:center;font-size:20px;font-weight:700">Plán skončil</div>` + controlsHtml(v, at) + rateHtml(B, at, X);
  const sub = isBreak(b) ? `Blok ${at.bi + 1}/${B.length} · ☕ Pauza` : `Blok ${at.bi + 1}/${B.length} · ${MODES[b.mode]}${isPosBlock(b) ? " · ⚔ podle postů" : ""}${at.nr > 1 ? ` · kolo ${at.ri + 1}/${at.nr}` : ""}`;
  return CSS + head + info + `<div style="text-align:center;margin-top:8px;font-weight:700">${sub}</div>
${(() => { const c = clk(B, at, X); return `${c.s ? `<div class="mu" style="text-align:center">🔁 ${c.s.it ? "moje cvičení " + (c.s.i + 1) + "/" + c.s.n : "řada skončila – volno"}</div>` : ""}<div class="tlbig" id="tlc">${mmss(c.left)}</div>${at.nr > 1 || c.s ? `<div class="mu" style="text-align:center">do konce bloku <span id="tlb">${mmss(at.bleft)}</span></div>` : ""}`; })()}
<div class="tlbar"><i id="tlp" style="width:${Math.min(100, Math.round((sec || 0) / total * 100))}%"></i></div>
${controlsHtml(v, at)}${rateHtml(B, at, X)}${lanesHtml(b, at, X)}${nextHtml(B, at, X)}${restHtml(X, at, v)}`;
}
// Celé překreslení obrazovky (změna stavu, kola nebo bloku); tik mění jen čísla
function paint() {
  if (!L.el) return;
  L.el.innerHTML = screenHtml();
  bind();
  L.shown = shownKey();
}
function shownKey() {
  const X = L.getX ? L.getX() : null, B = liveB(X), v = L.live;
  const at = B.length ? liveAt(B, liveSec(v, Date.now(), skew()) || 0) : null;
  return (at ? clk(B, at, X).key : "-") + "|" + (v ? v.st + v.e0 + v.ctl + JSON.stringify([v.adj || {}, v.skip || []]) : "0") + "|" + (L.eid || "");
}
// Tik: odpočet, upozornění při čerstvém překročení hranic, při změně kola / stavu celé překreslení
function tick() {
  if (!L.el) return;
  const X = L.getX ? L.getX() : null, B = liveB(X), v = L.live;
  if (!B.length || v === undefined) return;
  const sec = liveSec(v, Date.now(), skew()), at = liveAt(B, sec || 0), run = v && v.st === "run";
  // Skrytá aplikace (zhasnutý telefon) tiká řidčeji – hranice se poznají i později (oznámení na hodinky přijde se zpožděním)
  const hid = document.visibilityState === "hidden", win = hid ? HID_WIN : 3, sw = hid ? HID_WIN : 1.5;
  // Odpočet a upozornění podle kola, u řady cvičení na mé lince podle cvičení řady
  const c = at && !at.done ? clk(B, at, X) : null;
  if (run && L.prev && c) {
    if (L.prev.key === c.key) alertsDue(L.prev.left, c.left, undefined, win).forEach(k => alarm(k, at));
    else if (L.prev.left <= sw) alarm("switch", at);
  } else if (run && L.prev && at && at.done && !L.prev.done && L.prev.left <= sw) alarm("end", at);
  L.prev = c ? {key: c.key, left: c.left, done: false} : {key: "end", left: 0, done: true};
  if (shownKey() !== L.shown) { paint(); return; }
  const set = (id, t) => { const e = L.el.querySelector(id); if (e && e.textContent !== t) e.textContent = t; };
  if (at && !at.done) {
    set("#tlc", mmss(c.left)); set("#tlb", mmss(at.bleft)); set("#tlt", mmss(sec || 0));
    const ce = L.el.querySelector("#tlc");
    if (ce) ce.className = "tlbig" + (run && c.left <= 10 ? " n" : run && c.left <= 60 ? " w" : "");
    const p = L.el.querySelector("#tlp");
    if (p) p.style.width = Math.min(100, Math.round((sec || 0) / at.total * 100)) + "%";
    const g = L.el.querySelector("#tlg"), gt = v && LIVE_ST[v.st] && v.st !== "end" ? budgetText(X, at.total, sec || 0) : "";
    if (g && g.innerHTML !== gt) g.innerHTML = gt;
  }
}

// ===== Eventy =====
// Zápis nového stavu hodin (řídící = já); s cizím řídícím nejdřív potvrzení převzetí
function ctl(kind, extra) {
  const X = L.getX ? L.getX() : null, B = liveB(X), v = L.live, now = Date.now(), sk = skew();
  const cur = liveSec(v, now, sk) || 0, o = {now, skew: sk, me: me()};
  let d = null;
  if (kind === "start" || kind === "restart") d = liveCtl("start", null, {...o, sec: 0});
  else if (kind === "next" || kind === "prev") d = liveCtl("jump", v, {...o, sec: stepSec(B, cur, kind === "next" ? 1 : -1)});
  else if (kind === "ext" || kind === "ext5") d = liveCtl("extend", v, {...o, sec: kind === "ext" ? 60 : 300});
  else if (kind === "cut") d = liveCtl("jump", v, {...o, sec: cutSec(B, cur, 60)});
  else d = liveCtl(kind, v, o);
  if (!d) return;
  S.db.doc(TRLIVE_COLL + "/" + L.eid).merge({...d, by: me(), at: new Date().toISOString(), ...(extra || {})});
  L.prev = null;
  if (kind === "start" || kind === "restart") toast("Trénink spuštěn – hodiny běží všem");
}
function bind() {
  const el = L.el;
  el.querySelector("#tlx").onclick = close;
  el.querySelector("#tlm").onclick = () => { try { localStorage.setItem(MUTE_KEY, muted() ? "0" : "1"); } catch (e) { /* bez paměti */ } paint(); if (!muted()) beep(1); };
  el.querySelector("#tln").onclick = toggleNtf;
  // ⭐ Hodnocení hráček skončeného kola (bez psaní)
  const X0 = L.getX ? L.getX() : null;
  if (X0 && X0.plan) bindLiveEval(el, L.eid, X0, paint);
  // ⏲ Stopky měřeného cvičení: hráčky linky v tomto kole (u Společně bez skupin všechny hráčky v poli)
  el.querySelectorAll("[data-tsw]").forEach(b => b.onclick = () => {
    const X = L.getX ? L.getX() : null, B = (X && X.plan && X.plan.blocks) || [], [bid, lid] = b.dataset.tsw.split("|");
    // lid může být virtuální linka cvičení řady (blok_linka-cvičení) – stejné skupiny jako linka
    const blk = B.find(x => x.id === bid), lane = blk && ((blk.lanes || []).find(x => x.id === lid) || expandLanes(blk).find(x => x.id === lid));
    if (!lane) return;
    const at = liveAt(B, liveSec(L.live, Date.now(), skew()) || 0), grp = (at && at.round && at.round.lanes[lid]) || lane.grp || [], R = X.roster || {};
    const pids = grp.length ? groupPids(blk, grp, R) : (R.skaters || []).map(p => p.id);
    openStopwatch(L.eid, laneMeas(blk, lane, X.D, msData(L.eid)), pids, [...(R.skaters || []).map(p => p.id), ...(R.goalies || [])]);
  });
  // Převzetí řízení od jiného trenéra: první klepnutí jen označí, druhé provede akci (a řízení přejde na mě)
  const guarded = run => {
    const v = L.live, other = v && v.ctl && v.ctl !== me() && v.st !== "end" && LIVE_ST[v.st];
    if (other && !armed("tlctl" + L.eid)) { confirm2("tlctl" + L.eid, run, paint); return; }
    if (other) { S.cf = null; }
    run();
  };
  el.querySelectorAll("[data-tl]").forEach(b => b.onclick = () => {
    const k = b.dataset.tl;
    guarded(() => {
      if (k === "end") return confirm2("tlend" + L.eid, () => ctl("end"), paint);
      if (k === "restart") return confirm2("tlre" + L.eid, () => ctl("restart"), paint);
      ctl(k);
    });
  });
  // 📋 Zbytek plánu: úprava dalšího bloku jen pro tento průběh (zápis spolu se stavem hodin – pravidla chtějí řídícího)
  const rs = el.querySelector("#tlrs");
  if (rs) rs.ontoggle = () => { L.rest = rs.open; };
  el.querySelectorAll("[data-tla]").forEach(b => b.onclick = () => {
    const [bid, op] = b.dataset.tla.split("|");
    guarded(() => {
      const X = L.getX ? L.getX() : null, at = liveAt(liveB(X), liveSec(L.live, Date.now(), skew()) || 0), p = adjPatch(planB(X), L.live, bid, op, at);
      if (!p) { toast("Tento blok už začal – upravit jde jen další bloky"); return; }
      L.rest = true;
      ctl("keep", p);
    });
  });
}
function open(eid, getX) {
  if (L.el) close();
  ensureLive(eid);
  L.getX = getX; L.prev = null; L.rest = null;
  S.tl = {eid};
  const el = document.createElement("div");
  el.id = "tlv";
  document.body.appendChild(el);
  L.el = el;
  try { L.ac = L.ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { L.ac = null; }
  wakeOn();
  paint();
  L.timer = setInterval(tick, 250);
}
function close() {
  if (L.timer) clearInterval(L.timer);
  L.timer = null;
  if (L.el) L.el.remove();
  L.el = null; L.prev = null; S.tl = null;
  wakeOff();
  render();
}
// Po návratu do aplikace znovu zamknout obrazovku proti zhasnutí (Wake Lock se při skrytí uvolní)
document.addEventListener("visibilitychange", () => { if (L.el && document.visibilityState === "visible") wakeOn(); });
// Akce z oznámení (⏸ / ⏭ na telefonu nebo hodinkách) – service worker je pošle otevřené aplikaci; jen řídící trenér
function watchAct(act, eid) {
  const v = L.live;
  if (eid !== L.eid || !canE() || !v || !LIVE_ST[v.st] || v.st === "end") return;
  if (v.ctl !== me()) { toast("Hodiny řídí jiný trenér"); return; }
  if (act === "pause") ctl(v.st === "run" ? "pause" : "resume");
  else if (act === "next") ctl("next");
}
try {
  if (navigator.serviceWorker && navigator.serviceWorker.addEventListener) navigator.serviceWorker.addEventListener("message", e => { const m = e.data; if (m && m.hk === "tl") watchAct(m.act, m.eid); });
} catch (e) { /* bez service workeru */ }

// ===== Exporty =====
// Řádek „⏱ Živý trénink“ se stavem hodin do karty plánu (jen s plánem a jen pro realizační tým); poslech trlive/{eid} otevřeného tréninku
export function liveCardHtml(eid) {
  if (!HK.can("sport")) return "";
  ensureLive(eid);
  return cardHtml(eid);
}
// getX = údaje tréninku (derive z trplan-view + D, plan, ev, end) – čtou se při každém překreslení obrazovky
export function bindLiveCard(a, eid, getX) {
  const b = a.querySelector("#tlgo");
  if (b) b.onclick = () => open(eid, getX);
  if (L.el && L.eid === eid) L.getX = getX;
}

// ===== Exporty pro trlive-alerts.js =====
export {L, NTF_KEY, canE, liveB, me, mine, muted, ntfOn, paint, subAt};
