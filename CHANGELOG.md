# Changelog – HockeyCoach

Historie verzí aplikace, nejnovější nahoře. Formát podle zvyklosti „Keep a Changelog“: u každé verze datum, krátké shrnutí a seznam dotčených souborů.
Číslování: hlavní verze (v18) = větší celek podle plánu, druhé číslo (v18.2) = fáze plánu, třetí číslo (v18.1.1) = oprava bez nových funkcí.
Číslo verze je od v18.8 v `src/core/app-version.js` (`APP_VERSION`, `APP_DATE`), v `package.json` (shodu hlídá `npm test`) a v názvu cache v `sw.js` (`hokej-vNN`) – mění se vždy všechna tři. Do v18.7.1 bylo v `src/data/storage.js` (`VERSION`). Úplný postup vydání: `docs/KONVENCE.md`, kapitola 4.

## v19.4.1 (23. 10. 2026) – PM část 2: Žádost o změnu placení, historie způsobu placení – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **Publikovat `firestore.rules` PŘED nahráním kódu** (nová kolekce `requests`, pole `grpH` v `plpay`). 3) Nahrát kód (nové soubory `src/domain/requests.js`, `src/views/request-list.js`, `tests/pm-requests.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.4.1 v záhlaví. 5) Hráčka: Moje platby → 📅 Po měsících → ✋ Požádat o změnu placení; trenér / pokladník: Team → 💰 Platby → pruh ✋ → okno žádosti → ✓ Schválit / ✕ Zamítnout.
> **🔒 Vyžadovat verzi v19.4.1: ANO – před prvním schválením žádosti** (hned po přechodu všech zařízení). Starší verze historii `grpH` nezná: počítala by příspěvky a vyúčtování podle pole `grp` (dnešní stav) a její ruční úprava plateb by historii nezohlednila.
> **⚠️ SAHÁ NA PLATBY:** `src/domain/cash.js` (`grpAt`, `asOf`, `grpHWith`; `grpOf` u hráčky s historií podle dnešního měsíce; `contribRows` s měsícem příspěvku), `src/views/payments.js` (přihlášené hráčky se skupinou platnou v den události), `src/views/money.js` (příspěvky podle skupiny v měsíci příspěvku), `src/views/modal.js` (ruční změna skupiny u hráčky s historií), `src/views/mine.js`, `src/views/finance.js`, `firestore.rules`. **`calcCash` se nemění**; hráčky bez `grpH` se počítají přesně jako dřív (srovnávací testy pokladny beze změny). Už vystavené příspěvky a uzavřená vyúčtování se nikdy nepřepočítávají. Návrat na v19.4: nahrát předchozí zip, 🔒 minimální verzi snížit ručně v konzoli (`settings/app.minVer`); u hráček se schválenou změnou pak platí jen pole `grp`.

**Přidáno**
- **✋ Požádat o změnu placení** (hráčka, Moje platby → 📅 Po měsících): Příspěvek ↔ Za událost od zvoleného měsíce (příští až 6 měsíců dopředu), poznámka. Jedna otevřená žádost; dokud čeká, lze ji zrušit (potvrzení druhým klepnutím). Stav nahoře v Moje platby: čeká / ✅ schváleno / ❌ zamítnuto s odpovědí (vyřízená 30 dní). Osvobozená hráčka nežádá (otázka 44 podle návrhu – osvobození a koeficient osobně).
- **Žádosti pro trenéra a pokladníka:** pruh „✋ N žádostí o změnu placení“ v Team → 💰 Platby (a odkaz v Událostech), okno žádosti s náhledem dopadu – porovnání způsobu placení hráčky v sezóně, už vystavené příspěvky a uzavřená vyúčtování od měsíce změny (nepřepočítají se, jen upozorní). **✓ Schválit / ✕ Zamítnout** (potvrzení druhým klepnutím, odpověď hráčce) – jedna dávka: žádost + `plpay/{pid}` (`grpH`, `grp`) + audit (`req-ok` / `req-no`). Vlastní žádost (hráčka-pokladník) vyřizuje jiný správce pokladny.
- **Historie způsobu placení** `plpay.grpH = [{ym, grp}]` (od měsíce ym platí grp, `ym ""` = stav před první změnou): příspěvky měsíce podle skupiny v tom měsíci, vyúčtování události podle skupiny v den události, porovnání v Moje platby po měsících (u sezóny se změnou poznámka). Pole `grp` = stav ke dni schválení (pro starší verze).
- Kolekce **`requests/{id}`** = {kind: "pay", mid, at, by, st: "open" | "ok" | "no", from, to, ym, note, reply, doneBy, doneAt} – společná s budoucí fází W (`kind: "att"`). Mimo zálohu (výsledek je v `plpay` a v auditu).
- `src/domain/requests.js` (`reqYms`, `reqsOf`, `openReq`, `openReqs`, `payReqError`, `payReqDoc`, `decidePlan`, `impactOf`), `src/views/request-list.js` (pruh, okno, vyřízení), v `src/domain/cash.js` `grpAt`, `asOf`, `grpHWith`. `tests/pm-requests.test.js` (10 testů): skupina podle měsíce, `calcCash` přes `asOf` (dělitel beze změny, vstup beze změny), příspěvky podle měsíce, historie, porovnání s historií, kontrola a dokument žádosti, schválení / zamítnutí, dopad, pravidla.

**Změněno**
- Pravidla: `plpay` dovolí pole `grpH` (seznam); `requests` – hráčka vytvoří jen vlastní otevřenou žádost pod svým e-mailem (jen povolená pole, poznámka do 300 znaků) a smí ji smazat, dokud je otevřená; čte vlastník a správce pokladny; vyřizuje správce pokladny (ne vlastní), mění jen `st` (ok / no), `reply`, `doneBy` (jeho e-mail), `doneAt`.
- Ruční změna skupiny v Upravit → Platby u hráčky s historií se zapíše i do `grpH` od běžného měsíce (běžný měsíc mění jen pokladník ručně).
- Poslech: správci pokladny celou kolekci `requests`, ostatní své žádosti (dotaz `mid`).
- `src/views/help.js`, `src/core/state.js` (`rq`, `rqo`), `src/main.js`, `src/data/storage.js`, `src/domain/private-data.js` (`grpH` se připojí k hráčce), `src/domain/economy.js` (`compareMonths` po měsících podle historie, `contribOf` podle měsíce), `tests/privacy.test.js`, `tests/project.test.js`, `tests/pm-months.test.js`, `docs/plan-v18.md`, `docs/KONVENCE.md`, `docs/prompt-dalsi-vlakno.md`, `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v61`).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka, série tréninků, `calcCash`, šablony, QR, hospodaření události a měsíce. Ověřeno: `npm test` (141, srovnávací test D1 a testy pokladny beze změny), kouřový test v jsdom mimo repozitář – start bez chyb pro hráčku, hráčku-pokladníka, trenéra a kustoda; hráčka: podání žádosti (zápis jen `requests`, od prosince 2026, poznámka), stav otevřené žádosti, formulář skrytý, zrušení (smazání jen `requests/r1`); trenér a pokladník: pruh v Událostech i v Platbách, okno s náhledem dopadu, schválení zapíše `requests/r1` (st ok, odpověď), `plpay/p1` (`grpH` od 2026-11, `grp` dnes „monthly“) a audit; hráčka-pokladník u vlastní žádosti bez tlačítek; kustod nic nevidí a nezapisuje.

## v19.4 (23. 10. 2026) – PM část 1: Moje platby po měsících, porovnání způsobu placení (ceny na hlavu evprice) – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **Publikovat `firestore.rules` PŘED nahráním kódu** (nová kolekce `evprice`). 3) Nahrát kód (nový soubor `tests/pm-months.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.4 v záhlaví. 5) Trenér nebo pokladník: ⚙️ → Pokladna → **💲 Doplnit ceny pro hráčky** (ceny pro dříve uzavřené události). 6) Hráčka: Moje platby → 📅 Po měsících, ⚖️ Kdybych platila jinak.
> **🔒 Vyžadovat verzi:** není nutné (data se jen přidávají – nová kolekce `evprice`; starší verze ji nečte ani nezapisuje). Doporučeno nastavit v19.4 po přechodu všech zařízení, aby každé uzavření / znovuotevření vyúčtování zapsalo cenu samo (jinak ji doplní tlačítko 💲).
> **⚠️ SAHÁ NA PLATBY:** `src/views/mine.js` (nový pohled), `src/views/payments.js` (po dávce uzavření se zapíše cena na hlavu, po znovuotevření se smaže – mimo dávku, nepublikovaná pravidla vyúčtování nezastaví), `firestore.rules` (nová kolekce `evprice`: čte každý člen, zapisuje správce pokladny, jen pole `ym`, `date`, `tpl`, `head`). **`src/domain/cash.js` se nemění** – `calcCash`, předpisy, příspěvky, šablony, QR. Návrat na v19.3: nahrát předchozí zip (kolekce `evprice` zůstane a nevadí; pravidla lze ponechat).

**Přidáno**
- **Moje platby → přepínač 📄 Předpisy / 📅 Po měsících:** za každý měsíc sezóny (1. 8. – 30. 6., šipky ◀ ▶) předepsáno (zvlášť příspěvek a události), zaplaceno, zbývá; klepnutím se měsíc rozbalí na předpisy (u nezaplaceného tlačítko QR). Souhrn sezóny (předepsáno / zaplaceno / zbývá). Měsíc podle data události a měsíce příspěvku (ne splatnosti), částečná úhrada se počítá v měsíci předpisu, přeplatek nejvýše do výše předpisu (rozhodnutí 20).
- **⚖️ Kdybych platila jinak** (hráčka): po měsících a za sezónu skutečně předepsáno vs. druhý způsob placení. S příspěvkem = cena na hlavu × koeficient za uzavřené události, kde byla přihlášená a skupina Za událost platí; za událost = příspěvek (dnešní výše) × koeficient + události, kde platí i Příspěvek. Věta „Výhodnější by byl …“ jen jako informace. Osvobozená hráčka a koeficient 0 % porovnání nemají; neuzavřené a budoucí události se nepočítají.
- **Kolekce `evprice/{eid}` = {ym, date, tpl, head: {monthly, single, exempt}}** – cena uzavřené události na hlavu před koeficientem (0 = skupina neplatí; výpočet = náklady ÷ všechny přihlášené, paušál = flat). Hráčky vidí jen cenu na hlavu, ne celkové náklady ani dodavatele (otázka 45 podle návrhu). Mimo zálohu (odvozuje se z `evcash`), maže se se smazanou událostí.
- **⚙️ → Pokladna → 💲 Doplnit ceny pro hráčky** (trenér a pokladník): doplní chybějící a změněné ceny ze snapshotů uzavření, smaže ceny otevřených a smazaných událostí; idempotentní.
- `src/domain/economy.js`: `myMonths`, `chargeYm`, `compareMonths`, `headOf`, `priceDoc`, `pricePlan`, `PRICE_COLL`. `tests/pm-months.test.js` (6 testů): měsíce sezóny, cena na hlavu shodná s `calcCash`, doplnění cen (podruhé nic), porovnání pro hráčku s příspěvkem / za událost, osvobozená a koeficient 0.
- Datová vrstva: `db.collection(c).one(id)` – poslech jednoho dokumentu (hráčka čte jen svůj `plpay/{pid}`).

