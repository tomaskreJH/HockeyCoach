# Plán úprav v18 – v20 (úklid, rychlé úpravy, soukromí, pokladna II – hospodaření a rozpočet, role, události, notifikace, hosté, více týmů)

> Plán otevřených fází. Dokončené fáze v18.0 – v18.7.1 a v18.8 – v20.6 (popisy, kontroly, rozhodnutí, průběžný stav) jsou v [archiv-plan-v18.md](archiv-plan-v18.md). Modul Trénink a úklid D4: [plan-trenink.md](plan-trenink.md). Programovací řád: [KONVENCE.md](KONVENCE.md). Historie verzí: [CHANGELOG.md](../CHANGELOG.md).

| Verze | Fáze | Obsah |
|---|---|---|
| v18.0 | A | Tlačítko Zpět v aplikaci, dotaz na ukončení z domovské stránky – **hotovo** (opravy ve v18.1 a v18.1.1) |
| v18.1 | B1 | Společné pravidlo střídání, Průběh se všemi kroky – **hotovo**, k testu |
| v18.2 | B2 | Pevné rozložení tlačítek, odezva (vibrace) – **hotovo** (odezva zůstává, rozložení nahradila v18.3) |
| v18.3 | B5 + B3 | Rozložení B (jediné) a ovládání rotace – **hotovo**, otestováno (požadavky do v18.4) |
| v18.4 | B4 | Hřiště, situace v hlavičce, nabídka jednotky a režim PP/OS, Sestava po zranění, upozornění v průběhu – **hotovo** (v18.4.1 otestováno, opravy ve v18.4.2) |
| v18.4.2 | B4 | Opravy po testu v18.4.1: jednotky OS podle počtu hráček při více trestech, ikona gólu, góly v průběhu, mantinel, čitelnost partnerky v tmavém režimu – **hotovo**, otestováno |
| ~~v18.5~~ | ~~B5~~ | ~~Volitelné rozložení~~ – sloučeno do v18.3 (jen rozložení B, bez volby) |
| v18.6 | G | Náhled role pro vývojáře – zobrazit aplikaci jako hráčka / kustod / pokladník / trenér – **hotovo**, otestováno (hráčka) |
| v18.6.1 | P | Bezpečné QR platby: QR pro mBank, okamžitá platba, číslo účtu → IBAN s kontrolními součty, změna účtu jen návrh + potvrzení (4 oči), varování hráčce – **hotovo**, otestováno (QR v mBank OK, 22. 10. 2026) |
| v18.7 | C | Docházka pro všechny (📊 v Událostech, období od–do), značka ⛓ dlužnic v docházce – **hotovo**, otestováno (22. 10. 2026) |
| v18.7.1 | Q | ⬇️ Uložit QR do telefonu (obrázek pro bankovní aplikaci) – **hotovo**, k testu |
| v18.8 | K | **Řád projektu a pojistky**: `docs/KONVENCE.md` (programovací řád a mapa souborů), testy v repozitáři (`tests/`, `npm test`, bez balíčků z npm), oprava pravidel „pokladník si dá roli kustod“, brána verze `settings/app.minVer`, plán a archiv v `docs/`, zkrácené README – **hotovo, k testu** (nejdřív publikovat firestore.rules) |
| v18.9 | D1 (a–e, j, k) | Úklid – `confirm2`, jména `pn` / `nm`, `csv`, `core/drag.js`, `matchesVs` / `vsHash`, komentáře bez historie verzí, mrtvý kód – bez změny chování, ověřeno srovnávacími testy – **hotovo, otestováno** (22. 10. 2026) |
| v18.9.1 | D1 (f–i) | Úklid – `playerStats` pro jeden i více zápasů, `HK.can(akce)` ve `storage.js`, `src/config/team-config.js` (název týmu, aplikace, `DEV_EMAILS`), rozdělení `live.js` na `live-view` / `live-panels` / `live-events` – **hotovo, otestováno** (22. 10. 2026) |
| v18.9.2 | oprava | Pokladník nastavuje platby hráček a plat (nález z testu v18.9.1); ⚙️ → Kontrola dat – doplnění pole `ex` – **hotovo, otestováno** (22. 10. 2026) |
| v18.9.3 | D3 | Úklid – mazání: `legacyEx`, `payments`, `coach`, mrtvý kód D21–D30; zápisy nových polí přes `merge`; sjednotit zbývající potvrzení na `confirm2`; odstranit „(od v18.x)“ z nápovědy – **hotovo, částečně otestováno** (23. 10. 2026) |
| v19.0 | R | Rychlé úpravy na čistém kódu: kalendář od nejnovějších, Zápis utkání v Událostech pro všechny, trenéři v pětkách tréninku (dříve R1 + R2; Moje platby po měsících přesunuty do PM) – **hotovo, k testu** (23. 10. 2026) |
| v19.1 | S | Soukromí v databázi: důvody omluv, platy trenérů, platební pole soupisky jen pro oprávněné (sekce „S – v19.1“) – **hotovo, částečně otestováno** (23. 10. 2026) |
| v19.1.1 | S | Úklid soukromí: 🧹 Smazat stará citlivá pole (po 🔒 Vyžadovat verzi v19.1.1), zúžená pravidla `players` / `staff` / `attendance`, obnova staré zálohy rozdělí stará pole – **hotovo, otestováno bez nálezu** (23. 10. 2026) |
| v19.2 | OU | 🔁 **Opakované události**: série tréninků (např. každou středu), založení najednou, úprava / smazání „jen tato“ nebo „tato a další“; pravidlo opakování v `domain/recurrence.js` použije i Rozpočet – nová kolekce `series` → **publikovat firestore.rules před kódem** (události beze změny pravidel) – **hotovo, otestováno bez nálezu** (23. 10. 2026) |
| v19.3 | EK | 💰 **Hospodaření události a měsíce** (Pokladna II): místo „schodku“ u událostí hrazených příspěvkem podíl příspěvků, výsledek události a měsíce (led se vyplatil / ztráta), návrh poplatku výpočtem nebo paušálem – bez změny pravidel – **hotovo**, nasazeno, částečně otestováno bez nálezu (23. 10. 2026) |
| v19.4 | PM 1 | 💳 **Moje platby po měsících a porovnání způsobu placení** (Pokladna II) – veřejná cena na hlavu `evprice` – **hotovo**, nasazeno, bez připomínek (test provozem) (23. 10. 2026) |
| v19.4.1 | PM 2 | ✋ **Žádost o změnu placení** – kolekce `requests`, `views/request-list.js`, `domain/requests.js`, historie `grpH` v `plpay`, `grpAt` / `asOf` před `calcCash`, `contribRows` podle měsíce (⚠️ sahá na předpisy) – **hotovo, k testu** (23. 10. 2026) – **publikovat firestore.rules**, 🔒 Vyžadovat verzi |
| v19.5 | RP 1 | 📊 **Rozpočet sezóny – část 1** (Pokladna II, jen trenér a pokladník): parametry sezóny, položky událostí (opakování / počet / série), platy a ostatní, plán po měsících, doporučený příspěvek – nová kolekce `budget`, `domain/budget.js`, `views/budget-view.js` – **hotovo, k testu** (23. 10. 2026) – **publikovat firestore.rules před kódem** |
| v19.5.1 | RP 2 | 📈 Plnění (plán vs. skutečnost z `monthEconomy`, přiřazení podle šablony, série a dne v týdnu – otázka 49) a 💧 cashflow (zůstatek pokladny + plán, varování pod rezervou `par.res`, odchylka 10 % s návrhem) – `domain/budget-track.js` – **hotovo, k testu** (23. 10. 2026), pravidla beze změny |
| v19.5.2 | RP 3 | ✅ Schválení rozpočtu (`approved = {data, sum, by, at}`, neměnné), úpravy s důvodem (`rev`, porovnání se schváleným), 🖨 export pro valnou hromadu (tisk / PDF, ⬇️ CSV) – **hotovo, k testu** (23. 10. 2026) – **publikovat firestore.rules před kódem**, 🔒 Vyžadovat verzi |
| v19.6 | UP | 🏠 **Úvodní přehled** – nová první záložka **🏠 Domů** (výchozí po spuštění): běžící zápas (trenér / kustod rovnou do zápisu, ostatní skóre), příští zápas, tento týden, moje platby, u správce pokladny souhrn týmu, žádosti a varování cashflow – `domain/home-summary.js`, `views/home-view.js` – **hotovo, nasazeno, otestováno bez nálezu** (23. 10. 2026), pravidla beze změny |
| v19.6.1 | ČL | ✋ **Žádost o přijetí do týmu** (požadavek 23. 10. 2026, „co nejdříve“): účet Google bez členství pošle žádost (e-mail z přihlášení, přezdívka, číslo dresu), trenér ji vyřídí – založí / přiřadí hráčku nebo člena týmu a účet – sekce „ČL“ – **hotovo, nasazeno** (23. 10. 2026) – **publikovat firestore.rules před kódem** (nová kolekce `joinreq`) |
| v19.6.2 | UP | 🏠 Domů: místo „Tento týden“ (Po – Ne) **📅 Příštích 7 dní** (dnes + 6), uplynulé události (i dnešní po začátku, uzavřené a běžící zápasy) se nezobrazují – požadavek uživatele 23. 10. 2026 – **hotovo, nasazeno, otestováno bez nálezu** (23. 10. 2026), pravidla beze změny |
| v19.6.3 | UP2 | 👁 Náhled živého zápasu pro členy (jen ke čtení: skóre, střely, čas, třetina, průběh – góly, tresty, střely; bez sestav a času na ledě) – `domain/watch-feed.js`, `views/live-watch.js` – sekce „UP“, otázka 56 – **hotovo, k testu** (23. 10. 2026), pravidla beze změny |
| v20.1 | NP | 🏖 **Nepřítomnost člena od–do** (dovolená, nemoc): omluva v otevřených událostech, u uzavřených žádost trenérovi (`requests`, druh `att`) – sekce „NP“ – **hotovo spolu s W** |
| v19.7 | UD1 + UD2 | 📅 **Čas od – do u tréninku** (`end`, výchozí +60 min), **⏰ sraz u všech událostí** (`meet` v minutách předem, výchozí trénink 30 / zápas 60, u každé události lze měnit, výchozí v ⚙️ → ⏰ Nastavení událostí = `settings/events`), série přenáší konec i sraz; **počty ✅ / ❌ / ❓ v tlačítkách** na kartě – `domain/event-time.js`, `views/event-settings.js` – **hotovo, k testu** (23. 10. 2026), pravidla beze změny (UD1 a UD2 spojeny na přání uživatele) |
| v19.8 | DO | 🚫 **Nedorazila bez omluvy**: značka `attendance.nos` u odpovědi „Jdu“ po začátku události (trenér, kustod, detail události), v Docházce sloupec 🚫 mimo účast – `domain/attendance.js` – **hotovo, k testu** (24. 10. 2026), **publikovat firestore.rules** (attendance) |
| v19.9 | HG1 | 🎟 Hostující hráčky bez účtu (`players.guest`, značka 🎟, počítají se jako ostatní) – **hotovo, k testu** (24. 10. 2026; dodáno v jednom zipu s v20.0 – v20.2) |
| v20.0 | Z | ❌ Zrušení události (`cancelled`, zůstává v historii, mimo Docházku), smazání prázdné trenér / kustod, 🧨 úplné smazání se vším jen vývojář – **hotovo, k testu** (24. 10. 2026) |
| v20.1 | W + NP | ✋ Žádosti o změnu účasti po uzávěrce (`requests`, kind `att`) + 🏖 nepřítomnost od–do (`absence`) – **hotovo, k testu** (24. 10. 2026) – **publikovat firestore.rules** |
| v20.2 | HG2 | Role **Hostující** – vidí jen sebe; úzké dokumenty `evpub` (hlavička) a `lineuppub` (formace jen s jejím „Jdu“) zapisuje aplikace trenéra / kustoda (bez Blaze) – **hotovo, k testu** (24. 10. 2026) – **publikovat firestore.rules**, po testu 🔒 Vyžadovat verzi v20.2 |
| v20.2.1 | oprava | Výběr hráčky 🎟 v 👁 Náhledu role a ve Členech týmu sám přepne roli na Hostující (nález z testu v20.2) – **hotovo, otestováno** (24. 10. 2026), pravidla beze změny |
| v20.3 | OM0 | ⚙️ **Reorganizace okna nastavení**: vykreslení přesunuto ze `storage.js` do `src/views/settings-view.js`, sbalitelné sekce (👤 Účet, 👥 Tým a členové, 📅 Události, 💰 Pokladna, 💾 Data, 🔒 Aplikace, 🛠 Vývojář), stav v záhlaví sbalené sekce, „+ Přidat člena ručně“ až po rozkliknutí – sekce „OM“ – **hotovo, nasazeno (částečně otestováno, náhled rolí funguje)** (24. 10. 2026), bez změny práv, dat a pravidel |
| v20.4 | OM1 | Role **manager / trener / asistent** (+ hracka, host), `src/domain/permissions.js` s výchozími hodnotami = dnešní chování (srovnávací test), převod `members.role` v ⚙️ → 💾 Data (náhled, volba managerů, záloha členů, idempotentní, až po 🔒 Vyžadovat verzi v20.4), ochrana posledního managera, pravidla přijímají staré i nové role – **hotovo, k testu** (24. 10. 2026) – **publikovat firestore.rules PŘED kódem** |
| v20.5 | OM2 | 🔐 **Nastavitelná matice práv** (`settings/perm`, editor pro managera v ⚙️ → 🔐 Práva rolí, pravidla čtou matici – `can(modul, akce)`, přehled „kdo co smí“ v ⚙️ i v nápovědě); upravitelné buňky `EDITABLE` (události e/c/d, zápasy c/d, soupeři r/d, statistiky r, 📊 docházka r; hráčka jen r), ostatní pevné – **hotovo, k testu** (24. 10. 2026) – **publikovat firestore.rules PŘED kódem** |
| v20.5.1 | oprava | Realizační tým: funkce Manager / Trenér / Asistent / Jiný (stará „Kustod“ se zobrazuje jako Asistent, `kindOf`), texty „trenér a kustod“ → nové role – **nasazeno, otestováno** (24. 10. 2026) – pravidla beze změny |
| v20.6 | OM3 | 🔒 **Zúžení pravidel databáze** podle rolí: členy, ✋ žádosti o přijetí, bránu verze, návrh účtů pro QR a mazání rozpočtu jen manager; pokladna manager nebo 💰 pokladník; soupiska a realizační tým manager a trenér; bez staré role `kustod` a výjimky pro trenéra bez `rv` – **hotovo, k testu** (24. 10. 2026) – **publikovat firestore.rules PO kódu** |
| v20.7 | D4 | Úklid před Tréninkem: hotové převody pryč, stará role se nepřevádí, „kustod“ v komentářích, `LINE_NOS`, `main.js`, zkrácení plánu (poslech jen sezóny odložen do E2) – **hotovo, k testu** (24. 10. 2026), pravidla beze změny – podrobně `docs/plan-trenink.md` |
| v20.7.1 | oprava | Stav skóre u každého gólu v průběhu zápasu (detail zápasu → krok 3) – **hotovo, k testu** (25. 10. 2026), pravidla beze změny |
| v21.0 | E1 | 📚 Banka cvičení (Team → 📚 Cvičení), kolekce `drills`, modul matice `drills` – **nasazeno, otestováno** (25. 10. 2026) |
| v21.1 | E2a | 📋 Plán tréninku v detailu tréninku (bloky, stanoviště, točení, trenéři, brankářky, kontroly), kolekce `trplan`, modul matice `trplan`; 📷 obrázky (`drillimg`) a 📄 PDF u cvičení; ⚖ vyrovnané pětky; 🔒 Vyžadovat verzi v 👤 Účet; stav skóre v Zápisu utkání – **hotovo, k testu** (25. 10. 2026), **pravidla publikovat před kódem** |
| v21.2 | E2b | 📥 základní sada cvičení a 📄 import z CSV, ⧉ kopie plánu z předchozího tréninku, 📑 šablony plánu (`trtpl`), 📊 pokrytí dovedností, kontrola použití cvičení před smazáním – **hotovo, k testu** (25. 10. 2026), **pravidla publikovat před kódem** |
| v21.3 | E3 | ⏱ živý trénink (`trlive`, společné hodiny, Moje stanoviště, upozornění, Wake Lock), rozdělení do pětek s výběrem způsobu a ⚔ poměrem postů, ⭐ výkonnost hráček (`plevel`), bloky plánu podle postů – **hotovo, k testu** (25. 10. 2026), **pravidla publikovat před kódem** |
| v21.4 | E3b | ⏲ stopky a výsledky měření (`trms`, modul matice `treval`, výsledky vidí celý tým), ⌚ oznámení živého tréninku i na hodinky (akce ⏸ / ⏭ pro řídícího), ⏱ čas cvičení v plánu jen pro trénink (rychlá volba, délka z banky) – **hotovo, k testu** (25. 10. 2026), **pravidla publikovat před kódem** |
| v21.5 | K1 | 📱 telefon a příprava tréninku: nic neujíždí do šířky (CSS tabulek, polí a řádků), ✨ Připravit trénink, ⚙ Další volby bloku plánu – **hotovo, k testu** (25. 10. 2026), pravidla beze změny |
| v21.6 | E4 | ⭐ hodnocení cvičení (linka plánu, 😃 🙂 😐 😴, poznámka, volitelně hráčky; kolekce `treval`, jen realizační tým), výzva v ⏱ živém tréninku po kole jedním klepnutím, 📋 docs/testy-rucni.md – **hotovo, k testu** (25. 10. 2026), pravidla publikovat před kódem |
| v21.7 | K-T | 🖐 trénink jednodušeji (připomínky z testu 25.–26. 10.): ⭐ hodnocení po hráčkách (výzva po kole = seznam hráček stanoviště), detail události (hlavička, pořadí karet, úpravy pod rozbalením, podbarvené nadpisy karet), oprava skoku v ⭐ výkonnosti, kompaktní stopky, 📚 výběr cvičení s hledáním, ▶ / 📄 náhled videa a PDF – **hotovo, k testu** (26. 10. 2026), pravidla beze změny |
| v21.8 | K-T2 | ⏱ živý trénink podle skutečnosti: kolik zbývá do konce tréninku, o kolik plán přetahuje, ✂ −1 min kolo, 📋 zbytek plánu (další bloky −/+ / ⏭ vypustit jen pro průběh – `trlive.adj` / `skip`), ☕ pauza v plánu (`brk`), živý trénink jen realizační tým, 🎽 dres hráčky, název HockeyCoach, nadpis události s datem, sbalená docházka, ✏️ / 🗑 v Team – **hotovo, k testu** (26. 10. 2026), **pravidla publikovat před kódem, pak 🔒 21.8** |
| v21.9 | K-T3 | 🏃 štafeta ve stopkách: 2–4 skupiny, pořadí (střídavě nebo nasazením klepnutím), start všech skupin naráz, předávka klepnutím, čas hráčky (pokus) i skupiny (`trms…rl`) – **hotovo, k testu** (26. 10. 2026), pravidla beze změny |
| (hned po) | G0 | ⌚ ověření aplikace pro hodinky Garmin (každý trenér své oznámení a ovládání) – zpráva bez kódu |
| v22.0 | E | 🏒 **Modul Trénink**: E5 přehled a analýza (tabulky výsledků měření s porovnáním pro tým) – **podrobně `docs/plan-trenink.md`** |
| v21.7 | K | 🖐 **Komfort zadávání, ovládání a přehledu** (priorita uživatele 25. 10. 2026): průchod hlavních toků na telefonu – méně klepnutí, výchozí hodnoty, rychlé akce, přehledy na jedné obrazovce – podrobně `docs/plan-trenink.md` kap. 4 |
| v22.x | N | 🔔 Upozornění v aplikaci (sraz z UD1 jako čas připomínky; oznámení i na hodinky) – posunuto za Trénink a K |
| potom | P2 | ⭐ Jistota plateb: účet opsaný v telefonu, jméno příjemce v QR, „odesláno – čeká na potvrzení“ – **publikovat firestore.rules** |
| potom | G | ⌚ **Aplikace pro hodinky Garmin** (Connect IQ): živý trénink na hodinkách – odpočet kola, co teď / co potom, vibrace, ⏸ / ⏭, stopky – samostatná část projektu, nejdřív ověření (`docs/plan-trenink.md` kap. 4) |
| později | H | Souběžné tresty – přestavba formací, když hráčka chybí a hra je vyrovnaná (5 na 5, 4 na 4) – **jen myšlenka** |
| později | F | Jeden zapisovatel živého zápisu – ochrana proti duplicitám a souběhu dvou zařízení |
| později | E6 | Trénink – dlouhodobý plán, nákres cvičení, testovací baterie sezóny (`docs/plan-trenink.md`) |
| **poslední** | M | Další tým / jiný klub = **samostatná kopie: vlastní GitHub, vlastní projekt Firebase** (možnost A); kód na to připraví D1 (nastavení týmu a Firebase na jednom místě) – stále úplně poslední (25. 10. 2026) |

