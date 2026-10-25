# Changelog – HockeyCoach

Historie verzí aplikace, nejnovější nahoře. Formát podle zvyklosti „Keep a Changelog“: u každé verze datum, krátké shrnutí a seznam dotčených souborů.
Číslování: hlavní verze (v18) = větší celek podle plánu, druhé číslo (v18.2) = fáze plánu, třetí číslo (v18.1.1) = oprava bez nových funkcí.
Číslo verze je od v18.8 v `src/core/app-version.js` (`APP_VERSION`, `APP_DATE`), v `package.json` (shodu hlídá `npm test`) a v názvu cache v `sw.js` (`hokej-vNN`) – mění se vždy všechna tři. Do v18.7.1 bylo v `src/data/storage.js` (`VERSION`). Úplný postup vydání: `docs/KONVENCE.md`, kapitola 4.

## v21.4 (25. 10. 2026) – E3b: ⏲ stopky a výsledky měření, ⌚ oznámení živého tréninku (i na hodinky), čas cvičení v plánu (modul Trénink)
> **Nasazení:** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** (nová kolekce `trms` – výsledky měření, modul `treval` ve výchozí matici `permDef`; jen rozšíření, v21.3 s novými pravidly funguje beze změny; pokladny a plateb se změna netýká). 3) Nahrát soubory (nové `src/domain/stopwatch.js`, `src/views/stopwatch-view.js`, `tests/stopwatch.test.js`; nic se nemaže). 4) Na telefonech ⚙️ → 👤 Účet → Načíst novou verzi (v21.4, cache `hokej-v87` – nový service worker s obsluhou oznámení). 5) Test na Androidu: a) Team → 📚 Cvičení → cvičení s ⏲ měřením (např. ze základní sady), použít ho v plánu tréninku; b) ✏️ Upravit plán → + 👥 Společně → vybrat cvičení → **⏱ Čas** se nastaví podle banky, rychlá volba 15 → výběr jiného cvičení čas nezmění, 💾 Uložit; c) karta plánu → **⏲ Výsledky měření** → ⏲ Měřit → ▶ Start všech, klepnutím na jména zastavit, ↩ smazat poslední, + Přidat hráčku; u počtu −/+ a ✓ Zapsat; d) ⏱ Živý trénink → **⌚** (povolit oznámení) → ▶ Spustit → oznámení 60 s / 10 s před koncem kola a při točení (na telefonu i na hodinkách – v Garmin Connect povolit oznámení z Chrome), u řídícího ⏸ / ⏭ v oznámení; u měřeného cvičení na tvé lince **⏲ Stopky**; e) hráčka (👁 Náhled role): karta výsledků s pořadím, svůj řádek zvýrazněný, bez ⏲ Měřit; f) ⚙️ → 🔐 Práva rolí: nový řádek ⏲ Měření a hodnocení (asistentovi lze měření vypnout). **🔒 Vyžadovat verzi: ne** (stávající data se nemění).
> Pokud se pravidla nepublikují, karta ukáže „Výsledky se nepodařilo načíst“ a uložení pokusu skončí hláškou „Uložení se nepovedlo“; zbytek funguje. Návrat: nahrát zip v21.3 (pravidla v21.4 mohou zůstat).

**Přidáno**
- **⏲ Stopky** (`src/views/stopwatch-view.js`, okno `#tsw` přes celou obrazovku): u cvičení s měřením (`drills.meas`) – v ⏱ živém tréninku tlačítko „⏲ Stopky – cvičení“ u mé linky (hráčky skupiny v tomto kole, u Společně bez skupin všechny hráčky v poli), v kartě plánu ⏲ Měřit (hráčky linky; stanoviště = všechny hráčky v poli, linka 🥅 = brankářky). **Čas:** klepnutí na jméno = start / stop, víc hráček souběžně, ▶ Start všech / ⏹ Stop všech, velký běžící čas s desetinami, vibrace jako potvrzení; **počet a body:** −/+ (body po 0,5) nebo číslo a ✓ Zapsat. Opakované pokusy (nejvýš 20 na hráčku a linku), ⭐ nejlepší, ↩ smazat poslední pokus (druhým klepnutím), + Přidat hráčku z jiné skupiny; zavření s běžícími stopkami druhým klepnutím; Zpět zavře.
- **⏲ Výsledky měření** v kartě 📋 Plán tréninku: po měřených cvičeních pořadí (stejný výsledek = stejné místo), nejlepší výsledek a poslední pokusy; vidí celý tým kromě hostující (rozhodnutí 25. 10. 2026: měření není tajné, má motivovat), hráčka má svůj řádek zvýrazněný.
- Kolekce **`trms/{eid}`** = {v, r: {blok_linka: {d, dn, u, low, ms: {pid: [pokusy]}}}, by, at} – jeden dokument na trénink, zápis dávkou s hlubokým sloučením (jen pokusy dané hráčky na dané lince, souběžné měření na více stanovištích se nepřepisuje), kopie názvu a jednotky (hráčka banku nečte); poslech jen u otevřeného tréninku; je v záloze (načte se při stažení).
- Modul matice **`treval`** (⏲ Měření a hodnocení tréninku: číst / upravovat): Trenér a Asistent číst + měřit (měřit jde v ⚙️ → 🔐 měnit), Hráčka a Hostující nic (hodnocení a poznámky trenérů z E4 hráčka neuvidí; výsledky měření čte přes plán).
- **⌚ Oznámení živého tréninku** (tlačítko ⌚ v záhlaví obrazovky, volba v zařízení `hk-tl-ntf`, povolení systému): 60 s a 10 s před koncem kola, při točení a na konci plánu systémové oznámení s textem „co teď / co potom“ (např. „⏱ Ještě 1:00 · Střelba“ – „Teď: Stanoviště B · Střelba (2. pětka) · Potom: Stanoviště C · Přihrávky“); Android ho zrcadlí do hodinek (Garmin, Wear OS). Řídící trenér má v oznámení akce **⏸ Pauza / ▶ Pokračovat** a **⏭ Další** (service worker je předá otevřené aplikaci). Se zhasnutým telefonem aplikace tiká řidčeji – hranice se poznají i se zpožděním až 70 s (oznámení přijde později, ale přijde).
- `src/domain/stopwatch.js` – `TRMS_COLL`, `msKey`, `msVal`, `fmtVal`, `measLanes`, `laneMeas`, `swStart`, `swStop`, `swSec`, `swText`, `bestOf`, `addTry`, `dropTry`, `ranking`, `myResults`, `msMeta`, `msPatch`; `training-live.js` – `liveNote` (text oznámení), `alertsDue(…, win)` (okno pro skrytou aplikaci, při skoku jen poslední hranice).
- **📋 Plán – ⏱ čas cvičení v tomto tréninku**: u bloku rychlá volba 5 / 8 / 10 / 12 / 15 / 20 / 30 min a ↺ z banky; výběr cvičení v novém bloku převezme délku z banky (Společně = délka cvičení, Stanoviště = délka × počet kol), dokud trenér čas ručně nezmění; bloky převzaté s cvičením (uložený plán, ⧉ kopie, 📑 šablona) si čas nechají. Banka ani šablona se nemění.
- `sw.js`: obsluha klepnutí na oznámení (`notificationclick` – otevře aplikaci, akce pošle zprávou `{hk: "tl", act, eid}`).
- `firestore.rules`: `trmsOk` a `match /trms/{id}` (čte `can('trplan', 'r')`, zapisuje a maže `can('treval', 'e')`), `permDef` doplněno o `treval`.
- Testy `tests/stopwatch.test.js` (9).

**Změněno**
- `src/views/trlive-view.js` (⌚ oznámení, ⏲ Stopky u mé linky, tik skryté aplikace, akce z oznámení), `src/views/trplan-view.js` (karta výsledků, čas bloku), `src/domain/permissions.js` (`treval`), `src/data/storage.js` (`trms` v záloze), `src/core/nav.js` (Zpět zavře ⏲ stopky), `src/views/help.js`, verze `app-version.js`, `package.json`, `sw.js` → `hokej-v87`, `README.md`, `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/plan-trenink.md` (E3b hotovo, nové fáze K – komfort a G – hodinky Garmin, pořadí), `docs/prompt-dalsi-vlakno.md`.

**Kontrola kódu v21.3** (živý trénink, rozdělení do pětek): bez chyby, která by bránila nasazení. Nález: se zhasnutým telefonem upozornění vypadla (tik prohlížeče se zpomalí a hranice se nepoznala) – opraveno oknem `alertsDue(…, win)` u skryté aplikace. Odložené: odhad posunu hodin a vlastní upozornění bez otevřené aplikace vyřeší až notifikace ze serveru (N) nebo aplikace pro hodinky (G).

**Beze změny**
- Zkratky `HK.can` všech rolí (nový modul je jen v matici – srovnávací test v `stopwatch.test.js`), živý zápis zápasu, statistiky, docházka, pokladna, události, žádosti, nepřítomnost, hostující, stávající pravidla kolekcí; řízení hodin živého tréninku (`trplan e`) a jejich výpočet. Poslech `events` / `attendance` celých kolekcí (D4-8) beze změny.
- Ověřeno: `npm test` (310/310, nové `stopwatch`); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Trenér bez `rv`, Asistent, Hráčka, Pokladník (hráčka s 💰), Hostující, stará role Kustod, vývojář; bez matice i s `settings/perm` – asistent bez `treval e`, trenér bez `trplan e`): start bez chyb, sekce ⚙️, karta ⏲ Výsledky měření (pořadí se jmény, hráčka svůj řádek zvýrazněný, ⏲ Měřit jen s `treval e`, hostující kartu nevidí), stopky ▶ Start všech / ⏹ Stop všech zapíší jen `trms/e1` (sloučení, 4 hráčky jedné linky), ⏲ Stopky v živém tréninku jen u mé linky s měřením, ⌚ v záhlaví, plán – výběr cvičení převezme 12 min z banky, rychlá volba 15, další výběr čas nezmění, uložení jen `trplan/e1`; Kustod bez přístupu.

## v21.3 (25. 10. 2026) – E3: ⏱ živý trénink, rozdělení do pětek s výběrem způsobu, ⭐ výkonnost, bloky podle postů (modul Trénink)
> **Nasazení:** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** (nové kolekce `trlive` – hodiny živého tréninku a `plevel` – výkonnost hráček; jen rozšíření, v21.2 s novými pravidly funguje beze změny). 3) Nahrát soubory (nic se nemaže). 4) Na telefonech ⚙️ → 👤 Účet → Načíst novou verzi (v21.3, cache `hokej-v86`). 5) **Po otestování na všech zařízeních nastavit 🔒 Vyžadovat verzi v21.3** – v21.2 by při uložení plánu zahodila u bloků volbu „podle postů“ (`by`).
> Pokud se pravidla nepublikují, ⏱ živý trénink ukáže „Načítám hodiny…“ a spuštění skončí hláškou „Uložení se nepovedlo“, ⭐ výkonnost ukáže, že se nenačetla; zbytek funguje. Návrat: nahrát zip v21.2 (pravidla v21.3 mohou zůstat).

**Přidáno**
- **⏱ Živý trénink** (`src/views/trlive-view.js`): tlačítko a stav (🔴 běží / ⏸ / skončil) v kartě 📋 Plán tréninku; obrazovka přes celý telefon s velkým odpočtem kola (oranžově pod 60 s, červeně pod 10 s), blokem, kolem točení, časem od začátku a koncem plánu. **📍 Moje stanoviště**: trenér své linky (cvičení, pomůcky, kus popisu, skupiny v tomto kole a jména hráček), hráčka linku své skupiny (pětka nebo post, brankářka 🥅), ostatní linky pod rozbalením; „Za m:ss →“ další kolo / blok a moje linka v něm. Ovládání (kdo smí upravovat plán – `trplan e`): ▶ Spustit, ⏸ Pauza / ▶ Pokračovat, ⏮ / ⏭ na začátek kola nebo bloku, +1 / +5 min, ⏹ Konec (druhým klepnutím), ↺ znovu od začátku; řízení jiného trenéra se převezme druhým klepnutím. 60 s a 10 s před koncem kola vibrace + pípnutí, při točení dlouhé pípnutí (🔔 / 🔕), obrazovka nezhasíná (Wake Lock, obnoví se po návratu do aplikace). ✕ Zavřít / Zpět obrazovku zavře, hodiny běží dál.
- Kolekce **`trlive/{eid}`** = {v, st (run / pause / end), e0, wAt, sAt (čas serveru), ctl, by, at} – zapisuje se jen při ovládání; čas se počítá z času serveru, posun hodin telefonu se dorovná odhadem z čerstvých změn (uloží se v zařízení, `hk-clk`). Poslech jen u otevřeného tréninku.
- `src/domain/training-live.js` – `tsMs`, `liveSec`, `skewObs`, `skewNext`, `liveAt`, `stops`, `stepSec`, `blockStart`, `liveCtl`, `alertsDue`, `mmss`, `playerGroup`, `groupPids`, `coachLanes`.
- **Rozdělení do pětek s výběrem způsobu** (`src/views/line-split-view.js`, `src/domain/line-split.js`): ⚖ Vyrovnaně (každá pětka podobně silná), 📶 Podle výkonnosti (nejsilnější spolu v 1. pětce), 🔀 Střídavě (pořadí soupisky), 📋 Základní formace (ostatní přihlášené se doplní vyrovnaně); počet pětek 2 / 3 / 4 a ⚔ Poměr útok / obrana; volba se pamatuje v zařízení (`hk-split`). ↻ Rozdělit přepíše jen hráčky (už rozdělené druhým klepnutím), realizační tým zůstane; souhrn pětek (počet, Ú / O, u realizačního týmu průměr ⭐).
- **⭐ Výkonnost hráček 1–5** (kolekce **`plevel/team`** = {v, lv: {pid: 1–5}, by, at}, jen realizační tým – hráčky ji nečtou): okno ⭐ Výkonnost v Rozdělení do pětek (přihlášené nahoře, pak ostatní), klepnutí ukládá hned, opakované klepnutí hodnocení zruší (pak ⭐3). Je v záloze (načte se při stažení).
- **Bloky plánu podle postů**: u každého bloku Skupiny 🎽 Pětky / ⚔ Útok / obrana (`blocks[].by = "pos"`, skupiny `"F"` ⚔ útočnice, `"D"` 🛡 obránkyně, `"G"` 🥅); točení stanovišť, kontrola plánu, „Tvoje skupina“, rozpis, ⧉ kopie plánu i 📊 pokrytí dovedností počítají s posty.
- `training-plan.js`: `FW`, `DF`, `POS_GRPS`, `BY`, `isPosBlock`, `posGrp`, `posGroups`, `groupsFor`, `groupIn`; `blockBlank(mode, groups, by)`.
- `S.db.doc().merge` / dávka: hodnota `"__now"` = čas serveru (`serverTimestamp`).
- `firestore.rules`: `trliveOk` a `match /trlive/{id}` (čte `can('trplan', 'r')`, zapisuje a maže `can('trplan', 'e')`, `sAt == request.time`, `ctl == mail()`), `plevelOk` a `match /plevel/{id}` (čte a zapisuje `isStaff`, maže `isRoster`).
- Testy `tests/line-split.test.js` (10) a `tests/training-live.test.js` (10).

**Změněno**
- Rozdělení do pětek: místo „↻ Podle základní formace“ a „⚖ Vyrovnaně do 2 / 3 / 4“ panel Rozdělit automaticky (základní formace i střídavé rozdělení v něm zůstávají).
- `planCopy(src, groups, coaches, drills, pgroups)`, `groupSkills(plan, g, drills, pg)`, `skillCoverage({…, pos})`, `planIssues` zná `ctx.pgroups`.
- `src/views/events.js` (napojení panelu), `src/views/trplan-view.js` (posty, ⏱), `src/views/trplan-reuse.js`, `src/core/nav.js` (Zpět zavře ⏱ a ⭐), `src/core/state.js` (`S.plv`, `S.plvErr`, `S.plvo`, `S.lsp`, `S.tl`), `src/data/storage.js` (`trlive`, `plevel`, `"__now"`), `tests/support/firebase-stub.mjs` (`serverTimestamp`), `src/views/help.js`, README, KONVENCE, plány.

**Beze změny**
- Zkratky `HK.can` a matice práv (nový modul nevzniká – řízení hodin je `trplan e`, výkonnost `sport`), živý zápis zápasu, statistiky, docházka, pokladna, události, žádosti, nepřítomnost, hostující, stávající pravidla kolekcí. Poslech `events` / `attendance` celých kolekcí (D4-8) beze změny. `evenLines` zůstává v doméně (testy).
- Ověřeno: `npm test` (301/301, nové `line-split` a `training-live`); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Trenér bez `rv`, Asistent, Asistent s maticí bez `trplan e`, Hráčka útočnice, Hráčka obránkyně s 💰, Brankářka, Hostující, stará role Kustod, vývojář): start bez chyb, ⚙️ sekce, detail tréninku (panel rozdělení a ⭐ jen realizační tým, zápis `events/e1` a `plevel/team`), karta plánu s ⏱, obrazovka živého tréninku (Moje stanoviště trenéra, obránkyně i brankářky v bloku podle postů, co následuje), ovládání jen s `trplan e` (převzetí řízení druhým klepnutím, zápis `trlive/e1` s časem serveru), úprava plánu – přepnutí bloku na posty a uložení; hostující kartu plánu nevidí.

## v21.2 (25. 10. 2026) – E2b: 📥 základní sada a 📄 import cvičení, ⧉ kopie a 📑 šablony plánu, 📊 pokrytí dovedností (modul Trénink)
> **Nasazení:** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** (nová kolekce `trtpl` – šablony plánu; jen rozšíření, v21.1 s novými pravidly funguje beze změny; ⚠️ soubor pravidel – pokladny a plateb se změna netýká). 3) Nahrát kód (nové soubory `src/config/drill-starter.js`, `src/domain/drill-import.js`, `src/domain/plan-reuse.js`, `src/domain/skill-coverage.js`, `src/views/drill-import-view.js`, `src/views/trplan-reuse.js`, `tests/drill-import.test.js`, `tests/plan-reuse.test.js`; nic se nemaže). 4) Na zařízeních ⚙️ → 👤 Účet → Načíst novou verzi, ověřit v21.2. 5) Test na Androidu: a) Team → 📚 Cvičení → **📥 Základní sada** → zkontrolovat seznam (🏒 Hráčky / 🥅 Brankářky, Vše / Nic) → 💾 Přidat vybraná → cvičení jsou v bance; znovu 📥 = všechna označená „už v bance“ a nezaškrtnutá; b) **📄 Import z tabulky** → ⬇️ Stáhnout vzor → otevřít v Excelu / Google Tabulkách, přidat řádek, uložit jako CSV → nahrát → seznam s chybami řádků → přidat; c) trénink → 📋 Plán → ✏️ Upravit → **⧉ Z předchozího tréninku** → Použít (skupiny stanovišť podle pětek tohoto tréninku) → 💾 Uložit plán; **💾 Uložit jako šablonu** (název) → u jiného tréninku **📑 Ze šablony** → Použít, 🗑 smazat šablonu; d) karta plánu i úprava → **📊 Pokrytí dovedností** → 14 / 30 / 60 dní, klepnutí na dovednost = kdo netrénoval; e) 📚 Cvičení → vyřadit cvičení použité v plánu → detail ukáže „Používá ho … – smazat nejde“; nepoužité vyřazené → 🗑 Smazat (i s obrázky); f) hráčka (👁 Náhled role): plán vidí jako dřív, bez 📊 a bez tlačítek úprav. **🔒 Vyžadovat verzi: ne** (stávající data se nemění).
> Pokud se pravidla nepublikují, 📑 šablony ukážou „Šablony se nepodařilo načíst“ a uložení šablony skončí hláškou „Uložení se nepovedlo“; zbytek (sada, import, kopie, pokrytí) funguje. Návrat: nahrát zip v21.1 (pravidla v21.2 mohou zůstat).

**Přidáno**
- **📥 Základní sada cvičení** (Team → 📚 Cvičení, kdo smí cvičení zakládat – `drills e`): 39 připravených cvičení – 29 pro hráčky (rozbruslení, bruslení, puk, přihrávky, střelba, souboje a bránění, hra v malém prostoru, herní situace, závěr, mimo led) a 10 pro brankářky (šoupání a T-push, posuny, butterfly, úhly, chytání, odrazy, hokejka, pokrytí puku, posun po přihrávce, reakce mimo led); kategorie, dovednosti, úroveň, délka, skupiny, pomůcky, popis, u 3 cvičení ⏲ měření. Výběr se zaškrtávátky po skupinách (Vše / Nic), cvičení se stejným názvem jako v bance (i vyřazené, bez ohledu na diakritiku) se nezaškrtne – sadu jde použít opakovaně. Zápis v jedné dávce. `src/config/drill-starter.js`.
- **📄 Import cvičení z tabulky CSV**: ⬇️ vzor tabulky (Název, Kategorie, Dovednosti, Úroveň, Délka, Skupiny, Pomůcky, Popis, Video, PDF, Měření), soubor z Excelu (středník, Windows-1250 i UTF-8) nebo Google Tabulek (čárka), hodnoty jako popisky („Střelba, Ovládání puku“, „Střední“, „Stanoviště“, „čas“) i klíče; nejvýš 200 řádků; před přidáním seznam s chybami po řádcích (neznámá kategorie / dovednost / skupina / úroveň / měření, délka, odkazy) a označením shody s bankou.
- `src/domain/drill-import.js` (`starterItems`, `whoOf`, `nameKey`, `dictKey`, `csvRows`, `csvHeader`, `rowDrill`, `csvDrills`, `importPick`, `csvSample`), `src/views/drill-import-view.js` (stav `S.dri`).
- **⧉ Z předchozího tréninku** (úprava plánu, `trplan e`): posledních 12 nezrušených tréninků před tímto, nabídnou se jen ty s plánem (plány se čtou po jednom dokumentu, ne celá kolekce); použití převezme bloky, délky, točení a cvičení, skupiny stanovišť rozdělí podle pětek tohoto tréninku (🥅 linka zůstane), trenéry ponechá jen přihlášené; s rozpracovaným plánem druhým klepnutím; uloží se až 💾 Uložit plán.
- **📑 Šablony plánu** (kolekce **`trtpl/{id}`** = {v, name, goal, blocks, by, at}, sdílené pro tým, nejvýš 50): 💾 Uložit jako šablonu (bez trenérů a bez skupin stanovišť), 📑 Ze šablony → Použít, 🗑 smazat (druhým klepnutím). Čte a spravuje, kdo smí upravovat plán.
- **📊 Pokrytí dovedností** (karta plánu i úprava, jen realizační tým): pro hráčky přihlášené na trénink za posledních 14 / 30 / 60 dní – kolik z nich mělo dovednost v plánu tréninku, na kterém byly (✅ Jdu bez 🚫; podle jejich skupiny a rozpisu točení), pruh a podíl, pod 50 % zvýrazněné, klepnutí = kdo netrénoval a průměr minut; 🧤 jen u brankářek; hráčky bez tréninku s plánem v období zvlášť. Plány se čtou jen pro tréninky v období.
- `src/domain/plan-reuse.js` (`planCopy`, `tplDoc`, `tplError`, `tplSort`, `planSummary`, `copySources`), `src/domain/skill-coverage.js` (`addDays`, `coverWindow`, `groupSkills`, `skillCoverage`), `src/views/trplan-reuse.js` (stav `S.tpr`, `S.tcv`).
- `S.db.collection(c).getAll()` – jednorázové čtení celé kolekce (šablony, kontrola použití cvičení).
- `firestore.rules`: `trtplOk` a `match /trtpl/{id}` (čte, zapisuje a maže `can('trplan', 'e')`).
- Testy `tests/drill-import.test.js` (13) a `tests/plan-reuse.test.js` (10).

**Změněno**
- **🗑 Smazat vyřazené cvičení** jen, když ho nepoužívá žádný plán tréninku ani šablona (`drillUsage` nad `trplan` a `trtpl`, načte se při otevření vyřazeného cvičení); jinak „Používá ho N plánů – smazat nejde“. Smazání v jedné dávce odstraní i obrázky cvičení (`drillimg`) – odložená drobnost 9 vyřešena pro obrázky.
- Prázdná banka u trenéra radí 📥 Základní sadu.
- Záloha (⚙️ → 💾 Data) obsahuje i šablony plánu (`trtpl`, načtou se při stažení); obnova je jen doplní.
- `src/views/drills-view.js`, `src/views/trplan-view.js` (napojení ⧉ / 📑 / 📊), `src/data/storage.js` (`getAll`, záloha `trtpl`), `src/core/state.js` (`S.tpr`, `S.tcv`, `S.dri`, `S.dru`), `src/views/help.js` (sada, import, kopie, šablony, pokrytí, rychlý přehled), verze `app-version.js`, `package.json`, `sw.js` → `hokej-v85`, `README.md`, `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/plan-trenink.md`, `docs/prompt-dalsi-vlakno.md`.

**Beze změny**
- Zkratky `HK.can` a matice práv všech rolí (nový modul nevzniká – šablony patří pod `trplan`), živý zápis, statistiky, docházka, pokladna, události, žádosti, nepřítomnost, hostující, stávající pravidla kolekcí. Poslech `events` / `attendance` celých kolekcí (D4-8) se nemění. Plán tréninku pro hráčku beze změny.
- Ověřeno: `npm test` (281/281, nové `drill-import` a `plan-reuse`); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Trenér bez `rv`, Asistent, Hráčka, Brankářka, Pokladník (hráčka s 💰), Hostující, stará role Kustod, vývojář; bez matice i s `settings/perm` – trenér bez `trplan e`, asistent bez `drills e`): start bez chyb, sekce ⚙️, 📥 sada (39 položek) a 📄 CSV (UTF-8 i Windows-1250, řádek s chybou nejde vybrat) zapíší jen `drills`, 🗑 nepoužitého vyřazeného cvičení smaže `drills` + `drillimg`, použité smazat nejde, ⧉ kopie z předchozího tréninku (skupiny podle nových pětek, jen přihlášený trenér), 💾 šablona zapíše jen `trtpl`, 📑 seznam šablon, 💾 plán zapíše jen `trplan/e3`, 📊 pokrytí v kartě i úpravě jen u realizačního týmu; hráčka a brankářka plán jen čtou, hostující kartu nevidí, Kustod bez přístupu.

## v21.1 (25. 10. 2026) – E2a: 📋 plán tréninku, 📷 obrázky cvičení (modul Trénink)
> **Nasazení (pořadí je důležité):** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** (nové kolekce `trplan` a `drillimg`, modul `trplan` v matici, `drills` smí mít pole `pdf` a `img` – jen rozšíření, v21.0 s novými pravidly funguje beze změny). 3) Nahrát kód (nové soubory `src/domain/training-plan.js`, `src/views/trplan-view.js`, `src/views/drill-media.js`, `tests/training-plan.test.js`; nic se nemaže). 4) Na zařízeních ⚙️ → 👤 Účet → Načíst novou verzi, ověřit v21.1. 5) Test na Androidu: a) Team → 📚 Cvičení → ✏️ Upravit → 📷 přidat fotku (z galerie i fotoaparátu) a 📄 odkaz na PDF → Uložit → v detailu náhled, klepnutí = celá obrazovka, klepnutí na obrázek = zvětšení, Zpět zavře; b) Události → trénink → ⚖ Vyrovnaně do 2 / 3 / 4 pětek; c) karta **📋 Plán tréninku** → ➕ Vytvořit plán → + 👥 Společně a + 🔄 Stanoviště, cvičení, trenér, skupiny, délka −/+, točení → 💾 Uložit; karta ukáže časy a rozpis točení, ⛔ / ⚠️ upozornění; d) hráčka (👁 Náhled role nebo testovací účet): plán vidí, svou skupinu zvýrazněnou, cvičení s obrázkem otevře, upravit nemůže; e) ⚙️ → 👤 Účet: u managera 🔒 Vyžadovat verzi pod Načíst novou verzi, sekce 🔒 Aplikace už není; f) Událost zápasu → 📋 Zápis utkání → Průběh (góly a tresty) se stavem skóre. **🔒 Vyžadovat verzi: ne** (stávající data se nemění; starší verze pole `img` / `pdf` cvičení při úpravě zachová – zapisuje přes merge).
> Pokud se pravidla nepublikují, karta plánu ukáže „Plán se nepodařilo načíst“, uložení obrázku a plánu skončí hláškou „Uložení se nepovedlo“ a zbytek aplikace běží. Návrat: nahrát zip v21.0 (pravidla v21.1 mohou zůstat).

