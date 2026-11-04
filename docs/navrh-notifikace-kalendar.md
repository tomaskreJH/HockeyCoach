# Návrh: notifikace + synchronizace kalendáře (podklad pro nové čisté vlákno)

Stav: **návrh, nic není implementováno.** Zadání uživatele (4. 11. 2026): synchronizaci kalendáře dělat **zároveň s notifikacemi**; kalendář se má dostat k uživatelům automaticky (uživatel používá Outlook / M365), událost jako **soukromá**. Změny databáze / `firestore.rules` vždy nejdřív schválit.

## 1. Cíle
- **Notifikace:** připomínka přihlášení na událost („zbývá 24 h, ještě jsi neodpověděla“), blížící se uzávěrka, zrušení / změna události, začátek zápasu, odpověď trenéra.
- **Kalendář:** události, kde je člen „Jdu“ / „Nejsem jistý“, se objeví v jeho kalendáři (Outlook M365, Google, Apple) a aktualizují se sami (změna času, zrušení).

## 2. Možnosti notifikací
| Varianta | Jak | Server? | Poznámka |
|---|---|---|---|
| A. Web Push (FCM) | Service worker `sw.js` + Firebase Cloud Messaging, token zařízení v `devices/{id}` | **ano** – odesílání z Cloud Functions (plán **Blaze**) nebo vlastního serveru | iOS jen u PWA přidané na plochu (iOS 16.4+); jediná cesta ke skutečným pushům při zavřené aplikaci |
| B. Lokální notifikace | Aplikace při otevření naplánuje `showNotification` | ne | Nespolehlivé: bez otevření aplikace nic nepřijde; vhodné jen jako doplněk |
| C. E-mail | Cloud Function + poštovní služba | ano | Funguje všude, méně rušivé; M365 uživatelé ho mají otevřený |
| D. Připomínka přes kalendář | Alarm (`VALARM`) v .ics události | podle kalendáře | Nejlevnější: notifikaci řeší kalendář uživatele |

**Doporučení:** D (zdarma, hned) + A (pushe) až po rozhodnutí o plánu Blaze. Spark plán neumí plánované funkce ani odesílání push serverem.

## 3. Možnosti synchronizace kalendáře
1. **.ics export (bez serveru):** tlačítko u události „📅 Do kalendáře“ a „Moje události (.ics)“. `UID` = `{eventId}@hockeycoach`, `SEQUENCE` (z `rev`/času úpravy) → opětovný import aktualizuje; `CLASS:PRIVATE`; `VALARM` (např. −24 h a −2 h); `STATUS:CANCELLED` u zrušené; časová zóna Europe/Prague. Ruční, ale funguje hned.
2. **Předplatné (webcal / ICS feed) – „automaticky“:** soukromý odkaz na osobu `https://…/cal/{token}.ics`, kalendář si ho načítá sám (Outlook M365: *Přidat kalendář → Z internetu*; interval obnovy určuje Outlook, typicky hodiny). Potřebuje **server** (Cloud Function čte Firestore a vydává feed) → plán **Blaze**. Token na osobu v `calfeeds/{token}` = `{email, pid, at}` (rotace / zrušení v ⚙️). `CLASS:PRIVATE` platí pro položky z feedu jen částečně (Outlook u přihlášených kalendářů často ignoruje) – ověřit v M365.
3. **Přímý zápis do kalendáře (Microsoft Graph / Google API):** skutečně automatické, soukromé události, ale registrace aplikace v Azure, souhlas správce tenantu u firemních účtů, OAuth tokeny – **nedoporučeno** pro firemní M365.

**Doporučení:** nejdřív 1 (spolu s VALARM), potom 2 společně s push notifikacemi (stejný server / Blaze). 

## 4. Společná architektura (Blaze)
- Cloud Functions (Node 22): 
  - `onWrite events/matches` → zjistí dotčené členy (odpověď „Jdu“/„Nejsem jistý“) → push / e-mail při změně času nebo zrušení.
  - plánovač (Cloud Scheduler, každých 15 min) → připomínky k uzávěrce a před zápasem pro členy bez odpovědi.
  - HTTPS `calFeed` → ICS pro token.
- Klient: oprávnění k notifikacím (jen po klepnutí uživatele), registrace tokenu do `devices/{id}` = `{email, token, ua, at}`, nastavení „co chci dostávat“ v `notifprefs/{email}` (zápasy, tréninky, uzávěrka, zrušení; tichá doba).
- Pravidla: `devices`, `notifprefs`, `calfeeds` – vlastník čte / zapisuje své, funkce (admin SDK) vše; **schválit před úpravou rules**.
- Rozpočet: Blaze má bezplatný limit; odhad pro 20 uživatelek zanedbatelný, nastavit **rozpočtové upozornění** v GCP.

## 5. Otevřené otázky pro uživatele
1. Přechod na plán **Blaze** (platební karta, nízké náklady) – ano / ne? Bez něj zůstává jen .ics a VALARM.
2. Které notifikace jsou nutné? (uzávěrka, zrušení, změna času, zápas za 2 h, odpověď na žádost)
3. Kdo smí ručně poslat „📣 Připomenout“ (dnes text 📲 Připomenout v Domů)?
4. Soukromí: do kalendáře jen „Trénink / Zápas vs. X“, bez místa a poznámek?
5. Tiché hodiny (např. 22–7)?

## 6. Navržené verze
- **v22.48:** .ics export (jedna událost + „Moje události“) s `UID`, `SEQUENCE`, `CLASS:PRIVATE`, `VALARM`; testy generátoru (čistá funkce `domain/ical.js`). Bez změny databáze.
- **v22.49:** nastavení notifikací v ⚙️ + registrace zařízení (rules schválit), push přes FCM (po rozhodnutí o Blaze).
- **v22.50:** Cloud Functions: změny / zrušení, připomínky, ICS feed s tokenem.
