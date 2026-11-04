// Nastavení Cloud Functions notifikací – jediné místo, které se případně mění ručně před nasazením.
// Struktura: Konstanty.

// ===== Konstanty =====
// Region MUSÍ odpovídat poloze databáze Firestore (Firebase konzole → Firestore Database → vedle názvu databáze je „Location“):
// eur3 (Europe multi-region) → europe-west1, europe-west3 (Frankfurt) → europe-west3, europe-west1 (Belgie) → europe-west1.
// Při nesouladu nasazení skončí chybou o regionu – pak sem napiš správný region a nasaď znovu.
export const REGION = "europe-west1";

// Časové pásmo, ve kterém se v aplikaci zadávají data a časy událostí i termíny přihlášení
export const TZ = "Europe/Prague";

// Plánovač kontroly uzávěrek: každých 15 minut (96× denně, každý běh stojí 1 čtení, dokud jsou notifikace vypnuté)
export const SCHEDULE = "every 15 minutes";

// Pojistky proti nákladům a spamu (kód je dodržuje i při chybě jinde; hodnoty lze změnit a nasadit znovu)
export const LIMITS = {
  DAY_CAP: 200,            // nejvíc odeslaných notifikací za den pro celý tým (po vyčerpání se do půlnoci nic neposílá)
  BURST_MAX: 3,            // nejvíc oznámení o změně na jedno zařízení za hodinu (4. dostane souhrn, další se zahodí)
  MAX_EVENTS_RUN: 12,      // nejvíc událostí zpracovaných jedním během plánovače
  CHANGE_AHEAD_DAYS: 30,   // změny a zrušení se oznamují jen u událostí v nejbližších 30 dnech (hromadná úprava série tak nezahltí tým)
  DEADLINE_MIN: 60,        // připomínka přichází nejdřív 60 minut před uzávěrkou přihlašování
  TTL_CHANGE_S: 43200,     // jak dlouho FCM drží oznámení o změně pro vypnutý telefon (12 h)
  LOG_KEEP_DAYS: 45        // jak dlouho se drží záznamy v kolekci pushLog (starší maže noční úklid)
};
