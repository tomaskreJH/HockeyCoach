# Changelog – HockeyCoach

Nejnovější nahoře, od v21.0. Starší záznamy: `docs/archiv/CHANGELOG-do-v20.md`. Postup vydání: `docs/KONVENCE.md`, kap. 4.

## v22.15 (27. 10. 2026) – 🎽 Dresy místo pětek na tréninku, kratší detail, 📋 K2-3 plán tréninku
> **Nasazení – kanál 🧪 BETA:** zapsáno přímo do větve **`beta`** (commit „v22.15“; nic se nemaže ani nepřesouvá). 1) **firestore.rules beze změny** (nepublikovat). 2) Actions: běh na `beta` zelený → v betě Načíst novou verzi (cache `hokej-beta-v112`). 3) **🔒 Vyžadovat verzi: ne.** 4) Test: `docs/testy-rucni.md` kap. 19. Vydání do stabilní se sérií v22.12 – v22.15 (PR `beta → main`). Návrat: revert commitu v22.15.

**Změněno**
- **🏠 Domů** (`views/home-view.js`): 🆚 Příští zápas opět nahoře, pod ním **📅 Tréninky – příštích 7 dní** bez zápasů (karty s ✅ ❌ ❓ zůstávají).
- **🎽 Dresy na tréninku** (`domain/event-helpers.js` – `DRESS_NAMES`, `dressName`; `domain/training-plan.js` – `grpLabel`, `BY`; `domain/guests.js`; `views/line-split-view.js`, `trplan-view.js`, `trplan-edit.js`, `trlive-view.js`, `event-detail.js`): skupiny tréninku = **Modrá, Žlutá, Zelená, Růžová** místo „1.–4. pětka“ (krátký štítek M / Ž / Z / R), „Rozdělení do pětek“ → **Rozdělení do dresů**, volba skupin bloku 🎽 Dresy. Data beze změny (`lines` = číslo 1–4), zápas dál používá pětky.
- **Detail události** (`views/event-detail.js`): hlavička jen název a datum (+ poznámka, u hráčky její odpověď); pod ní 📋 plán tréninku, pak **🎽 Rozdělení do dresů zkráceně** („Modrá: Hanča, Bětka, 🎓 Petr“, u trenéra „Bez dresu“); úprava dresů až po **✏️ Upravit dresy** (✓ Hotovo zavře). Místo, čas a sraz, termín a počty jsou ve sbaleném **ℹ️ Podrobnosti** (jsou i na kartě).
- **📋 Plán tréninku (K2, krok 3)**: v úpravě plánu jsou bloky **sbalené** – záhlaví ▸ s časem od – do, délkou, režimem, cvičeními a skupinami; klepnutí rozbalí, nový blok se rozbalí sám, ▾ Rozbalit vše / ▸ Sbalit vše (`views/trplan-edit.js`). **⧉ Jako minule** v ✨ Připravit trénink bere poslední plán **stejného dne v týdnu**, jinak poslední (`views/trplan-reuse.js`).
- ⚙️ Členové týmu: role „Asistent (zápasy, události)“ místo „(dříve Kustod)“ (`data/cfg-api.js`); nápověda bez zmínek o kustodovi.
- ❓ Nápověda: Domů, detail události, 🎽 dresy, plán tréninku (sbalené bloky, Jako minule), rychlá reference.
- Testy: `dressName` / `grpLabel`, upravené texty v `guests`, `training-plan`; kouřový test rozbalí sbalený blok.

**Beze změny:** pravidla databáze, struktura dat, zápis odpovědí, živý zápis a pětky zápasu, pokladna, statistiky. Viditelnost dresů pro hráčky až po potvrzení trenérem – čeká na rozhodnutí (nové pole události).

**Ověřeno:** `npm test` 443 / 443. `npm run smoke` – 8 rolí bez chyb.

## v22.14 (27. 10. 2026) – 🏠 Přihlášení přímo z Domů, jednotná karta události, ❓ nápověda podle role
> **Nasazení – kanál 🧪 BETA:** zapsáno přímo do větve **`beta`** (commit „v22.14“; nic se nemaže ani nepřesouvá). 1) **firestore.rules beze změny** (nepublikovat). 2) Actions: běh na `beta` zelený → v betě Načíst novou verzi (cache `hokej-beta-v111`). 3) **🔒 Vyžadovat verzi: ne.** 4) Test: `docs/testy-rucni.md` kap. 18. Vydání do stabilní se sérií v22.12 – v22.14 (PR `beta → main`). Návrat: požádat Clauda o revert commitu v22.14.

**Změněno**
- **Karta události** (`views/event-core.js` – `cardHtml`, `placeLine`, `timeLine`; `views/events.js` ji používá): pořadí 1) ikona, název a datum, 2) 📍 místo (u zápasu doma / venku, u správce pokladny 💰 náklady), 3) **🕔 čas a ⏰ sraz větším písmem**, 4) termín přihlášení, 5) útočnice / obránkyně / brankářky / trenéři, pak řádek stavu a rychlá tlačítka. Jedna funkce pro Události i 🏠 Domů.
- **Detail události** (`views/event-detail.js`): hlavička ve stejném pořadí – název a datum, 📍 místo, 🕔 čas a sraz (větší), termín přihlášení, počty a útočnice…
- **🏠 Domů** (`views/home-view.js`): 📅 Příštích 7 dní ukazuje **stejné karty jako Události s tlačítky ✅ Jdu / ❌ Nejdu / ❓ Nejsem jistý** – přihlášení bez otevírání události (❌ / ❓ otevře okno s důvodem, blokace dluhem a uzávěrka platí stejně). Klepnutí na kartu otevře detail (← Domů). 🆚 Příští zápas se ukáže zvlášť jen za hranicí 7 dní. Řádek „✅ N hráček · 🥅 N brankářek“ z v22.13 nahradil řádek útočnic / obránkyň / brankářek / trenérů z karty.
- **💳 Moje platby v Domů** jsou **první blok a jen při dluhu** (💳 k úhradě – nový předpis, ⛔ po splatnosti); vše zaplaceno = karta se neukazuje.
- **❓ Nápověda podle role** (`views/help.js` – `VIS`, `seen`, `prune`): kapitoly a body jen pro moduly, které účet vidí (hráčka 9 kapitol místo 15, bez živého zápisu, pokladny, plánu tréninku…); v 👁 Náhledu role podle náhledu. Čísla kapitol podle zobrazených. Texty aktualizovány: Domů (pořadí, přihlášení z karet, platby jen při dluhu), karta a detail události, nový bod pro hráčku (rozdělení do pětek a plán jen ke čtení), ⚙️ sekce podle rolí, okno čtení hráčky 8 / 15 dní, rychlá reference.
- Kouřový test: krok 🏠 Domů → ✅ a ❌ s důvodem přímo z karty (`tests/smoke/smoke-role.mjs`).

**Beze změny:** pravidla databáze, struktura dat, zápis odpovědí (`answer`), ❔ Chybí odpověď, 🏖 nepřítomnost, živý zápis, trénink, pokladna, statistiky. Funkce `goingSplit` zůstává v `domain/home-summary.js` (test).

**Ověřeno:** `npm test` 442 / 442. `npm run smoke` – 8 rolí bez chyb (hráčka: 💳 Moje platby nahoře, ✅ a ❌ s důvodem z Domů, nápověda 9 kapitol; trenér 14 kapitol).

## v22.13 (27. 10. 2026) – 📋 Docházka bez posouvání, 🏠 počty hráček a brankářek, 📉 kratší okno událostí hráčky
> **Nasazení – kanál 🧪 BETA:** zapsáno přímo do větve **`beta`** (commit „v22.13“; nic se nemaže ani nepřesouvá). 1) **firestore.rules beze změny** (nepublikovat). 2) Actions: běh na `beta` zelený → v betě Načíst novou verzi (cache `hokej-beta-v110`). 3) **🔒 Vyžadovat verzi: ne.** 4) Test: `docs/testy-rucni.md` kap. 17. Vydání do stabilní s celou sérií v22.12 – v22.13 (PR `beta → main`). Návrat: požádat Clauda o revert commitu v22.13.

**Změněno**
- **👥 Docházka v detailu události** (`views/event-detail.js`, `views/att-log-view.js`): pod jménem se už neukazuje řádek 🕘 čas a ✍ kdo zapsal – při zápisu odpovědi za hráčku se seznam neposouvá. Kdo zapisoval je jen v okně **🕘 Historie přihlášek** (tlačítko pod docházkou). Historie se navíc čte až po klepnutí na tlačítko (dřív při každém rozbalení docházky) – 📉 méně čtení.
- **🏠 Domů** (`domain/home-summary.js` – `goingSplit`, `views/home-view.js`): u každé události v 📅 Příštích 7 dnech a u 🆚 Příštího zápasu řádek **✅ N hráček · 🥅 N brankářek** (přihlášené „Jdu“ ze soupisky, realizační tým se nepočítá). Počítá se z docházky v paměti – žádné čtení navíc. Hostující počty nevidí.
- **📉 Okno událostí hráčky** (`domain/data-window.js` – `winTo`, `AHEAD_DAYS`, `WIN_DAYS.other` 14 → 8; `data/storage.js` – horní mez poslechu, `farListen`, `farInfo`): hráčka a hostující živě poslouchají události a docházku jen **8 dní zpět a 15 dní dopředu**. Vzdálenější budoucnost načte tlačítko **⬇ Načíst další události (od …)** v Nadcházejících (i v Kalendáři u vzdálených měsíců) – druhý živý poslech do zavření aplikace, vlastní odpověď i změny trenéra se hned projeví. Minulé ukazují 8 dní, **⬇ Starší události (N)** ukáže zbytek z paměti zařízení bez čtení. Realizační tým beze změny (45 dní zpět, celá budoucnost).
- ⚙️ → 💾 Data → 📉: okno ukazuje i konec („do …“) a počet načtené další budoucnosti; odhad pro hráčku počítá s novým oknem.
- ❓ Nápověda (Domů, Události, Historie přihlášek).

**Beze změny:** pravidla databáze, struktura dat, zápis odpovědí a historie přihlášek, okno realizačního týmu, živý zápis, trénink, pokladna, statistiky.

**Ověřeno:** `npm test` 442 / 442 (nové: `winTo`, `countFrom` s koncem, `goingSplit`). `npm run smoke` – 8 rolí bez chyb (hráčka: vzdálený trénink až po ⬇ Načíst další, ⬇ Starší události; Domů „✅ 1 hráčka · 🥅 0 brankářek“).

## v22.12 (27. 10. 2026) – 🏠 K2, krok 2: ❔ Chybí odpověď a 📲 připomenutí
> **Nasazení – kanál 🧪 BETA:** 1) Nahrát soubory ze zipu do větve **`beta`** (nové `src/domain/home-remind.js`, `tests/home-remind.test.js`; nic se nemaže ani nepřesouvá). 2) **firestore.rules beze změny** (nepublikovat). 3) Actions: běh na `beta` zelený → v betě Načíst novou verzi (cache `hokej-beta-v109`). 4) **🔒 Vyžadovat verzi: ne.** 5) Test: `docs/testy-rucni.md` kap. 16. Vydání do stabilní později s celou sérií (PR `beta → main`).

**Přidáno**
- **❔ Chybí odpověď** v 🏠 Domů (`src/domain/home-remind.js` – `nearestOpen`, `missingAnswers`; `views/home-view.js` – `missHtml`): manager, trenér a asistent vidí nahoře pruh s počtem aktivních hráček bez odpovědi u nejbližší události s otevřeným přihlašováním (stejný počet jako „bez odpovědi“ v detailu). Klepnutí rozbalí jména; **Otevřít událost →** vede do detailu (← Domů zpět).
- **📲 Připomenout** (`reminderText`, `shareText`): sdílení telefonu (WhatsApp, SMS …) s textem – událost, den, čas, sraz, místo, termín přihlášení, jména a odkaz na stabilní verzi aplikace. Bez sdílení se text zkopíruje do schránky, jinak se ukáže k ručnímu zkopírování. Žádný server, žádné čtení ani zápis databáze.
- ❓ Nápověda kap. 🏠 Domů. Testy: `tests/home-remind.test.js` (4); kouřový test – rozbalení a připomínka (manager, trenér, asistent).

**Změněno**
- `.github/workflows/pages.yml`: `actions/checkout@v5` (upozornění na Node.js 20).
- `docs/KONVENCE.md` – mapa souborů (`home-remind.js`).

**Beze změny:** pravidla databáze, zápis odpovědí, ostatní karty Domů, 🧪 beta kanál, živý zápis, pokladna, statistiky.

**Ověřeno:** `npm test` 439 / 439. `npm run smoke` – 8 rolí bez chyb (trenér: ❔ Chybí odpověď: 8 u zápasu Sokol, text připomínky s jmény a odkazem). `npm run smoke -- --beta` bez chyb.

## v22.11 (27. 10. 2026) – 🧪 Beta kanál: testování před vydáním pro všechny
> **Nasazení (tato verze jde přímo do `main`):** 1) Zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** (nový blok `settings/beta`, ostatní beze změny). 3) Nahrát soubory ze zipu do `main` (nové: `.github/workflows/pages.yml`, `src/core/channel.js`, `src/domain/beta.js`, `src/views/beta-view.js`, `tests/beta.test.js`; nic se nemaže ani nepřesouvá). 4) **Jednorázově v GitHubu** podle README, kap. „Kanály“: Pages → Source **GitHub Actions**, vytvořit větev **`beta`** z `main`, v Environments → github-pages povolit větev `beta`, Actions → Run workflow. 5) Načíst novou verzi (cache `hokej-v108`, beta `hokej-beta-v108`). 6) ⚙️ → 🧪 Beta testování → zaškrtnout testery. 7) **🔒 Vyžadovat verzi: ne** (nechat 22.9). 8) Test: `docs/testy-rucni.md` kap. 15.
> **Od v22.12 se nové verze nahrávají do větve `beta`**; vydání pro všechny = Pull request `beta → main` → Merge.

**Přidáno**
- **🧪 Kanály stabilní a beta** (`src/core/channel.js`): stejný kód na dvou adresách – kořen webu (větev `main`) a složka `beta/` (větev `beta`); kanál se pozná podle adresy, vydání bety do stabilní nic nepřepisuje.
- **Nasazení z obou větví** (`.github/workflows/pages.yml`): po nahrání do `main` nebo `beta` GitHub Actions postaví web (main do kořene, beta do `beta/`, bez testů a `.github`); beta dostane vlastní název ikony „HockeyCoach β“ a barvu (manifest), takže jde nainstalovat jako druhá aplikace.
- **Beta testeři** (`src/domain/beta.js`, dokument `settings/beta` = {testers, by, at}): ⚙️ → **🧪 Beta testování** (manager nebo vývojář) – seznam členů týmu se zaškrtnutím, změna se hned uloží. Vývojář je tester vždy, manager smí do bety vždy. Hostující testerem být nemůže (nečte nastavení týmu).
- **Pruh v liště** (`src/views/beta-view.js`, `views/shell.js`): v betě fialový pruh **🧪 Beta vX – testovací verze · Stabilní verze**; ve stabilní verzi testerovi **🧪 Nová beta vX k vyzkoušení · Vyzkoušet · ✕** (jen když je beta novější; ✕ skryje nabídku této bety v zařízení). Číslo bety se zjistí načtením `beta/src/core/app-version.js` z webu – jednou za spuštění, jen u testera, **bez čtení databáze**.
- **Zamčená beta:** účet, který není tester ani manager, vidí v betě jen „🧪 Beta je jen pro testery“ s tlačítkem Přejít na stabilní verzi.
- ⚙️ → 👤 Účet: kanál a přepnutí (🧪 Otevřít betu / ← Stabilní verze); verze v záhlaví bety se štítkem „🧪 beta“, okno „HockeyCoach β“.
- `npm run smoke -- --beta` – kouřový test z adresy bety. Testy: `tests/beta.test.js` (12). ❓ Nápověda kap. ⚙️.

**Změněno**
- `sw.js`: kanál podle vlastní adresy, cache `hokej-vNN` (stabilní) / `hokej-beta-vNN` (beta), maže jen staré cache svého kanálu, stabilní worker neobsluhuje adresy bety, oznámení ⏱ živého tréninku jen oknům svého kanálu; offline kopie jen z cache svého kanálu.
- **Načíst novou verzi** (`data/storage.js` – `refresh`): odregistruje workera a smaže cache jen svého kanálu (stabilní a beta se navzájem nemažou).
- **🔒 Vyžadovat verzi** se v betě nenastavuje (`data/cfg-api.js`, `views/settings-view.js` – poznámka místo tlačítka): vyšší číslo bety by zablokovalo zápis stabilní verzi.
- Záloha: `settings/beta` se neobnovuje ani nemaže (`data/backup.js`).
- `firestore.rules`: `settings/beta` zapisuje manager nebo účet vývojáře (`isDevAcct`, stejný e-mail jako `DEV_EMAILS`), jen pole testers (nejvýš 50) / by / at, nejde smazat; čtení jako ostatní nastavení (členové týmu).
- README (kap. Kanály, Nasazení), `docs/KONVENCE.md` (kap. 4 a 6 – kanál u každé verze), testy `project`, `event-time` (text pravidel).

**Beze změny:** živý zápis, časomíra, střely a góly, pokladna, statistiky, docházka, tvar ostatních dokumentů, oprávnění rolí. Stabilní verze bez bety funguje jako dosud.

**Ověřeno:** `npm test` 435 / 435. `npm run smoke` – 8 rolí bez chyb (manager: ⚙️ → 🧪 Beta testování se 7 členy). `npm run smoke -- --beta` – 8 rolí bez chyb (manager v betě s fialovým pruhem a poznámkou místo 🔒; hráčka, trenér a další bez testerství vidí zamčenou betu).

