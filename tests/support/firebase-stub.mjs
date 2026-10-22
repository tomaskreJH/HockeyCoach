// Zástupce Firebase SDK pro testy v Node: aplikace importuje SDK z gstatic.com, testy ho nahrazují tímto modulem (bez sítě a bez databáze).
// Struktura: Pomocné funkce -> Exporty se stejnými názvy jako skutečné SDK (firebase-app, firebase-auth, firebase-firestore).
// Testy nezapisují do databáze přes SDK – zápisy zápasu zachytává zástupné S.db (tests/support/fake-db.mjs).

// ===== Pomocné funkce =====
const none = () => ({});
const later = async () => null;

// ===== firebase-app =====
export const initializeApp = none;

// ===== firebase-auth =====
export class GoogleAuthProvider { setCustomParameters() {} }
export const getAuth = none, getRedirectResult = later, onAuthStateChanged = () => () => {}, signInWithPopup = later, signInWithRedirect = later, signOut = later;

// ===== firebase-firestore =====
export const collection = none, doc = none, query = none, where = none, deleteField = none, initializeFirestore = none, persistentLocalCache = none, persistentMultipleTabManager = none;
export const deleteDoc = later, setDoc = later, getDoc = async () => ({exists: () => false, data: () => ({})}), getDocs = async () => ({docs: []});
export const onSnapshot = () => () => {};
export const writeBatch = () => ({set() {}, delete() {}, commit: later});
