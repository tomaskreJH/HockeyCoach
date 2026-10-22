# Hokej – zápasy (modulární projekt)

**Aktuální verze: v18.0 (22. 10. 2026)** – **tlačítko Zpět na telefonu funguje uvnitř aplikace** (zavírá okna, panely a detaily, vrací kroky zápasu a záložky; z domovské stránky se zeptá na ukončení; v živém zápisu nic nezapíše ani nezastaví čas). Dříve: v17.7 – **párování plateb a dva účty**: pohyby v pokladně ukazují, za co jsou (VS a zpráva pro příjemce stejná jako v QR), tým může mít hlavní a provozní účet (každý předpis a pohyb má svůj účet, zůstatky po účtech, QR vede na správný účet) a souhrnnou platbu jedním QR lze poslat jen za předpisy na stejný účet; **Soupeři pro všechny členy** s bilancí v seznamu a proklikem na zápis a vývoj jednotlivých zápasů. Dříve: v17.6 – **zpráva pro příjemce u plateb**: každý předpis v Moje platby ukazuje, za co se platí (např. „Zápas 10.10. Sokol - Jana“, „Trénink 14.10. - Jana“, „Příspěvek 10/2026 - Jana“), a stejný text je v QR platbě. Dříve: v17.5 – **přeorganizované zobrazení**: záložka Události řeší jen události (bez výběru „Zapisuji za“), pokladna v detailu události je až na konci stránky a správa pokladny (💰 Platby, 🏦 Pokladna, 📅 Měsíce) se přesunula do záložky Team. Dříve: v17.4 – osvobozené hráčky s vlastním nastavením plateb a koeficient v procentech (0–100 % místo 1 / 0,5 / 0); v17.3 – **modul Pokladna, fáze F4** (měsíční příspěvky, platy realizačního týmu, hospodaření po měsících, CSV export pokladny), **Statistiky pro všechny členy týmu**, úklid projektu (odstraněn samostatný návod, počáteční data a kód migrací) a opravy nalezených chyb. Dříve: v17.2 – **Pokladna F3** (Moje platby, QR platba, blokace „Jdu“, výjimky, chráněná kolekce `evcash`); v17.1 – **Pokladna F2** (úhrady, vklady, výdaje, kategorie, zůstatek, storno); v17.0 – **Pokladna F1** (osoby a role, koeficient fx, nastavení a šablony, výpočet a uzavření vyúčtování → předpisy, migrace plateb); v17.0.1 a v17.0.2 – opravy načítání; v16.3 – přehled plateb a dlužných částek, oprava výpočtu ceny na osobu a přihlášení trenérů a kustodů do událostí sami za sebe; v16.2 – platby za události a realizační tým; v16.1 – přihlášení hráček; v16.0 – modul Události a docházka; v15.7 – přehled Čas na ledě; v15.6 – oprava přesilovek a oslabení; v15.5 – přepracovaná logika střídání a rotace; v15.4 – oprava nasazování jednotek; nápověda v aplikaci (tlačítko ❓), průměrná délka střídání v celkových statistikách a řazení tabulek klepnutím na hlavičku.

Aplikace pro trenéry, kustody a hráčky: soupiska, formace, nominace, události a docházka, pokladna (předpisy, úhrady, vklady, výdaje, měsíční příspěvky, platy, hospodaření po měsících), zápasy s živým zápisem, soupeři, statistiky.
Běží v prohlížeči jako PWA, nepotřebuje Claude ani vlastní server. Data jsou v databázi Firebase (Firestore) a přistupuje se k nim po přihlášení účtem Google. Bez signálu aplikace funguje dál a změny se odešlou po připojení.

## Struktura projektu
```
HockeyCoach/
├─ index.html vstupní stránka (načítá styly a src/main.js jako ES modul, záhlaví s tlačítky ❓ a ⚙️)
├─ styles/main.css styly
├─ src/
│ ├─ main.js spuštění aplikace, odběr změn dat, zapnutí řazení tabulek, nápovědy a nastavení pokladny
│ ├─ debug.js ladicí hák (stránka s ?debug zpřístupní funkce v window.__hk)
│ ├─ config/constants.js konstanty: pozice, důvody trestů, funkce členů týmu, rozložení formací a jednotek
│ ├─ core/ stav, pomocné funkce, čtecí selektory, akce (ukládání), řazení tabulek, tlačítko Zpět
│ │ ├─ state.js utils.js selectors.js actions.js table-sort.js
│ │ └─ nav.js tlačítko Zpět (strážní záznam historie, zavření nejvyšší vrstvy, dotaz na ukončení; v18.0)
│ ├─ data/
│ │ ├─ storage.js datová vrstva: Firebase (Firestore + přihlášení Google), role, propojení účtu s hráčkou / členem týmu, dávkové zápisy, kontrola mazání vyúčtovaných událostí, záloha/obnova, okno ⚙️
│ │ └─ firebase-config.js nastavení Firebase projektu (vyplnit vlastními hodnotami)
│ ├─ lib/qrcode.js knihovna qrcode-generator 1.4.4 (MIT) převedená na ES modul; QR kód se generuje lokálně v zařízení
│ ├─ domain/ pravidla hry a výpočty bez DOM
│ │ ├─ lineup.js nominace, náhradnice, způsobilost ke spuštění živého zápisu, synchronizace živého stavu se sestavou
│ │ ├─ live-engine.js čas, střídání a rotace, tresty podle IIHF, jednotky PP/OS, formace při oslabení, kontrola invariantů front
│ │ ├─ timeline.js úplná časová osa zápasu a statistika střídání
│ │ ├─ corrections.js opravy konců třetin, konce zápasu a prodloužení
│ │ ├─ shift-edit.js editace střídání (časy, předání, výměna hráčky, kontrola historie)
│ │ └─ cash.js pokladna: skupiny, osvobozené, koeficient, šablony, výpočet předpisů, úhrady, zůstatek a kategorie, přehled dluhů, příspěvky, platy, měsíce, CSV
│ └─ views/ obrazovky (DOM)
│ ├─ shell.js matches.js opponents.js stats.js modal.js
│ ├─ team.js záložka Team: přepínač Team | 💰 Platby | 🏦 Pokladna | 📅 Měsíce, základní formace, náhradnice, soupiska, realizační tým (hráčka-pokladník jen ke čtení)
│ ├─ help.js nápověda v aplikaci (tlačítko ❓) – jediný návod k aplikaci
│ ├─ events.js události a docházka (seznam, kalendář, detail, přihlašování, pětky na tréninku, statistiky uzavřeného zápasu, omezený pohled hráčky); cashPanel() vykresluje režimy Platby, Pokladna a Měsíce pro záložku Team
│ ├─ payments.js pokladna u události (náklady, kdo platí, atomické uzavření vyúčtování, okno úhrady)
│ ├─ finance.js přehled plateb a dluhů za všechny události (po hráčkách, po událostech, nevyúčtované události)
│ ├─ cashbook.js pokladna: zůstatek, vklady, výdaje, součty podle kategorií, seznam pohybů, storno
│ ├─ money.js pokladna – měsíce (F4): příspěvky, platy, hospodaření po měsících, CSV export
│ ├─ mine.js Moje platby (předpisy člena, dluh, QR platba) a banner s upozorněním na dluh
│ ├─ cash-settings.js nastavení pokladny (IBAN, příspěvek, splatnosti, kategorie, šablony)
│ ├─ lineup-editor.js live.js live-quick.js report.js
│ └─ editor.js shift-editor.js opravy zápisu (události, třetiny, střídání, základ)
├─ firestore.rules pravidla přístupu k databázi (vložit do Firebase Console)
├─ manifest.webmanifest, sw.js, icon-*.png instalace na plochu a offline provoz
└─ package.json jen skript npm start (lokální server)
```
Aplikace se vždy spouští ze zdrojových modulů (bez sestavování).
**Pravidlo závislostí:** `config` → `core` → `domain` → `views` → `main`. Doména nikdy nesahá do DOM, obrazovky obsahují jen vykreslení a obsluhu.

## Jak aplikaci spustit
Moduly se z `file://` v prohlížeči nenačtou, aplikace potřebuje malý lokální server:
- `npm start` (nebo `python3 -m http.server`) a otevři `http://localhost:3000` (resp. `:8000`).
- Při hostingu nahraj na web celou složku (kromě `node_modules/`), včetně `sw.js`, `firestore.rules` a složky `src/`.
- Aplikace stahuje Firebase SDK z `gstatic.com`; první spuštění tedy vyžaduje internet, potom je SDK uloženo v offline paměti (service worker).

