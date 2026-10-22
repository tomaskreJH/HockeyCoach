# Plán úprav v18 (Zpět, živý zápis, docházka, úklid)

Výchozí verze: v17.7 (22. 10. 2026). Cíl: řada verzí v18.x, po každé fázi test na Androidu, teprve pak další fáze.
Pořadí fází je návrh – lze ho změnit (např. docházku dát před živý zápis).

| Verze | Fáze | Obsah |
|---|---|---|
| v18.0 | A | Tlačítko Zpět v aplikaci, dotaz na ukončení z domovské stránky – **hotovo** (opravy ve v18.1 a v18.1.1) |
| v18.1 | B1 | Společné pravidlo střídání, Průběh se všemi kroky – **hotovo**, k testu |
| v18.2 | B2 | Pevné rozložení tlačítek, odezva (vibrace) – **hotovo** (odezva zůstává, rozložení nahradila v18.3) |
| v18.3 | B5 + B3 | Rozložení B (jediné) a ovládání rotace – **hotovo**, k testu |
| v18.4 | B4 | Sestava hned po trestu a zranění |
| ~~v18.5~~ | ~~B5~~ | ~~Volitelné rozložení~~ – sloučeno do v18.3 (jen rozložení B, bez volby) |
| v18.6 | G | Náhled role pro vývojáře – zobrazit aplikaci jako hráčka / kustod / pokladník (nové, návrh) |
| v18.7 | C | Docházka pro všechny, přehled dlužníků pro všechny |
| v18.8 | D | Úklid kódu – zdvojené výpočty, mrtvý kód, sjednocení pomocných funkcí (bez změn UI) |
| později | F | Jeden zapisovatel živého zápisu – ochrana proti duplicitám a souběhu dvou zařízení |
| později | E | Modul Trénink (zatím neřešit) |

---

## Stav a rozhodnutí (aktualizováno 22. 10. 2026)
- **v18.0 (A) dodáno.** Test: Zpět zavírá okna a detaily, ale na ukončení se neptalo. Příčina: Chrome přeskakuje záznamy historie vložené bez aktivace uživatelem a dotyk prstem (pointerdown) aktivací není. Oprava ve v18.1: zásoba 3 strážních záznamů doplňovaná při klepnutí (pointerup / touchend / click / klávesa).
- **Odchod ze živého zápisu zastaví čas** (přání po testu v18.0) – platí pro tlačítko Zpět i ⋯ → ✕ Zavřít živý zápis (`leaveLive` v `live.js`). Pokračování: karta zápasu → ▶ Pokračovat → ▶ Start.
- **v18.1 (B1) dodáno** spolu s opravami A.
- **v18.1.1 (oprava A) dodáno, k testu.** Test v18.1: po některých postupech se další Zpět na ukončení nezeptalo a aplikace se zavřela. Příčiny: (1) zavírání oken programovým `el.click()` spouštělo doplnění zásoby bez aktivace – Chrome takové záznamy přeskočí; (2) jedno klepnutí doplnilo až 3 záznamy, ale Chrome aktivaci spotřebuje prvním, další dva byly přeskočitelné a jedno Zpět je přeskočilo všechny; (3) po „Ne“ v dotazu se zásoba nedoplnila. Oprava v `nav.js`: doplnění jen při `e.isTrusted`, jeden záznam za klepnutí (i v dotazu), posun prstem (pointercancel) nic nevkládá, zásoba 5, po vyčerpání zásoby vždy dotaz „Ukončit aplikaci?“. Ověřeno simulací v jsdom s modelem pravidla Chrome (9 scénářů; v18.1 v modelu selhala ve 4).
- **v18.1.1 otestováno** (22. 10. 2026): dotaz na ukončení funguje; opakované Zpět i přes dotaz aplikaci zavře – to je v pořádku (pohodlné).
- **v18.2 (B2) dodáno, k testu.** Pevná místa: tresty `#lpen` (2 tresty, další se posouvají uvnitř), jednotky `#lunit` (jen když má zápas sestavenou jednotku), ošetřování `#ltmp` (1 řádek), fronty v rámečku pevné výšky `#lqbox` podle sestavy (řádek na řadě dole u ledu, delší fronta při oslabení / po jednotce se posouvá uvnitř – kontrola zjistila, že při oslabení se fronty skrytých sloupců slučují a přidávaly řádky). Odezva: nový `src/views/live-feedback.js` (`haptic`, `flash`), vypínač vibrace v ⋯ → ⚙️ Nastavení (LS `hapticOff`); upozornění na dlouhé střídání a konec trestu vibrují vždy. Gól / trest přes menu ⋯ → okno (`openLive`, `modal.js`) odezvu nemá – v živém zápisu se používá rychlý zápis (viz D3).
- **Changelog** (od v18.2): historie verzí je v `CHANGELOG.md` (nejnovější nahoře, Přidáno / Změněno / Beze změny), README popisuje jen aktuální stav a odkazuje na changelog a plán. Pravidlo projektu „upravit README (historie verzí)“ = nově zapsat verzi do `CHANGELOG.md` a aktualizovat řádek Aktuální verze v README.
- **v18.2 otestováno** (22. 10. 2026): odezva (záblesk i vibrace) výborná, zůstává. Pevná místa (prázdné rámečky, led a střela moc dole) a dvojí význam dlaždice nepřehledné.
- **Rozhodnuto 22. 10. 2026:** B5 + B3 v jedné verzi v18.3; rozložení A úplně nahrazeno rozložením B (bez volby); tresty a PP/OS do horní lišty.
- **v18.3 (B5 + B3) dodáno, k testu.** Rozložení B: horní lišta s řádkem stavu `#lchips` (situace, PP/OS, tresty, ošetřování; pevná výška, posun do strany) → střela soupeře → čára → pětky → led → sloupce čekajících (na řadě nahoře u ledu). Rotace: partnerka = malé tlačítko pod hráčkou (klepnutí = na led přes `doSub`, podržení = `swapRot`), dole ve sloupci partnerka hráčky na ledě. Engine beze změny.
- **Další: v18.4 (B4)** – sestava hned po trestu a zranění, až po testu v18.3.
- Odpovědi na otevřené otázky: **3** – po vyloučení otevřít panel PP/OS **vždy**; nesestavená jednotka se doplní podle hráček, které trenér pošle na led. Zvážit povinnost mít PP/OS sestavené před zápasem (podmínka „Zahájit zápas“ v `domain/lineup.js` – zásah mimo B4, potvrdit před v18.4). Ostatní otázky – platí návrhy z kontroly kódu (viz níže u otázek).

