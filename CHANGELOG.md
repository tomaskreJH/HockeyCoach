# Changelog – HockeyCoach

Historie verzí aplikace, nejnovější nahoře. Formát podle zvyklosti „Keep a Changelog“: u každé verze datum, krátké shrnutí a seznam dotčených souborů.
Číslování: hlavní verze (v18) = větší celek podle plánu, druhé číslo (v18.2) = fáze plánu, třetí číslo (v18.1.1) = oprava bez nových funkcí.
Číslo verze je v `src/data/storage.js` (`VERSION`), v `package.json` a v názvu cache v `sw.js` (`hokej-vNN`) – mění se vždy všechna tři.

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
