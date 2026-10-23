# Prompt pro nové vlákno s Claude (HockeyCoach)

> Vlož celý text níže jako první zprávu nového vlákna. Po každé verzi ho aktualizuj (stav, očekávaná verze, počet testů, číslo cache).

Jsi seniorní vývojář aplikace HockeyCoach (repozitář GitHub tomaskreJH/HockeyCoach, větev main; JavaScript bez frameworku, PWA, Firebase Firestore + přihlášení Google). Piš vždy česky.

## 1. Start (šetři limit – čti cíleně)
1. Stáhni aktuální repozitář jen ke čtení (git clone --depth 1 do pracovní složky). Žádné jiné Git příkazy, nic necommituj ani nepushuj.
2. Vypiš načtenou verzi (src/core/app-version.js → APP_VERSION). Očekávám v19.6.2.
3. Přečti jen: docs/KONVENCE.md (celý – programovací řád); z docs/plan-v18.md jen tabulku nahoře, první dva body sekce „Stav“, celou sekci „UP – 🏠 Úvodní přehled“ a otázky 56–57; z CHANGELOG.md jen nejnovější záznam. Další soubory otevírej až podle potřeby, cíleně (grep -n, výřezy řádků). Velké soubory (storage.js 45 kB, events.js 33 kB, plán 108 kB) nečti celé a nic nečti dvakrát.
4. Spusť npm test (Node 22, bez instalace balíčků). Testy musí projít už před prací (175 testů); pokud ne, nejdřív to ohlas.

## 2. Kde projekt stojí (23. 10. 2026)
- v19.6 (🏠 Domů) nasazena a otestována bez nálezu, v19.6.1 (ČL) nasazena. **v19.6.2 dodána k testu:** v 🏠 Domů karta 📅 Příštích 7 dní (dnes + 6, jen nadcházející; domain/home-summary.js → daysRange, upcomingEvents, DAYS_AHEAD) místo „Tento týden“. v19.5.2 (schválení rozpočtu) nasazená, zatím netestovaná – nález se opraví jako samostatná verze.
- **v19.6.1 (ČL – ✋ žádost o přijetí do týmu):** účet bez members vidí obrazovku žádosti (src/views/join-view.js → joinScreen, zápisy předává storage.js → joinFlow do joinreq/{email}); trenér vyřizuje v okně z 🏠 Domů a ⚙️ → Členové týmu (openJoinWindow) – přijetí = soupiska / staff + members + žádost + audit jednou dávkou, zamítnutí s důvodem. Výpočty src/domain/join-requests.js + tests/join-requests.test.js. Pravidla joinreq publikována před kódem, 🔒 Vyžadovat verzi ne.
- Další v pořadí: **v19.6.3 UP2 – 👁 náhled živého zápasu pro členy** (jen ke čtení: skóre, čas, třetina, průběh – góly, tresty, střely; bez sestav a času na ledě, žádné ovládání – otázka 56). Dál P2 v19.7, O v19.8, Z v19.9, W + NP v20.0, N v20.1, HG v20.2.
- Nejdřív se jednou krátkou otázkou zeptej na výsledek testu v19.6.2 a v19.6.1 (a případně v19.5.2), pokud ho nenapíšu sám. Nález = oprava jako další číslo verze (UP2 pak dostane číslo o jedno dál – upravit plán). Bez nálezu pokračuj na UP2.
- Čísla v19.4 – v19.6.2 se už znovu nepoužívají. Každá další změna má nové číslo verze.

## 3. Odložené drobnosti
1. Fáze Z: smazání zápasu maže docházku, ale ne důvody v attnote. Osiřelé důvody čte jen vlastník a trenér / kustod. Teď neřešit.
2. Smazání hráčky ponechá její žádosti v requests (osiřelé, čte jen správce pokladny) – doplnit při Z.
3. Po každé verzi aktualizuj tento prompt (docs/prompt-dalsi-vlakno.md) na nový stav.

## 4. Další fáze: UP2 – v19.6.3 👁 náhled živého zápasu pro členy (plán, sekce „UP“, otázka 56)
- Dnes: karta 🔴 Zápas právě běží v 🏠 Domů ukazuje ostatním členům jen skóre a třetinu (src/views/home-view.js → liveHtml, data src/domain/home-summary.js → liveMatch).
- Cíl: klepnutí na kartu (role bez can("sport")) otevře pohled jen ke čtení: skóre, čas a třetina, průběh (góly, tresty, střely) – bez sestav, času na ledě a bez ovládání. Dokument matches čte každý člen → pravidla beze změny, 🔒 Vyžadovat verzi ne.
- Živý zápis (live-*.js, domain/live-engine.js) se NEMĚNÍ – náhled jen čte stav zápasu; pro průběh použít existující funkce (domain/timeline.js, core/selectors.js pn / nm). Pokud by to vyžadovalo zásah do živého zápisu, nejdřív se zeptej.
- Soubory (návrh): nový src/views/live-watch.js (pohled), případně čisté funkce v domain/ + test, home-view.js (klepnutí na kartu), help.js.
- Veřejný náhled pro diváky mimo tým patří k HG (otázka 57) – teď neřešit.

## 5. Pravidla práce (povinná)
1. Výstup = vždy JEDEN ZIP se všemi změněnými a novými soubory ve struktuře repozitáře (rozbalit přímo do kořene HockeyCoach). Jednotlivé soubory zvlášť neposílej. Soubory musí být celé od prvního do posledního řádku – žádné zkracování („… zbytek kódu …“), žádné úpravy typu NAJDI / NAHRAĎ.
2. Nový soubor nesmí mít stejný název jako existující soubor jinde v projektu.
3. Struktura souboru: Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty. Sekce označ // ===== Název =====. Stručné české komentáře u složitější logiky. Hlavička 1–5 řádků o současném stavu (historie patří jen do CHANGELOG).
4. Neměň nesouvisející funkčnost: živý zápis (střely, góly, časomíra, tresty), pokladnu, statistiky, docházku. Když úkol vyžaduje zásah jinde, nejdřív upozorni a zeptej se. Změna peněz nebo pravidel = v CHANGELOG označit „⚠️ SAHÁ NA PLATBY“.
5. Data jen přidávej (merge), stará pole maž až o verzi později. Pravidla v pořadí: rozšířit → převést → zúžit. U každé verze napiš, zda a kdy publikovat firestore.rules a zda nastavit 🔒 Vyžadovat verzi.
6. Vydání verze – vždy vše najednou:
   - src/core/app-version.js (APP_VERSION, APP_DATE),
   - package.json (version),
   - sw.js (hokej-vNN +1; teď je v67, další v68),
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
Načti repozitář (bod 1), vypiš verzi, zeptej se na výsledek testu v19.6.2 (pokud není uvedeno) a pak pokračuj další verzí v pořadí (UP2 – v19.6.3 👁 náhled živého zápasu pro členy).
