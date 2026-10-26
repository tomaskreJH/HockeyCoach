# Ruční testy na Androidu – modul Trénink (v21.3 – v21.7)

Kontrolní seznam pro test na telefonu po nasazení. Automatické testy (`npm test`) a kouřový test v jsdom ověřují výpočty a zápisy,
**ne** skutečné chování telefonu, pravidla databáze, vibrace, oznámení ani hodinky – to ověří jen tento seznam.
Po každé verzi se doplní nová sekce (postup vydání v `docs/KONVENCE.md`, kap. 4). Výsledek zapiš do vlákna: číslo kroku + ✅ / ❌ + co se stalo.

## 0. Příprava (jednou)
- [ ] **Pravidla publikovaná** (Firebase konzole → Firestore → Rules): v souboru je `match /trms/` (v21.4) a `match /treval/` (v21.6). Bez nich nefunguje měření a hodnocení.
- [ ] Na všech telefonech ⚙️ → 👤 Účet → **Načíst novou verzi** – v záhlaví je nejnovější verze.
- [ ] Zařízení: **A** = tvůj telefon (manager / trenér), **B** = druhý telefon nebo PC (jiný účet realizačního týmu, nebo stejný účet), ideálně i **testovací účet hráčky**. Jinak 👁 Náhled role (⚙️ → 🛠 Vývojář).
- [ ] Testovací trénink **dnes** (nebo zítra), přihlášené aspoň 6 hráček v poli + 1 brankářka + 2 trenéři (✅ Jdu).
- [ ] V 📚 Cvičení aspoň 3 cvičení, z toho 1 s ⏲ měřením (např. ze 📥 Základní sady – sprint).

## 1. v21.3 – rozdělení do pětek, ⭐ výkonnost, plán podle postů
| # | Postup | Očekávaný výsledek |
|---|---|---|
| 1.1 | Detail tréninku → Rozdělení do pětek → ⭐ **Výkonnost** → u hráček nastav 1–5, zavřít | Uloží se, po znovuotevření hodnoty zůstanou. Hráčka (👁 náhled) tlačítko ⭐ nevidí. |
| 1.2 | Rozdělit automaticky: postupně **Vyrovnaně / Podle výkonnosti / Střídavě / Základní formace**, 2 → 3 → 4 pětky, ⚔ poměr útok / obrana | Pokaždé se hráčky rozdělí (barvy pětek), souhrn pětek ukáže počty a ⭐. Brankářky zůstanou mimo pětky. |
| 1.3 | Ručně přesunout hráčku do jiné pětky (−, 1–4) | Změna se uloží, na B se objeví do pár sekund. |
| 1.4 | Plán → ✏️ → blok → ⚙ Další volby → skupiny **⚔ Útok / obrana** → 💾 | V kartě plánu linky s ⚔ Útočnice / 🛡 Obránkyně. |

## 2. v21.3 – ⏱ živý trénink (nejdůležitější, zatím netestováno)
| # | Postup | Očekávaný výsledek |
|---|---|---|
| 2.1 | Plán: blok 👥 Společně 2 min + blok 🔄 Stanoviště 4 min se 2 stanovišti (A, B) + linka 🥅. U stanoviště A trenér = ty. | Rozpis točení A/B se 2 koly po 2 min. |
| 2.2 | A: ⏱ **Živý trénink** → ▶ **Spustit trénink** | Velký odpočet 2:00 běží, „řídí ty“. Obrazovka nezhasíná. |
| 2.3 | B: otevřít stejný trénink → ⏱ Živý trénink | Stejný čas (rozdíl max. 1–2 s), B nemá ovládání, pokud nesmí upravovat plán. |
| 2.4 | Počkat do 1:00 a 0:10 | Vibrace + pípnutí (🔔). Číslo oranžové pod 60 s, červené pod 10 s. 🔕 vypne zvuk. |
| 2.5 | Konec kola / bloku | Dlouhé pípnutí, přepne se blok / kolo, „📍 Moje stanoviště“ ukáže tvou linku a skupinu (jména hráček). |
| 2.6 | ⏸ Pauza → na B se zastaví → ▶ Pokračovat | Obě zařízení stojí / běží stejně. |
| 2.7 | ⏭ Další, ⏮ Zpět, +1 min, +5 min | Skok na začátek dalšího / tohoto kola, prodloužení se projeví na obou. |
| 2.8 | B (trenér): klepnout na ⏸ | Hláška o převzetí řízení, druhé klepnutí převezme („řídí ty“ na B). |
| 2.9 | ✕ Zavřít na A, za chvíli znovu otevřít | Hodiny běží dál, čas sedí. |
| 2.10 | Tlačítko Zpět na telefonu v živém tréninku | Zavře obrazovku živého tréninku (ne aplikaci). |
| 2.11 | Hráčka (účet nebo 👁 náhled): ⏱ Živý trénink | Vidí odpočet a svou linku / skupinu, **žádné ovládání**. |
| 2.12 | ⏹ Konec (druhým klepnutím) | „Plán skončil“, na B taky. ↺ Spustit znovu od začátku funguje druhým klepnutím. |

