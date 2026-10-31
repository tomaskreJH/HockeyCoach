// ⏱ Živý trénink (jen HK.can("sport")): stav a tlačítko v kartě plánu, obrazovka #tlv (✕ / Zpět zavře, hodiny běží dál; tik 250 ms mění jen čísla).
// Pořadí obrazovky: přilepené záhlaví (zbývá plán / do konce), velký odpočet, ▶ Teď (moje linka, přehled kdo kde), ⏭ Potom, ⭐ hodnocení, ⚡ improvizace
// (trlive-quick.js), 🎛 další ovládání sbalené, 📋 Zbytek plánu; řídící má ⏸ / ⏭ / +1 min v pevné spodní liště, 🔒 zámek dotyku.
// Společné hodiny trlive/{eid} řídí, kdo smí upravovat plán (trplan e), převzetí řízení druhým klepnutím; ⏲ stopky, ⭐ hodnocení (treval-view.js).
// Zvuk, vibrace, ⌚ oznámení a Wake Lock: trlive-alerts.js.

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {nm} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {laneMeas} from "../domain/stopwatch.js";
import {prevSpot} from "../domain/training-eval.js";
import {adjPatch, alertsDue, coachLanes, cutSec, groupPids, jumpPatch, laneSub, LIVE_ST, liveAt, liveBlocks, liveBudget, liveCtl, liveRest, liveSec, mmss, remoteKind, skewNext, skewObs, stepSec, TRLIVE_COLL} from "../domain/training-live.js";
import {DF, expandLanes, FW, GK, grpLabel, isBreak, isPosBlock, laneOf, laneSeq, laneTags, MODES, planTimes, seqTimes} from "../domain/training-plan.js";
import {render} from "./shell.js";
import {mayMeasure, msData, openStopwatch} from "./stopwatch-view.js";
import {bindLiveEval, liveEvalHtml} from "./treval-view.js";
import {alarm, beep, remote, show, toggleNtf, wakeOff, wakeOn, wakeState} from "./trlive-alerts.js";
import {bindQuick, quickEmptyHtml, quickHtml} from "./trlive-quick.js";

