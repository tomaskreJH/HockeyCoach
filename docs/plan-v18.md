# Plán úprav v18 – v20 (úklid, rychlé úpravy, soukromí, role, události, notifikace, hosté, více týmů)

> Od v18.8 je plán v `docs/plan-v18.md` (dříve `plan-zivy-zapis-v18.md` v kořeni repozitáře). Dokončené fáze A, B, G, P, C, Q a průběžné záznamy „Stav a rozhodnutí“ jsou v [archiv-plan-v18.md](archiv-plan-v18.md). Programovací řád: [KONVENCE.md](KONVENCE.md). Historie verzí: [CHANGELOG.md](../CHANGELOG.md).

Výchozí verze: v17.7 (22. 10. 2026). Cíl: řada verzí v18.x, po každé fázi test na Androidu, teprve pak další fáze.
Pořadí fází je návrh – lze ho změnit. **Od 22. 10. 2026 (večer) seřazeno podle náročnosti:** nejdřív rychlé úpravy (R), pak úklid (D) a ověření všech modulů (T), teprve potom velké celky (role, rušení událostí, žádosti, notifikace, hosté, více týmů) – viz sekce „Plán v18.8 – v20“.
**Kontrola plánu proti kódu v18.7.1 (22. 10. 2026, 19:00) – rozhodnuto 19:10 (sekce „Rozhodnutý postup“):** testy (T1) před úklidem, rozhodnutí o více týmech před pravidly a notifikacemi, nová fáze S (soukromí v databázi), P2 rozdělena (bod 8 do O), brána verze v D2 – podrobnosti v sekci „Kontrola plánu“ na konci plánu, otázky 31–40.

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
| v18.9.3 | D3 | **další na řadě:** Úklid – mazání: `legacyEx`, `payments`, `coach`, mrtvý kód D21–D30; zápisy nových polí přes `merge`; sjednotit 3 zbývající potvrzení na `confirm2`; odstranit „(od v18.x)“ z nápovědy |
| v19.0 | R | Rychlé úpravy na čistém kódu: kalendář od nejnovějších, Zápis utkání v Událostech pro všechny, Moje platby po měsících, trenéři v pětkách tréninku (dříve R1 + R2) |
| v19.1 | S | Soukromí v databázi: důvody omluv, platy trenérů, platební pole soupisky jen pro oprávněné – **publikovat firestore.rules + převod** |
| v19.2 | P2 | ⭐ Jistota plateb: účet opsaný v telefonu, jméno příjemce v QR (pod 4 očima), „odesláno – čeká na potvrzení“ – **publikovat firestore.rules** |
| v19.3 | O | Role: Hlavní trenér, zástupce, asistent (místo kustoda), pokladník; audit členů – **publikovat firestore.rules + převod rolí** |
| v19.4 | Z | Zrušení události (zůstává v historii), úplné smazání jen vývojář |
| v19.5 | W | Žádosti o změnu účasti po uzávěrce (vynucené i pravidly) – **publikovat firestore.rules** |
| v19.6 | N | 🔔 Upozornění **v aplikaci** (zdarma: přehled novinek při otevření – nová událost, uzávěrka, předpis, žádosti, zrušení); push při zavřené aplikaci jen po souhlasu s Blaze (otázka K1) |
| v19.7 | HG | Hostující hráčky – vlastní úzké dokumenty (`evpub`, `matchpub`), bez Cloud Functions – **publikovat firestore.rules** |
| později | M | Další tým = **samostatná kopie: vlastní GitHub, vlastní projekt Firebase** (možnost A); kód na to připraví D1 (nastavení týmu a Firebase na jednom místě) |
| později | H | Souběžné tresty – přestavba formací, když hráčka chybí a hra je vyrovnaná (5 na 5, 4 na 4) – **jen myšlenka** |
| později | F | Jeden zapisovatel živého zápisu – ochrana proti duplicitám a souběhu dvou zařízení |
| později | E | Modul Trénink (zatím neřešit) |

---

## Stav (aktualizováno 22. 10. 2026)
- **v18.8 (K) dodáno, k testu.** Nový `src/core/app-version.js` (jediné místo s číslem verze, `cmpVer`, `isOutdated`, `canRaise`); brána verze v `storage.js` (strážce `blocked()` zastaví zápis i u starší verze, pruh ⚠️ v `shell.js`, ⚙️ → 🔒 Vyžadovat verzi jen trenér, `settings/app` se ze zálohy neobnovuje ani nemaže); pravidla `members` – pokladník jen role `hracka` před i po změně a ne vlastní dokument (nález 1); pravidla `settings/app` jen trenér, nejde smazat; testy `tests/` (39 kontrol: pokladna, účty, QR, docházka, dlužníci, živý zápis – střídání, rotace, Zpět, tresty, gól v přesilovce, časová osa; verze a pravidla). Spuštění bez instalace balíčků: `npm test` (Node 22+, zástupci prohlížeče a Firebase v `tests/support/`).
- **Postup nasazení v18.8:** 1) publikovat `firestore.rules`, 2) nahrát kód (smazat `plan-zivy-zapis-v18.md` z kořene), 3) ověřit přihlášení trenéra, hráčky a pokladníka, 4) trenér: ⚙️ → 🔒 Vyžadovat verzi v18.8 (až budou všechna zařízení na v18.8).
- **v18.8.1 (oprava po testu v18.8) dodáno, k testu:** nový zápas s časem, místem a termínem přihlašování; po vytvoření detail události; karta zápasu vede postupem přihlášky → nominace → sestava → uzavření (`signupState` v `domain/lineup.js`). Test v18.8: „jinak vypadá funkčně, vše neověřeno“.
- **v18.9 (D1 část 1: body a–e, j, k) dodáno, k testu.** D1 rozděleno (na jedno vlákno příliš velké): v18.9 = a–e, j, k; v18.9.1 = f–i. Nové pomůcky `confirm2` / `armed` (`core/actions.js`), `pn` / `nm` (`core/selectors.js`), `csv` (`core/utils.js`), `makeDrag` (`core/drag.js`); `matchesVs` a `vsHash`; komentáře v `src/` a CSS bez historie verzí; smazáno `asciiMsg`, `.nx-strip`, zbytečné exporty (D26). Srovnávací testy `tests/d1-baseline.test.js` (fixture z v18.8.1) – statistiky, CSV byte po bytu, potvrzení, zápasy proti soupeři, VS – zůstávají beze změny i pro v18.9.1. 56 testů zelených.
- **Nálezy z v18.9 (k rozhodnutí):** 1) tři potvrzení druhým klepnutím mají jiné chování než `confirm2` (bez 4 s návratu, vlastní okno): obnova zálohy „Nahradit“ a 🔒 Vyžadovat verzi (`storage.js`), smazání šablony (`cash-settings.js`) – sjednotit = změna chování; 2) `payerName` (`cash.js`) není duplicita – jméno bez čísla pro zprávu v QR, ponecháno; 3) jméno bez HTML pro hráčku bez jména dřív v časové ose vypsalo „undefined“, `nm` vrátí prázdné jméno (hráčka bez jména nejde založit ani uložit – prakticky nedosažitelné); 4) nápověda obsahuje 25× „(od v18.x)“ – text v aplikaci, v úklidu bez změny UI ponechán.
- **v18.9.1 (D1 část 2: body f–i) dodáno, k testu.** `playerStats` (`domain/player-stats.js`) pro statistiky zápasu i souhrn; oprávnění jen přes `HK.can(akce)` (tabulka `CAN` v `storage.js`; `HK.isStaff` / `isCash` / `role` zrušené); název týmu, aplikace a `DEV_EMAILS` v `src/config/team-config.js` (název `team.js` už má `views/team.js` – pravidlo jedinečných názvů); `live.js` rozdělen na `live-view.js`, `live-panels.js`, `live-events.js` (kód přesunut beze změny). Ověřeno: srovnávací testy z v18.9 beze změny, nové testy oprávnění pro 5 rolí a struktury kódu (67 testů), mimo repozitář kouřový test v jsdom – obrazovka živého zápisu ve 28 stavech a 16 obrazovek + ⚙️ pro 4 role shodné s v18.9 znak po znaku.
- **D1 je hotové.** Test v18.9.1 (22. 10. 2026): „otestováno“; nález – pokladník nemůže nastavovat platby hráček → opraveno ve v18.9.2. Uživatel: záloha vytvořena, pole `ex` není u všech hráček, kolekce `payments` smazána z Firestore.
- **v18.9.2 (oprava) dodáno, k testu:** pokladník (i hráčka-pokladník) Upravit → Platby / Plat (jen pole plateb, sestavu nemění); ⚙️ → Kontrola dat → Doplnit pole `ex` (jen trenér, záloha před zápisem, idempotentní).
- **Test v18.9.2 (22. 10. 2026):** „vše funguje“ (pokladník nastavuje platby, Kontrola dat). **Rozhodnutí k nálezům z v18.9:** 1) sjednotit potvrzení – **ano** (obnova zálohy „Nahradit vším“, 🔒 Vyžadovat verzi, smazání šablony pokladny → `confirm2` se 4 s návratem; v D3), 4) odstranit „(od v18.x)“ z nápovědy – **ano** (v D3), název `src/config/team-config.js` – **ponechat**. Nový požadavek: **pokladník smí zakládat události** → fáze O (viz tam).
- **Další: D3 (v18.9.3)** – mazání `legacyEx` (až Kontrola dat ukáže ✅), poznámky o `payments` (kolekce už smazána), pravidla `coach`, mrtvý kód D21–D30 (vč. nepoužitých proměnných v `matches.js`), zápisy nových polí přes `merge`.

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