## A – v18.0: Tlačítko Zpět (Všeobecně 1a)

Stav: aplikace nepoužívá History API (`popstate` / `pushState` nikde), proto systémové Zpět na Androidu zavře celou PWA.

- Zavést jednoduchý „zásobník obrazovek“: každá navigace a každé otevřené okno přidá záznam do historie (`history.pushState`), `popstate` zavře nejvyšší vrstvu.
- Pořadí zavírání (od nejvyšší vrstvy): potvrzovací/QR okna a modaly (`#mod`, `#cpay`, `#mkq`, menu ⋯ živého zápisu) → celoobrazovková okna (nápověda, ⚙️ `#cfg`, Nastavení pokladny `#cset`, Opravy zápisu `#ed`, Zápis utkání `#rp`) → živý zápis (`#lv`) → detail (zápas `S.mid`, událost `S.evid`, soupeř `S.oid`, formulář `S.evf`) → režim Team (`S.tm`) → jiná záložka → domovská stránka (Události, Nadcházející).
- Na domovské stránce: Zpět zobrazí dotaz „Ukončit aplikaci?“ (Ano / Ne). PWA se nedá zavřít příkazem – po „Ano“ se pustí systémové Zpět (opustí strážní záznam historie), po „Ne“ se strážní záznam obnoví.
- Živý zápis: Zpět nesmí omylem nic zapsat ani zastavit čas – jen zavře panel / menu, případně se zeptá „Odejít ze živého zápisu?“ (hodiny běží dál).
- Řešení (v18.0, opraveno v18.1): `src/core/nav.js` – strážní záznamy historie, `popstate` zavře nejvyšší vrstvu klepnutím na její vlastní tlačítko zavření (logika obrazovek se nemění), karta zápasu jde o krok zpět, z domovské stránky dotaz na ukončení. Aplikaci spuštěnou z plochy nelze zavřít skriptem – po potvrzení ji zavře další Zpět.

## B – Živý zápis (body 1a–1g)

