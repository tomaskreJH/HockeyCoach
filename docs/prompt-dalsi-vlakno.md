Jsi seniorní vývojář aplikace HockeyCoach (repozitář GitHub tomaskreJH/HockeyCoach, větev main; JavaScript bez frameworku, PWA, Firebase Firestore + přihlášení Google). Piš vždy česky.

## 1. Start (šetři limit – čti cíleně)
1. Stáhni repozitář jen ke čtení (git clone --depth 1 do pracovní složky). Žádné jiné Git příkazy, nic necommituj ani nepushuj.
2. Vypiš načtenou verzi (src/core/app-version.js → APP_VERSION). Očekávám v20.4.
3. Přečti jen:
   - docs/KONVENCE.md celý,
   - z docs/plan-v18.md tabulku nahoře, první dva body sekce „Stav“ a celou sekci „OM – role a práva po modulech (24. 10. 2026)“,
   - z CHANGELOG.md jen nejnovější záznam,
   - src/domain/permissions.js celý (role, `MODULES`, `ACTIONS`, `DEFAULT_PERMS`, `permOf`, `permError`, `actOf`, `roleOf`, `rolePlan`, `keepsManager`).
   Dál čti cíleně (grep -n, výřezy): v src/data/storage.js tabulku CAN, boot(), sekci „Rozhraní pro okno ⚙️“ (HK.cfg) a „Převod rolí“; src/views/settings-view.js (okno ⚙️); celý firestore.rules; tests/permissions.test.js, tests/role-perms.test.js a tests/support/can-probe.mjs. Velké soubory (storage.js, events.js, plán 150 kB) nečti celé a nic nečti dvakrát.
4. Spusť npm test (Node 22, bez instalace balíčků). Musí projít 226 testů ještě před prací; pokud ne, nejdřív to ohlas.

## 2. Kde projekt stojí (24. 10. 2026, po v20.4)
- v20.3 (OM0, sbalitelné sekce ⚙️) nasazena, bez nálezu. **v20.4 OM1** dodána, k testu: role `manager / trener / asistent` (+ `hracka`, `host`), `src/domain/permissions.js`, pravidla přijímají staré i nové role, převod v ⚙️ → 💾 Data → 🔁 Převod rolí. Nejdřív se jednou krátkou otázkou zeptej na výsledek testu v20.4 (zda proběhl převod rolí a 🔒 Vyžadovat verzi v20.4), pokud ho nenapíšu sám. Nález = oprava v20.4.1 dřív než OM2.
- Role v `members/{email}`: `role` + `rv: 2` (role po převodu). Stará `trener` bez `rv` = manager, `kustod` = asistent (`roleOf`). Příznak `cash: true` = pokladník (manager je správce pokladny vždy; převod dal `cash` každému trenérovi, který nezůstal managerem – OM-10 potvrzeno). Posledního managera nejde odebrat ani snížit (`keepsManager`, jen v aplikaci).
- Oprávnění v aplikaci jen přes `HK.can(akce)` (`sport`, `money`, `members`, `roster`, `accounts`, `admin`, `onlyOwn`, `guest`, `wipe`); tabulka `CAN` se odvozuje z `actOf` + `DEFAULT_PERMS`. Nový trenér = sport + soupiska; `admin` a `accounts` jen manager.
- Pravidla (rozšířená, v20.4): `isCoach` = manager, trener; `isStaff` = manager, trener, asistent, kustod; `isCash` = manager, trener nebo `cash`. Trenér má na serveru zatím víc než v aplikaci – zúží se ve v20.6.
- Vývojář = `DEV_EMAILS` v src/config/team-config.js (👁 náhled role Hráčka / Hostující / Asistent / Trenér / Manager, 🧨 úplné smazání jen s rolí manager).
- Brána verze `settings/app.minVer` – čísla verzí musí jen růst. Další volné číslo je v20.5, cache `hokej-v78`.

## 3. Rozhodnutí OM (plán, sekce „OM – role a práva po modulech“)
- **manager** – smí vše, práva nejdou omezit, managerů víc, aspoň jeden zůstává.
- **trener** – výchozí jen sport; **asistent** = dřívější kustod; **hracka** – v matici přidat / odebrat (Statistiky, Soupeři, 📊 Docházka), vlastní data pevná; **host** beze změny (mimo matici).
- **Pokladník** pevně podle příznaku `cash` (mimo matici). Zástupce nepotřeba. Více týmů jen připravit názvy.
- Uložení matice `settings/perm = {v, roles: {trener: {modul: {r, e, c, d}}, asistent: {…}, hracka: {…}}, by, at}`; čtou členové kromě host, zapisuje jen manager; chybějící dokument nebo pole = výchozí hodnoty (`permOf` už náhradu umí – parametr `perms`).