## 3. v21.4 – ⌚ oznámení, ⏲ stopky a výsledky, ⏱ čas bloku
| # | Postup | Očekávaný výsledek |
|---|---|---|
| 3.1 | Živý trénink → ⌚ → povolit oznámení | Tlačítko ⌚✓. |
| 3.2 | Spustit, telefon nechat **svítit** | 60 s / 10 s před koncem a při točení přijde oznámení („⏱ Ještě 1:00 · …“, „▶ Teď: Stanoviště B · …“). |
| 3.3 | Hodinky (Garmin Connect → oznámení z Chrome povolené) | Stejná oznámení na hodinkách. U řídícího v oznámení ⏸ Pauza / ⏭ Další – klepnutí ovládá hodiny. |
| 3.4 | Telefon zhasnout na 2–3 min | Oznámení přijde (může se zpozdit až o ~70 s). Zapiš skutečné zpoždění. |
| 3.5 | Plán → ✏️ → nový blok → vybrat cvičení | ⏱ čas převezme délku z banky; rychlá volba 15 → výběr jiného cvičení čas nezmění. |
| 3.6 | Karta plánu → ⏲ Výsledky měření → ⏲ **Měřit** → ▶ Start všech → klepat na jména | Každé zastavení = pokus, vibrace, ⭐ nejlepší. ↩ smaže poslední (druhým klepnutím). |
| 3.7 | U cvičení s počtem / body: −/+ nebo číslo → ✓ Zapsat | Pokus se uloží. Neplatné číslo → hláška. |
| 3.8 | Měřit současně na A i B (jiné hráčky) | Výsledky se nepřepíšou, v kartě jsou všechny. |
| 3.9 | V živém tréninku u mé měřené linky ⏲ **Stopky** | Otevřou se stopky jen s hráčkami mé skupiny v tomto kole. |
| 3.10 | Hráčka: karta ⏲ Výsledky měření | Pořadí týmu, svůj řádek zvýrazněný, **bez** ⏲ Měřit. |
| 3.11 | ⚙️ → 🔐 Práva rolí → asistent: vypnout ⏲ Měření a ⭐ hodnocení → uložit; asistent (náhled) | Asistent výsledky vidí, měřit / hodnotit nesmí. Pak vrátit. |

## 4. v21.5 – telefon bez posunu do strany, ✨ Připravit trénink
| # | Postup | Očekávaný výsledek |
|---|---|---|
| 4.1 | Projít: 🏠, Události, detail tréninku s plánem (stanoviště A/B/C), ✏️ úprava plánu, živý trénink, stopky, Team (Cvičení, Platby, Pokladna, Měsíce, Rozpočet), ⚙️ | Stránku **nejde posunout do strany**; dlouhý název cvičení ve výběru je zkrácený „…“. |
| 4.2 | Statistiky – široké tabulky | Posouvají se do strany jen uvnitř své karty. |
| 4.3 | Nový trénink bez plánu, s přihlášenými → ✨ **Připravit trénink** | Hláška „Pětky rozděleny: …“ (jen když ještě nikdo není v pětce), otevře se plán s ⧉ Jako minule a 📑 Šablona → vybrat → 💾 Uložit. Už rozdělené pětky se nepřepíšou. |
| 4.4 | ✏️ Upravit plán → blok | Vidíš jen cvičení, ⏱ čas a skupiny; ⚙ **Další volby** otevře režim, skupiny, točení, trenéry, souběžnou linku. Blok, který je používá, má volby otevřené sám. |