## v22.10 (27. 10. 2026) – 🖐 K2, krok 1: rychlejší události a docházka
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat). 3) Nahrát soubory ze zipu (nové `src/domain/event-prefill.js`, `tests/event-prefill.test.js`; nic se nemaže ani nepřesouvá). 4) Načíst novou verzi (cache `hokej-v107`). 5) **🔒 Vyžadovat verzi: ne** (žádná nová data, paměť jen v zařízení; nechat 22.9). 6) Test: `docs/testy-rucni.md` kap. 14.

**Přidáno**
- **↺ Předvyplnění nového tréninku** (`src/domain/event-prefill.js` – `trainingPrefill`, `views/event-form.js` – `newTraining`): název, čas od – do (ručně zadaný konec, jinak automatika), ⏰ sraz a místo z posledního nezrušeného tréninku – přednostně stejného dne v týdnu. Změna data předvyplní znovu, dokud uživatel pole ručně nezmění. Ve formuláři řádek „↺ … podle posledního tréninku“.
- **↺ Předvyplnění nového zápasu** (`matchPrefill`, `views/modal.js`): čas a místo z posledního zápasu stejného druhu (doma / venku); přepnutí Doma / Venku předvyplní znovu, dokud se čas a místo ručně nezmění.
- **Omluva jedním klepnutím** (`views/event-core.js`): v okně ❌ / ❓ klepnutí na důvod rovnou uloží odpověď; „Jiné“ otevře psaní vlastního důvodu. Naposledy použité vlastní důvody (nejvýš 4, `pushReason` / `reasonChips`) se nabízejí nahoře – paměť zařízení (`localStorage hk-reasons`), žádné čtení databáze.
- **🔁 Série:** šablona pokladny předvyplní naposledy použitou (`localStorage hk-ser-tpl`, jen když v nastavení pokladny pořád existuje).
- ❓ Nápověda kap. Události. Testy: `tests/event-prefill.test.js` (5); kouřový test – okno ❌ s rychlými důvody a nový zápas.

**Změněno**
- `views/events.js` – „+ Trénink“ volá `newTraining` (nepoužité importy `defDl`, `defs` odebrány).

**Beze změny:** pravidla databáze, tvar dokumentů, zápis odpovědi a důvodu (`setAt` – attendance + attnote v jedné dávce, 🕘 historie), blokace dluhem, úprava existující události, živý zápis, pokladna, statistiky.

**Ověřeno:** `npm test` 423 / 423. `npm run smoke` – 8 rolí bez chyb (manager: formulář tréninku 17:00 · Zimní stadion z posledního tréninku, nový zápas 18:00 · Zimní stadion z posledního domácího, okno ❌ s rychlými důvody a uložením klepnutím).

## v22.9 (27. 10. 2026) – 📉 úspora čtení, krok 2 (D2): události a docházka v okně
> **Nasazení:** 1) Zip současného repozitáře, ⚙️ → 💾 Data → Stáhnout zálohu. 2) **firestore.rules beze změny** (nepublikovat – docházka pole `d` povoluje už dnes). 3) Nahrát soubory ze zipu (nové `src/domain/data-window.js`, `tests/data-window.test.js`; nic se nemaže ani nepřesouvá). 4) Načíst novou verzi (cache `hokej-v106`) – **události** se hned poslouchají v okně. 5) Až budou zařízení aktualizovaná: **🔒 Vyžadovat verzi 22.9 (nutné pro úsporu u docházky)** – manager na zařízení s v22.9; tlačítko nejdřív doplní datum události do všech záznamů docházky (hláška „Datum události doplněno… N×“), pak nastaví minimum. Od dalšího spuštění se i docházka poslouchá v okně. 6) Test: `docs/testy-rucni.md` kap. 13, čísla z ⚙️ → 💾 Data → 📉 porovnat s v22.8 (969 / hráčka 542).

**Přidáno**
- **📉 Okno poslechu** (`src/domain/data-window.js`, `src/data/storage.js` – `listenWin`): **události a docházka se živě poslouchají jen od data okna** – realizační tým (manager, trenér, asistent) 45 dní zpět, hráčka 14 dní zpět, budoucí vždy. Starší dokumenty („archiv“) se berou **z paměti zařízení zdarma**; ze serveru se archiv načte celý jen jednou na zařízení, pak se sám ověřuje pás 60 dní před oknem (události denně, docházka týdně). V aplikaci jsou dál **všechna data** – seznamy, 📊 Docházka, statistiky, pokladna a ⚖️ Tarify počítají stejně jako dosud.
- Docházka nese **datum události `d`** – doplní ho datová vrstva při každém založení záznamu (i obnova ze zálohy a automatické omluvy); změna data události nebo zápasu se do její docházky propíše sama.
- **⚙️ → 💾 Data → 📉 Čtení databáze:** u oken „živě od …, starší N z paměti zařízení, ze serveru ověřeno …“, odhad pro hráčku z jejího okna, tlačítko **↻ Obnovit starší data ze serveru** (druhým klepnutím; načte celý archiv). ❓ Nápověda kap. ⚙️.
- `HK.cfg`: `readCountsPlayer`, `winInfo`, `archRefresh`; `readCost(counts, n, pc)` – odhad hráčky z počtů v jejím okně.
- Testy: `tests/data-window.test.js` (5), `tests/read-cost.test.js` (+1); kouřový test – trénink e9 mimo okno (archiv) s docházkou, docházka s `d`, brána verze 22.9.

**Změněno**
- `src/data/cfg-api.js` – 🔒 Vyžadovat verzi (od 22.9) nejdřív doplní / opraví `d` v docházce (idempotentní, po dávkách 400).
- `src/domain/guests.js` – `dayAdd` přesunut do `domain/data-window.js` (jediné místo; `views/event-badges.js` ho používá také).
- Zástupci Firebase v testech (`tests/support/firebase-stub.mjs`, `tests/smoke/smoke-fb.mjs`) – podmínky `where` s `>=` a `<`, `getDocsFromCache`, `getDocsFromServer`. `tests/privacy.test.js` – obnova docházky ze zálohy nově zapíše i `d`.
- `docs/KONVENCE.md` – okno poslechu, pole `d`, mapa souborů.

**Beze změny:** pravidla databáze, tvar ostatních dokumentů, výpočty pokladny, statistik a docházky, živý zápis, trénink. Poslech zápasů, soupisky, pokladny a důvodů omluv zatím celý (malé kolekce; další krok D3 v `docs/plan.md`).

**Upozornění:** změna staršího záznamu (mimo okno) z jiného zařízení se v ostatních zařízeních projeví při automatickém ověření (události do dne, docházka do týdne) nebo hned po ↻. Vlastní změny jsou vidět hned. Do 🔒 Vyžadovat verzi 22.9 se docházka poslouchá celá jako dosud.

**Ověřeno:** `npm test` 418 / 418. `npm run smoke` – 8 rolí bez chyb (Minulé s tréninkem z archivu u managera i hráčky, ⚙️ 📉 s okny „živě od 11. 9. 2026 (3), starší 1 z paměti zařízení“ u událostí a docházky).

## v22.8 (27. 10. 2026) – 📉 úspora čtení databáze, krok 1 (D1) + odhad čtení v ⚙️
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat – čte se jen podle stávajících práv). 3) Nahrát soubory ze zipu (nové `src/domain/read-cost.js`, `src/views/audit-feed.js`, `tests/read-cost.test.js`; nic se nemaže ani nepřesouvá). 4) Načíst novou verzi (cache `hokej-v105`). 5) **🔒 Vyžadovat verzi: ne** (žádná nová data; starší verze jen čtou víc). 6) Test: `docs/testy-rucni.md` kap. 12 – a **poslat čísla z ⚙️ → 💾 Data → 📉 Čtení databáze** (podklad pro krok D2).

**Přidáno**
- **⚙️ → 💾 Data → 📉 Čtení databáze** (manager, trenér, asistent): kolik dokumentů přečte jedno spuštění aplikace v tomto zařízení (po pauze delší než 30 min se poslouchané kolekce čtou celé), největší kolekce, odhad pro hráčku a kolik takových spuštění se vejde do denního limitu 50 000. Výpočet `src/domain/read-cost.js` (`readCost`, `collLabel`, `READ_LIMIT`), počty `HK.cfg.readCounts()` ze `src/data/storage.js`.
- `src/views/audit-feed.js` – `watchAudit(eid, redraw)`: poslech záznamů auditu jen jedné události (`eid ""` = změny účtů).
- Testy: `tests/read-cost.test.js` (3).

**Změněno (📉 méně čtení)**
- ⚠️ SAHÁ NA PLATBY (jen zobrazení, výpočty beze změny): **audit pokladny se už neposlouchá celý** (`src/main.js`). 💰 Pokladna u uzavřené události čte jen své záznamy (`src/views/payments.js`), 🏦 historie změn účtů se načte až při otevření nastavení pokladny (`src/views/cash-settings.js`). Záloha JSON audit načte celý až při stažení (`src/data/backup.js`, jen správce pokladny).
- **🏒 stav tréninku na kartách Událostí** (`src/views/event-badges.js`, `src/views/events.js`): místo celých kolekcí `trplan`, `trlive`, `treval` každých 5 min (i v Nadcházejících, kde se stav vůbec neukazuje) se čtou 3 dokumenty jen u **zobrazených** tréninků dnes a v minulosti, po 8 najednou. Stav tréninku staršího než 7 dní se pamatuje v zařízení natrvalo (localStorage `hk-trs-v1`), novější se obnoví po 10 min; otevření detailu události stav té události zapomene (po návratu se načte znovu).
- `src/core/state.js` – popis `au` a `trs`; `docs/KONVENCE.md` – pravidlo 📉 šetření čtení, mapa souborů.

**Beze změny:** zápis auditu (stejné dokumenty, stejná pravidla), pokladna a její výpočty, přihlašování, docházka, živý zápis, trénink, statistiky. Poslech ostatních kolekcí zatím beze změny (krok D2 čeká na rozhodnutí – `docs/plan.md`).

**Ověřeno:** `npm test` 412 / 412. `npm run smoke` – 8 rolí bez chyb (⚙️ s 📉 odhadem u realizačního týmu, seznam Událostí se stavem tréninků, pokladna u události).

## v22.7 (27. 10. 2026) – 🕘 historie přihlášek na události (kdy a kdo za koho)
> **Nasazení:** 1) Zip současného repozitáře, ⚙️ → 💾 Data → Stáhnout zálohu. 2) **Publikovat firestore.rules PŘED nahráním kódu** (nový blok `attlog`; ostatní pravidla beze změny). Kdyby pravidla publikovaná nebyla, přihlašování funguje dál, jen se nezapisuje historie a okno hlásí chybu načtení. 3) Nahrát soubory ze zipu (nové `src/domain/att-log.js`, `src/views/att-log-view.js`, `tests/att-log.test.js`; nic se nemaže ani nepřesouvá). 4) Načíst novou verzi (cache `hokej-v104`). 5) **🔒 Vyžadovat verzi: doporučeno 22.7**, až budou zařízení aktualizovaná (starší verze změny odpovědí do historie nezapisují; data se nepřevádějí). 6) Test: `docs/testy-rucni.md` kap. 11.

**Přidáno**
- **🕘 Historie přihlášek** (`src/views/att-log-view.js`, `src/domain/att-log.js`): každá změna odpovědi na událost se zapíše jako samostatný záznam `attlog/{id}` = `{eid, pid, st, by, bp, src, at}` – ✅ Jdu, ❌ Nejdu, ❓ Nejsem jistý, ↩ odpověď zrušena, 🚫 označeno / zrušeno; `by` = účet, který změnu zapsal, `bp` = jeho osoba (hráčka / člen týmu), `at` = čas serveru, `src` = 🏖 nepřítomnost, ✋ schválená žádost, automatická omluva. Záznam nejde změnit (jen přidat), mazat smí jen manager.
- **Detail události → 👥 Docházka** (manager, trenér, asistent): po rozbalení se historie události jednou načte (platí 5 min) a u každého řádku je 🕘 čas poslední změny, a když ji nezapsala hráčka / člen sám, **✍ zapsal(a) jméno**.
- **Tlačítko 🕘 Historie přihlášek** pod docházkou: okno se všemi změnami nejnovější nahoře, souhrn (změn, osob, za někoho, po termínu, po začátku), filtry **✍ Za někoho** a **⏰ Po termínu** (štítek „po začátku“ u změn po začátku události), pohled 🕒 Podle času / 👥 Podle osob, ↻ Obnovit; zavře i systémové Zpět. Odpovědi z doby před v22.7 jsou dole jako „(poslední změna)“ s časem a účtem z dokumentu docházky.
- `src/data/storage.js` – `collection(c).getWhere(pole, hodnota)`: jednorázové čtení dokumentů s rovností.
- Testy: `tests/att-log.test.js` (9); kouřový test – rozbalená docházka a okno historie s filtrem a pohledem podle osob (data: `attlog`, časy odpovědí).

**Změněno**
- Zápis historie je **tichý a mimo dávku odpovědi** (`HK.syncOps`) – chyba pravidel nebo sítě nikdy nezablokuje přihlášení. Zapisují: `views/event-core.js` (odpověď, zrušení, 🚫), `views/absence-view.js` (omluvy a jejich vrácení z 🏖; vrácená a hned znovu zapsaná omluva se nezaznamená dvakrát), `views/att-request-view.js` (✋ schválená žádost), `views/auto-sync.js` (automatická omluva, až po úspěšném zápisu).
- `src/views/event-detail.js` – řádky docházky s 🕘, tlačítko a okno historie; `src/core/nav.js` – okno v systémovém Zpět; `src/core/state.js` – `alg`, `alo`.
- `firestore.rules` – blok `attlog` (čte `isStaff`, zakládá `isStaff` za kohokoli nebo hráčka / hostující jen za sebe, `by == mail()`, `at == request.time`, `bp` z vlastního členství, bez úprav; mazat `isMgr`).
- ❓ Nápověda kap. Události: 🕘 Historie přihlášek. `docs/KONVENCE.md` – mapa souborů a kolekce `attlog`.

**Beze změny:** dokumenty `attendance` a `attnote` (tvar, pravidla, důvody omluv – v historii se důvody nezobrazují), přihlašování a blokace dluhem, 🚫, 📊 Docházka, pokladna, živý zápis, trénink, statistiky.

**Upozornění (rozhodnutí do budoucna):** historie se zapisuje od v22.7 (zpětně ji dopočítat nejde – starší odpovědi mají jen poslední změnu). Není součástí zálohy JSON a při 🧨 úplném smazání události, smazání zápasu nebo člena zůstává (jen přestane být vidět). Hráčky ani pokladník bez trenérské role historii nevidí.

**Ověřeno:** `npm test` 409 / 409. `npm run smoke` – 8 rolí bez chyb (manager, trenéři, asistenti: rozbalená docházka s 🕘 a ✍, okno historie, filtr ✍ Za někoho, 👥 Podle osob; hráčka, hostující a pokladník bez historie).

## v22.6 (27. 10. 2026) – E5 📈 přehled a analýza Tréninku (Statistiky → 🏒 Trénink)
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat – čte se jen `trplan`, `trms`, `treval` podle stávajících práv). 3) Nahrát soubory ze zipu (nové `src/domain/training-stats.js`, `src/views/train-stats.js`, `tests/training-stats.test.js`; nic se nemaže ani nepřesouvá). 4) Načíst novou verzi (cache `hokej-v103`). 5) **🔒 Vyžadovat verzi: ne** (žádná nová data, jen čtení). 6) Test: `docs/testy-rucni.md` kap. 10.

**Přidáno**
- **Statistiky → přepínač 📊 Zápasy / 🏒 Trénink** (`src/views/train-stats.js`; jen kdo čte plán tréninku – hostující beze změny). Období 30 / 60 / 90 / **180** dní, výchozí 60. Dokumenty `trplan`, `trms` a (realizační tým) `treval` se čtou jednorázově po jednom na trénink v období, platí 5 min (`S.tst`).
- **⏲ Výsledky měření** (vidí celý tým): výběr cvičení, nejlepší výsledek s datem, poslední, ▲ / ▼ zlepšení proti minulému tréninku, pořadí týmu (řadí se klepnutím), vlastní řádek hráčky zvýrazněný; ⬇️ CSV všech měření. Stejné cvičení na více linkách jednoho tréninku se sloučí (nejlepší pokus).
- **👤 Karta hráčky**: tréninky (s účastí ✅ bez 🚫, s plánem), minuty na ledě podle plánu po dovednostech, výsledky měření s grafem vývoje. **⭐ Hodnocení trenérů** (počty, průměr, poslední položky s poznámkou) jen s právem číst hodnocení – **hráčka nikdy** (nenačítá ho). Hráčka vidí jen svou kartu „Můj trénink“ s minutami po cvičeních (banku cvičení nečte).
- **🌡 Tým × dovednosti** (trenér, asistent): minuty po dovednostech za období, tmavší = víc; **🔍 Kdo netrénoval** vybranou dovednost (výchozí ta s nejvíc chybějícími), hráčky bez tréninku v období; ⬇️ CSV.
- `src/domain/training-stats.js`: `statWindow`, `measExercises`, `measTable`, `playerMeas`, `improve`, `playerLoad`, `loadSkills`, `drillList`, `missSkill`, `playerEvals`, `loadRows`, `measRows`.
- Testy: `tests/training-stats.test.js` (9); kouřový test – Statistiky → 🏒 Trénink, 30 dní, výběr hráčky u všech rolí (data: měření tréninku e0).

