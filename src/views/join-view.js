// ✋ Žádost o přijetí do týmu: 1) obrazovka pro přihlášený účet Google bez členství (formulář, stav ⏳, zrušení, zamítnutí s důvodem),
// 2) okno vyřízení pro managera (přijmout = založit / přiřadit hráčku nebo člena realizačního týmu + účet members, zamítnout s důvodem).
// Zápisy uchazeče předává datová vrstva (storage.js → api), vyřízení jde jednou dávkou přes S.db.batch(). Výpočty: domain/join-requests.js.
// Struktura: Importy -> Konstanty a stav -> Pomocné funkce -> Obrazovka uchazeče -> Okno trenéra -> Exporty.

// ===== Importy =====
import {armed, confirm2} from "../core/actions.js";
import {kindOf} from "../core/selectors.js";
import {S} from "../core/state.js";
import {esc, reqWord, toast, uid} from "../core/utils.js";
import {HK} from "../data/storage.js";
import {JOIN_KINDS, JOIN_ROLES, NICK_MAX, NOTE_MAX, approvePlan, canResend, defaultRole, freePlayers, freeStaff, joinCheck, joinDoc, numTaken, openJoins, rejectPlan} from "../domain/join-requests.js";

// ===== Konstanty a stav =====
const WIN_ID = "jrw";                       // kontejner okna trenéra (vkládá se do body)
// Okno trenéra: vybraná žádost (e-mail), volba role a cíle, rozepsaný důvod zamítnutí, seznam účtů members (načte se při otevření)
let sel = null, choice = {role: "", target: ""}, reason = "", members = null, busy = false;