## Nastavení Firebase (jednorázově)
1. **Projekt:** na console.firebase.google.com založ projekt. *Build → Firestore Database → Create database*, region v EU (`eur3` nebo `europe-west3`).
2. **Pravidla:** *Firestore → Rules* → vlož obsah `firestore.rules` → **Publish**. Pravidla musí obsahovat i kolekce `events`, `attendance`, `staff`, `charges`, `cash`, `audit` a `evcash`. **Verze 17.3 pravidla mění (odstraněna kolekce `payments`, pokladník mění v událostech jen příznak `ss`): po nahrání pravidla znovu publikuj.**
3. **Přihlášení:** *Authentication → Sign-in method → Google → Enable*. V *Settings → Authorized domains* musí být doména, odkud aplikaci otevíráš (`localhost` bývá přidaný, hosting přidej ručně).
4. **Konfigurace:** *Project settings → Your apps → Web app (</>)* → hodnoty vlož do `src/data/firebase-config.js`.
5. **První trenér (ručně):** *Firestore → Start collection* `members` → ID dokumentu = tvůj e-mail **malými písmeny**, pole `role` (string) = `trener`. Další členy pak přidáváš v aplikaci (⚙️ → Členové týmu).
6. **Přenos dat:** ⚙️ → Stáhnout zálohu (JSON), na novém místě po přihlášení ⚙️ → Obnovit ze zálohy → **Nahradit vším**.

Hosting je možný kdekoli přes HTTPS (Firebase Hosting, Netlify, GitHub Pages). HTTPS je nutné pro přihlášení, instalaci na plochu, offline režim a zámek displeje při živém zápisu. Při Firebase Hostingu se web nasazuje příkazem `firebase deploy`, samotný push na GitHub stránku nezmění.

## Nápověda
- **V aplikaci:** tlačítko **❓** v záhlaví (vedle ⚙️) otevře celoobrazovkový přehled ovládání rozdělený do rozbalovacích sekcí (přihlášení a role, události a docházka, Team, zápas, živý zápis, tresty, menu ⋯, zápis utkání a opravy, statistiky, Moje platby, pokladna, záloha, rychlá reference). Nahoře je **vyhledávání** (nevyhovující sekce se skryjí, vyhovující rozbalí). Zavře se tlačítkem Zavřít nebo klávesou Esc. Nápověda je čistě informační a funguje i offline.
- **Nápověda je jediný návod.** Samostatný soubor `hockeycoach-navod.html` byl ve v17.3 odstraněn.
- **Za živého zápisu** je živá obrazovka přes celé záhlaví, nápovědu proto otevři před zahájením zápasu (nebo po ✕ Zavřít živý zápis).
- **Technicky:** `src/views/help.js` (obsah je pole `SECTIONS`, nová sekce = nový objekt `{t, h}`), tlačítko `#help` v `index.html`, napojení `initHelp()` v `src/main.js`. Při změně ovládání uprav `SECTIONS`.

## Přihlášení, role a ochrana dat
- **Přihlášení:** účtem Google. Přístup mají jen e-maily zapsané v kolekci `members` (Google účet se musí shodovat s e-mailem v seznamu). Neznámý účet po přihlášení nic neuvidí.
- **Role** (uložené v `members/{email}`, vynucují je pravidla databáze, ne jen tlačítka v aplikaci):

| Role | Čtení | Zápis |
|---|---|---|
| **trener** | vše | vše: soupiska, zápasy, soupeři, formace, události, docházka (za kohokoli), pokladna, realizační tým, členové týmu, obnova ze zálohy |
| **kustod** | vše kromě pokladny (předpisy, pohyby, audit) | zápasy (nominace, sestava, živý zápis, opravy), soupeři, základní formace, události, docházka (za kohokoli); v soupisce jen stav hráčky (např. trvalé zranění ze živého zápisu) |
| **hracka** | vše kromě pokladny (v aplikaci záložky Události, Statistiky, Soupeři (jen ke čtení) a Moje platby; hráčka-pokladník navíc Team: formace a soupiska jen ke čtení a správa pokladny) | jen vlastní docházka (`attendance/{eventId}_{svojePid}`) |

- **Pokladník** je příznak `cash:true` v `members/{email}` navíc k roli (trenér má práva pokladníka vždy). Zápis: předpisy, pohyby pokladny, nastavení pokladny, pole plateb hráček (`grp`, `fx`, `ex`, `note`), plat člena týmu (`pay`), pole pokladny v událostech a zápasech, přidávání členů (ne s rolí trenér).
- **Hráčky (v16.1):** účet hráčky je `members/{email}` s `role: "hracka"` a polem `pid` = id hráčky v kolekci `players`. Trenér ho vytvoří v ⚙️ → Členové týmu (role Hráčka + výběr hráčky ze soupisky; stejný e-mail znovu = změna propojení). Hráčka bez `pid` se do aplikace nedostane (hláška, ať ji trenér propojí).
- **Trenéři a kustodi v docházce (v16.3):** trenér a kustod se do události hlásí jako **člen realizačního týmu** (kolekce `staff`, Team → Realizační tým). Aby se mohli přihlásit sami jedním klepnutím, propojí trenér jejich účet s členem týmu: ⚙️ → Členové týmu → e-mail + role Trenér/Kustod + výběr člena realizačního týmu (pole `tid` v `members/{email}`). Takto propojený uživatel má na kartách v Událostech rychlá tlačítka **✅ Jdu / ❌ Nejdu / ❓ Nejsem jistý** za sebe (od v17.5). Bez propojení se odpovídá v detailu události (skupina Realizační tým). Propojení je v `members`, které čte jen trenér a daný uživatel (e-maily trenérů tedy hráčky nevidí).
- **Co vidí a smí hráčka:** záložky **Události** (seznam, kalendář, detail, rozdělení do pětek jen ke čtení, výsledek a statistiky uzavřeného zápasu), **Statistiky** (od v17.3, jen ke čtení), **Soupeři** (od v17.7, jen ke čtení: bilance, zápasy, zápis a vývoj zápasu) a **Moje platby**. Zapisuje vždy jen za sebe; po termínu přihlašování (nebo po dni události) se její tlačítka zamknou a odpověď změní jen trenér nebo kustod. V detailu vidí odpovědi ostatních, ale **důvody ostatních vidí jen trenér a kustod**. Nevidí kartu zápasu, Team, pokladnu ani náklady událostí, nemůže zakládat ani upravovat události. V ⚙️ nemá zálohu ani správu členů.
- **Statistiky pro všechny (v17.3):** záložku Statistiky vidí každý člen týmu (trenér, kustod, hráčka). Data zápasů čtou všichni členové už podle dřívějších pravidel, statistiky se počítají jen z uzavřených zápasů.
- **Jen pro trenéry:** kolekce `coach` (pro budoucí hodnocení hráček a poznámky) je pro ostatní role nečitelná. Pravidla Firestore omezují celé dokumenty, ne jednotlivá pole; údaje pro trenéry proto patří do oddělené kolekce.
- **Kustod** nemůže přidávat a mazat hráčky ani měnit jejich jména a pozice a nespravuje realizační tým. Od v17.3 se mu tato tlačítka v záložce Team nezobrazují (Upravit u hráčky zůstává kvůli stavu). Pokladník bez role trenér vidí u člena týmu jen Upravit (plat).
- **Klíč Firebase** v `firebase-config.js` není tajný. Ochranu dat zajišťují pravidla a přihlášení.
- **Data v databázi:** jen přezdívky, čísla, statistiky, platby a e-maily členů. Věk hráček se neukládá.
- **Pozor – data čte i hráčka:** pravidla dovolují roli Hráčka čtení většiny kolekcí (aplikace je při startu poslouchá), takže technicky může data přečíst i mimo aplikaci. Skrytí je zatím jen v rozhraní. Náklady a vyúčtování událostí jsou od v17.2 v chráněné kolekci `evcash`. Kolekce `charges`, `cash`, `audit` a `evcash` jsou pravidly chráněné (předpisy čte jen jejich vlastník a správci).
- Dál dělej zálohy JSON (⚙️ → Stáhnout zálohu). Automatické zálohy Firestore vyžadují placený plán Blaze.

## Události a docházka (v16.0 až v16.3)
Modul se doplňuje postupně.

