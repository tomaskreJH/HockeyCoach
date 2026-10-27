// 📉 Audit pokladny na vyžádání: místo poslechu celé kolekce audit (roste s každou akcí pokladny) se poslouchají jen
// záznamy otevřené události (eid) a obecné záznamy bez události (eid "" – změny účtů v nastavení pokladny).
// Výsledky všech poslechů se sčítají do S.au (data/storage.js – where), takže stávající filtry S.au.filter(x => x.eid === …) platí dál.

// ===== Importy =====
import {S} from "../core/state.js";
import {HK} from "../data/storage.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
const COLL = "audit";
const on = new Set();   // hodnoty eid, které se už poslouchají (poslech běží do zavření aplikace)

// ===== Hlavní logika =====
// Spustí poslech záznamů auditu jedné události (eid "" = obecné záznamy); po změně překreslí (redraw, jinak celá aplikace)
export function watchAudit(eid, redraw) {
  if (!S.db || !HK.can("money")) return;
  const k = String(eid == null ? "" : eid);
  if (on.has(k)) return;
  on.add(k);
  S.db.collection(COLL).where("eid", k).onSnapshot(s => {
    S.au = s.docs.map(d => ({id: d.id, ...d.data()}));
    (redraw || render)();
  }, () => { on.delete(k); });   // chyba (práva, offline bez kopie) = příště zkusit znovu
}

// ===== Exporty =====
// (exportovaná funkce je označená u definice výše)
