# Plán – jen nehotové fáze

Hotové fáze a jejich rozhodnutí: `docs/archiv/` (plán v18 – v21, plán Trénink) a `CHANGELOG.md`. Aktuální stav: `docs/STAV.md`.

| Pořadí | Fáze | Obsah |
|---|---|---|
| ~~v22.2~~ | hotovo | ⏱ ▶ Teď (skok na blok), ☑ hromadné úhrady, 🏦 párování výpisu z banky (CSV) |
| ~~v22.3~~ | hotovo | 🕘 zpětná změna způsobu placení, ⚙ ruční sloupce výpisu (univerzální import) |
| ~~v22.4~~ | hotovo | stav na kartě události (💰 vyúčtování a placení, 🏒 plán / průběh / hodnocení), ⚖️ detail tarifu hráčky, 🔓 hromadné výjimky z blokace |
| v22.5 | **E5** | 📈 přehled a analýza Tréninku (níže) |
| potom | **K2** | 🖐 komfort celé aplikace – nejdřív návrh seznamu ke schválení, pak malé verze |
| v22.x | **N** | 🔔 notifikace (i se zamčeným telefonem) |
| potom | **P2** | ⭐ jistota plateb pro hráčky |
| odloženo | **G** | ⌚ aplikace pro hodinky Garmin |
| později | **E6**, **H**, **F** | dlouhodobý plán tréninku, souběžné tresty, jeden zapisovatel živého zápisu |
| **poslední** | **M** | další tým / jiný klub |

## E5 – 📈 přehled a analýza Tréninku
- Statistiky → přepínač **🏒 Trénink**, výchozí období **60 dní**.
- Tabulky výsledků měření s porovnáním: cvičení × hráčky, nejlepší výsledek po trénincích, zlepšení proti minule, pořadí týmu. **Vidí i hráčky** (motivace).
- Karta hráčky: tréninky, minuty po dovednostech, výsledky (graf). Hodnocení trenérů (`treval`) jen realizační tým, **hráčka nikdy**.
- Tým × dovednosti za období (teplotní mapa), „kdo co trénoval“, ⬇️ CSV.
- `domain/training-stats.js` + testy. `trms` / `treval` / `trplan` číst jen tréninky ve zvoleném období (po dokumentu na trénink). Cvičení řady se počítají přes `expandLanes`.
- Připravené funkce v doméně: `myResults`, `bestOf`, `ranking` (`stopwatch.js`), `playerRates`, `rateCounts`, `unrated` (`training-eval.js`), `skillCoverage` (`skill-coverage.js`).

## K2 – komfort celé aplikace
Průchod hlavních toků na Androidu (události a docházka, plán tréninku, živý trénink, zápas): méně klepnutí, výchozí hodnoty, poslední volby, rychlé akce, velká tlačítka na pevných místech, přehledy na jedné obrazovce, jednotné hlášky. Drobné připomínky uživatele se přidávají sem nebo k nejbližší větší verzi.

**Sebrané připomínky k detailu události (25. 10. 2026):** výraznější záhlaví bloků (hotovo v21.7), hlavička datum / čas a sraz / místo (hotovo v21.7). Další připomínky zapisuje Claude a sám rozhodne, kdy je jich dost na verzi.

## N – 🔔 notifikace
- Druhy: blíží se událost (přihlášeným), uzávěrka přihlašování (bez odpovědi), nová / zrušená událost, nový předpis (bez částky na zamčené obrazovce), žádosti (účast, placení) a jejich vyřízení, nepřítomnost zasahující do uzavřené události, zápas začal, rozpočet ve ztrátě.
- Řešení: Web Push (FCM), token zařízení v `pushTokens/{token}` (zapisuje jen vlastník), odesílání Cloud Functions → **vyžaduje tarif Blaze** – nejdřív ověřit levnou cestu; deduplikace `pushLog`; nastavení druhů u člena v ⚙️.
- Otevřené otázky: souhlas s Blaze a kdo nasadí funkce; předstihy (událost 3 h, uzávěrka 24 h a 2 h); částka v textu předpisu; smí si člen druhy vypnout sám.

