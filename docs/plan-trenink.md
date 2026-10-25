# Plán – modul Trénink (E) a úklid před ním (D4)

Sepsáno 24. 10. 2026 nad verzí **v20.6** (242/242 testů zelených). Nahrazuje krátkou sekci „E – později: Modul Trénink“ v `docs/plan-v18.md`.
Zařazení: **v20.7 D4 (úklid) → v21.0 – v21.6 E (Trénink) → v22.x N (notifikace) → P2 (jistota plateb)**. Notifikace se posouvají za Trénink; upozornění v živém tréninku fungují bez serveru (otevřená aplikace, vibrace, zvuk), takže na N nečekají.

## 0. Zadání (uživatel, 24. 10. 2026)
1. Vytvoření, přihlášení, platby – **hotovo** (události, docházka, série, pokladna).
2. **Plán tréninku:** rozdělení do dresů; časový plán; banka cvičení, přidělení časovým oknům a trenérům.
3. **Živý trénink:** každý trenér vidí své cvičení, časové okno s odpočtem a hráčky, které ho právě mají (všechny dohromady se dvěma trenéry, jeden trenér pro brankářky, 2–4 stanoviště s točením skupin); hodnocení po cvičeních (i dodatečně); časovač se spuštěním a upozorněním trenérům na blížící se konec; **stopky** pro měření jednotlivých hráček (i ve skupinách).
4. **Hodnocení a evidence pokroku:** rychlá analýza, kdo co trénoval; využití při plánování (trenér vidí přihlášené hráčky a třeba že 90 % z nich netrénovalo střelbu).

## 1. Kontrola kódu v20.6 – nálezy
Celkově v pořádku: vrstvy `config → core → domain → views` dodržené, společné pomůcky bez kopií, testy pokrývají doménu, bez `TODO`, bez historie verzí v komentářích. Nálezy pro **D4** (bez změny chování):

| # | Nález | Návrh |
|---|---|---|
| D4-1 | **Hotové jednorázové převody** zůstávají v aplikaci: ⚙️ Kontrola dat – pole `ex` (`exPlan`, `runExFix`), převod a 🧹 úklid soukromí (`privacyPlan`, `cleanPlan`, `legacyLeft`), 🔁 převod rolí (`roleState`, `runRoleConvert`, `rolePlan`) – cca 250 řádků v `storage.js`, `settings-view.js`, `domain/` + testy. | Odstranit (převody potvrzené jako provedené). **Ponechat** `splitLegacy` – obnova staré zálohy ho potřebuje. Upozornění na starou roli (`acct().legacy`) ponechat jako hlášku bez tlačítka převodu. |
| D4-2 | Stará role `kustod` / `trener` bez `rv` se v aplikaci pořád převádí (`roleOf`, `isLegacy`), přitom pravidla ji od v20.6 neznají. | Po potvrzení, že žádný účet starou roli nemá: `roleOf` zjednodušit (stará role = žádná práva + hláška). |
| D4-3 | Slovo „kustod“ v komentářích 100× ve 26 souborech (texty v aplikaci už „asistent“). | Sjednotit na „asistent“ / „sport“ (odložená drobnost 5). |
| D4-4 | Duplicita `LINE_NOS` – `domain/guests.js` má vlastní kopii `[1, 2, 3, 4]`. | Importovat z `domain/event-helpers.js`. Modul Trénink pětky rozšiřuje – musí být na jednom místě. |
| D4-5 | Mrtvý export `GUEST_TAG` (`domain/guests.js`) – nikde použit. | Smazat nebo použít místo pevného „🎟“ v pohledech. |
| D4-6 | `src/main.js` a část pohledů (`report.js`, `matches.js`, `help.js`) psané zhuštěně na dlouhých řádcích (main.js má 11× „kustod“, posluchače po jednom řádku 200+ znaků). | `main.js` rozepsat do bloků (posluchači po rolích, komentář u každého) – Trénink do něj přidá 3–4 posluchače. Ostatní soubory až při zásahu. |
| D4-7 | Posluchač sérií `onSnapshot(()=>{})` bez obsluhy (`main.js`) – čte celou kolekci jen kvůli místní kopii. | Ověřit, zda ho potřebuje záloha / úprava série; jinak číst `getDocs` na vyžádání (šetří čtení). |
| D4-8 | Posluchači čtou **celé kolekce bez omezení sezónou** (`events`, `attendance`, `matches`). Trénink přidá další data. | Před E zavést omezení na aktuální sezónu (od 1. 8.) pro `events` / `attendance`, starší na vyžádání (otázka 40 z plánu). Chrání bezplatný tarif Spark (50 000 čtení / den). |
| D4-9 | `docs/plan-v18.md` má 155 kB, v tabulce zdvojené řádky (v20.1, v20.6, E dvakrát). `docs/archiv-readme-v18.7.1.md` (67 kB) popisuje stav v18.7.1 – zastaralé. | Dokončené sekce plánu do `docs/archiv-plan-v18.md`, v plánu nechat tabulku, stav a otevřené fáze. Archiv README smazat (historie je v CHANGELOG a Gitu). |
| D4-10 | Výjimka vrstev: `domain/live-engine.js` ukládá přes `core/actions.js` (uvedeno v KONVENCE). | Neřešit teď (sahá na živý zápis) – jen nechat poznámku. |

