// Nastavení pokladny (trenér a pokladník): IBAN, příspěvek, splatnosti, kategorie a šablony událostí. Ukládá se do settings/cash.
// v17.7: dva účty – hlavní (iban) a provozní (iban2, nepovinný); na který účet se platí příspěvky (acc.contrib) a výchozí účet každé šablony (t.acc).
// Struktura: Importy -> Stav -> Pomocné funkce -> Vykreslení -> Eventy -> Export.
// Celoobrazovkové okno #cset se vytváří za běhu (stejně jako nápověda), otevírá se z ⚙️ (HK.openCash).

// ===== Importy =====
import {S} from "../core/state.js";
import {clone, esc, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {ACC, WHO, cashCfg} from "../domain/cash.js";

// ===== Stav =====
let D = null;        // rozpracované nastavení
let sel = "train";   // vybraná šablona
let arm = false;     // potvrzení smazání šablony

// ===== Pomocné funkce =====
const el = () => document.getElementById("cset");
// Zápis hodnoty pole do rozpracovaného nastavení; cesta "t.…" míří do vybrané šablony
function setP(i) {
  const ks = i.dataset.f.split(".");
  let o = D;
  if (ks[0] === "t") { o = D.tpls[sel]; ks.shift(); }
  while (ks.length > 1) o = o[ks.shift()];
  o[ks[0]] = i.dataset.n === "nul" ? (i.value === "" ? null : +i.value) : i.dataset.n != null ? (+i.value || 0) : i.value.trim();
}
const sync = e => e.querySelectorAll("[data-f]").forEach(setP);
const chip = (on, attr, label) => `<button class="chip ${on ? "on" : ""}" ${attr}>${label}</button>`;
const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;

// ===== Vykreslení =====
function html() {
  const t = D.tpls[sel], keys = Object.keys(D.tpls);
  const cats = k => `<div class="chips">${D.cats[k].map((c, i) => chip(false, `data-rc="${k}|${i}"`, esc(c) + " ✕")).join("")}</div><div class="row" style="flex-wrap:nowrap"><input id="nc${k}" placeholder="Nová kategorie" style="margin:0"><button class="s" data-ra="${k}" style="flex:none">Přidat</button></div>`;
  const catOpts = v => [...new Set([...D.cats.out, v].filter(Boolean))].map(c => `<option ${c === v ? "selected" : ""}>${esc(c)}</option>`).join("");
  const cost = t.cost.map((x, i) => `<div class="row" style="flex-wrap:nowrap;align-items:center;margin-bottom:6px"><select data-f="t.cost.${i}.cat" style="margin:0">${catOpts(x.cat)}</select><input data-f="t.cost.${i}.payee" value="${esc(x.payee || "")}" placeholder="Komu" style="margin:0"><input data-f="t.cost.${i}.amt" data-n="1" type="number" min="0" value="${x.amt || ""}" placeholder="Kč" style="margin:0;max-width:90px"><button class="d" data-cr="${i}" style="flex:none;padding:8px 12px">🗑</button></div>`).join("");
  const who = Object.keys(WHO).map(g => {
    // Všechny skupiny včetně osvobozených mají stejné volby (platí / neplatí, výpočet / pevná částka)
    const w = t.who[g] || {pays: false, mode: "calc", flat: 0};
    return `<div class="cd" style="padding:10px;margin-bottom:8px"><b>${WHO[g]}</b><div class="chips" style="margin-top:6px">${chip(w.pays, `data-wp="${g}"`, w.pays ? "Platí: ANO" : "Platí: NE")}${chip(w.mode !== "flat", `data-wm="${g}|calc"`, "Výpočet")}${chip(w.mode === "flat", `data-wm="${g}|flat"`, "Pevná částka")}</div>${w.mode === "flat" ? `<input data-f="t.who.${g}.flat" data-n="1" type="number" min="0" value="${w.flat || ""}" placeholder="Kč na osobu (před koeficientem)" style="max-width:200px;margin:0">` : ""}</div>`;
  }).join("");
  return `<div style="max-width:800px;margin:0 auto"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px"><h2 style="margin:0">💰 Nastavení pokladny</h2><button class="s" id="csx">Zavřít</button></div>
<div class="cd"><h2>Obecné</h2><label>Hlavní účet – IBAN (pro QR platby)</label><input data-f="iban" value="${esc(D.iban)}" placeholder="CZ00 0000 0000 0000 0000 0000"><label>Provozní účet – IBAN (nepovinné; prázdné = vše na hlavní účet)</label><input data-f="iban2" value="${esc(D.iban2)}" placeholder="CZ00 0000 0000 0000 0000 0000"><label>Příspěvky se platí na</label><div class="chips">${Object.entries(ACC).map(([a, t]) => chip(D.acc.contrib === a, `data-ac="${a}"`, t)).join("")}</div><div class="mu" style="margin-bottom:6px">Platby na různé účty hráčka nesmí sloučit do jednoho převodu; souhrnná platba (jeden QR) jde jen za předpisy na stejný účet.</div><label>Měsíční příspěvek (Kč, jedna částka pro všechny; individuálně přes koeficient hráčky v %)</label><input data-f="contrib" data-n="1" type="number" min="0" value="${D.contrib || ""}" style="max-width:160px"><div class="row"><div><label>Splatnost události: dnů po události</label><input data-f="due.ev" data-n="1" type="number" min="0" value="${D.due.ev}"></div><div><label>Splatnost příspěvku: den v měsíci (předem)</label><input data-f="due.cm" data-n="1" type="number" min="1" max="28" value="${D.due.cm}"></div></div></div>
<div class="cd"><h2>Kategorie příjmů</h2>${cats("in")}</div><div class="cd"><h2>Kategorie výdajů</h2>${cats("out")}</div>
<div class="cd"><h2>Šablony událostí</h2><div class="chips">${keys.map(k => chip(k === sel, `data-tp="${k}"`, esc(D.tpls[k].name))).join("")}</div>
<label>Název šablony</label><input data-f="t.name" value="${esc(t.name)}"><label>Platby za událost na účet</label><div class="chips">${Object.entries(ACC).map(([a, n]) => chip((t.acc || "op") === a, `data-ta="${a}"`, n)).join("")}</div><label>Splatnost: dnů po události (prázdné = výchozí)</label><input data-f="t.dueDays" data-n="nul" type="number" min="0" value="${t.dueDays != null ? t.dueDays : ""}" style="max-width:160px">
<h3>Náklady</h3>${cost || '<div class="mu" style="margin-bottom:6px">Bez nákladů (doplní se u konkrétní události).</div>'}<button class="s" data-ca style="margin-bottom:10px">+ Nákladová položka</button>
<h3>Kdo platí a jak se počítá</h3><div class="mu" style="margin-bottom:6px">Cena se dělí všemi přihlášenými hráčkami (každá jako jeden celý kus) a násobí koeficientem hráčky. Osvobozené (zvýhodněné) hráčky mají vlastní nastavení.</div>${who}
<div class="row"><button class="s" data-tn>+ Nová šablona (kopie této)</button>${sel.startsWith("t_") ? `<button class="d" data-td style="${arm ? "background:var(--no);color:#fff" : ""}">${arm ? "Opravdu smazat? Klepni znovu" : "Smazat šablonu"}</button>` : ""}</div></div>
<button class="p w" id="css" style="min-height:52px">💾 Uložit nastavení</button><button class="s w" id="csx2" style="margin-top:10px;min-height:48px">Zavřít bez uložení</button></div>`;
}

// ===== Eventy =====
function draw() {
  const e = el(), st = e.scrollTop;
  e.innerHTML = html();
  bind(e);
  e.scrollTop = st;
}
function bind(e) {
  const q = s => e.querySelectorAll(s), close = () => { e.style.display = "none"; e.innerHTML = ""; D = null; };
  const act = (s, fn) => q(s).forEach(b => { b.onclick = () => { sync(e); arm = false; fn(b); draw(); }; });
  q("[data-f]").forEach(i => { i.onchange = () => { sync(e); draw(); }; });
  act("[data-tp]", b => { sel = b.dataset.tp; });
  act("[data-ac]", b => { D.acc.contrib = b.dataset.ac; });
  act("[data-ta]", b => { D.tpls[sel].acc = b.dataset.ta; });
  act("[data-ra]", b => { const k = b.dataset.ra, v = (document.getElementById("nc" + k).value || "").trim(); if (v && !D.cats[k].includes(v)) D.cats[k].push(v); });
  act("[data-rc]", b => { const [k, i] = b.dataset.rc.split("|"); D.cats[k].splice(+i, 1); });
  act("[data-ca]", () => { D.tpls[sel].cost.push({cat: D.cats.out[0] || "", payee: "", amt: 0}); });
  act("[data-cr]", b => { D.tpls[sel].cost.splice(+b.dataset.cr, 1); });
  // Skupina chybějící ve starší šabloně se doplní s výchozími hodnotami
  const wOf = g => (D.tpls[sel].who[g] = D.tpls[sel].who[g] || {pays: false, mode: "calc", flat: 0});
  act("[data-wp]", b => { const w = wOf(b.dataset.wp); w.pays = !w.pays; });
  act("[data-wm]", b => { const [g, m] = b.dataset.wm.split("|"); wOf(g).mode = m; });
  act("[data-tn]", () => { const k = "t_" + uid(), c = clone(D.tpls[sel]); c.name = "Nová šablona"; D.tpls[k] = c; sel = k; });
  q("[data-td]").forEach(b => { b.onclick = () => { sync(e); if (arm) { delete D.tpls[sel]; sel = "train"; arm = false; } else arm = true; draw(); }; });
  // Tlačítka Zavřít (každému tlačítku zvlášť; q() vrací seznam uzlů)
  q("#csx, #csx2").forEach(b => { b.onclick = close; });
  q("#css")[0].onclick = () => {
    sync(e);
    const iban = D.iban.replace(/\s+/g, "").toUpperCase(), iban2 = (D.iban2 || "").replace(/\s+/g, "").toUpperCase();
    if (iban && !IBAN.test(iban)) return toast("IBAN hlavního účtu nemá platný tvar");
    if (iban2 && !IBAN.test(iban2)) return toast("IBAN provozního účtu nemá platný tvar");
    D.iban = iban; D.iban2 = iban2;
    S.db.doc("settings/cash").set(D).then(() => toast("Nastavení pokladny uloženo")).catch(() => toast("Uložení se nepovedlo"));
    close();
  };
}

// ===== Export =====
export function openCashSettings() {
  if (!HK.isCash()) return;
  let e = el();
  if (!e) { e = document.createElement("div"); e.id = "cset"; document.body.appendChild(e); }
  // Nad živým zápisem, zápisem utkání, opravami a nápovědou
  e.style.cssText = "position:fixed;inset:0;z-index:56;background:var(--bg);overflow:auto;padding:12px;padding-top:calc(12px + env(safe-area-inset-top,0px));padding-bottom:calc(40px + env(safe-area-inset-bottom,0px));display:block";
  D = cashCfg(S.cc);
  sel = "train";
  arm = false;
  draw();
}
