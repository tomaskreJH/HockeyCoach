# Ruční testy na Androidu – modul Trénink (v21.3 – v21.6)

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

## 5. v21.6 – ⭐ hodnocení cvičení
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

## 6. Rychlá kontrola, že se nic nerozbilo (po každé verzi, 5 minut)
- [ ] 🏠 Domů se načte bez chyby, nadcházející události a moje platby.
- [ ] Události: odpověď ✅ / ❌ / ❓ u tréninku a zápasu, počty v tlačítkách.
- [ ] Zápas: sestava a 🔴 živý zápis – gól, střela, trest, časomíra (start / stop).
- [ ] Statistiky a Soupeři se otevřou.
- [ ] Team → Pokladna / Platby (správce pokladny) se otevřou, Moje platby u hráčky.
- [ ] ⚙️ všechny sekce se otevřou, 🔐 Práva rolí – přehled.
