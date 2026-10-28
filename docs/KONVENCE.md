# Konvence projektu HockeyCoach (programovací řád)

Vstup pro každou úpravu: nejdřív `docs/STAV.md` a tento soubor, pak jen soubory, kterých se úprava týká. Co tu není, řeší stávající kód – piš stejně jako sousední kód.
Role a pravidla pro Claude jsou v pokynech projektu claude.ai „HockeyCoach“ (samostatná šablona zadání už není potřeba); jak se podle nich pracuje v repozitáři: kap. 0.

## 0. Práce s Claude (od v22.17)
**Start vlákna (šetři limit):**
1. Aktualizovat z repozitáře: `git clone --depth 1 -b beta` (pokračuje se vždy od větve `beta`). **Vypsat načtenou verzi** (`src/core/app-version.js` → `APP_VERSION`) a porovnat se `docs/STAV.md`.
2. `npm test` (Node 22+) musí být zelený ještě před prací, jinak to nejdřív ohlásit. `npm install` jen pro kouřový test.
3. Přečíst jen `docs/STAV.md` a tento soubor; k úkolu cíleně kapitolu `docs/plan.md` a poslední záznam `CHANGELOG.md`. Kód cíleně (`grep -n`, výřezy), nic dvakrát, žádní subagenti.
4. Výsledek ručního testu verzí „k testu“ ze `STAV.md` – zeptat se jednou krátkou otázkou, pokud ho uživatel nenapíše. Nález = oprava (vX.Y.Z) dřív než nová funkce.

**Zápis a vydání:**
1. Změny zapisuje Claude **přímo do větve `beta`** – **jedna verze = jeden commit** se zprávou `vX.Y – název`. Do `main` nikdy (chráněná); vydání dělá uživatel přes PR `beta → main`. Návrat = revert commitu. Žádné ZIP ani úpravy NAJDI / NAHRAĎ.
2. Soubory celé, **bez zkracování** (`// ... zbytek kódu ...` je zakázané), struktura podle kap. 2, stručné české komentáře.
3. **Před změnou `firestore.rules` nebo dat (migrace, nové pole s `hasOnly`) se zeptat** – nejde vrátit přes Git. Data jen přidávat; pravidla rozšířit → převést → zúžit; stará pole mazat až o verzi později.
4. Neměnit funkční logiku, která s úkolem nesouvisí (živý zápis, střely, góly, časomíra, pokladna…). Vyžaduje-li úkol zásah jinde, nejdřív upozornit a zeptat se.
5. Každá verze: vše z kap. 4 najednou (verze, cache, CHANGELOG, README, STAV, plan, testy-rucni, help). U verze uvést, zda **publikovat firestore.rules** a zda nastavit **🔒 Vyžadovat verzi** (jen ve stabilní).
6. Před commitem `npm test` zelený a `npm run smoke` bez chyb; co bylo ověřeno, patří do CHANGELOG.

**Šetření:** kreditů Claude (cílené čtení, testy s filtrem `grep -E "^not ok|^# (pass|fail)"`, ptát se jen na kritická rozhodnutí, drobnosti přidávat k nejbližší větší verzi) i **čtení databáze** (kap. 3, 📉). Odpověď na konci krátce: načtená verze → nová verze, commit, postup nasazení v pár bodech, výsledek testů.

## 1. Mapa souborů
Směr importů: `config` → `core` → `domain` → `views` → `main`. Podrobnosti o funkcích jsou v hlavičce a v komentářích každého souboru.

