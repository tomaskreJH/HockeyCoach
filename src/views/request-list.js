// ⚠️ Žádosti o změnu placení pro správce pokladny: pruh v Team → 💰 Platby, seznam a okno vyřízení (S.rqo) s náhledem dopadu
// (compareMonths; vystavené příspěvky a vyúčtování se nepřepočítají, jen vyjmenují). Data a pravidla domain/requests.js.
// Vyřízení = jedna dávka: žádost + při schválení plpay/{pid} (grpH, grp) + audit. Vlastní žádost vyřizuje jiný správce pokladny.
// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {pl, pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, reqWord, td, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {GRP, cashCfg, cxOf, kc, ymLabel, ymNow} from "../domain/cash.js";
import {compareMonths, myMonths} from "../domain/economy.js";
import {PPAY_COLL} from "../domain/private-data.js";
import {REQ_COLL, decidePlan, impactOf, openReqs} from "../domain/requests.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
// Rozepsaná odpověď v okně (nezmizí při překreslení)
let reply = "";

// ===== Pomocné funkce =====
const me = () => { const u = HK.user(); return ((u && u.email) || "").toLowerCase(); };
const fDay = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleDateString("cs-CZ"); };
// Otevřené žádosti o placení
export const payOpen = () => openReqs(S.rq, "pay");
// Popis změny: „Příspěvek → Za událost od listopad 2026“
export const reqLine = r => esc(GRP[r.from] || r.from) + " → <b>" + esc(GRP[r.to] || r.to) + "</b> od " + esc(ymLabel(r.ym));
// Události s příznaky pro impactOf: uzavřené vyúčtování a přihlášení hráčky
function evFlags(mid) {
  const went = id => S.at.some(a => a.eid === id && a.pid === mid && a.st === "yes");
  const one = (id, title, date) => ({id, title, date, settled: !!cxOf(id, S.ec).settle, went: went(id)});
  return [...S.ev.map(e => one(e.id, e.title || "Trénink", e.date)), ...S.ma.map(m => one(m.id, "Zápas – " + (m.opp || ""), m.date))];
}

// ===== Vykreslení =====
// Pruh v Team → 💰 Platby (a v Událostech u správců): počet otevřených žádostí a tlačítko k první z nich
export function reqBanner(go) {
  if (!HK.can("money")) return "";
  const rs = payOpen();
  if (!rs.length) return "";
  const list = rs.map(r => `<button class="s w" data-rqo="${esc(r.id)}" style="margin-top:6px;text-align:left">${pn(r.mid)} · ${reqLine(r)}</button>`).join("");
  return `<div class="cd" style="border-color:var(--wa)"><b style="color:var(--wa)">✋ ${rs.length} ${reqWord(rs.length)} o změnu placení</b>${go ? `<button class="s w" data-rqgo style="margin-top:8px">💰 Otevřít Team → Platby</button>` : list}</div>`;
}
// Náhled dopadu schválení: porovnání způsobu placení a už vystavené předpisy / uzavřená vyúčtování
function impactHtml(r, p) {
  const ch = S.ch.filter(x => x.mid === r.mid), mm = myMonths(ch, S, td());
  const went = id => S.at.some(a => a.eid === id && a.pid === r.mid && a.st === "yes");
  const c = compareMonths(p, mm, S.pr, went, cashCfg(S.cc).contrib, ymNow());
  const cmp = c && !c.skip && c.rows.length ? `<div class="mu" style="margin-top:6px">Sezóna dosud: skutečně ${kc(c.total.act)}, druhým způsobem ${kc(c.total.alt)} (jen uzavřené události)${c.better ? " – výhodnější pro hráčku: <b>" + esc(GRP[c.better]) + "</b>" : " – vychází stejně"}.</div>` : "";
  const im = impactOf(r, S.ch, evFlags(r.mid));
  const ct = im.contribs.length ? `<div class="mu" style="margin-top:6px">⚠️ Už vystavené příspěvky od ${esc(ymLabel(r.ym))}: ${im.contribs.map(x => esc(ymLabel(x.ym)) + " " + kc(x.amt) + (x.rest ? " (nezaplaceno " + kc(x.rest) + ")" : " (zaplaceno)")).join(", ")}. Nepřepočítají se – nezaplacený příspěvek lze smazat v Team → 📅 Měsíce.</div>` : "";
  const st = im.settled.length ? `<div class="mu" style="margin-top:6px">⚠️ Uzavřená vyúčtování od ${esc(ymLabel(r.ym))}, kde byla přihlášená: ${im.settled.map(e => esc(e.title) + " " + esc(String(e.date || "").slice(8, 10) + ". " + +String(e.date || "").slice(5, 7) + ".")).join(", ")}. Nepřepočítají se – případně vyúčtování ručně znovu otevři.</div>` : "";
  return cmp + ct + st + (ct || st ? "" : '<div class="mu" style="margin-top:6px">Od měsíce změny zatím nic vystaveného ani uzavřeného – nastaví se vše samo.</div>');
}
// Okno vyřízení žádosti (S.rqo); bez otevřené žádosti prázdné
export function reqModal() {
  if (!S.rqo || !HK.can("money")) return "";
  const r = S.rq.find(x => x.id === S.rqo), p = r ? pl(r.mid) : null;
  if (!r || r.st !== "open" || !p) { S.rqo = null; reply = ""; return ""; }
  const own = HK.pid() === r.mid;
  const acts = own ? '<div class="mu" style="margin-top:10px">Vlastní žádost vyřídí jiný správce pokladny.</div>'
    : `<input id="rqrep" placeholder="Odpověď hráčce (nepovinné)" maxlength="300" value="${esc(reply)}" style="margin-top:10px"><div class="row" style="margin-top:8px"><button class="p" id="rqok">${armed("rqok" + r.id) ? "Opravdu schválit?" : "✓ Schválit"}</button><button class="d" id="rqno">${armed("rqno" + r.id) ? "Opravdu zamítnout?" : "✕ Zamítnout"}</button></div>`;
  return `<div class="md" id="rqbg"><div class="mb"><h2>✋ Žádost o změnu placení</h2><div><b>${pn(r.mid)}</b></div><div style="margin-top:4px">${reqLine(r)}</div>
<div class="mu">Podáno ${esc(fDay(r.at))}${r.by ? " · " + esc(r.by) : ""}</div>${r.note ? `<div style="margin-top:6px">„${esc(r.note)}“</div>` : ""}
<h3 style="margin-top:12px">Dopad schválení</h3><div class="mu">Po schválení se zapíše historie způsobu placení: příspěvky od ${esc(ymLabel(r.ym))} a vyúčtování událostí od toho měsíce se počítají podle nového způsobu.</div>${impactHtml(r, p)}
${acts}<button class="s w" id="rqx" style="margin-top:12px;min-height:48px">Zavřít</button></div></div>`;
}

