// 📋 Plán tréninku – pomůcky: ⧉ kopie z předchozího tréninku, 📑 šablony (trtpl), 📊 pokrytí dovedností za 14 / 30 / 60 dní (jen realizační tým),
// ✨ Připravit trénink (loadPrep – poslední trénink s plánem a poslední šablona).
// Čte se jen na vyžádání (plány po jednom dokumentu, šablony getAll). Kopie / šablona nahradí rozpracovaný plán, uloží až 💾 Uložit plán.
// Výpočty domain/plan-reuse.js a domain/skill-coverage.js.
// ===== Importy =====
import {SKILLS} from "../config/skills.js";
import {armed, confirm2} from "../core/actions.js";
import {nm, pl} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {TPL_MAX, TRTPL_COLL, copySources, latestTpl, planCopy, planSummary, tplDoc, tplError, tplSort} from "../domain/plan-reuse.js";
import {COVER_DAYS, COVER_DEF, COVER_LOW, coverWindow, skillCoverage} from "../domain/skill-coverage.js";
import {TRPLAN_COLL} from "../domain/training-plan.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
// S.tpr = {eid, kind: "copy" | "tpl" | "save" | "prep", st: "load" | "ok" | "err", list, err, name}; u prep navíc c = předchozí trénink s plánem, t = poslední šablona; S.tcv = {eid, days, st, res, err}
const CSS = `<style>
.tcr{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--bd)}
.tcr .nm{flex:0 0 42%;font-size:14px}
.tcr .br{flex:1;height:10px;border-radius:5px;background:var(--bd);overflow:hidden}
.tcr .br i{display:block;height:100%;background:var(--ok)}
.tcr.low .br i{background:var(--wa)}
.tcr .pc{flex:none;width:76px;text-align:right;font-size:13px;font-weight:700}
.tcr.low .pc{color:var(--wa)}
.tci{padding:8px 0;border-bottom:1px solid var(--bd)}
</style>`;

// ===== Pomocné funkce =====
// Podpis zápisu: kdo a kdy (pravidla databáze vyžadují by / at)
const stamp = () => { const u = HK.user(); return {by: ((u && u.email) || "").toLowerCase(), at: new Date().toISOString()}; };
const errTxt = e => (e && (e.code || e.message)) || "chyba";
// Datum události česky (d. m. rrrr)
const dmy = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "")); return m ? +m[3] + ". " + +m[2] + ". " + m[1] : String(s || ""); };
const names = ids => ids.map(id => esc(nm(id))).join(", ");
// Plán jednoho tréninku jednorázově (chyba = žádný plán)
const planOf = id => S.db.doc(TRPLAN_COLL + "/" + id).get().catch(() => null);

