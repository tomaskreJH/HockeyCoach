// 🧪 Beta testeři: seznam e-mailů v settings/beta = {testers: [e-maily], by, at}. Spravuje manager nebo vývojář (⚙️ → 🧪 Beta testování).
// Tester vidí ve stabilní verzi nabídku nové bety (je-li beta novější), v betě smí pracovat. Vývojář je tester vždy, manager smí betu otevřít.
// Čisté funkce bez databáze – zápis je v data/cfg-api.js, vykreslení ve views/beta-view.js.

// ===== Importy =====
import {cmpVer} from "../core/app-version.js";

// ===== Konstanty =====
export const BETA_DOC = "beta";                        // dokument settings/beta
export const MAX_TESTERS = 50;                         // horní mez seznamu (stejně ve firestore.rules)

// ===== Pomocné funkce =====
const norm = e => String(e == null ? "" : e).trim().toLowerCase();

// ===== Hlavní logika =====
// Testeři z dokumentu: malá písmena, bez prázdných a duplicit, seřazení
export function testersOf(doc) {
  const list = doc && Array.isArray(doc.testers) ? doc.testers : [];
  return [...new Set(list.map(norm).filter(Boolean))].sort();
}
// Je účet tester? Vývojář vždy.
export const isTester = (doc, email, dev) => !!dev || (!!norm(email) && testersOf(doc).includes(norm(email)));
// Smí účet pracovat v betě? Tester, nebo manager (správce testerů)
export const canUseBeta = (tester, admin) => !!(tester || admin);
// Seznam po přidání (on = true) nebo odebrání e-mailu
export function setTester(list, email, on) {
  const s = new Set((list || []).map(norm).filter(Boolean)), e = norm(email);
  if (e) { if (on) s.add(e); else s.delete(e); }
  return [...s].sort();
}
// Dokument settings/beta k zápisu (nejvýš MAX_TESTERS e-mailů)
export const betaDocOf = (testers, by, at) => ({testers: testersOf({testers}).slice(0, MAX_TESTERS), by: norm(by), at: String(at || "")});
// Nabídnout ve stabilní verzi novou betu? Jen testerovi, jen novější beta, a ne tu, kterou si skryl
export function betaOffer({channel, tester, cur, beta, hidden}) {
  return channel === "stable" && !!tester && !!beta && cmpVer(beta, cur) > 0 && hidden !== beta;
}
