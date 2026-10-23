// Rozpočet sezóny (Team → 📊 Rozpočet, jen správci pokladny – trenér a pokladník) ve třech částech: 📝 Plán (parametry, položky událostí,
// platy a ostatní, plán po měsících, odhad příspěvku), 📈 Plnění (plán vs. skutečnost po měsících a položkách, odhad sezóny) a
// 💧 Cashflow (odhad zůstatku pokladny, varování pod rezervou). Výpočty: domain/budget.js a domain/budget-track.js.
// Úpravy se drží v paměti a ukládají tlačítkem 💾 do budget/{sezóna} (merge) s auditem. Pokladna, předpisy ani kalendář se tu nemění.
// Struktura: Importy -> Stav -> Pomocné funkce -> Zápis -> Vykreslení (sezóna, plán, plnění, cashflow) -> Eventy -> Export.

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {isG} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, fd, td, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {budgetTrack, cashflow, trackAdvice} from "../domain/budget-track.js";
import {BUDGET_COLL, BUDGET_DAYS, ITEM_MODE, OTHER_REP, PER, SAL_M, SEASON_MONTHS, budgetDoc, budgetError, budgetPlan, contribVariants, copyBudget,
  defaultSal, newBudget, newItem, normBudget, rosterCounts, sameBudget, seasonAdd, seasonFrom, seasonKeyOf, seasonLabel, seasonYms, seriesIn, suggestContrib} from "../domain/budget.js";
import {cashCfg, kc, twoAcc, ymLabel, ymShort} from "../domain/cash.js";
import {econData} from "./payments.js";
import {render} from "./shell.js";

// ===== Stav (jen pro tuto obrazovku) =====
let key = null;      // vybraná sezóna "RRRR-RR"
let dr = null;       // rozpracovaný rozpočet {key, b (normalizovaný nebo null = zatím nezaložený), dirty}
let open = null;     // id rozbalené položky událostí
let tab = "plan";    // část obrazovky: "plan" | "track" | "flow"
const TABS = [["plan", "📝 Plán"], ["track", "📈 Plnění"], ["flow", "💧 Cashflow"]];

