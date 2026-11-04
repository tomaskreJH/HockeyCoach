// 💬 Motta a pokřiky (v22.45): 1) řádek s náhodným mottem na kartě 🆚 Příští zápas (🏠 Domů), 2) sekce ⚙️ → 💬 Motta a pokřiky:
// vlastní motta (nejvýš 5, přidat / smazat) a pro trenéra moderace (🙈 Skrýt / 👁 Zobrazit, smazat).
// Data: kolekce mottos (domain/mottos.js), v S.mt; poslech zapíná main.js. Zápisy přímo do databáze, hlídá je firestore.rules.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Řádek na kartě -> Sekce v ⚙️ -> Exporty.

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {S} from "../core/state.js";
import {esc, failMsg, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {MOTTO_COLL, MOTTO_MAX, MOTTO_PER, mineMottos, mottoBy, mottoCheck, mottoTag, mottoDoc, pickMotto, shownMottos} from "../domain/mottos.js";

// ===== Konstanty a stav =====
let chosen = null;                        // vybrané motto (id) – drží se do zavření aplikace, aby se při překreslení neměnilo
let draft = "";                           // rozepsané motto v ⚙️

// ===== Pomocné funkce =====
const mid = () => HK.pid() || HK.tid() || "";
const me = () => { const u = HK.user(); return ((u && u.email) || "").toLowerCase(); };
const errTxt = e => (e && (e.code || e.message)) || String(e);

// ===== Řádek na kartě =====
// Motto vybrané náhodně (jednou za spuštění); zmizí-li z banky (skryto, smazáno), vybere se jiné. Prázdná banka = prázdný řetězec.
export function mottoLine() {
  const list = shownMottos(S.mt);
  let m = chosen && list.find(x => x.id === chosen);
  if (!m) { m = pickMotto(list); chosen = m ? m.id : null; }
  if (!m) return "";
  const tag = mottoTag(m, S.pl, S.tr);
  return `<div class="hmxm"><span class="hmxk">${tag ? `<b>${esc(tag)}:</b> ` : ""}${esc(m.t)}</span></div>`;
}

// ===== Sekce v ⚙️ =====
// sec = vykreslení sbalitelné sekce ze settings-view.js (id, titulek, obsah, stav)
export function mottoSecHtml(sec) {
  const own = mineMottos(S.mt, mid()).length;
  return sec("motto", "💬 Motta a pokřiky", '<div id="cmt"></div>', own ? own + " moje" : "");
}
function body() {
  const m = mid(), own = mineMottos(S.mt, m), staff = HK.can("sport");
  const add = m
    ? `<div class="mu" style="margin-bottom:6px">Tvoje motto nebo pokřik se náhodně ukazuje celému týmu na kartě Příští zápas (max ${MOTTO_PER}, každé ${MOTTO_MAX} znaků).</div>
<input id="cmti" maxlength="${MOTTO_MAX}" placeholder="např. Holky, jedeeeem!" value="${esc(draft)}"><button class="p w" id="cmta" style="margin-top:6px"${own.length >= MOTTO_PER ? " disabled" : ""}>➕ Přidat</button>`
    : `<div class="mu">Tento účet není propojený s hráčkou ani členem týmu, motto přidat nejde.</div>`;
  const mine = own.map(x => `<div class="row" style="align-items:center;margin-top:6px"><span style="flex:1">„${esc(x.t)}“${x.off ? ' <span class="tag">🙈 skryto trenérem</span>' : ""}</span><button class="d" data-cmd="${esc(x.id)}"${x.off ? " disabled" : ""}>🗑</button></div>`).join("");
  const all = staff ? `<h3 style="margin-top:14px">Moderace týmu</h3>` + ((S.mt || []).length
    ? (S.mt || []).slice().sort((a, b) => String(a.at).localeCompare(String(b.at))).map(x => `<div class="row" style="align-items:center;margin-top:6px"><span style="flex:1${x.off ? ";opacity:.55" : ""}">„${esc(x.t)}“ <span class="mu">– ${esc(mottoBy(x, S.pl, S.tr) || x.by || "")}</span></span><button class="s" data-cmh="${esc(x.id)}">${x.off ? "👁 Zobrazit" : "🙈 Skrýt"}</button><button class="d" data-cmx="${esc(x.id)}">${armed("mt:" + x.id) ? "Opravdu? Klepni znovu" : "🗑"}</button></div>`).join("")
    : '<div class="mu">Zatím žádná motta.</div>') : "";
  return add + mine + all;
}
// Vykreslení obsahu sekce a obsluha tlačítek (volá settings-view.js po otevření ⚙️; po změně dat se překreslí samo)
export function bindMotto(el) {
  const box = el.querySelector("#cmt");
  if (!box) return;
  const draw = () => {
    if (!document.body.contains(box)) return;
    box.innerHTML = body();
    const inp = box.querySelector("#cmti");
    if (inp) inp.oninput = () => { draft = inp.value; };
    const a = box.querySelector("#cmta");
    if (a) a.onclick = () => {
      if (HK.blocked()) return;
      const c = mottoCheck(draft, mineMottos(S.mt, mid()).length);
      if (!c.ok) return toast(c.err);
      draft = "";
      S.db.doc(MOTTO_COLL + "/" + uid()).set(mottoDoc(c.t, mid(), me(), new Date().toISOString())).catch(e => toast(failMsg("Uložení motta", errTxt(e))));
      toast("Motto přidáno");
    };
    // Smazání vlastního motta
    box.querySelectorAll("[data-cmd]").forEach(b => { b.onclick = () => { if (!HK.blocked()) S.db.doc(MOTTO_COLL + "/" + b.dataset.cmd).delete().catch(e => toast(failMsg("Smazání", errTxt(e)))); }; });
    // Moderace (trenér): skrýt / zobrazit a smazat druhým klepnutím
    box.querySelectorAll("[data-cmh]").forEach(b => { b.onclick = () => {
      const x = (S.mt || []).find(y => y.id === b.dataset.cmh);
      if (x && !HK.blocked()) S.db.doc(MOTTO_COLL + "/" + x.id).merge({off: !x.off}).catch(e => toast(failMsg("Úprava", errTxt(e))));
    }; });
    box.querySelectorAll("[data-cmx]").forEach(b => { b.onclick = () => confirm2("mt:" + b.dataset.cmx, () => { if (!HK.blocked()) S.db.doc(MOTTO_COLL + "/" + b.dataset.cmx).delete().catch(e => toast(failMsg("Smazání", errTxt(e)))); }, draw); });
  };
  draw();
  refresh = draw;
}
let refresh = null;
// Překreslení otevřené sekce po změně banky (volá main.js)
export function refreshMotto() { if (refresh) refresh(); }
