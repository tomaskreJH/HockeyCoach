# HockeyCoach (Hokej – zápasy)

**Aktuální verze: v21.2 (25. 10. 2026)** – E2b: **📥 základní sada cvičení** (asi 40 cvičení pro hráčky a brankářky) a **📄 import cvičení z tabulky CSV**, v plánu tréninku **⧉ kopie z předchozího tréninku**, **📑 šablony plánu** a **📊 pokrytí dovedností** přihlášených hráček; cvičení jde smazat jen nepoužité (smažou se i obrázky). **firestore.rules: publikovat před kódem** (nová kolekce `trtpl`). Předtím v21.1 – E2a 📋 plán tréninku, 📷 obrázky a 📄 PDF u cvičení; v21.0 – E1 📚 banka cvičení; v20.7 – D4 úklid před modulem Trénink. Další: v21.3 – E3 ⏱ živý trénink ([docs/plan-trenink.md](docs/plan-trenink.md)); notifikace (N) až po modulu Trénink.

Aplikace pro managery, trenéry, asistenty a hráčky jednoho týmu: soupiska, formace, nominace, události a docházka, pokladna (předpisy, úhrady, vklady, výdaje, příspěvky, platy, měsíce, QR platby), zápasy s živým zápisem, soupeři, statistiky.
Běží v prohlížeči jako PWA (instalace na plochu, offline provoz), bez vlastního serveru. Data jsou ve Firebase (Firestore, bezplatný tarif Spark), přihlášení účtem Google.

| Dokument | Obsah |
|---|---|
| [docs/KONVENCE.md](docs/KONVENCE.md) | programovací řád, mapa souborů, verze, testy, postup nasazení – **vstupní bod pro vývoj** |
| [CHANGELOG.md](CHANGELOG.md) | historie verzí a postup nasazení každé verze |
| [docs/plan-v18.md](docs/plan-v18.md) | plán dalších verzí, rozhodnutí, otevřené otázky |
| [docs/plan-trenink.md](docs/plan-trenink.md) | modul Trénink (v21.x) a úklid D4 před ním – kontrola kódu, datový model, fáze, otázky |
| [docs/prompt-dalsi-vlakno.md](docs/prompt-dalsi-vlakno.md) | prompt pro nové vlákno s Claude (start, stav, pravidla práce, šetření limitu) |
| [docs/archiv-plan-v18.md](docs/archiv-plan-v18.md) | dokončené fáze v18.0 – v20.6 (popisy, rozhodnutí, kontroly) |
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
5. První manager ručně: kolekce `members`, ID dokumentu = e-mail malými písmeny, pole `role` = `manager`, `rv` = `2` (číslo). Další členy přidává manager v ⚙️ → 👥 Tým a členové (přijetím ✋ žádosti nebo + Přidat člena ručně).

Hosting kdekoli přes HTTPS (Firebase Hosting, Netlify, GitHub Pages) – nahrát celou složku kromě `node_modules/` (složky `tests/` a `docs/` na webu nevadí, aplikace je nenačítá).

## Nasazení nové verze
1. Záloha: ⚙️ → 💾 Data → Stáhnout zálohu (JSON) + zip současného repozitáře.
2. Podle záznamu v CHANGELOG **publikovat firestore.rules** (před, nebo po nahrání kódu).
3. Nahrát soubory; soubory, které CHANGELOG uvádí jako odstraněné, smazat i na webu.
4. Na zařízeních ⚙️ → **Načíst novou verzi** (číslo verze je v záhlaví vedle názvu).
5. Po otestování: manager ⚙️ → **🔒 Vyžadovat verzi** – zařízení se starší verzí pak nic nezapisují a ukážou pruh „⚠️ Starší verze aplikace“.
6. Návrat ke starší verzi: nahrát předchozí zip, pravidla vrátit z historie v konzoli Firebase; minimální verzi (`settings/app.minVer`) snížit ručně v konzoli.

## Role a ochrana dat (stručně)
| Role (`members/{email}.role`) | Smí |
|---|---|
| `manager` (+ `rv: 2`) | vše (členové a ✋ žádosti o přijetí do týmu, soupiska, zápasy, události, docházka, pokladna vždy, účty – změna účtu jen návrh + potvrzení jiným správcem pokladny, obnova ze zálohy, brána verze); managerů víc, aspoň jeden zůstává vždy |
| `trener` (+ `rv: 2`) | sport: zápasy a živý zápis, události, docházka, soupeři, formace, soupiska a realizační tým, 📚 banka cvičení (i 📥 základní sada a 📄 import), 📋 plán tréninku (⧉ kopie, 📑 šablony, 📊 pokrytí dovedností); pokladna jen s příznakem `cash` (převod ho dá každému trenérovi, který nebude managerem) |
| `asistent` (+ `rv: 2`) | dřívější kustod: zápasy a živý zápis, soupeři, formace, události (i ❌ zrušení), docházka za kohokoli, ✋ žádosti o změnu účasti; u hráčky jen stav; 📚 banka cvičení – číst, zakládat a upravovat (mazat podle matice); 📋 plán tréninku – číst a upravovat (i šablony a 📊 pokrytí) |
| jiná hodnota role (např. stará `kustod`) | bez přístupu – přihlášení ukáže „neplatná role“, manager ji změní v ⚙️ → 👥 Tým a členové; `trener` bez `rv` = Trenér |
| `hracka` (+ `pid`) | čte týmová data, zapisuje jen vlastní docházku; banku cvičení nevidí, 📋 plán tréninku jen čte (svá skupina zvýrazněná); Moje platby jen své předpisy |
| `host` (+ `pid` hráčky 🎟) | hostující: čte jen sebe (svou hráčku, docházku, předpisy, žádosti, nepřítomnosti) a veřejné hlavičky `evpub`; formaci `lineuppub` jen u události se svým ✅ Jdu |
| matice `settings/perm` | práva Trenér / Asistent / Hráčka po modulech (číst / upravovat / rušit / mazat), mění jen manager v ⚙️ → 🔐 Práva rolí; chybějící dokument = výchozí práva (tabulka výše); pevné zůstává sport (zápasy, docházka, formace), soupiska, členové, pokladna (příznak `cash`) a nastavení |
| příznak `cash: true` | pokladník: předpisy, pohyby, vyúčtování, nastavení pokladny; **členy jen s rolí Hráčka a ne vlastní účet** |

Účet bez `members` smí jen založit / zrušit vlastní žádost `joinreq/{email}` (vyřizuje manager). Pravidla databáze (`firestore.rules`) jsou skutečná ochrana – skrytí v rozhraní nestačí. Známé mezery (důvody omluv, platy trenérů a platební pole soupisky čitelné všemi členy; uzávěrka přihlašování jen v aplikaci) řeší fáze S a W v plánu.

## Struktura
Podrobná mapa souborů je v [docs/KONVENCE.md](docs/KONVENCE.md). Ve zkratce: `src/config` (konstanty) → `src/core` (stav, pomůcky, verze) → `src/domain` (čisté výpočty, testované) → `src/views` (obrazovky) → `src/main.js`; datová vrstva `src/data/storage.js`; testy `tests/`; dokumentace `docs/`.

## Když po nahrání vidíš starou verzi
⚙️ → **Načíst novou verzi** (smaže uloženou kopii aplikace, data zůstanou v databázi). Na web musí být nahrané všechny soubory včetně `sw.js` a celé složky `src/`.