// ===== Konstanty a stav =====
const MUTE_KEY = "hk-tl-mute", SKEW_KEY = "hk-clk", NTF_KEY = "hk-tl-ntf";
const HID_WIN = 70;                                      // skrytá aplikace tiká řidčeji: upozornění / točení se pozná až do 70 s zpětně
const FRESH_MS = 5000;                                   // změny doručené až po 5 s poslechu jsou čerstvé (měří se z nich posun hodin)
const SKEW_OK = 10 * 60 * 1000;                          // větší rozdíl doručení a času serveru = stará změna, neměří se
const ICON = {[GK]: "🥅", [FW]: "⚔", [DF]: "🛡"};
const WAKE_RETRY = 5000;                                 // ztracený zámek obrazovky (úsporný režim) zkusit obnovit nejdřív po 5 s
const UNLOCK_MS = 600;                                   // 🔒 zámek dotyku: dvě klepnutí do 0,6 s odemknou
// L = poslech a obrazovka: eid, un (konec poslechu), live (dokument | null | undefined = načítá se), t0 (začátek poslechu),
// sess (odhad posunu hodin z tohoto poslechu), getX (údaje tréninku z trplan-view), el (obrazovka), timer, wake, ac (zvuk), shown, prev
// rest = 📋 Zbytek plánu rozbalený (null = podle toho, zda plán přetahuje); wakeP = žádost o zámek obrazovky běží, wakeT = poslední pokus;
// lock = 🔒 zámek dotyku zapnutý, tap = čas posledního klepnutí na zamčenou obrazovku;
// q = ⚡ rozpracované vložení cvičení (undefined = bez plánu se okno otevře samo, null = zavřené), ice = 👥 Na ledě otevřené,
// cd = 🎛 další ovládání rozbalené
let L = {eid: null, un: null, live: undefined, t0: 0, sess: null, getX: null, el: null, timer: null, wake: null, wakeP: false, wakeT: 0, ac: null, shown: "", prev: null, rest: null, lock: false, tap: 0, q: undefined, ice: false, cd: false};
const CSS = `<style>
#tlv{position:fixed;inset:0;z-index:40;background:var(--bg);color:var(--tx);overflow:auto;padding:12px 12px calc(12px + env(safe-area-inset-bottom,0px))}
#tlv .tltop{position:sticky;top:-12px;z-index:3;background:var(--bg);margin:-12px 0 0;padding:12px 0 6px;border-bottom:1px solid var(--bd)}
#tlv .tlh{display:flex;gap:8px;align-items:center;margin-bottom:6px}
#tlv .tlrem{display:flex;justify-content:space-between;gap:8px;font-size:15px}
#tlv .tlrem b{font-size:18px;font-variant-numeric:tabular-nums}
#tlv .tlbot{position:fixed;left:0;right:0;bottom:0;z-index:3;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:var(--bg);border-top:1px solid var(--bd);padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px))}
#tlv .tlbot button{min-height:64px;font-size:19px;font-weight:700}
#tlv .tlpad{height:92px}
#tllock{position:fixed;inset:0;z-index:60;background:#000;color:#9aa;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:20px;user-select:none;touch-action:manipulation}
#tllock .tlbig{color:#cde;font-size:96px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1}
#tllock .tlbig.w{color:#f5b041} #tllock .tlbig.n{color:#ff6b6b}
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
#tlv .tlrr{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 0;border-top:1px solid var(--bd)}
#tlv .tlrr>div{flex:1 1 130px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tlv .tlrr .tlgo{min-width:72px;font-weight:700}
#tlv .tlrr button{flex:none;min-height:44px;min-width:44px;padding:4px 8px}
#tlv .tlrr.sk>div{text-decoration:line-through;opacity:.55}
#tlv .tlbrk{font-size:28px;font-weight:800;text-align:center;padding:18px 10px}
#tlv .tlsec{margin:12px 0 6px;font-size:16px}
#tlv .tlov{display:flex;align-items:center;gap:6px;padding:4px 0;border-top:1px solid var(--bd);font-size:14px}
#tlv .tlov>b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
#tlv .tlov .evl{margin:0}
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
const chip = g => `<span class="evl L${g}">${ICON[g] ? ICON[g] + " " + esc(grpLabel(g).replace(/^\S+ /, "")) : esc(grpLabel(g))}</span>`;
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
// Řídím hodiny já (spuštěné, neskončené)
const iCtl = v => canE() && v && LIVE_ST[v.st] && v.st !== "end" && v.ctl === me();
// ☀ stav zámku obrazovky do záhlaví
const wakeTxt = () => ({on: "☀ obrazovka nezhasne", off: "⚠ obrazovka může zhasnout", na: "⚠ prohlížeč neumí držet obrazovku"})[wakeState()];

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
    if (L.el) { paint(); remoteAlert(old); }
    else if (S.evid === eid && (!old || !L.live || old.st !== L.live.st)) render();
  }, () => { L.live = null; if (L.el) paint(); });
}
// Změna hodin od řídícího trenéra (ne z tohoto účtu): ostatní dostanou vibraci a ⌚ oznámení s tím, co je teď a co potom
function remoteAlert(old) {
  const k = remoteKind(old, L.live, me());
  if (!k) return;
  const X = L.getX ? L.getX() : null, B = liveB(X);
  if (!B.length) return;
  remote(k, liveAt(B, liveSec(L.live, Date.now(), skew()) || 0));
  L.prev = null;                                         // tik nesmí stejnou změnu ohlásit znovu jako točení
}

// ===== Vykreslení: karta =====
function cardHtml(eid) {
  const v = L.live, st = v && LIVE_ST[v.st] ? v.st : null;
  const txt = v === undefined ? "" : st === "run" ? "🔴 Právě běží" : st === "pause" ? "⏸ Pozastaveno" : st === "end" ? "Skončil" : canE() ? "Spustíš na ledě – hodiny uvidí celý realizační tým." : "Až trenér spustí, uvidíš, kde právě jste.";
  return `<div class="row" style="align-items:center;margin:8px 0"><button class="${st === "run" || st === "pause" ? "p" : "s"}" id="tlgo" style="flex:none;min-height:48px">⏱ Živý trénink</button><span class="mu" style="font-size:13px">${txt}</span></div>`;
}

// ⚡ Trénink bez plánu: tlačítko do karty plánu (jen kdo smí plán upravovat); otevře obrazovku s oknem prvního cvičení
function improHtml(eid) {
  const v = L.live, st = v && LIVE_ST[v.st] ? v.st : null;
  return `<div style="margin-top:10px"><button class="${st === "run" || st === "pause" ? "p" : "s"} w" id="tlgo" style="min-height:52px">⚡ Bez plánu – improvizovat na ledě</button><div class="mu" style="font-size:12px;margin:4px 0">Cvičení vkládáš postupně přímo na ledě (z banky nebo nové), hodiny vidí celý realizační tým.</div></div>`;
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
  const show = M && M.length ? list.filter(x => x.m) : list, rest = M && M.length ? list.filter(x => !x.m) : [];
  const head = M == null ? "▶ Teď" : M.length ? "▶ Teď · 📍 moje" : X.tid ? "▶ Teď · nevedeš žádnou linku" : "▶ Teď · tvoje skupina nemá linku";
  return `<h3 class="tlsec">${head}</h3>${(M && !M.length ? list : show).map(x => laneHtml(b, x.l, x.t, at.round, X, x.m, at)).join("")}