---

## Stav (aktualizováno 26. 10. 2026)
- **v21.9 (K-T3) dodáno, k testu:** 🏃 štafeta v okně stopek (`domain/relay.js`, běhy v `trms…rl`). Další G0 (ověření Garmin Connect IQ, bez kódu), pak E5.
- **v21.8 (K-T2) dodáno, k testu:** ⏱ živý trénink podle skutečnosti (do konce tréninku, přetahování, ✂ −1 min, 📋 zbytek plánu jen pro průběh), ☕ pauza jako blok plánu, živý trénink jen realizační tým, název HockeyCoach, události (nadpis s datem, podbarvená hlavička, sbalená docházka), ✏️ / 🗑 v Team. Pravidla `trliveOk` před kódem, pak 🔒 Vyžadovat verzi 21.8.
- **v21.7 (K-T) dodáno, k testu:** připomínky z testu – hodnocení po hráčkách, detail události, výkonnost bez skoku, kompaktní stopky, výběr cvičení s hledáním, náhled videa a PDF. Provoz: týmový Google účet spravuje manager (README – Provoz a správa).
- **v21.6 (E4) dodáno, k testu:** ⭐ hodnocení cvičení v kartě plánu (každá linka / stanoviště zvlášť, stupnice T5, druhé klepnutí zruší, 📝 poznámka a hodnocení hráček v okně `#tev`), výzva „Jak šlo cvičení?“ v ⏱ živém tréninku po skončeném kole (moje linky, jedno klepnutí), kolekce `treval/{eid}` (čte `treval r`, zapisuje `treval e`), `domain/training-eval.js`, `views/treval-view.js`; ruční testovací plán `docs/testy-rucni.md` (v21.3 – v21.6). **v21.5 nasazena, netestována; v21.3 – v21.4 testovány jen pohledem.**
- **v21.5 (K1) dodáno, k testu:** oprava šířky na telefonu (globální `table{min-width}` platí jen v `.tw`, pole a položky `.row` se smí zúžit, úzké tabulky zalamují, `#evw` nowrap jen v `.tw`), ✨ Připravit trénink (`quickSplit`, `loadPrep`, `latestTpl`), ⚙ Další volby bloku (`blockExtras`). Ověřeno měřením v Chromiu na 360 px.
- **v21.4 (E3b) dodáno, k testu:** ⏲ stopky (klepnutí na jméno = start / stop, víc hráček souběžně, ▶ Start všech, pokusy, nejlepší, počty a body) z ⏱ živého tréninku i z karty plánu, ⏲ výsledky měření s pořadím v kartě plánu (`trms/{eid}`, vidí celý tým kromě hostující), modul matice `treval`; ⌚ systémová oznámení živého tréninku „co teď / co potom“ (Android je zrcadlí na hodinky Garmin), akce ⏸ / ⏭ pro řídícího; v plánu ⏱ čas cvičení jen pro trénink (rychlá volba, převzetí délky z banky). Kontrola kódu v21.3 – oprava upozornění se zhasnutým telefonem. Pravidla publikovat před kódem. **v21.3 nasazena, živý trénink zatím neotestován.**
- **Rozhodnutí 25. 10. 2026:** měření není tajné – výsledky vidí celý tým (motivace, srovnání), během tréninku se jen zapisují; hodnocení a poznámky trenérů (E4) zůstávají jen realizačnímu týmu. Priorita: funkčnost a komfort zadávání, ovládání a přehledu (nová fáze K po E5); oznámení na hodinkách hned (v21.4), vlastní aplikace pro Garmin (G) později; jiný klub (M) stále úplně poslední.
- **v21.3 (E3) dodáno, k testu:** ⏱ živý trénink z karty plánu (společné hodiny `trlive/{eid}` s časem serveru a dorovnáním posunu hodin zařízení, ▶ / ⏸ / ⏮ ⏭ / +1 / +5 min / ⏹, převzetí řízení, Moje stanoviště, co následuje, vibrace a zvuk 60 s / 10 s, Wake Lock); rozdělení do pětek s výběrem způsobu (⚖ vyrovnaně, 📶 podle výkonnosti, 🔀 střídavě, 📋 základní formace) a ⚔ poměrem útočnic / obránkyň; ⭐ výkonnost 1–5 (`plevel/team`, jen realizační tým); bloky plánu dělené podle postů (`by: "pos"`). Řízení hodin = `trplan e` (rozhodnutí 25. 10. 2026). Pravidla publikovat před kódem.
- **v21.2 (E2b) nasazeno (25. 10. 2026).**
- **v21.2 (E2b) dodáno, k testu:** 📥 základní sada cvičení (hráčky a brankářky) a 📄 import z tabulky CSV v bance, ⧉ kopie plánu z předchozího tréninku, 📑 šablony plánu (kolekce `trtpl`, sdílené pro tým), 📊 pokrytí dovedností přihlášených hráček (14 / 30 / 60 dní), smazání cvičení jen nepoužitého (i s obrázky). Pravidla publikovat před kódem. Rozhodnutí: šablony i kopírování (obojí).
- **v21.1 (E2a) nasazeno (25. 10. 2026):** 📋 plán tréninku (karta pod Rozdělením do pětek, úprava na celé stránce), 📷 obrázky a 📄 PDF u cvičení, ⚖ vyrovnaně do 2–4 pětek, 🔒 Vyžadovat verzi v ⚙️ → 👤 Účet, stav skóre u gólů v Zápisu utkání. Pravidla publikovat před kódem. E2 rozděleno na v21.1 a v21.2 (rozhodnutí 25. 10. 2026).
- **v21.0 (E1) nasazeno a otestováno (25. 10. 2026):** 📚 banka cvičení v Team (přepínač 📚 Cvičení), nová kolekce `drills` a modul matice `drills` (trenér vše, asistent bez mazání, hráčka nic). Pravidla publikovat před kódem. v20.7.1 nasazena, netestována.
- **v20.7.1 dodáno, k testu:** stav skóre (naše : soupeř) u každého gólu v průběhu zápasu v detailu zápasu. v20.7 nasazena, částečně otestována bez nálezu.
- **v20.7 (D4) dodáno, k testu:** úklid před modulem Trénink – odstraněny hotové jednorázové převody (⚙️ Kontrola dat – pole `ex`, převod a úklid soukromí, 🔁 převod rolí), stará role `kustod` / `trener` bez `rv` se už nepřevádí (stejně jako v pravidlech v20.6), komentáře „kustod“ → asistent, `LINE_NOS` na jednom místě, `main.js` rozepsaný do bloků, plán zkrácen (dokončené fáze v archivu). Bez změny chování ostatních modulů.
- **Rozhodnutí 24. 10. 2026:** modul Trénink (E) před notifikacemi (N); odpovědi T1 – T5 v `docs/plan-trenink.md` kap. 6.
- v20.6 (OM3) dodána – výsledek testu a publikování `firestore.rules` uživatel zatím nehlásil.
- Další: **v21.8 – živý trénink podle skutečnosti**, v21.9 štafeta, G0 hodinky, pak E5 přehled (`docs/plan-trenink.md`) – průběžně výsledky testů podle `docs/testy-rucni.md`.

