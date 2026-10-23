# HockeyCoach (Hokej – zápasy)

**Aktuální verze: v19.5.2 (23. 10. 2026)** – 📊 Rozpočet sezóny, část 3 (Team → 📊 Rozpočet, jen trenér a pokladník): ✅ schválení rozpočtu (neměnná kopie `approved`), úpravy po schválení s povinným důvodem (`rev`) a porovnáním se schváleným, 🖨 export pro valnou hromadu (tisk / PDF, ⬇️ CSV). **Publikovat firestore.rules před kódem.** Fáze RP je tím hotová. Další: v19.6 – 🏠 úvodní přehled (UP). Dříve v19.5.1 – 📈 plnění a 💧 cashflow rozpočtu, v19.5 – 📊 rozpočet sezóny (parametry, položky, plán po měsících, odhad příspěvku; kolekce `budget`), v19.4.1 – ✋ žádost o změnu placení, v19.4 – 💳 Moje platby po měsících, v19.3 – ⚖️ hospodaření události a měsíce, v19.2 – 🔁 opakované události, v19.1 – soukromí v databázi.

Aplikace pro trenéry, kustody a hráčky jednoho týmu: soupiska, formace, nominace, události a docházka, pokladna (předpisy, úhrady, vklady, výdaje, příspěvky, platy, měsíce, QR platby), zápasy s živým zápisem, soupeři, statistiky.
Běží v prohlížeči jako PWA (instalace na plochu, offline provoz), bez vlastního serveru. Data jsou ve Firebase (Firestore, bezplatný tarif Spark), přihlášení účtem Google.

| Dokument | Obsah |
|---|---|
| [docs/KONVENCE.md](docs/KONVENCE.md) | programovací řád, mapa souborů, verze, testy, postup nasazení – **vstupní bod pro vývoj** |
| [CHANGELOG.md](CHANGELOG.md) | historie verzí a postup nasazení každé verze |
| [docs/plan-v18.md](docs/plan-v18.md) | plán dalších verzí, rozhodnutí, otevřené otázky |
| [docs/prompt-dalsi-vlakno.md](docs/prompt-dalsi-vlakno.md) | prompt pro nové vlákno s Claude (start, stav, pravidla práce, šetření limitu) |
| [docs/archiv-plan-v18.md](docs/archiv-plan-v18.md) | dokončené fáze v18.0 – v18.7.1 |
| [docs/archiv-readme-v18.7.1.md](docs/archiv-readme-v18.7.1.md) | původní podrobné README (technický popis funkcí) |
| Nápověda v aplikaci (❓) | ovládání aplikace – jediný uživatelský návod (`src/views/help.js`) |

## Spuštění a testy
- Lokálně: `npm start` (nebo `python3 -m http.server`) a otevřít `http://localhost:3000` (resp. `:8000`). Z `file://` se moduly nenačtou.
- Testy: `npm test` – Node 22+, nic se neinstaluje. Testují pokladnu, účty a QR, docházku, dlužníky, živý zápis (střídání, rotace, Zpět, tresty), soulad verze a pravidel databáze, společné pomůcky (potvrzení, CSV, jména, přetahování), statistiky `playerStats`, oprávnění všech rolí, soukromí v databázi (připojení `attnote` / `staffpay` / `plpay`, převod, záloha), strukturu kódu a srovnávací výstupy úklidu (statistiky, CSV, VS – `tests/fixtures/d1-baseline.json`).
- Aplikace se spouští přímo ze zdrojových modulů (bez sestavování). Firebase SDK se stahuje z `gstatic.com`; po prvním spuštění je v offline cache.

## Nastavení Firebase (jednorázově)
1. Projekt v console.firebase.google.com, *Firestore Database* v EU (`eur3` nebo `europe-west3`).
2. *Firestore → Rules*: vložit `firestore.rules` → **Publish** (při každé verzi, která pravidla mění – viz CHANGELOG).
3. *Authentication → Sign-in method → Google → Enable*; v *Authorized domains* doména hostingu.
4. *Project settings → Your apps → Web app* → hodnoty do `src/data/firebase-config.js` (klíč není tajný, chrání pravidla).
5. První trenér ručně: kolekce `members`, ID dokumentu = e-mail malými písmeny, pole `role` = `trener`. Další členy přidává trenér v ⚙️ → Členové týmu.

Hosting kdekoli přes HTTPS (Firebase Hosting, Netlify, GitHub Pages) – nahrát celou složku kromě `node_modules/` (složky `tests/` a `docs/` na webu nevadí, aplikace je nenačítá).

## Nasazení nové verze
1. Záloha: ⚙️ → Stáhnout zálohu (JSON) + zip současného repozitáře.
2. Podle záznamu v CHANGELOG **publikovat firestore.rules** (před, nebo po nahrání kódu).
3. Nahrát soubory; soubory, které CHANGELOG uvádí jako odstraněné, smazat i na webu.
4. Na zařízeních ⚙️ → **Načíst novou verzi** (číslo verze je v záhlaví vedle názvu).
5. Po otestování: trenér ⚙️ → **🔒 Vyžadovat verzi** – zařízení se starší verzí pak nic nezapisují a ukážou pruh „⚠️ Starší verze aplikace“.
6. Návrat ke starší verzi: nahrát předchozí zip, pravidla vrátit z historie v konzoli Firebase; minimální verzi (`settings/app.minVer`) snížit ručně v konzoli.

## Role a ochrana dat (stručně)
| Role (`members/{email}.role`) | Smí |
|---|---|
| `trener` | vše (členové, soupiska, zápasy, události, docházka, pokladna, účty – změna účtu jen návrh + potvrzení jiným správcem pokladny, obnova ze zálohy, brána verze) |
| `kustod` | zápasy a živý zápis, soupeři, formace, události, docházka za kohokoli; u hráčky jen stav |
| `hracka` (+ `pid`) | čte týmová data, zapisuje jen vlastní docházku; Moje platby jen své předpisy |
| příznak `cash: true` | pokladník: předpisy, pohyby, vyúčtování, nastavení pokladny; **členy jen s rolí Hráčka a ne vlastní účet** |

Pravidla databáze (`firestore.rules`) jsou skutečná ochrana – skrytí v rozhraní nestačí. Známé mezery (důvody omluv, platy trenérů a platební pole soupisky čitelné všemi členy; uzávěrka přihlašování jen v aplikaci) řeší fáze S a W v plánu.

## Struktura
Podrobná mapa souborů je v [docs/KONVENCE.md](docs/KONVENCE.md). Ve zkratce: `src/config` (konstanty) → `src/core` (stav, pomůcky, verze) → `src/domain` (čisté výpočty, testované) → `src/views` (obrazovky) → `src/main.js`; datová vrstva `src/data/storage.js`; testy `tests/`; dokumentace `docs/`.

## Když po nahrání vidíš starou verzi
⚙️ → **Načíst novou verzi** (smaže uloženou kopii aplikace, data zůstanou v databázi). Na web musí být nahrané všechny soubory včetně `sw.js` a celé složky `src/`.