## ⭐ Důležité kroky – P2 v19.0 (dříve v18.6.2): Jistota plateb pro hráčky (přidáno 22. 10. 2026, odloženo)
Cíl: co největší jistota platící, že peníze odešly na správný účet – i kdyby někdo podvrhl data (Firestore, zneužitý účet správce, domluva dvou správců).
Omezení (vědomě): kontrola v aplikaci nechrání před změnou samotného kódu (napadený GitHub / hosting) – útočník by ji z kódu odstranil. Proti tomu jen ochrana mimo aplikaci (body 5–7).
**V aplikaci (v19.0):**
1. **Účet uložený v telefonu hráčky:** hráčka si účet týmu uloží jednou **opsáním** čísla účtu (z papíru / od trenéra osobně), ne klepnutím. Nahradí dnešní „Ověřila jsem účet“ (`seenAccs` / `markSeen` v `bank-account.js`, okno QR v `mine.js`).
2. **Porovnání při každém QR:** účet z databáze ≠ uložený v telefonu → QR se **nevytvoří**, červené varování „Účet týmu nesouhlasí s účtem uloženým v tvém telefonu – neplať a ozvi se trenérovi“. Změna = znovu opsat nové číslo.
3. **Jméno příjemce v QR** (`RN:` – název majitele účtu přesně podle banky; banky ho zobrazí, ověřování jména příjemce u CZK plateb se zavádí, povinné do 2027). Rozhodnout: přesný název majitele účtu.
4. **Potvrzení přijetí:** u předpisu stav „odesláno – čeká na potvrzení přijetí“ (hráčka označí odeslání), když pokladník úhradu do X dní nezapíše → připomenutí hráčce, ať se ozve. Rozhodnout: lhůta (návrh 7 dní).
**Mimo aplikaci (doporučení pro tým, do nápovědy):**
5. Účet týmu uložit jako **příjemce / šablonu v bankovní aplikaci** každé hráčky (ověřit osobně jednou) – nejsilnější ochrana, nezávislá na aplikaci.
6. **Jediný zdroj pravdy mimo aplikaci:** číslo účtu na papíře v šatně / na webu klubu; změnu účtu oznamovat osobně na tréninku, nikdy jen zprávou.
7. **Zabezpečení přístupů:** GitHub i Google/Firebase jen s dvoufázovým ověřením (passkey / bezpečnostní klíč), minimum lidí s právem zápisu a vlastníků projektu Firebase, ochrana hlavní větve na GitHubu, upozornění na změny ve Firebase. Každá verze, která sahá na platby, je v CHANGELOG výslovně označena (`bank-account.js`, `mine.js`, `cash.js`, `firestore.rules`) – zkontrolovat před nahráním.
8. Navazuje zbývající riziko z P (trenér přidá vlastní druhý e-mail jako pokladníka): audit změn členů týmu a zákaz potvrzení čerstvě přidaným členem.
**Upřesnění po kontrole (22. 10. 2026):** body 1–4 = **P2a** (v19.0.1). Bod 3 potřebuje nové pole se jménem majitele účtu v `settings/cash` – musí být **pod stejnou ochranou 4 očí** jako `iban` (doplnit do `accSame()` a potvrzení v `firestore.rules` a do `ACC_KEYS` v `storage.js`), jinak by šlo jméno měnit bez potvrzení. Bod 4 potřebuje zápis hráčky („odesláno“) – dnes `charges` zapisuje jen správce pokladny → nové pole s úzkým pravidlem, nebo kolekce `chsent/{cid}` → **publikovat firestore.rules** (P2 tedy není „jen v aplikaci“). Bod 8 vyžaduje `addedAt` v `members` vynucené pravidly (`request.time`) a audit změn členů – patří do **O** (tam se pravidla `members` přepisují).

## N – v19.4: Notifikace (přidáno 22. 10. 2026, návrh; rozšíření v sekci „Plán v18.8 – v20“)
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

## D – v18.9: Úklid kódu (bez změn UI; doplnění s ohledem na další vývoj v sekci „Plán v18.8 – v20“)

Zjištěno při kontrole v17.7 – návrh, co sjednotit, zjednodušit nebo smazat:

**Počítá se dvakrát / vícekrát**
1. Počet a čas střídání – 5 různých výpočtů (vyřeší B1 funkcí `shiftList`).
2. Statistiky hráček: `report.js` `matchStatsHtml` (jeden zápas) a `stats.js` (souhrn) počítají góly, asistence, střely, TM, +/- každá zvlášť → jedna doménová funkce `playerStats(matches)` pro jeden i více zápasů.
3. Zápis gólu a trestu v živém zápisu má dvě cesty: rychlý zápis (`live-quick.js`) a menu ⋯ → `openLive` → `modal.js`. Zvážit ponechání jen rychlého zápisu v živém zápisu (modal zůstane pro Opravy zápisu).
4. Jména bez HTML: `plainName` (money.js), `nameOf` (timeline.js, cashbook.js), `payerName` (cash.js), `pn` (selectors) → jedna funkce v `selectors.js` (s HTML / bez HTML).
5. CSV: tři implementace (`report.js` `csv`, `cash.js` `csvText`, export v `storage.js`) → jedna v `core/utils.js`.
6. Potvrzení druhým klepnutím (`S.cf === key` + `setTimeout` 4 s) je rozkopírované na víc než 30 místech v 10 souborech → helper `confirm2(key, fn)` v `core/actions.js`.
7. Přetahování (drag) – 4 téměř stejné implementace (`live.js` `lvDrag`, `lineup-editor.js` 2×, `team.js`) → jeden modul `core/drag.js`.
8. Dva různé `vsOf`: `selectors.js` (zápasy proti soupeři) a `cash.js` (variabilní symbol) – stejný název, jiný význam → přejmenovat na `matchesVs` a `vsHash`.

**Lze smazat nebo zjednodušit (ověřit na datech)**
9. `cash.js` `legacyEx` – starý tvar osvobozené hráčky (fx 0, do v17.3). Po kontrole soupisky (všechny hráčky už mají pole `ex`) odstranit.
10. `firestore.rules` – poznámka o kolekci `payments` (staré platby do v16.3); kolekci smazat v konzoli Firebase a poznámku odstranit.
11. Název týmu „HC Střely“ je natvrdo v 7 souborech (`report.js`, `matches.js`, `live.js`, `live-quick.js`, `editor.js`, `modal.js`, `stats.js`) → jedno nastavení (název týmu v ⚙️).
12. `live.js` „obnovit formace“ (`re`) uzavírá a znovu otevírá střídání všem na ledě – po B1 to statistiky nerozbije, ale zvážit, zda volbu vůbec potřebujeme vedle „pětka na led“ a „zpět na řady“.
13. `live.js` je 25 kB hustého kódu v několika dlouhých řádcích – při B1–B5 rozdělit na `live-view.js` (vykreslení), `live-panels.js` (menu ⋯, sestava, jednotky, zranění) a `live-events.js` (obsluha klepnutí).

