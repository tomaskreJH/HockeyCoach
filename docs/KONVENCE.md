# Konvence projektu HockeyCoach (programovací řád)

Vstupní bod pro každou úpravu – přečti nejdřív tento soubor, pak jen soubory, kterých se úprava týká.
Platí od v18.8. Co tu není popsané, řeší stávající kód: nové věci piš stejně jako sousední kód.

## 1. Mapa souborů

| Cesta | Co tam je |
|---|---|
| `index.html`, `manifest.webmanifest`, `sw.js` | vstupní stránka, instalace na plochu, offline cache (`hokej-vNN`) |
| `styles/main.css` | všechny styly (barvy jako proměnné `--ac`, `--ok`, `--no`, `--wa` … pro světlý i tmavý režim) |
| `firestore.rules` | pravidla databáze – jediná skutečná ochrana dat (publikuje se ručně v konzoli Firebase) |
| `src/main.js` | spuštění: přihlášení, poslech kolekcí podle role, první vykreslení |
| `src/config/` | konstanty bez logiky: `constants.js` (pozice, rozložení, tresty), `team-config.js` (název týmu `TEAM_NAME`, název aplikace `APP_NAME`, `DEV_EMAILS`); `firebase-config.js` je v `src/data/` |
| `src/core/app-version.js` | **jediné místo s číslem verze** (`APP_VERSION`, `APP_DATE`), porovnání verzí, brána verze |
| `src/core/` | stav `state.js` (`S`), `utils.js` (DOM, formát, čas, `csv`), `selectors.js` (čtení stavu, jména `pn` / `nm`, `matchesVs`), `actions.js` (ukládání zápasu, `confirm2`), `drag.js` (přetahování `makeDrag`), `nav.js` (Zpět), `table-sort.js` |
| `src/data/storage.js` | datová vrstva: Firebase, přihlášení a účinná role (`roleOf` z `domain/permissions.js`), **oprávnění `can(akce)`** (jediné místo, tabulka `CAN` odvozená z `actOf`), převod rolí (`HK.cfg.roleState` / `runRoleConvert`), strážce zápisu `blocked()`, dávky, kontrola mazání, záloha / obnova, kontrola dat, brána verze; **rozhraní okna ⚙️ `HK.cfg`** (údaje a zápisy bez vykreslení – účet, volby a popisky rolí, členové, náhled role, kontrola dat, brána verze) |
| `src/domain/` | **čisté funkce bez DOM** (pravidla hry, statistiky `player-stats.js`, pokladna, docházka a 🚫 nedorazila bez omluvy `attendance.js` (pole `attendance.nos`), dlužníci, účty, opakování událostí `recurrence.js`, hospodaření události a měsíce, Moje platby po měsících a ceny na hlavu `economy.js`, žádosti členů `requests.js`, rozpočet sezóny `budget.js`, plnění rozpočtu a cashflow `budget-track.js`, schválení, úpravy a export rozpočtu `budget-review.js`, úvodní přehled `home-summary.js`, náhled živého zápasu pro členy `watch-feed.js`, žádosti o přijetí do týmu `join-requests.js`, čas události od – do a ⏰ sraz `event-time.js`, 🎟 hostující hráčky a veřejné dokumenty `evpub` / `lineuppub` `guests.js`, ❌ zrušení a úplné smazání události `event-cancel.js`, ✋ žádosti o změnu účasti `att-requests.js`, 🏖 nepřítomnost `absence.js`, **role a práva po modulech `permissions.js`** (role, výchozí matice `DEFAULT_PERMS`, `MODULES`, `ACTIONS`, upravitelné buňky `EDITABLE`, `permOf`, `permError`, zkratky `actOf`, matice `settings/perm` – `permClean`, `permGrid`, `permDiff`, `permOverview`, `permDoc`, převod rolí `rolePlan`, ochrana posledního managera `keepsManager`)) – testované v `tests/` |
| `src/views/` | obrazovky: jen vykreslení a obsluha událostí, výpočty volají z `domain/` |
| `src/views/home-view.js` | 🏠 Domů – úvodní přehled (výchozí záložka pro všechny): běžící zápas, příští zápas, nadcházející události příštích 7 dní, moje platby, u správce pokladny souhrn týmu a varování cashflow; jen čte a odkazuje, výpočty `domain/home-summary.js` |
| `src/views/live-watch.js` | 👁 náhled běžícího zápasu pro členy bez práva zápisu (z karty 🔴 v 🏠 Domů, stav `S.hw`): skóre, střely, čas a třetina, průběh (góly, tresty, střely, konce třetin) – jen ke čtení, živý zápis nevolá; výpočty `domain/watch-feed.js` |
| `src/views/join-view.js` | ✋ žádost o přijetí do týmu: obrazovka pro účet bez členství (formulář, stav, zrušení; zápisy předává `storage.js`) a okno vyřízení pro managera (z 🏠 Domů a ⚙️ → Členové týmu); data `joinreq/{email}`, výpočty `domain/join-requests.js` |
| `src/views/live-*.js` | živý zápis: `live-view.js` (vykreslení, odpočty, upozornění), `live-panels.js` (menu ⋯ a panely: sestava, jednotky, zranění, brankářka, nastavení), `live-events.js` (obsluha klepnutí, odchod), `live-quick.js` (rychlý zápis gólu a trestu), `live-feedback.js` (vibrace, záblesk) |
| `src/views/budget-view.js` | 📊 Rozpočet sezóny v Team (jen správce pokladny): 📝 Plán (parametry, položky, plán po měsících, odhad příspěvku, ✅ schválení a porovnání se schváleným), 📈 Plnění a 💧 Cashflow; výpočty `domain/budget.js`, `domain/budget-track.js`, `domain/budget-review.js`, data `budget/{sezóna}` (schválená kopie `approved` je neměnná, úpravy `rev` jen přidávat) |
| `src/views/budget-print.js` | 🖨 Export rozpočtu pro valnou hromadu v okně `#rp` (jako Zápis utkání): tisk / PDF a ⬇️ CSV, komentář jen v paměti |
| `src/views/settings-view.js` | ⚙️ Účet a data (všechny role, `HK.openCfg` z `main.js`): nahoře 👤 Účet, pod ním sbalitelné sekce 👥 Tým a členové · 🔐 Práva rolí (`views/perm-view.js`) · 📅 Události · 💰 Pokladna · 💾 Data · 🔒 Aplikace · 🛠 Vývojář (viditelnost podle `HK.can`, vývojář `HK.cfg.isDev`); v 💾 Data převod rolí s náhledem a volbou managerů; otevřená je nejvýš jedna sekce (`localStorage` `hk-cfg-open`), stav v záhlaví sbalené sekce; jen vykreslení a obsluha, data přes `HK.cfg` |
| `src/views/perm-view.js` | ⚙️ → 🔐 Práva rolí: přehled „kdo co smí“ (členové kromě hostující) a editor matice `settings/perm` pro managera (výběr role, ✓ / ✕ u upravitelných buněk, 🔒 pevné, náhled „Co se změní“, ↩ Výchozí hodnoty, 💾 Uložit druhým klepnutím); data přes `HK.cfg.permState` / `savePerms` |
| `src/views/event-settings.js` | ⏰ Nastavení událostí z ⚙️ (trenér, kustod): výchozí sraz tréninku a zápasu a délka tréninku → `settings/events` (`S.es`); výpočty `domain/event-time.js` |
| `src/views/request-list.js` | žádosti o změnu placení pro správce pokladny (pruh, okno vyřízení) |
| `src/views/att-request-view.js` | ✋ žádosti o změnu účasti (`requests`, kind `att`): pruh a okno vyřízení pro trenéra / kustoda v Událostech, rámeček člena v detailu události |
| `src/views/absence-view.js` | 🏖 nepřítomnost: karta v 🏠 Domů a okno s náhledem „Co se změní“ (`absence`, omluvy v `attendance` s `abs` a důvody v `attnote`) |
| `src/views/auto-sync.js` | tichá synchronizace bez obrazovky (`HK.syncOps`): veřejné dokumenty pro hostující (`evpub`, `lineuppub` – jen trenér / kustod) a automatické omluvy z nepřítomnosti |
| `src/lib/qrcode.js` | knihovna QR (cizí kód, neupravovat) |
| `src/debug.js` | ruční ladění (`?debug` → `window.__hk`); testy importují moduly přímo |
| `tests/` | automatické testy (`npm test`), `tests/support/` = zástupci prohlížeče a Firebase |
| `docs/` | tento soubor, plán (`plan-v18.md`), prompt pro nové vlákno (`prompt-dalsi-vlakno.md`), archiv dokončených fází |
| `CHANGELOG.md` | historie verzí (nejnovější nahoře) |
| `README.md` | současný stav, spuštění, nasazení, odkazy |

