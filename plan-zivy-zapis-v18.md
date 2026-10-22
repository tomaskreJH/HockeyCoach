# Plán úprav v18 (Zpět, živý zápis, docházka, úklid)

Výchozí verze: v17.7 (22. 10. 2026). Cíl: řada verzí v18.x, po každé fázi test na Androidu, teprve pak další fáze.
Pořadí fází je návrh – lze ho změnit (např. docházku dát před živý zápis).

| Verze | Fáze | Obsah |
|---|---|---|
| v18.0 | A | Tlačítko Zpět v aplikaci, dotaz na ukončení z domovské stránky – **hotovo** (opravy ve v18.1 a v18.1.1) |
| v18.1 | B1 | Společné pravidlo střídání, Průběh se všemi kroky – **hotovo**, k testu |
| v18.2 | B2 | Pevné rozložení tlačítek, odezva (vibrace) – **hotovo** (odezva zůstává, rozložení nahradila v18.3) |
| v18.3 | B5 + B3 | Rozložení B (jediné) a ovládání rotace – **hotovo**, otestováno (požadavky do v18.4) |
| v18.4 | B4 | Hřiště, situace v hlavičce, nabídka jednotky a režim PP/OS, Sestava po zranění, upozornění v průběhu – **hotovo** (v18.4.1 otestováno, opravy ve v18.4.2) |
| v18.4.2 | B4 | Opravy po testu v18.4.1: jednotky OS podle počtu hráček při více trestech, ikona gólu, góly v průběhu, mantinel, čitelnost partnerky v tmavém režimu – **hotovo**, otestováno |
| ~~v18.5~~ | ~~B5~~ | ~~Volitelné rozložení~~ – sloučeno do v18.3 (jen rozložení B, bez volby) |
| v18.6 | G | Náhled role pro vývojáře – zobrazit aplikaci jako hráčka / kustod / pokladník / trenér – **hotovo**, otestováno (hráčka) |
| v18.6.1 | P | Bezpečné QR platby: QR pro mBank, okamžitá platba, číslo účtu → IBAN s kontrolními součty, změna účtu jen návrh + potvrzení (4 oči), varování hráčce – **hotovo**, k testu (čeká na potvrzení účtu druhým trenérem a test QR v mBank) |
| v18.6.2 | P2 | ⭐ **Důležité:** pevně uložený účet v telefonu hráčky (opsáním), jméno příjemce v QR, „čeká na potvrzení přijetí“ – **odloženo**, zařadit po v18.7 |
| v18.7 | C | Docházka pro všechny (📊 v Událostech, období od–do), značka ⛓ dlužnic v docházce – **hotovo**, k testu (⚠️ nejdřív publikovat `firestore.rules`, pak ⚙️ → Přepočítat dlužníky) |
| v18.8 | D | Úklid kódu – zdvojené výpočty, mrtvý kód, sjednocení pomocných funkcí (bez změn UI) |
| později | H | Souběžné tresty – přestavba formací, když hráčka chybí a hra je vyrovnaná (5 na 5, 4 na 4) – **jen myšlenka** |
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
- **Test v18.3 (22. 10. 2026) – požadavky do v18.4** (B4 + úprava rozložení; zadání pro další vlákno):
  1. **Chyba:** při zranění v oslabení chybí upozornění na chybějící hráčku na ledě (zjistit příčinu – podmínka v `liveTick` / `#lwarn`, případně umístění upozornění dole).
  2. **Situace do hlavičky:** stav (5 na 5, přesilovka, oslabení) do hlavičky zápasu vedle čísla třetiny, ne do řádku stavu.
  3. **„Hřiště“:** velký obdélník v barvě ledu – nahoře STŘELA NA NAŠI BRÁNU, pod ní tlustá červená dělicí čára (jako střed hřiště), pod ní hráčky na ledě; celý blok má vypadat jako hřiště. Pod hřištěm naznačený **mantinel**, za ním tlačítka celých pětek a pak hráčky ve frontě podle pravidel (na řadě nahoře, rotující partnerka pod hráčkou, partnerky hráček na ledě dole).
  4. **B4 – PP/OS se odsouhlasí:** při přesilovce / oslabení se nabídne sestava jednotky k odsouhlasení a po potvrzení se rovnou přepne do režimu PP/OS – tlačítka a fronty jen pro jednotky PP/OS (běžné pětky 1.–4. se v tu chvíli nezobrazují). Po skončení nerovnosti návrat k běžným pětkám (↩ Řady). Zranění: hned otevřít Sestavu s vyznačeným prázdným místem (B4).
  5. **Upozornění:** varování (kdo je zraněný, kdo sedí na trestu, chybějící / přebývající hráčka, dlouhé střídání, nestandardní situace) v horním řádku průběhu – **jen když nějaké je**; jinak se řádek nezobrazuje (zrušit „✓ Bez upozornění“). Řádek stavu v hlavičce pak nese jen tresty s odpočtem a ✕ a tlačítka PP/OS – upřesnit v novém vlákně, co v něm zůstane.
  Zachovat: odezva (vibrace + záblesk) z v18.2, ovládání rotace z v18.3, engine beze změny (zásah do `live-engine.js` jen po dotazu).
