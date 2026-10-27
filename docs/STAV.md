# Stav projektu HockeyCoach

Krátký vstup pro každé vlákno. Aktualizuje se s každou verzí (nahradit, ne přidávat historii – ta je v `CHANGELOG.md`).

## Verze
- **Aktuální:** v22.16.2 (27. 10. 2026, **jen v betě**) – docházka před 1. 11. 2026 (`STRICT_FROM`): všechny události, mimo „Jdu“ = nejde, bez ⏰ pozdě; v22.16: ✅ potvrzení dresů (`events.lok`), ⏳ výchozí termín přihlášení (`settings/events` dlT / dlM / dlH), ⏰ pozdní odpovědi v Docházce, ⌛ bez odpovědi = nejde. Cache `hokej-v115` / `hokej-beta-v115`.
- **Další číslo:** v22.17 (cache `hokej-v116`), opravy v22.16.x; čísla verzí i cache jen rostou (jedna řada pro stabilní i betu).
- **Kanál:** od v22.12 se verze nahrávají do větve **`beta`** (od v22.13 zapisuje Claude přímo – jeden commit na verzi, návrat = revert commitu; `main` chráněná, jen PR); do `main` jen vydání (PR `beta → main`), změny pravidel / dat, které nesnesou starší stabilní verzi, a naléhavé opravy. Ve stabilní: **v22.11**. V betě: **v22.16.2** (série k vydání: v22.12 – v22.16).
- **Pravidla databáze:** v22.11 publikovat (blok `settings/beta`).
- **🔒 Vyžadovat verzi:** 22.9 (ruční test v22.9 bez nálezu, 27. 10. 2026). v22.10 a v22.11 nevyžadují. V betě se nenastavuje.

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
- v22.11 – 🧪 beta kanál nasazen a beta naběhla (27. 10. 2026); zbývá kap. 15 (testeři, zamčená beta, ikona β).
- v22.12 (beta) – ❔ Chybí odpověď a 📲 připomenutí (kap. 16).
- v22.13 (beta) – docházka bez posouvání, počty v Domů, okno událostí hráčky (kap. 17).
- v22.14 (beta) – přihlášení z Domů, karta události, platby jen při dluhu, nápověda podle role (kap. 18).
- v22.15 (beta) – dresy, kratší detail, sbalené bloky plánu (kap. 19).
- v22.16 (beta) – potvrzení dresů, termín přihlášení, ⏰ pozdě (kap. 20).

## Další krok
1. **K2** – schválen celý seznam v pořadí 1–7 (27. 10. 2026); 1 hotovo v22.10, 2 hotovo v22.12 (beta), 3 hotovo v22.15 (se 🎽 dresy a kratším detailem), v22.16 potvrzení dresů a včasné odpovědi (schváleno 27. 10. 2026: a + b + d; pozdní odhlášení s důvodem neplatí, platí 🚫 bez omluvy – už tak počítá pokladna), **další v22.17 = 4 Živý trénink** (⧉ Jako minule, sbalené bloky).
2. **D3** jen podle čísel z 📉 (zabalení uzavřených měsíců docházky).
3. Pak N, P2, G (odloženo), M poslední.

## Trvalá rozhodnutí uživatele
- Aplikace je pomocník: trenér trénuje, ne ovládá aplikaci (příprava doma, na ledě minimum). Když je něco komplikované, upozornit.
- Hráčky vidí výsledky měření a co se trénuje, **hodnocení trenérů nikdy**. Porovnání způsobu placení zatím jen pokladník (⚖️ Tarify), hráčka vidí své platby a docházku. Hráčky živý trénink nepotřebují.
- Na telefonu jen svislý posun (výjimka široké tabulky v `.tw`).
- Aktuální a přehledné informace i při šetření čtení (27. 10. 2026). Nízké náklady (tarif Spark – hlídat 📉 čtení, 27. 10. 2026 bylo 30 000 čtení za den při vývoji), šetření limitu Claude. Jiný klub úplně poslední.
- Drobné úpravy přidávat k nejbližší větší verzi; po nasazení verze se pod stejným číslem nic nemění.
- Nasazovat a testovat v 🧪 betě (hlavně verze bez zásahu do databáze), pro ostatní vydat až otestovanou sérii; testery vybírá manager / vývojář (27. 10. 2026).
- Videa a PDF cvičení na týmovém Google účtu, spravuje manager.

## Odložené drobnosti
Seznam je v `docs/plan.md` (kap. Otevřené drobnosti).
