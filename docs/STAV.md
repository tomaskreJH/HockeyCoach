# Stav projektu HockeyCoach

Krátký vstup pro každé vlákno. Aktualizuje se s každou verzí (nahradit, ne přidávat historii – ta je v `CHANGELOG.md`).

## Verze
- **Aktuální:** v22.2 (26. 10. 2026) – ⏱ ▶ Teď (skok na blok živého tréninku), Team → 💰 Platby → ☑ Hromadně (více úhrad najednou, 🏦 párování výpisu z banky CSV). Cache `hokej-v99`.
- **Další číslo:** v22.3 (cache `hokej-v100`), opravy v22.2.x; čísla verzí i cache jen rostou.
- **Pravidla databáze:** publikovaná v21.9.1. Ve v22.1.2 jen komentáře (publikovat lze kdykoli, není nutné), v22.1.3 a v22.2 beze změny.
- **🔒 Vyžadovat verzi:** naposledy 22.0 (řady cvičení v `trplan`).

## K testu
- v22.1 – v22.1.2 – jen rychlá kontrola (`docs/testy-rucni.md`, kap. 1–4). Ostatní verze uživatel 26. 10. 2026 ohlásil jako funkční.
- v22.1.3 – nasazena, základní funkčnost odpovídá (26. 10. 2026), úplný test chybí (`docs/testy-rucni.md`, kap. 5).
- v22.2 – ▶ Teď, ☑ Hromadně, výpis z banky (`docs/testy-rucni.md`, kap. 6). U výpisu ověřit CSV z banky týmu.

## Další krok
1. **v22.3 E5** – 📈 přehled a analýza Tréninku (`docs/plan.md`).
2. Pak K2, N, P2, G (odloženo), M poslední.

## Trvalá rozhodnutí uživatele
- Aplikace je pomocník: trenér trénuje, ne ovládá aplikaci (příprava doma, na ledě minimum). Když je něco komplikované, upozornit.
- Hráčky vidí výsledky měření a co se trénuje, **hodnocení trenérů nikdy**. Porovnání způsobu placení zatím jen pokladník (⚖️ Tarify), hráčka vidí své platby a docházku. Hráčky živý trénink nepotřebují.
- Na telefonu jen svislý posun (výjimka široké tabulky v `.tw`).
- Nízké náklady (tarif Spark), šetření limitu Claude. Jiný klub úplně poslední.
- Drobné úpravy přidávat k nejbližší větší verzi; po nasazení verze se pod stejným číslem nic nemění.
- Videa a PDF cvičení na týmovém Google účtu, spravuje manager.

## Odložené drobnosti
Seznam je v `docs/plan.md` (kap. Otevřené drobnosti).
