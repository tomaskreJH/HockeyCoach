// 📋 Plán tréninku v detailu tréninku: karta pod rozdělením do pětek (bloky za sebou od začátku tréninku, linky s cvičením, trenéry
// a skupinami – 🎽 pětky / ⚔ posty / 🥅, rozpis točení stanovišť, 🔁 řady cvičení), okno cvičení #tpd, ✨ Připravit trénink; pod kartou
// ⏱ živý trénink, ⏲ výsledky měření a ⭐ hodnocení. Poslech jen trplan/{eid} otevřeného tréninku; číst HK.perm("trplan", "r"),
// hráčka vidí svou skupinu zvýrazněnou. Úprava plánu: trplan-edit.js; společné styly a pomůcky (derive, grpChip …) exportuje tento soubor.

// ===== Importy =====
import {CATS, LEVELS} from "../config/skills.js";
import {isG} from "../core/selectors.js";
import {S} from "../core/state.js";
import {clone, esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {lokState} from "../domain/event-helpers.js";
import {clock, DF, FW, GK, groupIn, grpLabel, hm2min, isBreak, isFixedLane, isPosBlock, laneOf, laneSeq, laneTags, MODES, myGroup, planBlank, planDoc, planGroups, planIssues, planMinutes, planTimes, POS_GRPS, posGroups, posGrp, rotation, seqMinutes, seqTimes, TRPLAN_COLL} from "../domain/training-plan.js";
import {bindMedia, bindThumbs, mediaHtml, thumbsHtml} from "./drill-media.js";
import {quickSplit} from "./line-split-view.js";
import {render} from "./shell.js";
import {bindMsCard, msCardHtml} from "./stopwatch-view.js";
import {bindEvalCard, evalCardHtml} from "./treval-view.js";
import {bindLiveCard, liveCardHtml} from "./trlive-view.js";
import {bindCover, coverHtml, loadPrep} from "./trplan-reuse.js";

// ===== Konstanty a stav =====
// S.tp = {eid: plán | null (není) | undefined (načítá se)}, S.tpErr = chyba načtení, S.tpe = úprava {eid, p, dirty, man},
// S.tpv = otevřené cvičení {eid, bi, li, si (pořadí v řadě | undefined)}; man = id bloků, jejichž délku trenér v této úpravě změnil ručně
// (výběr cvičení ji pak nepřepíše); S.tpe.mo = id bloků s ručně otevřenými „Další volby“; S.tpe.base = čas uložení plánu při otevření (at),
// struct = změna mimo řady cvičení, sqd = id linek se změněnou řadou, sman = id cvičení řady s ručně změněným časem, only = jen moje linky
let sub = {eid: null, un: null};                         // poslech plánu otevřeného tréninku
const LETTERS = ["A", "B", "C", "D"];
const DRESS = {1: "modrý", 2: "žlutý", 3: "zelený", 4: "růžový"};   // barva dresu pětky (jako štítky L1–L4)
const CSS = `<style>
#evw .tpb{border-top:1px solid var(--bd);padding:10px 0}
#evw .tph{display:flex;justify-content:space-between;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:4px}
#evw .tpl{padding:4px 6px;border-radius:8px}
#evw .tpl.me{outline:2px solid var(--ac)}
#evw .tpk{display:inline-block;min-width:22px;font-weight:800;color:var(--ac)}
#evw .tpdr{border:0;background:none;color:var(--ac);font-weight:700;padding:6px 0;text-align:left;text-decoration:underline;font-size:15px}
#evw .tpt{width:100%;border-collapse:collapse;margin-top:6px}
#evw .tpt td,#evw .tpt th{padding:4px 2px;border-bottom:1px solid var(--bd);text-align:center;font-size:13px}
#evw .tpt td.me{outline:3px solid var(--ac);outline-offset:-3px;border-radius:6px}
#evw .LG{background:#7b4fb3;color:#fff;border-color:#5a3786}
#evw .LF{background:#c0392b;color:#fff;border-color:#922b21} #evw .LD{background:#34495e;color:#fff;border-color:#22313f}
#evw .tpe{border:1px solid var(--bd);border-radius:12px;padding:10px;margin-bottom:10px;background:var(--bg)}
#evw .tpe select,#evw .tpe input{margin-bottom:6px}
#evw .tpi{margin:2px 0;font-size:13px}
#evw .tpi.err{color:var(--no)} #evw .tpi.warn{color:var(--wa)}
#evw .tpq{display:flex;gap:4px;flex-wrap:wrap;margin:4px 0 6px}
#evw .tpq button{padding:4px 10px;min-height:36px;font-size:13px}
#evw .tpmo{margin-top:8px;border-top:1px dashed var(--bd);padding-top:6px}
#evw .tpmo>summary{cursor:pointer;color:var(--ac);font-weight:600;padding:8px 0;min-height:40px}
#evw .tpb.brk{color:var(--mu)}
#evw .tpe.brk{border-style:dashed}
#evw .tpsq{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
#evw .tpsq .tpdr{padding:3px 0}
#evw .tpsr{border:1px solid var(--bd);border-radius:10px;padding:6px;margin-bottom:6px}
#evw .tpsr .row{align-items:center;flex-wrap:nowrap;gap:6px}
#evw .tpsr button{min-height:40px}
#evw .tpss{font-size:13px;margin:4px 0}
#evw .tpss.err{color:var(--no)} #evw .tpss.ok{color:var(--ok)}
#evw .tpsv{position:sticky;bottom:0;background:var(--bg);padding:8px 0 calc(8px + env(safe-area-inset-bottom,0px));z-index:3}
</style>`;

// ===== Pomocné funkce =====
const canE = () => HK.perm("trplan", "e");
const drillMap = () => Object.fromEntries((S.dr || []).map(d => [d.id, d]));
// Štítek skupiny (barva dresu, brankářky fialově, útočnice červeně, obránkyně tmavě); short = jen první písmeno / ikona
const GRP_ICON = {[GK]: ["🥅", " Brankářky"], [FW]: ["⚔", " Útočnice"], [DF]: ["🛡", " Obránkyně"]};
const grpChip = (g, short) => `<span class="evl L${g}" title="${esc(grpLabel(g))}">${GRP_ICON[g] ? GRP_ICON[g][0] + (short ? "" : GRP_ICON[g][1]) : short ? esc(grpLabel(g).slice(0, 1)) : esc(grpLabel(g))}</span>`;
// Skupina přihlášené hráčky v bloku (pětka nebo post)
const mineIn = (b, X) => groupIn(b, X.mine, X.mineP);
const grpChips = (grp, short) => (grp || []).map(g => grpChip(g, short)).join("");
// Odvozené údaje tréninku pro plán: skupiny (pětky i posty), trenéři, délka, začátek, skupina přihlášené hráčky, id člena týmu
function derive(ctx) {
  const {P, A, T, ev} = ctx, yes = id => A[id] && A[id].st === "yes", L = ev.raw.lines || {};
  const skP = P.filter(p => yes(p.id) && !isG(p)), sk = skP.map(p => p.id), gk = P.filter(p => yes(p.id) && isG(p)).map(p => p.id);
  const start = hm2min(ev.time), end = hm2min(ctx.end), me = HK.pid(), mp = P.find(p => p.id === me);
  return {
    groups: planGroups(L, sk, gk), pgroups: posGroups(skP, gk), pgFull: [...POS_GRPS, ...(gk.length ? [GK] : [])], pos: Object.fromEntries(skP.map(p => [p.id, p.pos])),
    roster: {lines: L, skaters: skP.map(p => ({id: p.id, pos: p.pos})), goalies: gk}, cnt: {sk, gk, L},
    mineP: mp ? (isG(mp) ? GK : posGrp(mp.pos)) : null,
    coaches: T.filter(t => yes(t.id)), staff: T,
    start: start == null ? 0 : start, total: start != null && end != null && end > start ? end - start : 0,
    // Hráčka (bez práva upravovat plán) vidí svou barvu dresu až po ✅ potvrzení dresů trenérem; brankářka svou skupinu vždy
    mine: mp && (canE() || isG(mp) || lokState(ev.raw) !== "none") ? myGroup(L, me, isG(mp)) : null, tid: HK.tid ? HK.tid() : null, lok: lokState(ev.raw)
  };
}
const staffName = (X, id) => { const t = X.staff.find(x => x.id === id); return t ? t.name : "?"; };
// Vede přihlášený člen týmu tuto linku? (⭐ moje linka)
const myLane = (l, X) => !!(X.tid && (l.co || []).includes(X.tid));
// Bloky převzaté s cvičením (uložený plán, kopie, šablona) mají délku zvolenou dřív – výběr jiného cvičení ji nepřepíše
const setMan = p => ((p && p.blocks) || []).filter(b => (b.lanes || []).some(l => l.drill)).map(b => b.id);

// ===== Načtení plánu =====
// Jeden poslech dokumentu trplan/{eid} pro otevřený trénink (předchozí se ukončí); výsledek v S.tp[eid]
function ensurePlan(eid) {
  if (sub.eid === eid) return;
  if (sub.un) try { sub.un(); } catch (e) { /* poslech už skončil */ }
  sub = {eid, un: null};
  S.tp = S.tp || {};
  S.tpErr = null;
  sub.un = S.db.collection(TRPLAN_COLL).part(eid).onSnapshot(v => {
    const d = v.docs.find(x => x.id === eid);
    S.tp[eid] = d ? d.data() : null;
    if (S.evid === eid && !(S.tpe && S.tpe.dirty)) render();
  }, e => { S.tpErr = (e && (e.code || e.message)) || "chyba"; S.tp[eid] = null; if (S.evid === eid) render(); });
}

// ===== Vykreslení: karta plánu =====
// Rozpis točení stanovišť: řádek = kolo (čas začátku), sloupec = stanoviště A–D, v buňce skupiny; skupina hráčky / linka trenéra zvýrazněná
function roundsHtml(b, t0, X) {
  const rl = (b.lanes || []).filter(l => !isFixedLane(l));
  if (b.mode !== "st" || rl.length < 2) return "";
  const rounds = rotation(b);
  return `<table class="tpt"><tr><th>Od</th>${rl.map((l, i) => `<th>${LETTERS[i]}${(l.co || []).includes(X.tid) ? " ⭐" : ""}</th>`).join("")}</tr>${rounds.map(r => `<tr><td>${clock(X.start, t0 + r.a)}</td>${rl.map(l => {
    const g = r.lanes[l.id] || [], mg = mineIn(b, X), me = mg != null && g.includes(mg);
    return `<td class="${me ? "me" : ""}">${grpChips(g, true) || "–"}</td>`;
  }).join("")}</tr>`).join("")}</table>`;
}
// Jeden blok plánu (karta i náhled v úpravě)
function blockHtml(b, bi, t, X, D, ro) {
  if (isBreak(b)) return `<div class="tpb brk"><div class="tph"><b>${ro ? "" : bi + 1 + ". "}${clock(X.start, t.a)}–${clock(X.start, t.b)}</b><span>☕ ${esc(b.brk || "Pauza")} · ${b.dur} min</span></div></div>`;
  const tags = laneTags(b), r0 = rotation(b)[0];
  const lanes = (b.lanes || []).map((l, li) => {
    const d = D[l.drill], name = d ? d.name : l.dn || (l.drill ? "?" : "— bez cvičení —");
    const mg = mineIn(b, X), mine = (mg != null && laneOf(b, r0, mg) === l.id && (b.mode === "all" || isFixedLane(l))) || (X.tid && (l.co || []).includes(X.tid));
    const co = (l.co || []).map(id => "🎓 " + esc(staffName(X, id))).join(", ");
    const grp = b.mode === "all" || isFixedLane(l) ? (grpChips(l.grp) || '<span class="mu">všichni</span>') : grpChips(l.grp, true);
    // Řada cvičení: čas začátku, cvičení a jeho délka pod sebou (okno bloku je společné)
    const seq = laneSeq(b, l), sm = seqMinutes(seq);
    const seqH = seq ? seqTimes(b, seq).map(x => { const dx = D[x.drill], nx = dx ? dx.name : x.dn || "— bez cvičení —";
      return `<div class="tpsq"><span class="mu">${clock(X.start, t.a + x.a)}</span>${x.drill || x.dn ? `<button class="tpdr" data-tpv="${bi}|${li}|${x.i}">${esc(nx)}</button>` : `<span class="mu">${esc(nx)}</span>`}<span class="mu">${Math.round((x.b - x.a) / 6) / 10} min</span></div>`; }).join("") + (sm < b.dur ? `<div class="mu" style="font-size:12px">${clock(X.start, t.a + sm * 60)} volno ${b.dur - sm} min</div>` : "") : "";
    const head = seq ? `<b>🔁 ${seq.length} ${seq.length < 5 ? "cvičení" : "cvičení"}</b>` : l.drill || l.dn ? `<button class="tpdr" data-tpv="${bi}|${li}">${esc(name)}</button>` : `<span class="mu">${esc(name)}</span>`;
    return `<div class="tpl ${mine ? "me" : ""}">${tags[li] ? `<span class="tpk">${tags[li]}</span>` : ""}${head}${!seq && ((l.di || []).length || (d && (d.img || []).length)) ? " 📷" : ""}
<div class="mu" style="font-size:13px">${co ? co + " · " : ""}${b.mode === "st" && !isFixedLane(l) ? "začíná: " : ""}${grp}</div>${seqH}</div>`;
  }).join("");
  return `<div class="tpb"><div class="tph"><b>${ro ? "" : bi + 1 + ". "}${clock(X.start, t.a)}–${clock(X.start, t.b)}</b><span class="mu">${MODES[b.mode]}${isPosBlock(b) ? " · ⚔ podle postů" : ""} · ${b.dur} min${b.mode === "st" && b.rot ? " · točení po " + b.rot + " min" : ""}</span></div>${lanes}${roundsHtml(b, t.a, X)}</div>`;
}
// Upozornění pro trenéry (chyby červeně, upozornění oranžově)
function issuesHtml(p, X, D) {
  const I = planIssues(p, {total: X.total, groups: X.groups, pgroups: X.pgroups, coaches: X.coaches.map(t => t.id), drills: D});
  return I.length ? `<div style="margin:6px 0">${I.map(x => `<div class="tpi ${x.lvl}">${x.lvl === "err" ? "⛔" : "⚠️"} ${esc(x.t)}</div>`).join("")}</div>` : '<div class="tpi" style="color:var(--ok)">✅ Plán bez kolizí.</div>';
}
function bodyHtml(p, X, D, staff) {
  const T = planTimes(p.blocks), used = planMinutes(p.blocks);
  const head = `${p.goal ? `<div style="margin-bottom:4px">🎯 <b>${esc(p.goal)}</b></div>` : ""}<div class="mu">${p.blocks.length} ${p.blocks.length === 1 ? "blok" : p.blocks.length < 5 ? "bloky" : "bloků"} · ${used} min${X.total ? " z " + X.total : ""}</div>
${X.mine != null || (X.mineP && p.blocks.some(isPosBlock)) ? `<div style="margin:6px 0">Tvoje skupina: ${X.mine != null ? grpChip(X.mine) : ""}${X.mineP && X.mineP !== GK && p.blocks.some(isPosBlock) ? grpChip(X.mineP) : ""}${!staff && DRESS[X.mine] ? ` · 🎽 vezmi si <b>${DRESS[X.mine]}</b> dres` : ""}</div>` : !staff && HK.pid() ? (X.lok === "none" ? '<div class="mu" style="margin:6px 0">🎽 Barvu dresu uvidíš, až trenér rozdělení potvrdí.</div>' : '<div class="mu" style="margin:6px 0">Zatím nemáš dres (rozdělení dělá trenér po přihlášení).</div>') : ""}`;
  return head + (staff ? issuesHtml(p, X, D) : "") + p.blocks.map((b, bi) => blockHtml(b, bi, T[bi], X, D)).join("");
}
// Okno cvičení: obrázky (klepnutí = celá obrazovka), popis a odkazy; hráčka vidí název a obrázky z kopie v plánu
function drillSheetHtml(p, X, D) {
  const v = S.tpv;
  if (!v || !p) return "";
  const b = p.blocks[v.bi], l0 = b && b.lanes[v.li], seq = l0 && laneSeq(b, l0);
  // Cvičení řady: název, obrázky a délka z položky řady; trenéři z linky
  const l = l0 && seq && v.si != null ? {...l0, ...(seq[v.si] || {})} : l0;
  if (!l) return "";
  const d = D[l.drill], name = d ? d.name : l.dn, img = d ? d.img || [] : l.di || [];
  const co = (l.co || []).map(id => "🎓 " + esc(staffName(X, id))).join(", ");
  return `<div class="md" id="tpd"><div class="mb"><h2>${esc(name || "Cvičení")}</h2>
${d ? `<div class="mu">${esc(CATS[d.cat] || "")} · ${LEVELS[d.lvl] || ""} · ${+d.dur || "?"} min</div>` : ""}${co ? `<div class="mu">${co}</div>` : ""}
${thumbsHtml(img, 160, render) || '<div class="mu" style="margin:6px 0">Bez obrázku.</div>'}
${d && d.eq ? `<div class="mu">Pomůcky: ${esc(d.eq)}</div>` : ""}${d && d.desc ? `<div style="white-space:pre-wrap;margin:6px 0">${esc(d.desc)}</div>` : ""}
${d && d.url ? mediaHtml(d.url, "▶ Přehrát video") : ""}${d && d.pdf ? mediaHtml(d.pdf, "📄 Zobrazit PDF") : ""}
<button class="s w" id="tpdx" style="margin-top:10px;min-height:52px">Zavřít</button></div></div>`;
}
// Karta „📋 Plán tréninku“ v detailu tréninku (ctx z events.js: ev, P, A, T, end)
function cardHtml(ctx) {
  const eid = ctx.ev.id;
  ensurePlan(eid);
  const p = S.tp[eid], e = canE(), staff = HK.can("sport"), X = derive(ctx), D = drillMap();
  let body;
  if (p === undefined) body = '<div class="mu">Načítám plán…</div>';
  else if (S.tpErr && !p) body = `<div class="msg">Plán se nepodařilo načíst (${esc(S.tpErr)}). Manager musí publikovat pravidla databáze ve verzi v21.1.</div>`;
  else if (!p || !(p.blocks || []).length) body = e ? '<div class="mu" style="margin-bottom:8px">Plán zatím není. Bloky Společně a Stanoviště s cvičeními z 📚 banky, trenéry a skupinami z rozdělení do dresů.</div><button class="p w" id="tpprep" style="min-height:52px">✨ Připravit trénink</button><div class="mu" style="font-size:12px;margin:4px 0 8px">Rozdělí přihlášené do dresů (jako minule, pokud ještě nejsou) a nabídne minulý plán nebo poslední šablonu.</div><button class="s w" id="tpnew">➕ Prázdný plán</button>' : '<div class="mu">Trenér zatím plán nepřipravil.</div>';
  else body = bodyHtml(p, X, D, staff);
  return CSS + `<div class="cd" id="tpc"><div class="row" style="align-items:center;flex-wrap:nowrap"><h2 style="margin:0;flex:1">📋 Plán tréninku</h2>${e && p && (p.blocks || []).length ? '<button class="s" id="tped" style="flex:none">✏️ Upravit</button>' : ""}</div>${p && (p.blocks || []).length ? liveCardHtml(eid) : ""}${body}${p && (p.blocks || []).length ? msCardHtml(eid, p, D) + evalCardHtml(eid, p, D, X.roster, ctx.ev.date) : ""}${p !== undefined ? coverHtml(eid, X) : ""}</div>` + drillSheetHtml(p, X, D);
}

// ===== Eventy =====
function bindCard(a, ctx) {
  // base = čas uložení plánu při otevření (sloučení při uložení); only = ⭐ jen moje linky (zapnuté, když nějakou vedu a nejsem jediný trenér)
  const eid = ctx.ev.id, open = p => { const cur = S.tp[eid]; S.tpe = {eid, p, dirty: false, man: setMan(p), base: cur ? cur.at || null : null, struct: false, sqd: [], sman: [], only: false}; render(); window.scrollTo(0, 0); };
  const X = derive(ctx);
  bindCover(a, eid, X, drillMap());
  bindLiveCard(a, eid, () => ({...derive(ctx), D: drillMap(), plan: S.tp[eid], ev: ctx.ev, end: ctx.end}));
  bindMsCard(a, eid, () => ({...derive(ctx), D: drillMap(), plan: S.tp[eid]}));
  if (S.tp[eid]) bindEvalCard(a, eid, () => ({...derive(ctx), D: drillMap(), plan: S.tp[eid]}));
  const nw = a.querySelector("#tpnew");
  if (nw) nw.onclick = () => open(planBlank());
  // ✨ Připravit trénink: pětky posledním způsobem (jen nerozdělené přihlášené), pak plán s nabídkou minulého plánu / poslední šablony
  const pr = a.querySelector("#tpprep");
  if (pr) pr.onclick = () => {
    const how = quickSplit(ctx.ev, ctx.P, ctx.A);
    open(planBlank()); loadPrep(eid);
    toast(how ? "Dresy rozděleny: " + how : "Dresy beze změny – vyber, z čeho plán začít");
  };
  const ed = a.querySelector("#tped");
  if (ed) ed.onclick = () => open(clone(planDoc(S.tp[eid] || planBlank(), drillMap())));
  a.querySelectorAll("[data-tpv]").forEach(b => b.onclick = () => { const [bi, li, si] = b.dataset.tpv.split("|"); S.tpv = {eid, bi: +bi, li: +li, si: si == null ? undefined : +si}; render(); });
  const x = a.querySelector("#tpdx");
  if (x) x.onclick = () => { S.tpv = null; render(); };
  bindThumbs(a.querySelector("#tpd"));
  bindMedia(a.querySelector("#tpd"));
}

// ===== Exporty =====
// Karta plánu do detailu tréninku (prázdný text bez práva číst); ctx = {ev, P, A, T, end, css}
export function planCardHtml(ctx) {
  if (!HK.perm("trplan", "r")) return "";
  if (S.tpv && S.tpv.eid !== ctx.ev.id) S.tpv = null;
  return cardHtml(ctx);
}
export function bindPlanCard(a, ctx) { if (HK.perm("trplan", "r")) bindCard(a, ctx); }
// Je pro tento trénink otevřená úprava plánu? (detail pak místo sebe vykreslí planEditor)
export const planEditing = eid => !!(S.tpe && S.tpe.eid === eid && canE());
export {CSS, GRP_ICON, blockHtml, derive, drillMap, ensurePlan, grpChip, issuesHtml, myLane, roundsHtml, setMan, staffName};