**Změněno**
- `src/domain/skill-coverage.js` – nové `groupDrills` (minuty skupiny po cvičeních bez banky); `groupSkills` z něj počítá stejně jako dosud.
- `src/views/shell.js` – záložka Statistiky přes `statsView`; `src/core/state.js` – `stv`, `tst`, `tsx`, `tsp`, `tsk`.
- ❓ Nápověda kap. 10: přepínač a 🏒 Trénink. `docs/KONVENCE.md` – mapa souborů.

**Beze změny:** statistiky zápasů (`stats.js`, výstup shodný – hlídá `d1-baseline`), 📊 pokrytí dovedností v plánu, měření a hodnocení v tréninku, pravidla databáze, pokladna, živý zápis.

**Ověřeno:** `npm test` 400 / 400. `npm run smoke` – 8 rolí bez chyb (Statistiky → 🏒 Trénink u všech rolí kromě hostující; hráčka bez hodnocení a bez Tým × dovednosti).

## v22.5 (27. 10. 2026) – pokladna: 🔁 převody mezi účty, datum platby, 🧾 Náklady, číslo účtu v QR
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat – kolekce `cash` nová pole přijme). 3) Nahrát soubory ze zipu (nové `src/domain/cost-check.js`, `src/views/cost-view.js`, `tests/cost-check.test.js`; nic se nemaže). 4) Načíst novou verzi (cache `hokej-v102`). 5) **🔒 Vyžadovat verzi: ne** (nepovinné – starší verze převody jen nezobrazí a zůstatky účtů ukáže bez nich; doporučeno nastavit 22.5, až budou aktualizovaná zařízení správců pokladny). 6) Test: `docs/testy-rucni.md` kap. 9.

⚠️ SAHÁ NA PLATBY (`domain/cash.js` – `sumCash` s převody a nové funkce, `views/cashbook.js`, `views/payments.js`, `views/finance.js`, `views/bank-pair.js`, `views/money.js`, `views/mine.js`, `views/qr-image.js`, nové `domain/cost-check.js`, `views/cost-view.js`; výpočet předpisů, vyúčtování a obsah QR kódu beze změny).

**Přidáno**
- **🔁 Převod mezi vlastními účty** (Team → 🏦 Pokladna, jen při dvou účtech): pohyb `cash {k: "tr", from, to, amt, d, note}`. Do příjmů, výdajů, kategorií ani hospodaření měsíce se nepočítá, mění jen zůstatky účtů (karta Účty ukáže převody +/−). V seznamu 🔁 s filtrem Převody, 🗑 storno, v CSV pohybů typ „Převod“ s účtem „z → na“. `domain/cash.js`: `TR`, `trFrom`, `trTo`, `trCheck`.
- **Datum platby** u všech zápisů úhrad: okno 💳 Úhrada, nové okno ✅ Zaplatila vše (místo potvrzení druhým klepnutím, se seznamem předpisů a součtem – `openPayAll`), ☑ Ruční výběr v Hromadně, 💸 výplata platů (📅 Měsíce). Z výpisu se datum bere z banky jako dosud.
- **Team → 🧾 Náklady** (`src/views/cost-view.js`, `src/domain/cost-check.js`): po měsících sezóny očekávané náklady událostí (uzavřená = uložené náklady, jinak nastavení / šablona) po kategorii a příjemci proti výdajům stejné kategorie – nezávisle na účtu. Stav ⏳ čeká na platbu / ✅ zaplaceno / ➕ zaplaceno víc / ❔ výdaj bez události; rozbalení s událostmi a výdaji; **➖ Zapsat platbu** předvyplní výdaj v 🏦 Pokladna (kategorie, příjemce, měsíc, zbývající částka); 🗓 i budoucí měsíce, ⬇️ CSV.
- **Výdaj: Komu a Za měsíc** – nová nepovinná pole `payee` (s nabídkou známých příjemců) a `pym` „RRRR-MM“ (led účtovaný zpětně za minulý měsíc). `domain/cash.js`: `forYm`.
- **Číslo účtu v QR**: řádek „Účet: …“ hned pod názvem platby v uloženém obrázku, příjemce i s číslem účtu (`accLabel`), číslo účtu v názvu souboru (`QR-platba-RRRR-MM-DD-VS-ucet-cislo-banka.png`); název účtu s číslem i v okně QR, u předpisů v Moje platby a na kartě Účty.
- **🏦 Výpis z banky**: nespárovaná příchozí platba jde zapsat **➕ Příjem** (kategorie Jiné příjmy, datum a značka z výpisu – podruhé se nenabídne); přeplatek vybraného páru se při ✅ Zapsat úhrady uloží jako příjem (otevřená drobnost 11).
- Testy: `tests/cost-check.test.js` (8); kouřový test – 🏦 Pokladna (převod, výdaj), 🧾 Náklady (rozbalení, ➖ Zapsat platbu), úhrada a Zaplatila vše s datem (data: druhý účet, pohyby, náklad s kategorií a příjemcem).

**Změněno**
- `src/domain/cash.js` – `sumCash` s účtem vrací i `tr {in, out}` a zůstatek účtu s převody (bez účtu beze změny); `payCharge` (`views/payments.js`) přijímá datum platby.
- `src/views/events.js` – režim 🧾 Náklady v přepínači pokladny; `src/views/team.js` – jen komentáře.
- ❓ Nápověda kap. 12: převod, datum platby, 🧾 Náklady, ➕ Příjem z výpisu.

**Beze změny:** výpočet a uzavření vyúčtování, předpisy, obsah QR kódu (SPD), párování výpisu, hospodaření měsíce a rozpočet (převody se do nich nepočítají), pravidla databáze, živý zápis, trénink, statistiky.

**Ověřeno:** `npm test` 391 / 391. `npm run smoke` – 8 rolí bez chyb, 249 obrazovek (převod, výdaj, 🧾 Náklady s předvyplněným výdajem, úhrada a Zaplatila vše s datem u správců pokladny); porovnání obrazovek s v22.4 – rozdíly jen nový čip 🧾 Náklady a změněná data kouřového testu (druhý účet).

## v22.4 (27. 10. 2026) – stav na kartě události, ⚖️ detail tarifu hráčky, 🔓 hromadné výjimky z blokace
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat). 3) Nahrát soubory ze zipu (nové `src/domain/tariff-detail.js`, `src/domain/block-exc.js`, `src/domain/event-status.js`, `src/views/tariff-detail-view.js`, `src/views/block-exc-view.js`, `src/views/event-badges.js`, `tests/v224-status.test.js`; nic se nemaže). 4) Načíst novou verzi (cache `hokej-v101`). 5) **🔒 Vyžadovat verzi: ne** (žádná nová pole). 6) Test: `docs/testy-rucni.md` kap. 8.

⚠️ SAHÁ NA PLATBY (`views/payments.js` – nová funkce `excMany`, nové `domain/block-exc.js`, `views/block-exc-view.js`, `views/tariff-detail-view.js`; výpočty předpisů, vyúčtování a úhrad beze změny).

**Přidáno**
- **Řádek stavu na kartě události** (`src/views/event-badges.js`, `src/domain/event-status.js`): správce pokladny (manager, pokladník) vidí 💰 vyúčtováno, ✅ / 💳 zaplaceno X/Y s částkou, ⏰ počet po splatnosti, u uplynulé události s náklady ⚠️ vyúčtování neuzavřeno. Trenéři (právo číst hodnocení) u tréninků dnes a v minulosti 📋 plán / bez plánu, ⏱ uzavřen / probíhá / nespuštěn, ⭐ ohodnoceno N hráček / bez hodnocení. Stav tréninků = jednorázové čtení `trplan`, `trlive`, `treval` (platí 5 min, `S.trs`), hráčky a hostující nic nečtou.
- **⚖️ Tarify → klepnutí na hráčku** (`src/views/tariff-detail-view.js`, `src/domain/tariff-detail.js`): souhrn sezóny (skutečně vs. druhý způsob), hodnota ledu na uzavřených událostech, kde byla (náklady ÷ hráčky v poli), využití v %, **Kdyby neplatila** – o kolik přijde pokladna a o kolik by se platba zvedla ostatním (příspěvky na hráčku s příspěvkem, poplatky na spoluplatící v události); 📅 po měsících předpisy a navštívené události (led, platila / v příspěvku, druhý způsob). 💡 tip na úlevu při využití pod 50 % u příspěvku. Odkaz 🕘 Historie placení. Osvobozené a 0 % klepnutím na jméno.
- **Team → 💰 Platby → 🔓 Výjimky** (`src/views/block-exc-view.js`, `src/domain/block-exc.js`): ⛓ Blokované / 🔓 S výjimkou, výběr hráček (Vybrat vše, 🔍), volitelně i předpisy před splatností, důvod do záznamů; udělení / zrušení druhým klepnutím.
- `src/views/payments.js` – `excMany()`: hromadná výjimka (předpisy jedné osoby v jedné dávce se souhrnem dlužníků, audit na osobu, nejvýš 120 předpisů na dávku).
- Testy: `tests/v224-status.test.js` (5); kouřový test – Minulé se štítky, ⚖️ detail hráčky, 🔓 Výjimky se zápisem (data: uzavřené vyúčtování e0, předpis po splatnosti).

**Změněno**
- `src/views/events.js` – karta události s řádkem stavu, `src/views/finance.js` – čip 🔓 Výjimky, rozbalení řádku v ⚖️ Tarify, `src/core/state.js` – `trs`.
- ❓ Nápověda: Události (řádek stavu), kap. 12 (⚖️ detail, 🔓 Výjimky).

**Beze změny:** výpočty pokladny, uzavření vyúčtování, úhrady, výjimka jednoho předpisu (🔒 / 🔓 u předpisu), pravidla databáze, živý zápis, trénink, statistiky.

**Ověřeno:** `npm test` 383 / 383. `npm run smoke` – 8 rolí bez chyb, 217 obrazovek (štítky 💰 u managera a pokladníka, 🏒 u trenérů; ⚖️ detail a 🔓 Výjimky se zápisem u správců pokladny).

## v22.3 (26. 10. 2026) – 🕘 zpětná změna způsobu placení, ⚙ sloupce výpisu z banky
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat). 3) Nahrát soubory ze zipu – zip obsahuje i v22.2 (pokud v22.2 ještě není nahraná, stačí tento zip). Nové soubory `src/views/pay-history.js`, `tests/pay-history.test.js` (a z v22.2 `src/domain/bank-match.js`, `src/views/bank-pair.js`, `tests/bank-match.test.js`); nic se nemaže. 4) Načíst novou verzi (cache `hokej-v100`). 5) **🔒 Vyžadovat verzi: ne.** 6) Test: `docs/testy-rucni.md` kap. 6 a 7.

⚠️ SAHÁ NA PLATBY (`domain/cash.js` – nové funkce, `domain/bank-match.js`, `views/bank-pair.js`, nové `views/pay-history.js`; výpočty předpisů beze změny).

**Přidáno**
- **🕘 Historie placení** hráčky (`src/views/pay-history.js`, správce pokladny): v okně hráčky (tlačítko pod platebními poli) a v Team → 💰 Platby → Podle hráček. Přehled dosavadních úseků, zpětná změna „od měsíce – do měsíce – způsob“ (prázdné do = trvale), po rozsahu se vrátí tehdejší způsob. Zápis `plpay/{pid}` (`grpH`, `grp`) + audit v jedné dávce, potvrzení druhým klepnutím. Pak dopad: vystavené příspěvky v období (🗑 smazat nezaplacený) a uzavřená vyúčtování, kde byla přihlášená (↩ otevřít událost – znovu otevřít a uzavřít ručně).
- `src/domain/cash.js` – `grpHRange()` (historie s rozsahem měsíců, bez opakování stejného způsobu), `grpSpans()` (úseky pro zobrazení).
- **⚙ Sloupce výpisu** (Platby → ☑ Hromadně): když se formát výpisu nepozná, otevře se sám – volba řádku záhlaví a sloupců (částka, VS, datum, plátce, zpráva, id pohybu) s ukázkou hodnoty; 💾 uložení pro účet týmu do `settings/cash.bank[účet]` (příště se použije samo, změna banky = jednou znovu přiřadit), ↺ Automaticky, 🗑 Zapomenout uložené.
- `src/domain/bank-match.js` – `readStatement(text, {map, hi})`, `mapDoc()`, `colKey()`; zpráva se pozná i v anglických sloupcích (note, memo, description…).
- Testy: `tests/pay-history.test.js` (5), přiřazení sloupců v `tests/bank-match.test.js` (2); kouřový test – 🕘 Historie placení s uložením, výpis neznámé banky s ručním přiřazením.

**Změněno**
- `src/domain/requests.js` – `impactOf()` umí i konec rozsahu (`until`); schvalování žádostí beze změny.
- `src/views/request-list.js` (`evFlags`) a `src/views/money.js` (`deleteContrib`) – jen export pro 🕘 (logika beze změny).
- ❓ Nápověda kap. 12: 🕘 Historie placení, ⚙ Sloupce výpisu.

**Beze změny:** výpočet předpisů a vyúčtování (řídí se historií jako dosud), žádosti o změnu placení, ruční změna způsobu v okně hráčky (platí od běžného měsíce), pravidla databáze, živý zápis, trénink.

**Ověřeno:** `npm test` 378 / 378. `npm run smoke` – 8 rolí bez chyb, 193 obrazovek (🕘 uložení u managera, trenéra-pokladníka a pokladníka; výpis neznámé banky → ruční sloupce → 1 přesná shoda).

## v22.2 (26. 10. 2026) – ⏱ ▶ Teď v živém tréninku, ☑ hromadné úhrady a 🏦 párování výpisu z banky
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat). 3) Nahrát soubory ze zipu (nové `src/domain/bank-match.js`, `src/views/bank-pair.js`, `tests/bank-match.test.js`; nic se nemaže). 4) Načíst novou verzi (cache `hokej-v99`). 5) **🔒 Vyžadovat verzi: ne** (nové pole `bt` v pokladně starší verze jen nečtou). 6) Test: `docs/testy-rucni.md` kap. 6.

⚠️ SAHÁ NA PLATBY (`src/views/payments.js` – nová funkce `payMany`, stávající úhrady beze změny).

**Přidáno**
- ⏱ Živý trénink → 📋 Zbytek plánu: u každého dalšího bloku **▶ Teď** (druhým klepnutím) – současný blok skončí hned, bloky mezi se pro dnešní průběh vypustí, hodiny skočí na začátek zvoleného bloku (např. nestíháme cvičení, ale hra na konci zůstane). Souhrn přejmenován na „📋 Zbytek plánu – přeskočit / zkrátit“, krátký popis ovládání.
- `src/domain/training-live.js` – `jumpPatch()` (úpravy `adj` / `skip` + čas skoku; stejná pole dokumentu `trlive` jako dosud).
- Team → 💰 Platby → čip **☑ Hromadně** (`src/views/bank-pair.js`): 🏦 načtení výpisu z banky (CSV, UTF-8 i windows-1250; Fio, ČSOB, KB, Air Bank, Raiffeisen, Moneta, ČS – sloupce podle záhlaví), párování příchozích plateb s nezaplacenými předpisy (VS předpisu → osobní VS rozdělený od nejstaršího předpisu → číslo ve zprávě), přesné shody předvybrané, částečná úhrada / přeplatek / shoda jen ve zprávě ke kontrole, nespárované příjmy a už zapsané pohyby zvlášť; při dvou účtech volba účtu výpisu. ☑ Ruční výběr nezaplacených předpisů po událostech (🔍 hledání, Vybrat vše). Spodní lišta ✅ Zapsat úhrady (počet, součet), druhým klepnutím.
- `src/domain/bank-match.js` – `readStatement`, `matchStatement`, `parseCsv`, `parseAmount`, `parseDate`, `vsNorm`.
- `src/views/payments.js` – `payMany()`: hromadná úhrada (příjem do pokladny + zaplaceno u předpisu; předpisy jedné osoby v jedné dávce se souhrnem dlužníků, nejvýš 120 předpisů na dávku). Pohyb z výpisu nese datum platby a značku `bt` (opakované načtení stejného výpisu ho nenabídne).
- Testy: `tests/bank-match.test.js` (8), `jumpPatch` v `tests/training-live-adj.test.js` (2); kouřový test – ▶ Teď v živém tréninku, ☑ Hromadně se zápisem.

**Změněno**
- ❓ Nápověda: kap. ⏱ Živý trénink (▶ Teď), kap. 12 (☑ Hromadně a výpis z banky).

**Beze změny:** jednotlivá úhrada 💳, ✅ Zaplatila vše, předpisy a vyúčtování, výpočty pokladny, pravidla databáze, živý zápis, statistiky, plán tréninku (uložený plán se skokem nemění).

**Pozn.:** XLSX / PDF výpis se nečte – v bankovnictví zvolit export CSV. Přeplatek se nezapisuje (jen upozornění) – zapsat ručně jako vklad nebo ponechat na další předpis.

**Ověřeno:** `npm test` 371 / 371. `npm run smoke` – 8 rolí bez chyb, 177 obrazovek (▶ Teď u všech, kdo řídí trénink; ☑ Hromadně se zápisem u managera, trenéra-pokladníka a pokladníka).

## v22.1.3 (26. 10. 2026) – ⚖️ porovnání placení jen pro pokladníka, 📊 docházka v Moje platby
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat). 3) Nahrát soubory ze zipu (nic nového se nemaže, žádný nový soubor v `src/`). 4) Načíst novou verzi (cache `hokej-v98`). 5) **🔒 Vyžadovat verzi: ne.** 6) Test: `docs/testy-rucni.md` kap. 5.