Postup: každá položka samostatně, bez změny chování; po úklidu ověřit testovacím zápasem, že statistiky a pokladna dávají stejná čísla jako v17.7.

**Upřesnění po kontrole kódu v18.7.1 (22. 10. 2026):** bod 1 je **hotový** (`shiftList` v `timeline.js`, používají ho `live.js`, `report.js`, `stats.js`). Bod 3: `openLive` je v `live.js` (okno pak kreslí `modal.js`). Bod 5: CSV má **čtyři** implementace (`report.js` `csv`, `money.js` `csv`, `cash.js` `csvText`, `storage.js` `exportCSV`). Bod 7: přetahování je i v `matches.js` (sestava zápasu přes editor) – ověřit, zda jde o `lineup-editor.js`. Bod 13: `live.js` má dnes **40 kB** (ne 25 kB). Bod 12 (zrušit „obnovit formace“) **mění UI** – nepatří do úklidu „bez změn UI“ → otázka 34. Rozhodnutí z otázky 9 (+/- brankářkám nepočítat) **mění čísla** statistik – nepatří do D1 „bez změny chování“, udělat jako samostatnou položku s vlastním záznamem v CHANGELOG.

## Plán v18.8 – v20 (přidáno 22. 10. 2026 večer, seřazeno podle náročnosti)

### Zásady – aplikace musí zůstat vždy funkční a ověřená
- **Malé verze:** jedna fáze = jedna verze; po každé verzi kouřový test (jsdom) a test na Androidu, teprve pak další. Opravy po testu jako třetí číslo (v18.8.1 …).
- **Návrat zpět:** každá verze je samostatný zip – při problému se nahraje předchozí. Proto změny dat jen **přidávají** pole / kolekce; stará pole se mažou nejdřív o verzi později, až je nová otestovaná.
- **Pravidla databáze (`firestore.rules`) zpětně slučitelná:** během převodu povolit starý i nový tvar (např. role `kustod` i `asistent`), zúžit až po převodu dat. U každé verze napsat, zda a kdy **publikovat firestore.rules** (před, nebo po nahrání kódu).
- **Peníze a zabezpečení** (`mine.js`, `cash.js`, `bank-account.js`, `cash-settings.js`, `payments.js`, `firestore.rules`): každá verze, která na ně sahá, je v CHANGELOG výslovně označena.
- **Převody dat** (role, hosté, více týmů): tlačítko v ⚙️ s náhledem „co se změní“ a záloha před převodem (stávající Záloha / Obnova).
- **Testy v repozitáři** (od T): automatické testy se spouští před každým zipem; nové funkce přidávají vlastní testy.

### R1 – v18.8: Rychlé úpravy (malá náročnost, bez změny dat a pravidel)
1. **Kalendář od nejnovějších:** v Událostech → Kalendář seznam událostí měsíce / dne řadit sestupně (nejnovější nahoře, nejstarší dole). Dnes `events.js` řadí vzestupně (`shown … .sort(asc)` v režimu `cal`). Návrh: stejně i „Minulé“ (už sestupně) – „Nadcházející“ ponechat vzestupně (nejbližší nahoře) → otázka 18.
2. **Zápis utkání v Událostech stejný jako u Soupeřů:** detail uzavřeného zápasu v Událostech dnes ukazuje jen skóre a `matchStatsHtml`; u Soupeřů se otevře celý **Zápis utkání** (`renderReport` – vývoj zápasu, střely, střídání, čas na ledě). Sjednotit: v detailu uzavřeného zápasu tlačítko „📋 Zápis utkání“ (stejné okno `#rp`, `S.rp = id`) pro **všechny role včetně hráček**; krátký souhrn může zůstat nad tlačítkem → otázka 19. Data hráčky už čtou (`matches`), pravidla beze změny. Zkontrolovat, že `renderReport` nenabízí hráčce úpravy (jen tisk / CSV / HTML).
3. **Moje platby po měsících:** pod přehledem karta „📅 Po měsících“ – řádek za měsíc: předepsáno (kolik mě měsíc stál), zaplaceno, zbývá; klepnutím rozbalit předpisy měsíce; součet za zvolené období (výchozí sezóna 1. 8. – 1. 7. jako v Docházce, `seasonOf`). Jen z vlastních předpisů (`S.ch`), čistá funkce v `domain/cash.js` (nebo nový `domain/my-months.js`). **Sahá na platby (`mine.js`) → označit v CHANGELOG.** Rozhodnout, podle čeho se měsíc určuje → otázka 20.

### R2 – v18.8.1: Realizační tým v pětkách tréninku (malá až střední náročnost)
- Dnes `linesHtml` v `events.js` rozděluje do barevných pětek jen přihlášené hráčky (bez brankářek), uložení `events.lines = {pid: číslo pětky}`.
- Návrh (oprava po kontrole: docházka člena týmu má klíč **bez předpony** – `attendance/{eid}_{tid}`, v kódu `A[t.id]`): přihlášení členové realizačního týmu (`S.tr`) se dají přiřadit k pětce (např. vede stanoviště / hraje s pětkou); klíč v `lines` s předponou, aby se nepletl s hráčkou (`"t:" + id`). Statistiky ani docházka se nemění. → otázka 21.
- Navazuje na budoucí modul Trénink (E).

### D – v18.9: Úklid s ohledem na další vývoj (doplnění k sekci D)
Body 1–13 výše platí. Rozdělit na **D1** (čisté sjednocení bez změny chování: body 2, 4–8, 13) a **D2** (mazání ověřené na datech: 9, 10, 12). Nově – **příprava na další fáze, bez změny UI**:
14. **Oprávnění na jednom místě:** dnes `isStaff()` / `isCash()` / `HK.role() === …` rozesety po pohledech → funkce `can(akce)` v `storage.js` (např. `sport`, `money`, `members`, `accounts`, `delete`) se stejným výsledkem jako dnes. Fáze O pak změní jen tabulku oprávnění, ne desítky míst.
15. **Cesty ke kolekcím přes jednu funkci** (`col("events")` místo pevných řetězců `"events/" + id`) – příprava na více týmů (M): pokud se zvolí `teams/{teamId}/…`, změní se jedno místo.
16. **Nastavení týmu na jednom místě:** název týmu (dnes „HC Střely“ v 7 souborech – bod 11), `DEV_EMAILS`, `firebase-config.js` → `src/config/team.js` / `settings/team`.
17. **Komentáře s historií verzí** v hlavičkách souborů (např. „v18.4.2: …“) přesunout do CHANGELOG, v souboru nechat popis současného stavu – kratší a přehlednější kód.
18. ✅ **hotovo ve v18.8 (K):** **README** (66 kB) zkrátit na současný stav a návod k nasazení; dokončené sekce plánu (A, B, G, P, C, Q) přesunout do `docs/archiv-plan-v18.md`.
19. **Role „kustod“ zatím nepřejmenovávat** (UI se v D nemění) – přejmenování a nová práva až ve fázi O; v D jen připravit `can()`.
20. Ponechat: `src/debug.js` (používají ho testy), `src/lib/qrcode.js` (knihovna QR). **Upřesnění:** v repozitáři žádné testy nejsou (dosavadní kouřové testy jsdom vznikaly jen v pracovních relacích); `debug.js` zpřístupní jen 20 modulů (chybí `cash`, `bank-account`, `attendance`, `debtors`, `payments`, `storage` …). V T1 buď rozšířit, nebo testy importují moduly přímo a `debug.js` zůstane jen pro ruční ladění (`?debug`).
21.–30. Další mrtvý kód a zbytečnosti nalezené při kontrole – viz sekce „Kontrola plánu“, odstavec „Mrtvý kód nad rámec D1–D20“.
Kontrola po úklidu: stejná čísla statistik, pokladny, docházky a dlužníků jako před úklidem (srovnávací test na kopii dat / záloze).
**Stav D1 (v18.9, 22. 10. 2026):** hotovo body 4 (jména – `payerName` ponechán, jiný formát pro QR), 5 (CSV), 6 (`confirm2`), 7 (`core/drag.js`), 8 (`matchesVs` / `vsHash`), 17 (komentáře bez historie, i CSS), D21 (`asciiMsg`), D23 (`.nx-strip`), D26 (exporty), D28. D22 `trOf` zůstal jako vnitřní pomocník `pn` / `nm`. **v18.9.1:** hotovo 2 (`playerStats`), 13 (`live-view` / `live-panels` / `live-events`), 14 (`HK.can`), 16 (`config/team-config.js`; `firebase-config.js` zůstává v `src/data/`). Srovnávací základ: `tests/d1-baseline.test.js`.