- **v18.4 (B4 + úpravy po testu v18.3) dodáno, k testu.** Engine beze změny.
  1. Příčina chyby: `liveTick` hlášku o chybějící hráčce potlačil, kdykoli náš trest čekal (`end==null` – druhá část 2+2, třetí trest), a byla jen tlumená „ℹ️“ podmíněná neprázdnými frontami. Nyní ⚠️ vždy (chybí i přebývá).
  2. Situace v hlavičce vedle třetiny (`.lper .lsit`).
  3. Hřiště `.lrink` (střela soupeře → tlustá červená středová čára s kruhem → hráčky na ledě), mantinel `.lboard`, pod ním pětky a fronty (pořadí z v18.3).
  4. Po trestu, který změní počty a vytvoří nerovnost, panel „uask“: navržená jednotka (nejvíc dostupných hráček, přepínač druhé), vyloučená červeně, nesestavená místa z front; ✓ Potvrdit a nasadit → režim PP/OS (tlačítka jednotek situace + ↩ Řady pod mantinelem, fronty jen z jednotek); Ponechat pětky; ✏️ Upravit jednotky. Režim se zobrazuje jen, když `L.unit` patří k platné situaci – po konci nerovnosti se obrazovka sama vrátí k pětkám (uložené `L.unit` zruší až pětka / ↩ Řady, upozornění to připomene). Po zranění (dočasném i trvalém) hned Sestava s vyznačeným místem (`S.lgap`).
  5. Upozornění `#lwarn` v horním řádku průběhu jen když nějaké je: chybí / přebývá hráčka, dlouhé střídání, jednotka po konci nerovnosti, nevybraná brankářka (⚠️), na trestu, v ošetřování (info).
  **K potvrzení – návrh řádku stavu v hlavičce:** tresty (naše i soupeř) s odpočtem a ✕; při nerovnosti bez režimu PP/OS tlačítko ⚡ Jednotka PP / 🛡 Jednotka OS (znovu otevře nabídku); po konci nerovnosti s jednotkou na ledě ↩ Řady; jinak tlumené „Bez trestů“. Pevná výška zůstává (sticky hlavička, nic neposune). Situace, 🩹 a tlačítka jednotek z řádku odešly (hlavička / upozornění / pod mantinel).