**Přidáno**
- Team → 💰 Platby → čip **⚖️ Tarify** (správce pokladny, `src/views/finance.js`): za sezónu u každé hráčky (bez brankářek, ukončených a hostujících) způsob placení, koeficient, docházka sezóny, skutečně předepsáno → druhý způsob placení a verdikt *nevyužívá* (platí příspěvek, za události by vyšla levněji) / *💡 příspěvek* (platí za události, příspěvek by se vyplatil) / *stejně* / *využívá*. Řazení: nejdřív ty, kterým by se vyplatila změna (podle rozdílu). Osvobozené a koeficient 0 % vypsané zvlášť.
- `src/domain/economy.js` – `tariffRows()` (výpočet přes stávající `myMonths` + `compareMonths`, beze změny jejich logiky).
- Moje platby → 📅 Po měsících: karta **📊 Moje docházka** (uplynulé události sezóny: účast, %, 🚫, ❌, ❓, bez odpovědi; tréninky / domácí / venkovní zápasy) a u každého měsíce „účast X z N“ (`src/views/mine.js`).
- `src/domain/attendance.js` – `attByMonth()` (docházka člena po měsících, z `attSummary`).
- Testy: `tariffRows` (`tests/pm-months.test.js`), `attByMonth` (`tests/attendance-nos.test.js`); kouřový test – kroky Team → Platby → ⚖️ Tarify a Moje platby → Po měsících.

**Změněno**
- Moje platby: karta **⚖️ Kdybych platila jinak** se hráčkám už nezobrazuje (zatím není žádoucí). Porovnání zůstává pro správce pokladny v ⚖️ Tarify a v okně žádosti o změnu placení.
- ❓ Nápověda: kap. 11 – místo ⚖️ Kdybych platila jinak 📊 Moje docházka; kap. 12 – Team → 💰 Platby → ⚖️ Tarify; text 💲 Doplnit ceny (i v ⚙️ → Pokladna).

**Beze změny:** předpisy, úhrady, výpočty pokladny, žádosti o změnu placení, pravidla databáze, živý zápis, statistiky, trénink.

**Pozn.:** docházka se načítá jen pro aktuální sezónu (plán, Otevřené drobnosti 8) – v Moje platby ◀ starší sezóna ukáže docházku prázdnou.

**Ověřeno:** `npm test` 361 / 361. `npm run smoke` – 8 rolí bez chyb (155 obrazovek; ⚖️ Tarify u pokladníka, 📊 Moje docházka u hráčky).

## v22.1.2 (26. 10. 2026) – úklid U1, část 3: plán a živý trénink po částech, komentáře pravidel
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules: změněny jen komentáře** – publikovat není nutné (lze kdykoli). 3) Nahrát soubory ze zipu (nové `src/views/trplan-edit.js`, `src/views/trlive-alerts.js`; nic se nemaže). 4) Načíst novou verzi (cache `hokej-v97`). 5) **🔒 Vyžadovat verzi: ne.** 6) Test: `docs/testy-rucni.md` kap. 4.

**Změněno (beze změny chování)**
- `src/views/trplan-view.js` (41 kB) rozdělen: karta plánu, okno cvičení a společné pomůcky (`trplan-view.js`, 18 kB) a úprava plánu na celé stránce (`trplan-edit.js`, 23 kB – vykreslení, obsluha, uložení se sloučením). `event-detail.js` bere `planEditor` z `trplan-edit.js`.
- `src/views/trlive-view.js` (35 kB → 30 kB): vibrace, zvuk, ⌚ oznámení a Wake Lock do `trlive-alerts.js` (6 kB). Kód přesunut beze změny.
- `firestore.rules` – jen komentáře: odstraněny odkazy na historii (OM2, v21.9.1, zrušené ⚙️ Kontrola dat); mrtvé pomocné funkce nejsou (všech 60 se používá); logika pravidel beze změny (ověřeno porovnáním bez komentářů).
- `src/domain/private-data.js` – komentáře: náhrada ze starých polí neexistuje jako samostatná větev (připojení `plpay` / `staffpay` / `attnote` je potřeba i dnes), kód beze změny.
- Kouřový test: kroky úpravy plánu (⏱ +1 min, + blok), opakovatelná náhoda (stejná id v každém běhu), role běží souběžně (≈ 15 s místo 60 s).

**Beze změny:** chování a vzhled, data, logika pravidel, živý zápis, pokladna, statistiky, docházka, trénink.

**Ověřeno:** `npm test` 359 / 359. `npm run smoke` – 8 rolí bez chyb (143 obrazovek). Porovnání HTML s v22.1.1: **shoda všech 143 obrazovek** (včetně úpravy plánu a živého tréninku).

**Úklid U1 celkem (v22.1 – v22.1.2):** živá dokumentace 398 kB → 108 kB (zbytek v `docs/archiv/`), vstup pro nové vlákno = `docs/STAV.md` (2 kB) + `docs/KONVENCE.md` (16 kB) místo ~95 kB. Kód aplikace 1 231 kB → 1 206 kB. Největší soubory pro čtení při úpravě: `events.js` 51 → 9 kB, `storage.js` 50 → 33 kB, `trplan-view.js` 41 → 18 kB, `trlive-view.js` 35 → 30 kB. Nový kouřový test všech rolí s porovnáním HTML.

## v22.1.1 (26. 10. 2026) – úklid U1, část 2: mrtvý kód, společné pomůcky, rozdělení Událostí a datové vrstvy
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat). 3) Nahrát soubory ze zipu (nové `src/views/event-core.js`, `src/views/event-detail.js`, `src/views/event-form.js`, `src/data/cfg-api.js`, `src/data/backup.js`; nic se nemaže). 4) Načíst novou verzi (cache `hokej-v96`). 5) **🔒 Vyžadovat verzi: ne.** 6) Test: `docs/testy-rucni.md` kap. 3.

**Změněno (beze změny chování)**
- `src/views/events.js` (51 kB) rozdělen: `events.js` (seznam, kalendář, karta, režimy pokladny v Team – 9 kB), `event-core.js` (styly, konstanty, sjednocený seznam událostí, odpovědi, zápis odpovědi s důvodem, okno s důvodem – 15 kB), `event-detail.js` (detail události – 19 kB), `event-form.js` (formulář – 6 kB). Kód přesunut beze změny.
- `src/data/storage.js` (50 kB → 33 kB): rozhraní okna ⚙️ do `src/data/cfg-api.js` (`cfgApi(C)` – účet, členové, náhled role, brána verze, matice práv) a zálohy do `src/data/backup.js` (`backupApi(C)` – ⚠️ záloha, CSV, obnova včetně ochrany účtů v `settings/cash`; kód beze změny). Stav účtu dostávají přes kontext `C` (funkce `user()`, `role()` …); `HK` a `HK.cfg` mají stejné položky.
- Společné pomůcky v `src/core/utils.js`: `clamp` (dříve 3 kopie v `training-plan`, `training-live`, `line-split`), `ceil` (3 kopie v `budget`, `budget-track`, `economy`; `cash.js` má vlastní – pokladna se nemění), `reqWord` (3 kopie „žádost / žádosti / žádostí“), `clone` (místo kopií ve `storage.js`, `trplan-view.js`, `plan-reuse.js`).
- Testy čtoucí zdroj Událostí a člena týmu (`tests/r-quick.test.js`, `tests/d3-cleanup.test.js`, `tests/self-member.test.js`) čtou nové soubory – kontroly beze změny.
- Kouřový test: krok formuláře + Trénink, zástupce Firebase čte i kolekci `members` (seznam členů v ⚙️).

**Odstraněno (mrtvý kód):** `blockStart`, `playerGroup` (`domain/training-live.js`), `whenLine` (`events.js`), `stars` a tři nepoužité `stamp` (`line-split-view.js`, `trplan-reuse.js`, `trplan-view.js`), nepoužité importy po přesunu.

**Beze změny:** chování a vzhled všech obrazovek, data, pravidla, živý zápis, pokladna, statistiky, docházka, trénink.

**Ověřeno:** `npm test` 359 / 359. `npm run smoke` – 8 rolí bez chyb (133 obrazovek včetně formuláře události a seznamu členů v ⚙️). Porovnání HTML s v22.1 (stejná data, zmrazený čas): **shoda všech 133 obrazovek**. Velikost: `events.js` 51 → 9 kB (+ 15 + 19 + 6 kB), `storage.js` 50 → 33 kB (+ 11 + 7 kB); kód aplikace celkem −0,6 kB.

## v22.1 (26. 10. 2026) – úklid U1, část 1: dokumentace, kouřový test, texty pokladny
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat). 3) Nahrát soubory ze zipu a **smazat** `docs/archiv-plan-v18.md`, `docs/plan-v18.md`, `docs/plan-trenink.md` (obsah je v `docs/archiv/`). 4) Načíst novou verzi (cache `hokej-v95`). 5) **🔒 Vyžadovat verzi: ne** (tvar dat se nemění). 6) Test: `docs/testy-rucni.md` kap. 2. Kouřový test na počítači: jednou `npm install`, pak `npm run smoke`.

**Přidáno**
- `docs/STAV.md` – krátký vstup pro každé vlákno (verze, cache, pravidla, k testu, další krok, trvalá rozhodnutí).
- `docs/plan.md` – jen nehotové fáze (E5, K2, N, P2, G, E6, H, F, M) a otevřené drobnosti.
- `docs/archiv/` – `CHANGELOG-do-v20.md` (záznamy v20.7.1 a starší beze změny), `plan-v18-do-v20.md` (dřívější `docs/archiv-plan-v18.md`), `plan-v18-v21.md` a `plan-trenink-v21.md` (dřívější plány), `testy-rucni-v21.md` (otestované kapitoly ručního testu).
- **Kouřový test** `tests/smoke/` (`npm run smoke`, jsdom jako devDependency – `npm test` dál bez instalace): 8 rolí (manager, trenér s 💰 i bez, asistent, asistent s hráčkou, hráčka, hostující, pokladník), zástupce Firebase s daty (where, getDocs, getDoc), scénáře start, všechny záložky, ⚙️ a sekce, ❓ nápověda, rychlé tlačítko u události, detail tréninku s plánem a řadou cvičení, úprava plánu, ⏱ živý trénink; `--save` uloží HTML obrazovek, `smoke-compare.mjs` porovná dvě verze. Postup v `docs/KONVENCE.md` kap. 5.

**Změněno**
- ⚠️ **Jen texty pokladny (logika beze změny):** „trenér a pokladník“ / „trenér nebo pokladník“ → **„správce pokladny“** v nápovědě (kap. 1, 2, 3, 4, 5, 9, 12) a v hláškách `src/data/storage.js` (smazání vyúčtované události, přepočet dlužníků, doplnění cen), `src/views/mine.js`, `src/views/cash-settings.js`, `src/views/request-list.js`, `src/views/budget-view.js`, `src/views/events.js` (odložené drobnosti 4 a 8).
- Dokumentace zkrácená: `CHANGELOG.md` jen v21+, `docs/KONVENCE.md` (mapa souborů po řádcích, kolekce Tréninku v tabulce, kouřový test), `README.md` (jen pro uživatele a správce), `docs/prompt-dalsi-vlakno.md` (krátká šablona bez historie), `docs/testy-rucni.md` (rychlá kontrola + netestované).
- Hlavičky souborů nejvýš 5 řádků o současném stavu (40 souborů); podrobná pravidla pokladny (`cash.js`), Zpět (`nav.js`) a QR (`mine.js`) přesunuta k příslušným sekcím. Jen komentáře – ⚠️ u `cash.js`, `bank-account.js`, `mine.js`, `qr-image.js`, `cash-settings.js`, `payments.js`, `money.js`, `cashbook.js`, `finance.js`, `request-list.js` se mění jen komentáře.
- `package.json` – skript `smoke`, devDependency `jsdom`.

**Beze změny:** chování aplikace, data, pravidla databáze, živý zápis, pokladna (kromě textů), statistiky, docházka, trénink.

**Ověřeno:** `npm test` 359 / 359. `npm run smoke` – všech 8 rolí bez chyb v konzoli (128 obrazovek). Porovnání vykresleného HTML s v22.0 (stejná data, zmrazený čas): shoda 120 obrazovek, odlišná jen ❓ nápověda (8 rolí – změněné texty pokladny). Úspora: živá dokumentace (README, CHANGELOG, docs bez archivu) **398 kB → 101 kB**, zdrojový kód aplikace **1 231 kB → 1 207 kB** (−24 kB, komentáře a texty).

## v22.0 (26. 10. 2026) – K-T4: 🔁 řada cvičení v lince – každé cvičení vlastní čas v okně bloku
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat; musí být publikovaná pravidla v21.9.1). 3) Nahrát soubory (nový `tests/lane-seq.test.js`; nic se nemaže). 4) Načíst novou verzi (cache `hokej-v94`). 5) **Po aktualizaci všech trenérů nastavit 🔒 Vyžadovat verzi 22.0** – starší verze by při uložení plánu řady cvičení zahodila (nechá jen první cvičení linky).

**Přidáno**
- **🔁 Řada cvičení v lince** (přání 26. 10.: blok je pro všechny stejný, hráčky a brankářky v něm cvičí odděleně a jinak časově rozdělené): v úpravě plánu u linky, která se netočí (blok 👥 Společně, souběžná linka, 🥅 linka stanovišť) tlačítko **🔁 Víc cvičení s vlastním časem** – cvičení pod sebou, každé s ⏱ −/+ / číslem, ↑ pořadí, 🗑, **+ Cvičení** (nejvýš 8), „Jedno cvičení na celý blok“ vrátí linku zpět. Výběr cvičení převezme čas z banky, dokud ho trenér nezmění. Pod řadou **Součet x z y min · volno** (⛔ když se nevejde do bloku – čas bloku určuje hlavní trenér).
- **Kontrola plánu:** ⛔ řada delší než blok, ⚠️ volno v řadě, ⚠️ cvičení řady bez výběru.
- **Karta plánu:** u linky s řadou „🔁 N cvičení“ a pod tím čas začátku, cvičení a délka (klepnutím okno cvičení), případně volno do konce bloku.
- **⭐ Moje linky:** v úpravě plánu ⭐ u linek, které vedu (🎓 trenér linky z „⚙ Další volby“), a přepínač **⭐ Jen moje linky** (ostatní bloky jen ke čtení) – asistent si naplánuje jen cvičení brankářek v čase bloku hlavního trenéra.
- **Sloučení uložení:** když plán mezitím uložil jiný trenér, uložení ho nepřepíše naslepo – kdo měnil jen řady cvičení, uloží se do nejnovějšího plánu jen jeho řady; kdo měnil bloky, uloží svůj plán, ale řady linek, které neměnil, zůstanou z nejnovější verze (hláška řekne, s kým se sloučilo).
- **⏱ Živý trénink:** na mé lince s řadou velký odpočet do konce **mého cvičení** („🔁 moje cvičení 2/3“, konec bloku menší), seznam řady s ✓ / ▶, „Za m:ss → 🔁 cvičení 3/3“, vibrace / zvuk 60 s a 10 s před koncem cvičení, ⌚ oznámení „Teď / Potom“ po cvičeních řady, ⭐ výzva k hodnocení hráček hned po skončeném cvičení řady, ⏲ stopky u měřeného cvičení řady.
- Doména `src/domain/training-plan.js`: `seqOk`, `laneSeq`, `seqMinutes`, `seqBlank`, `seqStart`, `seqTimes`, `seqStep`, `seqLid`, `expandLanes`, `mergePlan`; `src/domain/training-live.js`: `laneSub`. Testy `tests/lane-seq.test.js`.

**Změněno**
- Plán `trplan` – linka může mít `seq: [{id, drill, dn, di, dur}]`; `drill` / `dn` / `di` linky = první cvičení řady (starší verze ukáže aspoň to). Šablony a ⧉ kopie řady přenesou.
- ⭐ Hodnocení a ⏲ měření – cvičení řady má vlastní klíč `blok_linka-cvičení` (`evalLanes`, `measLanes`); 📊 pokrytí dovedností počítá minuty po cvičeních řady; použití cvičení v plánech (`drillUsage`) i z řad.
- Trenér linky je vidět v hlavičce linky v úpravě plánu.

**Beze změny:** pravidla databáze, točení stanovišť (točící se stanoviště řadu nemají), plány bez řad, živý zápis, pokladna, statistiky, docházka, žádosti, nepřítomnost, hostující.

**Ověřeno:** `npm test` 359 / 359 (nový `tests/lane-seq.test.js` – normalizace, časy, kontrola, virtuální linky, pokrytí, živý trénink, sloučení). Kouřový test jsdom (scratchpad, zástupce Firebase s daty): trenér – karta plánu s dvěma řadami, okno cvičení řady, ⏱ živý trénink 200 s po startu → „🔁 moje cvičení 1/2“, odpočet 4:3x, „→ 🔁 cvičení 2/2“; úprava plánu – součty řad, +1 min, ⭐ Jen moje linky (1 z 2 bloků k úpravě), převod linky bloku 2 na řadu, uložení se sloučením se změnou jiného trenéra (hláška „sloučeno … petr“); asistent – „🔁 moje cvičení 2/3“, odpočet 3:3x, ⭐ výzva k hodnocení 1. cvičení brankářek; bez chyb v konzoli.

