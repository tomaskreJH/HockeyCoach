// Pokladna – měsíce (F4, trenér a pokladník): měsíční příspěvky, platy realizačního týmu, hospodaření měsíce (kryté události, výsledek),
// hospodaření po měsících a CSV export. Režim „📅 Měsíce“ v záložce Team.
// Struktura: Importy -> Stav -> Pomocné funkce -> Zápis (příspěvky, platy) -> Vykreslení (měsíc, příspěvky, platy, hospodaření měsíce, po měsících, CSV) -> Eventy -> Export.
// Data:
//  - příspěvek = předpis charges/{c_RRRR-MM_pid} {eid:"c_RRRR-MM", mid, amt, paid, due, kind:"contrib", vs}; vystavuje se ručně za vybraný měsíc,
//    už vystavené předpisy se nepřepisují, nezaplacený jde smazat; úhrada stejně jako u událostí (💰 Platby, příjem kategorie Příspěvky),
//  - plat = výdaj cash/{sal_RRRR-MM_tid} {d, k:"out", amt, cat:"Platy trenérů", mid:tid, ym, note, by}; návrh podle staff.pay (měsíčně / za událost),
//    zapisuje se ručně tlačítkem Vyplatit (jeden plat za člena a měsíc); oprava = storno v 🏦 Pokladna a nový zápis,
//  - každý zápis jde do audit (contrib, contrib-del, plat),
//  - příspěvek nese účet příspěvků z nastavení (acc) a zprávu pro příjemce (msg, např. „Příspěvek 10/2026 - Jana“); plat se vyplácí z hlavního účtu;
//    CSV pohybů a předpisů obsahuje i účet, VS a zprávu (párování s výpisem z banky),
//  - vystavení i smazání příspěvku zapíše v téže dávce souhrn dlužníků debtors/{mid} (bez částek, domain/debtors.js).

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {nm, pn} from "../core/selectors.js";
import {S} from "../core/state.js";
import {csv, downloadFile, esc, fd, td, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {CAT_SALARY, STAFF_PAY, accName, accOf, cashAcc, chargeMsg, payMsg, cashCfg, cashOfMonth, catSums, chargesOfMonth, contribEid, contribPlan, contribRows, contribYm, csvNum, fmtDue, fxPct, isContrib, kc, monthRows, overdue, r2, restOf, salaryDay, salaryRows, ymAdd, ymLabel, ymNow, ymOk, ymShort} from "../domain/cash.js";
import {applyDebtors, debtorPlanFor} from "../domain/debtors.js";
import {monthEconomy} from "../domain/economy.js";
import {econData} from "./payments.js";
import {render} from "./shell.js";

// ===== Stav (jen pro tuto obrazovku) =====
let ym = null;          // vybraný měsíc "RRRR-MM"
let yr = null;          // rok v přehledu hospodaření "RRRR"
let skip = new Set();   // hráčky vynechané z vystavení příspěvků (pid)
let inc = new Set();    // osvobozené hráčky, kterým se příspěvek za měsíc přesto vystaví (pid); ostatní osvobozené jsou vynechané
let camt = {};          // ručně upravené částky příspěvků (pid -> Kč)
let samt = {};          // ručně upravené částky platů (tid -> Kč)
let busy = 0;           // zámek proti dvojímu vystavení příspěvků (čas do kdy platí, ms)

// ===== Pomocné funkce =====
const email = () => { const u = HK.user(); return (u && u.email) || ""; };
const resetDraft = () => { skip = new Set(); inc = new Set(); camt = {}; samt = {}; };
// Je hráčka z vystavení vynechaná? Osvobozená ve výchozím stavu ano (dokud ji nezahrneš), ostatní ne (dokud ji nevynecháš)
const isOff = r => (r.ex ? !inc.has(r.pid) : skip.has(r.pid));
const audit = (eid, act, note) => ({ts: new Date().toISOString(), by: email(), eid, act, note: note || ""});
// Zvýraznění tlačítka označeného k potvrzení druhým klepnutím (confirm2)
const armStyle = key => (armed(key) ? "background:var(--no);color:#fff" : "");
// Všechny události (tréninky + zápasy) pro výpočet platů za událost
const allEv = () => [...S.ev, ...S.ma].map(e => ({id: e.id, date: e.date || ""}));
// Předpisy příspěvku za měsíc podle hráčky
function contribHave(m) {
  const h = {};
  S.ch.filter(x => x.eid === contribEid(m)).forEach(x => { h[x.mid] = x; });
  return h;
}
// Částka z pole formuláře (prázdné = výchozí návrh)
const amtOf = (map, id, def) => (map[id] != null && map[id] !== "" ? r2(+String(map[id]).replace(",", ".")) : def);
// Název události bez HTML (pro CSV); jméno osoby bez HTML = nm(id, {staff: true, fb: id})
function plainEvent(eid) {
  if (!eid) return "";
  const c = contribYm(eid);
  if (c) return "Příspěvek " + ymLabel(c);
  const t = S.ev.find(x => x.id === eid);
  if (t) return (t.title || "Trénink") + " " + (t.date || "");
  const m = S.ma.find(x => x.id === eid);
  return m ? "Zápas – " + (m.opp || "") + " " + (m.date || "") : "(smazaná událost)";
}
const stamp = () => td();
// Souhrn dlužníků po změně předpisů (realizační tým se nezapisuje) přidaný do téže dávky
const withDebtors = (b, sets, dels) => applyDebtors(b, debtorPlanFor(S.ch, sets, dels, mid => S.tr.some(t => t.id === mid)));

// ===== Zápis: příspěvky =====
// Vystavení příspěvků za měsíc: jedna dávka (předpisy + audit); existující předpisy se přeskočí
function issueContrib(rows, cfg) {
  if (Date.now() < busy) return;
  busy = Date.now() + 2500;
  const plan = contribPlan(ym, rows, cfg, S.ch, pid => payMsg({type: "contrib", ym}, (S.pl.find(p => p.id === pid) || {}).name || ""));
  if (!plan.length) { toast("Není co vystavit"); return; }
  const b = S.db.batch(), tot = plan.reduce((s, x) => s + x.d.amt, 0);
  plan.forEach(x => b.set("charges/" + x.id, x.d));
  withDebtors(b, plan, []);
  b.set("audit/" + uid(), audit(contribEid(ym), "contrib", "Příspěvky " + ymShort(ym) + ": " + plan.length + "×, " + kc(tot)));
  b.commit();
  resetDraft();
  toast("Vystaveno " + plan.length + " příspěvků (" + kc(tot) + ")");
}
// Smazání nezaplaceného příspěvku (předpis + audit v jedné dávce)
function deleteContrib(x) {
  if (+x.paid > 0) { toast("Předpis má úhradu – nejdřív ji stornuj v 🏦 Pokladna"); return; }
  const b = S.db.batch().delete("charges/" + x.id).set("audit/" + uid(), audit(x.eid, "contrib-del", nm(x.mid, {staff: true, fb: x.mid || ""}) + ": " + kc(+x.amt || 0)));
  withDebtors(b, [], [x.id]).commit();
  toast("Příspěvek smazán");
}

// ===== Zápis: platy =====
// Výplata platu = výdaj v pokladně s pevným id (jeden plat za člena a měsíc) + audit
function paySalary(r, amt) {
  if (!(amt > 0)) { toast("Zadej kladnou částku"); return false; }
  if (S.cs.some(x => x.id === r.id)) { toast("Plat za tento měsíc je už zapsaný"); return false; }
  const note = "Plat " + ymShort(ym) + (r.m === "event" ? " (" + r.n + "× " + kc(r.rate) + ")" : "");
  S.db.batch().set("cash/" + r.id, {d: salaryDay(ym, td()), k: "out", amt: r2(amt), cat: CAT_SALARY, mid: r.tid, ym, note, acc: "main", by: email()})
    .set("audit/" + uid(), audit("", "plat", r.name + ": " + kc(amt) + " za " + ymShort(ym))).commit();
  return true;
}

// ===== Vykreslení: výběr měsíce =====
function monthNav() {
  return `<div class="cd"><div class="evh"><button class="s" data-mym="-1">◀</button><b style="font-size:17px;text-transform:capitalize">${esc(ymLabel(ym))}</b><button class="s" data-mym="1">▶</button></div>${ym !== ymNow() ? '<button class="s w" data-mnow style="margin-top:8px">Tento měsíc</button>' : ""}</div>`;
}

// ===== Vykreslení: příspěvky =====
function contribHtml(cfg) {
  const have = contribHave(ym), rows = contribRows(S.pl, cfg, have);
  const issued = Object.values(have), tot = issued.reduce((s, x) => s + (+x.amt || 0), 0), got = issued.reduce((s, x) => s + Math.min(+x.paid || 0, +x.amt || 0), 0);
  const todo = rows.filter(r => !r.has && !isOff(r)).map(r => ({pid: r.pid, amt: amtOf(camt, r.pid, r.amt)})).filter(r => r.amt > 0);
  const todoSum = todo.reduce((s, r) => s + r.amt, 0), keyI = "mci" + ym;
  const warn = cfg.contrib > 0 ? "" : '<div class="mu" style="color:var(--no);margin-bottom:6px">Výše příspěvku není nastavená (⚙️ → Nastavení pokladny). Částky můžeš zadat ručně.</div>';
  const list = rows.length ? rows.map(r => {
    if (r.has) {
      const x = r.has, rest = restOf(x), od = overdue(x), key = "mcd" + x.id;
      const tag = rest ? `<span class="tag ${od ? "red" : "sh"}">${od ? "po splatnosti" : "k úhradě"}</span>` : '<span class="tag pp">zaplaceno</span>';
      return `<div class="pr"><div>${pn(r.pid)} ${tag}<div class="mu">vystaveno ${kc(+x.amt || 0)}${x.paid ? " · zaplaceno " + kc(+x.paid) : ""}${x.due ? " · splatnost " + fmtDue(x.due) : ""}</div></div><div class="evq">${+x.paid > 0 ? "" : `<button class="d" data-mcd="${x.id}" style="min-width:44px;${armStyle(key)}">${armed(key) ? "Smazat?" : "🗑"}</button>`}</div></div>`;
    }
    const off = isOff(r);
    return `<div class="pr"><div style="${off ? "opacity:.45" : ""}">${pn(r.pid)}${r.ex ? ' <span class="tag sh">osvobozená</span>' : ""}<div class="mu">${r.fx !== 1 ? "koeficient " + fxPct(r.fx) + " · " : ""}návrh ${kc(r.amt)}</div></div><div class="evq" style="align-items:center"><input data-mca="${r.pid}" type="number" min="0" inputmode="numeric" value="${esc(camt[r.pid] != null ? camt[r.pid] : r.amt)}" ${off ? "disabled" : ""} style="margin:0;width:90px"><button class="${off ? "" : "on-yes"}" data-mcs="${r.pid}" data-mcx="${r.ex ? 1 : 0}" style="min-width:44px">${off ? "–" : "✓"}</button></div></div>`;
  }).join("") : '<div class="msg">Nikdo neplatí příspěvek (Team → Soupiska → skupina plateb Příspěvek).</div>';
  return `<div class="cd"><h2>📨 Příspěvky – ${esc(ymLabel(ym))}</h2>${warn}<div class="mu" style="margin-bottom:6px">Příspěvek ${kc(cfg.contrib)} × koeficient hráčky, splatnost ${cfg.due.cm}. den měsíce. Platí hráčky ve skupině Příspěvek (bez brankářek, ukončených a s koeficientem 0 %). Osvobozené jsou ve výchozím stavu vynechané (–), klepnutím na – je pro tento měsíc zahrneš. Odškrtnutím (–) vynecháš kohokoli jen pro tento měsíc, částku lze upravit.</div>
<div class="grid3"><div class="stat"><b>${issued.length}</b>vystaveno</div><div class="stat"><b>${kc(got)}</b>zaplaceno</div><div class="stat"><b style="color:${tot - got > 0 ? "var(--no)" : "var(--ok)"}">${kc(r2(tot - got))}</b>zbývá</div></div>
${list}
${todo.length ? `<button class="p w" data-mci style="margin-top:10px;min-height:52px;${armStyle(keyI)}">${armed(keyI) ? "Opravdu vystavit? Klepni znovu" : "📨 Vystavit příspěvky (" + todo.length + "×, " + kc(todoSum) + ")"}</button>` : rows.length ? '<div class="mu" style="margin-top:8px">Všechny příspěvky za tento měsíc jsou vystavené.</div>' : ""}
<div class="mu" style="margin-top:8px">Úhrady příspěvků se zapisují v 💰 Platby (u hráčky). Příspěvek po splatnosti blokuje přihlášení „Jdu“ stejně jako platba za událost.</div></div>`;
}

// ===== Vykreslení: platy =====
function salaryHtml() {
  const rows = salaryRows(S.tr, ym, allEv(), S.at, S.cs, td());
  const open = rows.filter(r => !r.paid).map(r => ({r, amt: amtOf(samt, r.tid, r.amt)})).filter(o => o.amt > 0);
  const keyA = "msa" + ym, paidSum = rows.filter(r => r.paid).reduce((s, r) => s + (+r.paid.amt || 0), 0);
  const list = rows.length ? rows.map(r => {
    const how = r.m === "month" ? STAFF_PAY.month + " " + kc(r.rate) : STAFF_PAY.event + " " + kc(r.rate) + " × " + r.n + " (přihlášen/a „Jdu“, do dneška)";
    if (r.paid) return `<div class="pr"><div>🎓 ${esc(r.name)} <span class="tag pp">vyplaceno</span><div class="mu">${esc(how)} · zapsáno ${kc(+r.paid.amt || 0)} (${r.paid.d ? fd(r.paid.d) : "–"})</div></div><div></div></div>`;
    const key = "msp" + r.tid + ym;
    return `<div class="pr"><div>🎓 ${esc(r.name)}<div class="mu">${esc(how)} · návrh ${kc(r.amt)}</div></div><div class="evq" style="align-items:center"><input data-msa="${r.tid}" type="number" min="0" inputmode="numeric" value="${esc(samt[r.tid] != null ? samt[r.tid] : r.amt)}" style="margin:0;width:90px"><button data-msp="${r.tid}" style="min-width:110px;${armStyle(key)}">${armed(key) ? "Opravdu?" : "💸 Vyplatit"}</button></div></div>`;
  }).join("") : '<div class="msg">Nikdo z realizačního týmu nemá nastavený plat (Team → Realizační tým → Upravit → Plat).</div>';
  return `<div class="cd"><h2>💸 Platy – ${esc(ymLabel(ym))}</h2><div class="mu" style="margin-bottom:6px">Návrh podle nastavení platu člena. Vyplacením vznikne výdaj v pokladně (kategorie ${esc(CAT_SALARY)}). Každý člen má za měsíc jeden plat; oprava = storno v 🏦 Pokladna a nové vyplacení.${paidSum ? " Vyplaceno celkem " + kc(paidSum) + "." : ""}</div>
${list}
${open.length > 1 ? `<button class="p w" data-msall style="margin-top:10px;min-height:52px;${armStyle(keyA)}">${armed(keyA) ? "Opravdu vyplatit vše? Klepni znovu" : "💸 Vyplatit vše (" + open.length + "×, " + kc(open.reduce((s, o) => s + o.amt, 0)) + ")"}</button>` : ""}</div>`;
}

// ===== Vykreslení: hospodaření měsíce (podle data události a měsíce příspěvku) =====
// Částka se znaménkem a barvou (výsledek)
const signed = n => `<b style="color:${n < 0 ? "var(--no)" : "var(--ok)"}">${n > 0 ? "+" : n < 0 ? "−" : ""}${kc(Math.abs(n))}</b>`;
function econHtml() {
  const me = monthEconomy(ym, econData()), c = me.contrib, list = me.events.filter(e => e.cost > 0 || e.collect > 0), idle = me.events.length - list.length;
  const it = (t, v) => `<div class="it" style="cursor:default"><span>${t}</span><span>${v}</span></div>`;
  const ice = me.cov.n ? (me.cov.res >= 0 ? `<b style="color:var(--ok)">✅ led se vyplatil (${signed(me.cov.res)})</b>` : `<b style="color:var(--no)">⚠️ ztráta ${kc(-me.cov.res)}</b>`) : '<span class="mu">žádné kryté události</span>';
  const rows = list.length ? list.map(e => `<div class="pr"><div>${esc(fd(e.date))} · ${esc(e.title)} <span class="tag ${e.settled ? "pp" : "sh"}">${e.settled ? "uzavřeno" : "neuzavřeno"}</span><div class="mu">náklady ${kc(e.cost)} · vybereme ${kc(e.collect)}${e.covered ? " · podíl příspěvků " + kc(e.share) + (e.fixed ? " (při uzavření)" : "") : ""}</div></div>${signed(e.res)}</div>`).join("") : '<div class="mu">V měsíci nejsou události s náklady.</div>';
  return `<div class="cd"><h2>⚖️ Hospodaření měsíce – ${esc(ymLabel(ym))}</h2><div class="mu" style="margin-bottom:6px">Podle data události a měsíce příspěvku (ne splatnosti). Kryté události = šablona, kde skupina Příspěvek neplatí, a událost má náklady. Příspěvky měsíce (předepsané i zaplacené) se mezi ně dělí podle nákladů; uzavřená událost si podíl z okamžiku uzavření ponechá. U neuzavřených událostí jsou náklady ze šablony / uloženého nastavení a platby odhadem z přihlášených.</div>
<div class="grid3"><div class="stat"><b>${kc(c.amt)}</b>příspěvky</div><div class="stat"><b>${kc(r2(me.evc.amt + me.evc.est))}</b>za události</div><div class="stat"><b>${kc(me.cost.total)}</b>náklady</div></div>
${it(`Příspěvky (${c.n} hráček${c.est ? ", odhad – nevystavené" : ""})`, `předepsáno <b>${kc(c.amt)}</b> · zaplaceno ${kc(c.paid)}`)}
${it("Platby za události", `předepsáno <b>${kc(me.evc.amt)}</b> · zaplaceno ${kc(me.evc.paid)}${me.evc.est ? " · neuzavřené odhadem " + kc(me.evc.est) : ""}`)}
${it("Náklady událostí", `<b>${kc(me.cost.total)}</b> (vyúčtované ${kc(me.cost.settled)} · plánované ${kc(me.cost.planned)})`)}
${it("Platy (vyplacené)", kc(me.salary))}
${it("<b>Výsledek měsíce</b>", signed(me.result))}
${it(`Led – kryté události (${me.cov.n}): příspěvky ${kc(c.amt)} + vybrané ${kc(me.cov.collect)} − náklady ${kc(me.cov.cost)}`, ice)}
${me.cov.n && me.left > 0.5 ? `<div class="mu">Nerozdělené příspěvky ${kc(me.left)} (podíly uzavřených událostí jsou z doby uzavření).</div>` : ""}
<h3>Události měsíce</h3>${rows}${idle ? `<div class="mu" style="margin-top:6px">+ ${idle} bez nákladů a plateb (např. venkovní zápas).</div>` : ""}</div>`;
}

// ===== Vykreslení: hospodaření po měsících =====
function overviewHtml() {
  const all = monthRows(S.cs), years = [...new Set([...all.map(r => r.ym.slice(0, 4)), ymNow().slice(0, 4), ym.slice(0, 4)])].sort();
  if (!yr || !years.includes(yr)) yr = ym.slice(0, 4);
  const rows = all.filter(r => r.ym.startsWith(yr));
  const tin = rows.reduce((s, r) => s + r.in, 0), tout = rows.reduce((s, r) => s + r.out, 0);
  const chips = `<div class="chips">${years.map(y => `<button class="chip ${y === yr ? "on" : ""}" data-myr="${y}">${y}</button>`).join("")}</div>`;
  const table = rows.length ? `<div class="tw"><table><tr><th>Měsíc</th><th>Příjmy</th><th>Výdaje</th><th>Saldo</th><th>Zůstatek</th></tr>${rows.map(r => `<tr data-mpick="${r.ym}" style="cursor:pointer;${r.ym === ym ? "background:var(--a2)" : ""}"><td><b>${esc(ymLabel(r.ym))}</b></td><td>${kc(r.in)}</td><td>${kc(r.out)}</td><td style="color:${r.net < 0 ? "var(--no)" : "var(--ok)"}">${r.net > 0 ? "+" : ""}${kc(r.net)}</td><td>${kc(r.bal)}</td></tr>`).join("")}<tr><td><b>Celkem ${yr}</b></td><td><b>${kc(r2(tin))}</b></td><td><b>${kc(r2(tout))}</b></td><td><b>${kc(r2(tin - tout))}</b></td><td></td></tr></table></div>` : `<div class="msg">V roce ${yr} nejsou žádné pohyby.</div>`;
  // Rozpad vybraného měsíce: kategorie a předpisy se splatností v měsíci
  const C = catSums(cashOfMonth(S.cs, ym)), P = chargesOfMonth(S.ch, ym);
  const cat = k => { const e = Object.entries(C[k]).sort((a, b) => b[1] - a[1]); return e.length ? e.map(([c, v]) => `<div class="it" style="cursor:default"><span>${esc(c)}</span><b>${kc(v)}</b></div>`).join("") : '<div class="mu">Nic.</div>'; };
  const pr = (t, g) => `<div class="it" style="cursor:default"><span>${t} (${g.n})</span><span>předepsáno <b>${kc(g.amt)}</b> · zaplaceno ${kc(g.paid)} · zbývá <b style="color:${g.rest > 0 ? "var(--no)" : "inherit"}">${kc(g.rest)}</b></span></div>`;
  return `<div class="cd"><h2>📊 Hospodaření po měsících</h2>${chips}<div class="mu" style="margin-bottom:6px">Podle data pohybů v pokladně. Zůstatek = stav pokladny na konci měsíce. Klepnutím na měsíc ho vybereš.</div>${table}</div>
<div class="cd"><h2>${esc(ymLabel(ym))} – rozpad</h2><h3>Příjmy</h3>${cat("in")}<h3>Výdaje</h3>${cat("out")}<h3>Předpisy se splatností v měsíci</h3>${pr("Události", P.ev)}${pr("Příspěvky", P.contrib)}</div>`;
}

// ===== Vykreslení: CSV =====
function csvHtml() {
  return `<div class="cd"><h2>⬇️ Export (CSV pro Excel)</h2><div class="row"><button class="s" data-mcsv="cash-y">Pohyby ${esc(yr)}</button><button class="s" data-mcsv="cash">Všechny pohyby</button></div><div class="row" style="margin-top:8px"><button class="s" data-mcsv="ch">Předpisy</button><button class="s" data-mcsv="mon">Přehled po měsících</button></div></div>`;
}
// Sestavení a stažení CSV
function exportCsv(kind) {
  const cfg = cashCfg(S.cc);
  const out = kind => {
    if (kind === "ch") {
      const rows = [...S.ch].sort((a, b) => (a.due || "").localeCompare(b.due || ""));
      return {name: "predpisy", rows: [["Osoba", "Druh", "Událost / měsíc", "Částka", "Zaplaceno", "Zbývá", "Splatnost", "VS", "Účet", "Zpráva pro příjemce", "Výjimka z blokace"],
        ...rows.map(x => [nm(x.mid, {staff: true, fb: x.mid || ""}), isContrib(x) ? "Příspěvek" : x.kind === "event" ? "Událost" : (x.kind || ""), plainEvent(x.eid), csvNum(+x.amt || 0), csvNum(Math.min(+x.paid || 0, +x.amt || 0)), csvNum(restOf(x)), (x.due || "").replace("T", " "), x.vs || "", accName(cfg, accOf(x, cfg)), chargeMsg(x, S), x.exc ? "ano" : ""])]};
    }
    if (kind === "mon") return {name: "pokladna-mesice", rows: [["Měsíc", "Příjmy", "Výdaje", "Saldo", "Zůstatek"], ...monthRows(S.cs).map(r => [r.ym, csvNum(r.in), csvNum(r.out), csvNum(r.net), csvNum(r.bal)])]};
    const src = S.cs.filter(x => (x.k === "in" || x.k === "out") && (kind !== "cash-y" || String(x.d || "").startsWith(yr))).sort((a, b) => (a.d || "").localeCompare(b.d || ""));
    // Starší úhrady bez uložené zprávy a VS je převezmou z předpisu
    const chOf = x => (x.cid ? S.ch.find(c => c.id === x.cid) : null);
    const noteOf = x => { const c = chOf(x); return x.cid && !x.vs && c ? [chargeMsg(c, S), x.note || ""].filter(Boolean).join(" · ") : x.note || ""; };
    return {name: kind === "cash-y" ? "pokladna-" + yr : "pokladna", rows: [["Datum", "Typ", "Částka", "Účet", "Kategorie", "Osoba", "Událost / měsíc", "VS", "Poznámka / zpráva", "Zapsal"],
      ...src.map(x => [x.d || "", x.k === "in" ? "Příjem" : "Výdaj", csvNum((x.k === "out" ? -1 : 1) * (+x.amt || 0)), accName(cfg, cashAcc(x, cfg)), x.cat || "", nm(x.mid, {staff: true, fb: x.mid || ""}), plainEvent(x.eid), x.vs || (chOf(x) || {}).vs || "", noteOf(x), x.by || ""])]};
  };
  const r = out(kind);
  downloadFile(r.name + "-" + stamp() + ".csv", csv(r.rows), "text/csv");
}

// ===== Vykreslení: celá obrazovka =====
export function moneyHtml() {
  if (!HK.can("money")) return "";
  if (!ym || !ymOk(ym)) { ym = ymNow(); resetDraft(); }
  const cfg = cashCfg(S.cc);
  const err = S.payErr ? `<div class="cd" style="color:var(--no)">Pokladnu se nepodařilo načíst (${esc(S.payErr)}). Zkontroluj pravidla databáze (firestore.rules).</div>` : "";
  return err + monthNav() + contribHtml(cfg) + salaryHtml() + econHtml() + overviewHtml() + csvHtml();
}

// ===== Eventy =====
export function bindMoney(a) {
  if (!HK.can("money")) return;
  const q = s => a.querySelectorAll(s), cfg = cashCfg(S.cc);
  // Přepsání polí s částkami do stavu (před každým překreslením)
  const sync = () => {
    q("[data-mca]").forEach(i => { camt[i.dataset.mca] = i.value; });
    q("[data-msa]").forEach(i => { samt[i.dataset.msa] = i.value; });
  };
  q("[data-mca],[data-msa]").forEach(i => { i.onchange = () => { sync(); render(); }; });
  // Výběr měsíce a roku
  q("[data-mym]").forEach(b => b.onclick = () => { ym = ymAdd(ym, +b.dataset.mym); yr = ym.slice(0, 4); resetDraft(); render(); });
  q("[data-mnow]").forEach(b => b.onclick = () => { ym = ymNow(); yr = ym.slice(0, 4); resetDraft(); render(); });
  q("[data-myr]").forEach(b => b.onclick = () => { sync(); yr = b.dataset.myr; render(); });
  q("[data-mpick]").forEach(b => b.onclick = () => { ym = b.dataset.mpick; resetDraft(); render(); window.scrollTo(0, 0); });
  // Příspěvky: vynechání hráčky, vystavení, smazání nezaplaceného
  // Přepnutí vynechání: osvobozená se zahrnuje (inc), ostatní se vynechávají (skip)
  q("[data-mcs]").forEach(b => b.onclick = () => {
    sync();
    const id = b.dataset.mcs, set = b.dataset.mcx === "1" ? inc : skip;
    if (set.has(id)) set.delete(id); else set.add(id);
    render();
  });
  q("[data-mci]").forEach(b => b.onclick = () => {
    sync();
    confirm2("mci" + ym, () => {
      const rows = contribRows(S.pl, cfg, contribHave(ym)).filter(r => !r.has && !isOff(r)).map(r => ({pid: r.pid, amt: amtOf(camt, r.pid, r.amt)}));
      issueContrib(rows, cfg);
      render();
    });
  });
  q("[data-mcd]").forEach(b => b.onclick = () => {
    sync();
    const x = S.ch.find(c => c.id === b.dataset.mcd);
    if (x) confirm2("mcd" + x.id, () => { deleteContrib(x); render(); });
  });
  // Platy: jednotlivě a vše najednou
  const salRows = () => salaryRows(S.tr, ym, allEv(), S.at, S.cs, td());
  q("[data-msp]").forEach(b => b.onclick = () => {
    sync();
    const r = salRows().find(x => x.tid === b.dataset.msp);
    if (r) confirm2("msp" + r.tid + ym, () => { if (paySalary(r, amtOf(samt, r.tid, r.amt))) { delete samt[r.tid]; toast("Plat zapsán do pokladny"); } render(); });
  });
  q("[data-msall]").forEach(b => b.onclick = () => {
    sync();
    confirm2("msa" + ym, () => {
      let n = 0;
      salRows().filter(r => !r.paid).forEach(r => { const v = amtOf(samt, r.tid, r.amt); if (v > 0 && paySalary(r, v)) { n++; delete samt[r.tid]; } });
      toast(n ? "Zapsáno " + n + " platů" : "Není co vyplatit");
      render();
    });
  });
  // CSV
  q("[data-mcsv]").forEach(b => b.onclick = () => { sync(); exportCsv(b.dataset.mcsv); });
}

// ===== Export: otevření konkrétního měsíce (z přehledu plateb) =====
export function openMonth(m) {
  if (!ymOk(m)) return;
  ym = m;
  yr = m.slice(0, 4);
  resetDraft();
}