### Záložka Události
Horní menu je **Události · Team · Statistiky · Soupeři** (hráčka vidí Události, Statistiky a Soupeře). Záložka **Události** sloučila dřívější Zápasy a přidala tréninky. Zápasy se zakládají a vedou stejně jako dřív: klepnutím na zápas se otevře detail události a tlačítko **🏒 Otevřít zápas** přejde do karty zápasu (nominace, sestava, živý zápis, opravy…). Návrat je klepnutím na **Události** v horním menu.
- **Seznam (v17.5):** nahoře **+ Trénink / + Zápas** (trenér, kustod), pod tím **Nadcházející · Minulé · Kalendář** a karty událostí. Výběr „Zapisuji účast za“ byl odstraněn. Rychlá tlačítka **✅ Jdu / ❌ Nejdu / ❓ Nejsem jistý** na kartě zapisují za přihlášenou hráčku, nebo za trenéra / kustoda propojeného s realizačním týmem; ostatním se na kartě nezobrazí. Docházku za ostatní trenér a kustod odklikává v detailu události.
- **Seznam:** přepínač Nadcházející / Minulé / **Kalendář** (měsíční mřížka, tečky u dnů s událostí, klepnutím na den se seznam zúží) a pro trenéra a pokladníka **💰 Platby** a **🏦 Pokladna**. U každé události je termín přihlášení, počty ✅ ❓ ❌, přihlášení podle rolí (útočnice, obránkyně, brankářky, trenéři) a vaše odpověď.
- **Jdu:** zapíše se hned (opakované klepnutí odpověď zruší). **Nejdu** vyžaduje důvod (rychlé volby Nemoc, Zranění, Škola, Práce, Rodina, Jiné, nebo vlastní text). **Nejsem jistý** má důvod nepovinný. V okně s důvodem jde odpověď i zrušit.
- **Konečný termín přihlašování** je povinný u tréninku a nastavuje se u každé události (datum a čas). Výchozí hodnota je den před událostí v 18:00. Po termínu (a po dni události) jsou rychlá tlačítka v seznamu zamčená 🔒; trenér a kustod mohou v detailu odpovědi měnit i po termínu. Termín zápasu se nastavuje v detailu události (✏️ Čas, místo, termín).
- **Termín hlídá jen aplikace.** Pravidla databáze zatím termín nekontrolují (hráčka s upraveným klientem by mohla odpověď změnit i po termínu). Pro běžný provoz stačí; případné vynucení v pravidlech by vyžadovalo uložit termín jako číslo (ms).
- **Detail události:** souhrn (jdou / nejistí / nejdou / bez odpovědi), seznam všech aktivních hráček podle pozic a realizačního týmu s odpovědí, důvodem a tlačítky pro změnu (trenér tak zapíše odpověď za kohokoli, hráčka jen za sebe), u trenéra a pokladníka karta Pokladna. **Pořadí (v17.5):** hlavička, docházka, výsledek a statistiky zápasu, rozdělení do pětek, a až na konci stránky pokladna (náklady už nejsou v hlavičce detailu). Trénink lze upravit nebo smazat (smaže i odpovědi; vyúčtovaný trénink viz „Mazání událostí“).
- **Trénink – rozdělení do pětek:** v detailu tréninku jsou hráčky, které jdou (bez brankářek). Každé se jedním klepnutím přiřadí 1.–4. pětka (barvy jako v živém zápisu: modrá, žlutá, zelená, růžová) nebo „–“. Tlačítko **↻ Podle základní formace** rozdělí přihlášené hráčky podle základní formace v záložce Team (partnerky z rotace patří do téže pětky); **Vymazat** rozdělení zruší. Hráčka vidí rozdělení jen ke čtení.

## Pokladna (v17.0 F1, v17.1 F2, v17.2 F3, v17.3 F4)
Fáze: **F1** osoby, nastavení, výpočet a uzavření vyúčtování · **F2** úhrady, vklady, výdaje, kategorie, zůstatek · **F3** Moje platby, upozornění na dluh, splatnost, blokace „Jdu“, výjimky, QR platba, oddělení nákladů do chráněné kolekce · **F4** měsíční příspěvky, platy realizačního týmu, přehled hospodaření po měsících, CSV export. Modul je kompletní.

### Osoby a nastavení (F1)
- **Osoby:** `players` má pole `grp` (`monthly`|`single`), `ex` (osvobozená / zvýhodněná, `true`|`false`), `fx` (koeficient 0..1, v aplikaci se zadává v procentech 0–100 % s přesností 0,1 %; výchozí 100 %) a `note`. Brankářky a realizační tým neplatí.
- **Osvobozená (v17.4):** samostatný příznak, nezávislý na koeficientu. V událostech tvoří osvobozené hráčky vlastní skupinu **Osvobozené (zvýhodněné)** se stejnými volbami jako ostatní skupiny (Platí ANO / NE, Výpočet / Pevná částka) – v šablonách (⚙️ → Nastavení pokladny) i u každé události. Výchozí šablony mají „Platí: NE“, takže se dosavadní chování nemění. U měsíčních příspěvků je osvobozená hráčka ve výchozím stavu vynechaná a pro konkrétní měsíc jde zahrnout (a naopak kohokoli jde pro měsíc vynechat).
- **Starší data:** do v17.3 se osvobozená hráčka značila `fx: 0`. Takový záznam bez pole `ex` aplikace čte jako osvobozenou s koeficientem 100 %. Po první úpravě hráčky (Team → Soupiska → Upravit → Uložit, trenér nebo pokladník) se uloží v novém tvaru. Migrace není potřeba. `staff.pay` = `{m:"none"|"month"|"event", amt}` (plat, viz F4).
- **Nastavení:** ⚙️ → Nastavení pokladny, dokument `settings/cash`: `iban` (hlavní účet), `iban2` (provozní účet, v17.7), `acc{contrib}` (účet příspěvků, výchozí hlavní), `contrib`, `due{ev, cm}`, `cats{in, out}`, `tpls`. Výchozí šablony: Pravidelný trénink, Mimořádný trénink, Domácí zápas, Venkovní zápas (bez vyúčtování hráčkám). Vlastní šablony mají klíč `t_…`.
- **Vyúčtování události (kolekce `evcash/{eventId}`):** `tpl`, `cost[{cat,payee,amt}]`, `who{monthly,single,exempt}` (každá skupina `{pays, mode:"calc"|"flat", flat}`), `due`, `settle` (snapshot). V dokumentu události nebo zápasu je jen příznak `ss: 1` (vyúčtováno). Starý tvar (pole přímo v události) se od v17.3 už nečte.
- **Výpočet:** cena = (součet nákladů ÷ všechny přihlášené hráčky v poli, bez brankářek a realizačního týmu; každá se počítá jako jeden celý kus bez ohledu na skupinu, osvobození i koeficient) nebo pevná částka, × koeficient hráčky, zaokrouhleno nahoru na Kč. Zda a jak skupina platí, určuje nastavení události. Před uzavřením se zobrazí „vybereme X z Y“.
- **Uzavření:** vznikne snapshot a `charges/{eid}_{mid}` `{eid, mid, amt, paid, due, kind, vs}`. `paid` je zaplacená částka. **Od v17.1 je uzavření jedna atomická dávka** (dokument události + předpisy + audit). Po uzavření nikdy žádný automatický přepočet. „Znovu otevřít → upravit → uzavřít“ je jen ručně, loguje se do `audit` (znovuotevření je rovněž jedna dávka). Uzavření zápasu uzavře vyúčtování automaticky jen u trenéra a pokladníka a jen pokud vzniká aspoň jeden předpis.
- **Splatnost:** `due` události, jinak datum události + N dní (šablona nebo výchozí 3), 23:59.
- **VS:** číselný hash id předpisu; od v17.2 je unikátní mezi všemi předpisy (při shodě se zvyšuje o 1).

### Úhrady, vklady a výdaje (F2)
- **Úhrada předpisu:** tlačítko 💳 u předpisu (v detailu uzavřené události i v Team → 💰 Platby) otevře okno s částkou (výchozí celý zbytek). Částka musí být kladná a nejvýše zbývající dluh; je možná **částečná úhrada**. Zapíše se v jedné dávce (`writeBatch`): nový pohyb `cash` (`k:"in"`, kategorie Platby za události, `cid` = id předpisu) a nová `charges.paid`. Zámek proti dvojímu klepnutí brání dvojímu příjmu. Tlačítko „✅ Zaplatila vše“ uhradí všechny otevřené předpisy hráčky celé.
- **Pokladna:** Team → 🏦 Pokladna (jen trenér a pokladník). Nahoře **zůstatek = příjmy − výdaje**, pod tím ➕ **Vklad / příjem** (výchozí kategorie Vklady / dary) a ➖ **Výdaj**: datum, částka, kategorie z nastavení pokladny, poznámka. Dále součty příjmů a výdajů podle kategorií a seznam pohybů s filtrem typu a kategorie (po 50 položkách, „Zobrazit další“).
- **Storno pohybu:** 🗑 (potvrzení druhým klepnutím) smaže pohyb. Má-li pohyb vazbu na předpis (`cid`), vrátí se v téže dávce zaplacená částka na předpisu a předpis je znovu k úhradě. Storno se zapíše do `audit` (`act:"storno"`). Pohyby se jinak needitují (oprava = storno a nový zápis).
- **Kategorie:** spravují se v ⚙️ → Nastavení pokladny. Pohyby ve smazané kategorii zůstávají a v přehledu se zobrazují pod svým názvem.
- **Mazání událostí:** událost nebo zápas s uzavřeným vyúčtováním smaže jen trenér nebo pokladník, a to teprve když nemá nezaplacené předpisy (jinak úhrada, nebo „Znovu otevřít“). Při smazání se smažou předpisy bez úhrady; předpisy s částečnou či plnou úhradou zůstanou jako historie (v přehledu dluhů se přeskočí). Kontrolu provádí `canDelete` v `storage.js` pro všechna místa, odkud se událost maže.
- **Viditelnost:** náklady událostí (💰) vidí v seznamu a detailu jen trenér a pokladník.