### T – v18.9.x: Ověření všech modulů (připravenost na další vývoj)
- **Automatické testy v repozitáři** (`tests/`, spuštění `npm test`, jsdom jako vývojová závislost; do aplikace ani cache `sw.js` se nedostanou): doménové funkce (`cash`, `bank-account`, `attendance`, `debtors`, `timeline`, `live-engine` – scénáře trestů, gólů, rotace, Zpět), vykreslení pohledů pro každou roli (trenér, kustod, pokladník, hráčka) se zástupným úložištěm, QR (shoda obsahu, uložení obrázku). → otázka 22.
- **Ruční kontrolní seznam pro Android** (do `docs/test-checklist.md`): přihlášení a role, Události (seznam, kalendář, detail, přihlašování, uzávěrka, Docházka), Team (soupiska, pětky, rotace, PP/OS), zápas (nominace, sestava, živý zápis – střely, góly, tresty, zranění, Zpět, Průběh, Zápis utkání, Opravy zápisu), Statistiky, Soupeři, Pokladna (předpisy, úhrady, příspěvky, platy, měsíce, CSV), Moje platby (QR, uložení QR), ⚙️ (členové, nastavení pokladny, účty 4 oči, náhled role, záloha / obnova, přepočet dlužníků), offline a nová verze (cache).
- Výstup: seznam nálezů → opravy v18.9.x; teprve po „vše zelené“ začíná v19.

### O – v19.1: Role a oprávnění (střední až vysoká náročnost)
| Role | Práva |
|---|---|
| **Hlavní trenér** | vše (sport, peníze, účty, členové, nastavení, mazání) |
| **Zástupce** | Hlavní trenér ho určí na dobu nepřítomnosti – rozsah práv → otázka 23 |
| **Asistent** (nahradí kustoda) | vše čte; sportovní činnost: sestavy, nominace, zápasy a živý zápis, tréninky, události, docházka; **žádné peníze** (předpisy, úhrady, vyúčtování, účty) |
| **Pokladník** (příznak, jako dnes) | může mít hráčka i kdokoli z realizačního týmu; peníze podle dnešních pravidel |
| **Hráčka** | jako dnes |
- **Pokladník zakládá události** (požadavek 22. 10. 2026): pokladník – i hráčka s příznakem pokladník (často manažer klubu) – smí založit událost (trénink, zápas, další akce) a upravit čas, místo a termín přihlašování; **ne** sestavu, nominaci, živý zápis ani soupisku. V kódu nová akce `can("events")` v tabulce `CAN` (`storage.js`), v pravidlech `events` / `matches` povolit `create` (a úpravu údajů události) i pro `isCash()`. **Publikovat firestore.rules.** Lze zařadit i dřív jako samostatnou malou verzi (po D3), pokud bude potřeba.
- **Nové členy zadává** Hlavní trenér nebo pokladník (dnes trenér; pokladník nesmí přidat trenéra) → otázka 25.
- Dnes `members/{email}.role` ∈ `trener`, `kustod`, `hracka`; `isCoach` = trenér, `isStaff` = trenér + kustod, `isCash` = trenér nebo `cash`. Návrh: `role` ∈ `head`, `coach`, `asst`, `hracka` (+ `host` v HG), zástupce = `deputy: {email, od, do}` v nastavení týmu, nebo role `coach` s příznakem. Převod: `trener` → `head` (vývojář) / `coach`, `kustod` → `asst`.
- **Pozor – 4 oči u účtů (P):** dnes navrhuje trenér a potvrzuje jiný správce pokladny – určit, kdo navrhuje a kdo potvrzuje v nových rolích (souvisí s P2).
- Pravidla: přepsat `isCoach` / `isStaff` / `isCash` na nové role, během převodu přijímat i staré hodnoty. **Publikovat firestore.rules.** Náhled role (G) doplnit o nové role.

### Z – v19.2: Zrušení a smazání události (střední náročnost)
- **Zrušit** (běžná cesta): událost zůstane v historii, označená `cancelled: {by, at, reason}`, v seznamu a kalendáři přeškrtnutá „❌ Zrušeno“; přihlašování zamčené; nepočítá se do Docházky (% ani počet událostí); u zápasu nelze živý zápis. Vrácení zrušení → otázka 24.
- **Předpisy zrušené události:** nevyúčtovaná – žádné předpisy nevzniknou; vyúčtovaná – nabídnout storno předpisů (stávající storno v `cashbook.js` / `payments.js`, dlužníci se přepočtou) → otázka 24.
- **Notifikace přihlášeným** o zrušení přijde s fází N (do té doby jen značka v aplikaci).
- **Smazat** jen vývojář (`DEV_EMAILS`, po O „Hlavní trenér + vývojář“) pro testovací data: smaže událost / zápas a **všechno související** – docházku (`attendance`), předpisy (`charges`) i úhrady a zápisy v pokladně (`cash`), `evcash`, `debtors` (přepočet), statistiky (jsou v dokumentu zápasu – zmizí s ním), případně audit. Dnes `removeDoc` v `storage.js` maže jen část (vyúčtovanou událost smaže trenér / pokladník, předpisy přepočítá dlužníky). Před smazáním přehled „co se smaže“ a potvrzení druhým klepnutím. → otázka 26.
- Pravidla: `cancelled` smí zapsat role se sportovní činností; mazání `cash` / `charges` dnes smí správce pokladny – ověřit, zda stačí. Pravděpodobně **publikovat firestore.rules**.

### W – v19.3: Žádosti o změnu účasti po uzávěrce (střední náročnost)
- Po uzavření přihlašování (`isLocked`) uvidí hráčka i člen realizačního týmu tlačítko „✋ Požádat o změnu“: přihlásit se / odhlásit se / omluvenka s důvodem (+ nejistá?).
- Kolekce `requests/{id} = {eid, mid, kind, reason, at, st: "open" | "ok" | "no", by, byAt}`; žadatel zapisuje jen svou žádost, vyřizuje trenér / asistent.
- Trenérům upozornění nahoře v Událostech (jako „⏳ Čeká na potvrzení změna účtů“): „✋ 3 žádosti o změnu účasti“ → seznam s ✓ Schválit (zapíše docházku jako dnes ruční změna) / ✕ Zamítnout. Žadatel vidí stav své žádosti v detailu události.
- Dopad na platby: změna účasti u už vyúčtované události → upozornit (předpisy se nepřepočítávají automaticky, jen ručně – stávající pravidlo).
- Push notifikace trenérovi a odpověď žadateli až s fází N. **Publikovat firestore.rules.** → otázka 27.

### N – v19.4: Notifikace – rozšíření návrhu (vysoká náročnost, Firebase Blaze + Cloud Functions)
Vše ze sekce N platí; doplnění:
- **Nastavení u události:** připomínka uzávěrky přihlašování (výchozí např. 1 den a 1 hodina před `dl`) a připomínka **před srazem / odjezdem**, ne před začátkem zápasu – u události nové volitelné pole **„Sraz / odjezd“** (čas a místo); výchozí předstihy v nastavení týmu, u události lze přepsat nebo vypnout.
- **Turnaj / vícedenní akce:** událost s datem „do“ (nový typ Turnaj později) – připomínka podle srazu prvního dne.
- **Nové druhy:** 5) událost zrušena (všem přihlášeným, i „nejistá“), 6) nová žádost o změnu účasti (trenérům), 7) žádost vyřízena (žadateli), 8) hostující hráčka vyřazena z nominace (ihned jí).
- Otázky 13–17 platí, nově 28.