**Přidáno**
- **📋 Plán tréninku** (`src/views/trplan-view.js`): karta pod Rozdělením do pětek v detailu tréninku (ne u zrušeného tréninku a ne pro hostující). Úprava na celé stránce (← Zpět k tréninku, s neuloženými změnami druhým klepnutím; Zpět na telefonu stejně): 🎯 téma, bloky **👥 Společně** (celý tým, volitelně souběžná linka brankářek) a **🔄 Stanoviště** (2–4 linky, skupiny se točí), ↑ ↓ 🗑, délka −/+ (1–90 min), točení automaticky (kolik stanovišť, tolik kol) nebo po N min, u linky cvičení z banky (podle kategorií), trenér(ka) z přihlášeného realizačního týmu, skupiny (pětky 1–4 a 🥅; skupina je v bloku jen na jedné lince), náhled rozpisu točení, 💾 Uložit, 🗑 Smazat plán (druhým klepnutím). Karta: časy bloků od začátku tréninku, linky s trenéry a skupinami, tabulka točení (kolo × stanoviště A–D), trenér vidí svá stanoviště ⭐ / zvýrazněná, hráčka „Tvoje skupina“ a svou skupinu zvýrazněnou, ⛔ / ⚠️ upozornění jen pro realizační tým. Klepnutí na cvičení = okno s obrázky, popisem, pomůckami, videem a PDF (hráčka vidí název a obrázky).
- `src/domain/training-plan.js` – `planGroups`, `evenLines`, `blockBlank`, `laneBlank`, `planBlank`, `planDoc`, `moveBlock`, `drillUsage`, `hm2min`, `clock`, `planTimes`, `planMinutes`, `rotation`, `planIssues` (přetečení přes konec, nenaplánovaný čas, linka bez cvičení, vyřazené / smazané cvičení, stejný trenér na dvou linkách, skupina na dvou linkách, pětka bez stanoviště, méně kol než stanovišť, nepřihlášený trenér, linka brankářek bez brankářky), `myGroup`, `laneOf`; `tests/training-plan.test.js` (doména, obrázky, výchozí práva, srovnání zkratek `HK.can`, pravidla).
- Kolekce **`trplan/{eid}`** = {v, goal, blocks [{id, mode, dur, rot, lanes [{id, drill, dn, di, co, grp}]}], by, at} – kopie názvu a obrázků cvičení (`dn`, `di`), aby plán viděla i hráčka bez banky; poslech jen otevřeného tréninku.
- Modul matice **`trplan`** (📋 Plán tréninku: číst / upravovat): Trenér a Asistent číst + upravovat (upravovat jde v ⚙️ → 🔐 měnit), Hráčka jen číst (pevně), Hostující nic.
- **📷 Obrázky u cvičení** (`src/views/drill-media.js`, kolekce **`drillimg/{id}`**): nejvýš 3 na cvičení, zmenšené v zařízení (1280 px, JPEG, do ~500 kB, obvykle ~200 kB), ukládají se spolu s cvičením v jedné dávce, odebrané se smažou; čtou se jednorázově až u otevřeného cvičení a pak i offline; prohlížeč přes celou obrazovku (‹ › mezi obrázky, klepnutí = zvětšení 2×, ✕ / Zpět). **📄 Odkaz na PDF** (pole `pdf`, např. sdílený soubor z Google Disku). Kopie cvičení obrázky nepřebírá (patří původnímu).
- **⚖ Vyrovnaně do 2 / 3 / 4 pětek** v Rozdělení do pětek (přihlášené hráčky střídavě v pořadí soupisky; realizační tým zůstane).
- `firestore.rules`: `trplanOk` a `match /trplan/{id}` podle `can('trplan', …)`, `imgOk` a `match /drillimg/{id}` (čte `isTeam`, zapisuje `can('drills', 'e')`), `drillOk` zná `pdf` a `img` (nejvýš 3), `permDef` doplněno o `trplan`.
- `S.db.doc(cesta).get()` – jednorázové čtení dokumentu (i z offline paměti).

**Změněno**
- ⚙️ **🔒 Vyžadovat verzi** je nově v kartě 👤 Účet pod Načíst novou verzi (jen manager, stále potvrzení druhým klepnutím); sekce 🔒 Aplikace zrušena, minimální verzi vidí v Účtu všichni. Práva a zápis brány verze beze změny.
- **📋 Zápis utkání → Průběh (góly a tresty):** u každého gólu stav skóre (naše : soupeř, `goalScores`) – stejně jako v detailu zápasu krok 3; týká se i uzavřených zápasů.
- Záloha (⚙️ → 💾 Data) obsahuje i plány tréninků a obrázky cvičení (načtou se při stažení, jen manager / trenér / asistent); obnova je jen doplní / přepíše, nemaže. `HK.exportJSON` je asynchronní (test `privacy.test.js` na ni čeká).
- `src/views/drills-view.js` (📷, 📄, uložení v dávce), `src/views/events.js` (karta plánu, ⚖, Zpět zavře i plán), `src/views/report.js`, `src/views/settings-view.js`, `src/core/nav.js` (Zpět zavře prohlížeč obrázku `#imv`, okno cvičení `#tpd` a úpravu plánu `#tpx`), `src/core/state.js` (`S.tp`, `S.tpErr`, `S.tpe`, `S.tpv`), `src/domain/drills.js` (`DRILLIMG_COLL`, `IMG_MAX`, `imgFit`, `imgDoc`, `imgChanges`, pole `pdf`, `img`), `src/domain/permissions.js`, `src/data/storage.js`.
- `src/views/help.js` (📋 plán, 📷 obrázky, ⚖, brána verze v Účtu, rychlý přehled), verze `app-version.js`, `package.json`, `sw.js` → `hokej-v84`, `README.md`, `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/plan-trenink.md` (E2 rozděleno na v21.1 E2a a v21.2 E2b, další fáze o číslo dál), `docs/prompt-dalsi-vlakno.md`.

**Beze změny**
- Zkratky `HK.can` všech rolí (srovnávací testy `perm-matrix`, `rules-narrow`, `drills`, `training-plan`), živý zápis, výpočet skóre, statistiky, docházka, pokladna, události, žádosti, nepřítomnost, hostující, stávající pravidla kolekcí. Poslech `events` / `attendance` celých kolekcí (D4-8) se nemění.
- Ověřeno: `npm test` (258/258); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Trenér bez `rv`, Asistent, Hráčka, Hráčka bez plánu, Brankářka, Pokladník (hráčka s 💰), Hostující, stará role Kustod, vývojář; bez matice i s `settings/perm` – trenér a asistent bez `trplan e`, asistent bez `drills e`): start bez chyb, sekce ⚙️ bez 🔒 Aplikace, 🔒 Vyžadovat verzi jen u managera / vývojáře, karta plánu u všech kromě hostující, ➕ Vytvořit / ✏️ Upravit jen s `trplan e`, úprava (+ Stanoviště, cvičení, trenér, rozpis točení) a 💾 zapíše jen `trplan/e1`, hráčka a brankářka „Tvoje skupina“, okno cvičení s obrázkem a prohlížeč, ⚖ zapíše jen `events`, banka cvičení s náhledem obrázku, odkazem PDF a formulářem 📷 / 📄.

## v21.0 (25. 10. 2026) – E1: 📚 banka cvičení (modul Trénink)
> **Nasazení (pořadí je důležité):** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** (nová kolekce `drills` a modul `drills` v matici – jen rozšíření, stará verze aplikace s novými pravidly funguje beze změny). 3) Nahrát kód (nové soubory `src/config/skills.js`, `src/domain/drills.js`, `src/views/drills-view.js`, `tests/drills.test.js`; nic se nemaže). 4) Na zařízeních ⚙️ → 👤 Účet → Načíst novou verzi, ověřit v21.0. 5) Test: Team → přepínač **📚 Cvičení** (manager, trenér, asistent): ➕ Nové cvičení, uložení, hledání a filtry, ⭐ oblíbené, ✏️ Upravit, ⧉ Kopie, 🗄 Vyřadit → filtr 🗄 Vyřazená → ↩ Vrátit / 🗑 Smazat (asistent bez 🗑); hráčka přepínač nevidí; ⚙️ → 🔐 Práva rolí – nový řádek 📚 Banka cvičení. **🔒 Vyžadovat verzi: ne** (stávající data se nemění, jen nová kolekce).
> Pokud se pravidla nepublikují, 📚 Cvičení ukáže hlášku „Banku cvičení se nepodařilo načíst“ a zbytek aplikace běží. Návrat: nahrát zip v20.7.1 (pravidla v21.0 mohou zůstat).

**Přidáno**
- **📚 Banka cvičení** v záložce Team (přepínač Team | 📚 Cvičení | pokladna …; `src/views/drills-view.js`): seznam aktivních cvičení s hledáním (název, pomůcky, popis – bez diakritiky), filtr kategorie / dovednost / úroveň / ⭐ jen oblíbená / 🗄 vyřazená (s počty), detail klepnutím (dovednosti, vhodné pro, pomůcky, ⏲ měření, popis, ▶ odkaz na video, kdo a kdy upravil), formulář ➕ Nové / ✏️ Upravit (název, kategorie, dovednosti, úroveň, vhodné pro, délka 1–60 min, pomůcky, popis, odkaz, měření pro stopky – jednotka a „nižší je lepší“), ⧉ Kopie, 🗄 Vyřadit / ↩ Vrátit, 🗑 Smazat jen vyřazené (druhým klepnutím). ⭐ oblíbená jsou osobní a pamatují se v zařízení.
- `src/config/skills.js` – kategorie (část tréninku), 11 dovedností, úrovně, vhodné skupiny, jednotky měření.
- `src/domain/drills.js` – `drillError`, `drillDoc`, `drillBlank`, `drillFilter`, `drillCounts`, `drillCopy`, `drillCanDelete`, `fold`; `tests/drills.test.js` (doména, výchozí práva, srovnání zkratek `HK.can`, pravidla).
- Kolekce **`drills/{id}`** = {name, cat, sk, lvl, dur, grp, eq, desc, url, meas, by, at, arch}; poslech v `main.js` jen s právem číst, v záloze (`storage.js` COLL).
- Modul matice **`drills`** (📚 Banka cvičení: číst / upravovat / mazat): výchozí Trenér vše, Asistent číst + upravovat, Hráčka nic; v ⚙️ → 🔐 jde měnit upravovat a mazat u Trenéra a Asistenta (číst je pevné).
- `firestore.rules`: `drillOk` (jen známá pole, název 1–80 znaků, délka 1–60 min) a `match /drills/{id}` podle `can('drills', …)`, `permDef` doplněno o `drills`.

**Změněno**
- `src/views/team.js` – přepínač režimů se ukáže, když má uživatel víc než jeden režim (📚 Cvičení a / nebo pokladna); `src/core/state.js` (`S.dr`, `S.drf`, `S.dre`, `S.dro`, `S.drErr`), `src/domain/permissions.js`, `src/data/storage.js`, `src/main.js`.
- `src/views/help.js` (Team → 📚 Cvičení, rychlý přehled), verze `app-version.js`, `package.json`, `sw.js` → `hokej-v83`, `README.md`, `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/plan-trenink.md`, `docs/prompt-dalsi-vlakno.md`.

**Beze změny**
- Zkratky `HK.can` všech rolí (srovnávací testy `perm-matrix`, `rules-narrow`, `drills`), živý zápis, statistiky, docházka, pokladna, události, žádosti, nepřítomnost, hostující, stávající pravidla kolekcí.
- Ověřeno: `npm test` (244/244); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Trenér bez `rv`, Asistent, Hráčka s 💰 i bez, Hostující, stará role Kustod, vývojář; bez matice i s `settings/perm`): start bez chyb, přepínač 📚 Cvičení jen u rolí s právem číst, ➕ Nové zapíše jen `drills/…` se známými poli, 🗑 Smazat jen u vyřazeného a jen s právem mazat (asistent bez, s maticí ano), trenér s maticí bez úprav nevidí ➕ ani ✏️; sekce ⚙️ stejné jako ve v20.7.1.

## v20.7.1 (25. 10. 2026) – stav skóre u gólů v průběhu zápasu
> **Nasazení:** 1) Zip současného repozitáře. 2) Nahrát kód (nový soubor `tests/goal-score.test.js`, nic se nemaže). 3) **firestore.rules beze změny – nepublikovat.** 4) Na zařízeních ⚙️ → 👤 Účet → Načíst novou verzi, ověřit v20.7.1. 5) Test: Zápasy → detail zápasu → krok 3 Zápas živě → Průběh – u každého gólu štítek „Stav 2:1“ (naše : soupeř) vedle situace (5 na 5 / Přesilovka / Oslabení). **🔒 Vyžadovat verzi: ne** (tvar dat se nemění). Návrat: nahrát zip v20.7.

**Přidáno**
- `src/domain/timeline.js`: `goalScores(m)` – stav skóre po každém gólu ve stejném pořadí jako časová osa (čas `at`, u starších zápisů odhad z třetiny a času; pak pořadí zápisu). Výsledek `Map` gól → „naše:soupeř“.
- `tests/goal-score.test.js` – pořadí podle času, odhad času bez `at`, prázdný zápas.

**Změněno**
- `src/views/matches.js` (detail zápasu → Průběh): u gólu nový štítek **Stav X:Y** (naše : soupeř, stejně jako velké skóre nad průběhem). Dosud byl vidět jen počet hráček (5 na 5 / Přesilovka / Oslabení).
- `src/views/help.js` (krok 3 – průběh se stavem skóre), verze `app-version.js`, `package.json`, `sw.js` → `hokej-v82`, `README.md`, `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/prompt-dalsi-vlakno.md`.

**Beze změny**
- Živý zápis (jeho průběh, 👁 náhled i zápis utkání už stav „(1:0)“ ukazují z `timeline()`), výpočet skóre, statistiky, pokladna, docházka, pravidla databáze, tvar dat.
- Ověřeno: `npm test` (234/234, srovnávací testy beze změny výstupů); vykreslení detailu zápasu (krok 3) se třemi góly zapsanými mimo pořadí – štítky „Stav 2:1 · 1:1 · 1:0“ od nejnovějšího.

## v20.7 (24. 10. 2026) – D4: úklid před modulem Trénink
> **Nasazení:** 1) Zip současného repozitáře. 2) Nahrát kód; **smazat** `tests/ex-fix.test.js` a `docs/archiv-readme-v18.7.1.md` (nový soubor `docs/plan-trenink.md`). 3) **firestore.rules beze změny – nepublikovat.** 4) Na zařízeních ⚙️ → 👤 Účet → Načíst novou verzi, ověřit v20.7. 5) Test: spuštění pro Manager, Trenér, Asistent, Hráčka, Hostující (👁 Náhled role); ⚙️ → 💾 Data (jen záloha, CSV, obnova – bez Kontroly dat a 🔁 Převodu rolí); ⚙️ → 👥 Členové (seznam rolí); Události, docházka, pokladna, živý zápis beze změny.
> **Podmínka:** všechny účty mají novou roli (🔁 převod rolí proveden ve v20.5). Účet se starou rolí Kustod se po v20.7 do aplikace nedostane (hláška „neplatná role“) – manager mu nastaví roli v ⚙️ → 👥 Tým a členové. **🔒 Vyžadovat verzi: ne** (tvar dat se nemění). Návrat na v20.6: nahrát předchozí zip.

**Odstraněno (hotové jednorázové převody)**
- ⚙️ → 💾 Data → **Kontrola dat**: doplnění pole `ex` (`exPlan`, `runExFix`, `exFixPlan` v `domain/cash.js`), převod a úklid citlivých polí (`privState`, `runPrivFix`, `runPrivClean`, `privacyPlan`, `legacyLeft`, `cleanPlan` v `domain/private-data.js`), **🔁 Převod rolí** (`roleState`, `rolePreview`, `runRoleConvert`, `rolePlan`, `isLegacy`), upozornění na starou roli v 👤 Účet (`acct().legacy`). Obnova staré zálohy dál rozdělí stará pole (`splitLegacy` zůstává).
- Nepoužitý export `GUEST_TAG` (`domain/guests.js`), druhá kopie `LINE_NOS` (guests.js importuje z `domain/event-helpers.js`).
- `docs/archiv-readme-v18.7.1.md` (zastaralé), `tests/ex-fix.test.js` (kontrola `exOf` / `fxOf` přesunuta do `tests/d3-cleanup.test.js`).

**Změněno**
- `src/domain/permissions.js`: `roleOf` uznává jen role `ROLE_KEYS` – stará `kustod` = bez přístupu, `trener` bez `rv` = Trenér (dříve v aplikaci asistent / manager; pravidla databáze to tak mají od v20.6). `roleLabel` u neplatné role připíše „bez přístupu“.
- `src/data/storage.js`: přihlášení s neplatnou rolí ukáže „Účet má neplatnou roli … požádej managera“ (dříve se aplikace spustila s právy, která databáze odmítla).
- `src/main.js` rozepsán do bloků (hostující, týmové kolekce, sport a správa členů, peníze) se stejnými posluchači – bez změny chování.
- Komentáře v kódu „kustod“ → asistent / manager, trenér, asistent (26 souborů, jen komentáře), odkaz `views/guest-sync.js` → `views/auto-sync.js`.
- `src/views/settings-view.js` (💾 Data bez Kontroly dat a převodu rolí), `src/views/help.js` (bez Kontroly dat a 🔁 Převodu rolí, neplatná role).
- Dokumentace: `docs/plan-v18.md` zkrácen na otevřené fáze (dokončené v18.8 – v20.6 přesunuty do `docs/archiv-plan-v18.md` beze změny obsahu), nový `docs/plan-trenink.md` (kontrola kódu, D4, modul Trénink E1 – E6, rozhodnutí T1 – T5), `docs/KONVENCE.md`, `docs/prompt-dalsi-vlakno.md`, `README.md`; verze `app-version.js`, `package.json`, `sw.js` → `hokej-v81`.
- Testy: přihlášení testů jako `manager` (dříve stará role `trener` = manager), oprávnění bez starých rolí (`tests/permissions.test.js`, `tests/role-perms.test.js`, `tests/perm-matrix.test.js`), `tests/privacy.test.js` bez testů převodu (rozdělení staré zálohy zůstává).

**Beze změny**
- Pravidla databáze, tvar dat, živý zápis, statistiky, docházka, pokladna (jen odstraněn nepoužívaný převod `exFixPlan`; výpočty beze změny – srovnávací testy `d1-baseline` zelené), události, žádosti, nepřítomnost, hostující, matice práv.
- Odloženo do E2: poslech `events` / `attendance` jen aktuální sezóny (D4-8 – mění, co je vidět ve starších obdobích).
- Ověřeno: `npm test` (231/231, srovnávací testy beze změny výstupů); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Trenér bez `rv`, Asistent, Hráčka s 💰 i bez, Hostující, stará role Kustod): start bez chyb, záložky a sekce ⚙️ stejné jako ve v20.6, 💾 Data bez Kontroly dat a Převodu rolí; Trenér bez `rv` má práva Trenéra, Kustod dostane hlášku „neplatná role“. Hostující se v zástupci databáze chová stejně jako ve v20.6.

## v20.6 (24. 10. 2026) – OM3: zúžení pravidel databáze podle rolí ⚠️ SAHÁ NA PLATBY (pravidla pokladny: kdo je správce pokladny a kdo navrhuje účty)
> **Nasazení (pořadí je důležité):** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) Nahrát kód (nový soubor `tests/rules-narrow.test.js`, nic se nemaže). 3) Na všech zařízeních ⚙️ → 👤 Účet → Načíst novou verzi, ověřit v20.6. 4) **Publikovat firestore.rules AŽ PO nahrání kódu** (zúžení – starší pravidla s novým kódem fungují beze změny). 5) Test na telefonu: Manager (členové, ✋ žádosti o přijetí, 🔒 brána verze, pokladna), Trenér s 💰 (pokladna, soupiska, realizační tým), Trenér bez 💰 (soupiska, realizační tým, události; ⚙️ bez pokladny a členů), Asistent (docházka, 🤕 stav hráčky, formace), Hráčka, Hostující (👁 Náhled role i skutečné účty). 6) **🔒 Vyžadovat verzi v20.6** (doporučeno).
> **Podmínka:** 🔁 převod rolí hotový (ověř v ⚙️ → 💾 Data: „✅ Role jsou převedené“). Účet se starou rolí ukáže v ⚙️ → 👤 Účet upozornění a databáze mu nedovolí správu ani zápis za tým. Návrat: pravidla vrátit z historie v konzoli Firebase (*Firestore → Rules*), pak nahrát zip v20.5.1.

**Změněno**
- `firestore.rules` – **jen nové role**: odstraněny `isCoach`, `roleFix` a stará role `kustod`, pravidla nečtou `rv` (`myRole` = uložená role). Nové pomocné funkce: `isMgr` = manager, `isRoster` = manager a trener, `isStaff` = manager, trener, asistent.
  - **Jen manager** (`isMgr`): členové týmu (`members` – číst, přidat, změnit, odebrat; pokladník dál jen hráčky), ✋ žádosti o přijetí (`joinreq` – číst, vyřídit, smazat), 🔒 brána verze (`settings/app`), návrh změny účtů pro QR (`ibanPend`), smazání neschváleného rozpočtu (`budget`).
  - **Správce pokladny** (`isCash`) = manager nebo příznak 💰 `cash` (dříve i každý trener) – pokladna, předpisy, platy, ceny, rozpočet, audit, `staffpay`, `plpay`, žádosti o změnu placení.
  - **Soupiska a realizační tým** (`players`, `staff`): manager a trener (`isRoster`); asistent u hráčky dál jen stav `st`.
  - Docházka, důvody, žádosti o účast, nepřítomnost, veřejné `evpub` / `lineuppub` a ostatní `settings`: manager, trener, asistent (bez `kustod`).
  - Matice `can(modul, akce)` beze změny výpočtu (stará role se v ní nenajde = žádné právo).
