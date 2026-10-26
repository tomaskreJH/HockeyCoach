Jsi seniorní vývojář aplikace HockeyCoach (repozitář GitHub tomaskreJH/HockeyCoach, větev main; JavaScript bez frameworku, PWA, Firebase Firestore + přihlášení Google). Piš vždy česky.

## 1. Start (šetři limit – čti cíleně)
1. Stáhni repozitář jen ke čtení (git clone --depth 1 do pracovní složky). Žádné jiné Git příkazy, nic necommituj ani nepushuj.
2. Vypiš načtenou verzi (src/core/app-version.js → APP_VERSION). Očekávám v21.8.
3. Přečti jen:
   - docs/KONVENCE.md celý,
   - z docs/plan-v18.md tabulku nahoře a první dva body sekce „Stav“; docs/plan-trenink.md celý,
   - z CHANGELOG.md jen nejnovější záznam.
   Dál čti cíleně (grep -n, výřezy): sw.js, src/main.js (spuštění, poslech kolekcí), src/data/storage.js (boot, `HK.cfg`, `can`), src/views/settings-view.js (sekce ⚙️), firestore.rules (pomocné funkce a dotčené kolekce). Velké soubory (storage.js, events.js, plán 150 kB) nečti celé a nic nečti dvakrát.
4. Spusť npm test (Node 22, bez instalace balíčků). Musí projít 335 testů ještě před prací; pokud ne, nejdřív to ohlas.