## v21.9.1 (26. 10. 2026) – oprava: člen realizačního týmu, který je zároveň hráčka, se hlásí na události jako hráčka
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules publikovat PŘED kódem** (`plpay` – číst smí i manager / trenér / asistent propojený s hráčkou, jen svůj dokument; nic jiného se nemění). 3) Nahrát soubory (nový `tests/self-member.test.js`; nic se nemaže). 4) Načíst novou verzi (cache `hokej-v93`). 5) ⚙️ → Členové týmu: u dotčené členky (role Asistent / Trenér + 💰 Pokladník) znovu zadat stejný e-mail, stejnou roli, člena realizačního týmu, pokladníka **a vybrat i její hráčku** („— je zároveň hráčka (volitelné) —“) → Přidat člena (= změna nastavení). 6) 🔒 Vyžadovat verzi **nenastavovat** (není potřeba; starší verze jen přihlásí člena týmu jako dřív).

**Opraveno**
- **Hrající člen realizačního týmu** (např. hráčka s rolí Asistent kvůli zadávání událostí a s příznakem Pokladník) se na kartě události přihlašovala jako člen realizačního týmu 🎓. Účet s rolí Manager / Trenér / Asistent teď může mít v ⚙️ → Členové týmu kromě člena realizačního týmu **volitelně i hráčku** (ne hostující 🎟); rychlá tlačítka na kartě události pak platí za **hráčku (přednost)**, v detailu události je nahoře „Tvoje odpověď“ za hráčku. Bez propojené hráčky beze změny (za člena realizačního týmu). Docházku člena realizačního týmu jde dál odkliknout v detailu události.

**Změněno**
- `src/domain/event-helpers.js` – `selfMember(pid, tid, hráčky, tým, jenVlastní)`: za koho se účet hlásí (aktivní hráčka má přednost, role Hráčka nikdy za člena týmu); `src/views/events.js` ho používá pro `S.evp`, „Tvoje odpověď“ i pro člena týmu, který je zároveň hráčka.
- `src/data/storage.js` – `saveMember` zapíše `pid` i u rolí manager / trener / asistent, když je hráčka vybraná (kontrola: ne hostující); seznam členů a 👤 Účet ukazují i propojenou hráčku.
- `src/views/settings-view.js` – výběr hráčky ve formuláři členů je vidět u všech rolí; u role Hráčka / Hostující povinný, u ostatních „— je zároveň hráčka (volitelné) —“.
- `firestore.rules` – `plpay/{id}` čte i `isStaff()` s `members.pid == id` (vlastní platební pole hráčky, Moje platby). Členové (`members`) bez změny – zapisuje je manager.

**Beze změny:** docházka za ostatní, 🚫, blokace dluhem (počítá se za hráčku), pokladna a předpisy, živý zápis, statistiky, trénink, žádosti, nepřítomnost, hostující, práva rolí (role zůstává Asistent / Trenér).

**Ověřeno:** `npm test` 347 / 347 (nový `tests/self-member.test.js`, upraven test pravidel `plpay` v `tests/privacy.test.js`). Kouřový test jsdom (scratchpad, zástupce Firebase s `getDocs` / `getDoc` z dat): asistent + pokladník s hráčkou i členem týmu → rychlá tlačítka za hráčku, „Jdu“ zapíše `attendance/e1_p1`; trenér jen s členem týmu → `attendance/e1_t1` (beze změny); hráčka → `attendance/e1_p1`; manager ⚙️ → Členové: výběr hráčky u Asistenta s popiskem „volitelné“, u Hostující skrytý člen týmu, uložení asistenta s hráčkou zapíše `members/{e-mail}` = {role: asistent, rv: 2, pid, tid, cash}; bez chyb v konzoli.

## v21.9 (26. 10. 2026) – K-T3: 🏃 štafeta ve stopkách
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat; musí být publikovaná pravidla v21.8). 3) Nahrát soubory (nové `src/domain/relay.js`, `tests/relay.test.js`; nic se nemaže). 4) Na telefonech ⚙️ → 👤 Účet → Načíst novou verzi (v21.9, cache `hokej-v92`). 5) Test podle **docs/testy-rucni.md – sekce 9**. **🔒 Vyžadovat verzi: ne** (nové pole `rl` starší verze nemaže ani nečte; 🔒 21.8 z minulé verze platí).

**Přidáno**
- **🏃 Štafeta ve stopkách** (jen měření času; v okně ⏲ stopek přepínač ⏱ Jednotlivě / 🏃 Štafeta – z karty ⏲ Výsledky měření i z ⏱ živého tréninku): 2–4 skupiny A–D, rozdělení 🔀 střídavě nebo nasazením klepnutím (vybrat skupinu, klepat jména v pořadí běhu; klepnutí ve skupině vyřadí), změna počtu skupin zachová zařazené. **▶ Start štafety** = všechny neprázdné skupiny naráz; velké tlačítko skupiny (jméno běžící, kolikátá / z kolika, další na řadě, úsek a celkem) – klepnutí = předávka, ↩ vrátí poslední předávku, ✕ Zrušit štafetu (druhým klepnutím, bez uložení). Po doběhnutí všech skupin se zapíše jednou dávkou: **úsek = pokus hráčky** (`trms…ms`, pořadí hráček beze změny) a **běh skupin** do `trms/{eid}.r.{linka}.rl = [{at, g: [{p: [pořadí], t: s}]}]` (nejvýš 20 běhů); výsledek s pořadím skupin a časy úseků, ↺ Znovu se stejnými skupinami, ✎ Upravit skupiny. Zavření okna při běžící štafetě se ptá druhým klepnutím. V kartě výsledků řádek „🏃 Štafeta N×“ s posledními 3 běhy (skupiny podle času a jejich hráčky) – vidí celý tým jako ostatní výsledky měření.
- Doména `src/domain/relay.js` (`relaySplit`, `relayToggle`, `relayResize`, `relayStart`, `relayTap`, `relayUndo`, `relayDone`, `relayLive`, `relayRank`, `relayPatch`, `relayLine`) + `tests/relay.test.js`.

**Beze změny:** jednotlivé stopky, počty a body, pravidla (`trmsOk` hlídá jen velikost `r`), živý trénink, plán, hodnocení, vše mimo Trénink.

**Ověřeno:** `npm test` 339 / 339. Kouřový test jsdom (trenér): karta výsledků s řádkem 🏃 Štafeta, okno stopek → 🏃 Štafeta, 2 skupiny, start, 3 předávky → „Doběhly všechny skupiny“, zápis `trms/e1` s pokusy 3 hráček a 2 běhy v `rl`; bez chyb v konzoli.

## v21.8 (26. 10. 2026) – K-T2: ⏱ živý trénink podle skutečnosti, ☕ pauza v plánu, název HockeyCoach, sbalená docházka
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules publikovat PŘED kódem** (`trliveOk` dovolí pole `adj` a `skip`; ostatní beze změny – pravidla v21.6 s kolekcí `treval` v souboru jsou). 3) Nahrát soubory (nový jen `tests/training-live-adj.test.js`; nic se nemaže). 4) Na telefonech ⚙️ → 👤 Účet → Načíst novou verzi (v21.8, cache `hokej-v91`). Ikona na ploše se přejmenuje až po přeinstalaci (název z manifestu). 5) Test podle **docs/testy-rucni.md – sekce 8** (+ rychlá kontrola sekce 6). 6) **🔒 Vyžadovat verzi 21.8 – ano, hned po nahrání na všechny telefony realizačního týmu** (starší verze nezná ☕ pauzu – při úpravě plánu by z ní udělala prázdný blok – a nepočítá s vypuštěnými / zkrácenými bloky, ukazovala by jiný čas).

**Přidáno**
- **⏱ Živý trénink podle skutečnosti** (plán je jen návod): nahoře „do konce tréninku m:ss · plán přetahuje o N min / rezerva N min / plán sedí“ (z konce události, pauza přetahování zvětšuje); **✂ −1 min** zkrátí právě běžící kolo (posun hodin, nejdál na konec kola); **📋 Zbytek plánu** dole (sám se rozbalí, když plán přetahuje aspoň o minutu): další bloky −/+ o minutu nebo ⏭ vypustit / ↩ vrátit – **jen pro tento průběh**, uložený plán se nemění. Upravit jde jen bloky, které ještě nezačaly. Data `trlive/{eid}`: `adj {id bloku: min}`, `skip [id bloku]`, zapisuje se se stavem hodin (řídící, čas serveru); ▶ start / ↺ znovu je vynuluje. Doména `liveBlocks`, `canAdj`, `adjPatch`, `liveRest`, `liveBudget`, `cutSec`, `liveCtl("keep")` – poloha, posuny ⏮ / ⏭, upozornění, ⌚ oznámení i hodnocení po kole počítají s upraveným průběhem (vypuštěný blok = délka 0, indexy bloků zůstávají).
- **☕ Pauza v plánu** (rozhodnutí: blok, ne cvičení – nezanáší banku, hodnocení, měření ani 📊 pokrytí dovedností): v úpravě plánu **+ ☕ Pauza** (popisek, výchozí „Pití“, čas 2 / 3 / 5 / 10 min nebo −/+), v kartě šedý řádek „☕ Pití · 3 min“, v živém tréninku velký nápis a v oznámení „☕ Pauza“; výzva ⭐ po kole během pauzy nabídne cvičení před pauzou. Data `trplan.blocks[].brk` (text), bez linek; `isBreak`, `breakBlank`, `planDoc`, `planIssues`, `prevSpot`.
- **🎽 Dres pro hráčku:** v kartě plánu „Tvoje skupina … · 🎽 vezmi si modrý / žlutý / zelený / růžový dres“.

**Změněno**
- **⏱ Živý trénink jen pro realizační tým** (`HK.can("sport")`) – hráčky ho v kartě plánu nevidí (telefon na ledě nemají, plán si přečtou předem). Pravidla čtení `trlive` beze změny (`trplan r`).
- **Název aplikace HockeyCoach** (místo „Hokej – zápasy“): záhlaví, titulek, přihlašovací obrazovka (`APP_NAME`), manifest (`name`, `short_name`). Značka zálohy `hokej-zapasy` a cache `hokej-vNN` beze změny.
- **Události:** nadpis a zkrácené datum v jednom řádku („🏒 Trénink · Po 27. 10.“) v seznamu i v detailu, pod ním čas, sraz a místo; hlavička detailu podbarvená jako záhlaví karet; v kartě seznamu bez slova „Přihlášeno“. **👥 Docházka** v detailu je sbalená (v záhlaví ✅ ❓ ❌ 🚫), rozbalení se pamatuje pro otevřenou událost.
- **Team – soupiska a realizační tým:** místo „Upravit“ / „Smazat“ malá tlačítka ✏️ / 🗑 (potvrzení „🗑 Smazat?“), text se nezalamuje (`.ib` v `styles/main.css`).

**Beze změny:** živý zápis zápasu, pokladna, statistiky, docházka (jen zobrazení), zrušení událostí, žádosti, nepřítomnost, hostující, stopky, hodnocení (kromě přeskočení pauzy). Tvar `trplan` jen rozšířen o `brk`.

**Ověřeno:** `npm test` 335 / 335 (nový `tests/training-live-adj.test.js` – úpravy průběhu, rozpočet času, zkrácení kola, ☕ pauza, pravidla `trliveOk`; upraven test startu hodin o `adj` / `skip`). Kouřový test jsdom (scratchpad, zástupce Firebase s `where` / `getDocs` / `getDoc` z dat): manager, trener, asistent, hracka, trener + 💰, hracka-pokladník – start bez chyb, nadpis s datem v seznamu i detailu, podbarvená hlavička, sbalená docházka, ☕ v kartě plánu, 🎽 dres jen hráčce, ⏱ jen realizačnímu týmu, obrazovka s „do konce tréninku“, 📋 Zbytek plánu, ✂ −1 min, ⏭ vypuštění bloku po převzetí řízení zapíše `skip` do `trlive/e1`; Team ✏️ / 🗑. Hostující beze změny (nová místa nevidí).

## v21.7 (26. 10. 2026) – K-T: trénink jednodušeji – hodnocení po hráčkách, přehlednější detail události, kompaktní stopky, výběr cvičení s hledáním, náhled videa a PDF
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat; pravidla v21.6 – kolekce `treval` – musí být publikovaná). 3) Nahrát soubory (nové `src/views/drill-picker.js`; nic se nemaže). 4) Na telefonech ⚙️ → 👤 Účet → Načíst novou verzi (v21.7, cache `hokej-v90`). 5) Test podle **docs/testy-rucni.md – sekce 7** (+ rychlá kontrola sekce 6). **🔒 Vyžadovat verzi: ne** (tvar dat se nemění).

**Změněno (připomínky z testu 25.–26. 10. 2026)**
- **⭐ Hodnocení po hráčkách** (celkové hodnocení skupiny / cvičení je zbytečné): v ⏱ živém tréninku po skončeném kole vyjede „⭐ Jak šlo hráčkám?“ – seznam hráček, které byly na mém stanovišti v tom kole, řádek = jméno + 😃 🙂 😐 😴 (rychle označit, bez psaní, opětovné klepnutí zruší). Karta v detailu tréninku se jmenuje **⭐ Hodnocení hráček** („neohodnoceno N z M“), po stanovištích jako rozbalovací řádky (otevřené první s neohodnocenou hráčkou), u hráčky 📝 poznámka, u stanoviště 📝 Poznámka ke cvičení; okno linky `#tev` zrušeno. Data beze změny tvaru (`treval/{eid}.r.{linka}.pl.{pid}`), starší celkové hodnocení linky zůstává v datech.
- **Detail události:** hlavička = den a datum, název, 🕔 čas · ⏰ sraz, 📍 místo, ✅ / ❓ / ❌ v jednom řádku a „Útočnice · Obránkyně · Brankářky · Trenéři“ (bez slova „Přihlášeno“); hráčka má v hlavičce **Tvoje odpověď**. Pořadí: výsledek zápasu → rozdělení do pětek → 📋 plán tréninku → docházka → žádosti → pokladna → **⚙ Úpravy události** (✏️ Upravit, ❌ Zrušit, 🗑 Smazat, 🧨) pod rozbalením (otevřené samo při potvrzení), formulář zrušení pod nimi. 🏒 Otevřít zápas zůstává v hlavičce.
- **Podbarvené záhlaví karet** v celé aplikaci (`.cd > h2` nebo řádek s nadpisem na začátku karty – barva `--a2`, světlý i tmavý režim).
- **↻ Rozdělit automaticky** je sbalený, když už je někdo v pětce (ručně rozbalený zůstane otevřený).
- **⏲ Stopky kompaktní:** jeden řádek na hráčku (jméno + pokusy drobně, čas vpravo, ↩ na kraji), název cvičení na jeden řádek – na obrazovku se vejde ~10 hráček; ovládání beze změny.
- **📚 Výběr cvičení v úpravě plánu:** místo dlouhého seznamu tlačítko 📚 → okno přes celou obrazovku s 🔍 hledáním (název, pomůcky, popis, bez ohledu na diakritiku), částí tréninku, dovedností a ⭐ oblíbenými; ✕ Bez cvičení; Zpět zavře.
- **▶ Video a 📄 PDF přímo v aplikaci:** v okně cvičení (plán i banka) ▶ Přehrát video / 📄 Zobrazit PDF – YouTube, Google Disk (video i PDF) a přímý soubor .mp4 / .webm / .mov se přehrají v náhledu (načte se až po klepnutí), jinak odkaz; „otevřít zvlášť ↗“. Popisky polí ve formuláři cvičení vysvětlují týmový Google účet a sdílení „Kdokoli s odkazem“.

**Opraveno**
- **⭐ Výkonnost:** po označení hvězd seznam skočil nahoru – posun okna se pamatuje (`S.plvo.y`).

**Přidáno**
- `src/views/drill-picker.js` (výběr cvičení), `domain/training-eval.js` – `lanePids`, `rateLanes`, `unratedCount`; `domain/drills.js` – `mediaOf`; `views/drill-media.js` – `mediaHtml`, `bindMedia`.
- README – **Provoz a správa**: týmový Google účet spravuje manager (vedoucí týmu), doporučení pro předání provozu.
- Testy: hráčky linky a počty neohodnocených (`training-eval.test.js`), `mediaOf` (`drills.test.js`) – celkem 325.
- `docs/testy-rucni.md` – sekce 7 (v21.7); `docs/plan-v18.md`, `docs/plan-trenink.md` – nové pořadí: v21.8 živý trénink podle skutečnosti, v21.9 štafeta, G0 hodinky, v22.0 E5.

**Soubory**
- `src/views/events.js` (detail události), `src/views/line-split-view.js`, `src/views/treval-view.js`, `src/views/trlive-view.js`, `src/views/trplan-view.js`, `src/views/stopwatch-view.js`, `src/views/drills-view.js`, `src/views/drill-media.js`, `src/views/drill-picker.js` (nový), `src/domain/training-eval.js`, `src/domain/drills.js`, `src/core/nav.js` (Zpět zavře výběr cvičení), `styles/main.css`, `src/views/help.js`, verze `app-version.js`, `package.json`, `sw.js` → `hokej-v90`, `README.md`, `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/plan-trenink.md`, `docs/testy-rucni.md`, `docs/prompt-dalsi-vlakno.md`, `tests/training-eval.test.js`, `tests/drills.test.js`.
- **Návod pro trenéry (Claude Docs) upravit:** hodnocení po hráčkách (výzva po kole, karta ⭐ Hodnocení hráček), výběr cvičení 📚 s hledáním, videa a PDF na týmovém Google Disku (sdílení „Kdokoli s odkazem“), úpravy události dole pod ⚙.