## P2 – ⭐ jistota plateb
1. Hráčka si účet týmu uloží jednou **opsáním** (nahradí „Ověřila jsem účet“ – `bank-account.js`, `mine.js`).
2. Účet z databáze ≠ uložený v telefonu → QR se nevytvoří, červené varování.
3. Jméno příjemce v QR (`RN:`) – nové pole v `settings/cash` pod ochranou 4 očí jako `iban` (`accSame()` v pravidlech, `ACC_KEYS` v `data/backup.js`).
4. Stav „odesláno – čeká na potvrzení“, připomenutí po 7 dnech.
5. Mimo aplikaci (do nápovědy): účet jako šablona v bance, číslo účtu na papíře, dvoufázové ověření GitHub / Google.
⚠️ SAHÁ NA PLATBY, **publikovat firestore.rules**.

## G – ⌚ hodinky Garmin (odloženo 26. 10. 2026)
⌚ oznámení zatím stačí. Až se k tomu vrátí: datové pole Connect IQ v nativní aktivitě Lední hokej (aktivita s GPS a hrudním pásem v Garmin Connect, navíc data z HockeyCoache); každý trenér svá oznámení a ovládání. Nejdřív ověřit přístup z hodinek bez hesla a cenu.

## E6 – Trénink později
Dlouhodobý plán (sezónní cíle, témata týdnů), ✏️ nákres cvičení (SVG kluziště), testovací baterie sezóny (3–4× ročně).

## H – souběžné tresty (jen myšlenka)
Trest, který tým neoslabuje (souběžné tresty, osobní 10 min): nabídnout doplnění chybějící hráčky v pětce jako po zranění (`S.lgap`), upozornění v `#lwarn`. Zásah do `live-engine.js` (`addPen`, `sk`) jen po dotazu. Ověřit pravidla IIHF (kdy 4 na 4 a kdy náhrada).

## F – jeden zapisovatel živého zápisu
Zámek `live.dev = {id, jméno, ts}` (obnova po 20 s, převzetí po 60 s), ostatní zařízení jen ke čtení, zápis transakcí, ochrana proti dvojímu klepnutí (~1 s). Případně pravidla – publikovat.

## M – další tým (úplně poslední)
Samostatná kopie: vlastní GitHub a vlastní projekt Firebase (možnost A). Týmy o sobě nic nevidí, administraci řeší kupující. Kód připravený (nastavení týmu v `config/team-config.js`, oprávnění přes `can`).

## Otevřené drobnosti
1. Smazání hráčky ponechá její žádosti v `requests` a nepřítomnosti v `absence` (osiřelé).
2. 🚫 u realizačního týmu se nezapisuje.
3. Realizační tým: zvážit přidání člena rovnou s e-mailem a rolí.
4. Smazání tréninku ponechá `trplan`, `trlive`, `trms`, `treval` (osiřelé, nevadí).
5. Pokrytí dovedností počítá i hostující hráčku – zvážit vynechání.
6. ⭐ Výkonnost: smazaná hráčka zůstane v `plevel/team.lv` (nevadí).
7. Upozornění živého tréninku jen při otevřené aplikaci (bez serveru); stopky běží jen v zařízení.
8. Poslech `events` / `attendance` jen aktuální sezóny – zeptat se před změnou (mění statistiky a docházku za starší období).
9. `live-engine.js` ukládá přes `core/actions.js` (doména sahá na data) – oddělit jen při zásahu do živého zápisu.
10. ⚖️ Porovnání způsobu placení je od v22.1.3 jen pro správce pokladny (Team → 💰 Platby → ⚖️ Tarify); hráčkám ho zpřístupnit až na pokyn trenéra (např. volbou v ⚙️ → Pokladna).
11. 🏦 Výpis z banky: přeplatek se jen hlásí (zapsat ručně jako vklad). Import zůstává univerzální přes CSV (banky se mohou měnit) – přímé napojení konkrétní banky se neplánuje.
12. 🕘 Po zpětné změně placení se uzavřená vyúčtování znovu otevírají ručně (záměrně – předpisy ostatních se tím přepočítají); případně později hromadně.
