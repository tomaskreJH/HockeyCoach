// 📉 Odhad čtení databáze: kolik dokumentů přečte jedno spuštění aplikace (po pauze delší než 30 min se poslouchané kolekce čtou celé).
// Vstup = počty dokumentů v kolekcích, které zařízení poslouchá (HK.cfg.readCounts); výstup = součet, největší kolekce a odhad pro hráčku.
// Čistá funkce bez DOM a databáze (tests/read-cost.test.js); vykreslení v ⚙️ → 💾 Data (views/settings-view.js).

// ===== Konstanty =====
// Denní limit čtení zdarma (tarif Spark); obnovuje se kolem půlnoci tichomořského času (u nás ráno)
export const READ_LIMIT = 50000;
// Kolekce, které při spuštění čte celé každá hráčka (src/main.js → teamData); vlastní předpisy, žádosti apod. jsou jen pár dokumentů
const PLAYER_COLLS = ["players", "matches", "opponents", "events", "attendance", "staff", "debtors", "evprice"];
// Pevná čtení hráčky navíc: účet members, 3 dokumenty nastavení, platební pole a odhad vlastních dokumentů
const PLAYER_FIXED = 10;
// České názvy kolekcí pro přehled (neznámá kolekce = technický název)
const LABELS = {players: "hráčky", matches: "zápasy", opponents: "soupeři", events: "události", attendance: "docházka", staff: "realizační tým",
  debtors: "dlužníci", evprice: "ceny událostí", settings: "nastavení", charges: "předpisy plateb", cash: "pohyby pokladny", audit: "audit",
  evcash: "vyúčtování", attnote: "důvody omluv", staffpay: "platy", plpay: "platební údaje", series: "série tréninků", budget: "rozpočty",
  absence: "nepřítomnosti", drills: "banka cvičení", requests: "žádosti", joinreq: "žádosti o přijetí", evpub: "veřejné události", lineuppub: "veřejné formace"};

// ===== Pomocné funkce =====
const num = v => Math.max(0, Math.round(+v || 0));
// Český název kolekce
export const collLabel = c => LABELS[c] || c;

// ===== Hlavní logika =====
// Odhad čtení na jedno spuštění: {total, top: [[kolekce, počet] … nejvýš n], player, starts}
// total = toto zařízení (všechny poslouchané kolekce), player = odhad pro hráčku, starts = kolik takových spuštění se vejde do denního limitu
export function readCost(counts, n = 5) {
  const L = Object.entries(counts || {}).map(([c, v]) => [c, num(v)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const total = L.reduce((s, [, v]) => s + v, 0);
  const player = PLAYER_COLLS.reduce((s, c) => s + num((counts || {})[c]), 0) + PLAYER_FIXED;
  return {total, top: L.slice(0, n), player, starts: total ? Math.floor(READ_LIMIT / total) : 0};
}

// ===== Exporty =====
// (exportované funkce a konstanty jsou označené u definic výše)