**Změněno**
- Hráčka poslouchá svůj dokument `plpay/{pid}` (skupina a koeficient – pravidla to dovolovala už od v19.1) a všichni členové kolekci `evprice` (`S.pr`). Chyba načtení (nepublikovaná pravidla) jen vypne porovnání.
- PM rozdělena: žádosti o změnu placení (`requests`, historie `grpH`, `grpAt` v předpisech) přijdou v další verzi. Zápis ceny je oproti plánu **mimo** dávku uzavření (bezpečnější – vyúčtování nezávisí na nových pravidlech).
- `src/views/help.js` (Moje platby, 💲 Doplnit ceny), `src/core/state.js` (`pr`, `mk`), `src/main.js`, `src/data/storage.js`, `tests/project.test.js` (pravidlo `evprice`), `tests/support/firebase-stub.mjs` (poslech dokumentu), `docs/plan-v18.md`, `docs/KONVENCE.md`, `docs/prompt-dalsi-vlakno.md`, `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v60`).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka, série tréninků, `src/domain/cash.js` (výpočet předpisů, příspěvky, platy, QR), hospodaření události a měsíce (v19.3), seznam předpisů a QR platba v Moje platby. Ověřeno: `npm test` (131, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář – start bez chyb pro hráčku, hráčku-pokladníka, trenéra a kustoda; hráčka: Moje platby → Po měsících (sezóna 2026/27, rozbalení měsíce, ◀ předchozí sezóna), připojený vlastní `plpay` (koeficient 80 %), porovnání 400 Kč → 800 Kč „současný způsob je výhodnější“, žádný zápis; trenér a pokladník: uzavření vyúčtování zapíše `evprice/t2` s cenou 1 000 Kč na hlavu, 💲 Doplnit ceny zapíše chybějící `evprice/t1`, žádné jiné zápisy; kustod bez tlačítka 💲 a bez Moje platby.

## v19.3 (23. 10. 2026) – EK: Hospodaření události a měsíce (podíl příspěvků, výsledek, návrh poplatku) – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **`firestore.rules` se nemění – nepublikovat.** 3) Nahrát kód (nové soubory `src/domain/economy.js`, `tests/economy.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.3 v záhlaví. 5) Trenér / pokladník: detail tréninku → 💰 Pokladna (podíl příspěvků, výsledek, 💡 Navrhnout poplatek), Team → 📅 Měsíce → ⚖️ Hospodaření měsíce.
> **🔒 Vyžadovat verzi:** není nutné (data se jen přidávají – pole `share` a `ym` ve snapshotu `evcash.settle`; starší verze je ignoruje a vyúčtování nemění). Doporučeno nastavit v19.3 až po přechodu všech zařízení, aby každé nové uzavření neslo uložený podíl příspěvků.
> **⚠️ SAHÁ NA PLATBY:** `src/views/payments.js` (souhrn vyúčtování, návrh poplatku, snapshot při uzavření doplněn o `share` a `ym`), `src/views/money.js` (nová karta). **`src/domain/cash.js` se nemění** – `calcCash`, předpisy, příspěvky, šablony, QR ani pravidla databáze; návrh poplatku jen předvyplní hodnoty u jedné události. Návrat na v19.2: nahrát předchozí zip (pole `share` / `ym` zůstanou a nevadí).

**Přidáno**
- **Vyúčtování události (detail → 💰 Pokladna):** u události kryté příspěvkem (skupina Příspěvek neplatí a událost má náklady) řádek **náklady · vybereme za událost · podíl příspěvků (z toho zaplaceno) · výsledek** – ✅ kryto / přebytek, ⚠️ schodek jen tam, kde ztrátu nekryje ani podíl příspěvků; řádek „Měsíc: N událostí kryjí příspěvky X Kč (Y hráček), na událost průměrně Z Kč“. U uzavřené události podíl z okamžiku uzavření (u starších uzavření „dnešní odhad“).
- **💡 Navrhnout poplatek** (když platí skupina Za událost nebo Osvobozené): a) výpočet (náklady ÷ hráčky v poli), b) paušál = (náklady − podíl příspěvků − platby ostatních skupin) ÷ součet koeficientů platících, nahoru na celé Kč; u obou vybraná částka a výsledek. **Použít** jen předvyplní rozpracovanou úpravu; uloží ji stávající Uložit nastavení / Uzavřít vyúčtování. Šablony a nastavení pokladny se nemění.
- **Team → 📅 Měsíce → ⚖️ Hospodaření měsíce:** příspěvky (předepsáno / zaplaceno / počet hráček, odhad ze soupisky, dokud nejsou vystavené), platby za události (uzavřené + odhad neuzavřených z přihlášených), náklady událostí (vyúčtované + plánované ze šablon / uloženého nastavení), vyplacené platy, **výsledek měsíce**, řádek **Led** (led se vyplatil / ztráta) a seznam událostí měsíce s výsledkem každé. Měsíc podle data události a měsíce příspěvku (ne splatnosti).
- `src/domain/economy.js` – čisté funkce `coveredBy`, `monthEvents`, `contribOf`, `monthEconomy`, `eventResult`, `suggestFlat` (použije i Rozpočet RP pro „skutečnost“).
- `tests/economy.test.js` (10 testů): kryté události, dělení příspěvků podle nákladů, zaplacená část podílu, uložený podíl po uzavření, rozpracovaná úprava, platy, odhad nevystavených příspěvků, návrh výpočtem i paušálem (vstup se nemění, nikdy záporně), `calcCash` beze změny.
- Data: snapshot uzavření `evcash/{id}.settle` má navíc `share` (podíl příspěvků v okamžiku uzavření, u nekrytých 0) a `ym` (měsíc události).

**Změněno**
- Otázky 41–42 podle návrhu v plánu: příspěvky měsíce se dělí mezi kryté události podle nákladů (dražší led nese větší díl), počítají se předepsané (zaplacené se ukazují zvlášť); mimořádný trénink, kde platí všichni, krytý není.
- `src/views/payments.js` (souhrn místo „schodku“, návrh, snapshot), `src/views/money.js` (karta měsíce), `src/views/help.js`, `docs/plan-v18.md` (stav EK, tabulka), `docs/KONVENCE.md` (mapa souborů), `docs/prompt-dalsi-vlakno.md` (nový stav), `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v59`).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka, série tréninků, `src/domain/cash.js` (výpočet předpisů, příspěvky, platy, QR), pravidla databáze. Ověřeno: `npm test` (125, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář – start bez chyb pro trenéra, pokladníka (hráčka s příznakem), kustoda a hráčku; trenér a pokladník: detail tréninku s podílem příspěvků (1 000 Kč příspěvků, kryté tréninky 3 000 + 1 000 Kč → podíl 750 Kč), 💡 paušál 2 250 Kč → ✅ kryto, uzavření zapíše `evcash` se `share: 750, ym: "2026-11"` + předpisy, souhrn dlužníků a audit v jedné dávce, karta ⚖️ Hospodaření měsíce (⚠️ ztráta 1 000 Kč); kustod a hráčka bez pokladních karet, bez zápisů.

## v19.2 (23. 10. 2026) – OU: Opakované události (série tréninků)
> **Nasazení (pořadí je důležité):** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **Publikovat `firestore.rules` PŘED kódem** (nová kolekce `series` – čtou členové, zapisuje trenér a kustod; ostatní pravidla beze změny, události beze změny pravidel). 3) Nahrát kód (nové soubory `src/domain/recurrence.js`, `src/views/event-series.js`, `tests/recurrence.test.js`, `docs/prompt-dalsi-vlakno.md`; nic se nemaže). 4) Na všech zařízeních ⚙️ → Načíst novou verzi, ověřit v19.2. 5) Test: trenér založí sérii (🔁 Opakovat, vynechat termín, šablona pokladny), kustod sérii bez volby šablony, „Tato a další“ úprava a smazání, hráčka vidí řádek 🔁 Série a nic nemění.
> **🔒 Vyžadovat verzi:** není nutné (data se jen přidávají – pole `ser` u událostí a kolekce `series`; starší verze s nimi pracuje jako s běžnými tréninky). Doporučeno nastavit v19.2 až po přechodu všech zařízení, aby úpravy série dělala jen nová verze.
> Bez publikovaných pravidel se tréninky série vytvoří, jen definice v `series` se neuloží (aplikace dál funguje). Návrat na v19.1.1: nahrát předchozí zip; série zůstanou jako běžné tréninky.
> **⚠️ SAHÁ NA PLATBY (jen předvolba šablony):** `firestore.rules` (nová kolekce `series`, pokladní pravidla beze změny); trenér / pokladník může u série zvolit šablonu pokladny – tréninky dostanou `evcash/{id} = {tpl}` (jen když šablona není výchozí „Pravidelný trénink“). Výpočty pokladny (`src/domain/cash.js`), předpisy, vyúčtování ani QR se nemění.

**Přidáno**
- **Události → + Trénink → 🔁 Opakovat** (trenér, kustod): dny v týdnu, každý / každý 2. týden (týdny se počítají od týdne prvního tréninku), datum „do“ (výchozí a nejpozdější konec sezóny 30. 6.), termín přihlašování relativně (dny předem + čas, výchozí 1 den předem v 18:00), šablona pokladny (jen trenér a pokladník), náhled termínů s vynecháním klepnutím → **Vytvořit N tréninků** (dávky po ≤ 400 zápisech).
- **Detail tréninku ze série:** řádek „🔁 Série: k. z N“ (u ručně upravené „· upravená ručně“); ✏️ Upravit → **Jen tato / Tato a další** (čas, místo a termín přihlašování stejně dní předem; ručně upravené události série se vynechají a hláška je vypíše; název, datum a poznámka jen u této); **🗑 Jen tato** (dosavadní smazání) a **🗑 Tato a další** (budoucí tréninky série bez odpovědí v docházce a bez vyúčtování, ostatní zůstanou a hláška je vypíše; potvrzení druhým klepnutím).
- `src/domain/recurrence.js` – čisté funkce `datesOf(pravidlo, od, do, vynechat)`, `seasonEnd`, `relDl` / `relOf`, `seriesTail`, `editPlan`, `deletePlan`, `manualChange`, `seriesOps`, `chunks` (použije i Rozpočet RP).
- `src/views/event-series.js` – část formuláře a detailu pro série (volá ho `src/views/events.js`).
- Data: událost série má `ser = {id, i}` (`x: 1` = ručně upravená přes „Jen tato“), definice `series/{id} = {rule, d, n, by, at}` (po úpravě „Tato a další“ i `ed`). Kolekce `series` je v záloze (trenér / kustod ji poslouchají).
- `tests/recurrence.test.js` (12 testů): termíny (dny, každý 2. týden, vynechané, konec sezóny, letní čas), relativní termín, dávky, plán úprav a mazání, zápisy série, text pravidel `series`.
- `docs/prompt-dalsi-vlakno.md` – prompt pro nové vlákno s Claude (odkaz v README).

**Změněno**
- `src/views/events.js`: formulář tréninku (při opakování datum = „Od“, místo pevného termínu relativní), detail (řádek série, tlačítka „Jen tato“ / „Tato a další“); `src/data/storage.js`: kolekce `series` v záloze a obnově; `src/main.js`: poslech `series` pro trenéra a kustoda (chyba aplikaci neblokuje).
- `firestore.rules`: nové pravidlo `series`.
- `docs/plan-v18.md`: řádek v19.2 opraven („nová kolekce series → publikovat firestore.rules před kódem (události beze změny pravidel)“), stav fáze OU; `docs/KONVENCE.md` (mapa souborů), `src/views/help.js`, `README.md`.

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka, výpočty pokladny a předpisy, běžné tréninky a zápasy (úprava a smazání tréninku mimo sérii fungují jako dřív), soukromé kolekce. Ověřeno: `npm test` (115, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář – start bez chyb pro trenéra, kustoda a hráčku; trenér: série 34 tréninků (2 dny, každý 2. týden, 1 vynechaný termín) zapíše jen `events/*` a `series/*`, se šablonou „Mimořádný trénink“ i `evcash/*` = `{tpl}`; kustod bez volby šablony; „Tato a další“ změní aktuální a neupravené další (ručně upravenou vynechá), relativní termín sedí; „Jen tato“ označí `ser.x`; „Tato a další“ smazání vynechá trénink s odpovědí a vyúčtovaný; hráčka nemá tlačítka založení, úpravy ani smazání.

## v19.1.1 (23. 10. 2026) – Úklid soukromí: smazání starých citlivých polí, zúžená pravidla databáze – ⚠️ SAHÁ NA PLATBY
> **Nasazení (pořadí je důležité):** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) Nahrát kód (nic se nemaže, žádný nový soubor). **Pravidla zatím nepublikovat.** 3) Na všech zařízeních ⚙️ → Načíst novou verzi, ověřit v19.1.1. 4) Trenér ⚙️ → Kontrola dat: u Soukromí musí být ✅ (jinak nejdřív **🔒 Převést citlivá data** z v19.1). 5) **🔒 Vyžadovat verzi v19.1.1** (bez toho se úklid nenabídne – v19.0 čte jen stará pole, v19.1 by je ještě zapsala při obnově staré zálohy). 6) ⚙️ → Kontrola dat → **🧹 Smazat stará citlivá pole** (náhled počtů, potvrzení druhým klepnutím, před zápisem se stáhne záloha; po úklidu ukáže ✅). 7) **Publikovat `firestore.rules`** (stará pole už nejde zapsat; mazat je pravidla dovolí, takže pořadí 6 a 7 nic nerozbije, ale publikovat až po úklidu je přehlednější). 8) Ověřit role: trenér úprava hráčky a člena týmu, pokladník Platby a Plat, kustod odpověď s důvodem za hráčku, hráčka vlastní odpověď s důvodem.
> **⚠️ SAHÁ NA PLATBY:** `firestore.rules` (soupiska a realizační tým bez práv pokladníka, stará pole plateb a platu nejde zapsat), úklid platebních polí hráček a platů (`src/data/storage.js`, `src/domain/private-data.js`). **`src/domain/cash.js` se nemění** – výpočty dostávají platební pole a platy připojené z `plpay` / `staffpay` jako ve v19.1 (ověřeno testem: stejné `exOf` / `fxOf` / `grpOf` před převodem a po úklidu).
> Návrat na v19.1: nahrát předchozí zip a předchozí `firestore.rules`; data v nových kolekcích zůstávají a v19.1 je čte. Minimální verzi 19.1.1 pak trenér musí snížit ručně v konzoli (`settings/app.minVer`). Smazaná stará pole se nevrací (v19.1 je nepotřebuje – čte nové místo); v19.0 by po úklidu neviděla platby, platy ani důvody.

**Přidáno**
- **⚙️ → Kontrola dat → 🧹 Smazat stará citlivá pole** (jen trenér, nabídne se až po převodu): smaže `players.grp / fx / ex / note`, `staff.pay` a `attendance.reason` jen tam, kde hodnota už je v `plpay` / `staffpay` / `attnote`, nebo je prázdná. Co nemá protějšek (např. důvod u docházky s jiným tvarem id), zůstane a náhled ho ukáže. Tlačítko je jen při minimální verzi aspoň v19.1.1 (`CLEAN_MIN`); plán se před zápisem spočítá znovu z aktuálních dat, záloha se stáhne vždy. Lze spustit znovu (druhé spuštění nic nenajde).
- `src/domain/private-data.js`: `cleanPlan` (plán úklidu, `keep` = co zůstane) a `splitLegacy` (rozdělení staré zálohy do nových kolekcí).
- Testy v `tests/privacy.test.js` (celkem 103): úklid jen převedených a prázdných hodnot, bez převodu nic nesmaže, stejné výpočty pokladny po úklidu, rozdělení staré zálohy (vstup se nemění, nové místo v záloze má přednost, nová kolekce vznikne jen z nalezených hodnot), obnova staré zálohy přes `HK.importData`, text zúžených pravidel.

