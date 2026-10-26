// ⚠️ 🕘 Historie placení hráčky (správce pokladny): zpětná změna způsobu placení pro rozsah měsíců (domain/cash.js grpHRange) –
// zápis plpay/{pid} (grpH, grp) + audit v jedné dávce. Pak dopad (requests.js impactOf): vystavené příspěvky v rozsahu (🗑 smazat
// nezaplacený) a uzavřená vyúčtování, kde byla přihlášená (↩ otevřít událost a vyúčtování znovu otevřít / uzavřít = nový výpočet).
// Okno #cphx nad oknem hráčky; otevírá se z okna hráčky (modal.js) a z Team → 💰 Platby → Podle hráček (finance.js).
// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {pl, pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, fd, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {GRP, grpAt, grpHRange, grpSpans, kc, ymAdd, ymLabel, ymNow, ymOk} from "../domain/cash.js";
import {PPAY_COLL} from "../domain/private-data.js";
import {impactOf} from "../domain/requests.js";
import {deleteContrib} from "./money.js";
import {evFlags} from "./request-list.js";
import {render} from "./shell.js";

// ===== Stav (jen pro toto okno) =====
// H = {pid, from, to, grp, err, done (uložený rozsah {ym, until}), h (historie po uložení – než ji přinese odběr dat), gone (smazané příspěvky)}
let H = null;

// ===== Pomocné funkce =====
const me = () => { const u = HK.user(); return ((u && u.email) || "").toLowerCase(); };
const el = () => document.getElementById("cphx");
const span = s => (s.from ? "od " + ymLabel(s.from) : "od začátku") + (s.to ? " do " + ymLabel(s.to) : " dosud");
// Hráčka s historií z tohoto okna (po uložení platí lokální kopie, dokud nepřijde odběr dat)
const player = () => { const p = pl(H.pid); return p && H.h ? {...p, grpH: H.h} : p; };
// Popis rozsahu změny: „Za událost v měsíci září 2026, pak zpět Příspěvek“; chybné měsíce = ""
function rangeTxt(p) {
  if (!ymOk(H.from) || (H.to && (!ymOk(H.to) || H.to < H.from))) return "";
  const when = H.to ? (H.to === H.from ? "v měsíci " + esc(ymLabel(H.from)) : "od " + esc(ymLabel(H.from)) + " do " + esc(ymLabel(H.to))) + ", pak zpět " + esc(GRP[grpAt(p, ymAdd(H.to, 1))]) : "trvale od " + esc(ymLabel(H.from)) + " (pozdější změny se zruší)";
  return `<b>${esc(GRP[H.grp])}</b> ${when}`;
}

// ===== Vykreslení =====
// Dopad uloženého rozsahu: příspěvky (🗑 nezaplacený) a uzavřená vyúčtování (↩ otevřít událost)
function impactHtml() {
  if (!H.done) return "";
  const im = impactOf({mid: H.pid, ym: H.done.ym, until: H.done.until}, S.ch, evFlags(H.pid)), C = im.contribs.filter(x => !H.gone.has(x.id));
  const ct = C.length ? `<h3>Vystavené příspěvky v tomto období</h3>${C.map(x => { const k = "phd" + x.id, paid = x.rest < x.amt; return `<div class="pr"><div>📅 ${esc(ymLabel(x.ym))} · ${kc(x.amt)}<div class="mu">${paid ? "má úhradu – smazat nejde (případně storno v 🏦 Pokladna)" : "nezaplaceno"}</div></div>${paid ? "" : `<button class="d" data-phd="${esc(x.id)}" style="min-width:90px;${armed(k) ? "background:var(--no);color:#fff" : ""}">${armed(k) ? "Smazat?" : "🗑 Smazat"}</button>`}</div>`; }).join("")}` : "";
  const st = im.settled.length ? `<h3>Uzavřená vyúčtování, kde byla přihlášená</h3><div class="mu" style="margin-bottom:4px">Předpisy se samy nepřepočítají: otevři událost → ⚠️ Pokladna → ↩ Znovu otevřít a znovu uzavřít (spočítá se podle nového způsobu).</div>${im.settled.map(e => `<div class="it" data-phe="${esc(e.id)}"><div><b>${esc(e.title)}</b><div class="mu">${e.date ? fd(e.date) : ""}</div></div><span class="tag sh">↩ otevřít</span></div>`).join("")}` : "";
  return `<div class="cd" style="margin-top:10px;border-color:var(--ok)"><b style="color:var(--ok)">✅ Uloženo</b>${ct || st ? ct + st : '<div class="mu" style="margin-top:6px">V tomto období nic vystaveného ani uzavřeného – další výpočty už půjdou podle nové historie.</div>'}</div>`;
}
function html() {
  const p = player();
  if (!p) return "";
  const spans = grpSpans(p).map(s => `<div class="pr"><div>${esc(span(s))}</div><b>${esc(GRP[s.grp])}</b></div>`).join("");
  const chips = Object.entries(GRP).map(([k, t]) => `<button class="chip ${H.grp === k ? "on" : ""}" data-phg="${k}">${esc(t)}</button>`).join(""), on = armed("phs" + H.pid);
  const desc = rangeTxt(p);
  return `<div class="mb"><h2>🕘 Historie placení</h2><div><b>${pn(H.pid)}</b></div>
<h3>Dosud</h3>${spans}
<h3>Zpětná změna</h3><div class="mu" style="margin-bottom:6px">Např. hráčka s příspěvkem v září nechodila a příspěvek nezaplatila → září <b>Za událost</b>, pak se sama vrátí na Příspěvek.</div>
<div class="row" style="flex-wrap:nowrap;gap:8px"><div style="flex:1"><label>Od měsíce</label><input type="month" id="phf" value="${esc(H.from)}" max="${esc(ymNow())}"></div><div style="flex:1"><label>Do měsíce (prázdné = trvale)</label><input type="month" id="pht" value="${esc(H.to)}"></div></div>
<div class="chips">${chips}</div>
<div class="mu" style="margin:6px 0">${desc || "Vyber měsíce (do ≥ od)."}</div>${H.err ? `<div style="color:var(--no)">${esc(H.err)}</div>` : ""}
<div class="row"><button class="p" id="phs" ${desc ? "" : "disabled"} style="min-height:52px;${on ? "background:var(--wa);color:#222" : ""}">${on ? "Opravdu uložit? Klepni znovu" : "💾 Uložit změnu"}</button><button class="s" id="phx" style="min-height:52px">Zavřít</button></div>
${impactHtml()}</div>`;
}
function paint() {
  const e = el();
  if (!e || !H) return;
  e.innerHTML = html();
  bind();
}

