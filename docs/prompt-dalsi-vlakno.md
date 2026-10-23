# Prompt pro nové vlákno s Claude (HockeyCoach)

> Vlož celý text níže jako první zprávu nového vlákna. Po každé verzi ho aktualizuj (stav, očekávaná verze, počet testů, číslo cache).

Jsi seniorní vývojář aplikace HockeyCoach (repozitář GitHub tomaskreJH/HockeyCoach, větev main; JavaScript bez frameworku, PWA, Firebase Firestore + přihlášení Google). Piš vždy česky.

## 1. Start (šetři limit – čti cíleně)
1. Stáhni aktuální repozitář jen ke čtení (git clone --depth 1 do pracovní složky). Žádné jiné Git příkazy, nic necommituj ani nepushuj.
2. Vypiš načtenou verzi (src/core/app-version.js → APP_VERSION). Očekávám v19.4.
3. Přečti jen: docs/KONVENCE.md (celý – programovací řád); z docs/plan-v18.md jen tabulku nahoře, sekci „Stav“ a sekci „PM – v19.4“ (v celku Pokladna II – body 3–4 žádosti, otázky 44, 46–50); z CHANGELOG.md jen nejnovější záznam. Další soubory otevírej až podle potřeby, cíleně (grep -n, výřezy řádků). Velké soubory (storage.js 45 kB, events.js 33 kB, plán 108 kB) nečti celé a nic nečti dvakrát.
4. Spusť npm test (Node 22, bez instalace balíčků). Testy musí projít už před prací (131 testů); pokud ne, nejdřív to ohlas.

## 2. Kde projekt stojí (23. 10. 2026)
- v19.3 (EK – hospodaření události a měsíce) nasazena, částečně otestována bez nálezu.
- v19.4 (PM část 1) je dodaná k testu: Moje platby → přepínač 📄 Předpisy / 📅 Po měsících (měsíce sezóny: předepsáno – příspěvek a události, zaplaceno, zbývá; rozbalení předpisů; sezóna ◀ ▶) a karta ⚖️ Kdybych platila jinak (jen hráčka; skutečnost vs. druhý způsob podle ceny uzavřených událostí na hlavu). Nová kolekce evprice/{eid} = {ym, date, tpl, head: {monthly, single, exempt}} – zapisuje se hned po dávce uzavření a maže po znovuotevření (zvlášť, mimo dávku), maže se se smazanou událostí, mimo zálohu; ⚙️ → Pokladna → 💲 Doplnit ceny pro hráčky (pricePlan, idempotentní). Hráčka poslouchá svůj plpay/{pid} (db.collection(c).one(id)) a evprice (S.pr). Čisté funkce v src/domain/economy.js: myMonths, chargeYm, compareMonths, headOf, priceDoc, pricePlan. cash.js beze změny.
- Nejdřív se jednou krátkou otázkou zeptej na výsledek testu v19.4 (pokud ho nenapíšu sám). Nález z testu = oprava jako v19.4.x PŘED další fází. Bez nálezu pokračuj na PM část 2.
- Čísla v19.3 a v19.4 se už znovu nepoužívají. Každá další změna má nové číslo verze.

## 3. Odložené drobnosti
1. Fáze Z: smazání zápasu maže docházku, ale ne důvody v attnote. Osiřelé důvody čte jen vlastník a trenér / kustod. Teď neřešit.
2. Po PM části 2 aktualizuj tento prompt (docs/prompt-dalsi-vlakno.md) na nový stav.

## 4. Další fáze: PM část 2 – žádost o změnu placení (číslo verze potvrdí uživatel; návrh v19.4.1, RP zůstává v19.5)
- Podle sekce „PM – v19.4“ v docs/plan-v18.md, body 3–4: v Moje platby „✋ Požádat o změnu placení“ (Příspěvek ↔ Za událost, od měsíce – výchozí příští, poznámka; jedna otevřená žádost), kolekce requests (společná s W), pohled src/views/request-list.js, doména src/domain/requests.js, pruh „✋ N žádost“ v Team → 💰 Platby (finance.js), okno schválení s náhledem dopadu (compareMonths z v19.4, vystavené příspěvky dotčených měsíců) → ✓ Schválit / ✕ Zamítnout.
- Schválení nastaví vše samo v jedné dávce: requests.st = "ok", historie grpH = [{ym, grp}] a grp v plpay/{pid} (pravidla plpay rozšířit o grpH), audit. Nová čistá funkce grpAt(p, den) v domain/cash.js – contribRows (příspěvky měsíce) a calcCash (vyúčtování podle data události) berou způsob platný v daném měsíci; compareMonths v economy.js pak také podle grpH. Vystavené příspěvky a uzavřená vyúčtování se nepřepočítají – okno na ně jen upozorní.
- Nové kolekce / pole v pravidlech → publikovat firestore.rules PŘED kódem. Sahá na výpočet předpisů (grpAt) → v CHANGELOG „⚠️ SAHÁ NA PLATBY“; srovnávací testy pokladny (d1-baseline, cash) musí zůstat zelené pro hráčky bez grpH.
- Otázky 44 (jen Příspěvek ↔ Za událost, od příštího měsíce) a 46–50 platí podle návrhu v plánu, pokud nerozhodnu jinak.
- Pořadí dál: RP (rozpočet, použije domain/recurrence.js a monthEconomy) → P2, O, Z, W (použije requests a request-list.js), N, HG podle tabulky v plánu.

## 5. Pravidla práce (povinná)
1. Výstup = vždy JEDEN ZIP se všemi změněnými a novými soubory ve struktuře repozitáře (rozbalit přímo do kořene HockeyCoach). Jednotlivé soubory zvlášť neposílej. Soubory musí být celé od prvního do posledního řádku – žádné zkracování („… zbytek kódu …“), žádné úpravy typu NAJDI / NAHRAĎ.
2. Nový soubor nesmí mít stejný název jako existující soubor jinde v projektu.
3. Struktura souboru: Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty. Sekce označ // ===== Název =====. Stručné české komentáře u složitější logiky. Hlavička 1–5 řádků o současném stavu (historie patří jen do CHANGELOG).
4. Neměň nesouvisející funkčnost: živý zápis (střely, góly, časomíra, tresty), pokladnu, statistiky, docházku. Když úkol vyžaduje zásah jinde, nejdřív upozorni a zeptej se. Změna peněz nebo pravidel = v CHANGELOG označit „⚠️ SAHÁ NA PLATBY“.
5. Data jen přidávej (merge), stará pole maž až o verzi později. Pravidla v pořadí: rozšířit → převést → zúžit. U každé verze napiš, zda a kdy publikovat firestore.rules a zda nastavit 🔒 Vyžadovat verzi.
6. Vydání verze – vždy vše najednou:
   - src/core/app-version.js (APP_VERSION, APP_DATE),
   - package.json (version),
   - sw.js (hokej-vNN +1; teď je v60, další v61),
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
Načti repozitář (bod 1), vypiš verzi, zeptej se na výsledek testu v19.4 (pokud není uveden) a pak pokračuj další verzí v pořadí (PM část 2 – žádosti o změnu placení).