**Peníze a zabezpečení** (každá změna se v CHANGELOG výslovně označí „⚠️ SAHÁ NA PLATBY“): `src/domain/cash.js`, `src/domain/bank-account.js`, `src/views/mine.js`, `src/views/qr-image.js`, `src/views/cash-settings.js`, `src/views/payments.js`, `src/views/money.js`, `src/views/cashbook.js`, `src/views/request-list.js`, `src/domain/requests.js`, `firestore.rules`.

## 2. Závislosti a struktura souboru
- Směr importů: `config` → `core` → `domain` → `views` → `main`. Doména nesahá do DOM (výjimka: `live-engine.js` ukládá přes `core/actions.js` – při úklidu oddělit).
- Pořadí v souboru: **Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty**. Sekce označ komentářem `// ===== Název =====`.
- Hlavička souboru = 1–5 řádků: co soubor dělá a jeho pravidla **v současném stavu**. Historie („v18.4.2: …“) patří jen do `CHANGELOG.md` (staré poznámky se odstraní při úklidu D).
- Komentáře stručně česky u sekcí a u složitější logiky. Názvy proměnných mohou zůstat krátké (styl projektu), ale každá exportovaná funkce má jednořádkový popis.
- Každá věc na jednom místě: nový výpočet patří do `domain/`, nové pomocné funkce do `core/`, nepiš druhou kopii existující funkce (nejdřív hledej v `domain/` a `core/`).
- **Nové soubory nesmí mít stejný název jako existující soubor jinde v projektu** (např. druhé `version.js`) – vyhledávání a importy se pak pletou.

