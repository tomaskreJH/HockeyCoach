// Série tréninků (🔁 Opakovat): část formuláře „+ Trénink“ (dny v týdnu, každý / každý 2. týden, do kdy, termín přihlašování relativně,
// šablona pokladny, náhled termínů s vynecháním dnů) a volby v detailu události ze série (úprava a smazání „jen tato / tato a další“).
// Výpočty jsou v domain/recurrence.js; formulář a detail události vykresluje views/events.js a volá funkce z tohoto souboru.
// Konec tréninku (end) a ⏰ sraz (meet) se přenášejí do všech událostí série i do definice série (domain/event-time.js).
// Data: události série mají ser = {id, i, x?} (x = ručně upravená, „tato a další“ ji vynechá), definice série je v series/{id} (zapisuje manager / trenér / asistent).
// Smazat „tato a další budoucí“ jde jen události bez odpovědí v docházce a bez vyúčtování – ostatní zůstanou a ukáže je hláška.

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {S} from "../core/state.js";
import {dlBeforeStart, dlDefault, esc, fd, td, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {cashCfg} from "../domain/cash.js";
import {endOf, evDefaults, meetOf, timeFields} from "../domain/event-time.js";
import {SERIES_COLL, WEEK_DAYS, chunks, datesOf, deletePlan, editPlan, manualChange, relDl, relOf, seasonEnd, seriesOps} from "../domain/recurrence.js";
import {render} from "./shell.js";

// ===== Konstanty =====
const DN = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const WHY = {att: "odpovědi v docházce", ss: "vyúčtování"};
const SHOW_MAX = 6;                       // kolik dat vypsat v hlášce o vynechaných událostech

// ===== Pomocné funkce =====
const cashMgr = () => HK.can("money");
const dayName = s => DN[new Date(s + "T00:00:00").getDay()];
const dList = arr => arr.slice(0, SHOW_MAX).map(x => dayName(x) + " " + fd(x)).join(", ") + (arr.length > SHOW_MAX ? " …" : "");
const who = () => { const u = HK.user(); return (u && u.email) || ""; };
// Výchozí nastavení opakování podle data formuláře: stejný den v týdnu, každý týden, do konce sezóny, den předem v 18:00
const repDefault = date => ({on: true, days: date ? [new Date(date + "T00:00:00").getDay()] : [], every: 1, to: seasonEnd(date), dlD: 1, dlT: "18:00", tpl: "train", skip: []});
// Pravidlo z formuláře a všechny termíny (i vynechané) pro náhled
const ruleOf = f => ({days: f.rep.days, every: f.rep.every, from: f.date, to: f.rep.to, skip: f.rep.skip});
const allDates = f => datesOf(ruleOf(f), f.date, f.rep.to, []);
// Termíny, které se opravdu vytvoří (bez vynechaných)
const repDates = f => datesOf(ruleOf(f), f.date, f.rep.to, f.rep.skip);
// Zápis operací po dávkách (≤ 400 zápisů v dávce)
function commitOps(ops) {
  chunks(ops).forEach(part => {
    const b = S.db.batch();
    part.forEach(([t, c, id, d]) => { if (t === "set") b.set(c + "/" + id, d); else if (t === "merge") b.merge(c + "/" + id, d); else b.delete(c + "/" + id); });
    b.commit();
  });
}

// ===== Formulář: opakování =====
// Je zapnuté opakování (jen nový trénink)?
export const repOn = f => !!(f && f.rep && f.rep.on);
// Popis tlačítka Uložit ve formuláři (s opakováním „Vytvořit N tréninků“)
export const repSaveText = f => repOn(f) ? `🔁 Vytvořit ${repDates(f).length} tréninků` : "Uložit";
// Část formuláře nového tréninku: přepínač 🔁 Opakovat a při zapnutí volby série a náhled termínů
export function repHtml(f) {
  if (f.id || f.type !== "training") return "";
  if (!repOn(f)) return `<button class="s w" id="srt" style="margin:10px 0 4px">🔁 Opakovat (série tréninků)</button>`;
  const r = f.rep, all = allDates(f), sk = new Set(r.skip), n = all.filter(x => !sk.has(x)).length, end = seasonEnd(f.date);
  const tpls = cashMgr() ? Object.entries(cashCfg(S.cc).tpls) : [];
  return `<div class="cd" style="margin:10px 0;border-color:var(--ac)"><div class="row" style="justify-content:space-between;align-items:center"><b>🔁 Opakovat</b><button class="s" id="srt">Zrušit opakování</button></div>
<label>Dny v týdnu</label><div class="chips">${WEEK_DAYS.map(d => `<button class="chip ${r.days.includes(d) ? "on" : ""}" data-sd="${d}">${DN[d]}</button>`).join("")}</div>
<label>Jak často</label><div class="chips"><button class="chip ${r.every === 1 ? "on" : ""}" data-se="1">Každý týden</button><button class="chip ${r.every === 2 ? "on" : ""}" data-se="2">Každý 2. týden</button></div>
<label>Do (nejdéle konec sezóny ${end ? fd(end) : "30. 6."})</label><input type="date" id="srto" value="${esc(r.to)}" min="${esc(f.date)}" max="${esc(end)}">
<label>Konečný termín přihlašování</label><div class="row" style="align-items:center"><input type="number" id="srdd" min="0" max="14" value="${r.dlD}" style="max-width:80px"><span>dní předem v</span><input type="time" id="srdt" value="${esc(r.dlT)}" style="max-width:130px"></div>
${tpls.length ? `<label>Šablona pokladny</label><div class="chips">${tpls.map(([k, t]) => `<button class="chip ${r.tpl === k ? "on" : ""}" data-st="${esc(k)}">${esc(t.name)}</button>`).join("")}</div>` : ""}
<h3>Náhled termínů: ${n}${r.skip.length ? ` (vynecháno ${all.length - n})` : ""}</h3><div class="mu" style="margin-bottom:6px">Klepnutím termín vynecháš (prázdniny, svátky) nebo vrátíš.</div>
${all.length ? `<div class="chips">${all.map(x => `<button class="chip ${sk.has(x) ? "" : "on"}" data-sk="${x}" style="${sk.has(x) ? "text-decoration:line-through;opacity:.6" : ""}">${dayName(x)} ${fd(x)}</button>`).join("")}</div>` : '<div class="msg">Žádný termín – vyber den v týdnu a datum „do“.</div>'}</div>`;
}
// Obsluha části formuláře; readF = přepis hlavních polí formuláře do stavu (volá se před každým překreslením)
export function bindRep(a, f, readF) {
  const el = id => a.querySelector("#" + id);
  // Přepis polí opakování do stavu formuláře
  const readR = () => {
    if (!repOn(f)) return;
    const to = el("srto"), dd = el("srdd"), dt = el("srdt");
    if (to) f.rep.to = to.value;
    if (dd) f.rep.dlD = Math.max(0, Math.min(14, Math.round(+dd.value || 0)));
    if (dt) f.rep.dlT = dt.value || "18:00";
  };
  const act = (sel, fn) => a.querySelectorAll(sel).forEach(b => { b.onclick = () => { readF(); readR(); fn(b); render(); }; });
  // Zapnutí / vypnutí opakování (po vypnutí se vrátí výchozí termín přihlašování)
  act("#srt", () => { if (repOn(f)) { f.rep = null; if (!f.dl) { f.dl = dlDefault(f.date); f.dlAuto = true; } } else f.rep = repDefault(f.date); });
  act("[data-sd]", b => { const d = +b.dataset.sd, r = f.rep; r.days = r.days.includes(d) ? r.days.filter(x => x !== d) : [...r.days, d]; });
  act("[data-se]", b => { f.rep.every = +b.dataset.se === 2 ? 2 : 1; });
  act("[data-st]", b => { f.rep.tpl = b.dataset.st; });
  act("[data-sk]", b => { const x = b.dataset.sk, r = f.rep; r.skip = r.skip.includes(x) ? r.skip.filter(y => y !== x) : [...r.skip, x]; });
  // Změna „do“ a termínu přihlašování překreslí náhled (konec sezóny se hlídá při ukládání i v datasetu)
  ["srto", "srdd", "srdt"].forEach(id => { const e = el(id); if (e) e.onchange = () => { readF(); readR(); render(); }; });
  return readR;
}
// Uložení série: kontroly, zápis událostí po dávkách, šablona pokladny (jen správce pokladny), definice série zvlášť.
// Vrací true, když se zápis odeslal (formulář se zavře).
export function repSave(f) {
  const r = f.rep, end = seasonEnd(f.date);
  if (!f.date) { toast("Zadej datum"); return false; }
  if (!r.days.length) { toast("Vyber aspoň jeden den v týdnu"); return false; }
  if (!r.to || r.to < f.date) { toast("Datum „do“ musí být po datu prvního tréninku"); return false; }
  if (r.to > end) { r.to = end; toast("Série končí nejdéle koncem sezóny (" + fd(end) + ") – upraveno, zkontroluj náhled"); render(); return false; }
  const dates = repDates(f);
  if (!dates.length) { toast("Žádný termín – zkontroluj dny v týdnu a vynechané dny"); return false; }
  const rel = {d: r.dlD, t: r.dlT};
  if (!dlBeforeStart(relDl(dates[0], rel), dates[0], f.time)) { toast("Termín přihlašování musí být před začátkem tréninku"); return false; }
  const sid = S.db.collection(SERIES_COLL).newId(), ids = dates.map(() => S.db.collection("events").newId());
  const tpl = cashMgr() ? r.tpl : "train";
  const {series, ops} = seriesOps({sid, ids, dates, rule: ruleOf(f), d: {title: f.title, time: f.time, place: f.place, note: f.note, ...timeFields("training", f, evDefaults(S.es))}, rel, tpl, by: who(), at: new Date().toISOString()});
  commitOps(ops);
  // Definice série zvlášť: kdyby pravidla kolekci series ještě neznala, události se i tak vytvoří
  S.db.doc(SERIES_COLL + "/" + sid).set(series);
  toast("Vytvořeno tréninků: " + dates.length);
  return true;
}

// ===== Formulář: úprava události ze série =====
// Volba rozsahu úpravy (jen tato / tato a další) u tréninku ze série
export function scopeHtml(f) {
  if (!f.id || !f.ser) return "";
  const sc = f.scope === "next" ? "next" : "one";
  return `<label>Změnu uložit pro</label><div class="chips"><button class="chip ${sc === "one" ? "on" : ""}" data-sc="one">Jen tato</button><button class="chip ${sc === "next" ? "on" : ""}" data-sc="next">Tato a další</button></div>
<div class="mu" style="margin-bottom:6px">${sc === "next" ? "Čas od – do, ⏰ sraz, místo a termín přihlašování (stejně dní předem) se změní u této a dalších událostí série; ručně upravené události série se vynechají. Název, datum a poznámka jen u této." : "Změní se jen tato událost (série ji pak bere jako ručně upravenou)."}</div>`;
}
export function bindScope(a, f, readF) {
  a.querySelectorAll("[data-sc]").forEach(b => { b.onclick = () => { readF(); f.scope = b.dataset.sc; render(); }; });
}
// Uložení úpravy události ze série; d = údaje z formuláře (stejné jako u běžné úpravy). Vrací true, když se zápis odeslal.
export function serEditSave(f, d) {
  const cur = S.ev.find(x => x.id === f.id);
  if (!cur || !cur.ser) { S.db.doc("events/" + f.id).merge(d); return true; }
  if (f.scope !== "next") {
    // Jen tato: změna data, času, místa nebo termínu označí událost jako ručně upravenou
    // Porovnává se se skutečně zobrazeným koncem a srazem (událost bez polí = výchozí hodnoty), aby uložení beze změny nebylo „ruční úpravou“
    const D = evDefaults(S.es), shown = {...cur, end: endOf({...cur, type: "training"}, D), meet: meetOf({...cur, type: "training"}, D)};
    S.db.doc("events/" + f.id).merge(manualChange(shown, d) ? {...d, ser: {...cur.ser, x: 1}} : d);
    return true;
  }
  if (d.date !== cur.date) { toast("Datum se mění jen u jedné události – zvol „Jen tato“"); return false; }
  const plan = editPlan(S.ev, cur, d);
  // Aktuální událost dostane i název a poznámku; ostatní jen čas, místo a termín přihlašování
  commitOps(plan.apply.map(x => ["merge", "events", x.id, x.id === cur.id ? {...d, ...x.d} : x.d]));
  const rel = relOf(cur.date, d.dl);
  S.db.batch().merge(SERIES_COLL + "/" + cur.ser.id, {d: {time: d.time || "", place: d.place || "", ...(d.end !== undefined ? {end: d.end || ""} : {}), ...(typeof d.meet === "number" ? {meet: d.meet} : {}), ...(rel ? {dl: rel} : {})}, ed: {i: cur.ser.i, by: who(), at: new Date().toISOString()}}).commit();
  toast("Upraveno událostí: " + plan.apply.length + (plan.skip.length ? ". Vynechány ručně upravené: " + dList(plan.skip.map(x => x.date)) : ""));
  return true;
}

// ===== Detail události ze série =====
// Řádek „🔁 Série: 3. z 30“ pod hlavičkou (pořadí mezi dosud existujícími událostmi série)
export function serLine(ev) {
  const s = ev.raw && ev.raw.ser;
  if (!s || !s.id) return "";
  const all = S.ev.filter(e => e.ser && e.ser.id === s.id).sort((x, y) => x.ser.i - y.ser.i), k = all.findIndex(e => e.id === ev.id) + 1;
  return `<div class="mu" style="margin-top:4px">🔁 Série: ${k}. z ${all.length}${s.x ? " · upravená ručně" : ""}</div>`;
}
// Tlačítko smazání „tato a další budoucí“ (jen trénink ze série, jen s právem mazat události – matice ⚙️ → 🔐)
export function serDelBtn(ev) {
  if (!ev.raw || !ev.raw.ser || !HK.can("sport") || !HK.perm("events", "d")) return "";
  const key = "evs" + ev.id, on = armed(key);
  return `<button class="d" id="evds" style="${on ? "background:var(--no);color:#fff" : ""}">${on ? "Opravdu smazat? Klepni znovu" : "🗑 Tato a další"}</button>`;
}
// Smazání „tato a další budoucí“: jen události bez odpovědí v docházce a bez vyúčtování (příznak ss nebo uzavřené vyúčtování v evcash)
export function bindSerDel(a, ev) {
  const b = a.querySelector("#evds");
  if (!b) return;
  b.onclick = () => confirm2("evs" + ev.id, () => {
    const answered = new Set(S.at.map(x => x.eid));
    const evs = S.ev.map(e => ({...e, ss: e.ss || !!((S.ec.find(x => x.id === e.id) || {}).settle)}));
    const plan = deletePlan(evs, evs.find(e => e.id === ev.id) || ev.raw, answered, td());
    plan.del.forEach(id => S.db.doc("events/" + id).delete());
    if (plan.del.includes(ev.id)) S.evid = null;
    const kept = plan.keep.length ? " Ponecháno " + plan.keep.length + " (" + [...new Set(plan.keep.map(x => WHY[x.why]))].join(", ") + "): " + dList(plan.keep.map(x => x.date)) : "";
    toast(plan.del.length ? "Smazáno událostí: " + plan.del.length + "." + kept : "Nic se nesmazalo." + (kept || " Žádná budoucí událost série."));
    render();
  });
}
