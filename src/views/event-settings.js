// Okno ⏰ Nastavení událostí (trenér a kustod): výchozí sraz tréninku a zápasu (minuty před začátkem) a výchozí délka tréninku.
// Ukládá se přes merge do settings/events = {meetT, meetM, len, by, at}; čtou všichni členové (S.es). Výchozí hodnoty platí pro nové
// události a pro události bez vlastního srazu / konce; u jednotlivé události se sraz i konec mění v jejím formuláři.
// Celoobrazovkové okno #evset se vytváří za běhu (stejně jako nastavení pokladny), otevírá se z ⚙️ (HK.openEvSet).
// Struktura: Importy -> Stav -> Pomocné funkce -> Vykreslení -> Eventy -> Export.

// ===== Importy =====
import {S} from "../core/state.js";
import {esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {EVSET_DOC, EV_DEF, LEN_MAX, MEET_MAX, addMin, clampMin, evDefaults} from "../domain/event-time.js";

// ===== Stav =====
let D = null;        // rozpracované hodnoty {meetT, meetM, len} (text z polí)

// ===== Pomocné funkce =====
const el = () => document.getElementById("evset");
const close = () => { const e = el(); if (e) { e.style.display = "none"; e.innerHTML = ""; } D = null; };
// Načtení polí formuláře do rozpracovaných hodnot
function sync(e) { ["meetT", "meetM", "len"].forEach(k => { const i = e.querySelector("#es-" + k); if (i) D[k] = i.value; }); }
// Ukázka pro trénink v 18:00 a zápas v 18:00 podle rozpracovaných hodnot
function sample() {
  const mt = clampMin(D.meetT, MEET_MAX, EV_DEF.meetT), mm = clampMin(D.meetM, MEET_MAX, EV_DEF.meetM), ln = clampMin(D.len, LEN_MAX, EV_DEF.len) || EV_DEF.len;
  return `Příklad: trénink 18:00 – ${addMin("18:00", ln)}${mt ? ", sraz " + addMin("18:00", -mt) : ", bez srazu"} · zápas 18:00${mm ? ", sraz " + addMin("18:00", -mm) : ", bez srazu"}`;
}

// ===== Vykreslení =====
function draw() {
  const e = el();
  if (!e || !D) return;
  const inp = (k, label, max) => `<label>${label}</label><input id="es-${k}" type="number" inputmode="numeric" min="0" max="${max}" step="5" value="${esc(String(D[k]))}">`;
  e.innerHTML = `<div style="max-width:560px;margin:0 auto"><div class="row" style="margin-bottom:12px"><button class="s" id="esx">← Zavřít</button></div>
<div class="cd"><h2>⏰ Nastavení událostí</h2>
<div class="mu" style="margin-bottom:10px">Výchozí hodnoty pro nové události a pro události, které vlastní sraz nebo konec nemají. U každé události je lze změnit v jejím formuláři (✏️). Sraz 0 = bez srazu.</div>
${inp("meetT", "Sraz na trénink – minut před začátkem", MEET_MAX)}
${inp("meetM", "Sraz na zápas – minut před začátkem", MEET_MAX)}
${inp("len", "Délka tréninku – minut (konec = začátek + délka)", LEN_MAX)}
<div class="mu" id="es-smp" style="margin:4px 0 12px">${sample()}</div>
<div class="row"><button class="p" id="ess">Uložit</button><button class="s" id="esd">Výchozí (${EV_DEF.meetT} / ${EV_DEF.meetM} / ${EV_DEF.len} min)</button></div></div></div>`;
  bind(e);
}

// ===== Eventy =====
function bind(e) {
  const q = s => e.querySelector(s);
  q("#esx").onclick = close;
  // Ukázka se přepočítá při psaní (bez překreslení – kurzor zůstane v poli)
  e.querySelectorAll("input").forEach(i => { i.oninput = () => { sync(e); q("#es-smp").textContent = sample(); }; });
  q("#esd").onclick = () => { D = {meetT: EV_DEF.meetT, meetM: EV_DEF.meetM, len: EV_DEF.len}; draw(); };
  q("#ess").onclick = () => {
    sync(e);
    const d = {meetT: clampMin(D.meetT, MEET_MAX, EV_DEF.meetT), meetM: clampMin(D.meetM, MEET_MAX, EV_DEF.meetM), len: clampMin(D.len, LEN_MAX, EV_DEF.len)};
    if (!d.len) return toast("Délka tréninku musí být aspoň 1 minuta");
    S.db.doc(EVSET_DOC).merge({...d, by: (HK.user() || {}).email || "", at: new Date().toISOString()});
    toast("Nastavení událostí uloženo");
    close();
  };
}

// ===== Export =====
// Otevření okna (jen trenér a kustod)
export function openEventSettings() {
  if (!HK.can("sport")) return;
  let e = el();
  if (!e) { e = document.createElement("div"); e.id = "evset"; document.body.appendChild(e); }
  e.style.cssText = "position:fixed;inset:0;z-index:56;background:var(--bg);overflow:auto;padding:12px;padding-top:calc(12px + env(safe-area-inset-top,0px));padding-bottom:calc(40px + env(safe-area-inset-bottom,0px));display:block";
  const v = evDefaults(S.es);
  D = {meetT: v.meetT, meetM: v.meetM, len: v.len};
  draw();
}
// Po změně v databázi (jiné zařízení) se otevřené okno nepřepisuje – rozpracované hodnoty zůstanou; jen se obnoví ukázka
export function refreshEventSettings() { const e = el(); if (D && e && e.style.display !== "none") { const s = e.querySelector("#es-smp"); if (s) s.textContent = sample(); } }