**Beze změny**
- Pravidla databáze, tvar dat, `HK.can` a matice práv, živý zápis zápasu, statistiky, docházka (jen jinde na stránce), pokladna, žádosti, nepřítomnost, hostující, hodiny živého tréninku, výpočty stopek.
- Ověřeno: `npm test` (325/325); kouřový test v jsdom (Manager, Trenér, Trenér bez `rv`, Asistent, Hráčka, Pokladník-hráčka, Hostující, Kustod, vývojář; asistent bez `treval e`): start bez chyb, hlavička a pořadí detailu, „Tvoje odpověď“ jen u hráčky, ⚙ Úpravy jen u realizačního týmu, hodnocení hráčky zapíše jen `treval/e1` (`pl.p1.r`, druhé klepnutí `0`, poznámky hráčky i cvičení, starší data linky zachována), výzva v živém tréninku s hráčkami kola, hráčka / hostující hodnocení nevidí; Chromium (Playwright) 360 px – detail tréninku, karta hodnocení s poznámkou, stopky s 12 hráčkami, živý trénink s výzvou, výběr cvičení (hledání „stř“), záložky 🏠 / Události / Team / Statistiky / Soupeři: `scrollWidth = 360`, bez chyb JavaScriptu.

## v21.6 (25. 10. 2026) – E4: ⭐ hodnocení cvičení a hráček, výzva v živém tréninku, ruční testovací plán (modul Trénink)
> **Nasazení:** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** (nová kolekce `treval` – hodnocení; jen rozšíření, v21.5 s novými pravidly funguje beze změny; pokladny a plateb se změna netýká). Zkontroluj, že jsou publikovaná i pravidla v21.4 (`trms`). 3) Nahrát soubory (nové `src/domain/training-eval.js`, `src/views/treval-view.js`, `tests/training-eval.test.js`, `docs/testy-rucni.md`; nic se nemaže). 4) Na telefonech ⚙️ → 👤 Účet → Načíst novou verzi (v21.6, cache `hokej-v89`). 5) Test na Androidu podle **docs/testy-rucni.md** – sekce 5 (hodnocení), a protože v21.3 – v21.5 zatím nebyly otestované, i sekce 1 – 4 a 6. **🔒 Vyžadovat verzi: ne** (stávající data se nemění).
> Pokud se pravidla nepublikují, karta ⭐ Hodnocení ukáže „Hodnocení se nepodařilo načíst … v21.6“ a uložení skončí hláškou „Uložení se nepovedlo“; zbytek funguje. Návrat: nahrát zip v21.5 (pravidla v21.6 mohou zůstat).

**Přidáno**
- **⭐ Hodnocení cvičení** (karta pod ⏲ Výsledky měření v kartě 📋 Plán tréninku, jen realizační tým – `treval r`): každá linka plánu s cvičením zvlášť (u stanovišť každé stanoviště, linka 🥅 zvlášť) stupnicí T5 **😃 super · 🙂 v pohodě · 😐 nic moc · 😴 vůbec se nesnaží**; v záhlaví „neohodnoceno N z M“ (seznam k doplnění po tréninku), u dnešního a minulého tréninku rozbalená; klepnutí na zvolený smajlík hodnocení zruší; bez práva hodnotit jen ke čtení.
- **📝 Poznámka a hráčky** – okno linky `#tev` přes celou obrazovku: velké smajlíky cvičení, poznámka ke cvičení (do 300 znaků), volitelně hodnocení hráček linky (stejná stupnice) s poznámkou, + Přidat hráčku; ukládá se hned, Zpět / ✕ Hotovo zavře (rozepsaná poznámka se uloží).
- **⭐ Jak šlo cvičení?** v ⏱ živém tréninku: po skončeném kole / bloku výzva s velkými smajlíky pro moje linky předchozího kola (trenér své, bez přiřazené linky všechny linky kola), jedno klepnutí bez psaní; ohodnocená linka má menší tlačítka (oprava jde dál); po konci plánu poslední kolo a připomenutí neohodnocených.
- Kolekce **`treval/{eid}`** = {v, r: {blok_linka: {d, dn, r (0–4), n, pl: {pid: {r, n}}}}, by, at} – jeden dokument na trénink, zápis dávkou s hlubokým sloučením (jen daná linka / hráčka), poslech jen u otevřeného tréninku, v záloze (načte se při stažení).
- `src/domain/training-eval.js` – `TREVAL_COLL`, `RATE`, `RATES`, `rateOk`, `rateIcon`, `noteOf`, `entryOf`, `evalLanes`, `unrated`, `prevSpot`, `evalPatch`, `playerPatch`, `playerRates`, `rateCounts`; `training-plan.js` – `laneTags` (označení stanovišť A–D / 🥅 na jednom místě).
- `firestore.rules`: `trevalOk` a `match /treval/{id}` (čte `can('treval', 'r')`, zapisuje a maže `can('treval', 'e')`).
- **docs/testy-rucni.md** – ruční testovací plán na Androidu pro v21.3 – v21.6 (kroky a očekávaný výsledek, rychlá kontrola celé aplikace); od teď se doplňuje s každou verzí.
- Testy `tests/training-eval.test.js` (9).
- Nápověda: ⭐ Hodnocení cvičení, řádek v tabulce „Kde co najdu“.

**Změněno**
- `src/views/trplan-view.js` (karta hodnocení, `laneTags` z domény), `src/views/trlive-view.js` (výzva k hodnocení, `laneTags` z domény), `src/views/stopwatch-view.js` (export `lanePlayers` – hráčky linky), `src/domain/permissions.js` (popisek modulu „⏲ Měření a ⭐ hodnocení tréninku“), `src/data/storage.js` (`treval` v záloze), `src/core/nav.js` (Zpět zavře okno hodnocení), `src/views/help.js`, verze `app-version.js`, `package.json`, `sw.js` → `hokej-v89`, `README.md`, `docs/KONVENCE.md` (mapa souborů, pravidla, postup vydání + ruční testy), `docs/plan-v18.md`, `docs/plan-trenink.md`, `docs/prompt-dalsi-vlakno.md`.
- **Návod pro trenéry (Claude Docs) doplnit:** kapitola „Po tréninku“ – ⭐ Hodnocení cvičení v kartě plánu (neohodnocené nahoře v záhlaví, 📝 poznámka a hráčky); v živém tréninku „⭐ Jak šlo cvičení?“ po kole jedním klepnutím.

**Beze změny**
- Zkratky `HK.can` a výchozí matice (modul `treval` už existoval – čtení pro trenéra a asistenta pevné, hráčka nikdy; hodnotit jde v matici vypnout), živý zápis zápasu, statistiky, docházka, pokladna, události, žádosti, nepřítomnost, hostující, stávající pravidla kolekcí, ⏱ hodiny živého tréninku a ⏲ stopky (jen výzva navíc).
- Ověřeno: `npm test` (323/323, nové `training-eval`); kouřový test v jsdom (Manager, Trenér, Trenér bez `rv`, Asistent, Hráčka, Pokladník (hráčka s 💰), Hostující, stará role Kustod, vývojář; bez matice i s `settings/perm` – asistent bez `treval e`): start bez chyb, sekce ⚙️ a 🔐, karta ⭐ (realizační tým ano, hráčka / pokladník-hráčka / hostující ne, asistent bez `treval e` jen ke čtení), klepnutí zapíše jen `treval/e1` (hluboké sloučení, druhé klepnutí `r: 0`), okno linky – poznámka, hodnocení a poznámka hráček bez přepsání ostatních, výzva v živém tréninku po kole (4 tlačítka, zápis) a po konci plánu; měření v Chromiu (Playwright) na šířce 360 px – detail tréninku s kartou, okno `#tev` a živý trénink s výzvou `scrollWidth = 360`, bez chyb JavaScriptu.

## v21.5 (25. 10. 2026) – K1: telefon bez posunu do strany, ✨ Připravit trénink, jednodušší úprava plánu (modul Trénink)
> **Nasazení:** 1) Zip současného repozitáře. 2) **firestore.rules beze změny** (nepublikovat; v21.4 pravidla musí být publikovaná kvůli měření). 3) Nahrát soubory (nový `tests/k1-prepare.test.js`; nic se nemaže). 4) Na telefonech ⚙️ → 👤 Účet → Načíst novou verzi (v21.5, cache `hokej-v88`). 5) Test na Androidu: a) trénink s plánem se stanovišti A/B/C → karta i ✏️ Upravit: stránka se nedá posunout do strany (rozpis točení se vejde), dlouhý název cvičení ve výběru je zkrácený „…“; b) u bloku je vidět jen cvičení, ⏱ čas, skupiny (a u stanovišť + Stanoviště a rozpis točení), **⚙ Další volby** otevře režim, 🎽/⚔ skupiny, točení, trenéry a souběžnou linku – u bloku, který je používá, je otevřené samo; c) nový trénink bez plánu s přihlášenými → **✨ Připravit trénink**: hláška „Pětky rozděleny: …“ (když ještě nikdo nebyl v pětce), otevře se plán s nabídkou **⧉ Jako minule** a **📑 Šablona** → klepnout, zkontrolovat, 💾 Uložit; už rozdělené pětky se nepřepíšou; d) statistiky: široké tabulky se dál posouvají do strany uvnitř karty; e) ⏲ Výsledky měření se vejdou na šířku. **🔒 Vyžadovat verzi: ne.**

**Opraveno**
- **Stránka na telefonu ujížděla do šířky** (úprava plánu – volba stanovišť, rozpis točení skupin A/B/C; karta výsledků měření): globální `table { min-width: 520px }` platí jen pro tabulky v `.tw` (statistiky – posun uvnitř karty), ostatní tabulky se vejdou a dlouhé slovo zalomí; `#evw` tabulky `nowrap` jen v `.tw`; `input`, `select`, `textarea` mají `max-width: 100%` a `min-width: 0`, dlouhý `select` zkracuje „…“; položky `.row` mají `min-width: 0` a tlačítka v řádku na telefonu menší boční odsazení (dlouhé slovo se zalomí); řádek ⧉ / 📑 / 💾 se na telefonu zalomí.

**Přidáno**
- **✨ Připravit trénink** (karta 📋 Plán tréninku bez plánu, s právem upravit plán): rozdělí přihlášené hráčky do pětek posledním způsobem z tohoto zařízení (`quickSplit` – jen když ještě žádná přihlášená v pětce není a jen s `HK.can("sport")`), otevře plán a nabídne plán z posledního tréninku, který plán má, a naposledy uloženou šablonu (`loadPrep`, panel ✨ v úpravě); ➕ Prázdný plán zůstává.
- **⚙ Další volby** u bloku v úpravě plánu: režim (Společně / Stanoviště), skupiny 🎽 / ⚔, točení, trenéři linek, + Souběžná linka; otevřené samo, když je blok používá (`blockExtras`), ručně otevřené zůstane otevřené (`S.tpe.mo`). Čas „jen pro tento trénink“ je teď nápověda u ⏱ (a v nápovědě aplikace).
- `domain/training-plan.js` – `blockExtras`; `domain/plan-reuse.js` – `latestTpl`. Testy `tests/k1-prepare.test.js` (4: další volby, poslední šablona, pravidla CSS pro telefon).
- Nápověda: ✨ Připravit trénink, ⚙ Další volby, tip svěřit měření jednomu člověku.

**Změněno**
- `styles/main.css`, `src/views/trplan-view.js`, `src/views/trplan-reuse.js`, `src/views/line-split-view.js` (`quickSplit`), `src/views/events.js` (jen CSS `nowrap` tabulek), `src/views/help.js`, verze `app-version.js`, `package.json`, `sw.js` → `hokej-v88`, `README.md`, `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/prompt-dalsi-vlakno.md`.
- **Návod pro trenéry (Claude Docs) upravit:** založení plánu přes ✨ Připravit trénink; u bloku hledat režim, posty, točení a trenéry pod ⚙ Další volby.

**Beze změny**
- Pravidla databáze, data a jejich tvar, `HK.can` a matice práv, živý zápis zápasu, statistiky (tabulky se dál posouvají v `.tw`), docházka, pokladna, události, žádosti, nepřítomnost, hostující, živý trénink a stopky (jen šířka tabulky výsledků).
- Stopky: ovládání jednou rukou ověřeno – jméno hráčky je celý velký řádek, ▶ Start všech / ⏹ Stop všech přes půl šířky.
- Ověřeno: `npm test` (314/314); měření v Chromiu (Playwright) na šířce 360 px – `scrollWidth <= 360` a žádný prvek mimo obrazovku (kromě `.tw`) na záložkách 🏠, Události, Team, Statistiky, Soupeři, detail tréninku s plánem a výsledky měření, ✏️ úprava plánu (stanoviště A/B/C + brankářky, ⚔ podle postů, nový blok), ⏱ živý trénink, ⏲ stopky, nový trénink, Team → Cvičení / Platby / Pokladna / Měsíce / Rozpočet, nové cvičení, ⚙️ se všemi sekcemi; ✨ Připravit trénink zapíše jen `events/{eid}.lines` a nabídne minulý plán i nejnovější šablonu, použití šablony vyplní plán. Před opravou: detail 583 px, úprava plánu 545 px. Role manager, trenér, asistent, hráčka, stará role trenér bez `rv`: start bez chyb JavaScriptu.

## v21.4 (25. 10. 2026) – E3b: ⏲ stopky a výsledky měření, ⌚ oznámení živého tréninku (i na hodinky), čas cvičení v plánu (modul Trénink)
> **Nasazení:** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** (nová kolekce `trms` – výsledky měření, modul `treval` ve výchozí matici `permDef`; jen rozšíření, v21.3 s novými pravidly funguje beze změny; pokladny a plateb se změna netýká). 3) Nahrát soubory (nové `src/domain/stopwatch.js`, `src/views/stopwatch-view.js`, `tests/stopwatch.test.js`; nic se nemaže). 4) Na telefonech ⚙️ → 👤 Účet → Načíst novou verzi (v21.4, cache `hokej-v87` – nový service worker s obsluhou oznámení). 5) Test na Androidu: a) Team → 📚 Cvičení → cvičení s ⏲ měřením (např. ze základní sady), použít ho v plánu tréninku; b) ✏️ Upravit plán → + 👥 Společně → vybrat cvičení → **⏱ Čas** se nastaví podle banky, rychlá volba 15 → výběr jiného cvičení čas nezmění, 💾 Uložit; c) karta plánu → **⏲ Výsledky měření** → ⏲ Měřit → ▶ Start všech, klepnutím na jména zastavit, ↩ smazat poslední, + Přidat hráčku; u počtu −/+ a ✓ Zapsat; d) ⏱ Živý trénink → **⌚** (povolit oznámení) → ▶ Spustit → oznámení 60 s / 10 s před koncem kola a při točení (na telefonu i na hodinkách – v Garmin Connect povolit oznámení z Chrome), u řídícího ⏸ / ⏭ v oznámení; u měřeného cvičení na tvé lince **⏲ Stopky**; e) hráčka (👁 Náhled role): karta výsledků s pořadím, svůj řádek zvýrazněný, bez ⏲ Měřit; f) ⚙️ → 🔐 Práva rolí: nový řádek ⏲ Měření a hodnocení (asistentovi lze měření vypnout). **🔒 Vyžadovat verzi: ne** (stávající data se nemění).
> Pokud se pravidla nepublikují, karta ukáže „Výsledky se nepodařilo načíst“ a uložení pokusu skončí hláškou „Uložení se nepovedlo“; zbytek funguje. Návrat: nahrát zip v21.3 (pravidla v21.4 mohou zůstat).

**Přidáno**
- **⏲ Stopky** (`src/views/stopwatch-view.js`, okno `#tsw` přes celou obrazovku): u cvičení s měřením (`drills.meas`) – v ⏱ živém tréninku tlačítko „⏲ Stopky – cvičení“ u mé linky (hráčky skupiny v tomto kole, u Společně bez skupin všechny hráčky v poli), v kartě plánu ⏲ Měřit (hráčky linky; stanoviště = všechny hráčky v poli, linka 🥅 = brankářky). **Čas:** klepnutí na jméno = start / stop, víc hráček souběžně, ▶ Start všech / ⏹ Stop všech, velký běžící čas s desetinami, vibrace jako potvrzení; **počet a body:** −/+ (body po 0,5) nebo číslo a ✓ Zapsat. Opakované pokusy (nejvýš 20 na hráčku a linku), ⭐ nejlepší, ↩ smazat poslední pokus (druhým klepnutím), + Přidat hráčku z jiné skupiny; zavření s běžícími stopkami druhým klepnutím; Zpět zavře.
- **⏲ Výsledky měření** v kartě 📋 Plán tréninku: po měřených cvičeních pořadí (stejný výsledek = stejné místo), nejlepší výsledek a poslední pokusy; vidí celý tým kromě hostující (rozhodnutí 25. 10. 2026: měření není tajné, má motivovat), hráčka má svůj řádek zvýrazněný.
- Kolekce **`trms/{eid}`** = {v, r: {blok_linka: {d, dn, u, low, ms: {pid: [pokusy]}}}, by, at} – jeden dokument na trénink, zápis dávkou s hlubokým sloučením (jen pokusy dané hráčky na dané lince, souběžné měření na více stanovištích se nepřepisuje), kopie názvu a jednotky (hráčka banku nečte); poslech jen u otevřeného tréninku; je v záloze (načte se při stažení).
- Modul matice **`treval`** (⏲ Měření a hodnocení tréninku: číst / upravovat): Trenér a Asistent číst + měřit (měřit jde v ⚙️ → 🔐 měnit), Hráčka a Hostující nic (hodnocení a poznámky trenérů z E4 hráčka neuvidí; výsledky měření čte přes plán).
- **⌚ Oznámení živého tréninku** (tlačítko ⌚ v záhlaví obrazovky, volba v zařízení `hk-tl-ntf`, povolení systému): 60 s a 10 s před koncem kola, při točení a na konci plánu systémové oznámení s textem „co teď / co potom“ (např. „⏱ Ještě 1:00 · Střelba“ – „Teď: Stanoviště B · Střelba (2. pětka) · Potom: Stanoviště C · Přihrávky“); Android ho zrcadlí do hodinek (Garmin, Wear OS). Řídící trenér má v oznámení akce **⏸ Pauza / ▶ Pokračovat** a **⏭ Další** (service worker je předá otevřené aplikaci). Se zhasnutým telefonem aplikace tiká řidčeji – hranice se poznají i se zpožděním až 70 s (oznámení přijde později, ale přijde).
- `src/domain/stopwatch.js` – `TRMS_COLL`, `msKey`, `msVal`, `fmtVal`, `measLanes`, `laneMeas`, `swStart`, `swStop`, `swSec`, `swText`, `bestOf`, `addTry`, `dropTry`, `ranking`, `myResults`, `msMeta`, `msPatch`; `training-live.js` – `liveNote` (text oznámení), `alertsDue(…, win)` (okno pro skrytou aplikaci, při skoku jen poslední hranice).
- **📋 Plán – ⏱ čas cvičení v tomto tréninku**: u bloku rychlá volba 5 / 8 / 10 / 12 / 15 / 20 / 30 min a ↺ z banky; výběr cvičení v novém bloku převezme délku z banky (Společně = délka cvičení, Stanoviště = délka × počet kol), dokud trenér čas ručně nezmění; bloky převzaté s cvičením (uložený plán, ⧉ kopie, 📑 šablona) si čas nechají. Banka ani šablona se nemění.
- `sw.js`: obsluha klepnutí na oznámení (`notificationclick` – otevře aplikaci, akce pošle zprávou `{hk: "tl", act, eid}`).
- `firestore.rules`: `trmsOk` a `match /trms/{id}` (čte `can('trplan', 'r')`, zapisuje a maže `can('treval', 'e')`), `permDef` doplněno o `treval`.
- Testy `tests/stopwatch.test.js` (9).

