// ⏱ Živý trénink – upozornění: vibrace a zvuk 60 s a 10 s před koncem kola a při točení (🔔 hk-tl-mute), ⌚ systémové oznámení „co teď / co potom“
// (hk-tl-ntf; Android ho zrcadlí na hodinky, řídící má akce ⏸ / ⏭ přes sw.js), ohlášení změny od řídícího trenéra (remote) ostatním
// zařízením, ⚠ zdržení (plán přetahuje přes konec tréninku) a Wake Lock obrazovky (obnova po ztrátě, stav pro ☀ v záhlaví). Stav z trlive-view.js.

// ===== Importy =====
import {toast} from "../core/utils.js";
import {delayNote, laneSub, liveAt, liveNote, remoteNote} from "../domain/training-live.js";
import {clock, grpLabel, isBreak, laneSeq, laneTags, MODES} from "../domain/training-plan.js";
import {canE, L, liveB, me, mine, muted, NTF_KEY, ntfOn, paint, subAt} from "./trlive-view.js";

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
// Upozornění: vibrace + zvuk v aplikaci a ⌚ oznámení (kind 60 | 10 | "switch" | "end" | "r:…" změna od řídícího, at = poloha v plánu po změně)
function alarm(kind, at) {
  if (kind === 60) { buzz([200, 100, 200]); beep(2); }
  else if (kind === 10) { buzz([300, 100, 300, 100, 300]); beep(3, 160, 1100); }
  else if (kind === "switch" || kind === "end") { buzz(800); beep(1, 700, 660); }
  else { buzz([150, 80, 150]); beep(2, 120, 740); }
  notify(kind, at);
}
// Změna hodin od řídícího trenéra (kind z remoteKind: start | pause | resume | jump | adj | end) – vibrace, zvuk a ⌚ oznámení
const remote = (kind, at) => alarm("r:" + kind, at);
// ⚠ Zdržení o m minut: dvojitá vibrace, nízký tón a ⌚ oznámení s tím, co dělat a co následuje
function delayAlarm(m, at) {
  buzz([400, 150, 400]); beep(2, 260, 520);
  if (!ntfOn()) return;
  const X = L.getX ? L.getX() : null, B = liveB(X);
  if (!B.length || !at || at.done) return;
  const n = liveAt(B, at.b), t = delayNote(m, n && !n.done ? spot(B, n, X) : null, at.total - at.sec);
  show(t.title, t.body);
}
// Kde jsem v kole (pro text oznámení): moje linka (trenér / skupina hráčky), jinak jediná linka bloku, jinak blok
function spot(B, at, X) {
  if (isBreak(B[at.bi])) return {where: "☕ Pauza", what: B[at.bi].brk || "", who: ""};
  const b = B[at.bi], M = mine(b, at.round, X), T = laneTags(b);
  const li = M && M.length ? (b.lanes || []).findIndex(l => l.id === M[0]) : (b.lanes || []).length === 1 ? 0 : -1;
  const l = li >= 0 ? b.lanes[li] : null, grp = l ? (at.round && at.round.lanes[l.id]) || l.grp || [] : [];
  // Řada cvičení: současné cvičení řady (po řadě volno)
  const s = l && laneSeq(b, l) ? laneSub(b, [l.id], at) : null, src = s ? s.it : l, d = src && X.D[src.drill];
  return {where: (l && T[li] ? (T[li] === "🥅" ? "🥅 Brankářky" : "Stanoviště " + T[li]) : "Blok " + (at.bi + 1)) + (s && s.it ? " " + (s.i + 1) + "/" + s.n : ""),
    what: s && !s.it ? "volno" : src ? (d ? d.name : src.dn || "") : MODES[b.mode].replace(/^\S+ /, ""), who: grp.map(g => grpLabel(g)).join(", ")};
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
  const X = L.getX ? L.getX() : null, B = liveB(X);
  if (!B.length) return;
  const live = at && !at.done, cur = live ? spot(B, at, X) : null, s = live ? subAt(B, at, X) : null;
  // Řada cvičení: potom = další cvičení řady (v tomtéž kole), konec = konec cvičení
  const n = live ? liveAt(B, s && s.nx ? at.ba + s.nx.a : at.b) : null, nxt = n && !n.done ? spot(B, n, X) : null;
  const left = live ? (s ? s.left : at.left) : 0, till = live && X.start != null ? clock(X.start, s ? Math.min(at.ba + s.b, at.b) : at.b) : "";
  const rk = typeof kind === "string" && kind.startsWith("r:") ? kind.slice(2) : null;
  const t = rk ? remoteNote(rk, cur, nxt, left, till) : liveNote(kind, cur, nxt, left, till);
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
// Wake Lock: obrazovka nezhasne, dokud je otevřená obrazovka živého tréninku. Systém ho uvolní při skrytí aplikace (zhasnutí
// tlačítkem, přepnutí aplikace) nebo v úsporném režimu – tik ho pak obnovuje (wakeTry). L.wakeP = žádost právě běží.
async function wakeOn() {
  if (!navigator.wakeLock || L.wake || L.wakeP || document.visibilityState !== "visible") return;
  L.wakeP = true;
  try {
    const w = await navigator.wakeLock.request("screen");
    // Obrazovka mezitím zavřená → zámek hned pustit
    if (!L.el) { try { w.release(); } catch (e) { /* už uvolněno */ } }
    else { L.wake = w; w.addEventListener("release", () => { if (L.wake === w) L.wake = null; }); }
  } catch (e) { L.wake = null; }
  L.wakeP = false;
}
function wakeOff() { try { if (L.wake) L.wake.release(); } catch (e) { /* už uvolněno */ } L.wake = null; }
// Stav pro záhlaví: "on" = obrazovka nezhasne, "off" = zámek se nepodařil (úsporný režim, skrytá aplikace), "na" = prohlížeč neumí
const wakeState = () => (typeof navigator === "undefined" || !navigator.wakeLock ? "na" : L.wake ? "on" : "off");

// ===== Exporty =====
export {alarm, beep, delayAlarm, remote, show, toggleNtf, wakeOff, wakeOn, wakeState};