## 2. Principy modulu Trénink
Ze zkušeností projektu:
- **Telefon na ledě:** velká tlačítka na pevných místech, vibrace jako potvrzení, ovládání jednou rukou v rukavici, tmavý režim, obrazovka nezhasíná (Wake Lock). Zpět zavře panel, odchod z živého tréninku **nezastaví** společné hodiny (běží dál ostatním trenérům).
- **Šetření databáze (Spark):** jeden dokument na trénink pro plán, jeden pro živý stav, jeden pro výsledky – ne dokument na každé hodnocení. Odpočet se počítá z času spuštění (`startAt`), na zápis jen start / pauza / posun.
- **Jedno místo pravdy:** rozdělení do dresů = stávající `events.lines` (pětky 1–4 modrá / žlutá / zelená / růžová) rozšířené o skupinu brankářek; docházka = `attendance` (✅ Jdu, 🚫 nedorazila se nepočítá); výpočty v `domain/` s testy.
- **Malé verze**, po každé test na Androidu, data jen přidávat, pravidla rozšířit → zúžit, nové moduly v matici práv `settings/perm`.

Z hokejové praxe (metodika ČSLH / ADM – stanoviště, malé hrací prostory, hodně opakování):
- Struktura tréninku: rozbruslení → dovednosti → hra v malém prostoru → herní situace / systém → závěr (hra, vyjetí).
- Stanoviště se točí po skupinách po stejných intervalech; brankářky mají vlastní souběžnou linku s trenérem brankářů.
- Cvičení má **zaměření (dovednosti)**, úroveň, počet skupin, pomůcky, popis a nákres na hřišti; měřitelná cvičení a **testy** (např. rychlost 30 m, okruh s pukem, přesnost střelby z 10 pokusů) se opakují během sezóny kvůli pokroku.