| Soubor | Co tam je |
|---|---|
| `index.html`, `manifest.webmanifest` | vstupní stránka, instalace na plochu |
| `sw.js` | offline cache `hokej-vNN` (beta `hokej-beta-vNN`, kanál podle adresy), klepnutí na ⌚ oznámení živého tréninku |
| `.github/workflows/pages.yml` | 🧪 nasazení na GitHub Pages: větev `main` do kořene, `beta` do `beta/` |
| `styles/main.css` | všechny styly, barvy jako proměnné (`--ac`, `--ok`, `--no`, `--wa`, `--a2`) pro světlý i tmavý režim |
| `firestore.rules` | pravidla databáze – jediná skutečná ochrana dat (publikuje se ručně) |
| `src/main.js` | spuštění: přihlášení, poslech kolekcí podle role, první vykreslení, Zpět |
| `src/debug.js` | ruční ladění (`?debug` → `window.__hk`) |
| `src/lib/qrcode.js` | cizí knihovna QR – neupravovat |
| **config/** | konstanty bez logiky |
| `constants.js` | pozice, rozložení, tresty, funkce realizačního týmu `KIND` |
| `team-config.js` | `TEAM_NAME`, `APP_NAME`, `DEV_EMAILS` |
| `skills.js` | číselníky banky cvičení (kategorie, dovednosti, úrovně, skupiny, jednotky měření) |
| `drill-starter.js` | 📥 základní sada cvičení |
| **core/** | stav a pomůcky bez domény |
| `app-version.js` | **jediné místo s číslem verze** (`APP_VERSION`, `APP_DATE`), brána verze |
| `channel.js` | 🧪 kanál stabilní / beta podle adresy, cesty pro přepnutí, předpona cache |
| `state.js` | sdílený stav `S` |
| `utils.js` | DOM, formát, čas, hlášky, `csv`, `clone`, `clamp`, `ceil` (Kč nahoru), `reqWord` |
| `selectors.js` | čtení stavu, jména `pn` / `nm`, `kindOf`, `matchesVs` |
| `actions.js` | ukládání zápasu, potvrzení `confirm2` / `armed` |
| `drag.js` | přetahování `makeDrag` |
| `nav.js` | systémové Zpět uvnitř aplikace |
| `table-sort.js` | řazení tabulek |
| **data/** | |
| `storage.js` | Firebase, přihlášení a role, **oprávnění `HK.can` / `HK.perm`**, náhled role, strážce zápisu `blocked()`, poslech, zápisy a dávky, kontext `C` pro moduly níže |
| `cfg-api.js` | rozhraní okna ⚙️ `HK.cfg` (účet, členové, náhled role, brána verze, matice práv) – `cfgApi(C)` |
| `backup.js` | záloha JSON, CSV soupisky, obnova ze zálohy – `backupApi(C)` |
| `firebase-config.js` | nastavení projektu Firebase |
| **domain/** | čisté funkce bez DOM, testované v `tests/` |
| `permissions.js` | role, matice práv `DEFAULT_PERMS`, `MODULES`, `EDITABLE`, `actOf`, `keepsManager` |
| `private-data.js` | citlivá data v `attnote`, `staffpay`, `plpay`; obnova staré zálohy `splitLegacy` |
| `live-engine.js` | jádro živého zápisu (čas, střídání, tresty IIHF, jednotky) |
| `lineup.js`, `corrections.js`, `shift-edit.js`, `timeline.js` | sestava zápasu, opravy zápisu, editace střídání, časová osa a skóre po gólech |
| `player-stats.js` | statistiky hráček `playerStats` (zápas i souhrn) |
| `watch-feed.js` | 👁 náhled živého zápasu pro členy |
| `event-helpers.js` | řazení událostí `sortEvents`, pětky tréninku, `selfMember` (za koho se účet hlásí) |
| `event-prefill.js` | 🖐 předvyplnění nového tréninku / zápasu z posledního stejného druhu, poslední důvody omluv |
| `event-time.js`, `event-cancel.js`, `recurrence.js` | konec a ⏰ sraz události, zrušení / smazání, série tréninků |
| `attendance.js`, `debtors.js` | docházka a 🚫 nedorazila, veřejný souhrn dlužníků |
| `att-log.js` | 🕘 historie přihlášek (záznam `attlog`, časová osa události, kdo zapsal) |
| `beta.js` | 🧪 beta testeři `settings/beta`, nabídka bety |
| `absence.js`, `att-requests.js`, `requests.js`, `join-requests.js` | 🏖 nepřítomnost, ✋ žádosti o účast, o změnu placení, o přijetí |
| `guests.js` | 🎟 hostující, veřejné `evpub` / `lineuppub` |
| `home-summary.js`, `home-remind.js` | 🏠 Domů, ❔ Chybí odpověď a 📲 text připomínky |
| `cash.js`, `bank-account.js` | ⚠️ pokladna (předpisy, úhrady, zůstatek, 🔁 převody `k: "tr"`, dluhy, VS), účty a IBAN |
| `bank-match.js` | ⚠️ 🏦 čtení výpisu z banky (CSV) a párování plateb s předpisy |
| `economy.js` | hospodaření události a měsíce, Moje platby po měsících |
| `tariff-detail.js` | ⚖️ detail tarifu hráčky (měsíce, události, využití ledu, dopad na pokladnu) |
| `block-exc.js` | 🔓 hromadné výjimky z blokace (dlužníci po osobách, výběr předpisů) |
| `cost-check.js` | ⚠️ 🧾 kontrola nákladů událostí (očekávané náklady po kategorii a příjemci proti výdajům, měsíc výdaje `pym`) |
| `data-window.js` | 📉 okno poslechu událostí a docházky (`WIN`, `winFrom`, `winTo` – hráčka 15 dní dopředu, `archNeed`, `mergeBand`, datum docházky `attDate` / `attDateFix`, `dayAdd`) |
| `read-cost.js` | 📉 odhad čtení databáze na jedno spuštění (`readCost`, limit `READ_LIMIT`) |
| `event-status.js` | stav události na kartě (💰 vyúčtování a placení, 🏒 plán / průběh / hodnocení tréninku) |
| `budget.js`, `budget-track.js`, `budget-review.js` | rozpočet sezóny, plnění a cashflow, schválení a export |
| `drills.js`, `drill-import.js` | 📚 banka cvičení, základní sada a import CSV |
| `training-plan.js` | 📋 plán tréninku (bloky, linky, ☕ pauza, řada cvičení `seq` / `expandLanes`, časy, točení, kontrola, `mergePlan`) |
| `plan-reuse.js`, `skill-coverage.js` | ⧉ kopie a 📑 šablony plánu, 📊 pokrytí dovedností (`groupDrills` / `groupSkills` = minuty skupiny podle plánu) |
| `line-split.js` | rozdělení do pětek, ⭐ výkonnost |
| `training-live.js` | ⏱ živý trénink (hodiny, poloha v plánu, úpravy průběhu, upozornění, ⌚ text oznámení, `laneSub`) |
| `training-eval.js` | ⭐ hodnocení hráček |
| `stopwatch.js`, `relay.js` | ⏲ stopky a výsledky měření, 🏃 štafeta |
| `training-stats.js` | 📈 přehled Tréninku (období, měření po cvičeních se zlepšením a pořadím, zátěž hráček, hodnocení hráčky, CSV) |
| **views/** | jen vykreslení a obsluha, výpočty volají z `domain/` |
| `shell.js` | záložky a hlavní vykreslení |
| `help.js` | ❓ nápověda – jediný uživatelský návod; kapitoly (`v`) a body (`data-v`) podle role (`VIS`) |
| `home-view.js`, `absence-view.js` | 🏠 Domů, 🏖 nepřítomnost |
| `events.js` | Události: seznam, kalendář, režimy pokladny v Team (`cashPanel`) |
| `event-core.js` | společný základ Událostí: styly, seznam `allEvents`, odpovědi `atMap`, karta události `cardHtml` (Události i 🏠 Domů), zápis odpovědi a důvodu, okno s důvodem |
| `event-detail.js`, `event-form.js` | detail události (pětky, plán, docházka, ⚙ úpravy, zrušení), formulář události |
| `event-series.js`, `event-settings.js` | 🔁 série tréninků, ⏰ nastavení událostí |
| `attendance.js`, `att-request-view.js` | 📊 docházka, ✋ žádosti o účast |
| `beta-view.js` | 🧪 pruh bety v liště, zamčená beta, ⚙️ → 🧪 Beta testování a přepnutí kanálu v 👤 Účet |
| `att-log-view.js` | 🕘 historie přihlášek: tichý zápis `logAtt`, okno historie (čte se až po klepnutí; řádky docházky zápis neukazují, aby se neposouvaly) |
| `matches.js`, `lineup-editor.js`, `report.js`, `opponents.js`, `stats.js` | zápasy, sestava, zápis utkání, soupeři, statistiky zápasů |
| `train-stats.js` | Statistiky: přepínač 📊 Zápasy / 🏒 Trénink, 📈 přehled Tréninku |
| `live-view.js`, `live-panels.js`, `live-events.js`, `live-quick.js`, `live-feedback.js` | 🔴 živý zápis (vykreslení, panely, klepnutí, rychlý gól / trest, vibrace) |
| `live-watch.js` | 👁 náhled živého zápasu |
| `editor.js`, `shift-editor.js` | opravy zápisu, střídání |
| `team.js`, `modal.js` | Team (soupiska, realizační tým, formace), modální okna |
| `mine.js`, `qr-image.js` | ⚠️ Moje platby a QR |
| `finance.js`, `payments.js`, `cashbook.js`, `money.js`, `cash-settings.js`, `request-list.js` | ⚠️ správa pokladny: platby, pokladna u události, pohyby, měsíce, nastavení, žádosti o placení |
| `bank-pair.js` | ⚠️ Platby → ☑ Hromadně: více úhrad najednou, 🏦 výpis z banky |
| `pay-history.js` | ⚠️ 🕘 historie placení hráčky (zpětná změna způsobu placení, dopad) |
| `tariff-detail-view.js` | ⚠️ ⚖️ Tarify → detail hráčky |
| `block-exc-view.js` | ⚠️ Platby → 🔓 Výjimky: hromadná výjimka z blokace |
| `cost-view.js` | ⚠️ Team → 🧾 Náklady (led, rozhodčí … proti zaplaceným výdajům, ➖ Zapsat platbu) |
| `event-badges.js` | řádek stavu na kartě události (💰 / 🏒), stav tréninků po dokumentech jen u zobrazených karet `S.trs` (starší v localStorage) |
| `audit-feed.js` | ⚠️ 📉 audit pokladny na vyžádání (`watchAudit(eid)` – záznamy jedné události, `""` = změny účtů) |
| `budget-view.js`, `budget-print.js` | 📊 rozpočet sezóny, 🖨 export |
| `drills-view.js`, `drill-import-view.js`, `drill-picker.js`, `drill-media.js` | 📚 banka cvičení, import, výběr cvičení, 📷 obrázky a ▶ / 📄 náhled odkazů |
| `trplan-view.js` | 📋 karta plánu v detailu tréninku, okno cvičení, společné styly a pomůcky plánu |
| `trplan-edit.js` | 📋 úprava plánu na celé stránce (bloky, čas, skupiny, řada cvičení, ⭐ Jen moje linky, uložení se sloučením) |
| `trplan-reuse.js` | ⧉ kopie, 📑 šablony, 📊 pokrytí dovedností, ✨ příprava |
| `line-split-view.js` | rozdělení do pětek, okno ⭐ výkonnosti |
| `trlive-view.js` | ⏱ živý trénink (karta, obrazovka, přilepené záhlaví se zbývajícím časem, spodní lišta řídícího, 🔒 zámek dotyku, zbytek plánu) |
| `trlive-alerts.js` | ⏱ vibrace, zvuk, ⌚ oznámení (i změna od řídícího), Wake Lock s obnovou a stavem ☀ |
| `stopwatch-view.js`, `treval-view.js` | ⏲ stopky a výsledky, ⭐ hodnocení |
| `settings-view.js`, `perm-view.js` | ⚙️ Účet a data, 🔐 práva rolí |
| `join-view.js` | ✋ žádost o přijetí do týmu |
| `auto-sync.js` | tichý zápis odvozených dat (`HK.syncOps`) |
| **tests/** | `npm test`; `support/` = zástupci prohlížeče a Firebase; `smoke/` = kouřový test (`npm run smoke`) |
| **docs/** | `STAV.md`, `plan.md`, `testy-rucni.md`, `archiv/` (pravidla pro Claude: kap. 0 a pokyny projektu) |

**⚠️ Peníze a zabezpečení** – každá změna se v CHANGELOG označí „⚠️ SAHÁ NA PLATBY“: `domain/cash.js`, `domain/bank-account.js`, `domain/bank-match.js`, `views/bank-pair.js`, `views/pay-history.js`, `views/block-exc-view.js`, `domain/block-exc.js`, `domain/cost-check.js`, `views/cost-view.js`, `domain/requests.js`, `views/mine.js`, `qr-image.js`, `cash-settings.js`, `payments.js`, `money.js`, `cashbook.js`, `request-list.js`, `firestore.rules`.

## 2. Struktura souboru
- Pořadí: **Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty**, sekce `// ===== Název =====`.
- Hlavička = nejvýš 5 řádků o **současném stavu**. Historie verzí jen v `CHANGELOG.md` (hlídá `tests/d1-structure.test.js`).
- Stručné české komentáře u sekcí a složitější logiky; exportovaná funkce má jednořádkový popis.
- Každá věc na jednom místě: výpočet do `domain/`, pomůcka do `core/` – nejdřív hledej, nepiš kopii.
- **Nový soubor nesmí mít stejný název jako existující** (jediná výjimka `attendance.js` ve `views/` a `domain/`).

### Společné pomůcky (nepiš vlastní kopii)
| Pomůcka | Kde | Použití |
|---|---|---|
| `confirm2(key, fn, redraw?)`, `armed(key)` | `core/actions.js` | potvrzení druhým klepnutím do 4 s; v ⚙️ přes `arm2` |
| `pn(id, {staff, fb})`, `nm(...)` | `core/selectors.js` | jméno osoby s HTML / čistý text |
| `csv(rows)`, `downloadFile` | `core/utils.js` | jediné CSV pro Excel; částky `csvNum` (`domain/cash.js`) |
| `makeDrag(root, items, {...})` | `core/drag.js` | přetahování |
| `matchesVs` / `vsHash` | `core/selectors.js` / `domain/cash.js` | zápasy proti soupeři / variabilní symbol (nezaměňovat) |
| `HK.can(akce)` | `data/storage.js` | zkratky: `sport`, `money`, `members`, `roster`, `accounts`, `admin`, `onlyOwn`, `guest`, `wipe`; neznámá akce = výjimka |
| `HK.perm(modul, akce)` | `data/storage.js` | jemná práva z matice `settings/perm` (`r` / `e` / `c` / `d`); manager vždy, hostující nikdy |
| `playerStats(matches, {match})` | `domain/player-stats.js` | statistiky zápasu i souhrnu |
| `expandLanes(blok)` | `domain/training-plan.js` | linky plánu po jednotlivých cvičeních řady (hodnocení, měření, pokrytí, přehledy) |

## 3. Data a databáze
- Zápis jen přes `S.db` (`collection`, `doc`, `batch`) ze `storage.js` (strážce `blocked()` – náhled role, starší verze). Přímé volání Firestore SDK mimo `storage.js` se nepoužívá. Čtení na vyžádání: `S.db.doc().get()`, `S.db.collection().getAll()`, poslech jednoho dokumentu `collection().part`.
- **📉 Šetření čtení (tarif Spark = 50 000 čtení denně):** každé spuštění aplikace po pauze delší než 30 min přečte **všechny dokumenty poslouchaných kolekcí** znovu. Kolekce, která roste s časem (audit, historie, plány, výsledky), se **nesmí poslouchat celá** – čte se po dokumentech nebo dotazem `where` jen pro to, co je na obrazovce (`audit` přes `views/audit-feed.js`, stav tréninků v `views/event-badges.js`). Odhad pro aktuální data: ⚙️ → 💾 Data → 📉 Čtení databáze.
- **📉 Okno poslechu** (`storage.js` – `listenWin`, `domain/data-window.js`): `events` (pole `date`) a `attendance` (pole `d`) se živě poslouchají od `winFrom` (realizační tým 45 dní, ostatní 8 dní) – u hráčky / hostující jen do `winTo` (dnes + 15 dní), dál až po `HK.farListen()` (⬇ Načíst další v Událostech), starší z paměti zařízení (`getDocsFromCache`), ze serveru celý archiv jednou na zařízení, pak pás 60 dní před oknem (`ttl`). `data[c]` = archiv + živá část, aplikace vidí vše. Docházka v okně až od brány verze ≥ `ATT_D_VER` (22.9). **Docházka musí mít `d`** – doplňuje ho `withD` v `storage.js` při každém `set`, změnu data události propíše `attMoves`; ruční zápis docházky mimo `S.db` se nepoužívá.
- Úpravy existujícího dokumentu přes `merge`: `S.db.doc(cesta).merge({pole})` (vnořený objekt nahradí, `"__del"` smaže pole, `"__now"` = čas serveru); v dávce `batch().merge` = hluboké sloučení. `set` jen pro nový dokument nebo celý vlastněný (zápas, `evcash`, plán).
- Data jen **přidávat**; stará pole mazat nejdřív o verzi později. Pravidla: **rozšířit → převést → zúžit**. Převody dat = tlačítko v ⚙️ → 💾 Data s náhledem, idempotentní, se zálohou; po potvrzení se v další verzi odstraní.
- **Brána verze** `settings/app = {minVer, minBy, minAt}` (⚙️ → 👤 Účet → 🔒 Vyžadovat verzi, jen manager). Klient pod minimem nezapisuje.
- **Role** v `members/{email}`: `role` (manager / trener / asistent / hracka / host), `rv: 2`, `pid` (hráčka), `tid` (realizační tým), `cash: true` (pokladník). Jiná role = bez přístupu. Manager / trener / asistent smí mít i `pid` – na události se hlásí jako hráčka (`selfMember`). Posledního managera nejde odebrat (`keepsManager`). Pokladník bez role manager spravuje jen hráčky a nikdy vlastní dokument.
- **Oprávnění** v aplikaci jen přes `HK.can` / `HK.perm`. Pravidla: `isMgr`, `isRoster`, `isStaff`, `isCash`, `isPlayer`, `isHost`, `isTeam`, `can(modul, akce)` z `settings/perm` s náhradou výchozích (`permDef` = `DEFAULT_PERMS`). Shodu hlídají `tests/rules-narrow.test.js` a `tests/perm-matrix.test.js`.
- Odvozené dokumenty (`evpub`, `lineuppub`, automatické omluvy) zapisuje `views/auto-sync.js` přes `HK.syncOps`.
- **🕘 Historie přihlášek** `attlog/{náhodné id}` = `{eid, pid, st, by, bp, src, at}` – jen přidávání (pravidla nedovolí změnu), `at` = čas serveru, `by` = e-mail zapisujícího, `bp` = jeho pid / tid. Každý zápis nebo zrušení odpovědi v `attendance` doplní záznam přes `logAtt()` (`views/att-log-view.js`) – **samostatně mimo dávku**, aby chyba historie nezastavila přihlášení. Čte manager, trenér a asistent (`getWhere("eid", …)` na vyžádání). Není v záloze JSON a při mazání události / člena zůstává.

### Kolekce Tréninku (jeden dokument na trénink)
| Kolekce | Obsah | Čte / zapisuje |
|---|---|---|
| `drills/{id}`, `drillimg/{id}` | banka cvičení, obrázek (≤ 700 000 znaků) | `drills r` / `e`, `d`; obrázky čte `isTeam` |
| `trplan/{eid}` | `{v, goal, blocks: [{id, mode, dur, rot, by, brk, lanes: [{id, drill, dn, di, co, grp, seq}]}]}`; `seq: [{id, drill, dn, di, dur}]` jen u linky, která se netočí | `trplan r` / `e` |
| `trtpl/{id}` | šablona plánu | `trplan e` |
| `trlive/{eid}` | hodiny `{st, e0, wAt, sAt == request.time, ctl, adj, skip}` | `trplan r` / `e` |
| `plevel/team` | ⭐ výkonnost `{lv: {pid: 1–5}}` | `isStaff` |
| `trms/{eid}` | měření `{r: {klíč: {d, dn, u, low, ms: {pid: [pokusy]}, rl}}}` – vidí celý tým | `trplan r` / `treval e` |
| `treval/{eid}` | hodnocení `{r: {klíč: {d, dn, r, n, pl: {pid: {r, n}}}}}` – **hráčka nikdy** | `treval r` / `e` |
Klíč linky = `blok_linka`, u cvičení řady `blok_linka-cvičení` (`msKey`, `seqLid`).

## 4. Verze a vydání
Číslování: `v22.1` = verze / fáze, `v22.1.1` = oprava nebo pokračování bez nových funkcí. Vždy se mění všechno najednou:
1. `src/core/app-version.js` (`APP_VERSION`, `APP_DATE`) a `package.json` (shodu hlídá test),
2. `sw.js` – cache `VER` +1 (`hokej-vNN` / `hokej-beta-vNN`),
3. `CHANGELOG.md` – záznam nahoře (`## vX.Y (datum) – název`, postup nasazení, Přidáno / Změněno / Opraveno / Beze změny, Ověřeno),
4. `README.md` – řádek „Aktuální verze“,
5. `docs/STAV.md`, `docs/plan.md` (stav fáze), `docs/testy-rucni.md` (kroky testu),
6. `src/views/help.js` – jen při změně ovládání; nový bod / kapitolu označit `data-v` / `v` podle toho, kdo modul vidí.

**🧪 Kanál (od v22.11):** CHANGELOG u každé verze uvádí, kam se nahrává – **`beta`** (výchozí: UI, nové pohledy, opravy, přidaná pole snesitelná starší stabilní verzí) nebo **`main`** (zúžení / převod pravidel, migrace dat, naléhavé opravy; potom totéž i do `beta`). Čísla verzí a cache jsou jedna řada pro oba kanály (beta jen s předponou cache `hokej-beta-v`). Vydání do stabilní = PR `beta → main`, kód se nemění; 🔒 Vyžadovat verzi až ve stabilní. V betě a stabilní sdílí zařízení `localStorage` a offline paměť Firestore (stejný web) – klíče `localStorage` jen přidávat, verzi Firebase SDK neměnit přes betu.

## 5. Testy
- `npm test` (Node 22+, bez instalace) spustí `tests/**/*.test.js` přes `node:test`. Před vydáním vše zelené.
- `tests/support/setup.mjs` = zástupci `document`, `window`, úložišť; `hooks.mjs` nahradí Firebase SDK modulem `firebase-stub.mjs`; test nastaví `globalThis.__fb = {user, members, data}` a `await HK.ready()`. Role běží v samostatném procesu (`can-probe.mjs`).
- Nová funkce = nový test (hlavně `domain/`). Úklid = stávající testy beze změny zelené.
- `tests/d1-baseline.test.js` porovná statistiky, CSV a VS se zachycenými hodnotami – při úklidu se **nemění** (jinak jde o změnu chování).
- `tests/d1-structure.test.js` hlídá strukturu (název týmu, role, pomůcky na svém místě, hlavičky bez historie, unikátní názvy souborů).
- Pravidla se testují kontrolou textu (bez emulátoru). Skutečné ověření rolí = `docs/testy-rucni.md` + 👁 Náhled role.

### Kouřový test (`npm run smoke`)
- Jednou `npm install` (jen jsdom jako devDependency; `npm test` ho nepotřebuje, `node_modules/` se nenahrává).
- `tests/smoke/smoke-run.mjs` spustí každou roli v samostatném procesu (`smoke-role.mjs`): aplikace v jsdom (`smoke-env.mjs`, čas zmrazený na 26. 10. 2026 17:10) se zástupcem Firebase s daty (`smoke-fb.mjs` – where, getDocs, getDoc; `smoke-data.mjs` – tým, trénink e1 s plánem, řadou cvičení a běžícím živým tréninkem). Role: manager, trener-cash, trener, asistent, asistent-hracka, hracka, host, pokladnik. Scénáře: start, všechny záložky, ⚙️ a jeho sekce, rychlé tlačítko u události, detail tréninku, úprava plánu (⭐ Jen moje linky), ⏱ živý trénink. Chyba v konzoli nebo výjimka = selhání.
- `npm run smoke -- --save adresář` uloží HTML obrazovek; `node tests/smoke/smoke-compare.mjs před po` je porovná (úklid = shoda kromě záměrně změněných textů). Jen některé role: `npm run smoke -- trener hracka`.
- Nová obrazovka nebo tok = doplnit krok do `smoke-role.mjs` a data do `smoke-data.mjs`.

## 6. Nasazení (postup pro správce)
1. Záloha dat: ⚙️ → 💾 Data → Stáhnout zálohu (kód má historii v Gitu).
2. Podle CHANGELOG **publikovat firestore.rules** před, nebo po commitu (jen u verzí, které to uvádějí – po dotazu).
3. Commit verze zapíše Claude do `beta`; GitHub Actions nasadí betu za 1–2 min (`…/beta/`).
4. ⚙️ → 👤 Účet → Načíst novou verzi, ověřit verzi v záhlaví. Vydání bety pro všechny = PR `beta → main` (README, kap. Kanály).
5. U verzí, které mění data: po aktualizaci všech zařízení ve stabilní 🔒 Vyžadovat verzi.
6. Návrat: revert commitu verze v `beta` (ve stabilní revert merge v `main` přes PR), pravidla z historie v konzoli, `settings/app.minVer` snížit ručně.