### Měsíční příspěvky, platy, hospodaření a CSV (F4, v17.3)
Team → **📅 Měsíce** (jen trenér a pokladník). Nahoře výběr měsíce ◀ ▶ (a „Tento měsíc“).
- **Příspěvky:** návrh pro vybraný měsíc = příspěvek z ⚙️ → Nastavení pokladny × koeficient hráčky (zaokrouhleno nahoru na Kč). Platí hráčky ve skupině **Příspěvek**, ne ukončené, ne brankářky a ne s koeficientem 0 %. **Osvobozené** jsou v seznamu předem vynechané (–), klepnutím je pro tento měsíc zahrneš. Kohokoli jiného jde pro měsíc vynechat (–) a částku upravit. **📨 Vystavit příspěvky** (potvrzení druhým klepnutím) vytvoří v jedné dávce předpisy `charges/c_RRRR-MM_{pid}` (`kind:"contrib"`, splatnost = den v měsíci z nastavení, 23:59, unikátní VS) a záznam v `audit` (`act:"contrib"`). Už vystavené předpisy se nikdy nepřepisují (opakované vystavení doplní jen chybějící), nezaplacený předpis jde smazat 🗑 (`audit` `contrib-del`); s úhradou je nutné nejdřív stornovat platbu v 🏦 Pokladna.
- **Úhrada příspěvku** se zapisuje stejně jako u událostí (💰 Platby → hráčka → 💳), příjem má kategorii **Příspěvky**. Příspěvky jsou v přehledu dluhů (po hráčkách i „podle událostí a příspěvků“ jako 📅 Příspěvek měsíc rok), v Moje platby (QR platba) a po splatnosti **blokují přihlášení „Jdu“** stejně jako platby za události.
- **Platy realizačního týmu:** návrh podle `staff.pay` (Team → Realizační tým → Upravit → Plat): **měsíčně** pevná částka, **za událost** sazba × počet událostí měsíce do dneška, na které je člen přihlášen ✅ Jdu. Částku lze upravit. **💸 Vyplatit** (nebo Vyplatit vše) zapíše výdaj `cash/sal_RRRR-MM_{tid}` (kategorie **Platy trenérů**, datum = dnešek v běžícím měsíci, jinak poslední den měsíce) a záznam `audit` (`act:"plat"`). Za člena a měsíc je jen jeden plat (pevné id brání dvojímu zápisu); oprava = storno v 🏦 Pokladna a nové vyplacení.
- **Hospodaření po měsících:** výběr roku, tabulka příjmy, výdaje, saldo a zůstatek na konci měsíce (podle data pohybů) se součtem za rok. Klepnutím na měsíc se zobrazí rozpad: příjmy a výdaje podle kategorií a předpisy se splatností v měsíci (události / příspěvky: předepsáno, zaplaceno, zbývá).
- **CSV export** (Excel, středník, desetinná čárka, UTF-8 s BOM): pohyby za vybraný rok, všechny pohyby, předpisy (osoba, druh, událost / měsíc, částka, zaplaceno, zbývá, splatnost, VS, výjimka) a přehled po měsících.

### Moje platby, blokace a QR (F3, v17.2)
- **Moje platby:** záložka vidí každý, kdo má v účtu propojenou hráčku (`pid`) nebo člena týmu (`tid`). Člen vidí jen své předpisy (databáze mu cizí nepustí, aplikace je čte dotazem `charges` s `mid` = jeho id): dluh, část po splatnosti, zaplaceno a u každého neuhrazeného předpisu tlačítko **📱 Zaplatit (QR)**.
- **Upozornění:** v Událostech se při dluhu zobrazí červený banner s odkazem na Moje platby.
- **QR platba:** formát SPD (české QR platby), `SPD*1.0*ACC:<IBAN>*AM:<částka>*CC:CZK*X-VS:<VS>*MSG:<zpráva bez diakritiky>`. **Zpráva pro příjemce (v17.6)** říká, za co se platí, a končí jménem plátce: zápas „Zápas 10.10. Sokol - Jana“, trénink „Trénink 14.10. - Jana“ (u vlastního názvu tréninku jeho název, např. „Mimořádný trénink 18.10. - Jana“), příspěvek „Příspěvek 10/2026 - Jana“. Text sestavuje `payMsg` v `src/domain/cash.js`, v Moje platby je vidět u každého neuhrazeného předpisu i v QR okně (pro ruční platbu); do QR jde bez diakritiky a zkrácený na 60 znaků. IBAN se nastavuje v ⚙️ → Nastavení pokladny. QR se generuje lokálně (`src/lib/qrcode.js`), nic se neposílá na internet. Částka je zbývající dluh předpisu. Zaplacení se do aplikace dostane, až pokladník zapíše úhradu.
### Párování plateb a dva účty (v17.7)
- **Zpráva v předpisu:** při uzavření vyúčtování a vystavení příspěvku se do předpisu uloží `msg` (zpráva pro příjemce) a `acc` (účet). Pozdější přejmenování události ani hráčky už zprávu v QR nezmění. Starší předpisy bez `msg` si zprávu sestavují z aktuálních dat.
- **Úhrada → pohyb:** 💳 úhrada i ✅ Zaplatila vše zapíše do pokladny poznámku = zpráva pro příjemce (u částečné úhrady „· částečná úhrada“, u souhrnné „· souhrnná platba VS …“), `vs` předpisu a `acc`. V 🏦 Pokladna je u pohybu vidět VS, zpráva a účet; starší úhrady si VS a zprávu doplní z předpisu. Stejné údaje jsou v CSV (pohyby i předpisy).
- **Dva účty:** hlavní (`iban`) a provozní (`iban2`). Na který účet se platí příspěvky, určuje nastavení (výchozí hlavní); platby za události určuje šablona (výchozí provozní) a u konkrétní události lze účet přepnout před uzavřením. Bez provozního účtu (nebo se stejným IBAN) jde vše na jeden účet a výběr účtu se nezobrazuje. Starší záznamy bez `acc`: příspěvek → účet příspěvků, platba za událost → provozní, ostatní pohyby → hlavní; plat se vyplácí z hlavního účtu.
- **Souhrnná platba:** v Moje platby se předpisy na stejný IBAN dají zaplatit jedním QR (**📱 Zaplatit vše**) s osobním VS hráčky (hash `vs_` + id, vidí ho i pokladník v Platby → hráčka) a zprávou „Souhrn: Trénink 14.10., Zápas 10.10. Sokol - Jana“ (když se nevejde do 60 znaků, „Souhrn 3 platby 10.10.-18.10. - Jana“). **Předpisy na různé účty sloučit nejde.** Pokladník souhrnnou platbu zapíše tlačítkem ✅ Zaplatila vše – <účet>, které je zvlášť pro každý účet.
- **Zůstatky po účtech:** 🏦 Pokladna ukazuje při dvou účtech zůstatek každého účtu a filtr pohybů podle účtu; ruční vklad / výdaj má volbu účtu.
- **Blokace „Jdu“:** kdo má neuhrazený předpis **po splatnosti** bez výjimky, nemůže se přihlásit „Jdu“ (odhlášení a „Nejdu“ fungují). Blokace platí pro vlastní přihlašování člena; trenér a pokladník zapisují vždy. Je to kontrola v aplikaci, pravidla databáze ji nevynucují. Po zaplacení se blokace zruší sama.
- **Výjimka z blokace:** pokladník nebo trenér ji dá tlačítkem 🔒 u předpisu po splatnosti (v detailu uzavřené události i v Platby → hráčka). Předpis dostane `exc: true`, zrušení tlačítkem 🔓. Výjimka se zapisuje do `audit` (`exc`, `exc-off`).
- **Oddělení citlivých dat:** náklady a vyúčtování událostí jsou v kolekci `evcash` (čtou a zapisují jen trenér a pokladník). Hráčky ani kustod je z databáze nepřečtou. V dokumentu události zůstává jen `ss` kvůli značce „vyúčtováno“ a ochraně před smazáním.

### Datový model pokladny
- **`evcash/{eventId}`:** `{tpl, cost, who, due?, acc?, settle?}` (viz výše); jen správci pokladny.
- **`charges/{eid}_{mid}`:** `{eid, mid, amt, paid, due, kind:"event"|"contrib", vs, acc?, msg?, exc?}` (`acc` = účet `main`/`op`, `msg` = zpráva pro příjemce, obojí od v17.7); předpis čte jeho vlastník (`mid` = jeho `pid`/`tid`) a správci. Měsíční příspěvek má `eid = "c_RRRR-MM"`.
- **`cash/{id}`:** `{d:"YYYY-MM-DD", k:"in"|"out", amt, cat, mid?, cid?, eid?, ym?, note, vs?, acc?, by}` (`vs` a `acc` od v17.7; u úhrady je v `note` zpráva pro příjemce); čtou a zapisují jen správci. Zůstatek = součet `in` − součet `out`. Plat má id `sal_RRRR-MM_{tid}` a pole `ym`.
- **`audit/{id}`:** `{ts, by, eid, act:"close"|"reopen"|"storno"|"exc"|"exc-off"|"contrib"|"contrib-del"|"plat", note}` (starší záznamy mohou mít i `migrace` a `přesun`); jen přidávání, čtou správci. Při obnově ze zálohy se `audit` přeskakuje.
- Kolekce `charges`, `cash`, `audit` a `evcash` jsou součástí zálohy JSON, ale jen ty, které se v zařízení načetly (kustod je nenačítá).