## H – později: Souběžné tresty a chybějící hráčka při vyrovnané hře (myšlenka, přidáno 22. 10. 2026)
Zatím jen zamyšlení – nezařazeno do verze, rozhodne se po v18.6.

**Situace:** obě mužstva dostanou trest současně (souběžné / vzájemně se rušící tresty) nebo naše hráčka dostane trest, který tým neoslabuje (10 min osobní, do konce zápasu). Na trestné sedí jedna nebo dvě naše hráčky, ale hra je vyrovnaná – podle pravidel IIHF dál 5 na 5 (náhrada na ledě je povolena), případně 4 na 4 nebo 3 na 3. Skupina jednotek PP/OS se nepoužije (`grpFor` = null), přesto **hráčka v pětce chybí** a trenér musí hned reagovat: kdo jde za ni do pětky, případně jak hrát se čtyřmi.

**Stav v kódu (v18.4.2):**
- `sk` v `live-engine.js` počítá každý menší a větší trest jako oslabení, takže jeden trest na každé straně = **4 na 4**. Souběžné tresty s náhradou (5 na 5) aplikace nezná – pravidlo IIHF pro tento případ ověřit (kdy 4 na 4 a kdy náhrada).
- Při 4 na 4 se ukáže rozložení pro 4 (`LAYOUT(4)`) s běžnými pětkami; jednotka 4 hráček se nenabídne (OS1/OS2 jsou jen pro oslabení).
- Osobní trest (10 min) tým neoslabuje: hráčka zmizí z ledu i fronty, její místo v pětce zůstane prázdné a doplní se jen z fronty – žádné upozornění ani nabídka.

