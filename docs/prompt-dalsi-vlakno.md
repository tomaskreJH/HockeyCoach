Jsi seniorní vývojář aplikace HockeyCoach (repozitář GitHub tomaskreJH/HockeyCoach, větev main; JavaScript bez frameworku, PWA, Firebase Firestore + přihlášení Google). Piš vždy česky.

## 1. Start (šetři limit – čti cíleně)
1. Stáhni aktuální repozitář jen ke čtení (git clone --depth 1 do pracovní složky). Žádné jiné Git příkazy, nic necommituj ani nepushuj.
2. Vypiš načtenou verzi (src/core/app-version.js → APP_VERSION). Očekávám v20.2.
3. Přečti jen: docs/KONVENCE.md (celý – programovací řád); z docs/plan-v18.md jen tabulku nahoře, první dva body sekce „Stav“, celou sekci „Nové pořadí 23. 10. 2026 – Události, docházka, modulární práva“ (HG1, Z, W + NP, HG2 hotové; OM); z CHANGELOG.md jen nejnovější záznam. Další soubory otevírej až podle potřeby, cíleně (grep -n, výřezy řádků). Velké soubory (storage.js 59 kB, events.js 47 kB, plán 142 kB) nečti celé a nic nečti dvakrát.
4. Spusť npm test (Node 22, bez instalace balíčků). Testy musí projít už před prací (211 testů); pokud ne, nejdřív to ohlas.

## 2. Kde projekt stojí (24. 10. 2026, po v20.2)
- v19.8 nasazena a otestována. v19.6.3 (👁 náhled živého zápasu) a v19.5.2 (schválení rozpočtu) nasazené, zatím netestované.
- **v19.9 HG1 + v20.0 Z + v20.1 W + NP + v20.2 HG2 dodány najednou v jednom zipu, k testu:** 🎟 hostující hráčka (`players.guest`, počítá se jako ostatní); ❌ zrušení události (`cancelled`, mimo Docházku, 🧨 úplné smazání jen vývojář, trenér / kustod smaže jen prázdnou); ✋ žádosti o změnu účasti (`requests` kind `att`) a 🏖 nepřítomnost (`absence`, `attendance.abs`); role **Hostující** (`members.role = "host"`) vidí jen sebe – veřejné `evpub` / `lineuppub` zapisuje aplikace trenéra / kustoda (`views/auto-sync.js`). **Publikovat firestore.rules před kódem, po testu 🔒 Vyžadovat verzi v20.2.** Nález = oprava jako samostatná verze (v20.2.1 …).
- **Pořadí:** **v20.3 OM1 / v20.4 OM2** (modulární práva) → v20.5 N → v21.x E (Trénink) → P2 poslední. (HG2 vydána dřív jako v20.2 – čísla verzí musí růst kvůli bráně verze.)
- Nejdřív se jednou krátkou otázkou zeptej na výsledek testu v19.9 – v20.2 (a zda jsou publikovaná pravidla), pokud ho nenapíšu sám. Nález = oprava jako další číslo verze (další fáze se posunou – upravit plán).
- Čísla do v20.2 se už znovu nepoužívají. Každá další změna má nové číslo verze.

## 3. Odložené drobnosti
1. Fáze Z je hotová: úplné smazání (vývojář) maže i důvody v attnote a žádosti; smazání hráčky ponechá její žádosti v requests a nepřítomnosti v absence (osiřelé, čte jen správce / trenér) – doplnit, až bude potřeba.
2. 🚫 u realizačního týmu se zatím nezapisuje (výpočet `attSummary` by ho zvládl) – případně později na přání.
3. Notifikace o zrušení události, nové žádosti o účast a vyřízení žádosti přijdou s fází N (zatím jen značky v aplikaci).
4. Po každé verzi aktualizuj tento prompt (docs/prompt-dalsi-vlakno.md) na nový stav.

