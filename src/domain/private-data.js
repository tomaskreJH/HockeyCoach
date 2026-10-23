// Soukromí v databázi – čisté funkce bez DOM a bez databáze (připojení citlivých dat k záznamům v paměti a plán převodu).
// Citlivá data jsou v samostatných kolekcích, které čte jen vlastník a správci (firestore.rules):
//  - attnote/{eid}_{mid} = {eid, mid, reason}  důvod omluvy (čte vlastník a trenér / kustod),
//  - staffpay/{tid}      = {m, amt}            plat člena realizačního týmu (čte správce pokladny a člen sám),
//  - plpay/{pid}         = {grp, fx, ex, note} platební pole hráčky (čte správce pokladny a hráčka sama).
// Aplikace čte nové místo, s náhradou ze starého pole (attendance.reason, staff.pay, players.grp/fx/ex/note), dokud převod neproběhne.
// Struktura: Konstanty -> Pomocné funkce -> Připojení k záznamům -> Zápis (dokumenty nových kolekcí) -> Plán převodu -> Export.

// ===== Konstanty =====
export const NOTE_COLL = "attnote";                       // důvody omluv
export const SPAY_COLL = "staffpay";                      // platy realizačního týmu
export const PPAY_COLL = "plpay";                         // platební pole hráček
export const PPAY_KEYS = ["grp", "fx", "ex", "note"];     // pole, která patří do plpay (a dřív byla v players)

// ===== Pomocné funkce =====
const has = (o, k) => !!o && o[k] !== undefined && o[k] !== null;
// Id dokumentu docházky a důvodu: {eid}_{mid}
export const noteId = (eid, mid) => eid + "_" + mid;

// ===== Připojení k záznamům v paměti =====
// Hráčka s platebními poli: pole z plpay (pokud je vyplněné) má přednost, jinak zůstane hodnota ze starého místa v players.
// Výsledek má stejný tvar jako dřív, takže výpočty pokladny (domain/cash.js) se nemění.
export function withPlPay(p, pp) {
  if (!pp) return p;
  const o = {...p};
  PPAY_KEYS.forEach(k => { if (has(pp, k)) o[k] = pp[k]; });
  return o;
}
// Seznam hráček (S.pl) s připojenými poli z plpay (mapa id → dokument)
export const joinPlPay = (players, ppMap) => (players || []).map(p => withPlPay(p, (ppMap || {})[p.id]));
// Člen realizačního týmu s platem ze staffpay (dokument {m, amt}); bez dokumentu zůstane starý staff.pay
export function withStaffPay(t, sp) {
  if (!sp) return t;
  return {...t, pay: {m: sp.m || "none", amt: +sp.amt || 0}};
}
export const joinStaffPay = (staff, spMap) => (staff || []).map(t => withStaffPay(t, (spMap || {})[t.id]));
// Odpověď docházky s důvodem z attnote (dokument existuje = platí jeho důvod, i prázdný); jinak starý attendance.reason
export function withNote(a, n) {
  if (!n) return a;
  return {...a, reason: n.reason || ""};
}
export const joinAttNotes = (att, noteMap) => (att || []).map(a => withNote(a, (noteMap || {})[a.id]));

// ===== Zápis: dokumenty nových kolekcí =====
// Dokument docházky bez důvodu (důvod jde do attnote; set celého dokumentu tak smaže i starý attendance.reason)
export const attDoc = (eid, pid, st, at, by) => ({eid, pid, st, at, by});
// Dokument důvodu, nebo null (prázdný důvod = dokument se nezakládá, existující se smaže)
export const noteDoc = (eid, mid, reason) => { const r = String(reason || "").trim(); return r ? {eid, mid, reason: r} : null; };
// Platební pole hráčky z formuláře (jen povolená pole plpay)
export const plPayDoc = d => { const o = {}; PPAY_KEYS.forEach(k => { if (d && d[k] !== undefined) o[k] = d[k]; }); return o; };
// Plat člena týmu: {m, amt}
export const staffPayDoc = pay => ({m: (pay && pay.m) || "none", amt: +(pay && pay.amt) || 0});

// ===== Plán převodu (⚙️ → Kontrola dat) =====
// Vstup: mapy dokumentů {players, plpay, staff, staffpay, attendance, attnote}. Kopíruje jen to, co v novém místě chybí
// (už převedené nebo nově zapsané hodnoty nepřepíše) → lze spustit znovu, druhé spuštění nic nenajde.
// Výstup: {pp: [{id, d}], sp: [{id, d}], an: [{id, d}], skip: [id docházky s jiným tvarem id], ops: [["merge" | "set", kolekce, id, data]]}
export function privacyPlan(src) {
  const s = src || {}, pp = [], sp = [], an = [], skip = [];
  // Platební pole hráček: jen pole, která v plpay chybí
  Object.entries(s.players || {}).forEach(([id, p]) => {
    const cur = (s.plpay || {})[id] || {}, d = {};
    PPAY_KEYS.forEach(k => { if (has(p, k) && !has(cur, k)) d[k] = p[k]; });
    if (Object.keys(d).length) pp.push({id, d});
  });
  // Platy realizačního týmu: jen člen s platem a bez dokumentu staffpay
  Object.entries(s.staff || {}).forEach(([id, t]) => {
    if (t && t.pay && !(s.staffpay || {})[id]) sp.push({id, d: staffPayDoc(t.pay)});
  });
  // Důvody omluv: neprázdný důvod bez dokumentu attnote; id musí odpovídat {eid}_{pid} (vynucují pravidla databáze)
  Object.entries(s.attendance || {}).forEach(([id, a]) => {
    const d = a && noteDoc(a.eid, a.pid, a.reason);
    if (!d || (s.attnote || {})[id]) return;
    if (id !== noteId(a.eid, a.pid)) { skip.push(id); return; }
    an.push({id, d});
  });
  const ops = [...pp.map(x => ["merge", PPAY_COLL, x.id, x.d]), ...sp.map(x => ["set", SPAY_COLL, x.id, x.d]), ...an.map(x => ["set", NOTE_COLL, x.id, x.d])];
  return {pp, sp, an, skip, ops};
}
// Co zůstává ve starých polích (pro náhled a pro pozdější úklid starých polí): počty dokumentů se starým polem
export function legacyLeft(src) {
  const s = src || {};
  return {
    pp: Object.values(s.players || {}).filter(p => PPAY_KEYS.some(k => has(p, k))).length,
    sp: Object.values(s.staff || {}).filter(t => t && t.pay).length,
    an: Object.values(s.attendance || {}).filter(a => a && String(a.reason || "").trim()).length
  };
}