**Možný směr (k rozhodnutí):**
- Po zápisu trestu, kdy hra zůstane vyrovnaná, ale naše hráčka chybí v pětce, hned otevřít nabídku podobnou té po zranění: Sestava s vyznačeným místem (`S.lgap`), návrh náhradnice (stejná pozice, nejméně času na ledě), potvrzení jedním klepnutím. Náhrada jen dočasná – po návratu z trestu se sestava vrátí.
- Při 4 na 4 nabídnout „čtyřku“ – buď jednotky OS1/OS2, nebo samostatnou volbu „4 na 4“ (nové jednotky v `sp` by znamenaly změnu dat a předzápasové sestavy).
- Upozornění v `#lwarn`: „V 2. pětce chybí #12 (trest) – doplň místo“.
- Volba při zápisu trestu „souběžný trest – s náhradou“ (hra 5 na 5) by vyžadovala zásah do `live-engine.js` (`addPen` / `sk`) – jen po dotazu.
- Otevřené: viz otázka 12.

## F – později: Jeden zapisovatel živého zápisu (duplicity, dvě zařízení)
Stav: živý zápis může otevřít víc zařízení zároveň; při souběhu vyhrává poslední zápis (`save` přepíše celý zápas), takže se dvě zařízení „přetahují“ a mohou vzniknout duplicitní záznamy (dvakrát zapsaná střela, gól, střídání).
- **Zámek zapisovatele:** v zápase pole `live.dev = {id zařízení, jméno uživatele, ts}`; zařízení drží zámek obnovou `ts` (např. každých 20 s při otevřeném živém zápisu).
- **Ostatní zařízení jen ke čtení:** vidí živý zápis (skóre, čas, průběh), ale tlačítka zápisu jsou zamčená s informací „Zapisuje: jméno“. Tlačítko **Převzít zápis** (s potvrzením; automaticky, když zámek vyprší – např. 60 s bez obnovy).
- **Zápis přes transakci** (Firestore `runTransaction`) s kontrolou zámku, aby dva zápisy těsně po sobě nepřepsaly jeden druhý.
- **Ochrana proti dvojímu klepnutí:** stejná akce (střela, gól, střídání téže hráčky) do ~1 s po předchozí se nezapíše podruhé, nebo se nabídne „Opravdu znovu?“.
- Offline: zámek se v hale bez signálu neověří – zapisující zařízení pokračuje, převzetí se povolí až po obnovení spojení.
- Pravidla databáze: pravděpodobně beze změny (zápasy zapisuje trenér a kustod), případně kontrola pole `live.dev` – **pak nutné publikovat `firestore.rules`**.
- Zařadit po fázi D (před modulem Trénink), nebo dřív, pokud budou souběhy v praxi vadit.

