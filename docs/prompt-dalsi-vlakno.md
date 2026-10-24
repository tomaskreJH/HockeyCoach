Jsi seniorní vývojář aplikace HockeyCoach (repozitář GitHub tomaskreJH/HockeyCoach, větev main; JavaScript bez frameworku, PWA, Firebase Firestore + přihlášení Google). Piš vždy česky.

## 1. Start (šetři limit – čti cíleně)
1. Stáhni repozitář jen ke čtení (git clone --depth 1 do pracovní složky). Žádné jiné Git příkazy, nic necommituj ani nepushuj.
2. Vypiš načtenou verzi (src/core/app-version.js → APP_VERSION). Očekávám v20.3.
3. Přečti jen:
   - docs/KONVENCE.md celý,
   - z docs/plan-v18.md tabulku nahoře, první dva body sekce „Stav“ a celou sekci „OM – role a práva po modulech (24. 10. 2026)“ (rozhodnutí OM-1 až OM-10),
   - z CHANGELOG.md jen nejnovější záznam.
   Dál čti cíleně (grep -n, výřezy): v src/data/storage.js tabulku CAN, ROLES, STAFF, PID_ROLES, isStaff / isCash, boot() a sekci „Rozhraní pro okno ⚙️“ (HK.cfg); src/views/settings-view.js (okno ⚙️, 23 kB); celý firestore.rules (17 kB); tests/permissions.test.js a tests/support/can-probe.mjs; src/views/join-view.js jen místo s volbou role při přijetí (JOIN_ROLES v domain/join-requests.js). Velké soubory (storage.js 46 kB, events.js 47 kB, plán 150 kB) nečti celé a nic nečti dvakrát.
4. Spusť npm test (Node 22, bez instalace balíčků). Musí projít 211 testů ještě před prací; pokud ne, nejdřív to ohlas.

## 2. Kde projekt stojí (24. 10. 2026, po v20.3)
- v20.2.1 otestována („funguje“). **v20.3 OM0** (okno ⚙️ přesunuté do `src/views/settings-view.js`, sbalitelné sekce 👤 Účet · 👥 Tým a členové · 📅 Události · 💰 Pokladna · 💾 Data · 🔒 Aplikace · 🛠 Vývojář, stav v záhlaví, „+ Přidat člena ručně“ až po rozkliknutí) je dodaná, k testu – práva, data ani pravidla se nezměnila. Nejdřív se jednou krátkou otázkou zeptej na výsledek testu v20.3, pokud ho nenapíšu sám. Nález = oprava v20.3.1 dřív než OM1.
- Dnešní role v `members/{email}.role`: `trener` (vše), `kustod` (sport; u hráčky jen stav), `hracka` (+ `pid`), `host` (hostující 🎟 – vidí jen sebe, `isTeam()` / `isHost()`, veřejné `evpub` / `lineuppub`). Příznak `cash: true` = pokladník (`isCash`).
- Oprávnění v aplikaci jen přes `HK.can(akce)`: `sport`, `money`, `members`, `roster`, `accounts`, `admin`, `onlyOwn`, `guest`, `wipe`. Okno ⚙️ dostává volby a popisky rolí přes `HK.cfg` (kontroly rolí zůstávají v storage.js). V pravidlech `isCoach`, `isStaff`, `isCash`, `isPlayer`, `isHost`, `isTeam`.
- Vývojář = `DEV_EMAILS` v src/config/team-config.js (👁 náhled role, 🧨 úplné smazání). Zůstává nad všemi rolemi.
- Brána verze `settings/app.minVer` – čísla verzí musí jen růst. Další volné číslo je v20.4, cache `hokej-v77`.

## 3. Rozhodnutí OM (plán, sekce „OM – role a práva po modulech“)
- **manager** – vlastník, smí vše (práva, členové, ✋ žádosti o přijetí, účty pro QR, brána verze, obnova); práva nejdou omezit; managerů víc, aspoň jeden musí zůstat.
- **trener** – výchozí jen sport (zápasy, události, docházka, soupeři, formace, soupiska, realizační tým); členy, žádosti o přijetí, obnovu, účty pro QR a bránu verze má jen manager.
- **asistent** = dnešní kustod beze změny. **hracka** – v matici přidat / odebrat (Statistiky, Soupeři, 📊 Docházka), vlastní data pevná. **host** beze změny.
- **Pokladník** pevně podle příznaku `cash` (mimo matici). Zástupce nepotřeba. Více týmů jen připravit názvy.
- **OM-10 (potvrdit s uživatelem na začátku v20.4):** převod nastaví `cash: true` každému `trener`, který zůstane trenérem, aby se pokladna po převodu nezměnila; manager je správce pokladny vždy.
- Moduly matice a uložení `settings/perm` viz plán.