## 5. v21.6 – ⭐ hodnocení (od v21.7 po hráčkách – viz sekce 7; kroky 5.2–5.7 platí jen pro v21.6)
| # | Postup | Očekávaný výsledek |
|---|---|---|
| 5.1 | Karta plánu (trénink dnes nebo dřív) | Pod výsledky měření rozbalená karta **⭐ Hodnocení cvičení · neohodnoceno N z M** (budoucí trénink sbalená). |
| 5.2 | U stanoviště klepnout 🙂 | Vybrané se zvýrazní, počet „neohodnoceno“ klesne; na B do pár sekund stejné. |
| 5.3 | Klepnout znovu na 🙂 | Hláška „Hodnocení zrušeno“, stanoviště zase neohodnocené. |
| 5.4 | 📝 Poznámka a hráčky → napsat poznámku → u 2 hráček smajlík, u jedné 📝 poznámka → ✕ Hotovo | V kartě pod linkou „📝 poznámka · 👤 jména a smajlíky“. Zpět na telefonu okno zavře. |
| 5.5 | Živý trénink, ty trenér stanoviště A; počkat na konec kola | Pod ovládáním **⭐ Jak šlo cvičení? (kolo, které skončilo)** s velkými smajlíky jen pro tvé stanoviště z předchozího kola. Klepnutí = uloženo (tlačítka se zmenší, ✓). |
| 5.6 | Asistent bez přiřazené linky v živém tréninku | Výzva ukáže všechny linky předchozího kola. |
| 5.7 | ⏹ Konec plánu | Výzva pro poslední kolo + „Neohodnoceno N – poznámky a hráčky doplníš v detailu tréninku“. |
| 5.8 | Hráčka / hostující (účet nebo náhled) | Karta ⭐ Hodnocení **není**, výzva v živém tréninku **není**. |
| 5.9 | 🔐 asistent bez ⭐ hodnocení (viz 3.11) | Asistent kartu vidí jen ke čtení (bez tlačítek), výzva v živém tréninku není. |
| 5.10 | ⚙️ → 💾 Data → Stáhnout zálohu | V záloze je `treval` (otevřít soubor, hledat „treval“). |
| 5.11 | Pravidla nepublikovaná (jen pokud se testuje před publikováním) | Karta ukáže „Hodnocení se nepodařilo načíst… v21.6“, nic jiného se nerozbije. |

