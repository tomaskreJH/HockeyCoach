// Ladicí pomůcka: po otevření stránky s ?debug jsou všechny funkce dostupné v window.__hk (používá se i v testech).
import * as m0 from "./config/constants.js";
import * as m1 from "./core/state.js";
import * as m2 from "./core/utils.js";
import * as m3 from "./core/selectors.js";
import * as m4 from "./core/actions.js";
import * as m5 from "./domain/lineup.js";
import * as m6 from "./domain/live-engine.js";
import * as m7 from "./views/shell.js";
import * as m8 from "./views/team.js";
import * as m9 from "./views/lineup-editor.js";
import * as m10 from "./views/matches.js";
import * as m11 from "./views/opponents.js";
import * as m12 from "./views/modal.js";
import * as m13 from "./views/live-view.js";
import * as m13e from "./views/live-events.js";
import * as m13p from "./views/live-panels.js";
import * as m14 from "./views/live-quick.js";
import * as m15 from "./views/report.js";
import * as m16 from "./views/stats.js";
import * as m17 from "./domain/timeline.js";
import * as m18 from "./domain/corrections.js";
import * as m19 from "./views/editor.js";
import * as m20 from "./domain/player-stats.js";

export function installDebug(){window.__hk=Object.assign({},m18,m19,m17,m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12,m13,m13e,m13p,m14,m15,m16,m20)}
