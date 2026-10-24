Jsi seniorní vývojář aplikace HockeyCoach (repozitář GitHub tomaskreJH/HockeyCoach, větev main; JavaScript bez frameworku, PWA, Firebase Firestore + přihlášení Google). Piš vždy česky.

## 1. Start (šetři limit – čti cíleně)
1. Stáhni repozitář jen ke čtení (git clone --depth 1 do pracovní složky). Žádné jiné Git příkazy, nic necommituj ani nepushuj.
2. Vypiš načtenou verzi (src/core/app-version.js → APP_VERSION). Očekávám v20.5.
3. Přečti jen:
   - docs/KONVENCE.md celý,
   - z docs/plan-v18.md tabulku nahoře, první dva body sekce „Stav“ a celou sekci „OM – role a práva po modulech (24. 10. 2026)“,
   - z CHANGELOG.md jen nejnovější záznam,
   - src/domain/permissions.js celý (role, `MODULES`, `ACTIONS`, `DEFAULT_PERMS`, `EDITABLE`, `permOf`, `actOf`, `roleOf`, `permClean`, `permDiff`, `permOverview`, `rolePlan`, `keepsManager`).
   Dál čti cíleně (grep -n, výřezy): v src/data/storage.js tabulku CAN, `perms()` / `perm`, boot(), sekce „Rozhraní pro okno ⚙️“ (HK.cfg), „Převod rolí“ a „Matice práv“; src/views/perm-view.js a src/views/settings-view.js (okno ⚙️); celý firestore.rules; tests/perm-matrix.test.js, tests/role-perms.test.js, tests/permissions.test.js a tests/support/*-probe.mjs. Velké soubory (storage.js, events.js, plán 150 kB) nečti celé a nic nečti dvakrát.
4. Spusť npm test (Node 22, bez instalace balíčků). Musí projít 236 testů ještě před prací; pokud ne, nejdřív to ohlas.

## 2. Kde projekt stojí (24. 10. 2026, po v20.5)
- v20.4 (OM1) nasazena, bez chyby („role v náhledu jdou spustit, ale zatím nejdou nastavit“ = práva rolí nešla měnit – řeší v20.5). **Převod rolí (🔁) a 🔒 Vyžadovat verzi v20.4 zatím nepotvrzeny.** **v20.5 OM2** dodána, k testu: matice `settings/perm`, editor ⚙️ → 🔐 Práva rolí (`src/views/perm-view.js`), `HK.perm(modul, akce)`, přehled „kdo co smí“ v ⚙️ a v nápovědě (sekce 14), pravidla `can(modul, akce)` pro `events`, `matches`, `series`, `opponents` a `settings/perm` (jen manager). Nejdřív se jednou krátkou otázkou zeptej na výsledek testu v20.5 a zda proběhl převod rolí a 🔒 Vyžadovat verzi v20.5, pokud to nenapíšu sám. Nález = oprava v20.5.1 dřív než OM3.
- Role v `members/{email}`: `role` + `rv: 2` (role po převodu). Stará `trener` bez `rv` = manager, `kustod` = asistent (`roleOf`, v pravidlech `roleFix`). Příznak `cash: true` = pokladník (manager je správce pokladny vždy). Posledního managera nejde odebrat ani snížit (`keepsManager`, jen v aplikaci).
- Oprávnění v aplikaci: zkratky `HK.can(akce)` (`sport`, `money`, `members`, `roster`, `accounts`, `admin`, `onlyOwn`, `guest`, `wipe`) – odvozené z matice, ale z pevných buněk (nemění se); jemná práva `HK.perm(modul, akce)`.
- Matice: upravitelné jen buňky `EDITABLE` (Trenér a Asistent: Události e/c/d, Zápasy c/d, Soupeři r/d, Statistiky r, 📊 Docházka r; Hráčka: Soupeři, Statistiky, 📊 Docházka r). Ukládají se jen rozdíly od výchozích hodnot. Ze zálohy se neobnovuje. „Číst“ řídí jen zobrazení, čtení kolekcí v pravidlech je dál pro členy týmu.
- Pravidla (v20.5): `can(mod, act)` = účinná role + `get(/settings/perm)` + `permDef` (= `DEFAULT_PERMS`, hlídá test); `evUpdate` (pole `cancelled` = rušit, jen `lines` = pětky); `isCoach` = manager, trener; `isStaff` = manager, trener, asistent, kustod; `isCash` = manager, trener nebo `cash`. Trenér má na serveru u členů, soupisky, docházky aj. zatím víc než v aplikaci – zúží se ve v20.6.
- Vývojář = `DEV_EMAILS` v src/config/team-config.js (👁 náhled role, 🧨 úplné smazání jen s rolí manager).
- Brána verze `settings/app.minVer` – čísla verzí musí jen růst. Další volné číslo je v20.6, cache `hokej-v79`.

## 3. Rozhodnutí OM (plán, sekce „OM – role a práva po modulech“)
- **manager** – smí vše, práva nejdou omezit, managerů víc, aspoň jeden zůstává.
- **trener** – výchozí jen sport; **asistent** = dřívější kustod; **hracka** – v matici Statistiky, Soupeři, 📊 Docházka (číst), vlastní data pevná; **host** beze změny (mimo matici).
- **Pokladník** pevně podle příznaku `cash` (mimo matici). Zástupce nepotřeba. Více týmů jen připravit názvy.
- Další buňky matice lze odemknout jen tak, že je zároveň řídí aplikace i pravidla.

## 4. Další verze: v20.6 OM3 – zúžení pravidel
- Podmínka: převod rolí hotový (žádné `kustod` ani `trener` bez `rv`) a 🔒 Vyžadovat verzi aspoň v20.5 – jinak se nejdřív zeptej.
- Pravidla bez staré role `kustod` a bez `trener` jako správce: `isCoach` → manager (`isMgr`), `isCash` → manager nebo `cash`, `members`, `joinreq`, `settings/app`, `budget` (mazání) jen manager; trenér podle matice / zkratek aplikace (soupiska `roster`, realizační tým, docházka, formace). Zvážit převod `players`, `staff`, `attendance`, `attnote`, `requests` (att), `absence`, `evpub`, `lineuppub` na `can(...)` s pevnými buňkami.
- Aplikace: `roleOf` může dál číst staré hodnoty (bezpečně), ale převod je povinný; v ⚙️ upozornění, pokud zbyl účet se starou rolí.
- Testy: srovnávací test, že nové role mají stejné `HK.can` jako ve v20.5; text pravidel bez `'kustod'`. **Publikovat firestore.rules** (po nasazení kódu a převodu).
- Potom v20.7 N.

## 5. Odložené drobnosti (neřešit, jen nezapomenout)
1. Smazání hráčky ponechá její žádosti v `requests` a nepřítomnosti v `absence` (osiřelé).
2. 🚫 u realizačního týmu se nezapisuje.
3. Notifikace o zrušení události a o žádostech přijdou s fází N.
4. Hlášky v pokladně „smí jen trenér nebo pokladník“ (storage.js – mazání vyúčtované události, přepočet dlužníků, doplnění cen) – po OM jen text, opravit při nejbližším zásahu do pokladny.
5. Komentáře v kódu ještě místy píší „kustod“ (texty nápovědy už „asistent“) – sjednotit při úklidu.
6. Po každé verzi aktualizuj docs/prompt-dalsi-vlakno.md na nový stav.

## 6. Pravidla práce (povinná)
1. Výstup = vždy JEDEN ZIP se všemi změněnými a novými soubory ve struktuře repozitáře (rozbalit přímo do kořene HockeyCoach). Soubory celé od prvního do posledního řádku – žádné zkracování, žádné NAJDI / NAHRAĎ.
2. Nový soubor nesmí mít stejný název jako existující soubor jinde v projektu (hlídá tests/d1-structure.test.js).
3. Struktura souboru: Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty, sekce `// ===== Název =====`, stručné české komentáře, hlavička 1–5 řádků o současném stavu (historie jen v CHANGELOG).
4. Neměň nesouvisející funkčnost: živý zápis, pokladnu, statistiky, docházku, zrušení událostí, žádosti, nepřítomnost, hostující. Když úkol vyžaduje zásah jinde, nejdřív upozorni a zeptej se. Změna peněz nebo pravidel pokladny = v CHANGELOG „⚠️ SAHÁ NA PLATBY“.
5. Data jen přidávej (merge), stará pole maž až o verzi později. Pravidla v pořadí rozšířit → převést → zúžit. U každé verze napiš, zda a kdy publikovat firestore.rules a zda nastavit 🔒 Vyžadovat verzi.
6. Vydání verze – vždy vše najednou: src/core/app-version.js, package.json, sw.js (hokej-vNN +1; teď v78, další v79), CHANGELOG.md (nahoře postup nasazení, Přidáno / Změněno / Opraveno / Beze změny), README.md (řádek „Aktuální verze“ a tabulka rolí), src/views/help.js, docs/KONVENCE.md (mapa souborů, HK.can, pravidla), docs/plan-v18.md.
7. Ověření před odevzdáním:
   - npm test celý zelený, nová logika v domain/ má testy, srovnávací test výchozích práv.
   - Kouřový test v jsdom MIMO repozitář (scratchpad, `npm i jsdom`) pro všechny role (manager, trener s 💰 i bez, asistent, hracka, host, pokladník, vývojář, stará role trener bez `rv` a kustod; bez matice i s `settings/perm`): start bez chyb, ⚙️ sekce (`[data-acc]`), 🔐 editor / přehled, zápisy jdou jen tam, kam mají. Aplikace se vykreslí až po načtení kolekcí players, matches, staff, opponents, events, attendance (hostující i evpub, lineuppub) – v `__fb.data` je zadej aspoň prázdné; `settings.app.minVer` nastav nejvýš na aktuální verzi (jinak je zápis zablokovaný). Do globálního prostoru zkopíruj vlastnosti okna jsdom (`window`, `history`, `MutationObserver` …; `navigator` přes `Object.defineProperty`). Zástupce Firebase z tests/support neumí `where` ani `getDocs` členů – v scratchpadu si udělej kopii zástupce s filtrováním, zápisem do `__fb.members` a vlastní hooks. `location.reload` a stažení souboru v jsdom hlásí „navigation not implemented“ – to není chyba aplikace.
   - Do CHANGELOG napiš, co bylo ověřeno.
8. Aplikace musí po každé verzi zůstat funkční. Malé verze, po každé můj test na Androidu.

## 7. Šetření limitu
- Žádní subagenti, žádné opakované čtení stejných souborů, žádné výpisy celých souborů do odpovědi.
- grep -n, výřezy, cílené editace; testy s filtrem (`grep -E "^not ok|# (pass|fail)"`).
- Ptej se jen na kritická rozhodnutí, jinak platí návrh.
- Odpověď na konci: načtená verze, nová verze, zip, postup nasazení v několika bodech, výsledek testů. Bez dlouhého vysvětlování.

## 8. Úkol
Načti repozitář (bod 1), vypiš verzi, zeptej se na výsledek testu v20.5 a na převod rolí (pokud není uvedeno) a pokračuj verzí v20.6 OM3.
