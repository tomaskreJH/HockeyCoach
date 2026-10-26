# Stav projektu HockeyCoach

Krátký vstup pro každé vlákno. Aktualizuje se s každou verzí (nahradit, ne přidávat historii – ta je v `CHANGELOG.md`).

## Verze
- **Aktuální:** v22.1.3 (26. 10. 2026) – ⚖️ porovnání placení jen pro pokladníka (Team → Platby → Tarify), hráčka má v Moje platby 📊 docházku. Cache `hokej-v98`.
- **Další číslo:** v22.2 (cache `hokej-v99`), opravy v22.1.x; čísla verzí i cache jen rostou.
- **Pravidla databáze:** publikovaná v21.9.1. Ve v22.1.2 jen komentáře (publikovat lze kdykoli, není nutné), v22.1.3 beze změny.
- **🔒 Vyžadovat verzi:** naposledy 22.0 (řady cvičení v `trplan`).

## K testu
- v22.1 – v22.1.2 – jen rychlá kontrola (`docs/testy-rucni.md`, kap. 1–4). Ostatní verze uživatel 26. 10. 2026 ohlásil jako funkční.
- v22.1.3 – Tarify a Moje docházka (`docs/testy-rucni.md`, kap. 5).

## Další krok
1. **v22.2 E5** – 📈 přehled a analýza Tréninku (`docs/plan.md`).
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
