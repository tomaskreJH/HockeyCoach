// ⏱ Živý trénink: tlačítko a stav v kartě 📋 Plán tréninku a obrazovka přes celou obrazovku (#tlv, Zpět / ✕ ji zavře, hodiny běží dál).
// Společné hodiny trlive/{eid} řídí, kdo smí upravovat plán (trplan e): ▶ start, ⏸ pauza, ⏮ / ⏭ kolo nebo blok, +1 min, ⏹ konec;
// převzetí řízení od jiného trenéra druhým klepnutím. Každý vidí „Moje stanoviště“ (trenér své linky, hráčka linku své skupiny),
// odpočet kola, hráčky na lince, co následuje; vibrace a zvuk 60 s a 10 s před koncem kola, obrazovka nezhasíná. Výpočty domain/training-live.js.
// ⌚ Oznámení (volitelně, hk-tl-ntf): systémové oznámení „co teď / co potom“ – Android ho zrcadlí na hodinky; řídící má v oznámení ⏸ / ⏭.
// ⏲ Stopky u měřeného cvičení na mé lince (views/stopwatch-view.js, smí HK.perm("treval", "e")).
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Zvuk, oznámení a obrazovka -> Poslech -> Vykreslení (karta, obrazovka; tik mění jen čísla) -> Eventy -> Exporty.

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {nm} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {laneMeas} from "../domain/stopwatch.js";
import {LIVE_ST, TRLIVE_COLL, alertsDue, coachLanes, groupPids, liveAt, liveCtl, liveNote, liveSec, mmss, skewNext, skewObs, stepSec} from "../domain/training-live.js";
import {DF, FW, GK, MODES, clock, grpLabel, isFixedLane, isPosBlock, laneOf, planTimes} from "../domain/training-plan.js";
import {render} from "./shell.js";
import {mayMeasure, msData, openStopwatch} from "./stopwatch-view.js";

// ===== Konstanty a stav =====
const LETTERS = ["A", "B", "C", "D"];
const MUTE_KEY = "hk-tl-mute", SKEW_KEY = "hk-clk", NTF_KEY = "hk-tl-ntf";
const HID_WIN = 70;                                      // skrytá aplikace tiká řidčeji: upozornění / točení se pozná až do 70 s zpětně
const FRESH_MS = 5000;                                   // změny doručené až po 5 s poslechu jsou čerstvé (měří se z nich posun hodin)
const SKEW_OK = 10 * 60 * 1000;                          // větší rozdíl doručení a času serveru = stará změna, neměří se
const ICON = {[GK]: "🥅", [FW]: "⚔", [DF]: "🛡"};
// L = poslech a obrazovka: eid, un (konec poslechu), live (dokument | null | undefined = načítá se), t0 (začátek poslechu),
// sess (odhad posunu hodin z tohoto poslechu), getX (údaje tréninku z trplan-view), el (obrazovka), timer, wake, ac (zvuk), shown, prev
let L = {eid: null, un: null, live: undefined, t0: 0, sess: null, getX: null, el: null, timer: null, wake: null, ac: null, shown: "", prev: null};
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
// Označení linek bloku: stanoviště A–D (točící se), 🥅 linka brankářek, u Společně nic
function tags(b) { let k = 0; return (b.lanes || []).map(l => (b.mode !== "st" ? "" : isFixedLane(l) ? "🥅" : LETTERS[k++] || "?")); }
const staffName = (X, id) => { const t = (X.staff || []).find(x => x.id === id); return t ? t.name : "?"; };
// Kdo řídí (text)
const ctlName = c => (!c ? "" : c === me() ? "ty" : esc(c.split("@")[0]));