## 2. Kde projekt stojí (26. 10. 2026, po v21.8)
- **v21.8 K-T2 dodána, k testu** – ⏱ živý trénink podle skutečnosti: nahoře do konce tréninku (z `end` události) a o kolik plán přetahuje (`liveBudget`), ✂ −1 min kolo (`cutSec` → jump), 📋 Zbytek plánu (další bloky −/+ / ⏭ vypustit jen pro průběh: `trlive.adj {bid: min}`, `trlive.skip [bid]`, `liveBlocks` – vypuštěný blok délka 0, indexy zůstávají; `adjPatch` jen bloky po současném; zápis `liveCtl("keep")` se stavem hodin; start vynuluje). ☕ Pauza = blok plánu `brk` bez linek (`isBreak`, `breakBlank`; `prevSpot` ji přeskočí). Živý trénink jen `HK.can("sport")` (hráčky ne), 🎽 dres hráčky v kartě plánu. Název aplikace HockeyCoach (`APP_NAME`, index, manifest). Události: nadpis · zkrácené datum v jednom řádku (seznam i detail, `titleLine`), podbarvená hlavička, 👥 docházka sbalená (`#evatt`). Team ✏️ / 🗑 (`.ib`). **Pravidla v21.8 (`trliveOk` adj / skip) publikovat PŘED kódem, pak 🔒 21.8.**
- **v21.7 K-T dodána, k testu** – připomínky z testu 25.–26. 10.: ⭐ hodnocení **po hráčkách** (`treval` beze změny tvaru – hodnotí se `pl.{pid}.r` na lince; `domain/training-eval.js` `lanePids` / `rateLanes` / `unratedCount`; karta po linkách, výzva v živém tréninku = hráčky mé linky ve skončeném kole), detail události (hlavička datum / čas a sraz / místo / počty, „Tvoje odpověď“ hráčky v hlavičce, pětky a plán nahoře, docházka a ⚙ Úpravy události dole, panel ↻ Rozdělit sbalený), podbarvené záhlaví karet (`styles/main.css`, `.cd > h2:first-child`), ⭐ výkonnost bez skoku (`S.plvo.y`), kompaktní stopky, 📚 výběr cvičení (`views/drill-picker.js`), ▶ / 📄 náhled odkazů (`mediaOf`, `mediaHtml`). Pravidla beze změny.
- **Provoz (26. 10. 2026):** týmový Google účet (videa, PDF) spravuje manager – vedoucí týmu; teď vše dělá uživatel (vývoj, test), po uvolnění k distribuci převezme provoz někdo jiný – myslet na strukturu správy (README – Provoz a správa).
- **Hodinky:** každý trenér má svá oznámení a své ovládání. G0 (ověření Connect IQ – přístup bez hesla, cena, modely) zařadit hned po v21.9.
- **Stav testů (uživatel 25. 10. 2026):** v21.5 nasazena, netestována; v21.3 a v21.4 testovány jen pohledem (živý trénink, oznámení, stopky reálně neověřeny). Ruční testovací plán **docs/testy-rucni.md** (kroky + očekávaný výsledek, v21.3 – v21.6) – nejdřív se zeptej na jeho výsledek; nález = oprava v21.6.x dřív než E5.
- **v21.6 E4 dodána, k testu** (od v21.7 hodnocení po hráčkách) – ⭐ hodnocení cvičení (`src/domain/training-eval.js`, `src/views/treval-view.js`): hodnotí se **linka** plánu (u stanovišť každé stanoviště), stupnice T5 (4 😃 · 3 🙂 · 2 😐 · 1 😴, 0 = zrušeno – dávka neumí smazat vnořené pole), poznámka a volitelně hráčky v okně `#tev`; karta „⭐ Hodnocení cvičení · neohodnoceno N z M“ v kartě plánu (rozbalená u dnešního a minulého tréninku); v ⏱ živém tréninku výzva „Jak šlo cvičení?“ po skončeném kole pro moje linky (`prevSpot`), jen jedno klepnutí. Kolekce `treval/{eid}` = {v, r: {blok_linka: {d, dn, r, n, pl: {pid: {r, n}}}}, by, at}, čte `treval r` (jen realizační tým, hráčka nikdy), zapisuje `treval e`; v záloze (`FETCH`). `laneTags` přesunuto do `domain/training-plan.js` (místo kopií v trplan-view a trlive-view). **Pravidla v21.6 publikovat PŘED kódem.**
- **v21.5 K1 nasazena, netestována** – telefon: nic neujíždí do šířky (`styles/main.css`: `table{min-width}` jen v `.tw`, `.row > *` `min-width:0`, `input/select` `max-width:100%`, úzké tabulky zalamují; `#evw` nowrap jen v `.tw`), ✨ Připravit trénink v kartě plánu (`quickSplit` v line-split-view – dělí jen nerozdělené přihlášené posledním způsobem; `loadPrep` v trplan-reuse – minulý plán + `latestTpl`), úprava plánu: u bloku jen cvičení, ⏱ čas, skupiny, rozpis točení; režim, podle postů, točení, trenéři, souběžná linka pod „⚙ Další volby“ (`blockExtras`, `S.tpe.mo`). Pravidla beze změny. Měřicí skript Playwright (Chromium 360 px, `__fb` přes zástupce z tests/support s `getDocs`/`getDoc` z dat) – postup v CHANGELOG v21.5. Nejdřív se zeptej na výsledek testu v21.5, v21.4 a v21.3.
- **v21.4 E3b dodána, k testu** (nevím výsledek) – ⏲ stopky a výsledky měření (`src/domain/stopwatch.js`, `src/views/stopwatch-view.js`; kolekce `trms/{eid}` = {v, r: {blok_linka: {d, dn, u, low, ms: {pid: [pokusy]}}}, by, at}, zápis dávkou s hlubokým sloučením; čte `trplan r` – výsledky vidí celý tým, zapisuje nový modul matice `treval e`); ⌚ systémová oznámení živého tréninku „co teď / co potom“ (`liveNote`, Android je zrcadlí na hodinky, akce ⏸ / ⏭ přes `sw.js` jen řídícímu; skrytá aplikace – okno `alertsDue(…, win)`); v plánu ⏱ čas bloku s rychlou volbou a převzetím délky z banky (`bankDur`, ruční změna `S.tpe.man`). Pravidla v21.4 publikovat PŘED kódem. Nejdřív se jednou krátkou otázkou zeptej na výsledek testu v21.4 a v21.3 (živý trénink ještě netestován) a zda jsou pravidla publikovaná, pokud to nenapíšu sám. Nález = oprava v21.4.1 dřív než E4.
- **v21.3 E3 nasazena** (živý trénink zatím neotestován) – ⏱ živý trénink (`trlive/{eid}`, řídí `trplan e`), rozdělení do pětek s výběrem způsobu, ⭐ výkonnost (`plevel/team`), bloky plánu podle postů.
- **v21.2 E2b nasazena** – 📥 základní sada a 📄 import cvičení, ⧉ kopie a 📑 šablony plánu (`trtpl`), 📊 pokrytí dovedností.
- **v21.1 E2a nasazena** – 📋 plán tréninku (`trplan/{eid}`, karta v detailu tréninku), 📷 obrázky cvičení (`drillimg`) a 📄 PDF, ⚖ vyrovnaně do 2–4 pětek.
- **v21.0 E1 nasazena a otestována** – 📚 banka cvičení (Team → 📚 Cvičení).
- **v20.7.1 / v20.7** nasazeny – stav skóre v detailu zápasu (krok 3), úklid D4.
- Role v `members/{email}`: `role` (manager / trener / asistent / hracka / host) + `rv: 2`. Jiná hodnota = bez přístupu (`roleOf`). Příznak `cash: true` = pokladník (manager je správce pokladny vždy). Posledního managera nejde odebrat ani snížit (`keepsManager`).
- Oprávnění v aplikaci: zkratky `HK.can(akce)` (`sport`, `money`, `members`, `roster`, `accounts`, `admin`, `onlyOwn`, `guest`, `wipe`) a jemná práva `HK.perm(modul, akce)` z matice `settings/perm` (upravitelné jen buňky `EDITABLE`). Moduly Tréninku: `drills` (v21.0), `trplan` (v21.1), `treval` (v21.4 – měření; E4 hodnocení) – nový modul se přidá do `MODULES`, `DEFAULT_PERMS`, `permDef` v pravidlech a do `can(modul, akce)`.
- Pravidla (v21.4): `isMgr`, `isRoster`, `isStaff`, `isCash`, `isTeam`, `can(modul, akce)` (moduly matice včetně `drills`, `trplan`), `drillOk`, `imgOk` (`drillimg`), `trplanOk`, `trtplOk` (`trtpl` – čte i zapisuje `can('trplan', 'e')`), `trliveOk` (`trlive` – čte `trplan r`, zapisuje `trplan e`, `sAt == request.time`, `ctl == mail()`), `plevelOk` (`plevel` – `isStaff`), `trmsOk` (`trms` – čte `trplan r`, zapisuje `treval e`), `trevalOk` (`treval` – čte `treval r`, zapisuje `treval e`) – shodu s `actOf` hlídá `tests/rules-narrow.test.js`.
- Vývojář = `DEV_EMAILS` v src/config/team-config.js (👁 náhled role, 🧨 úplné smazání jen s rolí manager).
- Brána verze `settings/app.minVer` (⚙️ → 👤 Účet → 🔒 Vyžadovat verzi) – čísla verzí musí jen růst. Další volné číslo je v21.9, cache `hokej-v92` (každá další verze +1).