## 7. v21.7 – trénink jednodušeji
| # | Postup | Očekávaný výsledek |
|---|---|---|
| 7.1 | Detail tréninku | Hlavička: den a datum, název, 🕔 čas · ⏰ sraz, 📍 místo, ✅ / ❓ / ❌ počty, „Útočnice: … · Obránkyně: … · Brankářky: … · Trenéři: …“ (bez slova Přihlášeno). Pod tím pětky, plán; docházka níž; dole ⚙ Úpravy události (rozbalit → ✏️ / ❌ / 🗑). |
| 7.2 | Nadpisy karet (Docházka, Rozdělení do pětek, Plán tréninku, Team, Statistiky …) | Záhlaví karty je podbarvené, bloky jsou na první pohled oddělené. Tmavý režim čitelný. |
| 7.3 | Hráčka (účet / náhled): detail tréninku | V hlavičce „Tvoje odpověď“ s ✅ ❓ ❌ – odpoví bez posouvání dolů. |
| 7.4 | Rozdělení do pětek, když už jsou rozdělené | Panel „↻ Rozdělit automaticky“ je sbalený; rozbalit klepnutím – zůstane otevřený. |
| 7.5 | ⭐ Výkonnost → dole v seznamu klepnout na hvězdy u několika hráček | Seznam **neskočí nahoru**, zůstává na místě. |
| 7.6 | ❌ Zrušit (v ⚙ Úpravy události) → formulář s důvodem | Formulář se ukáže dole pod úpravami, zrušení i obnovení funguje jako dřív. |
| 7.7 | Živý trénink, po skončeném kole | „⭐ Jak šlo hráčkám?“ – seznam hráček tvého stanoviště z kola, řádek = jméno + 4 smajlíky. Klepnutí označí (vibrace), opětovné klepnutí zruší. Žádné psaní. |
| 7.8 | Detail tréninku → ⭐ Hodnocení hráček | „neohodnoceno N z M“; stanoviště jako rozbalovací řádky (první neohodnocené otevřené); 📝 u hráčky = poznámka, 📝 Poznámka ke cvičení; uložení hned, na B se objeví. |
| 7.9 | ⏲ Stopky s 10–12 hráčkami | Řádky kompaktní – na obrazovku se vejde ~10 hráček; klepnutí na řádek = start / stop, ↩ vpravo smaže poslední pokus (druhým klepnutím). |
| 7.10 | ✏️ Upravit plán → u cvičení tlačítko 📚 | Okno s 🔍 hledáním (diakritika nevadí: „strel“ najde Střelba), část tréninku, dovednost, ⭐ oblíbená; klepnutí vybere a vrátí se do plánu na stejné místo; Zpět okno zavře. |
| 7.11 | Cvičení s odkazem na YouTube / Google Disk (video, PDF) / .mp4 | V okně cvičení (plán i banka) ▶ Přehrát video / 📄 Zobrazit PDF → přehraje se přímo v aplikaci; „otevřít zvlášť ↗“ otevře v novém okně. Soubor na Disku musí mít sdílení „Kdokoli s odkazem“. |

## 8. v21.8 – živý trénink podle skutečnosti, ☕ pauza, HockeyCoach
Předpoklad: pravidla v21.8 publikovaná, na všech telefonech realizačního týmu v21.8 (pak manager 🔒 Vyžadovat verzi 21.8).

| # | Postup | Očekávaný výsledek |
|---|---|---|
| 8.1 | Otevřít aplikaci | Záhlaví „🏒 HockeyCoach“, přihlašovací obrazovka i titulek okna HockeyCoach. Ikona na ploše má nový název až po přeinstalaci. |
| 8.2 | Události – seznam | Karta: „🏒 Trénink · Po 27. 10.“ v jednom řádku, pod tím čas, sraz, místo (bez data), počty bez slova „Přihlášeno“. |
| 8.3 | Detail tréninku | Hlavička podbarvená, první řádek název · datum. **👥 Docházka** sbalená, v záhlaví ✅ ❓ ❌ (🚫). Rozbalit → klepnout na odpověď / 🚫 → zůstane rozbalená. Jiná událost → zase sbalená. |
| 8.4 | Team → Soupiska / Realizační tým | Vpravo malá tlačítka ✏️ a 🗑, text se nezalamuje do více řádků. 🗑 → „🗑 Smazat?“ → druhé klepnutí smaže (zkoušej na testovací hráčce). |
| 8.5 | ✏️ Upravit plán → **+ ☕ Pauza** | Nový blok „☕ Pauza“ s popiskem „Pití“ (lze přepsat) a časem 3 min (2 / 3 / 5 / 10, −/+), ↑ ↓ 🗑. Uložit → v kartě šedý řádek „☕ Pití · 3 min“, časy dalších bloků se posunou. Bez upozornění „bez cvičení“. |
| 8.6 | Hráčka (účet / 👁 náhled): detail tréninku s plánem | Plán vidí, u „Tvoje skupina“ text „🎽 vezmi si modrý dres“ (podle pětky). Tlačítko **⏱ Živý trénink tam není.** |
| 8.7 | Trenér: ⏱ Živý trénink → ▶ Spustit | Pod časem řádek „do konce tréninku m:ss · plán sedí / plán přetahuje o N min / rezerva N min“ (podle konce tréninku v události). |
| 8.8 | ⏸ Pauza na 2 min, pak ▶ | „plán přetahuje“ vzroste o ~2 min. |
| 8.9 | **✂ −1 min** | Odpočet kola se zkrátí o minutu; při méně než minutě do konce kola začne hned další kolo / blok. |
| 8.10 | Dole **📋 Zbytek plánu** (při přetahování je rozbalený sám) | Seznam dalších bloků s minutami. − / + změní minuty (a „(plán N)“), ⏭ blok přeškrtne (↩ Vrátit ho vrátí). „Zbývá plán“ i „přetahuje“ se hned přepočítají. Běžící blok v seznamu není. |
| 8.11 | Druhý telefon (jiný trenér) | Vidí stejný čas i úpravy (vypuštěný blok se přeskočí). Úprava ze druhého telefonu se zeptá na převzetí řízení (druhé klepnutí). |
| 8.12 | Plán po tréninku (✏️ Upravit) | Uložený plán je beze změny (vypuštění / zkrácení platilo jen pro živý průběh). ↺ Spustit znovu začne bez úprav. |
| 8.13 | ☕ Pauza v živém tréninku | Velký nápis „☕ Pití“, ⌚ oznámení „☕ Pauza“; výzva ⭐ „Jak šlo hráčkám?“ nabídne cvičení **před** pauzou. |

