// Doména: 📚 Cvičení pro hráčky (v22.59) – cvičení z plánů nejbližších tréninků (čisté funkce bez DOM).
// Hráčka banku cvičení nečte; vidí kopii v plánu (název a obrázky di, podrobnosti dx). Vybereme pár nejbližších tréninků
// (budoucí a poslední), jejich plány se načtou jednorázově a cvičení se sloučí podle id cvičení.

// ===== Konstanty =====
export const PREP_FUTURE = 5;                  // kolik nejbližších budoucích tréninků
export const PREP_PAST = 5;                    // kolik posledních uplynulých tréninků

// ===== Pomocné funkce =====
const isCancelled = e => !!(e && (e.cancelled || (e.raw && e.raw.cancelled)));
const asc = (a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time || "").localeCompare(String(b.time || ""));

// ===== Výběr tréninků =====
// Nezrušené tréninky (ne zápasy): až PREP_FUTURE od dneška dál (nejbližší první) a až PREP_PAST uplynulých (nejnovější první)
export function prepEvents(events, today, nf = PREP_FUTURE, np = PREP_PAST) {
  const L = (events || []).filter(e => e && e.id && e.date && e.type !== "match" && !isCancelled(e));
  const fut = L.filter(e => e.date >= today).sort(asc).slice(0, nf);
  const past = L.filter(e => e.date < today).sort((a, b) => asc(b, a)).slice(0, np);
  return [...fut, ...past];
}

// ===== Sloučení cvičení =====
// plans = {id události: plán | null}; vrací [{id, name, img, dx, next, last, n}] – nejdřív cvičení z budoucích tréninků (nejbližší první),
// pak z uplynulých (nejnovější první). next = datum nejbližšího budoucího tréninku s cvičením, last = nejnovějšího uplynulého, n = počet tréninků.
export function prepDrills(evs, plans, today) {
  const M = new Map(), P = plans || {};
  const items = pl => {
    const out = [];
    ((pl && pl.blocks) || []).forEach(b => (b.lanes || []).forEach(l => {
      const seq = Array.isArray(l.seq) ? l.seq : [];
      out.push(l, ...seq);
    }));
    return out;
  };
  // Budoucí od nejbližšího, pak uplynulé od nejnovějšího: první výskyt cvičení určuje podrobnosti (nejnovější kopie)
  const order = [...(evs || [])].sort((a, b) => ((a.date >= today) === (b.date >= today) ? ((a.date >= today) ? asc(a, b) : asc(b, a)) : (a.date >= today ? -1 : 1)));
  order.forEach(e => {
    const seen = new Set();
    items(P[e.id]).forEach(x => {
      if (!x) return;
      const name = typeof x.dn === "string" ? x.dn.trim() : "";
      const key = x.drill ? String(x.drill) : name ? "n:" + name : "";
      if (!key || !name) return;
      let r = M.get(key);
      if (!r) { r = {id: key, name, img: [], dx: null, next: null, last: null, n: 0}; M.set(key, r); }
      if (!r.img.length && Array.isArray(x.di)) r.img = x.di.filter(y => typeof y === "string");
      if (!r.dx && x.dx && typeof x.dx === "object") r.dx = x.dx;
      if (!seen.has(key)) {
        seen.add(key);
        r.n++;
        if (e.date >= today) { if (!r.next || e.date < r.next) r.next = e.date; }
        else if (!r.last || e.date > r.last) r.last = e.date;
      }
    });
  });
  const rank = r => (r.next ? 0 : 1);
  return [...M.values()].sort((a, b) => rank(a) - rank(b)
    || (a.next && b.next ? a.next.localeCompare(b.next) : 0)
    || (a.last && b.last ? b.last.localeCompare(a.last) : 0)
    || a.name.localeCompare(b.name, "cs"));
}

// Hledání v názvu, pomůckách a popisu (bez ohledu na velikost písmen a diakritiku)
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function prepFilter(list, q) {
  const t = fold(q).trim();
  if (!t) return list || [];
  return (list || []).filter(r => fold([r.name, r.dx && r.dx.eq, r.dx && r.dx.desc].filter(Boolean).join(" ")).includes(t));
}
