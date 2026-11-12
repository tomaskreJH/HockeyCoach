// Vstup Cloud Functions HockeyCoach – push notifikace. Pět funkcí:
//   notifyEventChange / notifyMatchChange – spustí se při změně dokumentu události / zápasu; oznámí zrušení, obnovení a změnu času přihlášeným,
//   notifyJoinRequest / notifyAttRequest – nová žádost o přijetí do týmu (manager) a žádost o změnu účasti po uzávěrce (manager a trenéři),
//   notifyDeadlines – každých 15 minut zkontroluje uzávěrky přihlášení a hodinu předem upozorní ty, kdo ještě neodpověděli (v noci i úklid pushLog).
// Vše je za hlavním vypínačem settings/notif.on (výchozí stav = VYPNUTO; zapíná a STOPuje se v aplikaci ⚙️ → 🔔 Notifikace).
// Funkce nic nezapisují do events, matches, attendance, requests ani joinreq, takže se nemohou spustit navzájem ve smyčce; chyby se jen zalogují (bez opakování).
// Struktura: Importy -> Nastavení -> Funkce.

// ===== Importy =====
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";
import {setGlobalOptions} from "firebase-functions/v2";
import {onDocumentCreated, onDocumentUpdated, onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {REGION, SCHEDULE, TZ} from "./config.js";
import {handleAttRequest, handleChange, handleJoinRequest, runCleanup, runDeadlines} from "./core.js";
import {isCleanupTime} from "./logic.js";
import {adminPush, adminStore} from "./store.js";

// ===== Nastavení =====
// Jedna instance, malá paměť, krátký limit: i při chybě v kódu nemůže funkce běžet ve velkém
initializeApp();
setGlobalOptions({region: REGION, maxInstances: 1, memory: "256MiB", timeoutSeconds: 120});
const ctx = () => ({store: adminStore(getFirestore()), push: adminPush(getMessaging()), now: () => Date.now(), log: logger});

// ===== Funkce =====
// Změna události nebo zápasu. Většina zápisů (živý zápis zápasu) se nezměnila v datu ani čase a skončí hned bez jediného čtení.
const onChange = coll => async event => {
  try {
    const d = event.data, before = d && d.before && d.before.data(), after = d && d.after && d.after.data();
    const res = await handleChange(ctx(), {coll, id: event.params.id, before, after, eventId: event.id});
    if (res.r !== "none" && res.r !== "outside") logger.info("změna události", {coll, id: event.params.id, ...res});
  } catch (e) { logger.error("Oznámení změny události selhalo", e); }
};
export const notifyEventChange = onDocumentUpdated("events/{id}", onChange("events"));
export const notifyMatchChange = onDocumentUpdated("matches/{id}", onChange("matches"));

// Nová žádost o přijetí do týmu (joinreq): oznámení managerovi. Vyřízení žádosti (změna st) a smazání skončí na prvním řádku bez čtení.
export const notifyJoinRequest = onDocumentWritten("joinreq/{id}", async event => {
  try {
    const d = event.data, before = d && d.before && d.before.exists ? d.before.data() : null, after = d && d.after && d.after.exists ? d.after.data() : null;
    const res = await handleJoinRequest(ctx(), {id: event.params.id, before, after, eventId: event.id});
    if (res.r !== "none") logger.info("žádost o přijetí", res);
  } catch (e) { logger.error("Oznámení žádosti o přijetí selhalo", e); }
});
// Nová žádost o změnu účasti po uzávěrce (requests, kind "att"): oznámení manageru a trenérům. Žádosti o placení skončí hned bez čtení.
export const notifyAttRequest = onDocumentCreated("requests/{id}", async event => {
  try {
    const doc = event.data && event.data.data();
    const res = await handleAttRequest(ctx(), {id: event.params.id, doc});
    if (res.r !== "none") logger.info("žádost o změnu účasti", res);
  } catch (e) { logger.error("Oznámení žádosti o změnu účasti selhalo", e); }
});

// Plánovač: uzávěrky přihlášení + v noci úklid starých záznamů
export const notifyDeadlines = onSchedule({schedule: SCHEDULE, timeZone: TZ, retryCount: 0}, async () => {
  try {
    const c = ctx(), res = await runDeadlines(c);
    if (res.r === "done") logger.info("uzávěrky", res);
    if (isCleanupTime(c.now())) logger.info("úklid", await runCleanup(c));
  } catch (e) { logger.error("Kontrola uzávěrek selhala", e); }
});