### Kde je co v kódu (stav v17.7)
- `src/views/live.js` (~25 kB, hustý kód) – celá obrazovka živého zápisu: horní lišta (třetina, čas ◀ ▶, skóre, situace), `#lwarn` (upozornění – mění výšku a posouvá vše pod sebou), boxy trestů (`.bx` – také posouvají), tlačítka pětek, jednotky PP/OS, fronty (`dq[c]`, řádek 1 = na řadě), pruh „na ledě“ (`.ice-strip`), tlačítko STŘELA NA NAŠI BRÁNU, POSLEDNÍ AKCE (jen 4 záznamy z `m.events` – bez střídání), spodní lišta, menu ⋯ (Sestava, Zranění, Brankářka, Čas na ledě, Jednotky…), `liveTick()` (časy, dlouhé střídání, vibrace jen při dlouhém střídání).
- Rotace: `rb(id)` vykreslí v dlaždici ve frontě `<span class="rt" data-rot>⇄ jméno</span>` → klepnutí na jméno = `swapRot`, klepnutí na zbytek dlaždice = `doSub`. To je problém z bodu 1d.
- `src/domain/live-engine.js` – `leave` (zápis střídání do `L.sh`), `putOn`, `requeue`, `rotate`, `swapRot`, `applyLine`, `applyUnit`, `toLines`, `addPen`, `procExp`, `act` (každá akce + undo).
- `src/views/live-quick.js` – rychlý zápis gólu / trestu (kroky).
- `src/domain/timeline.js` – `shiftsOf`, `shiftStats`, `timeline` (úplný vývoj zápasu).
- Počty střídání se dnes počítají na 5 místech různě: `report.js` `matchStatsHtml` (počítá i nulové), `live.js` Čas na ledě (počítá i nulové), `timeline.js` `shiftStats` a `stats.js` (nulové vynechá), `timeline()` (řádek 🔄 = okamžik, ne střídání).

### B1 – v18.1: Společné pravidlo střídání + Průběh se vším (bod 1c a „nulové záznamy“)
- Nová čistá funkce `shiftList(m)` v `timeline.js`: vezme `L.sh` + probíhající střídání, **vynechá záznamy s délkou ≤ 0** a **sloučí navazující záznamy téže hráčky** (konec = začátek dalšího, hráčka plynule pokračuje – návrat do řad po PP/OS, „obnovit formace“, změna jednotky).
- Použít ve všech 5 místech (statistiky zápasu, Čas na ledě v živém zápisu, Střídání hráček v rozboru, celkové statistiky, vývoj zápasu). Uložená data `L.sh` ani editace střídání (`shift-edit.js`) se NEMĚNÍ.
- „POSLEDNÍ AKCE“ → **Průběh**: jednotný seznam z `timeline()` (góly, střely, tresty, návraty z trestu, střídání, pětky/jednotky, zranění, brankářka, konce třetin), nejnovější nahoře, pevná výška se scrollováním.
- Upozornění (dlouhé střídání, počet hráček na ledě) se přesunou z `#lwarn` do průběhu jako zvýrazněné řádky (nebo pevný jednořádkový „ticker“ v průběhu) – už nic neposouvá tlačítka.

### B2 – v18.2: Pevné rozložení a odezva (body 1a, 1b)
- Pevné pozice: rezervovat místa s pevnou výškou pro tresty, jednotky PP/OS a upozornění (prázdné místo zůstane, když nic není), aby se tlačítka nasazení a střel nikdy neposunula. Ověřit při: začátku/konci trestu, přepnutí PP/OS, dlouhém střídání, ošetřování.
- Haptika: helper `haptic(kind)` (např. `tap` 15 ms, `ok` 30 ms, `warn` [200,100,200]) volaný z `act()` / po úspěšném střídání, střele, gólu, trestu, nasazení pětky, undo. Krátký vizuální záblesk tlačítka jako potvrzení i tam, kde vibrace nejde (iPhone/Safari `navigator.vibrate` nepodporuje). Vypínač v nastavení živého zápisu (LS).

### B3 – v18.3: Ovládání rotace (bod 1d) – hotovo
- Zrušit dvojí význam dlaždice (jméno = rotace, číslo = střídání). Každá dlaždice má jednu akci: poslat tuto hráčku na led.
- Rotující dvojice zůstane u sebe ve sloupci. Návrh pořadí ve sloupci (směrem od ledu nahoru): **na řadě (velká dlaždice) → nad ní menší tlačítko čekající rotující partnerky (poslat rovnou ji místo té na řadě) → další pětka → nahoře rotující partnerky hráček, které jsou právě na ledě.**
- Ruční změna pořadí rotace (dnes `swapRot`) přes menší tlačítko / podržení – upřesnit (otázka 2).
- Pravidla rotace (`rotate`, `requeue`, `claimSlot`) zachovat; měnit jen zobrazení a vstupy.

