// Kouřový test: zástupce Firebase SDK s daty (poslech kolekce i dotazu where, getDocs / getDoc z dat, zápisy do paměti).
// Data a přihlášený účet nastaví smoke-role.mjs v globalThis.__fb = {user, members, data, writes}. Bez sítě a bez databáze.

// ===== Pomocné funkce =====
const none = () => ({});
const later = async () => null;
const fb = () => globalThis.__fb || {data: {}, members: {}, writes: []};
const col = c => (c === "members" ? fb().members : fb().data[c]) || {};          // members/{email} jsou zvlášť (účty rolí)
const copy = d => (d === undefined ? undefined : JSON.parse(JSON.stringify(d)));
const pathOf = ref => (ref ? ref.c + "/" + ref.id : "?");
// Dokumenty kolekce podle dotazu (podmínky where: ==, >= a < – okna poslechu porovnávají data jako text)
const okW = (w, d) => !w || w.every(q => { const v = d && d[q.f]; return q.op === ">=" ? String(v == null ? "" : v) >= q.v : q.op === "<" ? String(v == null ? "" : v) < q.v : v === q.v; });
const docsOf = ref => Object.entries(col(ref.c)).filter(([, d]) => okW(ref.w, d)).map(([id, d]) => ({id, data: () => copy(d)}));
// Zápis do paměti: dokument se změní i v datech (další čtení ho uvidí), záznam jde do writes
function put(ref, d, opt) {
  const f = fb(), c = ref.c === "members" ? f.members : f.data[ref.c] || (f.data[ref.c] = {}), val = copy(d);
  c[ref.id] = opt && (opt.merge || opt.mergeFields) ? Object.assign({}, c[ref.id] || {}, val) : val;
  f.writes.push({path: pathOf(ref), d: val});
}

// ===== firebase-app =====
export const initializeApp = none;

// ===== firebase-auth =====
export class GoogleAuthProvider { setCustomParameters() {} }
export const getAuth = none, getRedirectResult = later, signInWithPopup = later, signInWithRedirect = later, signOut = later;
export const onAuthStateChanged = (auth, cb) => { Promise.resolve().then(() => cb(fb().user || null)); return () => {}; };

// ===== firebase-firestore =====
export const initializeFirestore = none, persistentLocalCache = none, persistentMultipleTabManager = none;
export const collection = (fs, c) => ({c});
export const doc = (fs, c, id) => ({c, id});
export const where = (f, op, v) => ({f, op, v});
export const query = (ref, ...w) => ({c: ref.c, w});
export const deleteField = () => "__del";
export const serverTimestamp = () => Date.now();
export const getDocs = async ref => ({docs: docsOf(ref)});
export const getDocsFromCache = async ref => ({docs: docsOf(ref)}), getDocsFromServer = async ref => ({docs: docsOf(ref)});
// Dokument members/{email} z __fb.members, ostatní z __fb.data
export const getDoc = async ref => {
  const d = col(ref.c)[ref.id];
  return {exists: () => d !== undefined, data: () => copy(d)};
};
// Poslech: dokument dostane snímek dokumentu, kolekce / dotaz seznam dokumentů (ihned, jednou)
export const onSnapshot = (ref, cb) => {
  Promise.resolve().then(() => {
    if (ref.id != null) { const x = col(ref.c)[ref.id]; cb({exists: () => x !== undefined, data: () => copy(x), id: ref.id}); return; }
    const docs = docsOf(ref);
    cb({docs, empty: !docs.length, size: docs.length, docChanges: () => []});
  });
  return () => {};
};
export const setDoc = async (ref, d, opt) => put(ref, d, opt);
export const deleteDoc = async ref => { delete col(ref.c)[ref.id]; fb().writes.push({path: pathOf(ref), del: true}); };
export const writeBatch = () => {
  const ops = [];
  return {
    set(ref, d, opt) { ops.push(() => put(ref, d, opt)); },
    update(ref, d) { ops.push(() => put(ref, d, {merge: true})); },
    delete(ref) { ops.push(() => deleteDoc(ref)); },
    commit: async () => { ops.forEach(o => o()); }
  };
};
// Transakce: čte aktuální data, zápisy provede až po úspěšném fn (jako potvrzení dávky)
export const runTransaction = async (fs, fn) => {
  const ops = [];
  const t = {
    get: async ref => { const x = col(ref.c)[ref.id]; return {exists: () => x !== undefined, data: () => copy(x)}; },
    set(ref, d, opt) { ops.push(() => put(ref, d, opt)); return t; },
    delete(ref) { ops.push(() => deleteDoc(ref)); return t; }
  };
  const r = await fn(t);
  ops.forEach(o => o());
  return r;
};
