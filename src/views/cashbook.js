// ⚠️ Pokladna (Team → 🏦 Pokladna, správce pokladny): zůstatek, vklady a výdaje, součty podle kategorií, pohyby se stornem.
// cash (S.cs) = {d, k:"in"|"out", amt, cat, mid?, cid?, eid?, note, vs?, acc?, by}; u pohybu zpráva, VS a účet (starší úhrady je vezmou z předpisu).
// Storno pohybu s předpisem (cid) vrátí zaplacenou částku, zapíše audit i debtors/{mid} v téže dávce.
// ===== Importy =====
import {confirm2, strip} from "../core/actions.js";
import {pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, fd, td, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {ACC, accName, cashAcc, cashCfg, catSums, chargeMsg, isDay, kc, r2, sumCash, twoAcc} from "../domain/cash.js";
import {applyDebtors, debtorPlanFor} from "../domain/debtors.js";
import {render} from "./shell.js";

// ===== Stav (jen pro tuto obrazovku) =====
let f = null;      // rozpracovaný vklad / výdaj
let ft = "all";    // filtr typu: all | in | out
let fc = "";       // filtr kategorie (prázdné = všechny)
let fa = "";       // filtr účtu: "" = oba, main | op (jen při dvou účtech)
let lim = 50;      // počet zobrazených pohybů

// ===== Pomocné funkce =====
const email = () => { const u = HK.user(); return (u && u.email) || ""; };
const catOf = x => x.cat || "Bez kategorie";
// Za co je pohyb: VS a zpráva. Úhrada předpisu bez uložené zprávy (starší data) ji převezme z předpisu.
function about(x) {
  const c = x.cid ? S.ch.find(y => y.id === x.cid) : null;
  const vs = x.vs || (c && c.vs) || "";
  let note = x.note || "";
  if (x.cid && !x.vs && c) note = [chargeMsg(c, S), note].filter(Boolean).join(" · ");
  return {vs, note};
}
// Nový formulář: vklady mají výchozí kategorii „Vklady / dary“, výdaje první kategorii výdajů
function openForm(k) {
  const cfg = cashCfg(S.cc), cats = cfg.cats[k];
  f = {k, d: td(), amt: "", cat: k === "in" ? (cats.includes("Vklady / dary") ? "Vklady / dary" : cats[0] || "") : cats[0] || "", note: "", acc: fa || "main"};
}
// Storno pohybu: smaže pohyb, případně vrátí zaplacenou částku na předpisu, a zapíše audit (vše v jedné dávce)
function storno(x) {
  const b = S.db.batch();
  b.delete("cash/" + x.id);
  const c = x.cid && S.ch.find(y => y.id === x.cid);
  if (c) {
    const d = {...strip(c), paid: Math.max(0, r2((+c.paid || 0) - (+x.amt || 0)))};
    b.set("charges/" + c.id, d);
    applyDebtors(b, debtorPlanFor(S.ch, [{id: c.id, d}], [], mid => S.tr.some(t => t.id === mid)));   // vrácená úhrada může znovu vytvořit dluh
  }
  b.set("audit/" + uid(), {ts: new Date().toISOString(), by: email(), eid: x.eid || "", act: "storno", note: (x.k === "in" ? "příjem " : "výdaj ") + kc(+x.amt || 0) + " · " + catOf(x)});
  b.commit();
  toast("Pohyb stornován");
}

// ===== Vykreslení =====
export function cashbookHtml() {
  if (!HK.can("money")) return "";
  const cfg = cashCfg(S.cc), two = twoAcc(cfg), T = sumCash(S.cs), C = catSums(S.cs);
  if (!two) fa = "";
  const err = S.payErr ? `<div class="cd" style="color:var(--no)">Pokladnu se nepodařilo načíst (${esc(S.payErr)}). Zkontroluj pravidla databáze (firestore.rules).</div>` : "";

  // Souhrn a tlačítka
  const grid = `<div class="grid3"><div class="stat"><b style="color:${T.bal < 0 ? "var(--no)" : "var(--ok)"}">${kc(T.bal)}</b>zůstatek</div><div class="stat"><b>${kc(T.in)}</b>příjmy</div><div class="stat"><b>${kc(T.out)}</b>výdaje</div></div>`;
  // Zůstatky jednotlivých účtů (jen při dvou různých účtech) – pro kontrolu s výpisy z banky
  const accs = two ? `<div class="cd"><h2>Účty</h2>${Object.keys(ACC).map(a => { const t = sumCash(S.cs, cfg, a); return `<div class="it" style="cursor:default"><div><b>${esc(ACC[a])}</b><div class="mu">${esc(a === "op" ? cfg.iban2 : cfg.iban)} · příjmy ${kc(t.in)} · výdaje ${kc(t.out)}</div></div><b style="color:${t.bal < 0 ? "var(--no)" : "var(--ok)"}">${kc(t.bal)}</b></div>`; }).join("")}</div>` : "";
  const add = `<div class="row" style="margin-bottom:12px"><button class="p" data-cba="in">➕ Vklad / příjem</button><button class="s" data-cba="out">➖ Výdaj</button></div>`;

  // Formulář nového pohybu
  let form = "";
  if (f) {
    const cats = [...new Set([...cfg.cats[f.k], f.cat].filter(Boolean))];
    form = `<div class="cd" id="cbf"><h2>${f.k === "in" ? "➕ Vklad / příjem" : "➖ Výdaj"}</h2>
<label>Datum</label><input type="date" data-cf="d" value="${esc(f.d)}">
<label>Částka (Kč)</label><input type="number" min="0" step="0.01" inputmode="decimal" data-cf="amt" value="${esc(f.amt)}" style="max-width:200px">
${two ? `<label>Účet</label><div class="chips">${Object.entries(ACC).map(([a, t]) => `<button class="chip ${f.acc === a ? "on" : ""}" data-cfa="${a}">${t}</button>`).join("")}</div>` : ""}
<label>Kategorie (spravuje se v ⚙️ → Nastavení pokladny)</label><select data-cf="cat">${cats.map(c => `<option ${c === f.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
<label>Poznámka</label><input data-cf="note" value="${esc(f.note)}" placeholder="např. faktura, dar od …">
<div class="row"><button class="p" id="cbs" style="min-height:52px">Uložit</button><button class="s" id="cbc" style="min-height:52px">Zrušit</button></div></div>`;
  }

  // Součty podle kategorií
  const catBlock = k => {
    const e = Object.entries(C[k]).sort((a, b) => b[1] - a[1]);
    return e.length ? e.map(([c, v]) => `<div class="it" style="cursor:default"><span>${esc(c)}</span><b>${kc(v)}</b></div>`).join("") : '<div class="mu">Zatím nic.</div>';
  };
  const sums = `<div class="cd"><h2>Příjmy podle kategorií</h2>${catBlock("in")}</div><div class="cd"><h2>Výdaje podle kategorií</h2>${catBlock("out")}</div>`;

  // Seznam pohybů s filtry
  const cats = [...new Set(S.cs.filter(x => x.k === "in" || x.k === "out").map(catOf))].sort((a, b) => a.localeCompare(b, "cs"));
  if (fc && !cats.includes(fc)) fc = "";
  const rows = S.cs.filter(x => (x.k === "in" || x.k === "out") && (ft === "all" || x.k === ft) && (!fc || catOf(x) === fc) && (!fa || cashAcc(x, cfg) === fa))
    .sort((a, b) => (b.d || "").localeCompare(a.d || ""));
  const shown = rows.slice(0, lim);
  const chipsT = `<div class="chips">${[["all", "Vše"], ["in", "Příjmy"], ["out", "Výdaje"]].map(([k, t]) => `<button class="chip ${ft === k ? "on" : ""}" data-ct="${k}">${t}</button>`).join("")}</div>`;
  const chipsA = two ? `<div class="chips"><button class="chip ${fa ? "" : "on"}" data-cfl="">Oba účty</button>${Object.entries(ACC).map(([a, t]) => `<button class="chip ${fa === a ? "on" : ""}" data-cfl="${a}">${t}</button>`).join("")}</div>` : "";
  const chipsC = cats.length ? `<div class="chips"><button class="chip ${fc ? "" : "on"}" data-cc="">Všechny kategorie</button>${cats.map(c => `<button class="chip ${fc === c ? "on" : ""}" data-cc="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : "";
  const list = shown.length ? shown.map(x => {
    const key = "cb" + x.id, nm = pn(x.mid, {staff: true, fb: ""}), arm = S.cf === key, ab = about(x);
    const det = [ab.vs ? "VS " + esc(ab.vs) : "", ab.note ? esc(ab.note) : "", two ? esc(accName(cfg, cashAcc(x, cfg))) : ""].filter(Boolean).join(" · ");
    return `<div class="ev" style="align-items:center"><div class="t">${x.d ? fd(x.d) : "–"}</div><div class="b">${esc(catOf(x))}${nm ? " · " + nm : ""}${det ? `<div class="mu">${det}</div>` : ""}</div><b style="color:${x.k === "in" ? "var(--ok)" : "var(--no)"};white-space:nowrap">${x.k === "in" ? "+" : "−"}${kc(+x.amt || 0)}</b><button class="d" data-cbd="${x.id}" title="Stornovat pohyb" style="padding:8px 10px;${arm ? "background:var(--no);color:#fff" : ""}">${arm ? "Storno?" : "🗑"}</button></div>`;
  }).join("") : '<div class="msg">Žádné pohyby.</div>';
  const more = rows.length > lim ? `<button class="s w" data-cbm style="margin-top:8px">Zobrazit další (${rows.length - lim})</button>` : "";
  const moves = `<div class="cd"><h2>Pohyby (${rows.length})</h2>${chipsA}${chipsT}${chipsC}${list}${more}<div class="mu" style="margin-top:8px">🗑 stornuje pohyb. U úhrady předpisu se vrátí zaplacená částka na předpisu a předpis je znovu k úhradě.</div></div>`;

  return err + grid + accs + add + form + sums + moves;
}

// ===== Eventy =====
export function bindCashbook(a) {
  if (!HK.can("money")) return;
  const q = s => a.querySelectorAll(s);
  // Přepsání polí formuláře do stavu (před každým překreslením)
  const sync = () => q("[data-cf]").forEach(i => { if (f) f[i.dataset.cf] = i.value; });
  q("[data-cba]").forEach(b => b.onclick = () => { sync(); openForm(b.dataset.cba); render(); });
  q("[data-ct]").forEach(b => b.onclick = () => { sync(); ft = b.dataset.ct; lim = 50; render(); });
  q("[data-cc]").forEach(b => b.onclick = () => { sync(); fc = b.dataset.cc; lim = 50; render(); });
  q("[data-cfl]").forEach(b => b.onclick = () => { sync(); fa = b.dataset.cfl; lim = 50; render(); });
  q("[data-cfa]").forEach(b => b.onclick = () => { sync(); if (f) f.acc = b.dataset.cfa; render(); });
  q("[data-cbm]").forEach(b => b.onclick = () => { sync(); lim += 50; render(); });
  const cx = a.querySelector("#cbc");
  if (cx) cx.onclick = () => { f = null; render(); };
  // Uložení nového pohybu
  const cs = a.querySelector("#cbs");
  if (cs) cs.onclick = () => {
    sync();
    const amt = r2(+String(f.amt).replace(",", "."));
    if (!(amt > 0)) return toast("Zadej kladnou částku");
    if (!isDay(f.d)) return toast("Zadej datum");
    if (!f.cat) return toast("Vyber kategorii");
    S.db.doc("cash/" + uid()).set({d: f.d, k: f.k, amt, cat: f.cat, note: (f.note || "").trim(), acc: twoAcc(cashCfg(S.cc)) ? f.acc || "main" : "main", by: email()}).catch(() => toast("Uložení se nepovedlo"));
    toast(f.k === "in" ? "Vklad zapsán" : "Výdaj zapsán");
    f = null;
    render();
  };
  // Storno: potvrzení druhým klepnutím
  q("[data-cbd]").forEach(b => b.onclick = () => {
    sync();
    const id = b.dataset.cbd, key = "cb" + id, x = S.cs.find(y => y.id === id);
    if (!x) return;
    confirm2(key, () => storno(x));
  });
}
