// Testy v22.31 (K2 bod 7 Pokladna): ➖ výdaj předvyplní kategorii, příjemce a účet posledního ručně zapsaného výdaje (lastOutPrefill).
import test from "node:test";
import assert from "node:assert/strict";
import {lastOutPrefill} from "../src/domain/cash.js";

// ===== lastOutPrefill =====
test("lastOutPrefill: poslední výdaj podle data (při shodě později zapsaný), bez platů a úhrad", () => {
  const cats = ["Pronájem ledu", "Rozhodčí", "Platy"];
  const cs = [
    {d: "2026-10-01", k: "out", cat: "Rozhodčí", payee: "Svaz", acc: "main"},
    {d: "2026-10-20", k: "out", cat: "Pronájem ledu", payee: "Zimní stadion", acc: "op"},
    {d: "2026-10-20", k: "in", cat: "Vklady / dary", amt: 500},
    {d: "2026-10-25", k: "out", cat: "Platy", mid: "t1", acc: "main"},
    {d: "2026-10-26", k: "in", cid: "c1", amt: 150}
  ];
  assert.deepEqual(lastOutPrefill(cs, cats), {cat: "Pronájem ledu", payee: "Zimní stadion", acc: "op"});
  cs.push({d: "2026-10-20", k: "out", cat: "Rozhodčí", payee: " Svaz ", acc: "x"});
  assert.deepEqual(lastOutPrefill(cs, cats), {cat: "Rozhodčí", payee: "Svaz", acc: "main"}, "stejné datum – později zapsaný; neznámý účet = hlavní");
});
test("lastOutPrefill: kategorie mimo nastavení se nepřebírá; bez výdajů null", () => {
  assert.deepEqual(lastOutPrefill([{d: "2026-10-01", k: "out", cat: "Stará kategorie", payee: "X"}], ["Led"]), {cat: "", payee: "X", acc: "main"});
  assert.equal(lastOutPrefill([], ["Led"]), null);
  assert.equal(lastOutPrefill(null, null), null);
});
