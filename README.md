# Hokej – zápasy (modulární projekt)

**Aktuální verze: v16.0 (17. 10. 2026)** – první verze modulu **Události a docházka**: záložky Zápasy a Tréninky jsou sloučené pod **Události** (seznam + kalendář), členové se přihlašují na události volbou Jdu / Nejdu (s důvodem) / Nejsem jistý, každá událost má konečný termín přihlašování a trénink umí rozdělit přihlášené do pětek (modrá, žlutá, zelená, růžová) podle základní formace. Dříve: vrácen přehled **Čas na ledě** (v15.7), oprava přesilovek a oslabení v živém zápisu (v15.6), přepracovaná logika střídání a rotace (v15.5), oprava nasazování jednotek (v15.4), nápověda v aplikaci (tlačítko ❓), návod `hockeycoach-navod.html`, průměrná délka střídání v celkových statistikách a řazení tabulek klepnutím na hlavičku.

Aplikace pro trenéry a kustody: soupiska, formace, nominace, události a docházka, zápasy s živým zápisem, soupeři, statistiky.
Běží v prohlížeči jako PWA, nepotřebuje Claude ani vlastní server. Data jsou v databázi Firebase (Firestore) a přistupuje se k nim po přihlášení účtem Google. Bez signálu aplikace funguje dál a změny se odešlou po připojení.

## Struktura projektu
```
HockeyCoach/
├─ index.html vstupní stránka (načítá styly a src/main.js jako ES modul, záhlaví s tlačítky ❓ a ⚙️)
├─ hockeycoach-navod.html kompletní návod k ovládání (samostatná stránka, jde vytisknout do PDF)
├─ styles/main.css styly
├─ src/
│ ├─ main.js spuštění aplikace, odběr změn dat, zapnutí řazení tabulek a nápovědy
│ ├─ debug.js ladicí hák (stránka s ?debug zpřístupní funkce v window.__hk)
│ ├─ config/constants.js konstanty: pozice, důvody trestů, rozložení formací a jednotek
│ ├─ core/ stav, pomocné funkce, čtecí selektory, akce (ukládání), řazení tabulek
│ │ ├─ state.js utils.js selectors.js actions.js table-sort.js
│ ├─ data/
│ │ ├─ storage.js datová vrstva: Firebase (Firestore + přihlášení Google), role, záloha/obnova, okno ⚙️
│ │ └─ firebase-config.js nastavení Firebase projektu (vyplnit vlastními hodnotami)
│ ├─ domain/ pravidla hry bez DOM
│ │ ├─ lineup.js nominace, náhradnice, způsobilost ke spuštění živého zápisu, synchronizace živého stavu se sestavou
│ │ ├─ live-engine.js čas, střídání a rotace, tresty podle IIHF, jednotky PP/OS, formace při oslabení, kontrola invariantů front
│ │ ├─ timeline.js úplná časová osa zápasu a statistika střídání
│ │ ├─ corrections.js opravy konců třetin, konce zápasu a prodloužení
│ │ └─ shift-edit.js editace střídání (časy, předání, výměna hráčky, kontrola historie)
│ └─ views/ obrazovky (DOM)
│ ├─ shell.js team.js matches.js opponents.js stats.js modal.js help.js
│ ├─ events.js události a docházka (seznam, kalendář, detail, přihlašování, pětky na tréninku)
│ ├─ lineup-editor.js live.js live-quick.js report.js
│ └─ editor.js shift-editor.js opravy zápisu (události, třetiny, střídání, základ)
├─ firestore.rules pravidla přístupu k databázi (vložit do Firebase Console)
├─ data/seed-data.json počáteční data (soupiska, zápas, soupeř) k importu
├─ manifest.webmanifest, sw.js, icon-*.png instalace na plochu a offline provoz
└─ package.json jen skript npm start (lokální server)
```
Jednosouborová verze (`dist/`, `build.mjs`) byla zrušena a už se nevyvíjí. Synchronizace přes Supabase byla nahrazena Firebase (soubor `db/supabase-setup.sql` lze smazat). Aplikace se vždy spouští ze zdrojových modulů.
**Pravidlo závislostí:** `config` → `core` → `domain` → `views` → `main`. Doména nikdy nesahá do DOM, obrazovky obsahují jen vykreslení a obsluhu.