## 9. v21.9 – 🏃 štafeta ve stopkách
Předpoklad: cvičení s měřením času (banka → cvičení → měření „s“, nižší je lepší) v plánu tréninku, přihlášené aspoň 4 hráčky.

| # | Postup | Očekávaný výsledek |
|---|---|---|
| 9.1 | Detail tréninku → ⏲ Výsledky měření → ⏲ Měřit (nebo ⏲ Stopky v živém tréninku) | Nahoře přepínač ⏱ Jednotlivě / 🏃 Štafeta (u počtů a bodů není). |
| 9.2 | 🏃 Štafeta | Skupiny A a B předvyplněné střídavě. Skupin 2 / 3 / 4 změní počet, 🔀 Střídavě rozdělí znovu. |
| 9.3 | Klepnout na skupinu A, pak na jména | Jméno se přesune na konec skupiny A s pořadím (1., 2. …); klepnutí na jméno ve skupině ho vyřadí do Nezařazených. |
| 9.4 | ▶ Start štafety | Velká tlačítka A, B: jméno běžící hráčky, 1/3, „další …“, čas úseku velký a celkem malý – běží. |
| 9.5 | Klepnout na A (předávka), omylem ještě jednou → ↩ | Předávka: na A běží další hráčka a úsek od nuly; ↩ vrátí poslední předávku (běží zase předchozí). |
| 9.6 | Dokončit všechny skupiny | „✅ Doběhly všechny skupiny – uloženo“, pořadí skupin s časy a časy úseků hráček. V tabulce výsledků mají hráčky nový pokus (svůj úsek), pod tabulkou „🏃 Štafeta 1×“ s časy A / B a jmény. |
| 9.7 | ↺ Znovu / ✎ Upravit skupiny | Nový běh se stejnými skupinami / návrat k rozdělení. |
| 9.8 | Během štafety ✕ Hotovo | Zeptá se („Běží stopky – zavřít?“), druhé klepnutí zavře bez uložení. ✕ Zrušit štafetu taky druhým klepnutím. |
| 9.9 | Hráčka (náhled) – detail tréninku | Vidí výsledky měření i řádek 🏃 Štafeta (jen čtení). |

## 10. v21.9.1 – hrající člen realizačního týmu se hlásí jako hráčka
Předpoklad: publikovaná pravidla v21.9.1, členka s rolí Asistent (nebo Trenér) + 💰 Pokladník, propojená s členem realizačního týmu.

