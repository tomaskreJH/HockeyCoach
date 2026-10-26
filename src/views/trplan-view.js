// 📋 Plán tréninku v detailu tréninku (karta pod Rozdělením do pětek) a jeho úprava na celé stránce.
// Plán = trplan/{eid}: bloky 👥 Společně / 🔄 Stanoviště za sebou od začátku tréninku, linky s cvičením z banky, trenéry a skupinami
// (🎽 pětky z rozdělení nebo ⚔ posty útočnice / obránkyně – volba u bloku – + 🥅 brankářky); u stanovišť rozpis točení po kolech;
// ⏱ živý trénink z karty (views/trlive-view.js), ⏲ výsledky měření a ⭐ hodnocení pod plánem (views/stopwatch-view.js, views/treval-view.js).
// Čte se jen pro otevřený trénink.
// Délka bloku = čas cvičení v tomto tréninku (−/+, číslo, rychlá volba); výběr cvičení převezme jeho délku z banky, dokud ji trenér nezmění.
// Úprava bloku ukazuje jen cvičení, ⏱ čas a skupiny; režim, posty, točení, trenéři a souběžná linka jsou pod „⚙ Další volby“ (otevřené, když se používají).
// Řada cvičení: linka, která se netočí (Společně, souběžná, 🥅), může mít víc cvičení s vlastním časem v okně bloku – čas bloku určuje hlavní
// trenér, cvičení linky si plánuje její trenér (⭐ moje linky, filtr „Jen moje linky“). Uložení sloučí řady, které mezitím uložil někdo jiný.
// ✨ Připravit trénink: rozdělí nerozdělené přihlášené do pětek posledním způsobem a otevře plán s nabídkou minulého plánu / poslední šablony.
// Práva: číst / upravovat podle modulu trplan (HK.perm); hráčka vidí celý plán se zvýrazněnou svou skupinou, bez upozornění pro trenéry.
// Cvičení klepnutím otevře okno s obrázky (přes celou obrazovku) a popisem; výpočty v domain/training-plan.js.
// ⧉ kopie z předchozího tréninku, 📑 šablony a 📊 pokrytí dovedností: views/trplan-reuse.js.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Načtení plánu -> Vykreslení (karta, okno cvičení, úprava) -> Eventy -> Exporty.

