// Testy 🟢 přítomnosti členů (domain/presence.js): stav online, text poslední aktivity, kdy zapsat, počet online.
import {test} from "node:test";
import assert from "node:assert/strict";
import {ONLINE_MS, PING_MS, onlineCount, pingDue, seenMs, seenState} from "../src/domain/presence.js";

const NOW = new Date("2026-10-31T21:50:00").getTime();
const at = s => new Date(s).getTime();

test("čas z Timestamp, Date, čísla i textu", () => {
  assert.equal(seenMs({toMillis: () => 5}), 5);
  assert.equal(seenMs(new Date(7)), 7);
  assert.equal(seenMs(9), 9);
  assert.equal(seenMs(null), null);
  assert.equal(seenMs("nesmysl"), null);
});
test("online do 15 min, pak text poslední aktivity", () => {
  assert.equal(seenState({at: NOW - ONLINE_MS + 1000, v: "22.25", ch: "b"}, NOW).text, "🟢 online");
  assert.equal(seenState({at: NOW - 25 * 60000}, NOW).text, "před 25 min");
  assert.equal(seenState({at: NOW - 3 * 3600000}, NOW).text, "před 3 h");
  assert.equal(seenState({at: at("2026-10-31T08:05:00")}, NOW).text, "dnes 8:05");
  assert.equal(seenState({at: at("2026-10-30T21:40:00")}, NOW).text, "včera 21:40");
  assert.equal(seenState({at: at("2026-10-12T19:03:00")}, NOW).text, "12. 10. 19:03");
  assert.equal(seenState({at: at("2025-12-24T10:00:00")}, NOW).text, "24. 12. 2025 10:00");
});
test("verze a kanál, chybějící dokument", () => {
  const s = seenState({at: NOW, v: "22.25", ch: "b"}, NOW);
  assert.equal(s.on, true); assert.equal(s.v, "22.25"); assert.equal(s.beta, true);
  assert.equal(seenState(null, NOW), null);
  assert.equal(seenState({}, NOW), null);
});
test("zápis aktivity nejvýš jednou za 10 min, při spuštění vždy", () => {
  assert.equal(pingDue(0, NOW), true);
  assert.equal(pingDue(NOW - PING_MS + 1, NOW), false);
  assert.equal(pingDue(NOW - PING_MS, NOW), true);
  assert.equal(pingDue(NOW, NOW, true), true);
});
test("počet online", () => {
  assert.equal(onlineCount({a: {at: NOW}, b: {at: NOW - 3600000}, c: {}}, NOW), 1);
  assert.equal(onlineCount(null, NOW), 0);
});

// Pravidla databáze: seen zapisuje jen vlastník se třemi poli a časem serveru, čte jen manager
import {readFileSync} from "node:fs";
test("firestore.rules: blok seen odpovídá aplikaci", () => {
  const r = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(r, /match \/seen\/\{email\} \{\s*allow read, delete: if isMgr\(\);\s*allow create, update: if isMember\(\) && seenOk\(email, request\.resource\.data\);/);
  assert.match(r, /email == mail\(\) && d\.keys\(\)\.hasOnly\(\['at', 'v', 'ch'\]\) && d\.at == request\.time/);
  assert.match(r, /d\.ch in \['s', 'b'\]/);
});