## Jak aplikaci spustit
Moduly se z `file://` v prohlížeči nenačtou, aplikace potřebuje malý lokální server:
- `npm start` (nebo `python3 -m http.server`) a otevři `http://localhost:3000` (resp. `:8000`).
- Při hostingu nahraj na web celou složku (kromě `node_modules/`), včetně `sw.js`, `firestore.rules`, `hockeycoach-navod.html` a složky `src/`.
- Aplikace stahuje Firebase SDK z `gstatic.com`; první spuštění tedy vyžaduje internet, potom je SDK uloženo v offline paměti (service worker).

## Nastavení Firebase (jednorázově)
1. **Projekt:** na console.firebase.google.com založ projekt. *Build → Firestore Database → Create database*, region v EU (`eur3` nebo `europe-west3`).
2. **Pravidla:** *Firestore → Rules* → vlož obsah `firestore.rules` → **Publish**. Od v16.0 musí pravidla obsahovat i kolekce `events` a `attendance` (viz „Události a docházka“).
3. **Přihlášení:** *Authentication → Sign-in method → Google → Enable*. V *Settings → Authorized domains* musí být doména, odkud aplikaci otevíráš (`localhost` bývá přidaný, hosting přidej ručně).
4. **Konfigurace:** *Project settings → Your apps → Web app (</>)* → hodnoty vlož do `src/data/firebase-config.js`.
5. **První trenér (ručně):** *Firestore → Start collection* `members` → ID dokumentu = tvůj e-mail **malými písmeny**, pole `role` (string) = `trener`. Další členy pak přidáváš v aplikaci (⚙️ → Členové týmu).
6. **Přenos stávajících dat:** ve staré verzi ⚙️ → Stáhnout zálohu (JSON), v nové po přihlášení ⚙️ → Obnovit ze zálohy → **Nahradit vším**. Alternativně `data/seed-data.json`.

Hosting je možný kdekoli přes HTTPS (Firebase Hosting, Netlify, GitHub Pages). HTTPS je nutné pro přihlášení, instalaci na plochu, offline režim a zámek displeje při živém zápisu.

## Nápověda
- **V aplikaci:** tlačítko **❓** v záhlaví (vedle ⚙️) otevře celoobrazovkový přehled ovládání rozdělený do rozbalovacích sekcí (přihlášení, Team, zápas, živý zápis, tresty, zápis utkání a opravy, statistiky, záloha, rychlá reference). Nahoře je **vyhledávání** (nevyhovující sekce se skryjí, vyhovující rozbalí). Zavře se tlačítkem Zavřít nebo klávesou Esc. Nápověda je čistě informační a funguje i offline.
- **Za živého zápisu** je živá obrazovka přes celé záhlaví, nápovědu proto otevři před zahájením zápasu (nebo po ✕ Zavřít živý zápis).
- **Samostatný návod:** soubor `hockeycoach-navod.html` (otevře se v prohlížeči, jde vytisknout do PDF). Obsahuje totéž podrobněji.
- **Technicky:** `src/views/help.js` (obsah je pole `SECTIONS`, nová sekce = nový objekt `{t, h}`), tlačítko `#help` v `index.html`, napojení `initHelp()` v `src/main.js`. Při změně ovládání aktualizuj obě místa: `help.js` i `hockeycoach-navod.html`.
- **Pozor:** nápověda a návod zatím **neobsahují** záložku Události a docházku (v16.0). Doplní se, až se modul ustálí.

## Přihlášení, role a ochrana dat
- **Přihlášení:** účtem Google. Přístup mají jen e-maily zapsané v kolekci `members` (Google účet se musí shodovat s e-mailem v seznamu). Neznámý účet po přihlášení nic neuvidí.
- **Role** (uložené v `members/{email}`, vynucují je pravidla databáze, ne jen tlačítka v aplikaci):

