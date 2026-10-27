# Plán – jen nehotové fáze

Hotové fáze a jejich rozhodnutí: `docs/archiv/` (plán v18 – v21, plán Trénink) a `CHANGELOG.md`. Aktuální stav: `docs/STAV.md`.

| Pořadí | Fáze | Obsah |
|---|---|---|
| ~~v22.2~~ | hotovo | ⏱ ▶ Teď (skok na blok), ☑ hromadné úhrady, 🏦 párování výpisu z banky (CSV) |
| ~~v22.3~~ | hotovo | 🕘 zpětná změna způsobu placení, ⚙ ruční sloupce výpisu (univerzální import) |
| ~~v22.4~~ | hotovo | stav na kartě události (💰 vyúčtování a placení, 🏒 plán / průběh / hodnocení), ⚖️ detail tarifu hráčky, 🔓 hromadné výjimky z blokace |
| ~~v22.5~~ | hotovo | 🔁 převody mezi účty, datum platby, 🧾 Náklady (led, rozhodčí … proti výdajům), číslo účtu v QR, ➕ příjem z výpisu |
| ~~v22.6~~ | hotovo | **E5** 📈 přehled a analýza Tréninku (Statistiky → 🏒 Trénink) |
| ~~v22.7~~ | hotovo | 🕘 historie přihlášek na události (časy změn, kdo zapisoval za koho) |
| ~~v22.8~~ | hotovo | **D1** 📉 úspora čtení: audit a stav tréninků na kartách na vyžádání, 📉 odhad čtení v ⚙️ → 💾 Data |
| ~~v22.9~~ | hotovo | **D2** 📉 události a docházka v okně (živě 45 / 14 dní, starší z paměti zařízení) |
| v22.x | **K2** | 🖐 komfort celé aplikace – návrh seznamu níže ke schválení, pak malé verze |
| v22.x | **N** | 🔔 notifikace (i se zamčeným telefonem) |
| potom | **P2** | ⭐ jistota plateb pro hráčky |
| odloženo | **G** | ⌚ aplikace pro hodinky Garmin |
| později | **E6**, **H**, **F** | dlouhodobý plán tréninku, souběžné tresty, jeden zapisovatel živého zápisu |
| **poslední** | **M** | další tým / jiný klub |

## D – 📉 šetření čtení databáze (tarif Spark: 50 000 čtení / den)
Účtuje se každý přečtený dokument. Spuštění aplikace po pauze delší než 30 min (i obnovení stránky, nová verze, 👁 náhled role) přečte **všechny dokumenty poslouchaných kolekcí**. Živý zápas je levný (1 zápis = 1 čtení na každém otevřeném zařízení), drahé je hromadné otevírání aplikace – každá hráčka čte celou `attendance`, `events`, `matches`, `players`.
- **D1 (v22.8, hotovo):** audit a stav tréninků na kartách jen na vyžádání, 📉 odhad v ⚙️.
- **D2 (v22.9, hotovo – původní návrh):** docházka a události se poslouchají jen v okně (např. 60 dní zpět + budoucí); starší se načtou jednorázově až v 📊 Docházce, Minulých, Statistikách a pokladně. Docházka dostane pole `d` (datum události) – zápis v `attDoc`, převod starých dat tlačítkem v ⚙️ → 💾 Data, pravidla rozšířit (`d` v `hasOnly`). ⚠️ Výpočty pokladny, ⚖️ Tarify a Moje platby čtou docházku starších událostí – musí dostat starší data před výpočtem. Řeší i otevřenou drobnost 8.
- **D2 výsledek:** okno realizační tým 45 dní, hráčka 14 dní; archiv z paměti zařízení, pás 60 dní ověřován (události denně, docházka týdně), ↻ ručně v ⚙️. Docházka v okně až po 🔒 Vyžadovat verzi 22.9.
- **D3 (později, podle 📉):** uzavřené měsíce docházky zabalit do jednoho dokumentu `attm/{RRRR-MM}` (1 čtení místo stovek); totéž pro `charges` a `cash` uzavřených sezón; okno i pro `attnote`, `absence`, `matches`.
- **Pojistka:** tarif Blaze má stejný limit zdarma a platí se jen čtení nad něj (řádově haléře za tisíce čtení); hlídání rozpočtu v Google Cloud upozorní, ale neomezí. Bez Blaze po překročení limitu databáze do rána (~8–9 h) nečte.

## K2 – komfort celé aplikace
**Návrh seznamu ke schválení (27. 10. 2026)** – každá skupina = jedna malá verze:
1. **Události a docházka:** formulář nové události předvyplní poslední použitou šablonu, místo a čas stejného druhu; ✅ ❌ ❓ odpověď s důvodem z nabídky posledních důvodů (jedno klepnutí místo psaní).
2. **🏠 Domů:** u nejbližší události pruh „Chybí odpověď: N“ s jedním klepnutím na seznam bez odpovědi (trenér) a 📲 připomenutí přes sdílení zprávy (WhatsApp / SMS) bez serveru.
3. **Plán tréninku:** ⧉ „Jako minule“ jedním klepnutím (kopie posledního plánu stejného dne v týdnu), sbalené bloky s celkovým časem v záhlaví.
4. **Živý trénink:** pevná spodní lišta ⏸ / ⏭ / ➕1 min na stejném místě, zbývající čas tréninku vždy nahoře.
5. **Zápas:** sestava „Jako minule“ (poslední sestava proti komukoli), po uzavření zápasu rovnou souhrn ke sdílení.
6. **Jednotné hlášky:** stejné texty a délka zobrazení (uloženo / nepovedlo se / offline – odešle se po připojení), potvrzení druhým klepnutím všude stejně.
7. **Pokladna:** ➖ výdaj předvyplní poslední použitou kategorii, příjemce a účet.
Drobné připomínky uživatele se přidávají sem nebo k nejbližší větší verzi.

Původní zadání: průchod hlavních toků na Androidu (události a docházka, plán tréninku, živý trénink, zápas): méně klepnutí, výchozí hodnoty, poslední volby, rychlé akce, velká tlačítka na pevných místech, přehledy na jedné obrazovce, jednotné hlášky. Drobné připomínky uživatele se přidávají sem nebo k nejbližší větší verzi.

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
8. Poslech `events` / `attendance` jen aktuální sezóny – řeší fáze **D2** (zeptat se před změnou: mění statistiky a docházku za starší období).
9. `live-engine.js` ukládá přes `core/actions.js` (doména sahá na data) – oddělit jen při zásahu do živého zápisu.
10. ⚖️ Porovnání způsobu placení je od v22.1.3 jen pro správce pokladny (Team → 💰 Platby → ⚖️ Tarify); hráčkám ho zpřístupnit až na pokyn trenéra (např. volbou v ⚙️ → Pokladna).
11. 🏦 Výpis z banky: import zůstává univerzální přes CSV (banky se mohou měnit) – přímé napojení konkrétní banky se neplánuje. Přeplatek a nespárovaná platba se od v22.5 zapisují jako příjem; odchozí platby z výpisu (led, rozhodčí) se zatím nepárují – výdaje se zapisují ručně (🧾 Náklady → ➖ Zapsat platbu).
12. 🕘 Po zpětné změně placení se uzavřená vyúčtování znovu otevírají ručně (záměrně – předpisy ostatních se tím přepočítají); případně později hromadně.
13. 🧾 Náklady páruje výdaj s náklady podle kategorie a měsíce (příjemce zpřesní párování); náklady událostí musí mít v šabloně kategorii a příjemce. Zrušená nevyúčtovaná událost se nepočítá.