### B4 – v18.4: Okamžitá nabídka sestavy po trestu a zranění (body 1e, 1f)
- Po zapsání trestu (naše i soupeřovo vyloučení, které mění počty) hned otevřít panel PP/OS: aktivní jednotky pro danou situaci, vyloučená hráčka červeně, tlačítka nasadit jednotku / upravit místo; kustod z něj přečte sestavu. Zavření jedním klepnutím (i tlačítkem Zpět z fáze A).
- Po zranění (dočasné i trvalé) hned otevřít Sestavu s vyznačeným prázdným místem a náhradnicemi.

### B5 – sloučeno do v18.3: Rozložení obrazovky (bod 1g) – hotovo jen varianta B
- Varianta A (dnešní): fronty nahoře → na ledě → čára → střela soupeře dole.
- Varianta B: střela soupeře nahoře → dělicí čára → pětka na ledě → pod ní střídající formace (pořadí front obrácené, na řadě hned pod ledem).
- Volba v nastavení živého zápisu, pamatuje se v zařízení (LS) – každý uživatel si zvolí sám.

## F – později: Jeden zapisovatel živého zápisu (duplicity, dvě zařízení)
Stav: živý zápis může otevřít víc zařízení zároveň; při souběhu vyhrává poslední zápis (`save` přepíše celý zápas), takže se dvě zařízení „přetahují“ a mohou vzniknout duplicitní záznamy (dvakrát zapsaná střela, gól, střídání).
- **Zámek zapisovatele:** v zápase pole `live.dev = {id zařízení, jméno uživatele, ts}`; zařízení drží zámek obnovou `ts` (např. každých 20 s při otevřeném živém zápisu).
- **Ostatní zařízení jen ke čtení:** vidí živý zápis (skóre, čas, průběh), ale tlačítka zápisu jsou zamčená s informací „Zapisuje: jméno“. Tlačítko **Převzít zápis** (s potvrzením; automaticky, když zámek vyprší – např. 60 s bez obnovy).
- **Zápis přes transakci** (Firestore `runTransaction`) s kontrolou zámku, aby dva zápisy těsně po sobě nepřepsaly jeden druhý.
- **Ochrana proti dvojímu klepnutí:** stejná akce (střela, gól, střídání téže hráčky) do ~1 s po předchozí se nezapíše podruhé, nebo se nabídne „Opravdu znovu?“.
- Offline: zámek se v hale bez signálu neověří – zapisující zařízení pokračuje, převzetí se povolí až po obnovení spojení.
- Pravidla databáze: pravděpodobně beze změny (zápasy zapisuje trenér a kustod), případně kontrola pole `live.dev` – **pak nutné publikovat `firestore.rules`**.
- Zařadit po fázi D (před modulem Trénink), nebo dřív, pokud budou souběhy v praxi vadit.

## G – v18.6: Náhled role pro vývojáře (návrh, přidáno 22. 10. 2026)
Stav: vývojář (účet trenéra / správce) vidí aplikaci jen ve své roli – nevidí, jak ji vidí hráčka, kustod nebo pokladník.
- **Zobrazit jako:** v ⚙️ volba „👁 Náhled role“ – výběr role (Hráčka – konkrétní hráčka ze soupisky, Kustod, Pokladník, Trenér) a u hráčky / člena týmu propojení (`pid` / `tid`). Aplikace se přepne jen v tomto zařízení (stav v paměti, ne v databázi `members`), nahoře je stálý pruh „Náhled: Hráčka Jana · Ukončit náhled“.
- **Jen ke čtení:** během náhledu se nic nezapisuje (blokace v `save` / `upd` / dávkách s hláškou „V náhledu se nezapisuje“), aby se data nezapsala pod cizí identitou.
- **Omezení:** databáze dál čte s právy vývojáře – náhled ukazuje, co vykreslí obrazovky pro danou roli, ale data, která skutečné hráčce zakážou pravidla (`charges` ostatních, `evcash`, `audit`), musí náhled skrýt sám (stejné filtry jako obrazovky). Ověření pravidel samotných jen skutečným testovacím účtem (Google účet s rolí Hráčka).
- Pravidla databáze se nemění (náhled je jen v aplikaci) → `firestore.rules` publikovat nebude nutné.
- Rozhodnout (otázka 11): kdo náhled smí (jen vybrané e-maily vývojáře, nebo každý trenér), a zda v náhledu povolit zápis (návrh: ne).

## C – v18.7: Docházka a dlužníci pro všechny

