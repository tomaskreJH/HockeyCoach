// Kouřový test: testovací data týmu a účty všech rolí (stejná data pro každou roli; čas viz NOW ve smoke-env.mjs).

// ===== Konstanty =====
const TODAY = "2026-10-26", NEXT = "2026-11-02", PAST = "2026-10-19", TOMORROW = "2026-10-27", OLD = "2026-07-15";
const STARTED = Date.parse("2026-10-26T17:00:00+01:00");

// ===== Účty rolí =====
// Klíč = název role v kouřovém testu, members = dokument members/{email}
export const ROLES = {
  manager: {email: "manager@smoke.cz", m: {role: "manager", rv: 2, tid: "t0"}},
  "trener-cash": {email: "trener1@smoke.cz", m: {role: "trener", rv: 2, tid: "t1", cash: true}},
  trener: {email: "trener2@smoke.cz", m: {role: "trener", rv: 2, tid: "t4"}},
  asistent: {email: "asistent@smoke.cz", m: {role: "asistent", rv: 2, tid: "t2"}},
  "asistent-hracka": {email: "hrajici@smoke.cz", m: {role: "asistent", rv: 2, tid: "t3", pid: "p8", cash: true}},
  hracka: {email: "hracka@smoke.cz", m: {role: "hracka", rv: 2, pid: "p1"}},
  host: {email: "host@smoke.cz", m: {role: "host", rv: 2, pid: "p9"}},
  pokladnik: {email: "pokladnik@smoke.cz", m: {role: "hracka", rv: 2, pid: "p2", cash: true}}
};