### Společné pomůcky (od v18.9 – nepiš vlastní kopii)
| Pomůcka | Kde | Použití |
|---|---|---|
| `confirm2(key, fn, redraw?)`, `armed(key)` | `core/actions.js` | Potvrzení druhým klepnutím: 1. klepnutí označí (`S.cf`), 2. do 4 s provede `fn`, jinak se označení zruší. `redraw` = vlastní překreslení (výchozí `render`). Text a barvu tlačítka řídí `armed(key)`. V ⚙️ (`views/settings-view.js`) přes `arm2` (klíč `cfg:<otevření>:<název>`). Jiné potvrzení (vlastní příznak) nepiš. |
| `pn(id, {staff, fb})`, `nm(id, {staff, fb})` | `core/selectors.js` | Jméno osoby: `pn` s HTML (číslo, jméno, 🤕 / ⛔, u člena týmu 🎓), `nm` čistý text (CSV, časová osa, hlášky). `staff: true` hledá i realizační tým, `fb` = text pro neznámé id (výchozí „?“). Jméno pro zprávu v QR je `payerName` v `domain/cash.js` (bez čísla). |
| `csv(rows)` | `core/utils.js` | Jediný text CSV pro Excel (středník, uvozovky, BOM, CRLF); částky přes `csvNum` (`domain/cash.js`), stažení `downloadFile`. |
| `makeDrag(root, items, {target, start, drop, click})` | `core/drag.js` | Přetahování (prst: podržení 320 ms, myš: > 6 px). `start(b)` → `{data, text}` nebo `null`, `drop(data, cíl)`, `click(b)` → obsluha klepnutí nebo `null`. |
| `matchesVs(name, ex)` / `vsHash(id)` | `core/selectors.js` / `domain/cash.js` | Uzavřené zápasy proti soupeři / variabilní symbol z id předpisu (dva různé významy – nezaměňovat). |
| `HK.can(akce)` | `data/storage.js` | Oprávnění: `sport` (manager, trenér, asistent), `money` (manager, pokladník), `members` (manager, pokladník – jen hráčky), `roster` (manager, trenér), `accounts`, `admin` (manager), `onlyOwn` (hráčka, hostující), `guest` (hostující – vidí jen sebe), `wipe` (vývojář s rolí manager mimo náhled – úplné smazání události). Neznámá akce = výjimka. Tabulka `CAN` se odvozuje z `domain/permissions.js` (`actOf`, výchozí matice `DEFAULT_PERMS`); stará role `trener` bez `rv` = manager, `kustod` = asistent. Kontroly rolí jen v `storage.js` a `domain/permissions.js` (okno ⚙️ je dostává přes `HK.cfg`). Zkratky se maticí `settings/perm` nemění (pevné buňky). |
| `HK.perm(modul, akce)` | `data/storage.js` | Právo v modulu matice (`MODULES`: `events`, `matches`, `opp`, `stats`, `attview` … × `r` číst / `e` upravovat / `c` rušit / `d` mazat) podle `settings/perm` s náhradou výchozích hodnot; manager vždy, hostující nikdy. Pohledy jím řídí: + Trénink a ✏️ Upravit trénink (`events e`), ❌ Zrušit / ↩ Obnovit (`c`), 🗑 Smazat a 🗑 Tato a další (`d`), smazat prázdný zápas (`matches d`), záložka Soupeři (`opp r`), smazat soupeře (`opp d`), záložka Statistiky a 📋 Zápis utkání v události (`stats r`), 📊 Docházka (`attview r`). Upravitelné buňky = `EDITABLE`; ostatní jsou pevné. |
| `TEAM_NAME`, `APP_NAME`, `DEV_EMAILS` | `config/team-config.js` | Název týmu a aplikace, účty vývojáře. Výjimky: `index.html`, `manifest.webmanifest` a značka zálohy `app: "hokej-zapasy"` (nemění se). |
| `playerStats(matches, {match})` | `domain/player-stats.js` | Statistiky hráček a brankářek pro jeden zápas (`match: true` – bruslařky sestavy, +/- bez brankářek) i souhrn (gp, +/- všem, góly v PP, body doma / venku, tým). |