## 3. Datový model (nové kolekce, jen přidání)
| Kolekce | Obsah | Čte | Zapisuje |
|---|---|---|---|
| `drills/{id}` | banka cvičení: `name`, `cat` (kategorie), `sk` (dovednosti – pole klíčů), `lvl`, `dur` (výchozí min), `grp` (vhodné: celý tým / stanoviště / brankářky), `eq` (pomůcky), `desc`, `url` (video), `pdf` (odkaz na PDF), `img` (id obrázků, nejvýš 3 – v21.1), `meas` (měření: `{u: "s"|"ks"|"b", low: true}` = nižší je lepší), `by`, `at`, `arch` (vyřazené) | sport | modul `drills` (e / d) |
| `drillimg/{id}` | obrázek cvičení (v21.1): `d` (data:URL JPEG zmenšený v zařízení na 1280 px, nejvýš 700 000 znaků), `did` (cvičení), `w`, `h`, `by`, `at` – čte se jednorázově na vyžádání | členové kromě hostující (obrázky v plánu) | modul `drills` (e) |
| `trplan/{eid}` | plán tréninku (v21.1): `v`, `goal` (téma), `blocks: [{id, mode: "all"|"st", dur (min), rot (min točení nebo null = automaticky), lanes: [{id, drill, dn (kopie názvu), di (kopie id obrázků), co: [tid], grp: [1..4, "G"]}]}]`, `by`, `at`; bloky jdou za sebou od začátku tréninku (čas se počítá), linka s `"G"` se netočí; poznámky trenérů v plánu nejsou (budou v `treval`) | členové kromě hostující (celý plán, hráčka se zvýrazněnou skupinou – T3) | modul `trplan` (e) |
| `trtpl/{id}` | šablona plánu (v21.2): `v`, `name` (1–60), `goal`, `blocks` (jako plán, bez trenérů `co` a bez skupin stanovišť), `by`, `at` | modul `trplan` (e) | modul `trplan` (e) |
| `trlive/{eid}` | živý stav (v21.3): `v`, `st` (run / pause / end), `e0` (s od začátku plánu v okamžiku zápisu), `wAt` (čas zařízení), `sAt` (čas serveru = `request.time`), `ctl` (řídící = zapisující), `by`, `at`; čas = `e0 + (teď − sAt)` při běhu, posun hodin zařízení se odhadne z čerstvých změn | kdo čte plán (`trplan r`) | kdo upravuje plán (`trplan e`) |
| `plevel/team` | ⭐ výkonnost hráček (v21.3): `v`, `lv` ({id hráčky: 1–5}), `by`, `at` – podklad pro rozdělení do pětek | realizační tým | realizační tým |
| `treval/{eid}` | hodnocení a měření: `{blokId: {r (1–5), note, pl: {pid: {r, note}}, ms: {pid: [hodnoty]}}}` | sport; hráčka jen svoje (otázka T2) | sport |

Rozdělení do dresů zůstává v `events.lines`; nový klíč `"G"` = skupina brankářek, počet skupin tréninku `events.grp` (2–4, výchozí 4). Dovednosti a kategorie jako konstanty v novém `src/config/skills.js` (bruslení, ovládání puku, přihrávky, střelba, 1 na 1 a souboje, bránění, herní situace, přesilovka / oslabení, brankářky, kondice a mimo led, rozcvička / hra).

