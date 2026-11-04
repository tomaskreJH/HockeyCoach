// 🎯 Trestné střílení (IIHF): zvláštní událost v m.events s příznakem ps: true. Proměněné = gól (k "G", sit "PS"),
// neproměněné = pokus (k "S"). Gól se počítá do skóre, gólů i střel střelkyně, bez asistencí a bez +/- (on: []);
// neproměněný pokus je střela / zákrok brankářky. Gól z trestného střílení neukončuje trest (goalPen jen u běžného gólu).
// Čisté funkce bez DOM a databáze (tests/penalty-shot.test.js); zápis live-quick.js a editor.js, texty timeline.js a report.js.

// ===== Konstanty =====
export const PS_SIT = "PS";                                          // situace gólu z trestného střílení (SIT.PS v config/constants.js)

// ===== Hlavní logika =====
/** Událost trestného střílení: team "us" = střílí naše hráčka (shooter), "opp" = střílí soupeř (naše brankářka gk); goal = proměněno; pf = naše faulující hráčka */
export function psEvent({id, team, per, time, at, shooter = null, gk = null, pf = null, goal = false}) {
  const e = {id, k: goal ? "G" : "S", ps: true, team, per, time};
  if (at != null) e.at = at;
  if (team === "us") {
    if (goal) Object.assign(e, {scorer: shooter, a1: null, a2: null, sit: PS_SIT, on: []});
    else e.shooter = shooter;
  } else {
    e.gk = gk || null;
    if (goal) Object.assign(e, {sit: PS_SIT, on: []});
    if (pf) e.pf = pf;
  }
  return e;
}

/** Je událost trestné střílení? */
export const isPS = e => !!(e && e.ps);

/** Text trestného střílení pro průběh a zápis (who = id → jméno, čistý text) */
export function psText(e, who = id => id) {
  const goal = e.k === "G";
  if (e.team === "us") return `🎯 Trestné střílení – ${goal ? "gól" : "neproměněno"}: ${who(goal ? e.scorer : e.shooter) || "?"}`;
  return `🎯 Trestné střílení soupeře – ${goal ? "gól" : "chyceno"}${e.gk ? " (brankářka " + who(e.gk) + ")" : ""}${e.pf ? " · faul: " + who(e.pf) : ""}`;
}