| Role | Čtení | Zápis |
|---|---|---|
| **trener** | vše | vše: soupiska, zápasy, soupeři, formace, události, docházka (za kohokoli), členové týmu, obnova ze zálohy |
| **kustod** | vše | zápasy (nominace, sestava, živý zápis, opravy), soupeři, základní formace, události, docházka (za kohokoli); v soupisce jen stav hráčky (např. trvalé zranění ze živého zápisu) |
| **hracka** | vše | jen vlastní docházka (přihlášení hráček zatím není povolené) |

- **Hráčky:** přihlášení je zatím zablokováno hláškou, že přístup přijde s modulem docházky a tréninků. Docházku proto zatím zapisuje trenér nebo kustod za hráčky (viz níže). Pravidlo pro hráčky (`attendance`, dokument `{eventId}_{playerId}`, hráčka zapíše jen svůj) se doplní s jejich přihlášením.
- **Jen pro trenéry:** kolekce `coach` (pro budoucí hodnocení hráček a poznámky) je pro ostatní role nečitelná. Pravidla Firestore omezují celé dokumenty, ne jednotlivá pole; údaje pro trenéry proto patří do oddělené kolekce.
- **Kustod** nemůže přidávat a mazat hráčky ani měnit jejich jména a pozice. V aplikaci to zatím není skryté, zobrazí se hláška `permission-denied`.
- **Klíč Firebase** v `firebase-config.js` není tajný. Ochranu dat zajišťují pravidla a přihlášení.
- **Data v databázi:** jen přezdívky, čísla a statistiky. Věk hráček se neukládá.
- Dál dělej zálohy JSON (⚙️ → Stáhnout zálohu). Automatické zálohy Firestore vyžadují placený plán Blaze.

## Události a docházka (v16.0)
První jednoduchá verze modulu; další funkce se budou doplňovat postupně.

### Záložka Události
Horní menu je nově **Události · Team · Statistiky · Soupeři**. Záložka **Události** sloučila dřívější Zápasy a přidala tréninky. Zápasy se zakládají a vedou stejně jako dřív: klepnutím na zápas se otevře detail události a tlačítko **🏒 Otevřít zápas** přejde do karty zápasu (nominace, sestava, živý zápis, opravy…). Návrat je klepnutím na **Události** v horním menu.
- **Zapisuji účast za:** nahoře se vybere hráčka (pamatuje se v zařízení). Rychlá tlačítka **✅ Jdu / ❌ Nejdu / ❓ Nejsem jistý** v seznamu pak zapisují za ni. Až se přihlásí hráčky samy, doplní se to automaticky.
- **Seznam:** přepínač Nadcházející / Minulé / **Kalendář** (měsíční mřížka, tečky u dnů s událostí, klepnutím na den se seznam zúží). U každé události je termín přihlášení, počty ✅ ❓ ❌ a vaše odpověď.
- **Jdu:** zapíše se hned (opakované klepnutí odpověď zruší). **Nejdu** vyžaduje důvod (rychlé volby Nemoc, Zranění, Škola, Práce, Rodina, Jiné, nebo vlastní text). **Nejsem jistý** má důvod nepovinný. V okně s důvodem jde odpověď i zrušit.
- **Konečný termín přihlašování** je povinný u tréninku a nastavuje se u každé události (datum a čas). Výchozí hodnota je den před událostí v 18:00. Po termínu (a po dni události) jsou rychlá tlačítka v seznamu zamčená 🔒; trenér a kustod mohou v detailu odpovědi měnit i po termínu. Termín zápasu se nastavuje v detailu události (✏️ Čas, místo, termín).
- **Detail události:** souhrn (jdou / nejistí / nejdou / bez odpovědi), seznam všech aktivních hráček podle pozic s odpovědí, důvodem a tlačítky pro změnu (trenér tak zapíše odpověď za kohokoli). Trénink lze upravit nebo smazat (smaže i odpovědi).
- **Trénink – rozdělení do pětek:** v detailu tréninku jsou hráčky, které jdou (bez brankářek). Každé se jedním klepnutím přiřadí 1.–4. pětka (barvy jako v živém zápisu: modrá, žlutá, zelená, růžová) nebo „–“. Tlačítko **↻ Podle základní formace** rozdělí přihlášené hráčky podle základní formace v záložce Team (partnerky z rotace patří do téže pětky); **Vymazat** rozdělení zruší.