- `src/data/storage.js` – `HK.cfg.acct().legacy` (účet se starou rolí mimo náhled); `src/views/settings-view.js` – upozornění v 👤 Účet a v 🔁 Převodu rolí, že stará role nemá v databázi správcovská práva.
- `src/views/help.js` (role, převod, účty pro QR navrhuje manager, členové, soupiska, „trenér a pokladník“ = správce pokladny), `README.md` (verze, tabulka rolí), `docs/KONVENCE.md` (pravidla, `isMgr` / `isRoster` / `isStaff` / `isCash`), `docs/plan-v18.md`, `docs/prompt-dalsi-vlakno.md` (další v20.7 N), testy textu pravidel (`tests/role-perms.test.js`, `tests/perm-matrix.test.js`, `tests/join-requests.test.js`, `tests/privacy.test.js`, `tests/project.test.js`), verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v80`).

**Přidáno**
- `tests/rules-narrow.test.js` (4): **srovnání – zkratky `HK.can` nových rolí (s 💰 i bez) jsou stejné jako ve v20.5**; role v pravidlech odpovídají aplikaci (`isMgr` = `admin`, `isRoster` = `roster`, `isStaff` = `sport`, `isCash` = manager nebo `cash`); text pravidel bez `'kustod'`, `isCoach`, `roleFix` a čtení `rv`; členové, žádosti, brána verze, účty a mazání rozpočtu jen manager.

**Beze změny**
- Práva v aplikaci (`HK.can`, `HK.perm`, matice `settings/perm`) – viditelný rozdíl jen u účtu Trenér bez 💰: v databázi ztratil to, co mu aplikace už od v20.4 nenabízela (členy, žádosti o přijetí, pokladnu, bránu verze, návrh účtů). Živý zápis, statistiky, docházka, zrušení událostí, žádosti, nepřítomnost, hostující, výpočty pokladny.
- Ověřeno: `npm test` (242/242); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Asistent, Hráčka s 💰 i bez, Hostující, stará role trener bez `rv` a kustod; min. verze v20.6): start bez chyb, sekce ⚙️ (`[data-acc]`) a zkratky `HK.can` stejné jako ve v20.5, upozornění na starou roli jen u nepřevedených účtů, realizační tým (Upravit / Smazat) podle práv.

## v20.5.1 (24. 10. 2026) – oprava: realizační tým podle nových rolí
> **Nasazení:** 1) Zip současného repozitáře. 2) Nahrát kód (nový soubor `tests/staff-kind.test.js`, nic se nemaže). 3) **firestore.rules beze změny – nepublikovat.** 4) Na telefonu ⚙️ → 👤 Účet → Načíst novou verzi, ověřit v20.5.1. 5) Test: Tým → Realizační tým – Funkce nabízí Manager / Trenér / Asistent / Jiný, dřívější „Kustod“ se ukazuje jako Asistent (Upravit → Uložit ji tak i zapíše); detail události a ✋ žádost o přijetí (Asistent → funkce Asistent).
> **🔒 Vyžadovat verzi: ne** (tvar dat se nemění, v20.5 funguje dál). Návrat na v20.5: nahrát předchozí zip.

**Opraveno**
- Přidání a úprava člena **realizačního týmu** nabízely staré funkce (Trenér / Asistent / Kustod / Jiný): funkce mají teď stejné názvy jako role – **Manager / Trenér / Asistent / Jiný** (`KIND` v `src/config/constants.js`). Dřívější funkce **Kustod** se všude zobrazuje jako **Asistent** (`KIND_OLD`, `kindOf` v `src/core/selectors.js`) – v seznamu Team, v detailu a docházce události, ve výběru při propojení účtu (⚙️ Členové) a při vyřízení ✋ žádosti; uložená data se nepřepisují, změní se až uložením v okně Upravit. Funkce je jen popis, práva dává role účtu.
- Přijetí ✋ žádosti člena realizačního týmu zakládá funkci podle role: Manager → Manager, Trenér → Trenér, Asistent → Asistent (dříve Jiný / Kustod) – `src/domain/join-requests.js`.
- Texty „trenér a kustod“ → nové role: Team (kdo upravuje formace, soupisku a realizační tým), náhled živého zápasu, 🏖 nepřítomnost, ✋ žádost o změnu účasti, hláška 🚫 v události, nápověda (Realizační tým – přidává manager nebo trenér, plat správce pokladny); komentáře v `src/views/events.js`. README úvodní věta.

**Změněno**
- Verze `app-version.js`, `package.json`, `sw.js` → `hokej-v79`; `README.md`, `docs/KONVENCE.md` (mapa souborů), `docs/plan-v18.md` (stav: v20.5 nasazena, převod rolí a 🔒 v20.5 hotové), `docs/prompt-dalsi-vlakno.md`, `tests/join-requests.test.js` (funkce Asistent).

**Přidáno**
- `tests/staff-kind.test.js` (2): funkce bez Kustoda, `kindOf` (Kustod = Asistent, ostatní beze změny, prázdná).

**Beze změny**
- Práva, matice `settings/perm`, pravidla databáze, převod rolí, živý zápis, pokladna a platy realizačního týmu, statistiky, docházka, zrušení událostí, žádosti, nepřítomnost, hostující.
- Ověřeno: `npm test` (238/238); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Asistent, Hráčka, Hostující, stará role trener bez `rv` a kustod; realizační tým s uloženou funkcí „Kustod“): start bez chyb, Team → Realizační tým ukazuje „Asistent“ místo „Kustod“, výběr Funkce Manager / Trenér / Asistent / Jiný jen u managera a trenéra, Upravit / Smazat podle práv beze změny, detail události bez „Kustod“.

## v20.5 (24. 10. 2026) – OM2: 🔐 nastavitelná matice práv rolí
> **Nasazení (pořadí je důležité):** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** – bez dokumentu `settings/perm` dávají stejná práva jako v20.4 (v20.4 s nimi funguje beze změny). 3) Nahrát kód (nové soubory `src/views/perm-view.js`, `tests/perm-matrix.test.js`, `tests/support/perm-probe.mjs`; nic se nemaže). 4) Na telefonu ⚙️ → 👤 Účet → Načíst novou verzi, ověřit v20.5. 5) Test: ⚙️ → 🔐 Práva rolí (manager: editor, ostatní: přehled „kdo co smí“), změna práva → náhled „Co se změní“ → 💾 Uložit (2× klepnout) → 👁 Náhled role Trenér / Asistent / Hráčka (skrytá tlačítka a záložky) → ↩ Výchozí hodnoty → Uložit. 6) Po testu na všech zařízeních **🔒 Vyžadovat verzi v20.5** (doporučeno – v20.4 matici nezná a ukáže tlačítka, jejichž zápis pravidla odmítnou).
> **Převod rolí (🔁, z v20.4) zatím nebyl potvrzen** – matice platí i pro staré role (kustod = asistent, trenér bez převodu = manager); před v20.6 musí být převod hotový. Návrat na v20.4: nahrát předchozí zip; pravidla mohou zůstat (bez `settings/perm` = v20.4), případně ⚙️ uložená matice zůstane v databázi a v20.4 ji ignoruje (pravidla ji ale vynucují – před návratem uložit ↩ Výchozí hodnoty).

**Přidáno**
- ⚙️ → **🔐 Práva rolí** (nová sbalitelná sekce mezi 👥 Tým a členové a 📅 Události, `src/views/perm-view.js`): přehled **„Kdo co smí“** (modul × Manager / Trenér / Asistent / Hráčka, zkratky Č U R M) pro všechny členy kromě hostující; pro managera **editor**: výběr role, ✓ / ✕ u upravitelných buněk, 🔒 u pevných, náhled **„Co se změní“**, **💾 Uložit** potvrzením druhým klepnutím, **↩ Výchozí hodnoty** (návrh, uloží se tlačítkem Uložit), kdo a kdy matici naposledy změnil. Stav v záhlaví sbalené sekce: „výchozí“ / „upraveno (N)“.
- Dokument **`settings/perm = {v: 1, roles: {trener|asistent|hracka: {modul: {r, e, c, d}}}, by, at}`** – ukládají se jen rozdíly od výchozích hodnot, zapisuje jen manager; chybějící dokument nebo hodnota = výchozí práva. Ze zálohy se neobnovuje ani nemaže (jako brána verze).
- `src/domain/permissions.js`: upravitelné buňky **`EDITABLE`** (Trenér a Asistent: Události upravovat / rušit / mazat, Zápasy rušit / mazat, Soupeři číst / mazat, Statistiky a Zápis utkání číst, 📊 Docházka číst; Hráčka: Soupeři, Statistiky a 📊 Docházka číst), `isEditable`, `permClean`, `permGrid`, `permDiff`, `permDiffText`, `permOverview`, `permDoc`, `PERM_VER`.
- `HK.perm(modul, akce)` v `src/data/storage.js` (matice s náhradou výchozích hodnot, manager vždy, hostující nikdy); `HK.cfg.permState` a `HK.cfg.savePerms`.
- Nápověda: sekce **14. 🔐 Práva rolí – kdo co smí** s tabulkou výchozích práv (z `DEFAULT_PERMS`), Rychlá reference je teď sekce 15.
- Testy `tests/perm-matrix.test.js` (10): upravitelné buňky, čištění matice, změny a přehled, **srovnání – bez `settings/perm` i s libovolnou maticí upravitelných buněk jsou zkratky `HK.can` stejné jako ve v20.4**, skutečné `HK.can` / `HK.perm` / zápis matice přes zástupce Firebase (`tests/support/perm-probe.mjs`), výchozí matice v pravidlech = `DEFAULT_PERMS`.

**Změněno**
- Pohledy se řídí maticí: **+ Trénink** a **✏️ Upravit** trénink (`events e`), **❌ Zrušit / ↩ Obnovit** (`events` / `matches c`), **🗑 Smazat** prázdnou událost a **🗑 Tato a další** (`d`), smazání prázdného zápasu v kartě zápasu (`matches d`), záložka **Soupeři** (`opp r`) a **Smazat soupeře** (`opp d`), záložka **Statistiky** a **📋 Zápis utkání** se statistikou v detailu uzavřeného zápasu (`stats r`), přepínač **📊 Docházka** (`attview r`) – `src/views/shell.js`, `events.js`, `event-series.js`, `matches.js`, `opponents.js`.
- Zkratky `HK.can` (sport, money, members, roster, accounts, admin, …) se odvozují z matice, ale jejich buňky jsou pevné – chování se nemění.
- `firestore.rules` – nové funkce `roleFix` / `myRole` (účinná role jako v aplikaci), `isMgr`, `permDef` (= `DEFAULT_PERMS`), `can(modul, akce)` přes `get(/settings/perm)` s náhradou výchozích, `evUpdate` (pole `cancelled` = rušit, jen `lines` = pětky, ostatní = upravovat), `permSettingsOk`. Podle matice: `events`, `matches`, `series`, `opponents`; `settings/perm` zapisuje a maže jen manager. Na zápis se čtou nejvýš 2 různé dokumenty (`members`, `settings/perm`) – v limitu 10 / 20. Čtení kolekcí beze změny (členové týmu); „číst“ v matici řídí zobrazení v aplikaci.
- `src/views/settings-view.js` (sekce 🔐), `src/views/help.js` (sekce 14, „kustod“ → „asistent“ v textech nápovědy), `README.md` (verze, řádek matice v tabulce rolí), `docs/KONVENCE.md` (mapa souborů, `HK.perm`, pravidla a `settings/perm`), `docs/plan-v18.md`, `docs/prompt-dalsi-vlakno.md`, testy pravidel v `tests/event-time.test.js`, `tests/recurrence.test.js`, `tests/project.test.js` (nový tvar pravidel), verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v78`).

**Beze změny**
- Bez uložené matice stejná práva jako v20.4 (srovnávací test v doméně, v aplikaci i v textu pravidel). Živý zápis, pokladna a její pravidla (příznak `cash`, `cashFieldsOnly`), statistiky, docházka, zrušení událostí, žádosti, nepřítomnost, hostující, členové a převod rolí. Pravidla `members`, `players`, `staff`, `attendance`, `attnote`, `requests`, `absence`, `evpub`, `lineuppub` beze změny (zúží se ve v20.6).
- Ověřeno: `npm test` (236/236); kouřový test v jsdom (Manager, Trenér s 💰 i bez, Asistent, Hráčka s 💰 i bez, Hostující, vývojář se starou rolí trener, stará role trener bez `rv` a kustod s 💰 i bez; vždy bez matice i s maticí): start bez chyb, sekce ⚙️ (`[data-acc]`: 🔐 u všech kromě hostující, editor jen manager / starý trenér), editor – přepnutí buňky, náhled „Co se změní“, uložení druhým klepnutím zapíše `settings/perm` jen s rozdíly, ↩ Výchozí hodnoty; s maticí Trenér bez Soupeřů, + Trénink, ✏️ Upravit a 🗑 Smazat (❌ Zrušit zůstává), Hráčka bez Statistik a 📊 Docházky, starý trenér (= manager) a kustod (= asistent) podle očekávání.

## v20.4 (24. 10. 2026) – OM1: role Manager / Trenér / Asistent, práva z jednoho místa, převod rolí
> **Nasazení (pořadí je důležité):** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED nahráním kódu** (přijímají staré i nové role – stará aplikace v20.3 s nimi funguje beze změny). 3) Nahrát kód (nový soubor `src/domain/permissions.js`, nic se nemaže). 4) Na všech zařízeních ⚙️ → 👤 Účet → Načíst novou verzi, ověřit v20.4 – před převodem se nic nemění (dřívější Trenér = Manager, Kustod = Asistent). 5) Až mají všechna zařízení v20.4: **⚙️ → 🔒 Aplikace → 🔒 Vyžadovat verzi v20.4** (bez toho převod nejde – v20.3 nové role nezná a účet by nepustila dál). 6) ⚙️ → 💾 Data → **🔁 Převod rolí**: zaškrtnout managery (aspoň jeden), zkontrolovat „Co se změní“, Převést (stáhne se záloha členů `hokej-clenove-DATUM.json`). 7) Test na telefonu: Manager, Trenér (s 💰), Asistent, Hráčka, Hostující, Pokladník (👁 Náhled role i skutečné účty).
> **🔒 Vyžadovat verzi: ano – v kroku 5, před převodem rolí.** Návrat na v20.3 před převodem: nahrát předchozí zip (pravidla mohou zůstat). Po převodu: v20.3 nové role nezná – vrátit role ze zálohy členů ručně v konzoli Firebase (`members`), nebo zůstat na v20.4.

**Přidáno**
- `src/domain/permissions.js` – jediné místo pravdy o rolích a právech: role `manager / trener / asistent / hracka / host`, moduly matice (`MODULES`: události, zápasy, docházka za ostatní, pětky a formace, soupiska, realizační tým, soupeři, statistiky, 📊 docházka, členové a ✋ žádosti, rozpočet, nastavení a data), akce (`ACTIONS`: číst / upravovat / rušit / mazat), výchozí matice `DEFAULT_PERMS` (= chování před OM), `permOf`, `permError`, zkratky aplikace `actOf`, účinná role `roleOf` (staré `kustod` = asistent, `trener` bez `rv` = manager), plán převodu `rolePlan` a ochrana posledního managera `keepsManager`.
- ⚙️ → 💾 Data → **🔁 Převod rolí** (jen manager): náhled „Co se změní“ s volbou, kdo z dnešních trenérů bude Manager (výchozí: kdo převod spouští a účet vývojáře); ostatní trenéři zůstanou Trenér a dostanou příznak 💰 Pokladník (OM-10 – pokladna se jim nezmění), Kustod → Asistent. Zápis `members.role` + `rv: 2` jednou dávkou (merge) se záznamem v auditu, před ním záloha členů (JSON). Idempotentní (podruhé převede jen zbylé), bez managera se nepustí, až při minimální verzi v20.4.
- `members.rv = 2` – značka „role po převodu“; zapisuje ji převod, přidání člena v ⚙️ i přijetí ✋ žádosti.
- Ochrana posledního managera: Odebrat se u něj nenabídne, změna jeho role ani odebrání neprojde (seznam se před zápisem načte znovu).
- Testy: `tests/role-perms.test.js` (účinná role, **srovnání výchozích práv s tabulkou CAN před OM**, nový trenér, permOf / permError, převod, poslední manager, text pravidel), `tests/permissions.test.js` rozšířen o nové role a `rv` (11 kombinací přes skutečný `HK.can`).

**Změněno**
- `src/data/storage.js` – tabulka `CAN` se odvozuje z `domain/permissions.js`; účinná role při přihlášení (`roleOf`); náhled role nabízí Hráčka / Hostující / Asistent / Trenér / Manager (uložený náhled „kustod“ se čte jako asistent); Členové týmu nabízejí Manager / Trenér / Asistent / Hráčka / Hostující, stará role má v seznamu poznámku „čeká na převod“; příznak Pokladník jde nastavit i Trenérovi (Manager je správcem pokladny vždy); `isCash` nikdy u hostujícího (sjednoceno s pravidly).
- Nový **Trenér** (po převodu) má v aplikaci jen sport (zápasy, události, docházka, soupeři, formace, soupiska, realizační tým); členy, ✋ žádosti o přijetí, obnovu ze zálohy, účty pro QR a 🔒 bránu verze má jen Manager (OM-2).
- `src/domain/join-requests.js`, `src/views/join-view.js` – při přijetí ✋ žádosti role Hráčka / Asistent / Trenér / Manager (výchozí pro realizační tým Asistent, druh v realizačním týmu „Kustod“ jako dřív); žádosti vyřizuje Manager.
- `firestore.rules` – **rozšířeno** (staré i nové role současně): `isCoach` = manager, trener; `isStaff` = manager, trener, asistent, kustod; `isCash` = manager, trener nebo příznak `cash`. Trenér má zatím na serveru stejná práva jako dřív – zúží se ve v20.6 (OM3).
- `src/views/settings-view.js` (sekce převodu v 💾 Data, texty), `src/views/help.js` (role, převod, náhled), `README.md` (tabulka rolí, první manager), `docs/KONVENCE.md`, `docs/plan-v18.md` (OM-10 potvrzeno), `docs/prompt-dalsi-vlakno.md`, `tests/join-requests.test.js`, `tests/support/can-probe.mjs` (parametr `rv`), verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v77`).

**Beze změny**
- Chování všech účtů před převodem (srovnávací test: trenér = manager, kustod = asistent, hráčka, hostující, pokladník dávají stejné `HK.can` jako v20.3). Živý zápis, pokladna a její pravidla, statistiky, docházka, zrušení událostí, žádosti, nepřítomnost, hostující.
- Ověřeno: `npm test` (226/226); kouřový test v jsdom: starý trenér (= manager, sekce převodu bez tlačítka při min. v20.3), převod při min. v20.4 (vývojář + 2 trenéři + kustod-pokladník → Manager, Trenér + 💰, Trenér s 💰, Asistent s 💰; zápis members + audit, druhý převod nic, bez zaškrtnutého managera tlačítko zakázané), po převodu Manager (všechny sekce, ✅ převedeno), Trenér s 💰 (Tým jen hráčky, Pokladna, bez 🔒 Aplikace), Trenér bez 💰 (Události, Data), Asistent, Hráčka-pokladník, Hráčka, Hostující, vývojář (👁 náhled Asistent a Hráčka + 💰); jediný manager si roli nesníží („Aspoň jeden člen musí zůstat Manager“), přidání Asistenta zapíše `rv: 2`. Start bez chyb u všech rolí.

## v20.3 (24. 10. 2026) – OM0: reorganizace okna ⚙️ (sbalitelné sekce)
> **Nasazení:** 1) Záloha (⚙️ → 💾 Data → Stáhnout zálohu) a zip současného repozitáře. 2) Nahrát kód (nový soubor `src/views/settings-view.js`, nic se nemaže). 3) **firestore.rules beze změny – nepublikovat.** 4) Na telefonu ⚙️ → 👤 Účet → Načíst novou verzi, ověřit v20.3. 5) Test: ⚙️ u trenéra, kustoda, pokladníka a hráčky (👁 Náhled role) – sekce, rozbalení, ✋ žádosti, přidání člena, záloha.
> **🔒 Vyžadovat verzi: ne** (beze změny dat). Návrat na v20.2.1: nahrát předchozí zip (soubor `src/views/settings-view.js` lze ponechat – nic ho nenačte).

**Přidáno**
- `src/views/settings-view.js` – okno ⚙️ Účet a data: nahoře vždy **👤 Účet** (e-mail, role, připojení, verze aplikace, Načíst novou verzi, Odhlásit), pod ním **sbalitelné sekce** 👥 Tým a členové · 📅 Události · 💰 Pokladna · 💾 Data · 🔒 Aplikace · 🛠 Vývojář. Rozbalená je nejvýš jedna sekce, pamatuje se v zařízení (`localStorage` `hk-cfg-open`, jen pohodlí).
- Stav v záhlaví sbalené sekce: „✋ N žádostí“ (Tým a členové), „⚠️ kontrola dat“ (Data – chybí pole ex, převod nebo úklid citlivých dat), „⚠️ minimální verze není nastavená“ / „min. vX · lze zvýšit“ (Aplikace), „👁 náhled běží“ (Vývojář).
- 👥 Tým a členové: nahoře ✋ Žádosti o přijetí (trenér), pod nimi seznam členů; formulář **+ Přidat člena ručně** až po rozkliknutí.
- `HK.cfg` v `src/data/storage.js` – rozhraní pro okno ⚙️ (účet, volby rolí, členové, náhled role, kontrola dat, brána verze) bez vykreslení; `HK.openCfg` napojuje `main.js`.
- Styly sekcí (`.acc`, `.acc-h`, `.acc-st`, `.acc-b`) v `styles/main.css`.

**Změněno**
- Vykreslení ⚙️ přesunuto ze `src/data/storage.js` do pohledu (storage.js je o ~13 kB menší, směr importů podle KONVENCE). Kontroly rolí a popisky rolí zůstávají v `storage.js`; zápisy (`members`, kontrola dat, `settings/app`) se nemění.
- 🔒 Vyžadovat verzi je v sekci 🔒 Aplikace; ostatní role vidí minimální verzi v 👤 Účtu.
- `tests/d3-cleanup.test.js` – kontrola potvrzení druhým klepnutím hledá ⚙️ v novém souboru.
- `src/main.js`, `src/views/help.js`, `README.md`, `docs/KONVENCE.md`, `docs/plan-v18.md` (nová sekce „OM – role a práva po modulech“ s rozhodnutími), `docs/prompt-dalsi-vlakno.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v76`).

**Beze změny**
- Oprávnění (`HK.can`), role, data, pravidla databáze; obsah a chování všech tlačítek ⚙️ (stejná id, potvrzení druhým klepnutím, zálohy, obnova, převody, náhled role).
- Ověřeno: `npm test` (211/211); kouřový test v jsdom pro vývojáře (trenér), trenéra, kustoda, kustoda-pokladníka, hráčku, hráčku-pokladníka, hostující a 👁 náhled Hráčka: start bez chyb, viditelné sekce podle role (hráčka a hostující jen 👤 Účet), rozbalení a zapamatování sekce, seznam členů a Odebrat (pokladník jen hráčky, nikdy vlastní účet), přidání člena zapíše `members/{e-mail}` stejně jako dřív (pokladník jen role Hráčka), výběr hráčky 🎟 přepne roli na Hostující (Členové i náhled), 🔒 Vyžadovat verzi se potvrzuje druhým klepnutím, Zavřít.

## v20.2.1 (24. 10. 2026) – oprava: výběr hostující hráčky přepne roli sám
> **Nasazení:** 1) Nahrát kód (jen změněné soubory, nic se nemaže). 2) **firestore.rules beze změny – nepublikovat.** 3) Na telefonu ⚙️ → Načíst novou verzi, ověřit v20.2.1. 4) Test: ⚙️ → 👁 Náhled role → role Hráčka → vybrat hráčku 🎟 → role se sama přepne na Hostující → Spustit náhled.
> **🔒 Vyžadovat verzi: ne** (jen ovládání v ⚙️). Návrat na v20.2: nahrát předchozí zip.

**Opraveno**
- Nález z testu v20.2: v 👁 Náhledu role s rolí Hráčka a vybranou hráčkou 🎟 náhled jen ukázal krátkou hlášku „Hostující hráčku 🎟 propoj s rolí Hostující“ a nespustil se (matoucí). Nově výběr hráčky přepne roli podle značky 🎟 sám (Hráčka ↔ Hostující) – v náhledu i v ⚙️ → Členové týmu (role Hostující jen u trenéra). Kontrola `pidRoleErr` zůstává jako pojistka.

**Změněno**
- `src/data/storage.js` (`pidRoleOf`, obsluha výběru hráčky), `src/views/help.js`, `README.md`, `docs/plan-v18.md`, `docs/prompt-dalsi-vlakno.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v75`).

**Beze změny**
- Vše ostatní, pravidla databáze, data.
- Ověřeno: `npm test`; kouřový test v jsdom (vývojář): náhled – role Hráčka + hráčka 🎟 → role Hostující; zpět na hráčku bez 🎟 → Hráčka; náhled se spustí s rolí Hostující.

## v20.2 (24. 10. 2026) – HG2: hostující hráčky s účtem – vidí jen sebe (`evpub`, `lineuppub`)
> **Nasazení (dodáno spolu s v19.9, v20.0 a v20.1 – jeden zip, nasazuje se najednou):** 1) Záloha: zip současného repozitáře a ⚙️ → Stáhnout zálohu (data se jen doplňují). 2) **Publikovat firestore.rules – před nahráním kódu** (nová pravidla starým verzím nevadí: role trenér / kustod / hráčka čtou dál vše jako dnes; bez nich nová verze nezapíše nepřítomnost, žádosti o účast ani veřejné dokumenty – jen hláška v konzoli). 3) Nahrát kód: nové soubory `src/domain/guests.js`, `src/domain/event-cancel.js`, `src/domain/att-requests.js`, `src/domain/absence.js`, `src/views/auto-sync.js`, `src/views/att-request-view.js`, `src/views/absence-view.js`, `tests/guests.test.js`, `tests/event-cancel.test.js`, `tests/att-absence.test.js`; nic se nemaže. 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v20.2 v záhlaví. 5) Test podle bodů u v19.9 – v20.2 níže. 6) Po otestování na všech zařízeních trenér ⚙️ → **🔒 Vyžadovat verzi v20.2** (starší verze neznají zrušení události a nepřítomnost – mohly by zapsat odpověď do zrušené události).
> **Test HG2:** trenér – Team → hráčka → Upravit → 🎟 Hostující = Ano; ⚙️ → Členové týmu → e-mail testovacího účtu, role **Hostující**, vybrat hráčku 🎟; počkat pár sekund (aplikace trenéra zapíše `evpub` / `lineuppub`). Testovací účet: záložky jen 🏠 / Události / Moje platby, v Událostech bez počtů ostatních a bez 📊 Docházky, v detailu jen vlastní řádek; po ✅ Jdu a rozdělení do pětek trenérem vidí pětky / formaci. Také 👁 Náhled role → Hostující.
> **Návrat na v20.1:** nahrát předchozí zip, pravidla vrátit z historie; účty s rolí Hostující smazat (starší verze je nepustí dál).

**Přidáno**
- **Role Hostující** (`members.role = "host"` + `pid` hráčky 🎟): přiřadí jen trenér v ⚙️ → Členové týmu (hráčka 🎟 jen s rolí Hostující, ostatní jen s rolí Hráčka; hostující nemá člena týmu ani příznak pokladníka). V 👁 Náhledu role volba Hostující.
- **Hostující vidí jen sebe:** záložky 🏠 Domů, Události, Moje platby; v Událostech bez počtů a řádku „Přihlášeno“, bez 📊 Docházky, v detailu jen vlastní řádek; ✋ žádost o změnu účasti a 🏖 nepřítomnost jako hráčka; formace (pětky tréninku / sestava zápasu jako jména) jen u události s jejím ✅ Jdu.
- **Veřejné dokumenty:** `evpub/{id}` (hlavička události: typ, datum, čas, konec, sraz, místo, uzávěrka, poznámka, soupeř, doma, zrušení – bez odpovědí, nákladů a statistik) a `lineuppub/{id}` (`rows: [{t, n: [jména]}]`). Zapisuje je **aplikace trenéra / kustoda** automaticky (`src/views/auto-sync.js`, tichý zápis `HK.syncOps`) – jen rozdíly, jen při aktivní hostující hráčce, události od dneška − 14 dní; bez hostujících se smažou. Bez Firebase Blaze (Cloud Functions nejsou potřeba).
- `src/domain/guests.js`: `evPubDoc`, `lineupPubDoc`, `pubPlan`, `fromPub`, `stable`, `EVPUB_COLL`, `LUPUB_COLL`; `HK.can("guest")`; `db.collection(c).part(id)` (poslech jednoho dokumentu jako části kolekce). `tests/guests.test.js` (6 testů).

**Změněno**
- ⚠️ `firestore.rules` (zabezpečení): `isHost()`, `isTeam()` = člen kromě hostujícího; čtení `players` (hostující jen svůj), `staff`, `matches`, `opponents`, `events`, `series`, `debtors` jen `isTeam()`; `attendance` hostující jen své; `settings` hostující jen `cash`, `events`, `app`; `isPlayer()` zahrnuje hostující; `isCash()` nikdy hostující; nové `evpub` (čte každý člen, zapisuje trenér / kustod) a `lineuppub` (čte tým, hostující jen s vlastním „Jdu“ – `hostGoing()`).
- `src/main.js` – samostatný poslech hostujícího účtu; trenér / kustod poslouchá `evpub` a `lineuppub` a spouští auto-sync; po načtení dat první synchronizace.
- `src/data/storage.js` – role Hostující (vstup, náhled, Členové týmu), `CAN.guest`, `CAN.onlyOwn` i pro hostující, `syncOps`, kolekce `evpub` / `lineuppub` mimo zálohu.
- `src/views/shell.js`, `src/views/events.js`, `src/views/home-view.js`, `src/core/state.js`, `src/views/help.js`, testy `permissions`, `event-time`, `recurrence` (nová pravidla čtení), `tests/support/can-probe.mjs`.
- `docs/KONVENCE.md`, `docs/plan-v18.md` (HG2 jako v20.2, OM posunuto na v20.3 / v20.4 – čísla verzí musí růst kvůli bráně verze), `docs/prompt-dalsi-vlakno.md`, `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v74`; v19.9 = v71, v20.0 = v72, v20.1 = v73 – samostatně se nevydávaly).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), pokladna a předpisy, statistiky, čas a sraz událostí, 🚫 docházka. Role trenér / kustod / hráčka čtou a zapisují jako dosud.
- Ověřeno: `npm test` (211 testů, srovnávací test D1 beze změny); kouřový test v jsdom mimo repozitář pro role trenér, kustod, hráčka, hostující a vývojář (viz v19.9 – v20.1): hostující – start bez chyb, záložky jen 🏠 / Události / Moje platby, události z `evpub`, bez Docházky a počtů, v detailu jen sebe, formace z `lineuppub`, žádný zápis do `events` / `matches` / `evpub`; trenér / kustod – auto-sync zapíše `evpub` / `lineuppub`; hráčka je nezapisuje.

## v20.1 (24. 10. 2026) – W + NP: ✋ žádosti o změnu účasti po uzávěrce, 🏖 nepřítomnost od – do
> **Nasazení:** společně s v20.2 (viz nahoře). **Publikovat firestore.rules** (kolekce `requests` – druh `att`, nová kolekce `absence`).
> **Test W:** hráčka – detail události po uzávěrce (ještě nezačala) → ✋ Požádat o změnu účasti → nová odpověď a důvod → Odeslat; stav ⏳, zrušení. Trenér / kustod – v Událostech pruh ✋ → okno → ✓ Schválit (odpověď se zapíše do docházky) / ✕ Zamítnout; hráčka vidí výsledek.
> **Test NP:** 🏠 Domů → 🏖 Nepřítomnost → + Přidat → od – do → náhled „Co se změní“ → Uložit (dvakrát); otevřené události v období mají ❌ Nejdu s důvodem „Nepřítomnost: …“, po uzávěrce vznikne žádost; 🗑 zrušení vrátí omluvy otevřených událostí. Trenér – + Zadat za člena.

**Přidáno**
- **✋ Žádost o změnu účasti** (`requests`, `kind: "att"` = `{mid, by, at, st, eid, want, reason, abs?}`): podá člen (hráčka, hostující, člen týmu) za sebe po uzávěrce a nejpozději do začátku nezrušené události, jedna otevřená na událost; v detailu stav ⏳ / ✅ / ✕ s odpovědí a zrušení otevřené. Trenér / kustod: pruh v Událostech (seznam i detail) a okno vyřízení – schválení = jedna dávka (žádost + docházka jako ruční změna + důvod v `attnote`), upozornění u vyúčtované události (předpisy se nepřepočítají). Bez zápisu do auditu (kustod do auditu nesmí).
- **🏖 Nepřítomnost od – do** (`absence/{id}` = `{mid, kind: vac | sick | other, from, to, note, by, at}`): karta v 🏠 Domů (vlastní, u trenéra / kustoda i tým a zadání za člena), okno s náhledem „Co se změní“. Uložení v jedné dávce: otevřené události → ❌ Nejdu s důvodem a `attendance.abs = id` (i místo Jdu / Nejistá), po uzávěrce → žádost (trenér / kustod zapíše rovnou); později založené události dostanou omluvu automaticky, jen bez odpovědi (`auto-sync`); zrušení smaže omluvy nepřítomnosti u otevřených budoucích událostí; úprava = zrušení + nové uložení.
- `src/domain/att-requests.js` (`attReqError`, `attReqDoc`, `attDecidePlan`, `openAttReqs`, `openAttReq`, `myAttReqs`), `src/domain/absence.js` (`absError`, `absDoc`, `absReason`, `absPlan`, `absAuto`, `absRevert`, `activeAbs`, `absRange`), `src/views/att-request-view.js`, `src/views/absence-view.js`, `tests/att-absence.test.js` (7 testů).

**Změněno**
- ⚠️ `firestore.rules`: `requests` – `reqAttOk()`, čtení a vyřízení žádostí o účast trenér / kustod, zrušení otevřené vlastníkem (`ownsMid`); nová kolekce `absence` (čte vlastník a trenér / kustod; zapisuje vlastník za sebe, trenér / kustod za kohokoli; obnova ze zálohy s původním `by`).
- `src/domain/home-summary.js` – souhrn pokladny počítá jen žádosti o placení (žádosti o účast ne).
- `src/main.js` (poslech `absence`, kustod žádosti `att`), `src/data/storage.js` (`absence` v záloze), `src/views/events.js`, `src/views/home-view.js`, `src/core/state.js`, `src/views/help.js`.

**Beze změny**
- Uzávěrka přihlašování, blokace dlužnic, výpočet Docházky (omluva z nepřítomnosti = Nejdu), žádosti o změnu placení, pokladna.
- Ověřeno: kouřový test v jsdom – trenér a kustod: pruh ✋, okno a schválení (žádost `ok` + docházka Nejdu), nepřítomnost za člena s náhledem a uložením; hráčka: stav otevřené žádosti a zrušení, formulář a odeslání žádosti (`kind: "att"`), nepřítomnost zapíše Nejdu s důvodem „Nepřítomnost: …“.

## v20.0 (24. 10. 2026) – Z: ❌ zrušení události (zůstává v historii), úplné smazání jen vývojář
> **Nasazení:** společně s v20.2 (viz nahoře). Pravidla pro samotné zrušení se nemění (`events` / `matches` zapisuje trenér a kustod). **⚠️ SAHÁ NA PLATBY** – jen zobrazení hospodaření (viz Změněno), předpisy beze změny.
> **Test:** trenér – detail události → ❌ Zrušit → důvod → potvrdit; událost přeškrtnutá ❌ Zrušeno, odpovědi zamčené (i pro trenéra), v 📊 Docházce se nepočítá, zápas nejde otevřít; ↩ Obnovit událost. Událost s odpověďmi nemá 🗑 Smazat, prázdná ano. Vývojář – 🧨 Smazat úplně (počty před potvrzením).

**Přidáno**
- **❌ Zrušit / ↩ Obnovit událost** (trenér, kustod): pole `cancelled = {by, at, reason}` v `events` / `matches` (merge, obnovení pole smaže); důvod nepovinný; běžící a uzavřený zápas zrušit nejde. Zrušená událost: v seznamu a 🏠 Domů přeškrtnutá se značkou ❌ Zrušeno, přihlašování zamčené pro všechny (i 🚫), nepočítá se do 📊 Docházky ani do ❔ bez odpovědi, příští zápas ji přeskočí, zápas nejde otevřít. U vyúčtované události upozornění: storno předpisů ručně (Znovu otevřít).
- **Smazání:** trenér / kustod jen **prázdnou** událost (bez odpovědí, předpisů, vyúčtování, u zápasu bez zápisu) – v detailu události i v kartě zápasu; **🧨 Smazat úplně** jen vývojář (`DEV_EMAILS`, role trenér, mimo náhled – `HK.can("wipe")`): docházka, důvody, předpisy, úhrady v pokladně (`cash` podle `cid` / `eid`), `evcash`, `evprice`, žádosti, veřejné dokumenty a událost; potom přepočet dlužníků; audit zůstává.
- `src/domain/event-cancel.js` (`isCancelled`, `cancelPatch`, `uncancelPatch`, `cancelBlock`, `cancelText`, `isEmptyEvent`, `wipePlan`, `wipeText`), `HK.wipeEvent`, `HK.wipePreview`; `tests/event-cancel.test.js` (5 testů).

**Změněno**
- `src/domain/attendance.js` – `attEvents` vynechá zrušené události; `src/domain/home-summary.js` – `cancelled` v položkách, `regClosed` u zrušené vždy uzavřeno, `nextMatch` a `unanswered` bez zrušených.
- ⚠️ `src/views/payments.js` (`econData`): zrušená **nevyúčtovaná** událost se nepočítá do hospodaření události / měsíce, plnění rozpočtu a cashflow (nebere podíl příspěvků ostatním); vyúčtovaná zůstává se skutečnými čísly. Předpisy ani vyúčtování se nemění.
- `src/views/events.js`, `src/views/matches.js` (jen tlačítko Smazat zápas – prázdný / vývojář; živý zápis beze změny), `src/views/home-view.js`, `src/data/storage.js`, `src/views/help.js`.

**Beze změny**
- Živý zápis, statistiky, vyúčtování a předpisy, série tréninků (🗑 Tato a další dál maže jen budoucí tréninky bez odpovědí a vyúčtování).
- Ověřeno: kouřový test v jsdom – trenér / kustod: zrušení zapíše `cancelled` s důvodem, zamčené odpovědi, ↩ Obnovit, prázdnou událost lze smazat, událost s odpověďmi ne, Docházka se vykreslí; vývojář: 🧨 s počty a smazání docházky, předpisu, úhrady a veřejných dokumentů, zrušený zápas nejde otevřít.

## v19.9 (24. 10. 2026) – HG1: 🎟 hostující hráčky bez účtu
> **Nasazení:** společně s v20.2 (viz nahoře). Pravidla pro HG1 beze změny (pole `guest` zapisuje trenér jako ostatní pole soupisky).
> **Test:** trenér – Team → Přidat hráče se zaškrtnutím 🎟 Hostující (nebo Upravit → 🎟 Hostující = Ano); u jména značka 🎟 v soupisce, docházce, nominaci a sestavě; počítá se do Docházky, statistik i plateb jako ostatní.

**Přidáno**
- **🎟 Hostující hráčka** (`players.guest = true`, jen trenér – přidání i úprava; vypnutí pole smaže): počítá se všude jako každá hráčka (nominace, sestava, pětky, docházka, statistiky, platby), u jména značka 🎟 (`pn`). Hostující bez účtu nic dalšího nepotřebuje; účet s rolí Hostující přidává v20.2.
- `src/domain/guests.js` (`isGuest`, `guestPatch`, `hasGuests`, `GUEST_KEY`).

**Změněno**
- `src/core/selectors.js` (značka 🎟 v `pn`; `nm` a CSV beze změny), `src/views/team.js` (volba při přidání), `src/views/modal.js` (okno Upravit hráče – volba jen pro trenéra; kustod dál mění jen stav), `src/views/help.js`.

**Beze změny**
- Výpočty Docházky, statistik a plateb; živý zápis; srovnávací test D1 (hráčky bez příznaku vypadají stejně).
- Ověřeno: kouřový test v jsdom (vývojář / trenér): v Teamu volba 🎟 Hostující a značka, okno úpravy ukazuje Hostující = Ano, vypnutí zapíše smazání pole `guest`.

## v19.8 (24. 10. 2026) – DO: 🚫 nedorazila bez omluvy (Docházka)
> **Nasazení:** 1) Záloha: zip současného repozitáře a ⚙️ → Stáhnout zálohu (data se jen doplňují). 2) **Publikovat firestore.rules** (kolekce `attendance`: značku 🚫 smí zapsat a zrušit jen trenér a kustod) – kdykoli, před i po nahrání kódu (stará pravidla zápis trenéra povolují, nová jen brání hráčce značku změnit). 3) Nahrát kód (nový soubor `tests/attendance-nos.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.8 v záhlaví. 5) Test: trenér – detail uplynulého tréninku, u hráčky s ✅ Jdu klepnout 🚫 (značka „🚫 Nedorazila“), znovu 🚫 = zrušit; 📊 Docházka – sloupec 🚫; hráčka – značku vidí, svou odpověď u té události nezmění.
> **🔒 Vyžadovat verzi: ne** (starší verze značku jen nezobrazí a Docházku počítá po staru). Návrat na v19.7: nahrát předchozí zip, pravidla vrátit z historie (pole `nos` v datech nevadí).