// ===== Hlavní logika: vyřízení =====
// Schválení / zamítnutí v jedné dávce (žádost + plpay + audit); stav v okně se po návratu dat překreslí sám
function decide(r, ok) {
  const p = pl(r.mid);
  if (!p || r.st !== "open") return;
  const at = new Date().toISOString(), plan = decidePlan(r, p, ok, reply, me(), at, ymNow());
  const b = S.db.batch().merge(REQ_COLL + "/" + r.id, plan.req);
  if (plan.pay) b.merge(PPAY_COLL + "/" + r.mid, plan.pay);
  b.set("audit/" + uid(), {ts: at, by: me(), eid: "", act: ok ? "req-ok" : "req-no", note: (p.name || "") + ": " + plan.note + (plan.req.reply ? " (" + plan.req.reply + ")" : "")});
  b.commit();
  S.rqo = null; reply = "";
  toast(ok ? "Žádost schválena – změna placení nastavena" : "Žádost zamítnuta");
  render();
}

// ===== Eventy =====
// Obsluha pruhu a okna (volá finance.js a mine.js po vykreslení)
export function bindReq(a) {
  a.querySelectorAll("[data-rqo]").forEach(b => b.onclick = () => { S.rqo = b.dataset.rqo; reply = ""; render(); });
  a.querySelectorAll("[data-rqgo]").forEach(b => b.onclick = () => { S.tab = "fo"; S.tm = "pay"; S.mid = null; S.evid = null; render(); window.scrollTo(0, 0); });
  const rep = a.querySelector("#rqrep");
  if (rep) rep.oninput = () => { reply = rep.value; };
  const r = S.rqo ? S.rq.find(x => x.id === S.rqo) : null;
  const ok = a.querySelector("#rqok"), no = a.querySelector("#rqno");
  if (ok && r) ok.onclick = () => confirm2("rqok" + r.id, () => decide(r, true));
  if (no && r) no.onclick = () => confirm2("rqno" + r.id, () => decide(r, false));
  const close = () => { S.rqo = null; reply = ""; render(); };
  const x = a.querySelector("#rqx");
  if (x) x.onclick = close;
  const bg = a.querySelector("#rqbg");
  if (bg) bg.onclick = e => { if (e.target.id === "rqbg") close(); };
}

// ===== Exporty =====
// (exportované funkce jsou označené u definic výše)