### HG – v19.5: Hostující hráčky (vysoká náročnost – pravidla databáze)
- Hostující hráčka není členkou týmu: v soupisce `players` s příznakem `guest: true`, účet v `members` s rolí `host` (propojení `pid` jako u hráčky).
- **Smí:** vidět nadcházející události a přihlásit se; vidět **jen počet přihlášených**, dokud není nominovaná; po nominaci a zařazení do sestavy vidět **sestavu toho zápasu**; vidět své předpisy a platit (Moje platby, QR).
- **Nesmí:** statistiky, dlužníky / ⛓, sestavy zápasů, kde není nominovaná, Docházku ostatních, Team, Soupeře (návrh) → otázka 29.
- Trenér ji může **vyřadit z nominace** → notifikace hráčce ihned (fáze N).
- Technicky: dnes `attendance`, `matches`, `players`, `debtors` čte každý člen (`isMember`). Pravidla neumí „filtrovat“ dotaz – hostovi se musí odepřít čtení celých kolekcí a dát mu jen: vlastní záznamy docházky, **veřejný souhrn počtu přihlášených** (`evcount/{eid}` – zapisuje aplikace při přihlášení, nebo Cloud Function), zápasy s jeho `pid` v poli nominace (`nom` / pravidlo `myPid() in resource.data.nom`), vlastní předpisy (už dnes). Vyžaduje změny v `main.js` (co se poslouchá podle role) a v pravidlech → **publikovat firestore.rules**.

### M – v20: Nasazení pro další týmy (nejvyšší náročnost – nejdřív diskuse)
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

### Otevřené otázky k nové části (18–30)
18. Kalendář: řadit sestupně jen Kalendář, nebo i Nadcházející? (Návrh: Kalendář a Minulé sestupně, Nadcházející vzestupně – nejbližší nahoře.)
19. Zápis utkání v Událostech: jen tlačítko do stejného okna jako u Soupeřů, nebo okno rovnou místo dnešního souhrnu? (Návrh: souhrn + tlačítko „📋 Zápis utkání“.)
20. Moje platby po měsících: měsíc podle data události / měsíce příspěvku (návrh), podle splatnosti, nebo podle data úhrady? Ukazovat i souhrnné platby a částečné úhrady zvlášť?
21. Trenéři v pětkách tréninku: jen přiřazení k pětce (vede / hraje s ní), nebo i samostatná „trenérská“ skupina? Mají se přiřazovat i nepřihlášení trenéři?
22. Testy v repozitáři: souhlas s přidáním `tests/` a `jsdom` do `devDependencies` v `package.json` (aplikace se nemění)?
23. Zástupce: plná práva Hlavního trenéra včetně peněz, účtů a členů, nebo bez nich? Časově omezený (od–do), nebo do odvolání? Může být zástupců víc?
24. Zrušení události: kdo smí rušit (Hlavní trenér, zástupce, asistent)? Lze zrušení vrátit? U vyúčtované události storno předpisů automaticky s potvrzením, nebo ručně?
25. Pokladník zadává členy: libovolné role, nebo jen hráčky a asistenty (ne Hlavního trenéra / zástupce)?
26. Smazání: jen vývojář, nebo i Hlavní trenér? Mazat i zaplacené úhrady a zápisy v pokladně (test data), nebo smazání odmítnout, když existují úhrady?
27. Žádosti o změnu účasti: kdo vyřizuje (Hlavní trenér, zástupce, asistent)? Zápis docházky po schválení automaticky? Lhůta (do začátku události)?
28. Notifikace: výchozí předstihy (uzávěrka 1 den a 1 h, sraz 2 h?); kdo nastavuje u události (kdo ji zakládá); pole Sraz / odjezd u všech událostí?
29. Hosté: platí jako hráčky bez příspěvku (podle šablon)? Počítají se do týmových statistik a Docházky? Smí vidět Soupeře / Zápis utkání zápasu, kde hráli?
30. Více týmů: který model (A / B / C)? Prodej – licence ročně, jednorázově, zdarma? Kdo založí tým a prvního Hlavního trenéra? Vlastní doména? Má mít jeden trenér víc týmů v jednom účtu?

## Rozhodnutý postup (22. 10. 2026, 19:10) – platí místo pořadí výše
Zadání: postup volí vývojář; zdarma nebo s minimálními náklady (Firebase i limity Claude); úklid a programovací řád co nejdřív; žádná duplicita, snadné budoucí úpravy; další tým až úplně nakonec (případně jiný GitHub i Firebase), jen struktura má odpovídat.

**Pořadí:** K (v18.8) → D1 (v18.9) → D2 (v18.9.1) → D3 (v18.9.2) → R (v19.0) → S (v19.1) → P2 (v19.2) → O (v19.3) → Z (v19.4) → W (v19.5) → N (v19.6) → HG (v19.7) → později M, H, F, E. Jedna verze = jedno vlákno s Claude.

**Zásady řádu (podrobně v `docs/KONVENCE.md`, vznikne v K):**
- Každá věc na jednom místě: doménová logika v `src/domain/` (čisté funkce, testované), oprávnění jen přes `can(akce)`, cesty a nastavení týmu v `src/config/team.js`, společné pomůcky v `src/core/`, pohledy jen vykreslují a volají domény.
- Zápis nových polí přes `merge`, ne `set` celého dokumentu; brána verze `settings/app.minVer` – starší klient nezapisuje.
- Pravidla databáze ve dvou krocích: rozšířit (staré i nové) → převést data → zúžit v další verzi.
- Komentáře popisují současný stav; historie jen v `CHANGELOG.md`; plán a archiv v `docs/`.
- Každá verze: testy `npm test` zelené před zipem; nové funkce přidávají testy.

**Náklady (rozhodnuto):** bez Blaze a bez Cloud Functions → projekt zůstává na bezplatném tarifu Spark. Notifikace N jen v aplikaci; hosté HG bez serveru (počty přihlášených zapisuje aplikace v téže dávce jako docházku – pravidla hlídají změnu jen o 1). Bez testovacího projektu Firebase a bez emulátoru (Java) – pravidla ověří kontrolní seznam a náhled role + testovací účet hráčky. Záznam chyb `errlog` ne. Poslech jen aktuální sezóny až tehdy, když se spuštění zpomalí (sleduje T v kontrolním seznamu).
**Úspora limitů Claude:** `docs/KONVENCE.md` + mapa souborů = vstupní bod (méně čtení), testy v repozitáři místo opakovaných ručních kouřových testů, každá fáze malá a samostatná, čtení cíleně.

**Odpovědi na otázky 18–40 (rozhodl vývojář; lze změnit):**
18 Kalendář a Minulé sestupně, Nadcházející vzestupně. 19 souhrn + tlačítko 📋 Zápis utkání. 20 měsíc podle data události / měsíce příspěvku, částečné úhrady jako „zaplaceno“ v měsíci předpisu. 21 jen přiřazení přihlášených trenérů k pětce. 22 ano (`tests/`, `jsdom` v devDependencies). 23 zástupce = práva Hlavního trenéra kromě účtů a členů s rolí trenér, s datem od–do, jeden. 24 ruší Hlavní trenér, zástupce, asistent; zrušení lze vrátit; u vyúčtované události storno předpisů nabídnout s potvrzením. 25 pokladník zadává jen hráčky (zároveň oprava nálezu 1). 26 mazat jen vývojář; s úhradami smazání odmítnout. 27 vyřizuje kdo má sportovní práva; schválení zapíše docházku; žádat do začátku události. 28 výchozí upozornění v aplikaci: uzávěrka 1 den, sraz 2 h; pole Sraz / odjezd volitelné u všech událostí. 29 hosté platí podle šablon jako hráčky, ve statistikách zápasů ano, v Docházce ne, Zápis utkání svého zápasu ano, Soupeři ne. 30 / 33 další tým = možnost A (samostatný GitHub a Firebase), `col()` se nedělá. 31 pořadí viz výše. 32 S po úklidu a rychlých úpravách. 34 „obnovit formace“ ponechat. 35 účty navrhuje jen Hlavní trenér, potvrzuje jiný správce pokladny; zástupce nenavrhuje. 36 brána verze ano. 37 pravidlo `coach` smazat (Trénink si ho případně vrátí). 38 ne. 39 ne. 40 až při zpomalení.