**Přidáno**
- **🚫 Nedorazila bez omluvy:** v detailu události po jejím začátku má trenér / kustod u hráčky s odpovědí ✅ Jdu tlačítko 🚫 – klepnutí zapíše `attendance.nos = true` (merge jen tohoto pole), další klepnutí značku zruší (pole se smaže). U jména se ukáže „🚫 Nedorazila“, nahoře počet „🚫 Nedorazilo bez omluvy: N“. Jen u odpovědi Jdu (ne ❌ / ❓ / bez odpovědi), před začátkem události tlačítko není. Realizační tým tlačítko nemá.
- **📊 Docházka – sloupec 🚫:** počet uplynulých událostí, kam hráčka byla přihlášená, ale nedorazila bez omluvy; tyto události se **nepočítají do účasti ani procenta** (procento = účast / počet událostí jako dřív).
- `src/domain/attendance.js`: `NOS_KEY`, `isNos`, `canNos`, `nosPatch`, `nosCount`, export `startMs`; `attSummary` vrací i `nos`. `tests/attendance-nos.test.js` (5 testů, celkem 192).

**Změněno**
- `firestore.rules` – `attendance`: nová funkce `nosKeep()`; hráčka pole `nos` nezaloží, nezmění, nesmaže, ani nesmaže dokument se značkou. Trenér a kustod beze změny.
- `src/views/events.js` – detail události (tlačítko a značka 🚫, počet), hráčka s 🚫 svou odpověď nezmění (hláška); změna odpovědi trenérem značku zruší (zápis odpovědi jako dřív přepíše dokument).
- `src/views/attendance.js` – sloupec 🚫 a text vysvětlivky.
- `src/views/help.js`, `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/prompt-dalsi-vlakno.md`, `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v70`).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), pokladna a platby, statistiky, čas a sraz událostí (v19.7), uzávěrka přihlašování, blokace dlužnic, odpovědi a důvody omluv (`attnote`), 🏠 Domů.
- Ověřeno: `npm test` (192, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář (trenér, hráčka): start bez chyb; trenér – detail uplynulého tréninku má 🚫 jen u dvou hráček s Jdu (ne u Nejdu), u budoucí události žádné; klepnutí zapíše jen `attendance/e1_p2` `{nos: true}` (mergeFields `nos`); hráčka – značku vidí, tlačítka 🚫 nemá, její tlačítka odpovědi u události se značkou jsou zakázaná, žádný zápis; 📊 Docházka – sloupec 🚫, hráčka se značkou má účast 0/1, 0 %, 🚫 1.

## v19.7 (23. 10. 2026) – UD1 + UD2: 📅 čas od – do, ⏰ sraz a počty odpovědí v tlačítkách (bez změny pravidel)
> **Nasazení:** 1) Záloha: zip současného repozitáře (data se jen doplňují). 2) **firestore.rules beze změny – nepublikovat** (`events`, `matches` a `series` pole neomezují, `settings/events` zapisuje trenér a kustod podle stávajícího pravidla `settings`). 3) Nahrát kód (nové soubory `src/domain/event-time.js`, `src/views/event-settings.js`, `tests/event-time.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.7 v záhlaví. 5) Případně ⚙️ → ⏰ Nastavení událostí upravit výchozí sraz a délku tréninku.
> **🔒 Vyžadovat verzi: ne** (starší verze pole `end` a `meet` jen nezobrazí; úprava tréninku starší verzí je přes merge nesmaže). Návrat na v19.6.3: nahrát předchozí zip (nová pole v datech nevadí).

**Přidáno**
- **📅 Čas od – do u tréninku:** pole konec (`events.end`); dokud ho nikdo nezmění, nastaví se samo na začátek + výchozí délku (60 min) a posouvá se se začátkem. Konec musí být po začátku. Zápas konec nemá (otázka 65).
- **⏰ Sraz u všech událostí:** pole `meet` = minuty před začátkem (otázka 66), výchozí trénink 30 min, zápas 60 min, 0 = bez srazu; ve formuláři se hned ukáže „Sraz v 17:30“. **Sraz jde měnit u každé události** – u tréninku v ✏️ Upravit, u zápasu v ✏️ Čas, místo, termín. Událost bez pole (starší data, zápas založený bez srazu) ukazuje výchozí hodnotu.
- **⚙️ → ⏰ Nastavení událostí** (trenér a kustod): výchozí sraz na trénink a zápas a délka tréninku → `settings/events = {meetT, meetM, len, by, at}` (merge), s ukázkou a tlačítkem Výchozí (30 / 60 / 60 min). Čtou všichni členové (`S.es`).
- **Počty v tlačítkách (UD2):** rychlá tlačítka ✅ Jdu / ❌ Nejdu / ❓ Nejsem jistý na kartě události ukazují počet odpovědí hráček; řádek „✅ · ❓ · ❌“ zůstává jen tam, kde tlačítka nejsou (trenér bez propojení s realizačním týmem).
- Zobrazení „18:00 – 19:00 · ⏰ sraz 17:30“ na kartě, v detailu (tedy i ve vybraném dni kalendáře) a v 🏠 Domů (příští zápas, příštích 7 dní).
- `src/domain/event-time.js` (`EVSET_DOC`, `EV_DEF`, `MEET_MAX`, `LEN_MAX`, `okTime`, `toMin`, `fromMin`, `addMin`, `clampMin`, `evDefaults`, `meetDefault`, `meetOf`, `meetAt`, `endOf`, `endOk`, `defEnd`, `timeParts`, `timeFields`), `answerCounts` v `src/domain/event-helpers.js`, `src/views/event-settings.js`, `tests/event-time.test.js` (8 testů, celkem 187).

**Změněno**
- `src/views/events.js` – formulář (konec, sraz), karta (počty v tlačítkách), detail a karta (čas od – do, sraz), počty přes `answerCounts`; uložení tréninku a zápasu doplní `end` / `meet`.
- `src/views/event-series.js`, `src/domain/recurrence.js` – série tréninků přenese konec a sraz do všech událostí i do definice série; „tato a další“ je změní u dalších událostí; „jen tato“ porovnává se zobrazenými hodnotami (uložení beze změny událost neoznačí jako ručně upravenou). Volání bez nových polí dává stejný výsledek jako dřív.
- `src/domain/home-summary.js` (`homeItems` nese `end`, `meet`), `src/views/home-view.js` (čas a sraz), `src/core/state.js` (`S.es`), `src/main.js` (poslech `settings/events`, `HK.openEvSet`), `src/data/storage.js` (⚙️ → sekce Události s tlačítkem ⏰, jen trenér a kustod), `src/core/nav.js` (Zpět zavře okno nastavení událostí).
- `src/views/help.js`, `docs/KONVENCE.md`, `docs/plan-v18.md` (UD1 a UD2 spojeny do v19.7, nové pořadí), `docs/prompt-dalsi-vlakno.md`, `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v69`).

**Beze změny**
- Začátek události zůstává v poli `time` – výpočet docházky, uzávěrka přihlašování, blokace dlužnic, 🏠 příští zápas a „uplynulé“ události se řídí začátkem jako dřív. Živý zápis (střely, góly, časomíra, tresty), pokladna, statistiky, pravidla databáze. Založení zápasu (+ Zápas) beze změny – sraz se nastaví ve ✏️ Čas, místo, termín (do té doby platí výchozí).
- Ověřeno: `npm test` (187, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář (trenér, hráčka): start bez chyb; 🏠 Domů a karta ukazují „18:00 – 19:00 · ⏰ sraz 17:30“, zápas „sraz 16:00“, uložený konec a sraz u jiné události; hráčka – tlačítka „✅ Jdu 1 | ❌ Nejdu 1 | ❓ Nejsem jistý 0“, bez ✏️, okno nastavení se neotevře, žádný zápis; trenér – formulář s automatickým koncem (posun se začátkem), text srazu, uložení tréninku zapíše `end` a `meet`, zápas bez konce se srazem 90, ⏰ Nastavení událostí zapíše jen `settings/events`.

## v19.6.3 (23. 10. 2026) – 🏠 Domů: 👁 náhled živého zápasu pro členy (jen čtení, bez změny dat a pravidel)
> **Nasazení:** 1) Záloha: zip současného repozitáře (data se nemění). 2) **firestore.rules beze změny – nepublikovat.** 3) Nahrát kód (nové soubory `src/domain/watch-feed.js`, `src/views/live-watch.js`, `tests/watch-feed.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.6.3 v záhlaví.
> **🔒 Vyžadovat verzi: ne.** Návrat na v19.6.2: nahrát předchozí zip.

**Přidáno**
- 🏠 Domů: členové bez práva zápisu (hráčka, pokladník bez role kustod) otevřou klepnutím na kartu **🔴 Zápas právě běží** náhled **👁 Živě – jen náhled**: skóre a střely (domácí vlevo), zbývající čas třetiny a třetina, stav ▶ hra běží / ⏸ přerušeno / 🏁 konec, průběh od nejnovějšího – góly s průběžným skóre, tresty, střely (přepínač Střely) a konce třetin. Bez sestav, střídání, času na ledě a zranění, žádné ovládání. Obnovuje se sám z databáze, čas mezi uloženími dopočítává místní odpočet.
- `src/domain/watch-feed.js` – `watchClock`, `watchScore`, `watchFeed`, `WATCH_KINDS` (průběh z existující `timeline` bez střídání, skóre a střely ze `score` / `shots`); `src/views/live-watch.js` – pohled; `tests/watch-feed.test.js` (4 testy).

**Změněno**
- `src/views/home-view.js` – karta 🔴 pro ostatní členy je klepatelná (text „👁 Klepni pro čas a průběh zápasu →“), otevřený náhled se vykreslí místo přehledu; po uzavření zápasu se vrátí přehled. Trenér / kustod beze změny (▶ Do živého zápisu).
- `src/core/state.js` (`S.hw`), `src/core/nav.js` (Zpět z náhledu → přehled 🏠 Domů), `src/views/shell.js` (přepnutí záložky náhled zavře).
- `src/views/help.js` (sekce 🏠 Domů, rychlá reference), `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/prompt-dalsi-vlakno.md`, `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v68`).

**Beze změny**
- Živý zápis (`live-*.js`, `domain/live-engine.js`, `domain/timeline.js`), střely, góly, časomíra, tresty, ostatní karty 🏠 Domů, pokladna, statistiky, docházka, pravidla databáze. Místní posun času ◀ ▶ zapisovatele se neukládá, náhled ukazuje uložený čas.
- Ověřeno: `npm test` (179, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář (trenér, hráčka): start v 🏠 bez chyb; hráčka – karta 🔴 otevře náhled se skórem, střelami, časem a průběhem bez střídání, přepínač Střely, ← Domů i Zpět vrátí přehled, uzavření zápasu náhled zavře; trenér – karta beze změny (▶ Do živého zápisu, náhled se neotevře); žádný zápis do databáze.

## v19.6.2 (23. 10. 2026) – 🏠 Domů: příštích 7 dní místo tohoto týdne (jen čtení, bez změny dat a pravidel)
> **Nasazení:** 1) Záloha: zip současného repozitáře (data se nemění). 2) **firestore.rules beze změny – nepublikovat.** 3) Nahrát kód (nic nového se nepřidává ani nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.6.2 v záhlaví.
> **🔒 Vyžadovat verzi: ne.** Návrat na v19.6.1: nahrát předchozí zip.

**Změněno**
- 🏠 Domů: karta **📅 Tento týden** (pondělí – neděle) nahrazena kartou **📅 Příštích 7 dní** (dnes a dalších 6 dní). Uplynulé události se nezobrazují: dřívější dny, dnešní trénink / zápas po svém začátku (bez času celý den), uzavřený zápas; běžící zápas zůstává v kartě 🔴 nahoře. Počet ❔ bez odpovědi se počítá z nadcházejících událostí.
- `src/domain/home-summary.js` – `daysRange`, `upcomingEvents`, `DAYS_AHEAD` místo `weekRange`, `weekEvents`; `src/views/home-view.js` (nadpis a prázdný stav karty); `tests/home-summary.test.js` (nové testy období a filtru uplynulých).
- `src/views/help.js` (sekce 🏠 Domů), `docs/KONVENCE.md`, `docs/plan-v18.md` (náhled živého zápasu UP2 posunut na v19.6.3), `docs/prompt-dalsi-vlakno.md`, `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v67`).

**Beze změny**
- Ostatní karty 🏠 Domů (běžící zápas, příští zápas, platby, pokladna týmu, ✋ žádosti o přijetí), odpovědi v detailu události, živý zápis, pokladna, statistiky, docházka, pravidla databáze.
- Ověřeno: `npm test` (175, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář (trenér, hráčka): start v 🏠 bez chyb, karta „Příštích 7 dní“ bez uplynulých událostí, žádný zápis do databáze.

## v19.6.1 (23. 10. 2026) – ČL: ✋ žádost o přijetí do týmu (⚠️ sahá na přihlašování a správu členů, ne na platby)
> **Nasazení:** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **Nejdřív publikovat `firestore.rules`** (nová kolekce `joinreq`; ostatní pravidla beze změny). 3) Nahrát kód (nové soubory `src/domain/join-requests.js`, `src/views/join-view.js`, `tests/join-requests.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.6.1 v záhlaví. 5) Test: přihlásit se účtem Google, který není v Členech týmu → vyplnit žádost; trenér ji v 🏠 Domů vyřídí.
> **🔒 Vyžadovat verzi: ne** (stará verze žádosti jen nevidí – trenér je pak vyřídí v nové verzi). Návrat na v19.6: nahrát předchozí zip a vrátit pravidla z historie v konzoli Firebase (kolekce `joinreq` může zůstat).

**Přidáno**
- **✋ Žádost o přijetí do týmu** – účet Google bez členství místo hlášky „nemá přístup“ uvidí formulář: e-mail převzatý z přihlášení (nejde přepsat), přezdívka (povinná), číslo dresu 1–99 (nepovinné), hráčka / realizační tým, poznámka → `joinreq/{email}` (`st: "open"`). Pak stav **⏳ Čeká na schválení trenérem** se zrušením (potvrzení druhým klepnutím); po schválení se aplikace sama načte už s rolí. Zamítnutá žádost ukáže důvod, novou lze poslat nejdřív za 24 h.
- **Vyřízení (jen trenér):** pruh **✋ N žádostí o přijetí** v 🏠 Domů a tlačítko v ⚙️ → Členové týmu otevřou okno žádostí: role Hráčka / Kustod / Trenér; **založit novou hráčku** (jméno = přezdívka, číslo dresu) nebo **přiřadit hráčku bez účtu** (shoda čísla dresu první, obsazené číslo jen upozorní); u trenéra / kustoda nový nebo existující člen realizačního týmu, případně bez propojení. Přijetí = jedna dávka: soupiska / tým + `members/{email}` + žádost (`st: "ok"`, `doneBy`, `doneMs`, `pid` / `tid`) + audit (`join`). **Zamítnutí** jen s důvodem (žádost `st: "no"`, `reply` + audit `join-no`). Potvrzení druhým klepnutím.
- `src/domain/join-requests.js` (`JOIN_COLL`, `joinCheck`, `joinDoc`, `canResend`, `openJoins`, `defaultRole`, `freePlayers`, `freeStaff`, `numTaken`, `approvePlan`, `rejectPlan`), `src/views/join-view.js` (`joinScreen`, `openJoinWindow`, `refreshJoin`, `joinBanner`), `tests/join-requests.test.js` (9 testů včetně kontroly pravidel).
- `firestore.rules` – `joinreq/{email}`: založit jen přihlášený účet bez `members` sám za sebe a jen pole formuláře se `st: "open"`; novou žádost po vyřízení nejdřív 24 h po `doneMs`; čte vlastník a trenér; vyřizuje a maže trenér, uchazeč smí zrušit jen otevřenou.

**Změněno**
- `src/data/storage.js` – účet bez role: obrazovka žádosti (`joinFlow`, zápisy jen do vlastního `joinreq`) místo hlášky „nemá přístup“ (hráčka bez propojení dál vidí původní hlášku); ⚙️ → Členové týmu: tlačítko ✋ žádostí (trenér); `HK.openJoin`, `HK.listMembers`; `joinreq` mezi kolekcemi mimo zálohu; text přihlašovací obrazovky.
- `src/main.js` – poslech `joinreq` jen trenér (`S.jr`), překreslení okna žádostí po změně žádostí, soupisky a týmu.
- `src/views/home-view.js` – pruh ✋ žádostí o přijetí pro trenéra (ostatní karty beze změny).
- `src/views/help.js` (přihlášení, ✋ žádosti o přijetí v ⚙️), `docs/KONVENCE.md` (mapa souborů), `docs/plan-v18.md` (stav, tabulka, ČL dodáno, otázky 61–64 rozhodnuty), `docs/prompt-dalsi-vlakno.md`, `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v66`).

**Beze změny**
- Živý zápis, docházka, pokladna a platby (nová hráčka nemá `plpay` – výchozí hodnoty jako dřív, platby doplní trenér v Team), statistiky, rozpočet; ruční přidání člena v ⚙️ funguje jako dřív; pravidla ostatních kolekcí.
- Ověřeno: `npm test` (175 – nové testy žádostí, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář: nový účet → formulář (e-mail zamčený, prázdná přezdívka neodejde, zápis jen `joinreq/{vlastní e-mail}` s poli formuláře), čekající žádost → ⏳ a zrušení (smaže jen vlastní žádost), zamítnutá → důvod a čekání 24 h bez formuláře; trenér → pruh v 🏠, okno, shoda čísla, upozornění na obsazené číslo, přijetí (members + žádost + audit), zamítnutí bez důvodu zablokováno, s důvodem žádost + audit, tlačítko v ⚙️ s počtem; hráčka a kustod → bez pruhu a bez tlačítka, žádný zápis; start všech rolí bez chyb.

## v19.6 (23. 10. 2026) – UP: 🏠 Domů – úvodní přehled (jen čtení, bez změny dat a pravidel)
> **Nasazení:** 1) Záloha: zip současného repozitáře (data se nemění). 2) **firestore.rules beze změny – nepublikovat.** 3) Nahrát kód (nové soubory `src/domain/home-summary.js`, `src/views/home-view.js`, `tests/home-summary.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.6 v záhlaví – aplikace se otevře v záložce 🏠.
> **🔒 Vyžadovat verzi: ne** (nic nového se nezapisuje; starší verze dál funguje, jen nemá 🏠 Domů). Návrat na v19.5.2: nahrát předchozí zip.

**Přidáno**
- **🏠 Domů** – nová první záložka (v liště ikona 🏠) a výchozí obrazovka po spuštění pro všechny role:
  - **🔴 Zápas právě běží** (zahájený, neuzavřený zápas): skóre, třetina, ▶ / ⏸; trenér a kustod tlačítkem **▶ Do živého zápisu** rovnou do zápisu, ostatní jen skóre (náhled průběhu pro členy přijde ve v19.6.2).
  - **🆚 Příští zápas**: soupeř, doma / venku, datum a čas, místo, uzávěrka přihlašování, počet ✅ a moje odpověď; klepnutí otevře detail (tlačítko **← Domů**).
  - **📅 Tento týden** (Po – Ne): tréninky a zápasy s mojí odpovědí, **❔ Odpověz** u otevřených bez odpovědi (počet v záhlaví karty); trenér / kustod bez propojení s realizačním týmem vidí počet ✅.
  - **💳 Moje platby**: ✅ vše zaplaceno / 💳 k úhradě s nejbližší splatností / ⛔ po splatnosti (blokace „Jdu“, nebo výjimka) → Moje platby.
  - **💰 Pokladna týmu** (jen trenér a pokladník): nezaplaceno celkem, po splatnosti a počet dlužníků, otevřené žádosti ✋ (→ Team → 💰 Platby), varování cashflow z uloženého rozpočtu běžící sezóny (→ Team → 📊 Rozpočet).
- `src/domain/home-summary.js` (čisté funkce `weekRange`, `homeItems`, `regClosed`, `myAnswer`, `goingCount`, `nextMatch`, `weekEvents`, `unanswered`, `myPay`, `teamPay`, `flowWarn`, `liveMatch`, `PER_LABEL`), `src/views/home-view.js`, `tests/home-summary.test.js` (7 testů).

**Změněno**
- `src/views/shell.js` – záložka 🏠 jako první (i pro hráčku), výchozí a záložní záložka je 🏠 místo Událostí.
- `src/core/state.js` – výchozí `S.tab = "home"`; `S.evBack = "home"` vrací z detailu události do Domů.
- `src/core/nav.js` – Zpět: Události (Minulé / Kalendář / Docházka) → Nadcházející, jiná záložka → 🏠 Domů, v Domů dotaz „Ukončit aplikaci?“ (dříve z Událostí).
- `src/views/events.js` – jen popisek tlačítka zpět v detailu události („← Domů“ při otevření z přehledu).
- `src/views/help.js` – nová sekce 2. 🏠 Domů (ostatní sekce posunuty o jedno číslo), Zpět a rychlá reference; `docs/KONVENCE.md` (mapa souborů); `docs/plan-v18.md` (stav, tabulka, **nová fáze ČL – ✋ žádost o přijetí do týmu jako v19.6.1**, náhled živého zápasu UP2 → v19.6.2, otázky 61–64); `docs/prompt-dalsi-vlakno.md`; `README.md`; verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v65`).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), přihlašování a docházka (odpovídá se v detailu události jako dřív), pokladna, Moje platby, statistiky, rozpočet, pravidla databáze – přehled jen čte a odkazuje.
- Ověřeno: `npm test` (166 – nové testy přehledu, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář pro trenéra, kustoda, hráčku a hráčku-pokladníka: start bez chyb v 🏠, správné karty podle role (pokladna týmu jen trenér / pokladník, ▶ Do živého zápisu jen trenér / kustod), příští zápas → detail → ← Domů, 💳 → Moje platby, pokladna → Team → Platby, cashflow → Team → Rozpočet, ▶ Do živého zápisu otevře živý zápis; **žádný zápis do databáze** ve všech rolích.

## v19.5.2 (23. 10. 2026) – RP část 3: ✅ schválení rozpočtu, úpravy s důvodem a 🖨 export pro valnou hromadu (nová finanční data – jen čtení pokladny)
> **Nasazení:** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **Publikovat firestore.rules PŘED kódem** (rozpočet smí nést `approved` a `rev`; bez publikace selže ✅ Schválit). 3) Nahrát kód (nové soubory `src/domain/budget-review.js`, `src/views/budget-print.js`, `tests/budget-review.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.5.2 v záhlaví. 5) Trenér / pokladník: Team → 📊 Rozpočet → ✅ Schválit rozpočet (dvě klepnutí), pak zkusit úpravu s důvodem a 🖨 Export.
> **🔒 Vyžadovat verzi v19.5.2: ano, až budou trenér i pokladník na nové verzi – nejlépe PŘED schválením** (starší v19.5.x by uložila změnu schváleného rozpočtu bez záznamu úpravy a důvodu; schválenou kopii ale nezmění – hlídají pravidla). Ostatní role se to netýká.
> **Nová finanční data (ne ⚠️ SAHÁ NA PLATBY):** pokladna, předpisy, šablony, příspěvky ani události se nemění – schválení a export jen čtou. Návrat na v19.5.1: nahrát předchozí zip; pravidla mohou zůstat (v19.5.1 pole `approved` / `rev` ignoruje a merge je zachová).