- **Test v18.4 (22. 10. 2026):** tresty zabírají zbytečně místo (při více trestech nepřehledné) → do horního stavového okna jako štítky velikosti situace; snížit rámeček hráček na ledě (písmo zachovat); mantinel červený nebo modrý.
- **v18.4.1 dodáno, k testu.** Řádek stavu zrušen: tresty (🚫 #číslo odpočet ✕), ⚡ PP / 🛡 OS a ↩ Řady jsou malé štítky v řádku třetiny vedle situace (jeden řádek, posun do strany). Dlaždice na ledě 64 px (dřív 92 px). Mantinel modrý (červená zůstává středové čáře).
- **Test v18.4.1 (22. 10. 2026) – požadavky do v18.4.2:**
  1. **Více trestů (zásadní):** máme-li vyloučené víc hráček a jeden trest skončí (např. 3 na 5 → 4 na 5), obrazovka se vrátí k běžným pětkám místo k OS1/OS2 – pořád hrajeme v oslabení. Pravidlo: formace se řídí počtem našich hráček na ledě – 5 = pětky (nebo PP při přesilovce), 4 = SH1/SH2, 3 = SH3/SH4. Příčina ve v18.4: `unitView` v `live.js` uzná jen jednotku z platné skupiny (`L.unit` SH3 ∉ SH1/SH2 → pětky) a nabídka `askUnit` se otevře jen po zapsání trestu, ne po skončení trestu (`procExp` v `liveTick`) ani po gólu, který trest ukončí. Návrh: při změně počtu (trest skončí, gól, zrušení ✕) a stále nevyrovnané hře hned nabídnout jednotku nové skupiny (stejný panel „uask“), režim PP/OS zůstává (tlačítka a fronty jednotek nové skupiny); k pětkám až při vyrovnané hře. Pokud by to vyžadovalo zásah do `live-engine.js` (např. automatické nasazení), nejdřív se zeptat.
  2. **Ikona gólu:** ⚽ (fotbal) nahradit hokejovou – návrh 🥅 (branka) a v textu „🏒 Gól“; výskyty: `live.js`, `live-quick.js`, `timeline.js`, `report.js`, `matches.js`, `modal.js`, `help.js`.
  3. **Góly v průběhu podsvítit** – zvlášť náš gól (zelené / modré pozadí) a gól soupeře (červené pozadí); podle typu položky z `timeline()`.
  4. **Mantinel bílo-modrý** (jako dřív bílo-žlutý, jen žlutou nahradit modrou).
  5. **Rotující partnerka (`.lrp`) v tmavém režimu nečitelná** – zajistit kontrastní text i pozadí (světlé i tmavé schéma).
- **v18.4.2 dodáno, k testu (22. 10. 2026).** (1) Více trestů: `unitView` uzná jednotku stejného druhu (PP / OS) i z jiné skupiny, tlačítka a fronty ukazují skupinu platné situace (5 = pětky / PP, 4 = OS1/OS2, 3 = OS3/OS4); nový hlídač `watchSit` v `live.js` po každé změně počtů (konec trestu, gól, ✕, Zpět) při nevyrovnané hře s novou skupinou hned otevře nabídku „uask“, při vyrovnané hře ji zavře. `live-engine.js` beze změny (žádné automatické nasazení). (2) Ikona gólu 🥅 ve všech výskytech. (3) Góly v průběhu podsvícené (náš zeleně, soupeř červeně, obě schémata). (4) Mantinel bílo-modrý. (5) `.lrp` vlastní kontrastní barvy ve světlém i tmavém schématu. Kouřový test jsdom 44 kontrol (scénáře 3→4→5 na 5, PP 5 na 3 → 5 na 4, gól v PP i OS, ✕).
- **v18.4.2 otestováno** (22. 10. 2026).
- **Otázka 11 rozhodnuta (22. 10. 2026):** náhled smí jen vybrané e-maily vývojáře (`DEV_EMAILS` v `storage.js`, nyní tomaskre@gmail.com); výchozí jen ke čtení, zápis lze v ⚙️ povolit zaškrtávátkem „Povolit zápis“.
- **v18.6 (G) dodáno, k testu.** ⚙️ → 👁 Náhled role (role, hráčka `pid`, člen týmu `tid`, pokladník, povolit zápis); volba v `sessionStorage` (`hk-preview`), po spuštění / ukončení se aplikace načte znovu a role náhledu platí od `boot()` – `main.js` tak poslouchá jen data povolená roli (hráčka: jen své předpisy, bez `cash`, `audit`, `evcash`). Pruh „👁 Náhled: … · Ukončit náhled“ v liště `#nav`. Strážce `HK.blocked()` v `writeDoc`, `removeDoc`, `batch().commit()`, členech, obnově zálohy a v `save` / `upd`. `firestore.rules` beze změny. Kouřový test jsdom.
- **Test v18.6 (22. 10. 2026):** náhled hráčky funguje. Zásadní nález: mBank QR nepřečte („neplatný QR kód“), Fio ano. Požadavky: zadávat číslo účtu (IBAN dopočítat), okamžitá platba, texty bez diakritiky, kontrolní součet hned při zadání, ochrana proti podvržení účtu, upozornění na kontrolu před platbou a vyloučení odpovědnosti.
- **Rozhodnuto 22. 10. 2026 (QR):** účty mění jen trenér; změnu musí potvrdit druhý správce pokladny (4 oči); okamžitá platba přepínačem v nastavení (výchozí ANO).
- **v18.6.1 (P) dodáno, k testu** – viz sekce P. **Nutné publikovat `firestore.rules`.** Po nasazení u stávajícího účtu chybí záznam o změně (zobrazí se „zatím nezaznamenána“); doporučeno účty jednou znovu navrhnout a potvrdit, aby měly záznam.
- **Stav 22. 10. 2026 (15:30):** v18.6.1 nahraná, druhý trenér zatím změnu účtu nepotvrdil → QR v mBank zatím neověřeno. Test v18.6.1 proběhne souběžně s v18.7 (nálezy jako v18.6.x). Bezpečnostní rozšíření plateb zapsáno jako **⭐ Důležité kroky** (sekce P2, v18.6.2).
- **Rozhodnuto 22. 10. 2026 (C):** C1 a C2 v jedné verzi v18.7; Docházka jako přepínač v Událostech se všemi sloupci (účast, %, nejdu, nejistá, bez odpovědi); místo „aktivní hráčky“ (data o příchodu ani historie stavu neexistují) **volba období od–do, výchozí zimní sezóna 1. 8. – 1. 7.**; dlužníky ukázat **značkou mříží ⛓ v docházce** (ne samostatný seznam v Moje platby).
- **v18.7 (C) dodáno, k testu.** `src/domain/attendance.js` (čisté funkce), `src/views/attendance.js` (přehled, značka `debtTag`), `src/domain/debtors.js`; `debtors/{mid} = {mid, since, dues: [{d, x}]}` bez částek – `dues` nese splatnosti a výjimku, aby šly ⛓ / 🔓 a dny po splatnosti dopočítat v zařízení i bez nového zápisu. Zápis ve stejné dávce: `payments.js` (vyúčtování, úhrada, výjimka), `money.js` (vystavení / smazání příspěvku), `cashbook.js` (storno), `storage.js` (smazání události, obnova ze zálohy). **Publikovat `firestore.rules` PŘED nahráním kódu** (jinak selžou dávky s předpisy), pak ⚙️ → ⛓ Přepočítat dlužníky. Kouřový test jsdom 25 kontrol.
- **Pokračování:** test v18.7 a v18.6.1 (nálezy jako v18.7.x / v18.6.x), pak ⭐ **v18.6.2 P2**, potom v18.8 D.
  Stále otevřené: povinnost mít PP/OS sestavené před zápasem (`domain/lineup.js`, mimo B4) – nezařazeno.
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

### B4 – v18.4: Okamžitá nabídka sestavy po trestu a zranění (body 1e, 1f) – hotovo, k testu
- Po zapsání trestu (naše i soupeřovo vyloučení, které mění počty) hned otevřít panel PP/OS: aktivní jednotky pro danou situaci, vyloučená hráčka červeně, tlačítka nasadit jednotku / upravit místo; kustod z něj přečte sestavu. Zavření jedním klepnutím (i tlačítkem Zpět z fáze A).
- Po zranění (dočasné i trvalé) hned otevřít Sestavu s vyznačeným prázdným místem a náhradnicemi.

### B5 – sloučeno do v18.3: Rozložení obrazovky (bod 1g) – hotovo jen varianta B
- Varianta A (dnešní): fronty nahoře → na ledě → čára → střela soupeře dole.
- Varianta B: střela soupeře nahoře → dělicí čára → pětka na ledě → pod ní střídající formace (pořadí front obrácené, na řadě hned pod ledem).
- Volba v nastavení živého zápisu, pamatuje se v zařízení (LS) – každý uživatel si zvolí sám.

## H – později: Souběžné tresty a chybějící hráčka při vyrovnané hře (myšlenka, přidáno 22. 10. 2026)
Zatím jen zamyšlení – nezařazeno do verze, rozhodne se po v18.6.

**Situace:** obě mužstva dostanou trest současně (souběžné / vzájemně se rušící tresty) nebo naše hráčka dostane trest, který tým neoslabuje (10 min osobní, do konce zápasu). Na trestné sedí jedna nebo dvě naše hráčky, ale hra je vyrovnaná – podle pravidel IIHF dál 5 na 5 (náhrada na ledě je povolena), případně 4 na 4 nebo 3 na 3. Skupina jednotek PP/OS se nepoužije (`grpFor` = null), přesto **hráčka v pětce chybí** a trenér musí hned reagovat: kdo jde za ni do pětky, případně jak hrát se čtyřmi.

**Stav v kódu (v18.4.2):**
- `sk` v `live-engine.js` počítá každý menší a větší trest jako oslabení, takže jeden trest na každé straně = **4 na 4**. Souběžné tresty s náhradou (5 na 5) aplikace nezná – pravidlo IIHF pro tento případ ověřit (kdy 4 na 4 a kdy náhrada).
- Při 4 na 4 se ukáže rozložení pro 4 (`LAYOUT(4)`) s běžnými pětkami; jednotka 4 hráček se nenabídne (OS1/OS2 jsou jen pro oslabení).
- Osobní trest (10 min) tým neoslabuje: hráčka zmizí z ledu i fronty, její místo v pětce zůstane prázdné a doplní se jen z fronty – žádné upozornění ani nabídka.

**Možný směr (k rozhodnutí):**
- Po zápisu trestu, kdy hra zůstane vyrovnaná, ale naše hráčka chybí v pětce, hned otevřít nabídku podobnou té po zranění: Sestava s vyznačeným místem (`S.lgap`), návrh náhradnice (stejná pozice, nejméně času na ledě), potvrzení jedním klepnutím. Náhrada jen dočasná – po návratu z trestu se sestava vrátí.
- Při 4 na 4 nabídnout „čtyřku“ – buď jednotky OS1/OS2, nebo samostatnou volbu „4 na 4“ (nové jednotky v `sp` by znamenaly změnu dat a předzápasové sestavy).
- Upozornění v `#lwarn`: „V 2. pětce chybí #12 (trest) – doplň místo“.
- Volba při zápisu trestu „souběžný trest – s náhradou“ (hra 5 na 5) by vyžadovala zásah do `live-engine.js` (`addPen` / `sk`) – jen po dotazu.
- Otevřené: viz otázka 12.

## F – později: Jeden zapisovatel živého zápisu (duplicity, dvě zařízení)
Stav: živý zápis může otevřít víc zařízení zároveň; při souběhu vyhrává poslední zápis (`save` přepíše celý zápas), takže se dvě zařízení „přetahují“ a mohou vzniknout duplicitní záznamy (dvakrát zapsaná střela, gól, střídání).
- **Zámek zapisovatele:** v zápase pole `live.dev = {id zařízení, jméno uživatele, ts}`; zařízení drží zámek obnovou `ts` (např. každých 20 s při otevřeném živém zápisu).
- **Ostatní zařízení jen ke čtení:** vidí živý zápis (skóre, čas, průběh), ale tlačítka zápisu jsou zamčená s informací „Zapisuje: jméno“. Tlačítko **Převzít zápis** (s potvrzením; automaticky, když zámek vyprší – např. 60 s bez obnovy).
- **Zápis přes transakci** (Firestore `runTransaction`) s kontrolou zámku, aby dva zápisy těsně po sobě nepřepsaly jeden druhý.
- **Ochrana proti dvojímu klepnutí:** stejná akce (střela, gól, střídání téže hráčky) do ~1 s po předchozí se nezapíše podruhé, nebo se nabídne „Opravdu znovu?“.
- Offline: zámek se v hale bez signálu neověří – zapisující zařízení pokračuje, převzetí se povolí až po obnovení spojení.
- Pravidla databáze: pravděpodobně beze změny (zápasy zapisuje trenér a kustod), případně kontrola pole `live.dev` – **pak nutné publikovat `firestore.rules`**.
- Zařadit po fázi D (před modulem Trénink), nebo dřív, pokud budou souběhy v praxi vadit.

## G – v18.6: Náhled role pro vývojáře (přidáno 22. 10. 2026, hotovo ve v18.6)
Stav: vývojář (účet trenéra / správce) vidí aplikaci jen ve své roli – nevidí, jak ji vidí hráčka, kustod nebo pokladník.
- **Zobrazit jako:** v ⚙️ volba „👁 Náhled role“ – výběr role (Hráčka – konkrétní hráčka ze soupisky, Kustod, Pokladník, Trenér) a u hráčky / člena týmu propojení (`pid` / `tid`). Aplikace se přepne jen v tomto zařízení (stav v paměti, ne v databázi `members`), nahoře je stálý pruh „Náhled: Hráčka Jana · Ukončit náhled“.
- **Jen ke čtení:** během náhledu se nic nezapisuje (blokace v `save` / `upd` / dávkách s hláškou „V náhledu se nezapisuje“), aby se data nezapsala pod cizí identitou.
- **Omezení:** databáze dál čte s právy vývojáře – náhled ukazuje, co vykreslí obrazovky pro danou roli, ale data, která skutečné hráčce zakážou pravidla (`charges` ostatních, `evcash`, `audit`), musí náhled skrýt sám (stejné filtry jako obrazovky). Ověření pravidel samotných jen skutečným testovacím účtem (Google účet s rolí Hráčka).
- Pravidla databáze se nemění (náhled je jen v aplikaci) → `firestore.rules` publikovat nebude nutné.
- **Rozhodnuto (otázka 11, 22. 10. 2026):** jen vybrané e-maily vývojáře; výchozí jen ke čtení, s volbou „Povolit zápis“ (zapisuje se pod účtem vývojáře za vybranou roli).
- **Hotovo ve v18.6** (k testu).

## P – v18.6.1: Bezpečné QR platby (přidáno 22. 10. 2026, hotovo)
- **QR pro všechny banky:** celý text jen v alfanumerickém režimu QR (VELKÁ písmena bez diakritiky, číslice, mezera, `$ % * + - . / :`); `qrMsg` v `cash.js`, kód `qrcode(0,"M").addData(text,"Alphanumeric")`, tichá zóna 4 moduly. Ověřit v mBank (dříve „neplatný QR kód“).
- **Okamžitá platba:** `PT:IP` podle přepínače `inst` v Nastavení pokladny (výchozí ANO; banka bez podpory pošle běžnou platbu).
- **Číslo účtu → IBAN:** `src/domain/bank-account.js` – `parseAcc` (české číslo účtu nebo IBAN), kontrola mod 11 (předčíslí a číslo, váhy ČNB) a mod 97 (IBAN), `accCheck` před každým QR.
- **Čtyři oči:** návrh `ibanPend {iban, iban2, by, at}` podává jen trenér; potvrzuje jiný správce pokladny → `iban`, `iban2`, `ibanBy`, `ibanOk`, `ibanAt`. Vynucují pravidla (`cashSettingsUpdate` / `cashSettingsCreate`). Audit `acc-prop / acc-ok / acc-no / acc-off`, historie v nastavení, upozornění správcům v Událostech.
- **Hráčka:** účet v českém tvaru i IBAN, kdo a kdy změnil, vždy upozornění na kontrolu a vyloučení odpovědnosti; zařízení si pamatuje ověřené účty (`hk-acc-seen`) – nový / nedávno změněný účet (14 dní) nejdřív varování, QR až po potvrzení.
- **Zbývající riziko (k rozhodnutí):** trenér může přidat člena s příznakem pokladník (např. svůj druhý e-mail) a návrh si potvrdit sám. Brání tomu jen viditelnost (audit, varování hráčkám s e-maily navrhovatele a schvalovatele). Možné rozšíření: audit změn členů týmu a v pravidlech zákaz potvrzení členem přidaným navrhovatelem v posledních N dnech (vyžaduje datum přidání v `members`).

## ⭐ Důležité kroky – P2 v18.6.2: Jistota plateb pro hráčky (přidáno 22. 10. 2026, odloženo)
Cíl: co největší jistota platící, že peníze odešly na správný účet – i kdyby někdo podvrhl data (Firestore, zneužitý účet správce, domluva dvou správců).
Omezení (vědomě): kontrola v aplikaci nechrání před změnou samotného kódu (napadený GitHub / hosting) – útočník by ji z kódu odstranil. Proti tomu jen ochrana mimo aplikaci (body 5–7).
**V aplikaci (v18.6.2):**
1. **Účet uložený v telefonu hráčky:** hráčka si účet týmu uloží jednou **opsáním** čísla účtu (z papíru / od trenéra osobně), ne klepnutím. Nahradí dnešní „Ověřila jsem účet“ (`seenAccs` / `markSeen` v `bank-account.js`, okno QR v `mine.js`).
2. **Porovnání při každém QR:** účet z databáze ≠ uložený v telefonu → QR se **nevytvoří**, červené varování „Účet týmu nesouhlasí s účtem uloženým v tvém telefonu – neplať a ozvi se trenérovi“. Změna = znovu opsat nové číslo.
3. **Jméno příjemce v QR** (`RN:` – název majitele účtu přesně podle banky; banky ho zobrazí, ověřování jména příjemce u CZK plateb se zavádí, povinné do 2027). Rozhodnout: přesný název majitele účtu.
4. **Potvrzení přijetí:** u předpisu stav „odesláno – čeká na potvrzení přijetí“ (hráčka označí odeslání), když pokladník úhradu do X dní nezapíše → připomenutí hráčce, ať se ozve. Rozhodnout: lhůta (návrh 7 dní).
**Mimo aplikaci (doporučení pro tým, do nápovědy):**
5. Účet týmu uložit jako **příjemce / šablonu v bankovní aplikaci** každé hráčky (ověřit osobně jednou) – nejsilnější ochrana, nezávislá na aplikaci.
6. **Jediný zdroj pravdy mimo aplikaci:** číslo účtu na papíře v šatně / na webu klubu; změnu účtu oznamovat osobně na tréninku, nikdy jen zprávou.
7. **Zabezpečení přístupů:** GitHub i Google/Firebase jen s dvoufázovým ověřením (passkey / bezpečnostní klíč), minimum lidí s právem zápisu a vlastníků projektu Firebase, ochrana hlavní větve na GitHubu, upozornění na změny ve Firebase. Každá verze, která sahá na platby, je v CHANGELOG výslovně označena (`bank-account.js`, `mine.js`, `cash.js`, `firestore.rules`) – zkontrolovat před nahráním.
8. Navazuje zbývající riziko z P (trenér přidá vlastní druhý e-mail jako pokladníka): audit změn členů týmu a zákaz potvrzení čerstvě přidaným členem.

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
- Rozhodnuto (otázka 6): dlužnice s výjimkou zůstává se značkou 🔓, realizační tým se nezapisuje.
- **Dodáno ve v18.7:** místo samostatného seznamu značka ⛓ (mříže) s dny po splatnosti u jména v Docházce a v detailu události, v Docházce karta „⛓ Po splatnosti“ od nejdelšího. Dokument rozšířen o `dues: [{d, x}]` (splatnosti a výjimka, bez částek).

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
Rozhodnuto 22. 10. 2026: 11 – náhled jen pro e-maily vývojáře, výchozí jen ke čtení s volbou Povolit zápis; 1 – Zpět ze živého zápisu zavře rychlý zápis / panel / menu, jinak dotaz na odchod a **odchod zastaví čas**; 3 – panel PP/OS po vyloučení vždy (viz Stav a rozhodnutí); ostatní body podle návrhů: 2 – malé tlačítko partnerky pošle rovnou na led, pořadí rotace podržením; 4 – pevný řádek upozornění nad průběhem (hotovo ve v18.1); 5 – jen rozložení B, A zrušeno (změna po testu v18.2); 6 – dlužnice s výjimkou zůstává se značkou 🔓, realizační tým ne; 7 – jen uplynulé události, procenta z událostí ve zvoleném období od–do (výchozí sezóna 1. 8. – 1. 7.; aktivita hráčky se v datech neeviduje); 8 – karta zápasu o krok zpět (hotovo); 9 – +/- brankářkám nepočítat ani v celkových statistikách (změní čísla, ve fázi D); 10 – kontrola pole `ex` v ⚙️ před smazáním `legacyEx`.
Původní znění:
1. Zpět ze živého zápisu: jen zavřít panel/menu, nebo i opustit živý zápis (s dotazem)?
2. Rotace: má malé tlačítko partnerky posílat rovnou na led (bez změny pořadí rotace), nebo jen přehodit pořadí? Jak pak měnit pořadí rotace ručně (podržením)?
3. Po trestu: otevřít panel automaticky vždy, nebo jen když máme sestavené jednotky PP/OS? Má se otevřít i po skončení trestu (návrat do řad)?
4. Upozornění v průběhu: jako řádky v seznamu, nebo jednořádkový pevný ticker nad průběhem?
5. Výchozí rozložení živého zápisu pro nové uživatele: A, nebo B? → **změněno 22. 10. 2026: jen B** (A zrušeno).
6. Dlužníci: skrýt dlužnici s výjimkou z blokace? Ukazovat i realizační tým (nemá předpisy – asi ne)?
7. Docházka: počítat jen uplynulé události, nebo i budoucí s odpovědí? Procenta z událostí, na které byla hráčka nominovatelná (aktivní), nebo ze všech?
11. Náhled role (G): kdo ho smí používat – jen vývojář (seznam e-mailů), nebo každý trenér? Má být v náhledu zápis zakázaný (návrh: ano)?
12. Souběžné tresty (H): má aplikace znát souběžné tresty s náhradou (5 na 5) vedle 4 na 4? Doplnit chybějící hráčku dočasně jen pro trest, nebo trvale? Při 4 na 4 použít OS1/OS2, nebo nové jednotky „4 na 4“?

## Pravidla práce (z projektu)
- Vždy vypsat načtenou verzi; vracet změněné soubory jako celky ke stažení (zip s cestami), žádné NAJDI/NAHRAĎ, žádné zkracování.
- Struktura souborů a stručné komentáře po blocích; česky.
- Bez Git příkazů.
- Neměnit nesouvisející logiku (střely, góly, časomíra, tresty, pokladna). Když požadavek vyžaduje další úpravu jinde, upozornit a zeptat se.
- Zapsat verzi do `CHANGELOG.md` a řádek Aktuální verze v README, upravit nápovědu `help.js`, verzi (`storage.js`, `package.json`, cache `sw.js`); při změně pravidel výslovně napsat „publikovat firestore.rules“.