${rest.length ? `<div class="mu" style="font-size:13px;margin-top:6px">Ostatní linky – kdo kde</div>${rest.map(x => overHtml(b, x.l, x.t, at, X)).join("")}<details><summary class="mu">Podrobnosti ostatních linek</summary>${rest.map(x => laneHtml(b, x.l, x.t, at.round, X, false, at)).join("")}</details>` : ""}`;
}
// Jeden řádek „kdo kde“ pro linku, kterou nevedu: označení, cvičení (u řady současné), skupiny v tomto kole, trenér
function overHtml(b, l, tag, at, X) {
  const s = laneSeq(b, l) ? laneSub(b, [l.id], at) : null, src = s && s.it ? vLane(b, l.id, s.it) || l : l, d = X.D[src.drill];
  const name = s && !s.it ? "☕ volno" : d ? d.name : src.dn || "—", grp = (at.round && at.round.lanes[l.id]) || l.grp || [];
  const co = (l.co || []).map(id => staffName(X, id)).join(", ");
  return `<div class="tlov">${tag ? `<span class="tlk">${tag}</span>` : ""}<b>${esc(name)}</b>${grp.map(chip).join("") || (b.mode === "all" ? '<span class="mu">všichni</span>' : "")}${co ? `<span class="mu">🎓 ${esc(co)}</span>` : ""}</div>`;
}
// Co následuje: další kolo / blok a moje linka v něm
function nextHtml(B, at, X) {
  if (!at || at.done) return "";
  // Řada cvičení: další cvičení řady v tomtéž bloku
  const s = subAt(B, at, X);
  if (s && s.nx) { const dx = X.D[s.nx.drill]; return `<div class="tlln" style="margin-top:8px"><div class="mu">⏭ Za ${mmss(s.left)} → 🔁 cvičení ${s.i + 2}/${s.n}</div><div><b>${esc(dx ? dx.name : s.nx.dn || "?")}</b> · ${Math.round((s.nx.b - s.nx.a) / 6) / 10} min</div></div>`; }
  const n = liveAt(B, at.b);
  if (!n || n.done) return `<div class="mu" style="margin-top:8px">⏭ Potom: konec plánu (trénink ukončí ⏹ Konec).</div>`;
  const b = B[n.bi], M = mine(b, n.round, X), l = M && M.length ? (b.lanes || []).find(x => x.id === M[0]) : null, d = l && X.D[l.drill];
  const what = n.bi !== at.bi ? `blok ${n.bi + 1} · ${isBreak(b) ? "☕ " + esc(b.brk || "Pauza") : MODES[b.mode]}` : `kolo ${n.ri + 1}/${n.nr} (točení)`;
  return `<div class="tlln" style="margin-top:8px"><div class="mu">⏭ Za ${mmss(at.left)} → ${what}</div>${l ? `<div><b>${esc(d ? d.name : l.dn || "?")}</b> · ${((n.round.lanes[l.id]) || l.grp || []).map(chip).join("") || "všichni"}</div>` : ""}</div>`;
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
    // v22.19.1: plán doběhl, ale trénink běží dál (víc ledu, zdržení) – ⏹ Konec musí zůstat, jinak by zůstal navždy „Právě běží“
    const endDone = st && st !== "end" ? `<button class="d tlend" data-tl="end" style="min-height:52px;${armed("tlend" + L.eid) ? "background:var(--no);color:#fff" : ""}">${armed("tlend" + L.eid) ? "Ukončit trénink? Klepni znovu" : "⏹ Konec tréninku"}</button>` : "";
    return `<div class="tlctl" style="grid-template-columns:1fr">${endDone}<button class="${endDone ? "s" : "p"}" data-tl="${st ? "restart" : "start"}" style="${armed(kr) ? "background:var(--wa)" : ""}">${st ? (armed(kr) ? "Spustit znovu od začátku? Klepni znovu" : "↺ Spustit znovu od začátku") : "▶ Spustit trénink"}</button></div>${take}`;
  }
  // Běžící trénink: méně časté ovládání sbalené pod 🎛 (na ledě se hlavně dívá); potvrzení druhým klepnutím ho nechá otevřené
  const endArm = armed("tlend" + L.eid), open = L.cd || endArm || arm;
  const endB = `<button class="d tlend" data-tl="end" style="${endArm ? "background:var(--no);color:#fff" : ""}">${endArm ? "Ukončit trénink? Klepni znovu" : "⏹ Konec"}</button>`;
  // Řídím já: ⏸ / ⏭ / +1 min jsou v pevné spodní liště (botHtml), tady jen méně časté akce
  if (iCtl(v)) return `<details class="tlrs" id="tlcd" ${open ? "open" : ""}><summary>🎛 ⏮ Zpět · ✂ −1 min · +5 min · ⏹ Konec</summary><div class="tlctl"><button class="s" data-tl="prev">⏮ Zpět</button><button class="s" data-tl="cut" title="Zkrátit toto kolo o minutu">✂ −1 min</button><button class="s" data-tl="ext5">+5 min</button>
${endB}</div></details>`;
  return `<details class="tlrs" id="tlcd" ${open ? "open" : ""}><summary>🎛 Ovládání hodin${v.ctl ? " · řídí " + ctlName(v.ctl) : ""}</summary><div class="tlctl">${st === "run" ? '<button class="p" data-tl="pause">⏸ Pauza</button>' : '<button class="p" data-tl="resume">▶ Pokračovat</button>'}
<button class="s" data-tl="prev">⏮ Zpět</button><button class="s" data-tl="next">⏭ Další</button>
<button class="s" data-tl="cut" title="Zkrátit toto kolo o minutu">✂ −1 min</button><button class="s" data-tl="ext">+1 min</button><button class="s" data-tl="ext5">+5 min</button>
${endB}</div>${take}</details>`;
}
// Pevná spodní lišta řídícího (vždy na stejném místě): ⏸ / ▶, ⏭ Další, +1 min
function botHtml(v, at) {
  if (!iCtl(v) || !at || (at.done && v.st !== "pause")) return "";
  return `<div class="tlpad"></div><div class="tlbot">${v.st === "run" ? '<button class="p" data-tl="pause">⏸ Pauza</button>' : '<button class="p" data-tl="resume">▶ Dál</button>'}
<button class="s" data-tl="next">⏭ Další</button><button class="s" data-tl="ext">+1 min</button></div>`;
}
// 🔒 Zámek dotyku: černá obrazovka s odpočtem (do kapsy – nic se omylem nezmáčkne, OLED šetří baterii); hodiny a upozornění běží dál
function lockHtml(B, at, X) {
  if (!L.lock) return "";
  const c = at && !at.done ? clk(B, at, X) : null, b = at && !at.done ? B[at.bi] : null;
  return `<div id="tllock"><div class="mu">🔒 Zamčeno · ${b ? "Blok " + (at.bi + 1) + "/" + B.length + " · " + esc(blockName(b, X)) : "plán skončil"}</div>
<div class="tlbig" id="tlc2">${c ? mmss(c.left) : "✅"}</div><div id="tlr2">${at && !at.done ? "zbývá plán " + mmss(at.total - at.sec) : ""}</div>
<div style="margin-top:30px">🔓 Odemkni dvojitým klepnutím</div></div>`;
}
// Čas do konce tréninku a o kolik plán přetahuje (čísla mění tik)
function budgetText(X, total, sec) {
  const g = liveBudget(total, sec, endMs(X), Date.now());
  if (g.realLeft == null || Math.abs(g.realLeft) > 6 * 3600) return "";
  const end = g.realLeft >= 0 ? "do konce tréninku <b>" + mmss(g.realLeft) + "</b>" : "<b>po konci tréninku</b>", m = Math.round(g.over / 60);
  return end + " · " + (m >= 1 ? `<span class="w">plán přetahuje o ${m} min</span>` : m <= -1 ? `<span class="ok">rezerva ${-m} min</span>` : "plán sedí");
}
// 📋 Zbytek plánu (jen řídit smí): další bloky jen pro tento průběh – ▶ Teď (skok na blok, bloky mezi se vypustí), −/+ 1 min,
// ⏭ vypustit / ↩ vrátit; plán se nemění
function restHtml(X, at, v) {
  if (!canE() || !v || !LIVE_ST[v.st] || v.st === "end" || !at || at.done) return "";
  const R = liveRest(planB(X), v, at), P = planB(X);
  if (!R.length) return "";
  const g = liveBudget(at.total, at.sec, endMs(X), Date.now()), open = L.rest != null ? L.rest : g.over != null && g.over >= 60;
  const left = R.reduce((s, x) => s + x.eff, 0), ch = R.filter(x => x.skip || x.adj).length;
  // ▶ Teď: potvrzení druhým klepnutím (skok nejde vrátit jedním klepnutím)
  const go = x => { const on = armed("tlj" + L.eid + x.id); return `<button class="${on ? "d" : "p"} tlgo" data-tlj="${esc(x.id)}" style="${on ? "background:var(--wa);color:#222" : ""}" title="Přejít hned na tento blok">${on ? "Klepni znovu" : "▶ Teď"}</button>`; };
  return `<details class="tlrs" id="tlrs" ${open ? "open" : ""}><summary>📋 Zbytek plánu – přeskočit / zkrátit · ${left} min${ch ? ` · upraveno ${ch}` : ""}</summary>
<div class="mu" style="font-size:13px;margin-bottom:4px">Jen pro dnešní průběh – uložený plán zůstane beze změny. <b>▶ Teď</b> = hned přejít na blok (bloky mezi se vypustí), <b>⏭</b> = vypustit blok.</div>
${R.map(x => `<div class="tlrr ${x.skip ? "sk" : ""}"><div><b>${x.bi + 1}.</b> ${esc(blockName(P[x.bi], X))} · <b>${x.eff}</b> min${x.adj ? ` <span class="mu">(plán ${x.dur})</span>` : ""}</div>
${go(x)}${x.skip ? `<button class="s" data-tla="${esc(x.id)}|skip">↩ Vrátit</button>` : `<button class="s" data-tla="${esc(x.id)}|−">−</button><button class="s" data-tla="${esc(x.id)}|+">+</button><button class="d" data-tla="${esc(x.id)}|skip" title="Vypustit">⏭</button>`}</div>`).join("")}</details>`;
}
function screenHtml() {
  const X = L.getX ? L.getX() : null, B = liveB(X), v = L.live;
  const head = `<div class="tlh"><button class="s" id="tlx" style="flex:none;min-height:48px">✕ Zavřít</button><h2>⏱ ${esc((X && X.ev && X.ev.title) || "Živý trénink")}</h2><button class="s" id="tlk" style="flex:none;min-height:48px" title="Zámek dotyku – do kapsy">🔒</button><button class="s" id="tln" style="flex:none;min-height:48px" title="Oznámení i na hodinky">${ntfOn() ? "⌚✓" : "⌚"}</button><button class="s" id="tlm" style="flex:none;min-height:48px">${muted() ? "🔕" : "🔔"}</button></div>`;
  if (!X || !B.length) return CSS + head + (canE() && X ? quickEmptyHtml(X) : '<div class="msg">Plán tréninku je prázdný – nejdřív ho připrav v detailu tréninku.</div>');
  if (v === undefined) return CSS + head + '<div class="mu">Načítám hodiny…</div>';
  const sec = liveSec(v, Date.now(), skew()), at = liveAt(B, sec || 0), st = v && LIVE_ST[v.st] ? v.st : null, T = planTimes(B);
  const b = B[at.bi], total = T[T.length - 1].b;
  // Přilepené záhlaví: ovládání okna, stav hodin, zbývající čas plánu a do konce tréninku (vždy nahoře i při posunu)
  const info = `<div class="tlrem"><span>zbývá plán <b id="tlr">${mmss(total - (sec || 0))}</b></span><span class="mu"><span id="tlt">${mmss(sec || 0)}</span> / ${mmss(total)}</span></div>
<div class="tlbud" id="tlg">${st && st !== "end" ? budgetText(X, total, sec || 0) : ""}</div>
<div class="mu" style="font-size:13px">${st ? LIVE_ST[st] : "Čeká na spuštění"}${v && v.ctl ? " · řídí " + ctlName(v.ctl) : ""} · <span id="tlw">${wakeTxt()}</span></div>`;
  const top = `<div class="tltop">${head}${info}</div>`;
  if (at.done) return CSS + top + `<div class="tlbig">✅</div><div style="text-align:center;font-size:20px;font-weight:700">Plán skončil</div>` + controlsHtml(v, at) + quickHtml(X) + rateHtml(B, at, X) + botHtml(v, at) + lockHtml(B, at, X);
  const sub = isBreak(b) ? `Blok ${at.bi + 1}/${B.length} · ☕ Pauza` : `Blok ${at.bi + 1}/${B.length} · ${MODES[b.mode]}${isPosBlock(b) ? " · ⚔ podle postů" : ""}${at.nr > 1 ? ` · kolo ${at.ri + 1}/${at.nr}` : ""}`;
  return CSS + top + `<div style="text-align:center;margin-top:8px;font-weight:700">${sub}</div>
${(() => { const c = clk(B, at, X); return `${c.s ? `<div class="mu" style="text-align:center">🔁 ${c.s.it ? "moje cvičení " + (c.s.i + 1) + "/" + c.s.n : "řada skončila – volno"}</div>` : ""}<div class="tlbig" id="tlc">${mmss(c.left)}</div>${at.nr > 1 || c.s ? `<div class="mu" style="text-align:center">do konce bloku <span id="tlb">${mmss(at.bleft)}</span></div>` : ""}`; })()}
<div class="tlbar"><i id="tlp" style="width:${Math.min(100, Math.round((sec || 0) / total * 100))}%"></i></div>
${lanesHtml(b, at, X)}${nextHtml(B, at, X)}${rateHtml(B, at, X)}${!st || st === "end" ? controlsHtml(v, at) + quickHtml(X) : quickHtml(X) + controlsHtml(v, at)}${restHtml(X, at, v)}${botHtml(v, at)}${lockHtml(B, at, X)}`;
}
// Celé překreslení obrazovky (změna stavu, kola nebo bloku); tik mění jen čísla
function paint() {
  if (!L.el) return;
  // ⚡ Psaní do hledání cvičení nesmí překreslení přerušit: kurzor a výběr se vrátí
  const f = document.activeElement, keep = f && L.el.contains(f) && (f.id === "tlqs" || f.id === "tlqb") ? {id: f.id, a: f.selectionStart, b: f.selectionEnd} : null;
  L.el.innerHTML = screenHtml();
  bind();
  L.shown = shownKey();
  if (keep) { const e = L.el.querySelector("#" + keep.id); if (e) { e.focus(); try { e.setSelectionRange(keep.a, keep.b); } catch (x) { /* pole bez výběru */ } } }
}
function shownKey() {
  const X = L.getX ? L.getX() : null, B = liveB(X), v = L.live;
  const at = B.length ? liveAt(B, liveSec(v, Date.now(), skew()) || 0) : null;
  // ⚡ Změna plánu (vložený blok) a 👥 kdo chybí (🚫) překreslí obrazovku i u ostatních trenérů
  const pk = planB(X).map(b => b.id + ":" + b.dur).join(","), ab = ((X && X.absent) || []).join(",");
  return (at ? clk(B, at, X).key : "-") + "|" + (v ? v.st + v.e0 + v.ctl + JSON.stringify([v.adj || {}, v.skip || []]) : "0") + "|" + (L.eid || "") + "|" + (L.lock ? 1 : 0) + "|" + pk + "|" + ab;
}
// Tik: odpočet, upozornění při čerstvém překročení hranic, při změně kola / stavu celé překreslení
function tick() {
  if (!L.el) return;
  const X = L.getX ? L.getX() : null, B = liveB(X), v = L.live;
  if (!B.length || v === undefined) { if (v !== undefined && shownKey() !== L.shown) paint(); return; }
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
  // ☀ Zámek obrazovky: ztracený (úsporný režim, návrat do aplikace) obnovit nejdřív po WAKE_RETRY
  if (!hid && wakeState() === "off" && Date.now() - L.wakeT > WAKE_RETRY) { L.wakeT = Date.now(); wakeOn(); }
  if (shownKey() !== L.shown) { paint(); return; }
  const set = (id, t) => { const e = L.el.querySelector(id); if (e && e.textContent !== t) e.textContent = t; };
  set("#tlw", wakeTxt());
  if (at && !at.done) {
    const cls = "tlbig" + (run && c.left <= 10 ? " n" : run && c.left <= 60 ? " w" : "");
    set("#tlc", mmss(c.left)); set("#tlb", mmss(at.bleft)); set("#tlt", mmss(sec || 0)); set("#tlr", mmss(at.total - (sec || 0)));
    set("#tlc2", mmss(c.left)); set("#tlr2", "zbývá plán " + mmss(at.total - (sec || 0)));
    const c2 = L.el.querySelector("#tlc2");
    if (c2) c2.className = cls;
    const ce = L.el.querySelector("#tlc");
    if (ce) ce.className = cls;
    const p = L.el.querySelector("#tlp");
    if (p) p.style.width = Math.min(100, Math.round((sec || 0) / at.total * 100)) + "%";
    const g = L.el.querySelector("#tlg"), gt = v && LIVE_ST[v.st] && v.st !== "end" ? budgetText(X, at.total, sec || 0) : "";
    if (g && g.innerHTML !== gt) g.innerHTML = gt;
  }
}