// ===== Pomocné funkce =====
const DN = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];                 // zkratky dnů podle Date.getDay()
const MN = ["", "led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];
const email = () => { const u = HK.user(); return (u && u.email) || ""; };
const armStyle = k => (armed(k) ? "background:var(--no);color:#fff" : "");
const cfgNow = () => cashCfg(S.cc);
const saved = k => (S.bd || []).find(x => x.id === k) || null;
const signed = n => `<b style="color:${n < 0 ? "var(--no)" : "var(--ok)"}">${n > 0 ? "+" : n < 0 ? "−" : ""}${kc(Math.abs(n))}</b>`;
const fdS = s => (s ? fd(s) : "–");
const numIn = (attr, v, w) => `<input ${attr} type="number" min="0" inputmode="numeric" value="${esc(v == null ? "" : v)}" style="margin:0;width:${w || 90}px">`;
// Průměrná účast hráček (bez brankářek) na posledních 20 tréninkách do dneška; bez dat null
function avgAtt() {
  const today = td(), ids = new Set(S.pl.filter(p => !isG(p)).map(p => p.id));
  const evs = (S.ev || []).filter(e => e.date && e.date < today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  const ns = evs.map(e => (S.at || []).filter(x => x.eid === e.id && x.st === "yes" && ids.has(x.pid)).length).filter(n => n > 0);
  return ns.length ? Math.round(ns.reduce((s, n) => s + n, 0) / ns.length) : null;
}
// Rozpracovaný rozpočet vybrané sezóny: z uloženého dokumentu; bez rozpracovaných změn se drží uloženého (změna z jiného zařízení)
function draft() {
  if (!key) key = seasonKeyOf(td());
  const sv = saved(key);
  if (!dr || dr.key !== key) dr = {key, b: sv ? normBudget(sv, key) : null, dirty: false};
  else if (sv && !dr.dirty) dr.b = normBudget(sv, key);
  return dr;
}
// Změna rozpracovaného rozpočtu: fn upraví kopii, výsledek se normalizuje a překreslí
function change(fn) {
  const b = JSON.parse(JSON.stringify(dr.b));
  fn(b);
  dr.b = normBudget(b, key);
  const sv = saved(key);
  dr.dirty = !sv || !sameBudget(dr.b, normBudget(sv, key));
  render();
}
const itemOf = (b, id) => b.items.find(x => x.id === id);
// Procento odchylky pro text („+12 %“)
const pct = d => (d > 0 ? "+" : d < 0 ? "−" : "") + Math.round(Math.abs(d) * 100) + " %";
// Plnění, cashflow a návrh pro rozpracovaný rozpočet (data pokladny a kalendáře z econData)
function trackAll(b, pl) {
  const D = econData(), today = td(), cfg = cfgNow();
  const t = budgetTrack(b, pl, D, today), f = cashflow(b, pl, D, today, cfg);
  return {t, f, adv: trackAdvice(b, pl, t, f.months.length ? f : null), cfg};
}
// Popis pravidla položky (pro sbalený řádek)
function modeText(it, ser) {
  const span = fdS(it.from) + " – " + fdS(it.to);
  if (it.mode === "rule") return BUDGET_DAYS.filter(d => it.rule.days.includes(d)).map(d => DN[d]).join(", ") + (it.rule.every === 2 ? " · každý 2. týden" : " · každý týden") + " · " + span + (it.skip.length ? " · vynecháno " + it.skip.length : "");
  if (it.mode === "ser") { const s = ser.find(x => x.id === it.ser); return "série " + (s ? "„" + s.title + "“ (" + s.n + ")" : "– nevybraná"); }
  return it.n + " " + PER[it.per] + " · " + ymShort(it.from.slice(0, 7)) + " – " + ymShort(it.to.slice(0, 7));
}

// ===== Zápis =====
// Uložení rozpočtu: dokument budget/{sezóna} (merge – pole, která tato verze nezná, zůstanou) + audit v jedné dávce
function save() {
  const b = dr.b, err = budgetError(b);
  if (err) return toast(err);
  const pl = budgetPlan(b, cfgNow(), S.ev);
  S.db.batch()
    .merge(BUDGET_COLL + "/" + key, {...budgetDoc(b), by: email(), at: new Date().toISOString()})
    .set("audit/" + uid(), {ts: new Date().toISOString(), by: email(), eid: "", act: "budget", note: "Rozpočet " + seasonLabel(key) + ": " + b.items.length + " položek, saldo sezóny " + kc(pl.tot.saldo)})
    .commit();
  dr.dirty = false;
  toast("Rozpočet uložen");
  render();
}

// ===== Vykreslení: sezóna a stav =====
function headHtml(d, all) {
  const sv = saved(key), cur = key === seasonKeyOf(td());
  const st = !d.b ? '<span class="mu">Rozpočet sezóny zatím není založený.</span>'
    : d.dirty ? '<b style="color:var(--wa)">✏️ Neuložené změny</b>'
    : `<span class="mu">Uloženo ${sv && sv.at ? esc(fd(sv.at.slice(0, 10))) : ""}${sv && sv.by ? " · " + esc(sv.by) : ""}</span>`;
  const err = d.b ? budgetError(d.b) : "";
  const btns = d.b && d.dirty ? `<div class="row" style="margin-top:8px"><button class="p" data-bsave style="flex:2;min-height:48px">💾 Uložit rozpočet</button><button class="s" data-bundo style="${armStyle("bundo" + key)}">${armed("bundo" + key) ? "Zahodit?" : "↺ Zahodit změny"}</button></div>` : "";
  return `<div class="cd"><div class="evh"><button class="s" data-bsn="-1">◀</button><b style="font-size:17px">📊 Rozpočet ${esc(seasonLabel(key))}</b><button class="s" data-bsn="1">▶</button></div>
${cur ? "" : '<button class="s w" data-bsnow style="margin-top:8px">Tato sezóna</button>'}
<div style="margin-top:6px">${st}</div>${err && d.dirty ? `<div class="mu" style="color:var(--no)">⚠️ ${esc(err)}</div>` : ""}${btns}
${warnHtml(all)}
<div class="mu" style="margin-top:6px">Sezóna 1. 8. – 30. 6. Rozpočet jen plánuje – pokladnu, předpisy, šablony ani kalendář nemění. Vidí ho jen trenér a pokladník.</div></div>
${d.b ? `<div class="chips" style="margin-bottom:10px">${TABS.map(([k, l]) => `<button class="chip ${tab === k ? "on" : ""}" data-btab="${k}">${l}</button>`).join("")}</div>` : ""}`;
}
// Varování v hlavičce (všechny části): odhad zůstatku pod rezervou / pod nulou, měsíce s odchylkou nad 10 %
function warnHtml(all) {
  if (!all) return "";
  const {t, f} = all, out = [], late = t.months.filter(m => m.warn);
  if (f.first) out.push(`<button class="s w" data-btab="flow" style="margin-top:8px;text-align:left;border-color:var(--no)">⚠️ ${esc(ymLabel(f.first.ym))}: odhad zůstatku ${kc(f.first.bal)} – ${f.first.bal < 0 ? "pod nulou" : "pod rezervou " + kc(f.res)}</button>`);
  if (late.length) out.push(`<button class="s w" data-btab="track" style="margin-top:6px;text-align:left;border-color:var(--wa)">⚠️ Odchylka nad 10 %: ${late.map(m => esc(ymLabel(m.ym))).join(", ")}</button>`);
  return out.join("");
}
// Založení rozpočtu: z dnešního stavu (soupiska, nastavení pokladny, platy), nebo převzetím minulé sezóny
function createHtml() {
  const prev = saved(seasonAdd(key, -1));
  return `<div class="cd"><h2>🆕 Založit rozpočet ${esc(seasonLabel(key))}</h2><div class="mu" style="margin-bottom:8px">Parametry se předvyplní ze soupisky (počty hráček podle skupiny plateb), z nastavení pokladny (výše příspěvku) a z platů realizačního týmu; předpokládaná účast z posledních tréninků. Vše jde upravit, uloží se až tlačítkem 💾.</div>
<button class="p w" data-bnew style="min-height:48px">🆕 Založit ze soupisky a nastavení</button>
${prev ? `<button class="s w" data-bcopy style="margin-top:8px">📋 Převzít rozpočet ${esc(seasonLabel(prev.id))} (data posunutá o rok)</button>` : ""}</div>`;
}

// ===== Vykreslení: parametry =====
function parHtml(b) {
  const p = b.par, ros = rosterCounts(S.pl), cfg = cfgNow(), tot = p.n.monthly + p.n.single + p.n.exempt;
  const yms = seasonYms(key);
  const ch = p.cH.map((c, i) => `<div class="row" style="align-items:center;flex-wrap:nowrap;margin-top:4px"><span class="mu" style="flex:none">od</span><select data-bch="${i}|ym" style="margin:0">${yms.map(ym => `<option value="${ym}" ${ym === c.ym ? "selected" : ""}>${esc(ymLabel(ym))}</option>`).join("")}</select>${numIn(`data-bch="${i}|amt"`, c.amt)}<span class="mu" style="flex:none">Kč</span><button class="d" data-bchdel="${i}" style="flex:none;min-width:44px">🗑</button></div>`).join("");
  return `<div class="cd"><h2>⚙️ Parametry sezóny</h2>
<h3>Hráčky (celkem ${tot})</h3>
<div class="row"><div><label>S příspěvkem</label>${numIn('data-bn="monthly"', p.n.monthly, 80)}</div><div><label>Za událost</label>${numIn('data-bn="single"', p.n.single, 80)}</div><div><label>Osvobozené</label>${numIn('data-bn="exempt"', p.n.exempt, 80)}</div></div>
<button class="s w" data-bros style="margin-top:6px">↻ Podle soupisky (${ros.monthly} / ${ros.single} / ${ros.exempt})</button>
<div class="row" style="margin-top:8px"><div><label>Předpokládaná účast na událost (hráček)</label>${numIn('data-bp="att"', p.att, 80)}</div><div><label>Cílový přebytek na konci sezóny (Kč)</label><input data-bp="goal" type="number" inputmode="numeric" value="${esc(p.goal)}" style="margin:0;width:110px"></div><div><label>Rezerva pokladny – varování cashflow (Kč)</label>${numIn('data-bp="res"', p.res, 110)}</div></div>
<h3>Příspěvek</h3>
<div class="row" style="align-items:center;flex-wrap:nowrap"><span class="mu" style="flex:none">od začátku sezóny</span>${numIn('data-bp="contrib"', p.contrib)}<span class="mu" style="flex:none">Kč / měsíc</span></div>${ch}
<button class="s w" data-bchadd style="margin-top:6px">+ Změna příspěvku od měsíce</button>
<div class="mu" style="margin:8px 0 4px">Měsíce, kdy se příspěvek vybírá:</div>
<div class="chips">${SEASON_MONTHS.map(m => `<button class="chip ${p.cm.includes(m) ? "on" : ""}" data-bcm="${m}">${MN[m]}</button>`).join("")}</div>
<div class="mu" style="margin-top:6px">Nastavení pokladny: příspěvek ${kc(cfg.contrib)}. Koeficienty hráček se v rozpočtu nepočítají (každá platící hráčka = 100 %).</div></div>`;
}

// ===== Vykreslení: položky událostí =====
function itemsHtml(b, pl, cfg) {
  const ser = seriesIn(S.ev, key), used = new Set(b.items.filter(i => i.mode === "ser").map(i => i.ser));
  const rows = b.items.length ? b.items.map(it => {
    const s = pl.items.find(x => x.id === it.id) || {n: 0, cost: 0, inc: 0, per1: 0}, o = open === it.id;
    const head = `<div class="pr" data-bopen="${esc(it.id)}" style="cursor:pointer"><div><b>${esc(it.name || "bez názvu")}</b> <span class="tag sh">${esc((cfg.tpls[it.tpl] || {}).name || it.tpl)}</span><div class="mu">${esc(modeText(it, ser))}</div><div class="mu">${s.n}× · náklady ${kc(s.cost)} · za události ${kc(s.inc)}</div></div><span>${o ? "▴" : "▾"}</span></div>`;
    return head + (o ? itemEdit(it, s, cfg, ser) : "");
  }).join("") : '<div class="msg">Zatím žádná položka. Přidej tréninky a zápasy podle šablon pokladny.</div>';
  const add = Object.entries(cfg.tpls).map(([k, t]) => `<button class="chip" data-badd="${esc(k)}">+ ${esc(t.name || k)}</button>`).join("");
  const sadd = ser.filter(s => !used.has(s.id)).map(s => `<button class="chip" data-bser="${esc(s.id)}">📎 ${esc(s.title)} (${s.n}, ${esc(fd(s.first))} – ${esc(fd(s.last))})</button>`).join("");
  return `<div class="cd"><h2>🏒 Položky událostí</h2><div class="mu" style="margin-bottom:6px">Každá položka = druh události (šablona pokladny) s pravidlem opakování, počtem za sezónu / měsíc, nebo převzatou sérií tréninků z kalendáře. Náklady a příjem jsou na jednu událost; příjem se bez ruční hodnoty odhadne ze šablony (kdo platí) a složení hráček.</div>
${rows}<h3>Přidat položku</h3><div class="chips">${add}</div>${sadd ? `<h3>Převzít sérii z kalendáře</h3><div class="chips">${sadd}</div>` : ""}</div>`;
}
// Rozbalená úprava položky
function itemEdit(it, s, cfg, ser) {
  const id = esc(it.id), f = n => `data-bi="${id}|${n}"`;
  const tpl = `<select ${f("tpl")} style="margin:0">${Object.entries(cfg.tpls).map(([k, t]) => `<option value="${esc(k)}" ${k === it.tpl ? "selected" : ""}>${esc(t.name || k)}</option>`).join("")}</select>`;
  const modes = `<div class="chips">${Object.entries(ITEM_MODE).map(([k, t]) => `<button class="chip ${it.mode === k ? "on" : ""}" data-bmode="${id}|${k}">${t}</button>`).join("")}</div>`;
  const dates = `<div class="row"><div><label>Od</label><input type="date" ${f("from")} value="${esc(it.from)}" style="margin:0"></div><div><label>Do</label><input type="date" ${f("to")} value="${esc(it.to)}" style="margin:0"></div></div>`;
  let how = "";
  if (it.mode === "rule") {
    how = `<div class="chips">${BUDGET_DAYS.map(d => `<button class="chip ${it.rule.days.includes(d) ? "on" : ""}" data-bday="${id}|${d}">${DN[d]}</button>`).join("")}</div>
<div class="chips">${[[1, "Každý týden"], [2, "Každý 2. týden"]].map(([v, t]) => `<button class="chip ${it.rule.every === v ? "on" : ""}" data-bevery="${id}|${v}">${t}</button>`).join("")}</div>${dates}
<label>Vynechané dny (prázdniny, svátky)</label><div class="row" style="align-items:center;flex-wrap:nowrap"><input type="date" data-bskv="${id}" style="margin:0"><button class="s" data-bskadd="${id}" style="flex:none">+ Vynechat</button></div>
<div class="chips" style="margin-top:4px">${it.skip.map(d => `<button class="chip" data-bskdel="${id}|${d}">${esc(fd(d))} ✕</button>`).join("") || '<span class="mu">žádné</span>'}</div>`;
  } else if (it.mode === "count") {
    how = `<div class="row" style="align-items:center;flex-wrap:nowrap">${numIn(f("n"), it.n, 80)}<select ${f("per")} style="margin:0">${Object.entries(PER).map(([k, t]) => `<option value="${k}" ${k === it.per ? "selected" : ""}>${t}</option>`).join("")}</select></div>${dates}
<div class="mu">Počet za sezónu se rozloží rovnoměrně do měsíců od–do.</div>`;
  } else {
    how = ser.length ? `<select ${f("ser")} style="margin:0"><option value="">– vyber sérii –</option>${ser.map(x => `<option value="${esc(x.id)}" ${x.id === it.ser ? "selected" : ""}>${esc(x.title)} (${x.n}, ${esc(fd(x.first))} – ${esc(fd(x.last))})</option>`).join("")}</select><div class="mu">Počet a dny podle událostí série v kalendáři (zakládá je 🔁 Opakovat v Událostech).</div>`
      : '<div class="msg">V sezóně není žádná série tréninků (🔁 Opakovat v Událostech).</div>';
  }
  const dk = "bdel" + it.id;
  return `<div style="border-left:3px solid var(--ac);padding:4px 0 8px 10px;margin-bottom:8px">
<div class="row"><div style="flex:2"><label>Název</label><input ${f("name")} value="${esc(it.name)}" style="margin:0"></div><div><label>Šablona</label>${tpl}</div></div>
<label>Jak se plánuje</label>${modes}${how}
<div class="row" style="margin-top:6px"><div><label>Náklady na událost (Kč)</label>${numIn(f("cost"), it.cost)}</div><div><label>Příjem na událost (Kč)</label>${numIn(f("inc") + ` placeholder="${esc(s.per1)}"`, it.inc)}</div><div><label>Účast (hráček)</label>${numIn(f("att") + ` placeholder="${esc(dr.b.par.att)}"`, it.att, 70)}</div></div>
<div class="mu">Prázdný příjem = odhad ze šablony (${kc(s.per1)} na událost); prázdná účast = z parametrů.</div>
<button class="d w" data-bdel="${id}" style="margin-top:6px;${armStyle(dk)}">${armed(dk) ? "Opravdu odebrat? Klepni znovu" : "🗑 Odebrat položku"}</button></div>`;
}

// ===== Vykreslení: platy a ostatní příjmy / výdaje =====
function salHtml(b) {
  const sal = b.sal.map((s, i) => `<div class="row" style="align-items:center;flex-wrap:nowrap;margin-top:4px"><input data-bs="${i}|name" value="${esc(s.name)}" placeholder="Jméno" style="margin:0;flex:2"><select data-bs="${i}|m" style="margin:0">${Object.entries(SAL_M).map(([k, t]) => `<option value="${k}" ${k === s.m ? "selected" : ""}>${t}</option>`).join("")}</select>${numIn(`data-bs="${i}|amt"`, s.amt, 80)}<button class="d" data-bsdel="${i}" style="flex:none;min-width:44px">🗑</button></div>`).join("");
  const yms = seasonYms(key);
  const oth = b.other.map((o, i) => `<div style="margin-top:6px"><div class="row" style="align-items:center;flex-wrap:nowrap"><input data-bo="${i}|name" value="${esc(o.name)}" placeholder="Např. sponzor, vybavení, turnaj" style="margin:0;flex:2"><select data-bo="${i}|k" style="margin:0"><option value="in" ${o.k === "in" ? "selected" : ""}>Příjem</option><option value="out" ${o.k === "out" ? "selected" : ""}>Výdaj</option></select><button class="d" data-bodel="${i}" style="flex:none;min-width:44px">🗑</button></div>
<div class="row" style="align-items:center;flex-wrap:nowrap;margin-top:4px">${numIn(`data-bo="${i}|amt"`, o.amt)}<span class="mu" style="flex:none">Kč</span><select data-bo="${i}|rep" style="margin:0">${Object.entries(OTHER_REP).map(([k, t]) => `<option value="${k}" ${k === o.rep ? "selected" : ""}>${t}</option>`).join("")}</select>${o.rep === "once" ? `<select data-bo="${i}|ym" style="margin:0"><option value="">– měsíc –</option>${yms.map(ym => `<option value="${ym}" ${ym === o.ym ? "selected" : ""}>${esc(ymLabel(ym))}</option>`).join("")}</select>` : ""}</div></div>`).join("");
  return `<div class="cd"><h2>💸 Platy realizačního týmu</h2><div class="mu" style="margin-bottom:4px">Měsíčně = každý měsíc sezóny; za událost = částka × všechny plánované události měsíce.</div>${sal || '<div class="mu">Bez platů.</div>'}
<div class="row" style="margin-top:6px"><button class="s" data-bsadd>+ Plat</button><button class="s" data-bsros>↻ Podle realizačního týmu</button></div></div>
<div class="cd"><h2>📦 Ostatní příjmy a výdaje</h2><div class="mu" style="margin-bottom:4px">Dary a sponzoři, vybavení, turnaje, poplatky svazu … měsíčně nebo jednorázově v měsíci.</div>${oth || '<div class="mu">Nic.</div>'}
<button class="s w" data-boadd style="margin-top:6px">+ Příjem / výdaj</button></div>`;
}

// ===== Vykreslení: plán po měsících =====
function planHtml(pl) {
  const t = pl.tot, cell = n => kc(n);
  const rows = pl.months.map(m => `<tr><td><b>${esc(ymLabel(m.ym))}</b></td><td>${m.n}</td><td>${cell(m.evCost)}</td><td>${cell(m.evInc)}</td><td>${cell(m.contrib)}</td><td>${cell(m.sal)}</td><td>${cell(m.oin - m.oout)}</td><td>${signed(m.saldo)}</td><td>${signed(m.cum)}</td></tr>`).join("");
  return `<div class="cd"><h2>📅 Plán po měsících</h2>
<div class="grid3"><div class="stat"><b>${kc(t.inc)}</b>příjmy</div><div class="stat"><b>${kc(t.out)}</b>výdaje</div><div class="stat"><b style="color:${t.saldo < 0 ? "var(--no)" : "var(--ok)"}">${t.saldo > 0 ? "+" : ""}${kc(t.saldo)}</b>saldo sezóny</div></div>
<div class="tw"><table><tr><th>Měsíc</th><th>Událostí</th><th>Náklady</th><th>Za události</th><th>Příspěvky</th><th>Platy</th><th>Ostatní ±</th><th>Saldo</th><th>Kumulativně</th></tr>${rows}
<tr><td><b>Sezóna</b></td><td><b>${t.n}</b></td><td><b>${cell(t.evCost)}</b></td><td><b>${cell(t.evInc)}</b></td><td><b>${cell(t.contrib)}</b></td><td><b>${cell(t.sal)}</b></td><td><b>${cell(t.oin - t.oout)}</b></td><td>${signed(t.saldo)}</td><td></td></tr></table></div>
<div class="mu" style="margin-top:6px">Příspěvky = výše v měsíci × hráčky s příspěvkem. Kumulativně = saldo od začátku sezóny bez zůstatku pokladny (zůstatek viz 💧 Cashflow, skutečnost viz 📈 Plnění).</div></div>`;
}

// ===== Vykreslení: odhad příspěvku =====
function suggestHtml(b, pl) {
  const s = suggestContrib(pl, b.par), v = contribVariants(pl, b.par), t = pl.tot;
  if (s.per == null) return `<div class="cd"><h2>💡 Odhad příspěvku</h2><div class="msg">Pro odhad je potřeba aspoň jedna hráčka s příspěvkem a aspoň jeden měsíc s příspěvkem.</div></div>`;
  const diff = s.per - s.avg;
  const cmp = Math.abs(diff) < 1 ? '<b style="color:var(--ok)">✅ plánovaný příspěvek odpovídá</b>'
    : diff > 0 ? `<b style="color:var(--no)">⚠️ plánovaný příspěvek (průměr ${kc(s.avg)}) je o ${kc(diff)} nižší</b>` : `<b style="color:var(--ok)">plánovaný příspěvek (průměr ${kc(s.avg)}) je o ${kc(-diff)} vyšší</b>`;
  const tab = `<div class="tw"><table style="min-width:0"><tr><th>Hráček s příspěvkem</th><th>Příspěvek / měsíc</th></tr>${v.map(x => `<tr style="${x.d === 0 ? "background:var(--a2)" : ""}"><td>${x.payers}${x.d ? " (" + (x.d > 0 ? "+" : "") + x.d + ")" : ""}</td><td><b>${kc(x.per)}</b></td></tr>`).join("")}</table></div>`;
  const k = "buse" + key;
  return `<div class="cd"><h2>💡 Odhad příspěvku</h2>
<div class="it" style="cursor:default"><span>Pokrýt příspěvky: výdaje ${kc(t.out)} − za události ${kc(t.evInc)} − ostatní příjmy ${kc(t.oin)}${b.par.goal ? " + cíl " + kc(b.par.goal) : ""}</span><b>${kc(Math.max(0, s.need))}</b></div>
<div class="it" style="cursor:default"><span>Doporučený příspěvek (${s.payers} hráček × ${s.months} měsíců)</span><b style="font-size:18px">${kc(s.per)}</b></div>
<div style="margin:6px 0">${cmp}</div>
<h3>Dopad změny počtu hráček s příspěvkem</h3>${tab}
${diff !== 0 ? `<button class="s w" data-buse style="margin-top:8px;${armStyle(k)}">${armed(k) ? "Opravdu? Klepni znovu" : "✓ Použít " + kc(s.per) + " jako příspěvek v rozpočtu"}</button>` : ""}
<div class="mu" style="margin-top:6px">Jen návrh pro rozpočet – výši příspěvku v nastavení pokladny ani vystavené příspěvky nemění. „Použít“ nastaví příspěvek od začátku sezóny a zruší změny od měsíce.</div></div>`;
}

// ===== Vykreslení: plnění =====
// Návrh úpravy při odhadu sezóny pod cílem nebo při varování cashflow (jen text – nic se nemění samo)
function adviceHtml(adv) {
  if (!adv) return "";
  const o = [];
  if (adv.contrib) o.push(`zvýšit příspěvek od příštího měsíce o <b>${kc(adv.contrib.per)}</b> (${adv.contrib.payers} hráček × ${adv.contrib.months} měsíců)`);
  if (adv.fee) o.push(`zvýšit platbu za událost o <b>${kc(adv.fee.per)}</b> na událost (${adv.fee.n} zbývajících plánovaných událostí)`);
  if (adv.fewer) o.push(`vynechat <b>${adv.fewer.n}</b> plánovaných událostí`);
  return `<div class="cd" style="border-left:4px solid var(--wa)"><h2>💡 Návrh úpravy</h2><div>Do cíle sezóny / rezervy chybí <b>${kc(adv.gap)}</b>. Možnosti (stačí jedna):</div>
${o.length ? `<ul style="margin:6px 0 0 18px">${o.map(x => `<li>${x}</li>`).join("")}</ul>` : '<div class="mu">Zbývající plán neumožňuje návrh – uprav položky nebo příspěvek v 📝 Plán.</div>'}
<div class="mu" style="margin-top:6px">Jen návrh – rozpočet, příspěvky ani šablony pokladny se samy nemění.</div></div>`;
}
// Dvojice „plán / skutečnost“ v buňce (skutečnost tučně, nad 10 % barevně)
const pair = (p, a, bad) => `<span class="mu">${kc(p)}</span><br><b style="${bad ? "color:var(--no)" : ""}">${a == null ? "–" : kc(a)}</b>`;
function trackHtml(b, all) {
  const {t, adv} = all, today = td(), A = t.tot.act, F = t.tot.fc, P = t.tot.plan;
  if (!t.months.some(m => m.st !== "fut")) return `<div class="cd"><h2>📈 Plnění</h2><div class="msg">Sezóna ${esc(seasonLabel(key))} ještě nezačala – plnění bude vidět od 1. 8.</div></div>` + adviceHtml(adv);
  const rows = t.months.map(m => {
    const fut = m.st === "fut", sty = fut ? "opacity:.6" : m.st === "cur" ? "background:var(--a2)" : "";
    const w = m.warn ? [m.dev.out != null && m.dev.out > 0.1 ? "výdaje " + pct(m.dev.out) : "", m.dev.inc != null && m.dev.inc < -0.1 ? "příjmy " + pct(m.dev.inc) : ""].filter(Boolean).join(", ") : "";
    return `<tr style="${sty}"><td><b>${esc(ymLabel(m.ym))}</b>${m.st === "cur" ? '<div class="mu">běží</div>' : ""}${w ? `<div style="color:var(--no)">⚠️ ${esc(w)}</div>` : ""}</td>
<td>${m.plan.n} / <b>${fut ? "–" : m.done}</b> / ${m.cal}</td><td>${pair(m.plan.out, fut ? null : m.out, m.warn && m.dev.out > 0.1)}</td>
<td>${pair(m.plan.inc, fut ? null : m.inc, m.warn && m.dev.inc < -0.1)}${fut ? "" : `<div class="mu">${m.cEst && m.contrib ? "příspěvky odhad" : "zapl. " + kc(m.evPaid + m.cPaid)}</div>`}</td>
<td>${pair(m.plan.saldo, fut ? null : m.saldo)}</td><td>${m.cum == null ? "–" : signed(m.cum)}</td><td>${signed(m.fcCum)}</td></tr>`;
  }).join("");
  const its = t.items.map(x => `<tr><td><b>${esc(x.name || "?")}</b>${x.warn ? '<div style="color:var(--no)">⚠️ odchylka</div>' : ""}</td><td>${x.plan}</td><td>${x.planToDate}</td><td><b>${x.done}</b></td><td>${x.cal}</td>
<td>${kc(x.cost1)} / <b>${x.cost1Act == null ? "–" : kc(x.cost1Act)}</b>${x.dev != null && Math.abs(x.dev) > 0.1 ? ` <span style="color:var(--no)">${pct(x.dev)}</span>` : ""}</td></tr>`).join("");
  return `<div class="cd"><h2>📈 Plnění k ${esc(fd(today))}</h2>
<div class="grid3"><div class="stat">${signed(A.saldo)}skutečnost</div><div class="stat">${signed(A.planSaldo)}plán za totéž období</div><div class="stat">${signed(F.saldo)}odhad sezóny (plán ${P.saldo > 0 ? "+" : ""}${kc(P.saldo)})</div></div>
<div class="mu" style="margin-top:6px">Skutečnost = uplynulé a běžící měsíce z hospodaření měsíce (náklady vyúčtovaných událostí, u ostatních podle šablony; příjmy předepsané a odhad z přihlášených; příspěvky předepsané, nevystavené odhad ze soupisky; vyplacené platy; ostatní pohyby pokladny mimo led, rozhodčí a dopravu). Odhad sezóny = skutečnost uplynulých měsíců + plán od běžícího měsíce.${dr.dirty ? " <b>Počítá s neuloženými změnami.</b>" : ""}</div></div>
${adviceHtml(adv)}
<div class="cd"><h2>📅 Po měsících</h2><div class="tw"><table><tr><th>Měsíc</th><th>Události plán / proběhlo / v kalendáři</th><th>Výdaje plán / skut.</th><th>Příjmy plán / skut.</th><th>Saldo plán / skut.</th><th>Kumulativně</th><th>Odhad kumul.</th></tr>${rows}</table></div>
<div class="mu" style="margin-top:6px">⚠️ = uplynulý měsíc s výdaji o víc než 10 % nad plánem nebo příjmy o víc než 10 % pod plánem.</div></div>
<div class="cd"><h2>🧾 Položky</h2>${t.items.length ? `<div class="tw"><table><tr><th>Položka</th><th>Plán sezóny</th><th>Plán do dneška</th><th>Proběhlo</th><th>V kalendáři</th><th>Náklady / událost plán / skut.</th></tr>${its}</table></div>` : '<div class="mu">Rozpočet nemá položky událostí.</div>'}
${t.free.n ? `<div class="it" style="cursor:default;margin-top:6px"><span>Mimo rozpočet (šablona bez položky nebo mimo období položky)</span><b>${t.free.n} · ${kc(t.free.cost)}</b></div>` : ""}
<div class="mu" style="margin-top:6px">Události se přiřazují podle šablony pokladny; u více položek se stejnou šablonou podle série a dne v týdnu.</div></div>`;
}

// ===== Vykreslení: cashflow =====
function flowHtml(all) {
  const {f, adv, cfg} = all, T = f.today;
  const acc = twoAcc(cfg) ? `<div class="mu">Hlavní účet ${kc(T.main)} · Provozní účet ${kc(T.op)}</div>` : "";
  const head = `<div class="cd"><h2>💧 Cashflow</h2><div class="it" style="cursor:default"><span>Zůstatek pokladny dnes</span>${signed(T.bal)}</div>${acc}
<div class="it" style="cursor:default"><span>Rezerva (varování pod)</span><b>${kc(f.res)}</b></div>
${f.debt > 0 ? `<div class="it" style="cursor:default"><span>Nezaplacené předpisy z dřívějších měsíců (do odhadu se nepočítají)</span><b style="color:var(--wa)">${kc(f.debt)}</b></div>` : ""}</div>`;
  if (!f.months.length) return head + `<div class="cd"><div class="msg">Sezóna ${esc(seasonLabel(key))} skončila – cashflow se počítá jen pro běžící a budoucí měsíce.</div></div>`;
  const rows = f.months.map(m => `<tr style="${m.low === "neg" ? "background:rgba(220,0,0,.12)" : m.low === "res" ? "background:rgba(230,150,0,.14)" : ""}"><td><b>${esc(ymLabel(m.ym))}</b></td><td>${kc(m.in)}</td><td>${kc(m.out)}</td><td>${signed(m.bal)}</td><td>${m.low === "neg" ? "⛔ pod nulou" : m.low === "res" ? "⚠️ pod rezervou" : "✅"}</td></tr>`).join("");
  return head + adviceHtml(adv) + `<div class="cd"><h2>📅 Odhad zůstatku po měsících</h2><div class="tw"><table><tr><th>Měsíc</th><th>Očekávané příjmy</th><th>Očekávané výdaje</th><th>Zůstatek na konci</th><th></th></tr>${rows}</table></div>
<div class="mu" style="margin-top:6px">Příjmy = plán měsíce bez už předepsaných částek + nezaplacené předpisy měsíce. Výdaje = plán (nebo dražší události v kalendáři), u běžícího měsíce bez už vydaného. ${seasonFrom(key) > td() ? "Sezóna ještě nezačala – odhad začíná dnešním zůstatkem. " : ""}${dr.dirty ? "<b>Počítá s neuloženými změnami.</b>" : ""}</div></div>`;
}

// ===== Vykreslení: celá obrazovka =====
// HTML režimu 📊 Rozpočet (volá cashPanel v events.js)
export function budgetHtml() {
  const d = draft(), cfg = cfgNow();
  if (!d.b) return headHtml(d, null) + createHtml();
  const pl = budgetPlan(d.b, cfg, S.ev), all = trackAll(d.b, pl);
  if (tab === "track") return headHtml(d, all) + trackHtml(d.b, all);
  if (tab === "flow") return headHtml(d, all) + flowHtml(all);
  return headHtml(d, all) + suggestHtml(d.b, pl) + planHtml(pl) + parHtml(d.b) + itemsHtml(d.b, pl, cfg) + salHtml(d.b);
}

// ===== Eventy =====
export function bindBudget(a) {
  const q = s => a.querySelectorAll(s), two = v => String(v).split("|");
  const cfg = cfgNow();
  // Sezóna a stav
  q("[data-bsn]").forEach(b => b.onclick = () => { key = seasonAdd(key, +b.dataset.bsn); open = null; render(); });
  q("[data-bsnow]").forEach(b => b.onclick = () => { key = seasonKeyOf(td()); open = null; render(); });
  q("[data-bsave]").forEach(b => b.onclick = save);
  q("[data-btab]").forEach(b => b.onclick = () => { tab = b.dataset.btab; render(); });
  q("[data-bundo]").forEach(b => b.onclick = () => confirm2("bundo" + key, () => { dr = null; open = null; render(); }));
  q("[data-bnew]").forEach(b => b.onclick = () => { dr = {key, b: normBudget(newBudget(key, S.pl, cfg, S.tr, avgAtt()), key), dirty: true}; render(); });
  q("[data-bcopy]").forEach(b => b.onclick = () => { const p = saved(seasonAdd(key, -1)); if (p) { dr = {key, b: copyBudget(p, key), dirty: true}; render(); } });
  // Parametry
  q("[data-bn]").forEach(i => i.onchange = () => change(b => { b.par.n[i.dataset.bn] = i.value; }));
  q("[data-bp]").forEach(i => i.onchange = () => change(b => { b.par[i.dataset.bp] = i.value; }));
  q("[data-bros]").forEach(x => x.onclick = () => change(b => { b.par.n = rosterCounts(S.pl); }));
  q("[data-bcm]").forEach(x => x.onclick = () => change(b => { const m = +x.dataset.bcm; b.par.cm = b.par.cm.includes(m) ? b.par.cm.filter(y => y !== m) : [...b.par.cm, m]; }));
  q("[data-bchadd]").forEach(x => x.onclick = () => change(b => { const yms = seasonYms(key), last = b.par.cH.length ? b.par.cH[b.par.cH.length - 1].ym : yms[0]; b.par.cH.push({ym: yms[Math.min(yms.length - 1, yms.indexOf(last) + 1)] || yms[5], amt: b.par.cH.length ? b.par.cH[b.par.cH.length - 1].amt : b.par.contrib}); }));
  q("[data-bch]").forEach(i => i.onchange = () => change(b => { const [n, f] = two(i.dataset.bch); b.par.cH[+n][f] = i.value; }));
  q("[data-bchdel]").forEach(x => x.onclick = () => change(b => { b.par.cH.splice(+x.dataset.bchdel, 1); }));
  // Položky: přidání, rozbalení, úpravy, odebrání
  q("[data-badd]").forEach(x => x.onclick = () => { const id = uid(); change(b => { b.items.push(newItem(x.dataset.badd, cfg, key, id)); }); open = id; render(); });
  q("[data-bser]").forEach(x => x.onclick = () => {
    const s = seriesIn(S.ev, key).find(y => y.id === x.dataset.bser), id = uid();
    if (!s) return;
    change(b => { b.items.push({...newItem("train", cfg, key, id), name: s.title, mode: "ser", ser: s.id, from: seasonFrom(key)}); });
    open = id; render();
  });
  q("[data-bopen]").forEach(x => x.onclick = () => { open = open === x.dataset.bopen ? null : x.dataset.bopen; render(); });
  q("[data-bi]").forEach(i => i.onchange = () => change(b => {
    const [id, f] = two(i.dataset.bi), it = itemOf(b, id);
    if (!it) return;
    // Změna šablony převezme náklady nové šablony (jen když náklady nebyly změněné ručně)
    if (f === "tpl") { const prev = newItem(it.tpl, cfg, key, id).cost; if (it.cost === prev) it.cost = newItem(i.value, cfg, key, id).cost; }
    it[f] = i.value;
  }));
  q("[data-bmode]").forEach(x => x.onclick = () => change(b => { const [id, m] = two(x.dataset.bmode), it = itemOf(b, id); if (it) { it.mode = m; if (m === "rule" && !it.rule.days.length) it.rule.days = [3]; } }));
  q("[data-bday]").forEach(x => x.onclick = () => change(b => { const [id, d] = two(x.dataset.bday), it = itemOf(b, id); if (it) it.rule.days = it.rule.days.includes(+d) ? it.rule.days.filter(y => y !== +d) : [...it.rule.days, +d]; }));
  q("[data-bevery]").forEach(x => x.onclick = () => change(b => { const [id, v] = two(x.dataset.bevery), it = itemOf(b, id); if (it) it.rule.every = +v; }));
  q("[data-bskadd]").forEach(x => x.onclick = () => {
    const id = x.dataset.bskadd, inp = a.querySelector(`[data-bskv="${id}"]`), v = inp ? inp.value : "";
    if (!v) return toast("Vyber den");
    change(b => { const it = itemOf(b, id); if (it && !it.skip.includes(v)) it.skip.push(v); });
  });
  q("[data-bskdel]").forEach(x => x.onclick = () => change(b => { const [id, d] = two(x.dataset.bskdel), it = itemOf(b, id); if (it) it.skip = it.skip.filter(y => y !== d); }));
  q("[data-bdel]").forEach(x => x.onclick = () => { const id = x.dataset.bdel; confirm2("bdel" + id, () => { open = null; change(b => { b.items = b.items.filter(y => y.id !== id); }); }); });
  // Platy a ostatní
  q("[data-bsadd]").forEach(x => x.onclick = () => change(b => { b.sal.push({name: "", m: "month", amt: 0}); }));
  q("[data-bsros]").forEach(x => x.onclick = () => change(b => { b.sal = defaultSal(S.tr); }));
  q("[data-bs]").forEach(i => i.onchange = () => change(b => { const [n, f] = two(i.dataset.bs); b.sal[+n][f] = i.value; }));
  q("[data-bsdel]").forEach(x => x.onclick = () => change(b => { b.sal.splice(+x.dataset.bsdel, 1); }));
  q("[data-boadd]").forEach(x => x.onclick = () => change(b => { b.other.push({name: "", k: "out", amt: 0, rep: "once", ym: ""}); }));
  q("[data-bo]").forEach(i => i.onchange = () => change(b => { const [n, f] = two(i.dataset.bo); b.other[+n][f] = i.value; }));
  q("[data-bodel]").forEach(x => x.onclick = () => change(b => { b.other.splice(+x.dataset.bodel, 1); }));
  // Odhad příspěvku → příspěvek v rozpočtu
  q("[data-buse]").forEach(x => x.onclick = () => confirm2("buse" + key, () => {
    const s = suggestContrib(budgetPlan(dr.b, cfg, S.ev), dr.b.par);
    if (s.per != null) change(b => { b.par.contrib = s.per; b.par.cH = []; });
  }));
}

// ===== Export =====
// budgetHtml, bindBudget – exportovány u definic.