### Datový model
- **`events/{id}`** (jen tréninky): `{type:"training", title, date:"YYYY-MM-DD", time:"HH:MM", place, dl:"YYYY-MM-DDTHH:mm", note, lines:{<playerId>: 1–4}}`.
- **Zápasy** zůstávají v `matches`; přibyla volitelná pole `time`, `place` a `dl` (termín přihlašování). Starší zápasy je nemají (termín je „nenastaven“, zápas se zamkne po dni konání).
- **`attendance/{eventId}_{playerId}`:** `{eid, pid, st:"yes"|"no"|"maybe", reason, at:ISO, by:e-mail}`. `eventId` je id tréninku nebo zápasu. Bez dokumentu = bez odpovědi.
- Kolekce `events` a `attendance` jsou součástí zálohy JSON. „Nahradit vším“ ze staré zálohy bez těchto kolekcí je nesmaže.
- Pokud pravidla databáze kolekce nepovolí, aplikace běží dál (zápasy, živý zápis…) a v záložce Události se zobrazí červená hláška s kódem chyby.

### Pravidla databáze (doplnit do `firestore.rules`)
Soubor `firestore.rules` nebyl při vzniku v16.0 k dispozici, proto je blok uveden zde. Vlož ho do sekce `match /databases/{database}/documents { … }` a **Publish**. Pokud už pravidlo pro `attendance` existuje (pouze vlastní docházka hráčky), uprav ho tak, aby trenér a kustod směli zapisovat za kohokoli.
```
function role() {
  return get(/databases/$(database)/documents/members/$(request.auth.token.email.lower())).data.role;
}
function isStaff() {
  return request.auth != null && exists(/databases/$(database)/documents/members/$(request.auth.token.email.lower()))
    && role() in ['trener', 'kustod'];
}
match /events/{id} {
  allow read: if isStaff();
  allow write: if isStaff();
}
match /attendance/{id} {
  allow read: if isStaff();
  allow write: if isStaff();
}
```
(Pokud už v souboru funkce `role()` nebo `isStaff()` jsou, použij ty existující.)

## Provoz na telefonu a PC
**Android:** v Chrome otevři adresu aplikace → menu ⋯ → *Přidat na plochu / Instalovat aplikaci*. Přihlášení zůstává uložené, takže se nemusíš přihlašovat před každým zápasem.
Zadávání na telefonu a prohlížení výsledků na PC probíhá nad stejnou databází; změny se promítají během chvilky.

## Jak funguje synchronizace
- Zápis se uloží hned v zařízení a odešle na server. Bez signálu (hala) se změny řadí do offline fronty a odešlou se po připojení (stav vidíš v ⚙️).
- Ostatní zařízení dostávají změny okamžitě (živý poslech Firestore).
- Ukládá se vždy celý dokument (např. celý zápas). Při souběžné úpravě **stejného zápasu** na dvou zařízeních vyhrává poslední zápis. Živý zápis zápasu proto veď jen z jednoho telefonu. Docházka je ukládána po jednotlivých odpovědích (jeden dokument na hráčku a událost), takže se souběžné přihlašování nepřepisuje.
- Zápis se v aplikaci potvrzuje hned lokálně. Pokud ho server odmítne (např. chybějící práva), zobrazí se hláška „Uložení se nepovedlo“ a změna se vrátí.
- Firestore umožňuje dokument do 1 MB. Zápas se živým zápisem má desítky až stovky kB, což stačí.

## Záloha a přesun dat
- ⚙️ → **Stáhnout zálohu (JSON)** vytvoří kompletní zálohu (hráčky, zápasy, soupeři, formace, události, docházka). Smí každý přihlášený člen.
- ⚙️ → **Soupiska (CSV)** vyexportuje soupisku pro Excel.
- ⚙️ → **Obnovit ze zálohy** (jen trenér): **Sloučit s daty** přidá/přepíše položky ze zálohy, **Nahradit vším** nahradí obsah kolekcí, které záloha obsahuje. Vyžaduje připojení k internetu.
- ⚙️ → **Členové týmu** (jen trenér): přidání a odebrání e-mailů s rolí. Vlastní účet nelze odebrat.