// ===== Eventy =====
// Zápis nového stavu hodin (řídící = já); s cizím řídícím nejdřív potvrzení převzetí. goto = skok na čas sec (▶ Teď)
function ctl(kind, extra, sec) {
  const X = L.getX ? L.getX() : null, B = liveB(X), v = L.live, now = Date.now(), sk = skew();
  const cur = liveSec(v, now, sk) || 0, o = {now, skew: sk, me: me()};
  let d = null;
  if (kind === "start" || kind === "restart") d = liveCtl("start", null, {...o, sec: 0});
  else if (kind === "next" || kind === "prev") d = liveCtl("jump", v, {...o, sec: stepSec(B, cur, kind === "next" ? 1 : -1)});
  else if (kind === "ext" || kind === "ext5") d = liveCtl("extend", v, {...o, sec: kind === "ext" ? 60 : 300});
  else if (kind === "cut") d = liveCtl("jump", v, {...o, sec: cutSec(B, cur, 60)});
  else if (kind === "goto") d = liveCtl("jump", v, {...o, sec});
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
  // 🔒 Zámek dotyku: zapnout jedním klepnutím, odemknout dvěma klepnutími do UNLOCK_MS
  const lk = el.querySelector("#tlk");
  if (lk) lk.onclick = () => { L.lock = true; L.tap = 0; paint(); };
  const lo = el.querySelector("#tllock");
  if (lo) lo.onclick = e => { e.preventDefault(); const t = Date.now(); if (t - L.tap < UNLOCK_MS) { L.lock = false; paint(); } else L.tap = t; };
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
  // ⚡ Improvizace: ➕ cvičení / ☕ pauza / 👥 Na ledě (zápis hodin u ▶ Hned přes převzetí řízení)
  bindQuick(el, guarded);
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
  // 🎛 Další ovládání: rozbalení se pamatuje do zavření obrazovky
  const cd = el.querySelector("#tlcd");
  if (cd) cd.ontoggle = () => { L.cd = cd.open; };
  el.querySelectorAll("[data-tla]").forEach(b => b.onclick = () => {
    const [bid, op] = b.dataset.tla.split("|");
    guarded(() => {
      const X = L.getX ? L.getX() : null, at = liveAt(liveB(X), liveSec(L.live, Date.now(), skew()) || 0), p = adjPatch(planB(X), L.live, bid, op, at);
      if (!p) { toast("Tento blok už začal – upravit jde jen další bloky"); return; }
      L.rest = true;
      ctl("keep", p);
    });
  });
  // ▶ Teď: skok na zvolený další blok (druhým klepnutím); bloky mezi se vypustí, zápis úprav spolu s hodinami
  el.querySelectorAll("[data-tlj]").forEach(b => b.onclick = () => {
    const bid = b.dataset.tlj;
    guarded(() => confirm2("tlj" + L.eid + bid, () => {
      const X = L.getX ? L.getX() : null, at = liveAt(liveB(X), liveSec(L.live, Date.now(), skew()) || 0), p = jumpPatch(planB(X), L.live, bid, at);
      if (!p) { toast("Na tento blok už přejít nejde"); return; }
      L.rest = false;
      ctl("goto", {adj: p.adj, skip: p.skip}, p.sec);
      toast("Přechod na blok – hodiny běží všem");
    }, paint));
  });
}
function open(eid, getX) {
  if (L.el) close();
  ensureLive(eid);
  L.getX = getX; L.prev = null; L.rest = null; L.q = undefined; L.ice = false; L.cd = false;
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
  L.el = null; L.prev = null; S.tl = null; L.lock = false; L.q = undefined; L.ice = false;
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
// ⚡ Tlačítko „Bez plánu – improvizovat“ do karty plánu bez bloků (jen kdo smí plán upravovat); poslech trlive/{eid}
export function liveImproHtml(eid) {
  if (!HK.can("sport") || !canE()) return "";
  ensureLive(eid);
  return improHtml(eid);
}
// getX = údaje tréninku (derive z trplan-view + D, plan, ev, end) – čtou se při každém překreslení obrazovky
export function bindLiveCard(a, eid, getX) {
  const b = a.querySelector("#tlgo");
  if (b) b.onclick = () => open(eid, getX);
  if (L.el && L.eid === eid) L.getX = getX;
}

// ===== Exporty pro trlive-alerts.js =====
export {L, NTF_KEY, canE, liveB, me, mine, muted, ntfOn, paint, planB, skew, subAt};
