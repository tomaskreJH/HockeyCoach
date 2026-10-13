// Opravy zápisu: úprava událostí, třetin, konce zápasu a základních údajů zápasu.
import {REA, SIT} from "../config/constants.js";
import {ensureOp, upd} from "../core/actions.js";
import {curM, isG, nomOf, pl, pri} from "../core/selectors.js";
import {S} from "../core/state.js";
import {$, clone, esc, fd, mmss, toast, uid} from "../core/utils.js";
import {clearEnd, lastPer, moveBoundary, parseClock, periodEnd, removeOvertime, setEnd} from "../domain/corrections.js";
import {eventText, nameOf, perLabel, periodStart} from "../domain/timeline.js";

const chip = (k, v, label, on, attr = "data-ef") => `<button class="chip ${on ? "on" : ""}" ${attr}="${k}" data-v="${esc(v)}">${label}</button>`;
const pool = (m, f, goalie) => [...new Set([...nomOf(m), f.scorer, f.a1, f.a2, f.pid, f.shooter, f.gk, ...(f.on || [])].filter(Boolean))]
  .filter(id => pl(id) && isG(pl(id)) === goalie).sort((x, y) => pri(pl(x)) - pri(pl(y)) || pl(x).name.localeCompare(pl(y).name, "cs"));
const pc = (m, f, k, sel, goalie = false, ex = []) => `<div class="chips">${pool(m, f, goalie).filter(id => !ex.includes(id)).map(id => chip(k, id, esc(nameOf(id)), sel === id)).join("") || '<span class="mu">Nikdo.</span>'}</div>`;
const KT = f => ({G: f.team === "us" ? "gól HC Střely" : "gól soupeře", P: "vyloučení", S: f.team === "us" ? "střela" : "střela soupeře"})[f.k];

