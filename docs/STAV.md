# Stav projektu HockeyCoach

Krátký vstup pro každé vlákno. Aktualizuje se s každou verzí (nahradit, ne přidávat historii – ta je v `CHANGELOG.md`).

## Verze
- **Aktuální:** v22.7 (27. 10. 2026) – 🕘 historie přihlášek u události (kolekce `attlog`: kdy se kdo přihlásil, omluvil, odpověď zrušil, 🚫; kdo zapisoval za koho; čte manager, trenér, asistent). Předtím v22.6: E5 📈 Statistiky → 🏒 Trénink. Cache `hokej-v104`.
- **Další číslo:** v22.8 (cache `hokej-v105`), opravy v22.7.x; čísla verzí i cache jen rostou.
- **Pravidla databáze:** v22.7 nový blok `attlog` – **publikovat před nahráním kódu** (bez nich se historie nezapisuje, přihlašování funguje dál).
- **🔒 Vyžadovat verzi:** naposledy 22.0. Doporučeno 22.7 po aktualizaci zařízení (starší verze změny do historie nezapisují).

## K testu
- v22.1 – v22.1.2 – jen rychlá kontrola (`docs/testy-rucni.md`, kap. 1–4). Ostatní verze uživatel 26. 10. 2026 ohlásil jako funkční.
- v22.1.3 – nasazena, základní funkčnost odpovídá (26. 10. 2026), úplný test chybí (`docs/testy-rucni.md`, kap. 5).
- v22.2 – ▶ Teď, ☑ Hromadně, výpis z banky (`docs/testy-rucni.md`, kap. 6). U výpisu ověřit CSV z banky týmu.
- v22.3 – 🕘 Historie placení, ⚙ Sloupce výpisu (kap. 7).
- v22.4 – stav na kartě události, ⚖️ detail tarifu, 🔓 Výjimky (kap. 8).
- v22.5 – 🔁 převod, datum platby, 🧾 Náklady, QR s číslem účtu, ➕ příjem z výpisu (kap. 9). Import výpisu (v22.2) uživatel zatím neověřil.
- v22.6 – 📈 Statistiky → 🏒 Trénink (kap. 10).
- v22.7 – 🕘 Historie přihlášek (kap. 11).

## Další krok
1. **K2** – 🖐 komfort celé aplikace: nejdřív návrh seznamu ke schválení (`docs/plan.md`).
2. Pak N, P2, G (odloženo), M poslední.

## Trvalá rozhodnutí uživatele
- Aplikace je pomocník: trenér trénuje, ne ovládá aplikaci (příprava doma, na ledě minimum). Když je něco komplikované, upozornit.
- Hráčky vidí výsledky měření a co se trénuje, **hodnocení trenérů nikdy**. Porovnání způsobu placení zatím jen pokladník (⚖️ Tarify), hráčka vidí své platby a docházku. Hráčky živý trénink nepotřebují.
- Na telefonu jen svislý posun (výjimka široké tabulky v `.tw`).
- Nízké náklady (tarif Spark), šetření limitu Claude. Jiný klub úplně poslední.
- Drobné úpravy přidávat k nejbližší větší verzi; po nasazení verze se pod stejným číslem nic nemění.
- Videa a PDF cvičení na týmovém Google účtu, spravuje manager.

## Odložené drobnosti
Seznam je v `docs/plan.md` (kap. Otevřené drobnosti).