## 3. Rozhodnutí OM (hotovo)
- manager vše (aspoň jeden), trener sport + soupiska a realizační tým, asistent = dřívější kustod, hracka podle matice (vlastní data pevná), host beze změny, pokladník pevně podle `cash`. Další buňky matice lze odemknout jen tak, že je zároveň řídí aplikace i pravidla.

## 4. Další práce (delší vlákno – víc verzí za sebou, důraz na kvalitu a šetření limitu)
### ✅ v21.5 K1 – telefon a příprava tréninku (hotovo; trvalá zásada platí dál)
- **Zásada (trvalá):** aplikace je pomocník – trenér trénuje svěřence, ne aplikaci. Příprava doma, na ledě minimum ovládání. Když je něco komplikované, upozorni mě. Uživatelský návod: dokument „HockeyCoach – Trénink: návod pro trenéry“ (Claude Docs) – při změně ovládání napiš, co v něm upravit.
- ✅ **Chyba (opraveno v21.5):** při tvorbě tréninku (✏️ úprava plánu) stránka na telefonu ujíždí do šířky. Na telefonu má být vše na šířku obrazovky, posun jen nahoru / dolů; výjimka jen široké tabulky statistik (posun uvnitř karty `.tw`). Podezření: `select` s dlouhým názvem cvičení (v `styles/main.css` chybí `max-width:100%` / `min-width:0` pro `select`, `input`, flex položky) a řádky `flex-wrap:nowrap` v `trplan-view.js`, `trplan-reuse.js`, `line-split-view.js`, `events.js`. Oprav globálně v CSS a projdi všechny obrazovky; jsdom rozložení neumí – pokud jde nainstalovat Playwright s Chromium, změř na šířce 360 px `document.documentElement.scrollWidth <= 360` na hlavních obrazovkách, jinak zkontroluj styly ručně.
- **Jednodušší úprava plánu:** u bloku vidět jen cvičení, ⏱ čas a skupiny; režim, podle postů, točení, trenéři a souběžné linky pod „Další volby“ (otevřené, když jsou použité).
- **✨ Připravit trénink** v detailu tréninku: jedním tlačítkem rozdělit pětky posledním způsobem, nabídnout poslední šablonu / předchozí trénink a otevřít plán k uložení.
- **Stopky jako doplněk:** ověř ovládání jednou rukou (velké cíle), v nápovědě doporuč měření svěřit jednomu člověku.
### ✅ v21.7 K-T – trénink jednodušeji (hotovo, k testu)
### ✅ v21.8 K-T2 – ⏱ živý trénink podle skutečnosti (hotovo, k testu)
- Plán je jen návod (zdržení). V živém tréninku: kolik zbývá do konce tréninku (z `end` události), o kolik plán přetahuje, ✂ zkrátit / ⏭ vypustit blok jen pro tento průběh (bez změny plánu) – nové pole v `trlive` (např. `adj: {blokId: min}`, `skip: [blokId]`) → `trliveOk` rozšířit, pravidla před kódem, `liveAt` počítat s úpravami (testy). Pauza celého tréninku už je.
### v21.9 K-T3 – ⏲ štafeta (další)
- Režim stopek štafeta: 2–4 skupiny (např. na červené čáře), pořadí hráček předem nebo nasazením klepnutím, ▶ start všech skupin naráz, klepnutí = předávka (jedna končí, další startuje), výsledek čas hráčky (úsek) i skupiny; data v `trms` (úsek = pokus hráčky, čas skupiny zvlášť – navrhnout).
### G0 – ⌚ ověření aplikace pro hodinky Garmin (hned potom, bez kódu)
### ✅ v21.6 E4 – ⭐ hodnocení (hotovo, k testu)
- Plán: **docs/plan-trenink.md** – kap. 3 (`treval/{eid}`), kap. 4 řádek E4, kap. 6 (T5, E3b).
- E4: po bloku rychlé hodnocení cvičení stupnicí 😃 super · 🙂 v pohodě · 😐 nic moc · 😴 vůbec se nesnaží + poznámka, volitelně u hráček; doplnění i po tréninku (seznam neohodnocených bloků); hodnocení i z ⏱ živého tréninku na konci kola. Data `treval/{eid}` jen pro realizační tým (`treval r` / `e`, hráčka nečte – T2); měření zůstává v `trms` (vidí celý tým).
### v22.0 E5 – 📈 přehled a analýza (po G0)
- Plán: **docs/plan-trenink.md** kap. 4 řádek E5: tabulky výsledků měření s porovnáním (cvičení × hráčky, nejlepší po trénincích, zlepšení proti minule, pořadí – vidí i hráčky), karta hráčky (tréninky, minuty po dovednostech, výsledky; hodnocení jen realizační tým – data `treval`), tým × dovednosti za období, ⬇️ CSV; `domain/training-stats.js` + testy; `trms` / `treval` číst jen za zvolené období (po dokumentu na trénink). Rozhodnuto: Statistiky → přepínač 🏒 Trénink, výchozí 60 dní; hráčky vidí výsledky měření a co se trénovalo, **hodnocení trenérů nikdy**.
- Pak K2 komfort celé aplikace (nejdřív návrh seznamu ke schválení), v22.x N notifikace (i se zamčeným telefonem; pozor na tarif Spark), P2, G aplikace pro hodinky Garmin (nejdřív ověření G0), M jiný klub úplně poslední.
- Poslech `events` / `attendance` jen aktuální sezóny (D4-8) – zeptat se před změnou.