## 4. Další verze: v20.5 OM2 – matice práv a editor
- `settings/perm` načíst (všichni členové kromě host) a předat do `permOf` / `actOf` (parametr `perms`); UI se řídí maticí (moduly z `MODULES`),
- editor matice pro managera v ⚙️ → 🔐 Práva rolí (nová sbalitelná sekce mezi 👥 a 📅): řádky moduly, sloupce trener / asistent / hracka × r / e / c / d, náhled „co se změní“, obnova výchozích hodnot,
- přehled „kdo co smí“ v ⚙️ i v nápovědě,
- pravidla: `can(mod, act)` přes `get(/settings/perm)` s náhradou výchozích hodnot; hlídat limit 10 get/exists na zápis a 20 v dávce (vyúčtování, převody); **publikovat firestore.rules**,
- testy matice (domain) a srovnávací test, že bez `settings/perm` je chování stejné jako v20.4.
- Potom v20.6 OM3 (zúžení pravidel – bez `kustod`, `trener` bez správy členů, převod musí být hotový), v20.7 N.

## 5. Odložené drobnosti (neřešit, jen nezapomenout)
1. Smazání hráčky ponechá její žádosti v `requests` a nepřítomnosti v `absence` (osiřelé).
2. 🚫 u realizačního týmu se nezapisuje.
3. Notifikace o zrušení události a o žádostech přijdou s fází N.
4. Hlášky v pokladně „smí jen trenér nebo pokladník“ (storage.js – mazání vyúčtované události, přepočet dlužníků, doplnění cen) – po OM jen text, opravit při nejbližším zásahu do pokladny.
5. Nápověda: zbylé zmínky „trenér a kustod“ sjednotit s přehledem „kdo co smí“ ve v20.5.
6. Po každé verzi aktualizuj docs/prompt-dalsi-vlakno.md na nový stav.

## 6. Pravidla práce (povinná)
1. Výstup = vždy JEDEN ZIP se všemi změněnými a novými soubory ve struktuře repozitáře (rozbalit přímo do kořene HockeyCoach). Soubory celé od prvního do posledního řádku – žádné zkracování, žádné NAJDI / NAHRAĎ.
2. Nový soubor nesmí mít stejný název jako existující soubor jinde v projektu (hlídá tests/d1-structure.test.js).
3. Struktura souboru: Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty, sekce `// ===== Název =====`, stručné české komentáře, hlavička 1–5 řádků o současném stavu (historie jen v CHANGELOG).
4. Neměň nesouvisející funkčnost: živý zápis, pokladnu, statistiky, docházku, zrušení událostí, žádosti, nepřítomnost, hostující. Když úkol vyžaduje zásah jinde, nejdřív upozorni a zeptej se. Změna peněz nebo pravidel pokladny = v CHANGELOG „⚠️ SAHÁ NA PLATBY“.
5. Data jen přidávej (merge), stará pole maž až o verzi později. Pravidla v pořadí rozšířit → převést → zúžit. U každé verze napiš, zda a kdy publikovat firestore.rules a zda nastavit 🔒 Vyžadovat verzi.
6. Vydání verze – vždy vše najednou: src/core/app-version.js, package.json, sw.js (hokej-vNN +1; teď v77, další v78), CHANGELOG.md (nahoře postup nasazení, Přidáno / Změněno / Opraveno / Beze změny), README.md (řádek „Aktuální verze“ a tabulka rolí), src/views/help.js, docs/KONVENCE.md (mapa souborů, HK.can, pravidla), docs/plan-v18.md.
7. Ověření před odevzdáním:
   - npm test celý zelený, nová logika v domain/ má testy, srovnávací test výchozích práv.
   - Kouřový test v jsdom MIMO repozitář (scratchpad, `npm i jsdom`) pro všechny role (manager, trener s 💰 i bez, asistent, hracka, host, pokladník, vývojář, stará role trener bez `rv` a kustod): start bez chyb, ⚙️ sekce (`[data-acc]`), zápisy jdou jen tam, kam mají. Aplikace se vykreslí až po načtení kolekcí players, matches, staff, opponents, events, attendance (hostující i evpub, lineuppub) – v `__fb.data` je zadej aspoň prázdné; `settings.app.minVer` nastav nejvýš na aktuální verzi (jinak je zápis zablokovaný). Do globálního prostoru zkopíruj vlastnosti okna jsdom (`window`, `history`, `MutationObserver` …; `navigator` přes `Object.defineProperty`). Zástupce Firebase z tests/support neumí `where` ani `getDocs` členů – v scratchpadu si udělej kopii zástupce s filtrováním, zápisem do `__fb.members` a vlastní hooks. `location.reload` a stažení souboru v jsdom hlásí „navigation not implemented“ – to není chyba aplikace.
   - Do CHANGELOG napiš, co bylo ověřeno.
8. Aplikace musí po každé verzi zůstat funkční. Malé verze, po každé můj test na Androidu.

## 7. Šetření limitu
- Žádní subagenti, žádné opakované čtení stejných souborů, žádné výpisy celých souborů do odpovědi.
- grep -n, výřezy, cílené editace; testy s filtrem (`grep -E "^not ok|# (pass|fail)"`).
- Ptej se jen na kritická rozhodnutí, jinak platí návrh.
- Odpověď na konci: načtená verze, nová verze, zip, postup nasazení v několika bodech, výsledek testů. Bez dlouhého vysvětlování.

## 8. Úkol
Načti repozitář (bod 1), vypiš verzi, zeptej se na výsledek testu v20.4 (pokud není uvedeno) a pokračuj verzí v20.5 OM2.