// ===== Zvuk, vibrace a obrazovka =====
function beep(n, len = 160, f = 880) {
  if (muted()) return;
  try {
    const ac = L.ac || (L.ac = new (window.AudioContext || window.webkitAudioContext)());
    for (let i = 0; i < n; i++) {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * (len + 120) / 1000;
      o.frequency.value = f; o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + len / 1000);
      o.start(t); o.stop(t + len / 1000 + 0.02);
    }
  } catch (e) { /* zvuk není k dispozici */ }
}
const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* bez vibrací */ } };
// Upozornění: vibrace + zvuk v aplikaci a ⌚ oznámení (kind 60 | 10 | "switch" | "end", at = poloha v plánu po změně)
function alarm(kind, at) {
  if (kind === 60) { buzz([200, 100, 200]); beep(2); }
  else if (kind === 10) { buzz([300, 100, 300, 100, 300]); beep(3, 160, 1100); }
  else { buzz(800); beep(1, 700, 660); }
  notify(kind, at);
}
// Kde jsem v kole (pro text oznámení): moje linka (trenér / skupina hráčky), jinak jediná linka bloku, jinak blok
function spot(B, at, X) {
  const b = B[at.bi], M = mine(b, at.round, X), T = tags(b);
  const li = M && M.length ? (b.lanes || []).findIndex(l => l.id === M[0]) : (b.lanes || []).length === 1 ? 0 : -1;
  const l = li >= 0 ? b.lanes[li] : null, d = l && X.D[l.drill], grp = l ? (at.round && at.round.lanes[l.id]) || l.grp || [] : [];
  return {where: l && T[li] ? (T[li] === "🥅" ? "🥅 Brankářky" : "Stanoviště " + T[li]) : "Blok " + (at.bi + 1),
    what: l ? (d ? d.name : l.dn || "") : MODES[b.mode].replace(/^\S+ /, ""), who: grp.map(g => grpLabel(g)).join(", ")};
}
// Systémové oznámení (zrcadlí se na hodinky): titulek = co se děje, tělo = co následuje; řídící má akce ⏸ / ⏭
async function show(title, body) {
  const v = L.live, ctlMe = canE() && v && v.ctl === me() && v.st !== "end";
  const opt = {body, tag: "hk-tl", renotify: true, silent: muted(), vibrate: [300, 100, 300], icon: "icon-192.png", badge: "icon-192.png", data: {eid: L.eid},
    actions: ctlMe ? [{action: "pause", title: v.st === "run" ? "⏸ Pauza" : "▶ Pokračovat"}, {action: "next", title: "⏭ Další"}] : []};
  try {
    const r = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
    if (r && r.showNotification) { await r.showNotification(title, opt); return; }
  } catch (e) { /* bez service workeru zkusí přímé oznámení */ }
  try { new Notification(title, {body, tag: opt.tag}); } catch (e) { /* oznámení nejdou */ }
}
function notify(kind, at) {
  if (!ntfOn()) return;
  const X = L.getX ? L.getX() : null, B = (X && X.plan && X.plan.blocks) || [];
  if (!B.length) return;
  const live = at && !at.done, cur = live ? spot(B, at, X) : null, n = live ? liveAt(B, at.b) : null, nxt = n && !n.done ? spot(B, n, X) : null;
  const t = liveNote(kind, cur, nxt, live ? at.left : 0, live && X.start != null ? clock(X.start, at.b) : "");
  show(t.title, t.body);
}
// ⌚ Zapnutí / vypnutí oznámení (zapnutí si řekne o povolení systému)
async function toggleNtf() {
  const save = v => { try { localStorage.setItem(NTF_KEY, v); } catch (e) { /* bez paměti */ } };
  if (ntfOn()) { save("0"); toast("⌚ Oznámení vypnuta"); paint(); return; }
  if (typeof Notification === "undefined") { toast("Tento prohlížeč oznámení neumí"); return; }
  let p = Notification.permission;
  if (p !== "granted") { try { p = await Notification.requestPermission(); } catch (e) { p = "denied"; } }
  if (p !== "granted") { toast("Oznámení jsou zakázaná – povol je v nastavení telefonu (Aplikace → HockeyCoach / Chrome → Oznámení)"); return; }
  save("1"); paint();
  show("⌚ Oznámení zapnuta", "60 s a 10 s před koncem kola a při točení přijde, co je teď a co následuje – i na hodinky.");
}
async function wakeOn() {
  try { if (navigator.wakeLock && !L.wake && document.visibilityState === "visible") { L.wake = await navigator.wakeLock.request("screen"); L.wake.addEventListener("release", () => { L.wake = null; }); } } catch (e) { L.wake = null; }
}
function wakeOff() { try { if (L.wake) L.wake.release(); } catch (e) { /* už uvolněno */ } L.wake = null; }

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
  const txt = v === undefined ? "" : st === "run" ? "🔴 Právě běží" : st === "pause" ? "⏸ Pozastaveno" : st === "end" ? "Skončil" : canE() ? "Spustíš na ledě – hodiny uvidí všichni trenéři i hráčky." : "Až trenér spustí, uvidíš, kde právě jsi.";
  return `<div class="row" style="align-items:center;margin:8px 0"><button class="${st === "run" || st === "pause" ? "p" : "s"}" id="tlgo" style="flex:none;min-height:48px">⏱ Živý trénink</button><span class="mu" style="font-size:13px">${txt}</span></div>`;
}