function formHtml(m, f) {
  let h = `<h3>${f.isNew ? "Nová událost" : "Úprava události"}: ${KT(f)}</h3><label>Třetina</label><div class="chips">${[1, 2, 3, 4].filter(n => n < 4 || m.ot !== false || f.per === 4).map(n => chip("per", n, n < 4 ? n + "." : "Prodl.", f.per === n)).join("")}</div><label>Čas v třetině (mm:ss)</label><input id="edt" value="${esc(f.time || "")}" placeholder="12:35" style="max-width:160px">`;
  if (f.k === "G") {
    h += `<label>Situace</label><div class="chips">${Object.entries(SIT).map(([k, t]) => chip("sit", k, t, (f.sit || "E") === k)).join("")}</div>`;
    if (f.team === "us") h += `<label>Střelkyně</label>${pc(m, f, "scorer", f.scorer)}<label>Asistence 1</label>${pc(m, f, "a1", f.a1, false, [f.scorer, f.a2])}<label>Asistence 2</label>${pc(m, f, "a2", f.a2, false, [f.scorer, f.a1])}`;
    h += `<label>Na ledě (určuje +/−)</label><div class="chips">${[...pool(m, f, false), ...pool(m, f, true)].map(id => chip("on", id, esc(nameOf(id)), (f.on || []).includes(id))).join("")}</div>`;
  } else if (f.k === "P") {
    h += `<label>Tým</label><div class="chips">${chip("team", "us", "HC Střely", f.team === "us")}${chip("team", "opp", "Soupeř", f.team === "opp")}</div>`;
    if (f.team === "us") h += `<label>Hráčka</label>${pc(m, f, "pid", f.pid)}`;
    h += `<label>Délka</label><div class="chips">${[[2, "2"], [4, "2+2"], [5, "5"], [10, "10"], [20, "Do konce"]].map(([v, t]) => chip("min", v, t, f.min === v)).join("")}</div><label>Důvod</label><div class="chips">${REA.map(r => chip("reason", r, r, f.reason === r)).join("")}</div>`;
  } else h += f.team === "us" ? `<label>Střelkyně</label>${pc(m, f, "shooter", f.shooter)}` : `<label>Brankářka</label>${pc(m, f, "gk", f.gk, true)}`;
  return h + `<div class="row" style="margin-top:14px"><button class="p" id="efs" style="min-height:52px">Uložit</button><button class="s" id="efc" style="min-height:52px">Zrušit</button></div>`;
}
function eventsHtml(m) {
  const evs = (m.events || []).map((e, i) => ({e, i})).filter(x => S.ed.shots || x.e.k !== "S")
    .sort((a, b) => a.e.per - b.e.per || (a.e.time || "").localeCompare(b.e.time || "") || a.i - b.i);
  return `<div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:10px"><button class="s" data-add="Gus">+ Gól HC Střely</button><button class="s" data-add="Gopp">+ Gól soupeře</button><button class="s" data-add="Pus">+ Vyloučení</button><button class="s" data-add="Sus">+ Střela</button><button class="s" data-add="Sopp">+ Střela soupeře</button></div>
<div class="chips"><button class="chip ${S.ed.shots ? "on" : ""}" data-eshots>Zobrazit střely</button></div>
${evs.length ? evs.map(({e}) => `<div class="ev" style="align-items:center"><div class="t">${perLabel(e.per)} ${esc(e.time || "")}</div><div class="b">${esc(eventText(e))}</div><button class="s" data-ee="${e.id}" style="padding:10px 12px">✏️</button><button class="d" data-ed="${e.id}" style="padding:10px 12px;${S.cf === "e" + e.id ? "background:var(--no);color:#fff" : ""}">${S.cf === "e" + e.id ? "Smazat?" : "🗑"}</button></div>`).join("") : '<div class="msg">Žádné události.</div>'}`;
}
function periodsHtml(m) {
  const L = m.live;
  if (!L) return '<div class="msg">Zápas nemá živý zápis, časy třetin se zde neupravují.</div>';
  const K = lastPer(m);
  let h = '<div class="mu" style="margin-bottom:8px">Zadává se délka odehraná v třetině (mm:ss). Posun změní časy pozdějších událostí a střídání.</div>';
  for (let n = 1; n <= K; n++) {
    const e = periodEnd(m, n);
    h += `<div class="ev" style="align-items:center"><div class="b"><b>${n < 4 ? n + ". třetina" : "Prodloužení"}</b><div class="mu">${e == null ? "probíhá (hodiny " + mmss(L.acc - L.pst) + ")" : "odehráno"}</div></div>${e == null ? "" : `<input id="pe${n}" value="${mmss(e - periodStart(m, n))}" style="width:90px;margin:0"><button class="s" data-pe="${n}" style="padding:10px 12px">Uložit</button>`}</div>`;
  }
  h += m.end ? `<div class="cd" style="margin-top:12px"><b>🏁 Zápas ukončen</b> po ${m.end.per < 4 ? m.end.per + ". třetině" : "prodloužení"}<button class="s w" data-unend style="margin-top:8px">↩ Zrušit konec zápasu</button></div>`
    : `<div class="cd" style="margin-top:12px"><b>Zápas není ukončen</b><button class="s w" data-fin style="margin-top:8px">🏁 Označit konec zápasu (${L.per < 4 ? L.per + ". třetina" : "prodloužení"}, aktuální čas hodin)</button></div>`;
  if (K === 4 && !(m.events || []).some(e => e.per === 4)) h += '<button class="d w" data-rmot style="margin-top:10px">Zrušit prodloužení (zápas končí po 3. třetině)</button>';
  return h;
}
function baseHtml(m) {
  const b = S.ed.b;
  return `<label>Soupeř</label><input id="bo" value="${esc(S.ed.o != null ? S.ed.o : m.opp)}"><label>Datum</label><input type="date" id="bd" value="${S.ed.d || m.date}"><label>Doma / venku</label><div class="chips">${chip("home", "1", "Doma", b.home, "data-bf")}${chip("home", "0", "Venku", !b.home, "data-bf")}</div><label>Délka třetiny (min)</label><input id="bl" type="number" min="1" max="30" value="${S.ed.l || m.perLen || 20}" style="max-width:120px"><label>Prodloužení</label><div class="chips">${chip("ot", "1", "Ano (5 min)", b.ot, "data-bf")}${chip("ot", "0", "Ne", !b.ot, "data-bf")}</div><button class="p w" id="bsv" style="min-height:52px;margin-top:6px">Uložit základní údaje</button>`;
}
const blank = (m, t) => ({isNew: true, k: t[0], team: t.slice(1), per: m.live ? Math.min(m.live.per, m.ot === false ? 3 : 4) : 1, time: "", sit: "E", on: [], min: 2, reason: REA[0]});

