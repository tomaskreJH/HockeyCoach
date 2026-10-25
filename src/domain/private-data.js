// Soukromí v databázi – čisté funkce bez DOM a bez databáze (připojení citlivých dat k záznamům v paměti a plán převodu).
// Citlivá data jsou v samostatných kolekcích, které čte jen vlastník a správci (firestore.rules):
//  - attnote/{eid}_{mid} = {eid, mid, reason}  důvod omluvy (čte vlastník a manager, trenér, asistent),
//  - staffpay/{tid}      = {m, amt}            plat člena realizačního týmu (čte správce pokladny a člen sám),
//  - plpay/{pid}         = {grp, fx, ex, note, grpH} platební pole hráčky (čte správce pokladny a hráčka sama; grpH = historie způsobu placení).
// Aplikace čte nové místo, s náhradou ze starého pole (attendance.reason, staff.pay, players.grp/fx/ex/note) – stará pole jsou
// z databáze smazaná a pravidla je nepovolí zapsat; obnova staré zálohy je rozdělí předem (splitLegacy).
// Struktura: Konstanty -> Pomocné funkce -> Připojení k záznamům -> Zápis (dokumenty nových kolekcí) -> Obnova staré zálohy.

// ===== Konstanty =====
export const NOTE_COLL = "attnote";                       // důvody omluv
export const SPAY_COLL = "staffpay";                      // platy realizačního týmu
export const PPAY_COLL = "plpay";                         // platební pole hráček
export const PPAY_KEYS = ["grp", "fx", "ex", "note"];     // pole, která patří do plpay (a dřív byla v players)
export const PPAY_HIST = "grpH";                          // historie způsobu placení [{ym, grp}] – jen v plpay (nikdy v players)

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
  if (Array.isArray(pp[PPAY_HIST])) o[PPAY_HIST] = pp[PPAY_HIST];
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

// ===== Obnova staré zálohy =====
// Záloha z doby před převodem má citlivá data ve starých polích. Před obnovou se rozdělí: soupiska, tým a docházka bez nich,
// hodnoty do plpay / staffpay / attnote. Hodnota, kterou má záloha už v novém místě, má přednost (je novější).
// Nová kolekce se do zálohy přidá jen tehdy, když ji záloha měla, nebo když z ní vznikl aspoň jeden dokument
// („Nahradit vším“ maže jen kolekce, které záloha obsahuje). Důvod u docházky s jiným tvarem id než {eid}_{pid} se nepřevede (dropped).
// Vstup se nemění; výstup: {data, moved: {pp, sp, an}, dropped}.
export function splitLegacy(src) {
  const d = {...(src || {})}, moved = {pp: 0, sp: 0, an: 0};
  let dropped = 0;
  if (d.players) {
    const pl = {}, pp = {...(d.plpay || {})};
    Object.entries(d.players).forEach(([id, p]) => {
      const o = {...p}, x = {};
      PPAY_KEYS.forEach(k => { if (k in o) { if (has(o, k)) x[k] = o[k]; delete o[k]; } });
      pl[id] = o;
      if (Object.keys(x).length) { pp[id] = {...x, ...(pp[id] || {})}; moved.pp++; }
    });
    d.players = pl;
    if (d.plpay || moved.pp) d.plpay = pp;
  }
  if (d.staff) {
    const tr = {}, sp = {...(d.staffpay || {})};
    Object.entries(d.staff).forEach(([id, t]) => {
      const o = {...t};
      if ("pay" in o) { if (o.pay && !sp[id]) { sp[id] = staffPayDoc(o.pay); moved.sp++; } delete o.pay; }
      tr[id] = o;
    });
    d.staff = tr;
    if (d.staffpay || moved.sp) d.staffpay = sp;
  }
  if (d.attendance) {
    const at = {}, an = {...(d.attnote || {})};
    Object.entries(d.attendance).forEach(([id, a]) => {
      const o = {...a};
      if ("reason" in o) {
        const n = noteDoc(o.eid, o.pid, o.reason);
        if (n && !an[id]) { if (id === noteId(o.eid, o.pid)) { an[id] = n; moved.an++; } else dropped++; }
        delete o.reason;
      }
      at[id] = o;
    });
    d.attendance = at;
    if (d.attnote || moved.an) d.attnote = an;
  }
  return {data: d, moved, dropped};
}