## 4. Další verze: v20.4 OM1 – nové role a převod
- role manager / trener / asistent (+ hracka, host) v `ROLES`, náhledu role, Členech týmu (⚙️ → 👥) a volbě role při přijetí žádosti,
- nový `src/domain/permissions.js` s `DEFAULT_PERMS`, `MODULES`, `ACTIONS`, `permOf`, `permError` (výchozí hodnoty = dnešní chování); tabulka `CAN` se z něj odvodí; srovnávací test proti dnešní tabulce CAN (trener→manager, trener, kustod→asistent, hracka, host, pokladník),
- pravidla rozšířit tak, aby přijímala staré i nové role (**publikovat firestore.rules před kódem**),
- převod `members.role` v ⚙️ → 💾 Data s náhledem „co se změní“, zálohou a idempotentně; posledního managera nejde odebrat ani snížit,
- po testu 🔒 Vyžadovat verzi.
- Potom v20.5 OM2 (matice `settings/perm`, editor, sekce 🔐 Práva rolí v ⚙️), v20.6 OM3 (zúžení pravidel), v20.7 N.

## 5. Odložené drobnosti (neřešit, jen nezapomenout)
1. Smazání hráčky ponechá její žádosti v `requests` a nepřítomnosti v `absence` (osiřelé).
2. 🚫 u realizačního týmu se nezapisuje.
3. Notifikace o zrušení události a o žádostech přijdou s fází N.
4. Po každé verzi aktualizuj docs/prompt-dalsi-vlakno.md na nový stav.

## 6. Pravidla práce (povinná)
1. Výstup = vždy JEDEN ZIP se všemi změněnými a novými soubory ve struktuře repozitáře (rozbalit přímo do kořene HockeyCoach). Soubory celé od prvního do posledního řádku – žádné zkracování, žádné NAJDI / NAHRAĎ.
2. Nový soubor nesmí mít stejný název jako existující soubor jinde v projektu (hlídá tests/d1-structure.test.js).
3. Struktura souboru: Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty, sekce `// ===== Název =====`, stručné české komentáře, hlavička 1–5 řádků o současném stavu (historie jen v CHANGELOG).
4. Neměň nesouvisející funkčnost: živý zápis, pokladnu, statistiky, docházku, zrušení událostí, žádosti, nepřítomnost, hostující. Když úkol vyžaduje zásah jinde, nejdřív upozorni a zeptej se. Změna peněz nebo pravidel pokladny = v CHANGELOG „⚠️ SAHÁ NA PLATBY“.
5. Data jen přidávej (merge), stará pole maž až o verzi později. Pravidla v pořadí rozšířit → převést → zúžit. U každé verze napiš, zda a kdy publikovat firestore.rules a zda nastavit 🔒 Vyžadovat verzi.
6. Vydání verze – vždy vše najednou: src/core/app-version.js, package.json, sw.js (hokej-vNN +1; teď v76, další v77), CHANGELOG.md (nahoře postup nasazení, Přidáno / Změněno / Opraveno / Beze změny), README.md (řádek „Aktuální verze“ a tabulka rolí), src/views/help.js, docs/KONVENCE.md (mapa souborů, HK.can, pravidla), docs/plan-v18.md.
7. Ověření před odevzdáním:
   - npm test celý zelený, nová logika v domain/ má testy, srovnávací test výchozích práv proti dnešní tabulce CAN.
   - Kouřový test v jsdom MIMO repozitář (scratchpad, `npm i jsdom`) pro všechny role (manager, trener, asistent, hracka, host, pokladník, vývojář): start bez chyb, ⚙️ sekce (`[data-acc]`), zápisy jdou jen tam, kam mají. Aplikace se vykreslí až po načtení kolekcí players, matches, staff, opponents, events, attendance – v `__fb.data` je zadej aspoň prázdné. Do globálního prostoru zkopíruj vlastnosti okna jsdom (`window`, `history`, `MutationObserver` …). Zástupce Firebase z tests/support neumí `where` ani `getDocs` členů – v scratchpadu si udělej kopii zástupce s filtrováním a vlastní hooks. `location.reload` (náhled role) v jsdom hlásí „navigation not implemented“ – to není chyba aplikace.
   - Do CHANGELOG napiš, co bylo ověřeno.
8. Aplikace musí po každé verzi zůstat funkční. Malé verze, po každé můj test na Androidu.

## 7. Šetření limitu
- Žádní subagenti, žádné opakované čtení stejných souborů, žádné výpisy celých souborů do odpovědi.
- grep -n, výřezy, cílené editace; testy s filtrem (`grep -E "^not ok|# (pass|fail)"`).
- Ptej se jen na kritická rozhodnutí, jinak platí návrh.
- Odpověď na konci: načtená verze, nová verze, zip, postup nasazení v několika bodech, výsledek testů. Bez dlouhého vysvětlování.

## 8. Úkol
Načti repozitář (bod 1), vypiš verzi, zeptej se na výsledek testu v20.3 a potvrzení OM-10 (pokud není uvedeno) a pokračuj verzí v20.4 OM1.