// ===== Importy =====
import {CATS, LEVELS} from "../config/skills.js";
import {armed, confirm2} from "../core/actions.js";
import {isG} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {BLK_DUR_MAX, BLK_DUR_MIN, BRK_MAX, BY, DF, FW, GK, MODES, PLAN_MAX, POS_GRPS, TRPLAN_COLL, blockBlank, blockExtras, breakBlank, clock, groupIn, groupsFor, grpLabel, hm2min, isBreak, isFixedLane, isPosBlock, laneBlank, laneOf, laneSeq, laneTags, moveBlock, myGroup, planBlank, planDoc, planGroups, planIssues, planMinutes, planTimes, posGroups, posGrp, mergePlan, rotation, seqBlank, seqMinutes, seqOk, seqStart, seqTimes} from "../domain/training-plan.js";
import {bindMedia, bindThumbs, mediaHtml, thumbsHtml} from "./drill-media.js";
import {openDrillPicker} from "./drill-picker.js";
import {bindCover, bindReuse, coverHtml, loadPrep, reuseHtml} from "./trplan-reuse.js";
import {quickSplit} from "./line-split-view.js";
import {bindLiveCard, liveCardHtml} from "./trlive-view.js";
import {bindMsCard, msCardHtml} from "./stopwatch-view.js";
import {bindEvalCard, evalCardHtml} from "./treval-view.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
// S.tp = {eid: plán | null (není) | undefined (načítá se)}, S.tpErr = chyba načtení, S.tpe = úprava {eid, p, dirty, man},
// S.tpv = otevřené cvičení {eid, bi, li, si (pořadí v řadě | undefined)}; man = id bloků, jejichž délku trenér v této úpravě změnil ručně
// (výběr cvičení ji pak nepřepíše); S.tpe.mo = id bloků s ručně otevřenými „Další volby“; S.tpe.base = čas uložení plánu při otevření (at),
// struct = změna mimo řady cvičení, sqd = id linek se změněnou řadou, sman = id cvičení řady s ručně změněným časem, only = jen moje linky
let sub = {eid: null, un: null};                         // poslech plánu otevřeného tréninku
const LETTERS = ["A", "B", "C", "D"];
const QUICK_DUR = [5, 8, 10, 12, 15, 20, 30];             // rychlá volba délky bloku (min)
const QUICK_BRK = [2, 3, 5, 10];                          // rychlá volba délky ☕ pauzy (min)
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
const clone = o => JSON.parse(JSON.stringify(o));
const stamp = () => { const u = HK.user(); return {by: ((u && u.email) || "").toLowerCase(), at: new Date().toISOString()}; };
const drillMap = () => Object.fromEntries((S.dr || []).map(d => [d.id, d]));
// Štítek skupiny (barva pětky, brankářky fialově, útočnice červeně, obránkyně tmavě); short = jen číslo / ikona
const GRP_ICON = {[GK]: ["🥅", " Brankářky"], [FW]: ["⚔", " Útočnice"], [DF]: ["🛡", " Obránkyně"]};
const grpChip = (g, short) => `<span class="evl L${g}" title="${esc(grpLabel(g))}">${GRP_ICON[g] ? GRP_ICON[g][0] + (short ? "" : GRP_ICON[g][1]) : g + (short ? "" : ". pětka")}</span>`;
// Klíč skupiny z atributu tlačítka (číslo pětky nebo F / D / G)
const grpVal = g => (GRP_ICON[g] ? g : +g);
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
    mine: mp ? myGroup(L, me, isG(mp)) : null, tid: HK.tid ? HK.tid() : null
  };
}
const staffName = (X, id) => { const t = X.staff.find(x => x.id === id); return t ? t.name : "?"; };
// Vede přihlášený člen týmu tuto linku? (⭐ moje linka)
const myLane = (l, X) => !!(X.tid && (l.co || []).includes(X.tid));
const anyMine = (p, X) => !!X.tid && ((p && p.blocks) || []).some(b => (b.lanes || []).some(l => myLane(l, X)));
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
${X.mine != null || (X.mineP && p.blocks.some(isPosBlock)) ? `<div style="margin:6px 0">Tvoje skupina: ${X.mine != null ? grpChip(X.mine) : ""}${X.mineP && X.mineP !== GK && p.blocks.some(isPosBlock) ? grpChip(X.mineP) : ""}${!staff && DRESS[X.mine] ? ` · 🎽 vezmi si <b>${DRESS[X.mine]}</b> dres` : ""}</div>` : !staff && HK.pid() ? '<div class="mu" style="margin:6px 0">Zatím nejsi v žádné pětce (rozdělení dělá trenér po přihlášení).</div>' : ""}`;
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
  else if (!p || !(p.blocks || []).length) body = e ? '<div class="mu" style="margin-bottom:8px">Plán zatím není. Bloky Společně a Stanoviště s cvičeními z 📚 banky, trenéry a skupinami z rozdělení do pětek.</div><button class="p w" id="tpprep" style="min-height:52px">✨ Připravit trénink</button><div class="mu" style="font-size:12px;margin:4px 0 8px">Rozdělí přihlášené do pětek (jako minule, pokud ještě nejsou) a nabídne minulý plán nebo poslední šablonu.</div><button class="s w" id="tpnew">➕ Prázdný plán</button>' : '<div class="mu">Trenér zatím plán nepřipravil.</div>';
  else body = bodyHtml(p, X, D, staff);
  return CSS + `<div class="cd" id="tpc"><div class="row" style="align-items:center;flex-wrap:nowrap"><h2 style="margin:0;flex:1">📋 Plán tréninku</h2>${e && p && (p.blocks || []).length ? '<button class="s" id="tped" style="flex:none">✏️ Upravit</button>' : ""}</div>${p && (p.blocks || []).length ? liveCardHtml(eid) : ""}${body}${p && (p.blocks || []).length ? msCardHtml(eid, p, D) + evalCardHtml(eid, p, D, X.roster, ctx.ev.date) : ""}${p !== undefined ? coverHtml(eid, X) : ""}</div>` + drillSheetHtml(p, X, D);
}

// ===== Vykreslení: úprava plánu =====
function laneEditHtml(b, bi, l, li, X, D, tag) {
  // Cvičení se vybírá v okně s hledáním a filtrem (views/drill-picker.js); vyřazené / smazané z banky se jen označí
  const d = D[l.drill], dn = d ? d.name + " · " + (+d.dur || "?") + " min" + (d.arch ? " (vyřazené)" : "") : l.drill ? (l.dn || "?") + " (není v bance)" : "";
  const gc = [...new Set([...groupsFor(b, X.groups, X.pgFull), ...(l.grp || [])])], seq = laneSeq(b, l), me = myLane(l, X);
  const co = (l.co || []).map(id => "🎓 " + esc(staffName(X, id))).join(", ");
  const pick = seq ? seqEditHtml(b, bi, l, li, seq, X, D)
    : `<button class="s w" data-tpdl="${bi}|${li}" style="text-align:left;min-height:46px;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${dn ? "📚 " + esc(dn) : "📚 Vybrat cvičení z banky…"}</button>${seqOk(b, l) ? `<button class="s" data-tpsq="${bi}|${li}" style="margin-bottom:6px;font-size:13px">🔁 Víc cvičení s vlastním časem</button>` : ""}`;
  return `<div style="border-top:1px dashed var(--bd);padding-top:6px;margin-top:6px"><div class="row" style="align-items:center;flex-wrap:nowrap"><b style="flex:1">${me ? "⭐ " : ""}${tag ? (tag === "🥅" ? "🥅 Linka brankářek" : "Stanoviště " + tag) : b.lanes.length > 1 ? "Linka " + (li + 1) : "Cvičení"}${co ? ` <span class="mu" style="font-weight:400;font-size:12px">${co}</span>` : ""}</b>${b.lanes.length > 1 ? `<button class="d" data-tplr="${bi}|${li}" style="flex:none;padding:4px 10px;min-height:0">🗑</button>` : ""}</div>
${pick}
<div class="mu" style="font-size:12px">Skupiny${b.mode === "all" ? " (bez výběru = všichni)" : " (na začátku bloku; 🥅 = linka se netočí)"}</div><div class="chips">${gc.map(g => `<button class="chip ${(l.grp || []).includes(g) ? "on" : ""}" data-tpgr="${bi}|${li}|${g}">${GRP_ICON[g] ? GRP_ICON[g][0] + (g === GK ? "" : GRP_ICON[g][1]) : g + "."}</button>`).join("")}${gc.length ? "" : '<span class="mu">Nikdo zatím není v pětce.</span>'}</div></div>`;
}
// 🔁 Řada cvičení linky: cvičení pod sebou s vlastním časem (−/+, číslo), ↑ pořadí, 🗑; součet proti času bloku (ten určuje hlavní trenér)
function seqEditHtml(b, bi, l, li, seq, X, D) {
  const sm = seqMinutes(seq), T = seqTimes(b, seq), k = bi + "|" + li;
  const rows = seq.map((x, i) => {
    const d = D[x.drill], dn = d ? d.name + (d.arch ? " (vyřazené)" : "") : x.drill ? (x.dn || "?") + " (není v bance)" : "", tm = T.find(y => y.i === i);
    return `<div class="tpsr"><div class="row"><b style="flex:none">${i + 1}.</b><button class="s" data-tpsd="${k}|${i}" style="flex:1;min-width:0;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${dn ? "📚 " + esc(dn) : "📚 Vybrat cvičení…"}</button></div>
<div class="row" style="margin-top:4px"><span class="mu" style="flex:none;font-size:12px">${tm ? Math.round(tm.a / 6) / 10 + "–" + Math.round(tm.b / 6) / 10 + "′" : "mimo blok"}</span><button class="s" data-tpsu="${k}|${i}|-1" style="flex:none;min-width:44px">−</button><input type="number" inputmode="numeric" data-tpsi="${k}|${i}" value="${x.dur}" style="width:58px;flex:none;margin:0;text-align:center"><button class="s" data-tpsu="${k}|${i}|1" style="flex:none;min-width:44px">+</button><span class="mu" style="flex:none">min</span><span style="flex:1"></span><button class="s" data-tpsm="${k}|${i}" style="flex:none;min-width:40px" ${i ? "" : "disabled"}>↑</button><button class="d" data-tpsx="${k}|${i}" style="flex:none;min-width:40px">🗑</button></div></div>`;
  }).join("");
  const sum = sm > b.dur ? `<div class="tpss err">⛔ Cvičení mají ${sm} min, blok jen ${b.dur} min – zkrať je (čas bloku určuje hlavní trenér).</div>`
    : `<div class="tpss ${sm === b.dur ? "ok" : ""}">Součet ${sm} z ${b.dur} min${sm < b.dur ? " · volno " + (b.dur - sm) + " min" : " ✓"}</div>`;
  return `<div class="mu" style="font-size:12px;margin-bottom:4px">🔁 Řada cvičení v čase bloku (od začátku bloku)</div>${rows}${sum}
<div class="row" style="margin-bottom:6px">${seq.length < PLAN_MAX.seq ? `<button class="s" data-tpsa="${k}">+ Cvičení</button>` : ""}${seq.length === 1 ? `<button class="s" data-tpso="${k}">Jedno cvičení na celý blok</button>` : ""}</div>`;
}
// Trenéři linky (v „Další volby“): přihlášený realizační tým, navíc už vybraný nepřihlášený
function laneCoachHtml(b, bi, l, li, X, tag) {
  const cands = [...X.coaches, ...X.staff.filter(t => (l.co || []).includes(t.id) && !X.coaches.includes(t))];
  const nm = tag ? (tag === "🥅" ? "🥅 Brankářky" : "Stanoviště " + tag) : b.lanes.length > 1 ? "Linka " + (li + 1) : "Cvičení";
  return `<div class="mu" style="font-size:12px">🎓 Trenér – ${nm}${cands.length ? "" : " (nikdo z realizačního týmu není přihlášený)"}</div><div class="chips" style="margin-bottom:6px">${cands.map(t => `<button class="chip ${(l.co || []).includes(t.id) ? "on" : ""}" data-tpco="${bi}|${li}|${esc(t.id)}">🎓 ${esc(t.name)}</button>`).join("")}</div>`;
}
// ⚙ Další volby bloku: režim, skupiny podle pětek / postů, točení, trenéři, souběžná linka (u Společně)
function moreHtml(b, bi, X, tags, rl, auto) {
  const open = blockExtras(b) || ((S.tpe && S.tpe.mo) || []).includes(b.id);
  return `<details class="tpmo" data-tpmo="${esc(b.id)}" ${open ? "open" : ""}><summary>⚙ Další volby${blockExtras(b) ? " (použité)" : ""}</summary>
<div class="chips" style="margin:6px 0">${Object.entries(MODES).map(([k, x]) => `<button class="chip ${b.mode === k ? "on" : ""}" data-tpm="${bi}|${k}">${x}</button>`).join("")}</div>
<div class="chips" style="margin:0 0 6px"><span class="mu" style="font-size:12px">Skupiny</span>${Object.entries(BY).map(([k, x]) => `<button class="chip ${(k === "pos") === isPosBlock(b) ? "on" : ""}" data-tpby="${bi}|${k}">${x}</button>`).join("")}</div>
${b.mode === "st" ? `<div class="mu" style="font-size:12px;margin-top:6px">Točení skupin</div><select data-tprot="${bi}"><option value="">Automaticky – ${rl} ${rl === 1 ? "kolo" : rl < 5 ? "kola" : "kol"} po ${auto} min</option>${Array.from({length: b.dur}, (_, i) => i + 1).map(m => `<option value="${m}" ${b.rot === m ? "selected" : ""}>po ${m} min</option>`).join("")}</select>` : ""}
${b.lanes.map((l, li) => laneCoachHtml(b, bi, l, li, X, tags[li])).join("")}
${b.mode !== "st" && b.lanes.length < PLAN_MAX.lanes ? `<button class="s w" data-tpla="${bi}" style="margin-top:4px">+ Souběžná linka (např. brankářky)</button>` : ""}</details>`;
}
// Délka bloku podle banky: Společně = délka cvičení první linky (bez brankářské), Stanoviště = délka cvičení × počet kol (točících se linek);
// 0 = žádné cvičení s délkou
function bankDur(b, D) {
  const rl = (b.lanes || []).filter(l => !isFixedLane(l)), ds = rl.map(l => D[l.drill]).filter(d => d && +d.dur > 0).map(d => +d.dur);
  if (!ds.length) return 0;
  const v = b.mode === "st" ? Math.max(...ds) * Math.max(1, rl.length) : ds[0];
  return Math.max(1, Math.min(90, Math.round(v)));
}
function blockEditHtml(b, bi, t, X, D, n) {
  const mv = `<button class="s" data-tpmv="${bi}|-1" style="flex:none;padding:4px 10px;min-height:0" ${bi ? "" : "disabled"}>↑</button><button class="s" data-tpmv="${bi}|1" style="flex:none;padding:4px 10px;min-height:0" ${bi < n - 1 ? "" : "disabled"}>↓</button><button class="d" data-tpbd="${bi}" style="flex:none;padding:4px 10px;min-height:0">🗑</button>`;
  const durRow = q => `<div class="row" style="align-items:center;flex-wrap:nowrap;gap:6px" title="Čas platí jen pro tento trénink (cvičení v bance ani šablona se nemění)"><span class="mu" style="flex:none">⏱ Čas</span><button class="s" data-tpdu="${bi}|-1" style="flex:none;min-width:48px">−</button><input type="number" inputmode="numeric" data-tpdi="${bi}" value="${b.dur}" style="width:70px;flex:none;margin:0;text-align:center"><button class="s" data-tpdu="${bi}|1" style="flex:none;min-width:48px">+</button><span class="mu" style="flex:none">min</span></div>
<div class="tpq">${q.map(m => `<button class="${b.dur === m ? "p" : "s"}" data-tpdq="${bi}|${m}">${m}</button>`).join("")}`;
  // ☕ Pauza: jen popisek a čas
  if (isBreak(b)) return `<div class="tpe brk"><div class="row" style="align-items:center;flex-wrap:nowrap"><b style="flex:1">${bi + 1}. ☕ Pauza · ${clock(X.start, t.a)}–${clock(X.start, t.b)}</b>${mv}</div>
<input data-tpbn="${bi}" maxlength="${BRK_MAX}" value="${esc(b.brk || "")}" placeholder="Pití, odpočinek…" style="margin:6px 0">${durRow(QUICK_BRK)}</div></div>`;
  const tags = laneTags(b), rl = b.lanes.filter(l => !isFixedLane(l)).length, auto = rl > 1 ? Math.round(b.dur / rl * 10) / 10 : b.dur;
  return `<div class="tpe"><div class="row" style="align-items:center;flex-wrap:nowrap"><b style="flex:1">Blok ${bi + 1} · ${clock(X.start, t.a)}–${clock(X.start, t.b)}</b>
${mv}</div>
<div class="mu" style="font-size:12px;margin:2px 0 6px">${MODES[b.mode]}${isPosBlock(b) ? " · ⚔ podle postů" : ""}${b.mode === "st" && b.rot ? " · točení po " + b.rot + " min" : ""}</div>
${durRow(QUICK_DUR)}${bankDur(b, D) && bankDur(b, D) !== b.dur ? `<button class="s" data-tpdq="${bi}|${bankDur(b, D)}">↺ z banky ${bankDur(b, D)}</button>` : ""}</div>
${b.lanes.map((l, li) => laneEditHtml(b, bi, l, li, X, D, tags[li])).join("")}
${b.mode === "st" && b.lanes.length < PLAN_MAX.lanes ? `<button class="s w" data-tpla="${bi}" style="margin-top:8px">+ Stanoviště / linka</button>` : ""}
${b.mode === "st" ? `<div class="mu" style="font-size:12px;margin-top:8px">Rozpis točení</div>${roundsHtml(b, t.a, {...X, mine: null, tid: null}) || '<div class="mu">Pro točení přidej aspoň 2 stanoviště se skupinami.</div>'}` : ""}
${moreHtml(b, bi, X, tags, rl, auto)}</div>`;
}
function editorHtml(ctx) {
  const E = S.tpe, p = E.p, X = derive(ctx), D = drillMap(), T = planTimes(p.blocks), used = planMinutes(p.blocks), ev = ctx.ev, k = "tpx" + ev.id, kd = "tpdel" + ev.id, had = !!S.tp[ev.id];
  const gl = X.groups.map(g => grpChip(g) + ` <span class="mu">${g === GK ? X.cnt.gk.length : X.cnt.sk.filter(id => +X.cnt.L[id] === g).length}</span>`).join(" ")
    + (X.cnt.sk.length ? " · " + [FW, DF].map(g => grpChip(g, true) + ` <span class="mu">${X.cnt.sk.filter(id => posGrp(X.pos[id]) === g).length}</span>`).join(" ") : "");
  const free = X.cnt.sk.filter(id => !X.cnt.L[id]).length;
  return `${ctx.css}${CSS}<div id="evw"><button class="s" id="tpx" style="margin-bottom:12px;${armed(k) ? "background:var(--wa);color:#fff" : ""}">${armed(k) ? "Zahodit změny? Klepni znovu" : "← Zpět k tréninku"}</button>
<div class="cd"><h2>✏️ Plán tréninku</h2><div class="mu">${esc(ev.title)} · ${esc(ev.time || "")}${ctx.end ? "–" + esc(ctx.end) : ""}${X.total ? " (" + X.total + " min)" : ""} · naplánováno <b>${used} min</b></div>
<label>🎯 Téma tréninku (nepovinné)</label><input id="tpg" maxlength="${PLAN_MAX.goal}" value="${esc(p.goal || "")}" placeholder="např. Přihrávky v pohybu">
<div class="mu" style="font-size:13px">Skupiny: ${gl || "zatím nikdo"}${free ? ` · bez pětky ${free}` : ""}. Rozdělení do pětek upravíš v detailu tréninku (i ⚖ vyrovnaně).</div>
${issuesHtml(p, X, D)}${(S.dr || []).length ? "" : '<div class="msg">Banka cvičení je prázdná nebo se nenačetla – cvičení přidej v Team → 📚 Cvičení.</div>'}
${anyMine(p, X) ? `<div class="chips" style="margin-top:6px"><button class="chip ${E.only ? "on" : ""}" id="tponly">⭐ Jen moje linky</button><span class="mu" style="font-size:12px">ostatní bloky jen ke čtení</span></div>` : ""}
${reuseHtml(ev.id)}${coverHtml(ev.id, X)}</div>
${p.blocks.map((b, bi) => E.only && anyMine(p, X) && !(b.lanes || []).some(l => myLane(l, X)) ? `<div class="tpe" style="opacity:.75">${blockHtml(b, bi, T[bi], {...X, mine: null}, D)}</div>` : blockEditHtml(b, bi, T[bi], X, D, p.blocks.length)).join("")}
${p.blocks.length < PLAN_MAX.blocks ? `<div class="row" style="margin-bottom:12px"><button class="s" data-tpadd="all">+ 👥 Společně</button><button class="s" data-tpadd="st">+ 🔄 Stanoviště</button><button class="s" data-tpadd="brk">+ ☕ Pauza</button></div>` : ""}
<div class="tpsv"><div class="row"><button class="p" id="tpok" style="flex:2;min-height:52px">💾 Uložit plán</button>${had ? `<button class="d" id="tpdel" style="flex:1;${armed(kd) ? "background:var(--no);color:#fff" : ""}">${armed(kd) ? "Opravdu smazat?" : "🗑 Smazat plán"}</button>` : ""}</div></div></div>`;
}