### C1 Přehled docházky pro všechny (bod 1a)
Stav: hráčka vidí v detailu události odpovědi ostatních (bez důvodů); souhrnný přehled docházky neexistuje (dosud odloženo jako „docházkové statistiky“).
- Nový přehled (např. v Událostech přepínač „Docházka“ vedle Nadcházející / Minulé / Kalendář) viditelný všem členům, jen ke čtení.
- Po hráčkách (a realizačním týmu) zvlášť **Tréninky / Domácí zápasy / Venkovní zápasy**: počet účastí z uplynulých událostí, procento, případně počet „nejdu“ a bez odpovědi. Řazení klepnutím na hlavičku (stávající `table-sort.js`).
- Data už všichni čtou (`attendance`, `events`, `matches`), pravidla databáze se nemění. Důvody omluv dál vidí jen trenér a kustod.
- Výpočet jako čistá funkce v nové doméně `src/domain/attendance.js` (ať se dá použít i pro budoucí modul Trénink).

### C2 Přehled dlužníků pro všechny (bod 1b)
Stav: předpisy (`charges`) čte jen jejich vlastník a správci pokladny – ostatní hráčky dluhy druhých z databáze přečíst nemohou.
- Návrh: veřejný souhrn bez částek, kolekce `debtors/{mid}` = `{mid, since}` (nejstarší splatnost nezaplaceného předpisu po splatnosti). Zapisuje ho aplikace správce pokladny ve stejné dávce jako změny předpisů (uzavření vyúčtování, úhrada, storno, vystavení / smazání příspěvku, výjimka); po splatnosti se „dní po splatnosti“ dopočítá v zařízení (dnes − since).
- Seznam pro všechny: jméno a počet dní po splatnosti, seřazeno od nejdelšího. Bez částek (rozšíření později).
- Pravidla: `debtors` čtou všichni členové, zapisuje jen správce pokladny → **nutné publikovat `firestore.rules`**. Jednorázové naplnění tlačítkem v ⚙️ (přepočet ze všech předpisů).
- Pozor: předpis, kterému splatnost uplyne bez jakékoli změny, se do `debtors` dostane až při dalším zápisu nebo přepočtu → proto `since` = splatnost nejstaršího *nezaplaceného* předpisu (i před splatností) a seznam ukáže jen ty, kde už `since` uplynulo.
- Rozhodnout (otázka 6): má výjimka z blokace dlužnici ze seznamu skrýt?

## D – v18.8: Úklid kódu (bez změn UI)

Zjištěno při kontrole v17.7 – návrh, co sjednotit, zjednodušit nebo smazat:

**Počítá se dvakrát / vícekrát**
1. Počet a čas střídání – 5 různých výpočtů (vyřeší B1 funkcí `shiftList`).
2. Statistiky hráček: `report.js` `matchStatsHtml` (jeden zápas) a `stats.js` (souhrn) počítají góly, asistence, střely, TM, +/- každá zvlášť → jedna doménová funkce `playerStats(matches)` pro jeden i více zápasů.
3. Zápis gólu a trestu v živém zápisu má dvě cesty: rychlý zápis (`live-quick.js`) a menu ⋯ → `openLive` → `modal.js`. Zvážit ponechání jen rychlého zápisu v živém zápisu (modal zůstane pro Opravy zápisu).
4. Jména bez HTML: `plainName` (money.js), `nameOf` (timeline.js, cashbook.js), `payerName` (cash.js), `pn` (selectors) → jedna funkce v `selectors.js` (s HTML / bez HTML).
5. CSV: tři implementace (`report.js` `csv`, `cash.js` `csvText`, export v `storage.js`) → jedna v `core/utils.js`.
6. Potvrzení druhým klepnutím (`S.cf === key` + `setTimeout` 4 s) je rozkopírované na víc než 30 místech v 10 souborech → helper `confirm2(key, fn)` v `core/actions.js`.
7. Přetahování (drag) – 4 téměř stejné implementace (`live.js` `lvDrag`, `lineup-editor.js` 2×, `team.js`) → jeden modul `core/drag.js`.
8. Dva různé `vsOf`: `selectors.js` (zápasy proti soupeři) a `cash.js` (variabilní symbol) – stejný název, jiný význam → přejmenovat na `matchesVs` a `vsHash`.

