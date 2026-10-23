// Soukromí v databázi – čisté funkce bez DOM a bez databáze (připojení citlivých dat k záznamům v paměti a plán převodu).
// Citlivá data jsou v samostatných kolekcích, které čte jen vlastník a správci (firestore.rules):
//  - attnote/{eid}_{mid} = {eid, mid, reason}  důvod omluvy (čte vlastník a trenér / kustod),
//  - staffpay/{tid}      = {m, amt}            plat člena realizačního týmu (čte správce pokladny a člen sám),
//  - plpay/{pid}         = {grp, fx, ex, note, grpH} platební pole hráčky (čte správce pokladny a hráčka sama; grpH = historie způsobu placení).
// Aplikace čte nové místo, s náhradou ze starého pole (attendance.reason, staff.pay, players.grp/fx/ex/note) – po úklidu starých polí
// už jen pro data, která by se do databáze dostala jinou cestou; obnova staré zálohy pole rozdělí předem (splitLegacy).
// Úklid: po převodu a 🔒 Vyžadovat verzi se stará pole smažou (cleanPlan) a pravidla databáze je už nepovolí zapsat.
// Struktura: Konstanty -> Pomocné funkce -> Připojení k záznamům -> Zápis (dokumenty nových kolekcí) -> Plán převodu
// -> Úklid starých polí -> Obnova staré zálohy -> Export.

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
// Co zůstává ve starých polích (pro náhled a pro úklid starých polí): počty dokumentů se starým polem
export function legacyLeft(src) {
  const s = src || {};
  return {
    pp: Object.values(s.players || {}).filter(p => PPAY_KEYS.some(k => has(p, k))).length,
    sp: Object.values(s.staff || {}).filter(t => t && t.pay).length,
    an: Object.values(s.attendance || {}).filter(a => a && String(a.reason || "").trim()).length
  };
}

// ===== Úklid starých polí (⚙️ → Kontrola dat, po převodu) =====
// Smaže stará pole jen tam, kde se nic neztratí: hodnota je už v novém místě, nebo je prázdná.
// Pole bez protějšku v novém místě zůstane a započítá se do keep (nejdřív je potřeba převod, nebo jde o jiný tvar id docházky).
// Výstup: {pp, sp, an} = počty dokumentů k úklidu, keep = {pp, sp, an} počty polí, která zůstanou,
// ops = [["merge", kolekce, id, {pole: "__del"}]] – "__del" smaže pole (commitOps / dávka merge v data/storage.js).
const blank = v => v === undefined || v === null || (typeof v === "string" && !v.trim());
export function cleanPlan(src) {
  const s = src || {}, ops = [], keep = {pp: 0, sp: 0, an: 0};
  const out = {pp: 0, sp: 0, an: 0};
  // Platební pole hráček: smazat pole, které je v plpay, nebo je prázdné
  Object.entries(s.players || {}).forEach(([id, p]) => {
    const cur = (s.plpay || {})[id] || {}, d = {};
    PPAY_KEYS.forEach(k => {
      if (!p || !(k in p)) return;
      if (has(cur, k) || blank(p[k])) d[k] = "__del"; else keep.pp++;
    });
    if (Object.keys(d).length) { ops.push(["merge", "players", id, d]); out.pp++; }
  });
  // Plat realizačního týmu: smazat, když existuje staffpay, nebo je plat prázdný
  Object.entries(s.staff || {}).forEach(([id, t]) => {
    if (!t || !("pay" in t)) return;
    if ((s.staffpay || {})[id] || !t.pay) { ops.push(["merge", "staff", id, {pay: "__del"}]); out.sp++; } else keep.sp++;
  });
  // Důvod omluvy: smazat, když existuje attnote se stejným id, nebo je důvod prázdný
  Object.entries(s.attendance || {}).forEach(([id, a]) => {
    if (!a || !("reason" in a)) return;
    if ((s.attnote || {})[id] || blank(a.reason)) { ops.push(["merge", "attendance", id, {reason: "__del"}]); out.an++; } else keep.an++;
  });
  return {...out, keep, ops};
}

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