## 5. Odložené drobnosti (neřešit, jen nezapomenout)
1. Smazání hráčky ponechá její žádosti v `requests` a nepřítomnosti v `absence` (osiřelé).
2. 🚫 u realizačního týmu se nezapisuje.
3. Notifikace o zrušení události a o žádostech přijdou s fází N.
4. Hlášky v pokladně „smí jen trenér nebo pokladník“ (storage.js – mazání vyúčtované události, přepočet dlužníků, doplnění cen) – po OM jen text, opravit při nejbližším zásahu do pokladny.
5. ✅ (v20.7) komentáře „kustod“ sjednoceny.
6. Po každé verzi aktualizuj docs/prompt-dalsi-vlakno.md na nový stav.
7. Realizační tým: zvážit přidání člena rovnou s e-mailem a rolí (po OM3).
8. Hlášky a nápověda u pokladny místy píší „trenér a pokladník“ (v nápovědě vysvětleno jako správce pokladny) – sjednotit při úklidu.
9. Smazání tréninku ponechá jeho plán `trplan/{eid}` a hodiny `trlive/{eid}` (osiřelé, nevadí – čte se jen u existujícího tréninku); ✅ (v21.2) smazání cvičení maže i jeho obrázky `drillimg`.
10. ✅ (v21.2) šablony plánu a kopírování hotové. Pokrytí dovedností počítá i hostující hráčku přihlášenou na trénink – zvážit, zda ji vynechat.
11. ⭐ Výkonnost: hráčka smazaná ze soupisky zůstane v `plevel/team.lv` (nevadí, nečte se). Upozornění živého tréninku jen při otevřeném živém tréninku (bez serveru) – se zhasnutým telefonem chodí ⌚ oznámení se zpožděním, spolehlivě až s notifikacemi N nebo aplikací G.
12. ⏲ Výsledky měření: smazání tréninku ponechá `trms/{eid}` (osiřelé jako `trplan`); výsledky linky odstraněné z plánu zůstanou v kartě (bez ⏲ Měřit). Stopky běží jen v zařízení (zavření okna je zahodí – ptá se druhým klepnutím).

