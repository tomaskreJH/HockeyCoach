// 🧪 Beta kanál v rozhraní: pruh v horní liště (v betě štítek β a cesta zpět na stabilní, ve stabilní nabídka novější bety testerovi),
// zámek bety pro účty, které nejsou testeři, řádek v ⚙️ → 👤 Účet a sekce ⚙️ → 🧪 Beta testování (výběr testerů – manager nebo vývojář).
// Číslo bety zjistí stabilní verze načtením beta/src/core/app-version.js (běžný soubor z webu, žádné čtení databáze) – jen u testera, jednou za spuštění.

// ===== Importy =====
import {APP_VERSION} from "../core/app-version.js";
import {BETA_URL, CHANNEL, IS_BETA, STABLE_URL} from "../core/channel.js";
import {S} from "../core/state.js";
import {LS, esc, toast} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {betaOffer, setTester} from "../domain/beta.js";

// ===== Konstanty a stav =====
const HIDE_KEY = "hk-beta-hide";     // číslo bety, jejíž nabídku si tester v tomto zařízení skryl
const BETA_COLOR = "#8e44ad";        // barva štítku bety (odlišná od pruhu náhledu a staré verze)
const BAR = "flex-basis:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 12px;color:#fff;font-size:13px;font-weight:600";
const BTN = "flex:none;padding:6px 10px;border:1px solid #fff;border-radius:8px;background:none;color:#fff;font:inherit;font-size:13px;cursor:pointer";
let betaVer = "";                    // číslo verze nasazené bety ("" = nezjištěno nebo beta není)
let asked = false;                   // dotaz na číslo bety už proběhl (jednou za spuštění)
let onChange = null;                 // překreslení po zjištění čísla bety

// ===== Pomocné funkce =====
const C = () => HK.cfg;
const go = url => { location.href = url; };
// Popis řádku člena v seznamu testerů (role a propojení jako v 👥 Tým a členové)
const memberLabel = r => { const i = C().memberInfo(r); return i.label + (i.player ? " · " + i.player : "") + (i.staff ? " · 🎓 " + i.staff : ""); };
// Beta: název okna a barva lišty prohlížeče, aby se stabilní a beta nepletly (i jako druhá ikona na ploše)
if (IS_BETA && typeof document !== "undefined") {
  document.title = "HockeyCoach β";
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute("content", BETA_COLOR);
}

// ===== Hlavní logika =====
// Zjistí číslo nasazené bety (jen ve stabilní verzi u testera, jednou za spuštění; offline nebo bez bety tiše nic)
function askBetaVer() {
  if (asked || IS_BETA || !HK.tester || !HK.tester()) return;
  asked = true;
  import(BETA_URL + "src/core/app-version.js?t=" + Date.now())
    .then(m => { betaVer = String((m && m.APP_VERSION) || ""); if (betaVer && onChange) onChange(); })
    .catch(() => { betaVer = ""; });
}
// Je beta pro tento účet zamčená? (beta, načtená data, přihlášený účet, který není tester ani manager)
export const betaLocked = () => IS_BETA && !!S.ready && !!HK.user && !!HK.user() && !HK.betaOk();

// Pruh v horní liště: v betě štítek a Stabilní verze, ve stabilní nabídka novější bety (Vyzkoušet / ✕); jinak prázdný
export function betaBar(render) {
  onChange = render;
  if (IS_BETA) return `<div style="${BAR};background:${BETA_COLOR}"><span>🧪 Beta v${esc(APP_VERSION)} – testovací verze</span><button id="btst" style="${BTN}">Stabilní verze</button></div>`;
  askBetaVer();
  const show = S.ready && betaOffer({channel: CHANNEL, tester: HK.tester && HK.tester(), cur: APP_VERSION, beta: betaVer, hidden: LS.get(HIDE_KEY)});
  return show ? `<div style="${BAR};background:${BETA_COLOR}"><span>🧪 Nová beta v${esc(betaVer)} k vyzkoušení</span><span style="display:flex;gap:6px"><button id="btgo" style="${BTN}">Vyzkoušet</button><button id="bthd" style="${BTN}" title="Skrýt nabídku této bety" aria-label="Skrýt nabídku">✕</button></span></div>` : "";
}
// Obsluha tlačítek pruhu (volá shell po vykreslení lišty)
export function bindBetaBar(nav, render) {
  const st = nav.querySelector("#btst"), gb = nav.querySelector("#btgo"), hd = nav.querySelector("#bthd");
  if (st) st.onclick = () => go(STABLE_URL);
  if (gb) gb.onclick = () => go(BETA_URL);
  if (hd) hd.onclick = () => { LS.set(HIDE_KEY, betaVer); toast("Nabídka bety skryta – betu otevřeš v ⚙️ → 👤 Účet"); render(); };
}
// Obrazovka zamčené bety (účet není tester)
export function betaLockView(a) {
  a.innerHTML = `<div class="cd" style="margin-top:16px"><h2>🧪 Beta je jen pro testery</h2><div class="mu" style="margin-bottom:12px">Účet <b>${esc(HK.user().email)}</b> není mezi testery. Testery vybírá manager týmu (⚙️ → 🧪 Beta testování). Data jsou ve stabilní verzi stejná.</div><button class="p w" id="btlk">Přejít na stabilní verzi</button></div>`;
  a.querySelector("#btlk").onclick = () => go(STABLE_URL);
}

