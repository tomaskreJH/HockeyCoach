// Nastavení týmu a aplikace na jednom místě (bez logiky). Další tým = samostatná kopie aplikace: změnit tento soubor,
// src/data/firebase-config.js (vlastní projekt Firebase), index.html a manifest.webmanifest (název na ploše telefonu).
// Značka formátu zálohy app: "hokej-zapasy" (data/storage.js) se nemění – podle ní se poznají i starší zálohy.

// ===== Konstanty =====
export const TEAM_NAME = "HC Střely";                   // náš tým v zápasech, statistikách a zápisu utkání
export const APP_NAME = "HockeyCoach";                 // název aplikace na přihlašovací obrazovce a v hláškách
export const DEV_EMAILS = ["tomaskre@gmail.com"];      // účty vývojáře se smí přepnout do náhledu role