// ===== Načtení =====
// ⧉ Kopie: předchozí tréninky a jejich plány (jen ty, které plán mají)
function loadCopy(eid) {
  const R = S.tpr = {eid, kind: "copy", st: "load", list: []}, src = copySources(S.ev, eid);
  Promise.all(src.map(e => planOf(e.id).then(p => ({ev: e, p}))))
    .then(L => { if (S.tpr !== R) return; R.list = L.filter(x => x.p && (x.p.blocks || []).length); R.st = "ok"; render(); });
  render();
}
// 📑 Šablony týmu
function loadTpl(eid, kind = "tpl") {
  const R = S.tpr = {eid, kind, st: "load", list: [], name: ""};
  S.db.collection(TRTPL_COLL).getAll()
    .then(L => { if (S.tpr !== R) return; R.list = tplSort(L); R.st = "ok"; render(); })
    .catch(e => { if (S.tpr !== R) return; R.st = "err"; R.err = errTxt(e); render(); });
  render();
}
// ✨ Připravit: předchozí trénink s plánem (stejný den v týdnu, jinak nejnovější) a naposledy uložená šablona – obojí najednou
export function loadPrep(eid) {
  const R = S.tpr = {eid, kind: "prep", st: "load", list: [], c: null, t: null, tErr: null}, src = copySources(S.ev, eid);
  // ⧉ Jako minule: přednostně nejnovější trénink stejného dne v týdnu s plánem, jinak nejnovější trénink s plánem
  const cur = (S.ev || []).find(e => e.id === eid), dow = d => new Date(String(d || "") + "T12:00:00").getDay();
  const cp = Promise.all(src.map(e => planOf(e.id).then(p => ({ev: e, p})))).then(L => {
    const ok = L.filter(x => x.p && (x.p.blocks || []).length);
    R.c = (cur && ok.find(x => dow(x.ev.date) === dow(cur.date))) || ok[0] || null;
  });
  const tp = S.db.collection(TRTPL_COLL).getAll().then(L => { R.t = latestTpl(L); }).catch(e => { R.tErr = errTxt(e); });
  Promise.all([cp, tp]).then(() => { if (S.tpr !== R) return; R.st = "ok"; render(); });
  render();
}
// 🎟 Hostující hráčky se do pokrytí dovedností nepočítají (trénují hlavně jinde) – jen hráčky týmu
const own = ids => (ids || []).filter(id => !(pl(id) || {}).guest);
// 📊 Pokrytí: tréninky v období → jejich plány (po jednom dokumentu) → výpočet nad docházkou a bankou cvičení
function loadCover(eid, days, X, D) {
  const R = S.tcv = {eid, days, st: "load"}, T = coverWindow(S.ev, eid, days);
  Promise.all(T.map(e => planOf(e.id).then(p => [e.id, p]))).then(L => {
    if (S.tcv !== R) return;
    R.res = skillCoverage({pids: own([...X.cnt.sk, ...X.cnt.gk]), goalies: new Set(X.cnt.gk), trainings: T.map(e => ({id: e.id, lines: e.lines || {}})),
      plans: Object.fromEntries(L), att: S.at, drills: D, pos: X.pos});
    R.cnt = T.length; R.st = "ok"; render();
  }).catch(e => { if (S.tcv !== R) return; R.st = "err"; R.err = errTxt(e); render(); });
  render();
}