**Změněno**
- `src/views/trlive-view.js` (⌚ oznámení, ⏲ Stopky u mé linky, tik skryté aplikace, akce z oznámení), `src/views/trplan-view.js` (karta výsledků, čas bloku), `src/domain/permissions.js` (`treval`), `src/data/storage.js` (`trms` v záloze), `src/core/nav.js` (Zpět zavře ⏲ stopky), `src/views/help.js`, verze `app-version.js`, `package.json`, `sw.js` → `hokej-v87`, `README.md`, `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/plan-trenink.md` (E3b hotovo, nové fáze K – komfort a G – hodinky Garmin, pořadí), `docs/prompt-dalsi-vlakno.md`.

**Kontrola kódu v21.3** (živý trénink, rozdělení do pětek): bez chyby, která by bránila nasazení. Nález: se zhasnutým telefonem upozornění vypadla (tik prohlížeče se zpomalí a hranice se nepoznala) – opraveno oknem `alertsDue(…, win)` u skryté aplikace. Odložené: odhad posunu hodin a vlastní upozornění bez otevřené aplikace vyřeší až notifikace ze serveru (N) nebo aplikace pro hodinky (G).

**Beze změny**
- Zkratky `HK.can` všech rolí (nový modul je jen v matici – srovnávací test v `stopwatch.test.js`), živý zápis zápasu, statistiky, docházka, pokladna, události, žádosti, nepřítomnost, hostující, stávající pravidla kolekcí; řízení hodin živého tréninku (`trplan e`) a jejich výpočet. Poslech `events` / `attendance` celých kolekcí (D4-8) beze změny.
- Ověřeno: `npm test` (310/310, nové `stopwatch`); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Trenér bez `rv`, Asistent, Hráčka, Pokladník (hráčka s 💰), Hostující, stará role Kustod, vývojář; bez matice i s `settings/perm` – asistent bez `treval e`, trenér bez `trplan e`): start bez chyb, sekce ⚙️, karta ⏲ Výsledky měření (pořadí se jmény, hráčka svůj řádek zvýrazněný, ⏲ Měřit jen s `treval e`, hostující kartu nevidí), stopky ▶ Start všech / ⏹ Stop všech zapíší jen `trms/e1` (sloučení, 4 hráčky jedné linky), ⏲ Stopky v živém tréninku jen u mé linky s měřením, ⌚ v záhlaví, plán – výběr cvičení převezme 12 min z banky, rychlá volba 15, další výběr čas nezmění, uložení jen `trplan/e1`; Kustod bez přístupu.

## v21.3 (25. 10. 2026) – E3: ⏱ živý trénink, rozdělení do pětek s výběrem způsobu, ⭐ výkonnost, bloky podle postů (modul Trénink)
> **Nasazení:** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** (nové kolekce `trlive` – hodiny živého tréninku a `plevel` – výkonnost hráček; jen rozšíření, v21.2 s novými pravidly funguje beze změny). 3) Nahrát soubory (nic se nemaže). 4) Na telefonech ⚙️ → 👤 Účet → Načíst novou verzi (v21.3, cache `hokej-v86`). 5) **Po otestování na všech zařízeních nastavit 🔒 Vyžadovat verzi v21.3** – v21.2 by při uložení plánu zahodila u bloků volbu „podle postů“ (`by`).
> Pokud se pravidla nepublikují, ⏱ živý trénink ukáže „Načítám hodiny…“ a spuštění skončí hláškou „Uložení se nepovedlo“, ⭐ výkonnost ukáže, že se nenačetla; zbytek funguje. Návrat: nahrát zip v21.2 (pravidla v21.3 mohou zůstat).

**Přidáno**
- **⏱ Živý trénink** (`src/views/trlive-view.js`): tlačítko a stav (🔴 běží / ⏸ / skončil) v kartě 📋 Plán tréninku; obrazovka přes celý telefon s velkým odpočtem kola (oranžově pod 60 s, červeně pod 10 s), blokem, kolem točení, časem od začátku a koncem plánu. **📍 Moje stanoviště**: trenér své linky (cvičení, pomůcky, kus popisu, skupiny v tomto kole a jména hráček), hráčka linku své skupiny (pětka nebo post, brankářka 🥅), ostatní linky pod rozbalením; „Za m:ss →“ další kolo / blok a moje linka v něm. Ovládání (kdo smí upravovat plán – `trplan e`): ▶ Spustit, ⏸ Pauza / ▶ Pokračovat, ⏮ / ⏭ na začátek kola nebo bloku, +1 / +5 min, ⏹ Konec (druhým klepnutím), ↺ znovu od začátku; řízení jiného trenéra se převezme druhým klepnutím. 60 s a 10 s před koncem kola vibrace + pípnutí, při točení dlouhé pípnutí (🔔 / 🔕), obrazovka nezhasíná (Wake Lock, obnoví se po návratu do aplikace). ✕ Zavřít / Zpět obrazovku zavře, hodiny běží dál.
- Kolekce **`trlive/{eid}`** = {v, st (run / pause / end), e0, wAt, sAt (čas serveru), ctl, by, at} – zapisuje se jen při ovládání; čas se počítá z času serveru, posun hodin telefonu se dorovná odhadem z čerstvých změn (uloží se v zařízení, `hk-clk`). Poslech jen u otevřeného tréninku.
- `src/domain/training-live.js` – `tsMs`, `liveSec`, `skewObs`, `skewNext`, `liveAt`, `stops`, `stepSec`, `blockStart`, `liveCtl`, `alertsDue`, `mmss`, `playerGroup`, `groupPids`, `coachLanes`.
- **Rozdělení do pětek s výběrem způsobu** (`src/views/line-split-view.js`, `src/domain/line-split.js`): ⚖ Vyrovnaně (každá pětka podobně silná), 📶 Podle výkonnosti (nejsilnější spolu v 1. pětce), 🔀 Střídavě (pořadí soupisky), 📋 Základní formace (ostatní přihlášené se doplní vyrovnaně); počet pětek 2 / 3 / 4 a ⚔ Poměr útok / obrana; volba se pamatuje v zařízení (`hk-split`). ↻ Rozdělit přepíše jen hráčky (už rozdělené druhým klepnutím), realizační tým zůstane; souhrn pětek (počet, Ú / O, u realizačního týmu průměr ⭐).
- **⭐ Výkonnost hráček 1–5** (kolekce **`plevel/team`** = {v, lv: {pid: 1–5}, by, at}, jen realizační tým – hráčky ji nečtou): okno ⭐ Výkonnost v Rozdělení do pětek (přihlášené nahoře, pak ostatní), klepnutí ukládá hned, opakované klepnutí hodnocení zruší (pak ⭐3). Je v záloze (načte se při stažení).
- **Bloky plánu podle postů**: u každého bloku Skupiny 🎽 Pětky / ⚔ Útok / obrana (`blocks[].by = "pos"`, skupiny `"F"` ⚔ útočnice, `"D"` 🛡 obránkyně, `"G"` 🥅); točení stanovišť, kontrola plánu, „Tvoje skupina“, rozpis, ⧉ kopie plánu i 📊 pokrytí dovedností počítají s posty.
- `training-plan.js`: `FW`, `DF`, `POS_GRPS`, `BY`, `isPosBlock`, `posGrp`, `posGroups`, `groupsFor`, `groupIn`; `blockBlank(mode, groups, by)`.
- `S.db.doc().merge` / dávka: hodnota `"__now"` = čas serveru (`serverTimestamp`).
- `firestore.rules`: `trliveOk` a `match /trlive/{id}` (čte `can('trplan', 'r')`, zapisuje a maže `can('trplan', 'e')`, `sAt == request.time`, `ctl == mail()`), `plevelOk` a `match /plevel/{id}` (čte a zapisuje `isStaff`, maže `isRoster`).
- Testy `tests/line-split.test.js` (10) a `tests/training-live.test.js` (10).

**Změněno**
- Rozdělení do pětek: místo „↻ Podle základní formace“ a „⚖ Vyrovnaně do 2 / 3 / 4“ panel Rozdělit automaticky (základní formace i střídavé rozdělení v něm zůstávají).
- `planCopy(src, groups, coaches, drills, pgroups)`, `groupSkills(plan, g, drills, pg)`, `skillCoverage({…, pos})`, `planIssues` zná `ctx.pgroups`.
- `src/views/events.js` (napojení panelu), `src/views/trplan-view.js` (posty, ⏱), `src/views/trplan-reuse.js`, `src/core/nav.js` (Zpět zavře ⏱ a ⭐), `src/core/state.js` (`S.plv`, `S.plvErr`, `S.plvo`, `S.lsp`, `S.tl`), `src/data/storage.js` (`trlive`, `plevel`, `"__now"`), `tests/support/firebase-stub.mjs` (`serverTimestamp`), `src/views/help.js`, README, KONVENCE, plány.

**Beze změny**
- Zkratky `HK.can` a matice práv (nový modul nevzniká – řízení hodin je `trplan e`, výkonnost `sport`), živý zápis zápasu, statistiky, docházka, pokladna, události, žádosti, nepřítomnost, hostující, stávající pravidla kolekcí. Poslech `events` / `attendance` celých kolekcí (D4-8) beze změny. `evenLines` zůstává v doméně (testy).
- Ověřeno: `npm test` (301/301, nové `line-split` a `training-live`); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Trenér bez `rv`, Asistent, Asistent s maticí bez `trplan e`, Hráčka útočnice, Hráčka obránkyně s 💰, Brankářka, Hostující, stará role Kustod, vývojář): start bez chyb, ⚙️ sekce, detail tréninku (panel rozdělení a ⭐ jen realizační tým, zápis `events/e1` a `plevel/team`), karta plánu s ⏱, obrazovka živého tréninku (Moje stanoviště trenéra, obránkyně i brankářky v bloku podle postů, co následuje), ovládání jen s `trplan e` (převzetí řízení druhým klepnutím, zápis `trlive/e1` s časem serveru), úprava plánu – přepnutí bloku na posty a uložení; hostující kartu plánu nevidí.

## v21.2 (25. 10. 2026) – E2b: 📥 základní sada a 📄 import cvičení, ⧉ kopie a 📑 šablony plánu, 📊 pokrytí dovedností (modul Trénink)
> **Nasazení:** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** (nová kolekce `trtpl` – šablony plánu; jen rozšíření, v21.1 s novými pravidly funguje beze změny; ⚠️ soubor pravidel – pokladny a plateb se změna netýká). 3) Nahrát kód (nové soubory `src/config/drill-starter.js`, `src/domain/drill-import.js`, `src/domain/plan-reuse.js`, `src/domain/skill-coverage.js`, `src/views/drill-import-view.js`, `src/views/trplan-reuse.js`, `tests/drill-import.test.js`, `tests/plan-reuse.test.js`; nic se nemaže). 4) Na zařízeních ⚙️ → 👤 Účet → Načíst novou verzi, ověřit v21.2. 5) Test na Androidu: a) Team → 📚 Cvičení → **📥 Základní sada** → zkontrolovat seznam (🏒 Hráčky / 🥅 Brankářky, Vše / Nic) → 💾 Přidat vybraná → cvičení jsou v bance; znovu 📥 = všechna označená „už v bance“ a nezaškrtnutá; b) **📄 Import z tabulky** → ⬇️ Stáhnout vzor → otevřít v Excelu / Google Tabulkách, přidat řádek, uložit jako CSV → nahrát → seznam s chybami řádků → přidat; c) trénink → 📋 Plán → ✏️ Upravit → **⧉ Z předchozího tréninku** → Použít (skupiny stanovišť podle pětek tohoto tréninku) → 💾 Uložit plán; **💾 Uložit jako šablonu** (název) → u jiného tréninku **📑 Ze šablony** → Použít, 🗑 smazat šablonu; d) karta plánu i úprava → **📊 Pokrytí dovedností** → 14 / 30 / 60 dní, klepnutí na dovednost = kdo netrénoval; e) 📚 Cvičení → vyřadit cvičení použité v plánu → detail ukáže „Používá ho … – smazat nejde“; nepoužité vyřazené → 🗑 Smazat (i s obrázky); f) hráčka (👁 Náhled role): plán vidí jako dřív, bez 📊 a bez tlačítek úprav. **🔒 Vyžadovat verzi: ne** (stávající data se nemění).
> Pokud se pravidla nepublikují, 📑 šablony ukážou „Šablony se nepodařilo načíst“ a uložení šablony skončí hláškou „Uložení se nepovedlo“; zbytek (sada, import, kopie, pokrytí) funguje. Návrat: nahrát zip v21.1 (pravidla v21.2 mohou zůstat).

**Přidáno**
- **📥 Základní sada cvičení** (Team → 📚 Cvičení, kdo smí cvičení zakládat – `drills e`): 39 připravených cvičení – 29 pro hráčky (rozbruslení, bruslení, puk, přihrávky, střelba, souboje a bránění, hra v malém prostoru, herní situace, závěr, mimo led) a 10 pro brankářky (šoupání a T-push, posuny, butterfly, úhly, chytání, odrazy, hokejka, pokrytí puku, posun po přihrávce, reakce mimo led); kategorie, dovednosti, úroveň, délka, skupiny, pomůcky, popis, u 3 cvičení ⏲ měření. Výběr se zaškrtávátky po skupinách (Vše / Nic), cvičení se stejným názvem jako v bance (i vyřazené, bez ohledu na diakritiku) se nezaškrtne – sadu jde použít opakovaně. Zápis v jedné dávce. `src/config/drill-starter.js`.
- **📄 Import cvičení z tabulky CSV**: ⬇️ vzor tabulky (Název, Kategorie, Dovednosti, Úroveň, Délka, Skupiny, Pomůcky, Popis, Video, PDF, Měření), soubor z Excelu (středník, Windows-1250 i UTF-8) nebo Google Tabulek (čárka), hodnoty jako popisky („Střelba, Ovládání puku“, „Střední“, „Stanoviště“, „čas“) i klíče; nejvýš 200 řádků; před přidáním seznam s chybami po řádcích (neznámá kategorie / dovednost / skupina / úroveň / měření, délka, odkazy) a označením shody s bankou.
- `src/domain/drill-import.js` (`starterItems`, `whoOf`, `nameKey`, `dictKey`, `csvRows`, `csvHeader`, `rowDrill`, `csvDrills`, `importPick`, `csvSample`), `src/views/drill-import-view.js` (stav `S.dri`).
- **⧉ Z předchozího tréninku** (úprava plánu, `trplan e`): posledních 12 nezrušených tréninků před tímto, nabídnou se jen ty s plánem (plány se čtou po jednom dokumentu, ne celá kolekce); použití převezme bloky, délky, točení a cvičení, skupiny stanovišť rozdělí podle pětek tohoto tréninku (🥅 linka zůstane), trenéry ponechá jen přihlášené; s rozpracovaným plánem druhým klepnutím; uloží se až 💾 Uložit plán.
- **📑 Šablony plánu** (kolekce **`trtpl/{id}`** = {v, name, goal, blocks, by, at}, sdílené pro tým, nejvýš 50): 💾 Uložit jako šablonu (bez trenérů a bez skupin stanovišť), 📑 Ze šablony → Použít, 🗑 smazat (druhým klepnutím). Čte a spravuje, kdo smí upravovat plán.
- **📊 Pokrytí dovedností** (karta plánu i úprava, jen realizační tým): pro hráčky přihlášené na trénink za posledních 14 / 30 / 60 dní – kolik z nich mělo dovednost v plánu tréninku, na kterém byly (✅ Jdu bez 🚫; podle jejich skupiny a rozpisu točení), pruh a podíl, pod 50 % zvýrazněné, klepnutí = kdo netrénoval a průměr minut; 🧤 jen u brankářek; hráčky bez tréninku s plánem v období zvlášť. Plány se čtou jen pro tréninky v období.
- `src/domain/plan-reuse.js` (`planCopy`, `tplDoc`, `tplError`, `tplSort`, `planSummary`, `copySources`), `src/domain/skill-coverage.js` (`addDays`, `coverWindow`, `groupSkills`, `skillCoverage`), `src/views/trplan-reuse.js` (stav `S.tpr`, `S.tcv`).
- `S.db.collection(c).getAll()` – jednorázové čtení celé kolekce (šablony, kontrola použití cvičení).
- `firestore.rules`: `trtplOk` a `match /trtpl/{id}` (čte, zapisuje a maže `can('trplan', 'e')`).
- Testy `tests/drill-import.test.js` (13) a `tests/plan-reuse.test.js` (10).

