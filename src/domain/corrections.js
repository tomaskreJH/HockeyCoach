// Doména: opravy zápisu (časy třetin, konec zápasu, prodloužení) – čisté funkce nad kopií zápasu.
import {periodStart} from "./timeline.js";

export const parseClock = t => { const r = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(String(t || "")); return r && +r[2] < 60 ? (+r[1] * 60 + +r[2]) * 1000 : null; };
export const lastPer = m => (m.end ? m.end.per : m.live ? m.live.per : 1);
// Konec n. třetiny v herním čase (null = třetina probíhá)
export const periodEnd = (m, n) => { const ps = (m.live && m.live.ps) || []; if (ps[n - 1] != null) return ps[n - 1]; return m.end && m.end.per === n ? m.end.at : null; };

// Posun konce třetiny: všechny pozdější časy (události, střídání, zápis) se posunou o rozdíl
export function moveBoundary(n, per, lenMs) {
  const L = n.live, old = periodEnd(n, per);
  if (old == null) return false;
  const neu = periodStart(n, per) + Math.max(1000, lenMs), d = neu - old;
  if (!d) return true;
  const f = x => (x > old ? x + d : x);
  (n.events || []).forEach(e => { if (e.at != null) e.at = f(e.at); });
  (n.injLog || []).forEach(x => { if (x.at != null) x.at = f(x.at); });
  (n.log || []).forEach(x => { if (x.at != null) x.at = x.ty === "per" && x.per === per ? neu : f(x.at); });
  if (L) {
    L.ps = (L.ps || []).map((v, i) => (i === per - 1 ? neu : f(v)));
    (L.sh || []).forEach(s => { s.a = f(s.a); s.b = f(s.b); });
    Object.keys(L.since || {}).forEach(k => { L.since[k] = f(L.since[k]); });
    (L.pen || []).forEach(p => { if (p.end != null) p.end = f(p.end); });
    L.acc = n.end && n.end.per === per && L.acc === old ? neu : f(L.acc);
    if (L.per > 1 && L.ps[L.per - 2] != null) L.pst = L.ps[L.per - 2];
  }
  if (n.end) n.end.at = n.end.per === per ? neu : f(n.end.at);
  return true;
}
// Označení konce zápasu v aktuální třetině
export function setEnd(n, lenMs) {
  const L = n.live; if (!L) return false;
  const at = periodStart(n, L.per) + Math.max(1000, lenMs);
  n.end = {per: L.per, at}; L.running = false; L.acc = at; L.t0 = 0;
  return true;
}
export const clearEnd = n => { delete n.end; };
// Zrušení omylem založeného prodloužení: zápas končí po 3. třetině
export function removeOvertime(n) {
  const L = n.live; if (!L || (n.events || []).some(e => e.per === 4)) return false;
  const ps = L.ps || [], at = ps[2];
  if (at == null && !(n.end && n.end.per === 4)) return false;
  const end3 = at != null ? at : periodStart(n, 4);
  L.ps = ps.slice(0, 2); L.per = 3; L.pst = periodStart(n, 3);
  L.sh = (L.sh || []).filter(s => s.a < end3).map(s => ({...s, b: Math.min(s.b, end3)}));
  Object.keys(L.since || {}).forEach(k => { L.since[k] = Math.min(L.since[k], end3); });
  n.log = (n.log || []).filter(x => !(x.ty === "per" && x.per === 4));
  n.end = {per: 3, at: end3}; L.running = false; L.acc = end3; L.t0 = 0; n.ot = false;
  return true;
}
