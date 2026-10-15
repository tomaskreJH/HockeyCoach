# Hokej – zápasy (modulární projekt)

Aplikace pro trenéry a kustody: soupiska, formace, nominace, zápasy s živým zápisem, soupeři, statistiky.
Běží v prohlížeči jako PWA, nepotřebuje Claude ani vlastní server. Data jsou v databázi Firebase (Firestore) a přistupuje se k nim po přihlášení účtem Google. Bez signálu aplikace funguje dál a změny se odešlou po připojení.

## Struktura projektu
```
HockeyCoach/
├─ index.html vstupní stránka (načítá styly a src/main.js jako ES modul)
├─ styles/main.css styly
├─ src/
│ ├─ main.js spuštění aplikace, odběr změn dat
│ ├─ debug.js ladicí hák (stránka s ?debug zpřístupní funkce v window.__hk)
│ ├─ config/constants.js konstanty: pozice, důvody trestů, rozložení formací a jednotek
│ ├─ core/ stav, pomocné funkce, čtecí selektory, akce (ukládání)
│ │ ├─ state.js utils.js selectors.js actions.js
│ ├─ data/
│ │ ├─ storage.js datová vrstva: Firebase (Firestore + přihlášení Google), role, záloha/obnova, okno ⚙️
│ │ └─ firebase-config.js nastavení Firebase projektu (vyplnit vlastními hodnotami)
│ ├─ domain/ pravidla hry bez DOM
│ │ ├─ lineup.js nominace, náhradnice, způsobilost ke spuštění zápisu
│ │ ├─ live-engine.js čas, střídání, tresty podle IIHF, jednotky, formace při oslabení
│ │ ├─ timeline.js úplná časová osa zápasu a statistika střídání
│ │ ├─ corrections.js opravy konců třetin, konce zápasu a prodloužení
│ │ └─ shift-edit.js editace střídání (časy, předání, výměna hráčky, kontrola historie)
│ └─ views/ obrazovky (DOM)
│ ├─ shell.js team.js matches.js opponents.js stats.js modal.js
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
- Při hostingu nahraj na web celou složku (kromě `node_modules/`), včetně `sw.js`, `firestore.rules` a složky `src/`.
- Aplikace stahuje Firebase SDK z `gstatic.com`; první spuštění tedy vyžaduje internet, potom je SDK uloženo v offline paměti (service worker).

## Nastavení Firebase (jednorázově)
1. **Projekt:** na console.firebase.google.com založ projekt. *Build → Firestore Database → Create database*, region v EU (`eur3` nebo `europe-west3`).
2. **Pravidla:** *Firestore → Rules* → vlož obsah `firestore.rules` → **Publish**.
3. **Přihlášení:** *Authentication → Sign-in method → Google → Enable*. V *Settings → Authorized domains* musí být doména, odkud aplikaci otevíráš (`localhost` bývá přidaný, hosting přidej ručně).
4. **Konfigurace:** *Project settings → Your apps → Web app (</>)* → hodnoty vlož do `src/data/firebase-config.js`.
5. **První trenér (ručně):** *Firestore → Start collection* `members` → ID dokumentu = tvůj e-mail **malými písmeny**, pole `role` (string) = `trener`. Další členy pak přidáváš v aplikaci (⚙️ → Členové týmu).
6. **Přenos stávajících dat:** ve staré verzi ⚙️ → Stáhnout zálohu (JSON), v nové po přihlášení ⚙️ → Obnovit ze zálohy → **Nahradit vším**. Alternativně `data/seed-data.json`.

Hosting je možný kdekoli přes HTTPS (Firebase Hosting, Netlify, GitHub Pages). HTTPS je nutné pro přihlášení, instalaci na plochu, offline režim a zámek displeje při živém zápisu.

## Přihlášení, role a ochrana dat
- **Přihlášení:** účtem Google. Přístup mají jen e-maily zapsané v kolekci `members` (Google účet se musí shodovat s e-mailem v seznamu). Neznámý účet po přihlášení nic neuvidí.
- **Role** (uložené v `members/{email}`, vynucují je pravidla databáze, ne jen tlačítka v aplikaci):

| Role | Čtení | Zápis |
|---|---|---|
| **trener** | vše | vše: soupiska, zápasy, soupeři, formace, členové týmu, obnova ze zálohy |
| **kustod** | vše | zápasy (nominace, sestava, živý zápis, opravy), soupeři, základní formace; v soupisce jen stav hráčky (např. trvalé zranění ze živého zápisu) |
| **hracka** | vše | jen vlastní docházka (modul docházky se připravuje) |

- **Hráčky:** přihlášení je zatím zablokováno hláškou, že přístup přijde s modulem docházky a tréninků. Pravidla pro docházku jsou už připravená (kolekce `attendance`, dokument `{eventId}_{playerId}`; hráčka zapíše jen svůj).
- **Jen pro trenéry:** kolekce `coach` (pro budoucí hodnocení hráček a poznámky) je pro ostatní role nečitelná. Pravidla Firestore omezují celé dokumenty, ne jednotlivá pole; údaje pro trenéry proto patří do oddělené kolekce.
- **Kustod** nemůže přidávat a mazat hráčky ani měnit jejich jména a pozice. V aplikaci to zatím není skryté, zobrazí se hláška `permission-denied`.
- **Klíč Firebase** v `firebase-config.js` není tajný. Ochranu dat zajišťují pravidla a přihlášení.
- **Data v databázi:** jen přezdívky, čísla a statistiky. Věk hráček se neukládá.
- Dál dělej zálohy JSON (⚙️ → Stáhnout zálohu). Automatické zálohy Firestore vyžadují placený plán Blaze.

## Provoz na telefonu a PC
**Android:** v Chrome otevři adresu aplikace → menu ⋮ → *Přidat na plochu / Instalovat aplikaci*. Přihlášení zůstává uložené, takže se nemusíš přihlašovat před každým zápasem.
Zadávání na telefonu a prohlížení výsledků na PC probíhá nad stejnou databází; změny se promítají během chvilky.

## Jak funguje synchronizace
- Zápis se uloží hned v zařízení a odešle na server. Bez signálu (hala) se změny řadí do offline fronty a odešlou se po připojení (stav vidíš v ⚙️).
- Ostatní zařízení dostávají změny okamžitě (živý poslech Firestore).
- Ukládá se vždy celý dokument (např. celý zápas). Při souběžné úpravě **stejného zápasu** na dvou zařízeních vyhrává poslední zápis. Živý zápis zápasu proto veď jen z jednoho telefonu.
- Zápis se v aplikaci potvrzuje hned lokálně. Pokud ho server odmítne (např. chybějící práva), zobrazí se hláška „Uložení se nepovedlo“ a změna se vrátí.
- Firestore umožňuje dokument do 1 MB. Zápas se živým zápisem má desítky až stovky kB, což stačí.

## Záloha a přesun dat
- ⚙️ → **Stáhnout zálohu (JSON)** vytvoří kompletní zálohu (hráčky, zápasy, soupeři, formace). Smí každý přihlášený člen.
- ⚙️ → **Soupiska (CSV)** vyexportuje soupisku pro Excel.
- ⚙️ → **Obnovit ze zálohy** (jen trenér): **Sloučit s daty** přidá/přepíše položky ze zálohy, **Nahradit vším** nahradí celý obsah. Vyžaduje připojení k internetu.
- ⚙️ → **Členové týmu** (jen trenér): přidání a odebrání e-mailů s rolí. Vlastní účet nelze odebrat.

## Postup zápasu (3 kroky)
Nahoře je vždy přehled: soupeř, datum, doma/venku, délka třetiny a stav příprav (✅/⛔ Nominace, Sestava). Pod ním jsou kroky, dole tlačítko pro další krok.
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
- **Základní formace** nahoře: klepnutím vybereš hráčku na místo, podržením a přetažením ji přesuneš (obsazené místo se prohodí). Sestava se kopíruje do každého nového zápasu.
- **Náhradnice** pod ní: všechny nezařazené hráčky (bez těch, které skončily). Přetažením je dáš na místo v sestavě (hráčka z místa jde na její místo mezi náhradnice), prohodíš je mezi sebou, nebo hráčku ze sestavy přetáhneš na plochu náhradnic. Pořadí náhradnic se pamatuje.
- **Soupiska** (přidání, úprava, filtry, stav hráček) je pod tím, na stejné stránce. Samostatná záložka Soupiska už není. Přidávat, upravovat a mazat hráčky smí jen trenér.

## Rotace dvou hráček na jednom místě
Pro začátečnice: na jedno místo v řadě (např. C v 1. pětce) můžeš dát dvě hráčky, které se točí ob jedno střídání.
- **Nastavení:** pod každou pětkou je řádek **⇄ rotace**. Klepnutím vybereš druhou hráčku (jen u místa, kde je hlavní hráčka). Pořadí změníš přetažením jedné hráčky na druhou: **hlavní místo nastupuje první**. Funguje v kroku Sestava, v záložce Team (základní formace) i v živém zápisu (menu ⋯ → 👥 Sestava). Jedna hráčka smí být jen na jednom místě.
- **Za zápasu:** po konci střídání (výměna, sundání z ledu, nasazení pětky nebo jednotky) se do fronty zařadí partnerka a odcházející hráčka je „zaparkovaná“. Na dlaždici hráčky ve frontě je štítek **⇄ jméno**: kdo za ni skočí po jejím střídání.
- **Ruční override:** klepnutím na štítek ⇄ přehodíš hráčku ve frontě za partnerku (např. když chce trenér rotaci přeskočit). Jde to opakovat a vrací to ↩ Zpět.
- **Výjimky:** po trestu nebo zranění se hráčka vrací bez rotace. Partnerka, která je právě vyloučená, v ošetřování nebo na ledě, se přeskočí.
- **Čas na ledě a statistiky** (střely, góly, +/-, střídání) se počítají jen hráčce, která byla opravdu na ledě. Počet zápasů (Z) dostanou obě. V zápisu utkání jsou obě hráčky místa vedle sebe.
- **Formát dat:** v `lineup` je hlavní hráčka pod klíčem `"1C"` a partnerka pod `"1C+"` (třetí by byla `"1C++"`). Aktuální pořadí rotace za zápasu je v živém stavu `live.ri`, např. `{"1C": 1}` (index do seznamu hráček místa), takže ho vrací ↩ Zpět.

## Živý zápis – rozložení a ovládání
- **Horní lišta** (čas s šipkami ◀ ▶ pro posun o 5 s, skóre, situace) zůstává nahoře.
- **Barvy podle pětek:** 1. pětka modrá, 2. žlutá, 3. zelená, 4. růžová, hráčka mimo pětky šedá. Z barev je vidět, jak se pětky míchají.
- **Rozložení shora dolů:** tlačítka „Celá pětka na led“ → fronty čekajících hráček (nejblíž ledu je ta, která jde na řadu, zvýrazněná) → **hráčky na ledě** → mezera → **STŘELA NA NAŠI BRÁNU** → poslední čtyři akce z průběhu.
- **Tlačítka hráček:** na ledě číslo (velké), pod ním přezdívka a čas na ledě. V čekání číslo a pod ním přezdívka (a u rotace štítek ⇄ s partnerkou).
- **Střídání:** klepnutí na hráčku ve frontě ji pošle na led místo hráčky pod ní. Podržením a přetažením ji pošleš na jinou pozici. Tlačítko **N. pětka** pošle na led celou pětku najednou (např. když jsou řady rozházené).
- **Střela:** klepnutí na hráčku na ledě zapíše její střelu, tlačítko STŘELA NA NAŠI BRÁNU střelu soupeře. **Když je hra přerušená, střely zapsat nejdou.**
- **Spodní lišta:** za běžící hry jen ↩ Zpět a velké Start/Přerušit. **Po přerušení** se přidají ⚽ Gól naši, ⚽ Gól soupeř, 🚫 Trest a ⋯ Další volby (zranění, konec třetiny, brankářka, změna sestavy, jednotky a další).
- **Gól naši:** klepneš střelkyni, pak 1. a 2. asistenci (nebo „Bez asistence“). Střelkyně se v asistencích nenabízí. Situaci nastaví aplikace sama. **Gól soupeře:** jedno klepnutí. **Trest:** hráčka → délka → důvod.
- **Krok 3 Průběh:** nahoře časová osa (nejnovější nahoře, včetně střel), pod ní jmenné statistiky zápasu včetně času na ledě a počtu střídání. Jen pro čtení.

## Oslabení – méně pozic a základní rozdělení
- **Oslabení 4 hráčky:** střed (C), útočník (Ú), oba obránci (LO, PO). **Oslabení 3 hráčky:** střed a dva obránci. Základní rozdělení se definuje předem v kroku 2 (jednotky SH1–SH4), kombinace můžeš zvolit libovolně.
- **V živém zápisu se při oslabení ukáže jen 4 resp. 3 pozice** (ostatní se skryjí). Hráčky na ledě se podle potřeby přeskupí do zbývajících pozic, po skončení trestu se pozice vrátí.
- **Nasazení jednotky:** při oslabení se nabídnou jednotky pro příslušný počet hráček (4 nebo 3), při přesilovce přesilovky PP1/PP2.
- **Vyloučená hráčka v jednotce:** při nasazení jednotky se její místo obsadí jinou hráčkou z fronty téže pozice (nebo z druhé strany), pokud to tresty dovolují. Aplikace to oznámí.

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
   - **Střídání hráček:** pro každou hráčku počet střídání, čas na ledě, **průměrné** a **nejdelší střídání** (s časem, kdy skončilo) a počet dlouhých.
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
- **Návrat po vypršení:** po skončení trestu se hráčka sama vrátí na led na svou pozici. Pokud je její místo obsazené, nastoupí na jiné volné místo, jinak čeká ve frontě své pozice jako první.
- **Gól ukončí trest:** pokud padne gól a týmy mají na ledě rozdílný počet hráček, ukončí se nejstarší dvouminutový trest oslabeného týmu a jeho hráčka se vrací. Gól oslabeného týmu trest neukončí. U 2+2 gól ukončí jen první dvě minuty a druhé dvě začnou běžet. Pětiminutový trest gól neukončuje.
- **Minimum 3 bruslaři:** odpykávají se nejvýše dva tresty současně, třetí čeká, dokud se jedno místo neuvolní.
- **Osobní trest (10) a do konce:** tým neoslabují, hned lze doplnit náhradnici. Po osobním trestu se hráčka vrací na lavičku (do fronty), po „do konce“ se nevrací.
- **Souběžné tresty obou týmů** (stejný počet hráček na ledě) gólem neskončí.
- **Hlídání počtu na ledě:** aplikace nepovolí doplnit víc hráček, než dovolují tresty, a upozorní, když je jich na ledě víc. Hráčku můžeš sundat v menu (menu ⋯ → „Sundat z ledu“).
- **Zrušit** u trestu opraví omyl (hráčka se vrátí na led). Poslední akci vrací také tlačítko ↩.
- Nemodelováno: odložený trest, trestné střílení a zvláštní pravidla pro tresty brankářky.

## Přesilovky a oslabení
- **Před zápasem (krok 2 Sestava):** definuj 2 jednotky přesilovky a 2 jednotky oslabení (každá až 5 míst, do oslabení stačí 3–4). Hráčka může být jen v jedné z jednotek stejného druhu, vedle toho zůstává ve své řadě. Jde zkopírovat z posledního zápasu.
- **Za zápasu:** když je na ledě nerovný počet hráček, objeví se nahoře velká tlačítka **⚡ Přesilovka 1/2** nebo **🛡 Oslabení 1/2**. Jedním klepnutím se jednotka nasadí. Vyloučená hráčka se nahradí jinou (viz výše). Ostatní hráčky z ledu jdou na konec fronty své pozice.
- **Rychlá úprava jednotek při přerušení:** menu **⋯** → **Jednotky PP/OS** – změna hráček v jednotce a nasazení.
- **↩ Zpět na řady** vrátí hru na běžné řady. Prázdné zůstane místo vyloučené hráčky.

## Když po nahrání nové verze vidíš starou
Prohlížeč si aplikaci ukládá do paměti. Číslo verze vidíš vpravo vedle názvu nahoře a v ⚙️. Pokud neodpovídá, klepni v ⚙️ na **Načíst novou verzi** (smaže uloženou kopii aplikace, data zůstávají v databázi). Při nahrání na web musí být nahrány všechny soubory projektu, včetně `sw.js` a celé složky `src/`.

## Co aplikace zatím neumí
- Modul docházky a tréninků s přihlašováním hráček (přístup hráček je zatím zablokován, pravidla databáze jsou připravená).
- Upozornění na nebezpečné hráčky soupeře podle statistik.
- Hodnocení hráček a dlouhodobý plán (zatím jen v původní verzi v Claude).
- Skrytí tlačítek podle role (oprávnění ale vynucují pravidla databáze).
- Statistiky času na ledě za celou sezónu (v zápase je tabulka času na ledě v menu ⋯ → Čas na ledě a v zápisu utkání).

## Poznámky k datům z Claude
- Historie kroků „vrátit akci“ v rozehraném zápase se do exportu nepřenesla (zápas, události ani statistiky ano).
- Nastavení limitu střídání a délky třetiny se pamatuje v každém zařízení zvlášť.