**Přidáno**
- **✅ Schválit rozpočet** (trenér nebo pokladník, potvrzení druhým klepnutím; jen uložený rozpočet bez neuložených změn a chyb, jednou za sezónu): neměnná kopie `approved = {data, sum, by, at}` – `data` = pole plánu, `sum` = zmrazená čísla plánu (po měsících a za sezónu), aby se závazný dokument nezměnil ani při změně série v kalendáři. V hlavičce stav ✅ Schváleno (datum, kdo, počet úprav) / 📝 Návrh.
- **Úpravy po schválení:** každé uložení je úprava s povinným důvodem (pole nad 💾 Uložit úpravu); záznam `rev = [{at, by, note, n, inc, out, saldo}]` se jen přidává; audit „Rozpočet … – úprava (důvod)“.
- **Porovnání se schváleným** v 📝 Plán: události, příjmy, výdaje, saldo sezóny a příspěvky – schválený / aktuální / rozdíl, měsíce se změnou salda, seznam úprav (kdy, kdo, důvod, saldo).
- **🖨 Export pro valnou hromadu** (z uloženého rozpočtu, okno jako Zápis utkání, Zpět ho zavře): stav schválení, souhrn schválený / aktuální, plán po měsících se schváleným saldem, plnění, cashflow, úpravy po schválení a komentář (píše se v okně, tiskne se, neukládá se) – **🖨 Tisk / PDF** a **⬇️ CSV (Excel)** v jednom souboru po částech.
- `src/domain/budget-review.js` (`planSum`, `approveDoc`, `approvedOf`, `approveBlock`, `revList`, `revNote`, `addRev`, `compareApproved`, `budgetCsvRows`, `dmy`, `CMP_ROWS`, `REV_NOTE_MAX`), `src/views/budget-print.js`, `tests/budget-review.test.js` (5 testů: zmrazená kopie, podmínky schválení, povinný důvod a přidávání úprav, porovnání, řádky CSV).

**Změněno**
- `firestore.rules` – `budget`: povolená pole `approved` (jen `data`, `sum`, `by`, `at`) a `rev` (seznam); nové `budgetKeep` – schválení nejde změnit ani odebrat, úpravy jen přidávat; smazat jde jen neschválený rozpočet (trenér). Test pravidel v `tests/project.test.js` upraven.
- `src/views/budget-view.js` – stav schválení, ✅ Schválit, důvod úpravy, porovnání a úpravy, tlačítko 🖨 Export.
- `src/data/storage.js` – obnova zálohy ponechá u schváleného rozpočtu `approved` a `rev` z databáze a schválený rozpočet při „Nahradit vším“ nemaže (jinak by pravidla shodila celou dávku obnovy).
- Pole `orig` z plánu se nezavádí – původní plán je `approved.data` (bez duplicity).
- `src/views/help.js`, `docs/KONVENCE.md` (mapa souborů), `docs/plan-v18.md` (stav, tabulka; **UP potvrzeno jako v19.6**, P2 … HG o jednu verzi dál), `docs/prompt-dalsi-vlakno.md`, `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v64`).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka, přihlašování, série tréninků, pokladna (`calcCash`, předpisy, šablony, příspěvky, platy, žádosti, Moje platby), plán / plnění / cashflow rozpočtu. Ověřeno: `npm test` (159 – nové testy schválení a exportu, srovnávací test D1 a testy rozpočtu beze změny), kouřový test v jsdom mimo repozitář – start bez chyb pro trenéra, hráčku-pokladníka, kustoda a hráčku; trenér i pokladník: 📊 Rozpočet → ✅ Schválit (dvě klepnutí) = zápis jen `budget/{sezóna}` (merge `approved` s `data` a `sum`) + `audit`; po schválení stav ✅ a porovnání; změna nákladů položky bez důvodu se neuloží, s důvodem merge pole plánu + `rev` (bez `approved`); 🖨 Export (okno, úpravy, komentář v tisku, CSV `rozpocet-2026-27-….csv`, tisk), Zavřít; přepínání 📈 / 💧 / 📝 bez chyb; žádné jiné zápisy. Kustod a hráčka rozpočet nevidí, nic nezapisují.

## v19.5.1 (23. 10. 2026) – RP část 2: 📈 Plnění rozpočtu a 💧 cashflow s varováním (nová finanční data – jen čtení pokladny)
> **Nasazení:** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **firestore.rules se nemění** (nové pole `par.res` je uvnitř mapy `par`, kterou pravidla už povolují). 3) Nahrát kód (nové soubory `src/domain/budget-track.js`, `tests/budget-track.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.5.1 v záhlaví. 5) Trenér / pokladník: Team → 📊 Rozpočet → 📈 Plnění a 💧 Cashflow; v 📝 Plán nastavit rezervu a 💾 Uložit.
> **🔒 Vyžadovat verzi: doporučeno v19.5.1, až budou trenér i pokladník na nové verzi** (jinak by uložení rozpočtu ze starší v19.5 vynulovalo rezervu `par.res`). Ostatní role se to netýká.
> **Nová finanční data (ne ⚠️ SAHÁ NA PLATBY):** pokladna, předpisy, šablony, `calcCash`, `monthEconomy`, příspěvky ani události se nemění – plnění a cashflow jen čtou. Návrat na v19.5: nahrát předchozí zip (pole `par.res` zůstane, v19.5 ho ignoruje).

**Přidáno**
- **Rozpočet ve třech částech** – přepínač **📝 Plán** (dosavadní obrazovka) / **📈 Plnění** / **💧 Cashflow**; varování nahoře v Rozpočtu (odhad zůstatku pod rezervou / pod nulou, měsíce s odchylkou nad 10 %) v každé části, klepnutím do příslušné části.
- **📈 Plnění:** souhrn (skutečnost uplynulých a běžícího měsíce, plán za totéž období, odhad sezóny proti plánu), tabulka po měsících – události plán / proběhlo / v kalendáři, výdaje, příjmy (zaplaceno, u nevystavených příspěvků odhad), saldo plán / skutečnost, kumulativně, odhad kumulativně; ⚠️ u uplynulého měsíce s výdaji o víc než 10 % nad plánem nebo příjmy o víc než 10 % pod plánem (otázka 50). **Položky:** plán sezóny, plán do dneška (opakování a série přesně podle dat), proběhlo, v kalendáři, náklady na událost plán / skutečnost; události mimo rozpočet zvlášť.
- **Přiřazení událostí k položkám** (otázka 49 podle návrhu): šablona pokladny (uložená v `evcash`, jinak podle typu) a období položky; u více položek se stejnou šablonou nejdřív série, pak den v týdnu (bez vynechaných dnů), pak položka s počtem.
- **💧 Cashflow:** zůstatek pokladny dnes (celkem, u dvou účtů hlavní a provozní), odhad zůstatku na konci každého měsíce do konce sezóny – příjmy = plán bez už předepsaných částek + nezaplacené předpisy měsíce, výdaje = plán (dražší události v kalendáři mají přednost, u běžícího měsíce bez už vydaného); měsíc pod rezervou ⚠️ / pod nulou ⛔. Nezaplacené předpisy z dřívějších měsíců jen zvlášť (do odhadu se nepočítají).
- **Rezerva pokladny** – nový parametr v 📝 Plán (`par.res`, výchozí 0 Kč).
- **💡 Návrh úpravy** při odhadu sezóny pod cílem nebo při varování cashflow: zvýšit příspěvek od příštího měsíce o X Kč, platbu za událost o Y Kč, nebo vynechat N událostí (jen pokud to stačí). Jen text – nic se nemění samo.
- `src/domain/budget-track.js` (`tplOfEvent`, `itemOfEvent`, `otherCash`, `budgetTrack`, `cashflow`, `trackAdvice`, `devOf`, `DEV_LIMIT`, `TRACK_SKIP_CATS`), `tests/budget-track.test.js` (5 testů: přiřazení podle šablony / série / dne / počtu a mimo rozpočet, plnění po měsících a položkách, odhad příspěvků jen v měsících s příspěvkem, ostatní pohyby pokladny a odchylka 10 %, cashflow s dluhy a rezervou, návrhy).

**Změněno**
- `src/domain/budget.js`: parametr `res` (rezerva) ve výchozích parametrech a v normalizaci.
- `src/views/budget-view.js`: přepínač částí, plnění, cashflow, rezerva v parametrech, varování v hlavičce; poznámka u plánu po měsících.
- Skutečnost „ostatních“ příjmů a výdajů = pohyby pokladny mimo kategorie Příspěvky, Platby za události, Platy trenérů, Pronájem ledu, Rozhodčí a Doprava (náklady událostí se berou z vyúčtování, aby se nepočítaly dvakrát).
- `docs/plan-v18.md` – stav, tabulka a **nové navržené fáze z požadavků uživatele: 🏠 UP – úvodní přehled** (příští zápas, týden, platby, běžící zápas, náhled pro členy; veřejný náhled pro diváky s HG) **a 🏖 NP – nepřítomnost od–do** (omluvy v otevřených událostech, u uzavřených žádost trenérovi přes W), otázky 54–60; `docs/KONVENCE.md`, `docs/prompt-dalsi-vlakno.md`, `src/views/help.js`, `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v63`).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka, přihlašování, série tréninků, pokladna (`calcCash`, předpisy, šablony, příspěvky, platy, žádosti, Moje platby), `firestore.rules`. Ověřeno: `npm test` (154; srovnávací test D1, testy pokladny a rozpočtu v19.5 beze změny), kouřový test v jsdom mimo repozitář – start bez chyb pro trenéra, hráčku-pokladníka, kustoda a hráčku; trenér a pokladník: 📊 Rozpočet → 📝 Plán (pole Rezerva), 📈 Plnění (tabulka měsíců a položek), 💧 Cashflow (zůstatek po účtech, 10 měsíců odhadu, varování pod rezervou v hlavičce), přepínání částí bez zápisu; změna rezervy + 💾 = zápis jen `budget/{sezóna}` (merge, `par.res`) a `audit`; ostatní režimy pokladny a záložky bez chyby; kustod přepínač pokladny nevidí, hráčka Team nevidí – nic nezapisují.

## v19.5 (23. 10. 2026) – RP část 1: 📊 Rozpočet sezóny – parametry, položky, plán po měsících, odhad příspěvku (nová finanční data)
> **Nasazení:** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **Publikovat `firestore.rules` PŘED nahráním kódu** (nová kolekce `budget`; ostatní pravidla beze změny). 3) Nahrát kód (nové soubory `src/domain/budget.js`, `src/views/budget-view.js`, `tests/budget.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.5 v záhlaví. 5) Trenér / pokladník: Team → 📊 Rozpočet → 🆕 Založit ze soupisky a nastavení → položky → 💾 Uložit rozpočet.
> **🔒 Vyžadovat verzi: NE** (žádná stávající data se nemění; starší verze rozpočet jen nevidí). Bez publikovaných pravidel se rozpočet neuloží (hláška), zbytek aplikace běží.
> **Nová finanční data (ne ⚠️ SAHÁ NA PLATBY):** kolekce `budget/{sezóna}` – rozpočet jen plánuje a čte nastavení pokladny, soupisku, platy a kalendář. Pokladna, předpisy, šablony, `calcCash`, příspěvky ani události se nemění. Návrat na v19.4.1: nahrát předchozí zip (kolekce `budget` zůstane, starší verze ji nečte).

**Přidáno**
- **Team → 📊 Rozpočet** (přepínač vedle 💰 Platby / 🏦 Pokladna / 📅 Měsíce; jen trenér a pokladník): sezóna 1. 8. – 30. 6. (◀ ▶), **🆕 Založit ze soupisky a nastavení** (počty hráček podle skupiny plateb, příspěvek z nastavení pokladny, platy realizačního týmu, účast = průměr posledních tréninků) nebo **📋 Převzít** minulou sezónu (data posunutá o rok, série se změní na počet).
- **Parametry sezóny:** hráčky s příspěvkem / za událost / osvobozené (↻ podle soupisky), předpokládaná účast na událost, příspěvek a jeho změny od měsíce, měsíce, kdy se příspěvek vybírá, cílový přebytek na konci sezóny.
- **Položky událostí** podle šablon pokladny: 🔁 opakování (dny v týdnu, každý / každý 2. týden, od–do, vynechané dny – `domain/recurrence.js` `datesOf`), # počet za sezónu (rovnoměrně do měsíců) nebo za měsíc, 📎 převzatá série tréninků z kalendáře; náklady na událost (výchozí ze šablony), příjem na událost (bez ruční hodnoty odhad ze šablony – kdo platí × paušál / podíl nákladů podle složení hráček), vlastní účast.
- **Platy** (měsíčně / za událost × plánované události měsíce) a **ostatní příjmy a výdaje** (měsíčně / jednorázově v měsíci).
- **📅 Plán po měsících:** události, náklady, příjmy za události, příspěvky, platy, ostatní, saldo a kumulativně; součet sezóny.
- **💡 Odhad příspěvku:** potřeba pokrýt příspěvky (výdaje − za události − ostatní příjmy + cíl) ÷ hráčky s příspěvkem ÷ měsíce s příspěvkem, porovnání s plánovaným příspěvkem, dopad změny počtu hráček (−2 … +2), ✓ Použít v rozpočtu (jen v rozpočtu, nastavení pokladny se nemění).
- Uložení **💾 Uložit rozpočet** (kontrola: názvy, den v týdnu, série, od ≤ do, měsíc u jednorázových) = jedna dávka `budget/{sezóna}` (merge) + audit `budget`; ↺ Zahodit změny. Rozpracované změny zůstanou při překreslení, bez změn se obrazovka drží uloženého stavu (i ze druhého zařízení).
- `src/domain/budget.js` (čisté funkce), `src/views/budget-view.js`, `tests/budget.test.js` (7 testů: sezóna, výchozí hodnoty, počty událostí – opakování / počet / série, příjem za událost a příspěvek podle měsíce, plán po měsících, odhad a varianty, převzetí, normalizace a kontrola) a test pravidel `budget` v `tests/project.test.js`.

**Změněno**
- `firestore.rules`: `match /budget/{id}` – čte a zapisuje jen správce pokladny (`isCash()`), id `RRRR-RR`, jen pole `season` (= id), `par`, `items`, `sal`, `other`, `by`, `at`; smazat smí jen trenér.
- Záloha (⚙️ → Stáhnout zálohu) obsahuje `budget`, pokud ho zařízení načetlo (správce pokladny); obnova ho zapíše.
- `src/views/events.js` (režim `bud` v `CASH_MODES` a `cashPanel`), `src/views/team.js` (popis přepínače), `src/main.js` (poslech `budget` jen pro správce pokladny), `src/core/state.js` (`S.bd`), `src/data/storage.js` (kolekce v záloze), `src/views/help.js`, `docs/KONVENCE.md`, `docs/plan-v18.md`, `docs/prompt-dalsi-vlakno.md`, `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v62`).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka, série tréninků, pokladna (`calcCash`, předpisy, šablony, příspěvky, platy, žádosti, Moje platby). Ověřeno: `npm test` (149, srovnávací test D1 a testy pokladny beze změny), kouřový test v jsdom mimo repozitář – start bez chyb pro trenéra, hráčku-pokladníka, kustoda a hráčku; trenér a pokladník: přepínač s 📊 Rozpočet, převzetí minulé sezóny, zahození, založení ze soupisky (počty 2 / 1 / 1, účast 3, příspěvek 500, plat 1), přidání tréninku (každá středa), převzetí série (3 tréninky), změna příspěvku od ledna, odhad příspěvku, uložení = zápis jen `budget/2026-27` (merge, pole plánu + by / at) a `audit`; ostatní režimy pokladny a záložky bez chyby; kustod přepínač nevidí, hráčka Team nevidí – nic nezapisují.

## v19.4.1 (23. 10. 2026) – PM část 2: Žádost o změnu placení, historie způsobu placení – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **Publikovat `firestore.rules` PŘED nahráním kódu** (nová kolekce `requests`, pole `grpH` v `plpay`). 3) Nahrát kód (nové soubory `src/domain/requests.js`, `src/views/request-list.js`, `tests/pm-requests.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.4.1 v záhlaví. 5) Hráčka: Moje platby → 📅 Po měsících → ✋ Požádat o změnu placení; trenér / pokladník: Team → 💰 Platby → pruh ✋ → okno žádosti → ✓ Schválit / ✕ Zamítnout.
> **🔒 Vyžadovat verzi v19.4.1: ANO – před prvním schválením žádosti** (hned po přechodu všech zařízení). Starší verze historii `grpH` nezná: počítala by příspěvky a vyúčtování podle pole `grp` (dnešní stav) a její ruční úprava plateb by historii nezohlednila.
> **⚠️ SAHÁ NA PLATBY:** `src/domain/cash.js` (`grpAt`, `asOf`, `grpHWith`; `grpOf` u hráčky s historií podle dnešního měsíce; `contribRows` s měsícem příspěvku), `src/views/payments.js` (přihlášené hráčky se skupinou platnou v den události), `src/views/money.js` (příspěvky podle skupiny v měsíci příspěvku), `src/views/modal.js` (ruční změna skupiny u hráčky s historií), `src/views/mine.js`, `src/views/finance.js`, `firestore.rules`. **`calcCash` se nemění**; hráčky bez `grpH` se počítají přesně jako dřív (srovnávací testy pokladny beze změny). Už vystavené příspěvky a uzavřená vyúčtování se nikdy nepřepočítávají. Návrat na v19.4: nahrát předchozí zip, 🔒 minimální verzi snížit ručně v konzoli (`settings/app.minVer`); u hráček se schválenou změnou pak platí jen pole `grp`.

**Přidáno**
- **✋ Požádat o změnu placení** (hráčka, Moje platby → 📅 Po měsících): Příspěvek ↔ Za událost od zvoleného měsíce (příští až 6 měsíců dopředu), poznámka. Jedna otevřená žádost; dokud čeká, lze ji zrušit (potvrzení druhým klepnutím). Stav nahoře v Moje platby: čeká / ✅ schváleno / ❌ zamítnuto s odpovědí (vyřízená 30 dní). Osvobozená hráčka nežádá (otázka 44 podle návrhu – osvobození a koeficient osobně).
- **Žádosti pro trenéra a pokladníka:** pruh „✋ N žádostí o změnu placení“ v Team → 💰 Platby (a odkaz v Událostech), okno žádosti s náhledem dopadu – porovnání způsobu placení hráčky v sezóně, už vystavené příspěvky a uzavřená vyúčtování od měsíce změny (nepřepočítají se, jen upozorní). **✓ Schválit / ✕ Zamítnout** (potvrzení druhým klepnutím, odpověď hráčce) – jedna dávka: žádost + `plpay/{pid}` (`grpH`, `grp`) + audit (`req-ok` / `req-no`). Vlastní žádost (hráčka-pokladník) vyřizuje jiný správce pokladny.
- **Historie způsobu placení** `plpay.grpH = [{ym, grp}]` (od měsíce ym platí grp, `ym ""` = stav před první změnou): příspěvky měsíce podle skupiny v tom měsíci, vyúčtování události podle skupiny v den události, porovnání v Moje platby po měsících (u sezóny se změnou poznámka). Pole `grp` = stav ke dni schválení (pro starší verze).
- Kolekce **`requests/{id}`** = {kind: "pay", mid, at, by, st: "open" | "ok" | "no", from, to, ym, note, reply, doneBy, doneAt} – společná s budoucí fází W (`kind: "att"`). Mimo zálohu (výsledek je v `plpay` a v auditu).
- `src/domain/requests.js` (`reqYms`, `reqsOf`, `openReq`, `openReqs`, `payReqError`, `payReqDoc`, `decidePlan`, `impactOf`), `src/views/request-list.js` (pruh, okno, vyřízení), v `src/domain/cash.js` `grpAt`, `asOf`, `grpHWith`. `tests/pm-requests.test.js` (10 testů): skupina podle měsíce, `calcCash` přes `asOf` (dělitel beze změny, vstup beze změny), příspěvky podle měsíce, historie, porovnání s historií, kontrola a dokument žádosti, schválení / zamítnutí, dopad, pravidla.

**Změněno**
- Pravidla: `plpay` dovolí pole `grpH` (seznam); `requests` – hráčka vytvoří jen vlastní otevřenou žádost pod svým e-mailem (jen povolená pole, poznámka do 300 znaků) a smí ji smazat, dokud je otevřená; čte vlastník a správce pokladny; vyřizuje správce pokladny (ne vlastní), mění jen `st` (ok / no), `reply`, `doneBy` (jeho e-mail), `doneAt`.
- Ruční změna skupiny v Upravit → Platby u hráčky s historií se zapíše i do `grpH` od běžného měsíce (běžný měsíc mění jen pokladník ručně).
- Poslech: správci pokladny celou kolekci `requests`, ostatní své žádosti (dotaz `mid`).
- `src/views/help.js`, `src/core/state.js` (`rq`, `rqo`), `src/main.js`, `src/data/storage.js`, `src/domain/private-data.js` (`grpH` se připojí k hráčce), `src/domain/economy.js` (`compareMonths` po měsících podle historie, `contribOf` podle měsíce), `tests/privacy.test.js`, `tests/project.test.js`, `tests/pm-months.test.js`, `docs/plan-v18.md`, `docs/KONVENCE.md`, `docs/prompt-dalsi-vlakno.md`, `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v61`).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka, série tréninků, `calcCash`, šablony, QR, hospodaření události a měsíce. Ověřeno: `npm test` (141, srovnávací test D1 a testy pokladny beze změny), kouřový test v jsdom mimo repozitář – start bez chyb pro hráčku, hráčku-pokladníka, trenéra a kustoda; hráčka: podání žádosti (zápis jen `requests`, od prosince 2026, poznámka), stav otevřené žádosti, formulář skrytý, zrušení (smazání jen `requests/r1`); trenér a pokladník: pruh v Událostech i v Platbách, okno s náhledem dopadu, schválení zapíše `requests/r1` (st ok, odpověď), `plpay/p1` (`grpH` od 2026-11, `grp` dnes „monthly“) a audit; hráčka-pokladník u vlastní žádosti bez tlačítek; kustod nic nevidí a nezapisuje.

## v19.4 (23. 10. 2026) – PM část 1: Moje platby po měsících, porovnání způsobu placení (ceny na hlavu evprice) – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **Publikovat `firestore.rules` PŘED nahráním kódu** (nová kolekce `evprice`). 3) Nahrát kód (nový soubor `tests/pm-months.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.4 v záhlaví. 5) Trenér nebo pokladník: ⚙️ → Pokladna → **💲 Doplnit ceny pro hráčky** (ceny pro dříve uzavřené události). 6) Hráčka: Moje platby → 📅 Po měsících, ⚖️ Kdybych platila jinak.
> **🔒 Vyžadovat verzi:** není nutné (data se jen přidávají – nová kolekce `evprice`; starší verze ji nečte ani nezapisuje). Doporučeno nastavit v19.4 po přechodu všech zařízení, aby každé uzavření / znovuotevření vyúčtování zapsalo cenu samo (jinak ji doplní tlačítko 💲).
> **⚠️ SAHÁ NA PLATBY:** `src/views/mine.js` (nový pohled), `src/views/payments.js` (po dávce uzavření se zapíše cena na hlavu, po znovuotevření se smaže – mimo dávku, nepublikovaná pravidla vyúčtování nezastaví), `firestore.rules` (nová kolekce `evprice`: čte každý člen, zapisuje správce pokladny, jen pole `ym`, `date`, `tpl`, `head`). **`src/domain/cash.js` se nemění** – `calcCash`, předpisy, příspěvky, šablony, QR. Návrat na v19.3: nahrát předchozí zip (kolekce `evprice` zůstane a nevadí; pravidla lze ponechat).