## ⭐ P2 – poslední: Jistota plateb pro hráčky (přidáno 22. 10. 2026, odloženo)
Cíl: co největší jistota platící, že peníze odešly na správný účet – i kdyby někdo podvrhl data (Firestore, zneužitý účet správce, domluva dvou správců).
Omezení (vědomě): kontrola v aplikaci nechrání před změnou samotného kódu (napadený GitHub / hosting) – útočník by ji z kódu odstranil. Proti tomu jen ochrana mimo aplikaci (body 5–7).
**V aplikaci (v19.6):**
1. **Účet uložený v telefonu hráčky:** hráčka si účet týmu uloží jednou **opsáním** čísla účtu (z papíru / od trenéra osobně), ne klepnutím. Nahradí dnešní „Ověřila jsem účet“ (`seenAccs` / `markSeen` v `bank-account.js`, okno QR v `mine.js`).
2. **Porovnání při každém QR:** účet z databáze ≠ uložený v telefonu → QR se **nevytvoří**, červené varování „Účet týmu nesouhlasí s účtem uloženým v tvém telefonu – neplať a ozvi se trenérovi“. Změna = znovu opsat nové číslo.
3. **Jméno příjemce v QR** (`RN:` – název majitele účtu přesně podle banky; banky ho zobrazí, ověřování jména příjemce u CZK plateb se zavádí, povinné do 2027). Rozhodnout: přesný název majitele účtu.
4. **Potvrzení přijetí:** u předpisu stav „odesláno – čeká na potvrzení přijetí“ (hráčka označí odeslání), když pokladník úhradu do X dní nezapíše → připomenutí hráčce, ať se ozve. Rozhodnout: lhůta (návrh 7 dní).
**Mimo aplikaci (doporučení pro tým, do nápovědy):**
5. Účet týmu uložit jako **příjemce / šablonu v bankovní aplikaci** každé hráčky (ověřit osobně jednou) – nejsilnější ochrana, nezávislá na aplikaci.
6. **Jediný zdroj pravdy mimo aplikaci:** číslo účtu na papíře v šatně / na webu klubu; změnu účtu oznamovat osobně na tréninku, nikdy jen zprávou.
7. **Zabezpečení přístupů:** GitHub i Google/Firebase jen s dvoufázovým ověřením (passkey / bezpečnostní klíč), minimum lidí s právem zápisu a vlastníků projektu Firebase, ochrana hlavní větve na GitHubu, upozornění na změny ve Firebase. Každá verze, která sahá na platby, je v CHANGELOG výslovně označena (`bank-account.js`, `mine.js`, `cash.js`, `firestore.rules`) – zkontrolovat před nahráním.
8. Navazuje zbývající riziko z P (trenér přidá vlastní druhý e-mail jako pokladníka): audit změn členů týmu a zákaz potvrzení čerstvě přidaným členem.
**Upřesnění po kontrole (22. 10. 2026):** body 1–4 = **P2a** (v19.6). Bod 3 potřebuje nové pole se jménem majitele účtu v `settings/cash` – musí být **pod stejnou ochranou 4 očí** jako `iban` (doplnit do `accSame()` a potvrzení v `firestore.rules` a do `ACC_KEYS` v `storage.js`), jinak by šlo jméno měnit bez potvrzení. Bod 4 potřebuje zápis hráčky („odesláno“) – dnes `charges` zapisuje jen správce pokladny → nové pole s úzkým pravidlem, nebo kolekce `chsent/{cid}` → **publikovat firestore.rules** (P2 tedy není „jen v aplikaci“). Bod 8 vyžaduje `addedAt` v `members` vynucené pravidly (`request.time`) a audit změn členů – patří do **O** (tam se pravidla `members` přepisují).