### Propojení hráčky s účtem (trenér)
1. Hráčka musí být v soupisce (Team → Soupiska).
2. ⚙️ → **Členové týmu** → vyber e-mail Google účtu hráčky, roli **Hráčka** a hráčku ze seznamu → **Přidat člena**.
3. Hráčka se přihlásí Googlem stejným e-mailem (přesně jak ho používá Google účet). V seznamu členů je u ní vidět propojená hráčka, případně ⚠️ „bez hráčky“.
4. Změna propojení: zadat stejný e-mail znovu s jinou hráčkou. Odebrání: **Odebrat** u e-mailu.

### Propojení trenéra nebo kustoda s členem týmu (v16.3)
1. Člen musí být v Team → Realizační tým (jméno + funkce).
2. ⚙️ → **Členové týmu** → e-mail, role **Trenér** nebo **Kustod**, výběr člena realizačního týmu → **Přidat člena**. Nastavuje-li si to trenér sám sobě, zadá vlastní e-mail znovu **se stejnou rolí Trenér** (dokument se přepíše, role zůstane).
3. Po dalším spuštění aplikace se uživatel v Událostech přihlašuje jedním klepnutím. V seznamu členů je u něj vidět 🎓 propojený člen (nebo ⚠️, když člen týmu už neexistuje).

### Datový model
- **`members/{email}`:** `{role:"trener"|"kustod"|"hracka", pid?:<id hráčky>, tid?:<id člena realizačního týmu>, cash?:true, addedBy}`; `pid` je povinné jen u role `hracka`, `tid` je volitelné.
- **`players/{id}`:** `{name, num, pos, alt, st, grp, ex, fx, note}`.
- **`staff/{id}`:** `{name, kind, pay?:{m, amt}}` – realizační tým (Trenér, Asistent, Kustod, Jiný).
- **`events/{id}`** (jen tréninky): `{type:"training", title, date:"YYYY-MM-DD", time:"HH:MM", place, dl:"YYYY-MM-DDTHH:mm", note, lines:{<playerId>: 1–4}, ss?}`.
- **Zápasy** zůstávají v `matches`; přibyla volitelná pole `time`, `place`, `dl` (termín přihlašování) a příznak `ss` (vyúčtováno). Starší zápasy termín nemají (je „nenastaven“, zápas se zamkne po dni konání).
- **`attendance/{eventId}_{memberId}`:** `{eid, pid, st:"yes"|"no"|"maybe", reason, at:ISO, by:e-mail}`; `pid` je hráčka nebo člen realizačního týmu. `eventId` je id tréninku nebo zápasu. Bez dokumentu = bez odpovědi.
- **`payments`:** staré platby z v16.x. Od v17.3 je aplikace ani pravidla nepoužívají; kolekci lze v konzoli Firebase smazat.
- Kolekce `events`, `attendance`, `staff` a (u správců pokladny) `charges`, `cash`, `audit`, `evcash` jsou součástí zálohy JSON (`members` ne). „Nahradit vším“ ze staré zálohy bez těchto kolekcí je nesmaže.
- Pokud pravidla databáze kolekce nepovolí, aplikace běží dál (zápasy, živý zápis…) a v záložce Události se zobrazí červená hláška s kódem chyby.

### Pravidla databáze (`firestore.rules`)
Aktuální pravidla jsou v souboru `firestore.rules` (vlož do *Firestore → Rules → Publish*). **Verze 17.4 pravidla mění (pokladník smí u hráčky měnit i pole `ex`): po nahrání je nutné pravidla znovu publikovat.** (Verze 17.3 odstranila kolekci `payments` a pokladníkovi v událostech ponechala jen `ss`.) Shrnutí:
- **members/{email}:** čte svůj dokument každý přihlášený člen (trenér a pokladník všechny); zapisuje trenér, pokladník jen členy s jinou rolí než trenér. Pole: `role`, u hráčky `pid`, volitelně `tid` a `cash`.
- **players:** čtení všichni členové; vytvořit a smazat smí trenér; změnit trenér, kustod jen `st`, pokladník jen `grp`, `fx`, `ex`, `note` (v17.4 přibylo `ex`: **pravidla znovu publikovat**).
- **staff:** čtení všichni členové, zápis trenér; pokladník jen pole `pay`.
- **events, matches:** čtení všichni členové (statistiky jsou pro celý tým), zápis trenér a kustod; pokladník jen pole `ss`.
- **evcash:** čtení i zápis jen správci pokladny (trenér, pokladník).
- **opponents:** čtení všichni členové, zápis trenér a kustod.
- **settings:** čtení všichni členové; `settings/cash` zapisuje správce pokladny, ostatní nastavení trenér a kustod.
- **attendance/{eid}_{pid}:** čtení všichni členové; trenér a kustod zapisují za kohokoli; hráčka jen dokument se svým `pid`.
- **charges:** čte vlastník a správci, zapisují správci. **cash:** čtou a zapisují jen správci. **audit:** čtou správci, jen přidávání.
- **payments:** od v17.3 bez přístupu (kolekci lze smazat).
- **coach:** jen trenér.
- **Termín přihlašování** pravidla nekontrolují (hlídá ho jen aplikace).
- Přihlášení vyžaduje ověřený e-mail Google účtu (`email_verified`).

## Provoz na telefonu a PC
**Android:** v Chrome otevři adresu aplikace → menu ⋯ → *Přidat na plochu / Instalovat aplikaci*. Přihlášení zůstává uložené, takže se nemusíš přihlašovat před každým zápasem.
Zadávání na telefonu a prohlížení výsledků na PC probíhá nad stejnou databází; změny se promítají během chvilky.

### Tlačítko Zpět (v18.0)
Systémové Zpět (gesto nebo tlačítko na Androidu, šipka zpět v prohlížeči) neopouští aplikaci, ale zavře nejvyšší otevřenou vrstvu:
1. okna – nápověda, úhrada, QR platba, nastavení pokladny, ⚙️, výběr hráčky a další okna, důvod odpovědi, opravy zápisu, zápis utkání, rozpracovaný vklad / výdaj,
2. živý zápis – rychlý zápis gólu / trestu → panel menu → menu ⋯ → dotaz „Odejít ze živého zápisu?“ (hodiny běží dál, nic se nezapíše),
3. formulář události, detail události (vrátí se tam, odkud byl otevřen), detail soupeře, karta zápasu (o krok zpět, z 1. kroku na seznam),
4. Team v režimu Platby / Pokladna / Měsíce → Team, jiná záložka → Události, Minulé / Kalendář → Nadcházející,
5. domovská stránka (Události, Nadcházející) → dotaz „Ukončit aplikaci?“.

Technicky (`src/core/nav.js`): v historii prohlížeče je jeden strážní záznam; každé Zpět ho spotřebuje, aplikace zavře vrstvu klepnutím na její vlastní tlačítko Zavřít / Zrušit (logika obrazovek se nemění) a záznam vrátí. Chrome přeskakuje záznamy vytvořené bez dotyku uživatele, proto se záznam obnovuje i při klepnutí. Aplikaci spuštěnou z plochy nejde zavřít skriptem – po potvrzení ukončení ji zavře další stisk Zpět.

## Jak funguje synchronizace
- Zápis se uloží hned v zařízení a odešle na server. Bez signálu (hala) se změny řadí do offline fronty a odešlou se po připojení (stav vidíš v ⚙️).
- Ostatní zařízení dostávají změny okamžitě (živý poslech Firestore).
- Ukládá se vždy celý dokument (např. celý zápas). Při souběžné úpravě **stejného zápasu** na dvou zařízeních vyhrává poslední zápis. Živý zápis zápasu proto veď jen z jednoho telefonu. Docházka se ukládá po jednotlivých dokumentech (jeden na hráčku a událost), úhrady po jednotlivých pohybech a předpisech, takže se souběžné přihlašování ani zápis plateb nepřepisuje.
- Zápis se v aplikaci potvrzuje hned lokálně. Pokud ho server odmítne (např. chybějící práva), zobrazí se hláška „Uložení se nepovedlo“ a změna se vrátí.
- Firestore umožňuje dokument do 1 MB. Zápas se živým zápisem má desítky až stovky kB, což stačí.

## Záloha a přesun dat
- ⚙️ → **Stáhnout zálohu (JSON)** vytvoří kompletní zálohu (hráčky, zápasy, soupeři, formace, události, docházka, realizační tým, u správců pokladny i předpisy, pohyby pokladny, vyúčtování a audit). Smí trenér a kustod (hráčka toto tlačítko nevidí). Seznam členů (`members`) v záloze není, takže se propojení účtů (`pid`, `tid`) po obnově do prázdné databáze nastavuje znovu.
- ⚙️ → **Soupiska (CSV)** vyexportuje soupisku pro Excel (včetně skupiny plateb, osvobození a koeficientu v %).
- ⚙️ → **Obnovit ze zálohy** (jen trenér): **Sloučit s daty** přidá/přepíše položky ze zálohy, **Nahradit vším** nahradí obsah kolekcí, které záloha obsahuje. Kolekce `audit` se při obnově **přeskakuje** (pravidla dovolují jen přidávání). Vyžaduje připojení k internetu.
- ⚙️ → **Členové týmu** (trenér a pokladník): přidání a odebrání e-mailů s rolí (u hráčky i propojení s hráčkou, u trenéra a kustoda s členem realizačního týmu, příznak Pokladník). Vlastní účet nelze odebrat.

