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
| `src/config/` | konstanty bez logiky (`constants.js` – pozice, rozložení, tresty; `firebase-config.js` je v `src/data/`) |
| `src/core/app-version.js` | **jediné místo s číslem verze** (`APP_VERSION`, `APP_DATE`), porovnání verzí, brána verze |
| `src/core/` | stav `state.js` (`S`), `utils.js` (DOM, formát, čas), `selectors.js` (čtení stavu), `actions.js` (ukládání zápasu), `nav.js` (Zpět), `table-sort.js` |
| `src/data/storage.js` | datová vrstva: Firebase, přihlášení a role, strážce zápisu `blocked()`, dávky, kontrola mazání, záloha / obnova, okno ⚙️ |
| `src/domain/` | **čisté funkce bez DOM** (pravidla hry, pokladna, docházka, dlužníci, účty) – testované v `tests/` |
| `src/views/` | obrazovky: jen vykreslení a obsluha událostí, výpočty volají z `domain/` |
| `src/lib/qrcode.js` | knihovna QR (cizí kód, neupravovat) |
| `src/debug.js` | ruční ladění (`?debug` → `window.__hk`); testy importují moduly přímo |
| `tests/` | automatické testy (`npm test`), `tests/support/` = zástupci prohlížeče a Firebase |
| `docs/` | tento soubor, plán (`plan-v18.md`), archiv dokončených fází |
| `CHANGELOG.md` | historie verzí (nejnovější nahoře) |
| `README.md` | současný stav, spuštění, nasazení, odkazy |

**Peníze a zabezpečení** (každá změna se v CHANGELOG výslovně označí „⚠️ SAHÁ NA PLATBY“): `src/domain/cash.js`, `src/domain/bank-account.js`, `src/views/mine.js`, `src/views/qr-image.js`, `src/views/cash-settings.js`, `src/views/payments.js`, `src/views/money.js`, `src/views/cashbook.js`, `firestore.rules`.

## 2. Závislosti a struktura souboru
- Směr importů: `config` → `core` → `domain` → `views` → `main`. Doména nesahá do DOM (výjimka: `live-engine.js` ukládá přes `core/actions.js` – při úklidu oddělit).
- Pořadí v souboru: **Importy → Konstanty a stav → Pomocné funkce → Hlavní logika → Eventy → Exporty**. Sekce označ komentářem `// ===== Název =====`.
- Hlavička souboru = 1–5 řádků: co soubor dělá a jeho pravidla **v současném stavu**. Historie („v18.4.2: …“) patří jen do `CHANGELOG.md` (staré poznámky se odstraní při úklidu D).
- Komentáře stručně česky u sekcí a u složitější logiky. Názvy proměnných mohou zůstat krátké (styl projektu), ale každá exportovaná funkce má jednořádkový popis.
- Každá věc na jednom místě: nový výpočet patří do `domain/`, nové pomocné funkce do `core/`, nepiš druhou kopii existující funkce (nejdřív hledej v `domain/` a `core/`).
- **Nové soubory nesmí mít stejný název jako existující soubor jinde v projektu** (např. druhé `version.js`) – vyhledávání a importy se pak pletou.

## 3. Data a databáze
- Zápis jen přes `S.db` (`collection`, `doc`, `batch`) ze `storage.js` – tam je strážce `blocked()` (náhled role jen ke čtení, starší verze aplikace). Přímé volání Firestore SDK mimo `storage.js` se nepoužívá.
- Nová pole zapisovat přes `merge` (`S.db.batch().merge(…)`), ne `set` celého dokumentu – starší klient by je jinak smazal.
- Změny dat jen **přidávají** pole / kolekce; stará pole se mažou nejdřív o verzi později, po otestování nové verze.
- Pravidla databáze ve dvou krocích: 1) rozšířit (staré i nové), 2) převést data, 3) zúžit v další verzi. U každé verze napsat, zda a kdy **publikovat firestore.rules** (před, nebo po nahrání kódu).
- **Brána verze:** `settings/app = {minVer, minBy, minAt}`. Verze, která mění tvar dat, po nasazení zvýší minimum (⚙️ → 🔒 Vyžadovat verzi, jen trenér). Klient pod minimem nezapisuje a ukáže pruh „Načíst novou verzi“.
- Převody dat: tlačítko v ⚙️ s náhledem „co se změní“, idempotentní (lze spustit znovu), před převodem záloha.
- Oprávnění dnes: `HK.isStaff()` (trenér, kustod), `HK.isCash()` (trenér, pokladník), `HK.role()`; pravidla `isCoach`, `isStaff`, `isCash`, `isPlayer`. Ve fázi D1 se sjednotí do `can(akce)` – nové kontroly pak jen přes `can()`.
- Pokladník (bez role trenér) spravuje jen členy s rolí Hráčka a nikdy vlastní dokument `members` (vynucují pravidla).

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
- Pravidla databáze se testují jen kontrolou textu (`tests/project.test.js`) – bez emulátoru (rozhodnuto: bez Javy a bez placeného tarifu). Skutečné ověření rolí = kontrolní seznam na telefonu + 👁 Náhled role + testovací účet hráčky.

## 6. Nasazení (postup pro správce)
1. Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře.
2. Podle CHANGELOG: **publikovat firestore.rules** před, nebo po nahrání kódu.
3. Nahrát všechny soubory (smazané soubory z CHANGELOG odstranit i z webu).
4. Na telefonu ⚙️ → Načíst novou verzi, ověřit verzi v záhlaví.
5. Po otestování na všech zařízeních: trenér ⚙️ → 🔒 Vyžadovat verzi (u verzí, které mění data).
6. Návrat: nahrát předchozí zip; pravidla vrátit z historie v konzoli Firebase (*Firestore → Rules → historie*). Minimální verzi pak trenér musí snížit ručně v konzoli (`settings/app.minVer`).

## 7. Práce s Claude (šetření limitů)
- Na začátku vlákna: načíst repozitář, vypsat verzi, přečíst tento soubor a plán (`docs/plan-v18.md`, jen sekci fáze).
- Číst cíleně (grep, jen dotčené soubory); jedna verze = jedno vlákno.
- Výstup: změněné soubory celé (zip s cestami), žádné NAJDI / NAHRAĎ, žádné zkracování, žádné Git příkazy.
- Když úkol vyžaduje zásah jinde (např. do živého zápisu nebo pokladny), nejdřív upozornit a zeptat se.