**Kritické otázky pro uživatele (jen tyto):**
- **K1 – Push notifikace při zavřené aplikaci:** vyžadují tarif Blaze (platební karta, rozpočtový limit; při velikosti týmu v praxi 0 Kč, ale účet je zpoplatnitelný). Výchozí rozhodnutí: **ne** – N bude jen v aplikaci. Odpověď stačí před v19.6.

**Co dělá uživatel a kdy:**
1. Teď: záloha (⚙️ → Záloha JSON + zip současného repozitáře).
2. v18.8 (K): nejdřív **publikovat `firestore.rules`**, pak nahrát kód; zkontrolovat přihlášení trenéra, hráčky a pokladníka.
3. Před v18.9.2 (D3): ⚙️ → kontrola pole `ex` (tlačítko přidá D1); v konzoli Firebase smazat kolekci `payments`.
4. Každá další verze: postup nasazení je vždy nahoře v CHANGELOG (pravidla před / po kódu); po testu napsat „otestováno“ nebo nález.
5. Před v19.6: odpovědět na K1.

## Kontrola plánu proti kódu v18.7.1 (22. 10. 2026, 19:00)
Kontrola bez změny kódu: `firestore.rules`, `src/data/storage.js`, `src/main.js`, `src/views/events.js`, `report.js`, `matches.js`, `team.js`, `modal.js`, domény. Stav plánu = stav repozitáře (dokument projektu `claude/plan-zivy-zapis-v18.md` byl totožný s `plan-zivy-zapis-v18.md` v kořeni repozitáře).

### Popis současného stavu – co sedí a co ne
- **Sedí:** role `trener` / `kustod` / `hracka` v `members/{email}` (+ `pid`, `tid`, `cash`); `isStaff` / `isCash` v `storage.js` i v pravidlech; `removeDoc` (maže předpisy bez úhrady, `evcash`, přepočet dlužníků); `events.lines = {pid: číslo}` (`linesHtml`, `saveLines`); `renderReport` (`S.rp` = `true` nebo id zápasu, otevírá se ze Zápasů a Soupeřů); `matchStatsHtml` v detailu uzavřeného zápasu v Událostech; řazení Kalendáře vzestupně (`events.js` ř. 192); C2 / Q / P podle popisu; „HC Střely“ v 7 souborech (11 výskytů); potvrzení druhým klepnutím 32× v 10 souborech.
- **Nesedí / doplnit:** (1) R2 – docházka člena týmu nemá předponu `t:` (klíč `{eid}_{tid}`); (2) D1 bod 1 už hotový; D3 `openLive` je v `live.js`; D5 čtyři CSV; D13 `live.js` 40 kB; (3) D20 – testy v repozitáři neexistují; (4) C1 „důvody omluv vidí jen trenér a kustod“ platí **jen v UI** – pravidla `attendance` pouští ke čtení každého člena včetně pole `reason` („Nemoc“, „Zranění“ = zdravotní údaje); (5) P2 „v aplikaci“ – body 3 a 4 vyžadují změnu pravidel; (6) Z „smazat jen vývojář“ – pravidla `DEV_EMAILS` neznají (seznam je jen v `storage.js`); (7) Z „případně audit“ – `audit` je podle pravidel jen k přidávání, smazat nejde (a nemá); (8) W – uzávěrka přihlašování (`isLocked`) a blokace dlužnice jsou **jen v aplikaci**, pravidla `attendance` je nevynucují; (9) záloha (`exportJSON`) neobsahuje `members` a `debtors`, a když ji udělá kustod / hráčka, chybí v ní tiše i pokladna (`charges`, `cash`, `audit`, `evcash`) – pro převody dat (O, M0) nestačí.

### Nálezy podle závažnosti
**Vysoká**
1. **Pokladník si může dát roli kustod** (i sobě): pravidlo `members` dovoluje pokladníkovi měnit člena, jen když nová ani stará role není `trener` → hráčka-pokladník změní svůj dokument na `kustod` a získá sportovní zápis (zápasy, události, docházka za kohokoli). Oprava jedním pravidlem: pokladník smí zakládat / měnit jen roli `hracka` a nesmí měnit vlastní dokument. → fáze S.
2. **Zdravotní důvody omluv čitelné všemi členy** z databáze (pravidla `attendance` → `isMember`), UI je jen skrývá. → fáze S: důvod do samostatné kolekce `attnote/{eid}_{pid}` (čte správce sportu + vlastník).
3. **Platy trenérů** (`staff.pay`) čte z databáze každý člen (`staff` → `isMember`). → fáze S: `staffpay/{tid}` jen pro správce pokladny.
4. **Bez brány verze:** mnoho míst zapisuje celý dokument (`set` – např. `saveLines`, `players` v `live.js` / `modal.js`). Starší klient (otevřená PWA bez načtení nové verze) při uložení **smaže nová pole** (např. `cancelled` ze Z, klíče z R2, `guest` z HG). Návrat ke starší verzi má stejný účinek. → D2: `settings/app = {minVer}`; klient pod minimem zobrazí jen „Načti novou verzi“ a nezapisuje; nová pole zapisovat přes `merge`.
**Střední**
5. Platební pole soupisky (`grp`, `fx`, `ex`, `note`) čte každý člen – hráčky vidí koeficienty a poznámky k platbám ostatních. Řešit v S (přesun do `plpay/{pid}`), nejpozději v HG.
6. Kustod může přihlásit dlužnici („Jdu“) – kontrola dluhu v `events.js` čte `S.ch`, kustod ale vidí jen své předpisy. Při úpravě použít souhrn `debtors` (S nebo W).
7. Mazání události / zápasu není atomické (docházka, předpisy a `evcash` po jednotlivých dokumentech) – při výpadku zůstanou sirotci. Ve Z jedna dávka.
8. Smazání hráčky nebo člena týmu: u hráčky zůstává docházka (u člena týmu se maže) – sirotci v `attendance`, Docházka je ignoruje, ale záloha je nese.
9. Poslech celých kolekcí od začátku (`matches` včetně celého živého zápisu, `attendance`, `events`) – čtení a doba spuštění porostou s každou sezónou. Před M (účtování) zvážit poslech jen aktuální sezóny + archiv na vyžádání.
10. `firebase.json` / `.firebaserc` v repozitáři nejsou – pravidla se publikují ručně v konzoli. Pro testy pravidel (emulátor), Cloud Functions (N) a více projektů / databází (M) nutné → T1.
**Nízká**
11. `KIND` (funkce realizačního týmu) už obsahuje „Asistent“ a „Kustod“ – v O hrozí záměna s rolemi; v UI rozlišit „funkce“ a „oprávnění“.
12. Zástupce (O) a člen týmu bez sportovních práv dnes neexistuje: člen realizačního týmu se přihlásí jen s rolí `trener` / `kustod` (hráčka musí mít `pid`).
13. `members.addedBy` zapisuje aplikace, pravidla ho nekontrolují (lze podvrhnout) – v O vynutit `addedBy == mail()` a `addedAt == request.time`.