// ===== Vykreslení: obrazovka =====
// Jedna linka: označení, cvičení, trenéři, skupiny v tomto kole a jejich hráčky
function laneHtml(b, l, tag, round, X, mine) {
  const d = X.D[l.drill], name = d ? d.name : l.dn || "— bez cvičení —", grp = (round && round.lanes[l.id]) || l.grp || [];
  const all = !grp.length && b.mode === "all", pids = all ? [] : groupPids(b, grp, X.roster);
  const ms = mine && mayMeasure() ? laneMeas(b, l, X.D, msData(L.eid)) : null;
  const co = (l.co || []).map(id => "🎓 " + esc(staffName(X, id))).join(", ");
  return `<div class="tlln ${mine ? "me" : ""}">${tag ? `<span class="tlk">${tag}</span>` : ""}<div class="tldn">${esc(name)}</div>
${co ? `<div class="mu">${co}</div>` : ""}<div style="margin:4px 0">${all ? '<span class="mu">všichni</span>' : grp.map(chip).join("") || '<span class="mu">bez skupiny</span>'}</div>
${pids.length ? `<div style="font-size:14px">${pids.map(id => esc(nm(id))).join(", ")}</div>` : ""}
${ms ? `<button class="p w" data-tsw="${esc(b.id)}|${esc(l.id)}" style="min-height:52px;margin:6px 0">⏲ Stopky – ${esc(ms.dn)}</button>` : ""}
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
  const T = tags(b), M = mine(b, at.round, X), list = (b.lanes || []).map((l, i) => ({l, t: T[i], m: M && M.includes(l.id)}));
  const show = M && M.length ? list.filter(x => x.m) : list;
  const head = M == null ? "Linky" : M.length ? "📍 Moje stanoviště" : X.tid ? "Teď nevedeš žádnou linku – všechny linky" : "Tvoje skupina teď nemá linku";
  return `<h3 style="margin:10px 0 6px">${head}</h3>${(M && !M.length ? list : show).map(x => laneHtml(b, x.l, x.t, at.round, X, x.m)).join("")}
${M && M.length && list.length > show.length ? `<details><summary class="mu">Ostatní linky (${list.length - show.length})</summary>${list.filter(x => !x.m).map(x => laneHtml(b, x.l, x.t, at.round, X, false)).join("")}</details>` : ""}`;
}
// Co následuje: další kolo / blok a moje linka v něm
function nextHtml(B, at, X) {
  if (!at || at.done) return "";
  const n = liveAt(B, at.b);
  if (!n || n.done) return `<div class="mu" style="margin-top:8px">Potom: konec plánu.</div>`;
  const b = B[n.bi], M = mine(b, n.round, X), l = M && M.length ? (b.lanes || []).find(x => x.id === M[0]) : null, d = l && X.D[l.drill];
  const what = n.bi !== at.bi ? `blok ${n.bi + 1} · ${MODES[b.mode]}` : `kolo ${n.ri + 1}/${n.nr} (točení)`;
  return `<div class="tlln" style="margin-top:8px"><div class="mu">Za ${mmss(at.left)} → ${what}</div>${l ? `<div><b>${esc(d ? d.name : l.dn || "?")}</b> · ${((n.round.lanes[l.id]) || l.grp || []).map(chip).join("") || "všichni"}</div>` : ""}</div>`;
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
<button class="s" data-tl="ext">+1 min</button><button class="s" data-tl="ext5">+5 min</button><button class="d" data-tl="end" style="${armed("tlend" + L.eid) ? "background:var(--no);color:#fff" : ""}">${armed("tlend" + L.eid) ? "Ukončit?" : "⏹ Konec"}</button></div>${take}`;
}
function screenHtml() {
  const X = L.getX ? L.getX() : null, P = X && X.plan, B = (P && P.blocks) || [], v = L.live;
  const head = `<div class="tlh"><button class="s" id="tlx" style="flex:none;min-height:48px">✕ Zavřít</button><h2>⏱ ${esc((X && X.ev && X.ev.title) || "Živý trénink")}</h2><button class="s" id="tln" style="flex:none;min-height:48px" title="Oznámení i na hodinky">${ntfOn() ? "⌚✓" : "⌚"}</button><button class="s" id="tlm" style="flex:none;min-height:48px">${muted() ? "🔕" : "🔔"}</button></div>`;
  if (!X || !B.length) return CSS + head + '<div class="msg">Plán tréninku je prázdný – nejdřív ho připrav v detailu tréninku.</div>';
  if (v === undefined) return CSS + head + '<div class="mu">Načítám hodiny…</div>';
  const sec = liveSec(v, Date.now(), skew()), at = liveAt(B, sec || 0), st = v && LIVE_ST[v.st] ? v.st : null, T = planTimes(B);
  const b = B[at.bi], total = T[T.length - 1].b;
  const info = `<div class="mu">${st ? LIVE_ST[st] : "Čeká na spuštění"}${v && v.ctl ? " · řídí " + ctlName(v.ctl) : ""} · <span id="tlt">${mmss(sec || 0)}</span> / ${mmss(total)}${X.start ? " · konec plánu " + clock(X.start, total) : ""}</div>`;
  if (at.done) return CSS + head + info + `<div class="tlbig">✅</div><div style="text-align:center;font-size:20px;font-weight:700">Plán skončil</div>` + controlsHtml(v, at);
  const sub = `Blok ${at.bi + 1}/${B.length} · ${MODES[b.mode]}${isPosBlock(b) ? " · ⚔ podle postů" : ""}${at.nr > 1 ? ` · kolo ${at.ri + 1}/${at.nr}` : ""}`;
  return CSS + head + info + `<div style="text-align:center;margin-top:8px;font-weight:700">${sub}</div>
<div class="tlbig" id="tlc">${mmss(at.left)}</div>${at.nr > 1 ? `<div class="mu" style="text-align:center">do konce bloku <span id="tlb">${mmss(at.bleft)}</span></div>` : ""}
<div class="tlbar"><i id="tlp" style="width:${Math.min(100, Math.round((sec || 0) / total * 100))}%"></i></div>
${controlsHtml(v, at)}${lanesHtml(b, at, X)}${nextHtml(B, at, X)}`;
}
// Celé překreslení obrazovky (změna stavu, kola nebo bloku); tik mění jen čísla
function paint() {
  if (!L.el) return;
  L.el.innerHTML = screenHtml();
  bind();
  L.shown = shownKey();
}
function shownKey() {
  const X = L.getX ? L.getX() : null, B = (X && X.plan && X.plan.blocks) || [], v = L.live;
  const at = B.length ? liveAt(B, liveSec(v, Date.now(), skew()) || 0) : null;
  return (at ? at.key : "-") + "|" + (v ? v.st + v.e0 + v.ctl : "0") + "|" + (L.eid || "");
}
// Tik: odpočet, upozornění při čerstvém překročení hranic, při změně kola / stavu celé překreslení
function tick() {
  if (!L.el) return;
  const X = L.getX ? L.getX() : null, B = (X && X.plan && X.plan.blocks) || [], v = L.live;
  if (!B.length || v === undefined) return;
  const sec = liveSec(v, Date.now(), skew()), at = liveAt(B, sec || 0), run = v && v.st === "run";
  // Skrytá aplikace (zhasnutý telefon) tiká řidčeji – hranice se poznají i později (oznámení na hodinky přijde se zpožděním)
  const hid = document.visibilityState === "hidden", win = hid ? HID_WIN : 3, sw = hid ? HID_WIN : 1.5;
  if (run && L.prev && at && !at.done) {
    if (L.prev.key === at.key) alertsDue(L.prev.left, at.left, undefined, win).forEach(k => alarm(k, at));
    else if (L.prev.left <= sw) alarm("switch", at);
  } else if (run && L.prev && at && at.done && !L.prev.done && L.prev.left <= sw) alarm("end", at);
  L.prev = at && !at.done ? {key: at.key, left: at.left, done: false} : {key: "end", left: 0, done: true};
  if (shownKey() !== L.shown) { paint(); return; }
  const set = (id, t) => { const e = L.el.querySelector(id); if (e && e.textContent !== t) e.textContent = t; };
  if (at && !at.done) {
    set("#tlc", mmss(at.left)); set("#tlb", mmss(at.bleft)); set("#tlt", mmss(sec || 0));
    const c = L.el.querySelector("#tlc");
    if (c) c.className = "tlbig" + (run && at.left <= 10 ? " n" : run && at.left <= 60 ? " w" : "");
    const p = L.el.querySelector("#tlp");
    if (p) p.style.width = Math.min(100, Math.round((sec || 0) / at.total * 100)) + "%";
  }
}