// ===== Vykreslení: kopie a šablony =====
function copyListHtml(R) {
  if (R.st === "load") return '<div class="mu">Hledám plány předchozích tréninků…</div>';
  if (!R.list.length) return '<div class="mu">Žádný z posledních tréninků nemá plán.</div>';
  return R.list.map((x, i) => `<div class="tci"><div class="row" style="align-items:center;flex-wrap:nowrap"><div style="flex:1"><b>${esc(dmy(x.ev.date))}</b> ${esc(x.ev.time || "")} · ${esc(x.ev.title || "Trénink")}
<div class="mu" style="font-size:13px">${esc(planSummary(x.p))}${x.p.goal ? " · 🎯 " + esc(x.p.goal) : ""}</div></div><button class="s" data-tpru="c|${i}" style="flex:none;${armed("tpru:c" + i) ? "background:var(--wa);color:#fff" : ""}">${armed("tpru:c" + i) ? "Nahradit?" : "Použít"}</button></div></div>`).join("");
}
function tplListHtml(R) {
  if (R.st === "load") return '<div class="mu">Načítám šablony…</div>';
  if (R.st === "err") return `<div class="msg">Šablony se nepodařilo načíst (${esc(R.err)}). Manager musí publikovat pravidla databáze ve verzi v21.2.</div>`;
  if (!R.list.length) return '<div class="mu">Zatím žádná šablona. Ulož plán tlačítkem 💾 Uložit jako šablonu.</div>';
  return R.list.map((t, i) => `<div class="tci"><div class="row" style="align-items:center;flex-wrap:nowrap"><div style="flex:1"><b>${esc(t.name)}</b>
<div class="mu" style="font-size:13px">${esc(planSummary(t))}${t.goal ? " · 🎯 " + esc(t.goal) : ""}</div></div>
<button class="s" data-tpru="t|${i}" style="flex:none;${armed("tpru:t" + i) ? "background:var(--wa);color:#fff" : ""}">${armed("tpru:t" + i) ? "Nahradit?" : "Použít"}</button>
<button class="d" data-tprd="${i}" style="flex:none;padding:4px 10px;min-height:0;${armed("tprd:" + t.id) ? "background:var(--no);color:#fff" : ""}">${armed("tprd:" + t.id) ? "Smazat?" : "🗑"}</button></div></div>`).join("");
}
function saveHtml(R) {
  return `<label>Název šablony</label><input id="tprn" maxlength="${TPL_MAX.name}" value="${esc(R.name || "")}" placeholder="např. Stanoviště – bruslení a střelba">
<div class="mu" style="font-size:12px">Uloží se bloky, délky, točení a cvičení. Trenéři a skupiny stanovišť se doplní až podle tréninku, kde šablonu použiješ.</div>
${R.st === "err" ? `<div class="msg">Šablony se nepodařilo načíst (${esc(R.err)}). Manager musí publikovat pravidla databáze ve verzi v21.2.</div>` : ""}
<button class="p w" id="tprs" style="margin-top:8px" ${R.st === "load" ? "disabled" : ""}>💾 Uložit šablonu</button>`;
}
// ✨ Návrh: dvě velká tlačítka (předchozí trénink, poslední šablona); prázdný plán = rovnou přidat blok
function prepHtml(R) {
  if (R.st === "load") return '<div class="mu">Hledám poslední plán a šablonu…</div>';
  const btn = (k, title, sub) => `<button class="s w" data-tpru="${k}|0" style="text-align:left;margin-bottom:8px;min-height:56px;${armed("tpru:" + k + "0") ? "background:var(--wa);color:#fff" : ""}">${armed("tpru:" + k + "0") ? "Nahradit rozpracovaný plán? Klepni znovu" : title}<div class="mu" style="font-size:13px;font-weight:400">${sub}</div></button>`;
  const c = R.c ? btn("c", `⧉ Jako minule – ${esc(dmy(R.c.ev.date))} ${esc(R.c.ev.time || "")}`, esc(planSummary(R.c.p)) + (R.c.p.goal ? " · 🎯 " + esc(R.c.p.goal) : "")) : "";
  const t = R.t ? btn("t", `📑 Šablona – ${esc(R.t.name)}`, esc(planSummary(R.t)) + (R.t.goal ? " · 🎯 " + esc(R.t.goal) : "")) : "";
  const none = !c && !t ? `<div class="mu" style="margin-bottom:6px">${R.tErr ? "Šablony se nepodařilo načíst (" + esc(R.tErr) + "). " : ""}Žádný předchozí plán ani šablona – přidej bloky dole.</div>` : "";
  return c + t + none + '<div class="mu" style="font-size:12px">Nebo začni prázdný plán: ✕ a bloky přidáš dole.</div>';
}
function reusePanelHtml(eid) {
  const R = S.tpr && S.tpr.eid === eid ? S.tpr : null;
  if (!R) return "";
  const title = {copy: "⧉ Kopírovat z předchozího tréninku", tpl: "📑 Použít šablonu", save: "💾 Uložit jako šablonu", prep: "✨ Připravit trénink – z čeho začít?"}[R.kind];
  const body = R.kind === "copy" ? copyListHtml(R) : R.kind === "tpl" ? tplListHtml(R) : R.kind === "prep" ? prepHtml(R) : saveHtml(R);
  return `<div class="tpe"><div class="row" style="align-items:center;flex-wrap:nowrap"><b style="flex:1">${title}</b><button class="s" id="tprx" style="flex:none;padding:4px 10px;min-height:0">✕</button></div>
${R.kind !== "save" ? '<div class="mu" style="font-size:12px;margin-bottom:4px">Použití nahradí rozpracovaný plán; skupiny stanovišť se rozdělí podle pětek tohoto tréninku, trenéři jen přihlášení. Uloží se až 💾 Uložit plán.</div>' : ""}${body}</div>`;
}

