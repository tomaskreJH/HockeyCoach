// ⏱ Živý trénink – upozornění: vibrace a zvuk 60 s a 10 s před koncem kola a při točení (🔔 hk-tl-mute), ⌚ systémové oznámení „co teď / co potom“
// (hk-tl-ntf; Android ho zrcadlí na hodinky, řídící má akce ⏸ / ⏭ přes sw.js) a Wake Lock obrazovky. Stav a pomůcky bere z trlive-view.js.

// ===== Importy =====
import {toast} from "../core/utils.js";
import {laneSub, liveAt, liveNote} from "../domain/training-live.js";
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
// Upozornění: vibrace + zvuk v aplikaci a ⌚ oznámení (kind 60 | 10 | "switch" | "end", at = poloha v plánu po změně)
function alarm(kind, at) {
  if (kind === 60) { buzz([200, 100, 200]); beep(2); }
  else if (kind === 10) { buzz([300, 100, 300, 100, 300]); beep(3, 160, 1100); }
  else { buzz(800); beep(1, 700, 660); }
  notify(kind, at);
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
  const t = liveNote(kind, cur, nxt, live ? (s ? s.left : at.left) : 0, live && X.start != null ? clock(X.start, s ? Math.min(at.ba + s.b, at.b) : at.b) : "");
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

// ===== Exporty =====
export {alarm, beep, show, toggleNtf, wakeOff, wakeOn};
