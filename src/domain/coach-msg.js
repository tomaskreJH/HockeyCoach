// Zpráva od trenéra (v22.48): jeden dokument coachmsg/current = {id, t, bn, by, at}. Čisté funkce bez DOM a databáze.
// id = označení zprávy (nové id = členové ji uvidí znovu jako okno), t = text, bn = podpis (jméno trenéra), by = e-mail autora, at = čas zápisu (ISO).
// „Viděno“ se pamatuje jen v zařízení (views/coach-msg-view.js, localStorage), do databáze se nic nezapisuje.
// Struktura: Konstanty -> Kontrola a dokument -> Zobrazení.

// ===== Konstanty =====
export const CMSG_COLL = "coachmsg";        // kolekce se zprávou
export const CMSG_ID = "current";           // jediný dokument: aktuální zpráva (nová zpráva nahradí starou)
export const CMSG_MAX = 600;                // nejvýš znaků textu zprávy
export const CMSG_NAME_MAX = 60;            // nejvýš znaků podpisu
export const START_WINDOW_MS = 30000;       // okno jen při startu aplikace: zpráva zadaná za běhu nikoho nepřeruší (třeba při živém zápisu)

// ===== Kontrola a dokument =====
// Text s jednotnými zalomeními řádků, bez mezer na okrajích (zalomení uvnitř zůstanou)
const str = v => (v == null ? "" : String(v)).replace(/\r\n?/g, "\n").trim();
// Kontrola zadané zprávy: neprázdná, nejvýš CMSG_MAX znaků
export function cmsgCheck(text) {
  const t = str(text);
  if (!t) return {ok: false, err: "Napiš text zprávy"};
  if (t.length > CMSG_MAX) return {ok: false, err: "Zpráva je moc dlouhá (max " + CMSG_MAX + " znaků)"};
  return {ok: true, t};
}
// Dokument zprávy (stejný tvar vynucují pravidla databáze); id = nové označení (nová zpráva), nebo stávající (úprava bez nového okna)
export const cmsgDoc = (t, bn, by, at, id) => ({id: str(id), t: str(t), bn: str(bn).slice(0, CMSG_NAME_MAX) || "Trenér", by: str(by).toLowerCase(), at: str(at)});

// ===== Zobrazení =====
// Je zpráva k zobrazení? (existuje, má text i označení)
export const cmsgShown = m => !!(m && str(m.t) && str(m.id));
// Je zpráva nová pro toto zařízení? seenId = označení naposledy zobrazené zprávy
export const cmsgUnseen = (m, seenId) => cmsgShown(m) && str(m.id) !== str(seenId);
// Smí se ukázat okno? Jen u nové zprávy a jen krátce po spuštění aplikace (since = čas spuštění v ms, now = teď)
export const cmsgPopupDue = (m, seenId, since, now) => cmsgUnseen(m, seenId) && now - since <= START_WINDOW_MS;
// Den zprávy „4. 11.“ z času zápisu (ISO); neplatný čas = prázdný text
export function cmsgDay(at) {
  const d = new Date(at);
  return isNaN(d) ? "" : d.getDate() + ". " + (d.getMonth() + 1) + ".";
}
