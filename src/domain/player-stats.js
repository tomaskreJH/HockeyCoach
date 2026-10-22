// Doména: statistiky hráček a brankářek za jeden nebo více zápasů (čistá funkce bez DOM).
// Jediný výpočet pro statistiky jednoho zápasu (views/report.js, matchStatsHtml) i sezónní souhrn (views/stats.js).
// Pravidla: čas na ledě a počet střídání podle společného pravidla shiftList (bez živého zápisu žádné střídání),
// gól = gól i střela střelkyně, asistence a1 / a2, +/- všem na ledě (e.on) kromě gólů v přesilovce (sit "PP"),
// trest = minuty (min) hráčce pid u našeho vyloučení, brankářka soupeřova gólu = e.gk, jinak brankářka mezi e.on.

// ===== Importy =====
import {isG, luPlayers, pl, skaters} from "../core/selectors.js";
import {shiftList} from "./timeline.js";

// ===== Hlavní logika =====
// matches = seznam zápasů (souhrn předává jen uzavřené). opt.match = rozpis jednoho zápasu:
// v tabulce jsou všechny bruslařky sestavy (i bez akce) a brankářkám se +/- nepočítá;
// bez opt.match (souhrn) se počítají odehrané zápasy (gp = v sestavě) a +/- všem na ledě.
// Vrací {T: id → {gp, toi, sw, g, a, sh, pim, pm, ppg, hp, ap}, GK: id → {sa, ga}, TT: {sf, sa, gf, ga}} v pořadí prvního výskytu.
export function playerStats(matches, {match = false} = {}) {
  const T = {}, GK = {}, TT = {sf: 0, sa: 0, gf: 0, ga: 0};
  const g = id => (T[id] = T[id] || {gp: 0, toi: 0, sw: 0, g: 0, a: 0, sh: 0, pim: 0, pm: 0, ppg: 0, hp: 0, ap: 0});
  const gg = id => (GK[id] = GK[id] || {sa: 0, ga: 0});
  (matches || []).forEach(m => {
    // Hráčky zápasu: rozpis = bruslařky sestavy, souhrn = odehraný zápas všem v sestavě
    if (match) skaters(m.lineup).forEach(g);
    else luPlayers(m.lineup).forEach(id => { g(id).gp++; });
    // Střídání: každé přičte svůj čas a zvýší počet střídání
    shiftList(m).forEach(x => { const s = g(x.p); s.toi += x.b - x.a; s.sw++; });
    (m.events || []).forEach(e => {
      if (e.k === "G") {
        const us = e.team === "us";
        if (us) {
          const s = g(e.scorer);
          s.g++; s.sh++;
          if (e.sit === "PP") s.ppg++;
          [e.scorer, e.a1, e.a2].filter(Boolean).forEach(id => { g(id)[m.home ? "hp" : "ap"]++; });
          [e.a1, e.a2].filter(Boolean).forEach(id => { g(id).a++; });
          TT.sf++; TT.gf++;
        } else {
          TT.sa++; TT.ga++;
          const k = e.gk || (e.on || []).find(i => isG(pl(i)));
          if (k) { gg(k).sa++; gg(k).ga++; }
        }
        // +/- (gól v přesilovce se nepočítá); v rozpisu jednoho zápasu bez brankářek
        if (e.sit !== "PP") (e.on || []).forEach(id => { if (!match || !isG(pl(id))) g(id).pm += us ? 1 : -1; });
      } else if (e.k === "S") {
        if (e.team === "us") { TT.sf++; if (e.shooter) g(e.shooter).sh++; }
        else { TT.sa++; if (e.gk) gg(e.gk).sa++; }
      } else if (e.k === "P" && e.team === "us" && e.pid) g(e.pid).pim += e.min;
    });
  });
  return {T, GK, TT};
}
