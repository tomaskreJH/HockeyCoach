// Doména: ⚪ buly (vhazování) a ⏸ přerušení hry ze záznamů živého zápisu (bez DOM).
// Záznamy jsou v podrobném zápisu zápasu m.log: buly {ty: "fo", team: "us" | "opp", per, at}, přerušení {ty: "stop", per, at}.
// Buly zapisuje ▶ Buly (spustí čas), přerušení ⏸ Přerušit (domain/live-engine.js – doFaceoff, doStop). Zápasy bez nich vrací nuly.

// ===== Pomocné funkce =====
// Záznamy zadaného typu z podrobného zápisu
const logOf = (m, ty) => ((m && m.log) || []).filter(x => x && x.ty === ty);
// Podíl v celých procentech, nebo null (nic k výpočtu)
const pct = (a, n) => (n ? Math.round((100 * a) / n) : null);

// ===== Hlavní logika =====
// Buly a přerušení jednoho zápasu: {us, opp, n, pct, stops, per: {1: {us, opp, stops} …}, any}
export function flowStats(m) {
  const fo = logOf(m, "fo"), st = logOf(m, "stop"), per = {};
  const P = n => (per[n] = per[n] || {us: 0, opp: 0, stops: 0});
  fo.forEach(x => { P(x.per || 1)[x.team === "us" ? "us" : "opp"]++; });
  st.forEach(x => { P(x.per || 1).stops++; });
  const us = fo.filter(x => x.team === "us").length, opp = fo.length - us;
  return {us, opp, n: fo.length, pct: pct(us, fo.length), stops: st.length, per, any: fo.length + st.length > 0};
}
// Souhrn buly a přerušení více zápasů (jen zápasy, kde se buly zapisovala): {us, opp, n, pct, stops, games, avgStops}
export function flowTotals(matches) {
  const T = {us: 0, opp: 0, n: 0, stops: 0, games: 0};
  (matches || []).forEach(m => {
    const s = flowStats(m);
    if (!s.any) return;
    T.us += s.us; T.opp += s.opp; T.n += s.n; T.stops += s.stops; T.games++;
  });
  return {...T, pct: pct(T.us, T.n), avgStops: T.games ? Math.round(T.stops / T.games) : null};
}

// ===== Exporty =====
// (exportované funkce jsou označené u definic výše)
