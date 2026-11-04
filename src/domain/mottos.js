// Banka mott a pokřiků (v22.45): kolekce mottos/{id} = {t, mid, by, at, off?}. Čisté funkce bez DOM a databáze.
// mid = id hráčky nebo člena týmu (pid / tid), by = e-mail autora, off = skryl trenér (autor to nevidí jako smazání, jen se nezobrazuje).
// Struktura: Konstanty -> Kontrola a dokument -> Výběr a zobrazení.

// ===== Konstanty =====
export const MOTTO_COLL = "mottos";         // kolekce mott
export const MOTTO_MAX = 80;                // nejvýš znaků jednoho motta
export const MOTTO_PER = 5;                 // nejvýš mott jedné osoby (hlídá aplikace, ne pravidla)

// ===== Kontrola a dokument =====
const str = v => (v == null ? "" : String(v)).replace(/\s+/g, " ").trim();
// Kontrola zadaného motta: neprázdné, nejvýš MOTTO_MAX znaků, osoba nemá víc než MOTTO_PER (own = počet jejích mott)
export function mottoCheck(text, own) {
  const t = str(text);
  if (!t) return {ok: false, err: "Napiš motto nebo pokřik"};
  if (t.length > MOTTO_MAX) return {ok: false, err: "Motto je moc dlouhé (max " + MOTTO_MAX + " znaků)"};
  if ((own || 0) >= MOTTO_PER) return {ok: false, err: "Můžeš mít nejvýš " + MOTTO_PER + " mott – jedno smaž"};
  return {ok: true, t};
}
// Dokument nového motta (stejný tvar vynucují pravidla databáze)
export const mottoDoc = (t, mid, by, at) => ({t: str(t), mid: str(mid), by: str(by).toLowerCase(), at});

// ===== Výběr a zobrazení =====
// Motta k zobrazení = ta, která trenér neskryl a mají text
export const shownMottos = list => (list || []).filter(m => m && str(m.t) && !m.off);
// Motta jedné osoby (včetně skrytých – autor vidí, že je trenér skryl), nejstarší první
export const mineMottos = (list, mid) => (list || []).filter(m => m && mid && m.mid === mid).sort((a, b) => str(a.at).localeCompare(str(b.at)));
// Náhodné motto: rnd() vrací číslo 0 ≤ x < 1 (v testech pevné); prázdná banka = null
export function pickMotto(list, rnd) {
  const l = shownMottos(list);
  if (!l.length) return null;
  const r = typeof rnd === "function" ? rnd() : Math.random();
  return l[Math.min(l.length - 1, Math.floor(r * l.length))];
}
// Štítek před mottem: „#9“ (číslo dresu hráčky), bez čísla jméno hráčky / člena týmu, jinak prázdný
export function mottoTag(m, players, staff) {
  if (!m) return "";
  const p = (players || []).find(x => x.id === m.mid);
  if (p && str(p.num)) return "#" + str(p.num);
  return mottoBy(m, players, staff);
}
// Kapitánka = hráčka s příznakem cap (nastavuje trenér v Upravit hráče)
export const isCaptain = p => !!(p && p.cap === true);
// Pořadí nálepek: nejdřív nejnovější motto každé kapitánky (její aktuální text má přednost), pak ostatní v náhodném, ale stálém pořadí
// (rank(id) vrací stabilní číslo 0–1 pro motto). Vrací [{m, cap}].
export function orderMottos(list, players, rank) {
  const caps = new Set((players || []).filter(isCaptain).map(p => p.id));
  const l = shownMottos(list), first = [], used = new Set();
  caps.forEach(c => {
    const mine = l.filter(m => m.mid === c).sort((a, b) => str(b.at).localeCompare(str(a.at)));
    if (mine.length) { first.push(mine[0]); used.add(mine[0].id); }
  });
  first.sort((a, b) => str(b.at).localeCompare(str(a.at)));
  const rk = typeof rank === "function" ? rank : () => 0.5;
  const rest = l.filter(m => !used.has(m.id)).sort((a, b) => rk(a.id) - rk(b.id) || str(a.id).localeCompare(str(b.id)));
  return first.map(m => ({m, cap: true})).concat(rest.map(m => ({m, cap: caps.has(m.mid)})));
}
// Podpis pod mottem = jméno autora (hráčka / člen týmu), nebo prázdný, když ho nelze určit
export function mottoBy(m, players, staff) {
  if (!m) return "";
  const x = (players || []).find(p => p.id === m.mid) || (staff || []).find(t => t.id === m.mid);
  return x ? str(x.name) : "";
}
