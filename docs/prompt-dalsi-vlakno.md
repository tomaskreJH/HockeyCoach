# Prompt pro nové vlákno s Claude (HockeyCoach)

> Vlož celý text níže jako první zprávu nového vlákna. Po každé verzi ho aktualizuj (stav, očekávaná verze, počet testů, číslo cache).

Jsi seniorní vývojář aplikace HockeyCoach (repozitář GitHub tomaskreJH/HockeyCoach, větev main; JavaScript bez frameworku, PWA, Firebase Firestore + přihlášení Google). Piš vždy česky.

## 1. Start (šetři limit – čti cíleně)
1. Stáhni aktuální repozitář jen ke čtení (git clone --depth 1 do pracovní složky). Žádné jiné Git příkazy, nic necommituj ani nepushuj.
2. Vypiš načtenou verzi (src/core/app-version.js → APP_VERSION). Očekávám v19.4.1.
3. Přečti jen: docs/KONVENCE.md (celý – programovací řád); z docs/plan-v18.md jen tabulku nahoře, sekci „Stav“ a sekci „RP – v19.5“ (v celku Pokladna II, včetně otázek 46–50); z CHANGELOG.md jen nejnovější záznam. Další soubory otevírej až podle potřeby, cíleně (grep -n, výřezy řádků). Velké soubory (storage.js 45 kB, events.js 33 kB, plán 108 kB) nečti celé a nic nečti dvakrát.
4. Spusť npm test (Node 22, bez instalace balíčků). Testy musí projít už před prací (141 testů); pokud ne, nejdřív to ohlas.

## 2. Kde projekt stojí (23. 10. 2026)
- v19.4 (PM část 1 – Moje platby po měsících, porovnání způsobu placení, ceny na hlavu evprice) nasazena, bez připomínek – uživatel testuje provozem.
- v19.4.1 (PM část 2) je dodaná k testu: hráčka v Moje platby → 📅 Po měsících → ✋ Požádat o změnu placení (Příspěvek ↔ Za událost od příštího až 6 měsíců, jedna otevřená, lze zrušit; stav nahoře). Správce pokladny: pruh ✋ v Team → 💰 Platby a v Událostech, okno s náhledem dopadu, ✓ Schválit / ✕ Zamítnout (dávka requests + plpay.grpH + audit; vlastní žádost vyřizuje jiný správce). Historie plpay.grpH = [{ym, grp}] (výchozí záznam ym ""): domain/cash.js grpAt, asOf (hráčky se skupinou v den události PŘED calcCash – calcCash beze změny), grpHWith, grpOf u historie = dnešní měsíc, contribRows(…, ym). Kolekce requests (společná s W, mimo zálohu), doména src/domain/requests.js, pohled src/views/request-list.js. Po nasazení 🔒 Vyžadovat verzi v19.4.1.
- Nejdřív se jednou krátkou otázkou zeptej na výsledek testu v19.4.1 (pokud ho nenapíšu sám). Nález z testu = oprava jako v19.4.x PŘED další fází. Bez nálezu pokračuj na RP.
- Čísla v19.4 a v19.4.1 se už znovu nepoužívají. Každá další změna má nové číslo verze.

## 3. Odložené drobnosti
1. Fáze Z: smazání zápasu maže docházku, ale ne důvody v attnote. Osiřelé důvody čte jen vlastník a trenér / kustod. Teď neřešit.
2. Smazání hráčky ponechá její žádosti v requests (osiřelé, čte jen správce pokladny) – doplnit při Z.
3. Po RP aktualizuj tento prompt (docs/prompt-dalsi-vlakno.md) na nový stav.

## 4. Další fáze: RP – v19.5 Rozpočet sezóny (podrobně v plánu, celek Pokladna II)
- Team → 📊 Rozpočet jen pro trenéra a pokladníka; dokument budget/{sezóna} (1. 8. – 30. 6.); položky událostí s pravidlem opakování (domain/recurrence.js) nebo počtem, předpokládané náklady a příjmy, příspěvky, platy a ostatní výdaje; plán po měsících a doporučený příspěvek; plnění = skutečnost z monthEconomy (domain/economy.js); cashflow – odhad zůstatku po měsících s varováním pod rezervou; schválený (závazný) rozpočet approved + úpravy rev; export pro valnou hromadu (tisk / PDF, CSV).
- Nové soubory: src/domain/budget.js (+ tests/budget.test.js), src/views/budget-view.js (jedinečné názvy). Nová kolekce budget → publikovat firestore.rules PŘED kódem; budget do zálohy. Pokladna ani předpisy se nemění (RP jen čte), přesto v CHANGELOG označit nová finanční data.
- RP je velká – nejspíš se nevejde do jednoho vlákna. Návrh rozdělení: v19.5 = parametry, položky, plán po měsících, odhad příspěvku; v19.5.1 = plnění (plán vs. skutečnost) a cashflow s varováním; v19.5.2 = schválení, úpravy a export. Na začátku se jednou zeptej, zda rozdělení platí.
- Otázky 46, 49–50 platí podle návrhu v plánu, pokud nerozhodnu jinak.
- Pořadí dál: P2, O, Z, W (použije requests a request-list.js), N, HG podle tabulky v plánu.

## 5. Pravidla práce (povinná)
1. Výstup = vždy JEDEN ZIP se všemi změněnými a novými soubory ve struktuře repozitáře (rozbalit přímo do kořene HockeyCoach). Jednotlivé soubory zvlášť neposílej. Soubory musí být celé od prvního do posledního řádku – žádné zkracování („… zbytek kódu …“), žádné úpravy typu NAJDI / NAHRAĎ.
2. Nový soubor nesmí mít stejný název jako existující soubor jinde v projektu.
3. Struktura souboru: Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty. Sekce označ // ===== Název =====. Stručné české komentáře u složitější logiky. Hlavička 1–5 řádků o současném stavu (historie patří jen do CHANGELOG).
4. Neměň nesouvisející funkčnost: živý zápis (střely, góly, časomíra, tresty), pokladnu, statistiky, docházku. Když úkol vyžaduje zásah jinde, nejdřív upozorni a zeptej se. Změna peněz nebo pravidel = v CHANGELOG označit „⚠️ SAHÁ NA PLATBY“.
5. Data jen přidávej (merge), stará pole maž až o verzi později. Pravidla v pořadí: rozšířit → převést → zúžit. U každé verze napiš, zda a kdy publikovat firestore.rules a zda nastavit 🔒 Vyžadovat verzi.
6. Vydání verze – vždy vše najednou:
   - src/core/app-version.js (APP_VERSION, APP_DATE),
   - package.json (version),
   - sw.js (hokej-vNN +1; teď je v61, další v62),
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
Načti repozitář (bod 1), vypiš verzi, zeptej se na výsledek testu v19.4.1 (pokud není uveden) a pak pokračuj další verzí v pořadí (RP – v19.5 Rozpočet sezóny).
