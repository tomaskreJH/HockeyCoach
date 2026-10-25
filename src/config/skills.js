// Modul Trénink: číselníky banky cvičení – kategorie (část tréninku), dovednosti, úroveň, vhodné skupiny a jednotky měření.
// Jen konstanty bez logiky; klíče se ukládají do drills/{id} (cat, sk, lvl, grp, meas.u), popisy jdou měnit bez převodu dat.
// Struktura: Kategorie -> Dovednosti -> Úroveň a skupiny -> Měření.

// ===== Kategorie (část tréninku podle metodiky: rozbruslení → dovednosti → malý prostor → herní situace → závěr) =====
export const CATS = {
  warm: "🔥 Rozbruslení a rozcvička",
  skill: "🎯 Dovednosti",
  ssg: "⚡ Hra v malém prostoru",
  sys: "🧠 Herní situace a systém",
  end: "🏁 Závěr a hra",
  off: "🏋️ Mimo led"
};

// ===== Dovednosti (zaměření cvičení; jedno cvičení může mít více dovedností) =====
export const SKILLS = {
  skate: "⛸ Bruslení",
  puck: "🏒 Ovládání puku",
  pass: "↔️ Přihrávky",
  shot: "🥅 Střelba",
  duel: "🤼 1 na 1 a souboje",
  def: "🛡 Bránění",
  game: "🧠 Herní situace",
  ppsh: "⚖️ Přesilovka / oslabení",
  gk: "🧤 Brankářky",
  fit: "💪 Kondice a mimo led",
  fun: "🎉 Rozcvička / hra"
};

// ===== Úroveň a vhodné skupiny =====
export const LEVELS = {1: "🟢 Základní", 2: "🟡 Střední", 3: "🔴 Náročné"};
// Pro koho se cvičení hodí: celý tým najednou, stanoviště (skupina), brankářky
export const GROUPS = {all: "Celý tým", st: "Stanoviště", gk: "Brankářky"};

// ===== Měření (stopky a testy – použije E3b) =====
// u = jednotka; low = nižší hodnota je lepší (čas)
export const UNITS = {s: "čas (s)", ks: "počet (ks)", b: "body"};
