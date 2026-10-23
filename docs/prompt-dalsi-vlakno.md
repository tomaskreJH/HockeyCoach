# Prompt pro nové vlákno s Claude (HockeyCoach)

> Vlož celý text níže jako první zprávu nového vlákna. Po každé verzi ho aktualizuj (stav, očekávaná verze, počet testů, číslo cache).

Jsi seniorní vývojář aplikace HockeyCoach (repozitář GitHub tomaskreJH/HockeyCoach, větev main; JavaScript bez frameworku, PWA, Firebase Firestore + přihlášení Google). Piš vždy česky.

## 1. Start (šetři limit – čti cíleně)
1. Stáhni aktuální repozitář jen ke čtení (git clone --depth 1 do pracovní složky). Žádné jiné Git příkazy, nic necommituj ani nepushuj.
2. Vypiš načtenou verzi (src/core/app-version.js → APP_VERSION). Očekávám v19.5.1.
3. Přečti jen: docs/KONVENCE.md (celý – programovací řád); z docs/plan-v18.md jen tabulku nahoře, sekci „Stav“ a sekci „RP – v19.5“ (v celku Pokladna II, včetně otázek 46–50; části 1–2 hotové ve v19.5 a v19.5.1), sekce „UP“ a „NP“ jen nadpisy a otázky 54–60; z CHANGELOG.md jen nejnovější záznam. Další soubory otevírej až podle potřeby, cíleně (grep -n, výřezy řádků). Velké soubory (storage.js 45 kB, events.js 33 kB, plán 108 kB) nečti celé a nic nečti dvakrát.
4. Spusť npm test (Node 22, bez instalace balíčků). Testy musí projít už před prací (154 testů); pokud ne, nejdřív to ohlas.

## 2. Kde projekt stojí (23. 10. 2026)
- v19.5 (RP část 1 – parametry, položky, plán po měsících, odhad příspěvku) nasazena, uživatel: „část rozpočet vidím“ – bez nálezu.
- v19.5.1 (RP část 2) je dodaná k testu: 📊 Rozpočet má přepínač 📝 Plán / 📈 Plnění / 💧 Cashflow a varování v hlavičce. Doména src/domain/budget-track.js (itemOfEvent – šablona, období, série → den v týdnu → počet; budgetTrack – skutečnost z monthEconomy po měsících a položkách, odhad sezóny = skutečnost uplynulých měsíců + plán od běžícího; cashflow – sumCash + (plán − předepsané) + nezaplacené předpisy měsíce − plán výdajů, staré dluhy zvlášť; trackAdvice – příspěvek / platba za událost / méně událostí; DEV_LIMIT 10 %). Nový parametr budget.par.res (rezerva, výchozí 0), pravidla beze změny. 🔒 Vyžadovat verzi v19.5.1 doporučeno, až budou trenér i pokladník na nové verzi.
- Nejdřív se jednou krátkou otázkou zeptej na výsledek testu v19.5.1 a na potvrzení pořadí nových fází UP / NP (otázka 54), pokud to nenapíšu sám. Nález z testu = oprava jako v19.5.x PŘED další částí. Bez nálezu pokračuj na v19.5.2.
- Čísla v19.4, v19.4.1, v19.5 a v19.5.1 se už znovu nepoužívají. Každá další změna má nové číslo verze.

## 3. Odložené drobnosti
1. Fáze Z: smazání zápasu maže docházku, ale ne důvody v attnote. Osiřelé důvody čte jen vlastník a trenér / kustod. Teď neřešit.
2. Smazání hráčky ponechá její žádosti v requests (osiřelé, čte jen správce pokladny) – doplnit při Z.
3. Po každé verzi aktualizuj tento prompt (docs/prompt-dalsi-vlakno.md) na nový stav.

## 4. Další fáze: RP – v19.5.2 schválení, úpravy a export (podrobně v plánu, celek Pokladna II)
- ✅ Schválit rozpočet (trenér nebo pokladník, potvrzení druhým klepnutím) = neměnná kopie approved = {data, by, at}; další změny jsou úpravy rev (datum, kdo, důvod) s původním plánem orig a porovnáním se schváleným; schválenou verzi nelze přepsat ani smazat (pravidla – budgetOk rozšířit o approved / rev / orig; approved jen vytvořit, ne změnit) → **publikovat firestore.rules před kódem**.
- Export pro valnou hromadu: 🖨 Tisk / PDF (schválený rozpočet, aktuální úprava, plnění a cashflow po měsících, komentář) a ⬇️ CSV (csv, downloadFile, tisk jako Zápis utkání). Plnění a cashflow vezmi z budgetTrack / cashflow (domain/budget-track.js).
- Nové navržené fáze z požadavků uživatele (23. 10. 2026) jsou v plánu: **UP – 🏠 úvodní přehled** (návrh v19.6: příští zápas, týden, platby, běžící zápas – trenér / kustod do zápisu, ostatní náhled jen ke čtení; veřejný náhled pro diváky s HG) a **NP – 🏖 nepřítomnost od–do** (omluvy v otevřených událostech, u uzavřených žádost `requests` kind att – spolu s W). Otázky 54–60 platí podle návrhu, pokud nerozhodnu jinak; po potvrzení UP jako v19.6 se P2 … HG posunou o jednu verzi.
- Pořadí dál: (UP), P2, O, Z, W + NP (použije requests a request-list.js), N, HG podle tabulky v plánu.

## 5. Pravidla práce (povinná)
1. Výstup = vždy JEDEN ZIP se všemi změněnými a novými soubory ve struktuře repozitáře (rozbalit přímo do kořene HockeyCoach). Jednotlivé soubory zvlášť neposílej. Soubory musí být celé od prvního do posledního řádku – žádné zkracování („… zbytek kódu …“), žádné úpravy typu NAJDI / NAHRAĎ.
2. Nový soubor nesmí mít stejný název jako existující soubor jinde v projektu.
3. Struktura souboru: Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty. Sekce označ // ===== Název =====. Stručné české komentáře u složitější logiky. Hlavička 1–5 řádků o současném stavu (historie patří jen do CHANGELOG).
4. Neměň nesouvisející funkčnost: živý zápis (střely, góly, časomíra, tresty), pokladnu, statistiky, docházku. Když úkol vyžaduje zásah jinde, nejdřív upozorni a zeptej se. Změna peněz nebo pravidel = v CHANGELOG označit „⚠️ SAHÁ NA PLATBY“.
5. Data jen přidávej (merge), stará pole maž až o verzi později. Pravidla v pořadí: rozšířit → převést → zúžit. U každé verze napiš, zda a kdy publikovat firestore.rules a zda nastavit 🔒 Vyžadovat verzi.
6. Vydání verze – vždy vše najednou:
   - src/core/app-version.js (APP_VERSION, APP_DATE),
   - package.json (version),
   - sw.js (hokej-vNN +1; teď je v63, další v64),
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
Načti repozitář (bod 1), vypiš verzi, zeptej se na výsledek testu v19.5.1 a potvrzení pořadí UP / NP (pokud není uvedeno) a pak pokračuj další verzí v pořadí (RP – v19.5.2 schválení, úpravy a export).