### Proveditelnost fází
| Fáze | Dotčené soubory | Data | Pravidla | Rizika | Náročnost |
|---|---|---|---|---|---|
| R1 | `events.js` (řazení, tlačítko 📋 → `S.rp = id`), `report.js` (beze změny logiky), `mine.js` + `domain/cash.js` (měsíce), `help.js` | žádné | beze změny | měsíc u předpisu události – předpis musí nést datum (jinak dohledat událost; hráčka `events` / `matches` čte) | S |
| R2 | `events.js` (`linesHtml`, `saveLines`), `help.js` | nové klíče v `events.lines` (`t:<tid>`) | beze změny | starý klient klíče zachová (`{...lines}`) – OK; statistiky beze změny | S |
| T1 | nové `tests/`, `package.json` (devDependencies `jsdom`, `@firebase/rules-unit-testing`), `firebase.json`, `.firebaserc`, `.gitignore` | žádné | testy pravidel v emulátoru (Java) | do aplikace ani `sw.js` se nic nedostane | M |
| D1 | `storage.js` (`can()`, `col()`), `core/actions.js` (`confirm2`), `core/drag.js`, `selectors.js`, `utils.js`, `config/team.js`, `live.js` rozdělení, hlavičky souborů | žádné | beze změny | regrese živého zápisu a statistik → jen se zelenými testy T1 | L |
| D2 | `cash.js`, `firestore.rules` (poznámky, `coach`), mrtvý kód, brána verze (`storage.js`, `settings/app`) | `settings/app.minVer` | **publikovat po kódu** (jen úklid poznámek; `settings/app` pokrývá stávající `settings`) | `legacyEx` smazat až po kontrole pole `ex` | S–M |
| S | `firestore.rules`, `events.js` (důvod), `attendance.js`, `team.js` / `modal.js` (plat), `money.js` / `cash.js` (návrh platů), `main.js` / `storage.js` (poslech), převod v ⚙️ | nové `attnote`, `staffpay`, (`plpay`); převod kopírováním, stará pole smazat o verzi později | **před kódem** (povolit nové kolekce), zúžení starých až v další verzi | dvě verze klientů souběžně – starý čte důvody ze starého pole → proto zúžení až po bráně verze | M |
| P2a | `bank-account.js`, `mine.js`, `qr-image.js`, `cash.js` (`RN:`), `cash-settings.js`, `storage.js` (`ACC_KEYS`), `firestore.rules`, `help.js` | jméno majitele v `settings/cash`, „odesláno“ u předpisu | **před kódem** | ⚠️ platby; uložený účet v `localStorage` zmizí s daty prohlížeče → znovu opsat; nesoulad jména s bankou (ověření příjemce) | M |
| M0 | `storage.js` (`col()`), `main.js`, `firestore.rules` (obě cesty), převod v ⚙️ | kopie všech kolekcí do `teams/{id}/…` | **před kódem** (obě cesty), stará cesta jen ke čtení, smazání po otestování | převod jen s úplnou zálohou (včetně `members`), offline klienti zapisují na starou cestu → brána verze | L |
| O | `storage.js` (`ROLES`, `STAFF`, `can()`, členové, náhled G), všechny pohledy přes `can()`, `firestore.rules`, převod rolí | `members.role` nové hodnoty, `addedAt`, audit členů | **před kódem** (staré i nové role), zúžení po převodu | 4 oči: kdo navrhuje / potvrzuje; zástupce bez peněz?; pokladník a role | L |
| Z | `events.js`, `matches.js`, `domain/attendance.js` (vynechat zrušené), `payments.js` / `cashbook.js` (storno), `storage.js` (kaskáda v dávce) | `cancelled` přes `merge` | zrušení beze změny (`isStaff` zapisuje); mazání vývojářem = identita vývojáře v pravidlech (`settings/sys` nebo pevný e-mail) | kaskáda > 500 operací → více dávek; úhrady v pokladně mění zůstatek | M |
| W | `events.js`, nová doména `requests`, upozornění v Událostech, `firestore.rules` | `requests/{id}`; pro vynucení uzávěrky `dlTs` (časové razítko) u události | **před kódem** | bez `dlTs` jde uzávěrku obejít přímým zápisem do `attendance` | M |
| N | nové `functions/`, `firebase.json`, `sw.js` (push), `storage.js` / ⚙️ (token), `events.js` (Sraz / odjezd) | `pushTokens`, `pushLog`, pole srazu | **před kódem** (`pushTokens`); funkce nasadit před zapnutím v aplikaci | Blaze (karta, rozpočtový alarm), iPhone jen PWA na ploše, VAPID klíč | XL |
| HG | `firestore.rules` (oddělit `host`), `main.js` (poslech podle role), `events.js`, `matches.js`, `team.js`, `attendance.js`, `stats.js` (filtry), funkce v `functions/` | `evpub`, `matchpub` (viz níže), `players.guest` | **před kódem** (nové kolekce + role `host`), zúžit `isMember` → `isTeam` ve stejné verzi | počty a sestavy pro hosta musí udržovat Cloud Function (klient by je mohl podvrhnout) | XL |
| M | podle zvolené možnosti (níže) | podle možnosti | podle možnosti | GDPR, licence, podpora | L–XL |

### Pořadí a závislosti
- **Testy před úklidem:** D1 přepisuje živý zápis, statistiky a pokladnu „bez změny chování“ – to jde ověřit jen srovnávacími testy, které musí existovat předem → T1 před D1, ruční seznam (T2) po D2.
- **Rozhodnutí M před S / O / N:** volba ovlivní cesty kolekcí v pravidlech (S, O, W, HG), cesty spouštěčů Cloud Functions (N) a kdo platí Blaze. Při volbě B je levnější přesunout data do `teams/{id}` (M0), dokud je tým jediný a nových kolekcí málo – jinak se pravidla každé nové fáze píšou dvakrát.
- **Role ↔ 4 oči:** P2a (body 1–4) na rolích nezávisí → může před O. Bod 8 (audit členů, `addedAt`) mění pravidla `members` → do O. V O rozhodnout, kdo navrhuje a kdo potvrzuje účty (otázka 35).
- **Role ↔ žádosti ↔ hosté:** W potřebuje „kdo vyřizuje“ = `can('sport')` z O → W po O ✓. HG potřebuje roli `host` (O) a počty / sestavy z Cloud Functions (N) → HG po N ✓.
- **Notifikace ↔ Blaze:** N je jediná fáze, která Blaze nutně potřebuje; Z / W / HG mají do té doby jen značky v aplikaci ✓. Pozor: HG v navrženém modelu Blaze také potřebuje (funkce pro `evpub` / `matchpub`).
- **Úklid ↔ více týmů:** `col()` (D15) má smysl jen pro možnosti B (cesta `teams/{id}`); pro doporučenou možnost D (samostatná databáze) stačí jedno místo s inicializací Firestore. `can()`, `config/team.js`, žádný pevný název týmu a odstranění `DEV_EMAILS` z kódu (do `settings/sys`) se hodí pro všechny možnosti.

### Hostující hráčky – lze vynutit pravidly? Datový model
Ano, ale **ne nad dnešními kolekcemi**: pravidla neumí skrýt část dokumentu ani filtrovat čtení celé kolekce – host, který smí číst `matches`, `attendance`, `players` nebo `debtors`, přečte všechno. Proto host celé kolekce týmu nečte vůbec a dostane vlastní, úzké dokumenty:
- `members/{email} = {role: "host", pid}`; v pravidlech nová funkce `isTeam() = isMember() && role() != "host"` a všechna dnešní čtení `isMember()` přejdou na `isTeam()` (pro stávající role beze změny).
- `players/{pid}.guest = true` (soupiska ho filtruje z Docházky, statistik, dlužníků, Team).
- `evpub/{eid} = {type, title, date, time, place, dl, dlTs, opp, home, cancelled, yes, maybe, no}` – veřejná hlavička události a **jen počty**; čte `isMember()` (i host), zapisuje Cloud Function při změně `attendance` / `events` / `matches` (klient by počty mohl podvrhnout).
- `matchpub/{mid} = {nom: [pid], lineup: {slot: {pid, name, num}}, at}` – sestava zápasu bez statistik; pravidlo `allow read: if isTeam() || (isHost() && myPid() in resource.data.nom)`; host čte dotazem `where("nom", "array-contains", myPid)`. Zapisuje Cloud Function z `matches` (pole `nom` musí být vždy vyplněné – dnes `nomOf` bere náhradně sestavu).
- `attendance/{eid}_{pid}`: host zapisuje jen svůj dokument (jako hráčka) a čte jen ten (`resource.data.pid == myPid()`, dotaz `where("pid", "==", pid)`).
- `charges`: beze změny (vlastník už dnes). `settings/cash`: host potřebuje účet pro QR – čtení povolit, nebo účty oddělit do `settings/acc`.
- Bez přístupu: `players`, `staff`, `matches`, `opponents`, `debtors`, `attnote`, `settings/lineup`.
- Vyřazení z nominace → `matchpub` přestane obsahovat `pid` → host sestavu ztratí okamžitě (pravidla), notifikace přes N.