// ===== Eventy =====
// Zápis nového stavu hodin (řídící = já); s cizím řídícím nejdřív potvrzení převzetí
function ctl(kind, extra) {
  const X = L.getX ? L.getX() : null, B = (X && X.plan && X.plan.blocks) || [], v = L.live, now = Date.now(), sk = skew();
  const cur = liveSec(v, now, sk) || 0, o = {now, skew: sk, me: me()};
  let d = null;
  if (kind === "start" || kind === "restart") d = liveCtl("start", null, {...o, sec: 0});
  else if (kind === "next" || kind === "prev") d = liveCtl("jump", v, {...o, sec: stepSec(B, cur, kind === "next" ? 1 : -1)});
  else if (kind === "ext" || kind === "ext5") d = liveCtl("extend", v, {...o, sec: kind === "ext" ? 60 : 300});
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
  // ⏲ Stopky měřeného cvičení: hráčky linky v tomto kole (u Společně bez skupin všechny hráčky v poli)
  el.querySelectorAll("[data-tsw]").forEach(b => b.onclick = () => {
    const X = L.getX ? L.getX() : null, B = (X && X.plan && X.plan.blocks) || [], [bid, lid] = b.dataset.tsw.split("|");
    const blk = B.find(x => x.id === bid), lane = blk && (blk.lanes || []).find(x => x.id === lid);
    if (!lane) return;
    const at = liveAt(B, liveSec(L.live, Date.now(), skew()) || 0), grp = (at && at.round && at.round.lanes[lid]) || lane.grp || [], R = X.roster || {};
    const pids = grp.length ? groupPids(blk, grp, R) : (R.skaters || []).map(p => p.id);
    openStopwatch(L.eid, laneMeas(blk, lane, X.D, msData(L.eid)), pids, [...(R.skaters || []).map(p => p.id), ...(R.goalies || [])]);
  });
  el.querySelectorAll("[data-tl]").forEach(b => b.onclick = () => {
    const k = b.dataset.tl, v = L.live, other = v && v.ctl && v.ctl !== me() && v.st !== "end" && LIVE_ST[v.st];
    const run = () => {
      if (k === "end") return confirm2("tlend" + L.eid, () => ctl("end"), paint);
      if (k === "restart") return confirm2("tlre" + L.eid, () => ctl("restart"), paint);
      ctl(k);
    };
    // Převzetí řízení od jiného trenéra: první klepnutí jen označí, druhé provede akci (a řízení přejde na mě)
    if (other && !armed("tlctl" + L.eid)) { confirm2("tlctl" + L.eid, run, paint); return; }
    if (other) { S.cf = null; }
    run();
  });
}
function open(eid, getX) {
  if (L.el) close();
  ensureLive(eid);
  L.getX = getX; L.prev = null;
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
// Řádek „⏱ Živý trénink“ se stavem hodin do karty plánu (jen s plánem); poslech trlive/{eid} otevřeného tréninku
export function liveCardHtml(eid) {
  ensureLive(eid);
  return cardHtml(eid);
}
// getX = údaje tréninku (derive z trplan-view + D, plan, ev, end) – čtou se při každém překreslení obrazovky
export function bindLiveCard(a, eid, getX) {
  const b = a.querySelector("#tlgo");
  if (b) b.onclick = () => open(eid, getX);
  if (L.el && L.eid === eid) L.getX = getX;
}
