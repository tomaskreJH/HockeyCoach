// Platby za události: vyúčtování, seznam plátců a označení zaplaceno (jen trenér a kustod).
// Struktura: Importy -> Pomocné funkce -> Vyúčtování (zápis) -> Vykreslení -> Eventy -> Export.
// Data: kolekce "payments" (id dokumentu = {eventId}_{playerId}: {eid, pid, amt, paid, paidAt, by});
// snímek vyúčtování je v dokumentu události (pole settle). Vyúčtování se vytváří automaticky při uzavření zápasu
// nebo ručně tlačítkem „Potvrdit vyúčtování“ (tréninky, zápasy před uzavřením); „Přepočítat“ zachová stav zaplaceno.

// ===== Importy =====
import {strip} from "../core/actions.js";
import {goingOf, pl, pn, pri} from "../core/selectors.js";
import {S} from "../core/state.js";
import {clone, esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {MODES, calc, kc} from "../domain/payments.js";

// ===== Pomocné funkce =====
const payId = (eid, pid) => eid + "_" + pid;
// Platby události podle hráčky
const payMap = eid => { const r = {}; S.pay.filter(x => x.eid === eid).forEach(x => { r[x.pid] = x; }); return r; };
const who = () => { const u = HK.user(); return (u && u.email) || ""; };
export const evOfMatch = m => ({id: m.id, type: "match", raw: m});

// ===== Vyúčtování (zápis) =====
// Spočítá platby podle aktuální docházky, uloží platby plátců a do kopie dokumentu události (raw) zapíše snímek settle.
// Dokument události uloží volající (zápas při uzavření, jinak bindPay).
export function settleEvent(ev, raw) {
  const c = calc({...ev, raw}, goingOf(ev.id)), have = payMap(ev.id), keep = new Set(c.payers.map(x => x.pid));
  raw.settle = {at: new Date().toISOString(), by: who(), mode: c.mode, fee: c.fee, n: c.n, ex: c.ex, base: c.base, per: c.per, cnt: c.payers.length};
  c.payers.forEach(x => {
    const o = have[x.pid];
    S.db.doc("payments/" + payId(ev.id, x.pid)).set({eid: ev.id, pid: x.pid, amt: x.amt, paid: !!(o && o.paid), paidAt: (o && o.paidAt) || "", by: (o && o.by) || ""})
      .catch(() => toast("Uložení platby se nepovedlo"));
  });
  // Platby hráček, které už neplatí, se smažou (zaplacené zůstávají, aby se nepřišlo o evidenci)
  Object.values(have).forEach(o => { if (!keep.has(o.pid) && !o.paid) S.db.doc("payments/" + payId(ev.id, o.pid)).delete().catch(() => {}); });
  return c;
}
function togglePaid(eid, pid, paid) {
  const o = payMap(eid)[pid];
  if (!o) return;
  S.db.doc("payments/" + payId(eid, pid)).set({eid, pid, amt: o.amt, paid, paidAt: paid ? new Date().toISOString() : "", by: who()}).catch(() => toast("Uložení platby se nepovedlo"));
}

// ===== Vykreslení =====
export function payHtml(ev) {
  if (!HK.isStaff()) return "";
  const st = ev.raw.settle, c = calc(ev, goingOf(ev.id)), have = payMap(ev.id), h = "<h2>💰 Platby</h2>";
  const err = S.payErr ? `<div class="mu" style="color:var(--no);margin-bottom:6px">Platby se nepodařilo načíst (${esc(S.payErr)}). Zkontroluj pravidla databáze (firestore.rules).</div>` : "";
  if (c.mode === "none") return `<div class="cd">${h}${err}<div class="mu">${MODES.none} – např. venkovní zápas je v režii soupeře. Způsob úhrady změníš v ✏️ Upravit.</div></div>`;
  if (!c.fee) return `<div class="cd">${h}${err}<div class="mu">Cena události není nastavena. Zadej ji v ✏️ Upravit.</div></div>`;
  const grid = `<div class="grid3"><div class="stat"><b>${c.n}</b>účastnic</div><div class="stat"><b>${c.ex}</b>osvobozených</div><div class="stat"><b>${kc(c.per)}</b>na osobu</div></div>`;
  const calcTxt = c.base < 1 ? "Není žádná účastnice k vyúčtování." : `Cena ${kc(c.fee)} ÷ ${c.base} (účastnice bez osvobozených) = ${kc(c.per)} na osobu (zaokrouhleno nahoru na celé Kč).`;
  const split = c.mode === "contrib"
    ? `Hrazeno příspěvkem: ${c.monthly} · platí za událost: ${c.single}`
    : `Platí všechny účastnice kromě osvobozených: ${c.payers.length}`;
  // Po vyúčtování se zobrazují uložené platby, před ním jen předběžný výpočet
  const rows = st
    ? Object.values(have).filter(o => pl(o.pid)).sort((x, y) => pri(pl(x.pid)) - pri(pl(y.pid)) || pl(x.pid).name.localeCompare(pl(y.pid).name, "cs"))
        .map(o => `<div class="pr"><div>${pn(o.pid)}<div class="mu">${kc(o.amt)}${o.paid && o.paidAt ? " · zaplaceno " + new Date(o.paidAt).toLocaleDateString("cs-CZ") : ""}</div></div><div class="evq"><button class="${o.paid ? "on-yes" : ""}" data-pp="${o.pid}|${o.paid ? 0 : 1}" style="min-width:150px">${o.paid ? "✅ Zaplaceno" : "⬜ Nezaplaceno"}</button></div></div>`).join("")
    : c.payers.map(x => `<div class="pr"><div>${pn(x.pid)}<div class="mu">${kc(x.amt)}</div></div><div></div></div>`).join("");
  let sum = "";
  if (st) {
    const all = Object.values(have), paid = all.filter(o => o.paid), got = paid.reduce((s, o) => s + (+o.amt || 0), 0), tot = all.reduce((s, o) => s + (+o.amt || 0), 0);
    sum = `<div class="mu" style="margin:8px 0"><b>Zaplaceno ${paid.length} z ${all.length}</b> · vybráno ${kc(got)} z ${kc(tot)}</div>`;
  }
  const diff = st && (st.per !== c.per || st.cnt !== c.payers.length || st.n !== c.n || st.fee !== c.fee || st.mode !== c.mode);
  const info = st
    ? `<div class="mu" style="margin-bottom:6px">Vyúčtováno ${new Date(st.at).toLocaleString("cs-CZ")}.</div>${diff ? '<div class="note" style="border-left:5px solid var(--wa);padding:6px 10px;margin-bottom:8px">⚠️ Docházka nebo cena se od vyúčtování změnila – přepočítej vyúčtování.</div>' : ""}`
    : '<div class="mu" style="margin-bottom:6px">Předběžný výpočet z aktuální docházky. Vyúčtování se vytvoří při uzavření zápasu, u tréninku ho potvrď tlačítkem.</div>';
  return `<div class="cd">${h}${err}${info}${grid}<div class="mu">${calcTxt}</div><div class="mu" style="margin:4px 0 8px">${MODES[c.mode]}. ${split}</div>${sum}${rows || '<div class="mu">Nikdo neplatí.</div>'}<button class="${st ? "s" : "p"} w" id="pset" style="min-height:52px;margin-top:10px">${st ? "↻ Přepočítat vyúčtování" : "💰 Potvrdit vyúčtování"}</button></div>`;
}

// ===== Eventy =====
// Potvrzení / přepočet vyúčtování a označení zaplaceno (změny se do obrazovky vrátí přes odběr dat)
export function bindPay(a, ev) {
  const b = a.querySelector("#pset");
  if (b) b.onclick = () => {
    const raw = clone(ev.raw);
    settleEvent(ev, raw);
    S.db.doc((ev.type === "match" ? "matches/" : "events/") + ev.id).set(strip(raw)).catch(() => toast("Uložení se nepovedlo"));
    toast("Vyúčtováno");
  };
  a.querySelectorAll("[data-pp]").forEach(x => x.onclick = () => { const [pid, v] = x.dataset.pp.split("|"); togglePaid(ev.id, pid, v === "1"); });
}
