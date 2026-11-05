// 🔔 Sekce ⚙️ → Notifikace: stav týmu, zapnutí na tomto zařízení (volby: zrušení / změna času, uzávěrka bez odpovědi) a pro managera
// (a vývojáře) hlavní vypínač s červeným tlačítkem ⛔ STOP a vložení klíče VAPID. Posílá Cloud Functions (functions/, nasazení: docs/notifikace-nasazeni.md).
// Data: settings/notif (vypínač, klíč) a devices (zařízení) – zápisy přes HK.notif (data/notif-api.js), pravidla hlídá firestore.rules.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Sekce -> Obsluha.

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {esc, failMsg, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {deviceStatus} from "../domain/notif.js";

// ===== Konstanty a stav =====
const BTN_STOP = "background:var(--no);color:#fff;font-weight:700;font-size:17px;padding:14px";   // červené tlačítko STOP
let busy = false;                          // probíhá zápis (zabrání dvojímu klepnutí)
let vdraft = null;                         // rozepsaný klíč VAPID (null = nic nerozepsáno)

// ===== Pomocné funkce =====
const N = () => HK.notif;
const errTxt = e => (e && (e.code || e.message)) || String(e);
// Zapíše změnu a překreslí; chybu ukáže hláškou
async function run(box, fn, ok) {
  if (busy) return;
  busy = true;
  try { const r = await fn(); if (r !== false && ok) toast(ok); } catch (e) { toast(failMsg("Změna notifikací", errTxt(e))); }
  busy = false;
  if (document.body.contains(box)) draw(box);
}

// ===== Sekce =====
// Záhlaví sekce v ⚙️: stav týmu; při zapnutých notifikacích zvýrazněno u správce (je co hlídat)
export function notifSecHtml(sec) {
  const i = N().info();
  return sec("notif", "🔔 Notifikace", '<div id="cnt"></div>', i.global.on ? "zapnuto" : "vypnuto", i.global.on && i.edit);
}
// Obsah: stav týmu + tohle zařízení + správa týmu (jen manager / vývojář)
function body() {
  const i = N().info(), g = i.global, l = i.local, ds = deviceStatus({support: i.support, perm: i.perm, local: l, global: g});
  const team = `<div class="mu" style="margin-bottom:8px">Posílají se jen dvě věci: <b>zrušení nebo změna času</b> události, na kterou jsi přihlášená (Jdu / Nejsem jistý), a <b>připomínka hodinu před uzávěrkou přihlašování</b>, když jsi ještě neodpověděla. Jinak nic.</div>
<div style="margin-bottom:10px"><b>Tým:</b> ${g.on ? "🟢 zapnuto" : "🔴 vypnuto"}${g.at ? ' <span class="mu">(změněno ' + esc(g.at) + (g.by ? ", " + esc(g.by) : "") + ")</span>" : ""}</div>`;
  const dev = i.preview
    ? '<div class="mu">V náhledu role se zařízení nenastavuje.</div>'
    : `<h3>Toto zařízení</h3><div class="mu" style="margin-bottom:8px${ds.warn ? ";color:var(--no);font-weight:600" : ""}">${esc(ds.txt)}</div>
${i.support.ok && i.perm !== "denied" ? `<label class="row" style="align-items:center;gap:8px"><input type="checkbox" id="cnz"${l.z ? " checked" : ""}> ❌🕒 Zrušení / změna času</label>
<label class="row" style="align-items:center;gap:8px;margin-top:4px"><input type="checkbox" id="cnu"${l.u ? " checked" : ""}> ⏳ Hodinu před uzávěrkou, když jsem neodpověděla</label>
<div class="row" style="margin-top:8px"><button class="p" id="cnon">${l.on ? "💾 Uložit volby" : "🔔 Zapnout na tomto zařízení"}</button>${l.on ? '<button class="s" id="cnoff">Vypnout na tomto zařízení</button>' : ""}</div>` : ""}`;
  return team + dev + (i.edit ? admin(g) : "");
}
// Správa týmu: ⛔ STOP (jedno klepnutí – bezpečná akce) nebo zapnutí (druhé klepnutí), klíč VAPID
function admin(g) {
  const stop = g.on
    ? `<button class="w" id="cnstop" style="${BTN_STOP}">⛔ STOP notifikace (vypnout všem)</button><div class="mu" style="margin-top:4px">Okamžitě zastaví veškeré posílání. Zařízení zůstanou zapsaná, zapnout znovu jde tlačítkem níže.</div>`
    : `<button class="p w" id="cngo">${armed("notif:go") ? "Opravdu zapnout? Klepni znovu" : "▶️ Zapnout notifikace týmu"}</button>${g.vapid ? "" : '<div class="mu" style="margin-top:4px;color:var(--no);font-weight:600">Nejdřív vlož klíč VAPID (viz níže), jinak si je nikdo nezapne.</div>'}`;
  const v = vdraft == null ? g.vapid : vdraft;
  return `<h3 style="margin-top:14px">Správa týmu</h3>${stop}
<div class="mu" style="margin-top:10px">Klíč VAPID (Firebase konzole → Project settings → Cloud Messaging → Web Push certificates → Generate key pair; vkládá se jednou):</div>
<input id="cnv" placeholder="BNx…" value="${esc(v)}" style="margin-top:4px"><button class="s w" id="cnvs" style="margin-top:6px">Uložit klíč</button>`;
}

// ===== Obsluha =====
function draw(box) {
  box.innerHTML = body();
  const q = s => box.querySelector(s), z = () => (q("#cnz") ? q("#cnz").checked : true), u = () => (q("#cnu") ? q("#cnu").checked : true);
  if (q("#cnon")) q("#cnon").onclick = () => run(box, async () => {
    const r = await N().enable(z(), u());
    if (!r.ok) { if (r.why) toast(r.why); return false; }
    return true;
  }, "🔔 Zapnuto na tomto zařízení");
  if (q("#cnoff")) q("#cnoff").onclick = () => run(box, () => N().disable(), "Na tomto zařízení vypnuto");
  // STOP: okamžitě, bez potvrzení (vypnout je vždy bezpečné)
  if (q("#cnstop")) q("#cnstop").onclick = () => run(box, () => N().setGlobal(false), "⛔ Notifikace jsou vypnuté pro celý tým");
  if (q("#cngo")) q("#cngo").onclick = () => {
    const b = q("#cngo");
    confirm2("notif:go", () => run(box, () => N().setGlobal(true), "🟢 Notifikace týmu zapnuty"), () => { b.textContent = armed("notif:go") ? "Opravdu zapnout? Klepni znovu" : "▶️ Zapnout notifikace týmu"; });
  };
  if (q("#cnv")) q("#cnv").oninput = () => { vdraft = q("#cnv").value; };
  if (q("#cnvs")) q("#cnvs").onclick = () => run(box, async () => {
    const ok = await N().setVapid(vdraft == null ? "" : vdraft);
    if (ok === false) { toast("Klíč VAPID nemá správný tvar (60–140 znaků A–Z, a–z, 0–9, - a _)"); return false; }
    vdraft = null;
    return true;
  }, "Klíč VAPID uložen");
}
// Vykreslení do připravené schránky (volá settings-view po otevření ⚙️)
export function bindNotif(el) {
  const box = el.querySelector("#cnt");
  if (box) { vdraft = null; draw(box); }
}