### Více týmů – doplněná možnost a doporučení
- **D) Jedna aplikace, jeden projekt Firebase, samostatná databáze Firestore pro každý tým** (pojmenované databáze). Oddělenost: samostatná databáze (dotaz nemůže sáhnout do jiného týmu; stejná pravidla nasazená do každé databáze – pravidla nemusí znát `teamId`). Přihlášení Google společné; adresář `users/{email} = {teams: [dbId]}` v hlavní databázi určí, kterou databázi aplikace otevře. Kód: malý–střední zásah (`initializeFirestore(app, …, dbId)` na jednom místě, výběr týmu, správa týmů); cesty kolekcí se nemění. Platí: ty (jeden účet Blaze); bezplatný limit Firestore platí jen pro jednu databázi v projektu, ostatní se účtují od prvního čtení (u týmu této velikosti haléře až jednotky Kč měsíčně – ověřit kalkulačkou). Limit 100 databází na projekt (lze žádat o navýšení). Odchod týmu = export a smazání jeho databáze. GDPR: ty = zpracovatel (smlouva o zpracování) – stejně jako u B. Cloud Functions: spouštěče se registrují pro každou databázi (nasazení skriptem).
- **E) Kombinace:** výchozí D, a tým, který chce úplnou nezávislost (vlastní projekt), dostane C – kód aplikace je pro D i C stejný (mění se jen zdroj konfigurace).
- Možnost A (kopie) je pro prodej nejhorší (údržba více verzí, kupující zakládá projekt sám). B (cesty `teams/{id}`) je standardní, ale oddělenost stojí na každém řádku pravidel a vyžaduje přepis všech cest a pravidel. C nejlépe odděluje, ale založení týmu (projekt, Blaze, pravidla, funkce) je pro kupujícího těžké.
- **Doporučení: D** (případně E). Co musí připravit D1: inicializace Firestore na jednom místě (`storage.js`), `config/team.js` / `settings/team` (název, barvy, `DEV_EMAILS` → `settings/sys`), `can()`, žádné pevné „HC Střely“ a „Hokej – zápasy“ (`index.html`, `manifest.webmanifest`, `report.js` …), záloha včetně `members`, `firebase.json` s výčtem databází. `col()` (D15) při volbě D není nutné – odložit (otázka 33).

### „Aplikace vždy funkční“ – co doplnit
- **Brána verze** (D2): `settings/app.minVer`; starší klient nezapisuje a nabídne načtení nové verze. Bez ní nejsou bezpečné ani převody dat, ani návrat ke starší verzi.
- **Nová pole zapisovat přes `merge`** (ne `set` celého dokumentu), aby je starší klient nesmazal; u pravidel případně zakázat odebrání klíčů (`request.resource.data.keys().hasAll(resource.data.keys())`).
- **Testovací prostředí:** druhý projekt Firebase (nebo druhá databáze) pro test pravidel a převodů před produkcí; testy pravidel v emulátoru (`@firebase/rules-unit-testing`) pro každou roli.
- **Úplná záloha před převodem:** dnešní záloha nemá `members` a u člena bez práv pokladny tiše vynechá pokladnu → doplnit `members`, `debtors`, varování „neúplná záloha“; pro převody spravovaný export Firestore (vyžaduje Blaze) nebo export trenérem s kontrolou počtů.
- **Návrat k předchozí verzi:** kromě zipu kódu i předchozí `firestore.rules` (konzole Firebase drží historii pravidel – postup do README); pravidla vždy ve dvou krocích: rozšířit (staré i nové) → převést data → zúžit o verzi později.
- **Převody idempotentní** (lze spustit znovu), s náhledem „co se změní“ a počty před / po; po převodu kontrolní přepočet (dlužníci, docházka, statistiky = stejná čísla).
- **Hlídání chyb:** zápisy dnes končí jen hláškou (`say`) – zvážit tichý záznam chyb zápisu do `errlog` pro vývojáře (rozhodnout – otázka 38).

### Mrtvý kód nad rámec D1–D20 (body D21–D30)
21. `asciiMsg` v `domain/cash.js` – nikde nepoužitá. Smazat.
22. `trOf` v `core/selectors.js` – nikde nepoužitá. Smazat (pozor: R2 / HG ji mohou chtít – pak použít).
23. CSS `.nx-strip` v `styles/main.css` – nikde nepoužitá třída. Smazat.
24. `firestore.rules` `match /coach/{doc=**}` – kolekce `coach` se v kódu nepoužívá. Smazat, pokud se nepočítá s hodnocením hráček v modulu Trénink (otázka 37).
25. Poznámka o `payments` v `firestore.rules` a v `storage.js` (obnova) – po smazání kolekce v konzoli odstranit (navazuje na D10).
26. Exporty používané jen uvnitř vlastního souboru (např. `oppDetail`, `teamDrag`, `lvDrag`, `nudgeT`, `chargeId`, `SPRE`, `RECENT_DAYS`, `dayStr`, `chAfter`, `debtorDoc`, `MIN_SHIFT` …) – neškodí; zrušit `export` jen tam, kde je nebudou potřebovat testy T1.
27. `debug.js` – dovysvětlit / rozšířit (viz D20); dnes neodpovídá popisu „používají ho testy“.
28. Historie verzí v komentářích – 168 zmínek „v1x.y“ ve zdrojích (nejvíc `live.js` 30×, `storage.js` 11×) a v hlavičce `sw.js` (navazuje na D17).
29. ✅ **hotovo ve v18.8 (K):** `plan-zivy-zapis-v18.md` v kořeni repozitáře a kopie v dokumentu projektu – po D18 jen `docs/` (a dokument projektu jako kopie).
30. `package.json` název `hokej-zapasy` a popis, `index.html` / `manifest.webmanifest` „Hokej – zápasy“ vs. HockeyCoach – sjednotit při D16 (pozor: `app: "hokej-zapasy"` je kontrola formátu zálohy v `importData` – ponechat nebo přijímat obojí).
Ověřeno: navržené mazání D9–D12 a D21–D30 nerozbije plánované fáze – `legacyEx` žádná fáze nepotřebuje (po kontrole `ex`), `payments` žádná fáze nepoužívá, `debug.js` a `qrcode.js` zůstávají; jediná podmínka je D24 (`coach`) a D12 (mění UI).

### Otevřené otázky z kontroly (31–40)
31. Souhlas s novým pořadím (T1 před D1, rozhodnutí M před S / O / N, nová fáze S, P2 rozdělená na P2a a bod 8 v O)?
32. Fáze S: dělat hned po úklidu (doporučeno – zdravotní důvody a platy), nebo až s O?
33. Více týmů: souhlas s doporučenou možností D (samostatná databáze pro tým v jednom projektu), případně E? Pak se D15 (`col()`) odkládá.
34. D12 „obnovit formace“: zrušit (mění UI), nebo ponechat?
35. 4 oči v nových rolích: navrhuje jen Hlavní trenér, potvrzuje jiný správce pokladny (pokladník / zástupce)? Smí zástupce navrhovat?
36. Brána verze: souhlas s `settings/app.minVer` (každá verze, která mění data, zvýší minimum)?
37. Kolekce `coach` (hodnocení hráček jen pro trenéry): počítat s ní v modulu Trénink, nebo pravidlo smazat?
38. Záznam chyb zápisu (`errlog`) pro vývojáře: ano / ne?
39. Testovací prostředí: založit druhý projekt Firebase (`hockeycoach-test`) pro T1 a převody? Kdo ho založí (Google účet vývojáře)?
40. Poslech dat: omezit na aktuální sezónu (starší na vyžádání) – už v D, nebo až před M?

## E – později: Modul Trénink (zatím neřešit)
Podrobný modul: plán tréninku, docházka, rozdělení tréninku (stanoviště, pětky, cvičení), dlouhodobý plán, statistiky pokroku hráček. Začne se až po dokončení v18.x. Příprava: docházka v C1 jako čistá doménová funkce (`attendance.js`), aby ji Trénink převzal.

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