## Postup zápasu (3 kroky)
Zápas se otevře v záložce **Události** (klepnutím na zápas → **🏒 Otevřít zápas**) nebo se založí tlačítkem **+ Zápas**. Nahoře je vždy přehled: soupeř, datum, doma/venku, délka třetiny a stav příprav (✅/⛔ Nominace, Sestava). Pod ním jsou kroky, dole tlačítko pro další krok.
1. **Zápas** – soupeř, datum, délka třetiny (standard 20 min), vzájemné zápasy (jen uzavřené) a karta živého zápisu.
2. **Sestava** – dvě části (A a B):
   - **A Nominace:** klepnutím vybereš hráčky, které máš k dispozici (jsou seřazené podle pozic, Všechny aktivní / Zrušit vše). Dál se jde až po splnění minima (1 brankářka a 5 bruslařek).
   - **B Sestava:** po přechodu se sestava sama naplní **podle základní formace** (jen nominované hráčky). Pod ní jsou **náhradnice rozdělené podle pozic**, pod nimi **přesilovky a oslabení** (hráčka jen v jedné jednotce). Tlačítko ↻ Podle základní formace sestavu znovu přepíše. Sestavu potvrdíš tlačítkem **✔ Uzavřít sestavu**. Jakákoli změna sestavy před zahájením uzavření zruší, takže ji uzavřeš znovu.
3. **Zápas živě** – průběh (nejnovější nahoře), jmenné statistiky zápasu a uzavření zápasu. Karta živého zápisu je i tady.
- **Živý zápis jde spustit až po uzavření sestavy** (a splněné nominaci). Do té doby je vidět, co chybí, a tlačítko vede do kroku 2.
- **Po zahájení zápisu** je uzamčená nominace, soupeř, datum a doma/venku.
- **Změna sestavy za zápasu:** živý zápis → menu ⋯ → **👥 Sestava**. Klepnutím nebo přetažením vyměníš hráčky (i s náhradnicemi). Změna se hned promítne do front střídání: hráčky na ledě zůstávají, ostatní se přeskládají podle nové sestavy. Přesilovky a oslabení jdou měnit v menu ⋯ → Jednotky PP/OS.
- **Krok Soupeř** (zápis soupeřovy sestavy) je zatím z postupu vyřazen. Dříve zapsaná data zůstávají uložená.
- **Hráčka se nesmí opakovat ve více formacích téhož druhu.** Druhy jsou tři: řady 5:5 (jedno místo), přesilovky (jen jedna z PP1/PP2) a oslabení (zvlášť 4 hráčky: SH1/SH2, a 3 hráčky: SH3/SH4). Mezi druhy se hráčka překrývat smí (např. v řadě a zároveň v oslabení).

## Záložka Team
- **Základní formace** nahoře: klepnutím vybereš hráčku na místo, podržením a přetažením ji přesuneš (obsazené místo se prohodí). Sestava se kopíruje do každého nového zápasu a používá se i pro rozdělení do pětek na tréninku.
- **Náhradnice** pod ní: všechny nezařazené hráčky (bez těch, které skončily). Přetažením je dáš na místo v sestavě (hráčka z místa jde na její místo mezi náhradnice), prohodíš je mezi sebou, nebo hráčku ze sestavy přetáhneš na plochu náhradnic. Pořadí náhradnic se pamatuje.
- **Soupiska** (přidání, úprava, filtry, stav hráček) je pod tím, na stejné stránce. Samostatná záložka Soupiska už není. Přidávat, upravovat a mazat hráčky smí jen trenér.

## Celkové statistiky (záložka Statistiky)
- **Statistiky hráčů** (jen uzavřené zápasy): Z (zápasy v sestavě), **Ø stř.** (průměrná délka střídání), střely, góly, procento, asistence, body, +/-, trestné minuty, góly v přesilovce, body doma a venku.
- **Ø stř.** = součet času na ledě ze všech uzavřených zápasů dělený počtem střídání hráčky. Zápasy bez živého zápisu se do průměru nepočítají; hráčka bez střídání má „–“. U rotace se čas počítá jen hráčce, která byla na ledě.
- **Tým** (střely, góly, úspěšnost) a **Brankáři** (střely, góly, zákroky, úspěšnost).

