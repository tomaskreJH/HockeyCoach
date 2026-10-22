// Dlužníci – veřejný souhrn bez částek (v18.7, fáze C2). Čisté funkce bez DOM a bez databáze.
// Struktura: Konstanty -> Pomocné funkce -> Dokument dlužníka -> Plán zápisu (po změně předpisů, celý přepočet) -> Stav pro zobrazení -> Export.
// Kolekce debtors/{mid} = {mid, since, dues: [{d, x}]} – BEZ částek:
//  - mid = hráčka (realizační tým se nezapisuje, rozhodnutí 6),
//  - dues = splatnosti všech nezaplacených předpisů se splatností (d = due předpisu, x = výjimka z blokace), seřazeno od nejstarší,
//  - since = nejstarší splatnost (i před splatností – předpis, kterému splatnost uplyne bez další změny, je tak v seznamu už předem).
// Dokument zapisuje jen správce pokladny ve stejné dávce jako změnu předpisů; čtou ho všichni členové (firestore.rules).
// „Dní po splatnosti“ a blokace (⛓ / 🔓) se dopočítají v zařízení podle aktuálního času (debtorState) – stejné pravidlo jako debtOf v cash.js.

// ===== Importy =====
import {restOf} from "./cash.js";

// ===== Konstanty =====
export const DEBT_COLL = "debtors";
const DAY_MS = 86400000;

// ===== Pomocné funkce =====
const ms = s => { const t = new Date(s).getTime(); return isNaN(t) ? null : t; };
const dataOf = x => { const o = {...x}; delete o.id; return o; };
// Předpisy po plánované změně: sets = [{id, d}] (nový obsah dokumentu), dels = [id] (smazané)
export function chAfter(ch, sets, dels) {
  const m = new Map((ch || []).map(x => [x.id, dataOf(x)]));
  (dels || []).forEach(id => m.delete(id));
  (sets || []).forEach(x => m.set(x.id, dataOf(x.d)));
  return [...m.entries()].map(([id, d]) => ({id, ...d}));
}

// ===== Dokument dlužníka =====
// Dokument pro člena podle jeho předpisů, nebo null (nemá nezaplacený předpis se splatností → dokument se smaže)
export function debtorDoc(ch, mid) {
  const dues = (ch || [])
    .filter(x => x.mid === mid && restOf(x) > 0 && ms(x.due) != null)
    .map(x => ({d: String(x.due), x: !!x.exc}))
    .sort((a, b) => ms(a.d) - ms(b.d) || a.d.localeCompare(b.d));
  return dues.length ? {mid, since: dues[0].d, dues} : null;
}

// ===== Plán zápisu =====
// Plán pro dotčené členy: {set: [{id, d}], del: [id]}; skip(mid) = člen realizačního týmu (vždy jen smazání)
export function debtorPlan(chNew, mids, skip) {
  const set = [], del = [];
  [...new Set((mids || []).filter(Boolean))].forEach(mid => {
    const d = skip && skip(mid) ? null : debtorDoc(chNew, mid);
    if (d) set.push({id: mid, d}); else del.push(mid);
  });
  return {set, del};
}
// Plán po změně předpisů: dotčení členové = vlastníci měněných a mazaných předpisů (před i po změně)
export function debtorPlanFor(ch, sets, dels, skip) {
  const before = new Map((ch || []).map(x => [x.id, x.mid]));
  const mids = [...(sets || []).map(x => x.d && x.d.mid), ...(sets || []).map(x => before.get(x.id)), ...(dels || []).map(id => before.get(id))];
  return debtorPlan(chAfter(ch, sets, dels), mids, skip);
}
// Celý přepočet (tlačítko v ⚙️ a obnova ze zálohy): všichni vlastníci předpisů + dříve zapsaní dlužníci (have = jejich id)
export function debtorRebuild(ch, have, skip) {
  return debtorPlan(ch, [...(ch || []).map(x => x.mid), ...(have || [])], skip);
}
// Přidání plánu do dávky zápisu (rozhraní S.db.batch(): set / delete s cestou "kolekce/id")
export function applyDebtors(b, plan) {
  plan.set.forEach(x => b.set(DEBT_COLL + "/" + x.id, x.d));
  plan.del.forEach(id => b.delete(DEBT_COLL + "/" + id));
  return b;
}

// ===== Stav pro zobrazení =====
// Stav dlužníka k okamžiku now: null (nic po splatnosti), jinak {days, blocked}
//  - days = celé dny od nejstarší uplynulé splatnosti, blocked = aspoň jeden předpis po splatnosti bez výjimky (⛓), jinak výjimka (🔓)
export function debtorState(doc, now) {
  if (!doc) return null;
  const n = now == null ? Date.now() : now;
  const over = (Array.isArray(doc.dues) ? doc.dues : []).filter(x => { const t = ms(x.d); return t != null && t < n; });
  if (!over.length) return null;
  const first = Math.min(...over.map(x => ms(x.d)));
  return {days: Math.max(0, Math.floor((n - first) / DAY_MS)), blocked: over.some(x => !x.x)};
}
