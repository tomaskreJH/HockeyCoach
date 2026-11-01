// 📋 Úprava plánu tréninku na celé stránce místo detailu (S.tpe; jen HK.perm("trplan", "e")): bloky 👥 Společně / 🔄 Stanoviště / ☕ pauza (sbalené ▸ s časem a obsahem),
// ⏱ čas bloku (převzetí délky z banky, dokud ho trenér nezmění), skupiny a 🎓 trenéři přímo u linky, „⚙ Další volby“ (režim, posty, točení,
// souběžná linka), 🔁 řada cvičení, ⭐ Jen moje linky, ⧉ / 📑 / 📊 z trplan-reuse.js; nový blok rovnou otevře výběr cvičení (i ➕ nové do banky).
// Uložení sloučí změny jiného trenéra (mergePlan).

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {S} from "../core/state.js";
import {esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {BLK_DUR_MAX, BLK_DUR_MIN, blockBlank, blockExtras, breakBlank, BRK_MAX, BY, clock, DF, FW, GK, groupsFor, grpLabel, isBreak, isFixedLane, isPosBlock, laneBlank, laneSeq, laneTags, mergePlan, MODES, moveBlock, PLAN_MAX, planDoc, planIssues, planMinutes, planTimes, posGrp, seqBlank, seqMinutes, seqOk, seqStart, seqTimes, TRPLAN_COLL} from "../domain/training-plan.js";
import {openDrillPicker} from "./drill-picker.js";
import {render} from "./shell.js";
import {bindCover, bindReuse, coverHtml, reuseHtml} from "./trplan-reuse.js";
import {blockHtml, CSS, derive, drillMap, ensurePlan, GRP_ICON, grpChip, issuesHtml, myLane, roundsHtml, setMan, staffName} from "./trplan-view.js";
const grpChips = (grp, short) => (grp || []).map(g => grpChip(g, short)).join("");

// ===== Konstanty a pomocné funkce úpravy =====
// Podpis zápisu: kdo a kdy (pravidla databáze vyžadují by / at)
const stamp = () => { const u = HK.user(); return {by: ((u && u.email) || "").toLowerCase(), at: new Date().toISOString()}; };
const QUICK_DUR = [5, 8, 10, 12, 15, 20, 30];             // rychlá volba délky bloku (min)
const QUICK_BRK = [2, 3, 5, 10];                          // rychlá volba délky ☕ pauzy (min)
// Klíč skupiny z atributu tlačítka (číslo pětky nebo F / D / G)
const grpVal = g => (GRP_ICON[g] ? g : +g);
// Sbalené bloky: S.tpe.op = id rozbalených bloků (nový blok se rozbalí sám); plán s jediným blokem je rozbalený vždy
const isOpen = (b, p) => p.blocks.length === 1 || ((S.tpe && S.tpe.op) || []).includes(b.id);
// Krátký obsah bloku pro sbalené záhlaví: cvičení linek (i řady), skupiny a 🎓 trenéři linky
function blockSum(b, D, X) {
  const nm = x => { const d = D[x.drill]; return d ? d.name : x.dn || ""; };
  return (b.lanes || []).map(l => {
    const seq = laneSeq(b, l), names = (seq ? seq.map(nm) : [nm(l)]).filter(Boolean).join(" → ") || "bez cvičení";
    const co = (l.co || []).map(id => staffName(X, id)).filter(Boolean).join(", ");
    return `<div class="mu" style="font-size:13px">${esc(names)} ${grpChips(l.grp, true)}${co ? " · 🎓 " + esc(co) : ""}</div>`;
  }).join("");
}
// Vede přihlášený člen týmu některou linku plánu? (přepínač ⭐ Jen moje linky)
const anyMine = (p, X) => !!X.tid && ((p && p.blocks) || []).some(b => (b.lanes || []).some(l => myLane(l, X)));

// ===== Vykreslení: úprava plánu =====
function laneEditHtml(b, bi, l, li, X, D, tag) {
  // Cvičení se vybírá v okně s hledáním a filtrem (views/drill-picker.js); vyřazené / smazané z banky se jen označí
  // 📝 Cvičení jen do plánu (bez banky): linka má jen název dn
  const d = D[l.drill], dn = d ? d.name + " · " + (+d.dur || "?") + " min" + (d.arch ? " (vyřazené)" : "") : l.drill ? (l.dn || "?") + " (není v bance)" : l.dn ? l.dn + " (jen v plánu)" : "";
  const gc = [...new Set([...groupsFor(b, X.groups, X.pgFull), ...(l.grp || [])])], seq = laneSeq(b, l), me = myLane(l, X);
  const pick = seq ? seqEditHtml(b, bi, l, li, seq, X, D)
    : `<button class="s w" data-tpdl="${bi}|${li}" style="text-align:left;min-height:46px;margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${dn ? (d || l.drill ? "📚 " : "📝 ") + esc(dn) : "📚 Vybrat cvičení z banky…"}</button>${seqOk(b, l) ? `<button class="s" data-tpsq="${bi}|${li}" style="margin-bottom:6px;font-size:13px">🔁 Víc cvičení s vlastním časem</button>` : ""}`;
  return `<div style="border-top:1px dashed var(--bd);padding-top:6px;margin-top:6px"><div class="row" style="align-items:center;flex-wrap:nowrap"><b style="flex:1">${me ? "⭐ " : ""}${tag ? (tag === "🥅" ? "🥅 Linka brankářek" : "Stanoviště " + tag) : b.lanes.length > 1 ? "Linka " + (li + 1) : "Cvičení"}</b>${b.lanes.length > 1 ? `<button class="d" data-tplr="${bi}|${li}" style="flex:none;padding:4px 10px;min-height:0">🗑</button>` : ""}</div>
${pick}
<div class="mu" style="font-size:12px">Skupiny${b.mode === "all" ? " (bez výběru = všichni)" : " (na začátku bloku; 🥅 = linka se netočí)"}</div><div class="chips">${gc.map(g => `<button class="chip ${(l.grp || []).includes(g) ? "on" : ""}" data-tpgr="${bi}|${li}|${g}">${GRP_ICON[g] ? GRP_ICON[g][0] + (g === GK ? "" : GRP_ICON[g][1]) : esc(grpLabel(g))}</button>`).join("")}${gc.length ? "" : '<span class="mu">Nikdo zatím nemá dres.</span>'}</div>
${laneCoachHtml(l, bi, li, X)}</div>`;
}
// 🔁 Řada cvičení linky: cvičení pod sebou s vlastním časem (−/+, číslo), ↑ pořadí, 🗑; součet proti času bloku (ten určuje hlavní trenér)
function seqEditHtml(b, bi, l, li, seq, X, D) {
  const sm = seqMinutes(seq), T = seqTimes(b, seq), k = bi + "|" + li;
  const rows = seq.map((x, i) => {
    const d = D[x.drill], dn = d ? d.name + (d.arch ? " (vyřazené)" : "") : x.drill ? (x.dn || "?") + " (není v bance)" : x.dn ? x.dn + " (jen v plánu)" : "", tm = T.find(y => y.i === i);
    return `<div class="tpsr"><div class="row"><b style="flex:none">${i + 1}.</b><button class="s" data-tpsd="${k}|${i}" style="flex:1;min-width:0;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${dn ? (d || x.drill ? "📚 " : "📝 ") + esc(dn) : "📚 Vybrat cvičení…"}</button></div>
<div class="row" style="margin-top:4px"><span class="mu" style="flex:none;font-size:12px">${tm ? Math.round(tm.a / 6) / 10 + "–" + Math.round(tm.b / 6) / 10 + "′" : "mimo blok"}</span><button class="s" data-tpsu="${k}|${i}|-1" style="flex:none;min-width:44px">−</button><input type="number" inputmode="numeric" data-tpsi="${k}|${i}" value="${x.dur}" style="width:58px;flex:none;margin:0;text-align:center"><button class="s" data-tpsu="${k}|${i}|1" style="flex:none;min-width:44px">+</button><span class="mu" style="flex:none">min</span><span style="flex:1"></span><button class="s" data-tpsm="${k}|${i}" style="flex:none;min-width:40px" ${i ? "" : "disabled"}>↑</button><button class="d" data-tpsx="${k}|${i}" style="flex:none;min-width:40px">🗑</button></div></div>`;
  }).join("");
  const sum = sm > b.dur ? `<div class="tpss err">⛔ Cvičení mají ${sm} min, blok jen ${b.dur} min – zkrať je (čas bloku určuje hlavní trenér).</div>`
    : `<div class="tpss ${sm === b.dur ? "ok" : ""}">Součet ${sm} z ${b.dur} min${sm < b.dur ? " · volno " + (b.dur - sm) + " min" : " ✓"}</div>`;
  return `<div class="mu" style="font-size:12px;margin-bottom:4px">🔁 Řada cvičení v čase bloku (od začátku bloku)</div>${rows}${sum}
<div class="row" style="margin-bottom:6px">${seq.length < PLAN_MAX.seq ? `<button class="s" data-tpsa="${k}">+ Cvičení</button>` : ""}${seq.length === 1 ? `<button class="s" data-tpso="${k}">Jedno cvičení na celý blok</button>` : ""}</div>`;
}
// 🎓 Trenéři linky přímo u linky (jedno klepnutí = přidat / odebrat): přihlášený realizační tým, navíc už vybraný nepřihlášený
function laneCoachHtml(l, bi, li, X) {
  const cands = [...X.coaches, ...X.staff.filter(t => (l.co || []).includes(t.id) && !X.coaches.includes(t))];
  if (!cands.length) return '<div class="mu" style="font-size:12px;margin-top:4px">🎓 Trenér: nikdo z realizačního týmu není přihlášený.</div>';
  return `<div class="chips" style="margin-top:4px"><span class="mu" style="font-size:12px">🎓</span>${cands.map(t => `<button class="chip ${(l.co || []).includes(t.id) ? "on" : ""}" data-tpco="${bi}|${li}|${esc(t.id)}">${esc(t.name)}</button>`).join("")}</div>`;
}
// ⚙ Další volby bloku (řídké): režim, skupiny podle pětek / postů, točení, souběžná linka (u Společně)
function moreHtml(b, bi, rl, auto) {
  const open = blockExtras(b) || ((S.tpe && S.tpe.mo) || []).includes(b.id);
  return `<details class="tpmo" data-tpmo="${esc(b.id)}" ${open ? "open" : ""}><summary>⚙ Další volby${blockExtras(b) ? " (použité)" : ""}</summary>
<div class="chips" style="margin:6px 0">${Object.entries(MODES).map(([k, x]) => `<button class="chip ${b.mode === k ? "on" : ""}" data-tpm="${bi}|${k}">${x}</button>`).join("")}</div>
<div class="chips" style="margin:0 0 6px"><span class="mu" style="font-size:12px">Skupiny</span>${Object.entries(BY).map(([k, x]) => `<button class="chip ${(k === "pos") === isPosBlock(b) ? "on" : ""}" data-tpby="${bi}|${k}">${x}</button>`).join("")}</div>
${b.mode === "st" ? `<div class="mu" style="font-size:12px;margin-top:6px">Točení skupin</div><select data-tprot="${bi}"><option value="">Automaticky – ${rl} ${rl === 1 ? "kolo" : rl < 5 ? "kola" : "kol"} po ${auto} min</option>${Array.from({length: b.dur}, (_, i) => i + 1).map(m => `<option value="${m}" ${b.rot === m ? "selected" : ""}>po ${m} min</option>`).join("")}</select>` : ""}
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
  // Sbalený blok: záhlaví s časem a délkou, obsah jedním řádkem na linku; klepnutí rozbalí
  if (!isOpen(b, S.tpe.p)) return `<div class="tpe"><div class="row" style="align-items:center;flex-wrap:nowrap"><button class="s" data-tpop="${bi}" style="flex:1;min-width:0;text-align:left;border:0;background:none;padding:2px 0"><b>▸ Blok ${bi + 1} · ${clock(X.start, t.a)}–${clock(X.start, t.b)} · ${b.dur} min</b><div class="mu" style="font-size:12px">${MODES[b.mode]}${isPosBlock(b) ? " · ⚔ podle postů" : ""}</div>${blockSum(b, D, X)}</button>${mv}</div></div>`;
  const tags = laneTags(b), rl = b.lanes.filter(l => !isFixedLane(l)).length, auto = rl > 1 ? Math.round(b.dur / rl * 10) / 10 : b.dur;
  return `<div class="tpe" data-tpb="${bi}"><div class="row" style="align-items:center;flex-wrap:nowrap"><button class="s" data-tpop="${bi}" style="flex:1;text-align:left;border:0;background:none;padding:2px 0"${S.tpe.p.blocks.length === 1 ? " disabled" : ""}><b>${S.tpe.p.blocks.length === 1 ? "" : "▾ "}Blok ${bi + 1} · ${clock(X.start, t.a)}–${clock(X.start, t.b)} · ${b.dur} min</b></button>
${mv}</div>
<div class="mu" style="font-size:12px;margin:2px 0 6px">${MODES[b.mode]}${isPosBlock(b) ? " · ⚔ podle postů" : ""}${b.mode === "st" && b.rot ? " · točení po " + b.rot + " min" : ""}</div>
${durRow(QUICK_DUR)}${bankDur(b, D) && bankDur(b, D) !== b.dur ? `<button class="s" data-tpdq="${bi}|${bankDur(b, D)}">↺ z banky ${bankDur(b, D)}</button>` : ""}</div>
${b.lanes.map((l, li) => laneEditHtml(b, bi, l, li, X, D, tags[li])).join("")}
${b.mode === "st" && b.lanes.length < PLAN_MAX.lanes ? `<button class="s w" data-tpla="${bi}" style="margin-top:8px">+ Stanoviště / linka</button>` : ""}
${b.mode === "st" ? `<div class="mu" style="font-size:12px;margin-top:8px">Rozpis točení</div>${roundsHtml(b, t.a, {...X, mine: null, tid: null}) || '<div class="mu">Pro točení přidej aspoň 2 stanoviště se skupinami.</div>'}` : ""}
${moreHtml(b, bi, rl, auto)}</div>`;
}
function editorHtml(ctx) {
  const E = S.tpe, p = E.p, X = derive(ctx), D = drillMap(), T = planTimes(p.blocks), used = planMinutes(p.blocks), ev = ctx.ev, k = "tpx" + ev.id, kd = "tpdel" + ev.id, had = !!S.tp[ev.id];
  const gl = X.groups.map(g => grpChip(g) + ` <span class="mu">${g === GK ? X.cnt.gk.length : X.cnt.sk.filter(id => +X.cnt.L[id] === g).length}</span>`).join(" ")
    + (X.cnt.sk.length ? " · " + [FW, DF].map(g => grpChip(g, true) + ` <span class="mu">${X.cnt.sk.filter(id => posGrp(X.pos[id]) === g).length}</span>`).join(" ") : "");
  const free = X.cnt.sk.filter(id => !X.cnt.L[id]).length;
  return `${ctx.css}${CSS}<div id="evw"><button class="s" id="tpx" style="margin-bottom:12px;${armed(k) ? "background:var(--wa);color:#fff" : ""}">${armed(k) ? "Zahodit změny? Klepni znovu" : "← Zpět k tréninku"}</button>
<div class="cd"><h2>✏️ Plán tréninku</h2><div class="mu">${esc(ev.title)} · ${esc(ev.time || "")}${ctx.end ? "–" + esc(ctx.end) : ""}${X.total ? " (" + X.total + " min)" : ""} · naplánováno <b>${used} min</b></div>
<label>🎯 Téma tréninku (nepovinné)</label><input id="tpg" maxlength="${PLAN_MAX.goal}" value="${esc(p.goal || "")}" placeholder="např. Přihrávky v pohybu">
<div class="mu" style="font-size:13px">Skupiny: ${gl || "zatím nikdo"}${free ? ` · bez dresu ${free}` : ""}. Rozdělení do dresů upravíš v detailu tréninku (i ⚖ vyrovnaně).</div>
${issuesHtml(p, X, D)}${(S.dr || []).length ? "" : '<div class="msg">Banka cvičení je prázdná nebo se nenačetla – cvičení přidej v Team → 📚 Cvičení.</div>'}
${anyMine(p, X) ? `<div class="chips" style="margin-top:6px"><button class="chip ${E.only ? "on" : ""}" id="tponly">⭐ Jen moje linky</button><span class="mu" style="font-size:12px">ostatní bloky jen ke čtení</span></div>` : ""}
${reuseHtml(ev.id)}${coverHtml(ev.id, X)}</div>
${p.blocks.map((b, bi) => E.only && anyMine(p, X) && !(b.lanes || []).some(l => myLane(l, X)) ? `<div class="tpe" style="opacity:.75">${blockHtml(b, bi, T[bi], {...X, mine: null}, D)}</div>` : blockEditHtml(b, bi, T[bi], X, D, p.blocks.length)).join("")}
${p.blocks.length > 1 ? `<div class="chips" style="margin:0 0 8px"><button class="chip" data-tpopa="1">▾ Rozbalit vše</button><button class="chip" data-tpopa="0">▸ Sbalit vše</button></div>` : ""}
${p.blocks.length < PLAN_MAX.blocks ? `<div class="row" style="margin-bottom:12px"><button class="s" data-tpadd="all">+ 👥 Společně</button><button class="s" data-tpadd="st">+ 🔄 Stanoviště</button><button class="s" data-tpadd="brk">+ ☕ Pauza</button></div>` : ""}
<div class="tpsv"><div class="row"><button class="p" id="tpok" style="flex:2;min-height:52px">💾 Uložit plán</button>${had ? `<button class="d" id="tpdel" style="flex:1;${armed(kd) ? "background:var(--no);color:#fff" : ""}">${armed(kd) ? "Opravdu smazat? Klepni znovu" : "🗑 Smazat plán"}</button>` : ""}</div></div></div>`;
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
// Návrat do detailu tréninku rovnou na kartu 📋 Plán (ne na začátek stránky – bez dalšího posouvání)
const backToCard = () => { const c = document.querySelector("#tpc"); if (c && c.scrollIntoView) c.scrollIntoView({block: "start"}); else window.scrollTo(0, 0); };
function bindEditor(a, ctx) {
  const E = S.tpe, eid = ctx.ev.id, X = derive(ctx), D = drillMap();
  const on = (attr, fn, ev = "onclick") => a.querySelectorAll("[" + attr + "]").forEach(el => { el[ev] = () => fn(parts(el, attr), el); });
  const lane = (bi, li) => E.p.blocks[+bi].lanes[+li];
  const flip = (arr, v) => (arr || []).includes(v) ? arr.filter(x => x !== v) : [...(arr || []), v];
  a.querySelector("#tpg").oninput = e => { E.p.goal = e.target.value; E.dirty = true; E.struct = true; };
  // 📚 Výběr cvičení linky: okno s hledáním, filtrem a ➕ novým cvičením; výběr převezme délku z banky, dokud ji trenér ručně nezměnil.
  // doc = cvičení právě založené ve výběru (ještě nemusí být v S.dr); doc.free = 📝 jen do plánu (bez id, délka z formuláře)
  const pickLane = (bi, li) => openDrillPicker(lane(bi, li).drill, (id, doc) => edit(p => {
    const b = p.blocks[+bi], l = lane(bi, li), free = !id && doc && doc.free, d = free ? null : D[id] || (doc ? {id, ...doc} : null), DD = d ? {...D, [id]: d} : D;
    l.drill = id; l.dn = d ? d.name : free ? doc.name : ""; l.di = d ? d.img || [] : [];
    const bd = free && b.mode !== "st" && li === 0 ? Math.max(1, Math.min(90, doc.dur)) : bankDur(b, DD);
    if (bd && !(E.man || []).includes(b.id)) { b.dur = bd; if (b.rot && b.rot > b.dur) b.rot = null; }
  }));
  // Nový blok: rozbalí se, posune na obrazovku a u cvičení rovnou otevře výběr pro první linku (✕ = blok zůstane prázdný)
  on("data-tpadd", ([m]) => {
    edit(p => { const b = m === "brk" ? breakBlank() : blockBlank(m, X.groups); p.blocks.push(b); E.op = [...(E.op || []), b.id]; });
    const bi = E.p.blocks.length - 1, el = document.querySelector('[data-tpb="' + bi + '"]');
    if (el && el.scrollIntoView) el.scrollIntoView({block: "start"});
    if (m !== "brk") pickLane(bi, 0);
  });
  // ▸ / ▾ Sbalení bloku a Rozbalit / Sbalit vše (jen zobrazení – plán se nemění, dirty zůstává)
  on("data-tpop", ([bi]) => { const id = E.p.blocks[+bi].id, o = E.op || []; E.op = o.includes(id) ? o.filter(x => x !== id) : [...o, id]; render(); });
  on("data-tpopa", ([v]) => { E.op = v === "1" ? E.p.blocks.map(b => b.id) : []; render(); });
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
  on("data-tpdl", ([bi, li]) => pickLane(bi, li));
  on("data-tpco", ([bi, li, id]) => edit(() => { const l = lane(bi, li); l.co = flip(l.co, id); }));
  // 🔁 Řada cvičení: převod linky, výběr cvičení (čas z banky, dokud ho trenér nezměnil), čas −/+ / číslo, ↑ pořadí, 🗑, + cvičení, zpět na jedno
  const sq = (bi, li) => lane(bi, li).seq;
  const sdur = (x, v) => { if (v >= BLK_DUR_MIN && v <= BLK_DUR_MAX) x.dur = v; E.sman = [...new Set([...(E.sman || []), x.id])]; };
  on("data-tpsq", ([bi, li]) => editSeq(lane(bi, li).id, p => { const b = p.blocks[+bi]; lane(bi, li).seq = seqStart(b, lane(bi, li)); }));
  on("data-tpsd", ([bi, li, i]) => openDrillPicker(sq(bi, li)[+i].drill, (id, doc) => editSeq(lane(bi, li).id, () => {
    const x = sq(bi, li)[+i], d = D[id] || (doc ? {id, ...doc} : null);
    x.drill = id; x.dn = d ? d.name : ""; x.di = d && d.img ? d.img : [];
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
  a.querySelector("#tpx").onclick = () => { const close = () => { S.tpe = null; render(); backToCard(); }; if (!E.dirty) close(); else confirm2("tpx" + eid, close); };
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
    toast((err ? "Plán uložen – pozor, má " + err + " " + (err === 1 ? "chybu" : "chyby") + " (⛔)" : "✅ Plán tréninku uložen") + mt);
    S.tpe = null; render(); backToCard();
  };
  // ⧉ / 📑 převzetí plánu (nahradí rozpracovaný) a 📊 pokrytí
  bindReuse(a, eid, X, D, p => { const g = a.querySelector("#tpg"); E.p = {...p, goal: p.goal || (g ? g.value : "")}; E.man = setMan(E.p); E.dirty = true; E.struct = true; render(); window.scrollTo(0, 0); }, () => E.p);
  bindCover(a, eid, X, D);
  const del = a.querySelector("#tpdel");
  if (del) del.onclick = () => confirm2("tpdel" + eid, () => { S.db.doc(TRPLAN_COLL + "/" + eid).delete(); S.tp[eid] = null; S.tpe = null; toast("Plán smazán"); render(); });
}

// ===== Exporty =====
// Úprava plánu na celé stránce místo detailu tréninku
export function planEditor(a, ctx) {
  ensurePlan(ctx.ev.id);
  a.innerHTML = editorHtml(ctx);
  bindEditor(a, ctx);
}
