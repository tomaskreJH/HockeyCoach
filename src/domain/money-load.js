// 📉 Pokladna na vyžádání: předpisy (charges) a pohyby pokladny (cash) – dvě kolekce, které rostou s časem – se u správce pokladny
// mohou načíst až při otevření pokladny (Team → 💰 režimy, pokladna u události, Moje platby, historie placení), ne při každém spuštění.
// Čisté funkce bez DOM a databáze (tests/money-load.test.js); poslech v src/main.js, stav a strážci zápisu v data/storage.js.

// ===== Konstanty =====
// Volba zařízení v localStorage: "1" = až při otevření, "0" = hned při spuštění, chybí = výchozí podle role
export const MONEY_LAZY_KEY = "hk-money-lazy";
// Kolekce, které se při úsporném načítání čtou až na vyžádání (ostatní peněžní kolekce jsou malé a čtou se hned)
export const LAZY_COLLS = ["charges", "cash"];

// ===== Hlavní logika =====
// Načítat pokladnu až při otevření? pref = volba zařízení ("1" / "0" / null), sport = účet řídí sport (trenér), money = správce pokladny.
// Výchozí: ano jen u správce pokladny, který je zároveň trenér (manager) – samotný pokladník pracuje hlavně s penězi.
export function lazyMoney(pref, sport, money) {
  if (!money) return false;
  if (pref === "1") return true;
  if (pref === "0") return false;
  return !!sport;
}
// Stav načtení pro pohledy: "" = načítá se hned (běžný režim), "wait" = čeká na otevření, "load" = načítá se, "ok" = načteno
export const moneyReady = st => st === "" || st === "ok";
// Zbývající kolekce do načtení (po prvním snímku nebo chybě se kolekce odebere); prázdné = hotovo
export function moneyLeft(done) {
  const d = new Set(done || []);
  return LAZY_COLLS.filter(c => !d.has(c));
}

// ===== Exporty =====
// (exportované funkce a konstanty jsou označené u definic výše)