**Přidáno**
- **Moje platby → přepínač 📄 Předpisy / 📅 Po měsících:** za každý měsíc sezóny (1. 8. – 30. 6., šipky ◀ ▶) předepsáno (zvlášť příspěvek a události), zaplaceno, zbývá; klepnutím se měsíc rozbalí na předpisy (u nezaplaceného tlačítko QR). Souhrn sezóny (předepsáno / zaplaceno / zbývá). Měsíc podle data události a měsíce příspěvku (ne splatnosti), částečná úhrada se počítá v měsíci předpisu, přeplatek nejvýše do výše předpisu (rozhodnutí 20).
- **⚖️ Kdybych platila jinak** (hráčka): po měsících a za sezónu skutečně předepsáno vs. druhý způsob placení. S příspěvkem = cena na hlavu × koeficient za uzavřené události, kde byla přihlášená a skupina Za událost platí; za událost = příspěvek (dnešní výše) × koeficient + události, kde platí i Příspěvek. Věta „Výhodnější by byl …“ jen jako informace. Osvobozená hráčka a koeficient 0 % porovnání nemají; neuzavřené a budoucí události se nepočítají.
- **Kolekce `evprice/{eid}` = {ym, date, tpl, head: {monthly, single, exempt}}** – cena uzavřené události na hlavu před koeficientem (0 = skupina neplatí; výpočet = náklady ÷ všechny přihlášené, paušál = flat). Hráčky vidí jen cenu na hlavu, ne celkové náklady ani dodavatele (otázka 45 podle návrhu). Mimo zálohu (odvozuje se z `evcash`), maže se se smazanou událostí.
- **⚙️ → Pokladna → 💲 Doplnit ceny pro hráčky** (trenér a pokladník): doplní chybějící a změněné ceny ze snapshotů uzavření, smaže ceny otevřených a smazaných událostí; idempotentní.
- `src/domain/economy.js`: `myMonths`, `chargeYm`, `compareMonths`, `headOf`, `priceDoc`, `pricePlan`, `PRICE_COLL`. `tests/pm-months.test.js` (6 testů): měsíce sezóny, cena na hlavu shodná s `calcCash`, doplnění cen (podruhé nic), porovnání pro hráčku s příspěvkem / za událost, osvobozená a koeficient 0.
- Datová vrstva: `db.collection(c).one(id)` – poslech jednoho dokumentu (hráčka čte jen svůj `plpay/{pid}`).

**Změněno**
- Hráčka poslouchá svůj dokument `plpay/{pid}` (skupina a koeficient – pravidla to dovolovala už od v19.1) a všichni členové kolekci `evprice` (`S.pr`). Chyba načtení (nepublikovaná pravidla) jen vypne porovnání.
- PM rozdělena: žádosti o změnu placení (`requests`, historie `grpH`, `grpAt` v předpisech) přijdou v další verzi. Zápis ceny je oproti plánu **mimo** dávku uzavření (bezpečnější – vyúčtování nezávisí na nových pravidlech).
- `src/views/help.js` (Moje platby, 💲 Doplnit ceny), `src/core/state.js` (`pr`, `mk`), `src/main.js`, `src/data/storage.js`, `tests/project.test.js` (pravidlo `evprice`), `tests/support/firebase-stub.mjs` (poslech dokumentu), `docs/plan-v18.md`, `docs/KONVENCE.md`, `docs/prompt-dalsi-vlakno.md`, `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v60`).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka, série tréninků, `src/domain/cash.js` (výpočet předpisů, příspěvky, platy, QR), hospodaření události a měsíce (v19.3), seznam předpisů a QR platba v Moje platby. Ověřeno: `npm test` (131, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář – start bez chyb pro hráčku, hráčku-pokladníka, trenéra a kustoda; hráčka: Moje platby → Po měsících (sezóna 2026/27, rozbalení měsíce, ◀ předchozí sezóna), připojený vlastní `plpay` (koeficient 80 %), porovnání 400 Kč → 800 Kč „současný způsob je výhodnější“, žádný zápis; trenér a pokladník: uzavření vyúčtování zapíše `evprice/t2` s cenou 1 000 Kč na hlavu, 💲 Doplnit ceny zapíše chybějící `evprice/t1`, žádné jiné zápisy; kustod bez tlačítka 💲 a bez Moje platby.

## v19.3 (23. 10. 2026) – EK: Hospodaření události a měsíce (podíl příspěvků, výsledek, návrh poplatku) – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **`firestore.rules` se nemění – nepublikovat.** 3) Nahrát kód (nové soubory `src/domain/economy.js`, `tests/economy.test.js`; nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.3 v záhlaví. 5) Trenér / pokladník: detail tréninku → 💰 Pokladna (podíl příspěvků, výsledek, 💡 Navrhnout poplatek), Team → 📅 Měsíce → ⚖️ Hospodaření měsíce.
> **🔒 Vyžadovat verzi:** není nutné (data se jen přidávají – pole `share` a `ym` ve snapshotu `evcash.settle`; starší verze je ignoruje a vyúčtování nemění). Doporučeno nastavit v19.3 až po přechodu všech zařízení, aby každé nové uzavření neslo uložený podíl příspěvků.
> **⚠️ SAHÁ NA PLATBY:** `src/views/payments.js` (souhrn vyúčtování, návrh poplatku, snapshot při uzavření doplněn o `share` a `ym`), `src/views/money.js` (nová karta). **`src/domain/cash.js` se nemění** – `calcCash`, předpisy, příspěvky, šablony, QR ani pravidla databáze; návrh poplatku jen předvyplní hodnoty u jedné události. Návrat na v19.2: nahrát předchozí zip (pole `share` / `ym` zůstanou a nevadí).

**Přidáno**
- **Vyúčtování události (detail → 💰 Pokladna):** u události kryté příspěvkem (skupina Příspěvek neplatí a událost má náklady) řádek **náklady · vybereme za událost · podíl příspěvků (z toho zaplaceno) · výsledek** – ✅ kryto / přebytek, ⚠️ schodek jen tam, kde ztrátu nekryje ani podíl příspěvků; řádek „Měsíc: N událostí kryjí příspěvky X Kč (Y hráček), na událost průměrně Z Kč“. U uzavřené události podíl z okamžiku uzavření (u starších uzavření „dnešní odhad“).
- **💡 Navrhnout poplatek** (když platí skupina Za událost nebo Osvobozené): a) výpočet (náklady ÷ hráčky v poli), b) paušál = (náklady − podíl příspěvků − platby ostatních skupin) ÷ součet koeficientů platících, nahoru na celé Kč; u obou vybraná částka a výsledek. **Použít** jen předvyplní rozpracovanou úpravu; uloží ji stávající Uložit nastavení / Uzavřít vyúčtování. Šablony a nastavení pokladny se nemění.
- **Team → 📅 Měsíce → ⚖️ Hospodaření měsíce:** příspěvky (předepsáno / zaplaceno / počet hráček, odhad ze soupisky, dokud nejsou vystavené), platby za události (uzavřené + odhad neuzavřených z přihlášených), náklady událostí (vyúčtované + plánované ze šablon / uloženého nastavení), vyplacené platy, **výsledek měsíce**, řádek **Led** (led se vyplatil / ztráta) a seznam událostí měsíce s výsledkem každé. Měsíc podle data události a měsíce příspěvku (ne splatnosti).
- `src/domain/economy.js` – čisté funkce `coveredBy`, `monthEvents`, `contribOf`, `monthEconomy`, `eventResult`, `suggestFlat` (použije i Rozpočet RP pro „skutečnost“).
- `tests/economy.test.js` (10 testů): kryté události, dělení příspěvků podle nákladů, zaplacená část podílu, uložený podíl po uzavření, rozpracovaná úprava, platy, odhad nevystavených příspěvků, návrh výpočtem i paušálem (vstup se nemění, nikdy záporně), `calcCash` beze změny.
- Data: snapshot uzavření `evcash/{id}.settle` má navíc `share` (podíl příspěvků v okamžiku uzavření, u nekrytých 0) a `ym` (měsíc události).

**Změněno**
- Otázky 41–42 podle návrhu v plánu: příspěvky měsíce se dělí mezi kryté události podle nákladů (dražší led nese větší díl), počítají se předepsané (zaplacené se ukazují zvlášť); mimořádný trénink, kde platí všichni, krytý není.
- `src/views/payments.js` (souhrn místo „schodku“, návrh, snapshot), `src/views/money.js` (karta měsíce), `src/views/help.js`, `docs/plan-v18.md` (stav EK, tabulka), `docs/KONVENCE.md` (mapa souborů), `docs/prompt-dalsi-vlakno.md` (nový stav), `README.md`, verze (`app-version.js`, `package.json`, `sw.js` → `hokej-v59`).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka, série tréninků, `src/domain/cash.js` (výpočet předpisů, příspěvky, platy, QR), pravidla databáze. Ověřeno: `npm test` (125, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář – start bez chyb pro trenéra, pokladníka (hráčka s příznakem), kustoda a hráčku; trenér a pokladník: detail tréninku s podílem příspěvků (1 000 Kč příspěvků, kryté tréninky 3 000 + 1 000 Kč → podíl 750 Kč), 💡 paušál 2 250 Kč → ✅ kryto, uzavření zapíše `evcash` se `share: 750, ym: "2026-11"` + předpisy, souhrn dlužníků a audit v jedné dávce, karta ⚖️ Hospodaření měsíce (⚠️ ztráta 1 000 Kč); kustod a hráčka bez pokladních karet, bez zápisů.

## v19.2 (23. 10. 2026) – OU: Opakované události (série tréninků)
> **Nasazení (pořadí je důležité):** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **Publikovat `firestore.rules` PŘED kódem** (nová kolekce `series` – čtou členové, zapisuje trenér a kustod; ostatní pravidla beze změny, události beze změny pravidel). 3) Nahrát kód (nové soubory `src/domain/recurrence.js`, `src/views/event-series.js`, `tests/recurrence.test.js`, `docs/prompt-dalsi-vlakno.md`; nic se nemaže). 4) Na všech zařízeních ⚙️ → Načíst novou verzi, ověřit v19.2. 5) Test: trenér založí sérii (🔁 Opakovat, vynechat termín, šablona pokladny), kustod sérii bez volby šablony, „Tato a další“ úprava a smazání, hráčka vidí řádek 🔁 Série a nic nemění.
> **🔒 Vyžadovat verzi:** není nutné (data se jen přidávají – pole `ser` u událostí a kolekce `series`; starší verze s nimi pracuje jako s běžnými tréninky). Doporučeno nastavit v19.2 až po přechodu všech zařízení, aby úpravy série dělala jen nová verze.
> Bez publikovaných pravidel se tréninky série vytvoří, jen definice v `series` se neuloží (aplikace dál funguje). Návrat na v19.1.1: nahrát předchozí zip; série zůstanou jako běžné tréninky.
> **⚠️ SAHÁ NA PLATBY (jen předvolba šablony):** `firestore.rules` (nová kolekce `series`, pokladní pravidla beze změny); trenér / pokladník může u série zvolit šablonu pokladny – tréninky dostanou `evcash/{id} = {tpl}` (jen když šablona není výchozí „Pravidelný trénink“). Výpočty pokladny (`src/domain/cash.js`), předpisy, vyúčtování ani QR se nemění.

**Přidáno**
- **Události → + Trénink → 🔁 Opakovat** (trenér, kustod): dny v týdnu, každý / každý 2. týden (týdny se počítají od týdne prvního tréninku), datum „do“ (výchozí a nejpozdější konec sezóny 30. 6.), termín přihlašování relativně (dny předem + čas, výchozí 1 den předem v 18:00), šablona pokladny (jen trenér a pokladník), náhled termínů s vynecháním klepnutím → **Vytvořit N tréninků** (dávky po ≤ 400 zápisech).
- **Detail tréninku ze série:** řádek „🔁 Série: k. z N“ (u ručně upravené „· upravená ručně“); ✏️ Upravit → **Jen tato / Tato a další** (čas, místo a termín přihlašování stejně dní předem; ručně upravené události série se vynechají a hláška je vypíše; název, datum a poznámka jen u této); **🗑 Jen tato** (dosavadní smazání) a **🗑 Tato a další** (budoucí tréninky série bez odpovědí v docházce a bez vyúčtování, ostatní zůstanou a hláška je vypíše; potvrzení druhým klepnutím).
- `src/domain/recurrence.js` – čisté funkce `datesOf(pravidlo, od, do, vynechat)`, `seasonEnd`, `relDl` / `relOf`, `seriesTail`, `editPlan`, `deletePlan`, `manualChange`, `seriesOps`, `chunks` (použije i Rozpočet RP).
- `src/views/event-series.js` – část formuláře a detailu pro série (volá ho `src/views/events.js`).
- Data: událost série má `ser = {id, i}` (`x: 1` = ručně upravená přes „Jen tato“), definice `series/{id} = {rule, d, n, by, at}` (po úpravě „Tato a další“ i `ed`). Kolekce `series` je v záloze (trenér / kustod ji poslouchají).
- `tests/recurrence.test.js` (12 testů): termíny (dny, každý 2. týden, vynechané, konec sezóny, letní čas), relativní termín, dávky, plán úprav a mazání, zápisy série, text pravidel `series`.
- `docs/prompt-dalsi-vlakno.md` – prompt pro nové vlákno s Claude (odkaz v README).

**Změněno**
- `src/views/events.js`: formulář tréninku (při opakování datum = „Od“, místo pevného termínu relativní), detail (řádek série, tlačítka „Jen tato“ / „Tato a další“); `src/data/storage.js`: kolekce `series` v záloze a obnově; `src/main.js`: poslech `series` pro trenéra a kustoda (chyba aplikaci neblokuje).
- `firestore.rules`: nové pravidlo `series`.
- `docs/plan-v18.md`: řádek v19.2 opraven („nová kolekce series → publikovat firestore.rules před kódem (události beze změny pravidel)“), stav fáze OU; `docs/KONVENCE.md` (mapa souborů), `src/views/help.js`, `README.md`.

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka, výpočty pokladny a předpisy, běžné tréninky a zápasy (úprava a smazání tréninku mimo sérii fungují jako dřív), soukromé kolekce. Ověřeno: `npm test` (115, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář – start bez chyb pro trenéra, kustoda a hráčku; trenér: série 34 tréninků (2 dny, každý 2. týden, 1 vynechaný termín) zapíše jen `events/*` a `series/*`, se šablonou „Mimořádný trénink“ i `evcash/*` = `{tpl}`; kustod bez volby šablony; „Tato a další“ změní aktuální a neupravené další (ručně upravenou vynechá), relativní termín sedí; „Jen tato“ označí `ser.x`; „Tato a další“ smazání vynechá trénink s odpovědí a vyúčtovaný; hráčka nemá tlačítka založení, úpravy ani smazání.

## v19.1.1 (23. 10. 2026) – Úklid soukromí: smazání starých citlivých polí, zúžená pravidla databáze – ⚠️ SAHÁ NA PLATBY
> **Nasazení (pořadí je důležité):** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) Nahrát kód (nic se nemaže, žádný nový soubor). **Pravidla zatím nepublikovat.** 3) Na všech zařízeních ⚙️ → Načíst novou verzi, ověřit v19.1.1. 4) Trenér ⚙️ → Kontrola dat: u Soukromí musí být ✅ (jinak nejdřív **🔒 Převést citlivá data** z v19.1). 5) **🔒 Vyžadovat verzi v19.1.1** (bez toho se úklid nenabídne – v19.0 čte jen stará pole, v19.1 by je ještě zapsala při obnově staré zálohy). 6) ⚙️ → Kontrola dat → **🧹 Smazat stará citlivá pole** (náhled počtů, potvrzení druhým klepnutím, před zápisem se stáhne záloha; po úklidu ukáže ✅). 7) **Publikovat `firestore.rules`** (stará pole už nejde zapsat; mazat je pravidla dovolí, takže pořadí 6 a 7 nic nerozbije, ale publikovat až po úklidu je přehlednější). 8) Ověřit role: trenér úprava hráčky a člena týmu, pokladník Platby a Plat, kustod odpověď s důvodem za hráčku, hráčka vlastní odpověď s důvodem.
> **⚠️ SAHÁ NA PLATBY:** `firestore.rules` (soupiska a realizační tým bez práv pokladníka, stará pole plateb a platu nejde zapsat), úklid platebních polí hráček a platů (`src/data/storage.js`, `src/domain/private-data.js`). **`src/domain/cash.js` se nemění** – výpočty dostávají platební pole a platy připojené z `plpay` / `staffpay` jako ve v19.1 (ověřeno testem: stejné `exOf` / `fxOf` / `grpOf` před převodem a po úklidu).
> Návrat na v19.1: nahrát předchozí zip a předchozí `firestore.rules`; data v nových kolekcích zůstávají a v19.1 je čte. Minimální verzi 19.1.1 pak trenér musí snížit ručně v konzoli (`settings/app.minVer`). Smazaná stará pole se nevrací (v19.1 je nepotřebuje – čte nové místo); v19.0 by po úklidu neviděla platby, platy ani důvody.

**Přidáno**
- **⚙️ → Kontrola dat → 🧹 Smazat stará citlivá pole** (jen trenér, nabídne se až po převodu): smaže `players.grp / fx / ex / note`, `staff.pay` a `attendance.reason` jen tam, kde hodnota už je v `plpay` / `staffpay` / `attnote`, nebo je prázdná. Co nemá protějšek (např. důvod u docházky s jiným tvarem id), zůstane a náhled ho ukáže. Tlačítko je jen při minimální verzi aspoň v19.1.1 (`CLEAN_MIN`); plán se před zápisem spočítá znovu z aktuálních dat, záloha se stáhne vždy. Lze spustit znovu (druhé spuštění nic nenajde).
- `src/domain/private-data.js`: `cleanPlan` (plán úklidu, `keep` = co zůstane) a `splitLegacy` (rozdělení staré zálohy do nových kolekcí).
- Testy v `tests/privacy.test.js` (celkem 103): úklid jen převedených a prázdných hodnot, bez převodu nic nesmaže, stejné výpočty pokladny po úklidu, rozdělení staré zálohy (vstup se nemění, nové místo v záloze má přednost, nová kolekce vznikne jen z nalezených hodnot), obnova staré zálohy přes `HK.importData`, text zúžených pravidel.

**Změněno**
- **`firestore.rules` – zúžení po přechodném období:** `players` – nový dokument bez `grp / fx / ex / note`, úprava je nesmí přidat ani změnit (smazat ano), pokladník soupisku už nemění (platby zapisuje do `plpay`); `staff` – bez `pay` (stejně), pokladník už nemění (plat do `staffpay`); `attendance` – bez `reason` (stejně), čtou dál všichni členové (odpověď potřebuje Docházka). Nové pomocné funkce `noKeys`, `keepOut`. Ostatní pravidla beze změny.
- **Obnova ze zálohy** (`src/data/storage.js`): stará záloha (citlivá pole ve starém místě) se před zápisem rozdělí – soupiska, tým a docházka bez nich, hodnoty do `plpay` / `staffpay` / `attnote` (zúžená pravidla by jinak odmítla celou dávku). Hodnoty ze zálohy se zapíšou i v nových kolekcích (dřív měly přednost stávající `plpay` / `staffpay` / `attnote` – poznámka „Pozor při obnově staré zálohy“ z v19.1 už neplatí). Důvod u docházky s jiným tvarem id než `{eid}_{pid}` se nepřevede – hláška po obnově ukáže počet.
- `src/views/help.js` (⚙️ → Kontrola dat), `README.md`, `docs/plan-v18.md` (fáze S hotová).

**Beze změny**
- `src/domain/cash.js` a všechny výpočty pokladny, předpisy, QR, účty, pravidla pokladny a soukromých kolekcí, živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka, zápisy aplikace (už ve v19.1 zapisovala jen do nových kolekcí). Náhrada ze starých polí v `private-data.js` (`joinPlPay`, `joinStaffPay`, `joinAttNotes`) zůstává – po úklidu se neuplatní. Ověřeno: `npm test` (103, srovnávací test D1 beze změny), kouřový test ⚙️ v jsdom mimo repozitář (trenér): bez brány verze i s minimem 19.1 jen upozornění, s minimem 19.1.1 tlačítko, druhé klepnutí stáhne zálohu a smaže jen převedená pole.

## v19.1 (23. 10. 2026) – Soukromí v databázi S: důvody omluv, platy týmu a platby hráček v samostatných kolekcích – ⚠️ SAHÁ NA PLATBY
> **Nasazení (pořadí je důležité):** 1) Záloha: ⚙️ → Stáhnout zálohu (JSON) a zip současného repozitáře. 2) **Publikovat `firestore.rules` PŘED nahráním kódu** – přidávají nové kolekce `attnote`, `staffpay`, `plpay`; stará pole (`attendance.reason`, `staff.pay`, `players.grp / fx / ex / note`) zůstávají povolená, takže v19.0 na ostatních zařízeních dál funguje. 3) Nahrát kód (nový soubor `src/domain/private-data.js`, nic se nemaže). 4) Na telefonu ⚙️ → Načíst novou verzi, ověřit v19.1 a role (trenér, kustod, pokladník, hráčka). 5) **Trenér: ⚙️ → Kontrola dat → 🔒 Převést citlivá data** (náhled „co se přesune“, potvrzení druhým klepnutím, před zápisem se stáhne záloha; lze spustit znovu – po převodu ukáže ✅). 6) **Hned jak budou všechna zařízení na v19.1: 🔒 Vyžadovat verzi v19.1** – starší verze by po převodu zapisovala důvody a platby do starých polí, které v19.1 už nečte (má přednost nové místo). 7) Smazání starých polí a zúžení pravidel `players` / `staff` / `attendance` přijde ve **v19.1.1** (po otestování) – do té doby jsou stará data v databázi dál čitelná všem členům.
> **⚠️ SAHÁ NA PLATBY:** `firestore.rules` (nové kolekce), platební pole hráček a platy realizačního týmu (`src/views/modal.js`, `src/views/team.js`, `src/data/storage.js` – Kontrola dat, CSV soupisky). **`src/domain/cash.js` se nemění** – platební pole se připojí k hráčce a plat ke členu týmu v paměti, výpočty předpisů, příspěvků, platů a QR dostávají stejná data jako dřív.
> Návrat na v19.0: nahrát předchozí zip; pravidla mohou zůstat (jen přidávají). v19.0 čte stará pole – úpravy plateb, platů a důvodů provedené ve v19.1 (jen v nových kolekcích) v ní nebudou vidět. Minimální verzi pak trenér musí snížit ručně v konzoli (`settings/app.minVer`).

**Přidáno**
- **Důvody omluv** („Nemoc“, „Zranění“ = zdravotní údaje) v kolekci `attnote/{eid}_{mid}` = `{eid, mid, reason}`: čte vlastník (`mid` = jeho `pid` / `tid`) a trenér / kustod, zapisuje trenér a kustod za kohokoli, hráčka jen svůj. Odpověď (`st`) zůstává v `attendance` (Docházka ji potřebuje pro všechny). Odpověď a důvod se zapisují v jedné dávce; nová odpověď přepíše dokument docházky bez důvodu (starý `attendance.reason` u ní zmizí), prázdný důvod smaže dokument `attnote`. Zrušení odpovědi, smazání tréninku a smazání člena týmu mažou i důvody.
- **Platy realizačního týmu** v kolekci `staffpay/{tid}` = `{m, amt}`: čte a zapisuje správce pokladny, číst smí i člen sám. Upravit → Plat zapisuje jen sem (jméno a funkce dál do `staff`); smazání člena smaže i jeho plat.
- **Platební pole hráček** v kolekci `plpay/{pid}` = `{grp, fx, ex, note}`: čte a zapisuje správce pokladny, číst smí i hráčka sama. Úprava hráčky (trenér) zapíše soupisku a platby v jedné dávce, okno Platby (pokladník) jen `plpay`; nová hráčka vzniká v jedné dávce `players` + `plpay`, se smazáním zmizí i `plpay`.
- **⚙️ → Kontrola dat → 🔒 Převést citlivá data** (jen trenér): náhled počtů (platby hráček, platy, důvody) a toho, co zůstává ve starých polích; záloha před zápisem; kopíruje jen hodnoty, které v novém místě chybí (novější zápis nepřepíše) → idempotentní. Odpovědi s jiným tvarem id než `{eid}_{pid}` se nepřevedou (ukáže jejich počet). Bez načtených nových kolekcí (nepublikovaná pravidla) se převod nenabídne.
- `src/domain/private-data.js`: `joinPlPay` / `withPlPay`, `joinStaffPay`, `joinAttNotes` (nové místo s náhradou ze starého), `attDoc`, `noteDoc`, `plPayDoc`, `staffPayDoc`, `privacyPlan`, `legacyLeft`. `src/domain/debtors.js`: `memberBlocked`.
- `S.db.collection(c).newId()` (id nového dokumentu bez zápisu) a `S.an` (důvody omluv v paměti).
- Test `tests/privacy.test.js` (13 testů, celkem 99): připojení s náhradou, stejné výsledky `exOf` / `fxOf` / `grpOf` a `salaryRows`, plán převodu a jeho opakování, blokace „Jdu“ přes souhrn, záloha a obnova nových kolekcí, text pravidel.

**Změněno**
- **Kontrola dluhu při „Jdu“ za jiného člena** (nález 6): rozhoduje i veřejný souhrn `debtors` (trenér / kustod bez práv pokladny cizí předpisy nevidí); hláška rozliší vlastní a cizí blokaci. Správce pokladny zapisuje dál bez omezení.
- `src/main.js`: poslech podle role – `attnote` trenér a kustod celou kolekci, ostatní jen své (dotaz `mid`), `plpay` a `staffpay` jen správci pokladny; data se připojí k `S.pl`, `S.tr`, `S.at`. Chyba nových kolekcí aplikaci nezastaví (zůstanou stará pole).
- `src/data/storage.js`: záloha a obnova obsahují `attnote`, `staffpay`, `plpay`; Doplnit pole ex zapisuje do `plpay` a počítá s připojenými poli; CSV soupisky bere platby z `plpay` (s náhradou).
- `src/views/team.js`: štítek plateb u hráčky (skupina, osvobozená, koeficient) vidí jen správce pokladny.
- `src/views/events.js` (zápis odpovědi a důvodu, smazání tréninku po dávkách), `src/views/modal.js` (Platby, Plat, úprava hráčky a člena týmu), `src/core/state.js` (`an`), `src/views/help.js` (kapitoly Události, Team, ⚙️).
- `firestore.rules`: pravidla `attnote` (`noteOk`: jen pole `eid`, `mid`, `reason`, id = `eid_mid`), `staffpay`, `plpay`; u `players`, `staff`, `attendance` poznámka o přechodném období.

**Beze změny**
- `src/domain/cash.js` a všechny výpočty pokladny, předpisy, QR, účty, pravidla pokladny, živý zápis (střely, góly, časomíra, tresty), statistiky, Docházka (bez důvodů jako dřív). Ověřeno: `npm test` (99, srovnávací test D1 beze změny), kouřový test v jsdom mimo repozitář pro trenéra, kustoda, pokladníka (hráčka s příznakem) a hráčku – start bez chyb, všechny záložky, ⚙️, detail události; důvody vidí jen vlastník a trenér / kustod; kustod nepřihlásí dlužnici „Jdu“ a zapíše odpověď + důvod v jedné dávce; pokladník zapisuje Platby do `plpay` a Plat do `staffpay`; hráčka zapisuje odpověď bez důvodu + `attnote`; trenér: úprava hráčky = `players` + `plpay`, převod v Kontrole dat; při nepublikovaných pravidlech (odmítnuté nové kolekce) aplikace běží ze starých polí.
- **Pozor při obnově staré zálohy** (bez nových kolekcí): stávající `plpay` / `staffpay` / `attnote` zůstanou a mají přednost před poli ze zálohy – po obnově zkontroluj Platby a Platy, případně uprav ručně.

## v19.0 (23. 10. 2026) – Rychlé úpravy R: kalendář od nejnovějších, Zápis utkání v Událostech, realizační tým v pětkách tréninku
> **Nasazení:** jen nahrát kód (nic se nemaže, nový soubor `src/domain/event-helpers.js`). Pravidla databáze beze změny (publikovat netřeba). 🔒 Vyžadovat verzi doporučeno, až budou všechna zařízení na v19.0 – starší verze by při ↻ Podle základní formace smazala přiřazení realizačního týmu v pětkách (nové klíče `t:` v `events.lines`).
> Pokladna, platby, QR, živý zápis, statistiky a docházka se nemění (žádný soubor z „⚠️ SAHÁ NA PLATBY“).