13. ⭐ Hodnocení: smazání tréninku ponechá `treval/{eid}` (osiřelé jako `trplan` / `trms`); hodnocení linky odstraněné z plánu zůstane v dokumentu, karta ho neukáže. Zrušené hodnocení = `r: 0` (pole zůstává).

## 6. Pravidla práce (povinná)
1. Výstup = vždy JEDEN ZIP se všemi změněnými a novými soubory ve struktuře repozitáře (rozbalit přímo do kořene HockeyCoach). Soubory celé od prvního do posledního řádku – žádné zkracování, žádné NAJDI / NAHRAĎ.
2. Nový soubor nesmí mít stejný název jako existující soubor jinde v projektu (hlídá tests/d1-structure.test.js).
3. Struktura souboru: Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty, sekce `// ===== Název =====`, stručné české komentáře, hlavička 1–5 řádků o současném stavu (historie jen v CHANGELOG).
4. Neměň nesouvisející funkčnost: živý zápis, pokladnu, statistiky, docházku, zrušení událostí, žádosti, nepřítomnost, hostující. Když úkol vyžaduje zásah jinde, nejdřív upozorni a zeptej se. Změna peněz nebo pravidel pokladny = v CHANGELOG „⚠️ SAHÁ NA PLATBY“.
5. Data jen přidávej (merge), stará pole maž až o verzi později. Pravidla v pořadí rozšířit → převést → zúžit. U každé verze napiš, zda a kdy publikovat firestore.rules a zda nastavit 🔒 Vyžadovat verzi.
6. Vydání verze – vždy vše najednou: src/core/app-version.js, package.json, sw.js (hokej-vNN +1; teď v91, další v92), CHANGELOG.md (nahoře postup nasazení, Přidáno / Změněno / Opraveno / Beze změny), README.md (řádek „Aktuální verze“ a tabulka rolí), src/views/help.js, docs/KONVENCE.md (mapa souborů, HK.can, pravidla), docs/plan-v18.md, docs/testy-rucni.md (nová sekce s kroky ručního testu).
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
Načti repozitář (bod 1), vypiš verzi, zeptej se na výsledek ručních testů podle docs/testy-rucni.md (pokud není uvedeno) a zda jsou publikovaná pravidla v21.8, a pokračuj podle bodu 4: v21.9 K-T3 (a dál, pokud zbude čas). Každá verze zvlášť: vlastní číslo, CHANGELOG, testy a vlastní ZIP, aby šla nasadit a otestovat samostatně; kvalita má přednost před množstvím. Šetři limit (bod 7). Drobné úpravy od uživatele nedávej do samostatné verze – přidej je k nejbližší větší verzi.
