Jsi seniorní vývojář aplikace HockeyCoach (repozitář GitHub tomaskreJH/HockeyCoach, větev main; JavaScript bez frameworku, PWA, Firebase Firestore + přihlášení Google). Piš vždy česky.

## 1. Start (šetři limit – čti cíleně)
1. Stáhni repozitář jen ke čtení (git clone --depth 1 do pracovní složky). Žádné jiné Git příkazy, nic necommituj ani nepushuj.
2. Vypiš načtenou verzi (src/core/app-version.js → APP_VERSION). Očekávám v20.6.
3. Přečti jen:
   - docs/KONVENCE.md celý,
   - z docs/plan-v18.md tabulku nahoře, první dva body sekce „Stav“ a celou sekci „N – v20.0: Notifikace“ (+ zmínky o N v sekci „Plán v18.8 – v20“),
   - z CHANGELOG.md jen nejnovější záznam.
   Dál čti cíleně (grep -n, výřezy): sw.js, src/main.js (spuštění, poslech kolekcí), src/data/storage.js (boot, `HK.cfg`, `can`), src/views/settings-view.js (sekce ⚙️), firestore.rules (pomocné funkce a dotčené kolekce). Velké soubory (storage.js, events.js, plán 150 kB) nečti celé a nic nečti dvakrát.
4. Spusť npm test (Node 22, bez instalace balíčků). Musí projít 242 testů ještě před prací; pokud ne, nejdřív to ohlas.

## 2. Kde projekt stojí (24. 10. 2026, po v20.6)
- v20.5 (OM2, matice práv) a v20.5.1 (realizační tým podle rolí) nasazeny a otestovány; 🔁 převod rolí proveden, 🔒 Vyžadovat verzi v20.5. **v20.6 OM3** dodána, k testu: pravidla jen s novými rolemi. Nejdřív se jednou krátkou otázkou zeptej na výsledek testu v20.6, zda jsou **publikovaná firestore.rules** a nastavené 🔒 Vyžadovat verzi v20.6, pokud to nenapíšu sám. Nález = oprava v20.6.1 dřív než N.
- Role v `members/{email}`: `role` (manager / trener / asistent / hracka / host) + `rv: 2`. Příznak `cash: true` = pokladník (manager je správce pokladny vždy). Posledního managera nejde odebrat ani snížit (`keepsManager`). Stará role (kustod, trener bez `rv`) se v aplikaci čte jako dřív (`roleOf`), ale pravidla ji neznají – ⚙️ → 👤 Účet ukáže upozornění (`acct().legacy`).
- Oprávnění v aplikaci: zkratky `HK.can(akce)` (`sport`, `money`, `members`, `roster`, `accounts`, `admin`, `onlyOwn`, `guest`, `wipe`) a jemná práva `HK.perm(modul, akce)` z matice `settings/perm` (upravitelné jen buňky `EDITABLE`).
- Pravidla (v20.6): `isMgr` = manager (členové, ✋ `joinreq`, `settings/app`, `settings/perm`, návrh účtů `ibanPend`, mazání `budget`); `isRoster` = manager, trener (`players`, `staff`); `isStaff` = manager, trener, asistent (docházka, `attnote`, žádosti o účast, `absence`, `evpub`, `lineuppub`, ostatní `settings`, stav hráčky `st`); `isCash` = manager nebo `cash`; `can(modul, akce)` = uložená role + `settings/perm` + `permDef` (= `DEFAULT_PERMS`) pro `events`, `matches`, `series`, `opponents`. Shodu rolí s `actOf` hlídá `tests/rules-narrow.test.js`.
- Vývojář = `DEV_EMAILS` v src/config/team-config.js (👁 náhled role, 🧨 úplné smazání jen s rolí manager).
- Brána verze `settings/app.minVer` – čísla verzí musí jen růst. Další volné číslo je v20.7, cache `hokej-v81`.

## 3. Rozhodnutí OM (hotovo)
- manager vše (aspoň jeden), trener sport + soupiska a realizační tým, asistent = dřívější kustod, hracka podle matice (vlastní data pevná), host beze změny, pokladník pevně podle `cash`. Další buňky matice lze odemknout jen tak, že je zároveň řídí aplikace i pravidla.