| # | Postup | Očekávaný výsledek |
|---|---|---|
| 10.1 | Manager: ⚙️ → Členové týmu → + Přidat člena ručně, role Asistent | Pod rolí výběr „— je zároveň hráčka (volitelné) —“, člen realizačního týmu a Pokladník. U role Hráčka „— vyber hráčku —“. |
| 10.2 | Zadat e-mail členky, roli Asistent, její hráčku, člena týmu, Pokladník → Přidat člena | V seznamu členů: „Asistent · #číslo jméno · 🎓 jméno · 💰 pokladník“. Hostující hráčku 🎟 nejde vybrat (hláška). |
| 10.3 | Členka: Načíst novou verzi, Události → karta nadcházejícího tréninku → ✅ Jdu | Přihlásí se **jako hráčka** (v docházce u hráček, počty Útočnice / Obránkyně se zvednou, ne Trenéři). |
| 10.4 | Členka: detail události | Nahoře „Tvoje odpověď“ s jejím řádkem hráčky; v 👥 Docházce smí dál odkliknout i sebe jako člena týmu (odpověď zvlášť). |
| 10.5 | Členka: Moje platby | Vidí předpisy za hráčku i za člena týmu, bez chybové hlášky. |
| 10.6 | Trenér bez propojené hráčky: karta události | Rychlá tlačítka za člena realizačního týmu jako dřív. |

## 11. v22.0 – 🔁 řada cvičení v lince
Předpoklad: trénink s plánem, přihlášené hráčky i brankářka, přihlášený hlavní trenér a asistent; v bloku 👥 Společně souběžná linka 🥅 brankářek (⚙ Další volby → + Souběžná linka, skupina 🥅) a u ní 🎓 asistent.

| # | Postup | Očekávaný výsledek |
|---|---|---|
| 11.1 | Trenér: ✏️ Upravit → blok 15 min → linka hráček → 🔁 Víc cvičení s vlastním časem | Dvě cvičení: dosavadní (10 min) a nové prázdné (5 min); „Součet 15 z 15 min ✓“. |
| 11.2 | Vybrat 2. cvičení, změnit časy −/+, ↑ pořadí, + Cvičení | Čas z banky se převezme, dokud ho neměníš; součet se přepočítá; přes 15 min „⛔ … blok jen 15 min“ a v kontrole plánu ⛔. |
| 11.3 | 💾 Uložit plán → karta plánu | U linky „🔁 2 cvičení“ a pod ní čas začátku, cvičení a délka; klepnutí na cvičení otevře jeho okno. |
| 11.4 | Asistent: ✏️ Upravit | Linka brankářek s ⭐; přepínač ⭐ Jen moje linky – ostatní bloky jen ke čtení. Naplánuje 4 cvičení brankářek v 15 min a uloží. |
| 11.5 | Trenér měl úpravu otevřenou už předtím, změní délku jiného bloku a uloží | Hláška „… mezitím plán změnil; cvičení jeho linek zůstala“; v kartě jsou cvičení brankářek od asistenta i nová délka bloku. |
| 11.6 | ⏱ Živý trénink (trenér) v bloku s řadou | Nahoře „🔁 moje cvičení 1/2“, velký odpočet do konce cvičení, menší „do konce bloku“; seznam řady s ▶; „Za m:ss → 🔁 cvičení 2/2“. 60 s a 10 s před koncem cvičení vibrace / ⌚ oznámení. |
| 11.7 | Asistent ve stejném bloku | Odpočet podle cvičení brankářek (jiné časy); po skončeném cvičení výzva ⭐ „Jak šlo hráčkám?“ s brankářkami. |
| 11.8 | Po tréninku: ⭐ Hodnocení cvičení | Každé cvičení řady zvlášť („Blok 1 · 🥅 Brankářky · 2/4“). |

## 6. Rychlá kontrola, že se nic nerozbilo (po každé verzi, 5 minut)
- [ ] 🏠 Domů se načte bez chyby, nadcházející události a moje platby.
- [ ] Události: odpověď ✅ / ❌ / ❓ u tréninku a zápasu, počty v tlačítkách.
- [ ] Zápas: sestava a 🔴 živý zápis – gól, střela, trest, časomíra (start / stop).
- [ ] Statistiky a Soupeři se otevřou.
- [ ] Team → Pokladna / Platby (správce pokladny) se otevřou, Moje platby u hráčky.
- [ ] ⚙️ všechny sekce se otevřou, 🔐 Práva rolí – přehled.