// ===== Pomocné funkce =====
const me = () => { const u = HK.user(); return ((u && u.email) || "").toLowerCase(); };
const fTime = ms => new Date(ms).toLocaleString("cs-CZ", {day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit"});
const fIso = iso => { const d = new Date(iso); return isNaN(d) ? "" : d.toLocaleString("cs-CZ", {day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"}); };
const errTxt = e => (e && (e.code || e.message)) || String(e);
// Počet otevřených žádostí o přijetí (pruh v 🏠 Domů a v ⚙️; data čte jen trenér)
export const joinOpenCount = () => openJoins(S.jr).length;
// Shrnutí žádosti (uchazeč i trenér)
const reqInfo = r => `<div class="mu" style="text-align:left;line-height:1.6">E-mail: <b>${esc(r.email)}</b><br>Přezdívka: <b>${esc(r.nick)}</b>${r.num ? " · #" + esc(r.num) : ""}<br>Druh: ${esc(JOIN_KINDS[r.kind] || r.kind)}${r.note ? "<br>Poznámka: " + esc(r.note) : ""}${r.at ? "<br>Odesláno: " + esc(fIso(r.at)) : ""}</div>`;

// ===== Obrazovka uchazeče =====
// app = kontejner, api = {email, watch(cb, er) → odhlášení poslechu, send(doc) → Promise, cancel() → Promise}.
// Vrací Promise: "ok" (trenér právě schválil – aplikace znovu ověří roli) nebo "out" (odhlásit).
export function joinScreen(app, api) {
  return new Promise(res => {
    let req, err = null, first = true, draft = {nick: "", num: "", kind: "hracka", note: ""}, un = () => {}, sending = false;
    const key = "join:cancel:" + api.email, finish = g => { try { un(); } catch (e) {} res(g); };
    // Rozepsaný formulář se při překreslení (změna žádosti v databázi) neztratí
    const keep = () => { const v = id => { const e = app.querySelector("#" + id); return e ? e.value : null; }; ["nick", "num", "kind", "note"].forEach(k => { const x = v("jf" + k); if (x != null) draft[k] = x; }); };
    function draw() {
      keep();
      const out = `<button class="s w" data-jg="out" style="margin-top:8px;min-height:52px">Odhlásit jiným účtem</button>`;
      let body;
      if (err) body = `<div class="mu">Žádost se nepodařilo načíst (${esc(err)}). Zkontroluj připojení, případně požádej trenéra přímo.</div><button class="p w" data-jg="retry" style="margin-top:8px;min-height:52px">Zkusit znovu</button>`;
      else if (req === undefined) body = `<div class="mu">Načítám…</div>`;
      else if (req && req.st === "open") body = `<div style="font-size:18px;margin-bottom:8px">⏳ <b>Čeká na schválení trenérem</b></div>${reqInfo(req)}<div class="mu" style="margin-top:8px">Po schválení se aplikace sama načte. Můžeš ji zavřít a otevřít později.</div><button class="d w" data-jg="cancel" style="margin-top:12px;min-height:52px">${armed(key) ? "Opravdu zrušit? Klepni znovu" : "Zrušit žádost"}</button>`;
      else {
        const rs = canResend(req, Date.now());
        const prev = req && req.st === "no" ? `<div class="cd" style="border-color:var(--no);text-align:left"><b style="color:var(--no)">❌ Žádost byla zamítnuta</b>${req.reply ? `<div class="mu">Důvod: ${esc(req.reply)}</div>` : ""}</div>`
          : req && req.st === "ok" ? `<div class="cd" style="text-align:left"><b>Přístup do týmu byl tomuto účtu odebrán.</b></div>` : "";
        body = prev + (rs.ok ? `<div class="mu" style="margin-bottom:10px">Účet <b>${esc(api.email)}</b> zatím není členem týmu. Pošli trenérovi žádost o přijetí – po schválení se aplikace načte.</div>
<div style="text-align:left"><label class="mu">E-mail (účet, kterým jsi přihlášen/a)</label><input id="jfmail" value="${esc(api.email)}" disabled>
<label class="mu">Přezdívka *</label><input id="jfnick" maxlength="${NICK_MAX}" value="${esc(draft.nick)}" placeholder="např. Kačka">
<label class="mu">Číslo dresu (1–99, nepovinné)</label><input id="jfnum" inputmode="numeric" maxlength="2" value="${esc(draft.num)}">
<label class="mu">Jsem</label><select id="jfkind">${Object.entries(JOIN_KINDS).map(([k, t]) => `<option value="${k}"${draft.kind === k ? " selected" : ""}>${t}</option>`).join("")}</select>
<label class="mu">Poznámka pro trenéra (nepovinné)</label><textarea id="jfnote" maxlength="${NOTE_MAX}" rows="2">${esc(draft.note)}</textarea></div>
<button class="p w" data-jg="send" style="margin-top:8px;min-height:52px"${sending ? " disabled" : ""}>✋ Požádat o přijetí do týmu</button>`
          : `<div class="mu">Novou žádost můžeš poslat od <b>${esc(fTime(rs.from))}</b>.</div>`);
      }
      app.innerHTML = `<div class="cd" style="max-width:420px;margin:40px auto;text-align:center"><h2>✋ Přijetí do týmu</h2>${body}${out}</div>`;
      app.querySelectorAll("[data-jg]").forEach(b => { b.onclick = () => act(b.dataset.jg); });
    }
    async function act(g) {
      if (g === "out") return finish("out");
      if (g === "retry") { err = null; req = undefined; first = true; start(); return; }
      if (g === "cancel") return confirm2(key, () => api.cancel().catch(e => toast("Zrušení se nepovedlo: " + errTxt(e))), draw);
      if (g === "send") {
        keep();
        const c = joinCheck(draft);
        if (!c.ok) return toast(c.err);
        sending = true; draw();
        try { await api.send(joinDoc(api.email, c.d, new Date().toISOString())); toast("Žádost odeslána trenérovi"); }
        catch (e) { toast("Odeslání se nepovedlo: " + errTxt(e)); }
        sending = false; draw();
      }
    }
    // Poslech vlastní žádosti: schválení (open → ok) znovu ověří roli; žádost „ok“ už při otevření = přístup byl odebrán
    function start() {
      draw();
      un = api.watch(d => {
        const was = req;
        req = d; err = null;
        if (!first && was && was.st === "open" && d && d.st === "ok") return finish("ok");
        first = false; draw();
      }, e => { err = errTxt(e); draw(); }) || (() => {});
    }
    start();
  });
}

// ===== Okno trenéra =====
// Volby cíle podle role: hráčka = nová / volná hráčka (shoda čísla první); manager / trenér / asistent = bez propojení, nový nebo volný člen týmu
function targetOpts(r, role) {
  if (role === "hracka") {
    const ps = freePlayers(S.pl, members, r.num);
    return `<option value="new">➕ Založit novou hráčku „${esc(r.nick)}“${r.num ? " #" + esc(r.num) : ""}</option>` + ps.map(p => `<option value="${esc(p.id)}">${esc((p.num ? "#" + p.num + " " : "") + p.name)}${r.num && String(p.num) === String(r.num) ? " · shoda čísla" : ""}</option>`).join("");
  }
  return `<option value="none">— bez propojení s realizačním týmem —</option><option value="new">➕ Založit člena realizačního týmu „${esc(r.nick)}“</option>` + freeStaff(S.tr, members).map(t => `<option value="${esc(t.id)}">🎓 ${esc(t.name || "?")}${kindOf(t) ? " (" + esc(kindOf(t)) + ")" : ""}</option>`).join("");
}
// Výchozí volba pro žádost: role podle druhu; hráčka se shodou čísla se nabídne rovnou, jinak nová hráčka / bez propojení
function resetChoice(r) {
  const role = defaultRole(r.kind), ps = role === "hracka" ? freePlayers(S.pl, members, r.num) : [];
  const hit = r.num && ps.find(p => String(p.num) === String(r.num));
  choice = {role, target: role === "hracka" ? (hit ? hit.id : "new") : "none"};
  reason = "";
}
function drawWin() {
  const el = document.getElementById(WIN_ID);
  if (!el) return;
  const list = openJoins(S.jr);
  if (!list.find(r => r.email === sel)) { sel = list.length ? list[0].email : null; if (sel) resetChoice(list[0]); }
  const r = list.find(x => x.email === sel);
  let body;
  if (!HK.can("admin")) body = `<div class="mu">Žádosti o přijetí vyřizuje jen manager týmu.</div>`;
  else if (members === null) body = `<div class="mu">Načítám členy týmu…</div>`;
  else if (!r) body = `<div class="mu">Žádné otevřené žádosti o přijetí.</div>`;
  else {
    const taken = choice.role === "hracka" && choice.target === "new" ? numTaken(S.pl, r.num) : [];
    const tabs = list.length > 1 ? `<div class="row" style="flex-wrap:wrap;margin-bottom:8px">${list.map(x => `<button class="${x.email === sel ? "p" : "s"}" data-jsel="${esc(x.email)}" style="padding:8px 10px">${esc(x.nick)}</button>`).join("")}</div>` : "";
    const ka = "jr:ok:" + r.email, kn = "jr:no:" + r.email;
    body = `${tabs}<div class="cd">${reqInfo(r)}</div>
<h3>✅ Přijmout</h3><label class="mu">Role</label><select id="jrr">${Object.entries(JOIN_ROLES).map(([k, t]) => `<option value="${k}"${choice.role === k ? " selected" : ""}>${t}</option>`).join("")}</select>
<label class="mu">${choice.role === "hracka" ? "Hráčka v soupisce" : "Člen realizačního týmu"}</label><select id="jrt">${targetOpts(r, choice.role)}</select>
${taken.length ? `<div class="mu" style="color:var(--wa);margin-bottom:6px">⚠️ Číslo #${esc(r.num)} už má: ${taken.map(p => esc(p.name)).join(", ")} – zkontroluj, zda nejde o stejnou hráčku.</div>` : ""}
<div class="mu" style="margin-bottom:8px">Vznikne účet (⚙️ → Členové týmu) a ${choice.role === "hracka" ? "propojení s hráčkou" : "role"}; ${choice.target === "new" ? "nový záznam doplníš v Team (pozice, platby)" : "příznak Pokladník případně nastav v ⚙️"}.</div>
<button class="p w" id="jra"${busy ? " disabled" : ""}${armed(ka) ? ' style="background:var(--ok);color:#fff"' : ""}>${armed(ka) ? "Opravdu přijmout? Klepni znovu" : "✅ Přijmout do týmu"}</button>
<h3>❌ Zamítnout</h3><textarea id="jrn" rows="2" maxlength="${NOTE_MAX}" placeholder="Důvod (uchazeč ho uvidí)">${esc(reason)}</textarea>
<button class="d w" id="jrx"${busy ? " disabled" : ""}${armed(kn) ? ' style="background:var(--no);color:#fff"' : ""}>${armed(kn) ? "Opravdu zamítnout? Klepni znovu" : "❌ Zamítnout žádost"}</button>`;
  }
  el.innerHTML = `<div class="md" id="jrbg"><div class="mb"><h2>✋ Žádosti o přijetí${list.length ? " (" + list.length + ")" : ""}</h2>${body}<button class="s w" id="jrz" style="margin-top:14px">Zavřít</button></div></div>`;
  bindWin(el, r);
}
// Zápis plánu jednou dávkou (set / merge). Nečeká na server (offline se odešle po připojení): vyřízená žádost z okna zmizí
// hned (poslech joinreq), chybu (např. nepublikovaná pravidla) ohlásí datová vrstva a žádost se vrátí. Účty members se pak načtou znovu.
function commit(plan, ok) {
  if (!plan.ok) return toast(plan.err);
  const b = S.db.batch();
  plan.ops.forEach(([k, p, d]) => (k === "merge" ? b.merge(p, d) : b.set(p, d)));
  busy = true; drawWin();
  b.commit().then(() => { busy = false; members = null; loadMembers(); });
  toast(ok);
}
const ctxOf = () => ({by: me(), at: new Date().toISOString(), ms: Date.now(), auditId: uid(), newId: ""});
function bindWin(el, r) {
  const q = s => el.querySelector(s), close = () => { el.remove(); };
  q("#jrz").onclick = close;
  q("#jrbg").onclick = e => { if (e.target.id === "jrbg") close(); };
  el.querySelectorAll("[data-jsel]").forEach(b => { b.onclick = () => { sel = b.dataset.jsel; const x = openJoins(S.jr).find(y => y.email === sel); if (x) resetChoice(x); drawWin(); }; });
  if (!r || !q("#jrr")) return;
  q("#jrr").onchange = () => { choice.role = q("#jrr").value; choice.target = choice.role === "hracka" ? "new" : "none"; drawWin(); };
  q("#jrt").value = choice.target;
  q("#jrt").onchange = () => { choice.target = q("#jrt").value; drawWin(); };
  q("#jrn").oninput = () => { reason = q("#jrn").value; };
  q("#jra").onclick = () => confirm2("jr:ok:" + r.email, () => {
    if (HK.blocked()) return;
    const c = ctxOf();
    if (choice.target === "new") c.newId = S.db.collection(choice.role === "hracka" ? "players" : "staff").newId();
    else { const x = (choice.role === "hracka" ? S.pl : S.tr).find(y => y.id === choice.target); c.label = x ? x.name : ""; }
    commit(approvePlan(r, choice, c), "Přijato: " + r.nick);
  }, drawWin);
  q("#jrx").onclick = () => {
    reason = q("#jrn").value;
    const p = rejectPlan(r, reason, ctxOf());
    if (!p.ok) return toast(p.err);
    confirm2("jr:no:" + r.email, () => { if (!HK.blocked()) commit(p, "Žádost zamítnuta"); }, drawWin);
  };
}
// Seznam účtů members (kvůli hráčkám a členům týmu, kteří už účet mají)
async function loadMembers() {
  try { members = await HK.listMembers(); } catch (e) { members = []; toast("Členy týmu se nepodařilo načíst: " + errTxt(e)); }
  drawWin();
}

// ===== Exporty =====
// Otevře okno vyřízení žádostí o přijetí (trenér): z 🏠 Domů a z ⚙️ → Členové týmu
export function openJoinWindow() {
  let el = document.getElementById(WIN_ID);
  if (!el) { el = document.createElement("div"); el.id = WIN_ID; document.body.appendChild(el); }
  sel = null; members = null; busy = false;
  drawWin();
  loadMembers();
}
// Překreslení otevřeného okna po změně žádostí nebo soupisky (volá main.js)
export function refreshJoin() { if (document.getElementById(WIN_ID)) drawWin(); }
// Pruh pro trenéra (🏠 Domů): „✋ N žádostí o přijetí“, prázdný bez žádostí
export function joinBanner() {
  const n = HK.can("admin") ? joinOpenCount() : 0;
  return n ? `<button class="s hmb" data-hjr style="border-color:var(--wa);margin:0 0 10px">✋ ${n} ${reqWord(n)} o přijetí do týmu – vyřídit →</button>` : "";
}
