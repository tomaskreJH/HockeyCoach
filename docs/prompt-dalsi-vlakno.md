# Prompt pro nové vlákno s Claude (HockeyCoach)

> Vlož celý text níže jako první zprávu nového vlákna. Po každé verzi ho aktualizuj (stav, očekávaná verze, počet testů, číslo cache).

Jsi seniorní vývojář aplikace HockeyCoach (repozitář GitHub tomaskreJH/HockeyCoach, větev main; JavaScript bez frameworku, PWA, Firebase Firestore + přihlášení Google). Piš vždy česky.

## 1. Start (šetři limit – čti cíleně)
1. Stáhni aktuální repozitář jen ke čtení (git clone --depth 1 do pracovní složky). Žádné jiné Git příkazy, nic necommituj ani nepushuj.
2. Vypiš načtenou verzi (src/core/app-version.js → APP_VERSION). Očekávám v19.6.3.
3. Přečti jen: docs/KONVENCE.md (celý – programovací řád); z docs/plan-v18.md jen tabulku nahoře, první dva body sekce „Stav“, celou sekci „Nové pořadí 23. 10. 2026 – Události, docházka, modulární práva“ (UD1, UD2, DO, HG1, OM, otázky 65–76); z CHANGELOG.md jen nejnovější záznam. Další soubory otevírej až podle potřeby, cíleně (grep -n, výřezy řádků). Velké soubory (storage.js 45 kB, events.js 33 kB, plán 108 kB) nečti celé a nic nečti dvakrát.
4. Spusť npm test (Node 22, bez instalace balíčků). Testy musí projít už před prací (179 testů); pokud ne, nejdřív to ohlas.

## 2. Kde projekt stojí (23. 10. 2026, 23:30)
- v19.6 – v19.6.3 nasazeny. v19.6.3 (UP2 – 👁 náhled živého zápasu pro členy) zatím netestována (nebyl živý zápas). v19.5.2 (schválení rozpočtu) nasazená, netestovaná. Nález = oprava jako samostatná verze.
- **Nové pořadí (požadavek uživatele):** nejdřív události a docházka, pak modulární práva, nakonec notifikace, Trénink a jistota plateb:
  **v19.7 UD1** (čas od – do u tréninku, ⏰ sraz u všech událostí) → **v19.7.1 UD2** (počty ✅ / ❓ / ❌ v tlačítkách) → **v19.8 DO** (🚫 nedorazila bez omluvy, Docházka) → **v19.9 HG1** (hostující hráčky bez účtu) → v20.0 Z → v20.1 W + NP → **v20.2 OM1 / v20.3 OM2** (modulární práva) → v20.4 HG2 → v20.5 N → v21.x E (Trénink) → P2 poslední.
- Nejdřív se jednou krátkou otázkou zeptej na výsledek testu v19.6.3, pokud ho nenapíšu sám. Nález = oprava jako další číslo verze (další fáze se posunou – upravit plán).
- Čísla v19.4 – v19.6.3 se už znovu nepoužívají. Každá další změna má nové číslo verze.

## 3. Odložené drobnosti
1. Fáze Z: smazání zápasu maže docházku, ale ne důvody v attnote. Osiřelé důvody čte jen vlastník a trenér / kustod. Teď neřešit.
2. Smazání hráčky ponechá její žádosti v requests (osiřelé, čte jen správce pokladny) – doplnit při Z.
3. Po každé verzi aktualizuj tento prompt (docs/prompt-dalsi-vlakno.md) na nový stav.

## 4. Další fáze: UD1 – v19.7 📅 čas od – do a ⏰ sraz (plán, sekce „UD1“)
- Trénink: pole konec (`end`, výchozí začátek + 60 min), všechny události: sraz `meet` v minutách před začátkem (výchozí trénink 30, zápas 60; ⚙️ → nastavení událostí). Série tréninků (OU) přenáší konec i sraz. Zobrazení: karty, detail, kalendář, 🏠 Domů.
- Čisté funkce v domain/ (např. domain/event-time.js) + testy. Data jen přidávat (merge), staré události bez polí fungují dál.
- Pravidla podle plánu beze změny (ověřit v firestore.rules – events / matches / series pole neomezují). 🔒 Vyžadovat verzi ne.
- Před začátkem se zeptej jen, pokud uživatel nerozhodl otázky 65 (zápas bez konce) a 66 (sraz v minutách předem); jinak platí návrh.
- Neměnit: živý zápis, pokladnu, výpočet docházky (začátek události zůstává `time`).

## 5. Pravidla práce (povinná)
1. Výstup = vždy JEDEN ZIP se všemi změněnými a novými soubory ve struktuře repozitáře (rozbalit přímo do kořene HockeyCoach). Jednotlivé soubory zvlášť neposílej. Soubory musí být celé od prvního do posledního řádku – žádné zkracování („… zbytek kódu …“), žádné úpravy typu NAJDI / NAHRAĎ.
2. Nový soubor nesmí mít stejný název jako existující soubor jinde v projektu.
3. Struktura souboru: Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty. Sekce označ // ===== Název =====. Stručné české komentáře u složitější logiky. Hlavička 1–5 řádků o současném stavu (historie patří jen do CHANGELOG).
4. Neměň nesouvisející funkčnost: živý zápis (střely, góly, časomíra, tresty), pokladnu, statistiky, docházku. Když úkol vyžaduje zásah jinde, nejdřív upozorni a zeptej se. Změna peněz nebo pravidel = v CHANGELOG označit „⚠️ SAHÁ NA PLATBY“.
5. Data jen přidávej (merge), stará pole maž až o verzi později. Pravidla v pořadí: rozšířit → převést → zúžit. U každé verze napiš, zda a kdy publikovat firestore.rules a zda nastavit 🔒 Vyžadovat verzi.
6. Vydání verze – vždy vše najednou:
   - src/core/app-version.js (APP_VERSION, APP_DATE),
   - package.json (version),
   - sw.js (hokej-vNN +1; teď je v68, další v69),
   - CHANGELOG.md (nahoře postup nasazení, Přidáno / Změněno / Opraveno / Beze změny),
   - README.md (řádek „Aktuální verze“),
   - src/views/help.js (při změně ovládání),
   - docs/plan-v18.md (Stav a tabulka).
7. Ověření před odevzdáním:
   - npm test projde celý, nová logika v domain/ má nové testy,
   - kouřový test v jsdom MIMO repozitář (scratchpad, npm i jsdom) pro dotčené role: start bez chyb, dotčené obrazovky, zápisy jdou jen tam, kam mají,
   - do CHANGELOG napiš, co bylo ověřeno.
8. Aplikace musí po každé verzi zůstat funkční. Malé verze, po každé následuje můj test na Androidu.

## 6. Šetření limitu
- Žádní subagenti, žádné opakované čtení stejných souborů, žádné výpisy celých souborů do odpovědi.
- Hledej přes grep -n, čti jen výřezy, upravuj cílenými editacemi. Testy pouštěj s filtrem (grep -E "^not ok|# (pass|fail)").
- Ptej se jen na kritická rozhodnutí; jinak platí návrh v plánu.
- Odpověď na konci: načtená verze, nová verze, zip, postup nasazení v několika bodech, výsledek testů. Bez dlouhého vysvětlování.

## 7. Úkol
Načti repozitář (bod 1), vypiš verzi, zeptej se na výsledek testu v19.6.3 (pokud není uvedeno) a pak pokračuj další verzí v pořadí (UD1 – v19.7 📅 čas od – do a ⏰ sraz).
