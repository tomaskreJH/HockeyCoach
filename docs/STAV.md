# Stav projektu HockeyCoach

Krátký vstup pro každé vlákno. Aktualizuje se s každou verzí (nahradit, ne přidávat historii – ta je v `CHANGELOG.md`).

## Verze
- **Aktuální v betě:** v22.57.1 (9. 11. 2026) – 🔧 zámek závislostí a pevnější nasazení, aplikace beze změny; předchozí v22.57 (8. 11. 2026) – 🕘 střídání se dělí na hranicích třetin (pauza vynuluje počítání; statistiky, čas na ledě, průběh); předchozí v22.56 (6. 11. 2026) – 🔔 srozumitelná chyba při zapnutí notifikací na Androidu (`pushErrorText`); předchozí v22.55 (6. 11. 2026) – 🎨 nový vzhled sestavy pro hráčky (velkoklub, zvýrazněná přihlášená hráčka); předchozí v22.54 (6. 11. 2026) – 📋 hráčky vidí uzavřenou sestavu zápasu (karta v detailu zápasu + značka „Sestava k dispozici“ na kartě a v 🏠 Domů, `views/lineup-card.js`); předchozí v22.53 (5. 11. 2026) – 🏒 členka týmu zároveň hráčka: `staff.pid` (👥 Team → ✏️ Zároveň hráčka), skrytý 🎓 řádek v docházce / dresech / statistice, odpověď a plat podle hráčky (`domain/dual-member.js`); **pravidla beze změny, nové nepovinné pole `staff.pid`**; v22.52 (5. 11. 2026) – 📊 měřič čtení v ⚙️ → 💾 Data (`domain/read-meter.js`, `data/meter-store.js`, localStorage `hk-reads-v1`) + obrázky cvičení nejdřív z paměti zařízení (`getCached`); bez změny pravidel a dat; v22.51 (4. 11. 2026) – 🔔 push notifikace (`functions/`, `settings/notif`, `devices`; **firestore.rules publikovat ručně, funkce nasadit ručně**, výchozí stav VYPNUTO, ⛔ STOP v ⚙️ → 🔔); v22.50 (4. 11. 2026) – 📅 export událostí do kalendáře (.ics, bez databáze a bez nákladů); v22.49 (4. 11. 2026) – ✍️ ruční zadání času ve stopkách; v22.48 (4. 11. 2026) – (C) u jmen kapitánky, spravedlivé pořadí a výběr mott do dvou řádků, zaoblení odpovědí na událost, 📣 zpráva od trenéra (`coachmsg`, `domain/coach-msg.js`, `views/coach-msg-view.js`); **firestore.rules publikovat ručně**; v22.47 (4. 11. 2026) – nálepky ve dvou řádcích, © kapitánka (`players.cap`), výchozí vzhled Čistý; v22.46 (4. 11. 2026) – motto jako nálepka s „#číslo:“; v22.45 (4. 11. 2026) – 💬 banka mott a pokřiků (`mottos`, `domain/mottos.js`, `views/motto-view.js`); **firestore.rules publikovat ručně**. Předchozí: v22.44 (příští zápas, odpočet přihlášení, vzhled Čistý).
- **Stabilní (`main`):** v22.25 (PR #4 – podle uživatele 31. 10. 2026). v22.26 a novější jen v betě.
- **Další číslo:** v22.58 (cache `hokej-v164`), opravy v22.45.x; čísla verzí i cache jen rostou (jedna řada pro stabilní i betu).
- **Kanál:** Claude zapisuje každou verzi jako **jeden commit do větve `beta`** (návrat = revert commitu); `main` je chráněná – vydání dělá uživatel PR `beta → main`. Pravidla práce: `docs/KONVENCE.md` kap. 0 a pokyny projektu. Po každém vydání (PR) upravit řádek Stabilní.
- **Pravidla databáze:** **v22.51 – publikovat** (`settings/notif`, `devices`; ke schválení). Obsahuje i v22.35 (`tract`, `budgetKeep`, `treval` + `isStaff`) a blok `seen` z v22.25. Stabilní verze nová pravidla snese (jen přidaná kolekce a zúžení, které stabilní nepoužívá).
- **🔒 Vyžadovat verzi:** 22.9 (ruční test v22.9 bez nálezu, 27. 10. 2026). v22.10 a novější nevyžadují. V betě se nenastavuje.

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
- **v22.17 (beta) – ostrý test živého tréninku 28. 10. 2026 (kap. 21)**: oznámení, ☀ obrazovka, synchronní odpočet, řídící vs. ostatní trenéři, 🔒, baterie.
- **v22.18 (beta) – ⚡ improvizace na ledě (kap. 22)**: bez plánu, ➕ cvičení ▶ Hned, nové cvičení do banky, 👥 🚫.
- **v22.18.2 (beta) – opravy z kontroly kódu (kap. 23)**: úhrada ze dvou zařízení, úhrada bez připojení, uzavření zápasu s běžícími hodinami, běh testů v Actions.
- **v22.19 (beta) – 🏃 oprava pořadí štafety (kap. 24)**: starší uložený běh (před v22.19) i nový.
- **v22.20 (beta) – příprava na trénink pro hráčky (kap. 25)**.
- **v22.24 (beta) – 📉 pokladna na vyžádání (kap. 28)**.
- **v22.25 (beta) – 🟢 kdo je online (kap. 29)** – po publikaci pravidel.
- **v22.27 (beta) – 📋 plán tréninku pohodlněji (kap. 30)**: 🎓 trenéři u linky, ➕ nové cvičení z výběru, nový blok s výběrem, ⭐ Výkonnost bez skoku.
- **v22.28 (beta) – ⏱ přehlednější živý trénink (kap. 31)**: pořadí obrazovky, kdo kde, 🎛 sbalené ovládání, ⌚ krátká oznámení – ideálně na ledě.
- **v22.29 (beta) – 🏒 zápas: ⧉ Jako minule, 📤 souhrn (kap. 32)**.
- **v22.30 (beta) – 💬 jednotné hlášky a potvrzení (kap. 33)**.
- **v22.31 (beta) – 💸 předvyplněný výdaj (kap. 34)**.
- **v22.32 / v22.32.1 (beta) – 🧹 úklid drobností (kap. 35)**.
- **v22.33 (beta) – ⏱ variabilní trénink (kap. 36)**: Co následuje, ⚠ zdržení, nepovinné hodnocení, 📝 jen do plánu, filtr části tréninku – nejlépe na ledě.
- **v22.34 (beta) – 🚫⭐ Nehodnotit u bloku, plat bez 🚫 (kap. 37)**.
- **v22.35 (beta) – ✏️ skutečný průběh, pravidla B2 a B3 (kap. 38)** – po publikaci pravidel.
- **v22.36 (beta) – 🎨 grafika Aréna a režim světlý / tmavý (kap. 39)**: čitelnost na slunci i večer, živý zápis a trénink v Aréně.
- **v22.37 (beta) – ⚪ buly, ⏸ přerušení, 📉 starší zápasy z paměti (kap. 40)**: nejlépe na zápase (rychlost dvou tlačítek ▶ Buly), pak Statistiky na hráčce.
- **v22.38 (beta) – 🎯 trestné střílení, krosček, ⏱ ukotvený odpočet (kap. 41)**: trestné střílení stačí vyzkoušet na rozehraném zápase (↩ Zpět), odpočet na tréninku.
- **v22.39 (beta) – ❄️ vzhled Ledová aréna (kap. 42)**: přepnout v ⚙️, projít Domů, událost, Team, živý zápis a trénink v tmavém i světlém režimu.
- **v22.40 (beta) – vzhled Čistý (kap. 43)**: přepnout v ⚙️, projít Domů, Události, detail, Team, živý zápis a trénink ve světlém i tmavém režimu; pruh stavu na kartě, ikony, záhlaví STŘELY.
- **v22.41 (beta) – menu dole jen s ikonami (kap. 44)**: vzhled Čistý, spodní lišta, pruhy nahoře.
- **v22.42 (beta) – vzhled Čistý: zápasy, zaoblení, pruh stavu (kap. 45)**.
- **v22.43 (beta) – Domů: připomínka příštího zápasu, 7 dní s zápasy, hodnocení zavřené, přechod stavu (kap. 46)**.
- **v22.44 (beta) – příští zápas s odpočtem a sérií, ⏳ odpočet přihlášení, dresy, kalendář, písmo STŘELY (kap. 47)**.
- **v22.55 (beta) – 🎨 vzhled sestavy (kap. 55, body 3 a 3a)**: sestava jako zveřejnění velkoklubu, vejde se na šířku telefonu, přihlášená hráčka zeleně se štítkem TY.
- **v22.54 (beta) – 📋 sestava pro hráčky (kap. 55)**: uzavřená sestava se ukáže hráčkám v detailu zápasu a na kartě zápasu / v 🏠 Domů je značka „Sestava k dispozici“.
- **v22.53 (beta) – 🏒 členka týmu zároveň hráčka (kap. 54)**: v 👥 Team → ✏️ propojit se hráčkou; v docházce, dresech a statistice se hlásí jen jako hráčka, plat za událost podle její odpovědi.
- **v22.51 (beta) – 🔔 notifikace (kap. 52)**: nejdřív pravidla a funkce (`docs/notifikace-nasazeni.md`), pak v ⚙️ → 🔔 vložit klíč VAPID, zapnout tým a zařízení; otestovat zrušení / změnu času a STOP.
- **v22.50 (beta) – 📅 export do kalendáře (kap. 51)**: stažení .ics z detailu události i „Moje události“, otevřít v kalendáři telefonu a v Outlooku M365 (soukromé, jen název a čas, připomínky); po změně času znovu stáhnout.
- **v22.45 (beta) – 💬 banka mott a pokřiků u příštího zápasu (kap. 48); další (v22.48+): notifikace + synchronizace kalendáře, viz `docs/navrh-notifikace-kalendar.md`**.
- **📉 D4** (návrh v `docs/plan.md`): rostoucí kolekce realizačního týmu (`evpub`, `lineuppub`, `evcash`, `attnote`, `drills`) – rozhodnout podle čísel z ⚙️ → 💾 Data → 📉.
- **Rozhodnuto 1. 11. 2026:** přepínač u bloku a plat bez 🚫 (v22.34), ✏️ skutečný průběh podle doporučení a B2 + B3 (v22.35). Zbývá B1 (`settings/beta`, nízké riziko – zatím ponecháno) a B4 (kontrola pravidel v konzoli, App Check).
- **Návrhy čekající na souhlas:** `docs/navrhy-v22.32.md` – A ✏️ úprava proběhlého tréninku (kolekce `tract`), B pravidla z kontroly v22.18.1 (`settings/beta`, `budgetKeep`, `treval`), C 🚫 člena týmu a plat.
- Kontrola kódu v22.18.1 – otevřené body k rozhodnutí: pravidla `settings/beta` (čtení jen manager / vývojář), `budgetKeep` (neměnné starší revize rozpočtu), `treval` u hráček vynutit pravidly; ověřit nasazená pravidla v konzoli a zvážit App Check.

## Další krok
1. **K2** – schválen celý seznam v pořadí 1–7 (27. 10. 2026); 1 hotovo v22.10, 2 hotovo v22.12 (beta), 3 hotovo v22.15 (se 🎽 dresy a kratším detailem), v22.16 potvrzení dresů a včasné odpovědi (schváleno 27. 10. 2026: a + b + d; pozdní odhlášení s důvodem neplatí, platí 🚫 bez omluvy – už tak počítá pokladna), 4 hotovo v22.17 (živý trénink na ledě) + ⚡ improvizace v22.18, **přehlednější ⏱ živý trénink hotovo v22.28 (beta)**, **5 Zápas hotovo v22.29**, **6 hlášky v22.30**, **7 pokladna v22.31 – K2 celý hotový**, **další: ✏️ úprava proběhlého tréninku (návrh `docs/navrhy-v22.32.md`, A) (skutečné časy cvičení do statistik – čeká na souhlas s novou kolekcí `tract` a pravidly), pak 5 Zápas** (v22.19 – v22.20 mimořádně: oprava štafety, ⏹ Konec, příprava pro hráčky) (sestava „Jako minule“, souhrn ke sdílení) – nejdřív nálezy z ostrého testu tréninku (v22.17.x).
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