## 4. Další verze: v20.7 N – notifikace
- Návrh v plánu (sekce N): Web Push přes Firebase Cloud Messaging, token zařízení `pushTokens/{token}`, odesílání z Cloud Functions (spouštěče + plánovaná funkce), deduplikace `pushLog`, nastavení v ⚙️ „🔔 Upozornění“.
- **Před prací se zeptej na kritická rozhodnutí:** Cloud Functions vyžadují tarif Blaze (platba podle použití – při malém týmu obvykle zdarma v limitu, ale nutná platební karta) – souhlasí uživatel? Pokud ne, navrhni slabší variantu bez serveru (místní upozornění) nebo odklad. Dále: které druhy upozornění jako první (návrh: kostra + testovací upozornění, pak nová událost a nový předpis), zrušení události a ✋ žádosti (odložená drobnost 3).
- Rozdělit na malé verze (kostra v20.7, druhy upozornění v20.7.x). Kód Cloud Functions do samostatné složky (např. `functions/`) s vlastním package.json; nasazení popsat krok za krokem (Firebase CLI na počítači uživatele).
- Potom E (Trénink), P2.

## 5. Odložené drobnosti (neřešit, jen nezapomenout)
1. Smazání hráčky ponechá její žádosti v `requests` a nepřítomnosti v `absence` (osiřelé).
2. 🚫 u realizačního týmu se nezapisuje.
3. Notifikace o zrušení události a o žádostech přijdou s fází N.
4. Hlášky v pokladně „smí jen trenér nebo pokladník“ (storage.js – mazání vyúčtované události, přepočet dlužníků, doplnění cen) – po OM jen text, opravit při nejbližším zásahu do pokladny.
5. Komentáře v kódu ještě místy píší „kustod“ (texty v aplikaci už „asistent“ – v20.5.1) – sjednotit při úklidu.
6. Po každé verzi aktualizuj docs/prompt-dalsi-vlakno.md na nový stav.
7. Realizační tým: zvážit přidání člena rovnou s e-mailem a rolí (po OM3).
8. Hlášky a nápověda u pokladny místy píší „trenér a pokladník“ (v nápovědě vysvětleno jako správce pokladny) – sjednotit při úklidu.

## 6. Pravidla práce (povinná)
1. Výstup = vždy JEDEN ZIP se všemi změněnými a novými soubory ve struktuře repozitáře (rozbalit přímo do kořene HockeyCoach). Soubory celé od prvního do posledního řádku – žádné zkracování, žádné NAJDI / NAHRAĎ.
2. Nový soubor nesmí mít stejný název jako existující soubor jinde v projektu (hlídá tests/d1-structure.test.js).
3. Struktura souboru: Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty, sekce `// ===== Název =====`, stručné české komentáře, hlavička 1–5 řádků o současném stavu (historie jen v CHANGELOG).
4. Neměň nesouvisející funkčnost: živý zápis, pokladnu, statistiky, docházku, zrušení událostí, žádosti, nepřítomnost, hostující. Když úkol vyžaduje zásah jinde, nejdřív upozorni a zeptej se. Změna peněz nebo pravidel pokladny = v CHANGELOG „⚠️ SAHÁ NA PLATBY“.
5. Data jen přidávej (merge), stará pole maž až o verzi později. Pravidla v pořadí rozšířit → převést → zúžit. U každé verze napiš, zda a kdy publikovat firestore.rules a zda nastavit 🔒 Vyžadovat verzi.
6. Vydání verze – vždy vše najednou: src/core/app-version.js, package.json, sw.js (hokej-vNN +1; teď v80, další v81), CHANGELOG.md (nahoře postup nasazení, Přidáno / Změněno / Opraveno / Beze změny), README.md (řádek „Aktuální verze“ a tabulka rolí), src/views/help.js, docs/KONVENCE.md (mapa souborů, HK.can, pravidla), docs/plan-v18.md.
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
Načti repozitář (bod 1), vypiš verzi, zeptej se na výsledek testu v20.6 a publikování pravidel (pokud není uvedeno), pak na rozhodnutí k notifikacím (bod 4) a pokračuj verzí v20.7 N.