// ===== Vykreslení: pokrytí dovedností =====
function coverRowsHtml(res) {
  return res.rows.map(r => `<details class="tcrw"><summary class="tcr ${r.pct < COVER_LOW ? "low" : ""}" style="list-style:none;cursor:pointer"><span class="nm">${esc(SKILLS[r.k] || r.k)}</span>
<span class="br"><i style="width:${r.pct}%"></i></span><span class="pc">${r.have}/${r.pop} · ${r.pct} %</span></summary>
<div class="mu" style="font-size:12px;padding:4px 0 6px">${r.miss.length ? "Netrénovaly: " + names(r.miss) : "Trénovaly všechny."}${r.min ? " Průměrně " + r.min + " min na hráčku." : ""}</div></details>`).join("");
}
function coverBodyHtml(R, X) {
  if (R.st === "load") return '<div class="mu">Počítám z plánů a docházky…</div>';
  if (R.st === "err") return `<div class="msg">Pokrytí se nepodařilo spočítat (${esc(R.err)}).</div>`;
  const res = R.res, pop = own([...X.cnt.sk, ...X.cnt.gk]).length, gst = X.cnt.sk.length + X.cnt.gk.length - pop;
  if (!pop) return '<div class="mu">Na trénink zatím není nikdo přihlášený.</div>';
  if (!res.n) return `<div class="mu">Za posledních ${R.days} dní ${R.cnt ? "nemá žádný z " + R.cnt + " tréninků plán" : "nebyl žádný trénink"} – není z čeho počítat.</div>`;
  const low = res.rows.filter(r => r.pct < COVER_LOW).length;
  return `<div class="mu" style="font-size:13px;margin-bottom:4px">${pop} přihlášených · ${res.n} ${res.n === 1 ? "trénink" : res.n < 5 ? "tréninky" : "tréninků"} s plánem za ${R.days} dní${low ? ` · <b style="color:var(--wa)">${low} ${low === 1 ? "dovednost" : low < 5 ? "dovednosti" : "dovedností"} pod ${COVER_LOW} %</b>` : ""}. Klepni na dovednost pro jména.</div>
${coverRowsHtml(res)}${gst ? `<div class="mu" style="font-size:12px;margin-top:6px">🎟 Hostující (${gst}) se nepočítají.</div>` : ""}${res.none.length ? `<div class="mu" style="font-size:12px;margin-top:6px">Bez tréninku s plánem v období: ${names(res.none)}</div>` : ""}
${(S.dr || []).length ? "" : '<div class="mu" style="font-size:12px">Banka cvičení se nenačetla – dovednosti cvičení nejsou známé.</div>'}`;
}
function coverSectionHtml(eid, X) {
  const R = S.tcv && S.tcv.eid === eid ? S.tcv : null;
  if (!R) return `<button class="s w" id="tcvo" style="margin-top:8px">📊 Pokrytí dovedností přihlášených</button>`;
  return CSS + `<div class="tpe" style="margin-top:8px"><div class="row" style="align-items:center;flex-wrap:nowrap"><b style="flex:1">📊 Pokrytí dovedností</b><button class="s" id="tcvx" style="flex:none;padding:4px 10px;min-height:0">✕</button></div>
<div class="chips" style="margin:6px 0">${COVER_DAYS.map(d => `<button class="chip ${R.days === d ? "on" : ""}" data-tcvd="${d}">${d} dní</button>`).join("")}</div>
<div class="mu" style="font-size:12px;margin-bottom:6px">Kolik přihlášených hráček mělo dovednost v plánu tréninku, na kterém byly (podle jejich skupiny); 🧤 jen brankářky.</div>${coverBodyHtml(R, X)}</div>`;
}

