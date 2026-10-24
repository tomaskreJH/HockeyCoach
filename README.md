# HockeyCoach (Hokej – zápasy)

**Aktuální verze: v20.3 (24. 10. 2026)** – OM0: okno ⚙️ rozdělené do sbalitelných sekcí (👤 Účet, 👥 Tým a členové, 📅 Události, 💰 Pokladna, 💾 Data, 🔒 Aplikace, 🛠 Vývojář), stav v záhlaví sekce, přidání člena až po rozkliknutí; práva, data i pravidla beze změny (**firestore.rules nepublikovat**). Další: v20.4 – OM1 role manager / trener / asistent. Dříve v20.2.1 – výběr hráčky 🎟 přepne roli na Hostující, v20.2 – role Hostující, v20.1 – ✋ žádosti o změnu účasti a 🏖 nepřítomnost, v20.0 – ❌ zrušení události, v19.9 – 🎟 hostující hráčky, v19.8 – 🚫 nedorazila bez omluvy, v19.7 – 📅 čas od – do a ⏰ sraz, v19.6.x – 🏠 Domů, žádost o přijetí, náhled živého zápasu, v19.5.x – 📊 rozpočet sezóny, v19.4.x – 💳 Moje platby, v19.3 – ⚖️ hospodaření, v19.2 – 🔁 opakované události, v19.1 – soukromí v databázi.

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
5. První trenér ručně: kolekce `members`, ID dokumentu = e-mail malými písmeny, pole `role` = `trener`. Další členy přidává trenér v ⚙️ → 👥 Tým a členové (přijetím ✋ žádosti nebo + Přidat člena ručně).

Hosting kdekoli přes HTTPS (Firebase Hosting, Netlify, GitHub Pages) – nahrát celou složku kromě `node_modules/` (složky `tests/` a `docs/` na webu nevadí, aplikace je nenačítá).

## Nasazení nové verze
1. Záloha: ⚙️ → 💾 Data → Stáhnout zálohu (JSON) + zip současného repozitáře.
2. Podle záznamu v CHANGELOG **publikovat firestore.rules** (před, nebo po nahrání kódu).
3. Nahrát soubory; soubory, které CHANGELOG uvádí jako odstraněné, smazat i na webu.
4. Na zařízeních ⚙️ → **Načíst novou verzi** (číslo verze je v záhlaví vedle názvu).
5. Po otestování: trenér ⚙️ → **🔒 Vyžadovat verzi** – zařízení se starší verzí pak nic nezapisují a ukážou pruh „⚠️ Starší verze aplikace“.
6. Návrat ke starší verzi: nahrát předchozí zip, pravidla vrátit z historie v konzoli Firebase; minimální verzi (`settings/app.minVer`) snížit ručně v konzoli.

## Role a ochrana dat (stručně)
| Role (`members/{email}.role`) | Smí |
|---|---|
| `trener` | vše (členové a ✋ žádosti o přijetí do týmu, soupiska, zápasy, události, docházka, pokladna, účty – změna účtu jen návrh + potvrzení jiným správcem pokladny, obnova ze zálohy, brána verze) |
| `kustod` | zápasy a živý zápis, soupeři, formace, události (i ❌ zrušení), docházka za kohokoli, ✋ žádosti o změnu účasti; u hráčky jen stav |
| `hracka` (+ `pid`) | čte týmová data, zapisuje jen vlastní docházku; Moje platby jen své předpisy |
| `host` (+ `pid` hráčky 🎟) | hostující: čte jen sebe (svou hráčku, docházku, předpisy, žádosti, nepřítomnosti) a veřejné hlavičky `evpub`; formaci `lineuppub` jen u události se svým ✅ Jdu |
| příznak `cash: true` | pokladník: předpisy, pohyby, vyúčtování, nastavení pokladny; **členy jen s rolí Hráčka a ne vlastní účet** |

Účet bez `members` smí jen založit / zrušit vlastní žádost `joinreq/{email}` (vyřizuje trenér). Pravidla databáze (`firestore.rules`) jsou skutečná ochrana – skrytí v rozhraní nestačí. Známé mezery (důvody omluv, platy trenérů a platební pole soupisky čitelné všemi členy; uzávěrka přihlašování jen v aplikaci) řeší fáze S a W v plánu.

## Struktura
Podrobná mapa souborů je v [docs/KONVENCE.md](docs/KONVENCE.md). Ve zkratce: `src/config` (konstanty) → `src/core` (stav, pomůcky, verze) → `src/domain` (čisté výpočty, testované) → `src/views` (obrazovky) → `src/main.js`; datová vrstva `src/data/storage.js`; testy `tests/`; dokumentace `docs/`.

## Když po nahrání vidíš starou verzi
⚙️ → **Načíst novou verzi** (smaže uloženou kopii aplikace, data zůstanou v databázi). Na web musí být nahrané všechny soubory včetně `sw.js` a celé složky `src/`.