// ===== Zápis =====
// plpay/{pid}: nová historie grpH a dnešní grp (starší verze počítají jen s grp) + audit, jedna dávka
function save() {
  const p = player();
  if (!p) return;
  const h = grpHRange(p, H.grp, H.from, H.to);
  if (!h) { H.err = "Chybné měsíce"; paint(); return; }
  const note = pn(H.pid).replace(/<[^>]*>/g, "") + ": " + GRP[H.grp] + " " + H.from + (H.to ? " – " + H.to : " trvale");
  S.db.batch().merge(PPAY_COLL + "/" + H.pid, {grpH: h, grp: grpAt({grpH: h}, ymNow())})
    .set("audit/" + uid(), {ts: new Date().toISOString(), by: me(), eid: "", act: "grp-hist", note}).commit();
  H.h = h; H.err = ""; H.done = {ym: H.from, until: H.to || ""};
  toast("Historie placení uložena");
  paint();
}

// ===== Eventy =====
function bind() {
  const e = el();
  e.onclick = ev => { if (ev.target === e) close(); };
  e.querySelector("#phx").onclick = close;
  const f = e.querySelector("#phf"), t = e.querySelector("#pht");
  f.onchange = () => { H.from = f.value; if (H.to && H.to < H.from) H.to = H.from; H.done = null; paint(); };
  t.onchange = () => { H.to = t.value; H.done = null; paint(); };
  e.querySelectorAll("[data-phg]").forEach(b => b.onclick = () => { H.grp = b.dataset.phg; H.done = null; paint(); });
  const s = e.querySelector("#phs");
  if (s) s.onclick = () => confirm2("phs" + H.pid, save, paint);
  // 🗑 nezaplacený příspěvek v období (stejné smazání jako v 📅 Měsíce – audit a souhrn dlužníků)
  e.querySelectorAll("[data-phd]").forEach(b => b.onclick = () => confirm2("phd" + b.dataset.phd, () => {
    const x = S.ch.find(c => c.id === b.dataset.phd);
    if (x) { deleteContrib(x); H.gone.add(x.id); }
    paint();
  }, paint));
  // ↩ otevřít událost (vyúčtování znovu otevřít a uzavřít ručně); Zpět vrátí do Team → Platby
  e.querySelectorAll("[data-phe]").forEach(b => b.onclick = () => {
    close();
    S.M = null; S.tab = "ev"; S.mid = null; S.evid = b.dataset.phe; S.evBack = "fo";
    render(); window.scrollTo(0, 0);
  });
}
function close() {
  const e = el();
  if (e) { e.style.display = "none"; e.innerHTML = ""; }
  H = null;
}

// ===== Exporty =====
// Otevření okna pro hráčku pid (jen správce pokladny); výchozí rozsah = minulý měsíc, způsob = opak toho, co tehdy platil
export function openPayHist(pid) {
  if (!HK.can("money") || !pl(pid)) return;
  const prev = ymAdd(ymNow(), -1);
  H = {pid, from: prev, to: prev, grp: grpAt(pl(pid), prev) === "single" ? "monthly" : "single", err: "", done: null, h: null, gone: new Set()};
  let e = el();
  if (!e) { e = document.createElement("div"); e.id = "cphx"; document.body.appendChild(e); }
  e.className = "md";
  e.style.cssText = "display:flex;z-index:58";
  paint();
}
