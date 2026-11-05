// Doména: člen realizačního týmu, který je zároveň hráčkou (staff.pid = id hráčky; čisté funkce bez DOM).
// Pravidlo (v22.53): pokud je propojená hráčka v aktivní soupisce, člen týmu se v docházce, dresech a statistice Docházky nezobrazuje
// (aby hráčku nematlo, kam se přihlásit) a jeho odpověď se bere z odpovědi hráčky. Jako člen týmu vystupuje jen tam, kde to hráčka nezastoupí
// (budoucí moduly, např. schůze realizačního týmu). Pokud hráčka z aktivní soupisky odejde (stav „end“), řádek člena týmu se vrátí.
// Nic se nezapisuje do databáze: staff.pid je jediné nové pole, odpovědi zůstávají v attendance tak, jak je hráčka zapsala.

// ===== Konstanty =====
const ENDED = "end";                                // stav hráčky mimo aktivní soupisku (players.st)

// ===== Propojení =====
// Id aktivní propojené hráčky člena týmu t, jinak "" (bez propojení, neexistující hráčka nebo hráčka se stavem „end“)
export function dualPid(t, players) {
  const pid = t && typeof t.pid === "string" ? t.pid : "";
  if (!pid) return "";
  const p = (players || []).find(x => x && x.id === pid);
  return p && (p.st || "act") !== ENDED ? pid : "";
}
// Je člen týmu zároveň aktivní hráčkou?
export const isDual = (t, players) => !!dualPid(t, players);
// Členové týmu k zobrazení v docházce: bez těch, které zastupuje hráčka
export const visibleStaff = (staff, players) => (staff || []).filter(t => !isDual(t, players));

// ===== Odpovědi =====
// Docházka s odpověďmi propojených členů týmu převzatými od jejich hráček: vlastní záznamy člena (pid = id člena) se zahodí
// a nahradí kopiemi záznamů hráčky s pid = id člena. Hráčka bez odpovědi = člen týmu bez odpovědi.
// Ostatní záznamy se vracejí beze změny (stejné objekty), vstup se nemění.
export function mirrorStaffAt(at, staff, players) {
  const map = {};                                   // id člena týmu → id jeho aktivní hráčky
  (staff || []).forEach(t => { const pid = dualPid(t, players); if (pid) map[t.id] = pid; });
  if (!Object.keys(map).length) return at || [];
  const byPlayer = {};                              // id hráčky → id členů týmu, které ji zastupují
  Object.entries(map).forEach(([tid, pid]) => { (byPlayer[pid] = byPlayer[pid] || []).push(tid); });
  const out = [];
  (at || []).forEach(a => {
    if (a && map[a.pid]) return;                    // vlastní odpověď člena týmu se nepoužije
    out.push(a);
    (byPlayer[a && a.pid] || []).forEach(tid => out.push({...a, id: a.eid + "_" + tid, pid: tid}));
  });
  return out;
}