**Změněno**
- **`firestore.rules` – zúžení po přechodném období:** `players` – nový dokument bez `grp / fx / ex / note`, úprava je nesmí přidat ani změnit (smazat ano), pokladník soupisku už nemění (platby zapisuje do `plpay`); `staff` – bez `pay` (stejně), pokladník už nemění (plat do `staffpay`); `attendance` – bez `reason` (stejně), čtou dál všichni členové (odpověď potřebuje Docházka). Nové pomocné funkce `noKeys`, `keepOut`. Ostatní pravidla beze změny.
- **Obnova ze zálohy** (`src/data/storage.js`): stará záloha (citlivá pole ve starém místě) se před zápisem rozdělí – soupiska, tým a docházka bez nich, hodnoty do `plpay` / `staffpay` / `attnote` (zúžená pravidla by jinak odmítla celou dávku). Hodnoty ze zálohy se zapíšou i v nových kolekcích (dřív měly přednost stávající `plpay` / `staffpay` / `attnote` – poznámka „Pozor při obnově staré zálohy“ z v19.1 už neplatí). Důvod u docházky s jiným tvarem id než `{eid}_{pid}` se nepřevede – hláška po obnově ukáže počet.
- `src/views/help.js` (⚙️ → Kontrola dat), `README.md`, `docs/plan-v18.md` (fáze S hotová).

**Beze změny**
- `src/domain/cash.js` a všechny výpočty pokladny, předpisy, QR, účty, pravidla pokladny a soukromých kolekcí, živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka, zápisy aplikace (už ve v19.1 zapisovala jen do nových kolekcí). Náhrada ze starých polí v `private-data.js` (`joinPlPay`, `joinStaffPay`, `joinAttNotes`) zůstává – po úklidu se neuplatní. Ověřeno: `npm test` (103, srovnávací test D1 beze změny), kouřový test ⚙️ v jsdom mimo repozitář (trenér): bez brány verze i s minimem 19.1 jen upozornění, s minimem 19.1.1 tlačítko, druhé klepnutí stáhne zálohu a smaže jen převedená pole.

## v19.1 (23. 10. 2026) – Soukromí v databázi S: důvody omluv, platy týmu a platby hráček v samostatných kolekcích – ⚠️ SAHÁ NA PLATBY
> **Nasazení (pořadí je důležité):** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **Publikovat `firestore.rules` PŘED nahráním kódu** – přidávají nové kolekce `attnote`, `staffpay`, `plpay`; stará pole (`attendance.reason`, `staff.pay`, `players.grp / fx / ex / note`) zůstávají povolená, takže v19.0 na ostatních zařízeních dál funguje. 3) Nahrát kód (nový soubor `src/domain/private-data.js`, nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.1 a role (trenér, kustod, pokladník, hráčka). 5) **Trenér: ⚙️ → Kontrola dat → 🔒 Převést citlivá data** (náhled „co se přesune“, potvrzení druhým klepnutím, před zápisem se stáhne záloha; lze spustit znovu – po převodu ukáže ✅). 6) **Hned jak budou všechna zařízení na v19.1: 🔒 Vyžadovat verzi v19.1** – starší verze by po převodu zapisovala důvody a platby do starých polí, které v19.1 už nečte (má přednost nové místo). 7) Smazání starých polí a zúžení pravidel `players` / `staff` / `attendance` přijde ve **v19.1.1** (po otestování) – do té doby jsou stará data v databázi dál čitelná všem členům.
> **⚠️ SAHÁ NA PLATBY:** `firestore.rules` (nové kolekce), platební pole hráček a platy realizačního týmu (`src/views/modal.js`, `src/views/team.js`, `src/data/storage.js` – Kontrola dat, CSV soupisky). **`src/domain/cash.js` se nemění** – platební pole se připojí k hráčce a plat ke členu týmu v paměti, výpočty předpisů, příspěvků, platů a QR dostávají stejná data jako dřív.
> Návrat na v19.0: nahrát předchozí zip; pravidla mohou zůstat (jen přidávají). v19.0 čte stará pole – úpravy plateb, platů a důvodů provedené ve v19.1 (jen v nových kolekcích) v ní nebudou vidět. Minimální verzi pak trenér musí snížit ručně v konzoli (`settings/app.minVer`).

**Přidáno**
- **Důvody omluv** („Nemoc“, „Zranění“ = zdravotní údaje) v kolekci `attnote/{eid}_{mid}` = `{eid, mid, reason}`: čte vlastník (`mid` = jeho `pid` / `tid`) a trenér / kustod, zapisuje trenér a kustod za kohokoli, hráčka jen svůj. Odpověď (`st`) zůstává v `attendance` (Docházka ji potřebuje pro všechny). Odpověď a důvod se zapisují v jedné dávce; nová odpověď přepíše dokument docházky bez důvodu (starý `attendance.reason` u ní zmizí), prázdný důvod smaže dokument `attnote`. Zrušení odpovědi, smazání tréninku a smazání člena týmu mažou i důvody.
- **Platy realizačního týmu** v kolekci `staffpay/{tid}` = `{m, amt}`: čte a zapisuje správce pokladny, číst smí i člen sám. Upravit → Plat zapisuje jen sem (jméno a funkce dál do `staff`); smazání člena smaže i jeho plat.
- **Platební pole hráček** v kolekci `plpay/{pid}` = `{grp, fx, ex, note}`: čte a zapisuje správce pokladny, číst smí i hráčka sama. Úprava hráčky (trenér) zapíše soupisku a platby v jedné dávce, okno Platby (pokladník) jen `plpay`; nová hráčka vzniká v jedné dávce `players` + `plpay`, se smazáním zmizí i `plpay`.
- **⚙️ → Kontrola dat → 🔒 Převést citlivá data** (jen trenér): náhled počtů (platby hráček, platy, důvody) a toho, co zůstává ve starých polích; záloha před zápisem; kopíruje jen hodnoty, které v novém místě chybí (novější zápis nepřepíše) → idempotentní. Odpovědi s jiným tvarem id než `{eid}_{pid}` se nepřevedou (ukáže jejich počet). Bez načtených nových kolekcí (nepublikovaná pravidla) se převod nenabídne.
- `src/domain/private-data.js`: `joinPlPay` / `withPlPay`, `joinStaffPay`, `joinAttNotes` (nové místo s náhradou ze starého), `attDoc`, `noteDoc`, `plPayDoc`, `staffPayDoc`, `privacyPlan`, `legacyLeft`. `src/domain/debtors.js`: `memberBlocked`.
- `S.db.collection(c).newId()` (id nového dokumentu bez zápisu) a `S.an` (důvody omluv v paměti).
- Test `tests/privacy.test.js` (13 testů, celkem 99): připojení s náhradou, stejné výsledky `exOf` / `fxOf` / `grpOf` a `salaryRows`, plán převodu a jeho opakování, blokace „Jdu“ přes souhrn, záloha a obnova nových kolekcí, text pravidel.

**Změněno**
- **Kontrola dluhu při „Jdu“ za jiného člena** (nález 6): rozhoduje i veřejný souhrn `debtors` (trenér / kustod bez práv pokladny cizí předpisy nevidí); hláška rozliší vlastní a cizí blokaci. Správce pokladny zapisuje dál bez omezení.
- `src/main.js`: poslech podle role – `attnote` trenér a kustod celou kolekci, ostatní jen své (dotaz `mid`), `plpay` a `staffpay` jen správci pokladny; data se připojí k `S.pl`, `S.tr`, `S.at`. Chyba nových kolekcí aplikaci nezastaví (zůstanou stará pole).
- `src/data/storage.js`: záloha a obnova obsahují `attnote`, `staffpay`, `plpay`; Doplnit pole ex zapisuje do `plpay` a počítá s připojenými poli; CSV soupisky bere platby z `plpay` (s náhradou).
- `src/views/team.js`: štítek plateb u hráčky (skupina, osvobozená, koeficient) vidí jen správce pokladny.
- `src/views/events.js` (zápis odpovědi a důvodu, smazání tréninku po dávkách), `src/views/modal.js` (Platby, Plat, úprava hráčky a člena týmu), `src/core/state.js` (`an`), `src/views/help.js` (kapitoly Události, Team, ⚙️).
- `firestore.rules`: pravidla `attnote` (`noteOk`: jen pole `eid`, `mid`, `reason`, id = `eid_mid`), `staffpay`, `plpay`; u `players`, `staff`, `attendance` poznámka o přechodném období.

**Beze změny**
- `src/domain/cash.js` a všechny výpočty pokladny, předpisy, QR, účty, pravidla pokladny, živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka (bez důvodů jako dřív). Ověřeno: `npm test` (99, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář pro trenéra, kustoda, pokladníka (hráčka s příznakem) a hráčku – start bez chyb, všechny záložky, ⚙️, detail události; důvody vidí jen vlastník a trenér / kustod; kustod nepřihlásí dlužnici „Jdu“ a zapíše odpověď + důvod v jedné dávce; pokladník zapisuje Platby do `plpay` a Plat do `staffpay`; hráčka zapisuje odpověď bez důvodu + `attnote`; trenér: úprava hráčky = `players` + `plpay`, převod v Kontrole dat; při nepublikovaných pravidlech (odmítnuté nové kolekce) aplikace běží ze starých polí.
- **Pozor při obnově staré zálohy** (bez nových kolekcí): stávající `plpay` / `staffpay` / `attnote` zůstanou a mají přednost před poli ze zálohy – po obnově zkontroluj Platby a Platy, případně uprav ručně.

## v19.0 (23. 10. 2026) – Rychlé úpravy R: kalendář od nejnovějších, Zápis utkání v Událostech, realizační tým v pětkách tréninku
> **Nasazení:** jen nahrát kód (nic se nemaže, nový soubor `src/domain/event-helpers.js`). Pravidla databáze beze změny (publikovat netřeba). 🔒 Vyžadovat verzi doporučeno, až budou všechna zařízení na v19.0 – starší verze by při ↻ Podle základní formace smazala přiřazení realizačního týmu v pětkách (nové klíče `t:` v `events.lines`).
> Pokladna, platby, QR, živý zápis, statistiky a docházka se nemění (žádný soubor z „⚠️ SAHÁ NA PLATBY“).

**Přidáno**
- **📋 Zápis utkání v Událostech:** detail uzavřeného zápasu má pod výsledkem tlačítko, které otevře celý Zápis utkání (stejné okno jako v záložce Soupeři: vývoj zápasu, střely, střídání, čas na ledě, tisk / HTML / CSV) – pro všechny role včetně hráček; souhrn statistik zůstává pod tlačítkem. Okno nenabízí úpravy.
- **Realizační tým v pětkách tréninku:** v Rozdělení do pětek je pod hráčkami sekce „Realizační tým“ – přihlášení („Jdu“) členové týmu dostanou 1.–4. pětku nebo „–“ (vede stanoviště / jde s pětkou). Klíč v `events.lines` je `"t:" + id` (nezamění se s hráčkou), souhrn ukazuje „2. pětka: 5 + 🎓1“. ↻ Podle základní formace přepíše jen hráčky, přiřazení realizačního týmu zůstane. Hráčka vidí rozdělení jen ke čtení. Statistiky ani docházka se nemění.
- `src/domain/event-helpers.js`: `sortEvents`, `evAsc`, `baseLines` (přesunuto z `events.js`, nově zachová realizační tým), `setLine`, `lineCounts`, `trKey` / `isTrKey`. Test `tests/r-quick.test.js` (8 testů, celkem 86).

**Změněno**
- **Kalendář od nejnovějších:** Události → Kalendář řadí sestupně (nejnovější nahoře) stejně jako Minulé; Nadcházející zůstávají vzestupně (nejbližší nahoře).
- `src/views/events.js` (řazení přes `sortEvents`, pětky, tlačítko Zápis utkání, hlavička souboru), `src/views/help.js` (kapitoly 2 a 8).
- Plán `docs/plan-v18.md`: fáze R hotová; upřesnění Pokladny II od uživatele (model příspěvek / za událost a nastavení šablon se nemění, rozpočet = průběžně upravovaný hlídač cashflow).

**Beze změny**
- Pokladna, předpisy, QR, živý zápis, statistiky, docházka, pravidla databáze. Ověřeno: `npm test` (86), kouřový test v jsdom mimo repozitář (trenér a hráčka: pořadí Kalendáře, pětky s realizačním týmem – zápis `merge` jen pole `lines`, Podle základní formace zachová `t:` klíče, Zápis utkání se otevře a nemá úpravy).

## v18.9.3 (22. 10. 2026) – Úklid D3: mazání starého kódu, zápisy přes merge, jednotné potvrzení – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** 1) **Ještě na v18.9.2:** trenér ⚙️ → Kontrola dat musí ukázat ✅ (jinak nejdřív **Doplnit pole ex**). Hráčka se starými daty (koeficient 0 % bez pole `ex`) se od v18.9.3 nepočítá jako osvobozená – tlačítko Kontrola dat ale zůstává i ve v18.9.3, kdyby se nějaká objevila. 2) Nahrát kód (nic se nemaže). 3) **Publikovat firestore.rules** (po nahrání kódu; jen smazané pravidlo `coach` a komentáře – na pořadí nezáleží). 4) Pokud v konzoli Firebase existuje kolekce `coach`, lze ji smazat (aplikace ji nepoužívá). 🔒 Vyžadovat verzi není nutné (tvar dat se nemění).
> **⚠️ SAHÁ NA PLATBY:** `src/domain/cash.js` (`exOf` / `fxOf` bez starého tvaru, `exFixPlan` beze změny výsledku), `src/views/cash-settings.js` (uložení nastavení přes `merge`, potvrzení smazání šablony přes `confirm2`), `firestore.rules` (smazané pravidlo `coach`, komentáře). Výpočty předpisů, QR, účty a pravidla pokladny beze změny.

**Smazáno**
- `legacyEx` v `domain/cash.js` (bod D9): osvobozená je jen hráčka s `ex: true`; `fxOf` vrací uložený koeficient. Převod starých dat zůstává v ⚙️ → Kontrola dat (`exFixPlan`), nově zapíše jen pole `ex` (a `fx` u starého tvaru osvobozené) přes merge.
- `firestore.rules`: pravidlo `match /coach/{doc=**}` (D24, kolekce se nepoužívá) a poznámka o kolekci `payments` (D10, D25); poznámka o `payments` i v `storage.js` (obnova zálohy). Komentáře pravidel bez čísel verzí.
- Nepoužité proměnné a importy v `src/views/matches.js` (`sh`, `sk`, `sg`, `sNm`, `OUT`, `opr`, importy `shots`, `skaters`) – ověřeno ESLintem (mimo repozitář), jinde žádné nepoužité proměnné ani nedefinované názvy.

**Změněno**
- **Zápisy nových polí přes merge** (pravidlo z `docs/KONVENCE.md`): datová vrstva má `S.db.doc(cesta).merge(pole)` – zapíše jen uvedená pole (`mergeFields`), `undefined` / `"__del"` pole smaže, ostatní pole dokumentu zůstanou (i ta, která starší verze nezná); stejně jako `set` nečeká na server (offline). Přes merge nově ukládá: úprava hráčky (trenér, kustod) a okno Platby (pokladník), úprava člena realizačního týmu a Plat, trvalé zranění v živém zápisu (jen `st`), rozdělení do pětek (jen `lines`), úprava tréninku (jen údaje formuláře – pětky a příznak vyúčtování zůstanou samy, pomocné pole `keep` zrušeno), uložení nastavení pokladny (účty dál přebírá z databáze), Kontrola dat. Dávkový `batch().merge` se nemění.
- **Potvrzení druhým klepnutím sjednocené** (nález 1 z v18.9): ⚙️ → Nahradit vším, 🔒 Vyžadovat verzi, Doplnit pole ex a smazání šablony v nastavení pokladny používají `confirm2` – druhé klepnutí do 4 s, jinak se tlačítko vrátí (dřív zůstalo označené); tlačítko se při označení zbarví červeně. Označení platí jen v právě otevřeném okně ⚙️; v nastavení pokladny ho zruší každá jiná akce.
- Nápověda (`help.js`) bez „(od v18.x)“ a dalších čísel verzí (nález 4 z v18.9); doplněno potvrzení do 4 s a dopad chybějícího pole `ex`.
- `src/debug.js` (D27): popis odpovídá skutečnosti (jen ruční ladění, testy importují moduly přímo), navíc zpřístupní `domain/cash`, `bank-account`, `attendance`, `debtors`, `shift-edit`.
- Testy: `tests/d3-cleanup.test.js` (mazání, potvrzení, nápověda, merge), `tests/ex-fix.test.js` (starý tvar se nečte, převod zachová význam), zástupci `tests/support/firebase-stub.mjs` (volby `setDoc`, `deleteField`) a `fake-db.mjs` (`merge`). Celkem 78 testů zelených, srovnávací test D1 beze změny.

**Rozhodnuto bez změny kódu**
- D22 `trOf` zůstává (od v18.9 ho používají `pn` / `nm`). D30 název balíčku `hokej-zapasy`, `index.html` a `manifest.webmanifest` zůstávají (značka zálohy `app: "hokej-zapasy"`). Odebrání člena v ⚙️ zůstává se systémovým dotazem (nešlo o potvrzení druhým klepnutím).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty, střídání), statistiky, docházka, výpočty pokladny, QR, předpisy a úhrady. Ověřeno: `npm test` (78), kouřový test v jsdom mimo repozitář (⚙️ potvrzení a vypršení po 4 s, Kontrola dat, smazání a uložení šablony pokladny).