## 4. Fáze a verze
| Verze | Fáze | Obsah | Náročnost |
|---|---|---|---|
| **v20.7** | **D4** | Úklid podle tabulky v kap. 1 (D4-1 až D4-7, D4-9; D4-8 přesunut do E2, D4-10 až při zásahu do živého zápisu) – **hotovo, nasazeno** (24. 10. 2026). | střední |
| **v21.0** | **E1** | 📚 **Banka cvičení**: nová záložka / sekce Trénink → Cvičení; seznam s filtrem (kategorie, dovednost, úroveň, hledání), ⭐ oblíbená, kopie cvičení, formulář (název, kategorie, dovednosti, délka, skupiny, pomůcky, popis, odkaz na video, měření pro stopky), vyřazení místo smazání (použité v plánech). Modul matice `drills`. `domain/drills.js` + testy. **Hotovo, k testu (25. 10. 2026)** – vstup Team → přepínač 📚 Cvičení, ⭐ oblíbená v zařízení, smazat jde jen vyřazené (od E2 i kontrola použití v plánech – `drillCanDelete(d, used)`). | střední |
| **v21.1** | **E2a** | **Hotovo, k testu (25. 10. 2026):** karta 📋 Plán tréninku pod Rozdělením do pětek, úprava na celé stránce; bloky Společně / Stanoviště, délka −/+, točení automaticky nebo po N min, linky s cvičením, trenéry (přihlášený realizační tým) a skupinami (pětky + 🥅), rozpis točení, kontroly (přetečení, kolize trenérů, skupina na dvou linkách / bez stanoviště, nepřihlášený trenér, vyřazené cvičení); ⚖ vyrovnaně do 2–4 pětek; 📷 obrázky (`drillimg`) a 📄 PDF u cvičení, prohlížeč přes celou obrazovku. `domain/training-plan.js`, `views/trplan-view.js`, `views/drill-media.js`, `tests/training-plan.test.js`. Poslech `trplan` jen u otevřeného tréninku (D4-8 se nedělá). | velká |
| **v21.2** | **E2b** | **Hotovo, k testu (25. 10. 2026):** ⧉ **Kopírovat z předchozího tréninku** (posledních 12 tréninků, jen s plánem; skupiny stanovišť podle pětek nového tréninku, trenéři jen přihlášení), 📑 **šablony plánu** (kolekce `trtpl`, sdílené pro tým, bez trenérů a skupin stanovišť), **📊 Pokrytí dovedností** přihlášených hráček za 14 / 30 / 60 dní (plány jen tréninků v období po jednom dokumentu; „kdo netrénoval“), kontrola použití cvičení v plánech a šablonách před smazáním (smaže i obrázky); navíc 📥 **základní sada** (39 cvičení – hráčky a brankářky) a 📄 **import z CSV** do banky. `domain/plan-reuse.js`, `domain/skill-coverage.js`, `domain/drill-import.js`, `config/drill-starter.js`, `views/trplan-reuse.js`, `views/drill-import-view.js`. | střední |
| (původní E2) | **E2** | 📋 **Plán tréninku** v detailu tréninku: 1) dresy – stávající pětky + skupina 🥅 brankářek, počet skupin, rozdělit automaticky podle základní formace / vyrovnaně; 2) časová osa bloků od začátku do konce tréninku (kontrola přetečení přes `end`), blok **Společně** (1–n trenérů) nebo **Stanoviště** (2–4 linky, každá s cvičením a trenérem, skupiny se točí po `rot` min – aplikace spočítá rozpis), souběžná linka brankářek; 3) přidělení trenérů z přihlášeného realizačního týmu; 4) **Kopírovat z předchozího tréninku** a šablony plánu; 5) **📊 Pokrytí dovedností** přihlášených hráček za posledních N dní (z docházky × plánů – „90 % netrénovalo střelbu“). `domain/training-plan.js` (rozpis točení, časy, kontrola kolizí trenérů, pokrytí) + testy. | velká |
| **v21.3** | **E3** | **Hotovo, k testu (25. 10. 2026)** – navíc rozdělení do pětek s výběrem způsobu, ⭐ výkonnost a bloky podle postů. ⏱ **Živý trénink**: řídící trenér spustí / pozastaví / posune blok; každý trenér vidí **Moje stanoviště** – cvičení, velký odpočet, které skupiny / hráčky má právě teď, co následuje; upozornění vibrací + zvukem 60 s a 10 s před koncem bloku i točení skupin; obrazovka nezhasíná; společné hodiny z `trlive.startAt` (posun hodin zařízení se dorovná). Hráčky jen ke čtení (kde jsem teď) – podle T3. | velká |
| **v21.4** | **E3b** | ⏲ **Stopky**: u měřeného cvičení seznam hráček skupiny, klepnutí na jméno = start / stop (více hráček souběžně, i hromadný start skupiny), opakování, nejlepší výsledek; uložení do `treval.ms`. | střední |
| **v21.5** | **E4** | ⭐ **Hodnocení**: po bloku rychlé hodnocení cvičení 1–5 + poznámka, volitelně u hráček (1–5 nebo 👍 / 👌 / 👎); doplnění i po tréninku (seznam neohodnocených bloků). | střední |
| **v21.6** | **E5** | 📈 **Přehled a analýza**: karta hráčky (tréninky, minuty po dovednostech, hodnocení v čase, výsledky stopek a testů s grafem), tabulka tým × dovednosti (teplotní mapa za období), „kdo co trénoval“, napojení do plánování (E2 pokrytí ukáže i hodnocení), ⬇️ CSV. `domain/training-stats.js` + testy. | velká |
| později | E6 | Dlouhodobý plán (sezónní cíle, témata týdnů, mikrocykly), ✏️ nákres cvičení na hřišti (SVG kluziště), testovací baterie sezóny (pevné testy 3–4× ročně). | – |

Po E: **v22.x N – notifikace** (beze změny návrhu), pak **P2**.