**Přidáno**
- **📋 Zápis utkání v Událostech:** detail uzavřeného zápasu má pod výsledkem tlačítko, které otevře celý Zápis utkání (stejné okno jako v záložce Soupeři: vývoj zápasu, střely, střídání, čas na ledě, tisk / HTML / CSV) – pro všechny role včetně hráček; souhrn statistik zůstává pod tlačítkem. Okno nenabízí úpravy.
- **Realizační tým v pětkách tréninku:** v Rozdělení do pětek je pod hráčkami sekce „Realizační tým“ – přihlášení („Jdu“) členové týmu dostanou 1.–4. pětku nebo „–“ (vede stanoviště / jde s pětkou). Klíč v `events.lines` je `"t:" + id` (nezamění se s hráčkou), souhrn ukazuje „2. pětka: 5 + 🎓1“. ↻ Podle základní formace přepíše jen hráčky, přiřazení realizačního týmu zůstane. Hráčka vidí rozdělení jen ke čtení. Statistiky ani docházka se nemění.
- `src/domain/event-helpers.js`: `sortEvents`, `evAsc`, `baseLines` (přesunuto z `events.js`, nově zachová realizační tým), `setLine`, `lineCounts`, `trKey` / `isTrKey`. Test `tests/r-quick.test.js` (8 testů, celkem 86).

**Změněno**
- **Kalendář od nejnovějších:** Události → Kalendář řadí sestupně (nejnovější nahoře) stejně jako Minulé; Nadcházející zůstávají vzestupně (nejbližší nahoře).
- `src/views/events.js` (řazení přes `sortEvents`, pětky, tlačítko Zápis utkání, hlavička souboru), `src/views/help.js` (kapitoly 2 a 8).
- Plán `docs/plan-v18.md`: fáze R hotová; upřesnění Pokladny II od uživatele (model příspěvek / za událost a nastavení šablon se nemění, rozpočet = průběžně upravovaný hlídač cashflow).

**Beze změny**
- Pokladna, předpisy, QR, živý zápis, statistiky, docházka, pravidla databáze. Ověřeno: `npm test` (86), kouřový test v jsdom mimo repozitář (trenér a hráčka: pořadí Kalendáře, pětky s realizačním týmem – zápis `merge` jen pole `lines`, Podle základní formace zachová `t:` klíče, Zápis utkání se otevře a nemá úpravy).

## v18.9.3 (22. 10. 2026) – Úklid D3: mazání starého kódu, zápisy přes merge, jednotné potvrzení – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** 1) **Ještě na v18.9.2:** trenér ⚙️ → Kontrola dat musí ukázat ✅ (jinak nejdřív **Doplnit pole ex**). Hráčka se starými daty (koeficient 0 % bez pole `ex`) se od v18.9.3 nepočítá jako osvobozená – tlačítko Kontrola dat ale zůstává i ve v18.9.3, kdyby se nějaká objevila. 2) Nahrát kód (nic se nemaže). 3) **Publikovat firestore.rules** (po nahrání kódu; jen smazané pravidlo `coach` a komentáře – na pořadí nezáleží). 4) Pokud v konzoli Firebase existuje kolekce `coach`, lze ji smazat (aplikace ji nepoužívá). 🔒 Vyžadovat verzi není nutné (tvar dat se nemění).
> **⚠️ SAHÁ NA PLATBY:** `src/domain/cash.js` (`exOf` / `fxOf` bez starého tvaru, `exFixPlan` beze změny výsledku), `src/views/cash-settings.js` (uložení nastavení přes `merge`, potvrzení smazání šablony přes `confirm2`), `firestore.rules` (smazané pravidlo `coach`, komentáře). Výpočty předpisů, QR, účty a pravidla pokladny beze změny.

**Smazáno**
- `legacyEx` v `domain/cash.js` (bod D9): osvobozená je jen hráčka s `ex: true`; `fxOf` vrací uložený koeficient. Převod starých dat zůstává v ⚙️ → Kontrola dat (`exFixPlan`), nově zapíše jen pole `ex` (a `fx` u starého tvaru osvobozené) přes merge.
- `firestore.rules`: pravidlo `match /coach/{doc=**}` (D24, kolekce se nepoužívá) a poznámka o kolekci `payments` (D10, D25); poznámka o `payments` i v `storage.js` (obnova zálohy). Komentáře pravidel bez čísel verzí.
- Nepoužité proměnné a importy v `src/views/matches.js` (`sh`, `sk`, `sg`, `sNm`, `OUT`, `opr`, importy `shots`, `skaters`) – ověřeno ESLintem (mimo repozitář), jinde žádné nepoužité proměnné ani nedefinované názvy.

**Změněno**
- **Zápisy nových polí přes merge** (pravidlo z `docs/KONVENCE.md`): datová vrstva má `S.db.doc(cesta).merge(pole)` – zapíše jen uvedená pole (`mergeFields`), `undefined` / `"__del"` pole smaže, ostatní pole dokumentu zůstanou (i ta, která starší verze nezná); stejně jako `set` nečeká na server (offline). Přes merge nově ukládá: úprava hráčky (trenér, kustod) a okno Platby (pokladník), úprava člena realizačního týmu a Plat, trvalé zranění v živém zápisu (jen `st`), rozdělení do pětek (jen `lines`), úprava tréninku (jen údaje formuláře – pětky a příznak vyúčtování zůstanou samy, pomocné pole `keep` zrušeno), uložení nastavení pokladny (účty dál přebírá z databáze), Kontrola dat. Dávkový `batch().merge` se nemění.
- **Potvrzení druhým klepnutím sjednocené** (nález 1 z v18.9): ⚙️ → Nahradit vším, 🔒 Vyžadovat verzi, Doplnit pole ex a smazání šablony v nastavení pokladny používají `confirm2` – druhé klepnutí do 4 s, jinak se tlačítko vrátí (dřív zůstalo označené); tlačítko se při označení zbarví červeně. Označení platí jen v právě otevřeném okně ⚙️; v nastavení pokladny ho zruší každá jiná akce.
- Nápověda (`help.js`) bez „(od v18.x)“ a dalších čísel verzí (nález 4 z v18.9); doplněno potvrzení do 4 s a dopad chybějícího pole `ex`.
- `src/debug.js` (D27): popis odpovídá skutečnosti (jen ruční ladění, testy importují moduly přímo), navíc zpřístupní `domain/cash`, `bank-account`, `attendance`, `debtors`, `shift-edit`.
- Testy: `tests/d3-cleanup.test.js` (mazání, potvrzení, nápověda, merge), `tests/ex-fix.test.js` (starý tvar se nečte, převod zachová význam), zástupci `tests/support/firebase-stub.mjs` (volby `setDoc`, `deleteField`) a `fake-db.mjs` (`merge`). Celkem 78 testů zelených, srovnávací test D1 beze změny.

**Rozhodnuto bez změny kódu**
- D22 `trOf` zůstává (od v18.9 ho používají `pn` / `nm`). D30 název balíčku `hokej-zapasy`, `index.html` a `manifest.webmanifest` zůstávají (značka zálohy `app: "hokej-zapasy"`). Odebrání člena v ⚙️ zůstává se systémovým dotazem (nešlo o potvrzení druhým klepnutím).

**Beze změny**
- Živý zápis (střely, góly, časomíra, tresty, střídání), statistiky, docházka, výpočty pokladny, QR, předpisy a úhrady. Ověřeno: `npm test` (78), kouřový test v jsdom mimo repozitář (⚙️ potvrzení a vypršení po 4 s, Kontrola dat, smazání a uložení šablony pokladny).

## v18.9.2 (22. 10. 2026) – Oprava: pokladník nastavuje platby hráček; ⚙️ Kontrola dat (pole ex) – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** nahrát kód (nic se nemaže). Pravidla databáze beze změny – pokladníkovi úpravu polí plateb (`grp`, `fx`, `ex`, `note`) a platu (`pay`) povolovala už dřív, chybělo jen tlačítko v aplikaci. Pak trenér: ⚙️ → **Kontrola dat → Doplnit pole ex** (před zápisem se sama stáhne záloha). Až budou všechna zařízení na v18.9.2: ⚙️ → 🔒 Vyžadovat verzi (doporučeno – převod mění data hráček).
> **⚠️ SAHÁ NA PLATBY:** `src/domain/cash.js` (nová čistá funkce `exFixPlan`, výpočty beze změny), okna úpravy hráčky a člena týmu (`src/views/modal.js`) – pole plateb. QR, předpisy, úhrady, účty a `firestore.rules` beze změny.

**Opraveno**
- **Pokladník nemohl nastavit platby hráček** (nález z testu v18.9.1): hráčka s příznakem pokladník neměla u hráček ani u realizačního týmu tlačítko Upravit (chyba už ze starších verzí, ne z úklidu). Nově má u hráček **Upravit → okno „Platby“** (skupina plateb, osvobozená, koeficient, poznámka) a u realizačního týmu **Upravit → „Plat“**. Jméno, číslo, pozici, stav, funkci ani sestavu a formaci nemění (přetahování zůstává vypnuté); uloží se jen pole plateb, ostatní údaje dokumentu zůstanou.

**Přidáno**
- **⚙️ → Kontrola dat** (jen trenér): seznam hráček bez pole `ex` (starší data) a co dostanou – starý tvar osvobozené (`fx` 0 bez `ex`) → osvobozená, koeficient 100 %; ostatní → neosvobozená. Platby se nemění (`exOf` a `fxOf` dávají totéž). Potvrzení druhým klepnutím, před zápisem se stáhne záloha (JSON), lze spustit znovu. Po převodu ukáže ✅. Je podmínkou pro D3 (odstranění `legacyEx`).
- `domain/cash.js`: `exFixPlan(players)`; test `tests/ex-fix.test.js`. Zástupce Firebase zaznamenává zápisy (`__fb.writes`) pro testy.

**Změněno**
- `src/views/team.js` (Upravit i pro pokladníka), `src/views/modal.js` (režim jen plateb / platu), `src/data/storage.js` (Kontrola dat), `src/views/help.js` (kapitoly Team a ⚙️), `src/views/shell.js` (komentář).

**Beze změny**
- Trenér a kustod upravují hráčky stejně jako dřív; živý zápis, statistiky, docházka, pokladna, QR, pravidla databáze. Ověřeno kouřovým testem (jsdom): obrazovky všech rolí kromě Team u hráčky-pokladníka a ⚙️ shodné s v18.9.1; zápis pokladníka mění jen `grp`, `fx`, `note` / `pay`.

## v18.9.1 (22. 10. 2026) – Úklid kódu D1, část 2: statistiky, oprávnění, nastavení týmu, rozdělení živého zápisu (fáze D1 f–i) – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** nahrát kód a **smazat z webu i z repozitáře `src/views/live.js`** (nahradily ho tři nové soubory – starý soubor by v offline cache nevadil, ale nemá zůstat). Pravidla databáze beze změny (publikovat netřeba), tvar dat beze změny – 🔒 Vyžadovat verzi není nutné.
> **⚠️ SAHÁ NA PLATBY – jen dotaz na oprávnění, výsledky beze změny:** `src/views/mine.js`, `src/views/payments.js`, `src/views/money.js`, `src/views/cashbook.js`, `src/views/cash-settings.js` (`HK.isCash()` → `HK.can("money")`, návrh účtu `HK.role() === "trener"` → `HK.can("accounts")`). `src/domain/cash.js`, `src/domain/bank-account.js`, `src/views/qr-image.js` a `firestore.rules` se nemění.

**Přidáno**
- `src/domain/player-stats.js`: `playerStats(matches, {match})` – jediný výpočet statistik hráček a brankářek (góly, asistence, body, střely, TM, +/-, čas na ledě, střídání, góly v PP, body doma / venku, týmové střely a góly). `match: true` = rozpis jednoho zápasu (bruslařky sestavy, +/- bez brankářek – stejně jako dřív), bez něj souhrn.
- `src/data/storage.js`: oprávnění na jednom místě – `HK.can(akce)` s tabulkou `CAN`: `sport` (trenér, kustod), `money`, `members` (trenér, pokladník), `roster`, `accounts`, `admin` (trenér), `onlyOwn` (hráčka); neznámá akce = výjimka.
- `src/config/team-config.js`: `TEAM_NAME` („HC Střely“), `APP_NAME` („Hokej – zápasy“), `DEV_EMAILS`. Název `team.js` z plánu nešel – má ho už `src/views/team.js` (pravidlo jedinečných názvů).
- Živý zápis rozdělený (bod D13): `src/views/live-view.js` (vykreslení, situace a jednotky, hlídač situace, odpočty a upozornění), `src/views/live-panels.js` (menu ⋯ a panely), `src/views/live-events.js` (obsluha klepnutí, odchod, nabídka po trestu, posun času). Kód přesunut beze změny, obsluha se napojuje ve stejném pořadí.
- Testy: `tests/permissions.test.js` + `tests/support/can-probe.mjs` (can() pro trenéra, kustoda, kustoda-pokladníka, hráčku, hráčku-pokladníka – každá role ve vlastním procesu), `tests/d1-structure.test.js` (playerStats, kontroly struktury: název týmu, role, confirm2, csv, drag, statistiky, komentáře, jedinečné názvy souborů). Celkem 67 testů.

**Změněno**
- `src/views/report.js` (`matchStatsHtml`) a `src/views/stats.js` počítají přes `playerStats` – výstup znak po znaku stejný (srovnávací test z v18.9 beze změny).
- Všechny pohledy a `main.js`: `HK.isStaff()` → `HK.can("sport")`, `HK.isCash()` → `HK.can("money")`, `HK.role() === "hracka"` → `HK.can("onlyOwn")`, `HK.role() === "trener"` → `HK.can("roster")` (soupiska, realizační tým) / `HK.can("accounts")` (účty); okno ⚙️ používá `can("admin")`, `can("members")`, `can("sport")`. `HK` už nenabízí `isStaff`, `isCash`, `role`.
- „HC Střely“ v `matches.js`, `report.js`, `live-view.js`, `live-quick.js`, `editor.js`, `modal.js`, `stats.js` a „Hokej – zápasy“ v `storage.js` (přihlášení, hláška obnovy) → `TEAM_NAME` / `APP_NAME`. Výjimky beze změny: `index.html`, `manifest.webmanifest`, značka zálohy `app: "hokej-zapasy"`.
- Importy `live.js` přepojené: `shell.js`, `matches.js`, `live-quick.js`, `main.js`, `debug.js` (+ `player-stats.js`).

**Odstraněno**
- `src/views/live.js` (**smazat ručně**), `HK.isStaff`, `HK.isCash`, `HK.role`.

**Beze změny**
- Vzhled a ovládání (ověřeno mimo repozitář kouřovým testem v jsdom: obrazovka živého zápisu ve 28 stavech včetně menu, panelů, střel, střídání, zranění, rychlého trestu a 16 obrazovek + ⚙️ pro 4 role – HTML i stav zápasu shodné s v18.9), živý zápis (logika `live-engine.js` netknutá), statistiky, docházka, dlužníci, pokladna, QR a účty, pravidla databáze.

## v18.9 (22. 10. 2026) – Úklid kódu D1, část 1: společné pomůcky (fáze D1 a–e, j, k) – ⚠️ SAHÁ NA PLATBY
> **Nasazení:** jen nahrát kód (žádný soubor se nemaže). Pravidla databáze beze změny (publikovat netřeba), tvar dat beze změny – 🔒 Vyžadovat verzi není nutné.
> **⚠️ SAHÁ NA PLATBY – jen přesun a přejmenování, výsledky beze změny (ověřeno srovnávacími testy):** `src/domain/cash.js` (`vsOf` → `vsHash`, `csvText` přesunuto do `core/utils.js` jako `csv`, smazaná nepoužitá `asciiMsg`, `chargeId` / `SPRE` bez `export`, komentáře), `src/domain/bank-account.js` (`RECENT_DAYS` bez `export`, komentář), `src/views/mine.js` (import `vsHash`, komentáře), `src/views/qr-image.js` (komentář), `src/views/cash-settings.js` (komentáře), `src/views/payments.js` (`confirm2`, komentáře), `src/views/money.js` (`confirm2`, `nm`, `csv`), `src/views/cashbook.js` (`confirm2`, `pn`, komentáře). Výpočty předpisů, úhrad, VS, QR (`spdPay`, `qrMsg`) a účty beze změny; `firestore.rules` beze změny.
> D1 bylo na jedno vlákno příliš velké – rozděleno: **v18.9 = body a–e, j, k**, **v18.9.1 = body f–i** (`playerStats`, `can()`, `config/team.js`, rozdělení `live.js`).

**Přidáno**
- `src/core/actions.js`: `confirm2(key, fn, redraw)` – jediné potvrzení druhým klepnutím (1. klepnutí označí, 2. do 4 s provede, jinak se označení samo zruší), `armed(key)`, `CONFIRM_MS`.
- `src/core/selectors.js`: `nm(id, {staff, fb})` – jméno bez HTML; `pn(id, {staff, fb})` – jméno s HTML nově umí i člena realizačního týmu (🎓) a vlastní text pro neznámé id.
- `src/core/utils.js`: `csv(rows)` – jediný text CSV (středník, uvozovky, BOM, CRLF).
- `src/core/drag.js` (nový): `makeDrag(root, items, {target, start, drop, click})` – jediné přetahování (podržení prstu 320 ms, myš > 6 px, duch, zvýraznění cíle, 450 ms bez klepnutí po puštění).
- Testy: `tests/d1-baseline.test.js` + `tests/fixtures/d1-baseline.json` (srovnávací výstupy zachycené na v18.8.1: statistiky zápasu a souhrnu, CSV vývoje, střídání, soupisky a pokladny byte po bytu, potvrzení druhým klepnutím, zápasy proti soupeři, VS), `tests/d1-helpers.test.js` (confirm2, csv, pn / nm, makeDrag). Zástupce Firebase (`tests/support/firebase-stub.mjs`) umí přihlášení a data kolekcí přes `globalThis.__fb`; zástupce prvku DOM má `click()`. Celkem 56 testů.

**Změněno**
- Potvrzení druhým klepnutím přes `confirm2` ve všech 10 souborech (zápas: uzavřít, znovu otevřít, smazat, základní formace; událost: smazat; soupeř: smazat; hráčka a člen týmu: smazat; editor zápasu a opravy střídání; pokladna: storno, zaplatila vše, znovu otevřít vyúčtování, příspěvky a platy). Ruční vzor `S.cf === … setTimeout` už v kódu není.
- Jména: `nameOf` (timeline, cashbook) a `plainName` (money) nahradily `nm` / `pn` ze `selectors.js`; `trOf` je vnitřní pomocník `selectors.js`.
- CSV: 4 implementace (report, money, cash `csvText`, storage `exportCSV`) → `csv` v `core/utils.js`.
- Přetahování: `lvDrag` (live), `bindLu` a `matchDrag` (lineup-editor), `teamDrag` (team) používají `core/drag.js` – vlastní zůstala jen pravidla puštění.
- Přejmenováno: `vsOf` v `selectors.js` → `matchesVs` (zápasy proti soupeři), `vsOf` v `cash.js` → `vsHash` (variabilní symbol).
- Komentáře popisují současný stav – historie verzí („v18.4.2: …“, „(v17.7)“) odstraněna ze všech hlaviček a komentářů v `src/` a ze `styles/main.css` (texty nápovědy „od v18.x“ zůstávají – jsou to texty v aplikaci).
- `src/views/report.js`: místní pomocník jména v zápisu utkání přejmenován na `who` (nekoliduje s `nm`).

**Odstraněno**
- `asciiMsg` (`cash.js`, nepoužitá), CSS `.lg.nx-strip` (nepoužitá třída), `export` u funkcí používaných jen ve vlastním souboru: `oppDetail`, `nudgeT`, `lvDrag`, `teamDrag`, `chargeId`, `SPRE`, `RECENT_DAYS`, `dayStr`, `chAfter`, `MIN_SHIFT`, `trOf` (`debtorDoc` zůstává – používají ho testy).

**Beze změny**
- Vzhled a ovládání aplikace, živý zápis (střídání, rotace, tresty, časomíra, góly – v `live-engine.js` jen komentář), statistiky, docházka, dlužníci, pokladna, QR a účty, pravidla databáze, záloha a obnova.

## v18.8.1 (22. 10. 2026) – Oprava: postup zakládání zápasu
> **Nasazení:** jen nahrát kód. Pravidla databáze beze změny (publikovat netřeba), na platby se nesahá. Po otestování může trenér ⚙️ → 🔒 Vyžadovat verzi v18.8.1 (není nutné – tvar dat se nemění, přibyla jen pole `time`, `place`, `dl` u nového zápasu, která už dříve zapisovala úprava v Událostech).

**Opraveno**
- **Nový zápas neměl čas začátku:** okno Nový zápas (Události → + Zápas, i Zápasy → + Nový zápas) má pole **Čas začátku**, **Místo** a **Konečný termín přihlašování** (výchozí den předem v 18:00, při změně data se posune, dokud ho neupravíš ručně). Kontrola: termín musí být nejpozději v čas začátku.
- **Posloupnost přípravy zápasu:** po vytvoření se neotevře karta zápasu se sestavou, ale **detail události** (zápas je zveřejněný, hráčky se přihlašují). Karta zápasu v kroku 1 ukazuje **⏳ Přihlášky** (brankářky / bruslařky, uzávěrka) a dokud přihlášky nestačí na nominaci (1 + 5), místo „Dokončit sestavu“ nabízí **📅 Přihlášky – detail události**; pak **Nominovat z přihlášených →**, potom **Dokončit sestavu →**, ✔ Uzavřít sestavu a Zahájit zápas. Hlavička karty: ✅/⏳ Přihlášky (počet) · Nominace · Sestava; u data i čas a místo.

**Změněno**
- `src/views/modal.js` (okno Nový zápas), `src/views/matches.js` (karta zápasu – postup, hlavička), `src/domain/lineup.js` (nová `signupState`), `src/core/utils.js` (společné `dlDefault`, `dlText`, `dlBeforeStart`), `src/views/events.js` (používá společné pomůcky termínu – chování beze změny), `src/views/help.js` (kapitoly 2 a 4), nový test `tests/match-prep.test.js`, verze (`app-version.js`, `package.json`, `sw.js` cache hokej-v50), `README.md`, `docs/plan-v18.md`.

**Beze změny**
- Nominace (jen přihlášené), sestava, uzavření sestavy, živý zápis, střely, góly, časomíra, tresty, statistiky, pokladna, pravidla databáze.

## v18.8 (22. 10. 2026) – Řád projektu a pojistky (fáze K) – ⚠️ MĚNÍ PRAVIDLA DATABÁZE
> **Postup nasazení (pořadí je důležité):** 1) **publikovat `firestore.rules`** (pokladník a členové, nový `settings/app`), 2) nahrát kód a **smazat `plan-zivy-zapis-v18.md` z kořene** (přesunut do `docs/`), 3) ověřit přihlášení trenéra, hráčky a pokladníka (👁 Náhled role), 4) až budou všechna zařízení na v18.8: trenér ⚙️ → **🔒 Vyžadovat verzi v18.8**.
> Na platby se nesahá: `cash.js`, `bank-account.js`, `mine.js`, `qr-image.js`, `cash-settings.js`, `payments.js` beze změny. Pravidla `charges`, `cash`, `audit`, `evcash`, `debtors` a `settings/cash` beze změny.

**Opraveno (bezpečnost)**
- **Pokladník si mohl dát roli kustod** (nález 1 z kontroly 22. 10. 2026): pravidlo `members` pouštělo pokladníka ke každému členovi, jen ne s rolí trenér – i k vlastnímu dokumentu. Nově pokladník (bez role trenér) smí zakládat, měnit a mazat jen členy s rolí `hracka` (před změnou i po ní) a nikdy vlastní dokument; trenér beze změny. V ⚙️ → Členové týmu má pokladník jen roli Hráčka a tlačítko Odebrat jen u hráček (ne u sebe).

**Přidáno**
- **Brána verze** `settings/app = {minVer, minBy, minAt}`: trenér v ⚙️ → Verze aplikace nastaví **🔒 Vyžadovat verzi** (jen zvýšit, potvrzení druhým klepnutím). Zařízení se starší verzí nic nezapisuje (strážce `blocked()` v `storage.js` – stejné místo jako náhled role: `doc.set`, `add`, `delete`, dávky, členové, obnova zálohy, přepočet dlužníků, zápis zápasu) a nahoře ukáže červený pruh **⚠️ Starší verze aplikace – zápis je zablokovaný · Načíst novou verzi**. Chybějící minimum bránu nezavírá. `settings/app` se ze zálohy neobnovuje ani nemaže. Pravidla: zapisuje jen trenér (jen pole `minVer`, `minBy`, `minAt`, `minBy` = jeho e-mail), nejde smazat. Chrání až od v18.8 – starší verze bránu neznají.
- Nový modul `src/core/app-version.js`: jediné místo s číslem verze (`APP_VERSION`, `APP_DATE`, `APP_LABEL`), porovnání po číslech `cmpVer` (18.10 > 18.9), `isOutdated`, `canRaise`.
- **Automatické testy** `tests/` (39 kontrol, `npm test`, Node 22+, bez balíčků z npm): pokladna (dělení ceny, osvobozené v děliteli, fx, předpisy, úhrady, dluh, zůstatek), QR (alfanumerický text, SPD, okamžitá platba), účty (mod 11, mod 97, IBAN), docházka (sezóna, uplynulé události, procenta), dlužníci (bez částek, ⛓ / 🔓, plán zápisu), živý zápis (počáteční stav, střídání, rotace, Zpět, trest a formace 4 hráček, konec trestu, gól v přesilovce, max. 2 tresty, konec třetiny, časová osa), soulad verze (`app-version.js` = `package.json` = CHANGELOG, README) a pravidla databáze (kontrola textu). Zástupci prohlížeče a Firebase SDK v `tests/support/` – aplikace se kvůli testům nemění.
- `docs/KONVENCE.md` – programovací řád: mapa souborů, závislosti, struktura souboru, data a pravidla (merge, dva kroky, brána verze), verze a vydání, testy, nasazení a návrat, práce s Claude.
- `docs/plan-v18.md` (aktuální plán, dříve `plan-zivy-zapis-v18.md`), `docs/archiv-plan-v18.md` (dokončené fáze A, B, G, P, C, Q a průběžný stav), `docs/archiv-readme-v18.7.1.md` (původní podrobné README).

**Změněno**
- `README.md` zkráceno (66 kB → cca 5 kB): současný stav, spuštění a testy, Firebase, nasazení a návrat, role, odkazy na dokumentaci.
- `src/data/storage.js` (verze z `app-version.js`, brána verze, sekce Verze aplikace v ⚙️, členové pro pokladníka, obnova bez `settings/app`), `src/views/shell.js` (pruh staré verze), `src/views/help.js` (kapitoly 1 a 12), `package.json` (verze 18.8, skript `test`, `engines`), `sw.js` (cache hokej-v49, komentář bez historie).

**Odstraněno**
- `plan-zivy-zapis-v18.md` z kořene repozitáře (obsah v `docs/plan-v18.md` a `docs/archiv-plan-v18.md`) – **smazat ručně**.

**Beze změny**
- Živý zápis, střely, góly, časomíra, tresty, statistiky, docházka, pokladna, QR a účty (logika); vzhled aplikace kromě pruhu staré verze a sekce Verze aplikace v ⚙️.

## v18.7.1 (22. 10. 2026) – ⬇️ Uložení QR do telefonu (fáze Q) – ⚠️ SAHÁ NA PLATBY
> **Pozor – verze sahá na soubor plateb:** `src/views/mine.js` (okno QR v Moje platby) a nový `src/views/qr-image.js`. **Obsah QR se nemění** – obrázek se kreslí z téhož objektu `qrcode`, který okno zobrazí (`spdPay`, `qrMsg`, `PT:IP` beze změny). `bank-account.js`, `cash.js`, `cash-settings.js` a `firestore.rules` se **nemění** – pravidla publikovat netřeba.

**Přidáno**
- **⬇️ Uložit QR** v okně platby pod zobrazeným QR: obrázek PNG ve vysokém rozlišení (QR cca 1000 px) s bílou tichou zónou 4 moduly a popiskem pod kódem – název platby, příjemce (název účtu: Účet týmu / Hlavní / Provozní účet), účet v českém tvaru, IBAN, částka, VS, zpráva pro příjemce (přesně jako v QR), případně okamžitá platba, datum vytvoření. Bez varovného řádku (rozhodnuto 22. 10. 2026).
- Uložení: kde prohlížeč umí sdílet soubor (`navigator.canShare` se souborem – Android, iPhone) systémové **Sdílet** (Uložit do Galerie / poslat do bankovní aplikace); jinde stažení souboru `QR-platba-RRRR-MM-DD-VS.png`. Zrušení sdílení nic nedělá.
- Nový modul `src/views/qr-image.js` (`drawQrCanvas`, `saveQrImage`, `qrFileName`).