## v18.9.2 (22. 10. 2026) – Oprava: pokladník nastavuje platby hráček; ⚙️ Kontrola dat (pole ex) – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** nahrát kód (nic se nemaže). Pravidla databáze beze změny – pokladníkovi úpravu polí plateb (`grp`, `fx`, `ex`, `note`) a platu (`pay`) povolovala už dřív, chybělo jen tlačítko v aplikaci. Pak trenér: ⚙️ → **Kontrola dat → Doplnit pole ex** (před zápisem se sama stáhne záloha). Až budou všechna zařízení na v18.9.2: ⚙️ → 🔒 Vyžadovat verzi (doporučeno – převod mění data hráček).
> **⚠️ SAHÁ NA PLATBY:** `src/domain/cash.js` (nová čistá funkce `exFixPlan`, výpočty beze změny), okna úpravy hráčky a člena týmu (`src/views/modal.js`) – pole plateb. QR, předpisy, úhrady, účty a `firestore.rules` beze změny.

**Opraveno**
- **Pokladník nemohl nastavit platby hráček** (nález z testu v18.9.1): hráčka s příznakem pokladník neměla u hráček ani u realizačního týmu tlačítko Upravit (chyba už ze starších verzí, ne z úklidu). Nově má u hráček **Upravit → okno „Platby“** (skupina plateb, osvobozená, koeficient, poznámka) a u realizačního týmu **Upravit → „Plat“**. Jméno, číslo, pozici, stav, funkci ani sestavu a formaci nemění (přetahování zůstává vypnuté); uloží se jen pole plateb, ostatní údaje dokumentu zůstanou.

**Přidáno**
- **⚙️ → Kontrola dat** (jen trenér): seznam hráček bez pole `ex` (starší data) a co dostanou – starý tvar osvobozené (`fx` 0 bez `ex`) → osvobozená, koeficient 100 %; ostatní → neosvobozená. Platby se nemění (`exOf` a `fxOf` dávají totéž). Potvrzení druhým klepnutím, před zápisem se stáhne záloha (JSON), lze spustit znovu. Po převodu ukáže ✅. Je podmínkou pro D3 (odstranění `legacyEx`).
- `domain/cash.js`: `exFixPlan(players)`; test `tests/ex-fix.test.js`. Zástupce Firebase zaznamenává zápisy (`__fb.writes`) pro testy.

**Změněno**
- `src/views/team.js` (Upravit i pro pokladníka), `src/views/modal.js` (režim jen plateb / platu), `src/data/storage.js` (Kontrola dat), `src/views/help.js` (kapitoly Team a ⚙️), `src/views/shell.js` (komentář).

**Beze změny**
- Trenér a kustod upravují hráčky stejně jako dřív; živý zápis, statistiky, docházka, pokladna, QR, pravidla databáze. Ověřeno kouřovým testem (jsdom): obrazovky všech rolí kromě Team u hráčky-pokladníka a ⚙️ shodné s v18.9.1; zápis pokladníka mění jen `grp`, `fx`, `note` / `pay`.

## v18.9.1 (22. 10. 2026) – Úklid kódu D1, část 2: statistiky, oprávnění, nastavení týmu, rozdělení živého zápisu (fáze D1 f–i) – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** nahrát kód a **smazat z webu i z repozitáře `src/views/live.js`** (nahradily ho tři nové soubory – starý soubor by v offline cache nevadil, ale nemá zůstat). Pravidla databáze beze změny (publikovat netřeba), tvar dat beze změny – 🔒 Vyžadovat verzi není nutné.
> **⚠️ SAHÁ NA PLATBY – jen dotaz na oprávnění, výsledky beze změny:** `src/views/mine.js`, `src/views/payments.js`, `src/views/money.js`, `src/views/cashbook.js`, `src/views/cash-settings.js` (`HK.isCash()` → `HK.can("money")`, návrh účtu `HK.role() === "trener"` → `HK.can("accounts")`). `src/domain/cash.js`, `src/domain/bank-account.js`, `src/views/qr-image.js` a `firestore.rules` se nemění.

**Přidáno**
- `src/domain/player-stats.js`: `playerStats(matches, {match})` – jediný výpočet statistik hráček a brankářek (góly, asistence, body, střely, TM, +/-, čas na ledě, střídání, góly v PP, body doma / venku, týmové střely a góly). `match: true` = rozpis jednoho zápasu (bruslařky sestavy, +/- bez brankářek – stejně jako dřív), bez něj souhrn.
- `src/data/storage.js`: oprávnění na jednom místě – `HK.can(akce)` s tabulkou `CAN`: `sport` (trenér, kustod), `money`, `members` (trenér, pokladník), `roster`, `accounts`, `admin` (trenér), `onlyOwn` (hráčka); neznámá akce = výjimka.
- `src/config/team-config.js`: `TEAM_NAME` („HC Střely“), `APP_NAME` („Hokej – zápasy“), `DEV_EMAILS`. Název `team.js` z plánu nešel – má ho už `src/views/team.js` (pravidlo jedinečných názvů).
- Živý zápis rozdělený (bod D13): `src/views/live-view.js` (vykreslení, situace a jednotky, hlídač situace, odpočty a upozornění), `src/views/live-panels.js` (menu ⋯ a panely), `src/views/live-events.js` (obsluha klepnutí, odchod, nabídka po trestu, posun času). Kód přesunut beze změny, obsluha se napojuje ve stejném pořadí.
- Testy: `tests/permissions.test.js` + `tests/support/can-probe.mjs` (can() pro trenéra, kustoda, kustoda-pokladníka, hráčku, hráčku-pokladníka – každá role ve vlastním procesu), `tests/d1-structure.test.js` (playerStats, kontroly struktury: název týmu, role, confirm2, csv, drag, statistiky, komentáře, jedinečné názvy souborů). Celkem 67 testů.

**Změněno**
- `src/views/report.js` (`matchStatsHtml`) a `src/views/stats.js` počítají přes `playerStats` – výstup znak po znaku stejný (srovnávací test z v18.9 beze změny).
- Všechny pohledy a `main.js`: `HK.isStaff()` → `HK.can("sport")`, `HK.isCash()` → `HK.can("money")`, `HK.role() === "hracka"` → `HK.can("onlyOwn")`, `HK.role() === "trener"` → `HK.can("roster")` (soupiska, realizační tým) / `HK.can("accounts")` (účty); okno ⚙️ používá `can("admin")`, `can("members")`, `can("sport")`. `HK` už nenabízí `isStaff`, `isCash`, `role`.
- „HC Střely“ v `matches.js`, `report.js`, `live-view.js`, `live-quick.js`, `editor.js`, `modal.js`, `stats.js` a „Hokej – zápasy“ v `storage.js` (přihlášení, hláška obnovy) → `TEAM_NAME` / `APP_NAME`. Výjimky beze změny: `index.html`, `manifest.webmanifest`, značka zálohy `app: "hokej-zapasy"`.
- Importy `live.js` přepojené: `shell.js`, `matches.js`, `live-quick.js`, `main.js`, `debug.js` (+ `player-stats.js`).

**Odstraněno**
- `src/views/live.js` (**smazat ručně**), `HK.isStaff`, `HK.isCash`, `HK.role`.

**Beze změny**
- Vzhled a ovládání (ověřeno mimo repozitář kouřovým testem v jsdom: obrazovka živého zápisu ve 28 stavech včetně menu, panelů, střel, střídání, zranění, rychlého trestu a 16 obrazovek + ⚙️ pro 4 role – HTML i stav zápasu shodné s v18.9), živý zápis (logika `live-engine.js` netknutá), statistiky, docházka, dlužníci, pokladna, QR a účty, pravidla databáze.

## v18.9 (22. 10. 2026) – Úklid kódu D1, část 1: společné pomůcky (fáze D1 a–e, j, k) – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** jen nahrát kód (žádný soubor se nemaže). Pravidla databáze beze změny (publikovat netřeba), tvar dat beze změny – 🔒 Vyžadovat verzi není nutné.
> **⚠️ SAHÁ NA PLATBY – jen přesun a přejmenování, výsledky beze změny (ověřeno srovnávacími testy):** `src/domain/cash.js` (`vsOf` → `vsHash`, `csvText` přesunuto do `core/utils.js` jako `csv`, smazaná nepoužitá `asciiMsg`, `chargeId` / `SPRE` bez `export`, komentáře), `src/domain/bank-account.js` (`RECENT_DAYS` bez `export`, komentář), `src/views/mine.js` (import `vsHash`, komentáře), `src/views/qr-image.js` (komentář), `src/views/cash-settings.js` (komentáře), `src/views/payments.js` (`confirm2`, komentáře), `src/views/money.js` (`confirm2`, `nm`, `csv`), `src/views/cashbook.js` (`confirm2`, `pn`, komentáře). Výpočty předpisů, úhrad, VS, QR (`spdPay`, `qrMsg`) a účty beze změny; `firestore.rules` beze změny.
> D1 bylo na jedno vlákno příliš velké – rozděleno: **v18.9 = body a–e, j, k**, **v18.9.1 = body f–i** (`playerStats`, `can()`, `config/team.js`, rozdělení `live.js`).

**Přidáno**
- `src/core/actions.js`: `confirm2(key, fn, redraw)` – jediné potvrzení druhým klepnutím (1. klepnutí označí, 2. do 4 s provede, jinak se označení samo zruší), `armed(key)`, `CONFIRM_MS`.
- `src/core/selectors.js`: `nm(id, {staff, fb})` – jméno bez HTML; `pn(id, {staff, fb})` – jméno s HTML nově umí i člena realizačního týmu (🎓) a vlastní text pro neznámé id.
- `src/core/utils.js`: `csv(rows)` – jediný text CSV (středník, uvozovky, BOM, CRLF).
- `src/core/drag.js` (nový): `makeDrag(root, items, {target, start, drop, click})` – jediné přetahování (podržení prstu 320 ms, myš > 6 px, duch, zvýraznění cíle, 450 ms bez klepnutí po puštění).
- Testy: `tests/d1-baseline.test.js` + `tests/fixtures/d1-baseline.json` (srovnávací výstupy zachycené na v18.8.1: statistiky zápasu a souhrnu, CSV vývoje, střídání, soupisky a pokladny byte po bytu, potvrzení druhým klepnutím, zápasy proti soupeři, VS), `tests/d1-helpers.test.js` (confirm2, csv, pn / nm, makeDrag). Zástupce Firebase (`tests/support/firebase-stub.mjs`) umí přihlášení a data kolekcí přes `globalThis.__fb`; zástupce prvku DOM má `click()`. Celkem 56 testů.