## N – v22.x: Notifikace (přidáno 22. 10. 2026, návrh; posunuto za Trénink – rozšíření níže)
Cíl: upozornit každého, koho se to týká, i když aplikaci nemá otevřenou.
**Druhy upozornění:**
1. **Blíží se událost** – jen přihlášeným („Jdu“), např. 3 h před začátkem (trénink i zápas).
2. **Blíží se uzávěrka přihlašování** – členům **bez odpovědi** (případně i „Nejsem jistý“), např. 24 h a 2 h před `dl`.
3. **Nová událost** – všem členům (trénink / zápas založený trenérem nebo kustodem), s tlačítkem otevřít detail.
4. **Nový platební předpis** – jen vlastníkovi předpisu (`mid` = jeho `pid` / `tid`): vyúčtování události, měsíční příspěvek; bez částky v textu na zamčené obrazovce (návrh), částka až v aplikaci. Volitelně i připomínka splatnosti / „po splatnosti – přihlášení zablokováno“.
**Technické řešení (návrh):**
- **Web Push přes Firebase Cloud Messaging (FCM):** PWA si vyžádá povolení (klepnutím, ne automaticky), uloží token zařízení do `pushTokens/{token} = {email, pid, tid, ua, at}`; service worker `sw.js` zobrazí notifikaci a po klepnutí otevře příslušnou obrazovku (událost / Moje platby).
- **Odesílání ze serveru:** **Cloud Functions** – spouštěče Firestore (nový dokument v `events` / `matches` → upozornění 3; nový dokument v `charges` → upozornění 4) a plánovaná funkce (např. každých 15 min) pro upozornění 1 a 2. Klient sám nic neposílá (klíč serveru nesmí být v aplikaci). **Vyžaduje tarif Firebase Blaze** (platba podle využití; pro tým v rámci bezplatných limitů) a nasazení funkcí (`firebase deploy --only functions`) – nová část repozitáře `functions/`.
- **Deduplikace:** záznam odeslaných upozornění `pushLog/{druh}_{eid}_{člen}`, aby plánovaná funkce neposílala dvakrát.
- **Nastavení u člena:** v ⚙️ „🔔 Upozornění“ – zapnout v tomto zařízení, volba druhů (1–4) a předstihu; uloženo v `members/{email}.notify` nebo v `pushTokens`.
- **Omezení:** iPhone jen u PWA přidané na plochu (iOS 16.4+); Android Chrome bez omezení; bez internetu se upozornění doručí po připojení. Prohlížeč bez podpory → aplikace jen ukáže, že upozornění nejdou.
- **Pravidla:** `pushTokens` zapisuje jen vlastník (e-mail tokenu = přihlášený), čte jen server (Admin SDK pravidla obchází) → **publikovat firestore.rules**.
- **Alternativa bez serveru (slabší):** jen místní upozornění při otevřené / nedávno otevřené aplikaci (Notification API v `sw.js`) – nespolehlivé, nedoporučeno.
- **Postup:** nejdřív kostra (povolení, token, testovací upozornění z ⚙️ přes funkci), pak druhy 3 a 4 (spouštěče), nakonec 1 a 2 (plánovaná funkce). Případně rozdělit na v18.9 a v18.9.1.