// ===== Eventy =====
function bindCoverSection(a, eid, X, D) {
  const q = s => a.querySelector(s);
  const o = q("#tcvo"), x = q("#tcvx");
  if (o) o.onclick = () => loadCover(eid, COVER_DEF, X, D);
  if (x) x.onclick = () => { S.tcv = null; render(); };
  a.querySelectorAll("[data-tcvd]").forEach(b => b.onclick = () => loadCover(eid, +b.dataset.tcvd, X, D));
}

// ===== Exporty =====
// Úprava plánu: tlačítka ⧉ / 📑 / 💾 šablona a otevřený panel (jen s právem upravovat plán – úprava se jinak neotevře)
export function reuseHtml(eid) {
  return `<div class="row" style="margin:8px 0;flex-wrap:wrap"><button class="s" id="tprc" style="flex:1 1 140px">⧉ Z předchozího tréninku</button><button class="s" id="tprt" style="flex:1 1 140px">📑 Ze šablony</button><button class="s" id="tprv" style="flex:1 1 140px">💾 Uložit jako šablonu</button></div>${reusePanelHtml(eid)}`;
}
// apply(plán) nahradí rozpracovaný plán; cur() = rozpracovaný plán (pro šablonu a pro potvrzení nahrazení)
export function bindReuse(a, eid, X, D, apply, cur) {
  const q = s => a.querySelector(s), R = S.tpr && S.tpr.eid === eid ? S.tpr : null;
  q("#tprc").onclick = () => loadCopy(eid);
  q("#tprt").onclick = () => loadTpl(eid);
  q("#tprv").onclick = () => loadTpl(eid, "save");
  const x = q("#tprx");
  if (x) x.onclick = () => { S.tpr = null; render(); };
  if (!R) return;
  // Použití: s bloky v rozpracovaném plánu druhým klepnutím
  const use = (key, src) => {
    const go = () => { apply(planCopy(src, X.groups, X.coaches.map(t => t.id), D, X.pgroups)); S.tpr = null; toast("Plán převzat – zkontroluj a ulož"); };
    if ((cur().blocks || []).length) confirm2(key, go); else go();
  };
  a.querySelectorAll("[data-tpru]").forEach(b => b.onclick = () => {
    const [k, i] = b.dataset.tpru.split("|"), it = R.kind === "prep" ? (k === "c" ? R.c : R.t) : R.list[+i];
    if (it) use("tpru:" + k + i, k === "c" ? it.p : it);
  });
  a.querySelectorAll("[data-tprd]").forEach(b => b.onclick = () => {
    const t = R.list[+b.dataset.tprd];
    if (t) confirm2("tprd:" + t.id, () => { S.db.doc(TRTPL_COLL + "/" + t.id).delete(); R.list = R.list.filter(y => y.id !== t.id); toast("Šablona smazána"); });
  });
  const n = q("#tprn");
  if (n) n.oninput = () => { R.name = n.value; };
  const sv = q("#tprs");
  if (sv) sv.onclick = () => {
    const name = n ? n.value : "", err = tplError(name, R.list);
    if (err) return toast(err);
    const p = cur();
    if (!(p.blocks || []).length) return toast("Plán nemá žádný blok");
    const doc = {...tplDoc(name, p, D), ...stamp()};
    S.db.doc(TRTPL_COLL + "/" + S.db.collection(TRTPL_COLL).newId()).set(doc);
    toast("Šablona „" + doc.name + "“ uložena");
    S.tpr = null; render();
  };
}
// 📊 Pokrytí dovedností (karta plánu i úprava): jen realizační tým
export const coverHtml = (eid, X) => (HK.can("sport") ? coverSectionHtml(eid, X) : "");
export function bindCover(a, eid, X, D) { if (HK.can("sport")) bindCoverSection(a, eid, X, D); }