**Změněno**
- **🗑 Smazat vyřazené cvičení** jen, když ho nepoužívá žádný plán tréninku ani šablona (`drillUsage` nad `trplan` a `trtpl`, načte se při otevření vyřazeného cvičení); jinak „Používá ho N plánů – smazat nejde“. Smazání v jedné dávce odstraní i obrázky cvičení (`drillimg`) – odložená drobnost 9 vyřešena pro obrázky.
- Prázdná banka u trenéra radí 📥 Základní sadu.
- Záloha (⚙️ → 💾 Data) obsahuje i šablony plánu (`trtpl`, načtou se při stažení); obnova je jen doplní.
- `src/views/drills-view.js`, `src/views/trplan-view.js` (napojení ⧉ / 📑 / 📊), `src/data/storage.js` (`getAll`, záloha `trtpl`), `src/core/state.js` (`S.tpr`, `S.tcv`, `S.dri`, `S.dru`), `src/views/help.js` (sada, import, kopie, šablony, pokrytí, rychlý přehled), verze `app-version.js`, `package.json`, `sw.js` → `hokej-v85`, `README.md`, `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/plan-trenink.md`, `docs/prompt-dalsi-vlakno.md`.

**Beze změny**
- Zkratky `HK.can` a matice práv všech rolí (nový modul nevzniká – šablony patří pod `trplan`), živý zápis, statistiky, docházka, pokladna, události, žádosti, nepřítomnost, hostující, stávající pravidla kolekcí. Poslech `events` / `attendance` celých kolekcí (D4-8) se nemění. Plán tréninku pro hráčku beze změny.
- Ověřeno: `npm test` (281/281, nové `drill-import` a `plan-reuse`); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Trenér bez `rv`, Asistent, Hráčka, Brankářka, Pokladník (hráčka s 💰), Hostující, stará role Kustod, vývojář; bez matice i s `settings/perm` – trenér bez `trplan e`, asistent bez `drills e`): start bez chyb, sekce ⚙️, 📥 sada (39 položek) a 📄 CSV (UTF-8 i Windows-1250, řádek s chybou nejde vybrat) zapíší jen `drills`, 🗑 nepoužitého vyřazeného cvičení smaže `drills` + `drillimg`, použité smazat nejde, ⧉ kopie z předchozího tréninku (skupiny podle nových pětek, jen přihlášený trenér), 💾 šablona zapíše jen `trtpl`, 📑 seznam šablon, 💾 plán zapíše jen `trplan/e3`, 📊 pokrytí v kartě i úpravě jen u realizačního týmu; hráčka a brankářka plán jen čtou, hostující kartu nevidí, Kustod bez přístupu.

## v21.1 (25. 10. 2026) – E2a: 📋 plán tréninku, 📷 obrázky cvičení (modul Trénink)
> **Nasazení (pořadí je důležité):** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** (nové kolekce `trplan` a `drillimg`, modul `trplan` v matici, `drills` smí mít pole `pdf` a `img` – jen rozšíření, v21.0 s novými pravidly funguje beze změny). 3) Nahrát kód (nové soubory `src/domain/training-plan.js`, `src/views/trplan-view.js`, `src/views/drill-media.js`, `tests/training-plan.test.js`; nic se nemaže). 4) Na zařízeních ⚙️ → 👤 Účet → Načíst novou verzi, ověřit v21.1. 5) Test na Androidu: a) Team → 📚 Cvičení → ✏️ Upravit → 📷 přidat fotku (z galerie i fotoaparátu) a 📄 odkaz na PDF → Uložit → v detailu náhled, klepnutí = celá obrazovka, klepnutí na obrázek = zvětšení, Zpět zavře; b) Události → trénink → ⚖ Vyrovnaně do 2 / 3 / 4 pětek; c) karta **📋 Plán tréninku** → ➕ Vytvořit plán → + 👥 Společně a + 🔄 Stanoviště, cvičení, trenér, skupiny, délka −/+, točení → 💾 Uložit; karta ukáže časy a rozpis točení, ⛔ / ⚠️ upozornění; d) hráčka (👁 Náhled role nebo testovací účet): plán vidí, svou skupinu zvýrazněnou, cvičení s obrázkem otevře, upravit nemůže; e) ⚙️ → 👤 Účet: u managera 🔒 Vyžadovat verzi pod Načíst novou verzi, sekce 🔒 Aplikace už není; f) Událost zápasu → 📋 Zápis utkání → Průběh (góly a tresty) se stavem skóre. **🔒 Vyžadovat verzi: ne** (stávající data se nemění; starší verze pole `img` / `pdf` cvičení při úpravě zachová – zapisuje přes merge).
> Pokud se pravidla nepublikují, karta plánu ukáže „Plán se nepodařilo načíst“, uložení obrázku a plánu skončí hláškou „Uložení se nepovedlo“ a zbytek aplikace běží. Návrat: nahrát zip v21.0 (pravidla v21.1 mohou zůstat).

**Přidáno**
- **📋 Plán tréninku** (`src/views/trplan-view.js`): karta pod Rozdělením do pětek v detailu tréninku (ne u zrušeného tréninku a ne pro hostující). Úprava na celé stránce (← Zpět k tréninku, s neuloženými změnami druhým klepnutím; Zpět na telefonu stejně): 🎯 téma, bloky **👥 Společně** (celý tým, volitelně souběžná linka brankářek) a **🔄 Stanoviště** (2–4 linky, skupiny se točí), ↑ ↓ 🗑, délka −/+ (1–90 min), točení automaticky (kolik stanovišť, tolik kol) nebo po N min, u linky cvičení z banky (podle kategorií), trenér(ka) z přihlášeného realizačního týmu, skupiny (pětky 1–4 a 🥅; skupina je v bloku jen na jedné lince), náhled rozpisu točení, 💾 Uložit, 🗑 Smazat plán (druhým klepnutím). Karta: časy bloků od začátku tréninku, linky s trenéry a skupinami, tabulka točení (kolo × stanoviště A–D), trenér vidí svá stanoviště ⭐ / zvýrazněná, hráčka „Tvoje skupina“ a svou skupinu zvýrazněnou, ⛔ / ⚠️ upozornění jen pro realizační tým. Klepnutí na cvičení = okno s obrázky, popisem, pomůckami, videem a PDF (hráčka vidí název a obrázky).
- `src/domain/training-plan.js` – `planGroups`, `evenLines`, `blockBlank`, `laneBlank`, `planBlank`, `planDoc`, `moveBlock`, `drillUsage`, `hm2min`, `clock`, `planTimes`, `planMinutes`, `rotation`, `planIssues` (přetečení přes konec, nenaplánovaný čas, linka bez cvičení, vyřazené / smazané cvičení, stejný trenér na dvou linkách, skupina na dvou linkách, pětka bez stanoviště, méně kol než stanovišť, nepřihlášený trenér, linka brankářek bez brankářky), `myGroup`, `laneOf`; `tests/training-plan.test.js` (doména, obrázky, výchozí práva, srovnání zkratek `HK.can`, pravidla).
- Kolekce **`trplan/{eid}`** = {v, goal, blocks [{id, mode, dur, rot, lanes [{id, drill, dn, di, co, grp}]}], by, at} – kopie názvu a obrázků cvičení (`dn`, `di`), aby plán viděla i hráčka bez banky; poslech jen otevřeného tréninku.
- Modul matice **`trplan`** (📋 Plán tréninku: číst / upravovat): Trenér a Asistent číst + upravovat (upravovat jde v ⚙️ → 🔐 měnit), Hráčka jen číst (pevně), Hostující nic.
- **📷 Obrázky u cvičení** (`src/views/drill-media.js`, kolekce **`drillimg/{id}`**): nejvýš 3 na cvičení, zmenšené v zařízení (1280 px, JPEG, do ~500 kB, obvykle ~200 kB), ukládají se spolu s cvičením v jedné dávce, odebrané se smažou; čtou se jednorázově až u otevřeného cvičení a pak i offline; prohlížeč přes celou obrazovku (‹ › mezi obrázky, klepnutí = zvětšení 2×, ✕ / Zpět). **📄 Odkaz na PDF** (pole `pdf`, např. sdílený soubor z Google Disku). Kopie cvičení obrázky nepřebírá (patří původnímu).
- **⚖ Vyrovnaně do 2 / 3 / 4 pětek** v Rozdělení do pětek (přihlášené hráčky střídavě v pořadí soupisky; realizační tým zůstane).
- `firestore.rules`: `trplanOk` a `match /trplan/{id}` podle `can('trplan', …)`, `imgOk` a `match /drillimg/{id}` (čte `isTeam`, zapisuje `can('drills', 'e')`), `drillOk` zná `pdf` a `img` (nejvýš 3), `permDef` doplněno o `trplan`.
- `S.db.doc(cesta).get()` – jednorázové čtení dokumentu (i z offline paměti).

**Změněno**
- ⚙️ **🔒 Vyžadovat verzi** je nově v kartě 👤 Účet pod Načíst novou verzi (jen manager, stále potvrzení druhým klepnutím); sekce 🔒 Aplikace zrušena, minimální verzi vidí v Účtu všichni. Práva a zápis brány verze beze změny.
- **📋 Zápis utkání → Průběh (góly a tresty):** u každého gólu stav skóre (naše : soupeř, `goalScores`) – stejně jako v detailu zápasu krok 3; týká se i uzavřených zápasů.
- Záloha (⚙️ → 💾 Data) obsahuje i plány tréninků a obrázky cvičení (načtou se při stažení, jen manager / trenér / asistent); obnova je jen doplní / přepíše, nemaže. `HK.exportJSON` je asynchronní (test `privacy.test.js` na ni čeká).
- `src/views/drills-view.js` (📷, 📄, uložení v dávce), `src/views/events.js` (karta plánu, ⚖, Zpět zavře i plán), `src/views/report.js`, `src/views/settings-view.js`, `src/core/nav.js` (Zpět zavře prohlížeč obrázku `#imv`, okno cvičení `#tpd` a úpravu plánu `#tpx`), `src/core/state.js` (`S.tp`, `S.tpErr`, `S.tpe`, `S.tpv`), `src/domain/drills.js` (`DRILLIMG_COLL`, `IMG_MAX`, `imgFit`, `imgDoc`, `imgChanges`, pole `pdf`, `img`), `src/domain/permissions.js`, `src/data/storage.js`.
- `src/views/help.js` (📋 plán, 📷 obrázky, ⚖, brána verze v Účtu, rychlý přehled), verze `app-version.js`, `package.json`, `sw.js` → `hokej-v84`, `README.md`, `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/plan-trenink.md` (E2 rozděleno na v21.1 E2a a v21.2 E2b, další fáze o číslo dál), `docs/prompt-dalsi-vlakno.md`.

**Beze změny**
- Zkratky `HK.can` všech rolí (srovnávací testy `perm-matrix`, `rules-narrow`, `drills`, `training-plan`), živý zápis, výpočet skóre, statistiky, docházka, pokladna, události, žádosti, nepřítomnost, hostující, stávající pravidla kolekcí. Poslech `events` / `attendance` celých kolekcí (D4-8) se nemění.
- Ověřeno: `npm test` (258/258); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Trenér bez `rv`, Asistent, Hráčka, Hráčka bez plánu, Brankářka, Pokladník (hráčka s 💰), Hostující, stará role Kustod, vývojář; bez matice i s `settings/perm` – trenér a asistent bez `trplan e`, asistent bez `drills e`): start bez chyb, sekce ⚙️ bez 🔒 Aplikace, 🔒 Vyžadovat verzi jen u managera / vývojáře, karta plánu u všech kromě hostující, ➕ Vytvořit / ✏️ Upravit jen s `trplan e`, úprava (+ Stanoviště, cvičení, trenér, rozpis točení) a 💾 zapíše jen `trplan/e1`, hráčka a brankářka „Tvoje skupina“, okno cvičení s obrázkem a prohlížeč, ⚖ zapíše jen `events`, banka cvičení s náhledem obrázku, odkazem PDF a formulářem 📷 / 📄.

## v21.0 (25. 10. 2026) – E1: 📚 banka cvičení (modul Trénink)
> **Nasazení (pořadí je důležité):** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** (nová kolekce `drills` a modul `drills` v matici – jen rozšíření, stará verze aplikace s novými pravidly funguje beze změny). 3) Nahrát kód (nové soubory `src/config/skills.js`, `src/domain/drills.js`, `src/views/drills-view.js`, `tests/drills.test.js`; nic se nemaže). 4) Na zařízeních ⚙️ → 👤 Účet → Načíst novou verzi, ověřit v21.0. 5) Test: Team → přepínač **📚 Cvičení** (manager, trenér, asistent): ➕ Nové cvičení, uložení, hledání a filtry, ⭐ oblíbené, ✏️ Upravit, ⧉ Kopie, 🗄 Vyřadit → filtr 🗄 Vyřazená → ↩ Vrátit / 🗑 Smazat (asistent bez 🗑); hráčka přepínač nevidí; ⚙️ → 🔐 Práva rolí – nový řádek 📚 Banka cvičení. **🔒 Vyžadovat verzi: ne** (stávající data se nemění, jen nová kolekce).
> Pokud se pravidla nepublikují, 📚 Cvičení ukáže hlášku „Banku cvičení se nepodařilo načíst“ a zbytek aplikace běží. Návrat: nahrát zip v20.7.1 (pravidla v21.0 mohou zůstat).

**Přidáno**
- **📚 Banka cvičení** v záložce Team (přepínač Team | 📚 Cvičení | pokladna …; `src/views/drills-view.js`): seznam aktivních cvičení s hledáním (název, pomůcky, popis – bez diakritiky), filtr kategorie / dovednost / úroveň / ⭐ jen oblíbená / 🗄 vyřazená (s počty), detail klepnutím (dovednosti, vhodné pro, pomůcky, ⏲ měření, popis, ▶ odkaz na video, kdo a kdy upravil), formulář ➕ Nové / ✏️ Upravit (název, kategorie, dovednosti, úroveň, vhodné pro, délka 1–60 min, pomůcky, popis, odkaz, měření pro stopky – jednotka a „nižší je lepší“), ⧉ Kopie, 🗄 Vyřadit / ↩ Vrátit, 🗑 Smazat jen vyřazené (druhým klepnutím). ⭐ oblíbená jsou osobní a pamatují se v zařízení.
- `src/config/skills.js` – kategorie (část tréninku), 11 dovedností, úrovně, vhodné skupiny, jednotky měření.
- `src/domain/drills.js` – `drillError`, `drillDoc`, `drillBlank`, `drillFilter`, `drillCounts`, `drillCopy`, `drillCanDelete`, `fold`; `tests/drills.test.js` (doména, výchozí práva, srovnání zkratek `HK.can`, pravidla).
- Kolekce **`drills/{id}`** = {name, cat, sk, lvl, dur, grp, eq, desc, url, meas, by, at, arch}; poslech v `main.js` jen s právem číst, v záloze (`storage.js` COLL).
- Modul matice **`drills`** (📚 Banka cvičení: číst / upravovat / mazat): výchozí Trenér vše, Asistent číst + upravovat, Hráčka nic; v ⚙️ → 🔐 jde měnit upravovat a mazat u Trenéra a Asistenta (číst je pevné).
- `firestore.rules`: `drillOk` (jen známá pole, název 1–80 znaků, délka 1–60 min) a `match /drills/{id}` podle `can('drills', …)`, `permDef` doplněno o `drills`.

**Změněno**
- `src/views/team.js` – přepínač režimů se ukáže, když má uživatel víc než jeden režim (📚 Cvičení a / nebo pokladna); `src/core/state.js` (`S.dr`, `S.drf`, `S.dre`, `S.dro`, `S.drErr`), `src/domain/permissions.js`, `src/data/storage.js`, `src/main.js`.
- `src/views/help.js` (Team → 📚 Cvičení, rychlý přehled), verze `app-version.js`, `package.json`, `sw.js` → `hokej-v83`, `README.md`, `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/plan-trenink.md`, `docs/prompt-dalsi-vlakno.md`.

**Beze změny**
- Zkratky `HK.can` všech rolí (srovnávací testy `perm-matrix`, `rules-narrow`, `drills`), živý zápis, statistiky, docházka, pokladna, události, žádosti, nepřítomnost, hostující, stávající pravidla kolekcí.
- Ověřeno: `npm test` (244/244); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Trenér bez `rv`, Asistent, Hráčka s 💰 i bez, Hostující, stará role Kustod, vývojář; bez matice i s `settings/perm`): start bez chyb, přepínač 📚 Cvičení jen u rolí s právem číst, ➕ Nové zapíše jen `drills/…` se známými poli, 🗑 Smazat jen u vyřazeného a jen s právem mazat (asistent bez, s maticí ano), trenér s maticí bez úprav nevidí ➕ ani ✏️; sekce ⚙️ stejné jako ve v20.7.1.