**Lze smazat nebo zjednodušit (ověřit na datech)**
9. `cash.js` `legacyEx` – starý tvar osvobozené hráčky (fx 0, do v17.3). Po kontrole soupisky (všechny hráčky už mají pole `ex`) odstranit.
10. `firestore.rules` – poznámka o kolekci `payments` (staré platby do v16.3); kolekci smazat v konzoli Firebase a poznámku odstranit.
11. Název týmu „HC Střely“ je natvrdo v 7 souborech (`report.js`, `matches.js`, `live.js`, `live-quick.js`, `editor.js`, `modal.js`, `stats.js`) → jedno nastavení (název týmu v ⚙️).
12. `live.js` „obnovit formace“ (`re`) uzavírá a znovu otevírá střídání všem na ledě – po B1 to statistiky nerozbije, ale zvážit, zda volbu vůbec potřebujeme vedle „pětka na led“ a „zpět na řady“.
13. `live.js` je 25 kB hustého kódu v několika dlouhých řádcích – při B1–B5 rozdělit na `live-view.js` (vykreslení), `live-panels.js` (menu ⋯, sestava, jednotky, zranění) a `live-events.js` (obsluha klepnutí).

Postup: každá položka samostatně, bez změny chování; po úklidu ověřit testovacím zápasem, že statistiky a pokladna dávají stejná čísla jako v17.7.

## E – později: Modul Trénink (zatím neřešit)
Podrobný modul: plán tréninku, docházka, rozdělení tréninku (stanoviště, pětky, cvičení), dlouhodobý plán, statistiky pokroku hráček. Začne se až po dokončení v18.x. Příprava: docházka v C1 jako čistá doménová funkce (`attendance.js`), aby ji Trénink převzal.

## Otevřené otázky
Rozhodnuto 22. 10. 2026: 1 – Zpět ze živého zápisu zavře rychlý zápis / panel / menu, jinak dotaz na odchod a **odchod zastaví čas**; 3 – panel PP/OS po vyloučení vždy (viz Stav a rozhodnutí); ostatní body podle návrhů: 2 – malé tlačítko partnerky pošle rovnou na led, pořadí rotace podržením; 4 – pevný řádek upozornění nad průběhem (hotovo ve v18.1); 5 – jen rozložení B, A zrušeno (změna po testu v18.2); 6 – dlužnice s výjimkou zůstává se značkou 🔓, realizační tým ne; 7 – jen uplynulé události, procenta z událostí, kdy byla hráčka aktivní; 8 – karta zápasu o krok zpět (hotovo); 9 – +/- brankářkám nepočítat ani v celkových statistikách (změní čísla, ve fázi D); 10 – kontrola pole `ex` v ⚙️ před smazáním `legacyEx`.
Původní znění:
1. Zpět ze živého zápisu: jen zavřít panel/menu, nebo i opustit živý zápis (s dotazem)?
2. Rotace: má malé tlačítko partnerky posílat rovnou na led (bez změny pořadí rotace), nebo jen přehodit pořadí? Jak pak měnit pořadí rotace ručně (podržením)?
3. Po trestu: otevřít panel automaticky vždy, nebo jen když máme sestavené jednotky PP/OS? Má se otevřít i po skončení trestu (návrat do řad)?
4. Upozornění v průběhu: jako řádky v seznamu, nebo jednořádkový pevný ticker nad průběhem?
5. Výchozí rozložení živého zápisu pro nové uživatele: A, nebo B? → **změněno 22. 10. 2026: jen B** (A zrušeno).
6. Dlužníci: skrýt dlužnici s výjimkou z blokace? Ukazovat i realizační tým (nemá předpisy – asi ne)?
7. Docházka: počítat jen uplynulé události, nebo i budoucí s odpovědí? Procenta z událostí, na které byla hráčka nominovatelná (aktivní), nebo ze všech?
11. Náhled role (G): kdo ho smí používat – jen vývojář (seznam e-mailů), nebo každý trenér? Má být v náhledu zápis zakázaný (návrh: ano)?

## Pravidla práce (z projektu)
- Vždy vypsat načtenou verzi; vracet změněné soubory jako celky ke stažení (zip s cestami), žádné NAJDI/NAHRAĎ, žádné zkracování.
- Struktura souborů a stručné komentáře po blocích; česky.
- Bez Git příkazů.
- Neměnit nesouvisející logiku (střely, góly, časomíra, tresty, pokladna). Když požadavek vyžaduje další úpravu jinde, upozornit a zeptat se.
- Zapsat verzi do `CHANGELOG.md` a řádek Aktuální verze v README, upravit nápovědu `help.js`, verzi (`storage.js`, `package.json`, cache `sw.js`); při změně pravidel výslovně napsat „publikovat firestore.rules“.