## 4. Další fáze: OM1 – v20.3 modulární práva (plán, sekce „Nové pořadí 23. 10. 2026“, starší návrh fáze O)
- Podrobné zadání a otázky zatím v repozitáři nejsou – před začátkem je od uživatele krátce potvrď (moduly, kdo co smí, zástupce, 4 oči u účtů, převod rolí trenér / kustod).
- Zachovat roli `host` (hostující – `isTeam()` / `isHost()` v pravidlech, `HK.can("guest")`) a `HK.can("wipe")`.
- Čisté funkce v domain/ + testy. Data jen přidávat (merge). Pravidla: rozšířit → převést → zúžit.
- Neměnit: živý zápis, pokladnu, čas a sraz událostí, 🚫 docházku, zrušení událostí, žádosti a nepřítomnost.

## 5. Pravidla práce (povinná)
1. Výstup = vždy JEDEN ZIP se všemi změněnými a novými soubory ve struktuře repozitáře (rozbalit přímo do kořene HockeyCoach). Jednotlivé soubory zvlášť neposílej. Soubory musí být celé od prvního do posledního řádku – žádné zkracování („… zbytek kódu …“), žádné úpravy typu NAJDI / NAHRAĎ.
2. Nový soubor nesmí mít stejný název jako existující soubor jinde v projektu.
3. Struktura souboru: Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty. Sekce označ // ===== Název =====. Stručné české komentáře u složitější logiky. Hlavička 1–5 řádků o současném stavu (historie patří jen do CHANGELOG).
4. Neměň nesouvisející funkčnost: živý zápis (střely, góly, časomíra, tresty), pokladnu, statistiky, docházku. Když úkol vyžaduje zásah jinde, nejdřív upozorni a zeptej se. Změna peněz nebo pravidel = v CHANGELOG označit „⚠️ SAHÁ NA PLATBY“.
5. Data jen přidávej (merge), stará pole maž až o verzi později. Pravidla v pořadí: rozšířit → převést → zúžit. U každé verze napiš, zda a kdy publikovat firestore.rules a zda nastavit 🔒 Vyžadovat verzi.
6. Vydání verze – vždy vše najednou:
   - src/core/app-version.js (APP_VERSION, APP_DATE),
   - package.json (version),
   - sw.js (hokej-vNN +1; teď je v74, další v75),
   - CHANGELOG.md (nahoře postup nasazení, Přidáno / Změněno / Opraveno / Beze změny),
   - README.md (řádek „Aktuální verze“),
   - src/views/help.js (při změně ovládání),
   - docs/plan-v18.md (Stav a tabulka).
7. Ověření před odevzdáním:
   - npm test projde celý, nová logika v domain/ má nové testy,
   - kouřový test v jsdom MIMO repozitář (scratchpad, npm i jsdom) pro dotčené role: start bez chyb, dotčené obrazovky, zápisy jdou jen tam, kam mají (aplikace se vykreslí až po načtení kolekcí players, matches, staff, opponents, events, attendance – v `__fb.data` je zadej aspoň prázdné; záložka Události má klíč `S.tab = "ev"`; zástupce Firebase z tests/support neumí dotazy `where` – pro hostujícího / hráčku si v scratchpadu udělej kopii zástupce s filtrováním a vlastní hooks; `MutationObserver` vezmi z jsdom),
   - do CHANGELOG napiš, co bylo ověřeno.
8. Aplikace musí po každé verzi zůstat funkční. Malé verze, po každé následuje můj test na Androidu.

## 6. Šetření limitu
- Žádní subagenti, žádné opakované čtení stejných souborů, žádné výpisy celých souborů do odpovědi.
- Hledej přes grep -n, čti jen výřezy, upravuj cílenými editacemi. Testy pouštěj s filtrem (grep -E "^not ok|# (pass|fail)").
- Ptej se jen na kritická rozhodnutí; jinak platí návrh v plánu.
- Odpověď na konci: načtená verze, nová verze, zip, postup nasazení v několika bodech, výsledek testů. Bez dlouhého vysvětlování.

## 7. Úkol
Načti repozitář (bod 1), vypiš verzi, zeptej se na výsledek testu v19.9 – v20.2 (pokud není uvedeno) a pak pokračuj další verzí v pořadí (OM1 – v20.3 modulární práva).