**Změněno**
- Potvrzení druhým klepnutím přes `confirm2` ve všech 10 souborech (zápas: uzavřít, znovu otevřít, smazat, základní formace; událost: smazat; soupeř: smazat; hráčka a člen týmu: smazat; editor zápasu a opravy střídání; pokladna: storno, zaplatila vše, znovu otevřít vyúčtování, příspěvky a platy). Ruční vzor `S.cf === … setTimeout` už v kódu není.
- Jména: `nameOf` (timeline, cashbook) a `plainName` (money) nahradily `nm` / `pn` ze `selectors.js`; `trOf` je vnitřní pomocník `selectors.js`.
- CSV: 4 implementace (report, money, cash `csvText`, storage `exportCSV`) → `csv` v `core/utils.js`.
- Přetahování: `lvDrag` (live), `bindLu` a `matchDrag` (lineup-editor), `teamDrag` (team) používají `core/drag.js` – vlastní zůstala jen pravidla puštění.
- Přejmenováno: `vsOf` v `selectors.js` → `matchesVs` (zápasy proti soupeři), `vsOf` v `cash.js` → `vsHash` (variabilní symbol).
- Komentáře popisují současný stav – historie verzí („v18.4.2: …“, „(v17.7)“) odstraněna ze všech hlaviček a komentářů v `src/` a ze `styles/main.css` (texty nápovědy „od v18.x“ zůstávají – jsou to texty v aplikaci).
- `src/views/report.js`: místní pomocník jména v zápisu utkání přejmenován na `who` (nekoliduje s `nm`).

**Odstraněno**
- `asciiMsg` (`cash.js`, nepoužitá), CSS `.lg.nx-strip` (nepoužitá třída), `export` u funkcí používaných jen ve vlastním souboru: `oppDetail`, `nudgeT`, `lvDrag`, `teamDrag`, `chargeId`, `SPRE`, `RECENT_DAYS`, `dayStr`, `chAfter`, `MIN_SHIFT`, `trOf` (`debtorDoc` zůstává – používají ho testy).

**Beze změny**
- Vzhled a ovládání aplikace, živý zápis (střídání, rotace, tresty, časomíra, góly – v `live-engine.js` jen komentář), statistiky, docházka, dlužníci, pokladna, QR a účty, pravidla databáze, záloha a obnova.

## v18.8.1 (22. 10. 2026) – Oprava: postup zakládání zápasu
> **Nasazení:** jen nahrát kód. Pravidla databáze beze změny (publikovat netřeba), na platby se nesahá. Po otestování může trenér ⚙️ → 🔒 Vyžadovat verzi v18.8.1 (není nutné – tvar dat se nemění, přibyla jen pole `time`, `place`, `dl` u nového zápasu, která už dříve zapisovala úprava v Událostech).

**Opraveno**
- **Nový zápas neměl čas začátku:** okno Nový zápas (Události → + Zápas, i Zápasy → + Nový zápas) má pole **Čas začátku**, **Místo** a **Konečný termín přihlašování** (výchozí den předem v 18:00, při změně data se posune, dokud ho neupravíš ručně). Kontrola: termín musí být nejpozději v čas začátku.
- **Posloupnost přípravy zápasu:** po vytvoření se neotevře karta zápasu se sestavou, ale **detail události** (zápas je zveřejněný, hráčky se přihlašují). Karta zápasu v kroku 1 ukazuje **⏳ Přihlášky** (brankářky / bruslařky, uzávěrka) a dokud přihlášky nestačí na nominaci (1 + 5), místo „Dokončit sestavu“ nabízí **📅 Přihlášky – detail události**; pak **Nominovat z přihlášených →**, potom **Dokončit sestavu →**, ✔ Uzavřít sestavu a Zahájit zápas. Hlavička karty: ✅/⏳ Přihlášky (počet) · Nominace · Sestava; u data i čas a místo.

**Změněno**
- `src/views/modal.js` (okno Nový zápas), `src/views/matches.js` (karta zápasu – postup, hlavička), `src/domain/lineup.js` (nová `signupState`), `src/core/utils.js` (společné `dlDefault`, `dlText`, `dlBeforeStart`), `src/views/events.js` (používá společné pomůcky termínu – chování beze změny), `src/views/help.js` (kapitoly 2 a 4), nový test `tests/match-prep.test.js`, verze (`app-version.js`, `package.json`, `sw.js` cache hokej-v50), `README.md`, `docs/plan-v18.md`.

**Beze změny**
- Nominace (jen přihlášené), sestava, uzavření sestavy, živý zápis, střely, góly, časomíra, tresty, statistiky, pokladna, pravidla databáze.

## v18.8 (22. 10. 2026) – Řád projektu a pojistky (fáze K) – ⚠️ MĚNÍ PRAVIDLA DATABÁZE
> **Postup nasazení (pořadí je důležité):** 1) **publikovat `firestore.rules`** (pokladník a členové, nový `settings/app`), 2) nahrát kód a **smazat `plan-zivy-zapis-v18.md` z kořene** (přesunut do `docs/`), 3) ověřit přihlášení trenéra, hráčky a pokladníka (👁 Náhled role), 4) až budou všechna zařízení na v18.8: trenér ⚙️ → **🔒 Vyžadovat verzi v18.8**.
> Na platby se nesahá: `cash.js`, `bank-account.js`, `mine.js`, `qr-image.js`, `cash-settings.js`, `payments.js` beze změny. Pravidla `charges`, `cash`, `audit`, `evcash`, `debtors` a `settings/cash` beze změny.

**Opraveno (bezpečnost)**
- **Pokladník si mohl dát roli kustod** (nález 1 z kontroly 22. 10. 2026): pravidlo `members` pouštělo pokladníka ke každému členovi, jen ne s rolí trenér – i k vlastnímu dokumentu. Nově pokladník (bez role trenér) smí zakládat, měnit a mazat jen členy s rolí `hracka` (před změnou i po ní) a nikdy vlastní dokument; trenér beze změny. V ⚙️ → Členové týmu má pokladník jen roli Hráčka a tlačítko Odebrat jen u hráček (ne u sebe).

**Přidáno**
- **Brána verze** `settings/app = {minVer, minBy, minAt}`: trenér v ⚙️ → Verze aplikace nastaví **🔒 Vyžadovat verzi** (jen zvýšit, potvrzení druhým klepnutím). Zařízení se starší verzí nic nezapisuje (strážce `blocked()` v `storage.js` – stejné místo jako náhled role: `doc.set`, `add`, `delete`, dávky, členové, obnova zálohy, přepočet dlužníků, zápis zápasu) a nahoře ukáže červený pruh **⚠️ Starší verze aplikace – zápis je zablokovaný · Načíst novou verzi**. Chybějící minimum bránu nezavírá. `settings/app` se ze zálohy neobnovuje ani nemaže. Pravidla: zapisuje jen trenér (jen pole `minVer`, `minBy`, `minAt`, `minBy` = jeho e-mail), nejde smazat. Chrání až od v18.8 – starší verze bránu neznají.
- Nový modul `src/core/app-version.js`: jediné místo s číslem verze (`APP_VERSION`, `APP_DATE`, `APP_LABEL`), porovnání po číslech `cmpVer` (18.10 > 18.9), `isOutdated`, `canRaise`.
- **Automatické testy** `tests/` (39 kontrol, `npm test`, Node 22+, bez balíčků z npm): pokladna (dělení ceny, osvobozené v děliteli, fx, předpisy, úhrady, dluh, zůstatek), QR (alfanumerický text, SPD, okamžitá platba), účty (mod 11, mod 97, IBAN), docházka (sezóna, uplynulé události, procenta), dlužníci (bez částek, ⛓ / 🔓, plán zápisu), živý zápis (počáteční stav, střídání, rotace, Zpět, trest a formace 4 hráček, konec trestu, gól v přesilovce, max. 2 tresty, konec třetiny, časová osa), soulad verze (`app-version.js` = `package.json` = CHANGELOG, README) a pravidla databáze (kontrola textu). Zástupci prohlížeče a Firebase SDK v `tests/support/` – aplikace se kvůli testům nemění.
- `docs/KONVENCE.md` – programovací řád: mapa souborů, závislosti, struktura souboru, data a pravidla (merge, dva kroky, brána verze), verze a vydání, testy, nasazení a návrat, práce s Claude.
- `docs/plan-v18.md` (aktuální plán, dříve `plan-zivy-zapis-v18.md`), `docs/archiv-plan-v18.md` (dokončené fáze A, B, G, P, C, Q a průběžný stav), `docs/archiv-readme-v18.7.1.md` (původní podrobné README).

**Změněno**
- `README.md` zkráceno (66 kB → cca 5 kB): současný stav, spuštění a testy, Firebase, nasazení a návrat, role, odkazy na dokumentaci.
- `src/data/storage.js` (verze z `app-version.js`, brána verze, sekce Verze aplikace v ⚙️, členové pro pokladníka, obnova bez `settings/app`), `src/views/shell.js` (pruh staré verze), `src/views/help.js` (kapitoly 1 a 12), `package.json` (verze 18.8, skript `test`, `engines`), `sw.js` (cache hokej-v49, komentář bez historie).

**Odstraněno**
- `plan-zivy-zapis-v18.md` z kořene repozitáře (obsah v `docs/plan-v18.md` a `docs/archiv-plan-v18.md`) – **smazat ručně**.

**Beze změny**
- Živý zápis, střely, góly, časomíra, tresty, statistiky, docházka, pokladna, QR a účty (logika); vzhled aplikace kromě pruhu staré verze a sekce Verze aplikace v ⚙️.

## v18.7.1 (22. 10. 2026) – ⬇️ Uložení QR do telefonu (fáze Q) – ⚠️ SAHÁ NA PLATBY
> **Pozor – verze sahá na soubor plateb:** `src/views/mine.js` (okno QR v Moje platby) a nový `src/views/qr-image.js`. **Obsah QR se nemění** – obrázek se kreslí z téhož objektu `qrcode`, který okno zobrazí (`spdPay`, `qrMsg`, `PT:IP` beze změny). `bank-account.js`, `cash.js`, `cash-settings.js` a `firestore.rules` se **nemění** – pravidla publikovat netřeba.

**Přidáno**
- **⬇️ Uložit QR** v okně platby pod zobrazeným QR: obrázek PNG ve vysokém rozlišení (QR cca 1000 px) s bílou tichou zónou 4 moduly a popiskem pod kódem – název platby, příjemce (název účtu: Účet týmu / Hlavní / Provozní účet), účet v českém tvaru, IBAN, částka, VS, zpráva pro příjemce (přesně jako v QR), případně okamžitá platba, datum vytvoření. Bez varovného řádku (rozhodnuto 22. 10. 2026).
- Uložení: kde prohlížeč umí sdílet soubor (`navigator.canShare` se souborem – Android, iPhone) systémové **Sdílet** (Uložit do Galerie / poslat do bankovní aplikace); jinde stažení souboru `QR-platba-RRRR-MM-DD-VS.png`. Zrušení sdílení nic nedělá.
- Nový modul `src/views/qr-image.js` (`drawQrCanvas`, `saveQrImage`, `qrFileName`).

**Změněno**
- `src/views/mine.js`: tlačítko a obsluha uložení; tlačítko je jen u zobrazeného QR, tedy až po kontrole účtu (`accCheck`) a po „Ověřila jsem účet“ – u varování ani u chybného účtu se nezobrazí.
- `src/views/help.js` (kapitola 10), `README.md`, `package.json`, `src/data/storage.js` (verze), `sw.js` (cache hokej-v48), `plan-zivy-zapis-v18.md`.

**Beze změny**
- Text a obsah QR, výpočty předpisů, VS, účty a jejich zabezpečení (v18.6.1), docházka a dlužníci (v18.7), živý zápis, statistiky.

## v18.7 (22. 10. 2026) – Docházka a dlužníci pro všechny (fáze C) – ⚠️ SAHÁ NA PLATBY
> **Pozor – verze sahá na soubory plateb:** `firestore.rules` (nová kolekce `debtors`), `src/views/payments.js`, `src/views/money.js`, `src/views/cashbook.js`, `src/data/storage.js` (zápis souhrnu dlužníků ve stejné dávce jako změny předpisů). `bank-account.js`, `mine.js`, `cash.js` a pravidla `settings/cash` z v18.6.1 se **nemění**. Výpočty předpisů, úhrad, VS, QR a účty beze změny.
>
> **Postup nasazení (pořadí je důležité):** 1) **publikovat firestore.rules** (bez nich selže každá dávka s předpisy – úhrada, vyúčtování, příspěvky, storno), 2) nahrát kód, 3) trenér / pokladník: ⚙️ → **⛓ Přepočítat dlužníky** (jednorázové naplnění).

**Přidáno**
- C1 📊 **Docházka** – v Událostech nový přepínač vedle Nadcházející / Minulé / Kalendář, vidí všichni členové, jen ke čtení. Hráčky a realizační tým zvlášť; typ Vše / Tréninky / Domácí zápasy / Venkovní zápasy; sloupce ✅ účast z počtu událostí, %, ❌ nejdu, ❓ nejistá, bez odpovědi; řazení klepnutím na hlavičku (`table-sort.js`).
- Období **Od – Do** (výchozí zimní sezóna 1. 8. – 1. 7. dalšího roku, tlačítko „Tato sezóna“). Počítají se jen uplynulé události (s časem od jeho začátku, bez času po skončení dne). Ukončené hráčky ⛔ jen s odpovědí v období. Důvody omluv se nezobrazují.
- Nová doména `src/domain/attendance.js` (čisté funkce: `seasonOf`, `attEvents`, `pastEvents`, `attSummary`, `hasAnswer`) – použitelná i pro budoucí modul Trénink.
- C2 ⛓ **Dlužníci** – veřejný souhrn bez částek `debtors/{mid} = {mid, since, dues: [{d, x}]}` (splatnosti nezaplacených předpisů a příznak výjimky). Značka ⛓ (mříže) + počet dní po splatnosti u jména v Docházce a v detailu události, 🔓 = po splatnosti s výjimkou (rozhodnutí 6); realizační tým se nezapisuje. V Docházce navíc karta „⛓ Po splatnosti“ seřazená od nejdelšího.
- Nová doména `src/domain/debtors.js` (`debtorDoc`, `debtorPlanFor`, `debtorRebuild`, `debtorState`, `applyDebtors`) a pohled `src/views/attendance.js`.
- ⚙️ → **⛓ Přepočítat dlužníky** (správce pokladny): přepočet souhrnu ze všech předpisů.

