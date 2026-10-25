// Zástupce Firebase SDK pro testy v Node: aplikace importuje SDK z gstatic.com, testy ho nahrazují tímto modulem (bez sítě a bez databáze).
// Struktura: Pomocné funkce -> Exporty se stejnými názvy jako skutečné SDK (firebase-app, firebase-auth, firebase-firestore).
// Bez nastavení se nic nepřihlásí a nic nenačte. Test může nastavit globalThis.__fb = {user, members, data, writes}:
// přihlášený uživatel, dokumenty members/{email}, obsah kolekcí (poslech kolekce je dostane hned)
// a pole writes, do kterého se zapíše každý setDoc a zápis dávky ({path, d}, u smazání {path, del: true});
// částečný zápis nese i volby setDoc (opt: {merge} nebo {mergeFields}) a smazání pole deleteField() se zapíše jako "__del".
// Testy nezapisují do databáze přes SDK – zápisy zachytává zástupné S.db (tests/support/fake-db.mjs).

// ===== Pomocné funkce =====
const none = () => ({});
const later = async () => null;
const fb = () => globalThis.__fb || null;

// ===== firebase-app =====
export const initializeApp = none;

// ===== firebase-auth =====
export class GoogleAuthProvider { setCustomParameters() {} }
export const getAuth = none, getRedirectResult = later, signInWithPopup = later, signInWithRedirect = later, signOut = later;
// Přihlášení: jen s nastaveným __fb (jinak se odpověď nikdy nevrátí – aplikace čeká na přihlášení)
export const onAuthStateChanged = (auth, cb) => { const f = fb(); if (f) Promise.resolve().then(() => cb(f.user || null)); return () => {}; };

// ===== firebase-firestore =====
export const query = none, where = none, initializeFirestore = none, persistentLocalCache = none, persistentMultipleTabManager = none;
export const collection = (fs, c) => ({c});
export const doc = (fs, c, id) => ({c, id});
// Zápisy do __fb.writes (jen když ho test nastaví)
const rec = w => { const f = fb(); if (f && f.writes) f.writes.push(w); };
// Smazání pole: značka, kterou test pozná po převodu do JSON
export const deleteField = () => "__del";
// Čas serveru: značka, kterou test pozná po převodu do JSON
export const serverTimestamp = () => "__ts";
// Záznam zápisu: kopie dat, u částečného zápisu i volby
const entry = (ref, d, opt) => Object.assign({path: path(ref), d: JSON.parse(JSON.stringify(d))}, opt ? {opt: JSON.parse(JSON.stringify(opt))} : {});
const path = ref => (ref ? ref.c + "/" + ref.id : "?");
export const getDocs = async () => ({docs: []});
export const setDoc = async (ref, d, opt) => { rec(entry(ref, d, opt)); };
export const deleteDoc = async ref => { rec({path: path(ref), del: true}); };
// Dokument members/{email} z __fb.members (role účtu)
export const getDoc = async ref => {
  const f = fb(), d = f && ref && ref.c === "members" ? (f.members || {})[ref.id] : null;
  return {exists: () => !!d, data: () => d || {}};
};
// Poslech kolekce nebo jednoho dokumentu: obsah z __fb.data[kolekce] se předá ihned
export const onSnapshot = (ref, cb) => {
  const f = fb(), d = f && ref && ref.c ? (f.data || {})[ref.c] : null;
  // Odkaz na dokument (doc) dostane snímek dokumentu, odkaz na kolekci seznam dokumentů
  if (ref && ref.id != null) { const x = (d || {})[ref.id]; if (f) cb({exists: () => x !== undefined, data: () => x}); return () => {}; }
  if (d) cb({docs: Object.entries(d).map(([id, x]) => ({id, data: () => x}))});
  return () => {};
};
export const writeBatch = () => { const ops = []; return {set(ref, d, opt) { ops.push(entry(ref, d, opt)); }, delete(ref) { ops.push({path: path(ref), del: true}); }, update(ref, d) { ops.push({path: path(ref), d: JSON.parse(JSON.stringify(d))}); }, commit: async () => { ops.forEach(rec); }}; };
