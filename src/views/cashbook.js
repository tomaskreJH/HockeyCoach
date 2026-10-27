// ⚠️ Pokladna (Team → 🏦 Pokladna, správce pokladny): zůstatek, vklady, výdaje a 🔁 převody mezi vlastními účty, součty podle kategorií, pohyby se stornem.
// cash (S.cs) = {d, k:"in"|"out"|"tr", amt, cat, mid?, cid?, eid?, note, vs?, acc?, payee?, pym?, from?, to?, by}; výdaj nese příjemce (payee)
// a měsíc, za který se platí (pym – např. led účtovaný zpětně), převod účty from → to. Storno pohybu s předpisem (cid) vrátí zaplacenou částku,
// zapíše audit i debtors/{mid} v téže dávce. Výdaj z 🧾 Náklady se předvyplní přes openOut().
// ===== Importy =====
import {confirm2, strip} from "../core/actions.js";
import {pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, fd, td, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {ACC, TR, accLabel, accName, cashAcc, cashCfg, catSums, chargeMsg, isDay, kc, r2, sumCash, trCheck, trFrom, trTo, twoAcc, ymOk, ymShort} from "../domain/cash.js";
import {applyDebtors, debtorPlanFor} from "../domain/debtors.js";
import {render} from "./shell.js";

// ===== Stav (jen pro tuto obrazovku) =====
let f = null;      // rozpracovaný vklad / výdaj / převod
let ft = "all";    // filtr typu: all | in | out | tr
let fc = "";       // filtr kategorie (prázdné = všechny)
let fa = "";       // filtr účtu: "" = oba, main | op (jen při dvou účtech)
let lim = 50;      // počet zobrazených pohybů

// ===== Pomocné funkce =====
const email = () => { const u = HK.user(); return (u && u.email) || ""; };
const catOf = x => x.cat || "Bez kategorie";
const isTr = x => x.k === TR;
// Pohyb patří do seznamu (příjem, výdaj, převod)
const listed = x => x.k === "in" || x.k === "out" || isTr(x);
// Pohyb na účtu (převod patří oběma účtům)
const onAcc = (x, cfg, a) => (isTr(x) ? trFrom(x) === a || trTo(x) === a : cashAcc(x, cfg) === a);
// Za co je pohyb: VS a zpráva. Úhrada předpisu bez uložené zprávy (starší data) ji převezme z předpisu; výdaj doplní příjemce a měsíc.
function about(x) {
  const c = x.cid ? S.ch.find(y => y.id === x.cid) : null;
  const vs = x.vs || (c && c.vs) || "";
  let note = x.note || "";
  if (x.cid && !x.vs && c) note = [chargeMsg(c, S), note].filter(Boolean).join(" · ");
  const extra = [x.payee ? esc(x.payee) : "", ymOk(x.pym) ? "za " + ymShort(x.pym) : ""].filter(Boolean).join(" · ");
  return {vs, note, extra};
}
// Známí příjemci výdajů (šablony, náklady událostí, dřívější výdaje) pro nabídku při psaní
function payees(cfg) {
  const s = new Set();
  Object.values(cfg.tpls || {}).forEach(t => (t.cost || []).forEach(x => { if (x.payee) s.add(String(x.payee).trim()); }));
  (S.ec || []).forEach(e => (e.cost || []).forEach(x => { if (x.payee) s.add(String(x.payee).trim()); }));
  (S.cs || []).forEach(x => { if (x.k === "out" && x.payee) s.add(String(x.payee).trim()); });
  return [...s].filter(Boolean).sort((a, b) => a.localeCompare(b, "cs"));
}
// Nový formulář: vklady mají výchozí kategorii „Vklady / dary“, výdaje první kategorii výdajů; převod z hlavního na provozní
function openForm(k) {
  const cfg = cashCfg(S.cc), cats = cfg.cats[k === "in" ? "in" : "out"];
  if (k === TR) { f = {k, d: td(), amt: "", from: fa || "main", to: fa === "op" ? "main" : "op", note: ""}; return; }
  f = {k, d: td(), amt: "", cat: k === "in" ? (cats.includes("Vklady / dary") ? "Vklady / dary" : cats[0] || "") : cats[0] || "", note: "", acc: fa || "main", payee: "", pym: ""};
}
// Předvyplněný výdaj (z 🧾 Náklady): kategorie, příjemce, měsíc a částka; obrazovka se pak přepne na 🏦 Pokladna
export function openOut(pre) {
  openForm("out");
  const p = pre || {};
  if (p.cat) f.cat = p.cat;
  if (p.payee) f.payee = p.payee;
  if (ymOk(p.pym)) f.pym = p.pym;
  if (+p.amt > 0) f.amt = String(r2(+p.amt));
  if (p.acc === "main" || p.acc === "op") f.acc = p.acc;
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
  const what = isTr(x) ? "převod " + ACC[trFrom(x)] + " → " + ACC[trTo(x)] + " " + kc(+x.amt || 0) : (x.k === "in" ? "příjem " : "výdaj ") + kc(+x.amt || 0) + " · " + catOf(x);
  b.set("audit/" + uid(), {ts: new Date().toISOString(), by: email(), eid: x.eid || "", act: "storno", note: what});
  b.commit();
  toast("Pohyb stornován");
}

// ===== Vykreslení =====
// Formulář převodu mezi vlastními účty (cílový účet je vždy ten druhý)
function trFormHtml() {
  return `<div class="cd" id="cbf"><h2>🔁 Převod mezi vlastními účty</h2><div class="mu" style="margin-bottom:6px">Převod nemění příjmy ani výdaje týmu, jen zůstatky účtů.</div>
<label>Z účtu</label><div class="chips">${Object.entries(ACC).map(([a, t]) => `<button class="chip ${f.from === a ? "on" : ""}" data-cft="${a}">${t}</button>`).join("")}</div>
<div class="mu" style="margin-bottom:6px">Na účet: <b>${esc(ACC[f.to])}</b></div>
<label>Datum převodu</label><input type="date" data-cf="d" value="${esc(f.d)}">
<label>Částka (Kč)</label><input type="number" min="0" step="0.01" inputmode="decimal" data-cf="amt" value="${esc(f.amt)}" style="max-width:200px">
<label>Poznámka</label><input data-cf="note" value="${esc(f.note)}" placeholder="např. doplnění provozního účtu na led">
<div class="row"><button class="p" id="cbs" style="min-height:52px">Uložit převod</button><button class="s" id="cbc" style="min-height:52px">Zrušit</button></div></div>`;
}
// Formulář vkladu / výdaje; výdaj má navíc příjemce a měsíc, za který se platí
function moveFormHtml(cfg, two) {
  const cats = [...new Set([...cfg.cats[f.k], f.cat].filter(Boolean))], out = f.k === "out";
  const pList = out ? payees(cfg) : [];
  const outFields = out ? `<label>Komu (příjemce)</label><input data-cf="payee" list="cbpl" value="${esc(f.payee || "")}" placeholder="např. Zimní stadion">${pList.length ? `<datalist id="cbpl">${pList.map(p => `<option value="${esc(p)}">`).join("")}</datalist>` : ""}
<label>Za měsíc (nepovinné)</label><input type="month" data-cf="pym" value="${esc(f.pym || "")}" style="max-width:220px"><div class="mu" style="margin:-4px 0 8px">Led účtovaný zpětně: zvol měsíc, za který platíš – 🧾 Náklady ho spárují s událostmi toho měsíce.</div>` : "";
  return `<div class="cd" id="cbf"><h2>${out ? "➖ Výdaj" : "➕ Vklad / příjem"}</h2>
<label>Datum platby</label><input type="date" data-cf="d" value="${esc(f.d)}">
<label>Částka (Kč)</label><input type="number" min="0" step="0.01" inputmode="decimal" data-cf="amt" value="${esc(f.amt)}" style="max-width:200px">
${two ? `<label>Účet</label><div class="chips">${Object.entries(ACC).map(([a, t]) => `<button class="chip ${f.acc === a ? "on" : ""}" data-cfa="${a}">${t}</button>`).join("")}</div>` : ""}
<label>Kategorie (spravuje se v ⚙️ → Nastavení pokladny)</label><select data-cf="cat">${cats.map(c => `<option ${c === f.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
${outFields}<label>Poznámka</label><input data-cf="note" value="${esc(f.note)}" placeholder="např. faktura, dar od …">
<div class="row"><button class="p" id="cbs" style="min-height:52px">Uložit</button><button class="s" id="cbc" style="min-height:52px">Zrušit</button></div></div>`;
}
// Řádek pohybu v seznamu (převod: šipka mezi účty, se zvoleným účtem znaménko podle směru)
function rowHtml(x, cfg, two) {
  const key = "cb" + x.id, arm = S.cf === key, del = `<button class="d" data-cbd="${x.id}" title="Stornovat pohyb" style="padding:8px 10px;${arm ? "background:var(--no);color:#fff" : ""}">${arm ? "Storno?" : "🗑"}</button>`;
  if (isTr(x)) {
    const sign = fa ? (trFrom(x) === fa ? "−" : "+") : "", col = fa ? (trFrom(x) === fa ? "var(--no)" : "var(--ok)") : "var(--a2)";
    return `<div class="ev" style="align-items:center"><div class="t">${x.d ? fd(x.d) : "–"}</div><div class="b">🔁 Převod ${esc(ACC[trFrom(x)])} → ${esc(ACC[trTo(x)])}${x.note ? `<div class="mu">${esc(x.note)}</div>` : ""}</div><b style="color:${col};white-space:nowrap">${sign}${kc(+x.amt || 0)}</b>${del}</div>`;
  }
  const nm = pn(x.mid, {staff: true, fb: ""}), ab = about(x);
  const det = [ab.extra, ab.vs ? "VS " + esc(ab.vs) : "", ab.note ? esc(ab.note) : "", two ? esc(accName(cfg, cashAcc(x, cfg))) : ""].filter(Boolean).join(" · ");
  return `<div class="ev" style="align-items:center"><div class="t">${x.d ? fd(x.d) : "–"}</div><div class="b">${esc(catOf(x))}${nm ? " · " + nm : ""}${det ? `<div class="mu">${det}</div>` : ""}</div><b style="color:${x.k === "in" ? "var(--ok)" : "var(--no)"};white-space:nowrap">${x.k === "in" ? "+" : "−"}${kc(+x.amt || 0)}</b>${del}</div>`;
}
export function cashbookHtml() {
  if (!HK.can("money")) return "";
  const cfg = cashCfg(S.cc), two = twoAcc(cfg), T = sumCash(S.cs), C = catSums(S.cs);
  if (!two) { fa = ""; if (ft === "tr") ft = "all"; if (f && f.k === TR) f = null; }
  const err = S.payErr ? `<div class="cd" style="color:var(--no)">Pokladnu se nepodařilo načíst (${esc(S.payErr)}). Zkontroluj pravidla databáze (firestore.rules).</div>` : "";

  // Souhrn a tlačítka
  const grid = `<div class="grid3"><div class="stat"><b style="color:${T.bal < 0 ? "var(--no)" : "var(--ok)"}">${kc(T.bal)}</b>zůstatek</div><div class="stat"><b>${kc(T.in)}</b>příjmy</div><div class="stat"><b>${kc(T.out)}</b>výdaje</div></div>`;
  // Zůstatky jednotlivých účtů (jen při dvou různých účtech) – pro kontrolu s výpisy z banky; převody zvlášť
  const accs = two ? `<div class="cd"><h2>Účty</h2>${Object.keys(ACC).map(a => { const t = sumCash(S.cs, cfg, a), trs = t.tr.in || t.tr.out ? ` · převody +${kc(t.tr.in)} / −${kc(t.tr.out)}` : ""; return `<div class="it" style="cursor:default"><div><b>${esc(accLabel(cfg, a))}</b><div class="mu">příjmy ${kc(t.in)} · výdaje ${kc(t.out)}${trs}</div></div><b style="color:${t.bal < 0 ? "var(--no)" : "var(--ok)"}">${kc(t.bal)}</b></div>`; }).join("")}</div>` : "";
  const add = `<div class="row" style="margin-bottom:12px"><button class="p" data-cba="in">➕ Vklad / příjem</button><button class="s" data-cba="out">➖ Výdaj</button>${two ? `<button class="s" data-cba="${TR}">🔁 Převod</button>` : ""}</div>`;

  // Formulář nového pohybu
  const form = f ? (f.k === TR ? trFormHtml() : moveFormHtml(cfg, two)) : "";

  // Součty podle kategorií
  const catBlock = k => {
    const e = Object.entries(C[k]).sort((a, b) => b[1] - a[1]);
    return e.length ? e.map(([c, v]) => `<div class="it" style="cursor:default"><span>${esc(c)}</span><b>${kc(v)}</b></div>`).join("") : '<div class="mu">Zatím nic.</div>';
  };
  const sums = `<div class="cd"><h2>Příjmy podle kategorií</h2>${catBlock("in")}</div><div class="cd"><h2>Výdaje podle kategorií</h2>${catBlock("out")}</div>`;

  // Seznam pohybů s filtry (převod nemá kategorii – při filtru kategorie se skryje)
  const cats = [...new Set(S.cs.filter(x => x.k === "in" || x.k === "out").map(catOf))].sort((a, b) => a.localeCompare(b, "cs"));
  if (fc && !cats.includes(fc)) fc = "";
  const rows = S.cs.filter(x => listed(x) && (ft === "all" || x.k === ft) && (!fc || (!isTr(x) && catOf(x) === fc)) && (!fa || onAcc(x, cfg, fa)))
    .sort((a, b) => (b.d || "").localeCompare(a.d || ""));
  const shown = rows.slice(0, lim);
  const types = [["all", "Vše"], ["in", "Příjmy"], ["out", "Výdaje"], ...(two ? [[TR, "Převody"]] : [])];
  const chipsT = `<div class="chips">${types.map(([k, t]) => `<button class="chip ${ft === k ? "on" : ""}" data-ct="${k}">${t}</button>`).join("")}</div>`;
  const chipsA = two ? `<div class="chips"><button class="chip ${fa ? "" : "on"}" data-cfl="">Oba účty</button>${Object.entries(ACC).map(([a, t]) => `<button class="chip ${fa === a ? "on" : ""}" data-cfl="${a}">${t}</button>`).join("")}</div>` : "";
  const chipsC = cats.length ? `<div class="chips"><button class="chip ${fc ? "" : "on"}" data-cc="">Všechny kategorie</button>${cats.map(c => `<button class="chip ${fc === c ? "on" : ""}" data-cc="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : "";
  const list = shown.length ? shown.map(x => rowHtml(x, cfg, two)).join("") : '<div class="msg">Žádné pohyby.</div>';
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
  // Převod: volba zdrojového účtu, cílový je ten druhý
  q("[data-cft]").forEach(b => b.onclick = () => { sync(); if (f) { f.from = b.dataset.cft; f.to = f.from === "main" ? "op" : "main"; } render(); });
  q("[data-cbm]").forEach(b => b.onclick = () => { sync(); lim += 50; render(); });
  const cx = a.querySelector("#cbc");
  if (cx) cx.onclick = () => { f = null; render(); };
  // Uložení nového pohybu (převod, nebo vklad / výdaj)
  const cs = a.querySelector("#cbs");
  if (cs) cs.onclick = () => {
    sync();
    const cfg = cashCfg(S.cc);
    if (f.k === TR) {
      const r = trCheck(f, twoAcc(cfg));
      if (r.err) return toast(r.err);
      S.db.doc("cash/" + uid()).set({d: f.d, k: TR, amt: r.amt, from: f.from, to: f.to, note: (f.note || "").trim(), by: email()}).catch(() => toast("Uložení se nepovedlo"));
      toast("Převod zapsán");
      f = null;
      render();
      return;
    }
    const amt = r2(+String(f.amt).replace(",", "."));
    if (!(amt > 0)) return toast("Zadej kladnou částku");
    if (!isDay(f.d)) return toast("Zadej datum");
    if (!f.cat) return toast("Vyber kategorii");
    const d = {d: f.d, k: f.k, amt, cat: f.cat, note: (f.note || "").trim(), acc: twoAcc(cfg) ? f.acc || "main" : "main", by: email()};
    // Výdaj: příjemce a měsíc, za který se platí, jen když jsou vyplněné (data se jen přidávají)
    if (f.k === "out" && String(f.payee || "").trim()) d.payee = String(f.payee).trim().slice(0, 80);
    if (f.k === "out" && ymOk(f.pym)) d.pym = f.pym;
    S.db.doc("cash/" + uid()).set(d).catch(() => toast("Uložení se nepovedlo"));
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