### N – rozšíření návrhu (vysoká náročnost, Firebase Blaze + Cloud Functions)
Vše ze sekce N platí; doplnění:
- **Nastavení u události:** připomínka uzávěrky přihlašování (výchozí např. 1 den a 1 hodina před `dl`) a připomínka **před srazem / odjezdem**, ne před začátkem zápasu – u události nové volitelné pole **„Sraz / odjezd“** (čas a místo); výchozí předstihy v nastavení týmu, u události lze přepsat nebo vypnout.
- **Turnaj / vícedenní akce:** událost s datem „do“ (nový typ Turnaj později) – připomínka podle srazu prvního dne.
- **Nové druhy (doplněno 23. 10. 2026):** 11) nepřítomnost člena zasahuje do uzavřené události (trenérovi / asistentovi – NP), 12) zápas začal – odkaz na náhled živého zápasu (členům, volitelně – UP).
- **Nové druhy:** 5) událost zrušena (všem přihlášeným, i „nejistá“), 6) nová žádost o změnu účasti (trenérům), 7) žádost vyřízena (žadateli), 8) hostující hráčka vyřazena z nominace (ihned jí), 9) nová žádost o změnu placení (pokladníkovi a trenérovi – PM), 10) rozpočet: měsíc ve ztrátě nebo odchylka nad hranici (trenérovi a pokladníkovi – RP).
- Otázky 13–17 platí, nově 28.

