// Skutečné úložiště (Firestore přes Admin SDK) a odesílání (FCM) pro jádro notifikací – rozhraní popisuje hlavička core.js.
// Admin SDK obchází pravidla Firestore, proto jsou pushLog a počítadla vidět jen odtud (klient je podle firestore.rules nezapíše ani nepřečte).
// Struktura: Importy -> Pomocné funkce -> Úložiště -> Odesílání.

// ===== Importy =====
import {createHash} from "node:crypto";

// ===== Pomocné funkce =====
const LOG = "pushLog";                                              // záznamy odeslaných vln, hodinová a denní počítadla (jen funkce)
const DEAD = ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"];   // token už neplatí → zařízení se smaže
const ms = t => (t && typeof t.toMillis === "function" ? t.toMillis() : +t || 0);
const short = s => createHash("sha1").update(String(s)).digest("hex").slice(0, 16);   // id zařízení bez tečky a zavináče do klíče počítadla
const exists = e => !!e && (e.code === 6 || e.code === "already-exists" || /ALREADY_EXISTS/.test(String(e.message || "")));
const devOf = d => { const x = d.data(); return {id: d.id, tok: x.tok, email: x.email, pid: x.pid || "", tid: x.tid || "", ch: x.ch, z: x.z, u: x.u, at: ms(x.at)}; };   // zařízení z dokumentu devices

// ===== Úložiště =====
export function adminStore(db) {
  const log = db.collection(LOG);
  return {
    // Hlavní vypínač: settings/notif.on musí být výslovně true; chybějící dokument = vypnuto
    async settings() { const s = await db.doc("settings/notif").get(); return {on: s.exists && s.data().on === true}; },
    // Nový klíč se založí a vrátí true; klíč, který už existuje, vrátí false (stejná vlna se nepošle dvakrát)
    async claim(key) {
      try { await log.doc(key).create({at: Date.now()}); return true; }
      catch (e) { if (exists(e)) return false; throw e; }
    },
    async attendance(eid) { return (await db.collection("attendance").where("eid", "==", eid).get()).docs.map(d => ({pid: d.data().pid, st: d.data().st})); },
    async devices() { return (await db.collection("devices").get()).docs.map(devOf); },
    // E-maily členů s danou rolí (id dokumentu members = e-mail malými písmeny); dotaz čte jen dokumenty s těmito rolemi
    async staffEmails(roles) { return (await db.collection("members").where("role", "in", roles).get()).docs.map(d => d.id); },
    // Zařízení jen zadaných účtů (po dávkách, Firestore dovolí v „in“ nejvýš 30 hodnot); stará zařízení ostatních se nečtou
    async devicesOf(emails) {
      const out = [];
      for (let i = 0; i < emails.length; i += 30) out.push(...(await db.collection("devices").where("email", "in", emails.slice(i, i + 30)).get()).docs.map(devOf));
      return out;
    },
    // Jméno hráčky nebo člena týmu podle id (mid žádosti); neexistuje-li, prázdný řetězec
    async memberName(mid) {
      const [p, t] = await db.getAll(db.collection("players").doc(mid), db.collection("staff").doc(mid));
      const s = p.exists ? p : t;
      return s.exists && typeof s.data().name === "string" ? s.data().name : "";
    },
    // Událost podle id: nejdřív trénink / událost, jinak zápas; neexistuje-li, null
    async eventOf(eid) {
      const [e, m] = await db.getAll(db.collection("events").doc(eid), db.collection("matches").doc(eid));
      return e.exists ? {coll: "events", data: e.data()} : m.exists ? {coll: "matches", data: m.data()} : null;
    },
    // Události s termínem přihlášení v rozmezí (od, do]; jediné pole v dotazu, proto bez vlastního indexu
    async eventsDue(coll, from, to) { return (await db.collection(coll).where("dl", ">", from).where("dl", "<=", to).get()).docs.map(d => ({id: d.id, ...d.data()})); },
    // Hráčky a členové týmu zařízení (jen existující dokumenty): hráčka s st = end už neodpovídá
    async members(pids, tids) {
      const out = {p: {}, t: {}}, refs = [...pids.map(id => db.collection("players").doc(id)), ...tids.map(id => db.collection("staff").doc(id))];
      if (!refs.length) return out;
      (await db.getAll(...refs)).forEach(s => {
        if (!s.exists) return;
        if (s.ref.parent.id === "players") out.p[s.id] = {ended: (s.data().st || "act") === "end"}; else out.t[s.id] = {};
      });
      return out;
    },
    // Počet oznámení o změně na zařízení v dané hodině (jeden dokument na hodinu, jedna transakce)
    bumpBurst(hour, ids) {
      const ref = log.doc("b_" + hour);
      return db.runTransaction(async t => {
        const s = await t.get(ref), c = s.exists ? {...(s.data().c || {})} : {}, out = {};
        ids.forEach(id => { const k = short(id); c[k] = (c[k] || 0) + 1; out[id] = c[k]; });
        t.set(ref, {c, at: Date.now()});
        return out;
      });
    },
    // Denní strop: vrátí, kolik z `want` smí odejít, a započítá to (jeden dokument na den, jedna transakce)
    reserve(day, want, cap) {
      const ref = log.doc("d_" + day);
      return db.runTransaction(async t => {
        const s = await t.get(ref), n = s.exists ? s.data().n || 0 : 0, ok = Math.max(0, Math.min(want, cap - n));
        if (ok) t.set(ref, {n: n + ok, at: Date.now()});
        return ok;
      });
    },
    async dropDevices(ids) { const b = db.batch(); ids.forEach(id => b.delete(db.collection("devices").doc(id))); await b.commit(); },
    // Noční úklid: záznamy starší než `before` (ms), nejvýš 300 najednou; vrací počet smazaných
    async cleanup(before) {
      const snap = await log.where("at", "<", before).limit(300).get();
      if (snap.empty) return 0;
      const b = db.batch(); snap.docs.forEach(d => b.delete(d.ref)); await b.commit();
      return snap.size;
    }
  };
}

// ===== Odesílání =====
// Data-only zpráva (bez klíče notification): zobrazení řeší sw.js v aplikaci, takže vzhled i klepnutí jsou pod kontrolou aplikace.
// Urgency high = doručit hned i při úsporném režimu telefonu; TTL = jak dlouho FCM drží zprávu pro vypnutý telefon.
export function adminPush(messaging) {
  return {
    async send(devs, msg, {ttl}) {
      let sent = 0;
      const bad = [];
      for (let i = 0; i < devs.length; i += 500) {
        const part = devs.slice(i, i + 500);
        const res = await messaging.sendEachForMulticast({
          tokens: part.map(d => d.tok),
          data: {title: msg.title, body: msg.body, tag: msg.tag, url: "./"},
          webpush: {headers: {TTL: String(ttl), Urgency: "high"}}
        });
        sent += res.successCount;
        res.responses.forEach((r, k) => { if (!r.success && r.error && DEAD.includes(r.error.code)) bad.push(part[k].id); });
      }
      return {sent, bad};
    }
  };
}