export function renderEditor() {
  const e = $("#ed");
  if (!S.ed) { e.style.display = "none"; e.innerHTML = ""; return; }
  const m = curM();
  if (!m || m.closed) { S.ed = null; e.style.display = "none"; e.innerHTML = ""; return; }
  const ed = S.ed;
  if (!ed.b) ed.b = {home: m.home, ot: m.ot !== false};
  e.style.display = "block";
  e.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><h2 style="margin:0">✏️ Opravy zápisu</h2><button class="p" id="edx">Hotovo</button></div><div class="mu" style="margin-bottom:10px">${esc(m.opp)} · ${fd(m.date)}</div>${ed.f ? formHtml(m, ed.f) : `<div class="chips">${[["ev", "Události"], ["tri", "Třetiny a konec"], ["zakl", "Základ"]].map(([k, t]) => `<button class="chip ${ed.tab === k ? "on" : ""}" data-etab="${k}">${t}</button>`).join("")}</div>${ed.tab === "tri" ? periodsHtml(m) : ed.tab === "zakl" ? baseHtml(m) : eventsHtml(m)}`}`;
  bind(e, m);
}

function bind(e, m) {
  const ed = S.ed, q = s => e.querySelectorAll(s), run = () => m.live && m.live.running;
  const apply = fn => { if (run()) return toast("Nejdřív přeruš hodiny v živém zápisu"); const n = clone(m); if (fn(n) === false) return toast("Úprava se nepovedla"); upd(n); };
  $("#edx").onclick = () => { S.ed = null; renderEditor(); };
  q("[data-etab]").forEach(b => b.onclick = () => { ed.tab = b.dataset.etab; renderEditor(); });
  // události
  q("[data-eshots]").forEach(b => b.onclick = () => { ed.shots = !ed.shots; renderEditor(); });
  q("[data-add]").forEach(b => b.onclick = () => { ed.f = blank(m, b.dataset.add); renderEditor(); });
  q("[data-ee]").forEach(b => b.onclick = () => { ed.f = {...clone((m.events || []).find(x => x.id === b.dataset.ee)), on: clone(((m.events || []).find(x => x.id === b.dataset.ee).on) || [])}; renderEditor(); });
  q("[data-ed]").forEach(b => b.onclick = () => {
    const id = b.dataset.ed;
    if (S.cf === "e" + id) { S.cf = null; const n = clone(m); n.events = n.events.filter(x => x.id !== id); upd(n); }
    else { S.cf = "e" + id; renderEditor(); setTimeout(() => { if (S.cf === "e" + id) { S.cf = null; renderEditor(); } }, 4000); }
  });
  const sync = () => { const t = $("#edt"); if (t) ed.f.time = t.value.trim(); };
  q("[data-ef]").forEach(b => b.onclick = () => {
    sync(); const f = ed.f, k = b.dataset.ef, v = b.dataset.v;
    if (k === "on") f.on = f.on.includes(v) ? f.on.filter(x => x !== v) : [...f.on, v];
    else if (["scorer", "a1", "a2", "pid", "shooter", "gk"].includes(k)) { f[k] = f[k] === v ? null : v; if (k === "scorer") { if (f.a1 === v) f.a1 = null; if (f.a2 === v) f.a2 = null; } }
    else f[k] = ["per", "min"].includes(k) ? +v : v;
    renderEditor();
  });
  q("#efc").forEach(b => b.onclick = () => { ed.f = null; renderEditor(); });
  q("#efs").forEach(b => b.onclick = () => {
    sync(); const f = ed.f, ms = parseClock(f.time);
    if (ms == null) return toast("Čas zadej jako mm:ss, např. 12:35");
    if (f.k === "G" && f.team === "us" && !f.scorer) return toast("Vyber střelkyni");
    if (f.k === "P" && f.team === "us" && !f.pid) return toast("Vyber hráčku");
    if (f.k === "S" && f.team === "us" && !f.shooter) return toast("Vyber střelkyni");
    const ev = {id: f.id || uid(), k: f.k, team: f.team, per: f.per, time: mmss(ms)};
    if (f.k === "G") { ev.sit = f.sit || "E"; if (f.team === "us") { ev.scorer = f.scorer; ev.a1 = f.a1 || null; ev.a2 = f.a2 || null; ev.on = [...new Set([f.scorer, f.a1, f.a2, ...f.on].filter(Boolean))]; } else ev.on = f.on; }
    else if (f.k === "P") { ev.min = f.min; ev.reason = f.reason; if (f.team === "us") ev.pid = f.pid; }
    else if (f.team === "us") ev.shooter = f.shooter; else ev.gk = f.gk || null;
    const n = clone(m);
    if (n.live) ev.at = periodStart(n, f.per) + ms;
    n.events = f.isNew ? [...(n.events || []), ev] : (n.events || []).map(x => x.id === f.id ? ev : x);
    n.events.sort((a, b) => a.per - b.per || (a.time || "").localeCompare(b.time || ""));
    ed.f = null; upd(n);
  });
  // třetiny a konec
  q("[data-pe]").forEach(b => b.onclick = () => { const n = +b.dataset.pe, v = parseClock($("#pe" + n).value); if (v == null || v < 1000) return toast("Zadej čas jako mm:ss"); apply(x => moveBoundary(x, n, v)); });
  q("[data-fin]").forEach(b => b.onclick = () => apply(x => setEnd(x, x.live.acc - x.live.pst)));
  q("[data-unend]").forEach(b => b.onclick = () => apply(x => clearEnd(x)));
  q("[data-rmot]").forEach(b => b.onclick = () => apply(x => removeOvertime(x)));
  // základ
  q("[data-bf]").forEach(b => b.onclick = () => { ed.o = $("#bo").value; ed.d = $("#bd").value; ed.l = $("#bl").value; ed.b[b.dataset.bf] = b.dataset.v === "1"; renderEditor(); });
  q("#bsv").forEach(b => b.onclick = () => {
    const opp = $("#bo").value.trim(), len = Math.max(1, Math.min(30, +$("#bl").value || 20));
    if (!opp) return toast("Zadej soupeře");
    if (!ed.b.ot && ((m.live && m.live.per >= 4) || (m.events || []).some(x => x.per === 4))) return toast("Zápas už má prodloužení – zruš ho v části Třetiny a konec");
    const n = clone(m); Object.assign(n, {opp, date: $("#bd").value || m.date, home: ed.b.home, perLen: len, ot: ed.b.ot});
    ensureOp(opp); ed.o = ed.d = ed.l = null; ed.b = null; toast("Uloženo"); upd(n);
  });
}