## 5. Práva (matice `settings/perm`)
Nové moduly: `drills` (Banka cvičení: r / e / d – v21.0), `trplan` (Plán tréninku: r / e – v21.1; trenér a asistent r + e (e upravitelné), hráčka r pevně, hostující nic), `treval` (Hodnocení a výsledky: r / e). Výchozí: Manager vše, Trenér vše, Asistent číst + plán a živý trénink (upravitelné), Hráčka podle T2 / T3, Hostující nic. Pravidla databáze: nejdřív rozšířit (nové kolekce), zúžení podle matice ve stejné verzi jako u událostí (`can(modul, akce)`).

## 6. Rozhodnutí uživatele (24. 10. 2026)
- **T1:** nejdřív úklid v20.7 D4, pak Trénink. Hotové převody se odstraní.
- **T2:** hráčka vidí **své výsledky** (stopky, testy) a **co trénovala**; hodnocení trenérů jsou poznámky trenérů – hráčka je **nevidí**.
- **T3:** **všichni** členové vidí, co se bude trénovat (plán, skupiny, stanoviště); poznámky trenérů jen realizační tým.
- **T4:** **jednotné hodiny** pro časová okna (jeden řídí, stanoviště se točí podle okna).
- **T5:** hodnocení hráčky je individuální a pokrok není vidět hned – **jednoduchá stupnice o 4 úrovních: 😃 super · 🙂 v pohodě · 😐 nic moc · 😴 vůbec se nesnaží** (u hráčky i u cvičení), poznámka volitelná.
- **E1 (25. 10. 2026):** vstup do banky cvičení = Team → přepínač 📚 Cvičení. Výchozí práva `drills`: Trenér r / e / d, Asistent r / e (mazat lze povolit v matici), Hráčka nic (banku nepotřebuje, plán uvidí v E2), Hostující nic; číst je pro trenéra a asistenta pevné.
- **E2 (25. 10. 2026):** E2 rozděleno na v21.1 (plán) a v21.2 (kopírování, šablony, pokrytí); plán = karta pod pětkami, úprava na celé stránce; hráčka vidí celý plán se zvýrazněnou skupinou; obrázky cvičení ve Firestore (`drillimg`, zmenšené v zařízení, zdarma na Spark), PDF jen odkazem.
- **E2b (25. 10. 2026):** šablony i kopírování z předchozího tréninku (obojí); banka se naplní 📥 základní sadou a 📄 importem z tabulky CSV (přidáno k v21.2).
- **E3 (25. 10. 2026):** hodiny řídí, kdo smí upravovat plán (`trplan e`, bez nového modulu); ⭐ výkonnost 1–5 jen pro realizační tým (`plevel`); způsob rozdělení do pětek se volí u tréninku (vyrovnaně / podle výkonnosti / střídavě / základní formace, ⚔ poměr postů); u každého bloku volba skupin 🎽 pětky nebo ⚔ útok / obrana.
- D4-8 (poslech jen aktuální sezóny) mění, co je vidět ve statistikách, docházce za starší období a hospodaření – **v v20.7 se nedělá**, řeší se až v E2 (tréninková data se budou číst omezeně od začátku).

## 7. Původní otázky
- **T1 – pořadí:** nejdřív úklid **v20.7 D4**, pak Trénink, notifikace až za ním. Souhlas? Smí D4 odstranit hotové převody (Kontrola dat `ex`, převod soukromí, 🔁 převod rolí) a zrušit podporu staré role kustod?
- **T2 – hodnocení hráček:** vidí hráčka svá hodnocení a výsledky stopek? Návrh: **výsledky stopek a „co jsem trénovala“ ano, hodnocení a poznámky trenérů ne** (jen realizační tým).
- **T3 – plán pro hráčky:** vidí hráčka před tréninkem plán (svou skupinu, stanoviště, cvičení)? Návrh: **ano, jen svou skupinu a pořadí stanovišť, bez poznámek trenérů.**
- **T4 – řízení hodin:** jedny společné hodiny pro celý trénink, řídí je jeden trenér (ostatní jen sledují; řízení lze předat). Stanoviště se točí automaticky podle intervalu. Souhlas, nebo má mít každé stanoviště vlastní odpočet?
- **T5 – stupnice hodnocení:** cvičení 1–5 ⭐, hráčka 1–5 (návrh) nebo jen 👍 / 👌 / 👎 (rychlejší na ledě)?
