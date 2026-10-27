# Stav projektu HockeyCoach

Krátký vstup pro každé vlákno. Aktualizuje se s každou verzí (nahradit, ne přidávat historii – ta je v `CHANGELOG.md`).

## Verze
- **Aktuální:** v22.10 (27. 10. 2026) – 🖐 K2 krok 1: nový trénink / zápas předvyplněný podle posledního, omluva jedním klepnutím na důvod (poslední vlastní důvody v zařízení), 🔁 série s poslední šablonou. Předtím v22.9: 📉 D2 okno událostí a docházky. Cache `hokej-v107`.
- **Další číslo:** v22.11 (cache `hokej-v108`), opravy v22.10.x; čísla verzí i cache jen rostou.
- **Pravidla databáze:** v22.10 beze změny (naposledy publikovat v22.7 – blok `attlog`).
- **🔒 Vyžadovat verzi:** 22.9 (ruční test v22.9 bez nálezu, 27. 10. 2026). v22.10 nevyžaduje.

## K testu
- v22.1 – v22.1.2 – jen rychlá kontrola (`docs/testy-rucni.md`, kap. 1–4). Ostatní verze uživatel 26. 10. 2026 ohlásil jako funkční.
- v22.1.3 – nasazena, základní funkčnost odpovídá (26. 10. 2026), úplný test chybí (`docs/testy-rucni.md`, kap. 5).
- v22.2 – ▶ Teď, ☑ Hromadně, výpis z banky (`docs/testy-rucni.md`, kap. 6). U výpisu ověřit CSV z banky týmu.
- v22.3 – 🕘 Historie placení, ⚙ Sloupce výpisu (kap. 7).
- v22.4 – stav na kartě události, ⚖️ detail tarifu, 🔓 Výjimky (kap. 8).
- v22.5 – 🔁 převod, datum platby, 🧾 Náklady, QR s číslem účtu, ➕ příjem z výpisu (kap. 9). Import výpisu (v22.2) uživatel zatím neověřil.
- v22.6 – 📈 Statistiky → 🏒 Trénink (kap. 10).
- v22.7 – 🕘 Historie přihlášek (kap. 11).
- v22.8 – 📉 Čtení databáze (kap. 12): čísla dodána (969 / hráčka 542, 27. 10. 2026).
- v22.9 – uživatel 27. 10. 2026 ohlásil jako funkční (bez nálezu); čísla z 📉 poslat, až budou (podklad pro D3).
- v22.10 – ↺ předvyplnění tréninku a zápasu, omluva klepnutím na důvod (kap. 14).

## Další krok
1. **K2** – schválen celý seznam v pořadí 1–7 (27. 10. 2026); 1 hotovo v22.10, **další v22.11 = 2 🏠 Domů** (Chybí odpověď, 📲 připomenutí).
2. **D3** jen podle čísel z 📉 (zabalení uzavřených měsíců docházky).
3. Pak N, P2, G (odloženo), M poslední.

## Trvalá rozhodnutí uživatele
- Aplikace je pomocník: trenér trénuje, ne ovládá aplikaci (příprava doma, na ledě minimum). Když je něco komplikované, upozornit.
- Hráčky vidí výsledky měření a co se trénuje, **hodnocení trenérů nikdy**. Porovnání způsobu placení zatím jen pokladník (⚖️ Tarify), hráčka vidí své platby a docházku. Hráčky živý trénink nepotřebují.
- Na telefonu jen svislý posun (výjimka široké tabulky v `.tw`).
- Aktuální a přehledné informace i při šetření čtení (27. 10. 2026). Nízké náklady (tarif Spark – hlídat 📉 čtení, 27. 10. 2026 bylo 30 000 čtení za den při vývoji), šetření limitu Claude. Jiný klub úplně poslední.
- Drobné úpravy přidávat k nejbližší větší verzi; po nasazení verze se pod stejným číslem nic nemění.
- Videa a PDF cvičení na týmovém Google účtu, spravuje manager.

## Odložené drobnosti
Seznam je v `docs/plan.md` (kap. Otevřené drobnosti).