**Změněno**
- `firestore.rules`: `debtors` čtou všichni členové, zapisuje jen správce pokladny (`mid` = id dokumentu, jen pole `mid`, `since`, `dues`) → **publikovat firestore.rules**. Pravidla `settings/cash`, `charges` a ostatní beze změny.
- `src/views/payments.js` (uzavření vyúčtování, úhrada, výjimka), `src/views/money.js` (vystavení a smazání příspěvku), `src/views/cashbook.js` (storno úhrady): do stejné dávky přibyl zápis `debtors`.
- `src/data/storage.js`: smazání události s nezaplacenými předpisy přepočítá jejich dlužníky; obnova ze zálohy souhrn dlužníků přepočítá (kolekce `debtors` se nezálohuje); tlačítko přepočtu; verze.
- `src/views/events.js` (přepínač Docházka, značka v detailu), `src/main.js` (odběr `debtors` pro všechny), `src/core/state.js` (`ao`, `dt`, `dtErr`).
- `src/views/help.js` (kapitoly 2 a 12), `README.md`, `package.json`, `sw.js` (cache hokej-v47), `plan-zivy-zapis-v18.md`.

**Beze změny**
- Živý zápis, statistiky, výpočty předpisů a úhrad, QR, účty a jejich zabezpečení (v18.6.1), blokace „Jdu“ (dál podle `debtOf` z vlastních předpisů).

## v18.6.1 (22. 10. 2026) – bezpečné QR platby (oprava po testu v18.6)
**Opraveno**
- mBank hlásil „neplatný QR kód“ (Fio četl správně). QR byl v binárním režimu kvůli malým písmenům a čárkám ve zprávě. Nyní je celý text QR jen ze znaků alfanumerického režimu (VELKÁ písmena bez diakritiky, číslice, mezera, `$ % * + - . / :`), zpráva `qrMsg` bez zdvojených mezer, VS jen číslice, okraj kódu 4 moduly (doporučená tichá zóna).

**Přidáno**
- Účty se zadávají jako české číslo účtu `[předčíslí-]číslo/kód banky` (nebo IBAN); nový modul `src/domain/bank-account.js` dopočítá IBAN a ověří kontrolní součty mod 11 (číslo účtu, váhy ČNB) i mod 97 (IBAN) – výsledek se ukazuje hned při psaní. Neplatný účet nejde navrhnout a QR se z něj nevytvoří.
- Princip čtyř očí: změnu účtů navrhuje jen trenér (`ibanPend`), platí až po potvrzení jiným správcem pokladny (`ibanBy`, `ibanOk`, `ibanAt`). Návrh, potvrzení, zamítnutí a zrušení jdou do auditu (`acc-prop`, `acc-ok`, `acc-no`, `acc-off`), v nastavení je Historie změn účtů. Čekající návrh ukáže správcům pokladny upozornění v Událostech.
- Okamžitá platba: přepínač v Nastavení pokladny (`inst`, výchozí ANO) → `PT:IP` v QR.
- Okno platby: účet v českém tvaru i jako IBAN, datum platnosti účtu (kdo navrhl a potvrdil), vždy upozornění na kontrolu účtu před odesláním a vyloučení odpovědnosti. Zařízení si pamatuje ověřené účty – při novém účtu oproti dřívějšku nebo změně v posledních 14 dnech nejdřív varování, QR až po „Ověřila jsem účet“.

**Změněno**
- `firestore.rules`: `settings/cash` – účty mění jen potvrzený návrh (jiný správce, přesně navržené účty, navrhovatel pod vlastním e-mailem), dokument nastavení pokladny nejde smazat → **publikovat firestore.rules**.
- `src/domain/cash.js`: `qrMsg`, `spdPay` (alfanumerický text, `PT:IP`), `cashCfg` přenáší pole zabezpečení (`accMeta`) a `inst`.
- `src/views/cash-settings.js`: sekce 🏦 Účty pro QR platby (návrh, potvrzení, zamítnutí, historie), přepínač okamžité platby; „Uložit nastavení“ účty nikdy nemění.
- `src/views/mine.js`: okno QR (kontrola účtu, varování o změně, upozornění, alfanumerický režim), zpráva u předpisu stejná jako v QR, upozornění na čekající návrh.
- `src/main.js`: otevřené nastavení pokladny se po změně v databázi překreslí.
- `src/data/storage.js`: obnova ze zálohy účty v `settings/cash` nemění (zůstávají aktuální), verze.
- `src/views/help.js` (kapitoly 10 a 11), `README.md`, `package.json`, `sw.js` (cache hokej-v46), `plan-zivy-zapis-v18.md`.

**Beze změny**
- Výpočty předpisů, úhrady, VS, živý zápis, statistiky. Uložená zpráva předpisu (`msg`) zůstává s diakritikou; převádí se až při zobrazení a v QR.

## v18.6 (22. 10. 2026) – Náhled role pro vývojáře (fáze G)
**Přidáno**
- ⚙️ → **👁 Náhled role** (jen účty v `DEV_EMAILS`, nyní tomaskre@gmail.com): výběr role Hráčka (konkrétní hráčka ze soupisky) / Kustod / Trenér, volitelně člen realizačního týmu (`tid`) a příznak Pokladník. Volba je jen v paměti zařízení (`sessionStorage`, klíč `hk-preview`), databáze `members` se nemění; po spuštění se aplikace načte znovu a role náhledu platí od startu.
- Stálý pruh v horní liště nad záložkami „👁 Náhled: <role / jméno> · … · Ukončit náhled“ (lepí se nahoře spolu se záložkami).
- Jen ke čtení (výchozí, otázka 11): zápis přes `doc.set` / `add` / `delete`, dávky (`batch().commit()`), členy týmu i obnovu ze zálohy blokuje strážce `HK.blocked()` s hláškou „V náhledu se nezapisuje“; `save` a `upd` v `core/actions.js` zápas nezmění ani místně. Zaškrtávátko **Povolit zápis** zápis povolí (pod účtem vývojáře, za vybranou roli).

**Změněno**
- `src/data/storage.js`: náhled role (`isDev`, `pvRead` / `pvWrite`, `ro`, `blocked`, `pvLabel`, `startPreview` / `endPreview`), sekce v ⚙️, role náhledu se nastaví v `boot()` před poslechem dat – `main.js` proto u hráčky čte jen její předpisy (`where mid`) a nečte `cash`, `audit`, `evcash` (stejně jako skutečná role). Odhlášení náhled ukončí. Export `HK.preview`, `HK.ro`, `HK.blocked`, `HK.endPreview`.
- `src/core/actions.js`: `save` a `upd` se strážcem náhledu.
- `src/views/shell.js`: pruh náhledu v `#nav`, obsluha záložek jen na tlačítkách `data-t`.
- `src/views/help.js` (kapitola 12), `README.md`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v45), `plan-zivy-zapis-v18.md`.

**Beze změny**
- Živý zápis, pokladna, statistiky; `firestore.rules` se nemění (publikovat není nutné). Databáze dál čte s právy vývojáře – ověření samotných pravidel jen skutečným testovacím účtem.

## v18.4.2 (22. 10. 2026) – více trestů, ikona gólu a čitelnost (úprava po testu v18.4.1)
**Opraveno**
- Více trestů: po skončení jednoho ze dvou trestů (3 na 5 → 4 na 5) se obrazovka vracela k pětkám, i když hra zůstala v oslabení. Příčina: `unitView` uznal jen jednotku ze skupiny platné situace (OS3 ∉ OS1/OS2) a nabídka jednotky se otevírala jen po zapsání trestu. Nyní se formace řídí počtem našich hráček na ledě (5 = pětky, při přesilovce PP; 4 = OS1/OS2; 3 = OS3/OS4), režim PP/OS trvá s tlačítky a frontami nové skupiny a k pětkám se vrací až při vyrovnané hře.
- Rotující partnerka (`.lrp`) v tmavém režimu nečitelná (barvy pětek `.L1`–`.L4` jí vnutily text bez kontrastu) – vlastní kontrastní barvy pro světlé i tmavé schéma, barva pětky v levém okraji.

**Přidáno**
- Hlídač situace `watchSit` (`live.js`): po každé změně počtů – trest vyprší, gól ukončí trest, ✕ zrušení, ↩ Zpět – při stále nevyrovnané hře s jinou skupinou jednotek hned otevře nabídku jednotky (panel „uask“); při vyrovnané hře otevřenou nabídku zavře. Nepřekryje jiné otevřené okno, nic nezapisuje.
- Góly v průběhu živého zápisu podsvícené: náš gól zeleně, gól soupeře červeně (světlé i tmavé schéma).

**Změněno**
- `src/views/live.js`: `unitView` (stejný druh PP / OS), pořadí front jednotek `unitQueueOrder`, štítek nabídky i při jednotce jiné skupiny, tlačítko „Ponechat <jednotku>“ v nabídce při aktivním režimu, upozornění „Situace se změnila…“, `watchSit`, třídy gólů v průběhu, ikona 🥅.
- Ikona gólu ⚽ → 🥅 (hokejová branka): `live.js`, `live-quick.js`, `src/domain/timeline.js`, `report.js`, `matches.js`, `modal.js`, `help.js`.
- `styles/main.css`: mantinel bílo-modrý (bílá deska, modrý okop), `.lrp` kontrastní barvy, `.lev-gu` / `.lev-go`.
- `src/views/help.js` (kapitoly 5 a 6), `README.md`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v44), `plan-zivy-zapis-v18.md`.

**Beze změny:** `live-engine.js` (zápis trestů, gólů, střel, časomíra, střídání, nasazení jednotky `applyUnit`), odezva z v18.2, rotace z v18.3, hřiště a štítky trestů z v18.4.1, uložená data, pravidla databáze (`firestore.rules` není nutné publikovat).
Ověřeno kouřovým testem v jsdom (44 kontrol – 3 na 5 → 4 na 5 → 5 na 5, PP 5 na 3 → 5 na 4, gól v přesilovce i oslabení, zrušení ✕ při 3 na 5 i 4 na 5, podsvícení gólů, ikona 🥅, styly mantinelu a partnerky).

## v18.4.1 (22. 10. 2026) – kompaktní hlavička živého zápisu (úprava po testu v18.4)
**Změněno**
- `src/views/live.js`: samostatný řádek stavu zrušen – tresty jsou malé štítky velikosti situace přímo v řádku třetiny (`#lchips` = `.lper`: třetina, situace, 🚫 #číslo odpočet ✕, soupeř „Soup.“, délka 2'/5'/10'/DK), stejně malé štítky ⚡ PP / 🛡 OS (nabídka jednotky) a ↩ Řady; jeden řádek s posunem do strany, výška lišty stálá. Hlavička je o řádek nižší.
- `styles/main.css`: štítky v řádku třetiny, nižší dlaždice hráček na ledě v hřišti (64 px místo 92 px, písmo beze změny), mantinel modrý; odstraněn styl `.lchips`.
- `src/views/live-quick.js`: jen komentáře (záblesk po trestu dál míří na `#lchips`).
- `src/views/help.js` (kapitoly 5 a 6), `README.md`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v43), `plan-zivy-zapis-v18.md`.

**Beze změny:** logika živého zápisu z v18.4 a `live-engine.js`, odezva, rotace, uložená data, pravidla databáze (`firestore.rules` není nutné publikovat).
Ověřeno kouřovým testem v jsdom (34 kontrol – kontroly v18.4 + štítky trestů v řádku třetiny, zrušený řádek stavu).

## v18.4 (22. 10. 2026) – hřiště, režim PP/OS a nabídky po trestu a zranění (fáze B4 + úpravy po testu v18.3)
**Opraveno**
- Zranění v oslabení: upozornění na chybějící hráčku na ledě chybělo. Příčina: v `liveTick` podmínka `!(L.pen).some(… x.end==null)` hlášku potlačila, kdykoli náš trest čekal (druhá část 2+2, třetí trest), a hláška byla jen tlumená „ℹ️“ s podmínkou neprázdných front. Nyní se chybějící i přebývající hráčka hlásí vždy jako ⚠️ (kromě ukončeného zápasu).

**Přidáno**
- Nabídka jednotky k odsouhlasení (B4): po zapsání trestu, který změní počty a vytvoří přesilovku / oslabení, se otevře panel s navrženou jednotkou (nejvíc dostupných hráček, přepínač druhé jednotky), vyloučená / ošetřovaná hráčka červeně; ✓ Potvrdit a nasadit (`applyUnit` beze změny), ✏️ Upravit jednotky, Ponechat pětky. Znovu ji otevře tlačítko v řádku stavu.
- Režim PP/OS: je-li nasazená jednotka platné situace, jsou pod mantinelem místo pětek tlačítka jednotek situace a ↩ Řady, fronty jen z jednotek. Po konci nerovnosti se obrazovka sama vrátí k pětkám, upozornění a ↩ Řady v řádku stavu připomenou návrat.
- Po zranění (dočasném i trvalém) se hned otevře Sestava s vyznačeným místem a poznámkou nahoře.

**Změněno**
- `src/views/live.js`: situace v hlavičce vedle třetiny; „hřiště“ `.lrink` (střela soupeře → červená středová čára → hráčky na ledě), mantinel `.lboard`, pod ním pětky / jednotky a fronty (pořadí front z v18.3); řádek stavu `#lchips` = tresty s odpočtem a ✕ + nabídka jednotky / ↩ Řady (situace, 🩹 a tlačítka jednotek z něj odešly); upozornění `#lwarn` v horním řádku průběhu jen když nějaké je (chybí / přebývá hráčka, dlouhé střídání, jednotka po konci nerovnosti, nevybraná brankářka, na trestu, v ošetřování) – „✓ Bez upozornění“ zrušeno. Nové pomocné `grpFor`, `unitView`, `unitLabel`, `proposeUnit`, export `askUnit`.
- `src/views/live-quick.js`: po zapsání trestu volá `askUnit` (zápis `commitEv` beze změny).
- `styles/main.css`: hřiště, středová čára, mantinel, tlačítka režimu PP/OS, vyznačené místo v sestavě, řádky upozornění.
- `src/views/help.js` (kapitoly 5–7), `README.md`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v42), `plan-zivy-zapis-v18.md`.

