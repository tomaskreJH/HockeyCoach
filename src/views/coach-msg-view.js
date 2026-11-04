// 📣 Zpráva od trenéra (v22.48): 1) vyskakovací okno při startu aplikace, jednou na zařízení pro každou novou zprávu,
// 2) sbalená karta úplně dole v 🏠 Domů (pod pokladnou) – klepnutím se zpráva rozbalí a přečte, trenér ji tam zadá, upraví nebo smaže.
// Data: dokument coachmsg/current (domain/coach-msg.js), v S.cm; poslech zapíná main.js. „Viděno“ = localStorage zařízení (označení zprávy).
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Okno při startu -> Karta v Domů -> Exporty.

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {S} from "../core/state.js";
import {esc, failMsg, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {CMSG_COLL, CMSG_ID, CMSG_MAX, cmsgCheck, cmsgDay, cmsgDoc, cmsgPopupDue, cmsgShown, cmsgUnseen} from "../domain/coach-msg.js";
import {render} from "./shell.js";

// ===== Konstanty a stav =====
const SEEN_KEY = "hk-cmsg";                 // localStorage: označení naposledy zobrazené zprávy (jen toto zařízení)
const POP_ID = "cmp";                       // kontejner okna (vkládá se do body)
const BOOT = Date.now();                    // čas spuštění aplikace (okno se ukazuje jen krátce po něm)
let open = false;                           // karta rozbalená
let editing = false;                        // otevřené zadání / úprava zprávy
let draft = "";                             // rozepsaný text
let again = false;                          // při úpravě: ukázat členům znovu jako okno (nové označení zprávy)
let popShown = null;                        // označení zprávy, jejíž okno je právě otevřené

// ===== Pomocné funkce =====
const me = () => { const u = HK.user(); return ((u && u.email) || "").toLowerCase(); };
const errTxt = e => (e && (e.code || e.message)) || String(e);
const seenId = () => { try { return localStorage.getItem(SEEN_KEY) || ""; } catch (e) { return ""; } };
const markSeen = id => { try { localStorage.setItem(SEEN_KEY, String(id || "")); } catch (e) { /* bez paměti zařízení se okno ukáže znovu při dalším startu */ } };
// Podpis pod zprávou: člen realizačního týmu, jinak propojená hráčka, jinak jméno účtu nebo začátek e-mailu
function selfName() {
  const t = S.tr.find(x => x.id === HK.tid()), p = S.pl.find(x => x.id === HK.pid()), u = HK.user();
  return (t && t.name) || (p && p.name) || (u && u.displayName) || me().split("@")[0] || "Trenér";
}
const canEdit = () => HK.can("sport");     // manager, trenér, asistent (stejně jako pravidla databáze – isStaff)
const textHtml = t => `<div style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(t)}</div>`;
const signHtml = m => `<div class="mu" style="margin-top:6px">— ${esc(m.bn)}${cmsgDay(m.at) ? ", " + esc(cmsgDay(m.at)) : ""}</div>`;

// ===== Okno při startu =====
// Ukáže se jen u nové zprávy a jen krátce po spuštění (zpráva zadaná za běhu nikoho nepřeruší, třeba při živém zápisu – uvidí ji v kartě dole v Domů).
// Zavře se tlačítkem „Rozumím“, tím se zpráva na tomto zařízení označí jako přečtená.
function closePop() {
  const e = document.getElementById(POP_ID);
  if (e) e.remove();
  popShown = null;
}
function openPop(m) {
  if (popShown === m.id) return;
  let e = document.getElementById(POP_ID);
  if (!e) { e = document.createElement("div"); e.id = POP_ID; document.body.appendChild(e); }
  popShown = m.id;
  e.setAttribute("role", "dialog");
  e.setAttribute("aria-modal", "true");
  e.style.cssText = "position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px";
  e.innerHTML = `<div class="mb" style="width:100%;max-width:460px;max-height:85vh;overflow:auto"><h2>📣 Zpráva od trenéra</h2><div style="margin:10px 0">${textHtml(m.t)}${signHtml(m)}</div><button class="p w" id="cmpok" style="min-height:52px">Rozumím</button></div>`;
  e.querySelector("#cmpok").onclick = () => { markSeen(m.id); closePop(); render(); };
}
// Po každé změně zprávy v databázi (volá main.js): nová zpráva krátce po spuštění otevře okno; smazaná nebo už viděná okno zavře
export function cmsgSnap() {
  const m = S.cm;
  if (cmsgPopupDue(m, seenId(), BOOT, Date.now())) openPop(m);
  else if (popShown && (!cmsgShown(m) || m.id !== popShown)) closePop();
}

// ===== Karta v Domů =====
// Zadání / úprava (jen manager, trenér, asistent): text, při úpravě volba „ukázat znovu jako okno“, podpis se doplní sám
function editorHtml(m) {
  return `<label class="mu">Zpráva týmu (max ${CMSG_MAX} znaků)</label><textarea id="cmti" rows="5" maxlength="${CMSG_MAX}" placeholder="např. Ve čtvrtek trénink od 18:30, sraz v 18:00.">${esc(draft)}</textarea>
${m ? `<label class="row" style="align-items:center;gap:8px;flex-wrap:nowrap;margin-top:6px"><input id="cmag" type="checkbox" style="width:auto;margin:0"${again ? " checked" : ""}> 🔔 Ukázat členům znovu jako okno</label>` : ""}
<div class="mu" style="margin-top:6px">Podepíše se: <b>${esc(selfName())}</b></div>
<div class="row" style="margin-top:8px"><button class="p" id="cmsv">Uložit</button><button class="s" id="cmcx">Zrušit</button></div>`;
}
// Karta úplně dole v Domů: bez zprávy jen pro trenéry tlačítko „Zadat“, se zprávou sbalená řádka (podpis, datum, 🆕 u nepřečtené),
// rozbalená ukáže text a trenérovi ✏️ Upravit / 🗑 Smazat
export function cmsgCard() {
  const m = S.cm, can = canEdit();
  if (!cmsgShown(m)) return can ? `<div class="cd" id="cmc">${editing ? editorHtml(null) : '<button class="s w" id="cmne">📣 Zadat zprávu týmu</button>'}</div>` : "";
  const un = cmsgUnseen(m, seenId()), isOpen = open || editing;
  const head = `<div class="hmh hmc" id="cmth"><b>📣 Zpráva od trenéra${un ? ' <span class="tag sh">🆕</span>' : ""}</b><span class="mu">${esc(m.bn)}${cmsgDay(m.at) ? " · " + esc(cmsgDay(m.at)) : ""} ${isOpen ? "▴" : "▾"}</span></div>`;
  const acts = can && !editing ? `<div class="row" style="margin-top:8px"><button class="s" id="cmed">✏️ Upravit</button><button class="d" id="cmdl">${armed("cmsg:del") ? "Opravdu? Klepni znovu" : "🗑 Smazat"}</button></div>` : "";
  const body = !isOpen ? "" : editing ? `<div style="margin-top:8px">${editorHtml(m)}</div>` : `<div style="margin-top:8px">${textHtml(m.t)}${signHtml(m)}</div>${acts}`;
  return `<div class="cd" id="cmc">${head}${body}</div>`;
}
// Obsluha karty (volá home-view.js po vykreslení)
export function bindCmsg(a) {
  const q = id => a.querySelector("#" + id);
  const ti = q("cmti");
  if (ti) ti.oninput = () => { draft = ti.value; };
  const ag = q("cmag");
  if (ag) ag.onchange = () => { again = ag.checked; };
  // Rozbalit / sbalit; rozbalením se zpráva na tomto zařízení označí jako přečtená
  const th = q("cmth");
  if (th) th.onclick = () => { open = !open; if (open && S.cm) markSeen(S.cm.id); render(); };
  const ne = q("cmne");
  if (ne) ne.onclick = () => { editing = true; draft = ""; again = false; render(); };
  const ed = q("cmed");
  if (ed) ed.onclick = () => { editing = true; draft = S.cm ? S.cm.t : ""; again = false; render(); };
  const cx = q("cmcx");
  if (cx) cx.onclick = () => { editing = false; draft = ""; render(); };
  // Uložení: nová zpráva dostane nové označení (členům se ukáže okno); úprava bez volby zachová označení (okno se znovu neukáže)
  const sv = q("cmsv");
  if (sv) sv.onclick = () => {
    const c = cmsgCheck(draft);
    if (!c.ok) return toast(c.err);
    if (HK.blocked() || !canEdit()) return;
    const m = S.cm, id = cmsgShown(m) && !again ? m.id : uid();
    S.db.doc(CMSG_COLL + "/" + CMSG_ID).set(cmsgDoc(c.t, selfName(), me(), new Date().toISOString(), id)).catch(e => toast(failMsg("Uložení zprávy", errTxt(e))));
    markSeen(id);                                                      // autor zprávu zná, okno se mu neukáže
    editing = false; draft = ""; open = true;
    toast("Zpráva uložena");
    render();
  };
  // Smazání druhým klepnutím
  const dl = q("cmdl");
  if (dl) dl.onclick = () => confirm2("cmsg:del", () => {
    if (HK.blocked()) return;
    S.db.doc(CMSG_COLL + "/" + CMSG_ID).delete().catch(e => toast(failMsg("Smazání zprávy", errTxt(e))));
    open = false; editing = false;
    render();
  });
}