## Řazení tabulek statistik
Všechny tabulky statistik se řadí **klepnutím na hlavičku sloupce** (`<th>`):
- **Kde:** záložka Statistiky (hráči, tým, brankáři), statistiky zápasu (hráčky, brankářky) v kroku 3 i v zápisu utkání, tabulka Střídání hráčů v podrobném rozboru a tabulka Čas na ledě v živém zápisu (menu ⋯). Tabulky Souhrn po třetinách a Sestava v zápisu utkání se neřadí.
- **Ovládání:** první klepnutí řadí čísla a časy **sestupně** (největší nahoře), text **vzestupně** (A–Z). Další klepnutí na stejný sloupec přepíná ▲ vzestupně / ▼ sestupně. Aktuální sloupec a směr ukazuje šipka v hlavičce.
- **Typy hodnot:** text se řadí podle české abecedy (jména s číslem `#5 Janča` se řadí podle čísla dresu a jména), čísla včetně znaménka (`+3`, `-2`), procent (`45 %`, `91,7 %`) i desetinné čárky, časy ve formátu `MM:SS` (včetně sloupce Ø stř. a hodnoty `⚠️ 02:15 (…)` v tabulce střídání). Prázdné hodnoty (`–`) jsou vždy na konci. Při shodě zůstává původní pořadí.
- **Pamatování:** zvolené řazení tabulky platí, dokud se aplikace nenačte znovu (po překreslení nebo změně dat zůstane zachováno). Tisk do PDF ponese aktuálně zvolené řazení (včetně šipky v hlavičce); HTML export zápisu a CSV mají pevné pořadí.
- **Technicky:** `src/core/table-sort.js` – jeden delegovaný posluchač kliknutí a `MutationObserver`, který připraví nové tabulky po překreslení. Řazená tabulka má třídu `sortable` (tabulka času na ledě v živém zápisu je vybrána přes `#lv table`). Novou tabulku zařadíš přidáním třídy `sortable`.

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
Prohlížeč si aplikaci ukládá do paměti. Číslo verze vidíš vpravo vedle názvu nahoře a v ⚙️. Pokud neodpovídá, klepni v ⚙️ na **Načíst novou verzi** (smaže uloženou kopii aplikace, data zůstávají v databázi). Při nahrání na web musí být nahrány všechny soubory projektu, including `sw.js` a celá složka `src/` (včetně `src/core/table-sort.js`, `src/views/help.js` a `src/views/events.js`).

## Co aplikace zatím neumí
- Přihlášení hráček a jejich vlastní zápis docházky (zatím zapisuje trenér nebo kustod za hráčky; pravidlo pro hráčky v databázi se doplní).
- Modul tréninku nad rámec účasti a rozdělení do pětek (např. docházkové statistiky, opakující se tréninky, upozornění na blížící se termín).
- Upozornění na nebezpečné hráčky soupeře podle statistik.
- Hodnocení hráček a dlouhodobý plán (zatím jen v původní verzi v Claude).
- Skrytí tlačítek podle role (oprávnění ale vynucují pravidla databáze).
- Celkový (sezónní) součet času na ledě; v celkových statistikách je jen průměrná délka střídání (v zápase je tabulka času na ledě v menu ⋯ → Čas na ledě a v zápisu utkání).
- Nápověda přímo v živém zápisu (tlačítko ❓ je v záhlaví, které živá obrazovka překrývá).
- Nápověda ❓ a návod zatím nepopisují záložku Události.

## Poznámky k datům z Claude
- Historie kroků „vrátit akci“ v rozehraném zápase se do exportu nepřenesla (zápas, události ani statistiky ano).
- Nastavení limitu střídání a délky třetiny se pamatuje v každém zařízení zvlášť. Totéž platí pro výběr hráčky v záložce Události.

