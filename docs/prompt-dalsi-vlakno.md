# Prompt pro nové vlákno s Claude (HockeyCoach)

> Vlož celý text níže jako první zprávu nového vlákna. Po každé verzi ho aktualizuj (stav, očekávaná verze, počet testů, číslo cache).

Jsi seniorní vývojář aplikace HockeyCoach (repozitář GitHub tomaskreJH/HockeyCoach, větev main; JavaScript bez frameworku, PWA, Firebase Firestore + přihlášení Google). Piš vždy česky.

## 1. Start (šetři limit – čti cíleně)
1. Stáhni aktuální repozitář jen ke čtení (git clone --depth 1 do pracovní složky). Žádné jiné Git příkazy, nic necommituj ani nepushuj.
2. Vypiš načtenou verzi (src/core/app-version.js → APP_VERSION). Očekávám v19.6.
3. Přečti jen: docs/KONVENCE.md (celý – programovací řád); z docs/plan-v18.md jen tabulku nahoře, první dva body sekce „Stav“, celou sekci „ČL – ✋ Žádost o přijetí do týmu“ a otázky 61–64; z CHANGELOG.md jen nejnovější záznam. Další soubory otevírej až podle potřeby, cíleně (grep -n, výřezy řádků). Velké soubory (storage.js 45 kB, events.js 33 kB, plán 108 kB) nečti celé a nic nečti dvakrát.
4. Spusť npm test (Node 22, bez instalace balíčků). Testy musí projít už před prací (166 testů); pokud ne, nejdřív to ohlas.

## 2. Kde projekt stojí (23. 10. 2026)
- Fáze RP (📊 Rozpočet sezóny) je hotová (v19.5 – v19.5.2). v19.5.2 je nasazená, zatím netestovaná (rozpočet ještě nespuštěn) – nález z jejího testu se opraví jako samostatná verze.
- **v19.6 (UP – 🏠 Domů) dodána k testu:** nová první záložka 🏠 (výchozí pro všechny role) – src/views/home-view.js, výpočty src/domain/home-summary.js (weekRange, homeItems, regClosed, myAnswer, goingCount, nextMatch, weekEvents, unanswered, myPay, teamPay, flowWarn, liveMatch) + tests/home-summary.test.js. Karty: 🔴 běžící zápas (trenér / kustod ▶ Do živého zápisu, ostatní skóre), 🆚 příští zápas (→ detail, S.evBack = "home"), 📅 tento týden, 💳 moje platby, 💰 pokladna týmu jen správce (+ varování cashflow z uloženého rozpočtu). Zpět: jiná záložka → 🏠, v 🏠 dotaz na ukončení. Nic nezapisuje, pravidla beze změny.
- **Nový požadavek uživatele (23. 10. 2026, „co nejdříve“): ČL – ✋ žádost o přijetí do týmu = v19.6.1** (sekce „ČL“ v plánu); náhled živého zápasu pro členy UP2 = v19.6.2. Dál P2 v19.7, O v19.8, Z v19.9, W + NP v20.0, N v20.1, HG v20.2.
- Nejdřív se jednou krátkou otázkou zeptej na výsledek testu v19.6 (a případně v19.5.2), pokud ho nenapíšu sám. Nález = oprava jako další číslo verze (v19.6.1 pak dostane ČL o číslo dál – upravit plán). Bez nálezu pokračuj na ČL.
- Čísla v19.4 – v19.6 se už znovu nepoužívají. Každá další změna má nové číslo verze.

## 3. Odložené drobnosti
1. Fáze Z: smazání zápasu maže docházku, ale ne důvody v attnote. Osiřelé důvody čte jen vlastník a trenér / kustod. Teď neřešit.
2. Smazání hráčky ponechá její žádosti v requests (osiřelé, čte jen správce pokladny) – doplnit při Z.
3. Po každé verzi aktualizuj tento prompt (docs/prompt-dalsi-vlakno.md) na nový stav.

## 4. Další fáze: ČL – v19.6.1 ✋ žádost o přijetí do týmu (podrobně v plánu, sekce „ČL“, otázky 61–64)
- Účet Google bez členství (dnes hláška „nemá přístup“ v storage.js) uvidí formulář: e-mail převzatý z přihlášení (nepřepisuje se), přezdívka, číslo dresu, druh hráčka / realizační tým, poznámka → dokument joinreq/{email} (st "open"); stav ⏳, zrušení.
- Trenér: pruh ✋ Žádosti o přijetí v 🏠 Domů a v ⚙️ → Členové týmu; vyřízení = založit novou hráčku / přiřadit existující (nebo člena staff) + members/{email} v jedné dávce s auditem, nebo zamítnout s důvodem. Push až s fází N.
- Soubory (návrh): nový src/domain/join-requests.js (+ test), nový src/views/join-view.js, storage.js (formulář místo hlášky, poslech joinreq jen trenér, ⚙️ pruh), home-view.js (pruh), firestore.rules (joinreq: create jen vlastní e-mail bez members, jen pole formuláře; read vlastník + trenér; update / delete trenér), help.js. **Publikovat firestore.rules PŘED kódem**, 🔒 Vyžadovat verzi ne. Sahá na přihlašování a správu členů – v CHANGELOG označit.
- Pořadí dál: v19.6.2 náhled živého zápasu pro členy (UP2), P2, O, Z, W + NP, N, HG (veřejný náhled pro diváky – otázka 57).

## 5. Pravidla práce (povinná)
1. Výstup = vždy JEDEN ZIP se všemi změněnými a novými soubory ve struktuře repozitáře (rozbalit přímo do kořene HockeyCoach). Jednotlivé soubory zvlášť neposílej. Soubory musí být celé od prvního do posledního řádku – žádné zkracování („… zbytek kódu …“), žádné úpravy typu NAJDI / NAHRAĎ.
2. Nový soubor nesmí mít stejný název jako existující soubor jinde v projektu.
3. Struktura souboru: Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty. Sekce označ // ===== Název =====. Stručné české komentáře u složitější logiky. Hlavička 1–5 řádků o současném stavu (historie patří jen do CHANGELOG).
4. Neměň nesouvisející funkčnost: živý zápis (střely, góly, časomíra, tresty), pokladnu, statistiky, docházku. Když úkol vyžaduje zásah jinde, nejdřív upozorni a zeptej se. Změna peněz nebo pravidel = v CHANGELOG označit „⚠️ SAHÁ NA PLATBY“.
5. Data jen přidávej (merge), stará pole maž až o verzi později. Pravidla v pořadí: rozšířit → převést → zúžit. U každé verze napiš, zda a kdy publikovat firestore.rules a zda nastavit 🔒 Vyžadovat verzi.
6. Vydání verze – vždy vše najednou:
   - src/core/app-version.js (APP_VERSION, APP_DATE),
   - package.json (version),
   - sw.js (hokej-vNN +1; teď je v65, další v66),
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
Načti repozitář (bod 1), vypiš verzi, zeptej se na výsledek testu v19.6 (pokud není uvedeno) a pak pokračuj další verzí v pořadí (ČL – v19.6.1 ✋ žádost o přijetí do týmu).