**Beze změny:** `live-engine.js` (střely, góly, tresty, časomíra, střídání a rotace), odezva z v18.2, ovládání rotace z v18.3, uložená data, pravidla databáze (`firestore.rules` není nutné publikovat).
Ověřeno kouřovým testem v jsdom (32 kontrol: pořadí hřiště a mantinelu, situace v hlavičce, prázdný řádek stavu, nabídka po našem i soupeřově trestu, návrh jednotky bez vyloučené, potvrzení a režim OS / PP, fronty jen z jednotek, zranění v oslabení při 2+2 → upozornění a Sestava s místem, trvalé zranění → prázdné místo, návrat k pětkám po konci nerovnosti, ↩ Řady, záblesk, střely).

## v18.3 (22. 10. 2026) – rozložení B a ovládání rotace (fáze B5 + B3 plánu v18)
**Změněno**
- `src/views/live.js`: jediné rozložení B – horní lišta (čas, skóre) s řádkem stavu `#lchips` pevné výšky (situace, ⚡ PP / 🛡 OS, ↩ Řady, tresty s odpočtem a ✕, 🩹 ošetřování; posouvá se do strany) → STŘELA NA NAŠI BRÁNU → čára → tlačítka pětek → hráčky na ledě → sloupce čekajících pod každým místem (na řadě nahoře, větší). Rozložení A zrušeno (bez volby v nastavení). Pevná místa z v18.2 (`#lpen`, `#lunit`, `#ltmp`, `#lqbox`) nahradil řádek stavu.
- Rotace: dlaždice ve frontě má jedinou akci (na led); štítek ⇄ v dlaždici zrušen. Partnerka = malé tlačítko pod hráčkou – klepnutí pošle rovnou na led (`doSub`), podržení 0,55 s změní pořadí rotace (`swapRot`). Dole ve sloupci partnerka hráčky na ledě (klepnutí ji vystřídá).
- `src/views/live-quick.js`: záblesk po trestu míří na řádek stavu `#lchips`.
- `styles/main.css`: oddíl 8b přepsán pro rozložení B (řádek stavu, čára, pětky, sloupce čekajících, tlačítko partnerky).
- `src/views/help.js` (kapitoly 3 a 5), `README.md`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v41), `plan-zivy-zapis-v18.md`.

**Beze změny:** odezva z v18.2 (vibrace a záblesk), střely, góly, tresty, časomíra, logika střídání a rotace (`putOn`, `swapRot`, `rotate`, `requeue`), uložená data, pravidla databáze (`firestore.rules` není nutné publikovat).
Ověřeno kouřovým testem v jsdom (20 kontrol: pořadí rozložení B, rozložení beze změny po střídání, střele, trestu, jednotce a ošetřování, odezva u všech akcí, klepnutí a podržení partnerky, zapsaná data).

## v18.2 (22. 10. 2026) – pevné rozložení a odezva živého zápisu (fáze B2 plánu v18)
**Přidáno**
- `src/views/live-feedback.js`: `haptic(kind)` (vibrace `tap` / `ok` / `undo` / `err`), `flash(selektor)` a `applyFlash` (zablikání tlačítka, které přežije nové vykreslení), vypínač vibrace (LS `hapticOff`).
- Odezva po střídání (klepnutí i přetažení), střele naší i soupeře, gólu, trestu, nasazení pětky, jednotky, ↩ Zpět na řady a ↩ Zpět; chybová vibrace, když se střídání, pětka nebo jednotka neprovede.
- ⋯ → ⚙️ Nastavení: přepínač „Vibrace: zapnutá / vypnutá“.