## Historie verzí
- **v16.0 (17. 10. 2026):** modul **Události a docházka** (první jednoduchá verze). Nový soubor `src/views/events.js`; změny v `src/views/shell.js` (záložka Události místo Zápasy, otevřený zápas se zobrazuje v ní), `src/main.js` (odběr kolekcí `events` a `attendance`, jejich chyba neblokuje zbytek aplikace), `src/core/state.js`, `src/data/storage.js` (nové kolekce v záloze, „Nahradit vším“ nemaže kolekce, které záloha neobsahuje), `sw.js` (hokej-v23), `package.json`. Zápasy, živý zápis, střely, góly, tresty a časomíra beze změny. Nutné doplnit pravidla databáze pro `events` a `attendance`.
- **v15.7 (17. 10. 2026):** vrácen přehled **Čas na ledě** do hlavního menu ⋯ živého zápisu (`src/views/live.js`). Obrazovka přehledu i její obsluha v kódu zůstaly, chybělo jen tlačítko `data-m="toi"` v hlavním menu (po přerušení hry). Přidáno tlačítko „📊 Čas na ledě“; střely, góly, tresty, časomíra a střídání beze změny. Zvýšena verze (`storage.js`, `package.json`) a název cache v `sw.js` (hokej-v22).
- **v15.6 (17. 10. 2026):** oprava přesilovek a oslabení (`src/domain/live-engine.js`, `src/views/live.js`). (1) Při aktivní jednotce se ve frontě zobrazují hráčky druhé jednotky téhož druhu bez štítků rotace (dřív řadové hráčky s rotací). (2) `applyMap`: prázdné a vyloučené pozice se doplňují podle pozic (`pickFor`, přednost hráčce na ledě, pak fronta), pozice mimo zredukovanou formaci se nenasazují, a když nelze nasadit nikoho, led se nevyprázdní (`none`). (3) `fitLayout`: při oslabení nastoupí na uvolněné místo čekající hráčka správné pozice, přesunutá hráčka jde na začátek své fronty. (4) `requeue` a `retIce` nezařazují do front hráčky mimo řady (nasazené jen jednotkou), takže se při „Zpět na řady“ nenasadí na špatná místa. (5) `toLines` doplňuje prázdná místa podle pozic. Střely, góly, tresty a časomíra beze změny.
- **v15.5 (17. 10. 2026):** přepracování střídání a rotace v živém zápisu (`src/domain/live-engine.js`, `src/domain/lineup.js`, `src/core/selectors.js`). (1) Nový stavový model na ledě / ve frontě / zaparkovaná, index rotace `L.ri` vždy míří na hráčku, která je skutečně na ledě (`claimSlot`). (2) Fronty bez duplicit, na jedno místo sestavy jedna hráčka, odcházející jde na konec fronty (`requeue`, `rotate`). (3) Kontrola invariantů po každé akci (`settle`, volá ji `fitLayout`): `activeId` nikdy neukazuje na hráčku, která není ve hře. (4) `applyMap` provádí odchod, příchod a rotaci ve správném pořadí; `applyLine` při vyloučené hráčce nasadí partnerku. (5) `syncLive` po změně sestavy přepočítá fronty i index rotace. (6) `activeId` ošetřuje neplatný index.
- **v15.4 (16. 10. 2026):** oprava nasazování při oslabení i přesilovce. (1) Nasazení jednotky nebo pětky: hráčka, která zůstane na ledě a jen změní pozici, už nemá uzavřené a znovu založené střídání; změna v `src/domain/live-engine.js` (`applyMap`). (2) ↩ Zpět na řady při oslabení doplní prázdná místa z front skrytých pozic (`toLines`). (3) Zobrazení při oslabení: fronty skrytých pozic se zobrazí pod nejbližší viditelnou pozicí (`src/views/live.js`).
- **v15.3 (16. 10. 2026):** nápověda v aplikaci (❓ v záhlaví, rozbalovací sekce, hledání, nový soubor `src/views/help.js`), aktualizovaný návod `hockeycoach-navod.html` (Firebase, role, rotace, opravy střídání, statistiky, řazení).
- **v15.2 (16. 10. 2026):** sloupec Ø stř. (průměrná délka střídání) v celkových statistikách hráčů.
- **v15.1 (16. 10. 2026):** řazení tabulek statistik klepnutím na hlavičku (▲/▼; text, čísla, časy MM:SS), nový soubor `src/core/table-sort.js`.
- **v15.0:** přechod datové vrstvy na Firebase (Firestore + přihlášení Google, role trenér/kustod/hráčka), opravy střídání v Opravách zápisu.