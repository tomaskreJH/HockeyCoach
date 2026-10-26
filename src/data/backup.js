// Zálohy (⚙️ → 💾 Data): stažení zálohy JSON (jen kolekce načtené v zařízení, kolekce Tréninku FETCH se načtou celé), CSV soupisky
// a obnova ze zálohy (sloučit / nahradit). Neobnovuje se brána verze, matice práv, účty v settings/cash, audit ani schválený rozpočet;
// stará záloha se nejdřív rozdělí do soukromých kolekcí (splitLegacy). Stav a zápis dostává přes kontext C ze storage.js.

// ===== Importy =====
import {APP_NAME} from "../config/team-config.js";
import {clone, csv, downloadFile} from "../core/utils.js";
import {BUDGET_COLL} from "../domain/budget.js";
import {exOf, fxOf} from "../domain/cash.js";
import {splitLegacy} from "../domain/private-data.js";
import {collection as fsCol, getDocs} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ===== Hlavní logika =====
// C = kontext ze storage.js (data, first, kolekce, strážci zápisu, commitOps, přepočet dlužníků). Vrací funkce pro HK.
export function backupApi(C) {
  const {data, first, COLL, FETCH, APP_DOC, PERM_DOC, OLD_MSG, RO_MSG, can, isCash, ro, outdated, say, errTxt, stamp, commitOps, plMerged, rebuildDebtors} = C;
  // Záloha obsahuje jen kolekce, které se v tomto zařízení načetly (asistent tak nezálohuje prázdné předpisy, které by „Nahradit vším“ smazalo);
  // soukromé kolekce attnote, staffpay a plpay jsou v ní, pokud je role smí číst (manager všechny)
  async function exportJSON() {
    const out = {};
    COLL.forEach(c => { if (first[c]) out[c] = data[c]; });
    // Plány tréninků a obrázky cvičení se načtou celé až teď (bez chyby zálohy, když je pravidla nepustí)
    if (can("sport")) for (const c of FETCH) {
      try { const s = await getDocs(fsCol(C.fs(), c)); out[c] = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); } catch (e) { console.warn("Záloha bez " + c + ":", errTxt(e)); }
    }
    downloadFile("hokej-zaloha-" + stamp() + ".json", JSON.stringify({app: "hokej-zapasy", version: 1, exported: new Date().toISOString(), data: out}, null, 1), "application/json");
  }
  function exportCSV() {
    // Koeficient se exportuje v procentech, osvobozená jako ano / prázdné; platební pole z plpay
    const rows = [["Přezdívka", "Číslo", "Pozice", "Alternativní pozice", "Stav", "Skupina plateb", "Osvobozená", "Koeficient (%)", "Poznámka k platbám"], ...Object.values(plMerged()).map(p => [p.name, p.num, p.pos, p.alt, p.st || "act", p.grp || "monthly", exOf(p) ? "ano" : "", String(Math.round(fxOf(p) * 1000) / 10).replace(".", ","), p.note || ""])];
    downloadFile("soupiska-" + stamp() + ".csv", csv(rows), "text/csv");
  }
  // Při „Nahradit vším“ se mažou jen kolekce, které záloha obsahuje (stará záloha bez událostí, docházky, týmu a pokladny je nesmaže).
  // Kolekce audit se přeskakuje: pravidla databáze dovolují jen přidávání, jiný zápis by shodil celou dávku.
  // Brána verze settings/app se ze zálohy neobnovuje ani nemaže (stará záloha nesmí snížit požadovanou verzi; pravidla mazání nedovolí).
  // Matice práv settings/perm se ze zálohy také neobnovuje ani nemaže (je to nastavení týmu, mění ji jen manager v ⚙️ → 🔐 Práva rolí).
  // Účty týmu v settings/cash (iban, iban2 a záznam o jejich změně) se ze zálohy neobnovují – zůstávají aktuální; měnit je jde jen
  // návrhem a potvrzením (vynucují pravidla databáze), jinak by obnova staré zálohy shodila celou dávku nebo podvrhla účet.
  const ACC_KEYS = ["iban", "iban2", "ibanBy", "ibanOk", "ibanAt", "ibanPend"];
  function keepAcc(d) { const o = clone(d), cur = data.settings.cash || {}; ACC_KEYS.forEach(k => { if (cur[k] != null) o[k] = clone(cur[k]); else delete o[k]; }); return o; }
  // Schválený rozpočet (budget/{sezóna}.approved) a úpravy po schválení (rev) zůstávají z databáze: pravidla nedovolí schválenou verzi
  // změnit ani smazat a úpravy zkrátit; obnova přepíše jen pole plánu. Schválený rozpočet se při „Nahradit vším“ nemaže.
  const BUDGET_KEEP = ["approved", "rev"];
  function keepBudget(id, d) { const o = clone(d), cur = data[BUDGET_COLL][id]; if (!cur || !cur.approved) return o; BUDGET_KEEP.forEach(k => { if (cur[k] != null) o[k] = clone(cur[k]); else delete o[k]; }); return o; }
  // Stará záloha (citlivá data ve starých polích) se nejdřív rozdělí do nových kolekcí (splitLegacy) – pravidla databáze stará pole
  // už zapsat nedovolí a dávka by selhala celá. Hodnoty ze zálohy se zapíšou (set) i v nových kolekcích, nová kolekce v záloze má přednost.
  // Vrací počet důvodů, které se nepřevedly (docházka s jiným tvarem id) – volající ho ukáže.
  async function importData(obj, replace) {
    if (!obj || obj.app !== "hokej-zapasy" || !obj.data) throw new Error("Soubor není záloha aplikace " + APP_NAME + ".");
    if (outdated()) throw new Error(OLD_MSG);
    if (ro()) throw new Error(RO_MSG);
    const {data: bk, dropped} = splitLegacy(obj.data);
    const ops = [];
    COLL.forEach(c => {
      if (c === "audit") return;
      const src = bk[c] || {};
      if (replace && bk[c]) Object.keys(data[c]).forEach(id => { if (!(id in src) && !(c === "settings" && (id === "cash" || id === APP_DOC || id === PERM_DOC)) && !(c === BUDGET_COLL && data[c][id].approved)) ops.push(["del", c, id]); });
      Object.entries(src).forEach(([id, d]) => { if (c === "settings" && (id === APP_DOC || id === PERM_DOC)) return; ops.push(["set", c, id, c === "settings" && id === "cash" ? keepAcc(d) : c === BUDGET_COLL ? keepBudget(id, d) : d]); });
    });
    // Plány tréninků a obrázky cvičení: jen doplnit / přepsat ze zálohy (v zařízení nejsou načtené celé, proto se nic nemaže)
    FETCH.forEach(c => Object.entries(bk[c] || {}).forEach(([id, d]) => ops.push(["set", c, id, d])));
    // Předpisy po obnově (pro přepočet souhrnu dlužníků): nahrazení = jen ze zálohy, sloučení = stávající + ze zálohy
    const chSrc = bk.charges, chNew = chSrc ? Object.entries(replace ? chSrc : {...data.charges, ...chSrc}).map(([id, d]) => ({id, ...d})) : null;
    await commitOps(ops);
    // Souhrn dlužníků se ze zálohy neobnovuje, ale přepočítá; chyba (např. nepublikovaná pravidla) obnovu nezruší
    if (chNew && isCash()) { try { await rebuildDebtors(chNew); } catch (e) { say("Data obnovena, ale souhrn dlužníků se nepřepočítal: " + errTxt(e)); } }
    return dropped;
  }
  return {exportJSON, exportCSV, importData};
}