**Změněno**
- `src/views/live.js`: vyhrazená místa pevné výšky – tresty `#lpen` (2 tresty, další se posouvají uvnitř), jednotky PP/OS `#lunit` (řádek tlačítek + řádek stavu), ošetřování `#ltmp` (jeden řádek); fronty v rámečku pevné výšky `#lqbox` podle sestavy, řádek na řadě dole u ledu, delší fronta se posouvá uvnitř. Volání odezvy u akcí (logika `doSub`, `doShot`, `doOShot`, `doUndo`, `act`, `applyLine`, `applyUnit`, `toLines` beze změny).
- `src/views/live-quick.js`: odezva po zapsání gólu (zablikání skóre) a trestu (zablikání místa trestů); zápis `commitEv` beze změny.
- `styles/main.css`: oddíl 8b – vyhrazená místa, rámeček front, animace `hc-flash`.
- `src/views/help.js` (kapitola 5 a ⚙️ Nastavení), `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v40), `README.md` (historie přesunuta sem), `CHANGELOG.md` (nový), `plan-zivy-zapis-v18.md`.

**Beze změny:** střely, góly, tresty, časomíra, střídání a rotace, uložená data, pravidla databáze (`firestore.rules` není nutné publikovat).
Ověřeno kouřovým testem v jsdom (18 kontrol: vykreslení, stejné rozložení po střídání, střele, trestu, jednotce a ošetřování, výška rámečku front, odezva u všech akcí, vypnutí vibrace, zapsaná data).

## Starší verze (do v18.1.1, původní zápis z README)
- **v18.1.1 (22. 10. 2026):** oprava tlačítka Zpět (aplikace se zavírala bez dotazu).
  Změněno: `src/core/nav.js` (strážní záznam se doplní jen při skutečném klepnutí `isTrusted` a jen jeden za klepnutí, i při klepnutí do dotazu; posun prstem nic nevkládá; zásoba 5 záznamů; po vyčerpání zásoby vždy dotaz na ukončení), `src/views/help.js`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v39), `README.md`, `plan-zivy-zapis-v18.md`.
  Ověřeno simulací v jsdom s modelem pravidla Chrome (přeskočitelné záznamy). Beze změny: střely, góly, tresty, časomíra, střídání, pokladna a pravidla databáze (`firestore.rules` není nutné publikovat).
- **v18.1 (22. 10. 2026):** fáze B1 plánu v18 a opravy v18.0.
  Změněno: `src/domain/timeline.js` (nová funkce `shiftList` – společné pravidlo střídání; používá ji `shiftStats` i vývoj zápasu), `src/views/report.js` (statistiky zápasu přes `shiftList`), `src/views/stats.js` (celkové statistiky přes `shiftList`), `src/views/live.js` (Průběh místo Poslední akce, pevný řádek upozornění, Čas na ledě přes `shiftList`, nová funkce `leaveLive` – odchod zastaví čas), `src/core/nav.js` (zásoba 3 strážních záznamů doplňovaná při klepnutí – oprava dotazu na ukončení; odchod ze živého zápisu zastaví čas), `src/main.js` (předání `leaveLive`), `src/views/help.js`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v38), `README.md`, `plan-zivy-zapis-v18.md`.
  Beze změny: uložená data střídání, opravy střídání, střely, góly, tresty, pokladna a pravidla databáze (`firestore.rules` není nutné publikovat). Změna chování časomíry jen na výslovné přání: odchod ze živého zápisu zastaví čas.
- **v18.0 (22. 10. 2026):** tlačítko Zpět na telefonu funguje uvnitř aplikace (fáze A plánu v18).
  Nové: `src/core/nav.js` (strážní záznam historie, zavření nejvyšší vrstvy, dotaz na odchod ze živého zápisu a na ukončení aplikace).
  Změněno: `src/main.js` (spuštění `initNav`), `src/views/help.js` (kapitola 1 a rychlá reference), `src/data/storage.js` (číslo verze), `package.json`, `sw.js` (cache hokej-v37), `README.md`.
  Beze změny: živý zápis (střely, góly, tresty, časomíra, střídání), pokladna, statistiky, docházka a pravidla databáze (`firestore.rules` není nutné publikovat).
- **v17.7 (22. 10. 2026):** párování plateb, dva účty, souhrnná platba jen na stejný účet, Soupeři pro všechny členy.
  Změněno: `src/domain/cash.js` (účty `ACC`, `twoAcc`, `accIban`, `accName`, `accOf`, `cashAcc`, `personVs`; zprávy `evItem`, `chargeItem`, `payerName`, `chargeMsg`, `multiMsg`; `planCharges` a `contribPlan` ukládají `acc` a `msg`; `cashCfg` s `iban2`, `acc` a účtem šablon; `sumCash` po účtech; oprava zkracování zprávy), `src/views/payments.js` (účet u události, `msg`/`acc` v předpisech, úhrada s VS, zprávou a účtem), `src/views/finance.js` (VS, účet a zpráva u předpisu, osobní VS, Zaplatila vše po účtech), `src/views/cashbook.js` (zpráva a VS u pohybů, zůstatky a filtr po účtech, účet u vkladu / výdaje), `src/views/money.js` (zpráva a účet u příspěvků, účet platu, CSV s účtem, VS a zprávou), `src/views/mine.js` (předpisy s účtem, QR na správný účet, souhrnná platba jen za stejný účet), `src/views/cash-settings.js` (provozní účet, účet příspěvků, účet šablony), `src/views/opponents.js` (bilance v seznamu, zápasy s proklikem, hráčky jen ke čtení), `src/views/report.js` (zápis utkání lze otevřít podle id zápasu), `src/views/matches.js` (proklik zápasů ve Vzájemných zápasech), `src/views/shell.js` (záložka Soupeři pro hráčky), `src/views/help.js`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v36).
  Beze změny: výpočet předpisů, variabilní symboly předpisů, docházka, živý zápis, střely, góly, časomíra, statistiky a pravidla databáze (`firestore.rules` není nutné publikovat – soupeře a zápasy čtou členové už dnes).
  Po nahrání: v ⚙️ → Nastavení pokladny doplň IBAN provozního účtu a zkontroluj, na který účet jdou příspěvky a jednotlivé šablony.
- **v17.6 (21. 10. 2026):** zpráva pro příjemce u plateb.
  Změněno: `src/domain/cash.js` (nová funkce `payMsg` – text „za co“ + jméno plátce), `src/views/mine.js` (zpráva u předpisu, v QR okně a v QR kódu; `evInfo` vrací i druh události, soupeře a měsíc), `src/views/help.js` (kapitola Moje platby), `src/data/storage.js` (číslo verze), `package.json`, `sw.js` (cache hokej-v35).
  Beze změny: výpočet předpisů, variabilní symboly, úhrady, pokladna, docházka, živý zápis, střely, góly, časomíra a pravidla databáze (`firestore.rules` není nutné publikovat).
- **v17.5 (21. 10. 2026):** přeorganizované zobrazení Událostí a Teamu.
  Události: jen Nadcházející / Minulé / Kalendář a + Trénink / + Zápas; odstraněn výběr „Zapisuji účast za“ a tlačítko 👤 Přihlašuji se sám za sebe (rychlá tlačítka na kartě platí za hráčku nebo propojeného trenéra / kustoda, jinak se skryjí). Detail události: pokladna přesunuta na konec stránky, náklady z hlavičky odstraněny.
  Team: přepínač **Team | 💰 Platby | 🏦 Pokladna | 📅 Měsíce** pro trenéra a pokladníka (stav `S.tm`); hráčka-pokladník vidí Team s formací, náhradnicemi, soupiskou a realizačním týmem jen ke čtení. Z přehledu plateb se událost otevře v záložce Události a tlačítko **← Team** vrátí zpět (`S.evBack`).
  Změněno: `src/views/events.js`, `src/views/team.js`, `src/views/shell.js`, `src/views/finance.js`, `src/core/state.js`, `src/views/help.js`, `src/views/cashbook.js` a `src/views/money.js` (jen komentáře), `src/data/storage.js` (verze), `sw.js` (cache hokej-v34), `package.json`, `README.md`.
  Beze změny: živý zápis, střely, góly, tresty, časomíra, statistiky, výpočty pokladny a pravidla databáze (`firestore.rules` není nutné publikovat).
- **v17.4 (21. 10. 2026):** osvobozené hráčky s vlastním nastavením plateb a koeficient v procentech.
  Změněno: `src/domain/cash.js` (příznak `ex` a `exOf`, `fxOf` se zpětnou kompatibilitou, `fxPct`, `pctToFx`, `FX_QUICK` místo `FXV`; příspěvky vrací i osvobozené), `src/views/payments.js` a `src/views/cash-settings.js` (skupina Osvobozené má stejné volby jako ostatní, text o dělení ceny), `src/views/modal.js` (úprava hráčky: osvobozená Ano/Ne, koeficient v % s rychlými volbami 100/75/50/25/0 %; pole plateb vidí a ukládá jen správce pokladny, kustodovi se zachovají), `src/views/team.js` (přidání hráčky s koeficientem v % a příznakem osvobozená, štítek v soupisce), `src/views/money.js` (osvobozené předem vynechané z příspěvků, lze je zahrnout), `src/data/storage.js` (CSV soupisky: osvobozená, koeficient v %), `src/views/help.js`, `firestore.rules` (**publikovat znovu**: pole `ex`), `sw.js`, `package.json`.
  Ochrana: kustod pole plateb v úpravě hráčky nevidí a při uložení stavu se zachovají původní hodnoty (jinak by přidání pole `ex` pravidla odmítla).
  Beze změny: živý zápis, střely, góly, tresty, časomíra, statistiky, docházka, úhrady a platy. Cache `sw.js` hokej-v33.
  Po nahrání: publikuj `firestore.rules`. Hráčky dříve označené koeficientem 0 se čtou jako osvobozené se 100 %; zkontroluj je v Team → Soupiska.
- **v17.3 (21. 10. 2026):** modul Pokladna, fáze F4, statistiky pro všechny členy týmu, úklid projektu a opravy.
  Nové: `src/views/money.js` (režim 📅 Měsíce: příspěvky, platy, hospodaření po měsících, CSV export).
  Přepsáno: `src/domain/cash.js` (příspěvky `contribRows`/`contribPlan`, platy `salaryRows`, měsíce `monthRows`/`chargesOfMonth`, CSV; odstraněny migrace `migratePlan`, `movePlan`, `cashKeep` a čtení starého tvaru plateb), `src/views/help.js` (nápověda doplněna o Události, docházku, Statistiky, Moje platby a Pokladnu; jediný návod k aplikaci).
  Změněno: `src/views/events.js` (režim 📅 Měsíce, výsledek a statistiky uzavřeného zápasu v detailu události pro všechny), `src/views/shell.js` (záložka Statistiky i pro hráčky), `src/views/finance.js` (příspěvky v přehledu dluhů), `src/views/mine.js` (název příspěvku), `src/views/payments.js` (bez starých polí pokladny), `src/views/matches.js`, `src/views/team.js`, `src/data/storage.js` (bez migrací a kolekce `payments`), `src/main.js`, `src/core/state.js`, `firestore.rules` (**publikovat znovu**), `sw.js`, `package.json`.
  Smazáno: `hockeycoach-navod.html` (nahrazen nápovědou ❓), `data/seed-data.json` (počáteční testovací data), tlačítka ⚙️ → Spustit migraci a Přesunout data pokladny (migrace hotové).
  Opraveno: smazání zápasu nekontrolovalo vyúčtování (šlo smazat i vyúčtovaný zápas s nezaplacenými předpisy) a nechávalo v databázi docházku zápasu; smazání zápasu četlo už nepoužívanou kolekci `payments`; kustod viděl v Team tlačítka přidat/smazat hráčku a spravovat realizační tým, která skončila hláškou `permission-denied`; nápověda uváděla zastaralé postupy (Zápasy → + Nový zápas, Všechny aktivní, záloha pro každého člena, Členové týmu jen trenér).
  Beze změny: střely, góly, tresty, časomíra a střídání živého zápisu, `live.js`, `live-engine.js`, `report.js`, `editor.js`. Cache `sw.js` hokej-v32.
  Po nahrání: publikuj `firestore.rules`, smaž ze serveru `hockeycoach-navod.html` a složku `data/`, v ⚙️ → Nastavení pokladny zkontroluj výši příspěvku a den splatnosti. Kolekci `payments` lze v konzoli Firebase smazat.
- **v17.2 (21. 10. 2026):** modul Pokladna, fáze F3 a opravy hlášených chyb.
  Nové: `src/views/mine.js` (Moje platby, banner dluhu, QR), `src/lib/qrcode.js` (QR lokálně), kolekce `evcash` (náklady a vyúčtování jen pro správce pokladny).
  Přepsáno: `src/domain/cash.js` (`cxOf`, `debtOf`, unikátní VS, SPD řetězec, `movePlan`), `src/views/payments.js` (zápis do `evcash`, příznak `ss`, výjimky z blokace), `src/views/events.js` (banner dluhu, blokace „Jdu“, `cx`), `src/views/finance.js`, `src/data/storage.js` (`evcash`, filtrovaný poslech `where`, `merge` v dávce, přesun dat pokladny), `src/main.js`, `src/views/shell.js` (záložka Moje platby), `src/core/state.js`, `firestore.rules` (**publikovat znovu**).
  Opraveno: výběr délky třetiny u nového zápasu se neukládal (`modal.js`); okno Nastavení pokladny nešlo zavřít (`cash-settings.js`); uzavření zápasu nezastavilo běžící hodiny a statistiky rostly dál (`actions.js`: `strip` zastaví hodiny, `fixClosed` opraví už uzavřené zápasy); náklady a vyúčtování četly všechny členky z dokumentů událostí; variabilní symbol nebyl zaručeně unikátní.
  Beze změny: střely, góly, tresty, časomíra živého zápisu, `matches.js`. Cache `sw.js` hokej-v31.
  Po nahrání: publikuj `firestore.rules`, spusť ⚙️ → Přesunout data pokladny. Otevřeno: ověření migrace proti starému `payments.js` z v16.3, nápověda ❓ a návod, F4.
- **v17.1 (21. 10. 2026):** modul Pokladna, fáze F2 a opravy z kontroly kódu.
  Nové: `src/views/cashbook.js` (zůstatek, vklady, výdaje, součty podle kategorií, pohyby, storno).
  Přepsáno: `src/domain/cash.js` (zůstatek, kategorie, kontrola částky úhrady), `src/views/payments.js` (atomické uzavření i znovuotevření vyúčtování, částečné úhrady, okno úhrady, zámek proti dvojímu klepnutí), `src/views/finance.js` (okno úhrady), `src/views/events.js` (režim 🏦 Pokladna, Platby jen pro správce pokladny, náklady jen pro správce pokladny, kontrola mazání), `src/data/storage.js` (`canDelete`: ochrana vyúčtovaných událostí, mazání předpisů bez úhrady; obnova ze zálohy přeskakuje `audit`), `src/core/utils.js` (hláška nad okny pokladny, z-index 80).
  Beze změny: `firestore.rules` (publikovat znovu netřeba), živý zápis, střely, góly, tresty a časomíra, `matches.js`, `main.js`, `state.js`. Cache `sw.js` hokej-v30.
  Opraveno: obnova ze zálohy selhávala kvůli `audit`; uzavření vyúčtování nebylo atomické; Platby viděl i kustod bez dat; náklady událostí viděly hráčky; hláška „IBAN nemá platný tvar“ byla schovaná pod oknem nastavení.
  Otevřeno: ověření migrace proti starému `payments.js` z v16.3, oddělení snapshotu vyúčtování do chráněné kolekce (F3).
- **v17.0.2 (20. 10. 2026):** oprava – v `src/views/team.js` chyběly zpětné uvozovky u výběru skupiny plateb a fx, modul se nenačetl a aplikace zůstala na „Načítám…“. Cache `sw.js` hokej-v29.
- **v17.0.1 (20. 10. 2026):** oprava – v `src/views/modal.js` chyběla uzavírací závorka funkce `modal()`, modul se nenačetl. Opraveno také okno člena týmu (platy) a okno gólu/vyloučení. Cache `sw.js` hokej-v28.
- **v17.0 (20. 10. 2026):** modul Pokladna, fáze F1. Nové: `src/domain/cash.js`, `src/views/cash-settings.js`. Přepsáno: `src/views/payments.js`, `src/views/finance.js`. Změněno: `storage.js` (role pokladníka, `db.batch`, migrace, záloha jen načtených kolekcí), `main.js`, `state.js`, `firestore.rules`, `events.js`, `team.js`, `modal.js`. Smazáno: `src/domain/payments.js`. Cache `sw.js` hokej-v27. Po nahrání: publikuj pravidla a spusť migraci.
- **v16.3 (20. 10. 2026):** **přehled plateb a dluhů, oprava výpočtu, přihlášení trenérů.** Cena na osobu se dělí **všemi přihlášenými hráčkami včetně osvobozených**; nový režim **💰 Platby** v záložce Události (souhrn, po hráčkách s rozbalením plateb a „Zaplatila vše“, po událostech, nevyúčtované události); pole `tid` v `members` (propojení trenéra / kustoda s členem realizačního týmu), tlačítko **👤 Přihlašuji se sám za sebe**. Cache `sw.js` hokej-v26.
- **v16.2 (19. 10. 2026):** platby za události (způsob placení hráček, cena a způsob úhrady události, vyúčtování, označení zaplaceno), realizační tým (kolekce `staff`, Team → Realizační tým) a jeho docházka, nominace zápasu jen z hráček přihlášených na událost, počty přihlášených podle rolí v přehledu události. Nová pravidla pro `staff` a `payments`. Cache `sw.js` hokej-v25.
- **v16.1 (17. 10. 2026):** **přihlášení hráček a vlastní zápis docházky.** Role Hráčka vstoupí do aplikace, jen když má v `members/{email}` pole `pid`; ⚙️ → Členové týmu umí u role Hráčka vybrat hráčku; hráčka nevidí zálohu ani správu členů; hráčka zapisuje jen za sebe a jen do termínu, nevidí správcovské akce. Zápasy, živý zápis, střely, góly, tresty a časomíra beze změny. Cache `sw.js` hokej-v24.
- **v16.0 (17. 10. 2026):** modul **Události a docházka** (první jednoduchá verze). Nový soubor `src/views/events.js`; záložka Události místo Zápasy, kolekce `events` a `attendance`. Cache `sw.js` hokej-v23.
- **v15.7 (17. 10. 2026):** vrácen přehled **Čas na ledě** do hlavního menu ⋯ živého zápisu. Cache `sw.js` hokej-v22.
- **v15.6 (17. 10. 2026):** oprava přesilovek a oslabení (`live-engine.js`, `live.js`): fronta při aktivní jednotce bez rotace, doplňování prázdných a vyloučených pozic podle pozic, nasazení pětky a jednotky bez vyprázdnění ledu, `toLines` doplňuje prázdná místa.
- **v15.5 (17. 10. 2026):** přepracování střídání a rotace v živém zápisu: stavový model na ledě / ve frontě / zaparkovaná, `claimSlot`, `requeue`, `rotate`, `settle`, `applyMap`, `syncLive`.
- **v15.4 (16. 10. 2026):** oprava nasazování při oslabení i přesilovce (střídání se při změně pozice neuzavírá, ↩ Zpět na řady doplní místa, fronty skrytých pozic pod nejbližší viditelnou).
- **v15.3 (16. 10. 2026):** nápověda v aplikaci (❓ v záhlaví, rozbalovací sekce, hledání, `src/views/help.js`), aktualizovaný návod `hockeycoach-navod.html`.
- **v15.2 (16. 10. 2026):** sloupec Ø stř. (průměrná délka střídání) v celkových statistikách hráčů.
- **v15.1 (16. 10. 2026):** řazení tabulek statistik klepnutím na hlavičku (▲/▼; text, čísla, časy MM:SS), `src/core/table-sort.js`.
- **v15.0:** přechod datové vrstvy na Firebase (Firestore + přihlášení Google, role trenér/kustod/hráčka), opravy střídání v Opravách zápisu.

## Starší souhrn (z dřívějšího záhlaví README)
v18.1.1 – oprava tlačítka Zpět: aplikace se už nezavře bez dotazu „Ukončit aplikaci?“ (ani po zavření okna Zpětem, po „Ne“ v dotazu nebo po několika Zpět po sobě). Dříve: v18.1 – **společné pravidlo střídání** (nulové záznamy se vynechají, plynulé pokračování hráčky je jedno střídání – stejně ve všech přehledech), **Průběh v živém zápisu** se všemi kroky včetně střídání a s pevným řádkem upozornění, **odchod ze živého zápisu zastaví čas** a oprava dotazu na ukončení aplikace tlačítkem Zpět. Dříve: v18.0 – **tlačítko Zpět na telefonu funguje uvnitř aplikace** (zavírá okna, panely a detaily, vrací kroky zápasu a záložky; z domovské stránky se zeptá na ukončení; v živém zápisu nic nezapíše ani nezastaví čas). Dříve: v17.7 – **párování plateb a dva účty**: pohyby v pokladně ukazují, za co jsou (VS a zpráva pro příjemce stejná jako v QR), tým může mít hlavní a provozní účet (každý předpis a pohyb má svůj účet, zůstatky po účtech, QR vede na správný účet) a souhrnnou platbu jedním QR lze poslat jen za předpisy na stejný účet; **Soupeři pro všechny členy** s bilancí v seznamu a proklikem na zápis a vývoj jednotlivých zápasů. Dříve: v17.6 – **zpráva pro příjemce u plateb**: každý předpis v Moje platby ukazuje, za co se platí (např. „Zápas 10.10. Sokol - Jana“, „Trénink 14.10. - Jana“, „Příspěvek 10/2026 - Jana“), a stejný text je v QR platbě. Dříve: v17.5 – **přeorganizované zobrazení**: záložka Události řeší jen události (bez výběru „Zapisuji za“), pokladna v detailu události je až na konci stránky a správa pokladny (💰 Platby, 🏦 Pokladna, 📅 Měsíce) se přesunula do záložky Team. Dříve: v17.4 – osvobozené hráčky s vlastním nastavením plateb a koeficient v procentech (0–100 % místo 1 / 0,5 / 0); v17.3 – **modul Pokladna, fáze F4** (měsíční příspěvky, platy realizačního týmu, hospodaření po měsících, CSV export pokladny), **Statistiky pro všechny členy týmu**, úklid projektu (odstraněn samostatný návod, počáteční data a kód migrací) a opravy nalezených chyb. Dříve: v17.2 – **Pokladna F3** (Moje platby, QR platba, blokace „Jdu“, výjimky, chráněná kolekce `evcash`); v17.1 – **Pokladna F2** (úhrady, vklady, výdaje, kategorie, zůstatek, storno); v17.0 – **Pokladna F1** (osoby a role, koeficient fx, nastavení a šablony, výpočet a uzavření vyúčtování → předpisy, migrace plateb); v17.0.1 a v17.0.2 – opravy načítání; v16.3 – přehled plateb a dlužných částek, oprava výpočtu ceny na osobu a přihlášení trenérů a kustodů do událostí sami za sebe; v16.2 – platby za události a realizační tým; v16.1 – přihlášení hráček; v16.0 – modul Události a docházka; v15.7 – přehled Čas na ledě; v15.6 – oprava přesilovek a oslabení; v15.5 – přepracovaná logika střídání a rotace; v15.4 – oprava nasazování jednotek; nápověda v aplikaci (tlačítko ❓), průměrná délka střídání v celkových statistikách a řazení tabulek klepnutím na hlavičku.