// ===== Eventy =====
// Změna rozpracovaného plánu: fn(plán) a překreslení; dirty = neuložené změny
// struct = změna mimo řady cvičení (bloky, linky, skupiny, trenéři, téma) – rozhoduje, jak se uložení sloučí se změnou jiného trenéra
function edit(fn) { const E = S.tpe; if (!E) return; const g = document.querySelector("#tpg"); if (g) E.p.goal = g.value; fn(E.p); E.dirty = true; E.struct = true; render(); }
// Změna řady cvičení linky lid (bez struct): zapamatuje linku pro sloučení při uložení
function editSeq(lid, fn) { const E = S.tpe; if (!E) return; const g = document.querySelector("#tpg"); if (g && g.value !== (E.p.goal || "")) { E.p.goal = g.value; E.struct = true; } fn(E.p); E.dirty = true; E.sqd = [...new Set([...(E.sqd || []), lid])]; render(); }
// Sloučení při uložení se změnou jiného trenéra: domain/training-plan.js (mergePlan)
const mergeSave = (E, fresh) => mergePlan(E.p, fresh, E.base, E.struct, E.sqd);
const parts = (el, attr) => el.getAttribute(attr).split("|");
function bindEditor(a, ctx) {
  const E = S.tpe, eid = ctx.ev.id, X = derive(ctx), D = drillMap();
  const on = (attr, fn, ev = "onclick") => a.querySelectorAll("[" + attr + "]").forEach(el => { el[ev] = () => fn(parts(el, attr), el); });
  const lane = (bi, li) => E.p.blocks[+bi].lanes[+li];
  const flip = (arr, v) => (arr || []).includes(v) ? arr.filter(x => x !== v) : [...(arr || []), v];
  a.querySelector("#tpg").oninput = e => { E.p.goal = e.target.value; E.dirty = true; E.struct = true; };
  on("data-tpadd", ([m]) => edit(p => { p.blocks.push(m === "brk" ? breakBlank() : blockBlank(m, X.groups)); }));
  // ☕ Popisek pauzy: bez překreslení (psaní nepřeruší), uloží se s plánem
  a.querySelectorAll("[data-tpbn]").forEach(el => { el.oninput = () => { E.p.blocks[+el.dataset.tpbn].brk = el.value; E.dirty = true; E.struct = true; }; });
  on("data-tpmv", ([bi, d]) => edit(p => { p.blocks = moveBlock(p.blocks, p.blocks[+bi].id, +d); }));
  on("data-tpbd", ([bi]) => edit(p => { p.blocks.splice(+bi, 1); }));
  on("data-tpm", ([bi, m]) => edit(p => { const b = p.blocks[+bi]; b.mode = m; if (m === "st" && b.lanes.length < 2) b.lanes.push(laneBlank()); if (m === "all") b.rot = null; }));
  // Délka bloku: ruční změna se zapamatuje (výběr dalšího cvičení ji pak nepřepíše)
  const setDur = (b, v) => { if (v >= 1 && v <= 90) b.dur = v; if (b.rot && b.rot > b.dur) b.rot = null; E.man = [...new Set([...(E.man || []), b.id])]; };
  on("data-tpdu", ([bi, d]) => edit(p => { const b = p.blocks[+bi]; setDur(b, Math.max(1, Math.min(90, b.dur + +d))); }));
  on("data-tpdi", ([bi], el) => edit(p => { setDur(p.blocks[+bi], parseInt(el.value, 10)); }), "onchange");
  on("data-tpdq", ([bi, m]) => edit(p => { setDur(p.blocks[+bi], +m); }));
  on("data-tprot", ([bi], el) => edit(p => { p.blocks[+bi].rot = el.value ? +el.value : null; }), "onchange");
  on("data-tpla", ([bi]) => edit(p => { p.blocks[+bi].lanes.push(laneBlank()); }));
  on("data-tplr", ([bi, li]) => edit(p => { p.blocks[+bi].lanes.splice(+li, 1); }));
  // Výběr cvičení: kopie názvu a obrázků; délku bloku převezme z banky, dokud ji trenér v této úpravě ručně nezměnil
  // 📚 Výběr cvičení: okno s hledáním a filtrem; výběr převezme délku z banky, dokud ji trenér ručně nezměnil
  on("data-tpdl", ([bi, li]) => openDrillPicker(lane(bi, li).drill, id => edit(p => {
    const b = p.blocks[+bi], l = lane(bi, li), d = D[id];
    l.drill = id; l.dn = d ? d.name : ""; l.di = d ? d.img || [] : [];
    const bd = bankDur(b, D);
    if (bd && !(E.man || []).includes(b.id)) { b.dur = bd; if (b.rot && b.rot > b.dur) b.rot = null; }
  })));
  on("data-tpco", ([bi, li, id]) => edit(() => { const l = lane(bi, li); l.co = flip(l.co, id); }));
  // 🔁 Řada cvičení: převod linky, výběr cvičení (čas z banky, dokud ho trenér nezměnil), čas −/+ / číslo, ↑ pořadí, 🗑, + cvičení, zpět na jedno
  const sq = (bi, li) => lane(bi, li).seq;
  const sdur = (x, v) => { if (v >= BLK_DUR_MIN && v <= BLK_DUR_MAX) x.dur = v; E.sman = [...new Set([...(E.sman || []), x.id])]; };
  on("data-tpsq", ([bi, li]) => editSeq(lane(bi, li).id, p => { const b = p.blocks[+bi]; lane(bi, li).seq = seqStart(b, lane(bi, li)); }));
  on("data-tpsd", ([bi, li, i]) => openDrillPicker(sq(bi, li)[+i].drill, id => editSeq(lane(bi, li).id, () => {
    const x = sq(bi, li)[+i], d = D[id];
    x.drill = id; x.dn = d ? d.name : ""; x.di = d ? d.img || [] : [];
    if (d && +d.dur > 0 && !(E.sman || []).includes(x.id)) x.dur = Math.max(BLK_DUR_MIN, Math.min(BLK_DUR_MAX, Math.round(+d.dur)));
  })));
  on("data-tpsu", ([bi, li, i, d]) => editSeq(lane(bi, li).id, () => { const x = sq(bi, li)[+i]; sdur(x, x.dur + +d); }));
  on("data-tpsi", ([bi, li, i], el) => editSeq(lane(bi, li).id, () => { sdur(sq(bi, li)[+i], parseInt(el.value, 10)); }), "onchange");
  on("data-tpsm", ([bi, li, i]) => editSeq(lane(bi, li).id, () => { const a = sq(bi, li), k = +i; if (k > 0) [a[k - 1], a[k]] = [a[k], a[k - 1]]; }));
  on("data-tpsx", ([bi, li, i]) => editSeq(lane(bi, li).id, () => { const l = lane(bi, li); l.seq.splice(+i, 1); if (!l.seq.length) { delete l.seq; l.drill = ""; l.dn = ""; l.di = []; } }));
  on("data-tpsa", ([bi, li]) => editSeq(lane(bi, li).id, p => { const b = p.blocks[+bi], l = lane(bi, li); l.seq.push(seqBlank(b.dur - seqMinutes(l.seq))); }));
  on("data-tpso", ([bi, li]) => editSeq(lane(bi, li).id, () => { const l = lane(bi, li), x = l.seq[0]; Object.assign(l, {drill: x.drill, dn: x.dn, di: x.di || []}); delete l.seq; }));
  const only = a.querySelector("#tponly");
  if (only) only.onclick = () => { E.only = !E.only; render(); };
  // ⚙ Další volby: ručně otevřené zůstanou otevřené i po překreslení (bez změny plánu)
  a.querySelectorAll("[data-tpmo]").forEach(d => d.ontoggle = () => { const id = d.dataset.tpmo, mo = E.mo || []; E.mo = d.open ? [...new Set([...mo, id])] : mo.filter(x => x !== id); });
  // Pětky / posty v bloku: přepnutí rozdělí skupiny znovu (jako nový blok), linka brankářek zůstane
  on("data-tpby", ([bi, k]) => edit(p => {
    const b = p.blocks[+bi], pos = k === "pos";
    if (pos === isPosBlock(b)) return;
    if (pos) b.by = "pos"; else delete b.by;
    const field = groupsFor(b, X.groups, X.pgFull).filter(g => g !== GK), rl = b.lanes.filter(l => !isFixedLane(l));
    rl.forEach(l => { l.grp = []; });
    if (b.mode === "st" && rl.length) field.forEach((g, i) => rl[i % rl.length].grp.push(g));
  }));
  // Skupina je v bloku jen na jedné lince: výběr ji z ostatních linek téhož bloku odebere
  on("data-tpgr", ([bi, li, g]) => edit(p => {
    const v = grpVal(g), b = p.blocks[+bi], l = b.lanes[+li], add = !(l.grp || []).includes(v);
    b.lanes.forEach(x => { x.grp = (x.grp || []).filter(y => y !== v); });
    if (add) l.grp = [...l.grp, v];
  }));
  // Zpět: bez změn hned, s neuloženými změnami druhým klepnutím
  a.querySelector("#tpx").onclick = () => { const close = () => { S.tpe = null; render(); window.scrollTo(0, 0); }; if (!E.dirty) close(); else confirm2("tpx" + eid, close); };
  a.querySelector("#tpok").onclick = () => {
    const g = a.querySelector("#tpg");
    if (g) E.p.goal = g.value;
    // Sloučení se změnou, kterou mezitím uložil jiný trenér (např. cvičení brankářek)
    const fresh = S.tp[eid], m = mergeSave(E, fresh);
    const doc = {...planDoc(m.p, D), ...stamp()};
    S.db.doc(TRPLAN_COLL + "/" + eid).set(doc);
    S.tp[eid] = doc;
    const err = planIssues(doc, {total: X.total, groups: X.groups, pgroups: X.pgroups}).filter(x => x.lvl === "err").length, who = fresh && fresh.by ? String(fresh.by).split("@")[0] : "jiný trenér";
    const mt = !m.merged ? "" : m.lost ? " – " + who + " mezitím plán změnil; cvičení jeho linek zůstala, bloky jsou podle tebe" : " – sloučeno se změnami, které mezitím uložil " + who;
    toast((err ? "Plán uložen – pozor, má " + err + " " + (err === 1 ? "chybu" : "chyby") + " (⛔)" : "Plán tréninku uložen") + mt);
    S.tpe = null; render(); window.scrollTo(0, 0);
  };
  // ⧉ / 📑 převzetí plánu (nahradí rozpracovaný) a 📊 pokrytí
  bindReuse(a, eid, X, D, p => { const g = a.querySelector("#tpg"); E.p = {...p, goal: p.goal || (g ? g.value : "")}; E.man = setMan(E.p); E.dirty = true; E.struct = true; render(); window.scrollTo(0, 0); }, () => E.p);
  bindCover(a, eid, X, D);
  const del = a.querySelector("#tpdel");
  if (del) del.onclick = () => confirm2("tpdel" + eid, () => { S.db.doc(TRPLAN_COLL + "/" + eid).delete(); S.tp[eid] = null; S.tpe = null; toast("Plán smazán"); render(); });
}
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
    toast(how ? "Pětky rozděleny: " + how : "Pětky beze změny – vyber, z čeho plán začít");
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
// Úprava plánu na celé stránce místo detailu tréninku
export function planEditor(a, ctx) {
  ensurePlan(ctx.ev.id);
  a.innerHTML = editorHtml(ctx);
  bindEditor(a, ctx);
}
