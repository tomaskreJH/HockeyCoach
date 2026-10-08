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

## Záložka Team
- **Základní formace** nahoře: klepnutím vybereš hráčku na místo, podržením a přetažením ji přesuneš (obsazené místo se prohodí). Sestava se kopíruje do každého nového zápasu.
- **Náhradnice** pod ní: všechny nezařazené hráčky (bez těch, které skončily). Přetažením je dáš na místo v sestavě (hráčka z místa jde na její místo mezi náhradnice), prohodíš je mezi sebou, nebo hráčku ze sestavy přetáhneš na plochu náhradnic. Pořadí náhradnic se pamatuje.
- **Soupiska** (přidání, úprava, filtry, stav hráček) je pod tím, na stejné stránce. Samostatná záložka Soupiska už není.

## Živý zápis – rychlé ovládání
- **Spuštění:** velké tlačítko je v kroku **1 Zápas** (Zahájit zápas / Pokračovat v živém zápisu).
- **Spodní lišta:** ⚽ Gól naši, ⚽ Gól soupeř a 🚫 Trest jsou stále na očích (při běžící hře zešedlé, nejdřív přeruš hru). Pod nimi je ↩ vrácení poslední akce, Start/Přerušit a menu ⋯ s méně častými akcemi (zranění, konec třetiny, brankářka, nastavení, jednotky, sundat z ledu).
- **Gól naši:** klepneš střelkyni, pak 1. asistenci, pak 2. asistenci (nebo „Bez asistence“). Střelkyně se v asistencích nenabízí. Situaci (5 na 5, přesilovka, oslabení) nastaví aplikace sama, jde ji přepnout.
- **Gól soupeře:** jedno klepnutí, zapíše se rovnou.
- **Trest:** hráčka → délka → důvod.
- **Krok 5 Průběh:** nahoře časová osa (nejnovější nahoře, včetně střel), pod ní jmenné statistiky zápasu včetně času na ledě a počtu střídání. Jen pro čtení.

## Tresty podle pravidel IIHF (živý zápis)
- **Tlačítko 🚫 Trest ve spodní liště:** hráčka (nebo soupeř), délka (2 min, 2+2, 5 min, 10 osobní, do konce) a důvod, vše jednotlivými klepnutími. Hráčka sejde z ledu, místo zůstane prázdné a nahoře běží odpočet.
- **Návrat po vypršení:** po skončení trestu se hráčka sama vrátí na led na svou pozici. Pokud je její místo obsazené, nastoupí na jiné volné místo, jinak čeká ve frontě své pozice jako první.
- **Gól ukončí trest:** pokud padne gól a týmy mají na ledě rozdílný počet hráček, ukončí se nejstarší dvouminutový trest oslabeného týmu a jeho hráčka se vrací. Gól oslabeného týmu trest neukončí. U 2+2 gól ukončí jen první dvě minuty a druhé dvě začnou běžet. Pětiminutový trest gól neukončuje.
- **Minimum 3 bruslaři:** odpykávají se nejvýše dva tresty současně, třetí čeká, dokud se jedno místo neuvolní.
- **Osobní trest (10) a do konce:** tým neoslabují, hned lze doplnit náhradnici. Po osobním trestu se hráčka vrací na lavičku (do fronty), po „do konce“ se nevrací.
- **Souběžné tresty obou týmů** (stejný počet hráček na ledě) gólem neskončí.
- **Hlídání počtu na ledě:** aplikace nepovolí doplnit víc hráček, než dovolují tresty, a upozorní, když je jich na ledě víc. Hráčku můžeš sundat v menu (menu ⋯ → „Sundat z ledu“).
- **Zrušit** u trestu opraví omyl (hráčka se vrátí na led). Poslední akci vrací také tlačítko ↩.
- Nemodelováno: odložený trest, trestné střílení a zvláštní pravidla pro tresty brankářky.

## Přesilovky a oslabení
- **Před zápasem (krok 3 Sestava):** definuj 2 jednotky přesilovky a 2 jednotky oslabení (každá až 5 míst, do oslabení stačí 3–4). Hráčka může být v řadě i v jednotce. Jde zkopírovat z posledního zápasu.
- **Za zápasu:** když je na ledě nerovný počet hráček, objeví se nahoře velká tlačítka **⚡ Přesilovka 1/2** nebo **🛡 Oslabení 1/2**. Jedním klepnutím se jednotka nasadí. Vyloučená hráčka se přeskočí a místo zůstane prázdné. Ostatní hráčky z ledu jdou na konec fronty své pozice.
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