## 3. Data a databáze
- Zápis jen přes `S.db` (`collection`, `doc`, `batch`) ze `storage.js` – tam je strážce `blocked()` (náhled role jen ke čtení, starší verze aplikace). Přímé volání Firestore SDK mimo `storage.js` se nepoužívá.
- Úpravy existujícího dokumentu zapisovat přes `merge`, ne `set` celého dokumentu – starší klient by jinak smazal nová pole a souběžná změna jiného pole by se přepsala. Jeden dokument: `S.db.doc(cesta).merge({pole})` (zapíše jen uvedená pole, vnořený objekt nahradí celý, `undefined` / `"__del"` pole smaže; nečeká na server). V dávce: `S.db.batch().merge(cesta, {pole})` (hluboké sloučení, `"__del"` smaže pole). `set` jen pro nový dokument nebo dokument, který aplikace celý vlastní (zápas, `evcash`).
- Změny dat jen **přidávají** pole / kolekce; stará pole se mažou nejdřív o verzi později, po otestování nové verze.
- Pravidla databáze ve dvou krocích: 1) rozšířit (staré i nové), 2) převést data, 3) zúžit v další verzi. U každé verze napsat, zda a kdy **publikovat firestore.rules** (před, nebo po nahrání kódu).
- **Brána verze:** `settings/app = {minVer, minBy, minAt}`. Verze, která mění tvar dat, po nasazení zvýší minimum (⚙️ → 🔒 Aplikace → 🔒 Vyžadovat verzi, jen manager). Klient pod minimem nezapisuje a ukáže pruh „Načíst novou verzi“.
- Převody dat: tlačítko v ⚙️ → 💾 Data s náhledem „co se změní“, idempotentní (lze spustit znovu), před převodem záloha. Výpočet plánu a zápis jsou v `storage.js` (`HK.cfg`), vykreslení v `views/settings-view.js`.
- Oprávnění v aplikaci **jen přes `HK.can(akce)`** (tabulka `CAN` v `storage.js` odvozená z `domain/permissions.js`); `HK.isStaff`, `HK.isCash` a `HK.role` už neexistují. Pravidla databáze: `can(modul, akce)` (matice práv – události, zápasy, série, soupeři), `isMgr` (manager podle účinné role – `settings/perm`), `isCoach` (manager, do v20.6 i trener), `isStaff` (manager, trener, asistent, kustod), `isCash` (manager, do v20.6 i trener, nebo příznak `cash`), `isPlayer` (hráčka i hostující), `isHost`, `isTeam` (člen kromě hostujícího – čtení týmových kolekcí) – musí odpovídat tabulce `CAN` (pravidla smí být během přechodu širší).
- **Matice práv** `settings/perm = {v, roles: {trener|asistent|hracka: {modul: {r, e, c, d}}}, by, at}` – zapisuje jen manager (`permSettingsOk`, celý dokument, jen rozdíly od výchozích hodnot), čtou členové kromě hostující, ze zálohy se neobnovuje ani nemaže. Pravidla: `can(modul, akce)` = účinná role (`roleFix`: kustod = asistent, trener bez `rv` 2 = manager) + `settings/perm` s náhradou výchozích (`permDef` = `DEFAULT_PERMS`, shodu hlídá `tests/perm-matrix.test.js`); `events`, `matches` (úprava `evUpdate`: pole `cancelled` = rušit, jen `lines` = formace, ostatní = upravovat), `series`, `opponents`. Na zápis 2 různé dokumenty (`members`, `settings/perm`) – v limitu 10 / 20 get.
- Role v `members/{email}`: `role` (manager / trener / asistent / hracka / host) a `rv: 2` (role po převodu). Každý nový zápis člena (⚙️, přijetí žádosti, převod) zapisuje `rv`. Posledního managera nejde odebrat ani snížit (hlídá aplikace – `keepsManager`).
- Odvozené dokumenty, které aplikace zapisuje sama (veřejné `evpub` / `lineuppub`, automatické omluvy z nepřítomnosti), jdou přes `HK.syncOps` (tichý zápis, jen rozdíly, bez hlášek) ze `src/views/auto-sync.js`.
- Pokladník (bez role manager) spravuje jen členy s rolí Hráčka a nikdy vlastní dokument `members` (vynucují pravidla).