## Postup zápasu (3 kroky)
Zápas se otevře v záložce **Události** (klepnutím na zápas → **🏒 Otevřít zápas**) nebo se založí tlačítkem **+ Zápas**. Nahoře je vždy přehled: soupeř, datum, doma/venku, délka třetiny a stav příprav (✅/⛔ Nominace, Sestava). Pod ním jsou kroky, dole tlačítko pro další krok.
1. **Zápas** – soupeř, datum, délka třetiny (standard 20 min), vzájemné zápasy (jen uzavřené) a karta živého zápisu.
2. **Sestava** – dvě části (A a B):
   - **A Nominace:** klepnutím vybereš hráčky, které máš k dispozici. Nominovat jde jen hráčky přihlášené na událost (odpověď ✅ Jdu); nepřihlášené jsou zašedlé. Dál se jde až po splnění minima (1 brankářka a 5 bruslařek). Tlačítka Všechny přihlášené / Zrušit vše.
   - **B Sestava:** po přechodu se sestava sama naplní **podle základní formace** (jen nominované hráčky). Pod ní jsou **náhradnice rozdělené podle pozic**, pod nimi **přesilovky a oslabení** (hráčka jen v jedné jednotce). Tlačítko ↻ Podle základní formace sestavu znovu přepíše. Sestavu potvrdíš tlačítkem **✔ Uzavřít sestavu**. Jakákoli změna sestavy před zahájením uzavření zruší, takže ji uzavřeš znovu.
3. **Zápas živě** – průběh (nejnovější nahoře), jmenné statistiky zápasu a uzavření zápasu (u trenéra a pokladníka vznikne vyúčtování plateb). Karta živého zápisu je i tady.
- **Živý zápis jde spustit až po uzavření sestavy** (a splněné nominaci). Do té doby je vidět, co chybí, a tlačítko vede do kroku 2.
- **Po zahájení zápisu** je uzamčená nominace, soupeř, datum a doma/venku.
- **Změna sestavy za zápasu:** živý zápis → menu ⋯ → **👥 Sestava**. Klepnutím nebo přetažením vyměníš hráčky (i s náhradnicemi). Změna se hned promítne do front střídání: hráčky na ledě zůstávají, ostatní se přeskládají podle nové sestavy. Přesilovky a oslabení jdou měnit v menu ⋯ → Jednotky PP/OS.
- **Krok Soupeř** (zápis soupeřovy sestavy) je zatím z postupu vyřazen. Dříve zapsaná data zůstávají uložená.
- **Hráčka se nesmí opakovat ve více formacích téhož druhu.** Druhy jsou tři: řady 5:5 (jedno místo), přesilovky (jen jedna z PP1/PP2) a oslabení (zvlášť 4 hráčky: SH1/SH2, a 3 hráčky: SH3/SH4). Mezi druhy se hráčka překrývat smí (např. v řadě a zároveň v oslabení).

## Záložka Team
- **Základní formace** nahoře: klepnutím vybereš hráčku na místo, podržením a přetažením ji přesuneš (obsazené místo se prohodí). Sestava se kopíruje do každého nového zápasu a používá se i pro rozdělení do pětek na tréninku.
- **Náhradnice** pod ní: všechny nezařazené hráčky (bez těch, které skončily). Přetažením je dáš na místo v sestavě (hráčka z místa jde na její místo mezi náhradnice), prohodíš je mezi sebou, nebo hráčku ze sestavy přetáhneš na plochu náhradnic. Pořadí náhradnic se pamatuje.
- **Soupiska** (přidání, úprava, filtry, stav hráček, skupina plateb, osvobozená, koeficient v % a poznámka) je pod tím, na stejné stránce. Samostatná záložka Soupiska už není. Přidávat, upravovat a mazat hráčky smí jen trenér.
- **Realizační tým** (jméno + funkce, plat) je pod soupiskou. Členové se zapisují do docházky na události, neplatí a nenominují se do zápasu. Spravuje trenér.

## Celkové statistiky (záložka Statistiky)
- **Statistiky hráčů** (jen uzavřené zápasy): Z (zápasy v sestavě), **Ø stř.** (průměrná délka střídání), střely, góly, procento, asistence, body, +/-, trestné minuty, góly v přesilovce, body doma a venku.
- **Ø stř.** = součet času na ledě ze všech uzavřených zápasů dělený počtem střídání hráčky. Zápasy bez živého zápisu se do průměru nepočítají; hráčka bez střídání má „–“. U rotace se čas počítá jen hráčce, která byla na ledě.
- **Tým** (střely, góly, úspěšnost) a **Brankáři** (střely, góly, zákroky, úspěšnost).

## Řazení tabulek statistik
Všechny tabulky statistik se řadí **klepnutím na hlavičku sloupce** (`<th>`):
- **Kde:** záložka Statistiky (hráči, tým, brankáři), statistiky zápasu (hráčky, brankářky) v kroku 3 i v zápisu utkání, tabulka Střídání hráček v podrobném rozboru a tabulka Čas na ledě v živém zápisu (menu ⋯). Tabulky Souhrn po třetinách a Sestava v zápisu utkání se neřadí.
- **Ovládání:** první klepnutí řadí čísla a časy **sestupně** (největší nahoře), text **vzestupně** (A–Z). Další klepnutí na stejný sloupec přepíná ▲ vzestupně / ▼ sestupně. Aktuální sloupec a směr ukazuje šipka v hlavičce.
- **Typy hodnot:** text se řadí podle české abecedy (jména s číslem `#5 Janča` se řadí podle čísla dresu a jména), čísla včetně znaménka (`+3`, `-2`), procent (`45 %`, `91,7 %`) i desetinné čárky, časy ve formátu `MM:SS` (včetně sloupce Ø stř. a hodnoty `⚠️ 02:15 (…)` v tabulce střídání). Prázdné hodnoty (`–`) jsou vždy na konci. Při shodě zůstává původní pořadí.
- **Pamatování:** zvolené řazení tabulky platí, dokud se aplikace nenačte znovu (po překreslení nebo změně dat zůstane zachováno). Tisk do PDF ponese aktuálně zvolené řazení (včetně šipky v hlavičce); HTML export zápisu a CSV mají pevné pořadí.
- **Technicky:** `src/core/table-sort.js` – jeden delegovaný posluchač kliknutí a `MutationObserver`, který připraví nové tabulky po překreslení. Řazená tabulka má třídu `sortable` (tabulka času na ledě v živém zápisu je vybrána přes `#lv table`). Novou tabulku zařadíš přidáním třídy `sortable`. Přehledy plateb a pokladny (`finance.js`, `cashbook.js`) jsou tvořeny seznamy, ne tabulkami, a neřadí se klepnutím na hlavičku.

## Rotace dvou hráček na jednom místě
Pro začátečnice: na jedno místo v řadě (např. C v 1. pětce) můžeš dát dvě hráčky, které se točí ob jedno střídání.
- **Nastavení:** pod každou pětkou je řádek **⇄ rotace**. Klepnutím vybereš druhou hráčku (jen u místa, kde je hlavní hráčka). Pořadí změníš přetažením jedné hráčky na druhou: **hlavní místo nastupuje první**. Funguje v kroku Sestava, v záložce Team (základní formace) i v živém zápisu (menu ⋯ → 👥 Sestava). Jedna hráčka smí být jen na jednom místě.
- **Za zápasu:** po konci střídání (výměna, sundání z ledu, nasazení pětky nebo jednotky) se do fronty zařadí partnerka a odcházející hráčka je „zaparkovaná“. Na dlaždici hráčky ve frontě je štítek **⇄ jméno**: kdo za ni skočí po jejím střídání. **Při aktivní přesilovce nebo oslabení se rotace nezobrazuje** (ve frontě jsou hráčky jednotek).
- **Ruční override:** klepnutím na štítek ⇄ přehodíš hráčku ve frontě za partnerku (např. když chce trenér rotaci přeskočit). Jde to opakovat a vrací to ↩ Zpět.
- **Výjimky:** po trestu nebo zranění se hráčka vrací bez rotace. Partnerka, která je právě vyloučená, v ošetřování nebo na ledě, se přeskočí.
- **Čas na ledě a statistiky** (střely, góly, +/-, střídání) se počítají jen hráčce, která byla opravdu na ledě. Počet zápasů (Z) dostanou obě. V zápisu utkání jsou obě hráčky místa vedle sebe.
- **Formát dat:** v `lineup` je hlavní hráčka pod klíčem `"1C"` a partnerka pod `"1C+"` (třetí by byla `"1C++"`). Aktuální pořadí rotace za zápasu je v živém stavu `live.ri`, např. `{"1C": 1}` (index do seznamu hráček místa), takže ho vrací ↩ Zpět.