// ===== ⚙️ 👤 Účet a 🧪 Beta testování =====
// Řádek v 👤 Účet: kanál a přepnutí (tester ve stabilní: Otevřít betu, v betě: Stabilní verze)
export function betaAcctHtml() {
  if (IS_BETA) return `<div class="mu" style="margin-top:8px">Kanál: <b>🧪 Beta</b> – testovací verze se stejnými daty jako stabilní.</div><button class="s w" id="cbst" style="margin-top:6px">← Stabilní verze</button>`;
  if (!HK.tester || !HK.tester()) return "";
  return `<div class="mu" style="margin-top:8px">Kanál: <b>Stabilní</b>${betaVer ? " · beta v" + esc(betaVer) : ""}. Jsi beta tester.</div><button class="s w" id="cbgo" style="margin-top:6px">🧪 Otevřít betu</button>`;
}
// Sekce 🧪 Beta testování (manager nebo vývojář): popis, seznam členů se zaškrtnutím, kdo naposledy měnil
export function betaSecHtml(sec) {
  const b = C().betaInfo(), n = b.testers.length;
  const body = `<div class="mu" style="margin-bottom:8px">Testeři vidí nabídku nové bety a smí v ní pracovat (data jsou stejná jako ve stabilní verzi). Ostatní betu neuvidí. Vývojář je tester vždy.${b.at ? " Naposledy změněno " + esc(b.at) + (b.by ? " (" + esc(b.by) + ")" : "") + "." : ""}</div><div id="cbtl">Načítám…</div>`;
  return sec("beta", "🧪 Beta testování", body, n ? n + " " + (n === 1 ? "tester" : n < 5 ? "testeři" : "testerů") : "");
}
// Seznam členů se zaškrtnutím testera (hostující nemůže být tester – nečte nastavení týmu); změna se hned uloží
export async function renderBetaTesters(el) {
  const box = el.querySelector("#cbtl");
  if (!box) return;
  try {
    const rows = (await C().memberRows()).filter(r => r.role !== "host");
    const on = new Set(C().betaInfo().testers);
    box.innerHTML = rows.map(r => `<label class="it" style="cursor:pointer;gap:10px"><input type="checkbox" data-bt="${esc(r.email)}" style="width:auto;margin:0"${on.has(r.email.toLowerCase()) ? " checked" : ""}><div style="flex:1"><b>${esc(r.email)}</b><div class="mu">${esc(memberLabel(r))}</div></div></label>`).join("") || "–";
    box.querySelectorAll("[data-bt]").forEach(c => { c.onchange = async () => {
      const list = setTester(C().betaInfo().testers, c.dataset.bt, c.checked);
      if (await C().saveTesters(list)) toast(c.checked ? "🧪 " + c.dataset.bt + " je beta tester" : c.dataset.bt + " už není beta tester");
      else c.checked = !c.checked;
    }; });
  } catch (e) { box.textContent = "Nelze načíst členy: " + ((e && (e.code || e.message)) || e); }
}
// Obsluha tlačítek přepnutí kanálu v 👤 Účet
export function bindBetaAcct(q) {
  if (q("#cbst")) q("#cbst").onclick = () => go(STABLE_URL);
  if (q("#cbgo")) q("#cbgo").onclick = () => { LS.set(HIDE_KEY, ""); go(BETA_URL); };
}