## M – později: Nasazení pro další týmy (nejvyšší náročnost – nejdřív diskuse)
Požadavky: týmy o sobě nic nevidí; kdo si aplikaci koupí, řeší veškerou administraci sám (členové, účty, peníze).
**Možnosti struktury:**
| | A) Samostatná kopie pro každý tým | B) Jedna aplikace, jedna databáze, data po týmech | C) Jedna aplikace, každý tým vlastní projekt Firebase |
|---|---|---|---|
| Popis | tým dostane balíček, vlastní hosting + vlastní projekt Firebase | `teams/{teamId}/…` v jednom projektu, pravidla podle členství v týmu | jedna adresa aplikace (aktualizuješ jednou), po přihlášení / kódu týmu se načte konfigurace Firebase daného týmu |
| Oddělenost dat | úplná (jiný projekt) | jen pravidly – chyba v pravidlech = únik mezi týmy | úplná (jiný projekt) |
| Kdo platí Firebase (Blaze, notifikace) | tým | ty (přeúčtovat v ceně) | tým |
| Aktualizace | každý tým zvlášť (riziko starých verzí) | jedna, pro všechny najednou | kód jednou; pravidla a funkce do každého projektu (skriptem) |
| Založení týmu | technicky náročné pro kupujícího (projekt, pravidla, přihlášení Google) | jednoduché (formulář, „správce systému“) | střední – průvodce, nebo založení za tým |
| Právní (GDPR) | tým = správce dat, ty jen dodavatel softwaru | ty = zpracovatel osobních údajů všech týmů (smlouva o zpracování) | tým = správce, ty dodavatel |
| Zásah do kódu | malý (konfigurace) | velký (cesty všech kolekcí, pravidla, výběr týmu, správa licencí) | střední (výběr konfigurace, dynamická inicializace Firebase) |
- **Příprava už v D:** cesty kolekcí přes `col()` (bod 15), nastavení týmu na jednom místě (16), oprávnění přes `can()` (14) – hodí se pro všechny tři možnosti.
- **K diskusi:** otázka 30 (model, licence, kdo zakládá tým, hosting / doména, zálohy a přenos dat při odchodu týmu, podpora, jazyk aplikace, více týmů jednoho trenéra).

## E – Modul Trénink (v21.x)
Zařazeno 24. 10. 2026 po v20.6, před notifikace (N). Kontrola kódu, úklid D4, datový model, fáze E1 – E6, práva a otázky T1 – T5 jsou v samostatném dokumentu **`docs/plan-trenink.md`**. Příprava z dřívějška: docházka jako čistá doménová funkce (`attendance.js`), pětky tréninku včetně realizačního týmu (`events.lines`, klíč `"t:" + id`).

## Otevřené otázky
Rozhodnuto 22. 10. 2026: 11 – náhled jen pro e-maily vývojáře, výchozí jen ke čtení s volbou Povolit zápis; 1 – Zpět ze živého zápisu zavře rychlý zápis / panel / menu, jinak dotaz na odchod a **odchod zastaví čas**; 3 – panel PP/OS po vyloučení vždy (viz Stav a rozhodnutí); ostatní body podle návrhů: 2 – malé tlačítko partnerky pošle rovnou na led, pořadí rotace podržením; 4 – pevný řádek upozornění nad průběhem (hotovo ve v18.1); 5 – jen rozložení B, A zrušeno (změna po testu v18.2); 6 – dlužnice s výjimkou zůstává se značkou 🔓, realizační tým ne; 7 – jen uplynulé události, procenta z událostí ve zvoleném období od–do (výchozí sezóna 1. 8. – 1. 7.; aktivita hráčky se v datech neeviduje); 8 – karta zápasu o krok zpět (hotovo); 9 – +/- brankářkám nepočítat ani v celkových statistikách (změní čísla, ve fázi D); 10 – kontrola pole `ex` v ⚙️ před smazáním `legacyEx`.
Původní znění:
1. Zpět ze živého zápisu: jen zavřít panel/menu, nebo i opustit živý zápis (s dotazem)?
2. Rotace: má malé tlačítko partnerky posílat rovnou na led (bez změny pořadí rotace), nebo jen přehodit pořadí? Jak pak měnit pořadí rotace ručně (podržením)?
3. Po trestu: otevřít panel automaticky vždy, nebo jen když máme sestavené jednotky PP/OS? Má se otevřít i po skončení trestu (návrat do řad)?
4. Upozornění v průběhu: jako řádky v seznamu, nebo jednořádkový pevný ticker nad průběhem?
5. Výchozí rozložení živého zápisu pro nové uživatele: A, nebo B? → **změněno 22. 10. 2026: jen B** (A zrušeno).
6. Dlužníci: skrýt dlužnici s výjimkou z blokace? Ukazovat i realizační tým (nemá předpisy – asi ne)?
7. Docházka: počítat jen uplynulé události, nebo i budoucí s odpovědí? Procenta z událostí, na které byla hráčka nominovatelná (aktivní), nebo ze všech?
11. Náhled role (G): kdo ho smí používat – jen vývojář (seznam e-mailů), nebo každý trenér? Má být v náhledu zápis zakázaný (návrh: ano)?
13. Notifikace (N): souhlas s Firebase Blaze + Cloud Functions (nutné pro doručení při zavřené aplikaci)? Kdo nasadí funkce (`firebase deploy`)?
14. Notifikace: předstih – událost (návrh 3 h), uzávěrka (návrh 24 h a 2 h); upozornit na uzávěrku i „Nejsem jistý“?
15. Notifikace: nová událost všem, nebo jen hráčkám bez ukončených (⛔) a realizačnímu týmu? Upozornit i na změnu času / místa a zrušení události?
16. Notifikace předpisu: s částkou v textu, nebo bez (zamčená obrazovka)? Připomínat splatnost (např. den před) a „po splatnosti“?
17. Notifikace: smí si každý člen druhy upozornění vypnout sám (návrh ano), nebo je určuje trenér?
12. Souběžné tresty (H): má aplikace znát souběžné tresty s náhradou (5 na 5) vedle 4 na 4? Doplnit chybějící hráčku dočasně jen pro trest, nebo trvale? Při 4 na 4 použít OS1/OS2, nebo nové jednotky „4 na 4“?

## Pravidla práce (z projektu)
- Vždy vypsat načtenou verzi; vracet změněné soubory jako celky ke stažení (zip s cestami), žádné NAJDI/NAHRAĎ, žádné zkracování.
- Struktura souborů a stručné komentáře po blocích; česky.
- Bez Git příkazů.
- Neměnit nesouvisející logiku (střely, góly, časomíra, tresty, pokladna). Když požadavek vyžaduje další úpravu jinde, upozornit a zeptat se.
- Zapsat verzi do `CHANGELOG.md` a řádek Aktuální verze v README, upravit nápovědu `help.js`, verzi (`storage.js`, `package.json`, cache `sw.js`); při změně pravidel výslovně napsat „publikovat firestore.rules“.
