// Zástupná databáze pro testy živého zápisu: rozhraní S.db, které používá core/actions.js (doc(cesta).set(data)).
// Uložené dokumenty jsou v poli writes, aby testy mohly ověřit, co by aplikace odeslala.

// ===== Hlavní logika =====
export function fakeDb() {
  const writes = [];
  const db = {
    writes,
    doc: path => ({set: async d => { writes.push({path, d: JSON.parse(JSON.stringify(d))}); }, delete: async () => { writes.push({path, del: true}); }}),
    collection: () => ({onSnapshot() {}, where: () => ({onSnapshot() {}}), add: async () => ({id: "x"})}),
    batch: () => ({set() { return this; }, merge() { return this; }, delete() { return this; }, commit: async () => {}})
  };
  return db;
}