**Změněno**
- `src/views/mine.js`: tlačítko a obsluha uložení; tlačítko je jen u zobrazeného QR, tedy až po kontrole účtu (`accCheck`) a po „Ověřila jsem účet“ – u varování ani u chybného účtu se nezobrazí.
- `src/views/help.js` (kapitola 10), `README.md`, `package.json`, `src/data/storage.js` (verze), `sw.js` (cache hokej-v48), `plan-zivy-zapis-v18.md`.

**Beze změny**
- Text a obsah QR, výpočty předpisů, VS, účty a jejich zabezpečení (v18.6.1), docházka a dlužníci (v18.7), živý zápis, statistiky.

## v18.7 (22. 10. 2026) – Docházka a dlužníci pro všechny (fáze C) – ⚠️ SAHÁ NA PLATBY
> **Pozor – verze sahá na soubory plateb:** `firestore.rules` (nová kolekce `debtors`), `src/views/payments.js`, `src/views/money.js`, `src/views/cashbook.js`, `src/data/storage.js` (zápis souhrnu dlužníků ve stejné dávce jako změny předpisů). `bank-account.js`, `mine.js`, `cash.js` a pravidla `settings/cash` z v18.6.1 se **nemění**. Výpočty předpisů, úhrad, VS, QR a účty beze změny.
>
> **Postup nasazení (pořadí je důležité):** 1) **publikovat firestore.rules** (bez nich selže každá dávka s předpisy – úhrada, vyúčtování, příspěvky, storno), 2) nahrát kód, 3) trenér / pokladník: ⚙️ → **⛓ Přepočítat dlužníky** (jednorázové naplnění).

**Přidáno**
- C1 📊 **Docházka** – v Událostech nový přepínač vedle Nadcházející / Minulé / Kalendář, vidí všichni členové, jen ke čtení. Hráčky a realizační tým zvlášť; typ Vše / Tréninky / Domácí zápasy / Venkovní zápasy; sloupce ✅ účast z počtu událostí, %, ❌ nejdu, ❓ nejistá, bez odpovědi; řazení klepnutím na hlavičku (`table-sort.js`).
- Období **Od – Do** (výchozí zimní sezóna 1. 8. – 1. 7. dalšího roku, tlačítko „Tato sezóna“). Počítají se jen uplynulé události (s časem od jeho začátku, bez času po skončení dne). Ukončené hráčky ⛔ jen s odpovědí v období. Důvody omluv se nezobrazují.
- Nová doména `src/domain/attendance.js` (čisté funkce: `seasonOf`, `attEvents`, `pastEvents`, `attSummary`, `hasAnswer`) – použitelná i pro budoucí modul Trénink.
- C2 ⛓ **Dlužníci** – veřejný souhrn bez částek `debtors/{mid} = {mid, since, dues: [{d, x}]}` (splatnosti nezaplacených předpisů a příznak výjimky). Značka ⛓ (mříže) + počet dní po splatnosti u jména v Docházce a v detailu události, 🔓 = po splatnosti s výjimkou (rozhodnutí 6); realizační tým se nezapisuje. V Docházce navíc karta „⛓ Po splatnosti“ seřazená od nejdelšího.
- Nová doména `src/domain/debtors.js` (`debtorDoc`, `debtorPlanFor`, `debtorRebuild`, `debtorState`, `applyDebtors`) a pohled `src/views/attendance.js`.
- ⚙️ → **⛓ Přepočítat dlužníky** (správce pokladny): přepočet souhrnu ze všech předpisů.

**Změněno**
- `firestore.rules`: `debtors` čtou všichni členové, zapisuje jen správce pokladny (`mid` = id dokumentu, jen pole `mid`, `since`, `dues`) → **publikovat firestore.rules**. Pravidla `settings/cash`, `charges` a ostatní beze změny.
- `src/views/payments.js` (uzavření vyúčtování, úhrada, výjimka), `src/views/money.js` (vystavení a smazání příspěvku), `src/views/cashbook.js` (storno úhrady): do stejné dávky přibyl zápis `debtors`.
- `src/data/storage.js`: smazání události s nezaplacenými předpisy přepočítá jejich dlužníky; obnova ze zálohy souhrn dlužníků přepočítá (kolekce `debtors` se nezálohuje); tlačítko přepočtu; verze.
- `src/views/events.js` (přepínač Docházka, značka v detailu), `src/main.js` (odběr `debtors` pro všechny), `src/core/state.js` (`ao`, `dt`, `dtErr`).
- `src/views/help.js` (kapitoly 2 a 12), `README.md`, `package.json`, `sw.js` (cache hokej-v47), `plan-zivy-zapis-v18.md`.

**Beze změny**
- Živý zápis, statistiky, výpočty předpisů a úhrad, QR, účty a jejich zabezpečení (v18.6.1), blokace „Jdu“ (dál podle `debtOf` z vlastních předpisů).

## v18.6.1 (22. 10. 2026) – bezpečné QR platby (oprava po testu v18.6)
**Opraveno**
- mBank hlásil „neplatný QR kód“ (Fio četl správně). QR byl v binárním režimu kvůli malým písmenům a čárkám ve zprávě. Nyní je celý text QR jen ze znaků alfanumerického režimu (VELKÁ písmena bez diakritiky, číslice, mezera, `$ % * + - . / :`), zpráva `qrMsg` bez zdvojených mezer, VS jen číslice, okraj kódu 4 moduly (doporučená tichá zóna).

**Přidáno**
- Účty se zadávají jako české číslo účtu `[předčíslí-]číslo/kód banky` (nebo IBAN); nový modul `src/domain/bank-account.js` dopočítá IBAN a ověří kontrolní součty mod 11 (číslo účtu, váhy ČNB) i mod 97 (IBAN) – výsledek se ukazuje hned při psaní. Neplatný účet nejde navrhnout a QR se z něj nevytvoří.
- Princip čtyř očí: změnu účtů navrhuje jen trenér (`ibanPend`), platí až po potvrzení jiným správcem pokladny (`ibanBy`, `ibanOk`, `ibanAt`). Návrh, potvrzení, zamítnutí a zrušení jdou do auditu (`acc-prop`, `acc-ok`, `acc-no`, `acc-off`), v nastavení je Historie změn účtů. Čekající návrh ukáže správcům pokladny upozornění v Událostech.
- Okamžitá platba: přepínač v Nastavení pokladny (`inst`, výchozí ANO) → `PT:IP` v QR.
- Okno platby: účet v českém tvaru i jako IBAN, datum platnosti účtu (kdo navrhl a potvrdil), vždy upozornění na kontrolu účtu před odesláním a vyloučení odpovědnosti. Zařízení si pamatuje ověřené účty – při novém účtu oproti dřívějšku nebo změně v posledních 14 dnech nejdřív varování, QR až po „Ověřila jsem účet“.

**Změněno**
- `firestore.rules`: `settings/cash` – účty mění jen potvrzený návrh (jiný správce, přesně navržené účty, navrhovatel pod vlastním e-mailem), dokument nastavení pokladny nejde smazat → **publikovat firestore.rules**.
- `src/domain/cash.js`: `qrMsg`, `spdPay` (alfanumerický text, `PT:IP`), `cashCfg` přenáší pole zabezpečení (`accMeta`) a `inst`.
- `src/views/cash-settings.js`: sekce 🏦 Účty pro QR platby (návrh, potvrzení, zamítnutí, historie), přepínač okamžité platby; „Uložit nastavení“ účty nikdy nemění.
- `src/views/mine.js`: okno QR (kontrola účtu, varování o změně, upozornění, alfanumerický režim), zpráva u předpisu stejná jako v QR, upozornění na čekající návrh.
- `src/main.js`: otevřené nastavení pokladny se po změně v databázi překreslí.
- `src/data/storage.js`: obnova ze zálohy účty v `settings/cash` nemění (zůstávají aktuální), verze.
- `src/views/help.js` (kapitoly 10 a 11), `README.md`, `package.json`, `sw.js` (cache hokej-v46), `plan-zivy-zapis-v18.md`.

**Beze změny**
- Výpočty předpisů, úhrady, VS, živý zápis, statistiky. Uložená zpráva předpisu (`msg`) zůstává s diakritikou; převádí se až při zobrazení a v QR.

## v18.6 (22. 10. 2026) – Náhled role pro vývojáře (fáze G)
**Přidáno**
- ⚙️ → **👁 Náhled role** (jen účty v `DEV_EMAILS`, nyní tomaskre@gmail.com): výběr role Hráčka (konkrétní hráčka ze soupisky) / Kustod / Trenér, volitelně člen realizačního týmu (`tid`) a příznak Pokladník. Volba je jen v paměti zařízení (`sessionStorage`, klíč `hk-preview`), databáze `members` se nemění; po spuštění se aplikace načte znovu a role náhledu platí od startu.
- Stálý pruh v horní liště nad záložkami „👁 Náhled: <role / jméno> · … · Ukončit náhled“ (lepí se nahoře spolu se záložkami).
- Jen ke čtení (výchozí, otázka 11): zápis přes `doc.set` / `add` / `delete`, dávky (`batch().commit()`), členy týmu i obnovu ze zálohy blokuje strážce `HK.blocked()` s hláškou „V náhledu se nezapisuje“; `save` a `upd` v `core/actions.js` zápas nezmění ani místně. Zaškrtávátko **Povolit zápis** zápis povolí (pod účtem vývojáře, za vybranou roli).

**Změněno**
- `src/data/storage.js`: náhled role (`isDev`, `pvRead` / `pvWrite`, `ro`, `blocked`, `pvLabel`, `startPreview` / `endPreview`), sekce v ⚙️, role náhledu se nastaví v `boot()` před poslechem dat – `main.js` proto u hráčky čte jen její předpisy (`where mid`) a nečte `cash`, `audit`, `evcash` (stejně jako skutečná role). Odhlášení náhled ukončí. Export `HK.preview`, `HK.ro`, `HK.blocked`, `HK.endPreview`.
- `src/core/actions.js`: `save` a `upd` se strážcem náhledu.
- `src/views/shell.js`: pruh náhledu v `#nav`, obsluha záložek jen na tlačítkách `data-t`.
- `src/views/help.js` (kapitola 12), `README.md`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v45), `plan-zivy-zapis-v18.md`.

**Beze změny**
- Živý zápis, pokladna, statistiky; `firestore.rules` se nemění (publikovat není nutné). Databáze dál čte s právy vývojáře – ověření samotných pravidel jen skutečným testovacím účtem.

## v18.4.2 (22. 10. 2026) – více trestů, ikona gólu a čitelnost (úprava po testu v18.4.1)
**Opraveno**
- Více trestů: po skončení jednoho ze dvou trestů (3 na 5 → 4 na 5) se obrazovka vracela k pětkám, i když hra zůstala v oslabení. Příčina: `unitView` uznal jen jednotku ze skupiny platné situace (OS3 ∉ OS1/OS2) a nabídka jednotky se otevírala jen po zapsání trestu. Nyní se formace řídí počtem našich hráček na ledě (5 = pětky, při přesilovce PP; 4 = OS1/OS2; 3 = OS3/OS4), režim PP/OS trvá s tlačítky a frontami nové skupiny a k pětkám se vrací až při vyrovnané hře.
- Rotující partnerka (`.lrp`) v tmavém režimu nečitelná (barvy pětek `.L1`–`.L4` jí vnutily text bez kontrastu) – vlastní kontrastní barvy pro světlé i tmavé schéma, barva pětky v levém okraji.

**Přidáno**
- Hlídač situace `watchSit` (`live.js`): po každé změně počtů – trest vyprší, gól ukončí trest, ✕ zrušení, ↩ Zpět – při stále nevyrovnané hře s jinou skupinou jednotek hned otevře nabídku jednotky (panel „uask“); při vyrovnané hře otevřenou nabídku zavře. Nepřekryje jiné otevřené okno, nic nezapisuje.
- Góly v průběhu živého zápisu podsvícené: náš gól zeleně, gól soupeře červeně (světlé i tmavé schéma).

**Změněno**
- `src/views/live.js`: `unitView` (stejný druh PP / OS), pořadí front jednotek `unitQueueOrder`, štítek nabídky i při jednotce jiné skupiny, tlačítko „Ponechat <jednotku>“ v nabídce při aktivním režimu, upozornění „Situace se změnila…“, `watchSit`, třídy gólů v průběhu, ikona 🥅.
- Ikona gólu ⚽ → 🥅 (hokejová branka): `live.js`, `live-quick.js`, `src/domain/timeline.js`, `report.js`, `matches.js`, `modal.js`, `help.js`.
- `styles/main.css`: mantinel bílo-modrý (bílá deska, modrý okop), `.lrp` kontrastní barvy, `.lev-gu` / `.lev-go`.
- `src/views/help.js` (kapitoly 5 a 6), `README.md`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v44), `plan-zivy-zapis-v18.md`.

**Beze změny:** `live-engine.js` (zápis trestů, gólů, střel, časomíra, střídání, nasazení jednotky `applyUnit`), odezva z v18.2, rotace z v18.3, hřiště a štítky trestů z v18.4.1, uložená data, pravidla databáze (`firestore.rules` není nutné publikovat).
Ověřeno kouřovým testem v jsdom (44 kontrol – 3 na 5 → 4 na 5 → 5 na 5, PP 5 na 3 → 5 na 4, gól v přesilovce i oslabení, zrušení ✕ při 3 na 5 i 4 na 5, podsvícení gólů, ikona 🥅, styly mantinelu a partnerky).

## v18.4.1 (22. 10. 2026) – kompaktní hlavička živého zápisu (úprava po testu v18.4)
**Změněno**
- `src/views/live.js`: samostatný řádek stavu zrušen – tresty jsou malé štítky velikosti situace přímo v řádku třetiny (`#lchips` = `.lper`: třetina, situace, 🚫 #číslo odpočet ✕, soupeř „Soup.“, délka 2'/5'/10'/DK), stejně malé štítky ⚡ PP / 🛡 OS (nabídka jednotky) a ↩ Řady; jeden řádek s posunem do strany, výška lišty stálá. Hlavička je o řádek nižší.
- `styles/main.css`: štítky v řádku třetiny, nižší dlaždice hráček na ledě v hřišti (64 px místo 92 px, písmo beze změny), mantinel modrý; odstraněn styl `.lchips`.
- `src/views/live-quick.js`: jen komentáře (záblesk po trestu dál míří na `#lchips`).
- `src/views/help.js` (kapitoly 5 a 6), `README.md`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v43), `plan-zivy-zapis-v18.md`.

**Beze změny:** logika živého zápisu z v18.4 a `live-engine.js`, odezva, rotace, uložená data, pravidla databáze (`firestore.rules` není nutné publikovat).
Ověřeno kouřovým testem v jsdom (34 kontrol – kontroly v18.4 + štítky trestů v řádku třetiny, zrušený řádek stavu).

## v18.4 (22. 10. 2026) – hřiště, režim PP/OS a nabídky po trestu a zranění (fáze B4 + úpravy po testu v18.3)
**Opraveno**
- Zranění v oslabení: upozornění na chybějící hráčku na ledě chybělo. Příčina: v `liveTick` podmínka `!(L.pen).some(… x.end==null)` hlášku potlačila, kdykoli náš trest čekal (druhá část 2+2, třetí trest), a hláška byla jen tlumená „ℹ️“ s podmínkou neprázdných front. Nyní se chybějící i přebývající hráčka hlásí vždy jako ⚠️ (kromě ukončeného zápasu).

**Přidáno**
- Nabídka jednotky k odsouhlasení (B4): po zapsání trestu, který změní počty a vytvoří přesilovku / oslabení, se otevře panel s navrženou jednotkou (nejvíc dostupných hráček, přepínač druhé jednotky), vyloučená / ošetřovaná hráčka červeně; ✓ Potvrdit a nasadit (`applyUnit` beze změny), ✏️ Upravit jednotky, Ponechat pětky. Znovu ji otevře tlačítko v řádku stavu.
- Režim PP/OS: je-li nasazená jednotka platné situace, jsou pod mantinelem místo pětek tlačítka jednotek situace a ↩ Řady, fronty jen z jednotek. Po konci nerovnosti se obrazovka sama vrátí k pětkám, upozornění a ↩ Řady v řádku stavu připomenou návrat.
- Po zranění (dočasném i trvalém) se hned otevře Sestava s vyznačeným místem a poznámkou nahoře.

**Změněno**
- `src/views/live.js`: situace v hlavičce vedle třetiny; „hřiště“ `.lrink` (střela soupeře → červená středová čára → hráčky na ledě), mantinel `.lboard`, pod ním pětky / jednotky a fronty (pořadí front z v18.3); řádek stavu `#lchips` = tresty s odpočtem a ✕ + nabídka jednotky / ↩ Řady (situace, 🩹 a tlačítka jednotek z něj odešly); upozornění `#lwarn` v horním řádku průběhu jen když nějaké je (chybí / přebývá hráčka, dlouhé střídání, jednotka po konci nerovnosti, nevybraná brankářka, na trestu, v ošetřování) – „✓ Bez upozornění“ zrušeno. Nové pomocné `grpFor`, `unitView`, `unitLabel`, `proposeUnit`, export `askUnit`.
- `src/views/live-quick.js`: po zapsání trestu volá `askUnit` (zápis `commitEv` beze změny).
- `styles/main.css`: hřiště, středová čára, mantinel, tlačítka režimu PP/OS, vyznačené místo v sestavě, řádky upozornění.
- `src/views/help.js` (kapitoly 5–7), `README.md`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v42), `plan-zivy-zapis-v18.md`.

**Beze změny:** `live-engine.js` (střely, góly, tresty, časomíra, střídání a rotace), odezva z v18.2, ovládání rotace z v18.3, uložená data, pravidla databáze (`firestore.rules` není nutné publikovat).
Ověřeno kouřovým testem v jsdom (32 kontrol: pořadí hřiště a mantinelu, situace v hlavičce, prázdný řádek stavu, nabídka po našem i soupeřově trestu, návrh jednotky bez vyloučené, potvrzení a režim OS / PP, fronty jen z jednotek, zranění v oslabení při 2+2 → upozornění a Sestava s místem, trvalé zranění → prázdné místo, návrat k pětkám po konci nerovnosti, ↩ Řady, záblesk, střely).

## v18.3 (22. 10. 2026) – rozložení B a ovládání rotace (fáze B5 + B3 plánu v18)
**Změněno**
- `src/views/live.js`: jediné rozložení B – horní lišta (čas, skóre) s řádkem stavu `#lchips` pevné výšky (situace, ⚡ PP / 🛡 OS, ↩ Řady, tresty s odpočtem a ✕, 🩹 ošetřování; posouvá se do strany) → STŘELA NA NAŠI BRÁNU → čára → tlačítka pětek → hráčky na ledě → sloupce čekajících pod každým místem (na řadě nahoře, větší). Rozložení A zrušeno (bez volby v nastavení). Pevná místa z v18.2 (`#lpen`, `#lunit`, `#ltmp`, `#lqbox`) nahradil řádek stavu.
- Rotace: dlaždice ve frontě má jedinou akci (na led); štítek ⇄ v dlaždici zrušen. Partnerka = malé tlačítko pod hráčkou – klepnutí pošle rovnou na led (`doSub`), podržení 0,55 s změní pořadí rotace (`swapRot`). Dole ve sloupci partnerka hráčky na ledě (klepnutí ji vystřídá).
- `src/views/live-quick.js`: záblesk po trestu míří na řádek stavu `#lchips`.
- `styles/main.css`: oddíl 8b přepsán pro rozložení B (řádek stavu, čára, pětky, sloupce čekajících, tlačítko partnerky).
- `src/views/help.js` (kapitoly 3 a 5), `README.md`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v41), `plan-zivy-zapis-v18.md`.

**Beze změny:** odezva z v18.2 (vibrace a záblesk), střely, góly, tresty, časomíra, logika střídání a rotace (`putOn`, `swapRot`, `rotate`, `requeue`), uložená data, pravidla databáze (`firestore.rules` není nutné publikovat).
Ověřeno kouřovým testem v jsdom (20 kontrol: pořadí rozložení B, rozložení beze změny po střídání, střele, trestu, jednotce a ošetřování, odezva u všech akcí, klepnutí a podržení partnerky, zapsaná data).

## v18.2 (22. 10. 2026) – pevné rozložení a odezva živého zápisu (fáze B2 plánu v18)
**Přidáno**
- `src/views/live-feedback.js`: `haptic(kind)` (vibrace `tap` / `ok` / `undo` / `err`), `flash(selektor)` a `applyFlash` (zablikání tlačítka, které přežije nové vykreslení), vypínač vibrace (LS `hapticOff`).
- Odezva po střídání (klepnutí i přetažení), střele naší i soupeře, gólu, trestu, nasazení pětky, jednotky, ↩ Zpět na řady a ↩ Zpět; chybová vibrace, když se střídání, pětka nebo jednotka neprovede.
- ⋯ → ⚙️ Nastavení: přepínač „Vibrace: zapnutá / vypnutá“.

**Změněno**
- `src/views/live.js`: vyhrazená místa pevné výšky – tresty `#lpen` (2 tresty, další se posouvají uvnitř), jednotky PP/OS `#lunit` (řádek tlačítek + řádek stavu), ošetřování `#ltmp` (jeden řádek); fronty v rámečku pevné výšky `#lqbox` podle sestavy, řádek na řadě dole u ledu, delší fronta se posouvá uvnitř. Volání odezvy u akcí (logika `doSub`, `doShot`, `doOShot`, `doUndo`, `act`, `applyLine`, `applyUnit`, `toLines` beze změny).
- `src/views/live-quick.js`: odezva po zapsání gólu (zablikání skóre) a trestu (zablikání místa trestů); zápis `commitEv` beze změny.
- `styles/main.css`: oddíl 8b – vyhrazená místa, rámeček front, animace `hc-flash`.
- `src/views/help.js` (kapitola 5 a ⚙️ Nastavení), `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v40), `README.md` (historie přesunuta sem), `CHANGELOG.md` (nový), `plan-zivy-zapis-v18.md`.

**Beze změny:** střely, góly, tresty, časomíra, střídání a rotace, uložená data, pravidla databáze (`firestore.rules` není nutné publikovat).
Ověřeno kouřovým testem v jsdom (18 kontrol: vykreslení, stejné rozložení po střídání, střele, trestu, jednotce a ošetřování, výška rámečku front, odezva u všech akcí, vypnutí vibrace, zapsaná data).

## Starší verze (do v18.1.1, původní zápis z README)
- **v18.1.1 (22. 10. 2026):** oprava tlačítka Zpět (aplikace se zavírala bez dotazu).
  Změněno: `src/core/nav.js` (strážní záznam se doplní jen při skutečném klepnutí `isTrusted` a jen jeden za klepnutí, i při klepnutí do dotazu; posun prstem nic nevkládá; zásoba 5 záznamů; po vyčerpání zásoby vždy dotaz na ukončení), `src/views/help.js`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v39), `README.md`, `plan-zivy-zapis-v18.md`.
  Ověřeno simulací v jsdom s modelem pravidla Chrome (přeskočitelné záznamy). Beze změny: střely, góly, tresty, časomíra, střídání, pokladna a pravidla databáze (`firestore.rules` není nutné publikovat).
- **v18.1 (22. 10. 2026):** fáze B1 plánu v18 a opravy v18.0.
  Změněno: `src/domain/timeline.js` (nová funkce `shiftList` – společné pravidlo střídání; používá ji `shiftStats` i vývoj zápasu), `src/views/report.js` (statistiky zápasu přes `shiftList`), `src/views/stats.js` (celkové statistiky přes `shiftList`), `src/views/live.js` (Průběh místo Poslední akce, pevný řádek upozornění, Čas na ledě přes `shiftList`, nová funkce `leaveLive` – odchod zastaví čas), `src/core/nav.js` (zásoba 3 strážních záznamů doplňovaná při klepnutí – oprava dotazu na ukončení; odchod ze živého zápisu zastaví čas), `src/main.js` (předání `leaveLive`), `src/views/help.js`, `src/data/storage.js` (verze), `package.json`, `sw.js` (cache hokej-v38), `README.md`, `plan-zivy-zapis-v18.md`.
  Beze změny: uložená data střídání, opravy střídání, střely, góly, tresty, pokladna a pravidla databáze (`firestore.rules` není nutné publikovat). Změna chování časomíry jen na výslovné přání: odchod ze živého zápisu zastaví čas.
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

## Starší souhrn (z dřívějšího záhlaví README)
v18.1.1 – oprava tlačítka Zpět: aplikace se už nezavře bez dotazu „Ukončit aplikaci?“ (ani po zavření okna Zpětem, po „Ne“ v dotazu nebo po několika Zpět po sobě). Dříve: v18.1 – **společné pravidlo střídání** (nulové záznamy se vynechají, plynulé pokračování hráčky je jedno střídání – stejně ve všech přehledech), **Průběh v živém zápisu** se všemi kroky včetně střídání a s pevným řádkem upozornění, **odchod ze živého zápisu zastaví čas** a oprava dotazu na ukončení aplikace tlačítkem Zpět. Dříve: v18.0 – **tlačítko Zpět na telefonu funguje uvnitř aplikace** (zavírá okna, panely a detaily, vrací kroky zápasu a záložky; z domovské stránky se zeptá na ukončení; v živém zápisu nic nezapíše ani nezastaví čas). Dříve: v17.7 – **párování plateb a dva účty**: pohyby v pokladně ukazují, za co jsou (VS a zpráva pro příjemce stejná jako v QR), tým může mít hlavní a provozní účet (každý předpis a pohyb má svůj účet, zůstatky po účtech, QR vede na správný účet) a souhrnnou platbu jedním QR lze poslat jen za předpisy na stejný účet; **Soupeři pro všechny členy** s bilancí v seznamu a proklikem na zápis a vývoj jednotlivých zápasů. Dříve: v17.6 – **zpráva pro příjemce u plateb**: každý předpis v Moje platby ukazuje, za co se platí (např. „Zápas 10.10. Sokol - Jana“, „Trénink 14.10. - Jana“, „Příspěvek 10/2026 - Jana“), a stejný text je v QR platbě. Dříve: v17.5 – **přeorganizované zobrazení**: záložka Události řeší jen události (bez výběru „Zapisuji za“), pokladna v detailu události je až na konci stránky a správa pokladny (💰 Platby, 🏦 Pokladna, 📅 Měsíce) se přesunula do záložky Team. Dříve: v17.4 – osvobozené hráčky s vlastním nastavením plateb a koeficient v procentech (0–100 % místo 1 / 0,5 / 0); v17.3 – **modul Pokladna, fáze F4** (měsíční příspěvky, platy realizačního týmu, hospodaření po měsících, CSV export pokladny), **Statistiky pro všechny členy týmu**, úklid projektu (odstraněn samostatný návod, počáteční data a kód migrací) a opravy nalezených chyb. Dříve: v17.2 – **Pokladna F3** (Moje platby, QR platba, blokace „Jdu“, výjimky, chráněná kolekce `evcash`); v17.1 – **Pokladna F2** (úhrady, vklady, výdaje, kategorie, zůstatek, storno); v17.0 – **Pokladna F1** (osoby a role, koeficient fx, nastavení a šablony, výpočet a uzavření vyúčtování → předpisy, migrace plateb); v17.0.1 a v17.0.2 – opravy načítání; v16.3 – přehled plateb a dlužných částek, oprava výpočtu ceny na osobu a přihlášení trenérů a kustodů do událostí sami za sebe; v16.2 – platby za události a realizační tým; v16.1 – přihlášení hráček; v16.0 – modul Události a docházka; v15.7 – přehled Čas na ledě; v15.6 – oprava přesilovek a oslabení; v15.5 – přepracovaná logika střídání a rotace; v15.4 – oprava nasazování jednotek; nápověda v aplikaci (tlačítko ❓), průměrná délka střídání v celkových statistikách a řazení tabulek klepnutím na hlavičku.
