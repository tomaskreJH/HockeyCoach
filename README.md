# Hokej – zápasy (samostatná verze)

Aplikace pro trenéry: soupiska, formace, nominace, zápasy s živým zápisem, soupeři, statistiky.
Běží v prohlížeči, nepotřebuje Claude ani žádný vlastní server.

## Obsah složky
| Soubor | K čemu je |
|---|---|
| `index.html` | samotná aplikace |
| `storage.js` | úložiště, synchronizace, záloha a obnova dat |
| `sw.js`, `manifest.webmanifest`, `icon-*.png` | instalace na plochu (PWA) a provoz bez signálu |
| `seed-data.json` | **tvoje data z Claude** (22 hráček, 1 zápas, soupeř, výchozí formace) |
| `supabase-setup.sql` | jednorázové nastavení databáze pro synchronizaci |

Soubory musí zůstat pohromadě ve stejné složce.

## 1) Nejrychlejší start (jen jedno zařízení)
1. Otevři `index.html` v prohlížeči (dvojklik).
2. Klepni na ⚙️ vpravo nahoře → **Obnovit ze zálohy** → vyber `seed-data.json` → **Nahradit vším**.
3. Hotovo. Data se ukládají v prohlížeči daného zařízení.

Upozornění: dokud nepřipojíš synchronizaci, jsou data jen v tomto prohlížeči. Smazání dat prohlížeče je smaže. Dělej zálohy (⚙️ → Stáhnout zálohu).

## 2) Provoz na telefonu a PC se společnými daty
Potřebuješ (a) web, odkud se aplikace otevírá, a (b) databázi pro synchronizaci. Obojí jde zdarma.

**a) Zveřejnění aplikace (HTTPS)** – vyber jednu možnost:
- Netlify: na app.netlify.com → *Add new site → Deploy manually* → přetáhni celou složku.
- GitHub Pages: nahraj soubory do repozitáře → Settings → Pages.
HTTPS je nutné pro instalaci na plochu, offline režim a zámek displeje při živém zápisu.

**b) Databáze (Supabase)**
1. Na supabase.com založ projekt (zdarma).
2. *SQL Editor → New query* → vlož obsah `supabase-setup.sql` → **Run**.
3. *Project Settings → API*: zkopíruj **Project URL** a klíč **anon public**.
4. V aplikaci na PC i v telefonu: ⚙️ → vlož URL a klíč → **Připojit**. První zařízení nahraje svá data, ostatní si je stáhnou.

**Android:** v Chrome otevři adresu aplikace → menu ⋮ → *Přidat na plochu / Instalovat aplikaci*.

## Jak funguje synchronizace
- Zápis se uloží hned v zařízení a odešle na server. Bez signálu (hala) se změny řadí do fronty a odešlou se po připojení (stav vidíš v ⚙️).
- Ostatní zařízení si změny stahují cca každých 5 s.
- Při souběžné úpravě **stejné položky** na dvou zařízeních vyhrává poslední zápis. Živý zápis zápasu proto veď jen z jednoho telefonu.

## Bezpečnost (důležité)
Nastavení z `supabase-setup.sql` dovoluje číst i zapisovat komukoli, kdo zná **URL projektu i klíč**. Adresu aplikace a klíč nikomu nedávej a nevkládej do veřejného repozitáře dokumentaci s klíčem. V aplikaci jsou jen přezdívky, přesto jde o data týmu. Pokud potřebuješ vyšší ochranu, je potřeba doplnit přihlášení (Supabase Auth) – v této verzi není.

## Záloha a přesun dat
- ⚙️ → **Stáhnout zálohu (JSON)** vytvoří kompletní zálohu (hráčky, zápasy, soupeři, formace).
- ⚙️ → **Soupiska (CSV)** vyexportuje soupisku pro Excel.
- **Sloučit s daty** přidá/přepíše položky ze zálohy, **Nahradit vším** nahradí celý obsah.

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
- **Soupiska** (přidání, úprava, filtry, stav hráček) je pod tím, na stejné stránce. Samostatná záložka Soupiska už není.

## Živý zápis – rozložení a ovládání
- **Horní lišta** (čas s šipkami ◀ ▶ pro posun o 5 s, skóre, situace) zůstává nahoře.
- **Barvy podle pětek:** 1. pětka modrá, 2. bílá, 3. červená, 4. zelená, hráčka mimo pětky šedá. Z barev je vidět, jak se pětky míchají.
- **Rozložení shora dolů:** tlačítka „Celá pětka na led“ → fronty čekajících hráček (nejblíž ledu je ta, která jde na řadu, zvýrazněná oranžově) → **hráčky na ledě** → mezera → **STŘELA NA NAŠI BRÁNU** → poslední čtyři akce z průběhu.
- **Tlačítka hráček:** na ledě číslo (velké), pod ním přezdívka a čas na ledě. V čekání číslo a pod ním přezdívka.
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
- **🤕 Trvale:** hráčka se odebere z nominace a sestavy a v soupisce se označí jako zraněná (🤕), takže do dalších zápasů se nenabízí.

## Zápis utkání
V kroku 3 (Zápas živě) je karta **Zápis utkání**. Otevře souhrn: výsledek a po třetinách, góly a asistence, sestava (řady, brankářky, náhradnice, jednotky, zranění), průběh (góly a tresty) a jmenné statistiky se časem na ledě a počtem střídání. Tlačítka **🖨 Tisk / PDF** a **💾 Stáhnout (HTML)** zápis uloží nebo vytisknou.

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
- **Před zápasem (krok 3 Sestava):** definuj 2 jednotky přesilovky a 2 jednotky oslabení (každá až 5 míst, do oslabení stačí 3–4). Hráčka může být jen v jedné z jednotek (přesilovka 1/2, oslabení 1/2), vedle toho zůstává ve své řadě. Jde zkopírovat z posledního zápasu.
- **Za zápasu:** když je na ledě nerovný počet hráček, objeví se nahoře velká tlačítka **⚡ Přesilovka 1/2** nebo **🛡 Oslabení 1/2**. Jedním klepnutím se jednotka nasadí. Vyloučená hráčka se nahradí jinou (viz výše). Ostatní hráčky z ledu jdou na konec fronty své pozice.
- **Rychlá úprava jednotek při přerušení:** menu **⋯** → **Jednotky PP/OS** – změna hráček v jednotce a nasazení.
- **↩ Zpět na řady** vrátí hru na běžné řady. Prázdné zůstane místo vyloučené hráčky.

## Co aplikace zatím neumí
- Upozornění na nebezpečné hráčky soupeře podle statistik.
- Tréninky, hodnocení hráček a dlouhodobý plán (zatím jen v původní verzi v Claude).
- Přihlášení uživatelů.
- Statistiky času na ledě za celou sezónu (v zápase je tabulka v statistiky zápasu v kroku 5).

## Poznámky k datům z Claude
- Historie kroků „vrátit akci“ v rozehraném zápase se do exportu nepřenesla (zápas, události ani statistiky ano).
- Nastavení limitu střídání a délky třetiny se pamatuje v každém zařízení zvlášť.
