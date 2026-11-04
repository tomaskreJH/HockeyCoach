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
// Podpis pod mottem = jméno autora (hráčka / člen týmu), nebo prázdný, když ho nelze určit
export function mottoBy(m, players, staff) {
  if (!m) return "";
  const x = (players || []).find(p => p.id === m.mid) || (staff || []).find(t => t.id === m.mid);
  return x ? str(x.name) : "";
}