## 4. Verze a vydání
Číslování: `v18.8` = hlavní verze a fáze plánu, `v18.8.1` = oprava bez nových funkcí.
Při každé verzi se mění vždy všechno:
1. `src/core/app-version.js` – `APP_VERSION`, `APP_DATE`,
2. `package.json` – `version` (shodu hlídá test),
3. `sw.js` – název cache `hokej-vNN` (+1),
4. `CHANGELOG.md` – nový záznam nahoře (`## vX.Y (datum) – název`, postup nasazení, Přidáno / Změněno / Opraveno / Beze změny),
5. `README.md` – řádek „Aktuální verze“,
6. `src/views/help.js` – nápověda, pokud se mění ovládání,
7. `docs/plan-v18.md` – stav fáze.

## 5. Testy
- `npm test` (Node 22+, bez instalace balíčků) spustí `tests/**/*.test.js` přes `node:test`. Před každým vydáním musí být vše zelené.
- `tests/support/setup.mjs` vytvoří zástupce `document`, `window`, `localStorage`, `sessionStorage`; `hooks.mjs` nahradí Firebase SDK (`gstatic.com`) modulem `firebase-stub.mjs`; `fake-db.mjs` zachytává zápisy zápasu.
- Nová funkce = nový test (hlavně `domain/`). Úklid bez změny chování = stávající testy beze změny zelené.
- **Srovnávací test úklidu** `tests/d1-baseline.test.js` porovná výstupy se zachycenými hodnotami z v18.8.1 (`tests/fixtures/d1-baseline.json`): statistiky zápasu a souhrnu, CSV (byte po bytu), potvrzení druhým klepnutím, zápasy proti soupeři, VS. Při úklidu se **nemění**; pokud musí, jde o změnu chování (zeptat se). Nové zachycení jen na původním kódu: `D1_CAPTURE=1 npm test`.
- Zástupce Firebase umí přihlášení a data: test nastaví `globalThis.__fb = {user, members, data}` a pak `await HK.ready()`. Role běží v samostatném procesu (`tests/support/can-probe.mjs`, `tests/permissions.test.js`).
- Struktura kódu (`tests/d1-structure.test.js`): název týmu jen v `config/team-config.js`, role jen v `storage.js`, potvrzení / CSV / přetahování / statistiky jen na svém místě, komentáře bez historie verzí, žádný nový soubor se stejným názvem.
- Pravidla databáze se testují jen kontrolou textu (`tests/project.test.js`) – bez emulátoru (rozhodnuto: bez Javy a bez placeného tarifu). Skutečné ověření rolí = kontrolní seznam na telefonu + 👁 Náhled role + testovací účet hráčky.

## 6. Nasazení (postup pro správce)
1. Záloha: ⚙️ → 💾 Data → Stáhnout zálohu (JSON) a zip současného repozitáře.
2. Podle CHANGELOG: **publikovat firestore.rules** před, nebo po nahrání kódu.
3. Nahrát všechny soubory (smazané soubory z CHANGELOG odstranit i z webu).
4. Na telefonu ⚙️ → 👤 Účet → Načíst novou verzi, ověřit verzi v záhlaví.
5. Po otestování na všech zařízeních: manager ⚙️ → 🔒 Aplikace → 🔒 Vyžadovat verzi (u verzí, které mění data).
6. Návrat: nahrát předchozí zip; pravidla vrátit z historie v konzoli Firebase (*Firestore → Rules → historie*). Minimální verzi pak manager musí snížit ručně v konzoli (`settings/app.minVer`).

## 7. Práce s Claude (šetření limitů)
- Na začátku vlákna: načíst repozitář, vypsat verzi, přečíst tento soubor a plán (`docs/plan-v18.md`, jen sekci fáze).
- Číst cíleně (grep, jen dotčené soubory); jedna verze = jedno vlákno.
- Výstup: změněné soubory celé (zip s cestami), žádné NAJDI / NAHRAĎ, žádné zkracování, žádné Git příkazy.
- Když úkol vyžaduje zásah jinde (např. do živého zápisu nebo pokladny), nejdřív upozornit a zeptat se.