## Stavový model střídání a rotace (v15.5, doplněno v15.6)
Technická poznámka pro vývoj (`src/domain/live-engine.js`, `src/domain/lineup.js`). Každá hráčka sestavy je v právě jednom ze tří stavů:
- **Na ledě** – `L.ice[sloupec]`.
- **Ve frontě** – `L.q[sloupec]`, připravená ke střídání. Na jedno místo sestavy (např. „1C“ s partnerkou „1C+“) připadá ve frontě a na ledě dohromady nejvýš jedna hráčka.
- **Zaparkovaná** – partnerka z rotace, která teď není ani na ledě, ani ve frontě; na řadu přijde po střídání aktivní hráčky.

`L.ri[místo]` je index hráčky, která je na ledě (nebo čeká ve frontě jako další). Hlídají ho tři funkce:
- **`claimSlot(L,m,p)`** – volá se při každém příchodu na led (střídání, jednotka, pětka, návrat z trestu). Nastaví `L.ri` na hráčku, která skutečně nastoupila, a její partnerky odebere z front.
- **`requeue` / `rotate`** – po odchodu hráčky vyberou další dostupnou partnerku (ne na ledě, ne vyloučenou, ne v ošetřování), odstraní všechny hráčky místa z front a vloží jedinou na konec fronty. Zbytek front se nemění (pole se vždy vytvářejí znovu). **Hráčka, která není v řadách (nasazená jen jednotkou), se do fronty nezařazuje** (v15.6).
- **`settle(L,m)`** – kontrola invariantů, volá se z `fitLayout` po každé akci: bez duplicit ve frontách, nikdo není zároveň na ledě a ve frontě, každé místo sestavy má hráčku na ledě nebo ve frontě. Pokud `activeId` vrátí hráčku, která není ve hře, okamžitě se zařadí do fronty, takže se index rotace nikdy nerozejde s ledem.

**Střídání** (`doSub` → `putOn`) je atomické: odchod hráčky z ledu a zápis střídání (`leave`, přesný začátek a konec), příchod nové hráčky (`L.ice`, `L.since`), nastavení indexu rotace a zařazení odcházející do fronty proběhnou v jedné akci (`act`) a vrací je ↩ Zpět.
**Nasazení jednotky nebo pětky** (`applyMap`) probíhá v pořadí: odchod, příchod na led, teprve potom rotace odcházejících. Vyloučená hráčka v pětce se nahradí partnerkou z rotace (`applyLine`).
**`syncLive`** (změna sestavy za zápasu) přepočítá fronty a index rotace podle skutečného stavu na ledě.

## Živý zápis – rozložení a ovládání
- **Horní lišta** (čas s šipkami ◀ ▶ pro posun o 5 s, skóre, situace) zůstává nahoře.
- **Barvy podle pětek:** 1. pětka modrá, 2. žlutá, 3. zelená, 4. růžová, hráčka mimo pětky šedá. Z barev je vidět, jak se pětky míchají.
- **Rozložení shora dolů:** tlačítka „Celá pětka na led“ → fronty čekajících hráček (nejblíž ledu je ta, která jde na řadu, zvýrazněná) → **hráčky na ledě** → mezera → **STŘELA NA NAŠI BRÁNU** → poslední čtyři akce z průběhu.
- **Tlačítka hráček:** na ledě číslo (velké), pod ním přezdívka a čas na ledě. V čekání číslo a pod ním přezdívka (a u rotace štítek ⇄ s partnerkou).
- **Střídání:** klepnutí na hráčku ve frontě ji pošle na led místo hráčky pod ní. Podržením a přetažením ji pošleš na jinou pozici. Tlačítko **N. pětka** pošle na led celou pětku najednou (např. když jsou řady rozházené).
- **Střela:** klepnutí na hráčku na ledě zapíše její střelu, tlačítko STŘELA NA NAŠI BRÁNU střelu soupeře. **Když je hra přerušená, střely zapsat nejdou.**
- **Spodní lišta:** za běžící hry jen ↩ Zpět a velké Start/Přerušit. **Po přerušení** se přidají ⚽ Gól naši, ⚽ Gól soupeř, 🚫 Trest a ⋯ Další volby (zranění, konec třetiny, brankářka, **čas na ledě**, změna sestavy, jednotky a další).
- **📊 Čas na ledě (menu ⋯, při přerušení):** přehled pro trenérskou analýzu – u každé hráčky celkový čas na ledě a počet střídání včetně právě probíhajícího střídání, seřazeno od největšího času. Tabulku lze řadit klepnutím na hlavičku. Tlačítko je v hlavním menu ⋯ a jen zobrazuje data (nic nemění).
- **Gól naši:** klepneš střelkyni, pak 1. a 2. asistenci (nebo „Bez asistence“). Střelkyně se v asistencích nenabízí. Situaci nastaví aplikace sama. **Gól soupeře:** jedno klepnutí. **Trest:** hráčka → délka → důvod.
- **Krok 3 Průběh:** nahoře časová osa (nejnovější nahoře, včetně střel), pod ní jmenné statistiky zápasu včetně času na ledě a počtu střídání (tabulku lze řadit klepnutím na hlavičku). Jen pro čtení.

## Oslabení – méně pozic a základní rozdělení
- **Oslabení 4 hráčky:** střed (C), útočník (Ú), oba obránci (LO, PO). **Oslabení 3 hráčky:** střed a dva obránci. Základní rozdělení se definuje předem v kroku 2 (jednotky SH1–SH4), kombinace můžeš zvolit libovolně.
- **V živém zápisu se při oslabení ukáže jen 4 resp. 3 pozice** (ostatní se skryjí). Hráčky na ledě se podle potřeby přeskupí do zbývajících pozic. **Pokud by kvůli trestu přešla útočnice na místo obránkyně, nastoupí na uvolněné místo čekající obránkyně a přesunutá útočnice jde na začátek své fronty** (jen když taková hráčka čeká; jinak přejde útočnice na volné místo sama). Po skončení trestu se pozice vrátí. Čekající hráčky skrytých pozic se ve frontách (mimo aktivní jednotku) zobrazí pod nejbližší viditelnou pozicí (PK → LK, LK → C), takže je lze nasadit.
- **Nasazení jednotky:** při oslabení se nabídnou jednotky pro příslušný počet hráček (4 nebo 3), při přesilovce přesilovky PP1/PP2.
- **Vyloučená hráčka v jednotce:** při nasazení jednotky se její místo obsadí jinou hráčkou (viz Přesilovky a oslabení). Aplikace to oznámí.

## Zranění v živém zápisu
Menu **⋯ → 🤕 Zranění** → vybereš hráčku a typ:
- **🩹 Dočasně (v ošetřování):** hráčka se vyřadí z ledu a front, ale zůstává v nominaci i sestavě. V menu je v seznamu „V ošetřování“, odkud ji tlačítkem **↩ Vrátit** vrátíš do sestavy (zařadí se na konec fronty své pozice), nebo **Trvalé** převedeš na trvalé zranění.
- **🤕 Trvale:** hráčka se odebere z nominace a sestavy a v soupisce se označí jako zraněná (🤕), takže do dalších zápasů se nenabízí. Tuto změnu smí provést i kustod.

## Zápis utkání a podrobný rozbor
V kroku 3 (Zápas živě) je karta **Zápis utkání**. Otevře se zápis ve dvou částech:
1. **Oficiální část** (první strany): výsledek a po třetinách, góly a asistence, sestava (řady, brankářky, náhradnice, jednotky, zranění), průběh (góly a tresty) a jmenné statistiky zápasu.
2. **Podrobný rozbor zápasu** (při tisku začíná novou stranou):
   - **Kompletní vývoj zápasu** v pořadí, jak proběhl: začátek se základní pětkou, střídání (kdo odešel, kdo nastoupil a jak dlouho předtím hrál), střely naše i soupeře, góly s průběžným skóre, vyloučení, zranění (dočasné, trvalé, návrat), nasazení pětky nebo jednotky, výměna brankářky, návraty z trestů a konce třetin.
   - **Dlouhá střídání jsou označena** ⚠️ a zvýrazněna. Limit se nastavuje v živém zápisu (menu ⋯ → Nastavení, výchozí 2:00) a je uveden nad vývojem.
   - **Střídání hráček:** pro každou hráčku počet střídání, čas na ledě, **průměrné** a **nejdelší střídání** (s časem, kdy skončilo) a počet dlouhých. Tabulku lze řadit klepnutím na hlavičku.