// ===== Data týmu =====
export function teamData() {
  const players = {
    p1: {name: "Anna", num: "7", pos: "Útočnice", st: "act"}, p2: {name: "Bára", num: "8", pos: "Útočnice", st: "act"},
    p3: {name: "Cecílie", num: "9", pos: "Útočnice", st: "act"}, p4: {name: "Dana", num: "10", pos: "Obránkyně", st: "act"},
    p5: {name: "Eva", num: "11", pos: "Obránkyně", st: "act"}, p6: {name: "Františka", num: "12", pos: "Útočnice", st: "act"},
    p7: {name: "Gábina", num: "1", pos: "Brankářka", st: "act"}, p8: {name: "Hana", num: "14", pos: "Obránkyně", st: "act"},
    p9: {name: "Iva", num: "21", pos: "Útočnice", st: "act", guest: true}
  };
  const staff = {t0: {name: "Marek", kind: "Manager"}, t1: {name: "Petr", kind: "Trenér"}, t2: {name: "Jana", kind: "Asistent"},
    t3: {name: "Hana", kind: "Asistent"}, t4: {name: "Karel", kind: "Trenér"}};
  const lines = {p1: 1, p2: 1, p3: 2, p4: 1, p5: 2, p6: 2, p8: 1, "t:t1": 1, "t:t2": 2};
  const events = {
    e1: {title: "Trénink", date: TODAY, time: "17:00", end: "18:30", place: "Zimní stadion", dl: "2026-10-25T18:00", lines, grp: 2},
    e2: {title: "Trénink", date: NEXT, time: "17:00", end: "18:00", place: "Zimní stadion", dl: "2026-11-01T18:00"},
    e0: {title: "Trénink", date: PAST, time: "17:00", end: "18:00", place: "Zimní stadion", dl: "2026-10-18T18:00", ss: true},
    // 📉 starší trénink mimo okno poslechu (archiv z paměti zařízení)
    e8: {title: "Trénink daleko", date: "2026-11-20", time: "17:00", end: "18:00", place: "Zimní stadion", dl: "2026-11-19T18:00"},
    e9: {title: "Trénink", date: OLD, time: "17:00", end: "18:00", place: "Zimní stadion", dl: "2026-07-14T18:00"}
  };
  const matches = {m1: {opp: "Sokol", date: TOMORROW, time: "18:00", home: true, place: "Zimní stadion", dl: "2026-10-26T18:00", ev: [], nom: [], ln: {}}};
  const attendance = {};
  ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"].forEach(p => { attendance["e1_" + p] = {eid: "e1", pid: p, st: "yes"}; attendance["e0_" + p] = {eid: "e0", pid: p, st: p === "p3" ? "no" : "yes"}; });
  ["t1", "t2", "t3"].forEach(t => { attendance["e1_" + t] = {eid: "e1", pid: t, st: "yes"}; });
  attendance.m1_p1 = {eid: "m1", pid: "p1", st: "yes"};
  ["p1", "p2"].forEach(p => { attendance["e9_" + p] = {eid: "e9", pid: p, st: "yes"}; });
  // 📉 v22.9: docházka nese datum události d (okno poslechu)
  Object.values(attendance).forEach(a => { a.d = (events[a.eid] || matches[a.eid] || {}).date || ""; });
  // 🕘 Historie přihlášek: p1 sama, p2 zapsal trenér (po termínu), p3 jen starší odpověď bez historie
  Object.assign(attendance.e1_p1, {at: "2026-10-24T10:00:00.000Z", by: "hracka@smoke.cz"});
  Object.assign(attendance.e1_p2, {at: "2026-10-25T19:00:00.000Z", by: "trener1@smoke.cz"});
  Object.assign(attendance.e1_p3, {at: "2026-10-20T08:00:00.000Z", by: "p3@smoke.cz"});
  const attlog = {
    l1: {eid: "e1", pid: "p1", st: "yes", by: "hracka@smoke.cz", bp: "p1", at: Date.parse("2026-10-24T10:00:00.000Z")},
    l2: {eid: "e1", pid: "p2", st: "no", by: "p2@smoke.cz", bp: "p2", at: Date.parse("2026-10-23T09:00:00.000Z"), src: "abs"},
    l3: {eid: "e1", pid: "p2", st: "yes", by: "trener1@smoke.cz", bp: "t1", at: Date.parse("2026-10-25T19:00:00.000Z")}
  };
  const drills = {
    d1: {name: "Rozbruslení", cat: "warm", sk: ["skate"], lvl: 1, dur: 8, grp: ["all"], eq: "", desc: "Kolečka", url: "", pdf: "", img: [], meas: null, by: "x", at: "2026-10-01"},
    d2: {name: "Sprint 30 m", cat: "skill", sk: ["skate"], lvl: 1, dur: 7, grp: ["all", "st"], eq: "", desc: "", url: "", pdf: "", img: [], meas: {u: "s", low: true}, by: "x", at: "2026-10-01"},
    d3: {name: "Přihrávky v pohybu", cat: "skill", sk: ["pass"], lvl: 2, dur: 10, grp: ["st"], eq: "", desc: "", url: "", pdf: "", img: [], meas: null, by: "x", at: "2026-10-01"},
    d4: {name: "Střelba z kruhu", cat: "skill", sk: ["shoot"], lvl: 2, dur: 10, grp: ["st"], eq: "", desc: "", url: "", pdf: "", img: [], meas: null, by: "x", at: "2026-10-01"},
    g1: {name: "Brankářky – postoj", cat: "gk", sk: ["gk"], lvl: 1, dur: 5, grp: ["gk"], eq: "", desc: "", url: "", pdf: "", img: [], meas: null, by: "x", at: "2026-10-01"},
    g2: {name: "Brankářky – přesuny", cat: "gk", sk: ["gk"], lvl: 1, dur: 5, grp: ["gk"], eq: "", desc: "", url: "", pdf: "", img: [], meas: null, by: "x", at: "2026-10-01"}
  };
  // Plán: blok Společně s řadou cvičení (hráčky i brankářky), stanoviště s točením, pauza, závěr
  const trplan = {e1: {v: 1, goal: "Bruslení a přihrávky", by: "trener1@smoke.cz", at: "2026-10-25", blocks: [
    {id: "b1", mode: "all", dur: 15, rot: null, lanes: [
      {id: "l1", drill: "d1", dn: "Rozbruslení", di: [], co: ["t1"], grp: [], seq: [{id: "s1", drill: "d1", dn: "Rozbruslení", di: [], dur: 8}, {id: "s2", drill: "d2", dn: "Sprint 30 m", di: [], dur: 7}]},
      {id: "l2", drill: "g1", dn: "Brankářky – postoj", di: [], co: ["t2"], grp: ["G"], seq: [{id: "s3", drill: "g1", dn: "Brankářky – postoj", di: [], dur: 5}, {id: "s4", drill: "g2", dn: "Brankářky – přesuny", di: [], dur: 10}]}]},
    {id: "b2", mode: "st", dur: 20, rot: 10, lanes: [
      {id: "l3", drill: "d3", dn: "Přihrávky v pohybu", di: [], co: ["t1"], grp: [1]},
      {id: "l4", drill: "d4", dn: "Střelba z kruhu", di: [], co: ["t2"], grp: [2]}]},
    {id: "b3", mode: "all", dur: 3, rot: null, brk: "Pití", lanes: []},
    {id: "b4", mode: "all", dur: 15, rot: null, lanes: [{id: "l5", drill: "d2", dn: "Sprint 30 m", di: [], co: ["t1"], grp: []}]}
  ]}};
  const trlive = {e1: {v: 1, st: "run", e0: 0, wAt: STARTED, sAt: STARTED, ctl: "trener1@smoke.cz", by: "trener1@smoke.cz", at: "2026-10-26"}};
  const trms = {e1: {v: 1, r: {"b1_l1-s2": {d: "d2", dn: "Sprint 30 m", u: "s", low: true, ms: {p1: [5.2, 5.0], p2: [5.6]}}}, by: "trener1@smoke.cz", at: "2026-10-26"},
    e0: {v: 1, r: {"b1_l1": {d: "d2", dn: "Sprint 30 m", u: "s", low: true, ms: {p1: [5.4], p2: [5.5]}}}, by: "trener1@smoke.cz", at: "2026-10-19"}};
  const treval = {e1: {v: 1, r: {"b1_l1-s1": {d: "d1", dn: "Rozbruslení", r: 0, n: "", pl: {p1: {r: 4, n: ""}, p2: {r: 3, n: ""}}}}, by: "trener1@smoke.cz", at: "2026-10-26"}};
  const settings = {
    cash: {iban: "CZ6508000000192000145399", iban2: "CZ4907100000000000123457", acc: {contrib: "main"}, contrib: 500, due: 14, inst: true, cats: [], tpl: {}},
    events: {meetT: 30, meetM: 60, durT: 60},
    app: {minVer: "22.9"}
  };
  // c2 = po splatnosti (⛓ blokace) pro 🔓 Výjimky; e0 = uzavřené vyúčtování (💰 na kartě události)
  const charges = {c1: {eid: "e0", mid: "p1", amt: 150, paid: 0, due: "2026-11-05", kind: "event", vs: "1001", acc: "op", msg: "Trenink 19.10. - Anna"},
    c2: {eid: "e0", mid: "p2", amt: 150, paid: 0, due: "2026-10-20", kind: "event", vs: "1002", acc: "op", msg: "Trenink 19.10."}};
  const plpay = {p1: {grp: "single", fx: 1, ex: false}, p2: {grp: "monthly", fx: 1, ex: false}, p8: {grp: "monthly", fx: 1, ex: false}};
  const plevel = {team: {v: 1, lv: {p1: 4, p2: 3, p3: 3, p4: 2, p5: 3, p6: 2, p8: 3}}};
  const evpub = {e1: {title: "Trénink", date: TODAY, time: "17:00", end: "18:30", place: "Zimní stadion", type: "training"}};
  return {players, staff, events, matches, attendance, attlog, drills, trplan, trlive, trms, treval, settings, charges, plpay, plevel, evpub,
    opponents: {}, series: {}, cash: {k1: {d: "2026-10-01", k: "in", amt: 3000, cat: "Vklady / dary", note: "", acc: "main", by: "manager@smoke.cz"}, k2: {d: "2026-10-02", k: "tr", amt: 1000, from: "main", to: "op", note: "na led", by: "manager@smoke.cz"},
      k3: {d: "2026-10-05", k: "out", amt: 400, cat: "Pronájem ledu", payee: "Zimní stadion", pym: "2026-09", note: "", acc: "op", by: "manager@smoke.cz"}},
    evcash: {e0: {tpl: "train", cost: [{cat: "Pronájem ledu", payee: "Zimní stadion", amt: 1050}], who: {}, settle: {cost: [{cat: "Pronájem ledu", payee: "Zimní stadion", amt: 1050}], total: 1050, n: 7, who: {}, at: "2026-10-20T10:00:00Z", by: "manager@smoke.cz"}}}, evprice: {e0: {ym: "2026-10", date: PAST, tpl: "train", head: {monthly: 150, single: 150, exempt: 0}}}, debtors: {}, attnote: {}, staffpay: {}, requests: {}, absence: {}, budget: {}, audit: {}, joinreq: {}, lineuppub: {}, drillimg: {}, trtpl: {}};
}

// ===== Účty =====
export function membersMap() {
  return Object.fromEntries(Object.values(ROLES).map(r => [r.email, r.m]));
}