3. **Tlačítka v zápisu:** 🖨 Tisk / PDF, 💾 HTML (samostatný soubor), ⬇️ CSV vývoj a ⬇️ CSV střídání (do Excelu). Přepínače **Střely ve vývoji** a **Střídání ve vývoji** zkrátí vývoj, když je podrobností moc, a platí pro tisk i HTML.
- Podrobné údaje (časy střídání, střel a zranění) se ukládají od této verze. U dříve zapsaných zápasů se časy střel a gólů dopočítají z třetiny a času, takže pořadí může být přibližné, a chybí v nich zápisy jako konec třetiny nebo nasazení jednotky.
- Střídání se počítá z herního času (když hodiny stojí, střídání neběží). Střídání, které na konci zápisu stále trvá, se počítá do konce.

## Konec třetiny, konec zápasu a prodloužení
- **Prodloužení se nastavuje u zápasu** (při založení i v kroku 1): Ano (5 min) / Ne. Některé soutěže ho nehrají.
- **Konec třetiny** v menu živého zápisu je chytrý: po 3. třetině se **prodlužuje jen při nerozhodném stavu a jen když je prodloužení povolené**. Jinak tlačítko znamená **🏁 Konec zápasu**. Konec zápasu jde zadat i předčasně a vrátit tlačítkem ↩ Zpět nebo „Zrušit konec zápasu“.
- Po konci zápasu jsou hodiny zamčené a ve spodní liště je „🏁 Zápas ukončen“.

## Opravy zápisu
V kroku 3 je karta **✏️ Opravit zápis** (hodiny musí stát, zápas nesmí být uzavřený). Má čtyři části:
- **Události:** přidání, úprava (jména, třetina, čas, situace, kdo byl na ledě, délka a důvod trestu) a smazání gólů, vyloučení a střel.
- **Třetiny a konec:** délka každé třetiny (posun změní časy pozdějších událostí a střídání), označení nebo zrušení konce zápasu, zrušení omylem založeného prodloužení.
- **Střídání:** úprava času začátku a konce střídání (volitelně se posune i navazující střídání na stejném místě), výměna hráčky v celém střídání (oprava omylu), předání hráčky od zadaného času, přidání zapomenutého střídání, smazání střídání a **🧹 Vyčistit** prázdná a duplicitní střídání. Nahoře se zobrazují zjištěné nesrovnalosti (prázdná, překrývající se nebo budoucí střídání) a jde filtrovat podle hráčky. Čas se zadává jako třetina + mm:ss herního času; změna se promítne do času na ledě, počtu střídání a statistik. Po úpravě střídání se smaže zásobník ↩ Zpět.
- **Základ:** soupeř, datum, doma/venku, délka třetiny, prodloužení.
Opravy se hned promítnou do statistik, zápisu i vývoje zápasu.

## Tresty podle pravidel IIHF (živý zápis)
- **Tlačítko 🚫 Trest (ve spodní liště po přerušení hry):** hráčka (nebo soupeř), délka (2 min, 2+2, 5 min, 10 osobní, do konce) a důvod, vše jednotlivými klepnutími. Hráčka sejde z ledu, místo zůstane prázdné a nahoře běží odpočet.
- **Návrat po vypršení:** po skončení trestu se hráčka sama vrátí na led na svou pozici. Pokud je její místo obsazené, nastoupí na jiné volné místo (přednost má místo odpovídající její pozici), jinak čeká ve frontě své pozice jako první.
- **Gól ukončí trest:** pokud padne gól a týmy mají na ledě rozdílný počet hráček, ukončí se nejstarší dvouminutový trest oslabeného týmu a jeho hráčka se vrací. Gól oslabeného týmu trest neukončí. U 2+2 gól ukončí jen první dvě minuty a druhé dvě začnou běžet. Pětiminutový trest gól neukončuje.
- **Minimum 3 bruslaři:** odpykávají se nejvýše dva tresty současně, třetí čeká, dokud se jedno místo neuvolní.
- **Osobní trest (10) a do konce:** tým neoslabují, hned lze doplnit náhradnici. Po osobním trestu se hráčka vrací na lavičku (do fronty), po „do konce“ se nevrací.
- **Souběžné tresty obou týmů** (stejný počet hráček na ledě) gólem neskončí.
- **Hlídání počtu na ledě:** aplikace nepovolí doplnit víc hráček, než dovolují tresty, a upozorní, když je jich na ledě víc. Hráčku můžeš sundat v menu (menu ⋯ → „Sundat z ledu“).
- **Zrušit** u trestu opraví omyl (hráčka se vrátí na led). Poslední akci vrací také tlačítko ↩.
- Nemodelováno: odložený trest, trestné střílení a zvláštní pravidla pro tresty brankářky.

## Přesilovky a oslabení
- **Před zápasem (krok 2 Sestava):** definuj 2 jednotky přesilovky a 2 jednotky oslabení (každá až 5 míst, do oslabení stačí 3–4). Hráčka může být jen v jedné z jednotek stejného druhu, vedle toho zůstává ve své řadě. Jde zkopírovat z posledního zápasu.
- **Za zápasu:** když je na ledě nerovný počet hráček, objeví se nahoře velká tlačítka **⚡ Přesilovka 1/2** nebo **🛡 Oslabení 1/2**. Jedním klepnutím se jednotka nasadí; aktivní jednotka je zvýrazněná a pod tlačítky je její název.
- **Pravidla nasazení (v15.6):**
  - Nasazují se nominované a nevyloučené hráčky na své sloupce. Pozice mimo zredukovanou formaci (např. PK při 4 hráčkách) se vynechají.
  - Prázdná nebo vyloučená místa se doplní podle pozice (obránkyně na LO/PO, útočnice jinam). Přednost má hráčka, která už je na ledě, potom hráčka z fronty. Aplikace oznámí, kdo doplnil.
  - Nelze-li nasadit nikoho, led zůstane beze změny a aplikace to oznámí.
  - Hráčka, která zůstane na ledě a jen změní pozici, nekončí střídání.
- **Fronta při aktivní jednotce:** místo řadových hráček a rotace se ve frontě zobrazují hráčky z druhé jednotky téhož druhu (PP1 ↔ PP2, SH1 ↔ SH2, SH3 ↔ SH4) na svých pozicích; klepnutím nebo přetažením je nasadíš. Nemá-li jednotky nikdo na střídání, zobrazí se běžná fronta (bez štítků rotace). Hráčka, která není v řadách, se po odchodu do řadové fronty nezařazuje.
- **Rychlá úprava jednotek při přerušení:** menu **⋯** → **Jednotky PP/OS** – změna hráček v jednotce a nasazení.
- **↩ Zpět na řady** vrátí hru na běžné řady (odcházející hráčky rotují do front, prázdná místa se doplní podle pozic). Nasazení pětky tlačítkem „N. pětka“ jednotku také ukončí.

## Když po nahrání nové verze vidíš starou
Prohlížeč si aplikaci ukládá do paměti. Číslo verze vidíš vpravo vedle názvu nahoře a v ⚙️. Pokud neodpovídá, klepni v ⚙️ na **Načíst novou verzi** (smaže uloženou kopii aplikace, data zůstávají v databázi). Při nahrání na web musí být nahrány všechny soubory projektu, včetně `sw.js` a celé složky `src/` (zejména `src/core/table-sort.js`, `src/views/help.js`, `src/views/events.js`, `src/views/payments.js`, `src/views/finance.js`, `src/views/cashbook.js`, `src/views/money.js`, `src/views/mine.js`, `src/views/cash-settings.js` a `src/domain/cash.js`). Soubory `src/domain/payments.js`, `hockeycoach-navod.html` a `data/seed-data.json` už neexistují. Pokud se aplikace zasekne na „Načítám…“, otevři konzoli prohlížeče (F12) – první červená chyba (`SyntaxError` nebo `404`) ukazuje soubor, který se nenahrál nebo je poškozený.

## Co aplikace zatím neumí
- Vynucení termínu přihlašování v pravidlech databáze (hlídá ho zatím jen aplikace).
- Oddělení důvodů nepřítomnosti tak, aby je hráčky nemohly přečíst ani mimo aplikaci (náklady a vyúčtování už oddělené jsou).
- Vynucení blokace „Jdu“ v pravidlech databáze (hlídá ji jen aplikace).
- Automatické vystavování příspěvků k 1. dni měsíce (vystavují se ručně v 📅 Měsíce) a automatické vyplácení platů.
- Docházkové statistiky za sezónu mimo počtu účastí v přehledu plateb, opakující se tréninky, upozornění na blížící se termín.
- Úpravu pohybu pokladny (jen storno a nový zápis).
- Upozornění na nebezpečné hráčky soupeře podle statistik.
- Hodnocení hráček a dlouhodobý plán (zatím jen v původní verzi v Claude).
- Celkový (sezónní) součet času na ledě; v celkových statistikách je jen průměrná délka střídání (v zápase je tabulka času na ledě v menu ⋯ → Čas na ledě a v zápisu utkání).
- Nápověda přímo v živém zápisu (tlačítko ❓ je v záhlaví, které živá obrazovka překrývá).

## Poznámky k datům z Claude
- Historie kroků „vrátit akci“ v rozehraném zápase se do exportu nepřenesla (zápas, události ani statistiky ano).
- Nastavení limitu střídání a délky třetiny se pamatuje v každém zařízení zvlášť. 

## Historie verzí
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
